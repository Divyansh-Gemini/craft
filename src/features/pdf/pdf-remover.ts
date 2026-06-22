import {PDFDocument} from "pdf-lib";

/**
 * Removes specified page numbers from a PDF file client-side.
 * Returns a Promise resolving to a new Blob of the processed PDF.
 *
 * @param file The original PDF File object uploaded by the user
 * @param removedPages Array of 1-indexed page numbers to exclude
 * @param onProgress Callback function for updating progress status in UI
 */
export async function removePdfPages(
    file: File,
    removedPages: number[],
    onProgress?: (progress: number, stepName: string) => void
): Promise<Blob> {
    if (onProgress) onProgress(10, "Reading file bytes...");
    const arrayBuffer = await file.arrayBuffer();

    if (onProgress) onProgress(30, "Parsing PDF structure...");
    const srcDoc = await PDFDocument.load(arrayBuffer);
    const totalPages = srcDoc.getPageCount();

    const removedSet = new Set(removedPages);
    const keptPageIndices: number[] = [];

    for (let i = 0; i < totalPages; i++) {
        if (!removedSet.has(i + 1)) {
            keptPageIndices.push(i);
        }
    }

    if (keptPageIndices.length === 0) {
        throw new Error("Cannot remove all pages. At least one page must remain in the document.");
    }

    if (onProgress) onProgress(60, `Excluding pages and building new layout...`);
    const destDoc = await PDFDocument.create();

    // Copy the document metadata as well, if possible
    destDoc.setTitle(srcDoc.getTitle() || "Processed Document");
    destDoc.setAuthor(srcDoc.getAuthor() || "");
    destDoc.setSubject(srcDoc.getSubject() || "");
    destDoc.setCreator(srcDoc.getCreator() || "Antigravity PDF Tool");
    destDoc.setProducer(srcDoc.getProducer() || "Antigravity PDF Tool");

    const copiedPages = await destDoc.copyPages(srcDoc, keptPageIndices);
    copiedPages.forEach((page) => {
        destDoc.addPage(page);
    });

    if (onProgress) onProgress(85, "Compressing and saving PDF file...");
    const pdfBytes = await destDoc.save();

    if (onProgress) onProgress(100, "Compilation finished!");
    return new Blob([pdfBytes as any], {type: "application/pdf"});
}
