chrome.action.onClicked.addListener(function () {
    chrome.tabs.create({ url: chrome.runtime.getURL("dist/index.html") });
});

// Robust context menu registration function
function initContextMenu() {
    if (!chrome.contextMenus) {
        console.warn("chrome.contextMenus is undefined. Ensure 'contextMenus' permission is in manifest.json.");
        return;
    }
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: "save-image-to-bookmarkfs",
            title: "Save Image to BookmarkFS",
            contexts: ["image"]
        });

        chrome.contextMenus.create({
            id: "add-page-to-bookmarks",
            title: "Add Page to Bookmarks",
            contexts: ["page", "link"]
        });

        chrome.contextMenus.create({
            id: "open-bookmarkfs-dashboard",
            title: "Open BookmarkFS Dashboard",
            contexts: ["page", "image"]
        });

        chrome.contextMenus.create({
            id: "open-in-sidebar-browser",
            title: "Open Link/Page in Sidebar Browser",
            contexts: ["page", "link"]
        });
    });
}

async function initDeclarativeNetRequest() {
    if (chrome.declarativeNetRequest) {
        try {
            const rules = [
                {
                    id: 1,
                    priority: 1,
                    action: {
                        type: "modifyHeaders",
                        responseHeaders: [
                            { header: "frame-options", operation: "remove" },
                            { header: "x-frame-options", operation: "remove" },
                            { header: "content-security-policy", operation: "remove" },
                            { header: "content-security-policy-report-only", operation: "remove" }
                        ]
                    },
                    condition: {
                        resourceTypes: ["sub_frame"]
                    }
                },
                {
                    id: 2,
                    priority: 1,
                    action: {
                        type: "modifyHeaders",
                        requestHeaders: [
                            {
                                header: "user-agent",
                                operation: "set",
                                value: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36"
                            }
                        ]
                    },
                    condition: {
                        resourceTypes: ["sub_frame"],
                        excludedRequestDomains: ["facebook.com", "www.facebook.com", "m.facebook.com"]
                    }
                }
            ];
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: [1, 2],
                addRules: rules
            });
            console.log("Successfully registered declarativeNetRequest CSP and User-Agent rules");
        } catch (err) {
            console.error("Failed to register declarativeNetRequest CSP rules:", err);
        }
    }
}

// Register listeners to trigger context menu setup
chrome.runtime.onInstalled.addListener(() => {
    initContextMenu();
    initDeclarativeNetRequest();
    if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
        chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    }
});
chrome.runtime.onStartup.addListener(() => {
    initContextMenu();
    initDeclarativeNetRequest();
    restoreLatestSessionOnStartup();
});

// Also run immediately on worker script execution to ensure it works during active dev reloads
initContextMenu();
initDeclarativeNetRequest();
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

// Listen context menu actions
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "save-image-to-bookmarkfs") {
        const imageUrl = info.srcUrl;
        if (!imageUrl) return;

        try {
            console.log("Fetching image to save in BookmarkFS:", imageUrl);
            const res = await fetch(imageUrl);
            const blob = await res.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);

            const mime = blob.type || "image/png";

            // Extract basic filename from URL or default
            let filename = imageUrl.split("/").pop().split("?")[0] || "image";
            // Clean filename characters
            filename = filename.replace(/[\\\/:*?"<>|]/g, "_");
            if (!filename.includes(".")) {
                const ext = mime.split("/")[1] || "png";
                filename = `${filename}.${ext}`;
            }

            await storeRawBytesInBookmarks(filename, bytes, mime);
            console.log("Successfully saved image to BookmarkFS:", filename);
        } catch (err) {
            console.error("Failed to save image via context menu:", err);
        }
    } else if (info.menuItemId === "add-page-to-bookmarks") {
        const url = info.linkUrl || tab.url;
        const title = tab.title || url;
        try {
            await chrome.bookmarks.create({ title, url, parentId: "1" }); // Bookmarks bar
            console.log("Page added to bookmarks:", title);
        } catch (err) {
            console.error("Failed to add page to bookmarks:", err);
        }
    } else if (info.menuItemId === "open-bookmarkfs-dashboard") {
        chrome.tabs.create({ url: chrome.runtime.getURL("dist/index.html") });
    } else if (info.menuItemId === "open-in-sidebar-browser") {
        const url = info.linkUrl || info.pageUrl || tab.url;
        if (url) {
            chrome.storage.local.set({ bookmarkfs_web_last_url: url }, () => {
                if (chrome.sidePanel && chrome.sidePanel.open) {
                    chrome.sidePanel.open({ windowId: tab.windowId }).catch(err => {
                        console.error("Failed to open sidePanel:", err);
                    });
                }
            });
        }
    }
});

