(async () => {
    const workspaceList = document.getElementById("workspace-list-container");
    const activeTabsList = document.getElementById("active-tabs-list");
    const snapshotBtn = document.getElementById("snapshot-workspace-btn");

    function syncTheme() {
        const theme = localStorage.getItem("bookmarkfs_theme") || "dark";
        const isLight = theme === "light";
        document.body.classList.toggle("light-mode", isLight);
        
        const toggleBtn = document.getElementById("global-theme-toggle");
        if (toggleBtn) {
            toggleBtn.textContent = isLight ? "🌙 Dark" : "☀️ Light";
        }
    }
    
    syncTheme();
    const toggleBtn = document.getElementById("global-theme-toggle");
    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            const currentTheme = localStorage.getItem("bookmarkfs_theme") || "dark";
            const nextTheme = currentTheme === "dark" ? "light" : "dark";
            localStorage.setItem("bookmarkfs_theme", nextTheme);
            syncTheme();
        });
    }
    
    const selectedTitle = document.getElementById("selected-workspace-title");
    const tabsContainer = document.getElementById("workspace-tabs-container");
    
    const btnRestore = document.getElementById("btn-restore-all");
    const btnWin = document.getElementById("btn-open-win");
    const btnGroup = document.getElementById("btn-open-group");
    const btnDelete = document.getElementById("btn-delete-session");

    let savedSessions = []; // list of session files { id, title, meta, tabs }
    let selectedSessionId = null;

    // Load active window workspace tabs on the right side
    async function loadActiveWorkspace() {
        if (!activeTabsList) return;
        activeTabsList.innerHTML = "";
        try {
            const tabs = await chrome.tabs.query({ currentWindow: true });
            tabs.forEach(tab => {
                const row = document.createElement("div");
                row.className = "active-tab-row";
                
                const favicon = document.createElement("img");
                favicon.className = "tab-favicon";
                try {
                    favicon.src = `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}&sz=32`;
                } catch {
                    favicon.src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23999'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/></svg>";
                }
                row.appendChild(favicon);

                const title = document.createElement("div");
                title.className = "active-tab-title";
                title.textContent = tab.title || tab.url;
                row.appendChild(title);

                activeTabsList.appendChild(row);
            });
        } catch (err) {
            console.error("Failed to load active workspace:", err);
        }
    }

    // Storage and Bookmarks Filesystem Helpers
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
        chunks.sort((a, b) => (a.dateAdded || 0) - (b.dateAdded || 0));
        
        const base64Str = chunks.map(c => c.title).join("").slice(1);
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
        return fileFolder.id;
    }

    async function updateSessionData(fileId, tabsArray) {
        // Overwrite session JSON contents in-place
        const serializedText = JSON.stringify(tabsArray, null, 2);
        const bytes = new TextEncoder().encode(serializedText);

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

        // Read and update old meta node
        const children = await chrome.bookmarks.getChildren(fileId);
        const oldMeta = children.find(c => c.title.startsWith("!meta:"));
        if (oldMeta) {
            await chrome.bookmarks.remove(oldMeta.id);
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
        await chrome.bookmarks.create({ parentId: fileId, title: metaPayload });

        // Clean and rewrite chunk folder
        const oldChunkFolder = await getFileChunksFolder(fileId, false);
        if (oldChunkFolder) {
            await chrome.bookmarks.removeTree(oldChunkFolder.id);
        }
        const newChunkFolder = await getFileChunksFolder(fileId, true);
        for (const part of pieces) {
            await chrome.bookmarks.create({ parentId: newChunkFolder.id, title: part });
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

    // Load and Render Workspaces list and details
    async function refreshWorkspaces() {
        if (!workspaceList) return;
        workspaceList.innerHTML = "";
        savedSessions = [];

        try {
            const files = await listFiles();
            for (const f of files) {
                const meta = await readMeta(f.id);
                if (!meta) continue;
                const isSessionFile = f.title.startsWith("session-") || (meta.tags && meta.tags.includes("session"));
                if (!isSessionFile) continue;

                const parsedSession = await readSessionContent(f.id, meta);
                const titleStr = f.title.split("/").pop();
                
                savedSessions.push({
                    id: f.id,
                    title: titleStr,
                    meta: meta,
                    tabs: parsedSession
                });
            }

            // Render workspaces items
            savedSessions.forEach(session => {
                const item = document.createElement("div");
                item.className = `workspace-item ${session.id === selectedSessionId ? 'active' : ''}`;
                
                const name = document.createElement("div");
                name.className = "workspace-name";
                name.textContent = session.title;
                item.appendChild(name);

                const badge = document.createElement("div");
                badge.className = "tab-badge";
                badge.textContent = `${session.tabs.length} tabs`;
                item.appendChild(badge);

                item.onclick = () => {
                    selectWorkspace(session.id);
                };

                workspaceList.appendChild(item);
            });

            // Set default workspace if none selected
            if (!selectedSessionId && savedSessions.length > 0) {
                selectWorkspace(savedSessions[0].id);
            } else if (selectedSessionId) {
                renderSelectedWorkspaceDetails();
            } else {
                renderEmptyWorkspaceDetails();
            }
        } catch (err) {
            console.error("Failed to load workspaces list:", err);
        }
    }

    function selectWorkspace(id) {
        selectedSessionId = id;
        document.querySelectorAll(".workspace-item").forEach(item => {
            item.classList.remove("active");
        });
        refreshWorkspaces();
    }

    function renderEmptyWorkspaceDetails() {
        if (selectedTitle) selectedTitle.textContent = "Select a Workspace";
        if (tabsContainer) tabsContainer.innerHTML = "<p style='color:var(--text-secondary);margin:40px auto;'>No saved workspaces available. Take a snapshot to create one!</p>";
        setToolbarState(false);
    }

    function setToolbarState(enabled) {
        const btns = [btnRestore, btnWin, btnGroup, btnDelete];
        btns.forEach(b => {
            if (b) b.disabled = !enabled;
        });
    }

    function renderSelectedWorkspaceDetails() {
        const session = savedSessions.find(s => s.id === selectedSessionId);
        if (!session) {
            renderEmptyWorkspaceDetails();
            return;
        }

        setToolbarState(true);
        if (selectedTitle) selectedTitle.textContent = session.title;
        if (!tabsContainer) return;
        tabsContainer.innerHTML = "";

        if (session.tabs.length === 0) {
            tabsContainer.innerHTML = "<p style='color:var(--text-secondary);margin:40px auto;'>This workspace is empty.</p>";
            return;
        }

        session.tabs.forEach((tab, index) => {
            const row = document.createElement("div");
            row.className = "tab-row";

            const info = document.createElement("div");
            info.className = "tab-info-group";

            const favicon = document.createElement("img");
            favicon.className = "tab-favicon";
            try {
                favicon.src = `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}&sz=32`;
            } catch {
                favicon.src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23999'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/></svg>";
            }
            info.appendChild(favicon);

            const details = document.createElement("div");
            details.className = "tab-details";

            const link = document.createElement("a");
            link.href = tab.url;
            link.target = "_blank";
            link.className = "tab-title-text";
            link.textContent = tab.title || tab.url;
            details.appendChild(link);

            const urlPreview = document.createElement("div");
            urlPreview.className = "tab-url-text";
            urlPreview.textContent = tab.url;
            details.appendChild(urlPreview);

            info.appendChild(details);
            row.appendChild(info);

            // Tab actions Close ✕ button to delete specific tab
            const actions = document.createElement("div");
            actions.className = "tab-actions";

            const btnCloseTab = document.createElement("button");
            btnCloseTab.className = "btn-tab-close";
            btnCloseTab.innerHTML = "✕";
            btnCloseTab.title = "Remove Tab from Session";
            btnCloseTab.onclick = async (e) => {
                e.stopPropagation();
                if (confirm(`Remove tab "${tab.title || tab.url}" from this session?`)) {
                    row.style.opacity = "0";
                    setTimeout(async () => {
                        session.tabs.splice(index, 1);
                        await updateSessionData(session.id, session.tabs);
                        refreshWorkspaces();
                    }, 200);
                }
            };
            actions.appendChild(btnCloseTab);
            row.appendChild(actions);

            tabsContainer.appendChild(row);
        });
    }

    // Restoration and toolbar events
    if (btnRestore) {
        btnRestore.onclick = async () => {
            const session = savedSessions.find(s => s.id === selectedSessionId);
            if (!session) return;
            for (const t of session.tabs) {
                if (t.url) chrome.tabs.create({ url: t.url, active: false });
            }
            alert(`Restored ${session.tabs.length} tabs!`);
        };
    }

    if (btnWin) {
        btnWin.onclick = async () => {
            const session = savedSessions.find(s => s.id === selectedSessionId);
            if (!session) return;
            const urls = session.tabs.map(t => t.url).filter(Boolean);
            if (urls.length > 0) chrome.windows.create({ url: urls });
        };
    }

    if (btnGroup) {
        btnGroup.onclick = async () => {
            const session = savedSessions.find(s => s.id === selectedSessionId);
            if (!session) return;
            const tabIds = [];
            for (const t of session.tabs) {
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
    }

    if (btnDelete) {
        btnDelete.onclick = async () => {
            const session = savedSessions.find(s => s.id === selectedSessionId);
            if (!session) return;
            if (confirm(`Delete workspace session "${session.title}"?`)) {
                await deleteSession(session.id);
                selectedSessionId = null;
                refreshWorkspaces();
            }
        };
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

                const fileId = await storeSession(filename, bytes);
                selectedSessionId = fileId;
                await refreshWorkspaces();
                await loadActiveWorkspace();
                alert(`Session snapshot saved: ${filename}`);
            } catch (err) {
                alert("Failed to snapshot workspace: " + err.message);
            }
        };
    }

    // Handle link drag-and-drops: switch to web panel and load target URL
    document.body.addEventListener("dragover", (e) => e.preventDefault());
    document.body.addEventListener("drop", (e) => {
        e.preventDefault();
        const href = e.dataTransfer.getData("text/uri-list");
        const text = e.dataTransfer.getData("text/plain") || href;
        const target = href || text;
        if (target) {
            window.location.href = "web.html?load=" + encodeURIComponent(target.trim());
        }
    });

    // Initialize UI
    await loadActiveWorkspace();
    await refreshWorkspaces();
})();
