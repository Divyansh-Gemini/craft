import {PDFDocument} from "pdf-lib";

/**
 * Reorders/duplicates/extracts specified page indices in a PDF file client-side.
 * Returns a Promise resolving to a new Blob of the processed PDF.
 *
 * @param file The original PDF File object uploaded by the user
 * @param pageIndices Array of 0-indexed page indices in the desired final order
 * @param onProgress Callback function for updating progress status in UI
 */
export async function reorderPdfPages(
    file: File,
    pageIndices: number[],
    onProgress?: (progress: number, stepName: string) => void
): Promise<Blob> {
    if (pageIndices.length === 0) {
        throw new Error("No pages selected for the new PDF document.");
    }

    if (onProgress) onProgress(10, "Reading file bytes...");
    const arrayBuffer = await file.arrayBuffer();

    if (onProgress) onProgress(30, "Parsing PDF structure...");
    const srcDoc = await PDFDocument.load(arrayBuffer);
    const totalPages = srcDoc.getPageCount();

    // Validate that all selected page indices are within range
    const invalidIndices = pageIndices.filter(idx => idx < 0 || idx >= totalPages);
    if (invalidIndices.length > 0) {
        throw new Error(
            `Invalid page indices: ${invalidIndices.map(i => i + 1).join(", ")}. Document only has ${totalPages} pages.`
        );
    }

    if (onProgress) onProgress(60, `Reordering & copying ${pageIndices.length} pages...`);
    const destDoc = await PDFDocument.create();

    // Copy document metadata if available
    destDoc.setTitle(srcDoc.getTitle() || "Reordered Document");
    destDoc.setAuthor(srcDoc.getAuthor() || "");
    destDoc.setSubject(srcDoc.getSubject() || "");
    destDoc.setCreator(srcDoc.getCreator() || "Antigravity PDF Tool");
    destDoc.setProducer(srcDoc.getProducer() || "Antigravity PDF Tool");

    // copyPages can copy pages in any order and supports duplication
    const copiedPages = await destDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => {
        destDoc.addPage(page);
    });

    if (onProgress) onProgress(85, "Compressing and saving PDF file...");
    const pdfBytes = await destDoc.save();

    if (onProgress) onProgress(100, "Reordering finished!");
    return new Blob([pdfBytes as unknown as BlobPart], {type: "application/pdf"});
}

/**
 * Parses a page sequence string (e.g., "1-5, 3, 2-4, 5-3") and returns an array of page numbers (1-indexed).
 * Unlike simple set range parsing, this preserves duplicate pages and the exact specified sequence order.
 * E.g., "3-1" expands to [3, 2, 1].
 */
export function parseReorderRange(rangeStr: string, totalPages: number): number[] {
    const cleanStr = rangeStr.trim().toLowerCase();
    if (!cleanStr || cleanStr === "all") {
        return Array.from({length: totalPages}, (_, i) => i + 1);
    }

    const pages: number[] = [];
    const tokens = cleanStr.split(",");

    for (let token of tokens) {
        token = token.trim();
        if (!token) continue;

        if (token.includes("-")) {
            const parts = token.split("-");
            if (parts.length === 2) {
                const start = parseInt(parts[0].trim(), 10);
                const end = parseInt(parts[1].trim(), 10);

                if (!isNaN(start) && !isNaN(end)) {
                    if (start <= end) {
                        for (let p = start; p <= end; p++) {
                            if (p >= 1 && p <= totalPages) {
                                pages.push(p);
                            }
                        }
                    } else {
                        for (let p = start; p >= end; p--) {
                            if (p >= 1 && p <= totalPages) {
                                pages.push(p);
                            }
                        }
                    }
                }
            }
        } else {
            const pageNum = parseInt(token, 10);
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                pages.push(pageNum);
            }
        }
    }

    return pages;
}

/**
 * Serializes an array of page numbers into a compact sequence string (e.g., [1,2,3,5,4,7,8] -> "1-3, 5, 4, 7-8")
 * while preserving custom orders and runs of consecutive pages.
 */
export function serializeReorderRange(pages: number[]): string {
    if (pages.length === 0) return "";

    const ranges: string[] = [];
    let i = 0;

    while (i < pages.length) {
        const start = pages[i];
        let prev = pages[i];
        let j = i + 1;

        // Find consecutive increasing run (e.g., 1, 2, 3)
        while (j < pages.length && pages[j] === prev + 1) {
            prev = pages[j];
            j++;
        }

        if (j - i > 1) {
            ranges.push(`${start}-${prev}`);
            i = j;
        } else {
            ranges.push(String(start));
            i++;
        }
    }

    return ranges.join(", ");
}
