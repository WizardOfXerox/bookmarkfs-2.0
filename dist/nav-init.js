(function() {
    const initNavDropdown = () => {
        const trigger = document.querySelector(".dropdown-trigger");
        const dropdown = document.querySelector(".dropdown-content");
        if (trigger && dropdown) {
            trigger.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const isHidden = window.getComputedStyle(dropdown).display === "none";
                dropdown.style.display = isHidden ? "grid" : "none";
            };
            document.addEventListener("click", (e) => {
                if (dropdown && !dropdown.contains(e.target) && e.target !== trigger) {
                    dropdown.style.display = "none";
                }
            });
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initNavDropdown);
    } else {
        initNavDropdown();
    }
})();
