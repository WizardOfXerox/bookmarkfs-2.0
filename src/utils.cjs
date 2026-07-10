function normalizeVirtualPath(p) {
    return (p || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
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

function migrateMeta(meta, fallbackChunkSize = 9092) {
    if (!meta || typeof meta !== "object") return null;
    const m = { ...meta };
    if (!m.schemaVersion) m.schemaVersion = 1;
    if (m.schemaVersion < 2) {
        m.schemaVersion = 2;
        m.chunkSize = m.chunkSize || fallbackChunkSize;
        m.chunkHashes = Array.isArray(m.chunkHashes) ? m.chunkHashes : [];
    }
    return m;
}

module.exports = {
    normalizeVirtualPath,
    incrementVersionedName,
    splitBySize,
    migrateMeta,
};
