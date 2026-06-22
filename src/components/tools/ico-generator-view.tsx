"use client";

import React, {useState, useRef, useCallback, useEffect} from "react";
import {
    Dismiss20Regular,
    ArrowDownload20Regular,
    Image20Regular,
    CheckmarkCircle20Regular,
    ErrorCircle20Regular,
    ArrowCounterclockwise20Regular,
    Settings20Regular,
    Code20Regular,
    Copy20Regular,
    Checkmark20Regular,
    Globe20Regular,
    Eye20Regular,
    Info20Regular,
} from "@fluentui/react-icons";
import {Tool} from "@/types/tool";
import {formatBytes} from "@/features/image/image-converter";
import {generateIco} from "@/features/image/ico-generator";

// ==========================================
// Sub-Components for Clean Architecture
// ==========================================

interface FileDropzoneProps {
    isDragging: boolean;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
    onClick: () => void;
}

function FileDropzone({isDragging, onDragOver, onDragLeave, onDrop, onClick}: FileDropzoneProps) {
    return (
        <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={onClick}
            className={`relative border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 group ${
                isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 bg-surface/30 backdrop-blur-md"
            }`}
        >
            <div className="flex flex-col items-center justify-center space-y-4">
                <div
                    className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 group-hover:scale-105 transition-transform duration-300"
                >
                    <Image20Regular className="w-8 h-8"/>
                </div>
                <div className="space-y-1.5">
                    <p className="text-sm font-extrabold text-text-primary">
                        Drag & drop image or SVG here, or{" "}
                        <span className="text-primary hover:underline">browse</span>
                    </p>
                    <p className="text-xs text-text-muted">
                        Supports PNG, SVG, JPG, WebP, AVIF, HEIC, TIFF (Up to 10MB)
                    </p>
                </div>
            </div>
        </div>
    );
}

interface SelectedFileCardProps {
    file: File;
    previewUrl: string | null;
    isConverting: boolean;
    onRemove: () => void;
}

function SelectedFileCard({file, previewUrl, isConverting, onRemove}: SelectedFileCardProps) {
    return (
        <div
            className="flex flex-col p-4 border border-border bg-surface/50 backdrop-blur-md rounded-2xl gap-4"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                    <div
                        className="w-14 h-14 rounded-xl bg-surface-secondary border border-border shrink-0 overflow-hidden flex items-center justify-center text-text-muted relative bg-chess-pattern"
                    >
                        {previewUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                src={previewUrl}
                                alt={file.name}
                                className="w-full h-full object-contain p-1"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-0.5">
                                <Image20Regular className="w-5 h-5 text-primary"/>
                                <span
                                    className="text-[8px] font-black uppercase bg-primary/10 text-primary px-1 rounded">
                                    HEIC
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 space-y-1">
                        <div
                            className="text-sm font-extrabold text-text-primary truncate"
                            title={file.name}
                        >
                            {file.name}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-text-muted">
                                {formatBytes(file.size)}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-border"/>
                            <span
                                className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-surface-secondary border border-border text-text-secondary">
                                {file.name.split(".").pop()}
                            </span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onRemove}
                    disabled={isConverting}
                    className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger-bg/40 cursor-pointer transition-colors disabled:opacity-50"
                    title="Remove file"
                >
                    <Dismiss20Regular className="w-4 h-4"/>
                </button>
            </div>
        </div>
    );
}

interface LiveBrowserPreviewProps {
    previewUrl: string | null;
    mockTitle: string;
    setMockTitle: (title: string) => void;
    tabTheme: "light" | "dark";
    setTabTheme: (theme: "light" | "dark") => void;
}

