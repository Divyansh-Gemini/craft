"use client";

import React, {useState, useRef, useCallback, useEffect, useMemo} from "react";
import {useRouter} from "next/navigation";
import {
    ArrowLeft20Regular,
    Dismiss20Regular,
    ArrowDownload20Regular,
    Image20Regular,
    CheckmarkCircle20Regular,
    ErrorCircle20Regular,
    Document20Regular,
    Settings20Regular,
    Grid20Regular,
    Checkmark20Regular
} from "@fluentui/react-icons";
import {Tool} from "@/types/tool";
import {downloadBlob} from "@/features/image/image-converter";
import {
    isValidPageRange,
    parsePageRanges,
    serializePageRanges,
    renderPageToBlob
} from "@/features/pdf/pdf-to-images";
import JSZip from "jszip";

interface PdfToImagesViewProps {
    tool: Tool;
}

interface RenderedPageItem {
    pageNumber: number;
    blob: Blob;
    status: "pending" | "rendering" | "success" | "error";
    errorMsg?: string;
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

                // Standard thumbnail viewport scale is small (e.g. 0.3)
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
            className={`relative flex flex-col rounded-xl overflow-hidden cursor-pointer transition-all duration-300 border bg-surface/40 hover:scale-[1.02] ${
                isSelected
                    ? "border-primary ring-2 ring-primary/20 shadow-md shadow-primary/5"
                    : "border-border hover:border-primary/40 shadow-xs"
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
                    <div className="absolute inset-0 flex items-center justify-center bg-danger-bg/20">
                        <ErrorCircle20Regular className="w-5 h-5 text-danger"/>
                    </div>
                )}
                <canvas ref={canvasRef} className="w-full h-full object-contain"/>

                {/* Checkbox overlay badge */}
                <div
                    className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-200 ${
                        isSelected
                            ? "bg-primary border-primary text-white scale-110"
                            : "bg-surface/80 border-border text-transparent"
                    }`}
                >
                    <Checkmark20Regular className="w-3.5 h-3.5"/>
                </div>
            </div>

            {/* Label Footer */}
            <div className="py-2 px-3 flex justify-between items-center bg-surface/80">
                <span className="text-xs font-black text-text-primary">Page {pageNumber}</span>
                <span className="text-[10px] text-text-muted font-bold">PDF Page</span>
            </div>
        </div>
    );
}

// Reusable RadioSelector component for smooth, animated segmented options
interface RadioSelectorOption<T> {
    value: T;
    label: string;
}

interface RadioSelectorProps<T> {
    options: RadioSelectorOption<T>[];
    selectedValue: T;
    onChange: (value: T) => void;
    disabled?: boolean;
    className?: string;
}

