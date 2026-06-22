import {PDFDocument} from "pdf-lib";

/**
 * Extracts specified page numbers from a PDF file client-side.
 * Returns a Promise resolving to a new Blob of the processed PDF.
 *
 * @param file The original PDF File object uploaded by the user
 * @param selectedPages Array of 1-indexed page numbers to extract, in the specified order
 * @param onProgress Callback function for updating progress status in UI
 */
export async function extractPdfPages(
    file: File,
    selectedPages: number[],
    onProgress?: (progress: number, stepName: string) => void
): Promise<Blob> {
    if (selectedPages.length === 0) {
        throw new Error("No pages selected for extraction.");
    }

    if (onProgress) onProgress(10, "Reading file bytes...");
    const arrayBuffer = await file.arrayBuffer();

    if (onProgress) onProgress(30, "Parsing PDF structure...");
    const srcDoc = await PDFDocument.load(arrayBuffer);
    const totalPages = srcDoc.getPageCount();

    // Validate that all selected pages are within range
    const invalidPages = selectedPages.filter(p => p < 1 || p > totalPages);
    if (invalidPages.length > 0) {
        throw new Error(`Invalid page numbers: ${invalidPages.join(", ")}. Document only has ${totalPages} pages.`);
    }

    if (onProgress) onProgress(60, `Extracting ${selectedPages.length} pages...`);
    const destDoc = await PDFDocument.create();

    // Copy document metadata if available
    destDoc.setTitle(srcDoc.getTitle() || "Extracted Document");
    destDoc.setAuthor(srcDoc.getAuthor() || "");
    destDoc.setSubject(srcDoc.getSubject() || "");
    destDoc.setCreator(srcDoc.getCreator() || "Antigravity PDF Tool");
    destDoc.setProducer(srcDoc.getProducer() || "Antigravity PDF Tool");

    // Convert 1-indexed selected pages to 0-indexed page indices
    const pageIndices = selectedPages.map((p) => p - 1);

    // copyPages can copy pages in any order and supports duplication
    const copiedPages = await destDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => {
        destDoc.addPage(page);
    });

    if (onProgress) onProgress(85, "Compressing and saving PDF file...");
    const pdfBytes = await destDoc.save();

    if (onProgress) onProgress(100, "Compilation finished!");
    return new Blob([pdfBytes as unknown as BlobPart], {type: "application/pdf"});
}
