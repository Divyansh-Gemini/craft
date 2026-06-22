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
    Settings20Regular,
    ResizeSmall20Regular,
    Eye20Regular,
} from "@fluentui/react-icons";
import {Tool} from "@/types/tool";
import {formatBytes, downloadBlob, downloadZip} from "@/features/image/image-converter";
import {compressSingleImage, CompressionOptions} from "@/features/image/image-compressor";

interface CompressImageViewProps {
    tool: Tool;
}

interface CompressFileItem {
    id: string;
    file: File;
    name: string;
    size: number;
    previewUrl: string | null;
    inputFormat: string;
    status: "idle" | "compressing" | "success" | "error";
    errorMsg?: string;
    compressedBlob?: Blob;
    compressedSize?: number;
    appliedQuality?: number;
    savedSpaceBytes?: number;
    compressedUrl?: string | null;
}

/**
 * Helper to generate target compressed filename
 */
const getCompressedFilename = (name: string): string => {
    const lastDot = name.lastIndexOf(".");
    const nameWithoutExt = lastDot !== -1 ? name.substring(0, lastDot) : name;
    const ext = lastDot !== -1 ? name.substring(lastDot + 1) : "png";
    return `${nameWithoutExt}-compressed.${ext}`;
};

interface PresetButtonProps {
    label: string | number;
    isActive: boolean;
    onClick: () => void;
    disabled?: boolean;
    sizeClass?: string;
}

function PresetButton({label, isActive, onClick, disabled, sizeClass = "text-[9px]"}: PresetButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`py-1 ${sizeClass} font-extrabold rounded-md border transition-all cursor-pointer ${
                isActive
                    ? "bg-primary text-white border-primary"
                    : "bg-surface text-text-secondary border-border hover:bg-surface-secondary"
            }`}
        >
            {label}
        </button>
    );
}

interface TabGroupProps<T extends string> {
    tabs: { id: T; label: string }[];
    activeTab: T;
    onChange: (id: T) => void;
    disabled?: boolean;
}