function RadioSelector<T extends string | number>({
                                                      options,
                                                      selectedValue,
                                                      onChange,
                                                      disabled = false,
                                                      className = "grid-cols-2"
                                                  }: RadioSelectorProps<T>) {
    return (
        <div className={`grid ${className} gap-2 bg-surface-secondary/40 border border-border p-1 rounded-xl`}>
            {options.map((option) => {
                const isSelected = option.value === selectedValue;
                return (
                    <button
                        key={String(option.value)}
                        onClick={() => onChange(option.value)}
                        disabled={disabled}
                        className={`py-2 rounded-lg text-xs font-black text-center transition-all duration-300 ease-out cursor-pointer border ${
                            isSelected
                                ? "bg-surface text-primary border-border shadow-xs"
                                : "text-text-secondary hover:text-text-primary hover:bg-surface/30 border-transparent"
                        }`}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

// Reusable PresetSelector component for page range presets
interface PresetOption {
    id: "all" | "none" | "even" | "odd";
    label: string;
}

interface PresetSelectorProps {
    onSelect: (preset: "all" | "none" | "even" | "odd") => void;
    disabled?: boolean;
}

const PRESETS: PresetOption[] = [
    {id: "all", label: "All"},
    {id: "even", label: "Even"},
    {id: "odd", label: "Odd"},
    {id: "none", label: "Clear"}
];

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

export function PdfToImagesView({tool}: PdfToImagesViewProps) {
    const router = useRouter();
    const [pdfjs, setPdfjs] = useState<any>(null);
    const [file, setFile] = useState<File | null>(null);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
    const [rangeInput, setRangeInput] = useState<string>("all");
    const [scale, setScale] = useState<number>(2.0); // Default to high-quality 2x scale
    const [format, setFormat] = useState<"png" | "jpeg">("png");

    // Processing States
    const [isConverting, setIsConverting] = useState<boolean>(false);
    const [currentProcessingPage, setCurrentProcessingPage] = useState<number | null>(null);
    const [progress, setProgress] = useState<number>(0);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [isDone, setIsDone] = useState<boolean>(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize PDF.js client-side
    useEffect(() => {
        let active = true;
        const loadPdfJs = async () => {
            try {
                const mod = await import("pdfjs-dist");
                // Setting worker Src via unpkg
                mod.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${mod.version}/build/pdf.worker.min.mjs`;
                if (active) {
                    setPdfjs(mod);
                }
            } catch (err) {
                console.error("Failed to load PDF.js libraries:", err);
                if (active) {
                    setErrorMsg("Failed to initialize PDF parsing engine. Check your connection.");
                }
            }
        };
        loadPdfJs();
        return () => {
            active = false;
        };
    }, []);

    // Helper: Reset view state
    const resetState = useCallback(() => {
        setFile(null);
        setPdfDoc(null);
        setTotalPages(0);
        setSelectedPages(new Set());
        setRangeInput("all");
        setIsConverting(false);
        setCurrentProcessingPage(null);
        setProgress(0);
        setErrorMsg(null);
        setIsDone(false);
    }, []);

    // Load and Parse Document
    const loadPdfFile = useCallback(async (selectedFile: File) => {
        if (!pdfjs) {
            setErrorMsg("PDF parsing engine is loading, please wait...");
            return;
        }

        if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
            setErrorMsg("Only PDF files are supported.");
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

            // Default select all pages initially
            const allPages = Array.from({length: doc.numPages}, (_, i) => i + 1);
            setSelectedPages(new Set(allPages));
            setRangeInput("all");
        } catch (err) {
            console.error("Error loading PDF document:", err);
            setErrorMsg("Failed to parse PDF file. It might be corrupted or password-protected.");
            setFile(null);
        }
    }, [pdfjs, resetState]);

    // Handle range text input change
    const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setRangeInput(val);

        if (isValidPageRange(val) && totalPages > 0) {
            const parsed = parsePageRanges(val, totalPages);
            setSelectedPages(new Set(parsed));
        }
    };

    // Toggle single page selection state
    const togglePageSelection = (pageNumber: number) => {
        setSelectedPages((prev) => {
            const next = new Set(prev);
            if (next.has(pageNumber)) {
                next.delete(pageNumber);
            } else {
                next.add(pageNumber);
            }

            // Sync text input representation
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

    // Shortcuts selectors
    const selectPreset = (type: "all" | "none" | "even" | "odd") => {
        if (totalPages === 0) return;

        let pagesList: number[] = [];
        if (type === "all") {
            pagesList = Array.from({length: totalPages}, (_, i) => i + 1);
            setRangeInput("all");
        } else if (type === "none") {
            pagesList = [];
            setRangeInput("");
        } else if (type === "even") {
            pagesList = Array.from({length: totalPages}, (_, i) => i + 1).filter(p => p % 2 === 0);
            setRangeInput(serializePageRanges(pagesList));
        } else if (type === "odd") {
            pagesList = Array.from({length: totalPages}, (_, i) => i + 1).filter(p => p % 2 !== 0);
            setRangeInput(serializePageRanges(pagesList));
        }

        setSelectedPages(new Set(pagesList));
    };

    // Validate if current selection is ready to execute conversion
    const isSelectionValid = useMemo(() => {
        return isValidPageRange(rangeInput) && selectedPages.size > 0;
    }, [rangeInput, selectedPages]);

    // Handle conversions and file packing
    const handleConversion = async () => {
        if (!pdfDoc || selectedPages.size === 0 || isConverting) return;

        setIsConverting(true);
        setErrorMsg(null);
        setProgress(0);
        setIsDone(false);

        const pagesArray = Array.from(selectedPages).sort((a, b) => a - b);

        let completed = 0;
        const finalRendered: RenderedPageItem[] = [];

        try {
            for (let i = 0; i < pagesArray.length; i++) {
                const pageNum = pagesArray[i];
                setCurrentProcessingPage(pageNum);

                try {
                    const page = await pdfDoc.getPage(pageNum);
                    // Renders vector elements accurately using selected DPI scale
                    const blob = await renderPageToBlob(page, scale, format, 0.95);

                    const successItem: RenderedPageItem = {
                        pageNumber: pageNum,
                        blob,
                        status: "success"
                    };
                    finalRendered.push(successItem);
                } catch (pageErr) {
                    console.error(`Error processing page ${pageNum}:`, pageErr);
                    const errorItem: RenderedPageItem = {
                        pageNumber: pageNum,
                        blob: new Blob(),
                        status: "error",
                        errorMsg: "Render failed"
                    };
                    finalRendered.push(errorItem);
                }

                completed++;
                setProgress(Math.round((completed / pagesArray.length) * 100));
            }

            const successItems = finalRendered.filter(item => item.status === "success");
            if (successItems.length === 0) {
                throw new Error("Failed to convert any of the selected pages.");
            }

            setIsDone(true);

            // Automatically trigger download
            triggerDownload(successItems);
        } catch (err: any) {
            console.error("Batch conversion error:", err);
            setErrorMsg(err.message || "An error occurred during conversion.");
        } finally {
            setIsConverting(false);
            setCurrentProcessingPage(null);
        }
    };

    // Download generator
    const triggerDownload = (itemsToDownload: RenderedPageItem[]) => {
        if (!file || itemsToDownload.length === 0) return;

        const pdfName = file.name.substring(0, file.name.lastIndexOf("."));
        const fileExt = format === "jpeg" ? "jpg" : "png";

        if (itemsToDownload.length === 1) {
            // Direct download for a single image, renamed based on its page number
            const targetPage = itemsToDownload[0];
            const singleFilename = `${pdfName}_page_${targetPage.pageNumber}.${fileExt}`;
            downloadBlob(targetPage.blob, singleFilename);
        } else {
            // Zip archive download for multiple files
            const zip = new JSZip();
            itemsToDownload.forEach((item) => {
                zip.file(`page_${item.pageNumber}.${fileExt}`, item.blob);
            });

            zip.generateAsync({type: "blob"}).then((zipContent) => {
                downloadBlob(zipContent, `${pdfName}_images.zip`);
            }).catch((err) => {
                console.error("ZIP building error:", err);
                setErrorMsg("Failed to generate ZIP folder archive.");
            });
        }
    };

    // Drag-and-drop Events
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
        <div className="w-full flex-1 bg-background relative overflow-hidden">
            {/* Background Glow styling for premium layout feel */}
            <div
                className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-125 rounded-full blur-[120px] opacity-10 dark:opacity-15 bg-radial from-primary/50 to-transparent pointer-events-none"/>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10 space-y-8">
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
                                <Image20Regular className="w-4 h-4"/>
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

                {/* General Notification / Error messages */}
                {errorMsg && (
                    <div
                        className="flex items-start gap-3 p-4 border border-danger/20 bg-danger-bg/40 text-danger rounded-2xl text-xs font-bold transition-all animate-fadeIn">
                        <ErrorCircle20Regular className="w-5 h-5 shrink-0"/>
                        <div>{errorMsg}</div>
                    </div>
                )}

                {/* Engine Loading Indicator */}
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

                        {/* Drag and Drop Zone (Only when file is not selected) */}
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
                                        <Document20Regular className="w-8 h-8"/>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-extrabold text-text-primary">
                                            Drag & drop your PDF file here, or <span
                                            className="text-primary">browse</span>
                                        </p>
                                        <p className="text-[10px] text-text-muted">
                                            100% Client-side conversion. Files are never uploaded to a server.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Editor / Configuration Workspace (Once file is parsed) */}
                        {file && pdfDoc && (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                                {/* Left: Preview Panel (5 cols) */}
                                <div className="lg:col-span-5 space-y-4">
                                    <div
                                        className="border border-border bg-surface/50 backdrop-blur-md rounded-2xl p-5 space-y-4">
                                        <div className="flex items-center justify-between border-b border-border pb-3">
                                            <div
                                                className="flex items-center gap-2 text-xs font-black text-text-primary">
                                                <Grid20Regular className="w-4 h-4 text-primary"/>
                                                <span>PDF Pages Grid ({totalPages})</span>
                                            </div>
                                        </div>

                                        <p className="text-[10px] text-text-muted leading-relaxed font-bold bg-surface-secondary/40 border border-border/60 p-2.5 rounded-xl">
                                            💡 Click on page thumbnails to toggle selection, or type the page list ranges
                                            on the right configuration panel.
                                        </p>

                                        {/* Scrollable Gallery container with right padding for scrollbar */}
                                        <div
                                            className="grid grid-cols-2 gap-3 max-h-115 overflow-y-auto pr-3.5 select-none">
                                            {Array.from({length: totalPages}, (_, i) => i + 1).map((pageNum) => (
                                                <PageThumbnailCard
                                                    key={pageNum}
                                                    pdfDoc={pdfDoc}
                                                    pageNumber={pageNum}
                                                    isSelected={selectedPages.has(pageNum)}
                                                    onToggle={togglePageSelection}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Conversion Config & Status (7 cols) */}
                                <div className="lg:col-span-7 space-y-6">

                                    {/* Config card */}
                                    <div
                                        className="border border-border bg-surface/50 backdrop-blur-md rounded-2xl p-6 space-y-6">
                                        <div className="flex items-center gap-2 border-b border-border pb-3">
                                            <Settings20Regular className="w-4 h-4 text-primary"/>
                                            <h2 className="text-xs font-black text-text-primary uppercase tracking-wider">
                                                Extraction Options
                                            </h2>
                                        </div>

                                        {/* File Summary Card */}
                                        <div
                                            className="flex items-center justify-between bg-surface-secondary/40 border border-border p-4 rounded-xl">
                                            <div className="min-w-0 flex-1 pr-3">
                                                <p className="text-xs font-extrabold text-text-primary truncate">{file.name}</p>
                                                <p className="text-[10px] text-text-muted font-bold mt-0.5 font-mono">
                                                    {(file.size / 1024 / 1024).toFixed(2)} MB • {totalPages} Pages
                                                </p>
                                            </div>
                                            <button
                                                onClick={resetState}
                                                disabled={isConverting}
                                                className="w-8 h-8 rounded-lg border border-border bg-surface text-text-muted hover:border-danger hover:text-danger disabled:opacity-50 disabled:hover:border-border disabled:hover:text-text-muted cursor-pointer transition-all duration-200 flex items-center justify-center shrink-0"
                                                title="Choose another PDF"
                                            >
                                                <Dismiss20Regular className="w-4 h-4"/>
                                            </button>
                                        </div>

                                        {/* 1. Page Range selector */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold text-text-secondary">
                                                    Define Page Ranges
                                                </label>

                                                {/* Pre-sets */}
                                                <PresetSelector onSelect={selectPreset} disabled={isConverting}/>
                                            </div>

                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={rangeInput}
                                                    onChange={handleRangeChange}
                                                    placeholder="e.g. 1-3, 5, 8-12"
                                                    disabled={isConverting}
                                                    className="w-full text-xs font-bold font-mono px-3.5 py-3 border border-border bg-surface rounded-xl focus:border-primary focus:ring-1 focus:ring-primary/20 outline-hidden transition-all duration-200 placeholder:text-text-muted/60 disabled:opacity-50"
                                                />
                                            </div>

                                            {/* Validation feedback block */}
                                            <div className="flex items-center justify-between min-h-5 pt-0.5">
                                                {!isValidPageRange(rangeInput) ? (
                                                    <span
                                                        className="text-[10px] text-danger font-bold flex items-center gap-1">
                                                        <ErrorCircle20Regular className="w-3.5 h-3.5"/>
                                                        Invalid format (use numbers, commas, and dashes)
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-text-muted font-bold">
                                                        Selected {selectedPages.size} of {totalPages} pages to export
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* 2. Format Selector & DPI Quality controls */}
                                        <div
                                            className="grid grid-cols-1 sm:grid-cols-2 gap-5 border-t border-border pt-5">

                                            {/* Image output format */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-text-secondary">
                                                    Output Format
                                                </label>
                                                <RadioSelector
                                                    options={[
                                                        {value: "png", label: "PNG (Lossless)"},
                                                        {value: "jpeg", label: "JPG (Compressed)"}
                                                    ]}
                                                    selectedValue={format}
                                                    onChange={setFormat}
                                                    disabled={isConverting}
                                                    className="grid-cols-2"
                                                />
                                            </div>

                                            {/* Scaling (DPI quality multiplier) */}
                                            <div className="space-y-2">
                                                <label
                                                    className="text-xs font-bold text-text-secondary flex justify-between">
                                                    <span>DPI Quality Scale</span>
                                                    <span className="text-[10px] font-black text-primary">
                                                        {scale === 1.0 ? "72 DPI (Standard)" : scale === 2.0 ? "150 DPI (Crisp)" : "300 DPI (High)"}
                                                    </span>
                                                </label>
                                                <RadioSelector
                                                    options={[
                                                        {value: 1.0, label: "1x"},
                                                        {value: 2.0, label: "2x"},
                                                        {value: 3.0, label: "3x"}
                                                    ]}
                                                    selectedValue={scale}
                                                    onChange={setScale}
                                                    disabled={isConverting}
                                                    className="grid-cols-3"
                                                />
                                            </div>
                                        </div>

                                        {/* Action / Convert Buttons */}
                                        <div className="pt-4">
                                            {isConverting ? (
                                                <button
                                                    disabled
                                                    className="w-full py-3.5 px-4 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs font-black flex items-center justify-center gap-2"
                                                >
                                                    <div
                                                        className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
                                                    <span>Generating & Downloading ({progress}%)</span>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleConversion}
                                                    disabled={!isSelectionValid}
                                                    className="w-full py-3.5 px-4 bg-success text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:bg-success/90 disabled:opacity-50 transition-all duration-200 cursor-pointer shadow-md shadow-success/15 hover:scale-[1.01] active:scale-[0.99]"
                                                >
                                                    <ArrowDownload20Regular className="w-4 h-4"/>
                                                    <span>
                                                        {selectedPages.size === 1
                                                            ? `Download Page ${Array.from(selectedPages)[0]} (${format.toUpperCase()})`
                                                            : `Download ZIP Archive (${selectedPages.size} Pages)`}
                                                    </span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Conversion progress visual indicators */}
                                    {(isConverting || isDone) && (
                                        <div
                                            className="border border-border bg-surface/50 backdrop-blur-md rounded-2xl p-6 space-y-4 transition-all animate-fadeIn">
                                            <div
                                                className="flex justify-between items-center text-xs font-black text-text-primary">
                                                <span>Conversion Process Log</span>
                                                <span className="font-mono text-primary">{progress}%</span>
                                            </div>

                                            {/* Progress slider track */}
                                            <div
                                                className="w-full bg-surface-secondary rounded-full h-2 overflow-hidden border border-border">
                                                <div
                                                    className="bg-primary h-full transition-all duration-300"
                                                    style={{width: `${progress}%`}}
                                                />
                                            </div>

                                            {/* Quick status line item */}
                                            {isConverting && currentProcessingPage && (
                                                <div
                                                    className="text-[10px] text-text-muted font-bold flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"/>
                                                    <span>Rendering PDF page {currentProcessingPage} at {scale}x scale to canvas...</span>
                                                </div>
                                            )}

                                            {isDone && (
                                                <div
                                                    className="text-[10px] text-success font-bold flex items-center gap-1.5">
                                                    <CheckmarkCircle20Regular className="w-4 h-4"/>
                                                    <span>Batch rendering finished successfully. Triggered file download.</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
