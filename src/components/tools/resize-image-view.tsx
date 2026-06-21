"use client";

import React, {useState, useRef, useCallback, useEffect} from "react";
import {useRouter} from "next/navigation";
import {
    ArrowLeft20Regular,
    Dismiss20Regular,
    ArrowDownload20Regular,
    Image20Regular,
    CheckmarkCircle20Regular,
    ErrorCircle20Regular,
    ArrowCounterclockwise20Regular,
    Delete20Regular,
    Add20Regular,
    LockClosed20Regular,
    LockOpen20Regular,
    Settings20Regular,
} from "@fluentui/react-icons";
import {Tool} from "@/types/tool";
import {formatBytes, downloadBlob, downloadZip} from "@/features/image/image-converter";
import {resizeSingleImage, ResizeOptions} from "@/features/image/image-resizer";

interface ResizeImageViewProps {
    tool: Tool;
}

interface ResizeFileItem {
    id: string;
    file: File;
    name: string;
    size: number;
    previewUrl: string | null;
    inputFormat: string;
    originalWidth: number | null;
    originalHeight: number | null;
    status: "idle" | "resizing" | "success" | "error";
    errorMsg?: string;
    resizedBlob?: Blob;
    resizedSize?: number;
    resizedWidth?: number;
    resizedHeight?: number;
}

/**
 * Helper to generate target resized filename
 */
const getResizedFilename = (name: string, inputFormat: string): string => {
    const lastDot = name.lastIndexOf(".");
    const nameWithoutExt = lastDot !== -1 ? name.substring(0, lastDot) : name;
    const ext = lastDot !== -1 ? name.substring(lastDot + 1) : inputFormat;
    return `${nameWithoutExt}-resized.${ext}`;
};

