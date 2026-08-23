/**
 * BookmarkFS Google Drive Cloud Storage Client
 * REST API v3 implementation with OAuth2 token caching,
 * multipart & resumable chunked upload support, and appProperties metadata.
 */

export async function getAuthToken(interactive = false) {
    return new Promise((resolve) => {
        if (typeof chrome === "undefined" || !chrome.identity || !chrome.identity.getAuthToken) {
            resolve(null);
            return;
        }
        chrome.identity.getAuthToken({ interactive }, (token) => {
            if (chrome.runtime.lastError || !token) {
                resolve(null);
            } else {
                resolve(token);
            }
        });
    });
}

export async function removeCachedAuthToken(token) {
    return new Promise((resolve) => {
        if (typeof chrome !== "undefined" && chrome.identity && chrome.identity.removeCachedAuthToken) {
            chrome.identity.removeCachedAuthToken({ token }, () => resolve());
        } else {
            resolve();
        }
    });
}

export async function isDriveAuthenticated() {
    const token = await getAuthToken(false);
    return !!token;
}

export async function apiFetch(endpoint, options = {}, retryOn401 = true) {
    let token = await getAuthToken(false);
    if (!token && options.interactiveAuth) {
        token = await getAuthToken(true);
    }
    if (!token) throw new Error("Google Drive not connected. Click 'Connect Google Drive' to sign in.");

    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${token}`);

    const url = endpoint.startsWith("http") ? endpoint : `https://www.googleapis.com/${endpoint}`;
    const res = await fetch(url, {
        ...options,
        headers
    });

    if (res.status === 401 && retryOn401) {
        await removeCachedAuthToken(token);
        const newToken = await getAuthToken(true);
        if (newToken) {
            headers.set("Authorization", `Bearer ${newToken}`);
            return fetch(url, { ...options, headers });
        }
    }
    return res;
}

let cachedRootFolderId = null;

export async function getOrCreateRootFolder() {
    if (cachedRootFolderId) return cachedRootFolderId;

    try {
        const q = "name = 'BookmarkFS' and mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and trashed = false";
        const res = await apiFetch(`drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`);
        if (res.ok) {
            const data = await res.json();
            if (data.files && data.files.length > 0) {
                cachedRootFolderId = data.files[0].id;
                return cachedRootFolderId;
            }
        }
    } catch (e) {
        console.warn("Folder search notice:", e);
    }

    // Create root BookmarkFS folder
    const createRes = await apiFetch("drive/v3/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: "BookmarkFS",
            mimeType: "application/vnd.google-apps.folder",
            parents: ["root"]
        })
    });

    if (!createRes.ok) throw new Error("Failed to create BookmarkFS folder in Google Drive: " + createRes.statusText);
    const folder = await createRes.json();
    cachedRootFolderId = folder.id;
    return cachedRootFolderId;
}

export async function listDriveFiles() {
    const rootId = await getOrCreateRootFolder();
    const q = `'${rootId}' in parents and trashed = false`;
    const res = await apiFetch(`drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size,modifiedTime,appProperties,description)&pageSize=1000`);
    if (!res.ok) throw new Error("Failed to list Google Drive files: " + res.statusText);
    const data = await res.json();
    return data.files || [];
}

