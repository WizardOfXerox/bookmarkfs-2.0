(() => {
    const params = new URLSearchParams(window.location.search);
    const realUrl = params.get("url");
    const title = params.get("title");

    if (!realUrl) return;

    // Set page title
    if (title) {
        document.title = title;
    } else {
        try {
            document.title = new URL(realUrl).hostname;
        } catch {
            document.title = realUrl;
        }
    }

    // Inject matching favicon dynamically
    try {
        const hostname = new URL(realUrl).hostname;
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
        const link = document.createElement("link");
        link.rel = "icon";
        link.type = "image/png";
        link.href = faviconUrl;
        document.head.appendChild(link);
    } catch (e) {
        console.error("Failed to inject favicon", e);
    }

    function wakeUp() {
        window.location.replace(realUrl);
    }

    // If tab is already active/focused on creation, redirect immediately
    if (!document.hidden) {
        wakeUp();
    } else {
        // Otherwise, wait until it gains focus (becomes visible)
        document.addEventListener("visibilitychange", () => {
            if (!document.hidden) {
                wakeUp();
            }
        });
        
        // Fallback for click anywhere
        document.body.addEventListener("click", wakeUp);
    }
})();
