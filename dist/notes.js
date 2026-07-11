(() => {
    const favicon = document.getElementById("active-favicon");
    const domainSpan = document.getElementById("active-domain");
    const scopeSelector = document.getElementById("notes-scope-selector");
    const textarea = document.getElementById("notes-textarea");
    const statusLabel = document.getElementById("notes-status-label");
    const charCount = document.getElementById("notes-char-count");
    const indexList = document.getElementById("notes-index-list");

    let activeTabUrl = "";
    let activeTabDomain = "";
    let saveTimeout = null;

    // Unified light/dark mode sync
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

    // Determine target key for saving based on selected scope
    function getNoteKey() {
        const scope = scopeSelector.value;
        if (scope === "domain") {
            return activeTabDomain ? `note_domain_${activeTabDomain}` : "";
        } else {
            return activeTabUrl ? `note_url_${activeTabUrl}` : "";
        }
    }

    // Load Note content for active tab
    async function loadActiveNote() {
        // Query active tab URL
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs && tabs[0] && tabs[0].url) {
                const tab = tabs[0];
                activeTabUrl = tab.url;
                try {
                    const parsed = new URL(tab.url);
                    activeTabDomain = parsed.hostname;
                    domainSpan.textContent = activeTabDomain;
                    favicon.src = `https://www.google.com/s2/favicons?domain=${activeTabDomain}&sz=32`;
                } catch {
                    activeTabDomain = "";
                    domainSpan.textContent = "Browser Page";
                    favicon.src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23999'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/></svg>";
                }
            } else {
                activeTabUrl = "";
                activeTabDomain = "";
                domainSpan.textContent = "No Active Tab";
                favicon.src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23999'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/></svg>";
            }
        } catch (err) {
            console.error("Failed to query active tab:", err);
        }

        const key = getNoteKey();
        if (!key) {
            textarea.value = "";
            textarea.disabled = true;
            textarea.placeholder = "Notes cannot be recorded for this page.";
            updateWordCount();
            return;
        }

        textarea.disabled = false;
        textarea.placeholder = `Type notes for ${scopeSelector.value === "domain" ? activeTabDomain : "this page URL"}...`;

        chrome.storage.local.get([key], (res) => {
            textarea.value = res[key] || "";
            updateWordCount();
            statusLabel.textContent = "Loaded";
        });
    }

    // Auto-save logic on input
    function triggerAutoSave() {
        statusLabel.textContent = "Saving...";
        if (saveTimeout) clearTimeout(saveTimeout);

        saveTimeout = setTimeout(() => {
            const key = getNoteKey();
            if (!key) return;

            const text = textarea.value;
            if (text.trim() === "") {
                chrome.storage.local.remove([key], () => {
                    statusLabel.textContent = "Saved (Cleared)";
                    loadNotesIndex();
                });
            } else {
                chrome.storage.local.set({ [key]: text }, () => {
                    statusLabel.textContent = "Saved";
                    loadNotesIndex();
                });
            }
        }, 600);
    }

    function updateWordCount() {
        const count = textarea.value.length;
        charCount.textContent = `${count} character${count === 1 ? "" : "s"}`;
    }

    // Load Notes Index list
    function loadNotesIndex() {
        if (!indexList) return;
        indexList.innerHTML = "";

        chrome.storage.local.get(null, (storage) => {
            const keys = Object.keys(storage).filter(k => k.startsWith("note_domain_") || k.startsWith("note_url_"));
            
            if (keys.length === 0) {
                const empty = document.createElement("div");
                empty.style.color = "var(--text-secondary)";
                empty.style.fontSize = "12px";
                empty.style.textAlign = "center";
                empty.textContent = "No notes saved yet.";
                indexList.appendChild(empty);
                return;
            }

            keys.forEach(key => {
                const isDomain = key.startsWith("note_domain_");
                const target = isDomain ? key.replace("note_domain_", "") : key.replace("note_url_", "");
                const content = storage[key] || "";
                
                const item = document.createElement("div");
                item.className = "note-index-item";

                const info = document.createElement("div");
                info.className = "note-item-info";
                
                const title = document.createElement("span");
                title.className = "note-item-title";
                title.textContent = (isDomain ? "🏢 " : "📄 ") + target;
                
                const preview = document.createElement("span");
                preview.className = "note-item-preview";
                preview.textContent = content.substring(0, 25) + (content.length > 25 ? "..." : "");

                info.appendChild(title);
                info.appendChild(preview);

                // Clicking item loads it
                info.onclick = () => {
                    scopeSelector.value = isDomain ? "domain" : "url";
                    if (isDomain) {
                        activeTabDomain = target;
                        domainSpan.textContent = target;
                    } else {
                        activeTabUrl = target;
                        try {
                            domainSpan.textContent = new URL(target).hostname;
                        } catch {
                            domainSpan.textContent = "Saved URL";
                        }
                    }
                    textarea.disabled = false;
                    textarea.value = content;
                    updateWordCount();
                    statusLabel.textContent = "Loaded from Index";
                    textarea.placeholder = `Editing note for ${target}...`;
                };

                const deleteBtn = document.createElement("button");
                deleteBtn.className = "note-item-delete";
                deleteBtn.title = "Delete Note";
                deleteBtn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                `;
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm(`Delete note for ${target}?`)) {
                        chrome.storage.local.remove([key], () => {
                            loadNotesIndex();
                            if (getNoteKey() === key) {
                                textarea.value = "";
                                updateWordCount();
                            }
                        });
                    }
                };

                item.appendChild(info);
                item.appendChild(deleteBtn);
                indexList.appendChild(item);
            });
        });
    }

    // Event Listeners
    textarea.addEventListener("input", () => {
        updateWordCount();
        triggerAutoSave();
    });

    scopeSelector.addEventListener("change", () => {
        loadActiveNote();
    });

    // Listen to tab changes
    chrome.tabs.onActivated.addListener(() => {
        loadActiveNote();
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === "complete") {
            loadActiveNote();
        }
    });

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

    // Initialize
    loadActiveNote();
    loadNotesIndex();
})();
