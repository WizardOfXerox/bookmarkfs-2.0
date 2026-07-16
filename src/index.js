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
        <legend style="padding: 0 6px; color: var(--accent); font-weight: 500;">🕵️ User-Agent Switcher</legend>
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
        <legend style="padding: 0 6px; color: var(--accent); font-weight: 500;">🌐 Network / Security Bypass</legend>
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
        <legend style="padding: 0 6px; color: var(--accent); font-weight: 500;">🎨 Appearance & Themes</legend>
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
          <button id="btn-storage-scan" class="button" style="width: 100%;">🔍 Scan Storage Health</button>
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
            toggleBtn.textContent = isLight ? "🌙 Dark" : "☀️ Light";
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
        box.style.padding = "20px";
        box.style.borderRadius = "12px";
        box.style.width = "min(380px, 90%)";
        box.style.boxShadow = "0 20px 25px -5px rgba(0,0,0,0.5)";
        box.style.display = "flex";
        box.style.flexDirection = "column";
        box.style.gap = "12px";

        const heading = document.createElement("h3");
        heading.style.margin = "0";
        heading.style.fontSize = "16px";
        heading.style.fontWeight = "600";
        heading.style.color = "#02ff88";
        heading.textContent = title;

        const desc = document.createElement("p");
        desc.style.margin = "0";
        desc.style.fontSize = "12px";
        desc.style.color = "#a1a1aa";
        desc.textContent = isUpload 
            ? "Optional passphrase (AES-GCM). Leave blank to store unencrypted."
            : "Enter the passphrase to decrypt this file:";

        const input = document.createElement("input");
        input.type = "password";
        input.placeholder = "Enter passphrase...";
        input.style.width = "100%";
        input.style.padding = "8px 12px";
        input.style.borderRadius = "6px";
        input.style.border = "1px solid #27272a";
        input.style.background = "#09090b";
        input.style.color = "#f4f4f5";
        input.style.boxSizing = "border-box";

        const eyeBtn = document.createElement("button");
        eyeBtn.type = "button";
        eyeBtn.style.position = "absolute";
        eyeBtn.style.right = "8px";
        eyeBtn.style.top = "6px";
        eyeBtn.style.background = "none";
        eyeBtn.style.border = "none";
        eyeBtn.style.color = "#a1a1aa";
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
        strengthBar.style.background = "#27272a";
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
        strengthLabel.style.color = "#71717a";
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
                color = "#27272a";
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
        okBtn.style.borderColor = "#02ff88";
        okBtn.style.color = "#02ff88";

        const cacheRow = document.createElement("label");
        cacheRow.style.display = "flex";
        cacheRow.style.alignItems = "center";
        cacheRow.style.gap = "6px";
        cacheRow.style.fontSize = "11px";
        cacheRow.style.color = "#a1a1aa";
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
                zipData[relativePath] = reconstructed.bytes;
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

    function stop2FATimer() {
        if (twofaInterval) {
            clearInterval(twofaInterval);
            twofaInterval = null;
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
            <h3 style="margin: 0; color: var(--accent); display: flex; align-items: center; gap: 8px;">${editProfile ? "📝 Edit 2FA Profile" : "🔐 Add 2FA Profile"}</h3>
            
            <div style="display: flex; flex-direction: column; gap: 4px;">
                <label style="font-size: 12px; color: #a1a1aa;">Profile Label:</label>
                <input type="text" id="add-twofa-label" placeholder="e.g. Google: user@gmail.com" style="padding: 8px 12px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; font-size: 13px;">
            </div>

            <div style="display: flex; flex-direction: column; gap: 4px;">
                <label style="font-size: 12px; color: #a1a1aa;">Secret Key:</label>
                <input type="text" id="add-twofa-secret" placeholder="Base32 Key" style="padding: 8px 12px; background: #09090b; border: 1px solid #27272a; color: #f4f4f5; border-radius: 6px; outline: none; font-size: 13px; font-family: monospace;">
            </div>

            <div style="display: flex; gap: 8px; justify-content: space-between;">
                <button id="btn-twofa-cam-scan" class="button" style="flex: 1; font-size: 12px; padding: 6px 12px;">📷 Scan Camera</button>
                <label class="button" style="flex: 1; font-size: 12px; padding: 6px 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; margin: 0;">
                    🖼 Upload QR
                    <input type="file" id="input-twofa-qr-file" accept="image/*" style="display: none;">
                </label>
            </div>

            <div id="twofa-video-container" style="display: none; position: relative; width: 100%; max-height: 280px; background: #000; border-radius: 8px; overflow: hidden; border: 1px solid #27272a;">
                <video id="twofa-scan-video" style="width: 100%; display: block;" playsinline></video>
                <div style="position: absolute; top: 10%; bottom: 10%; left: 10%; right: 10%; border: 2px dashed var(--accent); opacity: 0.7; pointer-events: none; border-radius: 8px;"></div>
            </div>
            
            <button id="btn-twofa-scan-manual" class="button" style="margin-top: 4px; width: 100%; display: none; padding: 6px 12px; font-size: 13px;">🔍 Scan Current Frame</button>

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
        const camBtn = box.querySelector("#btn-twofa-cam-scan");
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
                const ctx = canvas.getContext("2d");

                scanInterval = setInterval(() => {
                    if (video.readyState >= 2 && video.videoWidth > 0) {
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const code = jsQR(imgData.data, imgData.width, imgData.height, {
                            inversionAttempts: "attemptBoth",
                        });

                        if (code) {
                            try {
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

        manualScanBtn.onclick = () => {
            if (!activeStream || video.readyState < 2 || video.videoWidth === 0) {
                alert("Camera feed is not ready. Please wait a second and try again.");
                return;
            }

            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imgData.data, imgData.width, imgData.height, {
                inversionAttempts: "attemptBoth",
            });

            if (code) {
                try {
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
            if (!label || !secret) {
                alert("Please fill in both Label and Secret Key fields.");
                return;
            }
            stopCamera();
            modal.remove();
            callback({ label, secret, recoveryCodes });
        };

        cancelBtn.onclick = () => {
            stopCamera();
            modal.remove();
            callback(null);
        };
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
                    <h2 style="margin:0; color:var(--accent); display:flex; align-items:center; gap:8px;">🔐 2FA Authenticator</h2>
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
                            recoveryCodes: result.recoveryCodes || ""
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
        
        stop2FATimer();
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

            const otpArea = document.createElement("div");
            otpArea.className = "twofa-card-otp";

            const codeEl = document.createElement("div");
            codeEl.className = "totp-code-display twofa-card-code";
            codeEl.dataset.secret = profile.secret;
            codeEl.textContent = "------";

            const timerEl = document.createElement("div");
            timerEl.className = "totp-timer-display twofa-card-timer";
            timerEl.textContent = "--";

            const copyBtn = document.createElement("button");
            copyBtn.className = "button";
            copyBtn.textContent = "📋 Copy";
            copyBtn.style.padding = "4px 10px";
            copyBtn.style.fontSize = "12px";
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(codeEl.textContent.replace(/\s+/g, ""));
                copyBtn.textContent = "✓ Copied";
                setTimeout(() => { copyBtn.textContent = "📋 Copy"; }, 1500);
            };

            otpArea.appendChild(codeEl);
            otpArea.appendChild(timerEl);
            otpArea.appendChild(copyBtn);
            
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
                            recoveryCodes: result.recoveryCodes || ""
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
            delBtn.style.marginLeft = "auto";
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
                zipData[f.handle.title] = reconstructed.bytes;
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
        savedTitle.textContent = "🗂️ Stored Workspace Sessions Library";
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
        const isStartupTwofa = urlParams.get("panel") === "twofa";

        if (!qs("#panel-nav-bar")) {
            const nav = document.createElement("div");
            nav.id = "panel-nav-bar";
            nav.innerHTML = `
                <div class="nav-links">
                    <a href="index.html" class="nav-btn ${isStartupTwofa ? "" : "active"}" data-panel="files">📁 Files</a>
                    <a href="#" class="nav-btn ${isStartupTwofa ? "active" : ""}" id="nav-2fa-btn" data-panel="twofa">🔐 2FA</a>
                    <a href="bookmarks.html" class="nav-btn" data-panel="bookmarks">🔖 Bookmarks</a>
                    <a href="sessions.html" class="nav-btn" data-panel="sessions">🗂️ Sessions</a>
                    <a href="web.html" class="nav-btn" data-panel="web">🌐 Web</a>
                    <a href="notes.html" class="nav-btn" data-panel="notes">📝 Notes</a>
                    <a href="/dist/capture.html" class="nav-btn" data-panel="screenshot">📸 Screenshot</a>
                    <a href="ua.html" class="nav-btn" data-panel="ua">🕵️ UA</a>
                </div>
                <div class="nav-controls">
                    <button id="global-theme-toggle" class="nav-btn" style="background:transparent;border:none;cursor:pointer;padding:6px 12px;margin-left:8px;"></button>
                </div>
            `;
            document.body.insertBefore(nav, document.body.firstChild);

            // Bind panel switching
            const navLinks = nav.querySelectorAll(".nav-btn");
            navLinks.forEach(link => {
                link.onclick = (e) => {
                    const panel = link.dataset.panel;
                    if (panel === "twofa") {
                        e.preventDefault();
                        navLinks.forEach(l => l.classList.remove("active"));
                        link.classList.add("active");
                        
                        // Hide Files view containers
                        const filesView = qs("#files-panel-view");
                        if (filesView) filesView.style.display = "none";
                        const controlsBar = qs("#controls-bar");
                        if (controlsBar) controlsBar.style.display = "none";
                        const storageChart = qs("#storage-chart-container");
                        if (storageChart) storageChart.style.display = "none";
                        const bulkBar = qs("#bulk-bar");
                        if (bulkBar) bulkBar.style.display = "none";
                        
                        // Show 2FA panel
                        show2FAPanel();
                    } else if (panel === "files") {
                        e.preventDefault();
                        navLinks.forEach(l => l.classList.remove("active"));
                        link.classList.add("active");
                        
                        // Hide 2FA panel
                        const twofaPanel = qs("#twofa-panel");
                        if (twofaPanel) twofaPanel.style.display = "none";
                        stop2FATimer();
                        
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
                    toggleBtn.textContent = isLight ? "🌙 Dark" : "☀️ Light";
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
            if (isStartupTwofa) {
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

        // Table head if missing
        const table = qs("#table");
        if (table && !table.querySelector("thead")) {
            table.innerHTML = "";
            const thead = document.createElement("thead");
            thead.innerHTML = `
        <tr>
          <th style="width: 30px; text-align:center;"><input type="checkbox" id="bulk-select-all"></th>
          <th style="width: 80px;">Preview</th>
          <th>Name</th>
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
            toggleBtn.textContent = nextTheme === "light" ? "🌙 Dark" : "☀️ Light";
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

                // Add ZIP download button next to folder
                const dlBtn = document.createElement("button");
                dlBtn.className = "button";
                dlBtn.textContent = "📥 ZIP";
                dlBtn.title = "Download folder as ZIP";
                dlBtn.style.marginLeft = "6px";
                dlBtn.style.fontSize = "11px";
                dlBtn.style.padding = "2px 8px";
                dlBtn.onclick = async (e) => {
                    e.stopPropagation();
                    await downloadFolderAsZip(entry.name);
                };
                tdName.appendChild(dlBtn);

                // Lock button if folder is not locked
                if (!isLocked) {
                    const lockBtn = document.createElement("button");
                    lockBtn.className = "button";
                    lockBtn.textContent = "🔒 Lock";
                    lockBtn.title = "Lock folder with password";
                    lockBtn.style.marginLeft = "6px";
                    lockBtn.style.fontSize = "11px";
                    lockBtn.style.padding = "2px 8px";
                    lockBtn.onclick = async (e) => {
                        e.stopPropagation();
                        const pass = prompt(`Enter password to lock folder "${entry.name}":`);
                        if (!pass) return;
                        await lockFolder(entry.name, pass);
                        alert(`Folder "${entry.name}" is now locked!`);
                        await loadFilesToTable();
                    };
                    tdName.appendChild(lockBtn);
                } else {
                    const lockBtn = document.createElement("button");
                    lockBtn.className = "button";
                    lockBtn.textContent = isUnlocked ? "🔒 Re-lock" : "🔓 Unlock";
                    lockBtn.title = isUnlocked ? "Lock this folder again" : "Unlock this folder";
                    lockBtn.style.marginLeft = "6px";
                    lockBtn.style.fontSize = "11px";
                    lockBtn.style.padding = "2px 8px";
                    lockBtn.onclick = async (e) => {
                        e.stopPropagation();
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
                    };
                    tdName.appendChild(lockBtn);
                }

                tr.appendChild(tdPreview);
                tr.appendChild(tdName);
                for (let i = 0; i < 6; i++) {
                    const td = document.createElement("td");
                    td.textContent = "-";
                    td.className = "cell-empty";
                    tr.appendChild(td);
                }
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
                            a.download = name;
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
                a.download = name;
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

            tr.appendChild(tdPreview);
            tr.appendChild(tdName);
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
        let targetName = folderValue ? `${folderValue}/${file.name}` : file.name;
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
        if (startPanel === "twofa") {
            const root = await fsRoot();
            const rootChildren = await chrome.bookmarks.getChildren(root.id);
            const files = rootChildren.filter(c => !c.url && c.title !== "__chunks__")
                .map(c => FileObj(c));
            cachedMetas = await Promise.all(files.map(async f => {
                try { return { file: f, meta: await f.readMeta() }; } catch { return { file: f, meta: null }; }
            }));
            const btn = qs("#nav-2fa-btn");
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
    `;
        const s = document.createElement("style");
        s.appendChild(document.createTextNode(css));
        document.head.appendChild(s);
    })();

})();



