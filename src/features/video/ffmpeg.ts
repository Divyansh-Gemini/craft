import {FFmpeg} from "@ffmpeg/ffmpeg";
import {toBlobURL, fetchFile} from "@ffmpeg/util";

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

/**
 * Returns the singleton FFmpeg instance.
 */
export function getFFmpeg(): FFmpeg {
    if (typeof window === "undefined") {
        throw new Error("FFmpeg can only be used in browser environments.");
    }
    if (!ffmpegInstance) {
        ffmpegInstance = new FFmpeg();
    }
    return ffmpegInstance;
}

/**
 * Checks if the current environment supports multi-threading (crossOriginIsolated).
 */
export function isMultiThreadingSupported(): boolean {
    return (typeof window !== "undefined"
        && typeof window.SharedArrayBuffer !== "undefined"
        && window.crossOriginIsolated);
}

/**
 * Loads the FFmpeg core files (either multi-threaded or single-threaded, depending on environment).
 */
export async function loadFFmpeg(
    onLog?: (message: string) => void
): Promise<FFmpeg> {
    const ffmpeg = getFFmpeg();
    if (ffmpeg.loaded) {
        return ffmpeg;
    }

    if (loadPromise) {
        return loadPromise;
    }

    loadPromise = (async () => {
        if (onLog) {
            ffmpeg.on("log", ({message}) => {
                onLog(message);
            });
        }

        const useMT = isMultiThreadingSupported();

        // We use stable core versions (0.12.10 matches our search)
        const version = "0.12.10";
        const pkgName = useMT ? "@ffmpeg/core-mt" : "@ffmpeg/core";
        const baseURL = `https://unpkg.com/${pkgName}@${version}/dist/umd`;

        console.log(`[FFmpeg] Loading ${useMT ? "multi-threaded" : "single-threaded"} core...`);

        const config: any = {
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
        };

        if (useMT) {
            config.workerURL = await toBlobURL(
                `${baseURL}/ffmpeg-core.worker.js`,
                "text/javascript"
            );
        }

        await ffmpeg.load(config);
        console.log("[FFmpeg] Loaded successfully.");
        return ffmpeg;
    })();

    try {
        await loadPromise;
        return ffmpeg;
    } catch (error) {
        loadPromise = null;
        console.error("[FFmpeg] Failed to load:", error);
        throw error;
    }
}

/**
 * Mutes a video file by copying the video stream and removing the audio stream.
 * This operation is fast because it does not re-encode the video.
 */
export async function muteVideoFile(
    ffmpeg: FFmpeg,
    file: File,
    onProgress?: (progress: number) => void
): Promise<File> {
    const inputName = `input_${Date.now()}_${file.name}`;
    // Preserve original extension for output
    const fileExt = file.name.substring(file.name.lastIndexOf("."));
    const outputName = `output_${Date.now()}${fileExt}`;

    // Register progress listener
    const progressHandler = ({progress}: { progress: number }) => {
        if (onProgress) {
            // progress is a float between 0 and 1
            onProgress(Math.min(100, Math.round(progress * 100)));
        }
    };

    ffmpeg.on("progress", progressHandler);

    try {
        // Write the input file to FFmpeg's virtual file system
        await ffmpeg.writeFile(inputName, await fetchFile(file));

        // Execute the ffmpeg command:
        // -i: input file
        // -c:v copy: copy the video stream without re-encoding
        // -an: disable audio recording (remove audio track)
        await ffmpeg.exec(["-i", inputName, "-c:v", "copy", "-an", outputName]);

        // Read the muted video output file
        const data = await ffmpeg.readFile(outputName);

        // Convert to standard Uint8Array (and slice to copy if it's pointing to a SharedArrayBuffer)
        const u8 = typeof data === "string"
            ? new TextEncoder().encode(data)
            : new Uint8Array(data as any).slice();

        // Convert to Blob and then File
        const blob = new Blob([u8], {type: file.type});
        return new File([blob], file.name, {type: file.type});
    } finally {
        // Clean up event listener
        ffmpeg.off("progress", progressHandler);

        // Clean up files in virtual file system
        try {
            await ffmpeg.deleteFile(inputName);
            await ffmpeg.deleteFile(outputName);
        } catch (e) {
            // Ignore deletion errors if files don't exist
            console.warn("[FFmpeg] Clean up warning:", e);
        }
    }
}
