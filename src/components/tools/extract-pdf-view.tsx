"use client";

import React, {useState, useRef, useCallback, useEffect, useMemo} from "react";
import {
    DocumentTextExtract20Regular,
    Dismiss20Regular,
    ArrowDownload20Regular,
    CheckmarkCircle20Regular,
    ErrorCircle20Regular,
    Settings20Regular,
    Grid20Regular,
    DismissCircle20Regular,
    Checkmark20Regular
} from "@fluentui/react-icons";
import {Tool} from "@/types/tool";
import {downloadBlob, formatBytes} from "@/features/image/image-converter";
import {
    isValidPageRange,
    parsePageRanges,
    serializePageRanges
} from "@/features/pdf/pdf-to-images";
import {extractPdfPages} from "@/features/pdf/pdf-extractor";

interface ExtractPdfViewProps {
    tool: Tool;
}

// Subcomponent for lazy loading PDF page thumbnails in a viewport-aware grid
interface PageThumbnailCardProps {
    pdfDoc: any;
    pageNumber: number;
    isSelected: boolean;
    onToggle: (pageNumber: number) => void;
}

function PageThumbnailCard({pdfDoc, pageNumber, isSelected, onToggle}: PageThumbnailCardProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

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
            onClick={() => onToggle(pageNumber)}
            className={`relative flex flex-col rounded-xl overflow-hidden cursor-pointer transition-all duration-300 border bg-surface/40 hover:scale-[1.02] group ${
                isSelected
                    ? "border-primary bg-primary/5 shadow-md scale-[1.01]"
                    : "border-border opacity-60 grayscale-30 hover:opacity-90 hover:scale-[1.0]"
            }`}
        >
            {/* Visual Thumbnail */}
            <div
                className={`relative w-full aspect-3/4 bg-surface-secondary flex items-center justify-center overflow-hidden border-b border-border transition-all duration-300`}
            >
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

                {/* Status overlay banner */}
                {isSelected && (
                    <div className="absolute inset-0 bg-primary/5 flex items-center justify-center">
                        <span
                            className="bg-primary text-white text-[9px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full shadow-lg">
                            Extract
                        </span>
                    </div>
                )}

                {/* Corner Status Badge */}
                <div
                    className={`absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-200 shadow-md ${
                        isSelected
                            ? "bg-primary border-primary text-white scale-110"
                            : "bg-surface border-border text-text-muted scale-100 opacity-0 group-hover:opacity-100"
                    }`}
                >
                    <Checkmark20Regular className="w-3.5 h-3.5"/>
                </div>
            </div>

            {/* Label Footer */}
            <div className={`py-2 px-3 flex justify-between items-center transition-colors duration-300 ${
                isSelected ? "bg-primary/10" : "bg-surface/80"
            }`}>
                <span className={`text-xs font-black ${isSelected ? "text-primary" : "text-text-primary"}`}>
                    Page {pageNumber}
                </span>
                <span className={`text-[9px] font-extrabold uppercase tracking-wide ${
                    isSelected ? "text-primary" : "text-text-muted"
                }`}>
                    {isSelected ? "Selected" : "Excluded"}
                </span>
            </div>
        </div>
    );
}

// Reusable PresetSelector component for selection presets
interface PresetSelectorProps {
    onSelect: (preset: "all" | "clear" | "even" | "odd") => void;
    disabled?: boolean;
}

const PRESETS = [
    {id: "all", label: "Select All"},
    {id: "odd", label: "Odd"},
    {id: "even", label: "Even"},
    {id: "clear", label: "Clear"}
] as const;

function PresetSelector({onSelect, disabled = false}: PresetSelectorProps) {
    return (
        <div className="flex gap-2 items-center">
            {PRESETS.map((preset, index) => (
                <React.Fragment key={preset.id}>
                    {index > 0 && <span className="text-[10px] text-border font-bold">|</span>}
                    <button
                        type="button"
                        onClick={() => onSelect(preset.id)}
                        disabled={disabled}
                        className="text-[10px] font-black text-primary hover:underline cursor-pointer disabled:opacity-50 disabled:no-underline"
                    >
                        {preset.label}
                    </button>
                </React.Fragment>
            ))}
        </div>
    );
}

