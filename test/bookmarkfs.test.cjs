const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeVirtualPath, incrementVersionedName, splitBySize, migrateMeta } = require("../src/utils.cjs");

test("normalizeVirtualPath strips slashes and normalizes separators", () => {
    assert.equal(normalizeVirtualPath("\\a\\b\\c\\"), "a/b/c");
    assert.equal(normalizeVirtualPath("/foo/bar/"), "foo/bar");
});

test("incrementVersionedName appends and increments numeric suffix", () => {
    assert.equal(incrementVersionedName("file.txt"), "file (2).txt");
    assert.equal(incrementVersionedName("file (2).txt"), "file (3).txt");
});

test("splitBySize chunks string deterministically", () => {
    assert.deepEqual(splitBySize("abcdefgh", 3), ["abc", "def", "gh"]);
});

test("migrateMeta upgrades schema and defaults chunk fields", () => {
    const m = migrateMeta({ schemaVersion: 1, type: "text/plain" }, 100);
    assert.equal(m.schemaVersion, 2);
    assert.equal(m.chunkSize, 100);
    assert.deepEqual(m.chunkHashes, []);
});
