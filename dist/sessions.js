(async () => {
    const activeTabsList = document.getElementById("active-tabs-list");
    const snapshotBtn = document.getElementById("snapshot-workspace-btn");
    const gallery = document.getElementById("sessions-gallery");

    // Load active window workspace tabs
    async function loadActiveWorkspace() {
        if (!activeTabsList) return;
        activeTabsList.innerHTML = "";
        try {
            const tabs = await chrome.tabs.query({ currentWindow: true });
            tabs.forEach(tab => {
                const item = document.createElement("div");
                item.className = "tab-item";
                item.textContent = `• ${tab.title || tab.url}`;
                activeTabsList.appendChild(item);
            });
        } catch (err) {
            console.error("Failed to load active workspace:", err);
        }
    }

    // Storage and Filesystem Helpers (direct BookmarkFS V3 schema)
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

    async function listFiles() {
        const root = await fsRoot();
        const children = await chrome.bookmarks.getChildren(root.id);
        return children.filter(c => !c.url && c.title !== "__chunks__");
    }

    async function readMeta(folderId) {
        const children = await chrome.bookmarks.getChildren(folderId);
        const metaNode = children.find(c => c.title.startsWith("!meta:"));
        if (!metaNode) return null;
        try {
            return JSON.parse(atob(metaNode.title.slice(6)));
        } catch {
            return null;
        }
    }

    async function readSessionContent(fileId, meta) {
        const chunkFolder = await getFileChunksFolder(fileId, false);
        if (!chunkFolder) return [];
        const chunks = await chrome.bookmarks.getChildren(chunkFolder.id);
        
        // Sort chunks to ensure correct sequence
        chunks.sort((a, b) => (a.dateAdded || 0) - (b.dateAdded || 0));
        
        const base64Str = chunks.map(c => c.title).join("").slice(1); // strip the 'r' tag
        try {
            const rawBytes = base64ToBytes(base64Str);
            const text = new TextDecoder().decode(rawBytes);
            return JSON.parse(text);
        } catch (e) {
            console.error("Decode session failed:", e);
            return [];
        }
    }

    async function storeSession(filename, bytes) {
        const root = await fsRoot();
        const children = await chrome.bookmarks.getChildren(root.id);

        let uniqueName = filename;
        let count = 2;
        while (children.some(b => b.title === uniqueName)) {
            const dot = filename.lastIndexOf(".");
            const base = dot > 0 ? filename.slice(0, dot) : filename;
            const ext = dot > 0 ? filename.slice(dot) : "";
            uniqueName = `${base} (${count++})${ext}`;
        }

        const fileFolder = await chrome.bookmarks.create({ parentId: root.id, title: uniqueName });

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
            tags: ["session", "bookmarkfs"]
        };

        const metaPayload = "!meta:" + btoa(JSON.stringify(metaObj));
        await chrome.bookmarks.create({ parentId: fileFolder.id, title: metaPayload });

        const chunkFolder = await getFileChunksFolder(fileFolder.id, true);
        for (const part of pieces) {
            await chrome.bookmarks.create({ parentId: chunkFolder.id, title: part });
        }
    }

    async function deleteSession(fileId) {
        await chrome.bookmarks.removeTree(fileId);
        const chunkFolder = await getFileChunksFolder(fileId, false);
        if (chunkFolder) {
            await chrome.bookmarks.removeTree(chunkFolder.id);
        }
    }

    // Binary Helpers
    function base64ToBytes(base64) {
        const bin = atob(base64);
        const u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        return u8;
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

    function niceBytes(x) {
        if (x < 1024) return x + " B";
        if (x < 1048576) return (x / 1024).toFixed(1) + " KB";
        return (x / 1048576).toFixed(1) + " MB";
    }

    // Render Saved Sessions
    async function loadSessionsGallery() {
        if (!gallery) return;
        gallery.innerHTML = "";
        try {
            const files = await listFiles();
            for (const f of files) {
                const meta = await readMeta(f.id);
                if (!meta) continue;
                const isSessionFile = f.title.startsWith("session-") || (meta.tags && meta.tags.includes("session"));
                if (!isSessionFile) continue;

                // Load parsed session payload
                const parsedSession = await readSessionContent(f.id, meta);
                const tabCount = parsedSession.length;

                const card = document.createElement("div");
                card.className = "session-card";

                const header = document.createElement("div");
                header.className = "session-card-header";
                header.textContent = meta.name || f.title.split("/").pop();
                card.appendChild(header);

                const info = document.createElement("div");
                info.className = "session-card-info";
                info.textContent = `Tabs: ${tabCount} | Size: ${niceBytes(meta.sizeOriginal || 0)}`;
                card.appendChild(info);

                const actions = document.createElement("div");
                actions.className = "session-actions";

                // Restore open button
                const btnRestore = document.createElement("button");
                btnRestore.className = "button";
                btnRestore.textContent = "🚀 Open";
                btnRestore.onclick = async () => {
                    for (const t of parsedSession) {
                        if (t.url) chrome.tabs.create({ url: t.url, active: false });
                    }
                    alert(`Restored ${tabCount} tabs!`);
                };
                actions.appendChild(btnRestore);

                // Open in new window
                const btnWin = document.createElement("button");
                btnWin.className = "button";
                btnWin.textContent = "🗔 Win";
                btnWin.onclick = async () => {
                    const urls = parsedSession.map(t => t.url).filter(Boolean);
                    if (urls.length > 0) chrome.windows.create({ url: urls });
                };
                actions.appendChild(btnWin);

                // Restore in tab group
                const btnGroup = document.createElement("button");
                btnGroup.className = "button";
                btnGroup.textContent = "🏷️ Group";
                btnGroup.onclick = async () => {
                    const tabIds = [];
                    for (const t of parsedSession) {
                        if (t.url) {
                            const created = await chrome.tabs.create({ url: t.url, active: false });
                            tabIds.push(created.id);
                        }
                    }
                    if (tabIds.length > 0) {
                        const gid = await chrome.tabs.group({ tabIds });
                        if (chrome.tabGroups) {
                            await chrome.tabGroups.update(gid, { title: "Restored Session", color: "green" });
                        }
                    }
                };
                actions.appendChild(btnGroup);

                // Delete button
                const btnDel = document.createElement("button");
                btnDel.className = "button";
                btnDel.style.backgroundColor = "#7f1d1d";
                btnDel.textContent = "🗑️";
                btnDel.onclick = async () => {
                    if (!confirm(`Delete saved session "${f.title}"?`)) return;
                    card.style.opacity = "0";
                    setTimeout(async () => {
                        await deleteSession(f.id);
                        await loadSessionsGallery();
                    }, 300);
                };
                actions.appendChild(btnDel);

                card.appendChild(actions);
                gallery.appendChild(card);
            }
        } catch (err) {
            console.error("Failed to load sessions library:", err);
        }
    }

    // Save Active tabs snapshot
    if (snapshotBtn) {
        snapshotBtn.onclick = async () => {
            try {
                const tabs = await chrome.tabs.query({ currentWindow: true });
                const sessionData = tabs.map(t => ({ title: t.title, url: t.url }));
                const serializedText = JSON.stringify(sessionData, null, 2);
                const bytes = new TextEncoder().encode(serializedText);

                const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
                const filename = `session-${dateStr}.json`;

                await storeSession(filename, bytes);
                alert(`Session snapshot saved: ${filename}`);
                await loadSessionsGallery();
            } catch (err) {
                alert("Failed to snapshot workspace: " + err.message);
            }
        };
    }

    // Initialize UI
    await loadActiveWorkspace();
    await loadSessionsGallery();
})();
