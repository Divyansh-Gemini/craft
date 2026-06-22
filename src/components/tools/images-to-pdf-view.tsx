"use client";

import React, {useState, useRef, useCallback, useEffect, useMemo} from "react";
import {
    Reorder20Regular,
    ArrowLeft20Regular,
    ArrowRight20Regular,
    Delete20Regular,
    ArrowDownload20Regular,
    CheckmarkCircle20Regular,
    ErrorCircle20Regular,
    Settings20Regular,
    Grid20Regular,
    Dismiss20Regular,
    Checkmark20Regular,
    Image20Regular,
    Add20Regular
} from "@fluentui/react-icons";
import {Tool} from "@/types/tool";
import {ToolHeader} from "@/components/ui/tool-header";
import {downloadBlob, formatBytes} from "@/features/image/image-converter";
import {imagesToPdf, ImagesToPdfOptions} from "@/features/pdf/images-to-pdf";
import {RadioSelector} from "@/components/ui/radio-selector";

interface ImagesToPdfViewProps {
    tool: Tool;
}

interface ImageFileItem {
    id: string;
    file: File;
    previewUrl: string;
    name: string;
    size: number;
    format: string;
}

// Subcomponent for each image card in the reordering grid editor
interface ImageGridCardProps {
    item: ImageFileItem;
    index: number;
    totalCount: number;
    isDragged: boolean;
    isDragOver: boolean;
    onMove: (currentIndex: number, direction: "left" | "right") => void;
    onMoveTo: (currentIndex: number, targetIndex: number) => void;
    onRemove: (id: string) => void;
    onDragStart: (e: React.DragEvent, index: number) => void;
    onDragOver: (e: React.DragEvent, index: number) => void;
    onDragEnd: () => void;
    onDrop: (e: React.DragEvent, index: number) => void;
}

