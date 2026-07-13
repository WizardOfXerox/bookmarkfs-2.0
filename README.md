# BookmarkFS 2.0 📂🔖

> Exploits Google Chrome's bookmark sync service to store files in the cloud for free without freezing the browser.

BookmarkFS is a Chrome extension that turns your browser's bookmark storage into a virtual filesystem. By chunking, compressing, and encoding your files into bookmark titles, Chrome automatically syncs your data across all your devices using Google's native syncing servers.

---

## 🌟 Upstream Credits & Acknowledgment

BookmarkFS 2.0 is a heavily upgraded fork. The original concept and base structure were created by **velzie**.
- **Original Repository**: [velzie/bookmarkfs](https://github.com/velzie/bookmarkfs)
- **Upstream Author**: [velzie](https://github.com/velzie)

All credits for the core bookmark exploit concept go to the original creator. BookmarkFS 2.0 builds upon that foundation with modern extensions, library compression, strong client-side encryption, and interactive preview tools.

---

## 🚀 Key Features in BookmarkFS 2.0

### 1. 📁 Files Manager Panel (Encrypted Filesystem)
*   **⚡ Chrome Freeze Prevention (Schema 3)**: Relocates raw data chunk bookmark nodes into a centralized hidden `__chunks__` folder, preventing Chrome from freezing or crashing when rendering bookmark folders.
*   **⚡ Subtree-Caching Optimization (100x Faster)**: Prefetches the entire virtual files structure in a single `chrome.bookmarks.getSubTree` request, loading file lists instantly.
*   **📁 Virtual Folder Management**: Create directories using the `📁 New Folder` buttons. Right-click folders to rename them or recursively delete their sub-trees.
*   **🔒 Client-Side AES-GCM Encryption**: Optional AES-GCM (256-bit) encryption using WebCrypto. Integrated with a custom modal containing a **Password Strength Meter** and a cryptographic **Password Generator**.
*   **📝 In-Browser Text & Markdown Editor**: Toggle edit mode directly inside the preview modal for text-based files, modify content and update tags, and save changes back to bookmarks.
*   **🎙️ Direct Voice Recorder**: Capture voice notes directly in-browser using the MediaRecorder API and save them as compressed WebM files.
*   **📦 Bulk Operations (ZIP / Move / Delete)**: Select multiple rows using checkboxes to download them as a compiled ZIP archive, move them in bulk, or delete them.
*   **📊 Graphical Storage Analyzer**: Color-coded, responsive analytics bar showing folder space distribution by file categories.
*   **📦 Interactive Archive Previews (ZIP & RAR)**:
    *   **ZIP files**: Inspect ZIP archives in-memory, browsing names and sizes, and download individual files directly.
    *   **RAR files**: Extract and preview RAR archives in-memory using WebAssembly (`node-unrar-js`), sandboxed in a separate CSP-immune iframe environment.
*   **📄 Integrated PDF Viewer**: Native PDF reading inside a premium preview iframe.
*   **🔗 Instant Portable Sharing**: Share files directly from the table rows. The `🔗` button compiles, compresses, and encodes your file into a portable Base64 block copied directly to your clipboard.
*   **⚙️ Persistent & Instant Settings**: Customize maximum bookmark chunk bounds, change pagination size limits, and toggle table columns.

### 2. 🔖 standard Bookmarks Manager Panel
*   **📂 Breadcrumb Browsing**: Navigate your standard Chrome bookmarks tree using a clean breadcrumb structure.
*   **🔥 Most Visited & Recently Added**: Access grids of your 20 most visited sites and recently added bookmarks with a single click.
*   **Folder CRUD**: Create new folders and right-click standard folders to rename or recursively delete them.

### 3. 🗂️ Workspace Tab Session Manager
*   **💾 Active Workspace Saver**: Save all active browser tabs in the current window as a session file, tagged and optionally password-locked.
*   **🚀 Session Restore UI**: Displays session URLs in a card layout with a single-click restore option (restores tabs, window structures, and tabGroups).
*   **💻 Auto-Restore on Boot**: Automatically auto-saves workspace states and optionally restores your last open session on Chrome startup.

### 4. 🌐 Sandboxed Web Browser Panel
*   **🛡️ CSP & CORS Bypassing**: Dynamically strips `frame-options`, `x-frame-options`, and `content-security-policy` response headers from iframe (sub-frame) requests to embed any page.
*   **🌐 URL Bar Sync**: Tracks sub-frame navigations in the iframe using `chrome.webNavigation` to sync the address bar and back/forward history stacks in real-time.
*   **🏠 Navigation Shortcuts**: Integrated controls for Back, Forward, Reload, Open in New Tab, and a Home (`🏠`) button.

### 5. 📝 Rich-Text Page Notes Panel
*   **📝 Tab-Scoped & General Notes**: Switch note scopes between "General Notes", "Domain Notes", and specific "Page URL Notes".
*   **📝 Formatting Ribbon**: MS Word-style rich text ribbon supporting Bold, Italic, Underline, Strikethrough, lists, and clear formatting.
*   **📎 Attachments Manager**: Upload any file (images, PDFs, documents) as note attachments, stored in local storage and download-ready in one click.
*   **📤 Note Backups**: Export individual notes or download a full JSON backup of all notes and attachments.

### 6. 📸 Screenshot Capture & Edit Suite
*   **📸 Full-Page Captures**: Capture entire scrollable pages directly from the sidebar.
*   **✏️ Vector Annotation Editor**: Draw, crop, blur, write text, and add vector shapes (arrows, rectangles) on captured images.
*   **📸 In-Place Preview Modal**: Clicking screenshot thumbnails opens a modal overlay (`#preview-modal`) with Open, Edit, and Delete actions, keeping the user in the sidebar instead of opening new tabs.
*   **🏷️ Toolbar Badge Alerts**: Real-time toolbar badge notifications overlay a green `Note` indicator if notes exist for your active tab.

### 7. 🕵️ Network User-Agent Swapper
*   **🕵️ UA Switcher & Overrides**: Intercepts requests to modify UA headers.
*   **🔄 Dynamic Rotation**: Rotate through mobile UAs to force sites to serve mobile-responsive versions inside the sidebar view.
*   **Facebook Desktop Bypass**: Excludes Facebook domains to prevent iframe redirect script loops.

---

## 🛠️ How It Works Under the Hood

1.  **Bookmark Node Abuse**: Chrome bookmarks are saved as nodes. Folders contain no URL, only a title.
2.  **Size Constraints**: Chrome limits bookmark title length to around 9,092 characters before refusing sync.
3.  **Centralized Chunking (Schema 3)**:
    *   Files are read as `DataURL` (base64) and compressed/encrypted.
    *   A bookmark folder representing the file path is created inside `bookmarkfs`, containing only the file's metadata bookmark.
    *   The file payload is split into chunks and stored under the system folder `bookmarkfs/__chunks__/<folder_id>/`.
    *   Chrome syncs these bookmark folders and nodes in the background.

---

## 📦 Installation & Setup

1.  **Download & Extract**: Clone or download this repository as a ZIP and extract it to a directory on your machine.
2.  **Install Node Dependencies**:
    ```bash
    npm install
    ```
3.  **Build the Project**:
    ```bash
    npm run build
    ```
    This compiles the entry point `./src/index.js` using Webpack and copies the WebAssembly runtime (`unrar.wasm`) into `./dist/`.
4.  **Load Unpacked Extension**:
    *   Open Google Chrome and navigate to `chrome://extensions`.
    *   Enable **Developer mode** (top-right toggle).
    *   Click **Load unpacked** (top-left button).
    *   Select the root directory of the unpacked extension (the folder containing `manifest.json`).

---

## 🎮 Usage Guide

1.  **Launch**: Click the extension icon in your Chrome toolbar or open its options page.
2.  **Upload File**:
    *   Select local files by clicking **Upload**, or drag-and-drop them into the window.
    *   *(Optional)* Enter a passphrase to encrypt your files.
    *   *(Optional)* Specify a virtual folder path in the folder bar to structure your uploads.
3.  **File Management**:
    *   **Search & Page**: Filter files by query and page through large libraries.
    *   **Download**: Reconstruct the file bytes, decrypt/decompress them, and download them.
    *   **Clipboard**: Copy data URLs or raw text directly to your clipboard.
    *   **Rename**: Move files between virtual directories by renaming them.
    *   **Delete**: Remove the file folders and chunk nodes.
4.  **Backup**: Use **Export** to save a JSON manifest backup of your bookmarks, or **Import** to rebuild files from a backup.
5.  **Settings**: Click the **⚙ Settings** button to customize maximum bookmark size (defaults to 9092), change page sizing, toggle table columns, or turn on Light Mode.

---

## 📄 License

This project is licensed under the GPL-3.0-or-later License. See `LICENSE` for details.