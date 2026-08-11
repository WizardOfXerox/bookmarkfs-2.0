// BookmarkFS DOM Identity Spoofer (Runs in MAIN world at document_start)
(async function () {
    try {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
            const data = await chrome.storage.local.get(["bookmarkfs_ua_settings", "bookmarkfs_ua_current"]);
            const settings = data.bookmarkfs_ua_settings;
            const currentUa = data.bookmarkfs_ua_current;

            if (!settings || !settings.enabled || settings.domSpoof === false) return;
            if (!currentUa) return;

            applyDomSpoof(currentUa, settings);
        }
    } catch (e) {
        // Safe fallback
    }

    function applyDomSpoof(ua, settings) {
        try {
            let platform = "Win32";
            let vendor = "Google Inc.";
            let isMobile = false;
            let cores = 8;
            let memory = 8;
            let screenWidth = 1920;
            let screenHeight = 1080;
            let pixelRatio = 1;

            if (ua.includes("Macintosh") || ua.includes("Mac OS X")) {
                platform = "MacIntel";
                vendor = (ua.includes("Safari") && !ua.includes("Chrome")) ? "Apple Computer, Inc." : "Google Inc.";
                cores = 10;
                memory = 16;
                screenWidth = 2560;
                screenHeight = 1440;
                pixelRatio = 2;
            } else if (ua.includes("Linux") && !ua.includes("Android")) {
                platform = "Linux x86_64";
                vendor = ua.includes("Firefox") ? "" : "Google Inc.";
                cores = 12;
                memory = 16;
                screenWidth = 1920;
                screenHeight = 1080;
            } else if (ua.includes("Android")) {
                platform = "Linux armv8l";
                vendor = "Google Inc.";
                isMobile = true;
                cores = 8;
                memory = 6;
                screenWidth = 412;
                screenHeight = 915;
                pixelRatio = 3;
            } else if (ua.includes("iPhone") || ua.includes("iPad")) {
                platform = ua.includes("iPad") ? "iPad" : "iPhone";
                vendor = "Apple Computer, Inc.";
                isMobile = true;
                cores = 6;
                memory = 6;
                screenWidth = 393;
                screenHeight = 852;
                pixelRatio = 3;
            } else if (ua.includes("PlayStation") || ua.includes("Xbox") || ua.includes("Nintendo")) {
                platform = ua.includes("PlayStation") ? "PlayStation 5" : (ua.includes("Xbox") ? "Xbox One" : "Nintendo Switch");
                vendor = "";
                screenWidth = 1920;
                screenHeight = 1080;
            }
            if (ua.includes("Firefox")) vendor = "";

            // Override navigator core properties
            Object.defineProperty(navigator, 'userAgent', { get: () => ua, configurable: true, enumerable: true });
            Object.defineProperty(navigator, 'appVersion', { get: () => ua.replace(/^Mozilla\//, ''), configurable: true, enumerable: true });
            Object.defineProperty(navigator, 'platform', { get: () => platform, configurable: true, enumerable: true });
            Object.defineProperty(navigator, 'vendor', { get: () => vendor, configurable: true, enumerable: true });
            Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => cores, configurable: true, enumerable: true });
            if ('deviceMemory' in navigator) {
                Object.defineProperty(navigator, 'deviceMemory', { get: () => memory, configurable: true, enumerable: true });
            }

            if (isMobile) {
                Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5, configurable: true, enumerable: true });
            } else {
                Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0, configurable: true, enumerable: true });
            }

            // Language override
            if (settings.acceptLanguage) {
                const lang = settings.acceptLanguage.split(",")[0].trim();
                const langs = settings.acceptLanguage.split(",").map(l => l.split(";")[0].trim()).filter(Boolean);
                Object.defineProperty(navigator, 'language', { get: () => lang, configurable: true, enumerable: true });
                Object.defineProperty(navigator, 'languages', { get: () => langs, configurable: true, enumerable: true });
            }

            // Screen property overrides
            if (isMobile || settings.domSpoofScreen) {
                try {
                    Object.defineProperty(window.screen, 'width', { get: () => screenWidth, configurable: true, enumerable: true });
                    Object.defineProperty(window.screen, 'height', { get: () => screenHeight, configurable: true, enumerable: true });
                    Object.defineProperty(window.screen, 'availWidth', { get: () => screenWidth, configurable: true, enumerable: true });
                    Object.defineProperty(window.screen, 'availHeight', { get: () => screenHeight - 40, configurable: true, enumerable: true });
                    Object.defineProperty(window, 'devicePixelRatio', { get: () => pixelRatio, configurable: true, enumerable: true });
                } catch (scErr) {}
            }

            // Client Hints (userAgentData)
            if (ua.includes("Firefox") || ua.includes("Safari") || ua.includes("Googlebot") || ua.includes("curl") || settings.stripClientHints) {
                Object.defineProperty(navigator, 'userAgentData', { get: () => undefined, configurable: true, enumerable: true });
            } else if (navigator.userAgentData) {
                const isEdge = ua.includes("Edg/");
                const brandName = isEdge ? "Microsoft Edge" : "Google Chrome";
                const versionMatch = ua.match(/(Chrome|Edg)\/([0-9.]+)/);
                const majorVer = versionMatch ? versionMatch[2].split(".")[0] : "124";

                const mockUserAgentData = {
                    brands: [
                        { brand: "Not-A.Brand", version: "99" },
                        { brand: brandName, version: majorVer },
                        { brand: "Chromium", version: majorVer }
                    ],
                    mobile: isMobile,
                    platform: platform.includes("Win") ? "Windows" : (platform.includes("Mac") ? "macOS" : (platform.includes("Linux") ? "Linux" : "Android")),
                    getHighEntropyValues: async function(hints) {
                        const res = {
                            brands: this.brands,
                            mobile: this.mobile,
                            platform: this.platform
                        };
                        if (hints && hints.includes("architecture")) res.architecture = platform.includes("Win") || platform.includes("Mac") || platform.includes("Linux") ? "x86" : "arm";
                        if (hints && hints.includes("bitness")) res.bitness = "64";
                        if (hints && hints.includes("model")) res.model = isMobile ? "Pixel 8" : "";
                        if (hints && hints.includes("platformVersion")) res.platformVersion = "15.0.0";
                        if (hints && hints.includes("uaFullVersion")) res.uaFullVersion = versionMatch ? versionMatch[2] : "124.0.0.0";
                        return res;
                    },
                    toJSON: function() {
                        return { brands: this.brands, mobile: this.mobile, platform: this.platform };
                    }
                };

                Object.defineProperty(navigator, 'userAgentData', { get: () => mockUserAgentData, configurable: true, enumerable: true });
            }
        } catch (e) {
            // Fail silently
        }
    }
})();