// Binary storage helpers matching BookmarkFS 3.0 schema
async function storeRawBytesInBookmarks(filename, bytes, mime) {
    const root = await fsRoot();
    const children = await chrome.bookmarks.getChildren(root.id);

    // Resolve duplicates
    let uniqueName = filename;
    while (children.some(b => b.title === uniqueName)) {
        uniqueName = incrementVersionedName(uniqueName);
    }

    // 1. Create file folder container
    const fileFolder = await chrome.bookmarks.create({ parentId: root.id, title: uniqueName });

    // 2. Base64 serialize (tag 'r' for raw data)
    const base64Str = bytesToBase64(bytes);
    const serialized = "r" + base64Str;
    const contentHash = await sha256Hex(bytes);

    const maxBookmarkSize = 9092;
    const pieces = [];
    for (let i = 0; i < serialized.length; i += maxBookmarkSize) {
        pieces.push(serialized.substring(i, i + maxBookmarkSize));
    }

    const chunkHashes = [];
    for (const part of pieces) {
        chunkHashes.push(await sha256String(part));
    }

    const metaObj = {
        schemaVersion: 3,
        type: mime,
        sizeOriginal: bytes.length,
        sizeStored: serialized.length,
        ratio: serialized.length / Math.max(1, bytes.length),
        compressed: false,
        encrypted: false,
        chunkSize: maxBookmarkSize,
        chunkHashes: chunkHashes,
        contentHash: contentHash,
        dateISO: new Date().toISOString(),
        tags: ["context-menu", "image"]
    };

    // 3. Write metadata block
    const metaPayload = "!meta:" + btoa(JSON.stringify(metaObj));
    await chrome.bookmarks.create({ parentId: fileFolder.id, title: metaPayload });

    // 4. Write data chunks to system folder
    const chunkFolder = await getFileChunksFolder(fileFolder.id, true);
    for (const part of pieces) {
        await chrome.bookmarks.create({ parentId: chunkFolder.id, title: part });
    }
}

async function fsRoot() {
    const tree = await chrome.bookmarks.getTree();
    const bar = tree[0].children[1] || tree[0].children[0];
    let handle = (bar.children || []).find(b => b.title === "bookmarkfs");
    if (!handle) {
        handle = await chrome.bookmarks.create({ parentId: bar.id, title: "bookmarkfs" });
    }
    return handle;
}

async function getChunksRoot() {
    const root = await fsRoot();
    const children = await chrome.bookmarks.getChildren(root.id);
    let chunksFolder = children.find(c => !c.url && c.title === "__chunks__");
    if (!chunksFolder) {
        chunksFolder = await chrome.bookmarks.create({ parentId: root.id, title: "__chunks__" });
    }
    return chunksFolder;
}

async function getFileChunksFolder(fileId, createIfMissing = false) {
    const chunksRoot = await getChunksRoot();
    const children = await chrome.bookmarks.getChildren(chunksRoot.id);
    let folder = children.find(c => !c.url && c.title === String(fileId));
    if (!folder && createIfMissing) {
        folder = await chrome.bookmarks.create({ parentId: chunksRoot.id, title: String(fileId) });
    }
    return folder;
}

