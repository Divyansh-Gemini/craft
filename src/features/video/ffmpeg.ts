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

/**
 * Extracts the audio track from a video file and encodes it to the specified format
 * or copies the stream losslessly if original is selected.
 */
export async function extractAudioFromVideo(
    ffmpeg: FFmpeg,
    file: File,
    options: {
        format: "mp3" | "m4a" | "wav" | "flac" | "ogg" | "copy";
        bitrate: string;
        channels: string;
        sampleRate: string;
        volume: number;
    },
    onProgress?: (progress: number) => void
): Promise<{ file: File; codecDetected?: string }> {
    const fileExt = file.name.substring(file.name.lastIndexOf("."));
    const inputName = `input_${Date.now()}${fileExt}`;

    // Write input file to FFmpeg VFS
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    // Detect original audio codec to find if there is an audio track and determine copy extension
    let codec = "";
    const logHandler = ({message}: {message: string}) => {
        const audioMatch = message.match(/Audio:\s+([a-zA-Z0-9_-]+)/i);
        if (audioMatch && audioMatch[1]) {
            codec = audioMatch[1].toLowerCase();
        }
    };

    ffmpeg.on("log", logHandler);
    try {
        await ffmpeg.exec(["-i", inputName]);
    } catch {
        // Expected ffmpeg exit code is non-zero when no output file is provided
    } finally {
        ffmpeg.off("log", logHandler);
    }

    if (!codec) {
        try {
            await ffmpeg.deleteFile(inputName);
        } catch {
            // Ignore clean up error
        }
        throw new Error("No audio track detected in this video file.");
    }

    // Determine output extension and mime type
    let ext: string;
    const isCopy = options.format === "copy";

    if (isCopy) {
        const codecToExtension: Record<string, string> = {
            aac: ".m4a",
            mp3: ".mp3",
            ac3: ".ac3",
            eac3: ".eac3",
            opus: ".opus",
            vorbis: ".ogg",
            flac: ".flac",
            pcm_s16le: ".wav",
            pcm_s24le: ".wav",
            pcm_s32le: ".wav",
            pcm_alaw: ".wav",
            pcm_mulaw: ".wav",
            alac: ".m4a",
            truehd: ".thd",
            mp2: ".mp2",
            wma: ".wma",
        };
        ext = codecToExtension[codec] || `.${codec}`;
        // Sanity check extension format
        if (!/^\.[a-zA-Z0-9]+$/.test(ext)) {
            ext = ".m4a";
        }
    } else {
        ext = `.${options.format}`;
    }

    const extensionToMime: Record<string, string> = {
        ".mp3": "audio/mpeg",
        ".m4a": "audio/mp4",
        ".wav": "audio/wav",
        ".flac": "audio/flac",
        ".ogg": "audio/ogg",
        ".opus": "audio/opus",
        ".aac": "audio/aac",
    };
    const mime = extensionToMime[ext] || "audio/x-generic";
    const baseName = file.name.substring(0, file.name.lastIndexOf("."));
    const outputName = `output_${Date.now()}${ext}`;

    const progressHandler = ({progress}: { progress: number }) => {
        if (onProgress) {
            onProgress(Math.min(100, Math.round(progress * 100)));
        }
    };
    ffmpeg.on("progress", progressHandler);

    try {
        const cmdArgs = ["-i", inputName];

        if (isCopy) {
            // No video, lossless audio stream copy
            cmdArgs.push("-vn", "-c:a", "copy");
        } else {
            // No video
            cmdArgs.push("-vn");

            // Setup encoder
            if (options.format === "mp3") {
                cmdArgs.push("-c:a", "libmp3lame");
            } else if (options.format === "m4a") {
                cmdArgs.push("-c:a", "aac");
            } else if (options.format === "wav") {
                cmdArgs.push("-c:a", "pcm_s16le");
            } else if (options.format === "flac") {
                cmdArgs.push("-c:a", "flac");
            } else if (options.format === "ogg") {
                cmdArgs.push("-c:a", "libvorbis");
            }

            // Bitrate (applicable to mp3, m4a, ogg)
            if (options.format !== "wav" && options.format !== "flac" && options.bitrate) {
                cmdArgs.push("-b:a", options.bitrate);
            }

            // Channels
            if (options.channels && options.channels !== "keep") {
                cmdArgs.push("-ac", options.channels);
            }

            // Sample rate
            if (options.sampleRate && options.sampleRate !== "keep") {
                cmdArgs.push("-ar", options.sampleRate);
            }

            // Volume filter
            if (options.volume && options.volume !== 1.0) {
                cmdArgs.push("-filter:a", `volume=${options.volume}`);
            }
        }

        cmdArgs.push(outputName);
        await ffmpeg.exec(cmdArgs);

        const data = await ffmpeg.readFile(outputName);
        const u8 = typeof data === "string"
            ? new TextEncoder().encode(data)
            : new Uint8Array(data as Uint8Array).slice();

        const blob = new Blob([u8], {type: mime});
        const outputFileName = `${baseName}${ext}`;
        return {
            file: new File([blob], outputFileName, {type: mime}),
            codecDetected: codec
        };
    } finally {
        ffmpeg.off("progress", progressHandler);
        try {
            await ffmpeg.deleteFile(inputName);
            await ffmpeg.deleteFile(outputName);
        } catch {
            // Ignore clean up warning
        }
    }
}

