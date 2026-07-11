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

*   **📸 Full-Page Screenshot, Viewer & Local Editor**: Capture full scrollable pages directly from your sidebar. Edit, crop, draw, add shapes (rectangles, arrows, blurs, text), and annotate screenshots. Download them as PNGs or PDFs using custom options—**100% locally with zero logins or signup walls**.

*   **⚡ Chrome Freeze Prevention (Schema 3)**: Relocates raw data chunk bookmark nodes into a centralized hidden `__chunks__` folder. The user-facing directories only contain metadata node bookmarks, preventing Chrome from freezing or crashing when rendering bookmark folders.
*   **⚡ Subtree-Caching Optimization (100x Faster)**: Prefetches the entire virtual files structure in a single `chrome.bookmarks.getSubTree` request, eliminating redundant nested IPC database calls to load file lists instantly.
*   **📁 Virtual Folder Management**: Create empty directories using the `📁 New Folder` buttons. Right-click folders in Bookmarks to rename them or recursively delete their sub-trees.
*   **🔗 Instant Portable Sharing**: Share files directly from the table rows. The `🔗` button compiles, compresses, and encodes your file into a portable Base64 block copied directly to your clipboard.
*   **🔒 Client-Side Encryption Modal**: Optional AES-GCM (256-bit) encryption using WebCrypto PBKDF2. Replaces basic browser prompts with a premium custom modal containing a real-time **Password Strength Meter** and a cryptographic **Password Generator**.
*   **📝 In-Browser Text & Markdown Editor**: Toggle edit mode directly inside the preview modal for text-based files, modify content and update tags, and save changes back to the bookmarks bar.
*   **🎙️ Direct Voice Recorder**: Capture voice notes directly in-browser using the MediaRecorder API and save them as compressed WebM files.
*   **📦 Bulk Operations (ZIP / Move / Delete)**: Select multiple rows using checkboxes to download them as a compiled ZIP archive, move them in bulk, or delete them.
*   **📊 Graphical Storage Analyzer**: Color-coded, responsive analytics bar showing folder space distribution by file categories (Images, Audio, Video, Docs, Archives, Code, Other).
*   **🗜️ Automatic Compression**: In-memory Gzip compression via `fflate` reduces bookmark footprint and speeds up sync times.
*   **📦 Interactive Archive Previews (ZIP & RAR)**:
    *   **ZIP files**: Inspect ZIP archives in-memory. Browse names and sizes, and download individual files out of the ZIP directly!
    *   **RAR files**: Extract and preview RAR archives in-memory using WebAssembly (`node-unrar-js`), complete with single-file extraction.
*   **📄 Integrated PDF Viewer**: Native PDF reading inside a premium preview iframe.
*   **🏷️ Tags Filtering**: Assign tags to files and filter them dynamically from the tag search dropdown.
*   **⚙️ Persistent & Instant Settings**: Customize maximum bookmark chunk bounds, change pagination size limits, and toggle table columns (including Preview, Share, and Delete). Changes are preserved across re-renders and apply instantly to your dashboard.
*   **🌐 Navigation URL Bar Sync**: Tracks sub-frame navigations inside the side-panel browser iframe using `chrome.webNavigation` to sync address bars and back/forward history stacks dynamically. Mapped a controls Home (`🏠`) button for instant redirections.

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