function incrementVersionedName(name) {
    const dot = name.lastIndexOf(".");
    const hasExt = dot > 0;
    const base = hasExt ? name.slice(0, dot) : name;
    const ext = hasExt ? name.slice(dot) : "";
    const m = base.match(/^(.*) \((\d+)\)$/);
    if (!m) return `${base} (2)${ext}`;
    return `${m[1]} (${Number(m[2]) + 1})${ext}`;
}

function bytesToBase64(u8) {
    let s = "";
    for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return btoa(s);
}

async function sha256Hex(bytes) {
    const buffer = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function sha256String(str) {
    const bytes = new TextEncoder().encode(str);
    return sha256Hex(bytes);
}

// Auto-save active workspace session tabs
async function storeSessionAutoSave(bytes) {
    const root = await fsRoot();
    const children = await chrome.bookmarks.getChildren(root.id);
    const filename = "autosave-session.json";

    let fileFolder = children.find(b => !b.url && b.title === filename);
    if (fileFolder) {
        const sub = await chrome.bookmarks.getChildren(fileFolder.id);
        for (const item of sub) {
            await chrome.bookmarks.remove(item.id);
        }
        const chunkFolder = await getFileChunksFolder(fileFolder.id, false);
        if (chunkFolder) {
            await chrome.bookmarks.removeTree(chunkFolder.id);
        }
    } else {
        fileFolder = await chrome.bookmarks.create({ parentId: root.id, title: filename });
    }

    const base64Str = bytesToBase64(bytes);
    const serialized = "r" + base64Str;
    const contentHash = await sha256Hex(bytes);

    const maxBookmarkSize = 9092;
    const pieces = [];
    for (let i = 0; i < serialized.length; i += maxBookmarkSize) {
        pieces.push(serialized.substring(i, i + maxBookmarkSize));
    }

    const chunkHashes = [];
    for (const part of pieces) {
        chunkHashes.push(await sha256String(part));
    }

    const metaObj = {
        schemaVersion: 3,
        type: "application/json",
        sizeOriginal: bytes.length,
        sizeStored: serialized.length,
        ratio: serialized.length / Math.max(1, bytes.length),
        compressed: false,
        encrypted: false,
        chunkSize: maxBookmarkSize,
        chunkHashes: chunkHashes,
        contentHash: contentHash,
        dateISO: new Date().toISOString(),
        tags: ["session", "autosave"]
    };

    const metaPayload = "!meta:" + btoa(JSON.stringify(metaObj));
    await chrome.bookmarks.create({ parentId: fileFolder.id, title: metaPayload });

    const chunkFolder = await getFileChunksFolder(fileFolder.id, true);
    for (const part of pieces) {
        await chrome.bookmarks.create({ parentId: chunkFolder.id, title: part });
    }
}

let autoSaveTimeout = null;

function triggerAutoSave() {
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(async () => {
        try {
            console.log("Auto-saving active window workspace sessions...");
            const tabs = await chrome.tabs.query({ currentWindow: true });
            const sessionData = tabs.map(t => ({ title: t.title, url: t.url }));
            const serializedText = JSON.stringify(sessionData, null, 2);
            const bytes = new TextEncoder().encode(serializedText);
            await storeSessionAutoSave(bytes);
            console.log("Auto-save completed successfully!");
        } catch (err) {
            console.error("Auto-save failed:", err);
        }
    }, 3000);
}

chrome.tabs.onCreated.addListener(triggerAutoSave);
chrome.tabs.onRemoved.addListener(triggerAutoSave);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" || changeInfo.url) {
        triggerAutoSave();
    }
    if (changeInfo.status === "complete") {
        updateBadgeForTab(tab);
    }
});

// --- Note Action Badge (Ribbon) Manager ---
async function updateBadgeForTab(tab) {
    if (!tab || !tab.url || !tab.id) return;
    
    if (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://") || tab.url.startsWith("about:")) {
        chrome.action.setBadgeText({ text: "", tabId: tab.id });
        return;
    }

    try {
        const parsed = new URL(tab.url);
        const domain = parsed.hostname;
        const domainKey = `note_domain_${domain}`;
        const urlKey = `note_url_${tab.url}`;

        chrome.storage.local.get([domainKey, urlKey], (res) => {
            const hasDomainNote = !!res[domainKey];
            const hasUrlNote = !!res[urlKey];

            if (hasDomainNote || hasUrlNote) {
                chrome.action.setBadgeBackgroundColor({ color: "#059669", tabId: tab.id });
                chrome.action.setBadgeText({ text: "Note", tabId: tab.id });
            } else {
                chrome.action.setBadgeText({ text: "", tabId: tab.id });
            }
        });
    } catch (err) {}
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        updateBadgeForTab(tab);
    } catch (err) {}
});

chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName === "local") {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs && tabs[0]) {
                updateBadgeForTab(tabs[0]);
            }
        } catch (err) {}
    }
});

async function restoreLatestSessionOnStartup() {
    try {
        const stored = await chrome.storage.local.get("bookmarkfs_sessions_auto_restore");
        if (stored.bookmarkfs_sessions_auto_restore !== true) {
            console.log("Auto-restore is not enabled.");
            return;
        }

        console.log("Auto-restore is enabled. Querying bookmarks for latest session...");
        const root = await fsRoot();
        const tree = await chrome.bookmarks.getSubTree(root.id);
        const rootNode = tree[0];
        if (!rootNode || !rootNode.children) return;

        const childrenMap = new Map();
        function cacheNode(node) {
            if (node.children) {
                childrenMap.set(node.id, node.children);
                node.children.forEach(cacheNode);
            }
        }
        cacheNode(rootNode);

        const files = rootNode.children.filter(c => !c.url && c.title !== "__chunks__");
        const sessions = [];

        function getMetaFromCachedChildren(fileId) {
            const children = childrenMap.get(fileId) || [];
            const metaNode = children.find(c => c.title && c.title.startsWith("!meta:"));
            if (!metaNode) return null;
            try {
                const str = metaNode.title.slice("!meta:".length);
                const decoded = atob(str);
                return JSON.parse(decoded);
            } catch (err) {
                return null;
            }
        }

        function getRawFromCachedTree(fileId) {
            const chunksRoot = rootNode.children.find(c => !c.url && c.title === "__chunks__");
            if (!chunksRoot || !chunksRoot.children) return "";
            const fileChunksFolder = chunksRoot.children.find(c => !c.url && c.title === String(fileId));
            if (!fileChunksFolder || !fileChunksFolder.children) return "";
            
            let data = "";
            for (const c of fileChunksFolder.children) {
                data += c.title || "";
            }
            return data;
        }

        for (const f of files) {
            const meta = getMetaFromCachedChildren(f.id);
            if (!meta) continue;
            const isSessionFile = f.title.startsWith("session-") || (meta.tags && meta.tags.includes("session"));
            if (!isSessionFile) continue;

            const serialized = getRawFromCachedTree(f.id);
            if (!serialized) continue;

            try {
                const payload = serialized.slice(1);
                const decodedB64 = atob(payload);
                const tabs = JSON.parse(decodedB64);
                if (Array.isArray(tabs)) {
                    sessions.push({
                        title: f.title,
                        meta: meta,
                        tabs: tabs
                    });
                }
            } catch (e) {
                console.error("Failed to parse session", f.title, e);
            }
        }

        if (sessions.length > 0) {
            sessions.sort((a, b) => {
                const dateA = a.meta && a.meta.dateISO ? new Date(a.meta.dateISO) : 0;
                const dateB = b.meta && b.meta.dateISO ? new Date(b.meta.dateISO) : 0;
                return dateB - dateA;
            });

            const latest = sessions[0];
            console.log("Restoring latest session workspace upon browser startup:", latest.title);

            // Guard to sync with sessions.js tab load timestamp
            chrome.storage.local.set({ last_auto_restore_timestamp: Date.now() });

            for (const t of latest.tabs) {
                if (t.url) {
                    await chrome.tabs.create({ url: t.url, active: false });
                }
            }
            console.log(`Auto-restored ${latest.tabs.length} tabs on browser startup.`);
        }
    } catch (err) {
        console.error("Failed to auto-restore latest session:", err);
    }
}