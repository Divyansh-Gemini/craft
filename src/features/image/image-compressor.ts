export interface CompressionOptions {
    mode: "lossy" | "lossless";
    targetType: "quality" | "size";
    quality: number; // 1-100
    targetSizeKb: number; // in KB
}

export interface CompressionResult {
    blob: Blob;
    appliedQuality: number;
    savedSpaceBytes: number;
    originalSizeBytes: number;
    compressedSizeBytes: number;
}

/**
 * Trigger single image compression through the Next.js API Route
 */
export async function compressSingleImage(
    file: File,
    options: CompressionOptions
): Promise<CompressionResult> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", options.mode);
    formData.append("targetType", options.targetType);
    formData.append("quality", options.quality.toString());
    formData.append("targetSizeKb", options.targetSizeKb.toString());

    const response = await fetch("/api/compress-image", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        let errorMessage = "Compression failed";
        try {
            const data = await response.json();
            errorMessage = data.error || errorMessage;
        } catch {
            errorMessage = `Compression HTTP ${response.status} failed`;
        }
        throw new Error(errorMessage);
    }

    const blob = await response.blob();
    const appliedQuality = parseInt(response.headers.get("X-Applied-Quality") || "0", 10);
    const savedSpaceBytes = parseInt(response.headers.get("X-Saved-Space-Bytes") || "0", 10);
    const originalSizeBytes = parseInt(response.headers.get("X-Original-Size-Bytes") || file.size.toString(), 10);
    const compressedSizeBytes = parseInt(response.headers.get("X-Compressed-Size-Bytes") || blob.size.toString(), 10);

    return {
        blob,
        appliedQuality,
        savedSpaceBytes,
        originalSizeBytes,
        compressedSizeBytes,
    };
}

