(() => {
    const iframe = document.getElementById("web-iframe");
    const addressBar = document.getElementById("web-address-bar");
    const btnGo = document.getElementById("web-go");
    const btnBack = document.getElementById("web-back");
    const btnForward = document.getElementById("web-forward");
    const btnReload = document.getElementById("web-reload");
    const btnHome = document.getElementById("web-home");
    const btnTab = document.getElementById("web-tab");

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

    // Navigation history stack
    let historyStack = ["https://www.google.com"];
    let historyIndex = 0;

    // Load initial URL from storage or url parameters
    chrome.storage.local.get(["bookmarkfs_web_last_url"], (res) => {
        const urlParams = new URLSearchParams(window.location.search);
        const loadUrl = urlParams.get("load");
        const savedUrl = loadUrl || res.bookmarkfs_web_last_url || "https://www.google.com";
        
        historyStack = [savedUrl];
        historyIndex = 0;
        iframe.src = savedUrl;
        addressBar.value = savedUrl;
        updateNavButtons();
    });

    function navigateTo(url) {
        let targetUrl = url.trim();
        if (!targetUrl) return;

        // Auto-correct protocols or fallback to Google search
        if (!targetUrl.includes(".") || targetUrl.includes(" ")) {
            targetUrl = "https://www.google.com/search?q=" + encodeURIComponent(targetUrl);
        } else if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
            targetUrl = "https://" + targetUrl;
        }

        // Save last loaded URL to chrome.storage.local for state persistence
        chrome.storage.local.set({ bookmarkfs_web_last_url: targetUrl });

        // Load page in iframe
        iframe.src = targetUrl;
        addressBar.value = targetUrl;

        // Truncate stack on new navigation and append
        historyStack = historyStack.slice(0, historyIndex + 1);
        historyStack.push(targetUrl);
        historyIndex = historyStack.length - 1;
        updateNavButtons();
    }

    function updateNavButtons() {
        btnBack.disabled = historyIndex <= 0;
        btnForward.disabled = historyIndex >= historyStack.length - 1;
    }

    // Go Button Action
    btnGo.addEventListener("click", () => {
        navigateTo(addressBar.value);
    });

    // Enter Key Bindings on address bar
    addressBar.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            navigateTo(addressBar.value);
        }
    });

    // Navigation Button Actions
    btnBack.addEventListener("click", () => {
        if (historyIndex > 0) {
            historyIndex--;
            const url = historyStack[historyIndex];
            iframe.src = url;
            addressBar.value = url;
            updateNavButtons();
        }
    });

    btnForward.addEventListener("click", () => {
        if (historyIndex < historyStack.length - 1) {
            historyIndex++;
            const url = historyStack[historyIndex];
            iframe.src = url;
            addressBar.value = url;
            updateNavButtons();
        }
    });

    btnReload.addEventListener("click", () => {
        iframe.src = iframe.src;
    });

    btnHome.addEventListener("click", () => {
        navigateTo("https://www.google.com");
    });

    btnTab.addEventListener("click", () => {
        chrome.tabs.create({ url: iframe.src });
    });

    // Handle drag and drop link drops to open immediately
    document.body.addEventListener("dragover", (e) => e.preventDefault());
    document.body.addEventListener("drop", (e) => {
        e.preventDefault();
        const href = e.dataTransfer.getData("text/uri-list");
        const text = e.dataTransfer.getData("text/plain") || href;
        const target = href || text;
        if (target) {
            navigateTo(target);
        }
    });

    // Track sub-frame navigations inside our browser iframe to update address bar on redirects
    if (chrome.webNavigation) {
        chrome.webNavigation.onCommitted.addListener((details) => {
            if (details.frameId > 0) {
                chrome.webNavigation.getFrame({
                    tabId: details.tabId,
                    processId: details.processId,
                    frameId: details.parentFrameId
                }, (parentFrame) => {
                    if (parentFrame && parentFrame.url && parentFrame.url.includes("web.html")) {
                        const currentUrl = details.url;
                        addressBar.value = currentUrl;
                        chrome.storage.local.set({ bookmarkfs_web_last_url: currentUrl });

                        if (historyStack[historyIndex] !== currentUrl) {
                            historyStack = historyStack.slice(0, historyIndex + 1);
                            historyStack.push(currentUrl);
                            historyIndex = historyStack.length - 1;
                            updateNavButtons();
                        }
                    }
                });
            }
        });
    }

    // Initialize nav button states
    updateNavButtons();
})();
