/**
 * PDF to Image conversion features
 * Client-side PDF page rendering using pdfjs-dist
 */

/**
 * Validates if the page range input is syntactically valid.
 * Allows numbers, dashes, commas, spaces, and the keyword 'all'.
 */
export function isValidPageRange(rangeStr: string): boolean {
    const cleanStr = rangeStr.trim().toLowerCase();
    if (!cleanStr || cleanStr === "all") return true;

    // Allowed pattern: digits, dash, comma, spaces
    const rangeRegex = /^(\d+|all|\d+\s*-\s*\d+)(\s*,\s*(\d+|\d+\s*-\s*\d+))*$/;
    return rangeRegex.test(cleanStr);
}

/**
 * Parses a page range string (e.g., "1-5, 8, 11-13") and returns an sorted array of unique page numbers (1-indexed).
 * If rangeStr is empty or 'all', returns all page numbers.
 */
export function parsePageRanges(rangeStr: string, totalPages: number): number[] {
    const cleanStr = rangeStr.trim().toLowerCase();
    if (!cleanStr || cleanStr === "all") {
        return Array.from({length: totalPages}, (_, i) => i + 1);
    }

    const pages = new Set<number>();
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
                    const low = Math.max(1, Math.min(start, end));
                    const high = Math.min(totalPages, Math.max(start, end));
                    for (let p = low; p <= high; p++) {
                        pages.add(p);
                    }
                }
            }
        } else {
            const pageNum = parseInt(token, 10);
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                pages.add(pageNum);
            }
        }
    }

    return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Serializes an array of page numbers into a compact range string (e.g., [1,2,3,5,7,8] -> "1-3, 5, 7-8")
 */
export function serializePageRanges(pages: number[]): string {
    if (pages.length === 0) return "";

    const sorted = [...pages].sort((a, b) => a - b);
    const ranges: string[] = [];

    let start = sorted[0];
    let prev = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
        const current = sorted[i];
        if (current === prev + 1) {
            prev = current;
        } else {
            if (start === prev) {
                ranges.push(String(start));
            } else {
                ranges.push(`${start}-${prev}`);
            }
            start = current;
            prev = current;
        }
    }

    // Append the last block
    if (start === prev) {
        ranges.push(String(start));
    } else {
        ranges.push(`${start}-${prev}`);
    }

    return ranges.join(", ");
}

/**
 * Renders a PDF page to a canvas and returns it as a Blob.
 */
export async function renderPageToBlob(
    page: any,
    scale: number = 2.0,
    format: "png" | "jpeg" = "png",
    quality: number = 0.95
): Promise<Blob> {
    const viewport = page.getViewport({scale});

    // Create standard canvas
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const context = canvas.getContext("2d");
    if (!context) {
        throw new Error("Could not get 2D rendering context for canvas");
    }

    // Set high-quality canvas image rendering defaults
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    const renderContext = {
        canvasContext: context,
        viewport: viewport,
    };

    await page.render(renderContext).promise;

    return new Promise<Blob>((resolve, reject) => {
        const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error("Canvas conversion to blob failed"));
                }
            },
            mimeType,
            format === "jpeg" ? quality : undefined
        );
    });
}
