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
            id: "capture-full-page-screenshot",
            title: "Capture Full-Page Screenshot to BookmarkFS",
            contexts: ["page"]
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
                },
                {
                    id: 3,
                    priority: 1,
                    action: {
                        type: "modifyHeaders",
                        responseHeaders: [
                            { header: "access-control-allow-origin", operation: "set", value: "*" },
                            { header: "access-control-allow-methods", operation: "set", value: "*" },
                            { header: "access-control-allow-headers", operation: "set", value: "*" }
                        ]
                    },
                    condition: {
                        resourceTypes: ["xmlhttprequest", "media", "image"]
                    }
                }
            ];
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: [1, 2, 3],
                addRules: rules
            });
            console.log("Successfully registered declarativeNetRequest CSP, User-Agent, and CORS rules");
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
    } else if (info.menuItemId === "capture-full-page-screenshot") {
        captureFullPage(tab);
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

// --- GoFullPage-Style Full Page Screenshot Capture Integration ---
async function captureFullPage(tab) {
    if (!tab || !tab.id) return;

    try {
        console.log("Starting full-page screenshot capture for tab:", tab.id);

        // 1. Set up a listener for the handshake message before we execute the script
        const readyPromise = new Promise((resolve) => {
            const handler = (msg, sender) => {
                if (msg.action === "capture-ready" && sender.tab && sender.tab.id === tab.id) {
                    chrome.runtime.onMessage.removeListener(handler);
                    resolve(true);
                }
            };
            chrome.runtime.onMessage.addListener(handler);
        });

        // 2. Inject content script Capture module
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: contentScriptCaptureMain
        });

        // 3. Wait for the injected content script to report "ready"
        await Promise.race([
            readyPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout waiting for capture page response")), 2000))
        ]);

        // 4. Prepare capture dimensions and scroll grids
        const prep = await chrome.tabs.sendMessage(tab.id, { action: "prepare" });
        if (!prep || !prep.coords) {
            throw new Error("Failed to prepare page capture grid details.");
        }

        const { coords, totalWidth, totalHeight, viewportWidth, viewportHeight, dpr } = prep;
        console.log(`Page details: ${totalWidth}x${totalHeight}, Viewport: ${viewportWidth}x${viewportHeight}, DPR: ${dpr}, Slices count: ${coords.length}`);

        const slices = [];

        // 5. Scroll and capture viewport slides loop
        let currentSliceIdx = 0;
        for (const coord of coords) {
            currentSliceIdx++;
            await chrome.tabs.sendMessage(tab.id, {
                action: "update-progress",
                current: currentSliceIdx,
                total: coords.length
            }).catch(() => {});

            await chrome.tabs.sendMessage(tab.id, { action: "scroll", x: coord.x, y: coord.y });
            
            // Wait additional 300ms for browser paint cycle (total ~600ms scroll+paint delay)
            await new Promise(resolve => setTimeout(resolve, 300));

            // Capture the current visible tab window viewport with retry on rate limit
            let dataUrl = null;
            let retries = 5;
            while (retries > 0) {
                try {
                    dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
                    break;
                } catch (err) {
                    if (err.message && err.message.includes("MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND")) {
                        console.warn(`Quota rate limit hit (slice ${currentSliceIdx}), retrying in 800ms...`);
                        await new Promise(resolve => setTimeout(resolve, 800));
                        retries--;
                    } else {
                        throw err;
                    }
                }
            }

            if (!dataUrl) {
                throw new Error("Failed to capture tab viewport due to Google Chrome rate limits. Please try again.");
            }

            slices.push({
                x: coord.x,
                y: coord.y,
                dataUrl: dataUrl
            });
        }

        // 4. Send all captured slices back to page DOM canvas context for high-performance offscreen stitching
        console.log("Stitching slices...");
        const stitchRes = await chrome.tabs.sendMessage(tab.id, {
            action: "stitch",
            slices: slices,
            totalWidth: totalWidth,
            totalHeight: totalHeight,
            dpr: dpr
        });

        // 5. Restore page scroll positions and layout visibility states
        await chrome.tabs.sendMessage(tab.id, { action: "cleanup" });

        if (stitchRes && stitchRes.dataUrl) {
            // 6. Convert returned stitched Data URL back to raw binary bytes array
            const base64Str = stitchRes.dataUrl.split(",")[1];
            const binaryString = atob(base64Str);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            let domain = "page";
            try {
                const urlObj = new URL(tab.url);
                domain = urlObj.hostname;
            } catch (e) {}

            const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
            const filename = `screenshot-${domain}-${dateStr}.png`;

            // Save raw bytes directly to BookmarkFS folder database
            await storeRawBytesInBookmarks(filename, bytes, "image/png");
            console.log("Full-page screenshot successfully saved as file:", filename);

            // 7. Save capture object to GoFullPage's Dexie database "Test4"
            const imageFilename = "capture_" + Date.now() + "_" + Math.floor(Math.random() * 1000) + ".png";
            const captureObj = {
                domain: domain,
                time: new Date(),
                format: "png",
                images: [ imageFilename ],
                sizes: [ bytes.length ],
                scaleMultiplier: dpr,
                url: tab.url,
                title: tab.title || "Screenshot",
                edits: {}
            };

            const insertedId = await saveCaptureToDexie(captureObj);
            console.log("Screenshot successfully saved to Dexie captures store, ID:", insertedId);

            // 7.5 Store the Data URL in chrome.storage.local temporarily for capture.html to write to HTML5 Persistent FS
            const storageKey = "temp_capture_file_" + imageFilename;
            await chrome.storage.local.set({ [storageKey]: stitchRes.dataUrl });

            // 8. Open the GoFullPage viewer tab to inspect and edit!
            const captureViewerUrl = chrome.runtime.getURL(`capture.html?id=${insertedId}&url=${encodeURIComponent(tab.url)}`);
            await chrome.tabs.create({ url: captureViewerUrl });

            // 9. Show success Toast notification on captured page
            await chrome.tabs.sendMessage(tab.id, {
                action: "show-toast",
                text: "Full-page screenshot captured & saved to BookmarkFS!"
            });
        } else {
            throw new Error(stitchRes ? stitchRes.error : "Unknown stitching canvas error.");
        }

    } catch (err) {
        console.error("Screenshot capture flow failed:", err);
        try {
            await chrome.tabs.sendMessage(tab.id, { action: "cleanup" });
            await chrome.tabs.sendMessage(tab.id, {
                action: "show-toast",
                text: "Screenshot capture failed: " + err.message
            });
        } catch (e) {}
    }
}

