"use client";

import React, {useState, useRef, useCallback, useMemo, useEffect} from "react";
import {
    ArrowDownload20Regular,
    DocumentAdd20Regular,
    CheckmarkCircle20Regular,
    ErrorCircle20Regular,
    Delete20Regular,
    Settings20Regular,
    Reorder20Regular
} from "@fluentui/react-icons";
import {Tool} from "@/types/tool";
import {downloadBlob, formatBytes} from "@/features/image/image-converter";
import {mergePdfFiles, getPdfPageCount} from "@/features/pdf/pdf-merger";
import {RadioSelector} from "@/components/ui/radio-selector";

interface MergePdfViewProps {
    tool: Tool;
}

interface MergeFileItem {
    id: string;
    file: File;
    name: string;
    size: number;
    pageCount: number;
}

// Subcomponent for lazy loading PDF page 1 (cover) thumbnail inside each queue card
interface PdfCoverThumbnailProps {
    file: File;
}

function PdfCoverThumbnail({file}: PdfCoverThumbnailProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [pdfjs, setPdfjs] = useState<any>(null);

    useEffect(() => {
        let active = true;
        // Dynamically import PDF.js on client side
        import("pdfjs-dist").then((mod) => {
            mod.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${mod.version}/build/pdf.worker.min.mjs`;
            if (active) {
                setPdfjs(mod);
            }
        });
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!pdfjs || !file) return;
        let active = true;

        const renderCover = async () => {
            try {
                setLoading(true);
                setError(false);
                const arrayBuffer = await file.arrayBuffer();
                if (!active) return;

                const loadingTask = pdfjs.getDocument({data: new Uint8Array(arrayBuffer)});
                const doc = await loadingTask.promise;
                if (!active) return;

                const page = await doc.getPage(1);
                if (!active) return;

                // Render tiny scale (e.g. 0.12) to serve as a queue list card icon
                const viewport = page.getViewport({scale: 0.12});
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
                console.error("Cover thumbnail render failed:", err);
                if (active) {
                    setError(true);
                    setLoading(false);
                }
            }
        };

        renderCover();

        return () => {
            active = false;
        };
    }, [pdfjs, file]);

    return (
        <div
            className="w-9 h-12 bg-surface-secondary border border-border rounded flex items-center justify-center overflow-hidden shrink-0 relative select-none">
            {loading && (
                <div
                    className="absolute inset-0 flex items-center justify-center text-[7px] text-text-muted/60 animate-pulse font-bold bg-surface-secondary">
                    Loading
                </div>
            )}
            {error && (
                <div
                    className="absolute inset-0 flex items-center justify-center text-[8px] text-danger/80 font-bold bg-danger-bg/25">
                    Error
                </div>
            )}
            <canvas ref={canvasRef} className="w-full h-full object-contain"/>
        </div>
    );
}

export function MergePdfView({tool}: MergePdfViewProps) {
    const [files, setFiles] = useState<MergeFileItem[]>([]);
    const [outputName, setOutputName] = useState<string>("merged-document");
    const [isMerging, setIsMerging] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const [currentStepName, setCurrentStepName] = useState<string>("");

    // Drag-and-drop states
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [isDraggingQueue, setIsDraggingQueue] = useState<boolean>(false);

    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // HTML5 Drag-and-drop ordering states
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [standardizeWidth, setStandardizeWidth] = useState<"disable" | "smallest" | "largest">("disable");

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Dynamic aggregates
    const totalPagesCount = useMemo(() => {
        return files.reduce((sum, item) => sum + item.pageCount, 0);
    }, [files]);

    const totalFilesSize = useMemo(() => {
        return files.reduce((sum, item) => sum + item.size, 0);
    }, [files]);

    // Handle files uploads & page count parsing in parallel
    const handleFiles = useCallback(async (fileList: FileList | File[]) => {
        setErrorMsg(null);
        setSuccessMsg(null);

        try {
            const promises = Array.from(fileList).map(async (file) => {
                const ext = file.name.split(".").pop()?.toLowerCase();

                if (file.type !== "application/pdf" && ext !== "pdf") {
                    setErrorMsg("Some selected files were skipped because they are not PDFs.");
                    return null;
                }

                const id = Math.random().toString(36).substring(2, 9);
                const pageCount = await getPdfPageCount(file);

                return {
                    id,
                    file,
                    name: file.name,
                    size: file.size,
                    pageCount: pageCount || 1 // Fallback to 1 if parsing fails
                };
            });

            const results = await Promise.all(promises);
            const validItems = results.filter((item): item is MergeFileItem => item !== null);

            if (validItems.length > 0) {
                setFiles((prev) => [...prev, ...validItems]);
            }
        } catch (err: any) {
            console.error("Error loading PDF files:", err);
            setErrorMsg("An error occurred while loading files.");
        }
    }, []);

    // Drag-and-drop Queue sorting events
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
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === targetIndex) return;

        setFiles((prev) => {
            const next = [...prev];
            const draggedItem = next[draggedIndex];
            next.splice(draggedIndex, 1);
            next.splice(targetIndex, 0, draggedItem);
            return next;
        });

        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const removeFile = useCallback((id: string) => {
        setErrorMsg(null);
        setSuccessMsg(null);
        setFiles((prev) => prev.filter((item) => item.id !== id));
    }, []);

    const clearAll = useCallback(() => {
        setFiles([]);
        setErrorMsg(null);
        setSuccessMsg(null);
        setProgress(0);
    }, []);

    // Perform PDFs merge Combination
    const startMergeProcess = async () => {
        if (files.length < 2) {
            setErrorMsg("Please upload at least 2 PDF files to merge.");
            return;
        }

        setIsMerging(true);
        setErrorMsg(null);
        setSuccessMsg(null);
        setProgress(0);
        setCurrentStepName("Starting compilation...");

        try {
            const rawFilesList = files.map((item) => item.file);
            const mergedBlob = await mergePdfFiles(
                rawFilesList,
                {standardizeWidth},
                (progressVal, stepName) => {
                    setProgress(progressVal);
                    setCurrentStepName(stepName);
                }
            );

            // Trigger direct download
            const finalName = outputName.trim() ? `${outputName.trim()}.pdf` : "merged-document.pdf";
            downloadBlob(mergedBlob, finalName);

            setSuccessMsg("PDFs combined successfully! Download has been triggered.");
        } catch (err: any) {
            console.error("PDF Merging error:", err);
            setErrorMsg(err.message || "Failed to compile and merge PDF files.");
        } finally {
            setIsMerging(false);
            setProgress(0);
            setCurrentStepName("");
        }
    };

    // Drag-and-drop upload events for initial dropzone
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

    // Drag-and-drop upload events for active queue card
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
            {/* Tool Title Block */}
            <div
                className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-6 gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                            <span
                                className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                                <DocumentAdd20Regular className="w-4 h-4"/>
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

            {/* Status Banners */}
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

            <div className="space-y-6">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onFileSelect}
                    multiple
                    accept=".pdf,application/pdf"
                    className="hidden"
                />

                {/* Drag-and-drop zone (Hidden once PDFs are uploaded) */}
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
                                <DocumentAdd20Regular className="w-8 h-8"/>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-extrabold text-text-primary">
                                    Drag & drop multiple PDF files here, or <span
                                    className="text-primary">browse</span>
                                </p>
                                <p className="text-[10px] text-text-muted">
                                    Combine your PDF files locally. High performance client-side rendering.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Split layout: left list and right configuration */}
                {files.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                        {/* Left: Reordering List (7 cols) */}
                        <div className="lg:col-span-7 space-y-4">
                            <div
                                onDragOver={onDragOverQueue}
                                onDragLeave={onDragLeaveQueue}
                                onDrop={onDropQueue}
                                className={`border bg-surface/50 backdrop-blur-md rounded-2xl p-5 space-y-4 transition-all duration-300 ${
                                    isDraggingQueue
                                        ? "border-primary ring-2 ring-primary/20 shadow-md shadow-primary/5 bg-primary/5 scale-[1.005]"
                                        : "border-border"
                                }`}
                            >
                                <div className="flex items-center justify-between border-b border-border pb-3">
                                    <h3 className="text-xs font-black text-text-primary uppercase tracking-wider">
                                        Documents Queue ({files.length})
                                    </h3>

                                    {/* Queue Actions Header */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={triggerFileInput}
                                            disabled={isMerging}
                                            className="w-8 h-8 sm:w-auto sm:px-3 sm:py-1.5 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface text-[10px] font-bold text-text-muted hover:border-primary hover:text-primary disabled:opacity-50 transition-all duration-200 cursor-pointer shrink-0"
                                            title="Add More PDFs"
                                        >
                                            <DocumentAdd20Regular className="w-3.5 h-3.5"/>
                                            <span className="hidden sm:inline">Add More</span>
                                        </button>
                                        <button
                                            onClick={clearAll}
                                            disabled={isMerging}
                                            className="w-8 h-8 sm:w-auto sm:px-3 sm:py-1.5 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface text-[10px] font-bold text-text-muted hover:border-danger hover:text-danger disabled:opacity-50 transition-all duration-200 cursor-pointer shrink-0"
                                            title="Clear Queue"
                                        >
                                            <Delete20Regular className="w-3.5 h-3.5"/>
                                            <span className="hidden sm:inline">Clear Queue</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Relocated Info Tooltip at the top */}
                                <p className="text-[10px] text-text-muted leading-relaxed font-bold bg-surface-secondary/40 border border-border/60 p-2.5 rounded-xl">
                                    💡 Grab the handle icons on the left to drag and drop PDFs into your preferred
                                    sequence. Files combine from index #1 to the end.
                                </p>

                                {/* Scrollable list container */}
                                <div
                                    className="flex flex-col gap-3 max-h-120 overflow-y-auto custom-scrollbar select-none w-full">
                                    {files.map((item, index) => (
                                        <div
                                            key={item.id}
                                            draggable={!isMerging}
                                            onDragStart={(e) => handleDragStart(e, index)}
                                            onDragOver={(e) => handleDragOver(e, index)}
                                            onDragEnd={handleDragEnd}
                                            onDrop={(e) => handleDrop(e, index)}
                                            className={`w-full flex items-center justify-between border bg-surface/40 hover:bg-surface/75 p-3 rounded-xl gap-3 transition-all duration-200 ${
                                                draggedIndex === index
                                                    ? "opacity-30 border-dashed border-primary scale-[0.98]"
                                                    : dragOverIndex === index
                                                        ? "border-primary/60 bg-primary/5 ring-1 ring-primary/20 scale-[1.01]"
                                                        : "border-border"
                                            }`}
                                        >
                                            {/* Grab Handle */}
                                            <div
                                                className="text-text-muted/50 hover:text-text-primary cursor-grab active:cursor-grabbing p-1 shrink-0 transition-colors duration-200"
                                                title="Drag to reorder">
                                                <Reorder20Regular className="w-4 h-4"/>
                                            </div>

                                            {/* Index Number */}
                                            <span
                                                className="w-6 h-6 rounded-md bg-surface-secondary text-[10px] font-black flex items-center justify-center border border-border shrink-0 text-text-muted">
                                                    #{index + 1}
                                                </span>

                                            {/* PDF Cover thumbnail */}
                                            <PdfCoverThumbnail file={item.file}/>

                                            {/* File Details */}
                                            <div className="min-w-0 flex-1 pr-2">
                                                <p className="text-xs font-extrabold text-text-primary truncate"
                                                   title={item.name}>
                                                    {item.name}
                                                </p>
                                                <p className="text-[10px] text-text-muted font-bold mt-0.5 font-mono">
                                                    {formatBytes(item.size)} • {item.pageCount} {item.pageCount === 1 ? "page" : "pages"}
                                                </p>
                                            </div>

                                            {/* Remove item button */}
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    onClick={() => removeFile(item.id)}
                                                    disabled={isMerging}
                                                    className="w-8 h-8 rounded-lg border border-border bg-surface text-text-muted hover:border-danger hover:text-danger disabled:opacity-30 cursor-pointer flex items-center justify-center transition-all duration-200"
                                                    title="Remove File"
                                                >
                                                    <Delete20Regular className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Bottom inline 'Add PDFs' card trigger */}
                                    <div
                                        onClick={triggerFileInput}
                                        className="w-full flex items-center justify-center border border-dashed border-border hover:border-primary/60 bg-surface/20 hover:bg-surface/40 p-3 rounded-xl cursor-pointer transition-all duration-200 text-xs font-bold text-text-muted hover:text-primary gap-2 select-none"
                                    >
                                        <DocumentAdd20Regular className="w-4 h-4"/>
                                        <span>Add More PDF Files</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Action & settings panel (5 cols) */}
                        <div className="lg:col-span-5 space-y-6">

                            {/* Settings card */}
                            <div
                                className="border border-border bg-surface/50 backdrop-blur-md rounded-2xl p-6 space-y-6">
                                <div className="flex items-center gap-2 border-b border-border pb-3">
                                    <Settings20Regular className="w-4 h-4 text-primary"/>
                                    <h2 className="text-xs font-black text-text-primary uppercase tracking-wider">
                                        Compilation Settings
                                    </h2>
                                </div>

                                {/* 1. Name settings */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-secondary">
                                        Merged PDF Filename
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={outputName}
                                            onChange={(e) => setOutputName(e.target.value)}
                                            placeholder="e.g. final-presentation"
                                            disabled={isMerging}
                                            className="w-full text-xs font-bold px-3.5 py-3 border border-border bg-surface rounded-xl focus:border-primary focus:ring-1 focus:ring-primary/20 outline-hidden transition-all duration-200 placeholder:text-text-muted/60 disabled:opacity-50"
                                        />
                                        <span
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted select-none font-mono">
                                                .pdf
                                            </span>
                                    </div>
                                </div>

                                {/* Page Width Standardization Selector */}
                                <div className="space-y-2 border-t border-border pt-4">
                                    <label className="text-xs font-bold text-text-secondary">
                                        Standardize Page Widths
                                    </label>
                                    <RadioSelector
                                        options={[
                                            {value: "disable", label: "Original"},
                                            {value: "smallest", label: "Smallest"},
                                            {value: "largest", label: "Largest"}
                                        ]}
                                        selectedValue={standardizeWidth}
                                        onChange={setStandardizeWidth}
                                        disabled={isMerging}
                                        className="grid-cols-3"
                                    />
                                </div>

                                {/* 2. File stats summary */}
                                <div
                                    className="bg-surface-secondary/40 border border-border p-4 rounded-xl space-y-2 text-xs font-bold text-text-secondary">
                                    <div className="flex justify-between">
                                        <span>Combined Documents:</span>
                                        <span className="text-text-primary font-extrabold">{files.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Combined Output Pages:</span>
                                        <span
                                            className="text-text-primary font-extrabold">{totalPagesCount} Pages</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Est. Combined File Size:</span>
                                        <span
                                            className="text-text-primary font-extrabold font-mono">{formatBytes(totalFilesSize)}</span>
                                    </div>
                                </div>

                                {/* Action button */}
                                <div className="pt-2">
                                    {isMerging ? (
                                        <button
                                            disabled
                                            className="w-full py-3.5 px-4 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs font-black flex items-center justify-center gap-2"
                                        >
                                            <div
                                                className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
                                            <span>Compiling Files ({progress}%)</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={startMergeProcess}
                                            disabled={files.length < 2}
                                            className="w-full py-3.5 px-4 bg-success text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:bg-success/90 disabled:opacity-50 transition-all duration-200 cursor-pointer shadow-md shadow-success/15 hover:scale-[1.01] active:scale-[0.99]"
                                        >
                                            <ArrowDownload20Regular className="w-4 h-4"/>
                                            <span>Combine & Download PDF</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Merging log output */}
                            {isMerging && (
                                <div
                                    className="border border-border bg-surface/50 backdrop-blur-md rounded-2xl p-6 space-y-4 animate-fadeIn">
                                    <div
                                        className="flex justify-between items-center text-xs font-black text-text-primary">
                                        <span>Merging Process Log</span>
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
                                            <span className="truncate">Processing: {currentStepName}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