function ImageGridCard({
                           item,
                           index,
                           totalCount,
                           isDragged,
                           isDragOver,
                           onMove,
                           onMoveTo,
                           onRemove,
                           onDragStart,
                           onDragOver,
                           onDragEnd,
                           onDrop
                       }: ImageGridCardProps) {
    const [isMoveMode, setIsMoveMode] = useState(false);
    const [targetPos, setTargetPos] = useState("");

    const handleMoveSubmit = () => {
        const targetIdx = parseInt(targetPos, 10) - 1;
        if (isNaN(targetIdx) || targetIdx < 0 || targetIdx >= totalCount) {
            setIsMoveMode(false);
            setTargetPos(String(index + 1));
            return;
        }
        onMoveTo(index, targetIdx);
        setIsMoveMode(false);
    };

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, index)}
            onDragOver={(e) => onDragOver(e, index)}
            onDragEnd={onDragEnd}
            onDrop={(e) => onDrop(e, index)}
            className={`relative flex flex-col rounded-xl overflow-hidden border bg-surface/40 hover:scale-[1.01] group transition-all duration-200 ${
                isDragged
                    ? "opacity-40 border-dashed border-primary"
                    : isDragOver
                        ? "border-primary ring-2 ring-primary/20 scale-[1.02]"
                        : "border-border hover:border-primary/40 hover:shadow-md"
            }`}
        >
            {/* Image Preview Container */}
            <div
                className="relative w-full aspect-4/3 bg-surface-secondary flex items-center justify-center overflow-hidden border-b border-border select-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={item.previewUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                />

                {/* Index badge (top-left) */}
                <div
                    className="absolute top-2.5 left-2.5 bg-primary text-white text-[10px] font-black w-6 h-6 rounded-lg flex items-center justify-center shadow-md">
                    #{index + 1}
                </div>

                {/* Drag handle (top-right, cursor grab) */}
                <div
                    className="absolute top-2.5 right-2.5 w-6 h-6 rounded-lg bg-surface/90 border border-border text-text-secondary flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-surface hover:text-primary transition-all duration-150 shadow-xs">
                    <Reorder20Regular className="w-3.5 h-3.5"/>
                </div>

                {/* Manual Move Position Overlay */}
                {isMoveMode && (
                    <div
                        className="absolute inset-0 bg-surface/95 flex flex-col items-center justify-center p-3 z-10 space-y-2 animate-fadeIn">
                        <span className="text-[10px] font-black text-text-secondary">Move to Position</span>
                        <div className="flex items-center gap-1.5 w-full max-w-28">
                            <input
                                type="number"
                                min={1}
                                max={totalCount}
                                value={targetPos}
                                onChange={(e) => setTargetPos(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleMoveSubmit();
                                    } else if (e.key === "Escape") {
                                        setIsMoveMode(false);
                                        setTargetPos(String(index + 1));
                                    }
                                }}
                                className="w-full text-center text-xs font-bold px-2 py-1 border border-border bg-surface-secondary rounded-md focus:border-primary outline-hidden"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={handleMoveSubmit}
                                className="p-1 bg-success text-white hover:bg-success/90 rounded-md cursor-pointer transition-colors duration-150 shrink-0"
                                title="Confirm Position"
                            >
                                <Checkmark20Regular className="w-3.5 h-3.5"/>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsMoveMode(false);
                                    setTargetPos(String(index + 1));
                                }}
                                className="p-1 bg-surface-secondary border border-border text-text-muted hover:bg-surface-secondary/80 rounded-md cursor-pointer transition-colors duration-150 shrink-0"
                                title="Cancel"
                            >
                                <Dismiss20Regular className="w-3.5 h-3.5"/>
                            </button>
                        </div>
                        <span className="text-[9px] text-text-muted font-bold">Range: 1 to {totalCount}</span>
                    </div>
                )}

                {/* Actions Overlay Toolbar */}
                <div
                    className="absolute bottom-2 inset-x-2 bg-surface/95 border border-border rounded-lg py-1 px-1.5 flex justify-between items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 shadow-sm">
                    <div className="flex gap-0.5">
                        <button
                            type="button"
                            onClick={() => onMove(index, "left")}
                            disabled={index === 0}
                            className="p-1 text-text-muted hover:text-primary hover:bg-surface-secondary rounded-md disabled:opacity-30 cursor-pointer transition-colors duration-150"
                            title="Move Left"
                        >
                            <ArrowLeft20Regular className="w-4 h-4"/>
                        </button>
                        <button
                            type="button"
                            onClick={() => onMove(index, "right")}
                            disabled={index === totalCount - 1}
                            className="p-1 text-text-muted hover:text-primary hover:bg-surface-secondary rounded-md disabled:opacity-30 cursor-pointer transition-colors duration-150"
                            title="Move Right"
                        >
                            <ArrowRight20Regular className="w-4 h-4"/>
                        </button>
                    </div>
                    <div className="flex gap-1.5 items-center">
                        <button
                            type="button"
                            onClick={() => {
                                setIsMoveMode(true);
                                setTargetPos(String(index + 1));
                            }}
                            className="px-1.5 py-0.5 text-[9px] font-black bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white rounded-md cursor-pointer transition-all duration-150 uppercase tracking-wide"
                            title="Set Position Index"
                        >
                            Move
                        </button>
                        <button
                            type="button"
                            onClick={() => onRemove(item.id)}
                            className="p-1 text-text-muted hover:text-danger hover:bg-surface-secondary rounded-md cursor-pointer transition-colors duration-150"
                            title="Delete Image"
                        >
                            <Delete20Regular className="w-4 h-4"/>
                        </button>
                    </div>
                </div>
            </div>

            {/* Image Details Footer */}
            <div className="py-2 px-3 flex flex-col bg-surface/85 border-t border-border/50">
                <span className="text-[11px] font-extrabold text-text-primary truncate" title={item.name}>
                    {item.name}
                </span>
                <span className="text-[9px] text-text-muted font-bold mt-0.5 font-mono uppercase">
                    {item.format} • {formatBytes(item.size)}
                </span>
            </div>
        </div>
    );
}

