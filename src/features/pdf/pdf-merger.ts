import {PDFDocument} from "pdf-lib";

export interface MergePdfOptions {
    standardizeWidth: "disable" | "smallest" | "largest";
}

/**
 * Merges multiple PDF files in the specified order and returns the merged PDF Blob.
 * Optionally standardizes page widths to match the smallest or largest page.
 */
export async function mergePdfFiles(
    files: File[],
    options: MergePdfOptions,
    onProgress?: (progress: number, currentFileName: string) => void
): Promise<Blob> {
    if (files.length === 0) {
        throw new Error("No files provided for merging.");
    }

    const mergedPdf = await PDFDocument.create();

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (onProgress) {
            onProgress(Math.round((i / files.length) * 100), file.name);
        }

        const arrayBuffer = await file.arrayBuffer();
        const srcDoc = await PDFDocument.load(arrayBuffer);

        // Copy all pages from the source document to the destination document
        const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
        copiedPages.forEach((page) => {
            mergedPdf.addPage(page);
        });
    }

    // Standardize page widths if enabled
    if (options.standardizeWidth !== "disable") {
        const pages = mergedPdf.getPages();
        if (pages.length > 0) {
            let targetWidth = pages[0].getSize().width;

            if (options.standardizeWidth === "smallest") {
                targetWidth = Math.min(...pages.map((p) => p.getSize().width));
            } else if (options.standardizeWidth === "largest") {
                targetWidth = Math.max(...pages.map((p) => p.getSize().width));
            }

            pages.forEach((page) => {
                const {width, height} = page.getSize();
                // Apply scaling only if dimensions vary beyond a tiny precision threshold
                if (Math.abs(width - targetWidth) > 0.01) {
                    const scale = targetWidth / width;
                    page.setSize(targetWidth, height * scale);
                    page.scaleContent(scale, scale);
                }
            });
        }
    }

    if (onProgress) {
        onProgress(100, "Compressing and saving PDF file...");
    }

    const mergedPdfBytes = await mergedPdf.save();
    return new Blob([mergedPdfBytes as any], {type: "application/pdf"});
}

/**
 * Parses PDF metadata client-side to read its total page count.
 */
export async function getPdfPageCount(file: File): Promise<number> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer, {
            updateMetadata: false
        });
        return pdfDoc.getPageCount();
    } catch (err) {
        console.error("Failed to parse PDF metadata for page count:", err);
        return 0;
    }
}
