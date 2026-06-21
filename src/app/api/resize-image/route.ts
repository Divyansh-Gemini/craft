import {NextRequest, NextResponse} from "next/server";
import sharp from "sharp";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({error: "No file provided"}, {status: 400});
        }

        const widthStr = formData.get("width") as string | null;
        const heightStr = formData.get("height") as string | null;
        const percentageStr = formData.get("percentage") as string | null;
        const maintainAspectRatioStr = formData.get("maintainAspectRatio") as string | null;
        const fitStr = formData.get("fit") as string | null;

        const maintainAspectRatio = maintainAspectRatioStr !== "false"; // default is true
        const fit = (fitStr as "inside" | "cover" | "fill") || "inside";

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        let image = sharp(buffer);
        const metadata = await image.metadata();
        const originalFormat = metadata.format;

        if (!originalFormat) {
            return NextResponse.json({error: "Could not determine image format"}, {status: 400});
        }

        // Determine resizing dimensions
        let width: number | undefined;
        let height: number | undefined;

        if (percentageStr) {
            const percentage = parseFloat(percentageStr);
            if (isNaN(percentage) || percentage <= 0) {
                return NextResponse.json({error: "Invalid percentage value"}, {status: 400});
            }
            if (metadata.width && metadata.height) {
                width = Math.round(metadata.width * (percentage / 100));
                height = Math.round(metadata.height * (percentage / 100));
            }
        } else {
            if (widthStr) {
                width = parseInt(widthStr, 10);
                if (isNaN(width) || width <= 0) width = undefined;
            }
            if (heightStr) {
                height = parseInt(heightStr, 10);
                if (isNaN(height) || height <= 0) height = undefined;
            }
        }

        if (!width && !height) {
            return NextResponse.json({error: "No valid dimensions or percentage specified"}, {status: 400});
        }

        // Perform resize using sharp
        try {
            image = image.resize({
                width,
                height,
                fit: maintainAspectRatio ? fit : "fill",
            });
        } catch (err) {
            console.error("Sharp resize configuration error:", err);
            const message = err instanceof Error ? err.message : String(err);
            return NextResponse.json({
                error: `Failed to configure resize: ${message}`
            }, {status: 400});
        }

        // Output in original format - do not change format or compress
        let outputFormat = originalFormat.toLowerCase().trim();
        let sharpFormat = outputFormat;
        if (outputFormat === "jpg" || outputFormat === "jpeg") {
            sharpFormat = "jpeg";
        } else if (outputFormat === "heic") {
            sharpFormat = "heif";
        }

        try {
            if (sharpFormat === "heif") {
                image = image.toFormat("heif", {compression: "hevc"});
            } else {
                image = image.toFormat(sharpFormat as any);
            }
        } catch (err) {
            console.error(`Sharp format configuration error for ${sharpFormat}:`, err);
            // Fallback to auto if explicit formatting fails
        }

        let outputBuffer: Buffer;
        try {
            outputBuffer = await image.toBuffer();
        } catch (err) {
            console.error("Sharp buffer extraction error:", err);
            const message = err instanceof Error ? err.message : String(err);
            return NextResponse.json({
                error: `Failed to process image: ${message}`
            }, {status: 500});
        }

        // Map content-type
        let contentType = `image/${sharpFormat}`;
        if (sharpFormat === "jpeg") contentType = "image/jpeg";
        if (sharpFormat === "heif") contentType = "image/heif";

        const originalName = file.name;

        return new Response(new Uint8Array(outputBuffer), {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `attachment; filename="resized-${originalName}"`,
            },
        });
    } catch (error) {
        console.error("API Route Error:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({error: message}, {status: 500});
    }
}