export function ImagesToPdfView({tool}: ImagesToPdfViewProps) {
    const [files, setFiles] = useState<ImageFileItem[]>([]);
    const [outputName, setOutputName] = useState<string>("images-combined");

    // Dynamic config options
    const [pageSize, setPageSize] = useState<"original" | "a4" | "letter">("original");
    const [orientation, setOrientation] = useState<"portrait" | "landscape" | "auto">("auto");
    const [margin, setMargin] = useState<"none" | "small" | "medium">("none");
    const [standardizeWidth, setStandardizeWidth] = useState<"disable" | "smallest" | "largest">("smallest");

    // Processing States
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const [currentStepName, setCurrentStepName] = useState<string>("");

    // Drag-and-drop upload states
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [isDraggingQueue, setIsDraggingQueue] = useState<boolean>(false);

    // List sorting states
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    // Notifications
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Revoke object URLs on component unmount to prevent leaks
    useEffect(() => {
        return () => {
            files.forEach((item) => {
                URL.revokeObjectURL(item.previewUrl);
            });
        };
    }, []);

    // Auto-dismiss success toast after 6 seconds to prevent screen clutter
    useEffect(() => {
        if (successMsg) {
            const timer = setTimeout(() => {
                setSuccessMsg(null);
            }, 6000);
            return () => clearTimeout(timer);
        }
    }, [successMsg]);

    // Memoized Aggregates
    const totalFilesSize = useMemo(() => {
        return files.reduce((sum, item) => sum + item.size, 0);
    }, [files]);

    // Handle files uploads and preview generation
    const handleFiles = useCallback((fileList: FileList | File[]) => {
        setErrorMsg(null);
        setSuccessMsg(null);

        const newItems: ImageFileItem[] = [];
        Array.from(fileList).forEach((file) => {
            const ext = file.name.split(".").pop()?.toLowerCase();
            const validExtensions = ["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp", "tiff", "heic"];

            if (!validExtensions.includes(ext || "")) {
                setErrorMsg("Some files were skipped due to unsupported formats. Supported formats: JPG, PNG, WebP, GIF, SVG, BMP, TIFF.");
                return;
            }

            const id = Math.random().toString(36).substring(2, 9);
            const previewUrl = URL.createObjectURL(file);

            newItems.push({
                id,
                file,
                previewUrl,
                name: file.name,
                size: file.size,
                format: ext || "image"
            });
        });

        if (newItems.length > 0) {
            setFiles((prev) => [...prev, ...newItems]);
        }
    }, []);

    // Drag-and-drop viewport/scroll assist
    const handleDragScroll = useCallback((clientY: number) => {
        const container = containerRef.current;
        if (container) {
            const rect = container.getBoundingClientRect();
            const relativeY = clientY - rect.top;
            const threshold = 60;
            const speed = 12;

            if (relativeY < threshold) {
                container.scrollTop -= speed;
            } else if (rect.height - relativeY < threshold) {
                container.scrollTop += speed;
            }
        }

        const viewportHeight = window.innerHeight;
        const pageThreshold = 80;
        const pageSpeed = 10;

        if (clientY < pageThreshold) {
            window.scrollBy(0, -pageSpeed);
        } else if (viewportHeight - clientY < pageThreshold) {
            window.scrollBy(0, pageSpeed);
        }
    }, []);

    // Sorting Drag-Drop triggers
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null) return;
        if (index !== draggedIndex && index !== dragOverIndex) {
            setDragOverIndex(index);
        }
        handleDragScroll(e.clientY);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === targetIndex) return;

        moveImageToPosition(draggedIndex, targetIndex);
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const moveImageToPosition = useCallback((currentIndex: number, targetIndex: number) => {
        setErrorMsg(null);
        setSuccessMsg(null);

        if (targetIndex < 0 || targetIndex >= files.length || currentIndex === targetIndex) return;

        setFiles((prev) => {
            const updated = [...prev];
            const [item] = updated.splice(currentIndex, 1);
            updated.splice(targetIndex, 0, item);
            return updated;
        });
    }, [files.length]);

    const moveImage = (currentIndex: number, direction: "left" | "right") => {
        const targetIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
        moveImageToPosition(currentIndex, targetIndex);
    };

    const removeImage = useCallback((id: string) => {
        setErrorMsg(null);
        setSuccessMsg(null);
        setFiles((prev) => {
            const item = prev.find((i) => i.id === id);
            if (item) {
                URL.revokeObjectURL(item.previewUrl);
            }
            return prev.filter((i) => i.id !== id);
        });
    }, []);

    const clearAll = useCallback(() => {
        setErrorMsg(null);
        setSuccessMsg(null);
        files.forEach((i) => URL.revokeObjectURL(i.previewUrl));
        setFiles([]);
        setProgress(0);
    }, [files]);

    // Triggers generation of output PDF
    const startConversion = async () => {
        if (files.length === 0) {
            setErrorMsg("Please upload at least 1 image to convert.");
            return;
        }

        setIsProcessing(true);
        setErrorMsg(null);
        setSuccessMsg(null);
        setProgress(0);
        setCurrentStepName("Configuring image inputs...");

        try {
            const fileCollection = files.map((item) => item.file);
            const options: ImagesToPdfOptions = {
                standardizeWidth,
                pageSize,
                orientation,
                margin
            };

            const pdfBlob = await imagesToPdf(
                fileCollection,
                options,
                (progressVal, statusMsg) => {
                    setProgress(progressVal);
                    setCurrentStepName(statusMsg);
                }
            );

            const finalFilename = outputName.trim()
                ? `${outputName.trim().replace(/\.pdf$/i, "")}.pdf`
                : "combined-images.pdf";

            downloadBlob(pdfBlob, finalFilename);
            setSuccessMsg(`PDF built successfully! Combined ${files.length} images into "${finalFilename}".`);
        } catch (err: any) {
            console.error("PDF Compilation Failed:", err);
            setErrorMsg(err.message || "An error occurred during PDF compiling.");
        } finally {
            setIsProcessing(false);
            setProgress(0);
            setCurrentStepName("");
        }
    };

    // Upload interactions
    const onDragOverUpload = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeaveUpload = () => {
        setIsDragging(false);
    };

    const onDropUpload = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const onDragOverQueue = (e: React.DragEvent) => {
        if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setIsDraggingQueue(true);
        }
    };

    const onDragLeaveQueue = () => {
        setIsDraggingQueue(false);
    };

    const onDropQueue = (e: React.DragEvent) => {
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
        }
        setIsDraggingQueue(false);
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
            e.target.value = "";
        }
    };

    return (
        <>
            {/* Header Section */}
            <ToolHeader title={tool.title} description={tool.description} iconId={tool.iconId}/>

            {/* Notifications */}
            {errorMsg && (
                <div
                    className="flex items-start gap-3 p-4 border border-danger/20 bg-danger-bg/40 text-danger rounded-2xl text-xs font-bold animate-fadeIn">
                    <ErrorCircle20Regular className="w-5 h-5 shrink-0"/>
                    <div>{errorMsg}</div>
                </div>
            )}

            <div className="space-y-6">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onFileSelect}
                    multiple
                    accept="image/*"
                    className="hidden"
                />

                {/* Drag and Drop Zone when empty */}
                {files.length === 0 && (
                    <div
                        onDragOver={onDragOverUpload}
                        onDragLeave={onDragLeaveUpload}
                        onDrop={onDropUpload}
                        onClick={triggerFileInput}
                        className={`relative border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 group ${
                            isDragging
                                ? "border-primary bg-primary/5 shadow-inner"
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
                                <p className="text-[10px] text-text-muted max-w-md mx-auto leading-relaxed">
                                    Convert PNG, JPG, WebP, SVG, or GIF files client-side into a single high-quality
                                    PDF document.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Workspace Split Layout */}
                {files.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                        {/* Left Side: Images Grid Reorder Section */}
                        <div className="lg:col-span-8 space-y-4">
                            <div
                                onDragOver={onDragOverQueue}
                                onDragLeave={onDragLeaveQueue}
                                onDrop={onDropQueue}
                                className={`border bg-surface/50 backdrop-blur-md rounded-2xl p-5 space-y-4 transition-all duration-300 ${
                                    isDraggingQueue
                                        ? "border-primary ring-2 ring-primary/20 shadow-md shadow-primary/5 bg-primary/5 scale-[1.002]"
                                        : "border-border"
                                }`}
                            >
                                {/* Action Bar Header */}
                                <div
                                    className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-3 gap-3">
                                    <div
                                        className="flex items-center gap-2 text-xs font-black text-text-primary uppercase tracking-wider">
                                        <Grid20Regular className="w-4 h-4 text-primary"/>
                                        <span>Images Queue ({files.length})</span>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={triggerFileInput}
                                            disabled={isProcessing}
                                            className="w-8 h-8 sm:w-auto sm:px-3 sm:py-1.5 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface text-[10px] font-bold text-text-muted hover:border-primary hover:text-primary disabled:opacity-50 transition-all duration-200 cursor-pointer shrink-0"
                                            title="Add More Images"
                                        >
                                            <Add20Regular className="w-3.5 h-3.5"/>
                                            <span className="hidden sm:inline">Add Images</span>
                                        </button>
                                        <button
                                            onClick={clearAll}
                                            disabled={isProcessing}
                                            className="w-8 h-8 sm:w-auto sm:px-3 sm:py-1.5 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface text-[10px] font-bold text-text-muted hover:border-danger hover:text-danger disabled:opacity-50 transition-all duration-200 cursor-pointer shrink-0"
                                            title="Clear Queue"
                                        >
                                            <Delete20Regular className="w-3.5 h-3.5"/>
                                            <span className="hidden sm:inline">Clear Queue</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Instructions tooltip */}
                                <p className="text-[10px] text-text-muted leading-relaxed font-bold bg-surface-secondary/40 border border-border/60 p-2.5 rounded-xl">
                                    💡 Reorder items using drag-and-drop, or use the card overlay controls to move
                                    left/right or type a target position number. Pages compile sequentially.
                                </p>

                                {/* Reordering Grid */}
                                <div
                                    ref={containerRef}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        handleDragScroll(e.clientY);
                                    }}
                                    className="max-h-140 overflow-y-auto pr-1.5 custom-scrollbar"
                                >
                                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 select-none">
                                        {files.map((item, idx) => (
                                            <ImageGridCard
                                                key={item.id}
                                                item={item}
                                                index={idx}
                                                totalCount={files.length}
                                                isDragged={draggedIndex === idx}
                                                isDragOver={dragOverIndex === idx}
                                                onMove={moveImage}
                                                onMoveTo={moveImageToPosition}
                                                onRemove={removeImage}
                                                onDragStart={handleDragStart}
                                                onDragOver={handleDragOver}
                                                onDragEnd={handleDragEnd}
                                                onDrop={handleDrop}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Configuration & Build Panel */}
                        <div className="lg:col-span-4 space-y-6">
                            <div
                                className="border border-border bg-surface/50 backdrop-blur-md rounded-2xl p-6 space-y-6">
                                <div className="flex items-center gap-2 border-b border-border pb-3">
                                    <Settings20Regular className="w-4 h-4 text-primary"/>
                                    <h2 className="text-xs font-black text-text-primary uppercase tracking-wider">
                                        PDF Page Layout Settings
                                    </h2>
                                </div>

                                {/* Filename Option */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-secondary">
                                        Output Filename
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={outputName}
                                            onChange={(e) => setOutputName(e.target.value)}
                                            placeholder="e.g. report"
                                            disabled={isProcessing}
                                            className="w-full text-xs font-bold px-3.5 py-3 border border-border bg-surface rounded-xl focus:border-primary focus:ring-1 focus:ring-primary/20 outline-hidden transition-all duration-200 placeholder:text-text-muted/60 disabled:opacity-50"
                                        />
                                        <span
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted select-none font-mono">
                                                .pdf
                                            </span>
                                    </div>
                                </div>

                                {/* Page Size Option */}
                                <div className="space-y-2 border-t border-border pt-4">
                                    <label className="text-xs font-bold text-text-secondary">
                                        Page Size
                                    </label>
                                    <RadioSelector
                                        options={[
                                            {value: "original", label: "Original Size"},
                                            {value: "a4", label: "A4 Size"},
                                            {value: "letter", label: "US Letter"}
                                        ]}
                                        selectedValue={pageSize}
                                        onChange={(val) => {
                                            setPageSize(val);
                                            // Reset standardize width if switching away from original size
                                            if (val !== "original") {
                                                setStandardizeWidth("disable");
                                            }
                                        }}
                                        disabled={isProcessing}
                                        className="grid-cols-3"
                                    />
                                </div>

                                {/* Orientation Option (Only for A4/Letter size) */}
                                {pageSize !== "original" && (
                                    <div className="space-y-2 border-t border-border pt-4 animate-fadeIn">
                                        <label className="text-xs font-bold text-text-secondary">
                                            Page Orientation
                                        </label>
                                        <RadioSelector
                                            options={[
                                                {value: "auto", label: "Auto Orientation"},
                                                {value: "portrait", label: "Portrait"},
                                                {value: "landscape", label: "Landscape"}
                                            ]}
                                            selectedValue={orientation}
                                            onChange={setOrientation}
                                            disabled={isProcessing}
                                            className="grid-cols-3"
                                        />
                                    </div>
                                )}

                                {/* Standardize widths option (Only for original page size) */}
                                {pageSize === "original" && (
                                    <div className="space-y-2 border-t border-border pt-4 animate-fadeIn">
                                        <label className="text-xs font-bold text-text-secondary">
                                            Standardize Widths
                                        </label>
                                        <RadioSelector
                                            options={[
                                                {value: "disable", label: "Original widths"},
                                                {value: "smallest", label: "Standardize (Smallest)"},
                                                {value: "largest", label: "Standardize (Largest)"}
                                            ]}
                                            selectedValue={standardizeWidth}
                                            onChange={setStandardizeWidth}
                                            disabled={isProcessing}
                                            className="grid-cols-3"
                                        />
                                    </div>
                                )}

                                {/* Page Margins Option */}
                                <div className="space-y-2 border-t border-border pt-4">
                                    <label className="text-xs font-bold text-text-secondary">
                                        Page Margins
                                    </label>
                                    <RadioSelector
                                        options={[
                                            {value: "none", label: "No Margins"},
                                            {value: "small", label: "Narrow (20pt)"},
                                            {value: "medium", label: "Moderate (40pt)"}
                                        ]}
                                        selectedValue={margin}
                                        onChange={setMargin}
                                        disabled={isProcessing}
                                        className="grid-cols-3"
                                    />
                                </div>

                                {/* Stats Card Summary */}
                                <div
                                    className="bg-surface-secondary/40 border border-border p-4 rounded-xl space-y-2 text-xs font-bold text-text-secondary">
                                    <div className="flex justify-between">
                                        <span>Total Images:</span>
                                        <span className="text-text-primary font-extrabold">{files.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Est. Combined File Size:</span>
                                        <span
                                            className="text-text-primary font-extrabold font-mono">{formatBytes(totalFilesSize)}</span>
                                    </div>
                                </div>

                                {/* Compile PDF Button */}
                                <div className="pt-2">
                                    {isProcessing ? (
                                        <button
                                            disabled
                                            className="w-full py-3.5 px-4 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs font-black flex items-center justify-center gap-2"
                                        >
                                            <div
                                                className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
                                            <span>Compiling PDF ({progress}%)</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={startConversion}
                                            disabled={files.length === 0}
                                            className="w-full py-3.5 px-4 bg-success text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:bg-success/90 disabled:opacity-50 transition-all duration-200 cursor-pointer shadow-md shadow-success/15 hover:scale-[1.01] active:scale-[0.99]"
                                        >
                                            <ArrowDownload20Regular className="w-4 h-4"/>
                                            <span>Compile & Download PDF</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Active Process Log details */}
                            {isProcessing && (
                                <div
                                    className="border border-border bg-surface/50 backdrop-blur-md rounded-2xl p-6 space-y-4 animate-fadeIn">
                                    <div
                                        className="flex justify-between items-center text-xs font-black text-text-primary">
                                        <span>Processing Stage</span>
                                        <span className="font-mono text-primary">{progress}%</span>
                                    </div>

                                    <div
                                        className="w-full bg-surface-secondary rounded-full h-2 overflow-hidden border border-border">
                                        <div
                                            className="bg-primary h-full transition-all duration-300"
                                            style={{width: `${progress}%`}}
                                        />
                                    </div>

                                    {currentStepName && (
                                        <div
                                            className="text-[10px] text-text-muted font-bold flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"/>
                                            <span className="truncate">Active: {currentStepName}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Success Toast (Avoids layout jerking / shifting) */}
            {successMsg && (
                <div
                    className="fixed bottom-6 right-6 z-50 flex items-center gap-3 p-4 border border-success/20 bg-surface/95 backdrop-blur-md shadow-2xl text-success rounded-2xl text-xs font-bold max-w-sm animate-fadeIn">
                    <CheckmarkCircle20Regular className="w-5 h-5 shrink-0 text-success"/>
                    <div className="flex-1 pr-4">{successMsg}</div>
                    <button
                        onClick={() => setSuccessMsg(null)}
                        className="text-text-muted hover:text-text-primary cursor-pointer shrink-0 transition-colors"
                    >
                        <Dismiss20Regular className="w-3.5 h-3.5"/>
                    </button>
                </div>
            )}
        </>
    );
}
