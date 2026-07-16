(function() {
    try {
        const theme = localStorage.getItem("bookmarkfs_theme") || "dark";
        document.documentElement.style.backgroundColor = theme === "light" ? "#f3f4f6" : "#0c0c0e";
    } catch(e) {
        console.error("Theme init error:", e);
    }
})();
