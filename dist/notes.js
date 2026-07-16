(() => {
    if (chrome.sidePanel && chrome.sidePanel.setOptions) {
        chrome.sidePanel.setOptions({ path: "dist/notes.html" }).catch(() => {});
    }

    const favicon = document.getElementById("active-favicon");
    const domainSpan = document.getElementById("active-domain");
    const scopeSelector = document.getElementById("notes-scope-selector");
    const editor = document.getElementById("notes-editor");
    const statusLabel = document.getElementById("notes-status-label");
    const charCount = document.getElementById("notes-char-count");
    const indexList = document.getElementById("notes-index-list");

    let activeTabUrl = "";
    let activeTabDomain = "";
    let saveTimeout = null;

    let activeGeneralNote = "General Note";
    const generalNoteSelector = document.getElementById("general-note-selector");
    const renameNoteBtn = document.getElementById("renameNoteBtn");
    const newNoteBtn = document.getElementById("newNoteBtn");
    const attachmentInput = document.getElementById("attachment-input");

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
        if (scope === "general") {
            return `note_general_${activeGeneralNote}`;
        } else if (scope === "domain") {
            return activeTabDomain ? `note_domain_${activeTabDomain}` : "";
        } else {
            return activeTabUrl ? `note_url_${activeTabUrl}` : "";
        }
    }

    // Load general notes into dropdown sub-selector
    function loadGeneralNotesDropdown() {
        if (!generalNoteSelector) return;
        generalNoteSelector.innerHTML = "";

        const isGeneral = scopeSelector.value === "general";
        const row = document.getElementById("general-controls-row");
        if (row) row.style.display = isGeneral ? "flex" : "none";

        chrome.storage.local.get(null, (all) => {
            let keys = Object.keys(all).filter(k => k.startsWith("note_general_"));
            if (keys.length === 0) {
                // Seed default note
                const defaultKey = "note_general_General Note";
                chrome.storage.local.set({ [defaultKey]: "" }, () => {
                    loadGeneralNotesDropdown();
                });
                return;
            }

            // Extract titles
            const titles = keys.map(k => k.replace("note_general_", "")).sort();
            
            // If activeGeneralNote is not in the list, set to the first one
            if (!titles.includes(activeGeneralNote)) {
                activeGeneralNote = titles[0];
            }

            titles.forEach(t => {
                const opt = document.createElement("option");
                opt.value = t;
                opt.textContent = t;
                if (t === activeGeneralNote) opt.selected = true;
                generalNoteSelector.appendChild(opt);
            });
        });
    }

    // Load Note content for active tab/general note
    async function loadActiveNote() {
        const scope = scopeSelector.value;

        if (scope === "general") {
            domainSpan.textContent = activeGeneralNote;
            favicon.src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2302ff88'><path d='M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z'/></svg>";
        } else {
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
        }

        const key = getNoteKey();
        if (!key) {
            editor.innerHTML = "";
            editor.contentEditable = "false";
            editor.setAttribute("placeholder", "Notes cannot be recorded for this page.");
            updateWordCount();
            renderAttachments("");
            return;
        }

        editor.contentEditable = "true";
        editor.setAttribute("placeholder", `Type notes for ${scope === "general" ? activeGeneralNote : (scope === "domain" ? activeTabDomain : "this page URL")}...`);

        chrome.storage.local.get([key], (res) => {
            editor.innerHTML = res[key] || "";
            updateWordCount();
            statusLabel.textContent = "Loaded";
            renderAttachments(key);
        });
    }

    // Auto-save logic on input
    function triggerAutoSave() {
        statusLabel.textContent = "Saving...";
        if (saveTimeout) clearTimeout(saveTimeout);

        saveTimeout = setTimeout(() => {
            const key = getNoteKey();
            if (!key) return;

            const html = editor.innerHTML;
            const textContent = editor.innerText.trim();
            if (textContent === "" && scopeSelector.value !== "general") {
                // Remove empty website notes
                chrome.storage.local.remove([key], () => {
                    statusLabel.textContent = "Saved (Cleared)";
                    loadNotesIndex();
                });
            } else {
                chrome.storage.local.set({ [key]: html }, () => {
                    statusLabel.textContent = "Saved";
                    loadNotesIndex();
                });
            }
        }, 600);
    }

    function updateWordCount() {
        const count = editor.innerText.replace(/\n/g, "").length; // Ignore trailing linebreaks
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
                const isUrl = key.startsWith("note_url_");
                const isGeneral = key.startsWith("note_general_");
                
                let target = "";
                let prefixIcon = "";
                if (isDomain) {
                    target = key.replace("note_domain_", "");
                    prefixIcon = "🏢 ";
                } else if (isUrl) {
                    target = key.replace("note_url_", "");
                    prefixIcon = "📄 ";
                } else if (isGeneral) {
                    target = key.replace("note_general_", "");
                    prefixIcon = "📝 ";
                }

                const content = storage[key] || "";
                
                const item = document.createElement("div");
                item.className = "note-index-item";

                const info = document.createElement("div");
                info.className = "note-item-info";
                
                const title = document.createElement("span");
                title.className = "note-item-title";
                title.textContent = prefixIcon + target;
                
                const preview = document.createElement("span");
                preview.className = "note-item-preview";
                const plainText = content.replace(/<[^>]+>/g, " ");
                preview.textContent = plainText.substring(0, 25) + (plainText.length > 25 ? "..." : "");

                info.appendChild(title);
                info.appendChild(preview);

                // Clicking item loads it
                info.onclick = () => {
                    if (isGeneral) {
                        scopeSelector.value = "general";
                        activeGeneralNote = target;
                        loadGeneralNotesDropdown();
                    } else {
                        scopeSelector.value = isDomain ? "domain" : "url";
                        loadGeneralNotesDropdown();
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
                    }
                    editor.contentEditable = "true";
                    editor.innerHTML = content;
                    updateWordCount();
                    statusLabel.textContent = "Loaded from Index";
                    editor.setAttribute("placeholder", `Editing note for ${target}...`);
                    renderAttachments(key);
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
                        deleteAttachments(key);
                        chrome.storage.local.remove([key], () => {
                            if (isGeneral && activeGeneralNote === target) {
                                chrome.storage.local.get(null, (all) => {
                                    const remaining = Object.keys(all).filter(k => k.startsWith("note_general_"));
                                    if (remaining.length > 0) {
                                        activeGeneralNote = remaining[0].replace("note_general_", "");
                                    } else {
                                        activeGeneralNote = "General Note";
                                    }
                                    loadGeneralNotesDropdown();
                                    loadActiveNote();
                                    loadNotesIndex();
                                });
                            } else {
                                loadNotesIndex();
                                if (getNoteKey() === key) {
                                    editor.innerHTML = "";
                                    updateWordCount();
                                    renderAttachments("");
                                }
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

    // Helper functions for attachments
    function renderAttachments(noteKey) {
        const container = document.getElementById("attachments-list");
        if (!container) return;
        container.innerHTML = "";

        if (!noteKey) return;
        const metaKey = `note_att_meta_${noteKey}`;
        chrome.storage.local.get([metaKey], (res) => {
            const list = res[metaKey] || [];
            if (list.length === 0) {
                const empty = document.createElement("div");
                empty.style.color = "var(--text-secondary)";
                empty.style.fontSize = "11px";
                empty.textContent = "No attachments.";
                container.appendChild(empty);
                return;
            }

            list.forEach(att => {
                const row = document.createElement("div");
                row.style.display = "flex";
                row.style.justifyContent = "space-between";
                row.style.alignItems = "center";
                row.style.padding = "6px 10px";
                row.style.backgroundColor = "rgba(255, 255, 255, 0.02)";
                row.style.border = "1px solid var(--border)";
                row.style.borderRadius = "6px";
                row.style.fontSize = "12px";

                const info = document.createElement("span");
                info.style.overflow = "hidden";
                info.style.textOverflow = "ellipsis";
                info.style.whiteSpace = "nowrap";
                info.style.maxWidth = "70%";
                info.textContent = `${att.name} (${niceBytes(att.size)})`;

                const btns = document.createElement("div");
                btns.style.display = "flex";
                btns.style.gap = "6px";

                const dlBtn = document.createElement("button");
                dlBtn.className = "web-btn";
                dlBtn.style.padding = "2px 6px";
                dlBtn.style.fontSize = "11px";
                dlBtn.textContent = "📥";
                dlBtn.title = "Download";
                dlBtn.onclick = () => {
                    const dataKey = `note_att_data_${noteKey}_${att.id}`;
                    chrome.storage.local.get([dataKey], (dRes) => {
                        const dataUrl = dRes[dataKey];
                        if (dataUrl) {
                            const a = document.createElement("a");
                            a.href = dataUrl;
                            a.download = att.name;
                            a.click();
                        } else {
                            alert("Attachment data not found.");
                        }
                    });
                };

                const delBtn = document.createElement("button");
                delBtn.className = "web-btn";
                delBtn.style.padding = "2px 6px";
                delBtn.style.fontSize = "11px";
                delBtn.style.color = "#ef4444";
                delBtn.textContent = "🗑️";
                delBtn.title = "Delete";
                delBtn.onclick = () => {
                    if (confirm(`Remove attachment "${att.name}"?`)) {
                        chrome.storage.local.remove([`note_att_data_${noteKey}_${att.id}`], () => {
                            const newList = list.filter(item => item.id !== att.id);
                            chrome.storage.local.set({ [metaKey]: newList }, () => {
                                renderAttachments(noteKey);
                            });
                        });
                    }
                };

                btns.appendChild(dlBtn);
                btns.appendChild(delBtn);
                row.appendChild(info);
                row.appendChild(btns);
                container.appendChild(row);
            });
        });
    }

    function niceBytes(x) {
        let n = parseInt(x, 10) || 0;
        const units = ["B", "KB", "MB", "GB"];
        let l = 0;
        while (n >= 1024 && l < units.length - 1) {
            n /= 1024;
            l++;
        }
        return n.toFixed(1) + " " + units[l];
    }

    function deleteAttachments(noteKey) {
        const metaKey = `note_att_meta_${noteKey}`;
        chrome.storage.local.get([metaKey], (res) => {
            const list = res[metaKey];
            if (!list) return;
            list.forEach(att => {
                chrome.storage.local.remove([`note_att_data_${noteKey}_${att.id}`]);
            });
            chrome.storage.local.remove([metaKey]);
        });
    }

    function renameAttachments(oldKey, newKey) {
        const oldMetaKey = `note_att_meta_${oldKey}`;
        const newMetaKey = `note_att_meta_${newKey}`;
        chrome.storage.local.get([oldMetaKey], (res) => {
            const list = res[oldMetaKey];
            if (!list) return;
            chrome.storage.local.set({ [newMetaKey]: list }, () => {
                chrome.storage.local.remove([oldMetaKey]);
                list.forEach(att => {
                    const oldDataKey = `note_att_data_${oldKey}_${att.id}`;
                    const newDataKey = `note_att_data_${newKey}_${att.id}`;
                    chrome.storage.local.get([oldDataKey], (dRes) => {
                        const dataUrl = dRes[oldDataKey];
                        if (dataUrl) {
                            chrome.storage.local.set({ [newDataKey]: dataUrl }, () => {
                                chrome.storage.local.remove([oldDataKey]);
                            });
                        }
                    });
                });
            });
        });
    }

    // Export and Import Logic
    function triggerJsonDownload(obj, filename) {
        const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    async function exportSingleNote() {
        const key = getNoteKey();
        if (!key) {
            alert("No note active to export.");
            return;
        }

        const scope = scopeSelector.value;
        let title = "";
        if (scope === "general") {
            title = activeGeneralNote;
        } else if (scope === "domain") {
            title = activeTabDomain;
        } else {
            title = activeTabUrl;
        }

        statusLabel.textContent = "Exporting note...";
        chrome.storage.local.get([key], (res) => {
            const content = res[key] || "";
            const metaKey = `note_att_meta_${key}`;
            
            chrome.storage.local.get([metaKey], (mRes) => {
                const attList = mRes[metaKey] || [];
                if (attList.length === 0) {
                    triggerJsonDownload({
                        type: "bookmarkfs_note_export",
                        title: title,
                        scope: scope,
                        content: content,
                        attachments: []
                    }, `${title.replace(/[^a-z0-9_-]/gi, "_")}_note.json`);
                    statusLabel.textContent = "Note Exported";
                } else {
                    const dataKeys = attList.map(att => `note_att_data_${key}_${att.id}`);
                    chrome.storage.local.get(dataKeys, (dRes) => {
                        const fullAttachments = attList.map(att => ({
                            id: att.id,
                            name: att.name,
                            type: att.type,
                            size: att.size,
                            data: dRes[`note_att_data_${key}_${att.id}`] || ""
                        }));
                        triggerJsonDownload({
                            type: "bookmarkfs_note_export",
                            title: title,
                            scope: scope,
                            content: content,
                            attachments: fullAttachments
                        }, `${title.replace(/[^a-z0-9_-]/gi, "_")}_note.json`);
                        statusLabel.textContent = "Note Exported";
                    });
                }
            });
        });
    }

    function exportAllNotes() {
        statusLabel.textContent = "Exporting all notes...";
        chrome.storage.local.get(null, (all) => {
            const noteKeys = Object.keys(all).filter(k => k.startsWith("note_general_") || k.startsWith("note_domain_") || k.startsWith("note_url_"));
            if (noteKeys.length === 0) {
                alert("No notes saved to export.");
                statusLabel.textContent = "Export Failed";
                return;
            }

            const exportNotes = [];
            let pendingNotes = noteKeys.length;

            noteKeys.forEach(noteKey => {
                const content = all[noteKey] || "";
                const metaKey = `note_att_meta_${noteKey}`;
                const attList = all[metaKey] || [];

                if (attList.length === 0) {
                    exportNotes.push({
                        key: noteKey,
                        content: content,
                        attachments: []
                    });
                    pendingNotes--;
                    if (pendingNotes === 0) {
                        triggerJsonDownload({
                            type: "bookmarkfs_all_notes_backup",
                            date: new Date().toISOString(),
                            notes: exportNotes
                        }, "bookmarkfs_notes_backup.json");
                        statusLabel.textContent = "All Notes Exported";
                    }
                } else {
                    const dataKeys = attList.map(att => `note_att_data_${noteKey}_${att.id}`);
                    chrome.storage.local.get(dataKeys, (dRes) => {
                        const fullAttachments = attList.map(att => ({
                            id: att.id,
                            name: att.name,
                            type: att.type,
                            size: att.size,
                            data: dRes[`note_att_data_${noteKey}_${att.id}`] || ""
                        }));
                        exportNotes.push({
                            key: noteKey,
                            content: content,
                            attachments: fullAttachments
                        });
                        pendingNotes--;
                        if (pendingNotes === 0) {
                            triggerJsonDownload({
                                type: "bookmarkfs_all_notes_backup",
                                date: new Date().toISOString(),
                                notes: exportNotes
                            }, "bookmarkfs_notes_backup.json");
                            statusLabel.textContent = "All Notes Exported";
                        }
                    });
                }
            });
        });
    }

    async function handleImportFile(file) {
        if (!file) return;
        statusLabel.textContent = "Importing...";
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const json = JSON.parse(e.target.result);
                if (json.type === "bookmarkfs_note_export") {
                    const key = json.scope === "general" ? `note_general_${json.title}` : (json.scope === "domain" ? `note_domain_${json.title}` : `note_url_${json.title}`);
                    chrome.storage.local.set({ [key]: json.content }, () => {
                        if (json.attachments && json.attachments.length > 0) {
                            const metaKey = `note_att_meta_${key}`;
                            const metaList = json.attachments.map(att => ({ id: att.id, name: att.name, type: att.type, size: att.size }));
                            chrome.storage.local.set({ [metaKey]: metaList }, () => {
                                let pending = json.attachments.length;
                                json.attachments.forEach(att => {
                                    const dataKey = `note_att_data_${key}_${att.id}`;
                                    chrome.storage.local.set({ [dataKey]: att.data }, () => {
                                        pending--;
                                        if (pending === 0) {
                                            if (json.scope === "general") activeGeneralNote = json.title;
                                            loadGeneralNotesDropdown();
                                            loadActiveNote();
                                            loadNotesIndex();
                                            alert(`Successfully imported note: "${json.title}"`);
                                        }
                                    });
                                });
                            });
                        } else {
                            if (json.scope === "general") activeGeneralNote = json.title;
                            loadGeneralNotesDropdown();
                            loadActiveNote();
                            loadNotesIndex();
                            alert(`Successfully imported note: "${json.title}"`);
                        }
                    });
                } else if (json.type === "bookmarkfs_all_notes_backup") {
                    if (!json.notes || json.notes.length === 0) {
                        alert("No notes found in backup file.");
                        return;
                    }
                    let pendingNotes = json.notes.length;
                    json.notes.forEach(item => {
                        const key = item.key;
                        chrome.storage.local.set({ [key]: item.content }, () => {
                            if (item.attachments && item.attachments.length > 0) {
                                const metaKey = `note_att_meta_${key}`;
                                const metaList = item.attachments.map(att => ({ id: att.id, name: att.name, type: att.type, size: att.size }));
                                chrome.storage.local.set({ [metaKey]: metaList }, () => {
                                    let pendingAtts = item.attachments.length;
                                    item.attachments.forEach(att => {
                                        const dataKey = `note_att_data_${key}_${att.id}`;
                                        chrome.storage.local.set({ [dataKey]: att.data }, () => {
                                            pendingAtts--;
                                            if (pendingAtts === 0) {
                                                pendingNotes--;
                                                if (pendingNotes === 0) {
                                                    loadGeneralNotesDropdown();
                                                    loadActiveNote();
                                                    loadNotesIndex();
                                                    alert(`Successfully imported ${json.notes.length} notes from backup!`);
                                                }
                                            }
                                        });
                                    });
                                });
                            } else {
                                pendingNotes--;
                                if (pendingNotes === 0) {
                                    loadGeneralNotesDropdown();
                                    loadActiveNote();
                                    loadNotesIndex();
                                    alert(`Successfully imported ${json.notes.length} notes from backup!`);
                                }
                            }
                        });
                    });
                } else {
                    alert("Invalid file format. Please upload a valid BookmarkFS note export file.");
                }
            } catch (err) {
                alert("Failed to parse JSON file: " + err.message);
            }
        };
        reader.readAsText(file);
    }

    // Event Listeners
    document.querySelectorAll(".ribbon-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            const cmd = btn.getAttribute("data-cmd");
            if (cmd) {
                document.execCommand(cmd, false, null);
                editor.focus();
                updateWordCount();
                triggerAutoSave();
            }
        });
    });

    editor.addEventListener("input", () => {
        updateWordCount();
        triggerAutoSave();
    });

    scopeSelector.addEventListener("change", () => {
        loadGeneralNotesDropdown();
        loadActiveNote();
    });

    if (generalNoteSelector) {
        generalNoteSelector.addEventListener("change", () => {
            activeGeneralNote = generalNoteSelector.value;
            loadActiveNote();
        });
    }

    if (renameNoteBtn) {
        renameNoteBtn.addEventListener("click", () => {
            const oldName = activeGeneralNote;
            const newName = (prompt("Rename General Note to:", oldName) || "").trim();
            if (!newName || newName === oldName) return;
            const newKey = `note_general_${newName}`;
            const oldKey = `note_general_${oldName}`;
            chrome.storage.local.get([newKey], (chk) => {
                if (chk[newKey] !== undefined) {
                    alert("A note with that name already exists!");
                    return;
                }
                chrome.storage.local.get([oldKey], (res) => {
                    const content = res[oldKey] || "";
                    chrome.storage.local.set({ [newKey]: content }, () => {
                        chrome.storage.local.remove([oldKey], () => {
                            renameAttachments(oldKey, newKey);
                            activeGeneralNote = newName;
                            loadGeneralNotesDropdown();
                            loadActiveNote();
                            loadNotesIndex();
                        });
                    });
                });
            });
        });
    }

    if (newNoteBtn) {
        newNoteBtn.addEventListener("click", () => {
            const newName = (prompt("Enter name for new General Note:", "New Note") || "").trim();
            if (!newName) return;
            const newKey = `note_general_${newName}`;
            chrome.storage.local.get([newKey], (chk) => {
                if (chk[newKey] !== undefined) {
                    alert("A note with that name already exists!");
                    return;
                }
                chrome.storage.local.set({ [newKey]: "" }, () => {
                    activeGeneralNote = newName;
                    loadGeneralNotesDropdown();
                    loadActiveNote();
                    loadNotesIndex();
                });
            });
        });
    }

    if (attachmentInput) {
        attachmentInput.addEventListener("change", function() {
            const file = this.files && this.files[0];
            if (!file) return;
            const noteKey = getNoteKey();
            if (!noteKey) return;

            statusLabel.textContent = "Uploading attachment...";
            const attId = "att_" + Date.now();
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result;
                const dataKey = `note_att_data_${noteKey}_${attId}`;
                chrome.storage.local.set({ [dataKey]: dataUrl }, () => {
                    const metaKey = `note_att_meta_${noteKey}`;
                    chrome.storage.local.get([metaKey], (res) => {
                        const list = res[metaKey] || [];
                        list.push({ id: attId, name: file.name, type: file.type, size: file.size });
                        chrome.storage.local.set({ [metaKey]: list }, () => {
                            renderAttachments(noteKey);
                            statusLabel.textContent = "Attachment Added";
                        });
                    });
                });
            };
            reader.readAsDataURL(file);
            this.value = "";
        });
    }

    // Export & Import click wires
    const exportNoteBtn = document.getElementById("exportNoteBtn");
    if (exportNoteBtn) {
        exportNoteBtn.addEventListener("click", () => {
            exportSingleNote();
        });
    }

    const exportAllNotesBtn = document.getElementById("exportAllNotesBtn");
    if (exportAllNotesBtn) {
        exportAllNotesBtn.addEventListener("click", () => {
            exportAllNotes();
        });
    }

    const importNotesInput = document.getElementById("import-notes-input");
    if (importNotesInput) {
        importNotesInput.addEventListener("change", function() {
            const file = this.files && this.files[0];
            if (file) {
                handleImportFile(file);
            }
            this.value = "";
        });
    }

    // Listen to tab changes
    chrome.tabs.onActivated.addListener(() => {
        if (scopeSelector.value !== "general") {
            loadActiveNote();
        }
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === "complete" && scopeSelector.value !== "general") {
            loadActiveNote();
        }
    });

    // Handle link drag-and-drops
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

    // ========== TEXT TOOLS INTEGRATION ==========
    const ttHeader = document.getElementById("text-tools-toggle-header");
    const ttContent = document.getElementById("text-tools-content");
    const ttIcon = document.getElementById("text-tools-toggle-icon");
    if (ttHeader && ttContent && ttIcon) {
        ttHeader.addEventListener("click", () => {
            const isHidden = ttContent.style.display === "none";
            ttContent.style.display = isHidden ? "flex" : "none";
            ttIcon.textContent = isHidden ? "▲" : "▼";
        });
    }

    const txtInput = document.getElementById("txt-input");
    const txtOutput = document.getElementById("txt-output");
    const txtStats = document.getElementById("txt-stats");
    const txtSwap = document.getElementById("btn-txt-swap");
    const txtCopy = document.getElementById("btn-txt-copy");
    const loadActiveBtn = document.getElementById("btn-txt-load-active");
    const applyActiveBtn = document.getElementById("btn-txt-apply-active");

    const updateTxtStats = () => {
        if (!txtInput) return;
        const val = txtInput.value;
        const words = val.trim() ? val.trim().split(/\s+/).length : 0;
        if (txtStats) txtStats.textContent = `Words: ${words} | Chars: ${val.length}`;
    };

    if (txtInput) txtInput.addEventListener("input", updateTxtStats);

    if (txtSwap && txtInput && txtOutput) {
        txtSwap.addEventListener("click", () => {
            txtInput.value = txtOutput.value;
            txtOutput.value = "";
            updateTxtStats();
        });
    }

    if (txtCopy && txtOutput) {
        txtCopy.addEventListener("click", () => {
            navigator.clipboard.writeText(txtOutput.value);
            txtCopy.textContent = "Copied!";
            setTimeout(() => { txtCopy.textContent = "Copy"; }, 1500);
        });
    }

    if (loadActiveBtn && txtInput && editor) {
        loadActiveBtn.addEventListener("click", () => {
            txtInput.value = editor.innerText || "";
            updateTxtStats();
        });
    }

    if (applyActiveBtn && txtOutput && editor) {
        applyActiveBtn.addEventListener("click", () => {
            if (!txtOutput.value) return;
            editor.innerText = txtOutput.value;
            // Trigger autosave
            if (saveTimeout) clearTimeout(saveTimeout);
            saveTimeout = setTimeout(saveNote, 1000);
            statusLabel.textContent = "Saving...";
            // Update char count
            const textLength = editor.innerText.length;
            charCount.textContent = `${textLength} characters`;
        });
    }

    const textEncoder = new TextEncoder();
    document.querySelectorAll(".txt-act").forEach(btn => {
        btn.addEventListener("click", async () => {
            if (!txtInput || !txtOutput) return;
            const action = btn.dataset.action;
            const txt = txtInput.value;
            try {
                if (action === "upper") {
                    txtOutput.value = txt.toUpperCase();
                } else if (action === "lower") {
                    txtOutput.value = txt.toLowerCase();
                } else if (action === "title") {
                    txtOutput.value = txt.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase());
                } else if (action === "b64enc") {
                    txtOutput.value = btoa(unescape(encodeURIComponent(txt)));
                } else if (action === "b64dec") {
                    txtOutput.value = decodeURIComponent(escape(atob(txt)));
                } else if (action === "urlenc") {
                    txtOutput.value = encodeURIComponent(txt);
                } else if (action === "urldec") {
                    txtOutput.value = decodeURIComponent(txt);
                } else if (action === "sha256") {
                    const msgUint8 = textEncoder.encode(txt);
                    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
                    const hashArray = Array.from(new Uint8Array(hashBuffer));
                    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                    txtOutput.value = hashHex;
                } else if (action === "jsonprettify") {
                    txtOutput.value = JSON.stringify(JSON.parse(txt), null, 2);
                } else if (action === "uuid") {
                    txtOutput.value = crypto.randomUUID();
                }
            } catch (e) {
                txtOutput.value = "Error: " + e.message;
            }
        });
    });

    // Initialize
    loadGeneralNotesDropdown();
    loadActiveNote();
    loadNotesIndex();
})();