export async function uploadDriveFile(name, contentBytes, mimeType, metaObj = {}, onProgress = null) {
    const rootId = await getOrCreateRootFolder();

    const metadata = {
        name: name,
        mimeType: mimeType || "application/octet-stream",
        parents: [rootId],
        appProperties: {
            schemaVersion: "4",
            storageType: "gdrive",
            compressed: String(metaObj.compressed || false),
            encrypted: String(metaObj.encrypted || false),
            contentHash: metaObj.contentHash || "",
            sizeOriginal: String(metaObj.sizeOriginal || (contentBytes ? contentBytes.length : 0)),
            dateISO: metaObj.dateISO || new Date().toISOString(),
            tags: Array.isArray(metaObj.tags) ? metaObj.tags.join(",") : (metaObj.tags || "")
        }
    };

    if (!contentBytes || contentBytes.length === 0) {
        contentBytes = new Uint8Array(0);
    }

    if (contentBytes.length < 5 * 1024 * 1024) {
        // Multipart upload for files under 5MB
        const boundary = "-------BookmarkFSBoundary" + Date.now();
        const metaPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
        const filePartHeader = `--${boundary}\r\nContent-Type: ${mimeType || "application/octet-stream"}\r\n\r\n`;
        const endPart = `\r\n--${boundary}--`;

        const encoder = new TextEncoder();
        const p1 = encoder.encode(metaPart);
        const p2 = encoder.encode(filePartHeader);
        const p3 = contentBytes;
        const p4 = encoder.encode(endPart);

        const totalLen = p1.length + p2.length + p3.length + p4.length;
        const body = new Uint8Array(totalLen);
        let offset = 0;
        body.set(p1, offset); offset += p1.length;
        body.set(p2, offset); offset += p2.length;
        body.set(p3, offset); offset += p3.length;
        body.set(p4, offset);

        const res = await apiFetch("upload/drive/v3/files?uploadType=multipart", {
            method: "POST",
            headers: {
                "Content-Type": `multipart/related; boundary=${boundary}`
            },
            body: body
        });

        if (onProgress) onProgress(1);
        if (!res.ok) throw new Error("Google Drive upload failed: " + res.statusText);
        return await res.json();
    } else {
        // Resumable upload for files >= 5MB
        const initRes = await apiFetch("upload/drive/v3/files?uploadType=resumable", {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=UTF-8",
                "X-Upload-Content-Type": mimeType || "application/octet-stream",
                "X-Upload-Content-Length": String(contentBytes.length)
            },
            body: JSON.stringify(metadata)
        });

        if (!initRes.ok) throw new Error("Failed to initialize resumable upload: " + initRes.statusText);
        const sessionUrl = initRes.headers.get("Location");
        if (!sessionUrl) throw new Error("No resumable upload session location received.");

        const CHUNK_SIZE = 1024 * 1024; // 1 MB chunks
        let uploaded = 0;
        let finalFile = null;

        while (uploaded < contentBytes.length) {
            const end = Math.min(uploaded + CHUNK_SIZE, contentBytes.length);
            const chunk = contentBytes.subarray(uploaded, end);

            const chunkRes = await fetch(sessionUrl, {
                method: "PUT",
                headers: {
                    "Content-Range": `bytes ${uploaded}-${end - 1}/${contentBytes.length}`
                },
                body: chunk
            });

            uploaded = end;
            if (onProgress) onProgress(uploaded / contentBytes.length);

            if (chunkRes.status === 200 || chunkRes.status === 201) {
                finalFile = await chunkRes.json();
                break;
            } else if (chunkRes.status === 308) {
                // Resume incomplete, continue uploading next chunk
            } else {
                throw new Error("Resumable chunk upload failed with HTTP " + chunkRes.status);
            }
        }

        return finalFile;
    }
}

export async function downloadDriveFile(fileId) {
    const res = await apiFetch(`drive/v3/files/${fileId}?alt=media`);
    if (!res.ok) throw new Error("Google Drive download failed: " + res.statusText);
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
}

export async function deleteDriveFile(fileId) {
    const res = await apiFetch(`drive/v3/files/${fileId}`, { method: "DELETE" });
    if (!res.ok && res.status !== 404) throw new Error("Google Drive delete failed: " + res.statusText);
}

export async function renameDriveFile(fileId, newName) {
    const res = await apiFetch(`drive/v3/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName })
    });
    if (!res.ok) throw new Error("Google Drive rename failed: " + res.statusText);
    return await res.json();
}

export async function getDriveStorageQuota() {
    try {
        const res = await apiFetch("drive/v3/about?fields=storageQuota,user");
        if (!res.ok) return null;
        const data = await res.json();
        return {
            user: data.user,
            limit: Number(data.storageQuota && data.storageQuota.limit) || 0,
            usage: Number(data.storageQuota && data.storageQuota.usage) || 0,
            usageInDrive: Number(data.storageQuota && data.storageQuota.usageInDrive) || 0
        };
    } catch (e) {
        return null;
    }
}
