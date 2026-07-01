"use client";

import React, {useState, useEffect, useRef, useCallback} from "react";
import {
    Delete20Regular,
    Play20Regular,
    CheckmarkCircle20Regular,
    ErrorCircle20Regular,
    Info20Regular,
    SpinnerIos20Regular,
    MusicNote220Regular,
    Add20Regular,
    Settings20Regular
} from "@fluentui/react-icons";
import {Tool} from "@/types/tool";
import {ToolHeader} from "@/components/ui/tool-header";
import {FileDropzone, FileDropzoneRef} from "@/components/ui/file-dropzone";
import {useFFmpeg} from "@/hooks/use-ffmpeg";
import {extractAudioFromVideo} from "@/features/video/ffmpeg";

interface ExtractAudioViewProps {
    tool: Tool;
}

interface AudioFileItem {
    id: string;
    file: File;
    name: string;
    size: number;
    previewUrl: string;
    status: "queued" | "processing" | "success" | "error";
    progress: number;
    outputFile?: File;
    codecDetected?: string;
    errorMsg?: string;
}

interface ExtractionOptions {
    format: "copy" | "mp3" | "m4a";
    bitrate: string;
    channels: string;
    sampleRate: string;
    volume: number;
}

const triggerDownload = (blobOrFile: Blob | File, filename: string) => {
    const url = URL.createObjectURL(blobOrFile);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export function ExtractAudioView({tool}: ExtractAudioViewProps) {
    const {ffmpeg, isLoading: isEngineLoading, isLoaded: isEngineLoaded, loadFFmpeg} = useFFmpeg();

    const [files, setFiles] = useState<AudioFileItem[]>([]);
    const [globalStatus, setGlobalStatus] = useState<"idle" | "processing" | "completed">("idle");
    const [isDownloading, setIsDownloading] = useState(false);

    // Extraction Options State
    const [options, setOptions] = useState<ExtractionOptions>({
        format: "copy",
        bitrate: "256k",
        channels: "keep",
        sampleRate: "keep",
        volume: 1.0
    });

    const fileInputRef = useRef<FileDropzoneRef>(null);
    const filesRef = useRef<AudioFileItem[]>([]);

    // Auto-activate the FFmpeg.wasm engine on component mount
    useEffect(() => {
        if (!isEngineLoaded && !isEngineLoading) {
            loadFFmpeg();
        }
    }, [isEngineLoaded, isEngineLoading, loadFFmpeg]);

    // Sync files reference for cleanup inside useEffect
    useEffect(() => {
        filesRef.current = files;
    }, [files]);

    // Cleanup preview URLs on component unmount
    useEffect(() => {
        return () => {
            filesRef.current.forEach(item => {
                if (item.previewUrl) {
                    URL.revokeObjectURL(item.previewUrl);
                }
            });
        };
    }, []);

    const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
    };

    const handleFilesSelected = useCallback((selectedFiles: FileList) => {
        const newItems: AudioFileItem[] = [];

        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];

            if (!file.type.startsWith("video/")) {
                console.warn(`Skipped non-video file: ${file.name}`);
                continue;
            }

            const previewUrl = URL.createObjectURL(file);

            newItems.push({
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                file,
                name: file.name,
                size: file.size,
                previewUrl,
                status: "queued",
                progress: 0
            });
        }

        if (newItems.length > 0) {
            setFiles(prev => [...prev, ...newItems]);
            setGlobalStatus("idle");
        }
    }, []);

    const handleDeleteFile = useCallback((id: string) => {
        setFiles(prev => {
            const item = prev.find(f => f.id === id);
            if (item?.previewUrl) {
                URL.revokeObjectURL(item.previewUrl);
            }
            return prev.filter(f => f.id !== id);
        });
    }, []);

    const handleClearAll = useCallback(() => {
        files.forEach(item => {
            if (item.previewUrl) {
                URL.revokeObjectURL(item.previewUrl);
            }
        });
        setFiles([]);
        setGlobalStatus("idle");
    }, [files]);

    const handleFormatChange = useCallback((format: "copy" | "mp3" | "m4a") => {
        setOptions(prev => ({
            ...prev,
            format,
            bitrate: format === "mp3" ? "256k" : format === "m4a" ? "192k" : "256k"
        }));
        // Reset file status to queued when settings change, so the user can re-extract with the new profile
        setFiles(prev => prev.map(f => ({
            ...f,
            status: "queued",
            progress: 0,
            outputFile: undefined,
            codecDetected: undefined,
            errorMsg: undefined
        })));
        setGlobalStatus("idle");
    }, []);

    const handleProcessVideos = async () => {
        let activeFfmpeg = ffmpeg;
        if (!activeFfmpeg) {
            try {
                const {loadFFmpeg: loadFFmpegRaw} = await import("@/features/video/ffmpeg");
                activeFfmpeg = await loadFFmpegRaw();
            } catch (err) {
                console.error("Failed to initialize FFmpeg engine:", err);
                return;
            }
        }
        if (!activeFfmpeg) return;

        setGlobalStatus("processing");

        const processedItems: AudioFileItem[] = [];

        for (let i = 0; i < files.length; i++) {
            const item = files[i];

            setFiles(prev => prev.map(f => f.id === item.id ? {...f, status: "processing", progress: 0} : f));

            try {
                const {file: extractedFile, codecDetected} = await extractAudioFromVideo(
                    activeFfmpeg,
                    item.file,
                    options,
                    (progress) => {
                        setFiles(prev => prev.map(f => f.id === item.id ? {...f, progress} : f));
                    }
                );

                const updatedItem: AudioFileItem = {
                    ...item,
                    status: "success",
                    progress: 100,
                    outputFile: extractedFile,
                    codecDetected
                };
                processedItems.push(updatedItem);

                setFiles(prev => prev.map(f => f.id === item.id ? updatedItem : f));
            } catch (err: any) {
                console.error(`Audio extraction failed for ${item.name}:`, err);
                const updatedItem: AudioFileItem = {
                    ...item,
                    status: "error",
                    progress: 0,
                    errorMsg: err?.message || "Failed to extract audio track"
                };
                processedItems.push(updatedItem);
                setFiles(prev => prev.map(f => f.id === item.id ? updatedItem : f));
            }
        }

        setGlobalStatus("completed");

        // Automatically trigger download after completion
        const successfulFiles = processedItems.filter(f => f.status === "success" && f.outputFile);
        if (successfulFiles.length > 0) {
            setIsDownloading(true);
            try {
                if (successfulFiles.length === 1) {
                    const singleItem = successfulFiles[0];
                    if (singleItem.outputFile) {
                        triggerDownload(singleItem.outputFile, singleItem.outputFile.name);
                    }
                } else {
                    const JSZipModule = await import("jszip");
                    const JSZip = (JSZipModule.default || JSZipModule) as any;
                    const zip = new JSZip();

                    const nameCounts: Record<string, number> = {};

                    successfulFiles.forEach(item => {
                        let filename = item.outputFile!.name;
                        if (nameCounts[filename] !== undefined) {
                            nameCounts[filename]++;
                            const extIdx = filename.lastIndexOf(".");
                            const base = filename.substring(0, extIdx);
                            const ext = filename.substring(extIdx);
                            filename = `${base} (${nameCounts[filename]})${ext}`;
                        } else {
                            nameCounts[filename] = 0;
                        }
                        zip.file(filename, item.outputFile!);
                    });

                    const zipContent = await zip.generateAsync({type: "blob"});
                    triggerDownload(zipContent, `extracted-audio-${new Date().toISOString().slice(0, 10)}.zip`);
                }
            } catch (err) {
                console.error("ZIP creation failed:", err);
            } finally {
                setIsDownloading(false);
            }
        }
    };

    const totalFiles = files.length;
    const hasActiveFiles = totalFiles > 0;
    const isProcessing = globalStatus === "processing";

    const overallProgress = totalFiles > 0
        ? Math.round((files.reduce((acc, f) => acc + f.progress, 0) / (totalFiles * 100)) * 100)
        : 0;

    // Grid Options mapping
    const formatOptions = [
        {value: "copy" as const, label: "Original"},
        {value: "mp3" as const, label: "MP3"},
        {value: "m4a" as const, label: "M4A"}
    ];

    return (
        <div className="max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
            <ToolHeader title={tool.title} description={tool.description} iconId={tool.iconId}/>

            <div className="space-y-6">
                <FileDropzone
                    ref={fileInputRef}
                    onFilesSelected={handleFilesSelected}
                    accept="video/*"
                    multiple
                    showDropzone={files.length === 0}
                    icon={<Play20Regular className="w-8 h-8"/>}
                    title={
                        <p className="text-sm font-extrabold text-text-primary">
                            Drag & drop video files here, or <span className="text-primary">browse</span>
                        </p>
                    }
                    description="Supports MP4, WebM, AVI, MOV, MKV, FLV, and more. Audio will be extracted in-browser."
                />

                {hasActiveFiles && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Left column: Video list */}
                        <div className="lg:col-span-7 space-y-4 animate-fadeIn">
                            <div
                                className="border border-border bg-surface/50 backdrop-blur-md rounded-2xl p-5 space-y-4 shadow-xs">
                                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                                    <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                                        <Play20Regular className="w-4 h-4 text-primary"/>
                                        Selected Videos ({totalFiles})
                                    </h3>
                                    <span
                                        className="text-[10px] text-text-muted font-mono bg-surface-secondary px-2 py-0.5 rounded border border-border">
                                        Size: {formatBytes(files.reduce((acc, f) => acc + f.size, 0))}
                                    </span>
                                </div>

                                <div className="space-y-3 max-h-120 overflow-y-auto custom-scrollbar pr-1">
                                    {files.map(item => (
                                        <div
                                            key={item.id}
                                            className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between border border-border bg-surface/70 hover:border-primary/25 rounded-xl p-3 gap-3 transition-all duration-300"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div
                                                    className="relative w-14 h-14 rounded-lg bg-black border border-border overflow-hidden shrink-0 flex items-center justify-center group/video">
                                                    <video
                                                        src={item.previewUrl}
                                                        muted
                                                        loop
                                                        autoPlay
                                                        playsInline
                                                        className="w-full h-full object-cover opacity-80 group-hover/video:opacity-100 transition-opacity duration-300"
                                                    />
                                                    <div
                                                        className="absolute bottom-1.5 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-xs border border-white/10 px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-white tracking-wider leading-none select-none shadow-xs">
                                                        {item.name.substring(item.name.lastIndexOf(".") + 1)}
                                                    </div>
                                                </div>

                                                <div className="min-w-0 space-y-1">
                                                    <div
                                                        className="text-xs font-bold text-text-primary truncate max-w-50 sm:max-w-70"
                                                        title={item.name}>
                                                        {item.name}
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-[9px] font-medium text-text-muted">
                                                            {formatBytes(item.size)}
                                                        </span>
                                                        {item.status === "processing" && (
                                                            <span
                                                                className="text-[9px] font-black text-primary animate-pulse flex items-center gap-1">
                                                                Extracting {item.progress}%
                                                            </span>
                                                        )}
                                                        {item.status === "success" && (
                                                            <span
                                                                className="text-[9px] font-black text-success flex items-center gap-1.5">
                                                                <CheckmarkCircle20Regular className="w-3.5 h-3.5"/>
                                                                Extracted {item.codecDetected ? `(${item.codecDetected.toUpperCase()})` : ""}
                                                            </span>
                                                        )}
                                                        {item.status === "error" && (
                                                            <span
                                                                className="text-[9px] font-black text-danger flex items-center gap-1">
                                                                <ErrorCircle20Regular className="w-3.5 h-3.5"/>
                                                                {item.errorMsg || "Failed"}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                                <button
                                                    onClick={() => handleDeleteFile(item.id)}
                                                    disabled={isProcessing}
                                                    className="p-1.5 rounded-lg border border-border bg-surface text-text-muted hover:text-danger hover:border-danger/30 hover:bg-danger-bg/25 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center transition-colors duration-200"
                                                    title="Remove video"
                                                >
                                                    <Delete20Regular className="w-4 h-4"/>
                                                </button>
                                            </div>

                                            {item.status === "processing" && (
                                                <div
                                                    className="absolute bottom-0 left-0 right-0 h-1 bg-surface-secondary overflow-hidden rounded-b-xl">
                                                    <div
                                                        className="h-full bg-primary rounded-full transition-all duration-300 shadow-[0_0_8px_var(--primary)]"
                                                        style={{width: `${item.progress}%`}}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div
                                    onClick={() => !isProcessing && fileInputRef.current?.trigger()}
                                    className={`w-full flex items-center justify-center border border-dashed border-border p-3 rounded-xl transition-all duration-200 text-xs font-bold text-text-muted gap-2 select-none ${
                                        isProcessing
                                            ? "opacity-40 cursor-not-allowed"
                                            : "hover:border-primary/60 hover:bg-surface/40 hover:text-primary cursor-pointer"
                                    }`}
                                >
                                    <Add20Regular className="w-4 h-4"/>
                                    <span>Add More Video Files</span>
                                </div>
                            </div>
                        </div>

                        {/* Right column: Action controller panel */}
                        <div className="lg:col-span-5 space-y-6">
                            <div
                                className="border border-border bg-surface/50 backdrop-blur-md rounded-2xl p-6 space-y-6 shadow-xs">
                                <div className="flex items-center gap-2 border-b border-border pb-3">
                                    <Settings20Regular className="w-4 h-4 text-primary"/>
                                    <h2 className="text-xs font-black text-text-primary uppercase tracking-wider">
                                        Extraction Profile
                                    </h2>
                                </div>

                                <div className="space-y-5">
                                    {/* Format Selection */}
                                    <div className="space-y-2">
                                        <label
                                            className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted">
                                            Output Audio Format
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {formatOptions.map((opt) => {
                                                const isSelected = options.format === opt.value;
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        disabled={isProcessing}
                                                        onClick={() => handleFormatChange(opt.value)}
                                                        className={`py-2 px-3 rounded-xl text-[11px] font-black text-center transition-all duration-250 cursor-pointer border ${
                                                            isSelected
                                                                ? "bg-surface text-primary border-primary/25 shadow-xs"
                                                                : "bg-surface-secondary/40 text-text-secondary hover:text-text-primary hover:bg-surface/30 border-transparent"
                                                        }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Format details warning/info */}
                                    {options.format === "copy" && (
                                        <div
                                            className="flex gap-2.5 p-3.5 border border-info/10 bg-info-bg/25 text-text-secondary rounded-xl text-[11px] leading-relaxed">
                                            <Info20Regular className="w-4 h-4 shrink-0 text-info mt-0.5"/>
                                            <div>
                                                <strong>Lossless Stream Extraction:</strong> Extracts the original audio
                                                track exactly as-is without re-encoding. This is 100% lossless,
                                                completed instantly, and consumes no extra CPU.
                                            </div>
                                        </div>
                                    )}
                                    {options.format === "mp3" && (
                                        <div
                                            className="flex gap-2.5 p-3.5 border border-info/10 bg-info-bg/25 text-text-secondary rounded-xl text-[11px] leading-relaxed">
                                            <Info20Regular className="w-4 h-4 shrink-0 text-info mt-0.5"/>
                                            <div>
                                                <strong>MP3 Universal Compression:</strong> Re-encodes the audio track
                                                into a standard MP3 file at a high-quality <strong>256 kbps</strong>.
                                                Perfect for older audio systems and universal media compatibility.
                                            </div>
                                        </div>
                                    )}
                                    {options.format === "m4a" && (
                                        <div
                                            className="flex gap-2.5 p-3.5 border border-info/10 bg-info-bg/25 text-text-secondary rounded-xl text-[11px] leading-relaxed">
                                            <Info20Regular className="w-4 h-4 shrink-0 text-info mt-0.5"/>
                                            <div>
                                                <strong>AAC High-Efficiency Encoding:</strong> Re-encodes the audio
                                                track into an M4A file using the advanced AAC codec at an
                                                optimal <strong>192 kbps</strong>. Delivers modern audio fidelity with
                                                smaller file sizes.
                                            </div>
                                        </div>
                                    )}

                                    {/* Global progress loader */}
                                    {isProcessing && (
                                        <div className="space-y-2 py-1 border-t border-border/40 pt-4 animate-fadeIn">
                                            <div
                                                className="flex items-center justify-between text-[10px] font-bold text-primary">
                                                <span>TOTAL EXTRACTION PROGRESS</span>
                                                <span className="font-mono">{overallProgress}%</span>
                                            </div>
                                            <div
                                                className="h-2 w-full bg-surface-secondary rounded-full overflow-hidden border border-border/50">
                                                <div
                                                    className="h-full bg-linear-to-r from-primary to-accent rounded-full transition-all duration-300 shadow-[0_0_8px_var(--primary)]"
                                                    style={{width: `${overallProgress}%`}}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Extraction successfully completed */}
                                    {globalStatus === "completed" && (
                                        <div
                                            className="flex items-start gap-3 p-4 border border-success/20 bg-success-bg/40 text-success rounded-2xl text-xs font-bold animate-fadeIn">
                                            <CheckmarkCircle20Regular className="w-5 h-5 shrink-0"/>
                                            <div>
                                                Successfully extracted and downloaded audio
                                                track{totalFiles > 1 ? "s" : ""}.
                                            </div>
                                        </div>
                                    )}

                                    {/* Control Panel Action Button */}
                                    <div className="space-y-2.5">
                                        <button
                                            onClick={handleProcessVideos}
                                            disabled={isProcessing || isDownloading || !hasActiveFiles}
                                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-extrabold uppercase tracking-wider text-white bg-primary hover:bg-primary-hover disabled:bg-primary/45 disabled:text-white/60 disabled:cursor-not-allowed cursor-pointer shadow-md transition-all duration-200"
                                        >
                                            {isProcessing || isEngineLoading || isDownloading ? (
                                                <>
                                                    <SpinnerIos20Regular className="w-4 h-4 animate-spin"/>
                                                    {isProcessing ? "Extracting Audio..." : isDownloading ? "Downloading..." : "Initializing Engine..."}
                                                </>
                                            ) : (
                                                <>
                                                    <MusicNote220Regular className="w-4 h-4"/>
                                                    {globalStatus === "completed" ? "Extract & Download Again" : `Extract & Download Audio${totalFiles > 1 ? "s" : ""}`}
                                                </>
                                            )}
                                        </button>

                                        {hasActiveFiles && (
                                            <button
                                                onClick={handleClearAll}
                                                disabled={isProcessing || isDownloading}
                                                className="w-full py-2.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider border border-border text-text-secondary hover:bg-surface-secondary/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors duration-200"
                                            >
                                                Clear and Start Over
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
