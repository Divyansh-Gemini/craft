import {NextRequest, NextResponse} from "next/server";
import sharp from "sharp";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const format = formData.get("format") as string | null;

        if (!file) {
            return NextResponse.json({error: "No file provided"}, {status: 400});
        }

        if (!format) {
            return NextResponse.json({error: "No target format specified"}, {status: 400});
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Normalize format
        const targetFormat = format.toLowerCase().trim();
        let sharpFormat = targetFormat;
        if (targetFormat === "jpg") {
            sharpFormat = "jpeg";
        } else if (targetFormat === "heic") {
            sharpFormat = "heif";
        }

        // Perform conversion using sharp
        let outputBuffer: Buffer;
        try {
            let image = sharp(buffer);

            // Handle output format configuration
            if (sharpFormat === "heif") {
                // If it is HEIF/HEIC, configure to use hevc or standard compression
                image = image.toFormat("heif", {compression: "hevc"});
            } else {
                image = image.toFormat(sharpFormat as "png" | "jpeg" | "webp" | "avif" | "gif" | "tiff" | "heif");
            }

            outputBuffer = await image.toBuffer();
        } catch (err) {
            console.error("Sharp conversion error:", err);
            const message = err instanceof Error ? err.message : String(err);
            return NextResponse.json({
                error: `Failed to convert image: ${message}`
            }, {status: 500});
        }

        // Map content-type
        let contentType = `image/${sharpFormat}`;
        if (sharpFormat === "jpeg") contentType = "image/jpeg";
        if (sharpFormat === "heif") contentType = "image/heif";

        // Return converted image buffer
        return new Response(new Uint8Array(outputBuffer), {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `attachment; filename="converted.${targetFormat}"`,
            },
        });
    } catch (error) {
        console.error("API Route Error:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({error: message}, {status: 500});
    }
}
