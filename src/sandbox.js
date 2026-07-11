import { createExtractorFromData } from "node-unrar-js";

window.addEventListener("message", async (event) => {
    const data = event.data;
    if (!data || !data.type) return;

    try {
        if (data.type === "unrar-list") {
            const arrayBuffer = data.bytes.buffer ? data.bytes.buffer.slice(data.bytes.byteOffset, data.bytes.byteOffset + data.bytes.byteLength) : data.bytes;
            const extractor = await createExtractorFromData({
                data: arrayBuffer,
                wasmFile: "unrar.wasm"
            });
            const list = extractor.getFileList();
            const headers = Array.from(list.fileHeaders);

            window.parent.postMessage({
                type: "unrar-list-result",
                success: true,
                requestId: data.requestId,
                files: headers.map(h => ({
                    name: h.name,
                    unpSize: h.unpSize,
                    directory: h.flags.directory || h.unpSize === 0
                }))
            }, "*");
        } else if (data.type === "unrar-extract") {
            const arrayBuffer = data.bytes.buffer ? data.bytes.buffer.slice(data.bytes.byteOffset, data.bytes.byteOffset + data.bytes.byteLength) : data.bytes;
            const extractor = await createExtractorFromData({
                data: arrayBuffer,
                wasmFile: "unrar.wasm"
            });
            const extracted = extractor.extract({ files: [data.fileName] });
            const filesArr = Array.from(extracted.files);
            const matchingFile = filesArr[0];

            if (matchingFile && matchingFile.extraction) {
                window.parent.postMessage({
                    type: "unrar-extract-result",
                    success: true,
                    requestId: data.requestId,
                    fileName: data.fileName,
                    content: matchingFile.extraction
                }, "*");
            } else {
                throw new Error("File not found in archive or extraction failed");
            }
        }
    } catch (err) {
        window.parent.postMessage({
            type: "unrar-error",
            success: false,
            requestId: data.requestId,
            message: err.message
        }, "*");
    }
});
