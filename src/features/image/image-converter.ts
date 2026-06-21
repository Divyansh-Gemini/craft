import JSZip from "jszip";

export interface SupportedFormat {
    id: string;
    name: string;
    extension: string;
    mimeType: string;
}

export const SUPPORTED_FORMATS: SupportedFormat[] = [
    {id: "png", name: "PNG (Portable Network Graphics)", extension: "png", mimeType: "image/png"},
    {id: "jpg", name: "JPG (Joint Photographic Group)", extension: "jpg", mimeType: "image/jpeg"},
    {id: "webp", name: "WebP (Google Web Picture)", extension: "webp", mimeType: "image/webp"},
    {id: "avif", name: "AVIF (AV1 Image File)", extension: "avif", mimeType: "image/avif"},
    {id: "gif", name: "GIF (Graphics Interchange Format)", extension: "gif", mimeType: "image/gif"},
    {id: "tiff", name: "TIFF (Tagged Image File Format)", extension: "tiff", mimeType: "image/tiff"},
    {id: "heic", name: "HEIC (High Efficiency Image Coding)", extension: "heic", mimeType: "image/heic"},
];

/**
 * Format bytes to readable size string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Download a single Blob as a file in the browser
 */
export function downloadBlob(blob: Blob, filename: string): void {
    if (typeof window === "undefined") return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Packages multiple blobs into a single zip file and triggers a browser download
 */
export async function downloadZip(
    files: Array<{ blob: Blob; filename: string }>,
    zipFilename: string = "converted-images.zip"
): Promise<void> {
    const zip = new JSZip();
    files.forEach((file) => {
        zip.file(file.filename, file.blob);
    });
    const zipContent = await zip.generateAsync({type: "blob"});
    downloadBlob(zipContent, zipFilename);
}

/**
 * Trigger single image conversion through the Next.js API Route
 */
export async function convertSingleImage(
    file: File,
    targetFormat: string
): Promise<Blob> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("format", targetFormat);

    const response = await fetch("/api/convert-image", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        let errorMessage = "Conversion failed";
        try {
            const data = await response.json();
            errorMessage = data.error || errorMessage;
        } catch {
            errorMessage = `Conversion HTTP ${response.status} failed`;
        }
        throw new Error(errorMessage);
    }

    return await response.blob();
}
