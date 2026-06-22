import {PDFDocument} from "pdf-lib";

export interface ImagesToPdfOptions {
    standardizeWidth: "disable" | "smallest" | "largest";
    pageSize: "original" | "a4" | "letter";
    orientation: "portrait" | "landscape" | "auto";
    margin: "none" | "small" | "medium"; // "none" = 0, "small" = 20, "medium" = 40
}

interface ImageDetails {
    bytes: Uint8Array;
    isPng: boolean;
    width: number;
    height: number;
    name: string;
}

/**
 * Loads an image File into an HTMLImageElement
 */
function loadImageElement(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error(`Failed to load image: ${file.name}`));
        };
        img.src = url;
    });
}

/**
 * Converts any browser-supported image format (PNG, JPG, WebP, SVG, GIF)
 * into compatible JPG or PNG byte buffer at maximum quality.
 */
async function processImageFile(file: File): Promise<ImageDetails> {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const isPng = ext === "png";
    const img = await loadImageElement(file);

    // Create standard Canvas to normalize and render the image
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Could not create 2D rendering canvas context");
    }

    // Draw white background for transparent images converted to JPEGs
    if (!isPng) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, 0, 0);

    const mimeType = isPng ? "image/png" : "image/jpeg";
    const quality = 0.94; // Premium print/view quality

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error(`Failed to export image: ${file.name}`));
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                const bytes = new Uint8Array(reader.result as ArrayBuffer);
                resolve({
                    bytes,
                    isPng,
                    width: canvas.width,
                    height: canvas.height,
                    name: file.name
                });
            };
            reader.onerror = () => reject(new Error(`Failed to read processed bytes: ${file.name}`));
            reader.readAsArrayBuffer(blob);
        }, mimeType, quality);
    });
}

/**
 * Converts multiple image files into a single consolidated PDF document.
 * Keeping the entire operation client-side.
 */
export async function imagesToPdf(
    files: File[],
    options: ImagesToPdfOptions,
    onProgress?: (progress: number, status: string) => void
): Promise<Blob> {
    if (files.length === 0) {
        throw new Error("No images provided for PDF conversion.");
    }

    const pdfDoc = await PDFDocument.create();
    const totalFiles = files.length;
    const processedImages: ImageDetails[] = [];

    // 1. Process all images and convert to compatible buffers
    for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        if (onProgress) {
            onProgress(
                Math.round((i / (totalFiles * 2)) * 100),
                `Optimizing image ${i + 1} of ${totalFiles}: ${file.name}`
            );
        }
        try {
            const details = await processImageFile(file);
            processedImages.push(details);
        } catch (err: any) {
            console.error(err);
            throw new Error(`Failed to process image "${file.name}": ${err.message || err}`);
        }
    }

    // Determine margins in PDF points (1/72 inch)
    let margin = 0;
    if (options.margin === "small") margin = 20;
    else if (options.margin === "medium") margin = 40;

    // A4 and Letter base sizes
    const A4_PORTRAIT = {width: 595.28, height: 841.89};
    const LETTER_PORTRAIT = {width: 612, height: 792};

    // 2. Determine standardization width if option is original size and standardize is active
    let targetWidth: number | null = null;
    if (options.pageSize === "original" && options.standardizeWidth !== "disable") {
        const widths = processedImages.map((img) => img.width);
        if (options.standardizeWidth === "smallest") {
            targetWidth = Math.min(...widths);
        } else if (options.standardizeWidth === "largest") {
            targetWidth = Math.max(...widths);
        }
    }

    // 3. Draw and compile pages in PDF doc
    for (let i = 0; i < totalFiles; i++) {
        if (onProgress) {
            onProgress(
                Math.round(50 + (i / (totalFiles * 2)) * 100),
                `Writing PDF page ${i + 1} of ${totalFiles}: ${processedImages[i].name}`
            );
        }

        const imgDetails = processedImages[i];
        let originalWidth = imgDetails.width;
        let originalHeight = imgDetails.height;

        // Apply scale if width is standardized
        if (targetWidth !== null && Math.abs(originalWidth - targetWidth) > 0.01) {
            const scale = targetWidth / originalWidth;
            originalWidth = targetWidth;
            originalHeight = originalHeight * scale;
        }

        let pageWidth = 0;
        let pageHeight = 0;
        let drawWidth = 0;
        let drawHeight = 0;
        let x = 0;
        let y = 0;

        if (options.pageSize === "original") {
            pageWidth = originalWidth + 2 * margin;
            pageHeight = originalHeight + 2 * margin;
            drawWidth = originalWidth;
            drawHeight = originalHeight;
            x = margin;
            y = margin;
        } else {
            // Determine predefined size: A4 or US Letter
            const baseSize = options.pageSize === "a4" ? A4_PORTRAIT : LETTER_PORTRAIT;

            // Check orientation
            let useLandscape = false;
            if (options.orientation === "landscape") {
                useLandscape = true;
            } else if (options.orientation === "auto") {
                // Set landscape if image is wider than it is tall
                useLandscape = originalWidth > originalHeight;
            }

            pageWidth = useLandscape ? baseSize.height : baseSize.width;
            pageHeight = useLandscape ? baseSize.width : baseSize.height;

            const availableWidth = pageWidth - 2 * margin;
            const availableHeight = pageHeight - 2 * margin;

            // Fit image into available space maintaining aspect ratio
            const scale = Math.min(availableWidth / originalWidth, availableHeight / originalHeight);
            drawWidth = originalWidth * scale;
            drawHeight = originalHeight * scale;

            // Center image on the page
            x = margin + (availableWidth - drawWidth) / 2;
            y = margin + (availableHeight - drawHeight) / 2;
        }

        // Add page to PDF
        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        // Embed image bytes
        let embeddedImage;
        if (imgDetails.isPng) {
            embeddedImage = await pdfDoc.embedPng(imgDetails.bytes);
        } else {
            embeddedImage = await pdfDoc.embedJpg(imgDetails.bytes);
        }

        // Draw image onto the page
        page.drawImage(embeddedImage, {
            x,
            y,
            width: drawWidth,
            height: drawHeight
        });
    }

    if (onProgress) {
        onProgress(98, "Saving generated document metadata...");
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes as any], {type: "application/pdf"});
}
