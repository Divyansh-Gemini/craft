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
    DismissCircle20Regular,
    Dismiss20Regular,
    ArrowSwap20Regular,
    Checkmark20Regular
} from "@fluentui/react-icons";
import {Tool} from "@/types/tool";
import {downloadBlob, formatBytes} from "@/features/image/image-converter";
import {isValidPageRange} from "@/features/pdf/pdf-to-images";
import {
    reorderPdfPages,
    parseReorderRange,
    serializeReorderRange
} from "@/features/pdf/pdf-reorderer";

interface ReorderPdfViewProps {
    tool: Tool;
}

interface PageSequenceItem {
    id: string;      // Unique generated ID to distinguish duplicates
    pageNum: number; // 1-indexed original page number
}

// Subcomponent for lazy loading PDF page thumbnails in a viewport-aware grid
interface PageThumbnailCardProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfDoc: any;
    pageNumber: number;
    index: number;
    totalCount: number;
    isDragged: boolean;
    isDragOver: boolean;
    onMove: (currentIndex: number, direction: "left" | "right") => void;
    onMoveTo: (currentIndex: number, targetIndex: number) => void;
    onRemove: (index: number) => void;
    onDragStart: (e: React.DragEvent, index: number) => void;
    onDragOver: (e: React.DragEvent, index: number) => void;
    onDragEnd: () => void;
    onDrop: (e: React.DragEvent, index: number) => void;
}

function PageThumbnailCard({
                               pdfDoc,
                               pageNumber,
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
                           }: PageThumbnailCardProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // Inline positioning state
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

    useEffect(() => {
        const el = canvasRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            {threshold: 0.1}
        );
        observer.observe(el);

        return () => {
            observer.disconnect();
        };
    }, []);

    useEffect(() => {
        if (!isVisible || !pdfDoc) return;
        let active = true;

        const renderThumbnail = async () => {
            try {
                setLoading(true);
                const page = await pdfDoc.getPage(pageNumber);
                if (!active) return;

                const viewport = page.getViewport({scale: 0.3});
                const canvas = canvasRef.current;
                if (!canvas) return;

                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const context = canvas.getContext("2d");
                if (!context) return;

                context.imageSmoothingEnabled = true;
                context.imageSmoothingQuality = "medium";

                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;

                if (active) {
                    setLoading(false);
                }
            } catch (err) {
                console.error(`Error rendering thumbnail for page ${pageNumber}:`, err);
                if (active) {
                    setError(true);
                    setLoading(false);
                }
            }
        };

        renderThumbnail();

        return () => {
            active = false;
        };
    }, [isVisible, pdfDoc, pageNumber]);

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
            {/* Visual Thumbnail */}
            <div
                className="relative w-full aspect-3/4 bg-surface-secondary flex items-center justify-center overflow-hidden border-b border-border">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] text-text-muted font-bold animate-pulse">Loading Page...</span>
                    </div>
                )}
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-danger-bg/25">
                        <ErrorCircle20Regular className="w-5 h-5 text-danger"/>
                    </div>
                )}
                <canvas ref={canvasRef} className="w-full h-full object-contain"/>

                {/* Index badge (top-left) */}
                <div
                    className="absolute top-2.5 left-2.5 bg-primary text-white text-[10px] font-black w-6 h-6 rounded-lg flex items-center justify-center shadow-md">
                    #{index + 1}
                </div>

                {/* Drag handle (top-right, cursor grab/grabbing) */}
                <div
                    className="absolute top-2.5 right-2.5 w-6 h-6 rounded-lg bg-surface/90 border border-border text-text-secondary flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-surface hover:text-primary transition-all duration-150 shadow-xs">
                    <Reorder20Regular className="w-3.5 h-3.5"/>
                </div>

                {/* Inline overlay for Move to position */}
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
                                title="Confirm position"
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
                        <span className="text-[9px] text-text-muted">Enter 1 to {totalCount}</span>
                    </div>
                )}

                {/* Actions overlay for keyboard/mouse fallback buttons */}
                <div
                    className="absolute bottom-2 inset-x-2 bg-surface/95 border border-border rounded-lg py-1 px-1.5 flex justify-between items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 shadow-sm">
                    <div className="flex gap-0.5">
                        <button
                            type="button"
                            onClick={() => onMove(index, "left")}
                            disabled={index === 0}
                            className="p-1 text-text-muted hover:text-primary hover:bg-surface-secondary rounded-md disabled:opacity-30 cursor-pointer transition-colors duration-150"
                            title="Move Page Left"
                        >
                            <ArrowLeft20Regular className="w-4 h-4"/>
                        </button>
                        <button
                            type="button"
                            onClick={() => onMove(index, "right")}
                            disabled={index === totalCount - 1}
                            className="p-1 text-text-muted hover:text-primary hover:bg-surface-secondary rounded-md disabled:opacity-30 cursor-pointer transition-colors duration-150"
                            title="Move Page Right"
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
                            title="Move to specific position"
                        >
                            Move
                        </button>
                        <button
                            type="button"
                            onClick={() => onRemove(index)}
                            className="p-1 text-text-muted hover:text-danger hover:bg-surface-secondary rounded-md cursor-pointer transition-colors duration-150"
                            title="Remove Page"
                        >
                            <Delete20Regular className="w-4 h-4"/>
                        </button>
                    </div>
                </div>
            </div>

            {/* Label Footer */}
            <div className="py-2 px-3 flex justify-between items-center bg-surface/80">
                <span className="text-xs font-black text-text-primary">
                    Original Page {pageNumber}
                </span>
            </div>
        </div>
    );
}

