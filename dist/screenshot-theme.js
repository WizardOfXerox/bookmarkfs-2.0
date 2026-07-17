(function() {
    function syncTheme() {
        const theme = localStorage.getItem("bookmarkfs_theme") || "dark";
        const isLight = theme === "light";
        document.documentElement.classList.toggle("light-mode", isLight);
        document.body.classList.toggle("light-mode", isLight);
        const toggleBtn = document.getElementById("global-theme-toggle");
        if (toggleBtn) {
            toggleBtn.innerHTML = isLight ? "🌙 <span>Dark</span>" : "☀️ <span>Light</span>";
        }
    }
    syncTheme();
    document.addEventListener('DOMContentLoaded', () => {
        syncTheme();
        const toggleBtn = document.getElementById("global-theme-toggle");
        // Only set event listener on screenshot-related pages since main pages set their own listeners
        const isScreenshotPage = window.location.pathname.endsWith("capture.html") || 
                                 window.location.pathname.endsWith("options.html") || 
                                 window.location.pathname.endsWith("editor.html");
        if (toggleBtn && isScreenshotPage) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const currentTheme = localStorage.getItem("bookmarkfs_theme") || "dark";
                const nextTheme = currentTheme === "dark" ? "light" : "dark";
                localStorage.setItem("bookmarkfs_theme", nextTheme);
                syncTheme();
            });
        }
    });

    // Persist side panel page path on tab switch
    try {
        if (chrome.sidePanel && chrome.sidePanel.setOptions) {
            let path = window.location.pathname;
            if (path.startsWith('/')) {
                path = path.slice(1);
            }
            path += window.location.search;
            // Do NOT switch side panel path to options.html or editor.html
            if (!path.includes("editor.html") && !path.includes("options.html")) {
                const lastPath = localStorage.getItem("bookmarkfs_last_sidepanel_path");
                if (lastPath !== path) {
                    chrome.sidePanel.setOptions({ path: path }).catch(() => {});
                    localStorage.setItem("bookmarkfs_last_sidepanel_path", path);
                }
            }
        }
    } catch (e) {
        console.error("Failed to set side panel options:", e);
    }

    // Only perform the FileSystem writing flow if we are on capture.html or editor.html
    const isCapturePage = window.location.pathname.endsWith("capture.html");
    const isEditorPage = window.location.pathname.endsWith("editor.html");
    if (isCapturePage || isEditorPage) {
        const urlParams = new URLSearchParams(window.location.search);
        const idStr = urlParams.get("id");
        const id = idStr ? parseInt(idStr, 10) : null;

        if (isCapturePage && (!id || isNaN(id))) {
            document.body.classList.add("history-mode");
        }

        if (id && !isNaN(id)) {
            // Flow for viewing a captured page
            lookupCaptureFilename(id).then((filename) => {
                if (filename && filename.startsWith("capture_")) {
                    const storageKey = "temp_capture_file_" + filename;
                    chrome.storage.local.get([storageKey], (res) => {
                        const dataUrl = res[storageKey];
                        if (dataUrl) {
                            console.log("Found temp capture in storage, writing to persistent filesystem:", filename);
                            // Convert Data URL to Blob
                            const blob = dataURLtoBlob(dataUrl);
                            // Write to persistent FS
                            writeBlobToPersistentFs("/" + filename, blob).then(() => {
                                console.log("Successfully wrote capture to persistent filesystem:", filename);
                                // Successfully wrote to FS. Clean up storage and load React app
                                chrome.storage.local.remove([storageKey], () => {
                                    loadReactScripts();
                                });
                            }).catch((err) => {
                                console.error("Error writing blob to filesystem:", err);
                                loadReactScripts();
                            });
                        } else {
                            console.log("No temp capture found in storage (already written or cached), loading React app.");
                            // Image is already written, load React app
                            loadReactScripts();
                        }
                    });
                } else {
                    loadReactScripts();
                }
            }).catch((err) => {
                console.error("Error checking capture database:", err);
                loadReactScripts();
            });
        } else {
            // General viewer (no specific ID), load React app immediately
            loadReactScripts();
        }
    }

    function lookupCaptureFilename(id) {
        return new Promise((resolve) => {
            const request = indexedDB.open("Test4");
            request.onsuccess = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("captures")) {
                    resolve(null);
                    return;
                }
                try {
                    const transaction = db.transaction(["captures"], "readonly");
                    const store = transaction.objectStore("captures");
                    const getReq = store.get(id);
                    getReq.onsuccess = () => {
                        if (getReq.result && getReq.result.images && getReq.result.images.length > 0) {
                            resolve(getReq.result.images[0]);
                        } else {
                            resolve(null);
                        }
                    };
                    getReq.onerror = () => resolve(null);
                } catch(e) {
                    resolve(null);
                }
            };
            request.onerror = () => resolve(null);
        });
    }

    function dataURLtoBlob(dataurl) {
        var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], {type:mime});
    }

    function writeBlobToPersistentFs(fileName, blob) {
        return new Promise((resolve, reject) => {
            const size = 150 * 1024 * 1024; // 150MB
            const requestFS = window.requestFileSystem || window.webkitRequestFileSystem;
            if (!requestFS) {
                reject(new Error("requestFileSystem not supported"));
                return;
            }
            requestFS(window.PERSISTENT, size, (fs) => {
                fs.root.getFile(fileName, { create: true }, (fileEntry) => {
                    fileEntry.createWriter((fileWriter) => {
                        fileWriter.onwriteend = () => {
                            resolve(fileEntry.toURL());
                        };
                        fileWriter.onerror = (err) => {
                            reject(err);
                        };
                        fileWriter.write(blob);
                    }, (err) => reject(err));
                }, (err) => reject(err));
            }, (err) => reject(err));
        });
    }

    function loadReactScripts() {
        // Dynamically insert the module script
        const moduleScript = document.createElement("script");
        moduleScript.type = "module";
        moduleScript.src = isCapturePage ? "capture.js" : "editor.js";
        document.body.appendChild(moduleScript);
    }
})();