function TabGroup<T extends string>({tabs, activeTab, onChange, disabled}: TabGroupProps<T>) {
    return (
        <div className="grid grid-cols-2 gap-1 p-1 bg-surface-secondary/60 rounded-xl border border-border">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    disabled={disabled}
                    className={`py-1.5 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                        activeTab === tab.id
                            ? "bg-surface text-text-primary shadow-sm font-black"
                            : "text-text-muted hover:text-text-secondary"
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

interface FileListItemProps {
    item: CompressFileItem;
    onCompare: () => void;
    onDownload: () => void;
    onRetry: () => void;
    onRemove: () => void;
}

function FileListItem({item, onCompare, onDownload, onRetry, onRemove}: FileListItemProps) {
    return (
        <div
            className="flex flex-row items-center justify-between border border-border bg-surface/40 hover:bg-surface/70 backdrop-blur-md p-3 sm:p-4 rounded-2xl gap-3 transition-all duration-200">
            {/* Left side: Thumbnail image & metadata details */}
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
                        <div className="flex flex-col items-center justify-center gap-0.5">
                            <Image20Regular className="w-5 h-5 text-primary"/>
                            <span className="text-[7px] font-black uppercase bg-primary/10 text-primary px-1 rounded">
                                {item.inputFormat}
                            </span>
                        </div>
                    )}
                </div>
                <div className="min-w-0 space-y-0.5">
                    <div className="text-xs font-bold text-text-primary truncate" title={item.name}>
                        {item.name}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span
                            className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-surface-secondary border border-border text-text-secondary">
                            {item.inputFormat}
                        </span>
                        <span className="text-[10px] text-text-muted">
                            {formatBytes(item.size)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Right side: compression progress stats, action buttons */}
            <div className="flex flex-row items-center gap-2 sm:gap-4 shrink-0">
                {/* Compression metrics preview */}
                {item.status === "success" && item.compressedSize !== undefined && (
                    <div
                        className="flex flex-col items-start sm:items-end text-left sm:text-right whitespace-nowrap shrink-0">
                        <div className="text-[10px] font-semibold text-text-primary">
                            <span className="text-success font-bold font-mono">
                                {formatBytes(item.compressedSize)}
                            </span>
                            <span
                                className="text-[9px] font-extrabold text-success ml-1 bg-success-bg/30 px-1 py-0.2 rounded border border-success/20">
                                -{Math.round(((item.size - item.compressedSize) / item.size) * 100)}%
                            </span>
                        </div>
                        <span className="text-[8px] text-text-muted font-medium mt-0.5">
                            Saved {formatBytes(Math.max(0, item.size - item.compressedSize))}
                            {item.appliedQuality ? ` (Quality: ${item.appliedQuality}%)` : ""}
                        </span>
                    </div>
                )}

                <div className="flex flex-row flex-nowrap items-center gap-1.5 sm:gap-2 shrink-0">
                    {/* Status indicator */}
                    {item.status === "compressing" && (
                        <div className="flex items-center gap-1.5">
                            <div
                                className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
                            <span className="text-[10px] font-bold text-primary hidden sm:inline">
                                Compressing...
                            </span>
                        </div>
                    )}

                    {item.status === "success" && (
                        <div className="flex items-center gap-1 text-success">
                            <CheckmarkCircle20Regular className="w-4 h-4"/>
                            <span className="text-[10px] font-black uppercase hidden sm:inline">
                                Success
                            </span>
                        </div>
                    )}

                    {item.status === "error" && (
                        <div className="flex items-center gap-1 text-danger cursor-help" title={item.errorMsg}>
                            <ErrorCircle20Regular className="w-4 h-4"/>
                            <span className="text-[10px] font-black uppercase hidden sm:inline">
                                Failed
                            </span>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div
                        className="flex flex-row flex-nowrap items-center gap-1 border-l border-border pl-1.5 sm:pl-2.5 shrink-0">
                        {item.status === "success" && item.compressedUrl && item.previewUrl && (
                            <button
                                onClick={onCompare}
                                className="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-surface-secondary cursor-pointer transition-colors"
                                title="Compare original vs compressed"
                            >
                                <Eye20Regular className="w-4 h-4"/>
                            </button>
                        )}

                        {item.status === "success" && (
                            <button
                                onClick={onDownload}
                                className="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-surface-secondary cursor-pointer transition-colors"
                                title="Download compressed image"
                            >
                                <ArrowDownload20Regular className="w-4 h-4"/>
                            </button>
                        )}

                        {item.status === "error" && (
                            <button
                                onClick={onRetry}
                                className="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-surface-secondary cursor-pointer transition-colors"
                                title="Retry compression"
                            >
                                <ArrowCounterclockwise20Regular className="w-4 h-4"/>
                            </button>
                        )}

                        {item.status !== "compressing" && (
                            <button
                                onClick={onRemove}
                                className="p-1.5 rounded-lg text-text-secondary hover:text-danger hover:bg-danger-bg/40 cursor-pointer transition-colors"
                                title="Remove file"
                            >
                                <Dismiss20Regular className="w-4 h-4"/>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function CompressImageView({tool}: CompressImageViewProps) {
    const router = useRouter();
    const [files, setFiles] = useState<CompressFileItem[]>([]);

    // Compression Configuration
    const [compressionMode, setCompressionMode] = useState<"lossy" | "lossless">("lossy");
    const [targetType, setTargetType] = useState<"quality" | "size">("quality");
    const [quality, setQuality] = useState<number>(75);
    const [targetSizeValue, setTargetSizeValue] = useState<string>("200");
    const [targetSizeUnit, setTargetSizeUnit] = useState<"KB" | "MB">("KB");

    // UI state
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [isCompressing, setIsCompressing] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Image Comparison Modal state
    const [activeCompareItem, setActiveCompareItem] = useState<CompressFileItem | null>(null);
    const [sliderPosition, setSliderPosition] = useState<number>(50);

    // Keep a ref to files for unmount cleanup
    const filesRef = useRef<CompressFileItem[]>(files);
    useEffect(() => {
        filesRef.current = files;
    }, [files]);

    // Clean up Object URLs only when component unmounts
    useEffect(() => {
        return () => {
            filesRef.current.forEach((item) => {
                if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
                if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
            });
        };
    }, []);

    const handleFiles = useCallback((fileList: FileList | File[]) => {
        const newItems: CompressFileItem[] = [];

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

            const newItem: CompressFileItem = {
                id,
                file,
                name: file.name,
                size: file.size,
                previewUrl,
                inputFormat,
                status: "idle",
            };
            newItems.push(newItem);
        }

        if (newItems.length > 0) {
            setFiles((prev) => {
                const combined = [...prev, ...newItems];
                // Suggest a target size based on the first loaded file size (e.g. 40% of its size, rounded)
                if (prev.length === 0) {
                    const firstSizeKb = Math.round(newItems[0].size / 1024);
                    const suggestedSizeKb = Math.max(50, Math.round(firstSizeKb * 0.4));
                    if (suggestedSizeKb >= 1000) {
                        setTargetSizeValue((suggestedSizeKb / 1024).toFixed(1));
                        setTargetSizeUnit("MB");
                    } else {
                        setTargetSizeValue(suggestedSizeKb.toString());
                        setTargetSizeUnit("KB");
                    }
                }
                return combined;
            });
        }
    }, []);

    // Reset status of all files back to idle if settings are adjusted
    useEffect(() => {
        setFiles((prev) => {
            const hasProcessed = prev.some((f) => f.status === "success" || f.status === "error");
            if (!hasProcessed) return prev;
            return prev.map((f) => {
                // If it had a compressed URL, revoke it
                if (f.compressedUrl) {
                    URL.revokeObjectURL(f.compressedUrl);
                }
                return {
                    ...f,
                    status: "idle",
                    errorMsg: undefined,
                    compressedBlob: undefined,
                    compressedSize: undefined,
                    appliedQuality: undefined,
                    savedSpaceBytes: undefined,
                    compressedUrl: null,
                };
            });
        });
    }, [compressionMode, targetType, quality, targetSizeValue, targetSizeUnit]);

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
            if (target) {
                if (target.previewUrl) URL.revokeObjectURL(target.previewUrl);
                if (target.compressedUrl) URL.revokeObjectURL(target.compressedUrl);
            }
            return prev.filter((item) => item.id !== id);
        });
    }, []);

    const clearAll = useCallback(() => {
        files.forEach((item) => {
            if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
            if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
        });
        setFiles([]);
    }, [files]);

    const processItemCompression = useCallback(async (item: CompressFileItem) => {
        setFiles((prev) =>
            prev.map((f) =>
                f.id === item.id ? {...f, status: "compressing", errorMsg: undefined} : f
            )
        );

        try {
            const rawSize = parseFloat(targetSizeValue);
            const targetKb = isNaN(rawSize) || rawSize <= 0
                ? 200
                : targetSizeUnit === "MB"
                    ? Math.round(rawSize * 1024)
                    : Math.round(rawSize);

            const options: CompressionOptions = {
                mode: compressionMode,
                targetType,
                quality,
                targetSizeKb: targetKb,
            };

            const result = await compressSingleImage(item.file, options);
            const compressedUrl = URL.createObjectURL(result.blob);

            setFiles((prev) =>
                prev.map((f) =>
                    f.id === item.id
                        ? {
                            ...f,
                            status: "success",
                            compressedBlob: result.blob,
                            compressedSize: result.compressedSizeBytes,
                            appliedQuality: result.appliedQuality,
                            savedSpaceBytes: result.savedSpaceBytes,
                            compressedUrl,
                        }
                        : f
                )
            );
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Failed to compress";
            setFiles((prev) =>
                prev.map((f) =>
                    f.id === item.id
                        ? {...f, status: "error", errorMsg}
                        : f
                )
            );
        }
    }, [compressionMode, targetType, quality, targetSizeValue, targetSizeUnit]);

    const startCompression = async () => {
        if (files.length === 0 || isCompressing) return;
        setIsCompressing(true);

        const itemsToProcess = files.filter(
            (item) => item.status === "idle" || item.status === "error"
        );

        await Promise.all(itemsToProcess.map(processItemCompression));
        setIsCompressing(false);
    };

    const compressSingleItem = async (id: string) => {
        const item = files.find((f) => f.id === id);
        if (!item || item.status === "compressing") return;
        await processItemCompression(item);
    };

    const triggerSingleDownload = (item: CompressFileItem) => {
        if (!item.compressedBlob) return;
        const filename = getCompressedFilename(item.name);
        downloadBlob(item.compressedBlob, filename);
    };

    const triggerZipDownload = async () => {
        const successfulFiles = files.filter(
            (item) => item.status === "success" && item.compressedBlob
        );
        if (successfulFiles.length === 0) return;

        const filesToZip = successfulFiles.map((item) => ({
            blob: item.compressedBlob!,
            filename: getCompressedFilename(item.name),
        }));

        try {
            await downloadZip(filesToZip, "compressed-images.zip");
        } catch (err) {
            console.error("Failed to create ZIP:", err);
            alert("Failed to package ZIP file.");
        }
    };

    // Calculate aggregated stats
    const totalCount = files.length;
    const successFiles = files.filter((f) => f.status === "success");
    const successCount = successFiles.length;
    const isProcessing = files.some((f) => f.status === "compressing");

    const totalOriginalSize = files.reduce((acc, f) => acc + f.size, 0);
    const totalCompressedSize = files.reduce((acc, f) => acc + (f.compressedSize || f.size), 0);
    const totalSavedSpace = Math.max(0, totalOriginalSize - totalCompressedSize);
    const savedPercentage = totalOriginalSize > 0 ? Math.round((totalSavedSpace / totalOriginalSize) * 100) : 0;

    return (
        <div className="w-full flex-1 relative overflow-hidden">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10 space-y-8">
                {/* Tool Title Block */}
                <div
                    className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-6 gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                            <span
                                className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                                <ResizeSmall20Regular className="w-4 h-4"/>
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
                                        Supports PNG, JPG, WebP, AVIF, HEIC, TIFF (Up to 15MB each)
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Compressor Configuration & File List */}
                    {totalCount > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            {/* Configuration Panel */}
                            <div
                                className="md:col-span-1 border border-border bg-surface/40 backdrop-blur-md p-5 rounded-3xl space-y-6">
                                <h3 className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-1.5 border-b border-border pb-3">
                                    <Settings20Regular className="w-4 h-4 text-primary"/>
                                    Compression Settings
                                </h3>

                                {/* Compression Level: Lossy vs Lossless */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-wide text-text-muted">
                                        Compression Mode
                                    </label>
                                    <TabGroup
                                        tabs={[
                                            {id: "lossy", label: "Lossy"},
                                            {id: "lossless", label: "Lossless"}
                                        ]}
                                        activeTab={compressionMode}
                                        onChange={setCompressionMode}
                                        disabled={isProcessing}
                                    />
                                </div>

                                {/* Lossy Configuration options */}
                                {compressionMode === "lossy" && (
                                    <div className="space-y-5 border-t border-border/55 pt-4">
                                        {/* Target Options: Quality vs Target Size */}
                                        <div className="space-y-2">
                                            <label
                                                className="text-[10px] font-black uppercase tracking-wide text-text-muted">
                                                Optimize By
                                            </label>
                                            <TabGroup
                                                tabs={[
                                                    {id: "quality", label: "Quality"},
                                                    {id: "size", label: "File Size Limit"}
                                                ]}
                                                activeTab={targetType}
                                                onChange={setTargetType}
                                                disabled={isProcessing}
                                            />
                                        </div>

                                        {/* Quality Slider Option */}
                                        {targetType === "quality" && (
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-xs">
                                                    <span
                                                        className="text-[10px] font-black uppercase tracking-wide text-text-muted">
                                                        Quality Level
                                                    </span>
                                                    <span
                                                        className="text-primary font-mono font-black">{quality}%</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="5"
                                                    max="95"
                                                    step="5"
                                                    value={quality}
                                                    onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                                                    disabled={isProcessing}
                                                    className="w-full accent-primary cursor-pointer"
                                                />
                                                {/* Presets */}
                                                <div className="grid grid-cols-3 gap-1">
                                                    {[
                                                        {label: "Low (25%)", val: 25},
                                                        {label: "Mid (60%)", val: 60},
                                                        {label: "High (80%)", val: 80}
                                                    ].map((preset) => (
                                                        <PresetButton
                                                            key={preset.val}
                                                            label={preset.label}
                                                            isActive={quality === preset.val}
                                                            onClick={() => setQuality(preset.val)}
                                                            disabled={isProcessing}
                                                            sizeClass="text-[8px]"
                                                        />
                                                    ))}
                                                </div>
                                                <p className="text-[9px] text-text-muted leading-relaxed italic mt-1">
                                                    Discards subtle chromatic differences to minimize size. Lower values
                                                    result in smaller file sizes but more compression artifacts.
                                                </p>
                                            </div>
                                        )}

                                        {/* Size-Based Option */}
                                        {targetType === "size" && (
                                            <div className="space-y-3">
                                                <div className="space-y-1">
                                                    <label
                                                        className="text-[10px] font-black uppercase tracking-wide text-text-muted">
                                                        Max Target Size
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="number"
                                                            value={targetSizeValue}
                                                            onChange={(e) => setTargetSizeValue(e.target.value)}
                                                            min="0.1"
                                                            step={targetSizeUnit === "MB" ? "0.1" : "1"}
                                                            disabled={isProcessing}
                                                            className="flex-1 px-3 py-2 text-xs font-bold bg-surface border border-border focus:border-primary rounded-xl outline-none transition-colors"
                                                        />
                                                        <select
                                                            value={targetSizeUnit}
                                                            onChange={(e) => setTargetSizeUnit(e.target.value as "KB" | "MB")}
                                                            disabled={isProcessing}
                                                            className="px-3 py-2 text-xs font-bold bg-surface border border-border focus:border-primary rounded-xl outline-none transition-colors cursor-pointer"
                                                        >
                                                            <option value="KB">KB</option>
                                                            <option value="MB">MB</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                {/* Predefined limit presets */}
                                                <div className="grid grid-cols-4 gap-1">
                                                    {(targetSizeUnit === "KB" ? [50, 100, 200, 500] : [0.5, 1, 2, 5]).map((size) => (
                                                        <PresetButton
                                                            key={size}
                                                            label={`${size} ${targetSizeUnit}`}
                                                            isActive={targetSizeValue === size.toString()}
                                                            onClick={() => setTargetSizeValue(size.toString())}
                                                            disabled={isProcessing}
                                                            sizeClass="text-[9px]"
                                                        />
                                                    ))}
                                                </div>
                                                <p className="text-[9px] text-info leading-relaxed italic mt-1 bg-info-bg/20 p-2 border border-info/20 rounded-lg">
                                                    <strong>Smart Compression:</strong> The compressor automatically
                                                    adjusts quality levels iteratively to get as close to the target
                                                    size limit as possible without exceeding it.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Lossless Configuration options */}
                                {compressionMode === "lossless" && (
                                    <div className="space-y-3 border-t border-border/55 pt-4">
                                        <div className="text-[10px] font-black uppercase tracking-wide text-text-muted">
                                            Lossless Settings
                                        </div>
                                        <p className="text-[9px] text-success leading-relaxed bg-success-bg/20 p-2.5 border border-success/20 rounded-lg">
                                            <strong>100% Visual Fidelity:</strong> Reduces file sizes by optimizing file
                                            internal metadata and entropy encoding without discarding any image pixel
                                            information. Recommended for logos, line art, and critical documents.
                                        </p>
                                    </div>
                                )}

                                {/* Aggregated savings summary (if compression occurred) */}
                                {successCount > 0 && (
                                    <div className="border-t border-border pt-4 space-y-3.5">
                                        <h4 className="text-[10px] font-black uppercase tracking-wider text-text-primary">
                                            Compression Report
                                        </h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs text-text-muted">
                                                <span>Original total size:</span>
                                                <span
                                                    className="font-semibold font-mono text-text-primary">{formatBytes(totalOriginalSize)}</span>
                                            </div>
                                            <div className="flex justify-between text-xs text-text-muted">
                                                <span>Compressed total:</span>
                                                <span
                                                    className="font-semibold font-mono text-text-primary">{formatBytes(totalCompressedSize)}</span>
                                            </div>
                                            <div
                                                className="flex justify-between text-xs font-black border-t border-border/40 pt-2 text-success">
                                                <span>Total Saved Space:</span>
                                                <span className="font-mono text-success">
                                                    {formatBytes(totalSavedSpace)} ({savedPercentage}%)
                                                </span>
                                            </div>
                                        </div>

                                        {/* Graphic space saving percentage bar */}
                                        <div
                                            className="w-full h-3.5 bg-surface-secondary border border-border rounded-full overflow-hidden relative">
                                            <div
                                                className="h-full bg-gradient-to-r from-success/80 to-success transition-all duration-500 rounded-full"
                                                style={{width: `${savedPercentage}%`}}
                                            />
                                            <span
                                                className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-text-primary">
                                                {savedPercentage}% Smallest Size
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Files Grid / Processing Workspace */}
                            <div className="md:col-span-2 space-y-4">
                                {/* Actions Toolbar */}
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
                                            disabled={isProcessing}
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

                                {/* Files Grid List */}
                                <div className="space-y-3 max-h-125 overflow-y-auto pr-2 custom-scrollbar">
                                    {files.map((item) => (
                                        <FileListItem
                                            key={item.id}
                                            item={item}
                                            onCompare={() => {
                                                setActiveCompareItem(item);
                                                setSliderPosition(50);
                                            }}
                                            onDownload={() => triggerSingleDownload(item)}
                                            onRetry={() => compressSingleItem(item.id)}
                                            onRemove={() => removeFile(item.id)}
                                        />
                                    ))}
                                </div>

                                {/* Persistent Footer Actions Bar */}
                                <div
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-border bg-surface/50 backdrop-blur-md rounded-2xl">
                                    <div className="text-xs text-text-muted">
                                        {successCount > 0 ? (
                                            <>
                                                Successfully compressed{" "}
                                                <strong
                                                    className="text-text-primary font-mono">{successCount}</strong> of{" "}
                                                <strong
                                                    className="text-text-primary font-mono">{totalCount}</strong> {totalCount === 1 ? "image" : "images"}.
                                            </>
                                        ) : (
                                            <>
                                                Ready to compress{" "}
                                                <strong
                                                    className="text-text-primary font-mono">{totalCount}</strong> {totalCount === 1 ? "image" : "images"}.
                                            </>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2.5">
                                        {/* Show Compress Button if there are idle or errored files, or if currently processing */}
                                        {(files.some(f => f.status === "idle" || f.status === "error") || isProcessing) && (
                                            <button
                                                onClick={startCompression}
                                                disabled={isProcessing}
                                                className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                                            >
                                                {isProcessing ? (
                                                    <>
                                                        <span
                                                            className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                                                        Compressing...
                                                    </>
                                                ) : (
                                                    totalCount === 1 ? "Compress Image" : "Compress Images"
                                                )}
                                            </button>
                                        )}

                                        {/* Download buttons when successCount > 0 */}
                                        {successCount > 0 && !isProcessing && (
                                            successCount === 1 ? (
                                                <button
                                                    onClick={() => triggerSingleDownload(successFiles[0])}
                                                    className="px-5 py-2.5 bg-success hover:bg-success/90 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                                                >
                                                    <ArrowDownload20Regular className="w-4 h-4"/>
                                                    Download Image
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={triggerZipDownload}
                                                    className="px-5 py-2.5 bg-success hover:bg-success/90 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                                                >
                                                    <ArrowDownload20Regular className="w-4 h-4"/>
                                                    Download All (ZIP)
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Premium Before / After Image Comparison Modal */}
            {activeCompareItem && activeCompareItem.previewUrl && activeCompareItem.compressedUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6 overflow-hidden">
                    <div
                        className="relative w-full max-w-4xl bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div
                            className="flex items-center justify-between p-4 border-b border-border bg-surface-secondary/20">
                            <div className="space-y-0.5">
                                <h3 className="text-sm font-black text-text-primary truncate max-w-[250px] sm:max-w-md">
                                    Quality Comparison: {activeCompareItem.name}
                                </h3>
                                <p className="text-[10px] text-text-muted">
                                    Drag the slider handle to check pixel-level difference.
                                </p>
                            </div>
                            <button
                                onClick={() => setActiveCompareItem(null)}
                                className="p-1.5 rounded-xl border border-border hover:bg-surface-secondary transition-colors cursor-pointer"
                            >
                                <Dismiss20Regular className="w-4.5 h-4.5"/>
                            </button>
                        </div>

                        {/* Slider Interactive Area */}
                        <div
                            className="flex-1 bg-black/40 flex items-center justify-center p-4 relative overflow-hidden min-h-[300px]">
                            <div
                                className="relative w-full h-full max-h-[60vh] aspect-video sm:aspect-[16/10] overflow-hidden select-none rounded-2xl border border-border/80 bg-surface-secondary/20 flex items-center justify-center">
                                {/* Base Image: Original (Left side) */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={activeCompareItem.previewUrl}
                                    alt="Original"
                                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                                />
                                <span
                                    className="absolute top-4 left-4 bg-black/60 backdrop-blur text-white text-[9px] uppercase font-black tracking-wide px-2.5 py-1 rounded-md z-20 shadow-md">
                                    Original ({formatBytes(activeCompareItem.size)})
                                </span>

                                {/* overlay clipped Image: Compressed (Right side) */}
                                <div
                                    className="absolute inset-0 w-full h-full pointer-events-none"
                                    style={{clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)`}}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={activeCompareItem.compressedUrl}
                                        alt="Compressed"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <span
                                    className="absolute top-4 right-4 bg-success/80 backdrop-blur text-white text-[9px] uppercase font-black tracking-wide px-2.5 py-1 rounded-md z-20 shadow-md">
                                    Compressed ({formatBytes(activeCompareItem.compressedSize || 0)})
                                </span>

                                {/* Draggable vertical divider handle */}
                                <div
                                    className="absolute top-0 bottom-0 w-0.5 bg-white cursor-ew-resize z-30 shadow-[0_0_10px_rgba(0,0,0,0.5)] flex items-center justify-center"
                                    style={{left: `${sliderPosition}%`}}
                                >
                                    <div
                                        className="w-7 h-7 rounded-full bg-white text-black shadow-xl flex items-center justify-center text-xs font-black border border-border select-none pointer-events-none">
                                        ↔
                                    </div>
                                </div>

                                {/* Drag capture target slider overlay */}
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={sliderPosition}
                                    onChange={(e) => setSliderPosition(Number(e.target.value))}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-40"
                                />
                            </div>
                        </div>

                        {/* Modal Footer Info */}
                        <div
                            className="p-4 border-t border-border bg-surface-secondary/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="space-y-0.5">
                                    <span
                                        className="text-[9px] font-black uppercase text-text-muted">Original Size</span>
                                    <p className="font-semibold font-mono text-text-primary">{formatBytes(activeCompareItem.size)}</p>
                                </div>
                                <span className="w-px h-6 bg-border hidden sm:inline"/>
                                <div className="space-y-0.5">
                                    <span
                                        className="text-[9px] font-black uppercase text-text-muted">Compressed Size</span>
                                    <p className="font-semibold font-mono text-success">
                                        {formatBytes(activeCompareItem.compressedSize || 0)}
                                    </p>
                                </div>
                                <span className="w-px h-6 bg-border hidden sm:inline"/>
                                <div className="space-y-0.5">
                                    <span
                                        className="text-[9px] font-black uppercase text-text-muted">Space Savings</span>
                                    <p className="font-bold font-mono text-success">
                                        {formatBytes(Math.max(0, activeCompareItem.size - (activeCompareItem.compressedSize || 0)))} (
                                        -{Math.round(((activeCompareItem.size - (activeCompareItem.compressedSize || 0)) / activeCompareItem.size) * 100)}%
                                        )
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setActiveCompareItem(null)}
                                className="w-full sm:w-auto px-4 py-2 bg-surface hover:bg-surface-secondary border border-border text-text-primary rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-colors"
                            >
                                Done Comparing
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