function LiveBrowserPreview({
                                previewUrl,
                                mockTitle,
                                setMockTitle,
                                tabTheme,
                                setTabTheme,
                            }: LiveBrowserPreviewProps) {
    return (
        <div
            className="border border-border bg-surface/40 backdrop-blur-md rounded-3xl overflow-hidden shadow-lg flex flex-col"
        >
            <div className="p-4 border-b border-border bg-surface-secondary/50 flex items-center justify-between">
                <span className="text-xs font-extrabold text-text-primary flex items-center gap-1.5">
                    <Eye20Regular className="w-4 h-4 text-primary"/>
                    Live Tab Preview
                </span>
                <div className="flex items-center gap-1.5">
                    {(["light", "dark"] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTabTheme(t)}
                            className={`px-2 py-1 text-[9px] font-black uppercase rounded-lg border transition-all cursor-pointer ${
                                tabTheme === t
                                    ? "bg-surface border-border text-text-primary shadow-sm"
                                    : "bg-transparent border-transparent text-text-muted"
                            }`}
                        >
                            {t} Tab
                        </button>
                    ))}
                </div>
            </div>

            {/* Simulated Browser Top Bar */}
            <div
                className={`p-3 transition-colors duration-200 ${
                    tabTheme === "light"
                        ? "bg-[#EAEAEA] text-[#333333]"
                        : "bg-[#1E1F22] text-[#E0E0E0]"
                }`}
            >
                {/* Browser controls */}
                <div className="flex items-center gap-1.5 pb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]"/>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]"/>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]"/>

                    {/* Mock tabs */}
                    <div className="flex items-center gap-1 ml-6 w-full max-w-sm">
                        <div
                            className={`flex items-center gap-2 px-3 py-1.5 text-[10px] rounded-t-lg font-medium transition-colors w-40 truncate relative border-t border-x ${
                                tabTheme === "light"
                                    ? "bg-[#F3F3F3] text-[#333333] border-gray-300"
                                    : "bg-[#2B2D30] text-[#E0E0E0] border-[#2A2B2F]"
                            }`}
                        >
                            <div className="w-3.5 h-3.5 relative flex items-center justify-center shrink-0">
                                {previewUrl ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                        src={previewUrl}
                                        alt="Favicon"
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <Globe20Regular className="w-3.5 h-3.5 text-text-muted animate-pulse"/>
                                )}
                            </div>
                            <span className="truncate pr-4 w-full">
                                {mockTitle}
                            </span>
                            <span className="absolute right-2 opacity-50 text-[8px]">×</span>
                        </div>

                        <div
                            className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-[10px] opacity-40 font-medium w-28 truncate">
                            <Globe20Regular className="w-3 h-3"/>
                            <span className="truncate">Blank page</span>
                        </div>
                    </div>
                </div>

                {/* Address bar mock */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black opacity-30 select-none">←</span>
                    <span className="text-[10px] font-black opacity-30 select-none">→</span>
                    <span className="text-[10px] font-black opacity-30 select-none">⟳</span>
                    <div
                        className={`flex-1 flex items-center gap-2 px-3 py-1 text-[9px] rounded-md font-mono transition-colors border ${
                            tabTheme === "light"
                                ? "bg-[#FFFFFF] text-gray-700 border-gray-300"
                                : "bg-[#1A1A1A] text-gray-400 border-[#2B2D30]"
                        }`}
                    >
                        <span className="text-emerald-500 font-bold">🔒</span>
                        <span className="opacity-40">https://</span>
                        <span>yourdomain.com</span>
                    </div>
                </div>
            </div>

            {/* Simulated Browser Body */}
            <div
                className={`h-24 flex items-center justify-center transition-colors duration-200 border-t ${
                    tabTheme === "light"
                        ? "bg-[#F9F9F9] border-gray-300"
                        : "bg-[#121316] border-[#2A2B2F]"
                }`}
            >
                <div className="text-center space-y-1">
                    <p className="text-[10px] font-bold text-text-muted">
                        Simulated Website Content
                    </p>
                    <input
                        type="text"
                        value={mockTitle}
                        onChange={(e) => setMockTitle(e.target.value)}
                        placeholder="Customize tab title..."
                        maxLength={30}
                        className="px-2.5 py-1 text-[10px] bg-surface border border-border rounded-md text-text-primary text-center outline-none focus:border-primary w-44 font-semibold"
                        title="Change tab mock title"
                    />
                </div>
            </div>
        </div>
    );
}