function saveCaptureToDexie(captureObj) {
    return new Promise((resolve, reject) => {
        // Open/Create the Dexie IndexedDB named "Test4" (without version parameter to match current version)
        const request = indexedDB.open("Test4");
        
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("captures")) {
                db.createObjectStore("captures", { keyPath: "id", autoIncrement: true });
            }
        };

        request.onsuccess = (e) => {
            const db = e.target.result;
            const transaction = db.transaction(["captures"], "readwrite");
            const store = transaction.objectStore("captures");
            
            const addReq = store.add(captureObj);
            addReq.onsuccess = (ev) => {
                resolve(ev.target.result);
            };
            addReq.onerror = (ev) => {
                reject(ev.target.error || new Error("Failed to write to captures table"));
            };
        };

        request.onerror = (e) => {
            reject(e.target.error || new Error("Failed to open IndexedDB database"));
        };
    });
}

function contentScriptCaptureMain() {
    if (window.__bookmarkfs_capture_initialized) {
        try {
            chrome.runtime.sendMessage({ action: "capture-ready" });
        } catch (e) {}
        return;
    }
    window.__bookmarkfs_capture_initialized = true;

    // Listen to runtime scroll, stitch and toast commands
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "prepare") {
            // Create progress indicator overlay
            const overlay = document.createElement("div");
            overlay.id = "bookmarkfs-capture-progress-overlay";
            overlay.style.position = "fixed";
            overlay.style.top = "0";
            overlay.style.left = "0";
            overlay.style.width = "100vw";
            overlay.style.height = "100vh";
            overlay.style.backgroundColor = "rgba(0, 0, 0, 0.45)";
            overlay.style.zIndex = "2147483647"; // Max z-index
            overlay.style.display = "flex";
            overlay.style.alignItems = "center";
            overlay.style.justifyContent = "center";
            overlay.style.fontFamily = "Helvetica, -apple-system, BlinkMacSystemFont, Arial, sans-serif";
            
            overlay.innerHTML = `
                <div style="width: 324px; background: #ffffff; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.25); padding: 16px 20px; text-align: left; position: relative; border: 1px solid #ddd; box-sizing: border-box;">
                    <div style="height: 50px; background: #161616; margin: -16px -20px 16px; padding: 0 20px; font-size: 20px; font-weight: 300; line-height: 50px; color: #fff; display: flex; align-items: center; border-top-left-radius: 5px; border-top-right-radius: 5px; box-sizing: border-box;">
                        <img src="${chrome.runtime.getURL('images/icon-camera-fm.svg')}" style="width: 20px; height: 20px; margin-right: 10px; vertical-align: middle;">
                        BookmarkFS
                    </div>
                    <div id="bookmarkfs-capture-progress-text" style="margin-bottom: 9px; font-size: 16px; color: #666; font-family: inherit;">Screen capture in progress…</div>
                    <div style="height: 34px; margin-left: -12px; margin-right: -12px; position: relative; overflow: hidden; background: #fff;">
                        <!-- dots background (gray dots) -->
                        <div style="height: 12px; position: absolute; bottom: 11px; left: 12px; right: 12px; overflow: hidden; width: calc(100% - 24px);">
                            <div style="content: ''; width: 300px; height: 0; border-top: 12px dotted #ccc; position: absolute; bottom: 0; right: 0;"></div>
                        </div>
                        <!-- dots remaining (black dots) -->
                        <div id="bookmarkfs-capture-progress-dots" style="height: 12px; position: absolute; bottom: 11px; right: 12px; overflow: hidden; width: calc(100% - 24px);">
                            <div style="content: ''; width: 300px; height: 0; border-top: 12px dotted #161616; position: absolute; bottom: 0; right: 0;"></div>
                        </div>
                        <!-- bar with Pacman gif -->
                        <div id="bookmarkfs-capture-progress-fill" style="width: 0%; height: 100%; position: absolute; top: 0; bottom: 0; left: 0; background-image: url(${chrome.runtime.getURL('images/anim.gif')}); background-position: 100% 50%; background-size: 34px 34px; background-repeat: no-repeat;"></div>
                    </div>
                </div>
            `;
            (document.body || document.documentElement).appendChild(overlay);

            // 1. Disable smooth scroll and transitions so viewports match coordinates exactly
            const styleNode = document.createElement("style");
            styleNode.innerHTML = "* { scroll-behavior: auto !important; transition: none !important; animation: none !important; }";
            document.head.appendChild(styleNode);

            // 2. Hide fixed and sticky elements temporarily to avoid repeating patterns
            const hiddenElts = [];
            const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_ELEMENT);
            let node;
            while (node = walker.nextNode()) {
                const style = window.getComputedStyle(node);
                if (style.position === "fixed" || style.position === "sticky") {
                    hiddenElts.push({ elt: node, originalDisplay: node.style.display });
                    node.style.display = "none";
                }
            }

            // Save original scroll states
            const origX = window.scrollX;
            const origY = window.scrollY;

            const totalWidth = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth);
            const totalHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const dpr = window.devicePixelRatio || 1;

            // Generate coordinate capture points grid
            const coords = [];
            for (let y = 0; y < totalHeight; y += viewportHeight) {
                for (let x = 0; x < totalWidth; x += viewportWidth) {
                    const scrollX = Math.min(x, totalWidth - viewportWidth);
                    const scrollY = Math.min(y, totalHeight - viewportHeight);
                    coords.push({
                        x: Math.max(0, scrollX),
                        y: Math.max(0, scrollY)
                    });
                }
            }

            // Filter out duplicate coordinate points
            const uniqueCoords = [];
            const seen = new Set();
            for (const c of coords) {
                const key = `${c.x},${c.y}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueCoords.push(c);
                }
            }

            // Send page specifications back
            sendResponse({
                coords: uniqueCoords,
                totalWidth,
                totalHeight,
                viewportWidth,
                viewportHeight,
                dpr,
                origX,
                origY
            });

            // Keep reference to cleanup
            window.__bookmarkfs_capture_cleanup = () => {
                if (styleNode.parentNode) styleNode.parentNode.removeChild(styleNode);
                hiddenElts.forEach(h => {
                    h.elt.style.display = h.originalDisplay;
                });
                const progressOverlay = document.getElementById("bookmarkfs-capture-progress-overlay");
                if (progressOverlay && progressOverlay.parentNode) {
                    progressOverlay.parentNode.removeChild(progressOverlay);
                }
                window.scrollTo(origX, origY);
                window.__bookmarkfs_capture_initialized = false;
            };
        }
        else if (message.action === "scroll") {
            window.scrollTo(message.x, message.y);
            // Wait 300ms for browser viewport rendering engine to paint
            setTimeout(() => {
                sendResponse({ scrolled: true });
            }, 300);
            return true; // Keep message channel open for async response
        }
        else if (message.action === "stitch") {
            const { slices, totalWidth, totalHeight, dpr } = message;
            
            // Create offscreen canvas block
            const canvas = document.createElement("canvas");
            canvas.width = totalWidth * dpr;
            canvas.height = totalHeight * dpr;
            const ctx = canvas.getContext("2d");

            let loadedCount = 0;
            slices.forEach(slice => {
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, slice.x * dpr, slice.y * dpr);
                    loadedCount++;
                    if (loadedCount === slices.length) {
                        try {
                            const dataUrl = canvas.toDataURL("image/png");
                            sendResponse({ dataUrl });
                        } catch (err) {
                            sendResponse({ error: "Canvas capture tainted or failed: " + err.message });
                        }
                    }
                };
                img.onerror = () => {
                    sendResponse({ error: "Failed to load screenshot slice image." });
                };
                img.src = slice.dataUrl;
            });
            return true; // Keep message channel open
        }
        else if (message.action === "cleanup") {
            if (typeof window.__bookmarkfs_capture_cleanup === "function") {
                window.__bookmarkfs_capture_cleanup();
            }
            sendResponse({ cleaned: true });
        }
        else if (message.action === "update-progress") {
            const pct = Math.round((message.current / message.total) * 100);
            const fill = document.getElementById("bookmarkfs-capture-progress-fill");
            const dots = document.getElementById("bookmarkfs-capture-progress-dots");
            if (fill) fill.style.width = pct + "%";
            if (dots) dots.style.width = Math.max(0, 100 - pct + 2) + "%";
            sendResponse({ updated: true });
        }
        else if (message.action === "show-toast") {
            // Display clean floating success notifier toast
            const toast = document.createElement("div");
            toast.textContent = "📸 " + message.text;
            toast.style.position = "fixed";
            toast.style.top = "20px";
            toast.style.left = "50%";
            toast.style.transform = "translateX(-50%)";
            toast.style.backgroundColor = "#059669";
            toast.style.color = "#fff";
            toast.style.padding = "12px 24px";
            toast.style.borderRadius = "8px";
            toast.style.zIndex = "999999";
            toast.style.fontSize = "14px";
            toast.style.fontWeight = "600";
            toast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
            toast.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
            toast.style.transition = "opacity 0.5s ease";
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.style.opacity = "0";
                setTimeout(() => {
                    if (toast.parentNode) toast.parentNode.removeChild(toast);
                }, 500);
            }, 3000);
            sendResponse({ toastShown: true });
        }
    });

    try {
        chrome.runtime.sendMessage({ action: "capture-ready" });
    } catch (e) {}
}