export function ExtractPdfView({tool}: ExtractPdfViewProps) {
    const [pdfjs, setPdfjs] = useState<any>(null);
    const [file, setFile] = useState<File | null>(null);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [totalPages, setTotalPages] = useState<number>(0);

    // Set of 1-indexed page numbers marked for EXTRACTION
    const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
    const [rangeInput, setRangeInput] = useState<string>("");

    // Page filter modes
    const [filterMode, setFilterMode] = useState<"all" | "selected" | "excluded">("all");

    // Processing States
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const [currentStepName, setCurrentStepName] = useState<string>("");

    // Status notifications
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

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
        setSelectedPages(new Set());
        setRangeInput("");
        setFilterMode("all");
        setIsProcessing(false);
        setProgress(0);
        setCurrentStepName("");
        setErrorMsg(null);
        setSuccessMsg(null);
    }, []);

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
            setTotalPages(doc.numPages);
            // Default to selecting all pages initially
            const allPages = Array.from({length: doc.numPages}, (_, i) => i + 1);
            setSelectedPages(new Set(allPages));
            setRangeInput("all");
        } catch (err) {
            console.error("Error loading PDF document:", err);
            setErrorMsg("Failed to parse PDF document. Ensure it is not corrupted or password-protected.");
            setFile(null);
        }
    }, [pdfjs, resetState]);

    // Parse input box ranges to selected pages Set
    const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setRangeInput(val);

        if (isValidPageRange(val) && totalPages > 0) {
            const clean = val.trim().toLowerCase();
            if (!clean) {
                setSelectedPages(new Set());
            } else if (clean === "all") {
                const allPages = Array.from({length: totalPages}, (_, i) => i + 1);
                setSelectedPages(new Set(allPages));
            } else {
                const parsed = parsePageRanges(clean, totalPages);
                setSelectedPages(new Set(parsed));
            }
        }
    };

    // Toggle single page selection state
    const togglePageSelection = (pageNumber: number) => {
        setErrorMsg(null);
        setSuccessMsg(null);
        setSelectedPages((prev) => {
            const next = new Set(prev);
            if (next.has(pageNumber)) {
                next.delete(pageNumber);
            } else {
                next.add(pageNumber);
            }

            // Sync range input string
            const list = Array.from(next).sort((a, b) => a - b);
            if (list.length === totalPages) {
                setRangeInput("all");
            } else if (list.length === 0) {
                setRangeInput("");
            } else {
                setRangeInput(serializePageRanges(list));
            }
            return next;
        });
    };

    // Presets actions mapping
    const selectPreset = (type: "all" | "clear" | "even" | "odd") => {
        if (totalPages === 0) return;
        setErrorMsg(null);
        setSuccessMsg(null);

        let selectedList: number[] = [];
        if (type === "all") {
            selectedList = Array.from({length: totalPages}, (_, i) => i + 1);
            setRangeInput("all");
        } else if (type === "clear") {
            selectedList = [];
            setRangeInput("");
        } else if (type === "even") {
            selectedList = Array.from({length: totalPages}, (_, i) => i + 1).filter(p => p % 2 === 0);
            setRangeInput(serializePageRanges(selectedList));
        } else if (type === "odd") {
            selectedList = Array.from({length: totalPages}, (_, i) => i + 1).filter(p => p % 2 !== 0);
            setRangeInput(serializePageRanges(selectedList));
        }

        setSelectedPages(new Set(selectedList));
    };

    // Check if the current configuration is processable
    const isSelectionValid = useMemo(() => {
        if (!isValidPageRange(rangeInput)) return false;
        return selectedPages.size > 0 && selectedPages.size <= totalPages;
    }, [rangeInput, selectedPages, totalPages]);

    const excludedPagesCount = totalPages - selectedPages.size;

    // Filter pages list for grid rendering
    const visiblePages = useMemo(() => {
        const pagesList = Array.from({length: totalPages}, (_, i) => i + 1);
        if (filterMode === "all") return pagesList;
        if (filterMode === "selected") return pagesList.filter(p => selectedPages.has(p));
        return pagesList.filter(p => !selectedPages.has(p));
    }, [totalPages, filterMode, selectedPages]);

    // Handle pages extraction and compile result PDF
    const handleProcessPdf = async () => {
        if (!file || isProcessing || !isSelectionValid) return;

        setIsProcessing(true);
        setErrorMsg(null);
        setSuccessMsg(null);
        setProgress(0);
        setCurrentStepName("Configuring job...");

        try {
            // Respect the page range order if typed, otherwise default to sorted order from set
            let extractionList: number[];
            const cleanInput = rangeInput.trim().toLowerCase();

            if (cleanInput === "all" || !cleanInput) {
                extractionList = Array.from(selectedPages).sort((a, b) => a - b);
            } else {
                extractionList = parsePageRanges(cleanInput, totalPages);
            }

            if (extractionList.length === 0) {
                throw new Error("No valid pages selected for extraction.");
            }

            const processedBlob = await extractPdfPages(
                file,
                extractionList,
                (progressVal, stepName) => {
                    setProgress(progressVal);
                    setCurrentStepName(stepName);
                }
            );

            // Trigger download client-side
            const originalName = file.name.substring(0, file.name.lastIndexOf("."));
            const finalFilename = `${originalName}_extracted.pdf`;
            downloadBlob(processedBlob, finalFilename);

            setSuccessMsg(`Pages extracted successfully! Saved PDF containing ${extractionList.length} ${extractionList.length === 1 ? "page" : "pages"}.`);
        } catch (err: any) {
            console.error("PDF Extraction process error:", err);
            setErrorMsg(err.message || "Failed to process PDF page extraction.");
        } finally {
            setIsProcessing(false);
            setProgress(0);
            setCurrentStepName("");
        }
    };

    // Drag-and-drop Upload handlers
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
                                <DocumentTextExtract20Regular className="w-4 h-4"/>
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
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                            onDrop={onDrop}
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
                                    <DocumentTextExtract20Regular className="w-8 h-8"/>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-extrabold text-text-primary">
                                        Drag & drop your PDF file here, or <span
                                        className="text-primary">browse</span>
                                    </p>
                                    <p className="text-[10px] text-text-muted">
                                        Extract pages and download your document completely offline. Your files
                                        never touch our servers.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Editor Workspace */}
                    {file && pdfDoc && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                            {/* Left Side: Pages Grid Visual Map */}
                            <div className="lg:col-span-7 space-y-4">
                                <div
                                    className="border border-border bg-surface/50 backdrop-blur-md rounded-2xl p-5 space-y-4">
                                    <div
                                        className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-3 gap-3">
                                        <div
                                            className="flex items-center gap-2 text-xs font-black text-text-primary">
                                            <Grid20Regular className="w-4 h-4 text-primary"/>
                                            <span>PDF Page Layout Grid</span>
                                        </div>

                                        {/* Filtering pills */}
                                        <div
                                            className="flex bg-surface-secondary border border-border p-0.5 rounded-lg text-[10px] font-black self-start sm:self-auto select-none">
                                            <button
                                                onClick={() => setFilterMode("all")}
                                                className={`px-3 py-1 rounded-md transition-all duration-200 cursor-pointer ${
                                                    filterMode === "all"
                                                        ? "bg-surface text-text-primary shadow-xs"
                                                        : "text-text-muted hover:text-text-primary"
                                                }`}
                                            >
                                                All ({totalPages})
                                            </button>
                                            <button
                                                onClick={() => setFilterMode("selected")}
                                                className={`px-3 py-1 rounded-md transition-all duration-200 cursor-pointer ${
                                                    filterMode === "selected"
                                                        ? "bg-surface text-primary shadow-xs"
                                                        : "text-text-muted hover:text-text-primary"
                                                }`}
                                            >
                                                Selected ({selectedPages.size})
                                            </button>
                                            <button
                                                onClick={() => setFilterMode("excluded")}
                                                className={`px-3 py-1 rounded-md transition-all duration-200 cursor-pointer ${
                                                    filterMode === "excluded"
                                                        ? "bg-surface text-text-primary shadow-xs"
                                                        : "text-text-muted hover:text-text-primary"
                                                }`}
                                            >
                                                Excluded ({excludedPagesCount})
                                            </button>
                                        </div>
                                    </div>

                                    <p className="text-[10px] text-text-muted leading-relaxed font-bold bg-surface-secondary/40 border border-border/60 p-2.5 rounded-xl">
                                        💡 Click on page thumbnails to select or deselect them. Only selected pages
                                        will be included in the final document.
                                    </p>

                                    {/* Grid Gallery */}
                                    <div className="max-h-120 overflow-y-auto pr-1.5 custom-scrollbar">
                                        {visiblePages.length > 0 ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 select-none">
                                                {visiblePages.map((pageNum) => (
                                                    <PageThumbnailCard
                                                        key={pageNum}
                                                        pdfDoc={pdfDoc}
                                                        pageNumber={pageNum}
                                                        isSelected={selectedPages.has(pageNum)}
                                                        onToggle={togglePageSelection}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <div
                                                className="flex flex-col items-center justify-center py-16 text-center space-y-2 border border-dashed border-border rounded-xl">
                                                    <span className="text-text-muted/40">
                                                        <DismissCircle20Regular className="w-8 h-8"/>
                                                    </span>
                                                <p className="text-xs font-bold text-text-muted">
                                                    No pages match the active filter mode.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Extraction Settings and Controls */}
                            <div className="lg:col-span-5 space-y-6">
                                <div
                                    className="border border-border bg-surface/50 backdrop-blur-md rounded-2xl p-6 space-y-6">
                                    <div className="flex items-center gap-2 border-b border-border pb-3">
                                        <Settings20Regular className="w-4 h-4 text-primary"/>
                                        <h2 className="text-xs font-black text-text-primary uppercase tracking-wider">
                                            Extraction Options
                                        </h2>
                                    </div>

                                    {/* File Metadata Overview Card */}
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
                                            title="Select another document"
                                        >
                                            <Dismiss20Regular className="w-4 h-4"/>
                                        </button>
                                    </div>

                                    {/* Quick Presets */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-text-secondary">
                                                Quick Select Presets
                                            </label>
                                            <PresetSelector onSelect={selectPreset} disabled={isProcessing}/>
                                        </div>
                                    </div>

                                    {/* Page Range Text Input */}
                                    <div className="space-y-2 border-t border-border pt-4">
                                        <label className="text-xs font-bold text-text-secondary">
                                            Pages to Extract
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={rangeInput}
                                                onChange={handleRangeChange}
                                                placeholder="e.g. 1-3, 5, 7"
                                                disabled={isProcessing}
                                                className="w-full text-xs font-bold font-mono px-3.5 py-3 border border-border bg-surface rounded-xl focus:border-primary focus:ring-1 focus:ring-primary/20 outline-hidden transition-all duration-200 placeholder:text-text-muted/60 disabled:opacity-50"
                                            />
                                        </div>

                                        {/* Input helper validation */}
                                        <div className="flex items-center justify-between min-h-5 pt-0.5">
                                            {!isValidPageRange(rangeInput) ? (
                                                <span
                                                    className="text-[10px] text-danger font-bold flex items-center gap-1">
                                                        <ErrorCircle20Regular className="w-3.5 h-3.5"/>
                                                        Invalid format (use numbers, commas, and dashes)
                                                    </span>
                                            ) : selectedPages.size === 0 ? (
                                                <span
                                                    className="text-[10px] text-danger font-bold flex items-center gap-1">
                                                        <ErrorCircle20Regular className="w-3.5 h-3.5"/>
                                                        Must select at least 1 page
                                                    </span>
                                            ) : (
                                                <span className="text-[10px] text-text-muted font-bold">
                                                        Extracting {selectedPages.size} {selectedPages.size === 1 ? "page" : "pages"}, excluding {excludedPagesCount} {excludedPagesCount === 1 ? "page" : "pages"}
                                                    </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Button */}
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
                                                        Extract Pages & Download PDF
                                                    </span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Inline Logger */}
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