interface ShortcutPreviewProps {
    previewUrl: string;
}

function ShortcutPreview({previewUrl}: ShortcutPreviewProps) {
    return (
        <div
            className="border border-border bg-surface/40 backdrop-blur-md p-4 rounded-3xl flex items-center gap-4 justify-between">
            <div className="space-y-1">
                <span className="text-[9px] font-black tracking-wider uppercase text-text-muted">
                    Desktop Shortcut Preview
                </span>
                <p className="text-xs text-text-secondary">
                    How the generated icon file will look in your OS directory.
                </p>
            </div>

            <div className="flex flex-col items-center gap-1.5 shrink-0 select-none">
                <div
                    className="w-14 h-14 rounded-2xl bg-surface border border-border shadow-sm flex items-center justify-center p-2 hover:scale-105 transition-transform duration-300 relative"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={previewUrl}
                        alt="Shortcut Icon"
                        className="w-full h-full object-contain"
                    />
                    <span
                        className="absolute bottom-1 right-1 text-[8px] bg-slate-900/60 text-white font-bold px-0.5 rounded">
                        ICO
                    </span>
                </div>
                <span
                    className="text-[10px] font-bold text-text-primary max-w-17.5 truncate text-center font-mono">
                    favicon.ico
                </span>
            </div>
        </div>
    );
}

interface SuccessPanelProps {
    convertedSize: number | null;
    generatedSizes: number[];
    isConverting: boolean;
    copied: boolean;
    onDownload: () => void;
    onCopySnippet: () => void;
}

function SuccessPanel({
                          convertedSize,
                          generatedSizes,
                          isConverting,
                          copied,
                          onDownload,
                          onCopySnippet
                      }: SuccessPanelProps) {
    return (
        <div
            className={`border border-success/30 bg-success-bg/25 border-dashed p-6 rounded-3xl space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300 transition-opacity ${
                isConverting ? "opacity-50 pointer-events-none select-none" : ""
            }`}>
            <div className="flex items-center gap-2 text-success">
                <CheckmarkCircle20Regular className="w-5 h-5 shrink-0"/>
                <h3 className="text-sm font-black uppercase tracking-wider">
                    Favicon Generated Successfully!
                </h3>
            </div>

            <div className="space-y-2 border-t border-success/15 pt-3.5">
                <div className="flex justify-between text-[11px] font-bold text-text-secondary">
                    <span>File Type:</span>
                    <span className="font-mono text-text-primary">Favicon (ICO)</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold text-text-secondary">
                    <span>File Size:</span>
                    <span className="font-mono text-text-primary">
                        {convertedSize ? formatBytes(convertedSize) : "N/A"}
                    </span>
                </div>
                <div className="flex justify-between text-[11px] font-bold text-text-secondary">
                    <span>Embedded Sizes:</span>
                    <span className="font-mono text-text-primary">
                        {generatedSizes.map(s => `${s}x${s}`).join(", ")}
                    </span>
                </div>
            </div>

            <button
                onClick={onDownload}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase text-white bg-primary hover:bg-primary-hover shadow-md cursor-pointer transition-all active:scale-98"
            >
                <ArrowDownload20Regular className="w-4 h-4"/>
                Download favicon.ico
            </button>

            {/* HTML Code Snippet Card */}
            <div className="border border-border/60 bg-surface/50 rounded-2xl overflow-hidden mt-3">
                <div
                    className="flex items-center justify-between p-2.5 bg-surface-secondary/40 border-b border-border/60">
                    <span
                        className="text-[10px] font-black text-text-secondary flex items-center gap-1.5">
                        <Code20Regular className="w-3.5 h-3.5 text-primary"/>
                        HTML Head Integration
                    </span>
                    <button
                        onClick={onCopySnippet}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[8px] font-bold uppercase rounded bg-surface hover:bg-surface-secondary border border-border cursor-pointer transition-all active:scale-95"
                    >
                        {copied ? (
                            <>
                                <Checkmark20Regular className="w-3 h-3 text-success"/>
                                Copied
                            </>
                        ) : (
                            <>
                                <Copy20Regular className="w-3 h-3 text-text-secondary"/>
                                Copy
                            </>
                        )}
                    </button>
                </div>
                <div className="p-3 bg-surface-secondary/20">
                    <pre
                        className="text-[9px] font-mono text-text-primary bg-transparent overflow-x-auto whitespace-pre p-0 select-all">
                        {`<link rel="icon" type="image/x-icon" href="/favicon.ico">`}
                    </pre>
                </div>
            </div>
        </div>
    );
}

