import {NextRequest, NextResponse} from "next/server";
import sharp from "sharp";
import pngToIco from "png-to-ico";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({error: "No file provided"}, {status: 400});
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const filename = file.name.toLowerCase();
        const isPng = file.type === "image/png" || filename.endsWith(".png");

        const customSizesStr = formData.get("sizes") as string | null;
        const autoSquare = formData.get("autoSquare") !== "false";

        // Standard ICO sizes
        let targetSizes = [16, 32, 48, 256];
        if (customSizesStr) {
            targetSizes = customSizesStr
                .split(",")
                .map(s => parseInt(s.trim(), 10))
                .filter(s => !isNaN(s) && s > 0);
        }

        let icoBuffer: Buffer;

        if (isPng && !customSizesStr) {
            // Convert PNG to ICO using png-to-ico directly
            try {
                icoBuffer = await pngToIco(buffer);
            } catch (err: any) {
                // If it fails because the image is not square and autoSquare is enabled,
                // we convert it using sharp to make it square first.
                if (autoSquare && (err.code === "ESIZE" || err.message?.includes("square"))) {
                    const sharpImage = sharp(buffer);
                    const metadata = await sharpImage.metadata();
                    const size = Math.max(metadata.width || 256, metadata.height || 256);

                    const squaredPngBuffer = await sharpImage
                        .resize(size, size, {
                            fit: "contain",
                            background: {r: 0, g: 0, b: 0, alpha: 0}
                        })
                        .png()
                        .toBuffer();

                    icoBuffer = await pngToIco(squaredPngBuffer);
                } else {
                    throw err;
                }
            }
        } else {
            // For files other than PNG (or if custom sizes are requested):
            // 1. Convert to PNG using sharp (resize/square it)
            // 2. Convert the PNG buffers to ICO using png-to-ico
            const isSvg = file.type === "image/svg+xml" || filename.endsWith(".svg");

            const pngBuffers = await Promise.all(
                targetSizes.map(async (size) => {
                    let resizeImage = isSvg
                        ? sharp(buffer, {density: Math.max(150, size * 2)})
                        : sharp(buffer);

                    return await resizeImage
                        .resize(size, size, {
                            fit: autoSquare ? "contain" : "fill",
                            background: {r: 0, g: 0, b: 0, alpha: 0}
                        })
                        .png()
                        .toBuffer();
                })
            );

            icoBuffer = await pngToIco(pngBuffers);
        }

        const originalNameWithoutExt = file.name.substring(0, file.name.lastIndexOf(".")) || "favicon";

        return new Response(new Uint8Array(icoBuffer), {
            status: 200,
            headers: {
                "Content-Type": "image/x-icon",
                "Content-Disposition": `attachment; filename="${originalNameWithoutExt}.ico"`,
            },
        });
    } catch (error: any) {
        console.error("ICO Generation Error:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({error: message}, {status: 500});
    }
}
