export interface ResizeOptions {
    width?: number;
    height?: number;
    percentage?: number;
    maintainAspectRatio: boolean;
    fit: "inside" | "cover" | "fill";
}

/**
 * Trigger single image resizing through the Next.js API Route
 */
export async function resizeSingleImage(
    file: File,
    options: ResizeOptions
): Promise<Blob> {
    const formData = new FormData();
    formData.append("file", file);

    if (options.percentage !== undefined) {
        formData.append("percentage", options.percentage.toString());
    } else {
        if (options.width !== undefined && options.width > 0) {
            formData.append("width", options.width.toString());
        }
        if (options.height !== undefined && options.height > 0) {
            formData.append("height", options.height.toString());
        }
    }

    formData.append("maintainAspectRatio", options.maintainAspectRatio ? "true" : "false");
    formData.append("fit", options.fit);

    const response = await fetch("/api/resize-image", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        let errorMessage = "Resizing failed";
        try {
            const data = await response.json();
            errorMessage = data.error || errorMessage;
        } catch {
            errorMessage = `Resizing HTTP ${response.status} failed`;
        }
        throw new Error(errorMessage);
    }

    return await response.blob();
}
