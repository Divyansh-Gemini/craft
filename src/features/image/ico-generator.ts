export interface IcoOptions {
    sizes?: number[];
    autoSquare?: boolean;
}

/**
 * Trigger favicon ICO generation through the Next.js API Route
 */
export async function generateIco(
    file: File,
    options: IcoOptions = {}
): Promise<Blob> {
    const formData = new FormData();
    formData.append("file", file);

    if (options.sizes && options.sizes.length > 0) {
        formData.append("sizes", options.sizes.join(","));
    }

    if (options.autoSquare !== undefined) {
        formData.append("autoSquare", options.autoSquare ? "true" : "false");
    }

    const response = await fetch("/api/generate-ico", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        let errorMessage = "ICO generation failed";
        try {
            const data = await response.json();
            errorMessage = data.error || errorMessage;
        } catch {
            errorMessage = `ICO Generation HTTP ${response.status} failed`;
        }
        throw new Error(errorMessage);
    }

    return await response.blob();
}
