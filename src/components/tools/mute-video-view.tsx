"use client";

import React, {useState, useEffect, useRef, useCallback} from "react";
import {
    ArrowDownload20Regular,
    Delete20Regular,
    Play20Regular,
    CheckmarkCircle20Regular,
    ErrorCircle20Regular,
    Info20Regular,
    SpinnerIos20Regular,
    SpeakerMute20Regular,
    FolderZip20Regular,
    Add20Regular
} from "@fluentui/react-icons";
import {Tool} from "@/types/tool";
import {ToolHeader} from "@/components/ui/tool-header";
import {FileDropzone, FileDropzoneRef} from "@/components/ui/file-dropzone";
import {useFFmpeg} from "@/hooks/use-ffmpeg";
import {muteVideoFile} from "@/features/video/ffmpeg";

interface MuteVideoViewProps {
    tool: Tool;
}

interface VideoFileItem {
    id: string;
    file: File;
    name: string;
    size: number;
    previewUrl: string;
    status: "queued" | "processing" | "success" | "error";
    progress: number;
    outputFile?: File;
    errorMsg?: string;
}

// Helper utility to trigger file downloads in the browser
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

export function MuteVideoView({tool}: MuteVideoViewProps) {
    const {ffmpeg, isLoading: isEngineLoading, isLoaded: isEngineLoaded, loadFFmpeg} = useFFmpeg();

    const [files, setFiles] = useState<VideoFileItem[]>([]);
    const [globalStatus, setGlobalStatus] = useState<"idle" | "processing" | "completed">("idle");
    const [isDownloading, setIsDownloading] = useState(false);

    const fileInputRef = useRef<FileDropzoneRef>(null);
    const filesRef = useRef<VideoFileItem[]>([]);

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

    // Format bytes to human readable format
    const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
    };

    // Handle file selection/drop
    const handleFilesSelected = useCallback((selectedFiles: FileList) => {
        const newItems: VideoFileItem[] = [];

        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];

            // Validate it is a video file
            if (!file.type.startsWith("video/")) {
                console.warn(`Skipped non-video file: ${file.name}`);
                continue;
            }

            // Generate preview URL
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

    // Remove single file
    const handleDeleteFile = useCallback((id: string) => {
        setFiles(prev => {
            const item = prev.find(f => f.id === id);
            if (item?.previewUrl) {
                URL.revokeObjectURL(item.previewUrl);
            }
            return prev.filter(f => f.id !== id);
        });
    }, []);

    // Clear all files
    const handleClearAll = useCallback(() => {
        files.forEach(item => {
            if (item.previewUrl) {
                URL.revokeObjectURL(item.previewUrl);
            }
        });
        setFiles([]);
        setGlobalStatus("idle");
    }, [files]);

    // Handle mute process
    const handleProcessVideos = async () => {
        if (!isEngineLoaded || !ffmpeg) {
            return;
        }

        setGlobalStatus("processing");

        // Loop through each queued file
        for (let i = 0; i < files.length; i++) {
            const item = files[i];
            if (item.status === "success") continue; // Skip completed files

            setFiles(prev => prev.map(f => f.id === item.id ? {...f, status: "processing", progress: 0} : f));

            try {
                // Execute muting, preserving container format losslessly
                const mutedFile = await muteVideoFile(ffmpeg, item.file, (progress) => {
                    setFiles(prev => prev.map(f => f.id === item.id ? {...f, progress} : f));
                });

                setFiles(prev => prev.map(f => f.id === item.id ? {
                    ...f,
                    status: "success",
                    progress: 100,
                    outputFile: mutedFile
                } : f));
            } catch (err: any) {
                console.error(`Muting failed for ${item.name}:`, err);
                setFiles(prev => prev.map(f => f.id === item.id ? {
                    ...f,
                    status: "error",
                    progress: 0,
                    errorMsg: err?.message || "Failed to mute audio track"
                } : f));
            }
        }

        setGlobalStatus("completed");
    };

    // Download a single file
    const handleDownloadSingle = useCallback((item: VideoFileItem) => {
        if (!item.outputFile) return;
        setIsDownloading(true);
        try {
            triggerDownload(item.outputFile, item.outputFile.name);
        } finally {
            // Set timeout so the user gets clear visual confirmation
            setTimeout(() => setIsDownloading(false), 800);
        }
    }, []);

    // Download all completed files as ZIP (or direct download if single result)
    const handleDownloadAll = useCallback(async () => {
        const completed = files.filter(f => f.status === "success" && f.outputFile);
        if (completed.length === 0) return;

        setIsDownloading(true);
        try {
            if (completed.length === 1) {
                handleDownloadSingle(completed[0]);
                return;
            }

            const JSZipModule = await import("jszip");
            const JSZip = (JSZipModule.default || JSZipModule) as any;
            const zip = new JSZip();

            const nameCounts: Record<string, number> = {};

            completed.forEach(item => {
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
            triggerDownload(zipContent, `muted-videos-${new Date().toISOString().slice(0, 10)}.zip`);
        } catch (err) {
            console.error("ZIP creation failed:", err);
        } finally {
            setIsDownloading(false);
        }
    }, [files, handleDownloadSingle]);

    // Check configuration parameters
    const totalFiles = files.length;
    const completedCount = files.filter(f => f.status === "success").length;
    const hasActiveFiles = totalFiles > 0;
    const isEngineReady = isEngineLoaded && !isEngineLoading;
    const isProcessing = globalStatus === "processing";

    // Progress calculations for visual UI
    const overallProgress = totalFiles > 0
        ? Math.round((files.reduce((acc, f) => acc + f.progress, 0) / (totalFiles * 100)) * 100)
        : 0;

    return (
        <div className="max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
            {/* Header section */}
            <ToolHeader title={tool.title} description={tool.description} iconId={tool.iconId}/>

            {/* Engine loading top bar indicator */}
            {isEngineLoading && (
                <div
                    className="flex items-center gap-3 p-4 border border-warning/20 bg-warning-bg/25 text-warning rounded-2xl text-xs font-bold animate-pulse">
                    <SpinnerIos20Regular className="w-4 h-4 animate-spin"/>
                    <span>Connecting WASM Core processing engine... Loaded media remains 100% private.</span>
                </div>
            )}

            <div className="space-y-6">
                {/* Main upload dropzone (hidden when files are selected) */}
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
                    description="Supports standard formats like MP4, WebM, AVI, MOV, MKV. Stripped locally in-browser."
                />

                {/* Active Split Layout (shown only when videos exist) */}
                {hasActiveFiles && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                        {/* Left column: Video list (7/12 width) */}
                        <div className="lg:col-span-7 space-y-4">
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

                                {/* Scrollable Video List */}
                                <div className="space-y-3 max-h-95 overflow-y-auto custom-scrollbar pr-1">
                                    {files.map(item => (
                                        <div
                                            key={item.id}
                                            className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between border border-border bg-surface/70 hover:border-primary/25 rounded-xl p-3 gap-3 transition-all duration-300"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                {/* Live video playback visual */}
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

                                                {/* Meta */}
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
                                                                Muting {item.progress}%
                                                            </span>
                                                        )}
                                                        {item.status === "success" && (
                                                            <span
                                                                className="text-[9px] font-black text-success flex items-center gap-1">
                                                                <CheckmarkCircle20Regular className="w-3.5 h-3.5"/>
                                                                Muted
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

                                            {/* Action item buttons */}
                                            <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                                {item.status === "success" && item.outputFile && (
                                                    <button
                                                        onClick={() => handleDownloadSingle(item)}
                                                        className="p-1.5 rounded-lg border border-success/30 bg-success-bg/25 text-success hover:bg-success-bg/40 cursor-pointer flex items-center justify-center transition-colors duration-200"
                                                        title="Download individual muted file"
                                                    >
                                                        <ArrowDownload20Regular className="w-4 h-4"/>
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleDeleteFile(item.id)}
                                                    disabled={isProcessing}
                                                    className="p-1.5 rounded-lg border border-border bg-surface text-text-muted hover:text-danger hover:border-danger/30 hover:bg-danger-bg/25 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center transition-colors duration-200"
                                                    title="Remove video file"
                                                >
                                                    <Delete20Regular className="w-4 h-4"/>
                                                </button>
                                            </div>

                                            {/* Row level background progress bar */}
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

                                {/* Slim Add More Trigger Button aligned with PDF design */}
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

                        {/* Right column: Action controller panel (5/12 width) */}
                        <div className="lg:col-span-5 space-y-6">
                            {/* Controller Box */}
                            <div
                                className="border border-border bg-surface/50 backdrop-blur-md rounded-2xl p-6 space-y-6 shadow-xs">
                                <div className="flex items-center gap-2 border-b border-border pb-3">
                                    <SpeakerMute20Regular className="w-4 h-4 text-primary"/>
                                    <h2 className="text-xs font-black text-text-primary uppercase tracking-wider">
                                        Control Panel
                                    </h2>
                                </div>

                                <div className="space-y-4">
                                    {/* Info Notice */}
                                    <div
                                        className="flex gap-2.5 p-3.5 border border-primary/10 bg-primary/5 text-text-secondary rounded-xl text-[11px] leading-relaxed">
                                        <Info20Regular className="w-4 h-4 shrink-0 text-primary mt-0.5"/>
                                        <div>
                                            <strong>Lossless Stream Copying:</strong> This tool extracts the original
                                            video stream and discards the audio track. No re-encoding is done, keeping
                                            full resolution quality.
                                        </div>
                                    </div>

                                    {/* Global progress */}
                                    {isProcessing && (
                                        <div className="space-y-2 py-1">
                                            <div
                                                className="flex items-center justify-between text-[10px] font-bold text-primary">
                                                <span>TOTAL PROCESS PROGRESS</span>
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

                                    {/* Success notification */}
                                    {globalStatus === "completed" && (
                                        <div
                                            className="flex items-start gap-3 p-4 border border-success/20 bg-success-bg/40 text-success rounded-2xl text-xs font-bold animate-fadeIn">
                                            <CheckmarkCircle20Regular className="w-5 h-5 shrink-0"/>
                                            <div>
                                                Successfully muted all video clips.
                                            </div>
                                        </div>
                                    )}

                                    {/* Action button rendering */}
                                    {globalStatus !== "completed" ? (
                                        <button
                                            onClick={handleProcessVideos}
                                            disabled={!isEngineReady || isProcessing || !hasActiveFiles}
                                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-extrabold uppercase tracking-wider text-white bg-primary hover:bg-primary-hover disabled:bg-primary/45 disabled:text-white/60 disabled:cursor-not-allowed cursor-pointer shadow-md transition-all duration-200"
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <SpinnerIos20Regular className="w-4 h-4 animate-spin"/>
                                                    Processing...
                                                </>
                                            ) : !isEngineReady ? (
                                                <>
                                                    <SpinnerIos20Regular
                                                        className="w-4 h-4 animate-spin text-white/70"/>
                                                    Loading WASM Engine...
                                                </>
                                            ) : (
                                                <>
                                                    <SpeakerMute20Regular className="w-4 h-4"/>
                                                    Mute Audio Track{totalFiles > 1 ? "s" : ""}
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <div className="space-y-2.5">
                                            <button
                                                onClick={handleDownloadAll}
                                                disabled={isDownloading}
                                                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-extrabold uppercase tracking-wider text-white bg-success hover:bg-success/90 disabled:bg-success/60 disabled:cursor-not-allowed cursor-pointer shadow-md transition-all duration-200"
                                            >
                                                {isDownloading ? (
                                                    <>
                                                        <SpinnerIos20Regular className="w-4 h-4 animate-spin"/>
                                                        {completedCount > 1 ? "Compiling ZIP..." : "Downloading..."}
                                                    </>
                                                ) : completedCount > 1 ? (
                                                    <>
                                                        <FolderZip20Regular className="w-4 h-4"/>
                                                        Download All as ZIP
                                                    </>
                                                ) : (
                                                    <>
                                                        <ArrowDownload20Regular className="w-4 h-4"/>
                                                        Download Muted Video
                                                    </>
                                                )}
                                            </button>

                                            <button
                                                onClick={handleClearAll}
                                                disabled={isDownloading}
                                                className="w-full py-2.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider border border-border text-text-secondary hover:bg-surface-secondary/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors duration-200"
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
