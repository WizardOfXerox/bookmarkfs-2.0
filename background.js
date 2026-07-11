chrome.action.onClicked.addListener(function () {
    chrome.tabs.create({ url: chrome.runtime.getURL("dist/index.html") });
});

// Robust context menu registration function
function initContextMenu() {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: "save-image-to-bookmarkfs",
            title: "Save to BookmarkFS",
            contexts: ["image"]
        }, () => {
            if (chrome.runtime.lastError) {
                // Ignore duplicate errors or similar warnings
                console.log("Context menu registration context:", chrome.runtime.lastError.message);
            } else {
                console.log("Successfully registered Save to BookmarkFS context menu");
            }
        });
    });
}

// Register listeners to trigger context menu setup
chrome.runtime.onInstalled.addListener(initContextMenu);
chrome.runtime.onStartup.addListener(initContextMenu);

// Also run immediately on worker script execution to ensure it works during active dev reloads
initContextMenu();

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