export function ResizeImageView({tool}: ResizeImageViewProps) {
    const router = useRouter();
    const [files, setFiles] = useState<ResizeFileItem[]>([]);
    const [resizeMode, setResizeMode] = useState<"dimensions" | "percentage">("dimensions");

    // Resize controls
    const [widthInput, setWidthInput] = useState<string>("800");
    const [heightInput, setHeightInput] = useState<string>("600");
    const [percentage, setPercentage] = useState<number>(50);
    const [maintainAspectRatio, setMaintainAspectRatio] = useState<boolean>(true);

    // UI state
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [isResizing, setIsResizing] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Clean up Object URLs when files are removed or component unmounts
    useEffect(() => {
        return () => {
            files.forEach((item) => {
                if (item.previewUrl) {
                    URL.revokeObjectURL(item.previewUrl);
                }
            });
        };
    }, [files]);

    // Baseline ratio helper (based on the first file)
    const getBaselineRatio = useCallback(() => {
        const first = files[0];
        if (first && first.originalWidth && first.originalHeight) {
            return first.originalWidth / first.originalHeight;
        }
        return null;
    }, [files]);

    // Retrieve dimensions of an image file on client side
    const loadImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
        return new Promise((resolve) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);
            img.src = objectUrl;
            img.onload = () => {
                resolve({width: img.naturalWidth, height: img.naturalHeight});
                URL.revokeObjectURL(objectUrl);
            };
            img.onerror = () => {
                resolve({width: 0, height: 0});
                URL.revokeObjectURL(objectUrl);
            };
        });
    };

    const handleFiles = useCallback(async (fileList: FileList | File[]) => {
        const newItems: ResizeFileItem[] = [];

        for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            const ext = file.name.split(".").pop()?.toLowerCase() || "";
            const isImage = file.type.startsWith("image/") || ext === "heic" || ext === "heif";
            if (!isImage) continue;

            const id = Math.random().toString(36).substring(2, 9);
            const inputFormat = ext === "jpeg" ? "jpg" : ext;

            let previewUrl: string | null = null;
            if (ext !== "heic" && ext !== "heif") {
                previewUrl = URL.createObjectURL(file);
            }

            // Create placeholder item
            const newItem: ResizeFileItem = {
                id,
                file,
                name: file.name,
                size: file.size,
                previewUrl,
                inputFormat,
                originalWidth: null,
                originalHeight: null,
                status: "idle",
            };
            newItems.push(newItem);
        }

        if (newItems.length > 0) {
            // Load dimensions asynchronously
            const updatedItems = await Promise.all(
                newItems.map(async (item) => {
                    const dims = await loadImageDimensions(item.file);
                    return {
                        ...item,
                        originalWidth: dims.width || null,
                        originalHeight: dims.height || null,
                    };
                })
            );

            setFiles((prev) => {
                const combined = [...prev, ...updatedItems];

                // If it is the first upload, prefill the dimensions inputs with its dimensions
                if (prev.length === 0 && updatedItems[0]?.originalWidth && updatedItems[0]?.originalHeight) {
                    setWidthInput(updatedItems[0].originalWidth.toString());
                    setHeightInput(updatedItems[0].originalHeight.toString());
                }
                return combined;
            });
        }
    }, []);

    // Sync dimensions if maintain aspect ratio is locked
    const handleWidthChange = (valStr: string) => {
        setWidthInput(valStr);
        const val = parseInt(valStr, 10);
        if (maintainAspectRatio && !isNaN(val) && val > 0) {
            const ratio = getBaselineRatio();
            if (ratio) {
                setHeightInput(Math.round(val / ratio).toString());
            }
        }
    };

    const handleHeightChange = (valStr: string) => {
        setHeightInput(valStr);
        const val = parseInt(valStr, 10);
        if (maintainAspectRatio && !isNaN(val) && val > 0) {
            const ratio = getBaselineRatio();
            if (ratio) {
                setWidthInput(Math.round(val * ratio).toString());
            }
        }
    };

    // Toggle aspect ratio lock and synchronize values
    const toggleAspectRatio = () => {
        setMaintainAspectRatio((prev) => {
            const next = !prev;
            if (next) {
                const ratio = getBaselineRatio();
                const widthVal = parseInt(widthInput, 10);
                if (ratio && !isNaN(widthVal) && widthVal > 0) {
                    setHeightInput(Math.round(widthVal / ratio).toString());
                }
            }
            return next;
        });
    };

    // Auto-update heights if files change and aspect ratio is active
    useEffect(() => {
        if (maintainAspectRatio && files.length > 0) {
            const ratio = getBaselineRatio();
            const widthVal = parseInt(widthInput, 10);
            if (ratio && !isNaN(widthVal) && widthVal > 0) {
                setHeightInput(Math.round(widthVal / ratio).toString());
            }
        }
    }, [files, maintainAspectRatio, getBaselineRatio]);

    // Reset file statuses to "idle" if settings are updated after resizing
    useEffect(() => {
        setFiles((prev) => {
            const hasNonIdle = prev.some((f) => f.status === "success" || f.status === "error");
            if (!hasNonIdle) return prev;
            return prev.map((f) => ({
                ...f,
                status: "idle",
                errorMsg: undefined,
            }));
        });
    }, [resizeMode, widthInput, heightInput, percentage, maintainAspectRatio]);

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = () => {
        setIsDragging(false);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            handleFiles(e.target.files);
            e.target.value = "";
        }
    };

    const removeFile = useCallback((id: string) => {
        setFiles((prev) => {
            const target = prev.find((item) => item.id === id);
            if (target && target.previewUrl) {
                URL.revokeObjectURL(target.previewUrl);
            }
            return prev.filter((item) => item.id !== id);
        });
    }, []);

    const clearAll = useCallback(() => {
        files.forEach((item) => {
            if (item.previewUrl) {
                URL.revokeObjectURL(item.previewUrl);
            }
        });
        setFiles([]);
    }, [files]);

    const processItemResize = useCallback(async (item: ResizeFileItem) => {
        setFiles((prev) =>
            prev.map((f) =>
                f.id === item.id ? {...f, status: "resizing", errorMsg: undefined} : f
            )
        );

        try {
            const options: ResizeOptions = {
                maintainAspectRatio,
                fit: "inside", // maintaining aspect ratio by default fits inside bounding box
            };

            const targetW = parseInt(widthInput, 10);
            const targetH = parseInt(heightInput, 10);

            if (resizeMode === "percentage") {
                options.percentage = percentage;
            } else {
                if (!isNaN(targetW) && targetW > 0) options.width = targetW;
                if (!isNaN(targetH) && targetH > 0) options.height = targetH;
            }

            const blob = await resizeSingleImage(item.file, options);

            // Read new dimensions of the resized image
            let resizedWidth = item.originalWidth ? item.originalWidth : undefined;
            let resizedHeight = item.originalHeight ? item.originalHeight : undefined;

            if (resizeMode === "percentage") {
                if (item.originalWidth) resizedWidth = Math.round(item.originalWidth * (percentage / 100));
                if (item.originalHeight) resizedHeight = Math.round(item.originalHeight * (percentage / 100));
            } else {
                if (maintainAspectRatio && item.originalWidth && item.originalHeight && !isNaN(targetW) && !isNaN(targetH)) {
                    // Calculate fit inside dimensions
                    const widthRatio = targetW / item.originalWidth;
                    const heightRatio = targetH / item.originalHeight;
                    const scale = Math.min(widthRatio, heightRatio, 1);

                    resizedWidth = Math.round(item.originalWidth * scale);
                    resizedHeight = Math.round(item.originalHeight * scale);
                } else {
                    if (!isNaN(targetW) && targetW > 0) resizedWidth = targetW;
                    if (!isNaN(targetH) && targetH > 0) resizedHeight = targetH;
                }
            }

            setFiles((prev) =>
                prev.map((f) =>
                    f.id === item.id
                        ? {
                            ...f,
                            status: "success",
                            resizedBlob: blob,
                            resizedSize: blob.size,
                            resizedWidth,
                            resizedHeight,
                        }
                        : f
                )
            );
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Failed to resize";
            setFiles((prev) =>
                prev.map((f) =>
                    f.id === item.id
                        ? {...f, status: "error", errorMsg}
                        : f
                )
            );
        }
    }, [resizeMode, widthInput, heightInput, percentage, maintainAspectRatio]);

    // Perform the resizing process
    const startResizing = async () => {
        if (files.length === 0 || isResizing) return;
        setIsResizing(true);

        const itemsToProcess = files.filter(
            (item) => item.status === "idle" || item.status === "error"
        );

        await Promise.all(itemsToProcess.map(processItemResize));
        setIsResizing(false);
    };

    const resizeSingleItem = async (id: string) => {
        const item = files.find((f) => f.id === id);
        if (!item || item.status === "resizing") return;

        await processItemResize(item);
    };

    // Download handlers
    const triggerSingleDownload = (item: ResizeFileItem) => {
        if (!item.resizedBlob) return;
        const filename = getResizedFilename(item.name, item.inputFormat);
        downloadBlob(item.resizedBlob, filename);
    };

    const triggerZipDownload = async () => {
        const successfulFiles = files.filter(
            (item) => item.status === "success" && item.resizedBlob
        );
        if (successfulFiles.length === 0) return;

        const filesToZip = successfulFiles.map((item) => ({
            blob: item.resizedBlob!,
            filename: getResizedFilename(item.name, item.inputFormat),
        }));

        try {
            await downloadZip(filesToZip, "resized-images.zip");
        } catch (err) {
            console.error("Failed to create ZIP:", err);
            alert("Failed to build ZIP file.");
        }
    };

    // Aggregates
    const totalCount = files.length;
    const successCount = files.filter((f) => f.status === "success").length;
    const errorCount = files.filter((f) => f.status === "error").length;
    const idleCount = files.filter((f) => f.status === "idle").length;

    const hasResized = successCount > 0;

    return (
        <div className="w-full flex-1 bg-background relative overflow-hidden">
            {/* Background Glow */}
            <div
                className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-125 rounded-full blur-[120px] opacity-10 dark:opacity-15 bg-radial from-primary/50 to-transparent pointer-events-none"/>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10 space-y-8">
                {/* Back Link */}
                <button
                    onClick={() => router.push("/")}
                    className="inline-flex items-center gap-2 text-xs font-bold text-text-muted hover:text-primary transition-colors duration-200 cursor-pointer group"
                >
                    <ArrowLeft20Regular
                        className="w-4 h-4 transform transition-transform duration-300 group-hover:-translate-x-0.5"/>
                    Back to All Tools
                </button>

                {/* Tool Title Block */}
                <div
                    className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-6 gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                            <span
                                className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                                <Settings20Regular className="w-4 h-4"/>
                            </span>
                            <h1 className="text-xl sm:text-2xl font-black text-text-primary">
                                {tool.title}
                            </h1>
                        </div>
                        <p className="text-xs sm:text-sm text-text-muted">
                            {tool.description}
                        </p>
                    </div>
                </div>

                {/* Main Workspace */}
                <div className="space-y-6">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={onFileSelect}
                        multiple
                        accept="image/*"
                        className="hidden"
                    />

                    {/* Dropzone Area */}
                    {totalCount === 0 && (
                        <div
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                            onDrop={onDrop}
                            onClick={triggerFileInput}
                            className={`relative border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all duration-300 group ${
                                isDragging
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/40 bg-surface/30 backdrop-blur-md"
                            }`}
                        >
                            <div className="flex flex-col items-center justify-center space-y-4">
                                <div
                                    className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 group-hover:scale-105 transition-transform duration-300">
                                    <Image20Regular className="w-8 h-8"/>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-extrabold text-text-primary">
                                        Drag & drop images here, or <span className="text-primary">browse</span>
                                    </p>
                                    <p className="text-[10px] text-text-muted">
                                        Supports PNG, JPG, WebP, AVIF, HEIC, TIFF, GIF (Up to 15MB each)
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Resize Config & Controls (Visible only after file selection) */}
                    {totalCount > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            {/* Controls Side Panel */}
                            <div
                                className="md:col-span-1 border border-border bg-surface/40 backdrop-blur-md p-5 rounded-3xl space-y-6">
                                <h3 className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-1.5 border-b border-border pb-3">
                                    <Settings20Regular className="w-4 h-4 text-primary"/>
                                    Resize Configuration
                                </h3>

                                {/* Mode Select Tabs */}
                                <div
                                    className="grid grid-cols-2 gap-1 p-1 bg-surface-secondary/60 rounded-xl border border-border">
                                    <button
                                        onClick={() => setResizeMode("dimensions")}
                                        className={`py-1.5 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                                            resizeMode === "dimensions"
                                                ? "bg-surface text-text-primary shadow-sm"
                                                : "text-text-muted hover:text-text-secondary"
                                        }`}
                                    >
                                        Dimensions
                                    </button>
                                    <button
                                        onClick={() => setResizeMode("percentage")}
                                        className={`py-1.5 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                                            resizeMode === "percentage"
                                                ? "bg-surface text-text-primary shadow-sm"
                                                : "text-text-muted hover:text-text-secondary"
                                        }`}
                                    >
                                        Percentage
                                    </button>
                                </div>

                                {/* Mode 1: Dimensions Controls */}
                                {resizeMode === "dimensions" && (
                                    <div className="space-y-4">
                                        <div className="flex items-end gap-3">
                                            {/* Width Input */}
                                            <div className="flex-1 space-y-1">
                                                <label
                                                    className="text-[10px] font-black uppercase tracking-wide text-text-muted">Width
                                                    (px)</label>
                                                <input
                                                    type="number"
                                                    value={widthInput}
                                                    onChange={(e) => handleWidthChange(e.target.value)}
                                                    min="1"
                                                    disabled={isResizing}
                                                    className="w-full px-3 py-2 text-xs font-bold bg-surface border border-border focus:border-primary rounded-xl outline-none transition-colors"
                                                />
                                            </div>

                                            {/* Link Aspect Ratio Button */}
                                            <button
                                                onClick={toggleAspectRatio}
                                                disabled={isResizing}
                                                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                                                    maintainAspectRatio
                                                        ? "bg-primary/10 border-primary/30 text-primary"
                                                        : "bg-surface border-border text-text-muted hover:text-text-secondary"
                                                }`}
                                                title={maintainAspectRatio ? "Unlock aspect ratio" : "Lock aspect ratio"}
                                            >
                                                {maintainAspectRatio ? (
                                                    <LockClosed20Regular className="w-4 h-4"/>
                                                ) : (
                                                    <LockOpen20Regular className="w-4 h-4"/>
                                                )}
                                            </button>

                                            {/* Height Input */}
                                            <div className="flex-1 space-y-1">
                                                <label
                                                    className="text-[10px] font-black uppercase tracking-wide text-text-muted">Height
                                                    (px)</label>
                                                <input
                                                    type="number"
                                                    value={heightInput}
                                                    onChange={(e) => handleHeightChange(e.target.value)}
                                                    min="1"
                                                    disabled={isResizing}
                                                    className="w-full px-3 py-2 text-xs font-bold bg-surface border border-border focus:border-primary rounded-xl outline-none transition-colors"
                                                />
                                            </div>
                                        </div>

                                        {/* Quick aspect ratio hint */}
                                        {maintainAspectRatio && getBaselineRatio() && (
                                            <div
                                                className="text-[9px] text-text-muted leading-relaxed italic bg-surface-secondary/30 p-2 border border-border/50 rounded-lg">
                                                Aspect ratio is locked at{" "}
                                                <strong className="font-mono">
                                                    {parseFloat(getBaselineRatio()!.toFixed(2))}:1
                                                </strong>{" "}
                                                based on the first image. Changing one dimension automatically
                                                calculates the other.
                                            </div>
                                        )}

                                        {!maintainAspectRatio && (
                                            <div
                                                className="text-[9px] text-danger/80 leading-relaxed italic bg-danger-bg/20 p-2 border border-danger/20 rounded-lg">
                                                Aspect ratio is unlocked. The resized images will be stretched to fit
                                                the exact dimensions.
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Mode 2: Percentage Controls */}
                                {resizeMode === "percentage" && (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-xs font-bold">
                                                <span
                                                    className="text-[10px] font-black uppercase tracking-wide text-text-muted">Scale Value</span>
                                                <span className="text-primary font-mono font-black">{percentage}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="5"
                                                max="150"
                                                step="5"
                                                value={percentage}
                                                onChange={(e) => setPercentage(parseInt(e.target.value, 10))}
                                                disabled={isResizing}
                                                className="w-full accent-primary cursor-pointer"
                                            />
                                        </div>

                                        {/* Percentage Quick presets */}
                                        <div className="grid grid-cols-4 gap-1.5">
                                            {[25, 50, 75, 100].map((preset) => (
                                                <button
                                                    key={preset}
                                                    onClick={() => setPercentage(preset)}
                                                    disabled={isResizing}
                                                    className={`py-1 text-[10px] font-extrabold rounded-lg border transition-all cursor-pointer ${
                                                        percentage === preset
                                                            ? "bg-primary text-white border-primary"
                                                            : "bg-surface text-text-secondary border-border hover:bg-surface-secondary"
                                                    }`}
                                                >
                                                    {preset}%
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Files List Panel */}
                            <div className="md:col-span-2 space-y-4">
                                {/* Toolbar Control */}
                                <div
                                    className="flex items-center justify-between p-4 border border-border bg-surface/50 backdrop-blur-md rounded-2xl gap-3">
                                    <div className="text-xs font-bold text-text-secondary">
                                        Images loaded:{" "}
                                        <span className="text-text-primary font-extrabold font-mono">
                                            {totalCount}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={triggerFileInput}
                                            disabled={isResizing}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-extrabold tracking-wide uppercase text-white bg-primary hover:bg-primary-hover rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                                        >
                                            <Add20Regular className="w-3.5 h-3.5"/>
                                            Add Images
                                        </button>

                                        <button
                                            onClick={clearAll}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-extrabold tracking-wide uppercase text-text-secondary hover:text-danger hover:bg-danger-bg/40 rounded-lg cursor-pointer transition-colors"
                                        >
                                            <Delete20Regular className="w-3.5 h-3.5"/>
                                            Clear All
                                        </button>
                                    </div>
                                </div>

                                {/* Files Grid/List */}
                                <div className="space-y-3 max-h-115 overflow-y-auto pr-2 custom-scrollbar">
                                    {files.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex flex-row items-center justify-between border border-border bg-surface/40 hover:bg-surface/70 backdrop-blur-md p-3 sm:p-4 rounded-2xl gap-3 transition-all duration-200"
                                        >
                                            {/* Left Side: Thumbnail & Image Info */}
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div
                                                    className="w-12 h-12 rounded-lg bg-surface-secondary border border-border shrink-0 overflow-hidden flex items-center justify-center text-text-muted relative">
                                                    {item.previewUrl ? (
                                                        /* eslint-disable-next-line @next/next/no-img-element */
                                                        <img
                                                            src={item.previewUrl}
                                                            alt={item.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div
                                                            className="flex flex-col items-center justify-center gap-0.5">
                                                            <Image20Regular className="w-5 h-5 text-primary"/>
                                                            <span
                                                                className="text-[7px] font-black uppercase bg-primary/10 text-primary px-1 rounded">
                                                                {item.inputFormat}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 space-y-0.5">
                                                    <div className="text-xs font-bold text-text-primary truncate"
                                                         title={item.name}>
                                                        {item.name}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                                        <span
                                                            className="text-[9px] font-extrabold uppercase px-1 py-0.2 rounded bg-surface-secondary border border-border text-text-secondary">
                                                            {item.inputFormat}
                                                        </span>
                                                        <span className="text-[10px] text-text-muted">
                                                            {formatBytes(item.size)}
                                                        </span>
                                                        {item.originalWidth && item.originalHeight && (
                                                            <>
                                                                <span className="w-1 h-1 rounded-full bg-border"/>
                                                                <span
                                                                    className="text-[10px] font-semibold text-text-muted font-mono">
                                                                    {item.originalWidth}x{item.originalHeight} px
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Side: Resizing info, state indicators, and actions */}
                                            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                                                {/* Output Target Resolution Preview */}
                                                {item.status === "success" && item.resizedWidth && item.resizedHeight && (
                                                    <div
                                                        className="flex flex-col items-end text-right whitespace-nowrap">
                                                        <div className="text-[10px] font-semibold text-text-primary">
                                                            <span
                                                                className="text-[9px] font-black uppercase tracking-wider text-success mr-1 hidden sm:inline">Resized to</span>
                                                            <span className="font-bold font-mono">
                                                                {item.resizedWidth}x{item.resizedHeight} px
                                                            </span>
                                                        </div>
                                                        {item.resizedSize && (
                                                            <span className="text-[9px] text-text-muted font-medium">
                                                                {formatBytes(item.resizedSize)}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Status indicators */}
                                                <div className="flex items-center gap-3">
                                                    {item.status === "resizing" && (
                                                        <div className="flex items-center gap-1.5">
                                                            <div
                                                                className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
                                                            <span
                                                                className="text-[10px] font-bold text-primary hidden sm:inline">
                                                                Resizing...
                                                            </span>
                                                        </div>
                                                    )}

                                                    {item.status === "success" && (
                                                        <div className="flex items-center gap-1.5 text-success">
                                                            <CheckmarkCircle20Regular className="w-4 h-4"/>
                                                            <span
                                                                className="text-[10px] font-extrabold uppercase hidden sm:inline">
                                                                Success
                                                            </span>
                                                        </div>
                                                    )}

                                                    {item.status === "error" && (
                                                        <div
                                                            className="flex items-center gap-1.5 text-danger group relative cursor-help"
                                                            title={item.errorMsg}>
                                                            <ErrorCircle20Regular className="w-4 h-4"/>
                                                            <span
                                                                className="text-[10px] font-extrabold uppercase hidden sm:inline">
                                                                Failed
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* File Level Actions */}
                                                    <div
                                                        className="flex items-center gap-2 border-l border-border pl-2.5">
                                                        {item.status === "success" && (
                                                            <button
                                                                onClick={() => triggerSingleDownload(item)}
                                                                className="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-surface-secondary cursor-pointer transition-colors"
                                                                title="Download this resized image"
                                                            >
                                                                <ArrowDownload20Regular className="w-4 h-4"/>
                                                            </button>
                                                        )}

                                                        {item.status === "error" && (
                                                            <button
                                                                onClick={() => resizeSingleItem(item.id)}
                                                                className="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-surface-secondary cursor-pointer transition-colors"
                                                                title="Retry resize"
                                                            >
                                                                <ArrowCounterclockwise20Regular className="w-4 h-4"/>
                                                            </button>
                                                        )}

                                                        {item.status !== "resizing" && (
                                                            <button
                                                                onClick={() => removeFile(item.id)}
                                                                disabled={isResizing}
                                                                className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger-bg/40 cursor-pointer transition-colors disabled:opacity-50"
                                                                title="Remove image"
                                                            >
                                                                <Dismiss20Regular className="w-4 h-4"/>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Batch Status Alert bar */}
                                {errorCount > 0 && (
                                    <div
                                        className="p-3 border border-danger/30 bg-danger-bg text-danger rounded-2xl text-xs font-semibold flex items-center gap-2.5">
                                        <ErrorCircle20Regular className="w-4 h-4"/>
                                        <span>
                                            Some images could not be resized. Make sure they are valid image files, and click retry to run again.
                                        </span>
                                    </div>
                                )}

                                {/* Main CTA Block */}
                                <div
                                    className="flex flex-col sm:flex-row items-center justify-between border border-border bg-surface/50 backdrop-blur-md p-4 rounded-2xl gap-4">
                                    <div className="text-xs text-text-muted">
                                        {successCount > 0 && (
                                            <span>
                                                Successfully resized{" "}
                                                <strong className="text-success font-black">
                                                    {successCount}
                                                </strong>{" "}
                                                / {totalCount} {totalCount === 1 ? "image" : "images"}.
                                            </span>
                                        )}
                                        {successCount === 0 && (
                                            <span>Ready to resize {totalCount} {totalCount === 1 ? "image" : "images"}.</span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                        {/* Resize trigger */}
                                        {idleCount + errorCount > 0 && (
                                            <button
                                                onClick={startResizing}
                                                disabled={isResizing}
                                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold tracking-wide uppercase text-white bg-primary hover:bg-primary-hover disabled:bg-primary/40 cursor-pointer shadow-md shadow-primary/10 active:scale-98 transition-all"
                                            >
                                                {isResizing ? (
                                                    <>
                                                        <div
                                                            className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                                                        Resizing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Settings20Regular className="w-4 h-4"/>
                                                        Resize {idleCount + errorCount} {idleCount + errorCount === 1 ? "Image" : "Images"}
                                                    </>
                                                )}
                                            </button>
                                        )}

                                        {/* Download actions: 1 file vs multiple files (ZIP) */}
                                        {totalCount === 1 && successCount === 1 && (
                                            <button
                                                onClick={() => triggerSingleDownload(files[0])}
                                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold tracking-wide uppercase text-white bg-primary hover:bg-primary-hover cursor-pointer shadow-md shadow-primary/10 active:scale-98 transition-all"
                                            >
                                                <ArrowDownload20Regular className="w-4 h-4"/>
                                                Download Resized Image
                                            </button>
                                        )}

                                        {/* Multiple output: download ZIP */}
                                        {totalCount > 1 && hasResized && (
                                            <button
                                                onClick={triggerZipDownload}
                                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold tracking-wide uppercase text-white bg-primary hover:bg-primary-hover cursor-pointer shadow-md shadow-primary/10 active:scale-98 transition-all"
                                            >
                                                <ArrowDownload20Regular className="w-4 h-4"/>
                                                Download Resized (ZIP)
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
