if (chrome.sidePanel && chrome.sidePanel.setOptions) {
    chrome.sidePanel.setOptions({ path: "dist/ua.html" }).catch(() => {});
}

const qs = (sel) => document.querySelector(sel);

// Handle UI visibility based on checkboxes and selects
function updateUaUiVisibility() {
    const enabled = qs("#ua-enabled").checked;
    const fieldsWrapper = qs("#ua-fields-wrapper");
    if (!fieldsWrapper) return;

    if (!enabled) {
        fieldsWrapper.style.display = "none";
        return;
    }
    fieldsWrapper.style.display = "flex";

    const trigger = qs("#ua-trigger").value;
    const intervalWrapper = qs("#ua-interval-wrapper");
    const customWrapper = qs("#ua-custom-wrapper");
    const filtersWrapper = qs("#ua-filters-wrapper");

    if (trigger === "never") {
        intervalWrapper.style.display = "none";
        customWrapper.style.display = "flex";
        filtersWrapper.style.display = "none";
    } else if (trigger === "periodic") {
        intervalWrapper.style.display = "flex";
        customWrapper.style.display = "none";
        filtersWrapper.style.display = "flex";
    } else { // startup or request
        intervalWrapper.style.display = "none";
        customWrapper.style.display = "none";
        filtersWrapper.style.display = "flex";
    }
}

const UA_PRESETS = {
    "chrome-win": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "safari-mac": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Safari/605.1.15",
    "firefox-linux": "Mozilla/5.0 (X11; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "safari-ios": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1",
    "chrome-android": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
    "googlebot-desktop": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "googlebot-mobile": "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "bingbot": "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"
};

// Load configurations from storage
async function loadConfig() {
    const res = await chrome.storage.local.get(["bookmarkfs_ua_settings", "bookmarkfs_ua_current"]);
    
    // Set active User-Agent display
    const defaultMobileUa = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36";
    const currentActiveUa = res.bookmarkfs_ua_settings && res.bookmarkfs_ua_settings.enabled 
        ? (res.bookmarkfs_ua_current || defaultMobileUa)
        : defaultMobileUa;
    
    qs("#ua-current-active").textContent = currentActiveUa;

    // Load form settings
    const settings = res.bookmarkfs_ua_settings || {
        enabled: false,
        applyTo: "iframe",
        rotationTrigger: "never",
        rotationInterval: 10,
        customUa: "",
        allowedOS: ["windows", "macos", "linux", "android", "ios"],
        allowedBrowsers: ["chrome", "firefox", "safari", "edge"],
        exceptions: ["facebook.com", "www.facebook.com", "m.facebook.com"]
    };

    qs("#ua-enabled").checked = !!settings.enabled;
    qs("#ua-apply-to").value = settings.applyTo || "iframe";
    qs("#ua-trigger").value = settings.rotationTrigger || "never";
    qs("#ua-interval").value = settings.rotationInterval || 10;
    qs("#ua-custom").value = settings.customUa || "";
    qs("#ua-exceptions").value = (settings.exceptions || []).join("\n");

    // Load OS checkboxes
    const osList = settings.allowedOS || [];
    document.querySelectorAll("input[data-ua-os]").forEach(cb => {
        cb.checked = osList.includes(cb.dataset.uaOs);
    });

    // Load Browser checkboxes
    const browserList = settings.allowedBrowsers || [];
    document.querySelectorAll("input[data-ua-browser]").forEach(cb => {
        cb.checked = browserList.includes(cb.dataset.uaBrowser);
    });

    // Match customUa to presets
    const customVal = settings.customUa || "";
    let matchedPreset = "custom";
    for (const [key, val] of Object.entries(UA_PRESETS)) {
        if (customVal === val) {
            matchedPreset = key;
            break;
        }
    }
    qs("#ua-preset-select").value = matchedPreset;

    updateUaUiVisibility();
}

// Save configuration and update settings
async function saveConfig() {
    const settings = {
        enabled: qs("#ua-enabled").checked,
        applyTo: qs("#ua-apply-to").value,
        rotationTrigger: qs("#ua-trigger").value,
        rotationInterval: parseInt(qs("#ua-interval").value, 10) || 10,
        customUa: qs("#ua-custom").value.trim(),
        allowedOS: [...document.querySelectorAll("input[data-ua-os]")]
            .filter(cb => cb.checked)
            .map(cb => cb.dataset.uaOs),
        allowedBrowsers: [...document.querySelectorAll("input[data-ua-browser]")]
            .filter(cb => cb.checked)
            .map(cb => cb.dataset.uaBrowser),
        exceptions: qs("#ua-exceptions").value.split("\n").map(d => d.trim()).filter(Boolean)
    };

    await chrome.storage.local.set({ bookmarkfs_ua_settings: settings });

    // Notify background script to reapply headers and rules
    chrome.runtime.sendMessage({ action: "update-ua-settings" }, async (response) => {
        // Reload values to update badge status text
        setTimeout(loadConfig, 100);
        alert("Settings saved successfully!");
    });
}

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

// Rotate User-Agent manually
function rotateUserAgent() {
    chrome.runtime.sendMessage({ action: "update-ua-settings" }, async (response) => {
        setTimeout(loadConfig, 100);
    });
}

// Wire events
document.addEventListener("DOMContentLoaded", () => {
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

    loadConfig();

    qs("#ua-enabled").addEventListener("change", updateUaUiVisibility);
    qs("#ua-trigger").addEventListener("change", updateUaUiVisibility);
    qs("#ua-save-btn").addEventListener("click", saveConfig);
    qs("#ua-rotate-btn").addEventListener("click", rotateUserAgent);

    qs("#ua-preset-select").addEventListener("change", (e) => {
        const val = e.target.value;
        if (val !== "custom" && UA_PRESETS[val]) {
            qs("#ua-custom").value = UA_PRESETS[val];
        }
    });
});
