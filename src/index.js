import { unzipSync, zipSync, gzipSync as fflateGzip, gunzipSync as fflateGunzip } from "fflate";
import { createExtractorFromData } from "node-unrar-js";
import jsQR from "jsqr";
import QRCode from "qrcode";

async function handleRar(bytes) {
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const extractor = await createExtractorFromData({
        data: arrayBuffer,
        wasmFile: chrome.runtime.getURL("dist/unrar.wasm")
    });
    const list = extractor.getFileList();
    const headers = Array.from(list.fileHeaders);
    console.log("RAR files:", headers.map(f => f.name));
}

export function handleZip(bytes) {
    const files = unzipSync(bytes);
    console.log("ZIP:", Object.keys(files));
}


(function() {
    // ---------- Config ----------
    let maxBookmarkSize = 9092; // safe Chrome limit for title characters
    const SETTINGS_KEY = "bookmarkfs_settings";
    const UPLOAD_CHECKPOINT_KEY = "bookmarkfs_upload_checkpoint_v1";
    const APP_SCHEMA_VERSION = 3; // Upgraded schema version to 3 (centralized chunking)
    const CHUNK_PREFIX = "!data:";
    const META_PREFIX = "!meta:";
    let currentPath = "";
    let currentPage = 1;
    let pageSize = 25;
    let cachedSessionPassphrase = "";
    let hasPrompted2FAKey = false;
    
    // Persistent Clock & Stopwatch state
    let stopwatchTime = 0; // accumulated ms
    let stopwatchRunning = false;
    let stopwatchStartTimestamp = 0;
    let stopwatchLaps = [];
    let activeClockTab = "alarm"; // "alarm", "stopwatch", or "world"
    let worldClockInterval = null;

    let isStartupTwofa = ["twofa", "passwords", "calc", "clock", "regex", "color", "api", "privacy", "rss", "timetracker", "qrscanner"].includes(new URLSearchParams(window.location.search).get("panel"));

    // ---------- Sandbox Communication ----------
    let sandboxRequestId = 0;
    const sandboxCallbacks = new Map();

    window.addEventListener("message", (event) => {
        const data = event.data;
        if (!data || !data.requestId) return;

        const cb = sandboxCallbacks.get(data.requestId);
        if (cb) {
            sandboxCallbacks.delete(data.requestId);
            if (data.type === "unrar-list-result" || data.type === "unrar-extract-result") {
                cb.resolve(data);
            } else {
                cb.reject(new Error(data.message || "Sandbox error"));
            }
        }
    });

    function callSandbox(message) {
        return new Promise((resolve, reject) => {
            const id = ++sandboxRequestId;
            message.requestId = id;
            sandboxCallbacks.set(id, { resolve, reject });

            let iframe = qs("#sandbox-iframe");
            if (!iframe) {
                iframe = document.createElement("iframe");
                iframe.id = "sandbox-iframe";
                iframe.src = "sandbox.html";
                iframe.style.display = "none";
                document.body.appendChild(iframe);
            }

            if (iframe.contentWindow) {
                iframe.contentWindow.postMessage(message, "*");
            } else {
                iframe.onload = () => {
                    iframe.contentWindow.postMessage(message, "*");
                };
            }
        });
    }

    let cachedMetas = null;
    const thumbnailCache = new Map();
    const fileTextContentCache = new Map();

    function addFileToCache(fileObj, metaObj) {
        if (!cachedMetas) return;
        cachedMetas = cachedMetas.filter(m => m.file.handle.id !== fileObj.handle.id && m.file.handle.title !== fileObj.handle.title);
        cachedMetas.push({ file: fileObj, meta: metaObj });
        thumbnailCache.delete(fileObj.handle.id);
    }

    function removeFileFromCache(fileId) {
        if (!cachedMetas) return;
        cachedMetas = cachedMetas.filter(m => m.file.handle.id !== fileId);
        thumbnailCache.delete(fileId);
    }

    function renameFileInCache(fileId, newTitle) {
        if (!cachedMetas) return;
        const entry = cachedMetas.find(m => m.file.handle.id === fileId);
        if (entry) {
            entry.file.handle.title = newTitle;
        }
        thumbnailCache.delete(fileId);
    }

    // ---------- Utilities ----------
    const te = new TextEncoder();
    const td = new TextDecoder();
    const hasFflate = typeof window !== "undefined" && window.fflate && typeof window.fflate.gzipSync === "function";

    function b64encodeBytes(u8) {
        let s = "";
        for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
        return btoa(s);
    }

    function b64decodeToBytes(b64) {
        if (!b64) return new Uint8Array(0);
        // quick sanity: base64 must be multiple of 4 chars
        if (b64.length % 4 !== 0) {
            return new TextEncoder().encode(b64);
        }
        // Avoid running regex on very large strings (causes regex engine failure/slowdown)
        const prefix = b64.length > 1000 ? b64.slice(0, 1000) : b64;
        const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;
        if (!base64Pattern.test(prefix)) {
            // Not valid base64 → treat as raw UTF-8 string
            return new TextEncoder().encode(b64);
        }
        try {
            const s = atob(b64);
            const out = new Uint8Array(s.length);
            for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
            return out;
        } catch (e) {
            console.warn("b64decodeToBytes: fallback to UTF-8, not valid base64", e);
            return new TextEncoder().encode(b64);
        }
    }


    function dataURLToParts(dataUrl) {
        const idx = dataUrl.indexOf(",");
        const meta = dataUrl.slice(0, idx);
        const dataB64 = dataUrl.slice(idx + 1);
        return { meta, dataB64 };
    }

    function dataURLFromParts(meta, bytes) {
        // bytes -> base64
        return meta + "," + b64encodeBytes(bytes);
    }

    function niceBytes(n) {
        if (n == null) return "-";
        const units = ["B", "KB", "MB", "GB"];
        let i = 0;
        let v = n;
        while (v >= 1024 && i < units.length - 1) {
            v /= 1024;
            i++;
        }
        return `${v.toFixed(v < 10 && i > 0 ? 2 : 0)} ${units[i]}`;
    }

    function normalizeVirtualPath(p) {
        return (p || "")
            .replace(/<[^>]*>/g, "")
            .replace(/\\/g, "/")
            .replace(/^\/+|\/+$/g, "");
    }

    function splitVirtualName(name) {
        const cleaned = normalizeVirtualPath(name);
        const parts = cleaned.split("/").filter(Boolean);
        const base = parts.pop() || "";
        return { dir: parts.join("/"), base };
    }

    function joinVirtualName(dir, base) {
        const d = normalizeVirtualPath(dir);
        return d ? `${d}/${base}` : base;
    }

    function incrementVersionedName(name) {
        const dot = name.lastIndexOf(".");
        const hasExt = dot > 0;
        const base = hasExt ? name.slice(0, dot) : name;
        const ext = hasExt ? name.slice(dot) : "";
        const m = base.match(/^(.*) \((\d+)\)$/);
        if (!m) return `${base} (2)${ext}`;
        return `${m[1]} (${Number(m[2]) + 1})${ext}`;
    }

    function splitBySize(raw, size) {
        const out = [];
        for (let i = 0; i < raw.length; i += size) out.push(raw.slice(i, i + size));
        return out;
    }

    async function sha256HexBytes(bytes) {
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }

    async function sha256HexString(str) {
        return sha256HexBytes(te.encode(str));
    }

    function getSettings() {
        try {
            return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
        } catch {
            return {};
        }
    }

    function setSettings(next) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    }

    function placeholderDataUrl(label, bg = "#333") {
        return "data:image/svg+xml;base64," + btoa(`
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <rect width="100" height="100" fill="${bg}"/>
  <text x="50%" y="50%" fill="white" font-size="14" text-anchor="middle" dominant-baseline="middle">${label}</text>
</svg>`);
    }

    function textPreviewDataUrl(text) {
        const safe = String(text || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        const snippet = safe.slice(0, 120) || "(empty)";
        return "data:image/svg+xml;base64," + btoa(`
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120">
  <rect width="240" height="120" fill="#1f2430"/>
  <text x="12" y="24" fill="#9ecbff" font-size="11" font-family="monospace">TXT</text>
  <foreignObject x="10" y="32" width="220" height="78">
    <div xmlns="http://www.w3.org/1999/xhtml" style="color:#d6deeb;font-size:10px;line-height:1.2;font-family:monospace;white-space:pre-wrap;overflow:hidden;">${snippet}</div>
  </foreignObject>
</svg>`);
    }

    // gzip/gunzip adapters (fflate if present)
    function gzipSync(bytes) {
        if (hasFflate) return window.fflate.gzipSync(bytes);
        return fflateGzip(bytes);
    }

    function gunzipSync(bytes) {
        if (hasFflate) return window.fflate.gunzipSync(bytes);
        return fflateGunzip(bytes);
    }

    // ---------- WebCrypto AES-GCM helpers ----------
    async function deriveKey(pass, salt) {
        const km = await crypto.subtle.importKey("raw", te.encode(pass), { name: "PBKDF2" }, false, ["deriveKey"]);
        return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" },
            km, { name: "AES-GCM", length: 256 },
            false, ["encrypt", "decrypt"]
        );
    }
    async function encryptBytes(bytes, pass) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveKey(pass, salt);
        const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes));
        return { ct, salt, iv };
    }
    async function decryptBytes(ct, pass, salt, iv) {
        const key = await deriveKey(pass, salt);
        const pt = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct));
        return pt;
    }

    function renderMarkdown(mdText) {
        let html = mdText
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // Code blocks (```lang ... ```)
        html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
            return `<pre style="background:#222; padding:12px; border-radius:6px; overflow-x:auto; border:1px solid #444; font-family:monospace; color:#fff; text-align:left;"><code>${code.trim()}</code></pre>`;
        });

        // Inline code (`code`)
        html = html.replace(/`([^`]+)`/g, '<code style="background:#333; padding:2px 6px; border-radius:4px; font-family:monospace; color:#ff79c6;">$1</code>');

        // Headers
        html = html.replace(/^######\s+(.*)$/gm, '<h6 style="color:#02ff88; margin-top:16px;">$1</h6>');
        html = html.replace(/^#####\s+(.*)$/gm, '<h5 style="color:#02ff88; margin-top:16px;">$1</h5>');
        html = html.replace(/^####\s+(.*)$/gm, '<h4 style="color:#02ff88; margin-top:16px;">$1</h4>');
        html = html.replace(/^###\s+(.*)$/gm, '<h3 style="color:#02ff88; margin-top:16px;">$1</h3>');
        html = html.replace(/^##\s+(.*)$/gm, '<h2 style="color:#02ff88; margin-top:20px; border-bottom:1px solid #333; padding-bottom:6px;">$1</h2>');
        html = html.replace(/^#\s+(.*)$/gm, '<h1 style="color:#02ff88; margin-top:24px; border-bottom:2px solid #02ff88; padding-bottom:8px;">$1</h1>');

        // Bold (**text**)
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Italics (*text*)
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // Links [text](url)
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#02ff88; text-decoration:underline;">$1</a>');

        // Bullet lists (- item)
        html = html.replace(/(?:^-\s+.*(?:\r?\n|$))+/gm, (match) => {
            const items = match.trim().split(/\r?\n/).map(line => {
                const itemText = line.replace(/^-\s+/, "");
                return `<li style="margin-left:20px; margin-bottom:4px; list-style-type:disc;">${itemText}</li>`;
            }).join("");
            return `<ul style="margin:10px 0; padding-left:20px;">${items}</ul>`;
        });

        // Horizontal Rule (---)
        html = html.replace(/^---\s*$/gm, '<hr style="border:0; border-top:1px solid #444; margin:20px 0;">');

        // Paragraphs (split by double newline, skip blocks we already wrapped)
        const paragraphs = html.split(/\n\n+/);
        html = paragraphs.map(p => {
            const trimmed = p.trim();
            if (!trimmed) return "";
            if (trimmed.startsWith("<h") || trimmed.startsWith("<pre") || trimmed.startsWith("<ul") || trimmed.startsWith("<hr")) {
                return trimmed;
            }
            return `<p style="line-height:1.6; margin-bottom:12px; color:#ddd;">${trimmed.replace(/\n/g, "<br>")}</p>`;
        }).join("\n");

        return html;
    }

    function highlightCode(codeText, extension) {
        let escaped = codeText
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        const ext = (extension || "").toLowerCase();
        
        if (ext === "json") {
            escaped = escaped.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*")(\s*:)/g, '<span style="color:#9ecbff;">$1</span>$3');
            escaped = escaped.replace(/(:\s*)("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*")/g, '$1<span style="color:#a5e075;">$2</span>');
            escaped = escaped.replace(/:\s*(-?\d+\.?\d*([eE][+-]?\d+)?)/g, ': <span style="color:#f08080;">$1</span>');
            escaped = escaped.replace(/:\s*(true|false)/g, ': <span style="color:#c792ea; font-weight:bold;">$1</span>');
            escaped = escaped.replace(/:\s*(null)/g, ': <span style="color:#ff5370; font-style:italic;">$1</span>');
        } else if (["js", "ts", "jsx", "tsx", "c", "cpp", "h", "hpp", "cs", "go", "rs", "java", "sql", "sh", "py", "bat", "ps1"].includes(ext)) {
            const keywords = /\b(break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|import|in|instanceof|new|return|super|switch|this|throw|try|typeof|var|void|while|with|yield|let|await|async|package|private|protected|public|static|struct|fn|impl|pub|interface|using|namespace|int|float|double|char|void|boolean|bool|string)\b/g;
            const tokens = [];
            let index = 0;
            
            escaped = escaped.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, (match) => {
                const id = `___TOKEN_COMMENT_${index++}___`;
                tokens.push({ id, content: `<span style="color:#7c8f8f; font-style:italic;">${match}</span>` });
                return id;
            });

            escaped = escaped.replace(/"(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"|'([^'\\]|\\.)*'|`([\s\S]*?)`/g, (match) => {
                const id = `___TOKEN_STRING_${index++}___`;
                tokens.push({ id, content: `<span style="color:#a5e075;">${match}</span>` });
                return id;
            });

            escaped = escaped.replace(keywords, '<span style="color:#c792ea; font-weight:bold;">$1</span>');
            escaped = escaped.replace(/\b([a-zA-Z0-9_$]+)(?=\()/g, '<span style="color:#82aaff;">$1</span>');
            escaped = escaped.replace(/\b(\d+)\b/g, '<span style="color:#f78c6c;">$1</span>');

            for (const token of tokens) {
                escaped = escaped.replace(token.id, token.content);
            }
        } else if (ext === "html" || ext === "xml") {
            const tokens = [];
            let index = 0;

            escaped = escaped.replace(/&lt;!--[\s\S]*?--&gt;/g, (match) => {
                const id = `___TOKEN_HTML_COMMENT_${index++}___`;
                tokens.push({ id, content: `<span style="color:#7c8f8f; font-style:italic;">${match}</span>` });
                return id;
            });

            escaped = escaped.replace(/(&lt;\/?)([a-zA-Z0-9:-]+)/g, '$1<span style="color:#ff5370;">$2</span>');
            escaped = escaped.replace(/(\s+)([a-zA-Z0-9:-]+)(=&quot;.*?&quot;|=&#39;.*?&#39;)/g, '$1<span style="color:#c792ea;">$2</span>$3');
            escaped = escaped.replace(/(=&quot;)(.*?)(&quot;)/g, '$1<span style="color:#a5e075;">$2</span>$3');
            escaped = escaped.replace(/(=&#39;)(.*?)(&#39;)/g, '$1<span style="color:#a5e075;">$2</span>$3');

            for (const token of tokens) {
                escaped = escaped.replace(token.id, token.content);
            }
        } else if (ext === "css") {
            const tokens = [];
            let index = 0;

            escaped = escaped.replace(/\/\*[\s\S]*?\*\//g, (match) => {
                const id = `___TOKEN_CSS_COMMENT_${index++}___`;
                tokens.push({ id, content: `<span style="color:#7c8f8f; font-style:italic;">${match}</span>` });
                return id;
            });

            escaped = escaped.replace(/([a-zA-Z-]+\s*):([^;]+;)/g, '<span style="color:#c792ea;">$1</span>:$2');
            escaped = escaped.replace(/([a-zA-Z0-9.#_:\s,-]+)(?=\s*\{)/g, '<span style="color:#82aaff;">$1</span>');

            for (const token of tokens) {
                escaped = escaped.replace(token.id, token.content);
            }
        }

        const lines = escaped.split(/\r?\n/);
        const totalLines = lines.length;
        const padding = String(totalLines).length;
        
        const numberedLines = lines.map((line, idx) => {
            const lineNum = String(idx + 1).padStart(padding, " ");
            return `<div style="display:flex; line-height:1.5;"><span style="color:#4b5263; width:${padding * 9 + 15}px; display:inline-block; user-select:none; border-right:1px solid #282c34; padding-right:8px; margin-right:10px; text-align:right;">${lineNum}</span><span style="flex:1; white-space:pre-wrap;">${line || " "}</span></div>`;
        }).join("");

        return `<pre style="background:#282c34; color:#abb2bf; padding:12px; border-radius:8px; font-family:'Courier New', Courier, monospace; font-size:13px; overflow-x:auto; margin:0; border:1px solid #1e222b; text-align:left; width:100%; box-sizing:border-box;">${numberedLines}</pre>`;
    }

    // ---------- DOM helpers & UI auto-insert ----------
    function qs(sel) { return document.querySelector(sel); }

    function createSettingsPopup() {
        if (qs("#settings-popup")) return;

        const popup = document.createElement("div");
        popup.id = "settings-popup";
        popup.style.position = "fixed";
        popup.style.top = "0";
        popup.style.left = "0";
        popup.style.width = "100%";
        popup.style.height = "100%";
        popup.style.background = "rgba(0,0,0,0.7)";
        popup.style.display = "none";
        popup.style.zIndex = "10000";
        popup.style.alignItems = "center";
        popup.style.justifyContent = "center";

        const box = document.createElement("div");
        box.style.background = "var(--bg-card)";
        box.style.color = "var(--text-primary)";
        box.style.border = "1px solid var(--border)";
        box.style.boxShadow = "var(--shadow)";
        box.style.padding = "20px";
        box.style.borderRadius = "12px";
        box.style.width = "min(500px, 92%)";
        box.style.maxHeight = "90vh";
        box.style.overflowY = "auto";
        box.style.boxSizing = "border-box";

        box.innerHTML = `
      <h2 style="margin-top: 0; display: flex; align-items: center; gap: 8px; color: var(--accent);">⚙ Settings</h2>
      <div style="margin-bottom: 12px;">
        <label style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span>Max Bookmark Size:</span>
          <input type="number" id="setting-maxsize" min="1000" style="width: 80px; padding: 4px 8px; background: var(--bg-main); border: 1px solid var(--border); color: var(--text-primary); border-radius: 4px; outline: none;">
        </label>
        <label style="display: flex; justify-content: space-between; align-items: center;">
          <span>Page Size:</span>
          <input type="number" id="setting-pagesize" min="5" max="200" style="width: 80px; padding: 4px 8px; background: var(--bg-main); border: 1px solid var(--border); color: var(--text-primary); border-radius: 4px; outline: none;">
        </label>
      </div>
      <fieldset style="border: 1px solid var(--border); border-radius: 6px; padding: 10px 14px; margin-bottom: 12px;">
        <legend style="padding: 0 6px; color: var(--accent); font-weight: 500;">Show Columns</legend>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
          <label><input type="checkbox" data-col="preview"> Preview</label>
          <label><input type="checkbox" data-col="name"> Name</label>
          <label><input type="checkbox" data-col="size"> Size</label>
          <label><input type="checkbox" data-col="date"> Date</label>
          <label><input type="checkbox" data-col="download"> Download</label>
          <label><input type="checkbox" data-col="clipboard"> Clipboard</label>
          <label><input type="checkbox" data-col="share"> Share</label>
          <label><input type="checkbox" data-col="rename"> Rename</label>
          <label style="grid-column: span 2;"><input type="checkbox" data-col="delete"> Delete</label>
        </div>
      </fieldset>

      <fieldset style="border: 1px solid var(--border); border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; text-align: left;">
        <legend style="padding: 0 6px; color: var(--accent); font-weight: 500;">🕵️ <span>User</span>-Agent Switcher</legend>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
            <input type="checkbox" id="setting-ua-enabled">
            <span>Enable User-Agent Spoofing</span>
          </label>
          
          <div id="ua-main-container" style="display: none; border-top: 1px solid var(--border); padding-top: 8px; margin-top: 4px;">
            <label style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span>Apply to:</span>
              <select id="setting-ua-apply-to" style="padding: 4px 8px; background: var(--bg-main); border: 1px solid var(--border); color: var(--text-primary); border-radius: 4px; outline: none; cursor: pointer;">
                <option value="iframe">Iframe Browser Only</option>
                <option value="global">Whole Browser (All Tabs)</option>
              </select>
            </label>

            <label style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span>Rotation Trigger:</span>
              <select id="setting-ua-trigger" style="padding: 4px 8px; background: var(--bg-main); border: 1px solid var(--border); color: var(--text-primary); border-radius: 4px; outline: none; cursor: pointer;">
                <option value="never">Never (Locked Preset)</option>
                <option value="request">Every Page Load / Request</option>
                <option value="periodic">Periodic Interval</option>
                <option value="startup">Extension / Browser Startup</option>
              </select>
            </label>

            <div id="ua-interval-container" style="display: none; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span>Interval (minutes):</span>
              <input type="number" id="setting-ua-interval" min="1" max="1440" style="width: 80px; padding: 4px 8px; background: var(--bg-main); border: 1px solid var(--border); color: var(--text-primary); border-radius: 4px; outline: none;">
            </div>

            <div id="ua-custom-container" style="display: none; flex-direction: column; gap: 4px; margin-bottom: 6px;">
              <span style="font-weight: 500;">Select Preset:</span>
              <select id="setting-ua-preset-select" style="padding: 4px 8px; background: var(--bg-main); border: 1px solid var(--border); color: var(--text-primary); border-radius: 4px; outline: none; cursor: pointer; margin-bottom: 4px;">
                <option value="custom">-- Custom User-Agent --</option>
                <option value="chrome-win">Chrome on Windows</option>
                <option value="safari-mac">Safari on MacOS</option>
                <option value="firefox-linux">Firefox on Linux</option>
                <option value="safari-ios">Safari on iPhone (iOS)</option>
                <option value="chrome-android">Chrome on Android</option>
                <option value="googlebot-desktop">Googlebot (Desktop)</option>
                <option value="googlebot-mobile">Googlebot (Mobile)</option>
                <option value="bingbot">Bingbot</option>
              </select>
              <span>Custom User-Agent String:</span>
              <textarea id="setting-ua-custom" placeholder="e.g. Mozilla/5.0 (Linux; Android 10) ..." style="width: 100%; height: 50px; padding: 6px 8px; background: var(--bg-main); border: 1px solid var(--border); color: var(--text-primary); border-radius: 4px; outline: none; resize: none; box-sizing: border-box; font-size: 11px; font-family: monospace;"></textarea>
            </div>

            <div id="ua-filters-container" style="display: none; flex-direction: column; gap: 6px; margin-bottom: 6px; background: rgba(255,255,255,0.03); padding: 8px; border-radius: 6px;">
              <div style="font-weight: 500; font-size: 12px; margin-bottom: 2px;">Allowed OS:</div>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                <label style="cursor: pointer;"><input type="checkbox" data-ua-os="windows"> Windows</label>
                <label style="cursor: pointer;"><input type="checkbox" data-ua-os="macos"> MacOS</label>
                <label style="cursor: pointer;"><input type="checkbox" data-ua-os="linux"> Linux</label>
                <label style="cursor: pointer;"><input type="checkbox" data-ua-os="android"> Android</label>
                <label style="cursor: pointer;"><input type="checkbox" data-ua-os="ios"> iOS</label>
              </div>
              <div style="font-weight: 500; font-size: 12px; margin-top: 4px; margin-bottom: 2px;">Allowed Browsers:</div>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                <label style="cursor: pointer;"><input type="checkbox" data-ua-browser="chrome"> Chrome</label>
                <label style="cursor: pointer;"><input type="checkbox" data-ua-browser="firefox"> Firefox</label>
                <label style="cursor: pointer;"><input type="checkbox" data-ua-browser="safari"> Safari</label>
                <label style="cursor: pointer;"><input type="checkbox" data-ua-browser="edge"> Edge</label>
              </div>
            </div>

            <div id="ua-exceptions-container" style="display: flex; flex-direction: column; gap: 4px;">
              <span>Exclude Domains (one per line):</span>
              <textarea id="setting-ua-exceptions" placeholder="e.g.&#10;google.com&#10;facebook.com" style="width: 100%; height: 50px; padding: 6px 8px; background: var(--bg-main); border: 1px solid var(--border); color: var(--text-primary); border-radius: 4px; outline: none; resize: none; box-sizing: border-box; font-size: 11px; font-family: monospace;"></textarea>
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset style="border: 1px solid var(--border); border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; text-align: left;">
        <legend style="padding: 0 6px; color: var(--accent); font-weight: 500;">🌐 <span>Network </span>/ Security Bypass</legend>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
            <input type="checkbox" id="setting-csp-bypass">
            <span>Bypass CSP & X-Frame-Options (allows framing websites)</span>
          </label>
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
            <input type="checkbox" id="setting-cors-bypass">
            <span>Bypass CORS Restrictions (allows cross-origin requests)</span>
          </label>
        </div>
      </fieldset>

      <fieldset style="border: 1px solid var(--border); border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; text-align: left;">
        <legend style="padding: 0 6px; color: var(--accent); font-weight: 500;">🔒 Encryption & Security</legend>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
            <input type="checkbox" id="setting-bypass-upload-encryption">
            <span>Bypass Upload Encryption (Upload unencrypted)</span>
          </label>
        </div>
      </fieldset>

      <fieldset style="border: 1px solid var(--border); border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; text-align: left;">
        <legend style="padding: 0 6px; color: var(--accent); font-weight: 500;">🎨 <span>Appearance </span>& Themes</legend>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <label style="display: flex; justify-content: space-between; align-items: center;">
            <span>Theme Preset:</span>
            <select id="setting-theme-preset" style="padding: 4px 8px; background: var(--bg-main); border: 1px solid var(--border); color: var(--text-primary); border-radius: 4px; outline: none; cursor: pointer;">
              <option value="default_dark">Default Dark</option>
              <option value="dracula">Dracula</option>
              <option value="nord">Nord</option>
              <option value="cyberpunk">Cyberpunk</option>
              <option value="solarized">Solarized</option>
              <option value="monokai">Monokai</option>
            </select>
          </label>
          <label style="display: flex; justify-content: space-between; align-items: center;">
            <span>Custom Accent Color:</span>
            <input type="color" id="setting-custom-accent" style="border: none; padding: 0; width: 40px; height: 24px; cursor: pointer; background: transparent;">
          </label>
        </div>
      </fieldset>

      <fieldset style="border: 1px solid var(--border); border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; text-align: left;">
        <legend style="padding: 0 6px; color: var(--accent); font-weight: 500;">🧹 Storage Cleanup & Diagnostics</legend>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button id="btn-storage-scan" class="button" style="width: 100%;">🔍 <span>Scan Storage Health</span></button>
          <div id="storage-scan-results" style="display: none; font-size: 12px; border-top: 1px solid var(--border); padding-top: 8px; margin-top: 4px; flex-direction: column; gap: 6px;">
            <div id="scan-dup-info">Duplicates found: -</div>
            <button id="btn-purge-dups" class="button" style="display: none; padding: 4px 8px; font-size: 11px; background-color: #991b1b !important; color: #fecaca !important; border-color: #991b1b !important;">Purge Duplicates</button>
            <div id="scan-orphans-info">Orphaned chunks: -</div>
            <button id="btn-purge-orphans" class="button" style="display: none; padding: 4px 8px; font-size: 11px; background-color: #991b1b !important; color: #fecaca !important; border-color: #991b1b !important;">Purge Orphans</button>
            <div style="font-weight: 500; margin-top: 4px;">Top 5 Largest Files:</div>
            <ol id="scan-largest-list" style="margin: 0; padding-left: 20px;"></ol>
          </div>
        </div>
      </fieldset>
      
      <fieldset style="border: 1px solid var(--border); border-radius: 6px; padding: 10px 14px; margin-bottom: 16px;">
        <legend style="padding: 0 6px; color: var(--accent); font-weight: 500;">Data Backup & Migration</legend>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <button id="settings-export" class="button" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 6px 12px;">📤 Export Database</button>
          <label class="button" style="display: flex; align-items: center; justify-content: center; gap: 4px; cursor: pointer; width: 100%; box-sizing: border-box; padding: 6px 12px; margin: 0;">
            📥 Import Database
            <input type="file" id="settings-import-input" accept="application/json" style="display: none;">
          </label>
          <button id="settings-share-import" class="button" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 6px 12px;">🔗 Import Share Link</button>
        </div>
      </fieldset>

      <div style="display: flex; gap: 8px; justify-content: flex-end; align-items: center;">
        <button id="settings-save" class="button" style="padding: 6px 16px;">Save</button>
        <button id="settings-close" class="button" style="padding: 6px 16px;">Close</button>
        <button id="settings-deleteall" class="button" style="background-color: #ef4444 !important; color: #fff !important; border-color: #ef4444 !important; padding: 6px 12px;">Delete All Files</button>
      </div>
    `;

        popup.appendChild(box);
        document.body.appendChild(popup);

        // Bind dynamic UA section events
        qs("#setting-ua-enabled").addEventListener("change", updateUaUiVisibility);
        qs("#setting-ua-trigger").addEventListener("change", updateUaUiVisibility);

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

        qs("#setting-ua-preset-select").addEventListener("change", (e) => {
            const val = e.target.value;
            if (val !== "custom" && UA_PRESETS[val]) {
                qs("#setting-ua-custom").value = UA_PRESETS[val];
            }
        });

        // Close logic
        qs("#settings-close").onclick = () => popup.style.display = "none";

        // Appearance bindings
        qs("#setting-theme-preset").addEventListener("change", (e) => {
            applyThemePreset(e.target.value);
        });
        qs("#setting-custom-accent").addEventListener("input", (e) => {
            applyCustomAccent(e.target.value);
        });

        // Scan bindings
        let scanResultsData = null;
        qs("#btn-storage-scan").onclick = async () => {
            const scanBtn = qs("#btn-storage-scan");
            scanBtn.textContent = "Scanning...";
            scanBtn.disabled = true;
            try {
                scanResultsData = await runStorageCleanup();
                qs("#scan-dup-info").textContent = `Duplicates found: ${scanResultsData.duplicates.length} group(s)`;
                qs("#btn-purge-dups").style.display = scanResultsData.duplicates.length > 0 ? "inline-block" : "none";
                
                qs("#scan-orphans-info").textContent = `Orphaned chunk directories: ${scanResultsData.orphanedChunks.length}`;
                qs("#btn-purge-orphans").style.display = scanResultsData.orphanedChunks.length > 0 ? "inline-block" : "none";

                const largestList = qs("#scan-largest-list");
                largestList.innerHTML = "";
                scanResultsData.largest.forEach(item => {
                    const li = document.createElement("li");
                    li.textContent = `${item.file.handle.title} (${niceBytes(item.meta.sizeOriginal)})`;
                    largestList.appendChild(li);
                });

                qs("#storage-scan-results").style.display = "flex";
            } catch (err) {
                alert("Scan failed: " + err.message);
            } finally {
                scanBtn.textContent = "🔍 Scan Storage Health";
                scanBtn.disabled = false;
            }
        };

        // Purge duplicates
        qs("#btn-purge-dups").onclick = async () => {
            if (!scanResultsData || scanResultsData.duplicates.length === 0) return;
            if (!confirm("Are you sure you want to delete all duplicate files (keeping one version of each)?")) return;
            try {
                let deletedCount = 0;
                for (const group of scanResultsData.duplicates) {
                    // Keep the first file, delete the rest
                    for (let i = 1; i < group.length; i++) {
                        const duplicateFile = group[i].file;
                        await duplicateFile.delete();
                        removeFileFromCache(duplicateFile.handle.id);
                        deletedCount++;
                    }
                }
                alert(`Purged ${deletedCount} duplicate file(s) successfully!`);
                await loadFilesToTable();
                qs("#btn-storage-scan").click(); // Re-scan
            } catch (err) {
                alert("Purge duplicates failed: " + err.message);
            }
        };

        // Purge orphans
        qs("#btn-purge-orphans").onclick = async () => {
            if (!scanResultsData || scanResultsData.orphanedChunks.length === 0) return;
            if (!confirm(`Are you sure you want to delete all ${scanResultsData.orphanedChunks.length} orphaned chunk directories?`)) return;
            try {
                let deletedCount = 0;
                for (const chunkFolder of scanResultsData.orphanedChunks) {
                    try {
                        const children = await chrome.bookmarks.getChildren(chunkFolder.id);
                        for (const child of children) {
                            await chrome.bookmarks.remove(child.id);
                        }
                        await chrome.bookmarks.remove(chunkFolder.id);
                        deletedCount++;
                    } catch (e) {}
                }
                alert(`Purged ${deletedCount} orphaned chunk directory/directories successfully!`);
                qs("#btn-storage-scan").click(); // Re-scan
            } catch (err) {
                alert("Purge orphans failed: " + err.message);
            }
        };

        // Share Import logic
        qs("#settings-share-import").onclick = async () => {
            const pasteStr = prompt("Paste the shareable Base64 string here:");
            if (!pasteStr) return;
            try {
                const jsonStr = atob(pasteStr.trim());
                const pkg = JSON.parse(jsonStr);
                if (pkg.type !== "bookmarkfs-share") throw new Error("Invalid share package");
                
                let target = pkg.name;
                while (await getFileByName(target)) target = incrementVersionedName(target);
                
                const fobj = await createNewFile(target);
                if (pkg.meta) await fobj.writeMeta(migrateMeta(pkg.meta));
                await fobj.write(pkg.serialized, (p) => setProgress(p));
                
                await loadFilesToTable();
                alert(`Imported file: ${target}`);
            } catch (err) {
                alert("Import failed: " + err.message);
            } finally {
                setProgress(0);
            }
        };

        // Save logic
        qs("#settings-save").onclick = async () => {
            const settings = {
                maxSize: parseInt(qs("#setting-maxsize").value, 10) || 9092,
                pageSize: parseInt(qs("#setting-pagesize").value, 10) || 25,
                bypassUploadEncryption: qs("#setting-bypass-upload-encryption").checked,
                columns: [...document.querySelectorAll("#settings-popup input[data-col]")]
                    .filter(c => c.checked)
                    .map(c => c.dataset.col)
            };

            setSettings(settings);

            // Save User-Agent settings
            const uaSettings = {
                enabled: qs("#setting-ua-enabled").checked,
                applyTo: qs("#setting-ua-apply-to").value,
                rotationTrigger: qs("#setting-ua-trigger").value,
                rotationInterval: parseInt(qs("#setting-ua-interval").value, 10) || 10,
                customUa: qs("#setting-ua-custom").value.trim(),
                allowedOS: [...document.querySelectorAll("#settings-popup input[data-ua-os]")]
                    .filter(c => c.checked)
                    .map(c => c.dataset.uaOS),
                allowedBrowsers: [...document.querySelectorAll("#settings-popup input[data-ua-browser]")]
                    .filter(c => c.checked)
                    .map(c => c.dataset.uaBrowser),
                exceptions: qs("#setting-ua-exceptions").value.split("\n").map(d => d.trim()).filter(Boolean),
                cspBypass: qs("#setting-csp-bypass").checked,
                corsBypass: qs("#setting-cors-bypass").checked
            };

            await chrome.storage.local.set({ bookmarkfs_ua_settings: uaSettings });

            // Notify background to re-apply declarativeNetRequest rules and alarms
            try {
                chrome.runtime.sendMessage({ action: "update-ua-settings" });
            } catch (e) {}

            qs("#settings-popup").style.display = "none";

            applySettings();
            await loadFilesToTable();
        };

        // wire up Delete All (place after saveBtn / closeBtn wiring in createSettingsPopup)
        const deleteAllBtn = popup.querySelector('#settings-deleteall');
        if (deleteAllBtn) {
            deleteAllBtn.addEventListener('click', async() => {
                if (!confirm("⚠️ This will permanently delete ALL stored files. Are you sure?")) return;
                deleteAllBtn.disabled = true;
                try {
                    // 1) remove all file-folders using your existing listFiles()/FileObj.delete()
                    const files = await listFiles();
                    for (const f of files) {
                        try {
                            await f.delete();
                        } catch (err) {
                            console.warn("Failed to delete file folder:", f && f.handle && f.handle.title, err);
                        }
                    }

                    // 2) extra cleanup: remove any stray nodes directly under the bookmarkfs root that look like data/meta
                    try {
                        const root = await fsRoot();
                        for (const node of(root.children || [])) {
                            if (node && node.title && (node.title.startsWith(META_PREFIX) || node.title.startsWith(CHUNK_PREFIX))) {
                                try { await chrome.bookmarks.remove(node.id); } catch (e) { console.warn("Failed to remove stray node", node, e); }
                            }
                        }
                    } catch (e) {
                        console.warn("fsRoot stray cleanup failed:", e);
                    }

                    // 3) Refresh UI
                    await loadFilesToTable();
                    // reset settings to defaults
                    // const defaultSettings = { maxSize: 9092, columns: DEFAULT_COLUMNS.slice(), dark: false };
                    // saveSettingsToStorage(defaultSettings);
                    // applySettings();
                    alert("All files deleted.");
                } catch (e) {
                    alert("Delete failed: " + (e && e.message ? e.message : String(e)));
                } finally {
                    deleteAllBtn.disabled = false;
                }
            });
        }


    }

    function applySettings() {
        const s = getSettings();

        if (Number.isFinite(s.maxSize) && s.maxSize > 0) maxBookmarkSize = s.maxSize;
        if (Number.isFinite(s.pageSize) && s.pageSize > 0) pageSize = s.pageSize;

        // Apply dark mode unified with the global theme toggle
        const theme = localStorage.getItem("bookmarkfs_theme") || "dark";
        const isLight = theme === "light";
        document.documentElement.classList.toggle("light-mode", isLight);
        document.body.classList.toggle("light-mode", isLight);
        document.body.classList.toggle("dark-mode", !isLight);

        const toggleBtn = document.getElementById("global-theme-toggle");
        if (toggleBtn) {
            toggleBtn.innerHTML = isLight ? "🌙 <span>Dark</span>" : "☀️ <span>Light</span>";
        }

        // Apply column visibility
        const allCols = ["preview", "name", "size", "date", "download", "clipboard", "share", "rename", "delete"];
        allCols.forEach((col, idx) => {
            const th = qs(`#table thead th:nth-child(${idx+2})`);
            const cells = document.querySelectorAll(`#table tbody tr td:nth-child(${idx+2})`);
            const show = !s.columns || s.columns.includes(col);
            if (th) th.style.display = show ? "" : "none";
            cells.forEach(td => td.style.display = show ? "" : "none");
        });
    }

    function updateUaUiVisibility() {
        const enabled = qs("#setting-ua-enabled").checked;
        const mainContainer = qs("#ua-main-container");
        if (!mainContainer) return;

        if (!enabled) {
            mainContainer.style.display = "none";
            return;
        }
        mainContainer.style.display = "block";

        const trigger = qs("#setting-ua-trigger").value;
        const intervalContainer = qs("#ua-interval-container");
        const customContainer = qs("#ua-custom-container");
        const filtersContainer = qs("#ua-filters-container");

        if (trigger === "never") {
            intervalContainer.style.display = "none";
            customContainer.style.display = "block";
            filtersContainer.style.display = "none";
        } else if (trigger === "periodic") {
            intervalContainer.style.display = "flex";
            customContainer.style.display = "none";
            filtersContainer.style.display = "block";
        } else { // startup or request
            intervalContainer.style.display = "none";
            customContainer.style.display = "none";
            filtersContainer.style.display = "block";
        }
    }

    async function loadSettingsIntoPopup() {
        const s = getSettings();

        qs("#setting-maxsize").value = s.maxSize || 9092;
        qs("#setting-pagesize").value = s.pageSize || 25;
        qs("#setting-bypass-upload-encryption").checked = !!s.bypassUploadEncryption;

        // Reset all checkboxes first
        document.querySelectorAll("#settings-popup input[data-col]").forEach(c => c.checked = false);

        // Check only saved ones
        (s.columns || ["preview", "name", "size", "date", "download", "clipboard", "rename", "delete"])
        .forEach(col => {
            const checkbox = document.querySelector(`#settings-popup input[data-col="${col}"]`);
            if (checkbox) checkbox.checked = true;
        });

        // Load User-Agent settings
        const res = await chrome.storage.local.get(["bookmarkfs_ua_settings"]);
        const ua = res.bookmarkfs_ua_settings || {
            enabled: false,
            applyTo: "iframe",
            rotationTrigger: "never",
            rotationInterval: 10,
            customUa: "",
            allowedOS: ["windows", "macos", "linux", "android", "ios"],
            allowedBrowsers: ["chrome", "firefox", "safari", "edge"],
            exceptions: ["facebook.com", "www.facebook.com", "m.facebook.com"],
            cspBypass: true,
            corsBypass: true
        };

        qs("#setting-ua-enabled").checked = !!ua.enabled;
        qs("#setting-ua-apply-to").value = ua.applyTo || "iframe";
        qs("#setting-ua-trigger").value = ua.rotationTrigger || "never";
        qs("#setting-ua-interval").value = ua.rotationInterval || 10;
        qs("#setting-ua-custom").value = ua.customUa || "";
        qs("#setting-csp-bypass").checked = ua.cspBypass !== false;
        qs("#setting-cors-bypass").checked = ua.corsBypass !== false;

        // Match customUa to presets
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
        const customVal = ua.customUa || "";
        let matchedPreset = "custom";
        for (const [key, val] of Object.entries(UA_PRESETS)) {
            if (customVal === val) {
                matchedPreset = key;
                break;
            }
        }
        qs("#setting-ua-preset-select").value = matchedPreset;

        qs("#setting-ua-exceptions").value = (ua.exceptions || []).join("\n");

        // Allowed OS checkboxes
        const osChecked = ua.allowedOS || [];
        document.querySelectorAll("#settings-popup input[data-ua-os]").forEach(c => {
            c.checked = osChecked.includes(c.dataset.uaOs);
        });

        // Allowed Browsers checkboxes
        const browserChecked = ua.allowedBrowsers || [];
        document.querySelectorAll("#settings-popup input[data-ua-browser]").forEach(c => {
            c.checked = browserChecked.includes(c.dataset.uaBrowser);
        });

        updateUaUiVisibility();

        const savedPreset = localStorage.getItem("bookmarkfs_theme_preset") || "default_dark";
        qs("#setting-theme-preset").value = savedPreset;
        const savedAccent = localStorage.getItem("bookmarkfs_custom_accent") || "#10b981";
        qs("#setting-custom-accent").value = savedAccent;

        qs("#storage-scan-results").style.display = "none";
    }

    function showEncryptDecryptModal(title, isUpload, callback) {
        const isLight = document.documentElement.classList.contains("light-mode") || document.body.classList.contains("light-mode");

        const modal = document.createElement("div");
        modal.style.position = "fixed";
        modal.style.inset = "0";
        modal.style.background = isLight ? "rgba(255, 255, 255, 0.75)" : "rgba(10, 10, 10, 0.85)";
        modal.style.backdropFilter = "blur(8px)";
        modal.style.display = "flex";
        modal.style.alignItems = "center";
        modal.style.justifyContent = "center";
        modal.style.zIndex = "100000";

        const box = document.createElement("div");
        box.style.background = isLight ? "#ffffff" : "#18181b";
        box.style.border = isLight ? "1px solid #e4e4e7" : "1px solid #27272a";
        box.style.color = isLight ? "#18181b" : "#f4f4f5";
        box.style.padding = "20px";
        box.style.borderRadius = "12px";
        box.style.width = "min(380px, 90%)";
        box.style.boxShadow = isLight ? "0 20px 25px -5px rgba(0,0,0,0.1)" : "0 20px 25px -5px rgba(0,0,0,0.5)";
        box.style.display = "flex";
        box.style.flexDirection = "column";
        box.style.gap = "12px";

        const heading = document.createElement("h3");
        heading.style.margin = "0";
        heading.style.fontSize = "16px";
        heading.style.fontWeight = "600";
        heading.style.color = isLight ? "#008f51" : "#02ff88";
        heading.textContent = title;

        const desc = document.createElement("p");
        desc.style.margin = "0";
        desc.style.fontSize = "12px";
        desc.style.color = isLight ? "#52525b" : "#a1a1aa";
        desc.textContent = isUpload 
            ? "Optional passphrase (AES-GCM). Leave blank to store unencrypted."
            : "Enter the passphrase to decrypt this file:";

        const input = document.createElement("input");
        input.type = "password";
        input.placeholder = "Enter passphrase...";
        input.style.width = "100%";
        input.style.padding = "8px 12px";
        input.style.borderRadius = "6px";
        input.style.border = isLight ? "1px solid #d4d4d8" : "1px solid #27272a";
        input.style.background = isLight ? "#f4f4f5" : "#09090b";
        input.style.color = isLight ? "#18181b" : "#f4f4f5";
        input.style.boxSizing = "border-box";

        const eyeBtn = document.createElement("button");
        eyeBtn.type = "button";
        eyeBtn.style.position = "absolute";
        eyeBtn.style.right = "8px";
        eyeBtn.style.top = "6px";
        eyeBtn.style.background = "none";
        eyeBtn.style.border = "none";
        eyeBtn.style.color = isLight ? "#71717a" : "#a1a1aa";
        eyeBtn.style.cursor = "pointer";
        eyeBtn.innerHTML = "👁️";

        const inputWrapper = document.createElement("div");
        inputWrapper.style.position = "relative";
        inputWrapper.appendChild(input);
        inputWrapper.appendChild(eyeBtn);

        eyeBtn.onclick = () => {
            if (input.type === "password") {
                input.type = "text";
                eyeBtn.innerHTML = "🙈";
            } else {
                input.type = "password";
                eyeBtn.innerHTML = "👁️";
            }
        };

        const strengthBar = document.createElement("div");
        strengthBar.style.height = "4px";
        strengthBar.style.width = "100%";
        strengthBar.style.background = isLight ? "#e4e4e7" : "#27272a";
        strengthBar.style.borderRadius = "2px";
        strengthBar.style.overflow = "hidden";
        strengthBar.style.display = isUpload ? "block" : "none";

        const strengthFill = document.createElement("div");
        strengthFill.style.height = "100%";
        strengthFill.style.width = "0%";
        strengthFill.style.transition = "width 0.3s, background-color 0.3s";
        strengthBar.appendChild(strengthFill);

        const strengthLabel = document.createElement("span");
        strengthLabel.style.fontSize = "11px";
        strengthLabel.style.color = isLight ? "#71717a" : "#71717a";
        strengthLabel.style.display = isUpload ? "block" : "none";
        strengthLabel.textContent = "Strength: Empty";

        input.oninput = () => {
            if (!isUpload) return;
            const val = input.value;
            let score = 0;
            if (val.length >= 6) score++;
            if (val.length >= 10) score++;
            if (/[A-Z]/.test(val)) score++;
            if (/[a-z]/.test(val)) score++;
            if (/[0-9]/.test(val)) score++;
            if (/[^A-Za-z0-9]/.test(val)) score++;

            let percent = 0;
            let color = "#ef4444";
            let text = "Weak";

            if (val.length === 0) {
                percent = 0;
                text = "Empty";
                color = isLight ? "#e4e4e7" : "#27272a";
            } else if (score <= 2) {
                percent = 33;
                color = "#ef4444";
                text = "Weak";
            } else if (score <= 4) {
                percent = 66;
                color = "#f59e0b";
                text = "Medium";
            } else {
                percent = 100;
                color = "#10b981";
                text = "Strong";
            }

            strengthFill.style.width = percent + "%";
            strengthFill.style.backgroundColor = color;
            strengthLabel.textContent = `Strength: ${text}`;
        };

        const buttonRow = document.createElement("div");
        buttonRow.style.display = "flex";
        buttonRow.style.gap = "8px";
        buttonRow.style.justifyContent = "flex-end";
        buttonRow.style.marginTop = "8px";

        const cancelBtn = document.createElement("button");
        cancelBtn.className = "button";
        cancelBtn.textContent = "Cancel";
        cancelBtn.onclick = () => {
            modal.remove();
            callback(null);
        };

        const okBtn = document.createElement("button");
        okBtn.className = "button";
        okBtn.textContent = "OK";
        okBtn.style.borderColor = isLight ? "#008f51" : "#02ff88";
        okBtn.style.color = isLight ? "#008f51" : "#02ff88";

        const cacheRow = document.createElement("label");
        cacheRow.style.display = "flex";
        cacheRow.style.alignItems = "center";
        cacheRow.style.gap = "6px";
        cacheRow.style.fontSize = "11px";
        cacheRow.style.color = isLight ? "#52525b" : "#a1a1aa";
        cacheRow.style.cursor = "pointer";

        const cacheCheckbox = document.createElement("input");
        cacheCheckbox.type = "checkbox";
        cacheCheckbox.checked = true;
        cacheRow.appendChild(cacheCheckbox);
        cacheRow.appendChild(document.createTextNode("Cache this passphrase for this session"));

        const submitAction = () => {
            const val = input.value;
            const cacheChecked = cacheCheckbox.checked;
            modal.remove();
            callback(val, cacheChecked);
        };

        okBtn.onclick = submitAction;
        input.onkeydown = (e) => {
            if (e.key === "Enter") submitAction();
        };

        buttonRow.appendChild(cancelBtn);
        buttonRow.appendChild(okBtn);

        box.appendChild(heading);
        box.appendChild(desc);

        if (isUpload) {
            const genBtn = document.createElement("button");
            genBtn.className = "button";
            genBtn.textContent = "🔑 Generate Secure Password";
            genBtn.style.fontSize = "11px";
            genBtn.style.padding = "4px 8px";
            genBtn.style.width = "fit-content";
            genBtn.onclick = () => {
                const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
                let pass = "";
                const array = new Uint32Array(16);
                crypto.getRandomValues(array);
                for (let i = 0; i < 16; i++) {
                    pass += chars[array[i] % chars.length];
                }
                input.value = pass;
                input.type = "text";
                eyeBtn.innerHTML = "🙈";
                input.oninput();
                
                navigator.clipboard.writeText(pass).then(() => {
                    alert("Password generated and copied to clipboard!");
                });
            };
            box.appendChild(genBtn);
        }

        box.appendChild(inputWrapper);
        if (isUpload) {
            box.appendChild(strengthBar);
            box.appendChild(strengthLabel);
        }

        box.appendChild(cacheRow);
        box.appendChild(buttonRow);
        modal.appendChild(box);
        document.body.appendChild(modal);
        input.focus();
    }

    function getFileCategory(name, mime) {
        const type = (mime || "").toLowerCase();
        const ext = name.split('.').pop().toLowerCase();
        
        if (type.startsWith("image/")) return "images";
        if (type.startsWith("audio/")) return "audio";
        if (type.startsWith("video/")) return "video";
        if (type === "application/pdf" || type.startsWith("application/msword") || type.includes("officedocument") || ["txt", "md", "pdf"].includes(ext)) return "docs";
        if (type === "application/zip" || type === "application/vnd.rar" || ["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "archives";
        if (["js", "ts", "jsx", "tsx", "py", "sh", "yml", "yaml", "c", "cpp", "h", "cs", "go", "rs", "java", "sql", "html", "css", "json", "xml"].includes(ext)) return "code";
        return "other";
    }

    function updateStorageChart(metas) {
        const chartContainer = qs("#storage-chart-container");
        if (!chartContainer) return;

        const categories = {
            images: { label: "Images", size: 0, color: "#3b82f6" },
            audio: { label: "Audio", size: 0, color: "#10b981" },
            video: { label: "Video", size: 0, color: "#8b5cf6" },
            docs: { label: "Docs", size: 0, color: "#f59e0b" },
            archives: { label: "Archives", size: 0, color: "#ef4444" },
            code: { label: "Code", size: 0, color: "#eab308" },
            other: { label: "Other", size: 0, color: "#6b7280" }
        };

        let totalSize = 0;
        for (const m of metas) {
            const size = (m.meta && Number.isFinite(m.meta.sizeStored)) ? m.meta.sizeStored : 0;
            const category = getFileCategory(m.file.handle.title, m.meta ? m.meta.type : "");
            categories[category].size += size;
            totalSize += size;
        }

        chartContainer.innerHTML = "";
        if (totalSize === 0) {
            chartContainer.style.display = "none";
            return;
        }
        chartContainer.style.display = "block";
        chartContainer.style.margin = "12px auto";
        chartContainer.style.width = "100%";
        chartContainer.style.maxWidth = "980px";
        chartContainer.style.boxSizing = "border-box";
        chartContainer.style.background = "#18181b";
        chartContainer.style.border = "1px solid #27272a";
        chartContainer.style.borderRadius = "8px";
        chartContainer.style.padding = "12px";

        const title = document.createElement("div");
        title.style.fontSize = "12px";
        title.style.color = "#a1a1aa";
        title.style.marginBottom = "8px";
        title.style.fontWeight = "bold";
        title.textContent = `📊 Storage Analysis (Total synced: ${niceBytes(totalSize)})`;
        chartContainer.appendChild(title);

        const bar = document.createElement("div");
        bar.style.display = "flex";
        bar.style.height = "12px";
        bar.style.borderRadius = "6px";
        bar.style.overflow = "hidden";
        bar.style.background = "#27272a";
        bar.style.width = "100%";
        bar.style.marginBottom = "8px";
        bar.style.border = "1px solid #3f3f46";

        const legend = document.createElement("div");
        legend.style.display = "flex";
        legend.style.flexWrap = "wrap";
        legend.style.gap = "12px";
        legend.style.justifyContent = "center";
        legend.style.fontSize = "11px";
        legend.style.color = "#a1a1aa";

        Object.keys(categories).forEach(key => {
            const cat = categories[key];
            if (cat.size === 0) return;
            const pct = (cat.size / totalSize) * 100;

            const segment = document.createElement("div");
            segment.style.width = pct.toFixed(2) + "%";
            segment.style.height = "100%";
            segment.style.backgroundColor = cat.color;
            segment.title = `${cat.label}: ${niceBytes(cat.size)} (${pct.toFixed(1)}%)`;
            bar.appendChild(segment);

            const item = document.createElement("div");
            item.style.display = "flex";
            item.style.alignItems = "center";
            item.style.gap = "4px";

            const dot = document.createElement("span");
            dot.style.width = "8px";
            dot.style.height = "8px";
            dot.style.borderRadius = "50%";
            dot.style.display = "inline-block";
            dot.style.backgroundColor = cat.color;

            const text = document.createElement("span");
            text.textContent = `${cat.label}: ${niceBytes(cat.size)} (${pct.toFixed(1)}%)`;

            item.appendChild(dot);
            item.appendChild(text);
            legend.appendChild(item);
        });

        chartContainer.appendChild(bar);
        chartContainer.appendChild(legend);
    }

    function incrementVersionedName(name) {
        const dot = name.lastIndexOf(".");
        const hasExt = dot > 0;
        const base = hasExt ? name.slice(0, dot) : name;
        const ext = hasExt ? name.slice(dot) : "";
        const m = base.match(/^(.*) \((\d+)\)$/);
        if (!m) return `${base} (2)${ext}`;
        return `${m[1]} (${Number(m[2]) + 1})${ext}`;
    }

    // ========== Virtual Folder Locks (Encrypted Directories) Helpers ==========
    const cachedFolderPassphrases = new Map();

    async function getFolderLocks() {
        const file = await getFileByName(".locks.json");
        if (!file) return {};
        try {
            const raw = await file.read();
            const localMeta = await file.readMeta();
            const reconstructed = await reconstructBytesFromSerialized(raw, localMeta);
            const txt = td.decode(reconstructed.bytes);
            return JSON.parse(txt);
        } catch (e) {
            console.warn("Failed to read folder locks:", e);
            try {
                const raw = await file.read();
                const tag = raw[0];
                const payload = raw.slice(1);
                let bytes = b64decodeToBytes(payload);
                if (tag === "c") bytes = gunzipSync(bytes);
                return JSON.parse(td.decode(bytes));
            } catch {
                return {};
            }
        }
    }

    async function saveFolderLocks(locks) {
        let file = await getFileByName(".locks.json");
        if (!file) {
            file = await createNewFile(".locks.json");
        }
        const text = JSON.stringify(locks);
        const bytes = te.encode(text);
        const serialized = "r" + b64encodeBytes(bytes);
        const meta = {
            name: ".locks.json",
            sizeOriginal: bytes.length,
            sizeStored: serialized.length,
            ratio: 1,
            dateISO: new Date().toISOString(),
            tags: ["system"],
            schemaVersion: 3
        };
        await file.writeMeta(meta);
        await file.write(serialized);
    }

    async function lockFolder(folderPath, password) {
        const locks = await getFolderLocks();
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        const km = await crypto.subtle.importKey("raw", te.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]);
        const key = await crypto.subtle.deriveKey(
            { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
            km, { name: "AES-GCM", length: 256 },
            false, ["encrypt"]
        );
        const validation = te.encode("folder_unlocked_verification");
        const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, validation));

        locks[folderPath] = {
            saltB64: b64encodeBytes(salt),
            ivB64: b64encodeBytes(iv),
            validationCipher: b64encodeBytes(ct)
        };
        await saveFolderLocks(locks);
        cachedFolderPassphrases.set(folderPath, password);
    }

    async function unlockFolder(folderPath, password) {
        const locks = await getFolderLocks();
        const info = locks[folderPath];
        if (!info) return true;
        try {
            const salt = b64decodeToBytes(info.saltB64);
            const iv = b64decodeToBytes(info.ivB64);
            const cipher = b64decodeToBytes(info.validationCipher);
            
            const km = await crypto.subtle.importKey("raw", te.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]);
            const key = await crypto.subtle.deriveKey(
                { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
                km, { name: "AES-GCM", length: 256 },
                false, ["decrypt"]
            );
            const pt = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher));
            const decoded = td.decode(pt);
            if (decoded === "folder_unlocked_verification") {
                cachedFolderPassphrases.set(folderPath, password);
                return true;
            }
        } catch (e) {}
        return false;
    }

    // ========== TOTP 2FA Authenticator Helpers ==========
    function base32Decode(input) {
        const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        const cleaned = input.replace(/[\s=-]+/g, "").toUpperCase();
        let bits = "";
        for (const c of cleaned) {
            const val = CHARS.indexOf(c);
            if (val < 0) continue;
            bits += val.toString(2).padStart(5, "0");
        }
        const bytes = new Uint8Array(Math.floor(bits.length / 8));
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
        }
        return bytes;
    }

    async function generateTOTP(secret, period = 30, digits = 6) {
        const key = base32Decode(secret);
        const epoch = Math.floor(Date.now() / 1000);
        const counter = Math.floor(epoch / period);
        const counterBytes = new Uint8Array(8);
        let tmp = counter;
        for (let i = 7; i >= 0; i--) {
            counterBytes[i] = tmp & 0xff;
            tmp = Math.floor(tmp / 256);
        }
        const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
        const sig = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, counterBytes));
        const offset = sig[sig.length - 1] & 0x0f;
        const binary = ((sig[offset] & 0x7f) << 24) | ((sig[offset + 1] & 0xff) << 16) | ((sig[offset + 2] & 0xff) << 8) | (sig[offset + 3] & 0xff);
        const otp = binary % Math.pow(10, digits);
        const remaining = period - (epoch % period);
        return { code: otp.toString().padStart(digits, "0"), remaining, period };
    }

    // ========== Fuzzy Search Scoring ==========
    function fuzzyScore(query, text) {
        if (!query || !text) return 0;
        const q = query.toLowerCase();
        const t = text.toLowerCase();
        if (t.includes(q)) return 100;
        let score = 0, qi = 0;
        for (let ti = 0; ti < t.length && qi < q.length; ti++) {
            if (t[ti] === q[qi]) { score += 10; qi++; }
        }
        return qi === q.length ? score : 0;
    }

    // ========== Recursive Folder Download ==========
    async function downloadFolderAsZip(folderName) {
        const allFiles = await listFiles();
        const fullFolderPath = currentPath ? `${currentPath}/${folderName}` : folderName;
        const prefix = fullFolderPath + "/";
        const matches = allFiles.filter(f => f.handle.title.startsWith(prefix));
        if (matches.length === 0) { alert("Folder is empty."); return; }

        const zipData = {};
        const statusEl = qs("#bulk-count") || qs("#analytics-bar");
        const origText = statusEl ? statusEl.textContent : "";

        try {
            for (let i = 0; i < matches.length; i++) {
                const f = matches[i];
                const relativePath = f.handle.title.slice(fullFolderPath.length + 1);
                if (statusEl) statusEl.textContent = `Packaging (${i+1}/${matches.length}): ${relativePath}`;
                const raw = await f.read();
                const meta = await f.readMeta();
                const reconstructed = await reconstructBytesFromSerialized(raw, meta);
                
                const relativePathParts = relativePath.split("/");
                const originalFileName = meta.name || relativePathParts[relativePathParts.length - 1];
                relativePathParts[relativePathParts.length - 1] = originalFileName;
                const zipPath = relativePathParts.join("/");
                
                zipData[zipPath] = reconstructed.bytes;
            }
            if (statusEl) statusEl.textContent = "Compressing ZIP...";
            const zipped = zipSync(zipData);
            const blob = new Blob([zipped], { type: "application/zip" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${folderName}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            alert("Folder download failed: " + err.message);
        } finally {
            if (statusEl) statusEl.textContent = origText;
        }
    }

    // ========== Folder Renaming and Deletion ==========
    async function renameFolder(folderName, newFolderName) {
        const allFiles = await listFiles();
        const fullOldPath = currentPath ? `${currentPath}/${folderName}` : folderName;
        const fullNewPath = currentPath ? `${currentPath}/${newFolderName}` : newFolderName;
        
        const prefix = fullOldPath + "/";
        const matches = allFiles.filter(f => f.handle.title === fullOldPath || f.handle.title.startsWith(prefix));
        
        for (const f of matches) {
            const currentTitle = f.handle.title;
            const nextTitle = currentTitle === fullOldPath 
                ? fullNewPath 
                : fullNewPath + currentTitle.slice(fullOldPath.length);
                
            await f.rename(nextTitle);
            renameFileInCache(f.handle.id, nextTitle);
        }
        
        // Handle locks
        const locks = await getFolderLocks();
        if (locks[fullOldPath]) {
            locks[fullNewPath] = locks[fullOldPath];
            delete locks[fullOldPath];
            await saveFolderLocks(locks);
        }
        if (cachedFolderPassphrases.has(fullOldPath)) {
            cachedFolderPassphrases.set(fullNewPath, cachedFolderPassphrases.get(fullOldPath));
            cachedFolderPassphrases.delete(fullOldPath);
        }
    }

    async function deleteFolder(folderName) {
        const allFiles = await listFiles();
        const fullPath = currentPath ? `${currentPath}/${folderName}` : folderName;
        const prefix = fullPath + "/";
        const matches = allFiles.filter(f => f.handle.title === fullPath || f.handle.title.startsWith(prefix));
        
        if (matches.length > 0) {
            if (!confirm(`Are you sure you want to permanently delete the folder "${folderName}" and all its contents (${matches.length} files)?`)) {
                return false;
            }
        } else {
            if (!confirm(`Delete empty folder "${folderName}"?`)) {
                return false;
            }
        }
        
        for (const f of matches) {
            await f.delete();
            removeFileFromCache(f.handle.id);
        }
        
        // Handle locks
        const locks = await getFolderLocks();
        if (locks[fullPath]) {
            delete locks[fullPath];
            await saveFolderLocks(locks);
        }
        cachedFolderPassphrases.delete(fullPath);
        return true;
    }

    // ========== Storage Cleanup Scanner ==========
    async function runStorageCleanup() {
        const allFiles = await listFiles();
        const metas = await Promise.all(allFiles.map(async f => {
            try { return { file: f, meta: await f.readMeta() }; } catch { return { file: f, meta: null }; }
        }));

        // Find duplicates by contentHash
        const hashMap = new Map();
        for (const m of metas) {
            if (m.meta && m.meta.contentHash) {
                if (!hashMap.has(m.meta.contentHash)) hashMap.set(m.meta.contentHash, []);
                hashMap.get(m.meta.contentHash).push(m);
            }
        }
        const duplicates = [...hashMap.values()].filter(group => group.length > 1);

        // Find orphaned chunks
        const root = await fsRoot();
        const rootChildren = await chrome.bookmarks.getChildren(root.id);
        const chunksRoot = rootChildren.find(c => !c.url && c.title === "__chunks__");
        let orphanedChunks = [];
        if (chunksRoot) {
            const chunkFolders = await chrome.bookmarks.getChildren(chunksRoot.id);
            const fileIds = new Set(allFiles.map(f => f.handle.id));
            orphanedChunks = chunkFolders.filter(cf => !fileIds.has(cf.title));
        }

        // Largest files
        const largest = metas.filter(m => m.meta && m.meta.sizeOriginal)
            .sort((a, b) => (b.meta.sizeOriginal || 0) - (a.meta.sizeOriginal || 0))
            .slice(0, 10);

        return { duplicates, orphanedChunks, largest, totalFiles: allFiles.length };
    }

    // ========== Theme Presets ==========
    const THEME_PRESETS = {
        default_dark: { "--bg-main": "#0d1117", "--bg-card": "#161b22", "--border": "#30363d", "--accent": "#10b981", "--text-primary": "#e6edf3", "--text-secondary": "#8b949e", "--shadow": "0 8px 24px rgba(0,0,0,.3)", name: "Default Dark" },
        dracula: { "--bg-main": "#282a36", "--bg-card": "#44475a", "--border": "#6272a4", "--accent": "#bd93f9", "--text-primary": "#f8f8f2", "--text-secondary": "#6272a4", "--shadow": "0 8px 24px rgba(0,0,0,.4)", name: "Dracula" },
        nord: { "--bg-main": "#2e3440", "--bg-card": "#3b4252", "--border": "#4c566a", "--accent": "#88c0d0", "--text-primary": "#eceff4", "--text-secondary": "#d8dee9", "--shadow": "0 8px 24px rgba(0,0,0,.3)", name: "Nord" },
        cyberpunk: { "--bg-main": "#0a0a0f", "--bg-card": "#1a1a2e", "--border": "#e94560", "--accent": "#e94560", "--text-primary": "#eaeaea", "--text-secondary": "#a1a1aa", "--shadow": "0 8px 24px rgba(233,69,96,.15)", name: "Cyberpunk" },
        solarized: { "--bg-main": "#002b36", "--bg-card": "#073642", "--border": "#586e75", "--accent": "#b58900", "--text-primary": "#fdf6e3", "--text-secondary": "#93a1a1", "--shadow": "0 8px 24px rgba(0,0,0,.3)", name: "Solarized" },
        monokai: { "--bg-main": "#272822", "--bg-card": "#3e3d32", "--border": "#75715e", "--accent": "#a6e22e", "--text-primary": "#f8f8f2", "--text-secondary": "#75715e", "--shadow": "0 8px 24px rgba(0,0,0,.3)", name: "Monokai" }
    };

    function applyThemePreset(presetKey) {
        const preset = THEME_PRESETS[presetKey];
        if (!preset) return;
        const root = document.documentElement;
        for (const [prop, val] of Object.entries(preset)) {
            if (prop.startsWith("--")) root.style.setProperty(prop, val);
        }
        localStorage.setItem("bookmarkfs_theme_preset", presetKey);
    }

    function applyCustomAccent(color) {
        if (!color) return;
        document.documentElement.style.setProperty("--accent", color);
        localStorage.setItem("bookmarkfs_custom_accent", color);
    }

    // Restore saved theme on load
    (function restoreSavedTheme() {
        const savedPreset = localStorage.getItem("bookmarkfs_theme_preset");
        if (savedPreset && THEME_PRESETS[savedPreset]) applyThemePreset(savedPreset);
        const savedAccent = localStorage.getItem("bookmarkfs_custom_accent");
        if (savedAccent) applyCustomAccent(savedAccent);
    })();

    // ========== Sync-Encrypted 2FA Authenticator Primitives ==========
    async function load2FAProfiles() {
        const file = await getFileByName(".2fa.json");
        if (!file) return [];
        try {
            const raw = await file.read();
            if (!raw || raw.length < 2) return [];
            const localMeta = await file.readMeta();
            const reconstructed = await reconstructBytesFromSerialized(raw, localMeta);
            const txt = td.decode(reconstructed.bytes);
            return JSON.parse(txt);
        } catch (e) {
            console.warn("Failed to load 2FA profiles:", e);
            return [];
        }
    }

    async function save2FAProfiles(profiles) {
        let file = await getFileByName(".2fa.json");
        if (!file) {
            file = await createNewFile(".2fa.json");
        }
        
        const text = JSON.stringify(profiles);
        const bytes = te.encode(text);
        
        let pass = cachedSessionPassphrase;
        if (!pass && !hasPrompted2FAKey) {
            pass = await new Promise((resolve) => {
                showEncryptDecryptModal("Set Master Passphrase for 2FA Storage", true, (typedPass) => {
                    resolve(typedPass); // Return raw string ("" if blank, null if cancelled)
                });
            });
            if (pass === null) throw new Error("Cancelled by user");
            hasPrompted2FAKey = true;
            cachedSessionPassphrase = pass;
        }

        let meta, serialized;
        if (pass) {
            const { ct, salt, iv } = await encryptBytes(bytes, pass);
            serialized = "r" + b64encodeBytes(ct);
            meta = {
                name: ".2fa.json",
                sizeOriginal: bytes.length,
                sizeStored: serialized.length,
                ratio: 1,
                dateISO: new Date().toISOString(),
                tags: ["system", "secure"],
                schemaVersion: 3,
                encrypted: true,
                enc: {
                    salt: b64encodeBytes(salt),
                    iv: b64encodeBytes(iv)
                }
            };
        } else {
            serialized = "r" + b64encodeBytes(bytes);
            meta = {
                name: ".2fa.json",
                sizeOriginal: bytes.length,
                sizeStored: serialized.length,
                ratio: 1,
                dateISO: new Date().toISOString(),
                tags: ["system"],
                schemaVersion: 3,
                encrypted: false
            };
        }
        await file.writeMeta(meta);
        await file.write(serialized);
    }

    let twofaInterval = null;
    let stopQrScannerCameraFn = null;

    function stop2FATimer() {
        if (twofaInterval) {
            clearInterval(twofaInterval);
            twofaInterval = null;
        }
    }

    function stopAllScannerMedia() {
        stop2FATimer();
        if (stopQrScannerCameraFn) {
            stopQrScannerCameraFn();
        }
        if (worldClockInterval) {
            clearInterval(worldClockInterval);
            worldClockInterval = null;
        }
    }

    function parseOtpauthMigration(urlStr) {
        const url = new URL(urlStr);
        const dataParam = url.searchParams.get("data");
        if (!dataParam) throw new Error("Missing data parameter");

        let base64 = decodeURIComponent(dataParam).replace(/-/g, "+").replace(/_/g, "/");
        while (base64.length % 4) {
            base64 += "=";
        }
        const binaryStr = atob(base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
        }

        function decodeProto(buf) {
            let pos = 0;
            const fields = [];
            
            function readVarint() {
                let val = 0;
                let shift = 0;
                while (pos < buf.length) {
                    const byte = buf[pos++];
                    val |= (byte & 0x7f) << shift;
                    if (!(byte & 0x80)) return val;
                    shift += 7;
                }
                return val;
            }

            while (pos < buf.length) {
                const tagVar = readVarint();
                const tag = tagVar >>> 3;
                const wireType = tagVar & 7;

                if (wireType === 0) {
                    fields.push({ tag, value: readVarint() });
                } else if (wireType === 2) {
                    const len = readVarint();
                    const valBytes = buf.subarray(pos, pos + len);
                    pos += len;
                    fields.push({ tag, value: valBytes });
                } else if (wireType === 1) {
                    pos += 8;
                } else if (wireType === 5) {
                    pos += 4;
                } else {
                    pos++;
                }
            }
            return fields;
        }

        function base32Encode(buffer) {
            const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
            let bits = 0;
            let value = 0;
            let output = "";
            for (let i = 0; i < buffer.length; i++) {
                value = (value << 8) | buffer[i];
                bits += 8;
                while (bits >= 5) {
                    output += alphabet[(value >>> (bits - 5)) & 31];
                    bits -= 5;
                }
            }
            if (bits > 0) {
                output += alphabet[(value << (5 - bits)) & 31];
            }
            return output;
        }

        const outerFields = decodeProto(bytes);
        const otpParams = outerFields.filter(f => f.tag === 1).map(f => f.value);
        
        const accounts = [];
        const decoder = new TextDecoder();
        otpParams.forEach(paramBytes => {
            const innerFields = decodeProto(paramBytes);
            
            let secretBytes = null;
            let name = "";
            let issuer = "";
            let digits = 6;
            let type = "totp";

            innerFields.forEach(f => {
                if (f.tag === 1) {
                    secretBytes = f.value;
                } else if (f.tag === 2) {
                    name = decoder.decode(f.value);
                } else if (f.tag === 3) {
                    issuer = decoder.decode(f.value);
                } else if (f.tag === 5) {
                    digits = f.value === 2 ? 8 : 6;
                } else if (f.tag === 6) {
                    type = f.value === 1 ? "hotp" : "totp";
                }
            });

            if (secretBytes) {
                const secretBase32 = base32Encode(secretBytes);
                accounts.push({
                    secret: secretBase32,
                    label: name,
                    issuer: issuer,
                    digits: digits,
                    type: type
                });
            }
        });

        return accounts;
    }

    async function handleMigrationImport(migrationUrl) {
        try {
            const accounts = parseOtpauthMigration(migrationUrl);
            if (accounts.length === 0) {
                alert("No 2FA accounts found in this migration link.");
                return false;
            }

            const confirmMsg = `This QR Code contains ${accounts.length} 2FA profile(s) from Google Authenticator:\n\n` + 
                accounts.map(acc => `- ${acc.issuer ? acc.issuer + ": " : ""}${acc.label}`).join("\n") +
                `\n\nWould you like to import all of them into BookmarkFS?`;

            if (confirm(confirmMsg)) {
                const current = await load2FAProfiles();
                let importedCount = 0;
                accounts.forEach(acc => {
                    if (!current.some(p => p.secret === acc.secret)) {
                        current.push({
                            label: (acc.issuer ? `${acc.issuer}: ${acc.label}` : acc.label).trim(),
                            secret: acc.secret,
                            recoveryCodes: "",
                            url: ""
                        });
                        importedCount++;
                    }
                });

                if (importedCount > 0) {
                    await save2FAProfiles(current);
                    alert(`Successfully imported ${importedCount} profile(s) from Google Authenticator!`);
                    
                    const listContainer = qs("#twofa-profile-list");
                    if (listContainer) {
                        render2FAProfilesList();
                    }
                } else {
                    alert("All profiles in this migration link already exist in your 2FA Authenticator.");
                }
                return true;
            }
            return false;
        } catch (e) {
            alert("Failed to parse Google Authenticator migration data: " + e.message);
            return false;
        }
    }

    function parseQRContent(content) {
        content = content.trim();
        if (content.toLowerCase().startsWith("otpauth:")) {
            try {
                const url = new URL(content);
                if (url.protocol !== "otpauth:") throw new Error("Invalid protocol");
                
                let label = decodeURIComponent(url.pathname.replace(/^\//, ""));
                const secret = url.searchParams.get("secret");
                if (!secret) throw new Error("Missing secret parameter");
                
                const issuer = url.searchParams.get("issuer") || "";
                if (issuer && !label.toLowerCase().startsWith(issuer.toLowerCase())) {
                    label = `${issuer}: ${label}`;
                }
                
                return { label: label.trim(), secret: secret.trim() };
            } catch (e) {
                throw new Error("Could not parse otpauth URL: " + e.message);
            }
        } else {
            // Check if it is a raw Base32 secret
            const cleaned = content.replace(/[\s=-]+/g, "").toUpperCase();
            if (/^[A-Z2-7]+$/.test(cleaned) && cleaned.length >= 8) {
                return { label: "Imported Profile", secret: cleaned };
            }
            throw new Error("QR content is not a valid otpauth URL or Base32 secret key");
        }
    }
    
    function parseRecoveryCodesString(str) {
        if (!str) return [];
        const rawTokens = str.split(/[\n\r,;\t]+| {2,}/);
        const codes = [];
        for (let token of rawTokens) {
            token = token.trim();
            if (!token) continue;
            const subTokens = token.split(/\s+/);
            for (let sub of subTokens) {
                sub = sub.trim();
                if (sub.length >= 4 && /^[a-z0-9-_]+$/i.test(sub)) {
                    codes.push(sub);
                }
            }
        }
        return codes;
    }

    function showQRModal(label, qrDataUrl, rawUrl) {
        const modal = document.createElement("div");
        modal.className = "twofa-modal";
        modal.style.position = "fixed";
        modal.style.inset = "0";
        modal.style.background = "rgba(10, 10, 10, 0.85)";
        modal.style.backdropFilter = "blur(8px)";
        modal.style.display = "flex";
        modal.style.alignItems = "center";
        modal.style.justifyContent = "center";
        modal.style.zIndex = "100000";

        const box = document.createElement("div");
        box.className = "twofa-modal-box";
        box.style.background = "#18181b";
        box.style.border = "1px solid #27272a";
        box.style.color = "#f4f4f5";
        box.style.padding = "24px";
        box.style.borderRadius = "16px";
        box.style.width = "min(340px, 90%)";
        box.style.boxShadow = "0 20px 25px -5px rgba(0,0,0,0.5)";
        box.style.display = "flex";
        box.style.flexDirection = "column";
        box.style.gap = "16px";
        box.style.textAlign = "center";

        box.innerHTML = `
            <h3 style="margin: 0; color: var(--accent); font-size: 16px;">📱 Export 2FA QR Code</h3>
            <div style="font-size: 13px; font-weight: 600; color: #f4f4f5; word-break: break-all;">${label}</div>
            
            <div style="background: #ffffff; padding: 12px; border-radius: 12px; display: inline-block; margin: 0 auto; line-height: 0;">
                <img src="${qrDataUrl}" style="width: 200px; height: 200px; display: block;" alt="2FA QR Code">
            </div>

            <p style="font-size: 11px; color: #a1a1aa; margin: 0; line-height: 1.4;">
                Scan this QR code with another authenticator app (e.g. Google Authenticator) on your phone to transfer this profile.
            </p>

            <div style="display: flex; flex-direction: column; gap: 4px; text-align: left; margin-top: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <label style="font-size: 10px; color: #71717a;">Raw Secret Link:</label>
                    <button id="btn-copy-qr-url" class="button" style="font-size: 10px; padding: 1px 6px; height: 16px; border-radius: 4px; border-color: #52525b; color: #d4d4d8;">Copy Link</button>
                </div>
                <input type="text" readonly value="${rawUrl}" style="padding: 6px 8px; background: #09090b; border: 1px solid #27272a; color: #a1a1aa; border-radius: 6px; outline: none; font-size: 11px; font-family: monospace;">
            </div>

            <button id="btn-close-qr-modal" class="button" style="width: 100%; margin-top: 4px; padding: 8px; font-weight: 600;">Close</button>
        `;

        modal.appendChild(box);
        document.body.appendChild(modal);

        box.querySelector("#btn-close-qr-modal").onclick = () => modal.remove();
        
        const copyBtn = box.querySelector("#btn-copy-qr-url");
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(rawUrl);
            copyBtn.textContent = "Copied!";
            setTimeout(() => { copyBtn.textContent = "Copy Link"; }, 1500);
        };
    }

    function injectCropOverlay() {
        const existing = document.getElementById("bookmarkfs-crop-overlay");
        if (existing) existing.remove();

        const overlay = document.createElement("div");
        overlay.id = "bookmarkfs-crop-overlay";
        overlay.style.position = "fixed";
        overlay.style.inset = "0";
        overlay.style.zIndex = "2147483647";
        overlay.style.cursor = "crosshair";
        overlay.style.userSelect = "none";
        overlay.style.background = "rgba(0, 0, 0, 0.6)";
        overlay.style.display = "block";

        const msgBox = document.createElement("div");
        msgBox.style.position = "fixed";
        msgBox.style.top = "20px";
        msgBox.style.left = "50%";
        msgBox.style.transform = "translateX(-50%)";
        msgBox.style.background = "#18181b";
        msgBox.style.color = "#f4f4f5";
        msgBox.style.padding = "10px 20px";
        msgBox.style.borderRadius = "8px";
        msgBox.style.boxShadow = "0 4px 12px rgba(0,0,0,0.5)";
        msgBox.style.fontFamily = "system-ui, sans-serif";
        msgBox.style.fontSize = "14px";
        msgBox.style.fontWeight = "bold";
        msgBox.style.zIndex = "2147483647";
        msgBox.style.display = "flex";
        msgBox.style.alignItems = "center";
        msgBox.style.gap = "15px";
        msgBox.style.border = "1px solid #27272a";
        msgBox.innerHTML = `
            <span>📸 <span>Drag a box over the QR code on the page</span></span>
            <button id="bookmarkfs-crop-cancel" style="background: #ef4444; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; outline: none;">Cancel</button>
        `;
        overlay.appendChild(msgBox);

        const selectionBox = document.createElement("div");
        selectionBox.style.position = "fixed";
        selectionBox.style.border = "2px dashed #02ff88";
        selectionBox.style.background = "rgba(2, 255, 136, 0.15)";
        selectionBox.style.display = "none";
        selectionBox.style.pointerEvents = "none";
        selectionBox.style.zIndex = "2147483646";
        overlay.appendChild(selectionBox);

        document.body.appendChild(overlay);

        overlay.querySelector("#bookmarkfs-crop-cancel").onclick = (e) => {
            e.stopPropagation();
            overlay.remove();
            chrome.runtime.sendMessage({ type: "bookmarkfs_crop_cancelled" });
        };

        let startX = 0, startY = 0, isDragging = false;

        overlay.onmousedown = (e) => {
            if (e.target.id === "bookmarkfs-crop-cancel" || e.target.closest("#bookmarkfs-crop-cancel")) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            selectionBox.style.left = startX + "px";
            selectionBox.style.top = startY + "px";
            selectionBox.style.width = "0px";
            selectionBox.style.height = "0px";
            selectionBox.style.display = "block";
        };

        overlay.onmousemove = (e) => {
            if (!isDragging) return;
            const currentX = e.clientX;
            const currentY = e.clientY;
            const x = Math.min(startX, currentX);
            const y = Math.min(startY, currentY);
            const w = Math.abs(startX - currentX);
            const h = Math.abs(startY - currentY);
            selectionBox.style.left = x + "px";
            selectionBox.style.top = y + "px";
            selectionBox.style.width = w + "px";
            selectionBox.style.height = h + "px";
        };

        overlay.onmouseup = (e) => {
            if (!isDragging) return;
            isDragging = false;
            const currentX = e.clientX;
            const currentY = e.clientY;
            const x = Math.min(startX, currentX);
            const y = Math.min(startY, currentY);
            const w = Math.abs(startX - currentX);
            const h = Math.abs(startY - currentY);

            overlay.remove();

            if (w > 10 && h > 10) {
                chrome.runtime.sendMessage({
                    type: "bookmarkfs_crop_completed",
                    x: x,
                    y: y,
                    width: w,
                    height: h,
                    devicePixelRatio: window.devicePixelRatio || 1
                });
            } else {
                chrome.runtime.sendMessage({ type: "bookmarkfs_crop_cancelled" });
            }
        };
    }

    async function runInjectedCropScanner(isRaw, onSuccess, onError) {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) throw new Error("No active tab found.");

            const listener = async (message, sender) => {
                if (message.type === "bookmarkfs_crop_completed" && sender.tab && sender.tab.id === tab.id) {
                    chrome.runtime.onMessage.removeListener(listener);
                    
                    try {
                        const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "png" });
                        const img = new Image();
                        img.src = dataUrl;
                        img.onload = () => {
                            const dpr = message.devicePixelRatio;
                            const rx = message.x * dpr;
                            const ry = message.y * dpr;
                            const rw = message.width * dpr;
                            const rh = message.height * dpr;

                            const canvas = document.createElement("canvas");
                            canvas.width = rw;
                            canvas.height = rh;
                            const ctx = canvas.getContext("2d");
                            ctx.drawImage(img, rx, ry, rw, rh, 0, 0, rw, rh);
                            
                            const imgData = ctx.getImageData(0, 0, rw, rh);
                            const code = jsQR(imgData.data, imgData.width, imgData.height, {
                                inversionAttempts: "attemptBoth"
                            });
                            
                            if (code) {
                                if (isRaw) {
                                    onSuccess(code.data);
                                } else {
                                    try {
                                        const parsed = parseQRContent(code.data);
                                        onSuccess(parsed);
                                    } catch (err) {
                                        onError(`A QR Code was detected, but it is not a valid 2FA setup link.\n\nScanned Data:\n"${code.data}"`);
                                    }
                                }
                            } else {
                                onError("No QR Code detected in that selection. Try dragging again to cover the entire QR code precisely.");
                            }
                        };
                    } catch (captureErr) {
                        onError("Capture failed: " + captureErr.message);
                    }
                } else if (message.type === "bookmarkfs_crop_cancelled" && sender.tab && sender.tab.id === tab.id) {
                    chrome.runtime.onMessage.removeListener(listener);
                }
            };
            chrome.runtime.onMessage.addListener(listener);

            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: injectCropOverlay
            });

        } catch (err) {
            chrome.runtime.onMessage.removeListener(listener);
            if (err.message && (err.message.includes("Capture failed") || err.message.includes("Cannot capture") || err.message.includes("cannot be scripted") || err.message.includes("restricted"))) {
                onError("Cannot run screen scanner on this page. Note that Google Chrome restricts extensions from scripting or taking screenshots of internal 'chrome://' settings pages, the Chrome Web Store, or other extensions. Try again on a regular website page.");
            } else {
                onError(err.message || String(err));
            }
        }
    }

    async function startScreenshotQRScanner(onSuccess, onError) {
        await runInjectedCropScanner(false, onSuccess, onError);
    }

    function showAdd2FAParametersModal(callback, editProfile = null) {
        const modal = document.createElement("div");
        modal.id = "add-twofa-modal";
        modal.className = "twofa-modal";
        modal.style.position = "fixed";
        modal.style.inset = "0";
        modal.style.background = "rgba(10, 10, 10, 0.85)";
        modal.style.backdropFilter = "blur(8px)";
        modal.style.display = "flex";
        modal.style.alignItems = "center";
        modal.style.justifyContent = "center";
        modal.style.zIndex = "100000";

        const box = document.createElement("div");
        box.className = "twofa-modal-box";
        box.style.background = "#18181b";
        box.style.border = "1px solid #27272a";
        box.style.color = "#f4f4f5";
        box.style.padding = "24px";
        box.style.borderRadius = "16px";
        box.style.width = "min(420px, 90%)";
        box.style.boxShadow = "0 20px 25px -5px rgba(0,0,0,0.5)";
        box.style.display = "flex";
        box.style.flexDirection = "column";
        box.style.gap = "16px";

        box.innerHTML = `
            <h3 style="margin: 0; color: var(--accent); display: flex; align-items: center; gap: 8px;">${editProfile ? "📝 <span>Edit 2FA Profile</span>" : "🔐 <span>Add 2FA Profile</span>"}</h3>
            
            <div style="display: flex; flex-direction: column; gap: 4px;">
                <label style="font-size: 12px; color: #a1a1aa;">Profile Label:</label>
                <input type="text" id="add-twofa-label" placeholder="e.g. Google: user@gmail.com" style="padding: 8px 12px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; font-size: 13px;">
            </div>

            <div style="display: flex; flex-direction: column; gap: 4px;">
                <label style="font-size: 12px; color: #a1a1aa;">Secret Key:</label>
                <input type="text" id="add-twofa-secret" placeholder="Base32 Key" style="padding: 8px 12px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; font-size: 13px; font-family: monospace;">
            </div>

            <div style="display: flex; flex-direction: column; gap: 4px;">
                <label style="font-size: 12px; color: #a1a1aa;">Website URL (Optional):</label>
                <input type="text" id="add-twofa-url" placeholder="e.g. github.com" style="padding: 8px 12px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; font-size: 13px;">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <button id="btn-twofa-cam-scan" class="button" style="font-size: 12px; padding: 6px 12px;">📷 Scan Camera</button>
                <button id="btn-twofa-screen-scan" class="button" style="font-size: 12px; padding: 6px 12px;">🖥️ <span>Screen Scan</span></button>
                <button id="btn-twofa-screenshot-crop" class="button" style="font-size: 12px; padding: 6px 12px; grid-column: span 2; border-color: var(--accent) !important; color: var(--accent) !important;">📸 <span>Screenshot Crop </span>(Select QR)</button>
                <label class="button" style="font-size: 12px; padding: 6px 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; margin: 0;">
                    🖼 Upload QR
                    <input type="file" id="input-twofa-qr-file" accept="image/*" style="display: none;">
                </label>
                <button id="btn-twofa-paste-scan" class="button" style="font-size: 12px; padding: 6px 12px;">📋 Paste QR</button>
            </div>

            <div id="twofa-video-container" style="display: none; position: relative; width: 100%; max-height: 280px; background: #000; border-radius: 8px; overflow: hidden; border: 1px solid #27272a;">
                <video id="twofa-scan-video" style="width: 100%; display: block;" playsinline></video>
                <div style="position: absolute; top: 10%; bottom: 10%; left: 10%; right: 10%; border: 2px dashed var(--accent); opacity: 0.7; pointer-events: none; border-radius: 8px;"></div>
            </div>
            
            <button id="btn-twofa-scan-manual" class="button" style="margin-top: 4px; width: 100%; display: none; padding: 6px 12px; font-size: 13px;">🔍 <span>Scan Current Frame</span></button>

            <div style="display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <label style="font-size: 12px; color: #a1a1aa;">Recovery Codes (Optional):</label>
                    <label class="button" style="font-size: 11px; padding: 2px 8px; cursor: pointer; margin: 0; display: inline-flex; align-items: center; justify-content: center; border-color: #52525b; color: #d4d4d8; height: 18px; border-radius: 4px;">
                        📄 Import File
                        <input type="file" id="input-twofa-recovery-file" accept=".txt,.json,text/plain" style="display: none;">
                    </label>
                </div>
                <textarea id="add-twofa-recovery" placeholder="Enter recovery codes, keys, or backup info..." style="padding: 8px 12px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; font-size: 13px; font-family: monospace; resize: vertical; height: 60px; box-sizing: border-box; width: 100%;"></textarea>
            </div>

            <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px;">
                <button id="btn-twofa-save" class="button" style="padding: 6px 16px; font-weight: 600;">Save</button>
                <button id="btn-twofa-cancel" class="button" style="padding: 6px 16px; background: transparent; border-color: #27272a;">Cancel</button>
            </div>
        `;

        modal.appendChild(box);
        document.body.appendChild(modal);

        let activeStream = null;
        let scanInterval = null;

        const labelInput = box.querySelector("#add-twofa-label");
        const secretInput = box.querySelector("#add-twofa-secret");
        const urlInput = box.querySelector("#add-twofa-url");
        const camBtn = box.querySelector("#btn-twofa-cam-scan");
        const screenBtn = box.querySelector("#btn-twofa-screen-scan");
        const screenshotBtn = box.querySelector("#btn-twofa-screenshot-crop");
        const pasteBtn = box.querySelector("#btn-twofa-paste-scan");
        const fileInput = box.querySelector("#input-twofa-qr-file");
        const videoContainer = box.querySelector("#twofa-video-container");
        const video = box.querySelector("#twofa-scan-video");
        const manualScanBtn = box.querySelector("#btn-twofa-scan-manual");
        const recoveryInput = box.querySelector("#add-twofa-recovery");
        const recoveryFileInput = box.querySelector("#input-twofa-recovery-file");
        const saveBtn = box.querySelector("#btn-twofa-save");
        const cancelBtn = box.querySelector("#btn-twofa-cancel");

        if (editProfile) {
            labelInput.value = editProfile.label || "";
            secretInput.value = editProfile.secret || "";
            urlInput.value = editProfile.url || "";
            recoveryInput.value = editProfile.recoveryCodes || "";
        }

        function stopCamera() {
            if (scanInterval) {
                clearInterval(scanInterval);
                scanInterval = null;
            }
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
                activeStream = null;
            }
            videoContainer.style.display = "none";
            manualScanBtn.style.display = "none";
            camBtn.textContent = "📷 Scan Camera";
            screenBtn.textContent = "🖥️ Screen Scan";
            camBtn.style.pointerEvents = "auto";
            screenBtn.style.pointerEvents = "auto";
        }

        camBtn.onclick = async () => {
            if (activeStream) {
                stopCamera();
                return;
            }

            try {
                activeStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                video.srcObject = activeStream;
                video.setAttribute("playsinline", true);
                video.play();
                videoContainer.style.display = "block";
                manualScanBtn.style.display = "block";
                camBtn.textContent = "⏹ Stop Camera";

                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d", { willReadFrequently: true });

                scanInterval = setInterval(() => {
                    if (video.readyState >= 2 && video.videoWidth > 0) {
                        const vw = video.videoWidth;
                        const vh = video.videoHeight;
                        const boxW = Math.round(vw * 0.8);
                        const boxH = Math.round(vh * 0.8);
                        const boxX = Math.round((vw - boxW) / 2);
                        const boxY = Math.round((vh - boxH) / 2);

                        // Try center guide box first
                        const centerCanvas = document.createElement("canvas");
                        centerCanvas.width = boxW;
                        centerCanvas.height = boxH;
                        const centerCtx = centerCanvas.getContext("2d", { willReadFrequently: true });
                        centerCtx.drawImage(video, boxX, boxY, boxW, boxH, 0, 0, boxW, boxH);
                        const centerImgData = centerCtx.getImageData(0, 0, boxW, boxH);
                        let code = jsQR(centerImgData.data, centerImgData.width, centerImgData.height, {
                            inversionAttempts: "attemptBoth",
                        });

                        // Fallback to full frame
                        if (!code) {
                            canvas.width = vw;
                            canvas.height = vh;
                            ctx.drawImage(video, 0, 0, vw, vh);
                            const fullImgData = ctx.getImageData(0, 0, vw, vh);
                            code = jsQR(fullImgData.data, fullImgData.width, fullImgData.height, {
                                inversionAttempts: "attemptBoth",
                            });
                        }

                        if (code) {
                            try {
                                if (code.data.trim().toLowerCase().startsWith("otpauth-migration:")) {
                                    stopCamera();
                                    modal.remove();
                                    handleMigrationImport(code.data);
                                    return;
                                }
                                const parsed = parseQRContent(code.data);
                                labelInput.value = parsed.label;
                                secretInput.value = parsed.secret;
                                stopCamera();
                                alert("QR Code scanned successfully!");
                            } catch (err) {
                                console.warn("[QR Scanner] Decode parse failed:", err.message);
                            }
                        }
                    }
                }, 250);
            } catch (err) {
                if (err.name === "NotAllowedError" || err.message.toLowerCase().includes("permission denied")) {
                    const openTab = confirm("Camera access permission is denied or blocked. Chrome requires granting permission inside a full browser tab before it can be used in the Side Panel.\n\nOpen a permission tab now?");
                    if (openTab) {
                        chrome.tabs.create({ url: chrome.runtime.getURL("dist/permissions.html") });
                    }
                } else {
                    alert("Failed to access camera: " + err.message);
                }
            }
        };

        screenBtn.onclick = async () => {
            if (activeStream) {
                stopCamera();
                return;
            }

            try {
                activeStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                video.srcObject = activeStream;
                video.setAttribute("playsinline", true);
                video.play();
                videoContainer.style.display = "block";
                manualScanBtn.style.display = "block";
                screenBtn.textContent = "⏹ Stop Screen Scan";
                camBtn.style.pointerEvents = "none";

                activeStream.getVideoTracks()[0].addEventListener('ended', () => {
                    stopCamera();
                });

                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d", { willReadFrequently: true });

                scanInterval = setInterval(() => {
                    if (video.readyState >= 2 && video.videoWidth > 0) {
                        const vw = video.videoWidth;
                        const vh = video.videoHeight;
                        const boxW = Math.round(vw * 0.8);
                        const boxH = Math.round(vh * 0.8);
                        const boxX = Math.round((vw - boxW) / 2);
                        const boxY = Math.round((vh - boxH) / 2);

                        // Try center guide box first
                        const centerCanvas = document.createElement("canvas");
                        centerCanvas.width = boxW;
                        centerCanvas.height = boxH;
                        const centerCtx = centerCanvas.getContext("2d", { willReadFrequently: true });
                        centerCtx.drawImage(video, boxX, boxY, boxW, boxH, 0, 0, boxW, boxH);
                        const centerImgData = centerCtx.getImageData(0, 0, boxW, boxH);
                        let code = jsQR(centerImgData.data, centerImgData.width, centerImgData.height, {
                            inversionAttempts: "attemptBoth",
                        });

                        // Fallback to full frame
                        if (!code) {
                            canvas.width = vw;
                            canvas.height = vh;
                            ctx.drawImage(video, 0, 0, vw, vh);
                            const fullImgData = ctx.getImageData(0, 0, vw, vh);
                            code = jsQR(fullImgData.data, fullImgData.width, fullImgData.height, {
                                inversionAttempts: "attemptBoth",
                            });
                        }

                        if (code) {
                            try {
                                if (code.data.trim().toLowerCase().startsWith("otpauth-migration:")) {
                                    stopCamera();
                                    modal.remove();
                                    handleMigrationImport(code.data);
                                    return;
                                }
                                const parsed = parseQRContent(code.data);
                                labelInput.value = parsed.label;
                                secretInput.value = parsed.secret;
                                stopCamera();
                                alert("QR Code scanned from screen successfully!");
                            } catch (err) {
                                console.warn("[QR Scanner] Decode parse failed:", err.message);
                            }
                        }
                    }
                }, 250);
            } catch (err) {
                stopCamera();
                if (err.name !== "NotAllowedError" && !err.message.toLowerCase().includes("permission denied")) {
                    alert("Failed to capture screen stream: " + err.message);
                }
            }
        };

        screenshotBtn.onclick = () => {
            stopCamera();
            startScreenshotQRScannerRaw(
                (text) => {
                    if (text.trim().toLowerCase().startsWith("otpauth-migration:")) {
                        modal.remove();
                        handleMigrationImport(text);
                        return;
                    }
                    try {
                        const parsed = parseQRContent(text);
                        labelInput.value = parsed.label;
                        secretInput.value = parsed.secret;
                        alert("QR Code scanned and parsed successfully!");
                    } catch (err) {
                        alert(`A QR Code was detected, but it is not a valid 2FA setup link (must be otpauth:// or a raw Base32 secret key).\n\nScanned Data:\n"${text}"`);
                    }
                },
                (errMsg) => {
                    alert(errMsg);
                }
            );
        };

        const handlePasteImage = async (items) => {
            for (const item of items) {
                if (item.type.startsWith("image/")) {
                    const blob = item.getAsFile();
                    const reader = new FileReader();
                    reader.onload = () => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement("canvas");
                            canvas.width = img.width;
                            canvas.height = img.height;
                            const ctx = canvas.getContext("2d", { willReadFrequently: true });
                            ctx.drawImage(img, 0, 0);
                            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                            const code = jsQR(imgData.data, imgData.width, imgData.height);
                            if (code) {
                                try {
                                    if (code.data.trim().toLowerCase().startsWith("otpauth-migration:")) {
                                        modal.remove();
                                        handleMigrationImport(code.data);
                                        return;
                                    }
                                    const parsed = parseQRContent(code.data);
                                    labelInput.value = parsed.label;
                                    secretInput.value = parsed.secret;
                                    alert("QR Code scanned from clipboard successfully!");
                                } catch (err) {
                                    alert("Could not read QR code: " + err.message);
                                }
                            } else {
                                alert("No QR Code detected in pasted image.");
                            }
                        };
                        img.src = reader.result;
                    };
                    reader.readAsDataURL(blob);
                    return true;
                }
            }
            return false;
        };

        pasteBtn.onclick = async () => {
            try {
                const clipboardItems = await navigator.clipboard.read();
                for (const item of clipboardItems) {
                    for (const type of item.types) {
                        if (type.startsWith("image/")) {
                            const blob = await item.getType(type);
                            const items = [{
                                type: blob.type,
                                getAsFile: () => blob
                            }];
                            await handlePasteImage(items);
                            return;
                        }
                    }
                }
                alert("No image found on clipboard! Copy a QR code image/screenshot first.");
            } catch (err) {
                alert("Clipboard access denied. Try using the Ctrl+V keyboard shortcut inside this modal.");
            }
        };

        const modalPasteListener = (e) => {
            const items = e.clipboardData?.items || [];
            handlePasteImage(items);
        };
        modal.addEventListener("paste", modalPasteListener);

        manualScanBtn.onclick = () => {
            if (!activeStream || video.readyState < 2 || video.videoWidth === 0) {
                alert("Camera feed is not ready. Please wait a second and try again.");
                return;
            }

            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imgData.data, imgData.width, imgData.height, {
                inversionAttempts: "attemptBoth",
            });

            if (code) {
                try {
                    if (code.data.trim().toLowerCase().startsWith("otpauth-migration:")) {
                        stopCamera();
                        modal.remove();
                        handleMigrationImport(code.data);
                        return;
                    }
                    const parsed = parseQRContent(code.data);
                    labelInput.value = parsed.label;
                    secretInput.value = parsed.secret;
                    stopCamera();
                    alert("QR Code scanned successfully!");
                } catch (err) {
                    alert(`A QR Code was detected, but it is not a valid 2FA setup link (must be otpauth:// or a raw Base32 secret key).\n\nScanned Data:\n"${code.data}"`);
                }
            } else {
                alert("No QR Code detected in the current camera frame.\n\nTips:\n1. Position the QR code fully inside the dashed green box.\n2. Avoid screen glare or direct light reflections.\n3. Hold the camera steady.");
            }
        };

        fileInput.onchange = () => {
            const file = fileInput.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0);

                    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imgData.data, imgData.width, imgData.height);
                    if (code) {
                        try {
                            if (code.data.trim().toLowerCase().startsWith("otpauth-migration:")) {
                                modal.remove();
                                handleMigrationImport(code.data);
                                return;
                            }
                            const parsed = parseQRContent(code.data);
                            labelInput.value = parsed.label;
                            secretInput.value = parsed.secret;
                            alert("QR Code imported successfully!");
                        } catch (err) {
                            alert("Could not read QR code: " + err.message);
                        }
                    } else {
                        alert("No QR Code detected in image.");
                    }
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
            fileInput.value = "";
        };

        recoveryFileInput.onchange = () => {
            const file = recoveryFileInput.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                recoveryInput.value = reader.result;
            };
            reader.readAsText(file);
            recoveryFileInput.value = "";
        };

        saveBtn.onclick = () => {
            const label = labelInput.value.trim();
            const secret = secretInput.value.replace(/\s+/g, "").toUpperCase();
            const recoveryCodes = recoveryInput.value.trim();
            const url = urlInput.value.trim();
            if (!label || !secret) {
                alert("Please fill in both Label and Secret Key fields.");
                return;
            }
            stopCamera();
            modal.removeEventListener("paste", modalPasteListener);
            modal.remove();
            callback({ label, secret, recoveryCodes, url });
        };

        cancelBtn.onclick = () => {
            stopCamera();
            modal.removeEventListener("paste", modalPasteListener);
            modal.remove();
            callback(null);
        };
    }

    // ========== PASSWORDS STORAGE ==========
    async function loadPasswords() {
        const file = await getFileByName(".passwords.json");
        if (!file) return [];
        try {
            const raw = await file.read();
            if (!raw || raw.length < 2) return [];
            const localMeta = await file.readMeta();
            const reconstructed = await reconstructBytesFromSerialized(raw, localMeta);
            const txt = td.decode(reconstructed.bytes);
            return JSON.parse(txt);
        } catch (e) {
            console.warn("Failed to load passwords:", e);
            return [];
        }
    }

    async function savePasswords(passwords) {
        let file = await getFileByName(".passwords.json");
        if (!file) {
            file = await createNewFile(".passwords.json");
        }
        const text = JSON.stringify(passwords);
        const bytes = te.encode(text);
        let pass = cachedSessionPassphrase;
        if (!pass && !hasPrompted2FAKey) {
            pass = await new Promise((resolve) => {
                showEncryptDecryptModal("Set Master Passphrase for Secure Storage", true, (typedPass) => {
                    resolve(typedPass);
                });
            });
            if (pass === null) throw new Error("Cancelled by user");
            hasPrompted2FAKey = true;
            cachedSessionPassphrase = pass;
        }
        let meta, serialized;
        if (pass) {
            const { ct, salt, iv } = await encryptBytes(bytes, pass);
            serialized = "r" + b64encodeBytes(ct);
            meta = {
                name: ".passwords.json",
                sizeOriginal: bytes.length,
                sizeStored: serialized.length,
                ratio: 1,
                dateISO: new Date().toISOString(),
                tags: ["system", "secure"],
                schemaVersion: 3,
                encrypted: true,
                enc: {
                    salt: b64encodeBytes(salt),
                    iv: b64encodeBytes(iv)
                }
            };
        } else {
            serialized = "r" + b64encodeBytes(bytes);
            meta = {
                name: ".passwords.json",
                sizeOriginal: bytes.length,
                sizeStored: serialized.length,
                ratio: 1,
                dateISO: new Date().toISOString(),
                tags: ["system"],
                schemaVersion: 3,
                encrypted: false
            };
        }
        await file.writeMeta(meta);
        await file.write(serialized);
        await chrome.storage.local.set({ bookmarkfs_passwords_cache: passwords });
    }

    // ========== 1. PASSWORDS PANEL ==========
    async function showPasswordsPanel() {
        let panel = qs("#passwords-panel");
        const center = document.querySelector("center") || document.body;
        if (!panel) {
            panel = document.createElement("div");
            panel.id = "passwords-panel";
            panel.style.width = "100%";
            center.appendChild(panel);
        }
        panel.style.display = "block";
        panel.innerHTML = "";

        if (!cachedSessionPassphrase) {
            const file = await getFileByName(".passwords.json");
            const isRegistered = !!file;

            if (!isRegistered) {
                panel.innerHTML = `
                    <div class="big-card" style="padding: 24px; text-align: center;">
                        <h3>🔑 <span>Create Master Passphrase</span></h3>
                        <p style="font-size: 13px; color: #a1a1aa; margin-bottom: 16px;">Set up a master passphrase to secure your credentials vault.</p>
                        <input type="password" id="passwords-unlock-input" placeholder="New Master Passphrase" style="padding: 8px 12px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; margin-bottom: 8px; width: 80%;">
                        <br>
                        <input type="password" id="passwords-confirm-input" placeholder="Confirm Master Passphrase" style="padding: 8px 12px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; margin-bottom: 16px; width: 80%;">
                        <br>
                        <button id="btn-passwords-unlock" class="button" style="padding: 8px 24px;">Register & Unlock</button>
                    </div>
                `;
                const unlockInput = panel.querySelector("#passwords-unlock-input");
                const confirmInput = panel.querySelector("#passwords-confirm-input");
                const unlockBtn = panel.querySelector("#btn-passwords-unlock");
                
                const doRegister = async () => {
                    const typed = unlockInput.value;
                    const confirmed = confirmInput.value;
                    if (!typed) {
                        alert("Passphrase cannot be empty.");
                        return;
                    }
                    if (typed !== confirmed) {
                        alert("Passphrases do not match.");
                        return;
                    }
                    try {
                        cachedSessionPassphrase = typed;
                        hasPrompted2FAKey = true;
                        // Initialize empty passwords database file
                        await savePasswords([]);
                        showPasswordsPanel();
                    } catch (err) {
                        cachedSessionPassphrase = "";
                        alert("Initialization failed: " + err.message);
                    }
                };
                unlockBtn.onclick = doRegister;
                confirmInput.onkeydown = (e) => { if (e.key === "Enter") doRegister(); };
                unlockInput.onkeydown = (e) => { if (e.key === "Enter") doRegister(); };
                return;
            }

            panel.innerHTML = `
                <div class="big-card" style="padding: 24px; text-align: center;">
                    <h3>🔑 <span>Enter Master Passphrase</span></h3>
                    <p style="font-size: 13px; color: #a1a1aa; margin-bottom: 16px;">Please authenticate to unlock your password manager.</p>
                    <input type="password" id="passwords-unlock-input" placeholder="Master Passphrase" style="padding: 8px 12px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; margin-bottom: 12px; width: 80%;">
                    <br>
                    <button id="btn-passwords-unlock" class="button" style="padding: 8px 24px;">Unlock</button>
                </div>
            `;
            const unlockInput = panel.querySelector("#passwords-unlock-input");
            const unlockBtn = panel.querySelector("#btn-passwords-unlock");
            const doUnlock = async () => {
                const typed = unlockInput.value;
                if (!typed) return;
                try {
                    cachedSessionPassphrase = typed;
                    hasPrompted2FAKey = true;
                    // Attempt loading to verify passphrase correctness
                    const file = await getFileByName(".passwords.json");
                    if (file) {
                        const raw = await file.read();
                        const localMeta = await file.readMeta();
                        if (localMeta.encrypted) {
                            await reconstructBytesFromSerialized(raw, localMeta);
                        }
                    }
                    showPasswordsPanel();
                } catch (err) {
                    cachedSessionPassphrase = "";
                    alert("Incorrect passphrase or decryption failed.");
                }
            };
            unlockBtn.onclick = doUnlock;
            unlockInput.onkeydown = (e) => { if (e.key === "Enter") doUnlock(); };
            return;
        }

        panel.innerHTML = `
            <div class="big-card" style="padding: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h2 style="margin: 0;">🔑 <span>Passwords</span></h2>
                    <div>
                        <button id="btn-add-password" class="button" style="font-size: 12px; padding: 4px 8px;">+ Add</button>
                        <button id="btn-import-passwords" class="button" style="font-size: 12px; padding: 4px 8px; margin-left: 4px;">Import</button>
                        <button id="btn-export-passwords" class="button" style="font-size: 12px; padding: 4px 8px; margin-left: 4px;">Export</button>
                    </div>
                </div>
                <input type="text" id="passwords-search" placeholder="Search passwords..." style="width: 100%; padding: 8px 12px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; margin-bottom: 12px; font-size: 13px; box-sizing: border-box;">
                <div id="passwords-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto;"></div>
                <input type="file" id="input-import-csv" accept=".csv,.json" style="display: none;">
            </div>
        `;

        const listDiv = panel.querySelector("#passwords-list");
        const searchInput = panel.querySelector("#passwords-search");
        const addBtn = panel.querySelector("#btn-add-password");
        const importBtn = panel.querySelector("#btn-import-passwords");
        const exportBtn = panel.querySelector("#btn-export-passwords");
        const fileInput = panel.querySelector("#input-import-csv");

        let passwords = await loadPasswords();

        const renderList = () => {
            const query = searchInput.value.toLowerCase();
            listDiv.innerHTML = "";
            const filtered = passwords.filter(p => 
                (p.title || "").toLowerCase().includes(query) ||
                (p.username || "").toLowerCase().includes(query) ||
                (p.url || "").toLowerCase().includes(query)
            );

            if (filtered.length === 0) {
                listDiv.innerHTML = `<div style="text-align: center; color: #71717a; padding: 16px; font-size: 13px;">No passwords found.</div>`;
                return;
            }

            filtered.forEach((p, idx) => {
                const card = document.createElement("div");
                card.className = "history-card";
                card.style.padding = "10px 14px";
                card.style.borderRadius = "8px";
                card.style.background = "var(--bg-card, #1c1917)";
                card.style.border = "1px solid var(--border-color, #2e2a24)";
                card.style.display = "flex";
                card.style.flexDirection = "column";
                card.style.gap = "4px";

                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong style="font-size: 14px; color: var(--accent);">${p.title || p.url}</strong>
                        <div>
                            <button class="button btn-edit-pwd" style="font-size: 11px; padding: 2px 6px;">Edit</button>
                            <button class="button btn-del-pwd" style="font-size: 11px; padding: 2px 6px; margin-left: 4px; border-color: #ef4444; color: #ef4444;">Delete</button>
                        </div>
                    </div>
                    <div style="font-size: 12px; color: #a1a1aa; display: flex; flex-direction: column; gap: 2px;">
                        <div>Username: <span style="color: #f4f4f5; font-family: monospace;">${p.username || "(empty)"}</span></div>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            Password: <span class="pwd-val" style="color: #f4f4f5; font-family: monospace;">••••••••</span>
                            <button class="button btn-show-pwd" style="font-size: 10px; padding: 1px 4px; line-height: 1;">Show</button>
                            <button class="button btn-copy-pwd" style="font-size: 10px; padding: 1px 4px; line-height: 1;">Copy</button>
                        </div>
                        ${p.url ? `<div>URL: <a href="${p.url}" target="_blank" style="color: var(--accent); text-decoration: none;">${p.url}</a></div>` : ""}
                        ${p.notes ? `<div style="font-size: 11px; font-style: italic; margin-top: 2px; color: #71717a;">Notes: ${p.notes}</div>` : ""}
                    </div>
                `;

                const pwdVal = card.querySelector(".pwd-val");
                const showBtn = card.querySelector(".btn-show-pwd");
                const copyBtn = card.querySelector(".btn-copy-pwd");
                const editEntryBtn = card.querySelector(".btn-edit-pwd");
                const delEntryBtn = card.querySelector(".btn-del-pwd");

                let shown = false;
                showBtn.onclick = () => {
                    shown = !shown;
                    pwdVal.textContent = shown ? p.password : "••••••••";
                    showBtn.textContent = shown ? "Hide" : "Show";
                };
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(p.password);
                    copyBtn.textContent = "Copied!";
                    setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
                };
                editEntryBtn.onclick = () => { showAddEditPasswordModal(p, idx); };
                delEntryBtn.onclick = async () => {
                    if (confirm(`Delete password for "${p.title || p.url}"?`)) {
                        passwords.splice(idx, 1);
                        await savePasswords(passwords);
                        renderList();
                    }
                };

                listDiv.appendChild(card);
            });
        };

        const showAddEditPasswordModal = (existing = null, indexToUpdate = -1) => {
            const modal = document.createElement("div");
            modal.style.position = "fixed";
            modal.style.inset = "0";
            modal.style.background = "rgba(10, 10, 10, 0.85)";
            modal.style.backdropFilter = "blur(8px)";
            modal.style.display = "flex";
            modal.style.alignItems = "center";
            modal.style.justifyContent = "center";
            modal.style.zIndex = "100000";

            const box = document.createElement("div");
            box.style.background = "#18181b";
            box.style.border = "1px solid #27272a";
            box.style.color = "#f4f4f5";
            box.style.padding = "24px";
            box.style.borderRadius = "16px";
            box.style.width = "min(400px, 90%)";
            box.style.boxShadow = "0 20px 25px -5px rgba(0,0,0,0.5)";
            box.style.display = "flex";
            box.style.flexDirection = "column";
            box.style.gap = "12px";

            box.innerHTML = `
                <h3 style="margin: 0; color: var(--accent);">${existing ? "📝 <span>Edit Credentials</span>" : "🔑 <span>Add Credentials</span>"}</h3>
                
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 11px; color: #a1a1aa;">Site Title:</label>
                    <input type="text" id="pwd-modal-title" placeholder="e.g. GitHub" style="padding: 6px 10px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; font-size: 13px;">
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 11px; color: #a1a1aa;">URL:</label>
                    <input type="text" id="pwd-modal-url" placeholder="https://..." style="padding: 6px 10px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; font-size: 13px;">
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 11px; color: #a1a1aa;">Username / Email:</label>
                    <input type="text" id="pwd-modal-user" placeholder="username" style="padding: 6px 10px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; font-size: 13px;">
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <div style="display: flex; justify-content: space-between;">
                        <label style="font-size: 11px; color: #a1a1aa;">Password:</label>
                        <a href="#" id="pwd-modal-gen-toggle" style="font-size: 11px; color: var(--accent); text-decoration: none;">⚙️ <span>Generate</span></a>
                    </div>
                    <input type="text" id="pwd-modal-pass" style="padding: 6px 10px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; font-size: 13px; font-family: monospace;">
                </div>

                <div id="pwd-generator-panel" style="display: none; background: #09090b; padding: 10px; border-radius: 6px; border: 1px solid #27272a; flex-direction: column; gap: 6px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
                        <span>Length (<span id="gen-len-val">20</span>):</span>
                        <input type="range" id="gen-len" min="8" max="64" value="20" style="width: 120px;">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px;">
                        <label><input type="checkbox" id="gen-upper" checked> A-Z</label>
                        <label><input type="checkbox" id="gen-lower" checked> a-z</label>
                        <label><input type="checkbox" id="gen-num" checked> 0-9</label>
                        <label><input type="checkbox" id="gen-sym" checked> !@#$</label>
                    </div>
                    <button id="btn-generate-now" class="button" style="font-size: 11px; padding: 4px;">Generate</button>
                </div>

                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 11px; color: #a1a1aa;">Notes:</label>
                    <textarea id="pwd-modal-notes" placeholder="Notes..." style="padding: 6px 10px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; font-size: 12px; height: 50px; resize: none;"></textarea>
                </div>

                <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px;">
                    <button id="btn-modal-pwd-save" class="button" style="padding: 6px 16px;">Save</button>
                    <button id="btn-modal-pwd-cancel" class="button" style="padding: 6px 16px; background: transparent; border-color: #27272a;">Cancel</button>
                </div>
            `;

            modal.appendChild(box);
            document.body.appendChild(modal);

            const mTitle = box.querySelector("#pwd-modal-title");
            const mUrl = box.querySelector("#pwd-modal-url");
            const mUser = box.querySelector("#pwd-modal-user");
            const mPass = box.querySelector("#pwd-modal-pass");
            const mNotes = box.querySelector("#pwd-modal-notes");
            const mSave = box.querySelector("#btn-modal-pwd-save");
            const mCancel = box.querySelector("#btn-modal-pwd-cancel");

            const genToggle = box.querySelector("#pwd-modal-gen-toggle");
            const genPanel = box.querySelector("#pwd-generator-panel");
            const genLen = box.querySelector("#gen-len");
            const genLenVal = box.querySelector("#gen-len-val");
            const btnGenNow = box.querySelector("#btn-generate-now");

            if (existing) {
                mTitle.value = existing.title || "";
                mUrl.value = existing.url || "";
                mUser.value = existing.username || "";
                mPass.value = existing.password || "";
                mNotes.value = existing.notes || "";
            }

            genToggle.onclick = (e) => {
                e.preventDefault();
                genPanel.style.display = genPanel.style.display === "none" ? "flex" : "none";
            };

            genLen.oninput = () => { genLenVal.textContent = genLen.value; };

            btnGenNow.onclick = (e) => {
                e.preventDefault();
                const len = parseInt(genLen.value);
                const upper = box.querySelector("#gen-upper").checked;
                const lower = box.querySelector("#gen-lower").checked;
                const num = box.querySelector("#gen-num").checked;
                const sym = box.querySelector("#gen-sym").checked;

                let chars = "";
                if (upper) chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                if (lower) chars += "abcdefghijklmnopqrstuvwxyz";
                if (num) chars += "0123456789";
                if (sym) chars += "!@#$%^&*()_+-=[]{}|;:,.<>?";

                if (!chars) {
                    alert("Please select at least one character set!");
                    return;
                }

                const array = new Uint32Array(len);
                crypto.getRandomValues(array);
                let pwd = "";
                for (let i = 0; i < len; i++) {
                    pwd += chars[array[i] % chars.length];
                }
                mPass.value = pwd;
            };

            mCancel.onclick = () => modal.remove();
            mSave.onclick = async () => {
                const t = mTitle.value.trim() || mUrl.value.trim() || "Untitled";
                const u = mUrl.value.trim();
                const usr = mUser.value.trim();
                const p = mPass.value;
                const n = mNotes.value.trim();

                if (!p) {
                    alert("Password cannot be empty.");
                    return;
                }

                const entry = {
                    title: t,
                    url: u,
                    username: usr,
                    password: p,
                    notes: n,
                    modified: Date.now()
                };

                if (indexToUpdate >= 0) {
                    passwords[indexToUpdate] = entry;
                } else {
                    passwords.push(entry);
                }

                await savePasswords(passwords);
                modal.remove();
                renderList();
            };
        };

        addBtn.onclick = () => { showAddEditPasswordModal(); };

        searchInput.oninput = renderList;

        exportBtn.onclick = () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(passwords, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", "bookmarkfs_passwords.json");
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        };

        importBtn.onclick = () => { fileInput.click(); };
        fileInput.onchange = () => {
            const file = fileInput.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    const text = reader.result;
                    if (file.name.endsWith(".json")) {
                        const parsed = JSON.parse(text);
                        if (Array.isArray(parsed)) {
                            passwords = passwords.concat(parsed);
                            await savePasswords(passwords);
                            alert("Imported JSON successfully!");
                            renderList();
                        } else {
                            alert("Invalid passwords JSON format. Must be an array.");
                        }
                    } else if (file.name.endsWith(".csv")) {
                        // Very simple CSV parser
                        const lines = text.split(/\r?\n/);
                        if (lines.length > 1) {
                            const headers = lines[0].toLowerCase().split(",");
                            const urlIdx = headers.indexOf("url");
                            const userIdx = headers.indexOf("username") >= 0 ? headers.indexOf("username") : headers.indexOf("login_username");
                            const passIdx = headers.indexOf("password") >= 0 ? headers.indexOf("password") : headers.indexOf("login_password");
                            const titleIdx = headers.indexOf("name") >= 0 ? headers.indexOf("name") : headers.indexOf("title");

                            if (passIdx === -1) {
                                alert("Could not find password column in CSV.");
                                return;
                            }

                            let importCount = 0;
                            for (let i = 1; i < lines.length; i++) {
                                if (!lines[i].trim()) continue;
                                const row = lines[i].split(",");
                                const pVal = row[passIdx];
                                if (!pVal) continue;

                                const tVal = titleIdx >= 0 ? row[titleIdx] : "";
                                const uVal = urlIdx >= 0 ? row[urlIdx] : "";
                                const usrVal = userIdx >= 0 ? row[userIdx] : "";

                                passwords.push({
                                    title: tVal || uVal || "Imported",
                                    url: uVal,
                                    username: usrVal,
                                    password: pVal,
                                    notes: "Imported via CSV",
                                    modified: Date.now()
                                });
                                importCount++;
                            }
                            await savePasswords(passwords);
                            alert(`Imported ${importCount} credentials successfully from CSV!`);
                            renderList();
                        }
                    }
                } catch (e) {
                    alert("Import failed: " + e.message);
                }
            };
            reader.readAsText(file);
            fileInput.value = "";
        };

        renderList();
    }

    // ========== QR CODE SCANNER PANEL ==========
    async function startScreenshotQRScannerRaw(onSuccess, onError) {
        await runInjectedCropScanner(true, onSuccess, onError);
    }

    function showQrScannerPanel() {
        let panel = qs("#qrscanner-panel");
        const center = document.querySelector("center") || document.body;
        if (!panel) {
            panel = document.createElement("div");
            panel.id = "qrscanner-panel";
            panel.style.width = "100%";
            center.appendChild(panel);
        }
        panel.style.display = "block";
        panel.innerHTML = `
            <div class="big-card" style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
                <h2 style="margin-top: 0; margin-bottom: 4px; color: var(--accent); display: flex; align-items: center; gap: 8px;">🔍 <span>QR Code Scanner</span></h2>
                <p style="margin: 0; font-size: 12px; color: var(--text-secondary);">Scan any QR code or barcode using your camera, screen capture, screenshot crop, clipboard paste, or file upload.</p>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                    <button id="btn-qrscan-cam" class="button" style="font-size: 12px; padding: 6px 12px;">📷 Scan Camera</button>
                    <button id="btn-qrscan-screen" class="button" style="font-size: 12px; padding: 6px 12px;">🖥️ <span>Screen Scan</span></button>
                    <button id="btn-qrscan-screenshot" class="button" style="font-size: 12px; padding: 6px 12px; grid-column: span 2; border-color: var(--accent) !important; color: var(--accent) !important; font-weight: 600;">📸 <span>Screenshot Crop </span>(Select QR)</button>
                    <label class="button" style="font-size: 12px; padding: 6px 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; margin: 0;">
                        🖼 Upload QR File
                        <input type="file" id="input-qrscan-file" accept="image/*" style="display: none;">
                    </label>
                    <button id="btn-qrscan-paste" class="button" style="font-size: 12px; padding: 6px 12px;">📋 Paste Image</button>
                </div>

                <div id="qrscan-video-container" style="display: none; position: relative; width: 100%; max-height: 280px; background: #000; border-radius: 8px; overflow: hidden; border: 1px solid #27272a;">
                    <video id="qrscan-video" style="width: 100%; display: block;" playsinline></video>
                    <div style="position: absolute; top: 10%; bottom: 10%; left: 10%; right: 10%; border: 2px dashed var(--accent); opacity: 0.7; pointer-events: none; border-radius: 8px;"></div>
                </div>
                
                <button id="btn-qrscan-scan-manual" class="button" style="margin-top: 4px; width: 100%; display: none; padding: 6px 12px; font-size: 13px;">🔍 <span>Scan Current Frame</span></button>

                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 12px; font-weight: 600; color: #a1a1aa;">Scanned Output:</label>
                    <textarea id="qrscan-output" readonly placeholder="Scanned QR code data will appear here..." style="width: 100%; height: 100px; padding: 8px 12px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; font-size: 13px; font-family: monospace; resize: vertical; box-sizing: border-box;"></textarea>
                </div>
                
                <div style="display: flex; gap: 6px; justify-content: flex-end;">
                    <button id="btn-qrscan-copy" class="button" style="padding: 6px 16px; font-weight: 600; background: var(--accent); color: #000; display: none;">📋 Copy Output</button>
                    <button id="btn-qrscan-clear" class="button" style="padding: 6px 16px; background: transparent; border-color: #27272a;">Clear</button>
                </div>
            </div>
        `;

        let activeStream = null;
        let scanInterval = null;

        const camBtn = panel.querySelector("#btn-qrscan-cam");
        const screenBtn = panel.querySelector("#btn-qrscan-screen");
        const screenshotBtn = panel.querySelector("#btn-qrscan-screenshot");
        const fileInput = panel.querySelector("#input-qrscan-file");
        const pasteBtn = panel.querySelector("#btn-qrscan-paste");
        const videoContainer = panel.querySelector("#qrscan-video-container");
        const video = panel.querySelector("#qrscan-video");
        const output = panel.querySelector("#qrscan-output");
        const copyBtn = panel.querySelector("#btn-qrscan-copy");
        const clearBtn = panel.querySelector("#btn-qrscan-clear");
        const manualScanBtn = panel.querySelector("#btn-qrscan-scan-manual");

        function handleScanSuccess(text) {
            if (text.trim().toLowerCase().startsWith("otpauth-migration:")) {
                stopCamera();
                handleMigrationImport(text);
                return;
            }
            output.value = text;
            copyBtn.style.display = "block";
            stopCamera();
            alert("QR Code scanned successfully!");
        }

        function stopCamera() {
            if (scanInterval) {
                clearInterval(scanInterval);
                scanInterval = null;
            }
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
                activeStream = null;
            }
            videoContainer.style.display = "none";
            manualScanBtn.style.display = "none";
            camBtn.textContent = "📷 Scan Camera";
            screenBtn.textContent = "🖥️ Screen Scan";
            camBtn.style.pointerEvents = "auto";
            screenBtn.style.pointerEvents = "auto";
            document.removeEventListener("paste", globalPasteHandler);
        }

        stopQrScannerCameraFn = stopCamera;

        camBtn.onclick = async () => {
            if (activeStream) {
                stopCamera();
                return;
            }

            try {
                activeStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                video.srcObject = activeStream;
                video.setAttribute("playsinline", true);
                video.play();
                videoContainer.style.display = "block";
                manualScanBtn.style.display = "block";
                camBtn.textContent = "⏹ Stop Camera";

                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d", { willReadFrequently: true });

                scanInterval = setInterval(() => {
                    if (video.readyState >= 2 && video.videoWidth > 0) {
                        const vw = video.videoWidth;
                        const vh = video.videoHeight;
                        const boxW = Math.round(vw * 0.8);
                        const boxH = Math.round(vh * 0.8);
                        const boxX = Math.round((vw - boxW) / 2);
                        const boxY = Math.round((vh - boxH) / 2);

                        // Try center guide box first
                        const centerCanvas = document.createElement("canvas");
                        centerCanvas.width = boxW;
                        centerCanvas.height = boxH;
                        const centerCtx = centerCanvas.getContext("2d", { willReadFrequently: true });
                        centerCtx.drawImage(video, boxX, boxY, boxW, boxH, 0, 0, boxW, boxH);
                        const centerImgData = centerCtx.getImageData(0, 0, boxW, boxH);
                        let code = jsQR(centerImgData.data, centerImgData.width, centerImgData.height, {
                            inversionAttempts: "attemptBoth",
                        });

                        // Fallback to full frame
                        if (!code) {
                            canvas.width = vw;
                            canvas.height = vh;
                            ctx.drawImage(video, 0, 0, vw, vh);
                            const fullImgData = ctx.getImageData(0, 0, vw, vh);
                            code = jsQR(fullImgData.data, fullImgData.width, fullImgData.height, {
                                inversionAttempts: "attemptBoth",
                            });
                        }

                        if (code) {
                            handleScanSuccess(code.data);
                        }
                    }
                }, 250);
            } catch (err) {
                if (err.name === "NotAllowedError" || err.message.toLowerCase().includes("permission denied")) {
                    const openTab = confirm("Camera access permission is denied or blocked. Chrome requires granting permission inside a full browser tab before it can be used in the Side Panel.\n\nOpen a permission tab now?");
                    if (openTab) {
                        chrome.tabs.create({ url: chrome.runtime.getURL("dist/permissions.html") });
                    }
                } else {
                    alert("Failed to access camera: " + err.message);
                }
            }
        };

        screenBtn.onclick = async () => {
            if (activeStream) {
                stopCamera();
                return;
            }

            try {
                activeStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                video.srcObject = activeStream;
                video.setAttribute("playsinline", true);
                video.play();
                videoContainer.style.display = "block";
                manualScanBtn.style.display = "block";
                screenBtn.textContent = "⏹ Stop Screen Scan";
                camBtn.style.pointerEvents = "none";

                activeStream.getVideoTracks()[0].addEventListener('ended', () => {
                    stopCamera();
                });

                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d", { willReadFrequently: true });

                scanInterval = setInterval(() => {
                    if (video.readyState >= 2 && video.videoWidth > 0) {
                        const vw = video.videoWidth;
                        const vh = video.videoHeight;
                        const boxW = Math.round(vw * 0.8);
                        const boxH = Math.round(vh * 0.8);
                        const boxX = Math.round((vw - boxW) / 2);
                        const boxY = Math.round((vh - boxH) / 2);

                        // Try center guide box first
                        const centerCanvas = document.createElement("canvas");
                        centerCanvas.width = boxW;
                        centerCanvas.height = boxH;
                        const centerCtx = centerCanvas.getContext("2d", { willReadFrequently: true });
                        centerCtx.drawImage(video, boxX, boxY, boxW, boxH, 0, 0, boxW, boxH);
                        const centerImgData = centerCtx.getImageData(0, 0, boxW, boxH);
                        let code = jsQR(centerImgData.data, centerImgData.width, centerImgData.height, {
                            inversionAttempts: "attemptBoth",
                        });

                        // Fallback to full frame
                        if (!code) {
                            canvas.width = vw;
                            canvas.height = vh;
                            ctx.drawImage(video, 0, 0, vw, vh);
                            const fullImgData = ctx.getImageData(0, 0, vw, vh);
                            code = jsQR(fullImgData.data, fullImgData.width, fullImgData.height, {
                                inversionAttempts: "attemptBoth",
                            });
                        }

                        if (code) {
                            handleScanSuccess(code.data);
                        }
                    }
                }, 250);
            } catch (err) {
                stopCamera();
                if (err.name !== "NotAllowedError" && !err.message.toLowerCase().includes("permission denied")) {
                    alert("Failed to capture screen stream: " + err.message);
                }
            }
        };

        manualScanBtn.onclick = () => {
            if (!activeStream || video.readyState < 2 || video.videoWidth === 0) {
                alert("Video stream is not ready. Please wait a second and try again.");
                return;
            }

            const vw = video.videoWidth;
            const vh = video.videoHeight;
            const boxW = Math.round(vw * 0.8);
            const boxH = Math.round(vh * 0.8);
            const boxX = Math.round((vw - boxW) / 2);
            const boxY = Math.round((vh - boxH) / 2);

            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d", { willReadFrequently: true });

            // Try center guide box first
            const centerCanvas = document.createElement("canvas");
            centerCanvas.width = boxW;
            centerCanvas.height = boxH;
            const centerCtx = centerCanvas.getContext("2d", { willReadFrequently: true });
            centerCtx.drawImage(video, boxX, boxY, boxW, boxH, 0, 0, boxW, boxH);
            const centerImgData = centerCtx.getImageData(0, 0, boxW, boxH);
            let code = jsQR(centerImgData.data, centerImgData.width, centerImgData.height, {
                inversionAttempts: "attemptBoth",
            });

            // Fallback to full frame
            if (!code) {
                canvas.width = vw;
                canvas.height = vh;
                ctx.drawImage(video, 0, 0, vw, vh);
                const fullImgData = ctx.getImageData(0, 0, vw, vh);
                code = jsQR(fullImgData.data, fullImgData.width, fullImgData.height, {
                    inversionAttempts: "attemptBoth",
                });
            }

            if (code) {
                handleScanSuccess(code.data);
            } else {
                alert("No QR Code detected in the current frame.\n\nTips:\n1. Position the QR code fully inside the dashed green box.\n2. Avoid screen glare or direct light reflections.\n3. Hold steady.");
            }
        };

        screenshotBtn.onclick = () => {
            stopCamera();
            startScreenshotQRScannerRaw(
                (text) => {
                    handleScanSuccess(text);
                },
                (errMsg) => {
                    alert(errMsg);
                }
            );
        };

        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0);
                    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imgData.data, imgData.width, imgData.height, {
                        inversionAttempts: "attemptBoth"
                    });
                    if (code) {
                        handleScanSuccess(code.data);
                    } else {
                        alert("No QR Code detected in the uploaded image.");
                    }
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        };

        pasteBtn.onclick = async () => {
            try {
                const items = await navigator.clipboard.read();
                for (const item of items) {
                    for (const type of item.types) {
                        if (type.startsWith("image/")) {
                            const blob = await item.getType(type);
                            const reader = new FileReader();
                            reader.onload = () => {
                                const img = new Image();
                                img.onload = () => {
                                    const canvas = document.createElement("canvas");
                                    canvas.width = img.width;
                                    canvas.height = img.height;
                                    const ctx = canvas.getContext("2d");
                                    ctx.drawImage(img, 0, 0);
                                    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                                    const code = jsQR(imgData.data, imgData.width, imgData.height, {
                                        inversionAttempts: "attemptBoth"
                                    });
                                    if (code) {
                                        handleScanSuccess(code.data);
                                    } else {
                                        alert("No QR Code detected in the pasted image.");
                                    }
                                };
                                img.src = reader.result;
                            };
                            reader.readAsDataURL(blob);
                            return;
                        }
                    }
                }
                alert("No image found in clipboard. Copy an image first, then click Paste.");
            } catch (err) {
                alert("Failed to read clipboard: " + err.message);
            }
        };

        const handlePasteImage = async (items) => {
            for (const item of items) {
                if (item.type.startsWith("image/")) {
                    const blob = item.getAsFile();
                    const reader = new FileReader();
                    reader.onload = () => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement("canvas");
                            canvas.width = img.width;
                            canvas.height = img.height;
                            const ctx = canvas.getContext("2d");
                            ctx.drawImage(img, 0, 0);
                            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                            const code = jsQR(imgData.data, imgData.width, imgData.height, {
                                inversionAttempts: "attemptBoth"
                            });
                            if (code) {
                                handleScanSuccess(code.data);
                            } else {
                                alert("No QR Code detected in the pasted image.");
                            }
                        };
                        img.src = reader.result;
                    };
                    reader.readAsDataURL(blob);
                    return;
                }
            }
        };

        const globalPasteHandler = (e) => {
            if (panel.style.display === "block" && e.clipboardData && e.clipboardData.items) {
                handlePasteImage(e.clipboardData.items);
            }
        };
        document.addEventListener("paste", globalPasteHandler);

        copyBtn.onclick = () => {
            navigator.clipboard.writeText(output.value);
            const orig = copyBtn.textContent;
            copyBtn.textContent = "Copied!";
            setTimeout(() => { copyBtn.textContent = orig; }, 1500);
        };

        clearBtn.onclick = () => {
            output.value = "";
            copyBtn.style.display = "none";
        };
    }

    // ========== 2. CALCULATOR PANEL ==========
    function showCalcPanel() {
        let panel = qs("#calc-panel");
        const center = document.querySelector("center") || document.body;
        if (!panel) {
            panel = document.createElement("div");
            panel.id = "calc-panel";
            panel.style.width = "100%";
            center.appendChild(panel);
        }
        panel.style.display = "block";
        panel.innerHTML = `
            <div class="big-card" style="padding: 16px;">
                <h2 style="margin-top: 0; margin-bottom: 12px;">🧮 <span>Calculator </span>& Convert</h2>
                
                <div style="display: flex; gap: 8px; margin-bottom: 12px; border-bottom: 1px solid #27272a; padding-bottom: 6px;">
                    <a href="#" id="calc-tab-basic" style="color: var(--accent); text-decoration: none; font-weight: bold; font-size: 13px;">Calc</a>
                    <a href="#" id="calc-tab-convert" style="color: #71717a; text-decoration: none; font-size: 13px; margin-left: 12px;">Convert</a>
                </div>

                <div id="calc-basic-view">
                    <input type="text" id="calc-screen" style="width: 100%; padding: 12px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; font-size: 18px; text-align: right; font-family: monospace; box-sizing: border-box;" readonly>
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 10px;">
                        <button class="button calc-btn" data-val="C" style="background: #3f3f46;">C</button>
                        <button class="button calc-btn" data-val="(">(</button>
                        <button class="button calc-btn" data-val=")">)</button>
                        <button class="button calc-btn" data-val="/" style="background: #27272a; color: var(--accent); font-weight: bold;">/</button>
                        
                        <button class="button calc-btn" data-val="7">7</button>
                        <button class="button calc-btn" data-val="8">8</button>
                        <button class="button calc-btn" data-val="9">9</button>
                        <button class="button calc-btn" data-val="*" style="background: #27272a; color: var(--accent); font-weight: bold;">*</button>
                        
                        <button class="button calc-btn" data-val="4">4</button>
                        <button class="button calc-btn" data-val="5">5</button>
                        <button class="button calc-btn" data-val="6">6</button>
                        <button class="button calc-btn" data-val="-" style="background: #27272a; color: var(--accent); font-weight: bold;">-</button>
                        
                        <button class="button calc-btn" data-val="1">1</button>
                        <button class="button calc-btn" data-val="2">2</button>
                        <button class="button calc-btn" data-val="3">3</button>
                        <button class="button calc-btn" data-val="+" style="background: #27272a; color: var(--accent); font-weight: bold;">+</button>
                        
                        <button class="button calc-btn" data-val="0">0</button>
                        <button class="button calc-btn" data-val=".">.</button>
                        <button class="button calc-btn" data-val="back" style="font-size: 11px;">⌫</button>
                        <button class="button calc-btn" data-val="=" style="background: var(--accent); color: #000; font-weight: bold;">=</button>
                    </div>
                </div>

                <div id="calc-convert-view" style="display: none; flex-direction: column; gap: 8px;">
                    <div style="display: flex; flex-direction: column; gap: 2px;">
                        <label style="font-size: 11px; color: #a1a1aa;">Category:</label>
                        <select id="conv-cat" style="padding: 6px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; font-size: 13px;">
                            <option value="length">Length (px / rem / em / cm / in)</option>
                            <option value="temp">Temperature (°C / °F / K)</option>
                            <option value="data">Data Size (B / KB / MB / GB)</option>
                        </select>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <div style="flex: 1; display: flex; flex-direction: column; gap: 2px;">
                            <input type="number" id="conv-input" value="1" style="padding: 8px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; font-size: 13px; box-sizing: border-box; width: 100%;">
                            <select id="conv-from" style="padding: 4px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 4px; outline: none; font-size: 12px; margin-top: 4px;"></select>
                        </div>
                        <div style="align-self: center; font-size: 16px;">➡️</div>
                        <div style="flex: 1; display: flex; flex-direction: column; gap: 2px;">
                            <input type="text" id="conv-output" style="padding: 8px; background: #09090b; border: 1px solid #27272a; color: #a1a1aa; border-radius: 6px; outline: none; font-size: 13px; box-sizing: border-box; width: 100%;" readonly>
                            <select id="conv-to" style="padding: 4px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 4px; outline: none; font-size: 12px; margin-top: 4px;"></select>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const basicTab = panel.querySelector("#calc-tab-basic");
        const convertTab = panel.querySelector("#calc-tab-convert");
        const basicView = panel.querySelector("#calc-basic-view");
        const convertView = panel.querySelector("#calc-convert-view");

        basicTab.onclick = (e) => {
            e.preventDefault();
            basicTab.style.fontWeight = "bold";
            basicTab.style.color = "var(--accent)";
            convertTab.style.fontWeight = "normal";
            convertTab.style.color = "#71717a";
            basicView.style.display = "block";
            convertView.style.display = "none";
        };
        convertTab.onclick = (e) => {
            e.preventDefault();
            convertTab.style.fontWeight = "bold";
            convertTab.style.color = "var(--accent)";
            basicTab.style.fontWeight = "normal";
            basicTab.style.color = "#71717a";
            basicView.style.display = "none";
            convertView.style.display = "flex";
        };

        // Basic Calc Core
        const screen = panel.querySelector("#calc-screen");
        let calcVal = "";
        
        function safeEvaluateMath(str) {
            str = str.replace(/\s+/g, "");
            let pos = 0;
            function parseExpr() {
                let val = parseTerm();
                while (pos < str.length) {
                    const op = str[pos];
                    if (op === "+" || op === "-") {
                        pos++;
                        const val2 = parseTerm();
                        val = op === "+" ? val + val2 : val - val2;
                    } else { break; }
                }
                return val;
            }
            function parseTerm() {
                let val = parseFactor();
                while (pos < str.length) {
                    const op = str[pos];
                    if (op === "*" || op === "/") {
                        pos++;
                        const val2 = parseFactor();
                        val = op === "*" ? val * val2 : val / val2;
                    } else { break; }
                }
                return val;
            }
            function parseFactor() {
                if (str[pos] === "(") {
                    pos++;
                    const val = parseExpr();
                    if (str[pos] === ")") pos++;
                    return val;
                }
                let start = pos;
                if (str[pos] === "-") pos++;
                while (pos < str.length && /[0-9.]/.test(str[pos])) pos++;
                const numStr = str.substring(start, pos);
                return parseFloat(numStr) || 0;
            }
            try {
                return parseExpr();
            } catch(e) { return "Error"; }
        }

        panel.querySelectorAll(".calc-btn").forEach(btn => {
            btn.onclick = () => {
                const val = btn.dataset.val;
                if (val === "C") {
                    calcVal = "";
                } else if (val === "back") {
                    calcVal = calcVal.substring(0, calcVal.length - 1);
                } else if (val === "=") {
                    if (calcVal) {
                        calcVal = String(safeEvaluateMath(calcVal));
                    }
                } else {
                    calcVal += val;
                }
                screen.value = calcVal;
            };
        });

        // Convert UI Core
        const convCat = panel.querySelector("#conv-cat");
        const convInput = panel.querySelector("#conv-input");
        const convOutput = panel.querySelector("#conv-output");
        const convFrom = panel.querySelector("#conv-from");
        const convTo = panel.querySelector("#conv-to");

        const units = {
            length: {
                px: 1,
                rem: 16,
                em: 16,
                cm: 37.795,
                in: 96
            },
            temp: {
                C: "C",
                F: "F",
                K: "K"
            },
            data: {
                B: 1,
                KB: 1024,
                MB: 1024 * 1024,
                GB: 1024 * 1024 * 1024
            }
        };

        const setupConvertUnits = () => {
            const cat = convCat.value;
            convFrom.innerHTML = "";
            convTo.innerHTML = "";
            Object.keys(units[cat]).forEach(u => {
                const opt1 = document.createElement("option");
                opt1.value = u; opt1.textContent = u;
                convFrom.appendChild(opt1);

                const opt2 = document.createElement("option");
                opt2.value = u; opt2.textContent = u;
                convTo.appendChild(opt2);
            });
            if (cat === "length") convTo.value = "rem";
            if (cat === "temp") convTo.value = "F";
            if (cat === "data") convTo.value = "MB";
            runConversion();
        };

        const runConversion = () => {
            const cat = convCat.value;
            const val = parseFloat(convInput.value) || 0;
            const from = convFrom.value;
            const to = convTo.value;
            if (!from || !to) return;

            if (cat === "temp") {
                if (from === to) { convOutput.value = val; return; }
                let c = val;
                if (from === "F") c = (val - 32) * 5/9;
                else if (from === "K") c = val - 273.15;
                
                let res = c;
                if (to === "F") res = c * 9/5 + 32;
                else if (to === "K") res = c + 273.15;
                convOutput.value = res.toFixed(3);
            } else {
                const baseVal = val * units[cat][from];
                const converted = baseVal / units[cat][to];
                convOutput.value = converted.toFixed(4).replace(/\.?0+$/, "");
            }
        };

        convCat.onchange = setupConvertUnits;
        convInput.oninput = runConversion;
        convFrom.onchange = runConversion;
        convTo.onchange = runConversion;

        setupConvertUnits();
    }

    // ========== 3. REMINDERS PANEL ==========
    // ========== 4. CLOCK & REMINDER PANEL ==========
    async function showClockPanel() {
        let panel = qs("#clock-panel");
        const center = document.querySelector("center") || document.body;
        if (!panel) {
            panel = document.createElement("div");
            panel.id = "clock-panel";
            panel.style.width = "100%";
            center.appendChild(panel);
        }
        panel.style.display = "block";
        panel.innerHTML = "";

        panel.innerHTML = `
            <div class="big-card" style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
                <h2 style="margin: 0; display: flex; align-items: center; gap: 8px;">⏰ <span>Clock </span>& Reminders</h2>
                
                <!-- Tab Controls -->
                <div style="display: flex; border-bottom: 1px solid #27272a; margin-bottom: 8px;">
                    <button id="tab-clock-alarm" style="flex: 1; padding: 8px; background: transparent; border: none; border-bottom: 2px solid ${activeClockTab === "alarm" ? "var(--accent)" : "transparent"}; color: ${activeClockTab === "alarm" ? "#ffffff" : "#a1a1aa"}; font-weight: bold; cursor: pointer; font-size: 13px;">Alarm & Reminders</button>
                    <button id="tab-clock-stopwatch" style="flex: 1; padding: 8px; background: transparent; border: none; border-bottom: 2px solid ${activeClockTab === "stopwatch" ? "var(--accent)" : "transparent"}; color: ${activeClockTab === "stopwatch" ? "#ffffff" : "#a1a1aa"}; font-weight: bold; cursor: pointer; font-size: 13px;">Stopwatch</button>
                    <button id="tab-clock-world" style="flex: 1; padding: 8px; background: transparent; border: none; border-bottom: 2px solid ${activeClockTab === "world" ? "var(--accent)" : "transparent"}; color: ${activeClockTab === "world" ? "#ffffff" : "#a1a1aa"}; font-weight: bold; cursor: pointer; font-size: 13px;">World Time</button>
                </div>

                <!-- Alarm & Reminders Content Container -->
                <div id="clock-alarm-content" style="display: ${activeClockTab === "alarm" ? "flex" : "none"}; flex-direction: column; gap: 12px;">
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label style="font-size: 11px; color: #a1a1aa;">Reminder Message:</label>
                        <input type="text" id="remind-msg" placeholder="e.g. Drink water! 💧" style="padding: 8px 12px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; font-size: 13px; box-sizing: border-box; width: 100%;">
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label style="font-size: 11px; color: #a1a1aa;">Set Time:</label>
                        <input type="datetime-local" id="remind-time" style="padding: 8px 12px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; font-size: 13px; box-sizing: border-box; width: 100%;">
                    </div>

                    <div style="display: flex; gap: 6px;">
                        <button class="button remind-quick" data-min="5" style="flex: 1; font-size: 11px; padding: 4px;">5m</button>
                        <button class="button remind-quick" data-min="15" style="flex: 1; font-size: 11px; padding: 4px;">15m</button>
                        <button class="button remind-quick" data-min="30" style="flex: 1; font-size: 11px; padding: 4px;">30m</button>
                        <button class="button remind-quick" data-min="60" style="flex: 1; font-size: 11px; padding: 4px;">1h</button>
                    </div>

                    <button id="btn-set-reminder" class="button" style="padding: 8px; font-weight: bold; width: 100%;">Set Reminder</button>

                    <h3 style="margin-top: 10px; margin-bottom: 6px; font-size: 14px;">Active Countdowns</h3>
                    <div id="reminders-active-list" style="display: flex; flex-direction: column; gap: 6px;"></div>
                </div>

                <!-- Stopwatch Content Container -->
                <div id="clock-stopwatch-content" style="display: ${activeClockTab === "stopwatch" ? "flex" : "none"}; flex-direction: column; gap: 12px; align-items: center;">
                    <div id="stopwatch-display" style="font-size: 36px; font-family: monospace; font-weight: bold; color: #f4f4f5; margin: 10px 0;">00:00.00</div>
                    
                    <div style="display: flex; gap: 8px; width: 100%;">
                        <button id="btn-stopwatch-toggle" class="button" style="flex: 1; font-weight: bold;">Start</button>
                        <button id="btn-stopwatch-lap" class="button" style="flex: 1; font-weight: bold; background: transparent; border-color: #27272a;">Lap</button>
                        <button id="btn-stopwatch-reset" class="button" style="flex: 1; font-weight: bold; background: transparent; border-color: #27272a;">Reset</button>
                    </div>

                    <div id="stopwatch-laps" style="width: 100%; max-height: 150px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; border-top: 1px solid #27272a; padding-top: 8px; margin-top: 4px;">
                        <!-- Recorded laps -->
                    </div>
                </div>

                <!-- World Clock Content Container -->
                <div id="clock-world-content" style="display: ${activeClockTab === "world" ? "flex" : "none"}; flex-direction: column; gap: 12px;">
                    <!-- Local Time Header -->
                    <div style="background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; align-items: center; gap: 4px;">
                        <span style="font-size: 11px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.05em;">Your Local Time</span>
                        <div id="world-local-time" style="font-size: 28px; font-weight: 800; color: var(--accent); font-family: monospace;">00:00:00</div>
                        <span id="world-local-date" style="font-size: 12px; color: #f4f4f5;">-</span>
                    </div>

                    <!-- World Clocks List -->
                    <div id="world-clocks-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 250px; overflow-y: auto; padding-right: 2px;">
                        <!-- Timezone cards -->
                    </div>

                    <!-- Add Timezone Form -->
                    <div style="display: flex; gap: 6px; border-top: 1px solid #27272a; padding-top: 10px; margin-top: 4px;">
                        <select id="select-world-timezone" style="flex: 1; padding: 6px 10px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; font-size: 13px; outline: none; cursor: pointer;">
                            <option value="UTC">UTC / GMT</option>
                            <option value="America/New_York">New York (EST/EDT)</option>
                            <option value="America/Los_Angeles">Los Angeles (PST/PDT)</option>
                            <option value="America/Chicago">Chicago (CST/CDT)</option>
                            <option value="America/Denver">Denver (MST/MDT)</option>
                            <option value="Europe/London">London (GMT/BST)</option>
                            <option value="Europe/Paris">Paris / Berlin (CET/CEST)</option>
                            <option value="Europe/Moscow">Moscow (MSK)</option>
                            <option value="Asia/Dubai">Dubai (GST)</option>
                            <option value="Asia/Kolkata">Mumbai (IST)</option>
                            <option value="Asia/Singapore">Singapore / Beijing (SGT)</option>
                            <option value="Asia/Tokyo">Tokyo (JST)</option>
                            <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
                            <option value="America/Sao_Paulo">São Paulo (BRT)</option>
                        </select>
                        <button id="btn-add-world-clock" class="button" style="padding: 6px 12px; font-size: 12px; font-weight: 600;">➕ Add</button>
                    </div>
                </div>
            </div>
        `;

        const msgInput = panel.querySelector("#remind-msg");
        const timeInput = panel.querySelector("#remind-time");
        const setBtn = panel.querySelector("#btn-set-reminder");
        const activeList = panel.querySelector("#reminders-active-list");

        // Tab logic
        const tabAlarm = panel.querySelector("#tab-clock-alarm");
        const tabStopwatch = panel.querySelector("#tab-clock-stopwatch");
        const tabWorld = panel.querySelector("#tab-clock-world");
        const alarmContent = panel.querySelector("#clock-alarm-content");
        const stopwatchContent = panel.querySelector("#clock-stopwatch-content");
        const worldContent = panel.querySelector("#clock-world-content");

        tabAlarm.onclick = () => {
            activeClockTab = "alarm";
            tabAlarm.style.borderBottomColor = "var(--accent)";
            tabAlarm.style.color = "#ffffff";
            tabStopwatch.style.borderBottomColor = "transparent";
            tabStopwatch.style.color = "#a1a1aa";
            tabWorld.style.borderBottomColor = "transparent";
            tabWorld.style.color = "#a1a1aa";
            alarmContent.style.display = "flex";
            stopwatchContent.style.display = "none";
            worldContent.style.display = "none";
            if (worldClockInterval) {
                clearInterval(worldClockInterval);
                worldClockInterval = null;
            }
        };

        tabStopwatch.onclick = () => {
            activeClockTab = "stopwatch";
            tabAlarm.style.borderBottomColor = "transparent";
            tabAlarm.style.color = "#a1a1aa";
            tabStopwatch.style.borderBottomColor = "var(--accent)";
            tabStopwatch.style.color = "#ffffff";
            tabWorld.style.borderBottomColor = "transparent";
            tabWorld.style.color = "#a1a1aa";
            alarmContent.style.display = "none";
            stopwatchContent.style.display = "flex";
            worldContent.style.display = "none";
            if (worldClockInterval) {
                clearInterval(worldClockInterval);
                worldClockInterval = null;
            }
            renderLaps();
        };

        tabWorld.onclick = () => {
            activeClockTab = "world";
            tabAlarm.style.borderBottomColor = "transparent";
            tabAlarm.style.color = "#a1a1aa";
            tabStopwatch.style.borderBottomColor = "transparent";
            tabStopwatch.style.color = "#a1a1aa";
            tabWorld.style.borderBottomColor = "var(--accent)";
            tabWorld.style.color = "#ffffff";
            alarmContent.style.display = "none";
            stopwatchContent.style.display = "none";
            worldContent.style.display = "flex";
            updateWorldClocks();
            if (worldClockInterval) clearInterval(worldClockInterval);
            worldClockInterval = setInterval(updateWorldClocks, 1000);
        };

        // Pre-fill local date-time string for Alarm & Reminders
        const now = new Date();
        now.setMinutes(now.getMinutes() + 5);
        const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().substring(0, 16);
        timeInput.value = localISO;

        panel.querySelectorAll(".remind-quick").forEach(btn => {
            btn.onclick = () => {
                const mins = parseInt(btn.dataset.min);
                const t = new Date();
                t.setMinutes(t.getMinutes() + mins);
                timeInput.value = new Date(t.getTime() - t.getTimezoneOffset() * 60000).toISOString().substring(0, 16);
            };
        });

        const loadRemindersList = async () => {
            const data = await chrome.storage.local.get("bookmarkfs_reminders");
            const reminders = data.bookmarkfs_reminders || [];
            activeList.innerHTML = "";

            const active = reminders.filter(r => !r.completed);
            if (active.length === 0) {
                activeList.innerHTML = `<div style="text-align: center; color: #71717a; font-size: 11px; padding: 8px;">No active reminders.</div>`;
                return;
            }

            active.forEach((r, idx) => {
                const item = document.createElement("div");
                item.className = "history-card";
                item.style.padding = "8px 12px";
                item.style.borderRadius = "6px";
                item.style.display = "flex";
                item.style.justifyContent = "space-between";
                item.style.alignItems = "center";
                item.style.fontSize = "12px";
                item.style.background = "#1c1917";
                item.style.border = "1px solid #2e2a24";

                const diff = r.targetTime - Date.now();
                const diffMin = Math.max(0, Math.ceil(diff / 60000));

                item.innerHTML = `
                    <div>
                        <strong style="color: var(--accent);">${r.message}</strong>
                        <div style="font-size: 10px; color: #a1a1aa; margin-top: 2px;">Due in ${diffMin} mins (${new Date(r.targetTime).toLocaleTimeString()})</div>
                    </div>
                    <button class="button btn-cancel-remind" style="font-size: 10px; padding: 2px 6px; border-color: #ef4444; color: #ef4444;">Cancel</button>
                `;

                item.querySelector(".btn-cancel-remind").onclick = async () => {
                    await chrome.alarms.clear(r.alarmName);
                    const updated = reminders.filter(x => x.alarmName !== r.alarmName);
                    await chrome.storage.local.set({ bookmarkfs_reminders: updated });
                    loadRemindersList();
                };

                activeList.appendChild(item);
            });
        };

        setBtn.onclick = async () => {
            const msg = msgInput.value.trim() || "Reminder!";
            const tStr = timeInput.value;
            if (!tStr) return;
            const targetTime = new Date(tStr).getTime();
            if (targetTime <= Date.now()) {
                alert("Reminder time must be in the future.");
                return;
            }

            const alarmName = "bookmarkfs_reminder_" + targetTime;
            const delayMin = (targetTime - Date.now()) / 60000;
            
            await chrome.alarms.create(alarmName, { delayInMinutes: delayMin });

            const data = await chrome.storage.local.get("bookmarkfs_reminders");
            const reminders = data.bookmarkfs_reminders || [];
            reminders.push({
                alarmName,
                message: msg,
                targetTime,
                completed: false
            });
            await chrome.storage.local.set({ bookmarkfs_reminders: reminders });

            msgInput.value = "";
            loadRemindersList();
            alert("Reminder set successfully!");
        };

        loadRemindersList();

        // Stopwatch implementation details
        const stopwatchDisplay = panel.querySelector("#stopwatch-display");
        const stopwatchToggleBtn = panel.querySelector("#btn-stopwatch-toggle");
        const stopwatchLapBtn = panel.querySelector("#btn-stopwatch-lap");
        const stopwatchResetBtn = panel.querySelector("#btn-stopwatch-reset");
        const stopwatchLapsContainer = panel.querySelector("#stopwatch-laps");

        function formatStopwatchTime(ms) {
            const min = Math.floor(ms / 60000);
            const sec = Math.floor((ms % 60000) / 1000);
            const centi = Math.floor((ms % 1000) / 10);
            return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(centi).padStart(2, '0')}`;
        }

        let localStopwatchInterval = null;

        function updateStopwatchDisplay() {
            let elapsed = stopwatchTime;
            if (stopwatchRunning) {
                elapsed += (Date.now() - stopwatchStartTimestamp);
            }
            stopwatchDisplay.textContent = formatStopwatchTime(elapsed);
        }

        function renderLaps() {
            stopwatchLapsContainer.innerHTML = "";
            if (stopwatchLaps.length === 0) {
                stopwatchLapsContainer.innerHTML = `<div style="text-align: center; color: #71717a; font-size: 11px; padding: 4px;">No laps recorded.</div>`;
                return;
            }
            stopwatchLaps.forEach((lap, idx) => {
                const lapDiv = document.createElement("div");
                lapDiv.style.display = "flex";
                lapDiv.style.justifyContent = "space-between";
                lapDiv.style.fontSize = "12px";
                lapDiv.style.padding = "4px 8px";
                lapDiv.style.background = "#18181b";
                lapDiv.style.border = "1px solid #27272a";
                lapDiv.style.borderRadius = "4px";
                lapDiv.innerHTML = `
                    <span style="color: #a1a1aa;">Lap ${stopwatchLaps.length - idx}</span>
                    <strong style="color: var(--accent); font-family: monospace;">${formatStopwatchTime(lap)}</strong>
                `;
                stopwatchLapsContainer.appendChild(lapDiv);
            });
        }

        const startTimer = () => {
            if (localStopwatchInterval) clearInterval(localStopwatchInterval);
            localStopwatchInterval = setInterval(() => {
                updateStopwatchDisplay();
            }, 30);
        };

        stopwatchToggleBtn.onclick = () => {
            if (stopwatchRunning) {
                stopwatchTime += (Date.now() - stopwatchStartTimestamp);
                stopwatchRunning = false;
                if (localStopwatchInterval) clearInterval(localStopwatchInterval);
                stopwatchToggleBtn.textContent = "Start";
                stopwatchToggleBtn.style.background = "#10b981";
                stopwatchToggleBtn.style.borderColor = "#10b981";
                stopwatchToggleBtn.style.color = "#000000";
            } else {
                stopwatchStartTimestamp = Date.now();
                stopwatchRunning = true;
                startTimer();
                stopwatchToggleBtn.textContent = "Stop";
                stopwatchToggleBtn.style.background = "#ef4444";
                stopwatchToggleBtn.style.borderColor = "#ef4444";
                stopwatchToggleBtn.style.color = "#ffffff";
            }
            updateStopwatchDisplay();
        };

        stopwatchLapBtn.onclick = () => {
            if (!stopwatchRunning && stopwatchTime === 0) return;
            let elapsed = stopwatchTime;
            if (stopwatchRunning) {
                elapsed += (Date.now() - stopwatchStartTimestamp);
            }
            stopwatchLaps.unshift(elapsed);
            renderLaps();
        };

        stopwatchResetBtn.onclick = () => {
            stopwatchRunning = false;
            stopwatchTime = 0;
            stopwatchLaps = [];
            if (localStopwatchInterval) clearInterval(localStopwatchInterval);
            stopwatchToggleBtn.textContent = "Start";
            stopwatchToggleBtn.style.background = "#10b981";
            stopwatchToggleBtn.style.borderColor = "#10b981";
            stopwatchToggleBtn.style.color = "#000000";
            updateStopwatchDisplay();
            renderLaps();
        };

        if (stopwatchRunning) {
            startTimer();
            stopwatchToggleBtn.textContent = "Stop";
            stopwatchToggleBtn.style.background = "#ef4444";
            stopwatchToggleBtn.style.borderColor = "#ef4444";
            stopwatchToggleBtn.style.color = "#ffffff";
        } else {
            stopwatchToggleBtn.textContent = "Start";
            stopwatchToggleBtn.style.background = "#10b981";
            stopwatchToggleBtn.style.borderColor = "#10b981";
            stopwatchToggleBtn.style.color = "#000000";
        }
        updateStopwatchDisplay();
        renderLaps();

        // ========== World Time Implementation Details ==========
        const localTimeEl = panel.querySelector("#world-local-time");
        const localDateEl = panel.querySelector("#world-local-date");
        const worldClocksList = panel.querySelector("#world-clocks-list");
        const selectTimezone = panel.querySelector("#select-world-timezone");
        const addWorldClockBtn = panel.querySelector("#btn-add-world-clock");

        function formatOffset(tz) {
            try {
                const now = new Date();
                const parts = new Intl.DateTimeFormat('en-US', {
                    timeZone: tz,
                    timeZoneName: 'longOffset'
                }).formatToParts(now);
                const tzPart = parts.find(p => p.type === 'timeZoneName');
                return tzPart ? tzPart.value : "";
            } catch(e) {
                return "";
            }
        }

        async function updateWorldClocks() {
            const now = new Date();
            
            if (localTimeEl) {
                localTimeEl.textContent = now.toTimeString().split(' ')[0];
            }
            if (localDateEl) {
                localDateEl.textContent = now.toLocaleDateString("en-US", {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }

            const data = await chrome.storage.local.get("bookmarkfs_world_clocks");
            let worldClocks = data.bookmarkfs_world_clocks || [
                { name: "New York", tz: "America/New_York" },
                { name: "London", tz: "Europe/London" },
                { name: "Tokyo", tz: "Asia/Tokyo" }
            ];

            if (!data.bookmarkfs_world_clocks) {
                await chrome.storage.local.set({ bookmarkfs_world_clocks: worldClocks });
            }

            if (!worldClocksList) return;
            
            let html = "";
            worldClocks.forEach((clock, index) => {
                let timeStr = "";
                let dateStr = "";
                try {
                    timeStr = now.toLocaleTimeString("en-US", {
                        timeZone: clock.tz,
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                    });
                    dateStr = now.toLocaleDateString("en-US", {
                        timeZone: clock.tz,
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                    });
                } catch(e) {
                    timeStr = now.toLocaleTimeString();
                    dateStr = now.toLocaleDateString();
                }

                const offsetVal = formatOffset(clock.tz);

                html += `
                    <div class="history-card" style="padding: 10px 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; background: #1c1917; border: 1px solid #2e2a24; font-size: 13px;">
                        <div>
                            <div style="font-weight: 700; color: #f4f4f5;">${clock.name}</div>
                            <div style="font-size: 11px; color: #a1a1aa; margin-top: 2px;">
                                ${dateStr} &bull; <span style="font-family: monospace;">${offsetVal}</span>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="font-family: monospace; font-size: 16px; font-weight: bold; color: var(--accent);">${timeStr}</div>
                            <button class="btn-delete-world-clock" data-index="${index}" style="background: transparent; border: none; color: #ef4444; cursor: pointer; font-size: 16px; padding: 0 4px; line-height: 1;">&times;</button>
                        </div>
                    </div>
                `;
            });

            worldClocksList.innerHTML = html;

            worldClocksList.querySelectorAll(".btn-delete-world-clock").forEach(btn => {
                btn.onclick = async (e) => {
                    const idx = parseInt(btn.dataset.index);
                    const currentData = await chrome.storage.local.get("bookmarkfs_world_clocks");
                    const currentClocks = currentData.bookmarkfs_world_clocks || [];
                    currentClocks.splice(idx, 1);
                    await chrome.storage.local.set({ bookmarkfs_world_clocks: currentClocks });
                    updateWorldClocks();
                };
            });
        }

        if (addWorldClockBtn) {
            addWorldClockBtn.onclick = async () => {
                const tz = selectTimezone.value;
                const name = selectTimezone.options[selectTimezone.selectedIndex].text.split(' (')[0];
                const currentData = await chrome.storage.local.get("bookmarkfs_world_clocks");
                const currentClocks = currentData.bookmarkfs_world_clocks || [];
                
                if (currentClocks.some(c => c.tz === tz)) {
                    alert("This timezone is already in your list.");
                    return;
                }

                currentClocks.push({ name, tz });
                await chrome.storage.local.set({ bookmarkfs_world_clocks: currentClocks });
                updateWorldClocks();
            };
        }

        if (activeClockTab === "world") {
            updateWorldClocks();
            if (worldClockInterval) clearInterval(worldClockInterval);
            worldClockInterval = setInterval(updateWorldClocks, 1000);
        }
    }



    // ========== 6. REGEX PANEL ==========
    function showRegexPanel() {
        let panel = qs("#regex-panel");
        const center = document.querySelector("center") || document.body;
        if (!panel) {
            panel = document.createElement("div");
            panel.id = "regex-panel";
            panel.style.width = "100%";
            center.appendChild(panel);
        }
        panel.style.display = "block";
        panel.innerHTML = `
            <div class="big-card" style="padding: 16px; display: flex; flex-direction: column; gap: 8px;">
                <h2 style="margin: 0; margin-bottom: 4px;">🔍 <span>Regex Tester</span></h2>
                
                <div style="display: flex; gap: 6px; align-items: center;">
                    <span style="font-family: monospace; font-size: 16px; color: #a1a1aa;">/</span>
                    <input type="text" id="regex-pattern" placeholder="pattern" style="flex: 1; padding: 6px 8px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; font-size: 13px; font-family: monospace;">
                    <span style="font-family: monospace; font-size: 16px; color: #a1a1aa;">/</span>
                    <input type="text" id="regex-flags" value="g" style="width: 40px; padding: 6px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; font-size: 13px; font-family: monospace; text-align: center;">
                </div>

                <textarea id="regex-text" placeholder="Enter test string here..." style="width: 100%; height: 80px; padding: 8px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; font-size: 12px; font-family: monospace; resize: vertical; box-sizing: border-box;"></textarea>
                
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #a1a1aa; margin-top: 2px;">
                    <span>Matches Found: <strong id="regex-match-count" style="color: var(--accent);">0</strong></span>
                </div>

                <div id="regex-output" style="width: 100%; height: 80px; padding: 8px; background: #09090b; border: 1px solid #27272a; border-radius: 6px; font-size: 12px; font-family: monospace; overflow-y: auto; white-space: pre-wrap; box-sizing: border-box;"></div>
            </div>
        `;

        const patternInput = panel.querySelector("#regex-pattern");
        const flagsInput = panel.querySelector("#regex-flags");
        const textInput = panel.querySelector("#regex-text");
        const countText = panel.querySelector("#regex-match-count");
        const output = panel.querySelector("#regex-output");

        const runTest = () => {
            const p = patternInput.value;
            const f = flagsInput.value;
            const text = textInput.value;
            output.innerHTML = "";

            if (!p) {
                output.textContent = text;
                countText.textContent = "0";
                return;
            }

            try {
                const regex = new RegExp(p, f);
                let html = "";
                let matches = 0;

                // Escape text for display to prevent XSS
                const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

                if (f.includes("g")) {
                    let lastIdx = 0;
                    let match;
                    while ((match = regex.exec(text)) !== null) {
                        if (match[0].length === 0) {
                            regex.lastIndex++;
                            continue;
                        }
                        const start = match.index;
                        const end = regex.lastIndex;
                        html += escaped.substring(lastIdx, start) + `<mark style="background: var(--accent); color: #000; padding: 0 2px; border-radius: 2px;">${escaped.substring(start, end)}</mark>`;
                        lastIdx = end;
                        matches++;
                    }
                    html += escaped.substring(lastIdx);
                } else {
                    const match = text.match(regex);
                    if (match) {
                        const start = match.index;
                        const end = start + match[0].length;
                        html = escaped.substring(0, start) + `<mark style="background: var(--accent); color: #000; padding: 0 2px; border-radius: 2px;">${escaped.substring(start, end)}</mark>` + escaped.substring(end);
                        matches = 1;
                    } else {
                        html = escaped;
                    }
                }
                
                output.innerHTML = html || escaped;
                countText.textContent = matches;
            } catch (err) {
                output.innerHTML = `<span style="color: #ef4444;">Invalid regex: ${err.message}</span>`;
                countText.textContent = "0";
            }
        };

        patternInput.oninput = runTest;
        flagsInput.oninput = runTest;
        textInput.oninput = runTest;
    }

    // ========== 7. COLOR PANEL ==========
    function showColorPanel() {
        let panel = qs("#color-panel");
        const center = document.querySelector("center") || document.body;
        if (!panel) {
            panel = document.createElement("div");
            panel.id = "color-panel";
            panel.style.width = "100%";
            center.appendChild(panel);
        }
        panel.style.display = "block";
        panel.innerHTML = `
            <div class="big-card" style="padding: 16px; display: flex; flex-direction: column; gap: 10px;">
                <h2 style="margin: 0; margin-bottom: 4px;">🎨 <span>Color </span>& Contrast</h2>
                
                <div style="display: flex; gap: 12px; align-items: center;">
                    <input type="color" id="color-input-picker" value="#4ade80" style="width: 50px; height: 50px; border: none; padding: 0; background: transparent; cursor: pointer; border-radius: 8px;">
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                        <input type="text" id="color-hex-val" value="#4ADE80" style="padding: 6px 10px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; font-size: 13px; font-family: monospace;">
                        <input type="text" id="color-rgb-val" style="padding: 6px 10px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; font-size: 13px; font-family: monospace;" readonly>
                    </div>
                    <button id="btn-color-dropper" class="button" style="padding: 8px 12px; height: 50px; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px;" title="Sample color from webpage">🧪 Dropper</button>
                </div>

                <div style="background: #09090b; border: 1px solid #27272a; border-radius: 6px; padding: 10px; display: flex; flex-direction: column; gap: 6px; margin-top: 4px;">
                    <h3 style="margin: 0; font-size: 13px; color: #a1a1aa;">Contrast Ratio Checker</h3>
                    <div style="display: flex; gap: 6px; font-size: 12px; align-items: center;">
                        <span>FG:</span>
                        <input type="text" id="contrast-fg" value="#FFFFFF" style="width: 60px; padding: 4px; background: #18181b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 4px; outline: none; font-family: monospace;">
                        <span>BG:</span>
                        <input type="text" id="contrast-bg" value="#4ADE80" style="width: 60px; padding: 4px; background: #18181b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 4px; outline: none; font-family: monospace;">
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 4px; border-top: 1px solid #27272a; padding-top: 6px;">
                        <span>Ratio: <strong id="contrast-ratio" style="color: var(--accent);">0.0</strong></span>
                        <span id="contrast-badge" style="padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 11px;">PASS</span>
                    </div>
                </div>
            </div>
        `;

        const picker = panel.querySelector("#color-input-picker");
        const hexVal = panel.querySelector("#color-hex-val");
        const rgbVal = panel.querySelector("#color-rgb-val");
        const cfg = panel.querySelector("#contrast-fg");
        const cbg = panel.querySelector("#contrast-bg");
        const ratioText = panel.querySelector("#contrast-ratio");
        const badge = panel.querySelector("#contrast-badge");
        const dropperBtn = panel.querySelector("#btn-color-dropper");

        if (!window.EyeDropper) {
            dropperBtn.style.display = "none";
        } else {
            dropperBtn.onclick = async () => {
                try {
                    const eyeDropper = new window.EyeDropper();
                    const result = await eyeDropper.open();
                    const colorHex = result.sRGBHex.toUpperCase();
                    hexVal.value = colorHex;
                    updateColor();
                    cbg.value = colorHex;
                    updateContrast();
                } catch (e) {
                    console.log("Dropper cancelled or failed:", e);
                }
            };
        }

        function hexToRgb(hex) {
            const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
            hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        }

        function getLuminance(r, g, b) {
            const a = [r, g, b].map((v) => {
                v /= 255;
                return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
            });
            return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
        }

        const updateColor = () => {
            const hex = hexVal.value;
            const rgb = hexToRgb(hex);
            if (rgb) {
                rgbVal.value = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
                picker.value = hex;
            }
        };

        const updateContrast = () => {
            const rgb1 = hexToRgb(cfg.value);
            const rgb2 = hexToRgb(cbg.value);
            if (rgb1 && rgb2) {
                const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
                const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
                const brightest = Math.max(l1, l2);
                const darkest = Math.min(l1, l2);
                const ratio = (brightest + 0.05) / (darkest + 0.05);

                ratioText.textContent = ratio.toFixed(2) + ":1";
                if (ratio >= 4.5) {
                    badge.textContent = "PASS (AAA)";
                    badge.style.background = "#10b981";
                    badge.style.color = "#000";
                } else if (ratio >= 3.0) {
                    badge.textContent = "PASS (AA)";
                    badge.style.background = "#fbbf24";
                    badge.style.color = "#000";
                } else {
                    badge.textContent = "FAIL";
                    badge.style.background = "#ef4444";
                    badge.style.color = "#000";
                }
            }
        };

        picker.oninput = () => {
            hexVal.value = picker.value.toUpperCase();
            updateColor();
            cbg.value = picker.value.toUpperCase();
            updateContrast();
        };

        hexVal.oninput = () => {
            updateColor();
            updateContrast();
        };

        cfg.oninput = updateContrast;
        cbg.oninput = updateContrast;

        updateColor();
        updateContrast();
    }

    // ========== 8. API TESTER PANEL ==========
    function showApiPanel() {
        let panel = qs("#api-panel");
        const center = document.querySelector("center") || document.body;
        if (!panel) {
            panel = document.createElement("div");
            panel.id = "api-panel";
            panel.style.width = "100%";
            center.appendChild(panel);
        }
        panel.style.display = "block";
        panel.innerHTML = `
            <div class="big-card" style="padding: 16px; display: flex; flex-direction: column; gap: 8px;">
                <h2 style="margin: 0; margin-bottom: 4px;">📦 <span>API Request Tester</span></h2>
                
                <div style="display: flex; gap: 6px;">
                    <select id="api-method" style="padding: 6px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; font-size: 13px; font-weight: bold;">
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                    </select>
                    <input type="text" id="api-url" placeholder="https://api.github.com" style="flex: 1; padding: 6px 10px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; font-size: 13px;">
                </div>

                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <span style="font-size: 10px; color: #a1a1aa;">Request Body (JSON, Optional):</span>
                    <textarea id="api-body" placeholder="{}" style="width: 100%; height: 60px; padding: 6px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; font-size: 11px; font-family: monospace; resize: none; box-sizing: border-box;"></textarea>
                </div>

                <button id="btn-api-send" class="button" style="padding: 8px; font-weight: bold;">Send Request</button>

                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #a1a1aa; margin-top: 4px;">
                    <span>Status: <strong id="api-status" style="color: #71717a;">-</strong></span>
                    <span>Time: <strong id="api-time" style="color: #71717a;">0ms</strong></span>
                </div>

                <textarea id="api-response" placeholder="Response body will appear here..." style="width: 100%; height: 160px; padding: 8px; background: #09090b; border: 1px solid #27272a; color: #a1a1aa; border-radius: 6px; outline: none; font-size: 11px; font-family: monospace; resize: vertical; box-sizing: border-box;" readonly></textarea>
            </div>
        `;

        const method = panel.querySelector("#api-method");
        const url = panel.querySelector("#api-url");
        const body = panel.querySelector("#api-body");
        const sendBtn = panel.querySelector("#btn-api-send");
        const statusText = panel.querySelector("#api-status");
        const timeText = panel.querySelector("#api-time");
        const responseText = panel.querySelector("#api-response");

        sendBtn.onclick = async () => {
            const requestUrl = url.value.trim();
            if (!requestUrl) return;

            responseText.value = "Sending request...";
            statusText.textContent = "PENDING";
            statusText.style.color = "#fbbf24";
            
            const start = Date.now();
            try {
                const options = {
                    method: method.value,
                    headers: { "Content-Type": "application/json" }
                };

                if (method.value !== "GET" && body.value.trim()) {
                    options.body = body.value;
                }

                const resp = await fetch(requestUrl, options);
                const elapsed = Date.now() - start;
                timeText.textContent = elapsed + "ms";
                
                statusText.textContent = `${resp.status} ${resp.statusText}`;
                if (resp.ok) statusText.style.color = "#10b981";
                else statusText.style.color = "#ef4444";

                const text = await resp.text();
                try {
                    responseText.value = JSON.stringify(JSON.parse(text), null, 2);
                } catch {
                    responseText.value = text;
                }
            } catch (err) {
                statusText.textContent = "FAILED";
                statusText.style.color = "#ef4444";
                responseText.value = "Request failed: " + err.message;
            }
        };
    }

    // ========== 9. PRIVACY REPORT PANEL ==========
    function showPrivacyPanel() {
        let panel = qs("#privacy-panel");
        const center = document.querySelector("center") || document.body;
        if (!panel) {
            panel = document.createElement("div");
            panel.id = "privacy-panel";
            panel.style.width = "100%";
            center.appendChild(panel);
        }
        panel.style.display = "block";
        panel.innerHTML = `
            <div class="big-card" style="padding: 16px; display: flex; flex-direction: column; gap: 8px;">
                <h2 style="margin: 0; margin-bottom: 4px;">🛡️ <span>Privacy Report</span></h2>
                
                <button id="btn-privacy-scan" class="button" style="padding: 8px; font-weight: bold; width: 100%;">Scan Current Tab</button>
                
                <div id="privacy-results" style="display: none; flex-direction: column; gap: 8px; margin-top: 10px;">
                    <div style="display: flex; justify-content: space-between; font-size: 13px; border-bottom: 1px solid #27272a; padding-bottom: 6px;">
                        <span>Cookies Found:</span>
                        <strong id="privacy-cookies-count" style="color: var(--accent);">0</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 13px; border-bottom: 1px solid #27272a; padding-bottom: 6px;">
                        <span>Scripts Loaded:</span>
                        <strong id="privacy-scripts-count" style="color: var(--accent);">0</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 13px; border-bottom: 1px solid #27272a; padding-bottom: 6px;">
                        <span>Fingerprinting Indicators:</span>
                        <strong id="privacy-fingerprint" style="color: var(--accent);">None detected</strong>
                    </div>
                    <div style="font-size: 11px; color: #a1a1aa; line-height: 1.4; margin-top: 4px;">
                        <strong>Tip:</strong> You can spoof your browser agent in the 🕵️ <span>UA panel to mitigate tracking footprint</span>.
                    </div>
                </div>
            </div>
        `;

        const scanBtn = panel.querySelector("#btn-privacy-scan");
        const resultsDiv = panel.querySelector("#privacy-results");
        const cookiesCount = panel.querySelector("#privacy-cookies-count");
        const scriptsCount = panel.querySelector("#privacy-scripts-count");
        const fingerprintText = panel.querySelector("#privacy-fingerprint");

        scanBtn.onclick = async () => {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab || !tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
                    alert("Cannot scan system or extension pages.");
                    return;
                }

                const res = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        return {
                            cookies: document.cookie ? document.cookie.split(";").length : 0,
                            scripts: document.querySelectorAll("script[src]").length,
                            canvasDetected: !!document.querySelector("canvas")
                        };
                    }
                });

                if (res && res[0] && res[0].result) {
                    const r = res[0].result;
                    cookiesCount.textContent = r.cookies;
                    scriptsCount.textContent = r.scripts;
                    fingerprintText.textContent = r.canvasDetected ? "Canvas rendering detected (High probability)" : "Low risk";
                    fingerprintText.style.color = r.canvasDetected ? "#fbbf24" : "#10b981";
                    resultsDiv.style.display = "flex";
                }
            } catch (err) {
                alert("Failed to scan tab: " + err.message);
            }
        };
    }

    // ========== 10. RSS READER PANEL ==========
    async function showRssPanel() {
        let panel = qs("#rss-panel");
        const center = document.querySelector("center") || document.body;
        if (!panel) {
            panel = document.createElement("div");
            panel.id = "rss-panel";
            panel.style.width = "100%";
            center.appendChild(panel);
        }
        panel.style.display = "block";
        panel.innerHTML = "";

        panel.innerHTML = `
            <div class="big-card" style="padding: 16px; display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <h2 style="margin: 0;">📡 <span>RSS Reader</span></h2>
                    <button id="btn-refresh-rss" class="button" style="font-size: 11px; padding: 4px 8px;">🔄 Refresh</button>
                </div>
                
                <div style="display: flex; gap: 6px;">
                    <input type="text" id="rss-input" placeholder="https://news.ycombinator.com/rss" style="flex: 1; padding: 6px 10px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; font-size: 13px;">
                    <button id="btn-add-rss" class="button" style="font-size: 12px; padding: 6px 12px;">Add</button>
                </div>

                <div id="rss-feeds-list" style="display: flex; flex-wrap: wrap; gap: 4px; max-height: 80px; overflow-y: auto;"></div>
                
                <hr style="border: 0; border-top: 1px solid #27272a; margin: 4px 0;">
                
                <div id="rss-articles" style="display: flex; flex-direction: column; gap: 8px; max-height: 350px; overflow-y: auto;"></div>
            </div>
        `;

        const feedInput = panel.querySelector("#rss-input");
        const addBtn = panel.querySelector("#btn-add-rss");
        const refreshBtn = panel.querySelector("#btn-refresh-rss");
        const feedsList = panel.querySelector("#rss-feeds-list");
        const articlesList = panel.querySelector("#rss-articles");

        const data = await chrome.storage.local.get(["bookmarkfs_rss_feeds", "bookmarkfs_rss_articles"]);
        let feeds = data.bookmarkfs_rss_feeds || [];
        let articles = data.bookmarkfs_rss_articles || {};

        const renderFeeds = () => {
            feedsList.innerHTML = "";
            if (feeds.length === 0) {
                feedsList.innerHTML = `<span style="font-size: 11px; color: #71717a;">No subscribed feeds.</span>`;
                return;
            }
            feeds.forEach((feed, idx) => {
                const badge = document.createElement("span");
                badge.className = "button";
                badge.style.fontSize = "10px";
                badge.style.padding = "2px 6px";
                badge.style.cursor = "pointer";
                badge.style.borderRadius = "4px";
                badge.style.display = "inline-flex";
                badge.style.alignItems = "center";
                badge.style.gap = "4px";
                badge.innerHTML = `${feed.title} <span class="rss-del" style="color: #ef4444; font-weight: bold; margin-left: 2px;">×</span>`;

                badge.onclick = (e) => {
                    if (e.target.classList.contains("rss-del")) {
                        e.stopPropagation();
                        feeds.splice(idx, 1);
                        delete articles[feed.url];
                        saveFeeds();
                        return;
                    }
                    renderArticles(feed.url);
                };

                feedsList.appendChild(badge);
            });
        };

        const saveFeeds = async () => {
            await chrome.storage.local.set({ bookmarkfs_rss_feeds: feeds, bookmarkfs_rss_articles: articles });
            renderFeeds();
            renderArticles();
        };

        const renderArticles = (specificUrl = null) => {
            articlesList.innerHTML = "";
            let list = [];
            if (specificUrl) {
                list = articles[specificUrl] || [];
            } else {
                Object.keys(articles).forEach(k => {
                    list = list.concat(articles[k]);
                });
            }

            if (list.length === 0) {
                articlesList.innerHTML = `<div style="text-align: center; color: #71717a; font-size: 12px; padding: 16px;">No articles loaded. Click Refresh or add a feed.</div>`;
                return;
            }

            // Render articles
            list.forEach(a => {
                const card = document.createElement("div");
                card.className = "history-card";
                card.style.padding = "8px 12px";
                card.style.borderRadius = "6px";
                card.style.fontSize = "12px";
                card.style.background = "#1c1917";
                card.style.border = "1px solid #2e2a24";

                card.innerHTML = `
                    <strong style="font-size: 13px;"><a href="${a.link}" target="_blank" style="color: var(--accent); text-decoration: none;">${a.title}</a></strong>
                    <div style="font-size: 10px; color: #71717a; margin-top: 2px;">${a.pubDate || "Recently"}</div>
                    <p style="margin: 4px 0 0 0; color: #a1a1aa; font-size: 11px; line-height: 1.3;">${a.desc || ""}</p>
                `;
                articlesList.appendChild(card);
            });
        };

        const refreshAllFeeds = async () => {
            if (refreshBtn) refreshBtn.textContent = "⌛ Loading...";
            
            for (const feed of feeds) {
                try {
                    const resp = await fetch(feed.url);
                    const text = await resp.text();
                    const itemRegex = /<item>([\s\S]*?)<\/item>|<entry>([\s\S]*?)<\/entry>/g;
                    let match;
                    const feedArticles = [];
                    let count = 0;
                    while ((match = itemRegex.exec(text)) !== null && count < 25) {
                        const content = match[1] || match[2] || '';
                        
                        const titleMatch = content.match(/<title[^>]*>([\s\S]*?)<\/title>/);
                        let title = titleMatch ? titleMatch[1] : '';
                        if (title.startsWith('<![CDATA[')) title = title.substring(9, title.length - 3);
                        title = title.replace(/<[^>]*>/g, '').trim();
                        
                        const linkMatch = content.match(/<link[^>]*href=["']([^"']+)["']|<link[^>]*>([\s\S]*?)<\/link>/);
                        const link = linkMatch ? (linkMatch[1] || linkMatch[2] || '').trim() : '';
                        
                        const descMatch = content.match(/<description[^>]*>([\s\S]*?)<\/description>|<summary[^>]*>([\s\S]*?)<\/summary>|<content[^>]*>([\s\S]*?)<\/content>/);
                        let desc = descMatch ? (descMatch[1] || descMatch[2] || descMatch[3] || '') : '';
                        if (desc.startsWith('<![CDATA[')) desc = desc.substring(9, desc.length - 3);
                        desc = desc.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').substring(0, 200).trim();
                        
                        const dateMatch = content.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>|<published[^>]*>([\s\S]*?)<\/published>|<updated[^>]*>([\s\S]*?)<\/updated>/);
                        const pubDate = dateMatch ? (dateMatch[1] || dateMatch[2] || dateMatch[3] || '') : '';
                        
                        feedArticles.push({ title, link, desc, pubDate });
                        count++;
                    }
                    articles[feed.url] = feedArticles;
                } catch (e) {
                    console.warn('RSS fetch failed in foreground for', feed.url, e);
                }
            }
            
            await chrome.storage.local.set({ bookmarkfs_rss_articles: articles });
            if (refreshBtn) refreshBtn.textContent = "🔄 Refresh";
            renderArticles();
        };

        addBtn.onclick = async () => {
            const url = feedInput.value.trim();
            if (!url) return;
            try {
                addBtn.textContent = "...";
                const resp = await fetch(url);
                const text = await resp.text();
                // Extract feed title
                const titleMatch = text.match(/<title[^>]*>([\s\S]*?)<\/title>/);
                let title = titleMatch ? titleMatch[1] : "Feed";
                if (title.startsWith("<![CDATA[")) title = title.substring(9, title.length - 3);
                title = title.substring(0, 15).replace(/<[^>]*>/g, '').trim();

                feeds.push({ title, url });
                feedInput.value = "";
                
                await saveFeeds();
                await refreshAllFeeds();
            } catch (e) {
                alert("Failed to subscribe to RSS: " + e.message);
            } finally {
                addBtn.textContent = "Add";
            }
        };

        if (refreshBtn) {
            refreshBtn.onclick = refreshAllFeeds;
        }

        renderFeeds();
        renderArticles();
        
        // Auto-fetch if articles are completely empty
        if (feeds.length > 0 && Object.keys(articles).length === 0) {
            refreshAllFeeds();
        }
    }

    // ========== 11. SITE TIME TRACKER ==========
    async function showTimeTrackerPanel() {
        let panel = qs("#timetracker-panel");
        const center = document.querySelector("center") || document.body;
        if (!panel) {
            panel = document.createElement("div");
            panel.id = "timetracker-panel";
            panel.style.width = "100%";
            center.appendChild(panel);
        }
        panel.style.display = "block";
        panel.innerHTML = "";

        const todayStr = new Date().toISOString().split('T')[0];
        const data = await chrome.storage.local.get("bookmarkfs_timetracker");
        const tracker = data.bookmarkfs_timetracker || {};
        const todayData = tracker[todayStr] || {};

        let sorted = Object.keys(todayData).map(k => ({ domain: k, seconds: todayData[k] }))
            .sort((a, b) => b.seconds - a.seconds);

        panel.innerHTML = `
            <div class="big-card" style="padding: 16px; display: flex; flex-direction: column; gap: 10px;">
                <h2 style="margin: 0; margin-bottom: 4px;">📊 <span>Active Time Tracker</span></h2>
                <div style="font-size: 11px; color: #a1a1aa; margin-bottom: 4px;">Top domains visited today:</div>
                <div id="timetracker-list" style="display: flex; flex-direction: column; gap: 8px;"></div>
            </div>
        `;

        const listDiv = panel.querySelector("#timetracker-list");
        if (sorted.length === 0) {
            listDiv.innerHTML = `<div style="text-align: center; color: #71717a; font-size: 12px; padding: 16px;">No tracking data recorded for today yet.</div>`;
            return;
        }

        const maxSeconds = sorted[0].seconds;
        sorted.forEach(item => {
            const row = document.createElement("div");
            row.style.display = "flex";
            row.style.flexDirection = "column";
            row.style.gap = "2px";

            const percent = (item.seconds / maxSeconds) * 100;
            const minutes = Math.ceil(item.seconds / 60);

            row.innerHTML = `
                <div style="display: flex; justify-content: space-between; font-size: 12px;">
                    <span style="color: #f4f4f5; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px;">${item.domain}</span>
                    <strong style="color: var(--accent);">${minutes}m</strong>
                </div>
                <div style="width: 100%; height: 6px; background: #27272a; border-radius: 3px; overflow: hidden;">
                    <div style="width: ${percent}%; height: 100%; background: var(--accent); border-radius: 3px;"></div>
                </div>
            `;
            listDiv.appendChild(row);
        });
    }

    async function show2FAPanel() {
        let panel = qs("#twofa-panel");
        const center = document.querySelector("center") || document.body;
        if (!panel) {
            panel = document.createElement("div");
            panel.id = "twofa-panel";
            panel.style.width = "100%";
            panel.style.maxWidth = "980px";
            panel.style.margin = "20px auto";
            panel.style.boxSizing = "border-box";
            panel.style.padding = "20px";
            panel.style.background = "var(--bg-card)";
            panel.style.border = "1px solid var(--border)";
            panel.style.borderRadius = "16px";
            panel.style.boxShadow = "var(--shadow)";
            
            panel.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:12px; margin-bottom:20px;">
                    <h2 style="margin:0; color:var(--accent); display:flex; align-items:center; gap:8px;">🔐 <span>2FA Authenticator</span></h2>
                    <button id="btn-add-2fa" class="button" style="padding:6px 16px;">+ Add Profile</button>
                </div>
                <div id="twofa-profile-list" style="display:flex; flex-direction:column; gap:12px;"></div>
            `;
            center.appendChild(panel);

            qs("#btn-add-2fa").onclick = async () => {
                showAdd2FAParametersModal(async (result) => {
                    if (!result) return;
                    try {
                        await generateTOTP(result.secret);
                        const profiles = await load2FAProfiles();
                        profiles.push({
                            label: result.label,
                            secret: result.secret,
                            recoveryCodes: result.recoveryCodes || "",
                            url: result.url || ""
                        });
                        await save2FAProfiles(profiles);
                        await render2FAProfilesList();
                    } catch (err) {
                        alert("Invalid Base32 secret key: " + err.message);
                    }
                });
            };
        }

        panel.style.display = "block";
        await render2FAProfilesList();
        
        stopAllScannerMedia();
        twofaInterval = setInterval(async () => {
            await updateTOTPCodes();
        }, 1000);
    }

    async function render2FAProfilesList() {
        const listContainer = qs("#twofa-profile-list");
        if (!listContainer) return;
        listContainer.innerHTML = "";

        const profiles = await load2FAProfiles();
        if (profiles.length === 0) {
            listContainer.innerHTML = `<div style="text-align:center; color:var(--text-secondary); padding:40px 0;">No 2FA profiles found. Click "+ Add Profile" to get started!</div>`;
            return;
        }

        for (let i = 0; i < profiles.length; i++) {
            const profile = profiles[i];
            const row = document.createElement("div");
            row.className = "twofa-profile-card";

            const info = document.createElement("div");
            info.className = "twofa-card-info";

            const labelEl = document.createElement("div");
            labelEl.className = "twofa-card-label";
            const parts = profile.label.split(":");
            if (parts.length > 1) {
                const service = parts[0].trim();
                const username = parts.slice(1).join(":").trim();
                labelEl.innerHTML = `<span style="color: var(--accent); font-weight: 700;">${service}</span> <span style="color: var(--text-secondary); font-size: 13px; font-weight: normal;">(${username})</span>`;
            } else {
                labelEl.textContent = profile.label;
            }
            info.appendChild(labelEl);

            if (profile.url) {
                const urlEl = document.createElement("div");
                urlEl.className = "twofa-card-url";
                urlEl.style.fontSize = "12px";
                urlEl.style.marginTop = "2px";
                let displayUrl = profile.url;
                let hrefUrl = profile.url;
                if (!/^https?:\/\//i.test(hrefUrl)) {
                    hrefUrl = "https://" + hrefUrl;
                }
                urlEl.innerHTML = `🔗 <a href="${hrefUrl}" target="_blank" style="color: var(--text-secondary); text-decoration: underline; word-break: break-all;">${displayUrl}</a>`;
                info.appendChild(urlEl);
            }

            const otpArea = document.createElement("div");
            otpArea.className = "twofa-card-otp";

            const codeEl = document.createElement("div");
            codeEl.className = "totp-code-display twofa-card-code";
            codeEl.dataset.secret = profile.secret;
            codeEl.textContent = "------";
            codeEl.title = "Click to copy";
            
            codeEl.onclick = () => {
                const cleanCode = codeEl.textContent.replace(/\s+/g, "");
                if (cleanCode === "Copied!") return;
                
                navigator.clipboard.writeText(cleanCode);
                
                codeEl.textContent = "Copied!";
                codeEl.style.color = "#10b981"; // green
                codeEl.dataset.copied = "true";
                
                // Bounce scale animation
                codeEl.style.transform = "scale(1.08)";
                setTimeout(() => { codeEl.style.transform = ""; }, 150);
                
                setTimeout(() => {
                    codeEl.dataset.copied = "";
                    codeEl.style.color = "";
                    updateTOTPCodes(); // restore immediately
                }, 1200);
            };

            const timerEl = document.createElement("div");
            timerEl.className = "totp-timer-display twofa-card-timer";
            timerEl.textContent = "--";

            otpArea.appendChild(codeEl);
            otpArea.appendChild(timerEl);
            
            const actionsRow = document.createElement("div");
            actionsRow.className = "twofa-card-actions";

            const editBtn = document.createElement("button");
            editBtn.className = "button";
            editBtn.textContent = "📝 Edit";
            editBtn.style.padding = "4px 10px";
            editBtn.style.fontSize = "12px";
            editBtn.onclick = () => {
                showAdd2FAParametersModal(async (result) => {
                    if (!result) return;
                    try {
                        await generateTOTP(result.secret);
                        const current = await load2FAProfiles();
                        current[i] = {
                            label: result.label,
                            secret: result.secret,
                            recoveryCodes: result.recoveryCodes || "",
                            url: result.url || ""
                        };
                        await save2FAProfiles(current);
                        await render2FAProfilesList();
                    } catch (err) {
                        alert("Invalid Base32 secret key: " + err.message);
                    }
                }, profile);
            };
            actionsRow.appendChild(editBtn);

            const exportQrBtn = document.createElement("button");
            exportQrBtn.className = "button";
            exportQrBtn.textContent = "📱 Export QR";
            exportQrBtn.style.padding = "4px 10px";
            exportQrBtn.style.fontSize = "12px";
            exportQrBtn.onclick = async () => {
                const label = encodeURIComponent(profile.label);
                const secret = encodeURIComponent(profile.secret);
                let issuer = "";
                if (profile.label.includes(":")) {
                    issuer = profile.label.split(":")[0].trim();
                } else {
                    issuer = profile.label.trim();
                }
                const otpauthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
                try {
                    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { width: 280, margin: 2 });
                    showQRModal(profile.label, qrDataUrl, otpauthUrl);
                } catch (err) {
                    alert("Failed to generate QR Code: " + err.message);
                }
            };
            actionsRow.appendChild(exportQrBtn);
            
            let recoveryBtn = null;
            let recoverySection = null;
            if (profile.recoveryCodes) {
                recoveryBtn = document.createElement("button");
                recoveryBtn.className = "button";
                recoveryBtn.textContent = "🔑 Recovery Codes";
                recoveryBtn.style.padding = "4px 10px";
                recoveryBtn.style.fontSize = "12px";
                actionsRow.appendChild(recoveryBtn);

                recoverySection = document.createElement("div");
                recoverySection.style.display = "none";
                recoverySection.style.width = "100%";
                recoverySection.style.padding = "12px";
                recoverySection.style.background = "#09090b";
                recoverySection.style.border = "1px solid #27272a";
                recoverySection.style.borderRadius = "6px";
                recoverySection.style.marginTop = "8px";
                recoverySection.style.boxSizing = "border-box";
                
                const parsedCodes = parseRecoveryCodesString(profile.recoveryCodes);
                
                const recTitle = document.createElement("div");
                recTitle.style.display = "flex";
                recTitle.style.justifyContent = "space-between";
                recTitle.style.alignItems = "center";
                recTitle.style.marginBottom = "8px";
                recTitle.style.gap = "8px";
                recTitle.style.flexWrap = "wrap";
                
                const titleText = document.createElement("span");
                titleText.textContent = `Recovery Codes (${parsedCodes.length} remaining)`;
                titleText.style.fontSize = "12px";
                titleText.style.fontWeight = "600";
                titleText.style.color = "var(--text-secondary)";
                
                const recControls = document.createElement("div");
                recControls.style.display = "flex";
                recControls.style.gap = "8px";
                
                const useCodeBtn = document.createElement("button");
                useCodeBtn.className = "button";
                useCodeBtn.textContent = "🎟️ Use One Code";
                useCodeBtn.style.padding = "2px 8px";
                useCodeBtn.style.fontSize = "11px";
                useCodeBtn.style.borderColor = "var(--accent)";
                useCodeBtn.style.color = "var(--accent)";
                useCodeBtn.disabled = parsedCodes.length === 0;
                useCodeBtn.onclick = async () => {
                    const codesList = parseRecoveryCodesString(profile.recoveryCodes);
                    if (codesList.length === 0) {
                        alert("No recovery codes remaining.");
                        return;
                    }
                    const consumed = codesList[0];
                    await navigator.clipboard.writeText(consumed);
                    
                    let newStr = profile.recoveryCodes;
                    const escaped = consumed.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const regex = new RegExp(`\\b${escaped}\\b\\s*[,;\\-\\n\\r]*`);
                    newStr = newStr.replace(regex, "").trim();
                    
                    const current = await load2FAProfiles();
                    current[i].recoveryCodes = newStr;
                    await save2FAProfiles(current);
                    await render2FAProfilesList();
                    
                    alert(`Recovery code "${consumed}" copied to clipboard and removed from your list.`);
                };
                
                const recCopyBtn = document.createElement("button");
                recCopyBtn.className = "button";
                recCopyBtn.textContent = "📋 Copy Codes";
                recCopyBtn.style.padding = "2px 8px";
                recCopyBtn.style.fontSize = "11px";
                recCopyBtn.onclick = () => {
                    navigator.clipboard.writeText(profile.recoveryCodes);
                    recCopyBtn.textContent = "✓ Copied";
                    setTimeout(() => { recCopyBtn.textContent = "📋 Copy Codes"; }, 1500);
                };
                
                recControls.appendChild(useCodeBtn);
                recControls.appendChild(recCopyBtn);
                
                recTitle.appendChild(titleText);
                recTitle.appendChild(recControls);
                
                const codePre = document.createElement("pre");
                codePre.textContent = profile.recoveryCodes;
                codePre.style.margin = "0";
                codePre.style.fontSize = "12px";
                codePre.style.fontFamily = "monospace";
                codePre.style.whiteSpace = "pre-wrap";
                codePre.style.color = "#a1a1aa";
                
                recoverySection.appendChild(recTitle);
                recoverySection.appendChild(codePre);
                
                recoveryBtn.onclick = () => {
                    const isHidden = recoverySection.style.display === "none";
                    recoverySection.style.display = isHidden ? "block" : "none";
                    recoveryBtn.style.borderColor = isHidden ? "var(--accent)" : "";
                };
            }

            const delBtn = document.createElement("button");
            delBtn.className = "button";
            delBtn.textContent = "🗑 Delete";
            delBtn.style.padding = "4px 10px";
            delBtn.style.fontSize = "12px";
            delBtn.style.borderColor = "#ef4444";
            delBtn.style.color = "#ef4444";
            delBtn.onclick = async () => {
                if (!confirm(`Are you sure you want to delete profile "${profile.label}"?`)) return;
                const current = await load2FAProfiles();
                const next = current.filter((p, idx) => idx !== i);
                try {
                    await save2FAProfiles(next);
                    await render2FAProfilesList();
                } catch(e) {
                    alert("Delete failed: " + e.message);
                }
            };
            actionsRow.appendChild(delBtn);

            row.appendChild(info);
            row.appendChild(otpArea);
            row.appendChild(actionsRow);
            if (recoverySection) {
                row.appendChild(recoverySection);
            }
            listContainer.appendChild(row);
        }

        await updateTOTPCodes();
    }

    async function updateTOTPCodes() {
        const codes = document.querySelectorAll(".totp-code-display");
        for (const codeEl of codes) {
            if (codeEl.dataset.copied === "true") continue;
            const secret = codeEl.dataset.secret;
            const timerEl = codeEl.nextElementSibling;
            try {
                const totp = await generateTOTP(secret);
                const fmtCode = totp.code.slice(0, 3) + " " + totp.code.slice(3);
                codeEl.textContent = fmtCode;
                timerEl.textContent = `${totp.remaining}s`;
                if (totp.remaining < 6) {
                    timerEl.style.color = "#ef4444";
                } else {
                    timerEl.style.color = "var(--text-secondary)";
                }
            } catch (e) {
                codeEl.textContent = "ERROR";
            }
        }
    }

    async function handleBulkDownload() {
        const checked = [...document.querySelectorAll(".row-select:checked")];
        const filesToPack = [];
        
        const files = await listFiles();
        for (const cb of checked) {
            const isFile = cb.dataset.type === "file";
            const id = cb.dataset.id;
            if (isFile) {
                const f = files.find(x => x.handle.id === id);
                if (f) filesToPack.push(f);
            } else {
                const folderPath = id;
                const prefix = folderPath + "/";
                const matches = files.filter(x => x.handle.title === folderPath || x.handle.title.startsWith(prefix));
                filesToPack.push(...matches);
            }
        }

        const uniqueFiles = [...new Set(filesToPack)];
        if (uniqueFiles.length === 0) {
            alert("No files selected.");
            return;
        }

        const zipData = {};
        const bulkBar = qs("#bulk-bar");
        const countSpan = qs("#bulk-count");
        countSpan.textContent = `Downloading ${uniqueFiles.length} files...`;

        try {
            for (let i = 0; i < uniqueFiles.length; i++) {
                const f = uniqueFiles[i];
                countSpan.textContent = `Processing (${i + 1}/${uniqueFiles.length}): ${f.handle.title}`;
                const raw = await f.read();
                const meta = await f.readMeta();
                const reconstructed = await reconstructBytesFromSerialized(raw, meta);
                
                const pathParts = f.handle.title.split("/");
                const originalFileName = meta.name || pathParts[pathParts.length - 1];
                pathParts[pathParts.length - 1] = originalFileName;
                const zipPath = pathParts.join("/");
                
                zipData[zipPath] = reconstructed.bytes;
            }

            countSpan.textContent = "Compressing ZIP archive...";
            const zipped = zipSync(zipData);
            const blob = new Blob([zipped], { type: "application/zip" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `bookmarkfs-bundle-${new Date().toISOString().slice(0, 10)}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            
            clearBulkSelection();
        } catch (err) {
            alert("Bulk download failed: " + err.message);
        } finally {
            updateBulkBar();
        }
    }

    async function handleBulkDelete() {
        const checked = [...document.querySelectorAll(".row-select:checked")];
        if (!confirm(`Are you sure you want to delete the ${checked.length} selected items?`)) return;

        const files = await listFiles();
        for (const cb of checked) {
            const isFile = cb.dataset.type === "file";
            const id = cb.dataset.id;
            if (isFile) {
                const f = files.find(x => x.handle.id === id);
                if (f) {
                    await f.delete();
                    removeFileFromCache(f.handle.id);
                }
            } else {
                const folderPath = id;
                const prefix = folderPath + "/";
                const matches = files.filter(x => x.handle.title === folderPath || x.handle.title.startsWith(prefix));
                for (const f of matches) {
                    await f.delete();
                    removeFileFromCache(f.handle.id);
                }
            }
        }
        clearBulkSelection();
        await loadFilesToTable(false);
    }

    async function handleBulkMove() {
        const checked = [...document.querySelectorAll(".row-select:checked")];
        const nextFolder = prompt("Move selected items to folder path (optional):", currentPath);
        if (nextFolder === null) return;
        const targetFolder = normalizeVirtualPath(nextFolder);

        const files = await listFiles();
        for (const cb of checked) {
            const isFile = cb.dataset.type === "file";
            const id = cb.dataset.id;
            if (isFile) {
                const f = files.find(x => x.handle.id === id);
                if (f) {
                    const nameParts = splitVirtualName(f.handle.title);
                    const newName = joinVirtualName(targetFolder, nameParts.base);
                    await f.rename(newName);
                    renameFileInCache(f.handle.id, newName);
                }
            } else {
                const folderPath = id;
                const prefix = folderPath + "/";
                const matches = files.filter(x => x.handle.title === folderPath || x.handle.title.startsWith(prefix));
                for (const f of matches) {
                    const relativePath = f.handle.title.slice(folderPath.length);
                    const newName = targetFolder ? `${targetFolder}/${folderPath.split("/").pop()}${relativePath}` : `${folderPath.split("/").pop()}${relativePath}`;
                    const normalized = normalizeVirtualPath(newName);
                    await f.rename(normalized);
                    renameFileInCache(f.handle.id, normalized);
                }
            }
        }
        clearBulkSelection();
        await loadFilesToTable(false);
    }

    function updateBulkBar() {
        const checked = document.querySelectorAll(".row-select:checked");
        const bulkBar = qs("#bulk-bar");
        const countSpan = qs("#bulk-count");
        if (bulkBar && countSpan) {
            if (checked.length > 0) {
                bulkBar.style.display = "flex";
                countSpan.textContent = `${checked.length} item(s) selected`;
            } else {
                bulkBar.style.display = "none";
                const selectAll = qs("#bulk-select-all");
                if (selectAll) selectAll.checked = false;
            }
        }
    }

    function clearBulkSelection() {
        const cbs = document.querySelectorAll(".row-select");
        cbs.forEach(cb => cb.checked = false);
        const selectAll = qs("#bulk-select-all");
        if (selectAll) selectAll.checked = false;
        updateBulkBar();
    }

    let activePanel = "files";
    let currentBookmarkFolderId = "1"; // Bookmarks Bar default
    let bookmarkPathHistory = []; // to keep track of folder path history (e.g. [{id: "1", title: "Bookmarks Bar"}])

    function updateBookmarksPathBar() {
        const pathNode = qs("#bookmarks-path-bar");
        if (!pathNode) return;
        const pathStr = bookmarkPathHistory.map(h => h.title).join(" / ") || "Root";
        pathNode.textContent = `Path: / ${pathStr}`;
    }

    async function loadMostVisitedToPanel() {
        const table = qs("#bookmarks-table");
        if (!table) return;
        table.innerHTML = "";

        const currentMode = localStorage.getItem("bookmarkfs_view_mode") || "list";
        if (currentMode === "grid") {
            table.classList.add("grid-mode");
        } else {
            table.classList.remove("grid-mode");
        }

        const thead = document.createElement("thead");
        thead.innerHTML = `
            <tr>
                <th>Type</th>
                <th>Name</th>
                <th>URL</th>
                <th>Actions</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        table.appendChild(tbody);

        try {
            chrome.topSites.get(sites => {
                sites.slice(0, 20).forEach(site => {
                    const tr = document.createElement("tr");
                    tr.style.borderBottom = "1px solid #27272a";

                    const tdType = document.createElement("td");
                    tdType.style.textAlign = "center";
                    const typeIndicator = document.createElement("span");
                    typeIndicator.textContent = "🔥";
                    tdType.appendChild(typeIndicator);
                    tr.appendChild(tdType);

                    const tdPreview = document.createElement("td");
                    const icon = document.createElement("img");
                    icon.style.width = "48px";
                    icon.style.height = "48px";
                    icon.style.objectFit = "cover";
                    try {
                        icon.src = `https://www.google.com/s2/favicons?sz=64&domain=${new URL(site.url).hostname}`;
                    } catch {
                        icon.src = placeholderDataUrl("LINK");
                    }
                    tdPreview.appendChild(icon);
                    tr.appendChild(tdPreview);

                    const tdName = document.createElement("td");
                    const link = document.createElement("a");
                    link.href = site.url;
                    link.target = "_blank";
                    link.textContent = site.title || site.url;
                    link.style.color = "var(--accent)";
                    link.style.textDecoration = "none";
                    link.style.fontWeight = "600";
                    tdName.appendChild(link);
                    tr.appendChild(tdName);

                    const tdUrl = document.createElement("td");
                    tdUrl.textContent = site.url;
                    tdUrl.style.fontSize = "11px";
                    tdUrl.style.color = "var(--text-secondary)";
                    tr.appendChild(tdUrl);

                    const tdEmpty = document.createElement("td");
                    tdEmpty.textContent = "-";
                    tdEmpty.className = "cell-empty";
                    tr.appendChild(tdEmpty);

                    const tdAction = document.createElement("td");
                    tdAction.textContent = "-";
                    tr.appendChild(tdAction);

                    for (let i = 0; i < 3; i++) {
                        const td = document.createElement("td");
                        td.textContent = "-";
                        td.className = "cell-empty";
                        tr.appendChild(td);
                    }

                    tbody.appendChild(tr);
                });
                applyGridSize();
            });
        } catch (err) {
            console.error("Failed to load top sites:", err);
        }
    }

    async function loadRecentlyAddedToPanel() {
        const table = qs("#bookmarks-table");
        if (!table) return;
        table.innerHTML = "";

        const currentMode = localStorage.getItem("bookmarkfs_view_mode") || "list";
        if (currentMode === "grid") {
            table.classList.add("grid-mode");
        } else {
            table.classList.remove("grid-mode");
        }

        const thead = document.createElement("thead");
        thead.innerHTML = `
            <tr>
                <th>Type</th>
                <th>Name</th>
                <th>URL</th>
                <th>Actions</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        table.appendChild(tbody);

        try {
            const recent = await chrome.bookmarks.getRecent(20);
            recent.forEach(node => {
                if (!node.url) return;

                const tr = document.createElement("tr");
                tr.style.borderBottom = "1px solid #27272a";

                const tdType = document.createElement("td");
                tdType.style.textAlign = "center";
                const typeIndicator = document.createElement("span");
                typeIndicator.textContent = "🕒";
                tdType.appendChild(typeIndicator);
                tr.appendChild(tdType);

                const tdPreview = document.createElement("td");
                const icon = document.createElement("img");
                icon.style.width = "48px";
                icon.style.height = "48px";
                icon.style.objectFit = "cover";
                try {
                    icon.src = `https://www.google.com/s2/favicons?sz=64&domain=${new URL(node.url).hostname}`;
                } catch {
                    icon.src = placeholderDataUrl("LINK");
                }
                tdPreview.appendChild(icon);
                tr.appendChild(tdPreview);

                const tdName = document.createElement("td");
                const link = document.createElement("a");
                link.href = node.url;
                link.target = "_blank";
                link.textContent = node.title || node.url;
                link.style.color = "var(--accent)";
                link.style.textDecoration = "none";
                link.style.fontWeight = "600";
                tdName.appendChild(link);
                tr.appendChild(tdName);

                const tdUrl = document.createElement("td");
                tdUrl.textContent = node.url;
                tdUrl.style.fontSize = "11px";
                tdUrl.style.color = "var(--text-secondary)";
                tr.appendChild(tdUrl);

                const tdEmpty = document.createElement("td");
                tdEmpty.textContent = "-";
                tdEmpty.className = "cell-empty";
                tr.appendChild(tdEmpty);

                const tdAction = document.createElement("td");
                const btnDel = document.createElement("button");
                btnDel.className = "button icon-button";
                btnDel.innerHTML = "🗑️";
                btnDel.title = "Delete";
                btnDel.onclick = async () => {
                    if (!confirm(`Delete recent bookmark "${node.title}"?`)) return;
                    tr.style.opacity = "0";
                    tr.style.transform = "translateX(-20px)";
                    setTimeout(async () => {
                        await chrome.bookmarks.remove(node.id);
                        await loadRecentlyAddedToPanel();
                    }, 300);
                };
                tdAction.appendChild(btnDel);
                tr.appendChild(tdAction);

                for (let i = 0; i < 3; i++) {
                    const td = document.createElement("td");
                    td.textContent = "-";
                    td.className = "cell-empty";
                    tr.appendChild(td);
                }

                tbody.appendChild(tr);
            });
            applyGridSize();
        } catch (err) {
            console.error("Failed to load recent bookmarks:", err);
        }
    }

    async function loadBookmarksToPanel() {
        const table = qs("#bookmarks-table");
        if (!table) return;
        table.innerHTML = "";

        const currentMode = localStorage.getItem("bookmarkfs_view_mode") || "list";
        if (currentMode === "grid") {
            table.classList.add("grid-mode");
        } else {
            table.classList.remove("grid-mode");
        }

        const thead = document.createElement("thead");
        thead.innerHTML = `
            <tr>
                <th>Type</th>
                <th>Name</th>
                <th>URL</th>
                <th>Actions</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        table.appendChild(tbody);

        try {
            const children = await chrome.bookmarks.getChildren(currentBookmarkFolderId);
            const sortType = localStorage.getItem("bookmarkfs_bookmarks_sort") || "default";
            if (sortType === "name") {
                children.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
            } else if (sortType === "date") {
                children.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
            } else if (sortType === "url") {
                children.sort((a, b) => (a.url || "").localeCompare(b.url || ""));
            }
            updateBookmarksPathBar();

            children.forEach(node => {
                const tr = document.createElement("tr");
                tr.style.borderBottom = "1px solid #27272a";

                const tdType = document.createElement("td");
                tdType.style.textAlign = "center";
                const typeIndicator = document.createElement("span");
                typeIndicator.textContent = node.url ? "🔗" : "📁";
                tdType.appendChild(typeIndicator);
                tr.appendChild(tdType);

                const tdPreview = document.createElement("td");
                const icon = document.createElement("img");
                icon.style.width = "48px";
                icon.style.height = "48px";
                icon.style.objectFit = "cover";
                if (node.url) {
                    try {
                        icon.src = `https://www.google.com/s2/favicons?sz=64&domain=${new URL(node.url).hostname}`;
                    } catch {
                        icon.src = placeholderDataUrl("LINK");
                    }
                } else {
                    icon.src = placeholderDataUrl("DIR", "#2b4d2b");
                }
                tdPreview.appendChild(icon);
                tr.appendChild(tdPreview);

                const tdName = document.createElement("td");
                if (node.url) {
                    const link = document.createElement("a");
                    link.href = node.url;
                    link.target = "_blank";
                    link.textContent = node.title || node.url;
                    link.style.color = "var(--accent)";
                    link.style.textDecoration = "none";
                    link.style.fontWeight = "600";
                    tdName.appendChild(link);
                } else {
                    const btn = document.createElement("button");
                    btn.className = "button";
                    btn.textContent = `[Folder] ${node.title}`;
                    btn.onclick = async () => {
                        bookmarkPathHistory.push({ id: currentBookmarkFolderId, title: node.title || "Folder" });
                        currentBookmarkFolderId = node.id;
                        await loadBookmarksToPanel();
                    };
                    tdName.appendChild(btn);
                }
                tr.appendChild(tdName);

                const tdUrl = document.createElement("td");
                tdUrl.textContent = node.url || "(Folder)";
                tdUrl.style.fontSize = "11px";
                tdUrl.style.color = "var(--text-secondary)";
                tr.appendChild(tdUrl);

                const tdEmpty = document.createElement("td");
                tdEmpty.textContent = "-";
                tdEmpty.className = "cell-empty";
                tr.appendChild(tdEmpty);

                const tdAction = document.createElement("td");
                
                const btnEdit = document.createElement("button");
                btnEdit.className = "button icon-button";
                btnEdit.innerHTML = "✏️";
                btnEdit.title = "Rename/Edit";
                btnEdit.onclick = async () => {
                    if (node.url) {
                        const newTitle = prompt("Edit Bookmark Title:", node.title);
                        const newUrl = prompt("Edit Bookmark URL:", node.url);
                        if (newTitle !== null && newUrl !== null) {
                            await chrome.bookmarks.update(node.id, { title: newTitle, url: newUrl });
                            await loadBookmarksToPanel();
                        }
                    } else {
                        const newTitle = prompt("Edit Folder Title:", node.title);
                        if (newTitle !== null) {
                            await chrome.bookmarks.update(node.id, { title: newTitle });
                            await loadBookmarksToPanel();
                        }
                    }
                };
                tdAction.appendChild(btnEdit);

                const btnDel = document.createElement("button");
                btnDel.className = "button icon-button";
                btnDel.innerHTML = "🗑️";
                btnDel.title = "Delete";
                btnDel.style.marginLeft = "4px";
                btnDel.onclick = async () => {
                    if (!confirm(`Delete "${node.title}"?`)) return;
                    tr.style.opacity = "0";
                    tr.style.transform = "translateX(-20px)";
                    setTimeout(async () => {
                        if (node.url) {
                            await chrome.bookmarks.remove(node.id);
                        } else {
                            await chrome.bookmarks.removeTree(node.id);
                        }
                        await loadBookmarksToPanel();
                    }, 300);
                };
                tdAction.appendChild(btnDel);

                tr.appendChild(tdAction);

                for (let i = 0; i < 3; i++) {
                    const td = document.createElement("td");
                    td.textContent = "-";
                    td.className = "cell-empty";
                    tr.appendChild(td);
                }

                tbody.appendChild(tr);
            });
            applyGridSize();
        } catch (err) {
            console.error("Failed to load bookmarks:", err);
        }
    }

    function applyGridSize() {
        const size = localStorage.getItem("bookmarkfs_grid_size") || "medium";
        const table1 = qs("#table");
        const table2 = qs("#bookmarks-table");
        for (const t of [table1, table2]) {
            if (!t) continue;
            t.classList.remove("grid-small", "grid-medium", "grid-large");
            t.classList.add(`grid-${size}`);
        }
    }

    async function loadSessionsToPanel() {
        const container = qs("#sessions-panel-view");
        if (!container) return;
        container.innerHTML = "";

        const flexWrapper = document.createElement("div");
        flexWrapper.style.display = "flex";
        flexWrapper.style.flexDirection = "column";
        flexWrapper.style.gap = "20px";
        flexWrapper.style.width = "100%";
        flexWrapper.style.maxWidth = "980px";
        flexWrapper.style.margin = "0 auto";
        container.appendChild(flexWrapper);

        const activeCard = document.createElement("div");
        activeCard.className = "glass-panel";
        activeCard.style.padding = "16px";
        activeCard.style.borderRadius = "12px";
        activeCard.style.background = "#18181b";
        activeCard.style.border = "1px solid #27272a";
        activeCard.style.textAlign = "left";

        const activeTitle = document.createElement("h3");
        activeTitle.style.margin = "0 0 12px 0";
        activeTitle.style.color = "#02ff88";
        activeTitle.textContent = "💻 Active Browser Window Workspace";
        activeCard.appendChild(activeTitle);

        const tabs = await chrome.tabs.query({ currentWindow: true });
        const tabsList = document.createElement("div");
        tabsList.style.maxHeight = "150px";
        tabsList.style.overflowY = "auto";
        tabsList.style.display = "flex";
        tabsList.style.flexDirection = "column";
        tabsList.style.gap = "6px";
        tabsList.style.marginBottom = "12px";

        tabs.forEach(tab => {
            const row = document.createElement("div");
            row.style.fontSize = "12px";
            row.style.color = "#e4e4e7";
            row.style.whiteSpace = "nowrap";
            row.style.overflow = "hidden";
            row.style.textOverflow = "ellipsis";
            row.textContent = `• ${tab.title || tab.url}`;
            tabsList.appendChild(row);
        });
        activeCard.appendChild(tabsList);

        const snapBtn = document.createElement("button");
        snapBtn.className = "button";
        snapBtn.textContent = "💾 Snapshot Workspace Session";
        snapBtn.onclick = async () => {
            const saveBtnNode = qs("#save-session-btn");
            if (saveBtnNode) {
                saveBtnNode.click();
                setTimeout(() => loadSessionsToPanel(), 1500);
            }
        };
        activeCard.appendChild(snapBtn);
        flexWrapper.appendChild(activeCard);

        const savedTitle = document.createElement("h3");
        savedTitle.style.margin = "10px 0 0 0";
        savedTitle.style.color = "#02ff88";
        savedTitle.style.textAlign = "left";
        savedTitle.textContent = "🪟 Stored Workspace Sessions Library";
        flexWrapper.appendChild(savedTitle);

        const grid = document.createElement("div");
        grid.style.display = "grid";
        grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(280px, 1fr))";
        grid.style.gap = "16px";
        flexWrapper.appendChild(grid);

        const files = await listFiles();
        const metas = await Promise.all(files.map(async f => {
            try { return { file: f, meta: await f.readMeta() }; } catch { return { file: f, meta: null }; }
        }));

        for (const item of metas) {
            const name = item.file.handle.title;
            const isSessionFile = name.startsWith("session-") || (item.meta && Array.isArray(item.meta.tags) && item.meta.tags.includes("session"));
            if (!isSessionFile) continue;

            const card = document.createElement("div");
            card.className = "glass-panel";
            card.style.padding = "16px";
            card.style.borderRadius = "12px";
            card.style.background = "#18181b";
            card.style.border = "1px solid #27272a";
            card.style.display = "flex";
            card.style.flexDirection = "column";
            card.style.gap = "10px";
            card.style.textAlign = "left";

            const cardHeader = document.createElement("div");
            cardHeader.style.fontWeight = "600";
            cardHeader.style.color = "#02ff88";
            cardHeader.textContent = item.meta?.name || name.split("/").pop();
            card.appendChild(cardHeader);

            let tabCount = 0;
            let parsedSession = [];
            try {
                const raw = await item.file.read();
                const reconstructed = await reconstructBytesFromSerialized(raw, item.meta);
                const txt = td.decode(reconstructed.bytes);
                parsedSession = JSON.parse(txt);
                tabCount = parsedSession.length;
            } catch {}

            const info = document.createElement("div");
            info.style.fontSize = "12px";
            info.style.color = "#a1a1aa";
            info.textContent = `Tabs: ${tabCount} | Size: ${niceBytes(item.meta?.size || 0)}`;
            card.appendChild(info);

            const btnRow = document.createElement("div");
            btnRow.style.display = "flex";
            btnRow.style.flexWrap = "wrap";
            btnRow.style.gap = "6px";

            const restoreBtn = document.createElement("button");
            restoreBtn.className = "button";
            restoreBtn.textContent = "🚀 Open";
            restoreBtn.onclick = async () => {
                for (const t of parsedSession) {
                    if (t.url) chrome.tabs.create({ url: t.url, active: false });
                }
                alert(`Restored ${tabCount} tabs!`);
            };
            btnRow.appendChild(restoreBtn);

            const winBtn = document.createElement("button");
            winBtn.className = "button";
            winBtn.textContent = "🗔 Win";
            winBtn.onclick = async () => {
                const urls = parsedSession.map(t => t.url).filter(Boolean);
                if (urls.length > 0) chrome.windows.create({ url: urls });
            };
            btnRow.appendChild(winBtn);

            const groupBtn = document.createElement("button");
            groupBtn.className = "button";
            groupBtn.textContent = "🏷️ Group";
            groupBtn.onclick = async () => {
                const tabIds = [];
                for (const t of parsedSession) {
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
            btnRow.appendChild(groupBtn);

            const delBtn = document.createElement("button");
            delBtn.className = "button";
            delBtn.style.backgroundColor = "#7f1d1d";
            delBtn.textContent = "🗑️";
            delBtn.onclick = async () => {
                if (!confirm(`Delete session "${name}"?`)) return;
                card.style.opacity = "0";
                setTimeout(async () => {
                    await item.file.delete();
                    await loadSessionsToPanel();
                }, 300);
            };
            btnRow.appendChild(delBtn);

            card.appendChild(btnRow);
            grid.appendChild(card);
        }
    }

    function ensureUI() {
        const center = document.querySelector("center") || document.body;
        const urlParams = new URLSearchParams(window.location.search);
        const startPanel = urlParams.get("panel") || "files";
        const INLINE_PANELS = ["twofa", "passwords", "calc", "clock", "regex", "color", "api", "privacy", "rss", "timetracker", "qrscanner"];
        const isCustomPanelActive = INLINE_PANELS.includes(startPanel);

        if (!qs("#panel-nav-bar")) {
            const nav = document.createElement("div");
            nav.id = "panel-nav-bar";
            
            // Check if startup panel is one of the dropdown tools
            const dropdownPanels = ["passwords", "calc", "clock", "regex", "color", "api", "privacy", "rss", "timetracker", "qrscanner"];
            const isDropdownActive = dropdownPanels.includes(startPanel);

            nav.innerHTML = `
                <div class="nav-links">
                    <a href="index.html" class="nav-btn ${startPanel === "files" ? "active" : ""}" data-panel="files" title="Files">📁 <span>Files</span></a>
                    <a href="bookmarks.html" class="nav-btn" data-panel="bookmarks" title="Bookmarks">🔖 <span>Bookmarks</span></a>
                    <a href="sessions.html" class="nav-btn" data-panel="sessions" title="Sessions">🪟 <span>Sessions</span></a>
                    <a href="web.html" class="nav-btn" data-panel="web" title="Web">🌐 <span>Web</span></a>
                    <a href="notes.html" class="nav-btn" data-panel="notes" title="Notes">📝 <span>Notes</span></a>
                    <a href="/dist/capture.html" class="nav-btn" data-panel="screenshot" title="Screenshot">📸 <span>Screenshot</span></a>
                    <a href="#" class="nav-btn ${startPanel === "twofa" ? "active" : ""}" id="nav-2fa-btn" data-panel="twofa" title="2FA Keys">🔐 <span>2FA</span></a>
                    
                    <div class="nav-dropdown" style="position: relative; display: inline-block;">
                        <button class="nav-btn dropdown-trigger ${isDropdownActive ? "active" : ""}" title="Tools">🛠️ <span>Tools ▾</span></button>
                        <div class="dropdown-content">
                            <a href="#" class="nav-btn ${startPanel === "qrscanner" ? "active" : ""}" data-panel="qrscanner" title="QR Scanner">🔍 <span>QR Scanner</span></a>
                            <a href="#" class="nav-btn ${startPanel === "passwords" ? "active" : ""}" data-panel="passwords" title="Passwords">🔑 <span>Passwords</span></a>
                            <a href="ua.html" class="nav-btn" data-panel="ua" title="User Agent">🕵️ <span>UA</span></a>
                            <a href="#" class="nav-btn ${startPanel === "calc" ? "active" : ""}" data-panel="calc" title="Calculator">🧮 <span>Calc</span></a>
                            <a href="#" class="nav-btn ${startPanel === "clock" ? "active" : ""}" data-panel="clock" title="Clock">⏰ <span>Clock</span></a>
                            <a href="#" class="nav-btn ${startPanel === "regex" ? "active" : ""}" data-panel="regex" title="Regex">🔍 <span>Regex</span></a>
                            <a href="#" class="nav-btn ${startPanel === "color" ? "active" : ""}" data-panel="color" title="Color">🎨 <span>Color</span></a>
                            <a href="#" class="nav-btn ${startPanel === "api" ? "active" : ""}" data-panel="api" title="API">📦 <span>API</span></a>
                            <a href="#" class="nav-btn ${startPanel === "privacy" ? "active" : ""}" data-panel="privacy" title="Privacy">🛡️ <span>Privacy</span></a>
                            <a href="#" class="nav-btn ${startPanel === "rss" ? "active" : ""}" data-panel="rss" title="RSS">📡 <span>RSS</span></a>
                            <a href="#" class="nav-btn ${startPanel === "timetracker" ? "active" : ""}" data-panel="timetracker" title="Time">📊 <span>Time</span></a>
                        </div>
                    </div>
                </div>
                <div class="nav-controls">
                    <button id="global-theme-toggle" class="nav-btn" title="Toggle Theme" style="background:transparent;border:none;cursor:pointer;padding:6px 12px;margin-left:8px;"></button>
                </div>
            `;
            document.body.insertBefore(nav, document.body.firstChild);

            // Toggle dropdown behavior
            const trigger = nav.querySelector(".dropdown-trigger");
            const dropdown = nav.querySelector(".dropdown-content");
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

            // Bind panel switching
            const navLinks = nav.querySelectorAll(".nav-btn:not(.dropdown-trigger)");
            navLinks.forEach(link => {
                link.onclick = (e) => {
                    const panel = link.dataset.panel;
                    if (!panel) return;

                    if (INLINE_PANELS.includes(panel)) {
                        e.preventDefault();
                        navLinks.forEach(l => l.classList.remove("active"));
                        
                        const dropdownPanels = ["passwords", "calc", "clock", "regex", "color", "api", "privacy", "rss", "timetracker", "qrscanner"];
                        if (dropdownPanels.includes(panel)) {
                            trigger.classList.add("active");
                        } else {
                            trigger.classList.remove("active");
                        }
                        
                        link.classList.add("active");
                        dropdown.style.display = "none";
                        
                        // Hide Files view containers
                        const filesView = qs("#files-panel-view");
                        if (filesView) filesView.style.display = "none";
                        const controlsBar = qs("#controls-bar");
                        if (controlsBar) controlsBar.style.display = "none";
                        const storageChart = qs("#storage-chart-container");
                        if (storageChart) storageChart.style.display = "none";
                        const bulkBar = qs("#bulk-bar");
                        if (bulkBar) bulkBar.style.display = "none";
                        
                        // Hide all other inline panels
                        stopAllScannerMedia();
                        INLINE_PANELS.forEach(p => {
                            const pDiv = qs(`#${p}-panel`);
                            if (pDiv) pDiv.style.display = "none";
                        });
                        
                        // Show/Render the selected panel
                        if (panel === "twofa") show2FAPanel();
                        else if (panel === "passwords") showPasswordsPanel();
                        else if (panel === "calc") showCalcPanel();
                        else if (panel === "clock") showClockPanel();
                        else if (panel === "regex") showRegexPanel();
                        else if (panel === "color") showColorPanel();
                        else if (panel === "api") showApiPanel();
                        else if (panel === "privacy") showPrivacyPanel();
                        else if (panel === "rss") showRssPanel();
                        else if (panel === "timetracker") showTimeTrackerPanel();
                        else if (panel === "qrscanner") showQrScannerPanel();
                    } else if (panel === "files") {
                        e.preventDefault();
                        navLinks.forEach(l => l.classList.remove("active"));
                        trigger.classList.remove("active");
                        link.classList.add("active");
                        dropdown.style.display = "none";
                        
                        // Hide all custom panels
                        stopAllScannerMedia();
                        INLINE_PANELS.forEach(p => {
                            const pDiv = qs(`#${p}-panel`);
                            if (pDiv) pDiv.style.display = "none";
                        });
                        
                        // Show Files view containers
                        const filesView = qs("#files-panel-view");
                        if (filesView) filesView.style.display = "block";
                        const controlsBar = qs("#controls-bar");
                        if (controlsBar) controlsBar.style.display = "flex";
                        const storageChart = qs("#storage-chart-container");
                        if (storageChart) storageChart.style.display = "block";
                        
                        loadFilesToTable(false);
                    }
                };
            });

            const syncTheme = () => {
                const theme = localStorage.getItem("bookmarkfs_theme") || "dark";
                const isLight = theme === "light";
                document.documentElement.classList.toggle("light-mode", isLight);
                document.body.classList.toggle("light-mode", isLight);
                document.body.classList.toggle("dark-mode", !isLight);
                
                const toggleBtn = document.getElementById("global-theme-toggle");
                if (toggleBtn) {
                    toggleBtn.innerHTML = isLight ? "🌙 <span>Dark</span>" : "☀️ <span>Light</span>";
                }
            };
            
            syncTheme();
            const toggleBtn = document.getElementById("global-theme-toggle");
            if (toggleBtn) {
                toggleBtn.onclick = (e) => {
                    e.preventDefault();
                    const currentTheme = localStorage.getItem("bookmarkfs_theme") || "dark";
                    const nextTheme = currentTheme === "dark" ? "light" : "dark";
                    localStorage.setItem("bookmarkfs_theme", nextTheme);
                    syncTheme();
                };
            }

            const filesView = document.createElement("div");
            filesView.id = "files-panel-view";
            filesView.style.width = "100%";
            if (isCustomPanelActive) {
                filesView.style.display = "none";
            }
            center.appendChild(filesView);

            const table = qs("#table");
            if (table) {
                const wrapper = document.createElement("div");
                wrapper.className = "table-responsive-container";
                wrapper.appendChild(table);
                filesView.appendChild(wrapper);
            }
        }

        // file input: allow multiple
        const input = qs("#file-input");
        if (input) input.multiple = true;

        // Ensure storage-chart-container exists
        if (!qs("#storage-chart-container")) {
            const chartContainer = document.createElement("div");
            chartContainer.id = "storage-chart-container";
            chartContainer.style.display = "none";
            const ref = qs(".table-responsive-container") || qs("#table") || null;
            (ref ? ref.parentNode : center).insertBefore(chartContainer, ref);
        }

        // Ensure bulk-bar exists
        if (!qs("#bulk-bar")) {
            const bulkBar = document.createElement("div");
            bulkBar.id = "bulk-bar";
            bulkBar.style.margin = "12px auto";
            bulkBar.style.padding = "10px 16px";
            bulkBar.style.background = "#18181b";
            bulkBar.style.border = "1px solid #27272a";
            bulkBar.style.borderRadius = "8px";
            bulkBar.style.display = "none"; // hidden by default
            bulkBar.style.alignItems = "center";
            bulkBar.style.gap = "12px";
            bulkBar.style.width = "100%";
            bulkBar.style.maxWidth = "980px";
            bulkBar.style.boxSizing = "border-box";

            const countSpan = document.createElement("span");
            countSpan.id = "bulk-count";
            countSpan.style.fontSize = "13px";
            countSpan.style.color = "#a1a1aa";
            countSpan.textContent = "0 items selected";

            const bulkDlBtn = document.createElement("button");
            bulkDlBtn.className = "button";
            bulkDlBtn.textContent = "📦 Download ZIP";
            bulkDlBtn.onclick = async () => {
                await handleBulkDownload();
            };

            const bulkMoveBtn = document.createElement("button");
            bulkMoveBtn.className = "button";
            bulkMoveBtn.textContent = "📂 Move Selected";
            bulkMoveBtn.onclick = async () => {
                await handleBulkMove();
            };

            const bulkDelBtn = document.createElement("button");
            bulkDelBtn.className = "button";
            bulkDelBtn.textContent = "🗑 Delete Selected";
            bulkDelBtn.style.borderColor = "#ef4444";
            bulkDelBtn.style.color = "#ef4444";
            bulkDelBtn.onclick = async () => {
                await handleBulkDelete();
            };

            bulkBar.appendChild(countSpan);
            bulkBar.appendChild(bulkDlBtn);
            bulkBar.appendChild(bulkMoveBtn);
            bulkBar.appendChild(bulkDelBtn);
            const ref = qs(".table-responsive-container") || qs("#table") || null;
            (ref ? ref.parentNode : center).insertBefore(bulkBar, ref);
        }

        if (!qs("#controls-bar")) {
            const bar = document.createElement("div");
            bar.id = "controls-bar";
            bar.style.margin = "12px 0";
            bar.style.display = isStartupTwofa ? "none" : "flex";
            bar.style.gap = "8px";
            bar.style.flexWrap = "wrap";
            bar.style.justifyContent = "center";
            bar.style.backgroundColor = "#242424";
            bar.style.padding = "10px";
            bar.style.width = "fit-content";
            bar.style.boxShadow = "inset 0 -7px 0 0 #050000!important";
            bar.style.borderRadius = "50px";
            bar.style.alignItems = "center";

            //Settings
            const settingsBtn = document.createElement("button");
            settingsBtn.textContent = "⚙ Settings";
            settingsBtn.className = "button";
            settingsBtn.onclick = () => {
                if (!qs("#settings-popup")) createSettingsPopup();
                qs("#settings-popup").style.display = "flex";
                loadSettingsIntoPopup();
            };

            // Search
            const search = document.createElement("input");
            search.id = "search-bar";
            search.placeholder = "Search files...";
            search.style.padding = "8px 12px";
            search.style.borderRadius = "8px";
            search.style.border = "1px solid #02ff88";
            search.style.background = "transparent";
            search.style.color = "inherit";

            // Web Search Engine Selector
            const searchEngine = document.createElement("select");
            searchEngine.id = "search-engine-select";
            searchEngine.style.padding = "8px 12px";
            searchEngine.style.borderRadius = "8px";
            searchEngine.style.border = "1px solid #02ff88";
            searchEngine.style.background = "#242424";
            searchEngine.style.color = "inherit";
            searchEngine.innerHTML = `
                <option value="local">Search Local Files</option>
                <option value="google">Google</option>
                <option value="ddg">DuckDuckGo</option>
                <option value="bing">Bing</option>
                <option value="yahoo">Yahoo</option>
            `;
            search.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    const engine = searchEngine.value;
                    const query = search.value.trim();
                    if (!query) return;
                    if (engine === "google") {
                        chrome.tabs.create({ url: `https://www.google.com/search?q=${encodeURIComponent(query)}` });
                    } else if (engine === "ddg") {
                        chrome.tabs.create({ url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}` });
                    } else if (engine === "bing") {
                        chrome.tabs.create({ url: `https://www.bing.com/search?q=${encodeURIComponent(query)}` });
                    } else if (engine === "yahoo") {
                        chrome.tabs.create({ url: `https://search.yahoo.com/search?p=${encodeURIComponent(query)}` });
                    }
                }
            });

            // Files Smart Sorting Selector
            const filesSortSelect = document.createElement("select");
            filesSortSelect.id = "files-sort-select";
            filesSortSelect.style.padding = "8px 12px";
            filesSortSelect.style.borderRadius = "8px";
            filesSortSelect.style.border = "1px solid #02ff88";
            filesSortSelect.style.background = "#242424";
            filesSortSelect.style.color = "inherit";
            filesSortSelect.innerHTML = `
                <option value="name_asc">Name (A-Z)</option>
                <option value="name_desc">Name (Z-A)</option>
                <option value="size_desc">Size (Largest)</option>
                <option value="size_asc">Size (Smallest)</option>
                <option value="date_desc">Date (Newest)</option>
                <option value="date_asc">Date (Oldest)</option>
            `;
            filesSortSelect.value = localStorage.getItem("bookmarkfs_files_sort") || "name_asc";
            filesSortSelect.onchange = async () => {
                localStorage.setItem("bookmarkfs_files_sort", filesSortSelect.value);
                await loadFilesToTable();
            };

            // Files Card Sizing Selector
            const filesSizeSelect = document.createElement("select");
            filesSizeSelect.id = "files-size-select";
            filesSizeSelect.style.padding = "8px 12px";
            filesSizeSelect.style.borderRadius = "8px";
            filesSizeSelect.style.border = "1px solid #02ff88";
            filesSizeSelect.style.background = "#242424";
            filesSizeSelect.style.color = "inherit";
            filesSizeSelect.innerHTML = `
                <option value="medium">Size: Medium</option>
                <option value="small">Size: Small</option>
                <option value="large">Size: Large</option>
            `;
            filesSizeSelect.value = localStorage.getItem("bookmarkfs_grid_size") || "medium";
            filesSizeSelect.onchange = () => {
                localStorage.setItem("bookmarkfs_grid_size", filesSizeSelect.value);
                applyGridSize();
            };

            // View Mode Toggle
            const viewToggleBtn = document.createElement("button");
            viewToggleBtn.id = "view-toggle-btn";
            viewToggleBtn.className = "button";
            const initialMode = localStorage.getItem("bookmarkfs_view_mode") || "list";
            viewToggleBtn.innerHTML = initialMode === "grid" ? "☰ List View" : "⚃ Grid View";
            viewToggleBtn.onclick = async () => {
                const currentMode = localStorage.getItem("bookmarkfs_view_mode") || "list";
                const nextMode = currentMode === "list" ? "grid" : "list";
                localStorage.setItem("bookmarkfs_view_mode", nextMode);
                viewToggleBtn.innerHTML = nextMode === "grid" ? "☰ List View" : "⚃ Grid View";
                await loadFilesToTable();
            };

            // Tab Session Saver
            const saveSessionBtn = document.createElement("button");
            saveSessionBtn.id = "save-session-btn";
            saveSessionBtn.className = "button";
            saveSessionBtn.textContent = "💾 Save Tabs";
            saveSessionBtn.title = "Save all open tabs in this window as a session file";
            saveSessionBtn.onclick = async () => {
                try {
                    const tabs = await chrome.tabs.query({ currentWindow: true });
                    const sessionData = tabs.map(t => ({ title: t.title, url: t.url }));
                    const serializedText = JSON.stringify(sessionData, null, 2);
                    const bytes = new TextEncoder().encode(serializedText);
                    
                    const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
                    const folderValue = normalizeVirtualPath((qs("#folder-input") && qs("#folder-input").value) || "");
                    const filename = `session-${dateStr}.json`;
                    let targetName = folderValue ? `${folderValue}/${filename}` : filename;
                    
                    let pass = "";
                    
                    const { serialized, metaObj, metaHeader } = await prepareSerializedFromDataURL(
                        await new Promise(resolve => {
                            const r = new FileReader();
                            r.onload = () => resolve(r.result);
                            r.readAsDataURL(new Blob([bytes], { type: "application/json" }));
                        }),
                        { passphrase: pass || "" }
                    );
                    metaObj.name = filename;
                    metaObj.metaHeader = metaHeader;
                    metaObj.tags = ["session", "bookmarkfs"];
                    
                    while (await getFileByName(targetName)) targetName = incrementVersionedName(targetName);
                    
                    const fobj = await createNewFile(targetName);
                    await fobj.writeMeta(metaObj);
                    await fobj.write(serialized, () => {});
                    
                    alert(`Session tabs saved successfully: ${targetName}`);
                    await loadFilesToTable();
                } catch (err) {
                    alert("Failed to save session: " + err.message);
                }
            };

            const folderInput = document.createElement("input");
            folderInput.id = "folder-input";
            folderInput.placeholder = "Folder path (optional)";
            folderInput.style.padding = "8px 12px";
            folderInput.style.borderRadius = "8px";
            folderInput.style.border = "1px solid #02ff88";
            folderInput.style.background = "transparent";
            folderInput.style.color = "inherit";

            // Tag search dropdown filter
            const tagFilter = document.createElement("select");
            tagFilter.id = "tag-filter";
            tagFilter.style.padding = "8px 12px";
            tagFilter.style.borderRadius = "8px";
            tagFilter.style.border = "1px solid #02ff88";
            tagFilter.style.background = "#242424";
            tagFilter.style.color = "inherit";
            tagFilter.innerHTML = '<option value="">All Tags</option>';
            tagFilter.onchange = async () => {
                currentPage = 1;
                await loadFilesToTable();
            };

            const pathBar = document.createElement("div");
            pathBar.id = "path-bar";
            pathBar.style.fontSize = "12px";
            pathBar.style.color = "#02ff88";

            const analyticsBar = document.createElement("div");
            analyticsBar.id = "analytics-bar";
            analyticsBar.style.fontSize = "12px";
            analyticsBar.style.color = "#b3b3b3";
            analyticsBar.style.maxWidth = "420px";
            analyticsBar.style.whiteSpace = "nowrap";
            analyticsBar.style.overflow = "hidden";
            analyticsBar.style.textOverflow = "ellipsis";

            const upBtn = document.createElement("button");
            upBtn.id = "up-path-btn";
            upBtn.className = "button";
            upBtn.textContent = "Up";

            // Export / Import
            const exportBtn = document.createElement("button");
            exportBtn.id = "export-btn";
            exportBtn.className = "button";
            exportBtn.textContent = "Export";

            const importLabel = document.createElement("label");
            importLabel.className = "button";
            importLabel.textContent = "Import";
            importLabel.htmlFor = "import-input";

            const importInput = document.createElement("input");
            importInput.type = "file";
            importInput.id = "import-input";
            importInput.accept = "application/json";
            importInput.style.display = "none";

            // Share Import
            const shareImportBtn = document.createElement("button");
            shareImportBtn.id = "share-import-btn";
            shareImportBtn.className = "button";
            shareImportBtn.textContent = "Import Share";
            shareImportBtn.onclick = async () => {
                const pasteStr = prompt("Paste the shareable Base64 string here:");
                if (!pasteStr) return;
                try {
                    const jsonStr = atob(pasteStr.trim());
                    const pkg = JSON.parse(jsonStr);
                    if (pkg.type !== "bookmarkfs-share") throw new Error("Invalid share package");
                    
                    let target = pkg.name;
                    while (await getFileByName(target)) target = incrementVersionedName(target);
                    
                    const fobj = await createNewFile(target);
                    if (pkg.meta) await fobj.writeMeta(migrateMeta(pkg.meta));
                    await fobj.write(pkg.serialized, (p) => setProgress(p));
                    
                    await loadFilesToTable();
                    alert(`Imported file: ${target}`);
                } catch (err) {
                    alert("Import failed: " + err.message);
                } finally {
                    setProgress(0);
                }
            };

            const uploadLabel = document.createElement("label");
            uploadLabel.className = "button";
            uploadLabel.textContent = "Upload";
            uploadLabel.htmlFor = "file-input";

            const uploadInput = document.createElement("input");
            uploadInput.type = "file";
            uploadInput.id = "file-input";
            uploadInput.style.display = "none";
            uploadInput.multiple = true;

            // New Folder creator
            const newFolderBtn = document.createElement("button");
            newFolderBtn.id = "new-folder-btn";
            newFolderBtn.className = "button";
            newFolderBtn.textContent = "📁 New Folder";
            newFolderBtn.onclick = async () => {
                const folderName = prompt("Enter folder name:");
                if (!folderName) return;

                const cleanName = folderName.trim().replace(/[\\\/:*?"<>|]/g, "_");
                if (!cleanName) return;

                const targetPath = currentPath ? `${currentPath}/${cleanName}/.keep` : `${cleanName}/.keep`;

                const files = await listFiles();
                const prefix = currentPath ? `${currentPath}/${cleanName}/` : `${cleanName}/`;
                const exists = files.some(f => f.handle.title.startsWith(prefix));
                if (exists) {
                    alert("A folder with this name already exists.");
                    return;
                }

                try {
                    const bytes = new Uint8Array([0]);
                    const { serialized, metaObj, metaHeader } = await prepareSerializedFromDataURL(
                        "data:application/x-directory;base64,AA==",
                        { passphrase: "" }
                    );
                    metaObj.name = ".keep";
                    metaObj.metaHeader = metaHeader;
                    metaObj.tags = ["directory"];

                    const fobj = await createNewFile(targetPath);
                    await fobj.writeMeta(metaObj);
                    await fobj.write(serialized, () => {});
                    addFileToCache(fobj, metaObj);
                    await loadFilesToTable(false);
                } catch (err) {
                    alert("Failed to create folder: " + err.message);
                }
            };

            const prevBtn = document.createElement("button");
            prevBtn.id = "prev-page-btn";
            prevBtn.className = "button";
            prevBtn.textContent = "Prev";

            const pageInfo = document.createElement("span");
            pageInfo.id = "page-info";
            pageInfo.style.fontSize = "12px";

            const nextBtn = document.createElement("button");
            nextBtn.id = "next-page-btn";
            nextBtn.className = "button";
            nextBtn.textContent = "Next";

            // Progress container
            const prog = document.createElement("div");
            prog.id = "progress-container";
            prog.style.width = "200px";
            prog.style.height = "8px";
            prog.style.background = "#2f2f2f";
            prog.style.borderRadius = "6px";
            prog.style.overflow = "hidden";
            prog.style.display = "none";
            const progBar = document.createElement("div");
            progBar.id = "progress-bar";
            progBar.style.width = "0%";
            progBar.style.height = "100%";
            progBar.style.background = "#02ff88";
            prog.appendChild(progBar);

            // Sidebar Button
            const sidebarBtn = document.createElement("button");
            sidebarBtn.id = "sidebar-btn";
            sidebarBtn.className = "button";
            sidebarBtn.textContent = "📑 Sidebar";
            sidebarBtn.title = "Open in Chrome Sidebar";
            sidebarBtn.onclick = async () => {
                try {
                    const win = await chrome.windows.getCurrent();
                    await chrome.sidePanel.open({ windowId: win.id });
                    const isPopup = chrome.extension && typeof chrome.extension.getViews === "function" && chrome.extension.getViews({ type: "popup" }).includes(window);
                    if (isPopup) {
                        window.close();
                    }
                } catch (err) {
                    alert("To open the sidebar, click the Chrome Side Panel toolbar icon next to your URL bar, or check extension settings.");
                }
            };

            bar.appendChild(search);
            bar.appendChild(filesSortSelect);
            bar.appendChild(tagFilter);
            bar.appendChild(viewToggleBtn);
            bar.appendChild(settingsBtn);

            bar.appendChild(pathBar);
            bar.appendChild(upBtn);
            bar.appendChild(uploadLabel);
            bar.appendChild(uploadInput);
            bar.appendChild(newFolderBtn);
            
            const ref = qs(".table-responsive-container") || qs("#table") || null;
            (ref ? ref.parentNode : center).insertBefore(bar, ref);

            // Pagination & Storage Info Bar placed neatly BELOW the file list table
            if (!qs("#pagination-bar")) {
                const pager = document.createElement("div");
                pager.id = "pagination-bar";
                pager.style.margin = "16px 0";
                pager.style.display = "flex";
                pager.style.justifyContent = "center";
                pager.style.alignItems = "center";
                pager.style.gap = "12px";
                pager.style.flexWrap = "wrap";
                pager.style.width = "100%";

                pager.appendChild(prevBtn);
                pager.appendChild(pageInfo);
                pager.appendChild(nextBtn);
                pager.appendChild(analyticsBar);
                pager.appendChild(prog);

                if (ref) {
                    ref.parentNode.insertBefore(pager, ref.nextSibling);
                } else {
                    center.appendChild(pager);
                }
            }
        }
        const table = qs("#table");
        if (table && !table.querySelector("thead")) {
            table.innerHTML = "";
            const thead = document.createElement("thead");
            thead.innerHTML = `
        <tr>
          <th style="width: 30px; text-align:center;"><input type="checkbox" id="bulk-select-all"></th>
          <th style="width: 80px;">Preview</th>
          <th>Name</th>
          <th style="width: 100px;">Type</th>
          <th style="width: 85px;">Size</th>
          <th style="width: 90px;">Date</th>
          <th style="width: 42px; text-align:center;" title="Download">📥</th>
          <th style="width: 42px; text-align:center;" title="Copy to Clipboard">📋</th>
          <th style="width: 42px; text-align:center;" title="Share">🔗</th>
          <th style="width: 42px; text-align:center;" title="Rename">✏️</th>
          <th style="width: 42px; text-align:center;" title="Delete">🗑️</th>
        </tr>`;
            const tbody = document.createElement("tbody");
            table.appendChild(thead);
            table.appendChild(tbody);
            table.style.width = "min(980px, 95%)";

            // Wire up select all checkbox
            const selectAllCb = thead.querySelector("#bulk-select-all");
            selectAllCb.onchange = () => {
                const cbs = document.querySelectorAll(".row-select");
                cbs.forEach(cb => cb.checked = selectAllCb.checked);
                updateBulkBar();
            };
        }
    }

    createSettingsPopup(); // build popup once

    function setProgress(p) {
        const prog = qs("#progress-container");
        const bar = qs("#progress-bar");
        if (!prog || !bar) return;
        // show only when 0 < p < 1, hide otherwise (1 triggers completion animation then hidden)
        prog.style.display = (p > 0 && p < 1) ? "block" : "none";
        const pct = Math.max(0, Math.min(1, p || 0)) * 100;
        bar.style.width = pct.toFixed(1) + "%";
        if (p >= 1) setTimeout(() => {
            bar.style.width = "0%";
            prog.style.display = "none";
        }, 400);
    }

    function updatePathBar() {
        const node = qs("#path-bar");
        if (!node) return;
        node.innerHTML = "";
        
        const rootLink = document.createElement("span");
        rootLink.textContent = "Root (/)";
        rootLink.style.cursor = "pointer";
        rootLink.style.padding = "2px 6px";
        rootLink.style.borderRadius = "4px";
        rootLink.onclick = async () => {
            currentPath = "";
            currentPage = 1;
            await loadFilesToTable();
        };
        // Root drop target
        rootLink.addEventListener("dragover", (e) => { e.preventDefault(); rootLink.style.background = "rgba(16,185,129,0.3)"; });
        rootLink.addEventListener("dragleave", () => { rootLink.style.background = ""; });
        rootLink.addEventListener("drop", async (e) => {
            e.preventDefault();
            rootLink.style.background = "";
            const dragId = e.dataTransfer.getData("text/file-id");
            const dragName = e.dataTransfer.getData("text/file-name");
            if (!dragId || !dragName) return;
            const baseName = splitVirtualName(dragName).base;
            const f = (await listFiles()).find(x => x.handle.id === dragId);
            if (f) {
                await f.rename(baseName);
                renameFileInCache(dragId, baseName);
                await loadFilesToTable(false);
            }
        });
        node.appendChild(rootLink);

        if (currentPath) {
            const parts = currentPath.split("/").filter(Boolean);
            let accum = "";
            for (let i = 0; i < parts.length; i++) {
                const sep = document.createElement("span");
                sep.textContent = " / ";
                node.appendChild(sep);

                const part = parts[i];
                accum = accum ? `${accum}/${part}` : part;
                const targetPath = accum;

                const link = document.createElement("span");
                link.textContent = part;
                link.style.cursor = "pointer";
                link.style.padding = "2px 6px";
                link.style.borderRadius = "4px";
                link.onclick = async () => {
                    currentPath = targetPath;
                    currentPage = 1;
                    await loadFilesToTable();
                };
                
                // Breadcrumb drop target
                link.addEventListener("dragover", (e) => { e.preventDefault(); link.style.background = "rgba(16,185,129,0.3)"; });
                link.addEventListener("dragleave", () => { link.style.background = ""; });
                link.addEventListener("drop", async (e) => {
                    e.preventDefault();
                    link.style.background = "";
                    const dragId = e.dataTransfer.getData("text/file-id");
                    const dragName = e.dataTransfer.getData("text/file-name");
                    if (!dragId || !dragName) return;
                    const baseName = splitVirtualName(dragName).base;
                    const newName = joinVirtualName(targetPath, baseName);
                    const f = (await listFiles()).find(x => x.handle.id === dragId);
                    if (f) {
                        await f.rename(newName);
                        renameFileInCache(dragId, newName);
                        await loadFilesToTable(false);
                    }
                });
                node.appendChild(link);
            }
        }

        const folder = qs("#folder-input");
        if (folder && folder.value !== currentPath) folder.value = currentPath;
    }

    function getVisibleEntries(files, searchTerm, tagFilterValue, metas, notesStorage) {
        const q = (searchTerm || "").toLowerCase();
        const prefix = currentPath ? `${currentPath}/` : "";
        const folders = new Map();
        const fileEntries = [];

        const metaMap = new Map();
        if (metas) {
            for (const item of metas) {
                metaMap.set(item.file.handle.id, item.meta);
            }
        }

        for (const file of files) {
            const full = file.handle.title;
            if (!full.startsWith(prefix)) continue;
            const rest = full.slice(prefix.length);
            if (!rest) continue;

            if (tagFilterValue) {
                const m = metaMap.get(file.handle.id);
                const tags = (m && Array.isArray(m.tags)) ? m.tags : [];
                if (!tags.includes(tagFilterValue)) continue;
            }

            const slash = rest.indexOf("/");
            if (slash >= 0) {
                const folder = rest.slice(0, slash);
                if (!q || folder.toLowerCase().includes(q)) folders.set(folder, folder);
            } else {
                if (rest === ".keep") continue;
                if (!q) {
                    fileEntries.push({ file, displayName: rest, fullName: full, searchScore: 0 });
                } else {
                    // Deep fuzzy search: name
                    const nameScore = fuzzyScore(q, rest) || fuzzyScore(q, full);
                    
                    // Tags
                    const m = metaMap.get(file.handle.id);
                    const tagStr = (m && Array.isArray(m.tags)) ? m.tags.join(" ") : "";
                    const tagScore = fuzzyScore(q, tagStr);
                    
                    // Description
                    const descStr = (m && m.description) ? m.description : "";
                    const descScore = fuzzyScore(q, descStr);

                    // Mapped notes content
                    let noteScore = 0;
                    if (notesStorage) {
                        const baseName = rest.toLowerCase();
                        for (const [key, val] of Object.entries(notesStorage)) {
                            if (key.startsWith("note_text_") && typeof val === "string") {
                                const noteKeyLower = key.toLowerCase();
                                if (noteKeyLower.includes(baseName) || baseName.includes(noteKeyLower.replace("note_text_", ""))) {
                                    noteScore = Math.max(noteScore, fuzzyScore(q, val));
                                }
                            }
                        }
                    }

                    // Text/Markdown content search
                    const cachedText = fileTextContentCache.get(file.handle.id) || "";
                    const contentScore = cachedText ? fuzzyScore(q, cachedText) : 0;

                    const bestScore = Math.max(nameScore, tagScore, descScore, noteScore, contentScore);
                    if (bestScore > 0) {
                        fileEntries.push({ file, displayName: rest, fullName: full, searchScore: bestScore });
                    }
                }
            }
        }
        const folderEntries = [...folders.values()].sort().map((f) => ({ folder: true, name: f }));
        
        const sortValue = localStorage.getItem("bookmarkfs_files_sort") || "name_asc";
        fileEntries.sort((a, b) => {
            if (q && a.searchScore !== b.searchScore) {
                return b.searchScore - a.searchScore; // Sort by relevance when searching
            }
            const metaA = metaMap.get(a.file.handle.id);
            const metaB = metaMap.get(b.file.handle.id);
            
            if (sortValue.startsWith("name")) {
                const cmp = a.displayName.localeCompare(b.displayName);
                return sortValue === "name_desc" ? -cmp : cmp;
            }
            if (sortValue.startsWith("size")) {
                const sizeA = metaA?.sizeOriginal || 0;
                const sizeB = metaB?.sizeOriginal || 0;
                return sortValue === "size_desc" ? sizeB - sizeA : sizeA - sizeB;
            }
            if (sortValue.startsWith("date")) {
                const dateA = metaA?.dateISO || "";
                const dateB = metaB?.dateISO || "";
                const cmp = dateA.localeCompare(dateB);
                return sortValue === "date_desc" ? -cmp : cmp;
            }
            return 0;
        });
        return folderEntries.concat(fileEntries);
    }

    function updateAnalytics(files) {
        const node = qs("#analytics-bar");
        if (!node) return;
        let stored = 0;
        for (const f of files) {
            if (f.meta && Number.isFinite(f.meta.sizeStored)) stored += f.meta.sizeStored;
        }
        node.textContent = `Items: ${files.length} | Stored: ${niceBytes(stored)}`;
    }

    function applyDarkFromStorage() {
        const theme = localStorage.getItem("bookmarkfs_theme") || "dark";
        const isLight = theme === "light";
        document.documentElement.classList.toggle("light-mode", isLight);
        document.body.classList.toggle("light-mode", isLight);
        document.body.classList.toggle("dark-mode", !isLight);
    }

    function toggleDark() {
        const currentTheme = localStorage.getItem("bookmarkfs_theme") || "dark";
        const nextTheme = currentTheme === "dark" ? "light" : "dark";
        localStorage.setItem("bookmarkfs_theme", nextTheme);
        applyDarkFromStorage();
        const toggleBtn = document.getElementById("global-theme-toggle");
        if (toggleBtn) {
            toggleBtn.innerHTML = nextTheme === "light" ? "🌙 <span>Dark</span>" : "☀️ <span>Light</span>";
        }
    }

    // ---------- Bookmark FS primitives (based on your original) ----------
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

    async function fsRoot() {
        const tree = await chrome.bookmarks.getTree();
        // usually tree[0].children[1] is bookmarks bar
        const bar = tree[0].children[1] || tree[0].children[0];
        let handle = (bar.children || []).find(b => b.title === "bookmarkfs");
        if (!handle) {
            handle = await chrome.bookmarks.create({ parentId: bar.id, title: "bookmarkfs" });
        }
        return handle;
    }

    function FileObj(handle, cachedChildren) {
        handle.children = handle.children || [];
        return {
            handle,
            async getChildrenFresh() {
                if (cachedChildren) return cachedChildren;
                try {
                    return (await chrome.bookmarks.getChildren(this.handle.id)) || [];
                } catch {
                    return this.handle.children || [];
                }
            },
            async readRaw() {
                // 1. Try to find the centralized chunk folder for this file ID (Schema 3)
                const chunkFolder = await getFileChunksFolder(this.handle.id);
                if (chunkFolder) {
                    const children = await chrome.bookmarks.getChildren(chunkFolder.id);
                    let data = "";
                    for (const c of (children || [])) {
                        data += c.title || "";
                    }
                    return data;
                }

                // 2. Legacy format (Schema 2): read from the file folder itself
                let data = "";
                const children = await this.getChildrenFresh();
                for (const c of (children || [])) {
                    if (c.title && c.title.startsWith(META_PREFIX)) continue;
                    data += c.title || "";
                }

                // Auto-migrate to Schema 3 (centralized chunking)
                const meta = await this.readMeta();
                if (meta && data.length > 0) {
                    try {
                        console.log("Migrating file to Schema 3 (centralized chunking):", this.handle.title);
                        const newChunkFolder = await getFileChunksFolder(this.handle.id, true);
                        const CHUNK = meta.chunkSize || maxBookmarkSize;
                        for (let i = 0; i < data.length; i += CHUNK) {
                            const part = data.substring(i, i + CHUNK);
                            await chrome.bookmarks.create({ parentId: newChunkFolder.id, title: part });
                        }
                        // Delete legacy chunk nodes from file folder
                        for (const c of (children || [])) {
                            if (c.title && !c.title.startsWith(META_PREFIX)) {
                                try { await chrome.bookmarks.remove(c.id); } catch {}
                            }
                        }
                        meta.schemaVersion = 3;
                        await this.writeMeta(meta);
                    } catch (migrationErr) {
                        console.warn("Auto-migration to Schema 3 failed:", migrationErr);
                    }
                }
                return data;
            },
            async read() {
                return this.readRaw();
            },
            async write(rawString, onProgress, options) {
                // Get or create chunk folder under __chunks__
                const chunkFolder = await getFileChunksFolder(this.handle.id, true);

                // chunk into maxBookmarkSize pieces
                const CHUNK = (options && options.chunkSize) ? options.chunkSize : maxBookmarkSize;
                const startChunk = (options && Number.isFinite(options.startChunk)) ? options.startChunk : 0;
                const pieces = [];
                for (let i = 0; i < rawString.length; i += CHUNK) {
                    pieces.push(rawString.substring(i, i + CHUNK));
                }

                // Get current children of the chunk folder
                const existing = await chrome.bookmarks.getChildren(chunkFolder.id);

                // Delete extra trailing children if any
                if (startChunk === 0 && pieces.length < existing.length) {
                    for (let i = existing.length - 1; i >= pieces.length; i--) {
                        try { await chrome.bookmarks.remove(existing[i].id); } catch {}
                    }
                }

                // Re-fetch current chunk nodes
                const currentDataNodes = await chrome.bookmarks.getChildren(chunkFolder.id);

                for (let i = startChunk; i < pieces.length; i++) {
                    const title = pieces[i];
                    const node = currentDataNodes[i];
                    if (!node) {
                        await chrome.bookmarks.create({ parentId: chunkFolder.id, title: title });
                    } else {
                        await chrome.bookmarks.update(node.id, { title: title });
                    }
                    if (options && typeof options.onChunk === "function") {
                        await options.onChunk(i + 1, pieces.length);
                    }
                    if (onProgress) onProgress((i + 1) / pieces.length);
                }
            },
            async writeMeta(metaObj) {
                // store meta as META_PREFIX + base64(JSON)
                const b = btoa(JSON.stringify(metaObj));
                const payload = META_PREFIX + b;
                // find existing meta node
                const children = await this.getChildrenFresh();
                const metaNode = (children || []).find(c => c.title && c.title.startsWith(META_PREFIX));
                if (!metaNode) {
                    await chrome.bookmarks.create({ parentId: this.handle.id, title: payload });
                } else {
                    await chrome.bookmarks.update(metaNode.id, { title: payload });
                }
            },
            async readMeta() {
                const children = await this.getChildrenFresh();
                const metaNode = (children || []).find(c => c.title && c.title.startsWith(META_PREFIX));
                if (!metaNode) return null;
                try {
                    const str = metaNode.title.slice(META_PREFIX.length);
                    try {
                        const decoded = atob(str);
                        return migrateMeta(JSON.parse(decoded));
                    } catch (e) {
                        try {
                            return migrateMeta(JSON.parse(str));
                        } catch (err) {
                            console.log("readMeta: unknown meta encoding (skipped legacy or corrupted node):", err.message);
                            return null;
                        }
                    }
                } catch (e) {
                    return null;
                }
            },
            async rename(newName) {
                await chrome.bookmarks.update(this.handle.id, { title: newName });
            },
            async delete() {
                // remove centralized chunk folder if any
                const chunkFolder = await getFileChunksFolder(this.handle.id);
                if (chunkFolder) {
                    try {
                        const chunkChildren = await chrome.bookmarks.getChildren(chunkFolder.id);
                        for (const node of (chunkChildren || [])) {
                            try { await chrome.bookmarks.remove(node.id); } catch {}
                        }
                        await chrome.bookmarks.remove(chunkFolder.id);
                    } catch {}
                }

                // remove file folder children then folder
                const children = await this.getChildrenFresh();
                for (const node of (children || [])) {
                    try { await chrome.bookmarks.remove(node.id); } catch (e) { /* ignore */ }
                }
                try { await chrome.bookmarks.remove(this.handle.id); } catch (e) { /* ignore */ }
            }
        };
    }

    async function listFiles() {
        const root = await fsRoot();
        const children = await chrome.bookmarks.getChildren(root.id);
        // only folders (no url) and skip system chunk directories
        return children.filter(c => !c.url && c.title !== "__chunks__").map(c => FileObj(c));
    }

    async function getFileByName(name) {
        if (name === "__chunks__") return null;
        const root = await fsRoot();
        const children = await chrome.bookmarks.getChildren(root.id);
        const h = children.find(b => b.title === name);
        return h ? FileObj(h) : null;
    }

    async function createNewFile(name) {
        if (name === "__chunks__") throw new Error("reserved name");
        const root = await fsRoot();
        const children = await chrome.bookmarks.getChildren(root.id);
        const exists = children.some(b => b.title === name);
        if (exists) throw new Error("file exists");
        const handle = await chrome.bookmarks.create({ parentId: root.id, title: name });
        return FileObj(handle);
    }

    async function findFileByHash(contentHash) {
        if (!contentHash) return null;
        const root = await fsRoot();
        const rootChildren = await chrome.bookmarks.getChildren(root.id);
        const files = rootChildren.filter(c => !c.url && c.title !== "__chunks__")
            .map(c => FileObj(c));

        for (const f of files) {
            const meta = await f.readMeta();
            if (meta && meta.contentHash === contentHash) return f;
        }
        return null;
    }

    async function setUploadCheckpoint(checkpoint) {
        await chrome.storage.local.set({ [UPLOAD_CHECKPOINT_KEY]: checkpoint });
    }

    async function getUploadCheckpoint() {
        const got = await chrome.storage.local.get(UPLOAD_CHECKPOINT_KEY);
        return got[UPLOAD_CHECKPOINT_KEY] || null;
    }

    async function clearUploadCheckpoint() {
        await chrome.storage.local.remove(UPLOAD_CHECKPOINT_KEY);
    }

    function migrateMeta(meta) {
        if (!meta || typeof meta !== "object") return null;
        const m = { ...meta };
        if (!m.schemaVersion) m.schemaVersion = 1;
        if (m.schemaVersion < 2) {
            m.schemaVersion = 2;
            m.chunkSize = m.chunkSize || maxBookmarkSize;
            m.chunkHashes = Array.isArray(m.chunkHashes) ? m.chunkHashes : [];
        }
        return m;
    }

    // ---------- Serialization helpers ----------
    async function prepareSerializedFromDataURL(dataUrl, options) {
        const { meta, dataB64 } = dataURLToParts(dataUrl);
        const originalBytes = b64decodeToBytes(dataB64);

        let processed = gzipSync(originalBytes);
        let compressed = hasFflate && processed.length < originalBytes.length;
        if (!compressed) processed = originalBytes;

        let encrypted = false;
        let encInfo = null;
        if (options && options.passphrase && options.passphrase.length > 0) {
            const { ct, salt, iv } = await encryptBytes(processed, options.passphrase);
            processed = ct;
            encrypted = true;
            encInfo = { salt: b64encodeBytes(salt), iv: b64encodeBytes(iv) };
        }

        const tag = compressed ? "c" : "r";
        const serialized = tag + b64encodeBytes(processed);
        
        const metaObj = {
            schemaVersion: APP_SCHEMA_VERSION,
            name: "",
            type: (meta.match(/^data:([^;]+)/) || [, "application/octet-stream"])[1],
            sizeOriginal: originalBytes.length,
            sizeStored: te.encode(serialized).length,
            ratio: (te.encode(serialized).length / Math.max(1, originalBytes.length)),
            dateISO: new Date().toISOString(),
            compressed,
            encrypted,
            enc: encInfo,
            chunkSize: maxBookmarkSize,
            chunkHashes: [],
            contentHash: await sha256HexBytes(originalBytes)
        };

        return { serialized, metaObj, metaHeader: meta };
    }

    async function verifySerializedIntegrity(serialized, metaObj) {
        const meta = migrateMeta(metaObj);
        if (!meta) return;
        if (!Array.isArray(meta.chunkHashes) || !meta.chunkHashes.length) return;
        const size = Number(meta.chunkSize || maxBookmarkSize);
        const pieces = splitBySize(serialized, size);
        if (pieces.length !== meta.chunkHashes.length) throw new Error("Integrity check failed: chunk count mismatch");
        for (let i = 0; i < pieces.length; i++) {
            const h = await sha256HexString(pieces[i]);
            if (h !== meta.chunkHashes[i]) throw new Error(`Integrity check failed at chunk ${i + 1}`);
        }
    }

    function sniffMimeFromBytes(bytes) {
        if (!bytes || !bytes.length) return "";
        const b = bytes;
        if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return "image/png";
        if (b.length >= 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return "image/jpeg";
        if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
        if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
        if (b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf";
        if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4B && b[2] === 0x03 && b[3] === 0x04) return "application/zip";
        if (b.length >= 4 && b[0] === 0x52 && b[1] === 0x61 && b[2] === 0x72 && b[3] === 0x21) return "application/vnd.rar";
        if (b.length >= 6 && b[0] === 0x37 && b[1] === 0x7A && b[2] === 0xBC && b[3] === 0xAF && b[4] === 0x27 && b[5] === 0x1C) return "application/x-7z-compressed";
        if (b.length >= 2 && b[0] === 0x1F && b[1] === 0x8B) return "application/gzip";
        if (b.length >= 3 && b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) return "audio/mpeg";
        if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x41 && b[10] === 0x56 && b[11] === 0x45) return "audio/wav";
        if (b.length >= 4 && b[0] === 0x66 && b[1] === 0x4C && b[2] === 0x61 && b[3] === 0x43) return "audio/flac";
        const sample = b.slice(0, Math.min(512, b.length));
        let printable = 0;
        for (let i = 0; i < sample.length; i++) {
            const c = sample[i];
            if (c === 9 || c === 10 || c === 13 || (c >= 32 && c < 127)) printable++;
        }
        if (sample.length && printable / sample.length > 0.9) return "text/plain";
        return "";
    }

    async function reconstructBytesFromSerialized(serialized, metaObj) {
        const meta = migrateMeta(metaObj) || {};
        if (!serialized || serialized.length < 2) throw new Error("Invalid serialized data");
        await verifySerializedIntegrity(serialized, meta);

        const tag = serialized[0];
        const payloadB64 = serialized.slice(1);
        let bytes = b64decodeToBytes(payloadB64);

        if (meta.encrypted) {
            let pass = cachedSessionPassphrase || "";

            // Check if file is inside a locked folder path
            const locks = await getFolderLocks();
            let targetLockedFolder = "";
            const fileTitle = meta.name || "";
            for (const lockedPath of Object.keys(locks)) {
                if (fileTitle === lockedPath || fileTitle.startsWith(lockedPath + "/")) {
                    targetLockedFolder = lockedPath;
                    break;
                }
            }

            if (targetLockedFolder) {
                let folderPass = cachedFolderPassphrases.get(targetLockedFolder);
                if (!folderPass) {
                    folderPass = prompt(`File is in locked folder "${targetLockedFolder}". Enter password to decrypt:`);
                    if (folderPass) {
                        const ok = await unlockFolder(targetLockedFolder, folderPass);
                        if (!ok) {
                            alert("Incorrect password!");
                            folderPass = "";
                        }
                    }
                }
                if (folderPass) pass = folderPass;
            }

            if (!pass) {
                pass = await new Promise((resolve) => {
                    showEncryptDecryptModal("Enter Decryption Passphrase", false, (typedPass, shouldCache) => {
                        if (typedPass && shouldCache) cachedSessionPassphrase = typedPass;
                        resolve(typedPass || "");
                    });
                });
                if (!pass) throw new Error("Passphrase required");
            }
            const saltB64 = meta.enc && (meta.enc.saltB64 || meta.enc.salt || meta.enc.salt64);
            const ivB64 = meta.enc && (meta.enc.ivB64 || meta.enc.iv || meta.enc.iv64);
            if (!saltB64 || !ivB64) throw new Error("Missing encryption metadata");
            bytes = await decryptBytes(bytes, pass, b64decodeToBytes(saltB64), b64decodeToBytes(ivB64));
        }

        if (tag === "c") bytes = gunzipSync(bytes);

        if (meta.contentHash) {
            const hash = await sha256HexBytes(bytes);
            if (hash !== meta.contentHash) throw new Error("Integrity check failed: content hash mismatch");
        }

        const mime = meta.type && meta.type !== "application/octet-stream" ? meta.type : (sniffMimeFromBytes(bytes) || meta.type || "application/octet-stream");
        return { bytes, mime, meta };
    }

    async function reconstructDataURLFromSerialized(serialized, metaObj) {
        const { bytes, mime } = await reconstructBytesFromSerialized(serialized, metaObj);
        const header = `data:${mime || "application/octet-stream"};base64`;
        return dataURLFromParts(header, bytes);
    }

    function getMimeType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        switch (ext) {
            // Images
            case "png":
                return "image/png";
            case "jpg":
            case "jpeg":
                return "image/jpeg";
            case "gif":
                return "image/gif";
            case "webp":
                return "image/webp";
            case "bmp":
                return "image/bmp";
            case "svg":
                return "image/svg+xml";
            case "ico":
                return "image/x-icon";

            // Video
            case "mp4":
                return "video/mp4";
            case "webm":
                return "video/webm";
            case "ogg":
                return "video/ogg";
            case "mov":
                return "video/quicktime";
            case "avi":
                return "video/x-msvideo";
            case "mkv":
                return "video/x-matroska";

            // Audio
            case "mp3":
                return "audio/mpeg";
            case "wav":
                return "audio/wav";
            case "flac":
                return "audio/flac";
            case "m4a":
                return "audio/mp4";

            // Text / Code
            case "txt":
                return "text/plain";
            case "md":
                return "text/markdown";
            case "html":
                return "text/html";
            case "css":
                return "text/css";
            case "js":
                return "application/javascript";
            case "ts":
                return "application/typescript";
            case "jsx":
                return "text/jsx";
            case "tsx":
                return "text/tsx";
            case "json":
                return "application/json";
            case "xml":
                return "application/xml";
            case "py":
                return "text/x-python";
            case "sh":
                return "text/x-sh";
            case "yaml":
            case "yml":
                return "text/x-yaml";
            case "c":
                return "text/x-c";
            case "cpp":
                return "text/x-c++";
            case "h":
            case "hpp":
                return "text/x-c-header";
            case "cs":
                return "text/x-csharp";
            case "go":
                return "text/x-go";
            case "rs":
                return "text/x-rust";
            case "java":
                return "text/x-java";
            case "sql":
                return "text/x-sql";
            case "bat":
                return "text/x-msdos-batch";
            case "ps1":
                return "text/x-powershell";
            case "ini":
            case "conf":
                return "text/plain";

            // Documents
            case "pdf":
                return "application/pdf";
            case "doc":
                return "application/msword";
            case "docx":
                return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case "xls":
                return "application/vnd.ms-excel";
            case "xlsx":
                return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            case "ppt":
                return "application/vnd.ms-powerpoint";
            case "pptx":
                return "application/vnd.openxmlformats-officedocument.presentationml.presentation";

            // Archives
            case "zip":
                return "application/zip";
            case "rar":
                return "application/vnd.rar";
            case "7z":
                return "application/x-7z-compressed";
            case "gz":
                return "application/gzip";
            case "tar":
                return "application/x-tar";

            // Default fallback
            default:
                return "application/octet-stream";
        }
    }

    function getFriendlyFileType(name, mime) {
        const ext = name.split('.').pop().toLowerCase();
        if (!ext || ext === name.toLowerCase()) {
            return "File";
        }
        switch (ext) {
            case "png": case "jpg": case "jpeg": case "gif": case "webp": case "svg": case "bmp":
                return ext.toUpperCase() + " Image";
            case "mp4": case "webm": case "mkv": case "mov": case "avi":
                return ext.toUpperCase() + " Video";
            case "mp3": case "wav": case "flac": case "ogg": case "m4a":
                return ext.toUpperCase() + " Audio";
            case "txt":
                return "Text Document";
            case "md":
                return "Markdown Document";
            case "json":
                return "JSON File";
            case "js": case "ts": case "py": case "sh": case "html": case "css": case "go": case "rs": case "java": case "cpp": case "c":
                return ext.toUpperCase() + " Code";
            case "pdf":
                return "PDF Document";
            case "zip": case "rar": case "7z": case "tar": case "gz":
                return ext.toUpperCase() + " Archive";
            case "exe": case "msi":
                return "Executable";
            default:
                return ext.toUpperCase() + " File";
        }
    }


    // ---------- UI Rendering ----------
    async function loadFilesToTable(bypassCache = false) {
        const table = qs("#table");
        const tbody = qs("#table tbody");
        if (!tbody) return;

        // Check if currentPath is locked and needs unlocking
        if (currentPath) {
            const locks = await getFolderLocks();
            const parts = currentPath.split("/").filter(Boolean);
            let accum = "";
            let lockedParent = "";
            for (const part of parts) {
                accum = accum ? `${accum}/${part}` : part;
                if (locks[accum] && !cachedFolderPassphrases.has(accum)) {
                    lockedParent = accum;
                    break;
                }
            }
            if (lockedParent) {
                const pass = prompt(`Folder "${lockedParent}" is locked. Enter password to view:`);
                if (pass) {
                    const ok = await unlockFolder(lockedParent, pass);
                    if (!ok) {
                        alert("Incorrect password!");
                        currentPath = ""; // Send back to root
                    }
                } else {
                    currentPath = ""; // Send back to root
                }
            }
        }
        const currentMode = localStorage.getItem("bookmarkfs_view_mode") || "list";
        if (table) {
            if (currentMode === "grid") {
                table.classList.add("grid-mode");
            } else {
                table.classList.remove("grid-mode");
            }
        }
        tbody.innerHTML = "";

        updatePathBar();
        const q = (qs("#search-bar") && qs("#search-bar").value) ? qs("#search-bar").value : "";
        const tagFilter = qs("#tag-filter");
        const tagFilterValue = tagFilter ? tagFilter.value : "";

        if (bypassCache || !cachedMetas) {
            const root = await fsRoot();
            const rootChildren = await chrome.bookmarks.getChildren(root.id);
            const files = rootChildren.filter(c => !c.url && c.title !== "__chunks__")
                .map(c => FileObj(c));

            cachedMetas = await Promise.all(files.map(async f => {
                try { return { file: f, meta: await f.readMeta() }; } catch { return { file: f, meta: null }; }
            }));
        }

        const files = cachedMetas.map(m => m.file);
        const metas = cachedMetas;

        updateAnalytics(metas);
        updateStorageChart(metas);

        // Dynamically update tag filter list
        const tagsSet = new Set();
        for (const m of metas) {
            if (m.meta && Array.isArray(m.meta.tags)) {
                m.meta.tags.forEach(t => tagsSet.add(t));
            }
        }
        if (tagFilter) {
            const selected = tagFilter.value;
            tagFilter.innerHTML = '<option value="">All Tags</option>';
            [...tagsSet].sort().forEach(tag => {
                const opt = document.createElement("option");
                opt.value = tag;
                opt.textContent = tag;
                if (tag === selected) opt.selected = true;
                tagFilter.appendChild(opt);
            });
        }

        const notesStorage = await chrome.storage.local.get(null);
        const entries = getVisibleEntries(files, q, tagFilterValue, metas, notesStorage);
        const totalPages = Math.max(1, Math.ceil(entries.length / Math.max(1, pageSize)));
        if (currentPage > totalPages) currentPage = totalPages;
        const pageInfo = qs("#page-info");
        if (pageInfo) pageInfo.textContent = `Page ${currentPage}/${totalPages}`;

        // Reset select all checkbox and bulk bar
        const selectAll = qs("#bulk-select-all");
        if (selectAll) selectAll.checked = false;
        updateBulkBar();

        const start = (currentPage - 1) * pageSize;
        const pageEntries = entries.slice(start, start + pageSize);
        for (const entry of pageEntries) {
            const tr = document.createElement("tr");
            tr.style.borderBottom = "1px solid #444";

            if (entry.folder) {
                // Drag-and-drop drop target on folder row
                tr.addEventListener("dragover", (e) => { e.preventDefault(); tr.style.background = "rgba(16,185,129,0.15)"; });
                tr.addEventListener("dragleave", () => { tr.style.background = ""; });
                tr.addEventListener("drop", async (e) => {
                    e.preventDefault();
                    tr.style.background = "";
                    const dragId = e.dataTransfer.getData("text/file-id");
                    const dragName = e.dataTransfer.getData("text/file-name");
                    if (!dragId || !dragName) return;
                    const targetFolder = currentPath ? `${currentPath}/${entry.name}` : entry.name;
                    const baseName = splitVirtualName(dragName).base;
                    const newName = joinVirtualName(targetFolder, baseName);
                    const f = (await listFiles()).find(x => x.handle.id === dragId);
                    if (f) {
                        await f.rename(newName);
                        renameFileInCache(dragId, newName);
                        await loadFilesToTable(false);
                    }
                });

                const locks = await getFolderLocks();
                const isLocked = !!locks[entry.name];
                const isUnlocked = isLocked && cachedFolderPassphrases.has(entry.name);

                const tdSelect = document.createElement("td");
                tdSelect.style.textAlign = "center";
                const cb = document.createElement("input");
                cb.type = "checkbox";
                cb.className = "row-select";
                cb.dataset.type = "folder";
                cb.dataset.id = entry.name;
                cb.onchange = () => updateBulkBar();
                tdSelect.appendChild(cb);
                tr.appendChild(tdSelect);

                const tdPreview = document.createElement("td");
                const icon = document.createElement("img");
                icon.src = isLocked ? placeholderDataUrl(isUnlocked ? "🔓" : "🔒", isUnlocked ? "#2b3c4d" : "#5c2b2b") : placeholderDataUrl("DIR", "#2b4d2b");
                icon.style.width = "100px";
                icon.style.height = "100px";
                icon.style.objectFit = "cover";
                if (isLocked && !isUnlocked) {
                    icon.style.filter = "blur(4px)";
                }
                tdPreview.appendChild(icon);

                const tdName = document.createElement("td");
                const btn = document.createElement("button");
                btn.className = "button";
                btn.textContent = isLocked ? (isUnlocked ? `🔓 [Unlocked] ${entry.name}` : `🔒 [Locked Folder]`) : `[Folder] ${entry.name}`;
                if (isLocked && !isUnlocked) {
                    btn.style.fontStyle = "italic";
                    btn.style.color = "var(--text-secondary)";
                }
                btn.onclick = async() => {
                    if (isLocked && !isUnlocked) {
                        const pass = prompt(`Folder "${entry.name}" is locked. Enter password to unlock:`);
                        if (!pass) return;
                        const ok = await unlockFolder(entry.name, pass);
                        if (!ok) {
                            alert("Incorrect password!");
                            return;
                        }
                    }
                    currentPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
                    currentPage = 1;
                    await loadFilesToTable();
                };
                tdName.appendChild(btn);

                const tdType = document.createElement("td");
                tdType.textContent = "Folder";
                tdType.style.color = "var(--text-secondary)";
                tdType.style.fontWeight = "500";

                const tdSize = document.createElement("td");
                tdSize.textContent = "-";
                tdSize.className = "cell-empty";

                const tdDate = document.createElement("td");
                tdDate.textContent = "-";
                tdDate.className = "cell-empty";

                const tdDl = document.createElement("td");
                tdDl.style.textAlign = "center";
                const dlBtn = document.createElement("button");
                dlBtn.className = "button icon-button";
                dlBtn.innerHTML = "📥";
                dlBtn.title = "Download folder as ZIP";
                dlBtn.onclick = async (e) => {
                    e.stopPropagation();
                    await downloadFolderAsZip(entry.name);
                };
                tdDl.appendChild(dlBtn);

                const tdClip = document.createElement("td");
                tdClip.textContent = "-";
                tdClip.className = "cell-empty";

                const tdShare = document.createElement("td");
                tdShare.style.textAlign = "center";
                const lockBtn = document.createElement("button");
                lockBtn.className = "button icon-button";
                lockBtn.innerHTML = isLocked ? "🔒" : "🔓";
                lockBtn.title = isLocked 
                    ? (isUnlocked ? "Lock this folder again (Re-lock)" : "Unlock this folder") 
                    : "Lock folder with password";
                lockBtn.onclick = async (e) => {
                    e.stopPropagation();
                    if (isLocked) {
                        if (isUnlocked) {
                            cachedFolderPassphrases.delete(entry.name);
                            alert(`Folder "${entry.name}" is now locked.`);
                            await loadFilesToTable();
                        } else {
                            const pass = prompt(`Enter password to unlock folder "${entry.name}":`);
                            if (!pass) return;
                            const ok = await unlockFolder(entry.name, pass);
                            if (ok) {
                                alert("Folder unlocked!");
                                await loadFilesToTable();
                            } else {
                                alert("Incorrect password!");
                            }
                        }
                    } else {
                        const pass = prompt(`Enter password to lock folder "${entry.name}":`);
                        if (!pass) return;
                        await lockFolder(entry.name, pass);
                        alert(`Folder "${entry.name}" is now locked!`);
                        await loadFilesToTable();
                    }
                };
                tdShare.appendChild(lockBtn);

                const tdRen = document.createElement("td");
                tdRen.style.textAlign = "center";
                const renBtn = document.createElement("button");
                renBtn.className = "button icon-button";
                renBtn.innerHTML = "✏️";
                renBtn.title = "Rename folder";
                renBtn.onclick = async (e) => {
                    e.stopPropagation();
                    const next = prompt("Rename folder to:", entry.name);
                    if (!next || next === entry.name) return;
                    const userNewName = normalizeVirtualPath(next);
                    await renameFolder(entry.name, userNewName);
                    await loadFilesToTable();
                };
                tdRen.appendChild(renBtn);

                const tdDel = document.createElement("td");
                tdDel.style.textAlign = "center";
                const delBtn = document.createElement("button");
                delBtn.className = "button icon-button";
                delBtn.innerHTML = "🗑️";
                delBtn.title = "Delete folder";
                delBtn.onclick = async (e) => {
                    e.stopPropagation();
                    const ok = await deleteFolder(entry.name);
                    if (ok) {
                        await loadFilesToTable();
                    }
                };
                tdDel.appendChild(delBtn);

                tr.appendChild(tdPreview);
                tr.appendChild(tdName);
                tr.appendChild(tdType);
                tr.appendChild(tdSize);
                tr.appendChild(tdDate);
                tr.appendChild(tdDl);
                tr.appendChild(tdClip);
                tr.appendChild(tdShare);
                tr.appendChild(tdRen);
                tr.appendChild(tdDel);
                tbody.appendChild(tr);
                continue;
            }

            const file = entry.file;
            const meta = await file.readMeta();
            const name = entry.displayName;

            // Make file row draggable
            tr.setAttribute("draggable", "true");
            tr.style.cursor = "grab";
            tr.addEventListener("dragstart", (e) => {
                e.dataTransfer.setData("text/file-id", file.handle.id);
                e.dataTransfer.setData("text/file-name", file.handle.title);
                tr.style.opacity = "0.5";
            });
            tr.addEventListener("dragend", () => { tr.style.opacity = "1"; });

            const tdSelect = document.createElement("td");
            tdSelect.style.textAlign = "center";
            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.className = "row-select";
            cb.dataset.type = "file";
            cb.dataset.id = file.handle.id;
            cb.onchange = () => updateBulkBar();
            tdSelect.appendChild(cb);
            tr.appendChild(tdSelect);

            const tdPreview = document.createElement("td");
            const img = document.createElement("img");
            img.style.width = "100px";
            img.style.height = "100px";
            img.style.objectFit = "cover";
            img.style.cursor = "pointer";
            img.alt = name;
            tdPreview.appendChild(img);

            const cachedThumb = thumbnailCache.get(file.handle.id);
            if (cachedThumb) {
                img.src = cachedThumb;
            } else {
                try {
                    if (meta && meta.encrypted) {
                        img.src = placeholderDataUrl("SECURE", "#5c2b2b");
                    } else {
                        const raw = await file.read();
                        if (!raw || raw.length < 2) {
                            img.src = placeholderDataUrl("FILE");
                        } else {
                            const localMeta = await file.readMeta();
                            let bytes;
                            let mime = "";
                            try {
                                const reconstructed = await reconstructBytesFromSerialized(raw, localMeta || meta);
                                bytes = reconstructed.bytes;
                                mime = reconstructed.mime;
                            } catch {
                                const tag = raw[0];
                                const payload = raw.slice(1);
                                bytes = b64decodeToBytes(payload);
                                if (tag === "c") bytes = gunzipSync(bytes);
                                mime = (localMeta && localMeta.type) || (meta && meta.type) || "";
                            }
                            if (!mime || mime === "application/octet-stream") {
                                mime = getMimeType(name);
                                if (!mime || mime === "application/octet-stream") mime = sniffMimeFromBytes(bytes) || "application/octet-stream";
                            }
                            if (mime.startsWith("image/")) {
                                img.src = dataURLFromParts(`data:${mime};base64`, bytes);
                            } else if (mime.startsWith("text/") || mime === "application/json" || mime === "application/xml") {
                                let previewText = "";
                                try {
                                    previewText = td.decode(bytes);
                                } catch {
                                    previewText = "";
                                }
                                img.src = textPreviewDataUrl(previewText);
                            } else if (mime.startsWith("video/")) {
                                img.src = placeholderDataUrl("VIDEO", "#3b2a49");
                            } else if (mime.startsWith("audio/")) {
                                img.src = placeholderDataUrl("AUDIO", "#214a3a");
                            } else {
                                const ext = (name.split(".").pop() || "").toUpperCase().slice(0, 8);
                                const label = ext || (mime.split("/")[1] || "FILE").toUpperCase().slice(0, 8);
                                img.src = placeholderDataUrl(label);
                            }
                        }
                    }
                } catch {
                    img.src = placeholderDataUrl("FILE");
                }
                thumbnailCache.set(file.handle.id, img.src);
            }

            img.onclick = async() => {
                try {
                    const raw = await file.read();
                    const localMeta = await file.readMeta();
                    const m = localMeta || meta || {};
                    const reconstructed = await reconstructBytesFromSerialized(raw, m);
                    const bytes = reconstructed.bytes;
                    const type = reconstructed.mime || m.type || getMimeType(name) || "application/octet-stream";
                    let objectUrl = "";

                    let isSession = false;
                    let parsedSession = null;
                    if (type === "application/json" || name.endsWith(".json")) {
                        try {
                            const txt = td.decode(bytes);
                            const parsed = JSON.parse(txt);
                            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].url) {
                                isSession = true;
                                parsedSession = parsed;
                            }
                        } catch {}
                    }

                    const popup = document.createElement("div");
                    popup.id = "preview-modal";
                    popup.style.position = "fixed";
                    popup.style.inset = "0";
                    popup.style.background = "rgba(10, 10, 10, 0.85)";
                    popup.style.backdropFilter = "blur(8px)";
                    popup.style.display = "flex";
                    popup.style.flexDirection = "column";
                    popup.style.alignItems = "center";
                    popup.style.justifyContent = "center";
                    popup.style.zIndex = "99999";

                    const inner = document.createElement("div");
                    inner.style.width = "min(850px, 92%)";
                    inner.style.maxHeight = "85vh";
                    inner.style.background = "#18181b";
                    inner.style.border = "1px solid #27272a";
                    inner.style.color = "#f4f4f5";
                    inner.style.borderRadius = "12px";
                    inner.style.display = "flex";
                    inner.style.flexDirection = "column";
                    inner.style.position = "relative";
                    inner.style.boxShadow = "0 20px 25px -5px rgba(0,0,0,0.5), 0 10px 10px -5px rgba(0,0,0,0.5)";
                    inner.onclick = (ev) => ev.stopPropagation();

                    // Header
                    const header = document.createElement("div");
                    header.style.display = "flex";
                    header.style.justifyContent = "space-between";
                    header.style.alignItems = "center";
                    header.style.padding = "12px 18px";
                    header.style.borderBottom = "1px solid #27272a";

                    const titleSpan = document.createElement("span");
                    titleSpan.style.fontWeight = "600";
                    titleSpan.style.fontSize = "16px";
                    titleSpan.style.color = "#02ff88";
                    titleSpan.textContent = `Preview: ${name}`;

                    const closeBtn = document.createElement("button");
                    closeBtn.innerHTML = "&times;";
                    closeBtn.style.background = "none";
                    closeBtn.style.border = "none";
                    closeBtn.style.color = "#a1a1aa";
                    closeBtn.style.fontSize = "24px";
                    closeBtn.style.cursor = "pointer";
                    closeBtn.style.lineHeight = "1";
                    closeBtn.style.padding = "0 4px";
                    closeBtn.onclick = () => {
                        popup.remove();
                        if (objectUrl) URL.revokeObjectURL(objectUrl);
                    };

                    // Header Left container
                    const headerLeft = document.createElement("div");
                    headerLeft.style.display = "flex";
                    headerLeft.style.alignItems = "center";
                    headerLeft.style.gap = "12px";
                    headerLeft.appendChild(titleSpan);

                    // Add tags label to header if present
                    if (Array.isArray(m.tags) && m.tags.length > 0) {
                        const tagsLabel = document.createElement("span");
                        tagsLabel.style.fontSize = "11px";
                        tagsLabel.style.background = "#27272a";
                        tagsLabel.style.color = "#a1a1aa";
                        tagsLabel.style.padding = "2px 6px";
                        tagsLabel.style.borderRadius = "4px";
                        tagsLabel.style.border = "1px solid #3f3f46";
                        tagsLabel.textContent = `Tags: ${m.tags.join(", ")}`;
                        headerLeft.appendChild(tagsLabel);
                    }

                    // Header Right buttons container
                    const btnContainer = document.createElement("div");
                    btnContainer.style.display = "flex";
                    btnContainer.style.gap = "8px";
                    btnContainer.style.alignItems = "center";

                    const shareBtn = document.createElement("button");
                    shareBtn.className = "button";
                    shareBtn.textContent = "🔗 Share";
                    shareBtn.style.padding = "4px 8px";
                    shareBtn.style.fontSize = "12px";
                    shareBtn.onclick = async () => {
                        try {
                            const raw = await file.read();
                            const sharePackage = {
                                type: "bookmarkfs-share",
                                version: 3,
                                name: name,
                                meta: m,
                                serialized: raw
                            };
                            const base64Str = btoa(JSON.stringify(sharePackage));
                            await navigator.clipboard.writeText(base64Str);
                            alert("Shareable Base64 string copied to clipboard!");
                        } catch (err) {
                            alert("Share failed: " + err.message);
                        }
                    };
                    btnContainer.appendChild(shareBtn);

                    const openBtn = document.createElement("button");
                    openBtn.className = "button";
                    openBtn.textContent = "↗️ Open";
                    openBtn.style.padding = "4px 8px";
                    openBtn.style.fontSize = "12px";
                    openBtn.onclick = () => {
                        if (objectUrl) {
                            window.open(objectUrl, "_blank");
                        } else {
                            const blob = new Blob([bytes], { type });
                            const tempUrl = URL.createObjectURL(blob);
                            window.open(tempUrl, "_blank");
                        }
                    };
                    btnContainer.appendChild(openBtn);

                    const ext = (name.split(".").pop() || "").toLowerCase();
                    const isImage = type.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "ico"].includes(ext);
                    const isMedia = isImage || type.startsWith("video/") || type.startsWith("audio/") ||
                                    ["mp4", "webm", "ogg", "mov", "avi", "mp3", "wav", "flac", "aac", "m4a"].includes(ext);
                    const isText = (type.startsWith("text/") || ["application/json", "application/xml", "application/javascript"].includes(type) ||
                                    ["js", "ts", "json", "md", "txt", "html", "css", "py", "sh", "yaml", "yml"].includes(ext)) && !isMedia;
                    
                    let editorActive = false;
                    let originalContentAreaHtml = "";

                    const editBtn = document.createElement("button");
                    editBtn.className = "button";
                    editBtn.textContent = "✏️ Edit";
                    editBtn.style.padding = "4px 8px";
                    editBtn.style.fontSize = "12px";
                    editBtn.style.display = (isText || isImage) ? "inline-block" : "none";

                    async function openInImageEditor(imgName, imgBytes, imgMime) {
                        try {
                            editBtn.textContent = "Loading Editor...";
                            editBtn.disabled = true;

                            const imageFilename = "capture_" + Date.now() + "_" + Math.floor(Math.random() * 1000) + ".png";
                            const captureObj = {
                                domain: "bookmarkfs",
                                time: new Date().toISOString(),
                                format: "png",
                                images: [ imageFilename ],
                                sizes: [ imgBytes.length ],
                                scaleMultiplier: 1,
                                url: window.location.href,
                                title: imgName
                            };

                            // Save capture metadata to Dexie db "Test4"
                            const id = await new Promise((resolve, reject) => {
                                const request = indexedDB.open("Test4");
                                request.onupgradeneeded = (e) => {
                                    const db = e.target.result;
                                    if (!db.objectStoreNames.contains("captures")) {
                                        db.createObjectStore("captures", { keyPath: "id", autoIncrement: true });
                                    }
                                };
                                request.onsuccess = (e) => {
                                    const db = e.target.result;
                                    const transaction = db.transaction(["captures"], "readwrite");
                                    const store = transaction.objectStore("captures");
                                    const addReq = store.add(captureObj);
                                    addReq.onsuccess = (ev) => resolve(ev.target.result);
                                    addReq.onerror = (ev) => reject(ev.target.error || new Error("Failed to add capture"));
                                };
                                request.onerror = (e) => reject(e.target.error || new Error("Failed to open IndexedDB"));
                            });

                            // Convert bytes to base64 DataURL
                            const base64 = b64encodeBytes(imgBytes);
                            const dataUrl = `data:${imgMime};base64,${base64}`;

                            // Cache in chrome.storage.local
                            const storageKey = "temp_capture_file_" + imageFilename;
                            await chrome.storage.local.set({ [storageKey]: dataUrl });

                            // Open in a new tab instead of the sidebar
                            chrome.tabs.create({ url: `/dist/editor.html?id=${id}` });
                            editBtn.textContent = "✏️ Edit";
                            editBtn.disabled = false;
                        } catch (err) {
                            alert("Failed to open image editor: " + err.message);
                            editBtn.textContent = "✏️ Edit";
                            editBtn.disabled = false;
                        }
                    }

                    const saveBtn = document.createElement("button");
                    saveBtn.className = "button";
                    saveBtn.textContent = "💾 Save";
                    saveBtn.style.padding = "4px 8px";
                    saveBtn.style.fontSize = "12px";
                    saveBtn.style.display = "none";
                    saveBtn.style.borderColor = "#02ff88";
                    saveBtn.style.color = "#02ff88";

                    const cancelEditBtn = document.createElement("button");
                    cancelEditBtn.className = "button";
                    cancelEditBtn.textContent = "Cancel";
                    cancelEditBtn.style.padding = "4px 8px";
                    cancelEditBtn.style.fontSize = "12px";
                    cancelEditBtn.style.display = "none";

                    editBtn.onclick = () => {
                        if (isImage) {
                            openInImageEditor(name, bytes, type || getMimeType(name) || "image/png");
                            return;
                        }
                        editorActive = true;
                        editBtn.style.display = "none";
                        shareBtn.style.display = "none";
                        saveBtn.style.display = "inline-block";
                        cancelEditBtn.style.display = "inline-block";

                        originalContentAreaHtml = contentArea.innerHTML;
                        contentArea.innerHTML = "";
                        contentArea.style.alignItems = "stretch";

                        let rawText = "";
                        try {
                            rawText = td.decode(bytes);
                        } catch {
                            rawText = "";
                        }

                        const labelText = document.createElement("label");
                        labelText.style.fontSize = "12px";
                        labelText.style.color = "#a1a1aa";
                        labelText.style.marginBottom = "4px";
                        labelText.textContent = "Edit File Content:";

                        const textarea = document.createElement("textarea");
                        textarea.id = "editor-textarea";
                        textarea.value = rawText;
                        textarea.style.flex = "1";
                        textarea.style.minHeight = "250px";
                        textarea.style.background = "#09090b";
                        textarea.style.color = "#f4f4f5";
                        textarea.style.border = "1px solid #27272a";
                        textarea.style.borderRadius = "6px";
                        textarea.style.padding = "12px";
                        textarea.style.fontFamily = "monospace";
                        textarea.style.fontSize = "13px";
                        textarea.style.resize = "vertical";

                        const labelTags = document.createElement("label");
                        labelTags.style.fontSize = "12px";
                        labelTags.style.color = "#a1a1aa";
                        labelTags.style.marginTop = "12px";
                        labelTags.style.marginBottom = "4px";
                        labelTags.textContent = "Tags (comma separated):";

                        const tagsInput = document.createElement("input");
                        tagsInput.id = "editor-tags";
                        tagsInput.type = "text";
                        tagsInput.value = Array.isArray(m.tags) ? m.tags.join(", ") : "";
                        tagsInput.style.background = "#09090b";
                        tagsInput.style.color = "#f4f4f5";
                        tagsInput.style.border = "1px solid #27272a";
                        tagsInput.style.borderRadius = "6px";
                        tagsInput.style.padding = "8px 12px";
                        tagsInput.style.fontSize = "13px";

                        contentArea.appendChild(labelText);
                        contentArea.appendChild(textarea);
                        contentArea.appendChild(labelTags);
                        contentArea.appendChild(tagsInput);
                        textarea.focus();
                    };

                    cancelEditBtn.onclick = () => {
                        editorActive = false;
                        editBtn.style.display = "inline-block";
                        shareBtn.style.display = "inline-block";
                        saveBtn.style.display = "none";
                        cancelEditBtn.style.display = "none";
                        contentArea.innerHTML = originalContentAreaHtml;
                        contentArea.style.alignItems = "center";
                    };

                    saveBtn.onclick = async () => {
                        const textarea = qs("#editor-textarea");
                        const tagsInput = qs("#editor-tags");
                        if (!textarea) return;

                        const newText = textarea.value;
                        const parsedTags = tagsInput ? tagsInput.value.split(",").map(t => t.trim()).filter(Boolean) : [];

                        const originalBytes = te.encode(newText);
                        let processed = originalBytes;
                        
                        if (m.compressed) {
                            if (typeof window !== "undefined" && window.fflate && typeof window.fflate.gzipSync === "function") {
                                processed = window.fflate.gzipSync(originalBytes);
                            } else {
                                processed = gzipSync(originalBytes);
                            }
                        }

                        let encrypted = m.encrypted;
                        let encInfo = m.enc;
                        if (encrypted) {
                            let pass = cachedSessionPassphrase;
                            if (!pass) {
                                pass = await new Promise((resolve) => {
                                    showEncryptDecryptModal("Enter Passphrase to Encrypt", false, (typedPass) => {
                                        resolve(typedPass || "");
                                    });
                                });
                                if (!pass) {
                                    alert("Passphrase required to encrypt file.");
                                    return;
                                }
                                cachedSessionPassphrase = pass;
                            }
                            const { ct, salt, iv } = await encryptBytes(processed, pass);
                            processed = ct;
                            encInfo = { salt: b64encodeBytes(salt), iv: b64encodeBytes(iv) };
                        }

                        const tag = m.compressed ? "c" : "r";
                        const serialized = tag + b64encodeBytes(processed);
                        
                        m.sizeOriginal = originalBytes.length;
                        m.sizeStored = te.encode(serialized).length;
                        m.ratio = m.sizeStored / Math.max(1, originalBytes.length);
                        m.dateISO = new Date().toISOString();
                        m.tags = parsedTags;
                        if (encrypted) m.enc = encInfo;
                        m.chunkHashes = [];

                        m.contentHash = await sha256HexBytes(originalBytes);

                        try {
                            saveBtn.textContent = "Saving...";
                            saveBtn.disabled = true;
                            
                            await file.writeMeta(m);
                            await file.write(serialized, setProgress);

                            popup.remove();
                            alert("File saved successfully!");
                            await loadFilesToTable();
                        } catch (err) {
                            alert("Save failed: " + err.message);
                        } finally {
                            saveBtn.textContent = "💾 Save";
                            saveBtn.disabled = false;
                        }
                    };

                    btnContainer.appendChild(editBtn);
                    btnContainer.appendChild(saveBtn);
                    btnContainer.appendChild(cancelEditBtn);

                    const rightContainer = document.createElement("div");
                    rightContainer.style.display = "flex";
                    rightContainer.style.alignItems = "center";
                    rightContainer.style.gap = "12px";
                    rightContainer.appendChild(btnContainer);
                    rightContainer.appendChild(closeBtn);

                    header.appendChild(headerLeft);
                    header.appendChild(rightContainer);
                    inner.appendChild(header);

                    const contentArea = document.createElement("div");
                    contentArea.style.padding = "20px";
                    contentArea.style.overflow = "auto";
                    contentArea.style.flex = "1";
                    contentArea.style.display = "flex";
                    contentArea.style.flexDirection = "column";
                    contentArea.style.justifyContent = "center";
                    contentArea.style.alignItems = "center";

                    if (type === "application/zip" || name.endsWith(".zip")) {
                        try {
                            const files = unzipSync(bytes);
                            const fileNames = Object.keys(files);
                            if (fileNames.length === 0) {
                                contentArea.innerHTML = "<p style='color:#a1a1aa;'>Empty ZIP Archive.</p>";
                            } else {
                                const table = document.createElement("table");
                                table.style.width = "100%";
                                table.style.borderCollapse = "collapse";
                                table.style.textAlign = "left";
                                table.style.fontSize = "13px";

                                table.innerHTML = `
                                    <thead>
                                        <tr style="border-bottom: 2px solid #27272a; color:#a1a1aa;">
                                            <th style="padding: 8px;">File Path</th>
                                            <th style="padding: 8px; text-align:right;">Size</th>
                                            <th style="padding: 8px; text-align:center;">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody></tbody>
                                `;

                                const tbody = table.querySelector("tbody");
                                fileNames.forEach(innerName => {
                                    const fileData = files[innerName];
                                    const isDir = innerName.endsWith("/");
                                    const tr = document.createElement("tr");
                                    tr.style.borderBottom = "1px solid #27272a";

                                    const tdName = document.createElement("td");
                                    tdName.style.padding = "8px";
                                    tdName.style.fontFamily = "monospace";
                                    tdName.textContent = innerName;

                                    const tdSize = document.createElement("td");
                                    tdSize.style.padding = "8px";
                                    tdSize.style.textAlign = "right";
                                    tdSize.textContent = isDir ? "-" : niceBytes(fileData.length);

                                    const tdAction = document.createElement("td");
                                    tdAction.style.padding = "8px";
                                    tdAction.style.textAlign = "center";

                                    if (!isDir) {
                                        const dlBtn = document.createElement("button");
                                        dlBtn.className = "button";
                                        dlBtn.textContent = "Download";
                                        dlBtn.style.padding = "4px 8px";
                                        dlBtn.style.fontSize = "11px";
                                        dlBtn.onclick = () => {
                                            const innerMime = getMimeType(innerName);
                                            const blob = new Blob([fileData], { type: innerMime });
                                            const blobUrl = URL.createObjectURL(blob);
                                            const a = document.createElement("a");
                                            a.href = blobUrl;
                                            a.download = innerName.split("/").pop();
                                            document.body.appendChild(a);
                                            a.click();
                                            a.remove();
                                            URL.revokeObjectURL(blobUrl);
                                        };
                                        tdAction.appendChild(dlBtn);
                                    } else {
                                        tdAction.textContent = "-";
                                    }

                                    tr.appendChild(tdName);
                                    tr.appendChild(tdSize);
                                    tr.appendChild(tdAction);
                                    tbody.appendChild(tr);
                                });

                                contentArea.appendChild(table);
                                contentArea.style.alignItems = "stretch";
                            }
                        } catch (err) {
                            contentArea.innerHTML = `<p style='color:#ef4444;'>Failed to parse ZIP file: ${err.message}</p>`;
                        }
                    } else if (type === "application/vnd.rar" || type === "application/x-rar-compressed" || name.endsWith(".rar")) {
                        try {
                            contentArea.innerHTML = "<p style='color:#a1a1aa;'>Loading RAR extractor (sandbox)...</p>";
                            
                            const result = await callSandbox({
                                type: "unrar-list",
                                bytes: bytes
                            });
                            
                            const headers = result.files;
                            contentArea.innerHTML = "";

                            if (!headers || headers.length === 0) {
                                contentArea.innerHTML = "<p style='color:#a1a1aa;'>Empty RAR Archive.</p>";
                            } else {
                                const table = document.createElement("table");
                                table.style.width = "100%";
                                table.style.borderCollapse = "collapse";
                                table.style.textAlign = "left";
                                table.style.fontSize = "13px";

                                table.innerHTML = `
                                    <thead>
                                        <tr style="border-bottom: 2px solid #27272a; color:#a1a1aa;">
                                            <th style="padding: 8px;">File Path</th>
                                            <th style="padding: 8px; text-align:right;">Size</th>
                                            <th style="padding: 8px; text-align:center;">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody></tbody>
                                `;

                                const tbody = table.querySelector("tbody");
                                headers.forEach(header => {
                                    const isDir = header.directory;
                                    const tr = document.createElement("tr");
                                    tr.style.borderBottom = "1px solid #27272a";

                                    const tdName = document.createElement("td");
                                    tdName.style.padding = "8px";
                                    tdName.style.fontFamily = "monospace";
                                    tdName.textContent = header.name;

                                    const tdSize = document.createElement("td");
                                    tdSize.style.padding = "8px";
                                    tdSize.style.textAlign = "right";
                                    tdSize.textContent = isDir ? "-" : niceBytes(header.unpSize);

                                    const tdAction = document.createElement("td");
                                    tdAction.style.padding = "8px";
                                    tdAction.style.textAlign = "center";

                                    if (!isDir) {
                                        const dlBtn = document.createElement("button");
                                        dlBtn.className = "button";
                                        dlBtn.textContent = "Download";
                                        dlBtn.style.padding = "4px 8px";
                                        dlBtn.style.fontSize = "11px";
                                        dlBtn.onclick = async () => {
                                            try {
                                                dlBtn.textContent = "Extracting...";
                                                dlBtn.disabled = true;
                                                
                                                const extractResult = await callSandbox({
                                                    type: "unrar-extract",
                                                    bytes: bytes,
                                                    fileName: header.name
                                                });
                                                
                                                const innerMime = getMimeType(header.name);
                                                const blob = new Blob([extractResult.content], { type: innerMime });
                                                const blobUrl = URL.createObjectURL(blob);
                                                const a = document.createElement("a");
                                                a.href = blobUrl;
                                                a.download = header.name.split("/").pop();
                                                document.body.appendChild(a);
                                                a.click();
                                                a.remove();
                                                URL.revokeObjectURL(blobUrl);
                                            } catch (err) {
                                                alert("Extraction failed: " + err.message);
                                            } finally {
                                                dlBtn.textContent = "Download";
                                                dlBtn.disabled = false;
                                            }
                                        };
                                        tdAction.appendChild(dlBtn);
                                    } else {
                                        tdAction.textContent = "-";
                                    }

                                    tr.appendChild(tdName);
                                    tr.appendChild(tdSize);
                                    tr.appendChild(tdAction);
                                    tbody.appendChild(tr);
                                });

                                contentArea.appendChild(table);
                                contentArea.style.alignItems = "stretch";
                            }
                        } catch (err) {
                            contentArea.innerHTML = `<p style='color:#ef4444;'>Failed to parse RAR file: ${err.message}</p>`;
                        }
                    } else if (type === "application/pdf" || name.endsWith(".pdf")) {
                        const iframe = document.createElement("iframe");
                        objectUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
                        iframe.src = objectUrl;
                        iframe.style.width = "100%";
                        iframe.style.height = "70vh";
                        iframe.style.border = "none";
                        iframe.style.borderRadius = "6px";
                        contentArea.appendChild(iframe);
                        contentArea.style.alignItems = "stretch";
                    } else if (isSession) {
                        const wrapper = document.createElement("div");
                        wrapper.style.width = "100%";
                        wrapper.style.display = "flex";
                        wrapper.style.flexDirection = "column";
                        wrapper.style.gap = "12px";
                        wrapper.style.textAlign = "left";

                        const titleSpan = document.createElement("h3");
                        titleSpan.style.margin = "0 0 6px 0";
                        titleSpan.style.color = "#02ff88";
                        titleSpan.style.fontSize = "16px";
                        titleSpan.textContent = `📋 Browser Session (${parsedSession.length} tabs)`;
                        wrapper.appendChild(titleSpan);

                        const list = document.createElement("div");
                        list.style.maxHeight = "45vh";
                        list.style.overflowY = "auto";
                        list.style.display = "flex";
                        list.style.flexDirection = "column";
                        list.style.gap = "8px";
                        list.style.padding = "4px";

                        parsedSession.forEach(tab => {
                            const item = document.createElement("div");
                            item.style.padding = "10px";
                            item.style.border = "1px solid #27272a";
                            item.style.borderRadius = "8px";
                            item.style.background = "#18181b";
                            item.style.display = "flex";
                            item.style.flexDirection = "column";
                            item.style.gap = "4px";
                            
                            const link = document.createElement("a");
                            link.href = tab.url;
                            link.target = "_blank";
                            link.textContent = tab.title || tab.url;
                            link.style.color = "#02ff88";
                            link.style.textDecoration = "none";
                            link.style.fontWeight = "600";
                            link.style.fontSize = "13px";
                            link.onmouseover = () => link.style.textDecoration = "underline";
                            link.onmouseout = () => link.style.textDecoration = "none";
                            
                            const urlDiv = document.createElement("div");
                            urlDiv.textContent = tab.url;
                            urlDiv.style.fontSize = "11px";
                            urlDiv.style.color = "#a1a1aa";
                            urlDiv.style.wordBreak = "break-all";

                            item.appendChild(link);
                            item.appendChild(urlDiv);
                            list.appendChild(item);
                        });
                        wrapper.appendChild(list);

                        // Actions row container
                        const actionsRow = document.createElement("div");
                        actionsRow.style.display = "flex";
                        actionsRow.style.flexWrap = "wrap";
                        actionsRow.style.gap = "8px";
                        actionsRow.style.marginTop = "8px";

                        // Restore session button
                        const restoreBtn = document.createElement("button");
                        restoreBtn.className = "button";
                        restoreBtn.textContent = "🚀 Restore All Tabs";
                        restoreBtn.onclick = async () => {
                            for (const tab of parsedSession) {
                                if (tab.url) chrome.tabs.create({ url: tab.url, active: false });
                            }
                            alert(`Restored ${parsedSession.length} tabs in background!`);
                        };
                        actionsRow.appendChild(restoreBtn);

                        // Restore in New Window button
                        const newWinBtn = document.createElement("button");
                        newWinBtn.className = "button";
                        newWinBtn.textContent = "🗔 New Window";
                        newWinBtn.onclick = async () => {
                            const urls = parsedSession.map(t => t.url).filter(Boolean);
                            if (urls.length === 0) return;
                            await chrome.windows.create({ url: urls });
                            alert(`Restored ${parsedSession.length} tabs in a new window!`);
                        };
                        actionsRow.appendChild(newWinBtn);

                        // Restore in Tab Group button
                        const tabGroupBtn = document.createElement("button");
                        tabGroupBtn.className = "button";
                        tabGroupBtn.textContent = "🏷️ Tab Group";
                        tabGroupBtn.onclick = async () => {
                            const tabIds = [];
                            for (const tab of parsedSession) {
                                if (tab.url) {
                                    const created = await chrome.tabs.create({ url: tab.url, active: false });
                                    tabIds.push(created.id);
                                }
                            }
                            if (tabIds.length > 0) {
                                const groupId = await chrome.tabs.group({ tabIds: tabIds });
                                if (chrome.tabGroups) {
                                    await chrome.tabGroups.update(groupId, { title: "Restored Session", color: "green" });
                                }
                            }
                            alert(`Restored ${parsedSession.length} tabs inside a new Tab Group!`);
                        };
                        actionsRow.appendChild(tabGroupBtn);

                        wrapper.appendChild(actionsRow);

                        contentArea.appendChild(wrapper);
                        contentArea.style.alignItems = "stretch";
                    } else if (type === "text/markdown" || name.endsWith(".md")) {
                        const div = document.createElement("div");
                        div.style.width = "100%";
                        div.style.color = "#e4e4e7";
                        div.style.fontFamily = "system-ui, -apple-system, sans-serif";
                        div.style.textAlign = "left";
                        div.style.lineHeight = "1.6";
                        div.style.padding = "0 10px";

                        let mdText = "";
                        try {
                            mdText = td.decode(bytes);
                        } catch {
                            mdText = "";
                        }
                        div.innerHTML = renderMarkdown(mdText);
                        contentArea.appendChild(div);
                        contentArea.style.alignItems = "stretch";
                    } else if (
                        type.startsWith("text/") || 
                        type === "application/json" || 
                        type === "application/xml" || 
                        type === "application/javascript" ||
                        ["js", "ts", "jsx", "tsx", "py", "sh", "yml", "yaml", "c", "cpp", "h", "hpp", "cs", "go", "rs", "java", "sql", "bat", "ps1", "ini", "conf"].includes(name.split('.').pop().toLowerCase())
                    ) {
                        const container = document.createElement("div");
                        container.style.width = "100%";
                        container.style.overflow = "hidden";
                        
                        let codeText = "";
                        try {
                            codeText = td.decode(bytes);
                        } catch {
                            codeText = "";
                        }
                        const ext = name.split('.').pop().toLowerCase();
                        container.innerHTML = highlightCode(codeText, ext);
                        contentArea.appendChild(container);
                        contentArea.style.alignItems = "stretch";
                    } else if (type.startsWith("image/")) {
                        const imgEl = document.createElement("img");
                        objectUrl = URL.createObjectURL(new Blob([bytes], { type }));
                        imgEl.src = objectUrl;
                        imgEl.style.maxWidth = "100%";
                        imgEl.style.maxHeight = "70vh";
                        imgEl.style.borderRadius = "6px";
                        imgEl.style.boxShadow = "0 4px 12px rgba(0,0,0,0.5)";
                        imgEl.style.transition = "width 0.15s ease-out, height 0.15s ease-out";
                        imgEl.draggable = false;
                        imgEl.addEventListener("mousedown", (e) => e.preventDefault());

                        let zoomLevel = 1.0;
                        let isFit = true;

                        // Create Zoom Control Overlay Toolbar
                        const zoomToolbar = document.createElement("div");
                        zoomToolbar.style.position = "absolute";
                        zoomToolbar.style.bottom = "20px";
                        zoomToolbar.style.left = "50%";
                        zoomToolbar.style.transform = "translateX(-50%)";
                        zoomToolbar.style.display = "flex";
                        zoomToolbar.style.alignItems = "center";
                        zoomToolbar.style.gap = "8px";
                        zoomToolbar.style.background = "rgba(24, 24, 27, 0.85)";
                        zoomToolbar.style.backdropFilter = "blur(12px)";
                        zoomToolbar.style.border = "1px solid #3f3f46";
                        zoomToolbar.style.borderRadius = "9999px";
                        zoomToolbar.style.padding = "6px 12px";
                        zoomToolbar.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.5)";
                        zoomToolbar.style.zIndex = "10000";

                        const minusBtn = document.createElement("button");
                        minusBtn.textContent = "➖";
                        minusBtn.title = "Zoom Out";
                        minusBtn.onclick = () => {
                            isFit = false;
                            zoomLevel = Math.max(0.1, zoomLevel - 0.25);
                            updateZoom();
                        };

                        const zoomPercent = document.createElement("span");
                        zoomPercent.style.color = "#f4f4f5";
                        zoomPercent.style.fontSize = "12px";
                        zoomPercent.style.fontWeight = "600";
                        zoomPercent.style.minWidth = "50px";
                        zoomPercent.style.textAlign = "center";
                        zoomPercent.style.userSelect = "none";

                        const plusBtn = document.createElement("button");
                        plusBtn.textContent = "➕";
                        plusBtn.title = "Zoom In";
                        plusBtn.onclick = () => {
                            isFit = false;
                            zoomLevel = Math.min(4.0, zoomLevel + 0.25);
                            updateZoom();
                        };

                        const resetBtn = document.createElement("button");
                        resetBtn.textContent = "🔄";
                        resetBtn.title = "Fit to Screen";
                        resetBtn.onclick = () => {
                            isFit = true;
                            zoomLevel = 1.0;
                            updateZoom();
                        };

                        [minusBtn, plusBtn, resetBtn].forEach(btn => {
                            btn.style.background = "none";
                            btn.style.border = "none";
                            btn.style.color = "#a1a1aa";
                            btn.style.cursor = "pointer";
                            btn.style.padding = "2px 6px";
                            btn.style.borderRadius = "4px";
                            btn.style.transition = "background-color 0.2s";
                            btn.onmouseover = () => btn.style.background = "rgba(255, 255, 255, 0.1)";
                            btn.onmouseout = () => btn.style.background = "none";
                        });

                        zoomToolbar.appendChild(minusBtn);
                        zoomToolbar.appendChild(zoomPercent);
                        zoomToolbar.appendChild(plusBtn);
                        zoomToolbar.appendChild(resetBtn);
                        inner.appendChild(zoomToolbar);

                        function updateZoom() {
                            if (isFit) {
                                imgEl.style.maxWidth = "100%";
                                imgEl.style.maxHeight = "70vh";
                                imgEl.style.width = "auto";
                                imgEl.style.height = "auto";
                                imgEl.style.cursor = "zoom-in";
                                zoomPercent.textContent = "Fit";
                                contentArea.style.alignItems = "center";
                                contentArea.style.justifyContent = "center";
                            } else {
                                imgEl.style.maxWidth = "none";
                                imgEl.style.maxHeight = "none";
                                imgEl.style.width = (imgEl.naturalWidth * zoomLevel) + "px";
                                imgEl.style.height = "auto";
                                imgEl.style.cursor = "zoom-out";
                                zoomPercent.textContent = Math.round(zoomLevel * 100) + "%";
                                contentArea.style.alignItems = "flex-start";
                                contentArea.style.justifyContent = "flex-start";
                            }
                        }

                        // Toggle fit vs original size on click
                        imgEl.onclick = () => {
                            if (isFit) {
                                isFit = false;
                                zoomLevel = 1.0;
                            } else {
                                isFit = true;
                            }
                            updateZoom();
                        };

                        // Ctrl + Wheel Zoom
                        contentArea.addEventListener("wheel", (e) => {
                            if (e.ctrlKey) {
                                e.preventDefault();
                                isFit = false;
                                if (e.deltaY < 0) {
                                    zoomLevel = Math.min(4.0, zoomLevel + 0.15);
                                } else {
                                    zoomLevel = Math.max(0.1, zoomLevel - 0.15);
                                }
                                updateZoom();
                            }
                        }, { passive: false });

                        // Drag-to-Pan (Grab to Scroll)
                        let isDragging = false;
                        let startX, startY, scrollLeft, scrollTop;

                        contentArea.style.cursor = "grab";
                        contentArea.addEventListener("mousedown", (e) => {
                            if (contentArea.scrollWidth > contentArea.clientWidth || contentArea.scrollHeight > contentArea.clientHeight) {
                                isDragging = true;
                                contentArea.style.cursor = "grabbing";
                                startX = e.pageX - contentArea.offsetLeft;
                                startY = e.pageY - contentArea.offsetTop;
                                scrollLeft = contentArea.scrollLeft;
                                scrollTop = contentArea.scrollTop;
                            }
                        });

                        contentArea.addEventListener("mouseleave", () => {
                            isDragging = false;
                            contentArea.style.cursor = "grab";
                        });

                        contentArea.addEventListener("mouseup", () => {
                            isDragging = false;
                            contentArea.style.cursor = "grab";
                        });

                        contentArea.addEventListener("mousemove", (e) => {
                            if (!isDragging) return;
                            e.preventDefault();
                            const x = e.pageX - contentArea.offsetLeft;
                            const y = e.pageY - contentArea.offsetTop;
                            const walkX = (x - startX) * 1.5;
                            const walkY = (y - startY) * 1.5;
                            contentArea.scrollLeft = scrollLeft - walkX;
                            contentArea.scrollTop = scrollTop - walkY;
                        });

                        imgEl.onload = () => {
                            if (!isFit) updateZoom();
                        };

                        updateZoom();
                        contentArea.appendChild(imgEl);

                    } else if (type.startsWith("video/")) {
                        const videoEl = document.createElement("video");
                        objectUrl = URL.createObjectURL(new Blob([bytes], { type }));
                        videoEl.src = objectUrl;
                        videoEl.controls = true;
                        videoEl.autoplay = true;
                        videoEl.style.maxWidth = "100%";
                        videoEl.style.maxHeight = "70vh";
                        videoEl.style.borderRadius = "6px";
                        videoEl.style.boxShadow = "0 4px 12px rgba(0,0,0,0.5)";
                        contentArea.appendChild(videoEl);
                    } else if (type.startsWith("audio/")) {
                        const audioEl = document.createElement("audio");
                        objectUrl = URL.createObjectURL(new Blob([bytes], { type }));
                        audioEl.src = objectUrl;
                        audioEl.controls = true;
                        audioEl.autoplay = true;
                        audioEl.style.width = "100%";
                        audioEl.style.maxWidth = "500px";
                        contentArea.appendChild(audioEl);
                    } else {
                        const fallbackDiv = document.createElement("div");
                        fallbackDiv.style.textAlign = "center";
                        fallbackDiv.style.padding = "40px";
                        
                        const fileIcon = document.createElement("div");
                        fileIcon.style.fontSize = "64px";
                        fileIcon.style.marginBottom = "20px";
                        fileIcon.innerHTML = "📄";
                        
                        const mimeSpan = document.createElement("p");
                        mimeSpan.style.color = "#71717a";
                        mimeSpan.style.fontSize = "14px";
                        mimeSpan.style.marginBottom = "20px";
                        mimeSpan.textContent = `MIME: ${type}`;
                        
                        const dlLink = document.createElement("button");
                        dlLink.className = "button";
                        dlLink.textContent = "Download File";
                        dlLink.style.fontSize = "16px";
                        dlLink.style.padding = "10px 20px";
                        dlLink.onclick = () => {
                            const blob = new Blob([bytes], { type });
                            const blobUrl = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = blobUrl;
                            a.download = m.name || name;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            URL.revokeObjectURL(blobUrl);
                        };
                        
                        fallbackDiv.appendChild(fileIcon);
                        fallbackDiv.appendChild(mimeSpan);
                        fallbackDiv.appendChild(dlLink);
                        contentArea.appendChild(fallbackDiv);
                    }

                    popup.onclick = () => {
                        popup.remove();
                        if (objectUrl) URL.revokeObjectURL(objectUrl);
                    };

                    inner.appendChild(contentArea);
                    popup.appendChild(inner);
                    document.body.appendChild(popup);
                } catch (e) {
                    alert("Preview failed: " + e.message);
                }
            };
            const tdName = document.createElement("td");
            tdName.textContent = name;
            tdName.style.wordBreak = "break-all";

            const tdSize = document.createElement("td");
            tdSize.innerHTML = meta ? `<div style="font-weight: 500;">${niceBytes(meta.sizeOriginal)}</div><div style="font-size: 10px; color: var(--text-secondary);">${niceBytes(meta.sizeStored)} stored</div>` : "-";

            const tdDate = document.createElement("td");
            tdDate.innerHTML = meta && meta.dateISO ? `<div style="font-weight: 500;">${new Date(meta.dateISO).toLocaleDateString()}</div><div style="font-size: 10px; color: var(--text-secondary);">${new Date(meta.dateISO).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>` : "-";

            const tdDl = document.createElement("td");
            tdDl.style.textAlign = "center";
            const btnDl = document.createElement("button");
            btnDl.className = "button icon-button";
            btnDl.innerHTML = "📥";
            btnDl.title = "Download";
            btnDl.onclick = async() => {
                const raw = await file.read();
                const localMeta = await file.readMeta();
                const reconstructed = await reconstructBytesFromSerialized(raw, localMeta || meta);
                const url = URL.createObjectURL(new Blob([reconstructed.bytes], { type: reconstructed.mime || "application/octet-stream" }));
                const a = document.createElement("a");
                a.href = url;
                a.download = (localMeta && localMeta.name) || name;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
            };
            tdDl.appendChild(btnDl);

            const tdClip = document.createElement("td");
            tdClip.style.textAlign = "center";
            const btnClip = document.createElement("button");
            btnClip.className = "button icon-button";
            btnClip.innerHTML = "📋";
            btnClip.title = "Copy to Clipboard";
            btnClip.onclick = async() => {
                const raw = await file.read();
                const localMeta = await file.readMeta();
                const reconstructed = await reconstructBytesFromSerialized(raw, localMeta || meta);
                const blob = new Blob([reconstructed.bytes], { type: reconstructed.mime || "application/octet-stream" });
                try {
                    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
                } catch {
                    const url = await reconstructDataURLFromSerialized(raw, localMeta || meta);
                    await navigator.clipboard.writeText(url);
                }
            };
            tdClip.appendChild(btnClip);

            const tdShare = document.createElement("td");
            tdShare.style.textAlign = "center";
            const btnShare = document.createElement("button");
            btnShare.className = "button icon-button";
            btnShare.innerHTML = "🔗";
            btnShare.title = "Share (Copy share string)";
            btnShare.onclick = async() => {
                try {
                    const raw = await file.read();
                    const localMeta = await file.readMeta();
                    const sharePackage = {
                        type: "bookmarkfs-share",
                        version: 3,
                        name: name,
                        meta: localMeta || meta,
                        serialized: raw
                    };
                    const base64Str = btoa(JSON.stringify(sharePackage));
                    await navigator.clipboard.writeText(base64Str);
                    alert(`Shareable Base64 string for "${name}" copied to clipboard!`);
                } catch (err) {
                    alert("Share failed: " + err.message);
                }
            };
            tdShare.appendChild(btnShare);

            const tdRen = document.createElement("td");
            tdRen.style.textAlign = "center";
            const btnRen = document.createElement("button");
            btnRen.className = "button icon-button";
            btnRen.innerHTML = "✏️";
            btnRen.title = "Rename";
            btnRen.onclick = async() => {
                const next = prompt("Rename to:", entry.fullName);
                if (!next || next === entry.fullName) return;
                const newName = normalizeVirtualPath(next);
                await file.rename(newName);
                renameFileInCache(file.handle.id, newName);
                await loadFilesToTable(false);
            };
            tdRen.appendChild(btnRen);

            const tdDel = document.createElement("td");
            tdDel.style.textAlign = "center";
            const btnDel = document.createElement("button");
            btnDel.className = "button icon-button";
            btnDel.innerHTML = "🗑️";
            btnDel.title = "Delete";
            btnDel.onclick = async() => {
                if (!confirm(`Delete "${entry.fullName}"?`)) return;
                tr.style.opacity = "0";
                tr.style.transform = "translateX(-20px)";
                setTimeout(async () => {
                    tr.remove();
                    await file.delete();
                    removeFileFromCache(file.handle.id);
                    updateAnalytics(cachedMetas);
                    updateStorageChart(cachedMetas);
                    await loadFilesToTable(false);
                }, 300);
            };
            tdDel.appendChild(btnDel);

            const tdType = document.createElement("td");
            tdType.textContent = getFriendlyFileType(name, (meta && meta.type) || "");
            tdType.style.color = "var(--text-secondary)";

            tr.appendChild(tdPreview);
            tr.appendChild(tdName);
            tr.appendChild(tdType);
            tr.appendChild(tdSize);
            tr.appendChild(tdDate);
            tr.appendChild(tdDl);
            tr.appendChild(tdClip);
            tr.appendChild(tdShare);
            tr.appendChild(tdRen);
            tr.appendChild(tdDel);
            tbody.appendChild(tr);
        }
        applyGridSize();
        applySettings();
    }

    // ---------- Upload handling ----------
    async function handleFileList(fileList) {
        let activePassphrase = cachedSessionPassphrase || "";
        const locks = await getFolderLocks();
        let targetLockedFolder = "";
        
        for (const lockedPath of Object.keys(locks)) {
            if (currentPath === lockedPath || currentPath.startsWith(lockedPath + "/")) {
                targetLockedFolder = lockedPath;
                break;
            }
        }

        if (targetLockedFolder) {
            let folderPass = cachedFolderPassphrases.get(targetLockedFolder);
            if (!folderPass) {
                folderPass = prompt(`Folder "${targetLockedFolder}" is locked. Enter password to write into it:`);
                if (!folderPass) return;
                const ok = await unlockFolder(targetLockedFolder, folderPass);
                if (!ok) {
                    alert("Incorrect password!");
                    return;
                }
            }
            activePassphrase = folderPass;
        }

        const settings = getSettings();
        if (settings.bypassUploadEncryption && !targetLockedFolder) {
            for (const f of fileList) {
                await processAndStoreFile(f, "");
            }
            await loadFilesToTable(false);
            return;
        }

        if (!activePassphrase && !targetLockedFolder) {
            showEncryptDecryptModal("Optional Passphrase (AES-GCM)", true, async (typedPass, shouldCache) => {
                if (typedPass === null) return;
                if (typedPass && shouldCache) cachedSessionPassphrase = typedPass;
                for (const f of fileList) {
                    await processAndStoreFile(f, typedPass || "");
                }
                await loadFilesToTable(false);
            });
        } else {
            for (const f of fileList) {
                await processAndStoreFile(f, activePassphrase);
            }
            await loadFilesToTable(false);
        }
    }

    async function processAndStoreFile(file, passphrase) {
        const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });

        const { serialized, metaObj, metaHeader } = await prepareSerializedFromDataURL(dataUrl, { passphrase });
        metaObj.name = file.name;
        metaObj.metaHeader = metaHeader;

        const duplicate = await findFileByHash(metaObj.contentHash);
        if (duplicate) {
            alert(`Duplicate skipped: same content already exists as ${duplicate.handle.title}`);
            return;
        }

        const folderValue = currentPath;
        const fileParts = file.name.split('.');
        const baseName = fileParts.length > 1 ? fileParts.slice(0, -1).join('.') : file.name;
        let targetName = folderValue ? `${folderValue}/${baseName}` : baseName;
        let existing = await getFileByName(targetName);
        if (existing) {
            const action = (prompt(`File ${targetName} exists. Type replace / keep / cancel`, "replace") || "cancel").toLowerCase();
            if (action === "cancel") return;
            if (action === "replace") {
                await existing.delete();
                removeFileFromCache(existing.handle.id);
            } else {
                targetName = incrementVersionedName(targetName);
                while (await getFileByName(targetName)) targetName = incrementVersionedName(targetName);
            }
        }

        const fobj = await createNewFile(targetName);
        await fobj.writeMeta(metaObj);

        const fingerprint = `${file.name}|${file.size}|${file.lastModified}|${targetName}`;
        const checkpoint = await getUploadCheckpoint();
        let startChunk = 0;
        if (checkpoint && checkpoint.fingerprint === fingerprint && !passphrase && Number.isFinite(checkpoint.nextChunk)) {
            if (confirm(`Resume upload for ${targetName} from chunk ${checkpoint.nextChunk + 1}?`)) {
                startChunk = checkpoint.nextChunk;
            }
        }

        await fobj.write(serialized, setProgress, {
            startChunk,
            onChunk: async(chunkDone) => {
                await setUploadCheckpoint({ fingerprint, nextChunk: chunkDone, updatedAt: Date.now() });
            }
        });

        await clearUploadCheckpoint();
        setProgress(1);
        addFileToCache(fobj, metaObj);
    }

    function inferExtFromMime(mime) {
        const m = (mime || "").toLowerCase();
        if (m === "image/jpeg") return "jpg";
        if (m === "image/png") return "png";
        if (m === "image/gif") return "gif";
        if (m === "image/webp") return "webp";
        if (m === "image/svg+xml") return "svg";
        if (m === "video/mp4") return "mp4";
        if (m === "video/webm") return "webm";
        if (m === "audio/mpeg") return "mp3";
        if (m === "audio/wav") return "wav";
        if (m === "application/pdf") return "pdf";
        if (m === "application/zip") return "zip";
        if (m === "application/vnd.rar") return "rar";
        if (m === "application/json") return "json";
        if (m.startsWith("text/")) return "txt";
        return "";
    }

    function filenameFromUrl(url, contentType) {
        let name = "";
        try {
            const u = new URL(url);
            name = decodeURIComponent((u.pathname.split("/").pop() || "").trim());
        } catch {
            name = "";
        }
        if (!name || name === "/") name = "dropped-file";
        if (!name.includes(".")) {
            const ext = inferExtFromMime((contentType || "").split(";")[0].trim());
            if (ext) name = `${name}.${ext}`;
        }
        return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
    }

    function extractUrlsFromDroppedHtml(html) {
        if (!html) return [];
        const urls = [];
        try {
            const doc = new DOMParser().parseFromString(html, "text/html");
            const selectors = ["img[src]", "video[src]", "video source[src]", "audio[src]", "audio source[src]", "a[href]"];
            for (const sel of selectors) {
                const nodes = doc.querySelectorAll(sel);
                for (const n of nodes) {
                    const v = n.getAttribute("src") || n.getAttribute("href") || "";
                    if (/^https?:\/\//i.test(v)) urls.push(v);
                }
            }
        } catch {
            return [];
        }
        return urls;
    }

    function extractDroppedUrls(dataTransfer) {
        const urls = new Set();
        if (!dataTransfer) return [];

        const uriList = dataTransfer.getData("text/uri-list") || "";
        for (const line of uriList.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith("#") && /^https?:\/\//i.test(trimmed)) urls.add(trimmed);
        }

        const downloadUrl = dataTransfer.getData("DownloadURL") || "";
        if (downloadUrl) {
            const match = downloadUrl.match(/^[^:]+:[^:]+:(.+)$/);
            if (match && /^https?:\/\//i.test(match[1])) urls.add(match[1]);
        }

        const html = dataTransfer.getData("text/html") || "";
        for (const u of extractUrlsFromDroppedHtml(html)) urls.add(u);

        const plain = (dataTransfer.getData("text/plain") || "").trim();
        if (/^https?:\/\//i.test(plain)) urls.add(plain);

        return [...urls];
    }

    async function fetchUrlAsFile(url, fallbackIndex) {
        let normalized;
        try {
            normalized = new URL(url).toString();
        } catch {
            throw new Error("Invalid URL");
        }
        if (!/^https?:/i.test(normalized) && !/^data:/i.test(normalized)) {
            throw new Error("Unsupported URL scheme");
        }

        let res;
        try {
            res = await fetch(normalized);
        } catch {
            throw new Error("Network blocked or cross-origin denied");
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const type = blob.type || (res.headers.get("content-type") || "application/octet-stream");
        const disposition = res.headers.get("content-disposition") || "";
        let name = "";
        const m = disposition.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
        if (m && m[1]) {
            try {
                name = decodeURIComponent(m[1].replace(/"/g, "").trim());
            } catch {
                name = m[1].replace(/"/g, "").trim();
            }
        }
        if (!name) name = filenameFromUrl(res.url || normalized, type);
        if (!name) name = `dropped-file-${fallbackIndex}`;
        return new File([blob], name, { type: (type || "").split(";")[0].trim(), lastModified: Date.now() });
    }

    async function handleDroppedUrls(urls) {
        if (!urls.length) return;
        let pass = cachedSessionPassphrase;
        if (!pass) {
            pass = prompt("Optional passphrase (AES-GCM). Leave blank for none:") || "";
            if (pass && confirm("Cache this passphrase for this session?")) cachedSessionPassphrase = pass;
        }
        let success = 0;
        const failed = [];
        try {
            for (let i = 0; i < urls.length; i++) {
                try {
                    const file = await fetchUrlAsFile(urls[i], i + 1);
                    await processAndStoreFile(file, pass || "");
                    success++;
                } catch (e) {
                    failed.push(`${urls[i]} (${e.message})`);
                }
            }
            await loadFilesToTable();
        } catch (e) {
            failed.push(`Internal error (${e.message})`);
        }
        if (failed.length) {
            alert(`Dropped URL upload complete. Success: ${success}, Failed: ${failed.length}\n\n${failed.slice(0, 5).join("\n")}`);
        }
    }
    // ---------- Export / Import ----------
    async function exportAll() {
        const files = await listFiles();
        const out = [];
        for (const f of files) {
            const meta = await f.readMeta();
            const serialized = await f.read();
            out.push({ name: f.handle.title, meta, serialized });
        }
        const blob = new Blob([JSON.stringify({ version: APP_SCHEMA_VERSION, items: out }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bookmarkfs-backup-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    async function importAllFromFile(file) {
        try {
            const text = await file.text();
            const json = JSON.parse(text);
            if (!json || !Array.isArray(json.items)) throw new Error("Invalid backup format");
            for (const item of json.items) {
                let target = item.name;
                while (await getFileByName(target)) target = incrementVersionedName(target);
                const fobj = await createNewFile(target);
                if (item.meta) await fobj.writeMeta(migrateMeta(item.meta));
                await fobj.write(item.serialized, (p) => setProgress(p), { chunkSize: (item.meta && item.meta.chunkSize) ? item.meta.chunkSize : maxBookmarkSize });
            }
            await loadFilesToTable();
        } catch (e) {
            alert("Import failed: " + e.message);
        } finally {
            setProgress(0);
        }
    }

    // ---------- Drag & drop ----------
    function setupDragDrop() {
        const body = document.body;
        ["dragenter", "dragover"].forEach(ev => {
            body.addEventListener(ev, (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
            }, false);
        });
        body.addEventListener("drop", async(e) => {
            e.preventDefault();
            try {
                const files = Array.from(e.dataTransfer.files || []);
                if (files.length) {
                    await handleFileList(files);
                    return;
                }
                const href = e.dataTransfer.getData("text/uri-list");
                const text = e.dataTransfer.getData("text/plain") || href;
                const target = href || text;
                if (target && (target.startsWith("http") || target.includes(".") || target.includes(" "))) {
                    window.location.href = "web.html?load=" + encodeURIComponent(target.trim());
                    return;
                }
                const urls = extractDroppedUrls(e.dataTransfer);
                if (urls.length) await handleDroppedUrls(urls);
            } catch (err) {
                alert("Drop upload failed: " + err.message);
            }
        }, false);

        // Clipboard paste file upload support
        body.addEventListener("paste", async (e) => {
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.isContentEditable)) return;
            
            const filesPanel = qs("#files-panel-view");
            if (!filesPanel || filesPanel.style.display === "none") return;
            
            const items = e.clipboardData?.items || [];
            const files = [];
            for (const item of items) {
                if (item.kind === "file") {
                    const file = item.getAsFile();
                    if (file) {
                        files.push(file);
                    }
                } else if (item.kind === "string" && item.type === "text/plain") {
                    item.getAsString(async (text) => {
                        const blob = new Blob([text], { type: "text/plain" });
                        const now = new Date();
                        const timestamp = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, '0') + "-" + String(now.getDate()).padStart(2, '0') + "_" + String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0') + String(now.getSeconds()).padStart(2, '0');
                        const file = new File([blob], `pasted_${timestamp}.txt`, { type: "text/plain" });
                        await handleFileList([file]);
                    });
                }
            }
            if (files.length) {
                await handleFileList(files);
            }
        });
    }

    function detectContext() {
        const isPopup = chrome.extension && typeof chrome.extension.getViews === "function" && chrome.extension.getViews({ type: "popup" }).includes(window);
        if (isPopup) {
            document.body.classList.add("extension-popup");
        } else {
            document.body.classList.add("extension-tab");
        }
    }

    async function runAutoBackup() {
        try {
            const data = await chrome.storage.local.get(["bookmarkfs_last_backup", "bookmarkfs_backups"]);
            const lastBackup = data.bookmarkfs_last_backup || 0;
            const now = Date.now();
            const weekMs = 7 * 24 * 60 * 60 * 1000;
            if (now - lastBackup < weekMs) {
                return;
            }
            const files = await listFiles();
            const backupEntries = [];
            for (const f of files) {
                try {
                    const meta = await f.readMeta();
                    backupEntries.push({
                        title: f.handle.title,
                        meta: meta
                    });
                } catch {}
            }
            let backups = data.bookmarkfs_backups || [];
            backups.push({
                timestamp: now,
                date: new Date().toISOString(),
                data: backupEntries
            });
            if (backups.length > 5) {
                backups = backups.slice(backups.length - 5);
            }
            await chrome.storage.local.set({
                bookmarkfs_last_backup: now,
                bookmarkfs_backups: backups
            });
            console.log("[AutoBackup] Weekly snapshots created successfully.");
        } catch (err) {
            console.error("[AutoBackup] Failed:", err);
        }
    }

    // ---------- Wire up events on load ----------
    window.addEventListener("load", async() => {
        detectContext();
        ensureUI();

        const urlParams = new URLSearchParams(window.location.search);
        const startPanel = urlParams.get("panel");

        if (chrome.sidePanel && chrome.sidePanel.setOptions) {
            const path = "dist/index.html" + window.location.search;
            const lastPath = localStorage.getItem("bookmarkfs_last_sidepanel_path");
            if (lastPath !== path) {
                chrome.sidePanel.setOptions({ path: path }).catch(() => {});
                localStorage.setItem("bookmarkfs_last_sidepanel_path", path);
            }
        }

        // wire main file input
        const input = qs("#file-input");
        if (input) {
            input.addEventListener("change", async function() {
                const files = Array.from(this.files || []);
                if (!files.length) return;
                await handleFileList(files);
                this.value = "";
            });
        }

        // wire search
        const search = qs("#search-bar");
        if (search) search.addEventListener("input", async() => {
            currentPage = 1;
            await loadFilesToTable();
        });

        const prevBtn = qs("#prev-page-btn");
        if (prevBtn) prevBtn.addEventListener("click", async() => {
            currentPage = Math.max(1, currentPage - 1);
            await loadFilesToTable();
        });
        const nextBtn = qs("#next-page-btn");
        if (nextBtn) nextBtn.addEventListener("click", async() => {
            currentPage += 1;
            await loadFilesToTable();
        });

        const upBtn = qs("#up-path-btn");
        if (upBtn) upBtn.addEventListener("click", async() => {
            if (!currentPath) return;
            const parts = currentPath.split("/").filter(Boolean);
            parts.pop();
            currentPath = parts.join("/");
            currentPage = 1;
            await loadFilesToTable();
        });

        const folderInput = qs("#folder-input");
        if (folderInput) folderInput.addEventListener("change", () => {
            currentPath = normalizeVirtualPath(folderInput.value || "");
            currentPage = 1;
            updatePathBar();
        });

        // export/import inside Settings popup
        const exportBtn = qs("#settings-export");
        if (exportBtn) exportBtn.addEventListener("click", exportAll);
        const importInput = qs("#settings-import-input");
        if (importInput) importInput.addEventListener("change", async function() {
            const f = this.files && this.files[0];
            if (f) {
                await importAllFromFile(f);
                const popup = qs("#settings-popup");
                if (popup) popup.style.display = "none";
            }
            this.value = "";
        });

        setupDragDrop();

        // initial render
        const INLINE_PANELS = ["twofa", "passwords", "calc", "clock", "regex", "color", "api", "privacy", "rss", "timetracker", "qrscanner"];
        if (INLINE_PANELS.includes(startPanel)) {
            const root = await fsRoot();
            const rootChildren = await chrome.bookmarks.getChildren(root.id);
            const files = rootChildren.filter(c => !c.url && c.title !== "__chunks__")
                .map(c => FileObj(c));
            cachedMetas = await Promise.all(files.map(async f => {
                try { return { file: f, meta: await f.readMeta() }; } catch { return { file: f, meta: null }; }
            }));
            const btn = qs(`.nav-links .nav-btn[data-panel="${startPanel}"]`);
            if (btn) btn.click();
        } else {
            await loadFilesToTable(true);
        }
        applySettings(); // apply saved settings immediately
        runAutoBackup();

        // Global Keyboard Shortcuts
        window.addEventListener("keydown", (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                const s = qs("#search-bar");
                if (s) {
                    e.preventDefault();
                    s.focus();
                    s.select();
                }
            }
            if (e.key === "Escape") {
                const modal = qs("#preview-modal") || qs("#settings-popup");
                if (modal) {
                    modal.remove();
                }
            }
        });
    });

    // ---------- CSS injection for transitions and light-mode theme ----------
    (function injectCss() {
        const css = `
      .text-preview-row td { background: #171717; color: #ddd; }

      /* Transition logic for premium theme switching */
      body, 
      .button, 
      #controls-bar, 
      #search-bar, 
      #folder-input, 
      #tag-filter, 
      table.rwd-table, 
      table.rwd-table th, 
      table.rwd-table td, 
      #preview-modal, 
      #preview-modal > div,
      #storage-chart-container, 
      #bulk-bar {
          transition: background-color 0.4s cubic-bezier(0.4, 0, 0.2, 1), 
                      color 0.4s cubic-bezier(0.4, 0, 0.2, 1), 
                      border-color 0.4s cubic-bezier(0.4, 0, 0.2, 1), 
                      box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }

      /* Premium Light Mode Styles */
      body.light-mode {
          background: #f3f4f6 !important;
          color: #1f2937 !important;
      }

      body.light-mode #controls-bar {
          background-color: #ffffff !important;
          box-shadow: inset 0 -7px 0 0 #e5e7eb !important;
          border: 1px solid #d1d5db;
      }

      body.light-mode .button {
          background-color: #ffffff !important;
          box-shadow: inset 0 -7px 0 0 #d1d5db !important;
          color: #059669 !important;
          border: 1px solid #d1d5db;
      }

      body.light-mode .button:hover {
          background-color: #f9fafb !important;
          box-shadow: inset 0 0px 0 0 #d1d5db !important;
      }

      body.light-mode #search-bar,
      body.light-mode #folder-input,
      body.light-mode #tag-filter {
          border-color: #059669 !important;
          background-color: #ffffff !important;
          color: #1f2937 !important;
      }

      body.light-mode table.rwd-table {
          background: #ffffff !important;
          color: #1f2937 !important;
          border-color: #d1d5db !important;
      }

      body.light-mode table.rwd-table tr {
          border-color: #e5e7eb !important;
      }

      body.light-mode table.rwd-table th {
          background: #f3f4f6 !important;
          color: #059669 !important;
      }

      body.light-mode table.rwd-table td {
          color: #374151 !important;
      }

      body.light-mode table.rwd-table td button {
          border-color: #d1d5db !important;
      }

      body.light-mode #storage-chart-container,
      body.light-mode #bulk-bar {
          background: #ffffff !important;
          border-color: #d1d5db !important;
      }

      body.light-mode #bulk-count {
          color: #4b5563 !important;
      }

      /* Modals in light mode */
      body.light-mode #preview-modal > div {
          background: #ffffff !important;
          border-color: #d1d5db !important;
          color: #1f2937 !important;
      }

      body.light-mode #preview-modal header {
          border-bottom-color: #e5e7eb !important;
      }

      body.light-mode #preview-modal #editor-textarea,
      body.light-mode #preview-modal #editor-tags {
          background: #f9fafb !important;
          color: #1f2937 !important;
          border-color: #d1d5db !important;
      }

      /* Highlighted code inside preview in light mode */
      body.light-mode #preview-modal pre {
          background: #f9fafb !important;
          color: #232629 !important;
          border-color: #d1d5db !important;
      }

      /* ZIP/RAR Tables in light mode modal */
      body.light-mode #preview-modal table {
          color: #1f2937 !important;
      }

      body.light-mode #preview-modal tr {
          border-bottom-color: #e5e7eb !important;
      }

      body.light-mode #preview-modal th {
          border-bottom-color: #d1d5db !important;
          color: #059669 !important;
      }

      /* 2FA modals in light mode */
      body.light-mode .twofa-modal {
          background: rgba(200, 200, 200, 0.7) !important;
      }
      body.light-mode .twofa-modal-box {
          background: #ffffff !important;
          border-color: #d1d5db !important;
          color: #1f2937 !important;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.15) !important;
      }
      body.light-mode .twofa-modal-box h3 {
          color: var(--accent) !important;
      }
      body.light-mode .twofa-modal-box label {
          color: #6b7280 !important;
      }
      body.light-mode .twofa-modal-box input[type="text"],
      body.light-mode .twofa-modal-box textarea {
          background: #f9fafb !important;
          border-color: #d1d5db !important;
          color: #1f2937 !important;
      }
      body.light-mode .twofa-modal-box p {
          color: #6b7280 !important;
      }
      body.light-mode .twofa-modal-box div[style*="font-weight: 600"] {
          color: #1f2937 !important;
      }

      /* Custom panels in light mode */
      body.light-mode #passwords-panel,
      body.light-mode #calc-panel,
      body.light-mode #clock-panel,
      body.light-mode #regex-panel,
      body.light-mode #color-panel,
      body.light-mode #api-panel,
      body.light-mode #privacy-panel,
      body.light-mode #rss-panel,
      body.light-mode #timetracker-panel,
      body.light-mode #qrscanner-panel {
          color: #1f2937 !important;
      }
      body.light-mode #passwords-panel h2,
      body.light-mode #calc-panel h2,
      body.light-mode #clock-panel h2,
      body.light-mode #regex-panel h2,
      body.light-mode #color-panel h2,
      body.light-mode #api-panel h2,
      body.light-mode #privacy-panel h2,
      body.light-mode #rss-panel h2,
      body.light-mode #timetracker-panel h2,
      body.light-mode #qrscanner-panel h2 {
          color: #1f2937 !important;
      }
      body.light-mode #passwords-panel input,
      body.light-mode #calc-panel input,
      body.light-mode #clock-panel input,
      body.light-mode #regex-panel input,
      body.light-mode #color-panel input,
      body.light-mode #api-panel input,
      body.light-mode #rss-panel input,
      body.light-mode #passwords-panel textarea,
      body.light-mode #regex-panel textarea,
      body.light-mode #api-panel textarea,
      body.light-mode #qrscanner-panel textarea,
      body.light-mode #calc-panel select,
      body.light-mode #color-panel select,
      body.light-mode #api-panel select {
          background: #f9fafb !important;
          border-color: #d1d5db !important;
          color: #1f2937 !important;
      }
      body.light-mode #passwords-panel label,
      body.light-mode #calc-panel label,
      body.light-mode #clock-panel label,
      body.light-mode #regex-panel label,
      body.light-mode #color-panel label,
      body.light-mode #api-panel label,
      body.light-mode #qrscanner-panel label {
          color: #4b5563 !important;
      }
      body.light-mode #calc-screen,
      body.light-mode #conv-output,
      body.light-mode #txt-output,
      body.light-mode #regex-output,
      body.light-mode #api-response,
      body.light-mode #qrscan-output {
          background: #f3f4f6 !important;
          border-color: #d1d5db !important;
          color: #4b5563 !important;
      }
      body.light-mode .history-card,
      body.light-mode .big-card {
          background: #ffffff !important;
          border-color: #d1d5db !important;
          color: #1f2937 !important;
      }
      body.light-mode #passwords-panel a,
      body.light-mode #calc-panel a,
      body.light-mode #rss-panel a {
          color: var(--accent) !important;
      }

      /* Navigation dropdown styling */
      .nav-dropdown {
          position: relative;
          display: inline-block;
      }
      .dropdown-content {
          display: none;
          position: absolute;
          right: 0;
          top: 100%;
          background: rgba(24, 24, 27, 0.95) !important;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(63, 63, 70, 0.8) !important;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          z-index: 100000;
          min-width: 320px;
          padding: 8px;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
      }
      body.light-mode .dropdown-content {
          background: rgba(255, 255, 255, 0.95) !important;
          border-color: rgba(209, 213, 221, 0.8) !important;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      }
      .dropdown-content .nav-btn {
          display: flex !important;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 13px;
          color: var(--text-color) !important;
          text-decoration: none !important;
          transition: all 0.2s ease;
          border: none !important;
          background: transparent !important;
          text-align: left;
          width: 100%;
          box-sizing: border-box;
      }
      .dropdown-content .nav-btn:hover {
          background: rgba(255, 255, 255, 0.08) !important;
          transform: translateY(-1px);
      }
      body.light-mode .dropdown-content .nav-btn:hover {
          background: rgba(0, 0, 0, 0.05) !important;
      }
      .dropdown-content .nav-btn.active {
          background: var(--accent) !important;
          color: #000000 !important;
          font-weight: 600;
      }
      body.light-mode .dropdown-content .nav-btn.active {
          color: #ffffff !important;
      }
    `;
        const s = document.createElement("style");
        s.appendChild(document.createTextNode(css));
        document.head.appendChild(s);
    })();

})();