interface ErrorPanelProps {
    errorMsg: string;
    onRetry: () => void;
}

function ErrorPanel({errorMsg, onRetry}: ErrorPanelProps) {
    return (
        <div
            className="p-4 border border-danger/30 bg-danger-bg text-danger rounded-2xl text-xs font-semibold flex items-start gap-2.5 animate-in fade-in duration-300"
        >
            <ErrorCircle20Regular className="w-4 h-4 shrink-0 mt-0.5"/>
            <div className="space-y-1">
                <p className="font-extrabold uppercase tracking-wide">
                    Generation Failed
                </p>
                <p className="opacity-90">{errorMsg}</p>
                <button
                    onClick={onRetry}
                    className="mt-2 text-[10px] font-black uppercase text-danger hover:underline flex items-center gap-1"
                >
                    <ArrowCounterclockwise20Regular className="w-3 h-3"/>
                    Try again
                </button>
            </div>
        </div>
    );
}

// ==========================================
// Main Component
// ==========================================

interface IcoGeneratorViewProps {
    tool: Tool;
}

export function IcoGeneratorView({tool}: IcoGeneratorViewProps) {
    // File State
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);

    // Options
    const autoSquare = true;
    const [sizePreset, setSizePreset] = useState<"standard" | "all" | "custom">("standard");
    const [selectedSizes, setSelectedSizes] = useState<number[]>([16, 32, 48]);
    const [generatedSizes, setGeneratedSizes] = useState<number[]>([]);

    // Status
    const [isConverting, setIsConverting] = useState<boolean>(false);
    const [status, setStatus] = useState<"idle" | "converting" | "success" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
    const [convertedSize, setConvertedSize] = useState<number | null>(null);

    // Interactive Preview settings
    const [tabTheme, setTabTheme] = useState<"light" | "dark">("light");
    const [mockTitle, setMockTitle] = useState<string>("My Awesome Website");
    const [copied, setCopied] = useState<boolean>(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Clean up Object URL
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    // Handle File upload
    const handleFile = useCallback((selectedFile: File) => {
        const nameLower = selectedFile.name.toLowerCase();
        const ext = nameLower.split(".").pop();
        const isSupported = selectedFile.type.startsWith("image/") || ext === "svg" || ext === "heic" || ext === "heif";

        if (!isSupported) {
            setErrorMsg("Please upload a valid image file (PNG, JPG, WebP, AVIF, HEIC, TIFF, or SVG).");
            setStatus("error");
            return;
        }

        setErrorMsg(null);
        setStatus("idle");
        setConvertedBlob(null);
        setConvertedSize(null);
        setFile(selectedFile);

        // Revoke previous URL to prevent memory leaks
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }

        if (ext === "heic" || ext === "heif") {
            setPreviewUrl(null); // Native browsers do not support HEIC preview directly
        } else {
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }

        // Auto extract mock title
        const baseName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf(".")) || "My Website";
        const formattedTitle = baseName
            .replace(/[-_]/g, " ")
            .replace(/\b\w/g, c => c.toUpperCase());
        setMockTitle(formattedTitle);
    }, [previewUrl]);

    // Preset Selection Change
    const handlePresetChange = (preset: "standard" | "all" | "custom") => {
        setSizePreset(preset);
        if (preset === "standard") {
            setSelectedSizes([16, 32, 48]);
        } else if (preset === "all") {
            setSelectedSizes([16, 32, 48, 64, 128, 256]);
        }
    };

    // Toggle Specific Size
    const toggleSize = (size: number) => {
        if (sizePreset !== "custom") {
            setSizePreset("custom");
        }
        setSelectedSizes((prev) => {
            if (prev.includes(size)) {
                if (prev.length === 1) return prev; // Keep at least one size
                return prev.filter((s) => s !== size);
            } else {
                return [...prev, size].sort((a, b) => a - b);
            }
        });
    };

    // Drag events
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
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
            e.target.value = "";
        }
    };

    const removeFile = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setFile(null);
        setPreviewUrl(null);
        setConvertedBlob(null);
        setConvertedSize(null);
        setGeneratedSizes([]);
        setStatus("idle");
        setErrorMsg(null);
    };

    // Submit Conversion
    const startConversion = async () => {
        if (!file || isConverting) return;
        setIsConverting(true);
        if (status !== "success") {
            setStatus("converting");
        }
        setErrorMsg(null);

        try {
            const blob = await generateIco(file, {
                sizes: selectedSizes,
                autoSquare,
            });
            setConvertedBlob(blob);
            setConvertedSize(blob.size);
            setGeneratedSizes([...selectedSizes]);
            setStatus("success");
        } catch (error) {
            console.error(error);
            const msg = error instanceof Error ? error.message : "Failed to convert file to ICO.";
            setErrorMsg(msg);
            setStatus("error");
        } finally {
            setIsConverting(false);
        }
    };

    const triggerDownload = () => {
        if (!convertedBlob || !file) return;
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf("."));

        // Dynamically create download link
        const url = URL.createObjectURL(convertedBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${nameWithoutExt}.ico`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const copyCodeSnippet = () => {
        const code = `<link rel="icon" type="image/x-icon" href="/favicon.ico">`;
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const hasSettingsChanged = status === "success" && (
        selectedSizes.length !== generatedSizes.length ||
        !selectedSizes.every(size => generatedSizes.includes(size))
    );

    const showGenerateButton = file && (status !== "success" || hasSettingsChanged);

    const sizeOptions = [16, 32, 48, 64, 128, 256];

    return (
        <div className="w-full flex-1 relative overflow-hidden">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10 space-y-8">
                {/* Header */}
                <div
                    className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-6 gap-4"
                >
                    <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                            <span
                                className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center"
                            >
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

                {/* Workspace Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Input and Settings */}
                    <div className="lg:col-span-7 space-y-6">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={onFileSelect}
                            accept="image/*,.heic,.heif,.svg"
                            className="hidden"
                        />

                        {/* File Dropzone */}
                        {!file ? (
                            <FileDropzone
                                isDragging={isDragging}
                                onDragOver={onDragOver}
                                onDragLeave={onDragLeave}
                                onDrop={onDrop}
                                onClick={triggerFileInput}
                            />
                        ) : (
                            <SelectedFileCard
                                file={file}
                                previewUrl={previewUrl}
                                isConverting={isConverting}
                                onRemove={removeFile}
                            />
                        )}

                        {/* Settings Panel */}
                        {file && (
                            <div
                                className="border border-border bg-surface/40 backdrop-blur-md p-6 rounded-3xl space-y-6"
                            >
                                <h2 className="text-sm font-extrabold text-text-primary flex items-center gap-2">
                                    <Settings20Regular className="w-4 h-4 text-primary"/>
                                    Favicon Configuration
                                </h2>

                                {/* Preset Buttons */}
                                <div className="space-y-2.5">
                                    <label className="text-xs font-bold text-text-secondary">
                                        Favicon Sizes Preset
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(["standard", "all", "custom"] as const).map((preset) => (
                                            <button
                                                key={preset}
                                                onClick={() => handlePresetChange(preset)}
                                                className={`py-2 text-[10px] sm:text-xs font-black uppercase rounded-xl border transition-all cursor-pointer ${
                                                    sizePreset === preset
                                                        ? "bg-primary text-white border-primary shadow-sm"
                                                        : "bg-surface text-text-secondary border-border hover:bg-surface-secondary"
                                                }`}
                                            >
                                                {preset === "standard" && "Standard Favicon"}
                                                {preset === "all" && "All Sizes"}
                                                {preset === "custom" && "Custom Selection"}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-text-muted">
                                        {sizePreset === "standard" && "Includes 16x16, 32x32, 48x48 sizes. Fits 99% of general web requirements."}
                                        {sizePreset === "all" && "Includes 16x16 to 256x256. Perfect for Windows, macOS desktop, and touch screen shortcuts."}
                                        {sizePreset === "custom" && "Choose custom dimensions to embed into the generated ICO file."}
                                    </p>
                                </div>

                                {/* Custom Checkboxes Grid */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-secondary">
                                        Select Dimensions:
                                    </label>
                                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                        {sizeOptions.map((size) => {
                                            const isSelected = selectedSizes.includes(size);
                                            return (
                                                <button
                                                    key={size}
                                                    onClick={() => toggleSize(size)}
                                                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer ${
                                                        isSelected
                                                            ? "border-primary/80 bg-primary/5 text-primary shadow-sm"
                                                            : "border-border bg-surface/30 hover:border-border-hover text-text-muted hover:text-text-primary"
                                                    }`}
                                                >
                                                    <span className="text-xs font-extrabold font-mono">{size}</span>
                                                    <span className="text-[8px] opacity-75">px</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Conversion trigger */}
                        {showGenerateButton && (
                            <button
                                onClick={startConversion}
                                disabled={isConverting}
                                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-black tracking-wider uppercase text-white bg-primary hover:bg-primary-hover disabled:bg-primary/40 cursor-pointer shadow-md shadow-primary/10 active:scale-98 transition-all animate-in fade-in duration-200"
                            >
                                {isConverting ? (
                                    <>
                                        <div
                                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                                        Converting to Favicon...
                                    </>
                                ) : (
                                    <>
                                        <ArrowDownload20Regular className="w-4 h-4"/>
                                        Generate Favicon (.ICO)
                                    </>
                                )}
                            </button>
                        )}

                        {/* Informational Guidance */}
                        <div
                            className="p-4 border border-border/80 bg-surface/30 backdrop-blur-md rounded-2xl flex gap-3 text-text-secondary"
                        >
                            <Info20Regular className="w-4 h-4 shrink-0 text-primary mt-0.5"/>
                            <div className="space-y-1">
                                <h4 className="text-xs font-bold text-text-primary">
                                    About the ICO Format
                                </h4>
                                <p className="text-[10px] leading-relaxed">
                                    Favicon.ico is a container that bundles multiple resolutions. The browser
                                    automatically fetches the ideal size depending on the use case (e.g. 16x16 for tabs,
                                    32x32 for shortcut icons, 48x48 for app icons).
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Previews & Results */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* Browser Favicon Simulation Panel */}
                        <LiveBrowserPreview
                            previewUrl={previewUrl}
                            mockTitle={mockTitle}
                            setMockTitle={setMockTitle}
                            tabTheme={tabTheme}
                            setTabTheme={setTabTheme}
                        />

                        {/* Desktop Shortcut Icon Mock */}
                        {previewUrl && <ShortcutPreview previewUrl={previewUrl}/>}

                        {/* Conversion Status / Success Panel */}
                        {status === "success" && convertedBlob && (
                            <SuccessPanel
                                convertedSize={convertedSize}
                                generatedSizes={generatedSizes}
                                isConverting={isConverting}
                                copied={copied}
                                onDownload={triggerDownload}
                                onCopySnippet={copyCodeSnippet}
                            />
                        )}

                        {/* Error State */}
                        {status === "error" && errorMsg && (
                            <ErrorPanel errorMsg={errorMsg} onRetry={startConversion}/>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
