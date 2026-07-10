# BookmarkFS 2.0 📂🔖

> Exploits Google Chrome's bookmark sync service to store files in the cloud for free.

BookmarkFS is a Chrome extension that turns your browser's bookmark storage into a virtual filesystem. By chunking, compressing, and encoding your files into bookmark titles, Chrome automatically syncs your data across all your devices using Google's native syncing servers.

---

## 🌟 Upstream Credits & Acknowledgment

BookmarkFS 2.0 is a heavily upgraded fork. The original concept and base structure were created by **velzie**.
- **Original Repository**: [velzie/bookmarkfs](https://github.com/velzie/bookmarkfs)
- **Upstream Author**: [velzie](https://github.com/velzie)

All credits for the core bookmark exploit concept go to the original creator. BookmarkFS 2.0 builds upon that foundation with modern extensions, library compression, strong client-side encryption, and interactive preview tools.

---

## 🚀 Key Features in BookmarkFS 2.0

*   **🔒 Client-Side Encryption**: Optional AES-GCM (256-bit) encryption using WebCrypto PBKDF2. Your password is never sent anywhere, keeping your synced bookmarks fully private.
*   **🗜️ Automatic Compression**: In-memory Gzip compression via `fflate` reduces bookmark footprint and speeds up sync times.
*   **📦 Interactive Archive Previews (ZIP & RAR)**:
    *   **ZIP files**: Inspect ZIP archives in-memory. Browse names and sizes, and download individual files out of the ZIP directly!
    *   **RAR files**: Extract and preview RAR archives in-memory using WebAssembly (`node-unrar-js`), complete with single-file extraction.
*   **📄 Integrated PDF Viewer**: Native PDF reading inside a premium preview iframe.
*   **📝 Beautiful Markdown Renderer**: Inline rendering of Markdown (`.md`) files with clean typography, list formats, headings, and code containers.
*   **💻 Developer Code Viewer**: Interactive preview of code files (`.js`, `.json`, `.ts`, `.html`, `.css`, `.py`, `.sh`, etc.) with VS Code-style syntax highlighting and copy-safe line numbers.
*   **📂 Virtual Directories**: Organize files into virtual folders (e.g. `images/summer/photo.jpg`) and navigate through directories.
*   **🖱️ Drag & Drop / URL Dropping**: Drag local files or images directly from websites into the extension to upload them. The background script fetches the web links and stores the content.
*   **💾 Library Backup (Export & Import)**: Back up all files and metadata as a single JSON file.
*   **⚙️ Custom Settings**: Adjust maximum bookmark chunk sizes, change table pagination size, toggle column visibility, or switch between Dark/Light mode.
*   **🔄 Resume Checkpoints**: Failed or long uploads save progress states in `chrome.storage.local` to resume from where they left off.

---

## 🛠️ How It Works Under the Hood

1.  **Bookmark Node Abuse**: Chrome bookmarks are saved as nodes. Folders contain no URL, only a title.
2.  **Size Constraints**: Chrome limits bookmark title length to around 9,092 characters before refusing sync.
3.  **Serialization**:
    *   Files are read as `DataURL` (base64).
    *   The byte array is compressed with Gzip, and optionally encrypted with AES-GCM.
    *   A tag (`c` for compressed, `r` for raw) is prepended, and the resulting payload is base64-encoded.
4.  **Chunking & Storage**:
    *   The payload is sliced into chunks matching your target size.
    *   A bookmark folder is created for the file, containing one metadata node (`!meta:...` containing hashes, file details, and chunk integrity maps) and multiple data nodes.
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

## ⚠️ Important Disclaimer

> [!WARNING]
> **DO NOT** hover over or open the `bookmarkfs` folder inside Chrome's native bookmark bar or bookmark manager if you have large files uploaded. It can freeze Chrome or crash lower-end devices as the browser attempts to render thousands of chunk nodes at once.
> Use the extension popup interface to browse, preview, and download your files safely.

---

## 📄 License

This project is licensed under the GPL-3.0-or-later License. See `LICENSE` for details.