export function ReorderPdfView({tool}: ReorderPdfViewProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [pdfjs, setPdfjs] = useState<any>(null);
    const [file, setFile] = useState<File | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [totalPages, setTotalPages] = useState<number>(0);

    // Page order sequences
    const [pageSequence, setPageSequence] = useState<PageSequenceItem[]>([]);
    const [rangeInput, setRangeInput] = useState<string>("");

    // Drag-and-drop state inside grid
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    // Processing States
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const [currentStepName, setCurrentStepName] = useState<string>("");

    // Status notifications
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initialize PDF.js client-side
    useEffect(() => {
        let active = true;
        const loadPdfJs = async () => {
            try {
                const mod = await import("pdfjs-dist");
                mod.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${mod.version}/build/pdf.worker.min.mjs`;
                if (active) {
                    setPdfjs(mod);
                }
            } catch (err) {
                console.error("Failed to load PDF.js libraries:", err);
                if (active) {
                    setErrorMsg("Failed to initialize PDF parsing engine. Please check your connection.");
                }
            }
        };
        loadPdfJs();
        return () => {
            active = false;
        };
    }, []);

    // Reset layout view state
    const resetState = useCallback(() => {
        setFile(null);
        setPdfDoc(null);
        setTotalPages(0);
        setPageSequence([]);
        setRangeInput("");
        setIsProcessing(false);
        setProgress(0);
        setCurrentStepName("");
        setErrorMsg(null);
        setSuccessMsg(null);
    }, []);

    // Helper to generate a unique random ID
    const generateId = () => Math.random().toString(36).substring(2, 9);

    // Load PDF file metadata & initiate cover thumbnails
    const loadPdfFile = useCallback(async (selectedFile: File) => {
        if (!pdfjs) {
            setErrorMsg("PDF engine is initializing. Please try again in a few seconds.");
            return;
        }

        const ext = selectedFile.name.split(".").pop()?.toLowerCase();
        if (selectedFile.type !== "application/pdf" && ext !== "pdf") {
            setErrorMsg("Invalid file format. Please upload a standard PDF file.");
            return;
        }

        resetState();
        setFile(selectedFile);
        setErrorMsg(null);

        try {
            const arrayBuffer = await selectedFile.arrayBuffer();
            const loadingTask = pdfjs.getDocument({data: new Uint8Array(arrayBuffer)});
            const doc = await loadingTask.promise;

            setPdfDoc(doc);
            const count = doc.numPages;
            setTotalPages(count);

            const initialSeq = Array.from({length: count}, (_, i) => ({
                id: `${i + 1}-${generateId()}`,
                pageNum: i + 1
            }));
            setPageSequence(initialSeq);
            setRangeInput(serializeReorderRange(initialSeq.map(item => item.pageNum)));
        } catch (err) {
            console.error("Error loading PDF document:", err);
            setErrorMsg("Failed to parse PDF document. Ensure it is not corrupted or password-protected.");
            setFile(null);
        }
    }, [pdfjs, resetState]);

    // Handle range text input change
    const handleRangeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setRangeInput(val);

        if (isValidPageRange(val) && totalPages > 0) {
            const parsed = parseReorderRange(val, totalPages);
            const updatedSeq = parsed.map((pageNum) => ({
                id: `${pageNum}-${generateId()}`,
                pageNum
            }));
            setPageSequence(updatedSeq);
        }
    };

    // Reorder actions: Move page to a specific index
    const movePageToPosition = useCallback((currentIndex: number, targetIndex: number) => {
        setErrorMsg(null);
        setSuccessMsg(null);

        if (targetIndex < 0 || targetIndex >= pageSequence.length || currentIndex === targetIndex) return;

        setPageSequence((prev) => {
            const updated = [...prev];
            const [item] = updated.splice(currentIndex, 1);
            updated.splice(targetIndex, 0, item);

            // Sync to text input in the same batch
            const pageNums = updated.map(i => i.pageNum);
            setRangeInput(serializeReorderRange(pageNums));

            return updated;
        });
    }, [pageSequence.length]);

    // Reorder actions: Move left/right (reuses movePageToPosition)
    const movePage = (currentIndex: number, direction: "left" | "right") => {
        const targetIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
        movePageToPosition(currentIndex, targetIndex);
    };

    // Reorder actions: Remove page
    const removePage = (index: number) => {
        setErrorMsg(null);
        setSuccessMsg(null);

        const updated = [...pageSequence];
        updated.splice(index, 1);
        setPageSequence(updated);
        setRangeInput(serializeReorderRange(updated.map(item => item.pageNum)));
    };

    // Reset sequence to original state
    const resetToOriginal = () => {
        if (totalPages === 0) return;
        setErrorMsg(null);
        setSuccessMsg(null);

        const originalSeq = Array.from({length: totalPages}, (_, i) => ({
            id: `${i + 1}-${generateId()}`,
            pageNum: i + 1
        }));
        setPageSequence(originalSeq);
        setRangeInput(serializeReorderRange(originalSeq.map(item => item.pageNum)));
    };

    // Reverse page order
    const reverseOrder = () => {
        if (pageSequence.length === 0) return;
        setErrorMsg(null);
        setSuccessMsg(null);

        const updated = [...pageSequence].reverse();
        setPageSequence(updated);
        setRangeInput(serializeReorderRange(updated.map(item => item.pageNum)));
    };

    // Clear all pages from compilation sequence
    const clearAll = () => {
        setErrorMsg(null);
        setSuccessMsg(null);
        setPageSequence([]);
        setRangeInput("");
    };

    // Reusable drag over auto-scroller for container and viewport
    const handleDragScroll = useCallback((clientY: number) => {
        // 1. Auto-scroll container
        const container = containerRef.current;
        if (container) {
            const rect = container.getBoundingClientRect();
            const relativeY = clientY - rect.top;
            const threshold = 60; // distance from boundary in pixels
            const speed = 12;

            if (relativeY < threshold) {
                container.scrollTop -= speed;
            } else if (rect.height - relativeY < threshold) {
                container.scrollTop += speed;
            }
        }

        // 2. Auto-scroll page viewport (fixes scrolling when container bottom is off-screen)
        const viewportHeight = window.innerHeight;
        const pageThreshold = 80; // distance from screen edge in pixels
        const pageSpeed = 10;

        if (clientY < pageThreshold) {
            window.scrollBy(0, -pageSpeed);
        } else if (viewportHeight - clientY < pageThreshold) {
            window.scrollBy(0, pageSpeed);
        }
    }, []);

    // Grid Drag & Drop Events
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

        movePageToPosition(draggedIndex, targetIndex);

        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    // Validation checks
    const isSelectionValid = useMemo(() => {
        if (!isValidPageRange(rangeInput)) return false;
        return pageSequence.length > 0;
    }, [rangeInput, pageSequence]);

    // Handle pages reordering and download compiling
    const handleProcessPdf = async () => {
        if (!file || isProcessing || !isSelectionValid) return;

        setIsProcessing(true);
        setErrorMsg(null);
        setSuccessMsg(null);
        setProgress(0);
        setCurrentStepName("Configuring job...");

        try {
            // Convert to 0-based page indices for pdf-lib
            const pageIndices = pageSequence.map((item) => item.pageNum - 1);
            const processedBlob = await reorderPdfPages(
                file,
                pageIndices,
                (progressVal, stepName) => {
                    setProgress(progressVal);
                    setCurrentStepName(stepName);
                }
            );

            // Trigger download client-side
            const originalName = file.name.substring(0, file.name.lastIndexOf("."));
            const finalFilename = `${originalName}_reordered.pdf`;
            downloadBlob(processedBlob, finalFilename);

            setSuccessMsg(`PDF reordered successfully! Downloaded new PDF containing ${pageSequence.length} ${pageSequence.length === 1 ? "page" : "pages"}.`);
        } catch (err: unknown) {
            console.error("PDF Reordering process error:", err);
            const message = err instanceof Error ? err.message : "Failed to process PDF page reordering.";
            setErrorMsg(message);
        } finally {
            setIsProcessing(false);
            setProgress(0);
            setCurrentStepName("");
        }
    };

    // Drag-and-drop Upload handlers
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
            loadPdfFile(e.dataTransfer.files[0]);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            loadPdfFile(e.target.files[0]);
            e.target.value = "";
        }
    };

    return (
        <>
            {/* Title and description */}
            <div
                className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-6 gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                            <span
                                className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                                <ArrowSwap20Regular className="w-4 h-4"/>
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

            {/* Notification Banners */}
            {errorMsg && (
                <div
                    className="flex items-start gap-3 p-4 border border-danger/20 bg-danger-bg/40 text-danger rounded-2xl text-xs font-bold animate-fadeIn">
                    <ErrorCircle20Regular className="w-5 h-5 shrink-0"/>
                    <div>{errorMsg}</div>
                </div>
            )}

            {successMsg && (
                <div
                    className="flex items-start gap-3 p-4 border border-success/20 bg-success-bg/40 text-success rounded-2xl text-xs font-bold animate-fadeIn">
                    <CheckmarkCircle20Regular className="w-5 h-5 shrink-0"/>
                    <div>{successMsg}</div>
                </div>
            )}

            {/* PDF Loading Core overlay */}
            {!pdfjs && !errorMsg && (
                <div
                    className="flex flex-col items-center justify-center py-20 space-y-4 border border-border bg-surface/30 backdrop-blur-md rounded-3xl">
                    <div
                        className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
                    <p className="text-xs font-bold text-text-secondary animate-pulse">
                        Initializing WebAssembly PDF Render Core...
                    </p>
                </div>
            )}

            {pdfjs && (
                <div className="space-y-6">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={onFileSelect}
                        accept=".pdf,application/pdf"
                        className="hidden"
                    />

                    {/* File Upload Zone */}
                    {!file && (
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
                                    <ArrowSwap20Regular className="w-8 h-8"/>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-extrabold text-text-primary">
                                        Drag & drop your PDF file here, or <span
                                        className="text-primary">browse</span>
                                    </p>
                                    <p className="text-[10px] text-text-muted">
                                        Rearrange page orders, duplicate, or delete pages client-side. Your files
                                        never touch our servers.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Editor Workspace */}
                    {file && pdfDoc && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            {/* Left Side: Pages Grid Editor */}
                            <div className="lg:col-span-8 space-y-4">
                                <div
                                    className="border border-border bg-surface/50 backdrop-blur-md rounded-2xl p-5 space-y-4">
                                    <div
                                        className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-3 gap-3">
                                        <div
                                            className="flex items-center gap-2 text-xs font-black text-text-primary">
                                            <Grid20Regular className="w-4 h-4 text-primary"/>
                                            <span>Drag-and-Drop Editor</span>
                                        </div>

                                        <div className="flex gap-1.5 self-start sm:self-auto">
                                            <button
                                                onClick={resetToOriginal}
                                                className="px-2.5 py-1 text-[10px] font-black text-text-secondary hover:text-primary hover:bg-surface-secondary border border-border bg-surface rounded-md cursor-pointer transition-all duration-150"
                                            >
                                                Reset Order
                                            </button>
                                            <button
                                                onClick={reverseOrder}
                                                className="px-2.5 py-1 text-[10px] font-black text-text-secondary hover:text-primary hover:bg-surface-secondary border border-border bg-surface rounded-md cursor-pointer transition-all duration-150"
                                            >
                                                Reverse
                                            </button>
                                            <button
                                                onClick={clearAll}
                                                className="px-2.5 py-1 text-[10px] font-black text-text-muted hover:text-danger hover:bg-danger-bg/10 border border-border bg-surface rounded-md cursor-pointer transition-all duration-150"
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                    </div>

                                    <p className="text-[10px] text-text-muted leading-relaxed font-bold bg-surface-secondary/40 border border-border/60 p-2.5 rounded-xl">
                                        💡 Drag cards to change the sequence. Use the overlay controls to delete,
                                        shift positions, or enter a target position number.
                                    </p>

                                    {/* Drag and Drop Grid Container */}
                                    <div
                                        ref={containerRef}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            handleDragScroll(e.clientY);
                                        }}
                                        className="max-h-140 overflow-y-auto pr-1.5 custom-scrollbar"
                                    >
                                        {pageSequence.length > 0 ? (
                                            <div className="grid grid-cols-3 lg:grid-cols-4 gap-4 select-none">
                                                {pageSequence.map((item, idx) => (
                                                    <PageThumbnailCard
                                                        key={item.id}
                                                        pdfDoc={pdfDoc}
                                                        pageNumber={item.pageNum}
                                                        index={idx}
                                                        totalCount={pageSequence.length}
                                                        isDragged={draggedIndex === idx}
                                                        isDragOver={dragOverIndex === idx}
                                                        onMove={movePage}
                                                        onMoveTo={movePageToPosition}
                                                        onRemove={removePage}
                                                        onDragStart={handleDragStart}
                                                        onDragOver={handleDragOver}
                                                        onDragEnd={handleDragEnd}
                                                        onDrop={handleDrop}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <div
                                                className="flex flex-col items-center justify-center py-20 text-center space-y-2 border border-dashed border-border rounded-xl">
                                                    <span className="text-text-muted/40">
                                                        <DismissCircle20Regular className="w-8 h-8"/>
                                                    </span>
                                                <p className="text-xs font-bold text-text-muted">
                                                    No pages left in the sequence. Clear range or reset order to
                                                    start over.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Actions and Controls */}
                            <div className="lg:col-span-4 space-y-6">
                                <div
                                    className="border border-border bg-surface/50 backdrop-blur-md rounded-2xl p-6 space-y-6">
                                    <div className="flex items-center gap-2 border-b border-border pb-3">
                                        <Settings20Regular className="w-4 h-4 text-primary"/>
                                        <h2 className="text-xs font-black text-text-primary uppercase tracking-wider">
                                            Reorder Settings
                                        </h2>
                                    </div>

                                    {/* File Metadata Card */}
                                    <div
                                        className="flex items-center justify-between bg-surface-secondary/40 border border-border p-4 rounded-xl">
                                        <div className="min-w-0 flex-1 pr-3">
                                            <p className="text-xs font-extrabold text-text-primary truncate"
                                               title={file.name}>
                                                {file.name}
                                            </p>
                                            <p className="text-[10px] text-text-muted font-bold mt-0.5 font-mono">
                                                {formatBytes(file.size)} • {totalPages} {totalPages === 1 ? "Page" : "Pages"}
                                            </p>
                                        </div>
                                        <button
                                            onClick={resetState}
                                            disabled={isProcessing}
                                            className="w-8 h-8 rounded-lg border border-border bg-surface text-text-muted hover:border-danger hover:text-danger disabled:opacity-50 cursor-pointer transition-all duration-200 flex items-center justify-center shrink-0"
                                            title="Choose different PDF"
                                        >
                                            <Dismiss20Regular className="w-4 h-4"/>
                                        </button>
                                    </div>

                                    {/* Page sequence string input */}
                                    <div className="space-y-2 border-t border-border pt-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-text-secondary">
                                                Page Sequence Input
                                            </label>
                                            <span className="text-[10px] text-text-muted font-bold font-mono">
                                                    {pageSequence.length} page(s)
                                                </span>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={rangeInput}
                                                onChange={handleRangeInputChange}
                                                placeholder="e.g. 1-3, 5, 2"
                                                disabled={isProcessing}
                                                className="w-full text-xs font-bold font-mono px-3.5 py-3 border border-border bg-surface rounded-xl focus:border-primary focus:ring-1 focus:ring-primary/20 outline-hidden transition-all duration-200 placeholder:text-text-muted/60 disabled:opacity-50"
                                            />
                                        </div>

                                        {/* Live verification label */}
                                        <div className="flex items-center min-h-5 pt-0.5">
                                            {!isValidPageRange(rangeInput) ? (
                                                <span
                                                    className="text-[10px] text-danger font-bold flex items-center gap-1">
                                                        <ErrorCircle20Regular className="w-3.5 h-3.5"/>
                                                        Invalid format (use numbers, commas, and dashes, e.g. 1-3, 5)
                                                    </span>
                                            ) : pageSequence.length === 0 ? (
                                                <span
                                                    className="text-[10px] text-danger font-bold flex items-center gap-1">
                                                        <ErrorCircle20Regular className="w-3.5 h-3.5"/>
                                                        Sequence must contain at least 1 page
                                                    </span>
                                            ) : (
                                                <span className="text-[10px] text-text-muted font-bold">
                                                        Sequence successfully mapped. Ready to export.
                                                    </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Compile & Download button */}
                                    <div className="pt-2">
                                        {isProcessing ? (
                                            <button
                                                disabled
                                                className="w-full py-3.5 px-4 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs font-black flex items-center justify-center gap-2"
                                            >
                                                <div
                                                    className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
                                                <span>Processing PDF ({progress}%)</span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleProcessPdf}
                                                disabled={!isSelectionValid}
                                                className="w-full py-3.5 px-4 bg-success text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:bg-success/90 disabled:opacity-50 transition-all duration-200 cursor-pointer shadow-md shadow-success/15 hover:scale-[1.01] active:scale-[0.99]"
                                            >
                                                <ArrowDownload20Regular className="w-4 h-4"/>
                                                <span>
                                                        Save & Download PDF
                                                    </span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Action logger overlay */}
                                {isProcessing && (
                                    <div
                                        className="border border-border bg-surface/50 backdrop-blur-md rounded-2xl p-6 space-y-4 animate-fadeIn">
                                        <div
                                            className="flex justify-between items-center text-xs font-black text-text-primary">
                                            <span>Processing Details</span>
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
            )}
        </>
    );
}
