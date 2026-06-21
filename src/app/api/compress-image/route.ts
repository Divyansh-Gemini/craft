import {NextRequest, NextResponse} from "next/server";
import sharp from "sharp";

/**
 * Utility to compress an image buffer with a specific format and quality
 */
async function compressWithQuality(
    buffer: Buffer,
    format: string,
    quality: number,
    mode: "lossy" | "lossless"
): Promise<Buffer> {
    let image = sharp(buffer);

    const f = format.toLowerCase().trim();

    if (mode === "lossless") {
        if (f === "png") {
            return await image.png({compressionLevel: 9, palette: false}).toBuffer();
        } else if (f === "webp") {
            return await image.webp({lossless: true, effort: 6}).toBuffer();
        } else if (f === "avif") {
            return await image.avif({lossless: true, effort: 4}).toBuffer();
        } else if (f === "heif" || f === "heic") {
            return await image.heif({lossless: true}).toBuffer();
        } else if (f === "tiff") {
            return await image.tiff({compression: "deflate"}).toBuffer();
        } else {
            // For formats that do not support lossless (e.g. JPEG), optimize coding and scans at highest quality
            return await image.jpeg({
                quality: 100,
                progressive: true,
                optimiseScans: true,
                optimiseCoding: true,
                trellisQuantisation: true,
                overshootDeringing: true
            }).toBuffer();
        }
    } else {
        // Lossy compression
        if (f === "png") {
            // Lossy PNG compression maps quality to palette color reduction
            return await image.png({quality, compressionLevel: 9, palette: true}).toBuffer();
        } else if (f === "webp") {
            return await image.webp({quality, effort: 4}).toBuffer();
        } else if (f === "avif") {
            return await image.avif({quality, effort: 4}).toBuffer();
        } else if (f === "heif" || f === "heic") {
            return await image.heif({quality}).toBuffer();
        } else if (f === "tiff") {
            return await image.tiff({quality}).toBuffer();
        } else {
            // Default is JPEG/JPG
            return await image.jpeg({
                quality,
                progressive: true,
                optimiseScans: true,
                mozjpeg: true
            }).toBuffer();
        }
    }
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({error: "No file provided"}, {status: 400});
        }

        const mode = (formData.get("mode") as "lossy" | "lossless") || "lossy";
        const targetType = (formData.get("targetType") as "quality" | "size") || "quality";
        const qualityStr = formData.get("quality") as string | null;
        const targetSizeKbStr = formData.get("targetSizeKb") as string | null;

        const defaultQuality = qualityStr ? parseInt(qualityStr, 10) : 75;
        const quality = isNaN(defaultQuality) ? 75 : Math.max(1, Math.min(100, defaultQuality));

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes) as unknown as Buffer;

        // Get format metadata
        const metadata = await sharp(buffer).metadata();
        const originalFormat = metadata.format;

        if (!originalFormat) {
            return NextResponse.json({error: "Could not determine image format"}, {status: 400});
        }

        let sharpFormat = originalFormat.toLowerCase().trim();
        if (sharpFormat === "jpg" || sharpFormat === "jpeg") {
            sharpFormat = "jpeg";
        } else if (sharpFormat === "heic") {
            sharpFormat = "heif";
        }

        let outputBuffer: Buffer;
        let appliedQuality = mode === "lossless" ? 100 : quality;

        if (mode === "lossless") {
            // Lossless optimization
            outputBuffer = await compressWithQuality(buffer, sharpFormat, 100, "lossless");
        } else if (targetType === "size" && targetSizeKbStr) {
            // Binary search compression to hit target size (in KB)
            const targetSizeBytes = parseInt(targetSizeKbStr, 10) * 1024;
            if (isNaN(targetSizeBytes) || targetSizeBytes <= 0) {
                return NextResponse.json({error: "Invalid target size"}, {status: 400});
            }

            let low = 1;
            let high = 100;
            let bestBuffer = buffer;
            let bestQuality = 75;
            let minDiff = Infinity;
            let closestBuffer = buffer;
            let closestQuality = 1;

            // We perform a binary search with 7 iterations to find the optimal quality level
            for (let i = 0; i < 7; i++) {
                const mid = Math.floor((low + high) / 2);
                let currentBuffer: Buffer;
                try {
                    currentBuffer = await compressWithQuality(buffer, sharpFormat, mid, "lossy");
                } catch (e) {
                    high = mid - 1;
                    continue;
                }
                const currentSize = currentBuffer.length;

                if (currentSize <= targetSizeBytes) {
                    bestBuffer = currentBuffer;
                    bestQuality = mid;
                    // Quality is good, try to search higher (better visual quality) while staying under size
                    low = mid + 1;
                } else {
                    // Size is too big, search lower quality
                    high = mid - 1;
                    // Save this as closest fallback if no quality gets under target size
                    const diff = currentSize - targetSizeBytes;
                    if (diff < minDiff) {
                        minDiff = diff;
                        closestBuffer = currentBuffer;
                        closestQuality = mid;
                    }
                }
            }

            // If we found a quality that satisfies the target size, use it. Otherwise, use the closest quality we could get.
            if (bestBuffer.length <= targetSizeBytes || bestBuffer.length === buffer.length) {
                outputBuffer = bestBuffer;
                appliedQuality = bestQuality;
            } else {
                outputBuffer = closestBuffer;
                appliedQuality = closestQuality;
            }
        } else {
            // Simple quality-based lossy compression
            outputBuffer = await compressWithQuality(buffer, sharpFormat, quality, "lossy");
        }

        // Setup correct mime type
        let contentType = `image/${sharpFormat}`;
        if (sharpFormat === "jpeg") contentType = "image/jpeg";
        if (sharpFormat === "heif") contentType = "image/heif";

        // If the compressed output is actually larger than the original input, send the original buffer
        const finalBuffer = outputBuffer.length < buffer.length ? outputBuffer : buffer;
        const savedSpace = Math.max(0, buffer.length - finalBuffer.length);

        return new Response(new Uint8Array(finalBuffer), {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `attachment; filename="compressed-${file.name}"`,
                "X-Applied-Quality": appliedQuality.toString(),
                "X-Saved-Space-Bytes": savedSpace.toString(),
                "X-Original-Size-Bytes": buffer.length.toString(),
                "X-Compressed-Size-Bytes": finalBuffer.length.toString(),
            },
        });
    } catch (error) {
        console.error("Image Compression API Error:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({error: message}, {status: 500});
    }
}
