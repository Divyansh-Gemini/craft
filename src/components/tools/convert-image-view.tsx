"use client";

import React, {useState, useRef, useCallback, useEffect} from "react";
import {
    Dismiss20Regular,
    ArrowDownload20Regular,
    Image20Regular,
    ArrowSwap20Regular,
    CheckmarkCircle20Regular,
    ErrorCircle20Regular,
    ArrowCounterclockwise20Regular,
    Delete20Regular,
    Add20Regular,
} from "@fluentui/react-icons";
import {Tool} from "@/types/tool";
import {ToolHeader} from "@/components/ui/tool-header";
import {FileDropzone, FileDropzoneRef} from "@/components/ui/file-dropzone";
import {
    SUPPORTED_FORMATS,
    formatBytes,
    downloadBlob,
    downloadZip,
    convertSingleImage,
} from "@/features/image/image-converter";

interface ConvertImageViewProps {
    tool: Tool;
}

interface ConvertFileItem {
    id: string;
    file: File;
    name: string;
    size: number;
    previewUrl: string | null;
    inputFormat: string;
    targetFormat: string;
    status: "idle" | "converting" | "success" | "error";
    errorMsg?: string;
    convertedBlob?: Blob;
}

export function ConvertImageView({tool}: ConvertImageViewProps) {
    const [files, setFiles] = useState<ConvertFileItem[]>([]);
    const [globalTargetFormat, setGlobalTargetFormat] = useState<string>("webp");
    const [isConverting, setIsConverting] = useState<boolean>(false);
    const fileInputRef = useRef<FileDropzoneRef>(null);

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

    const handleFiles = useCallback((fileList: FileList | File[]) => {
        const newItems: ConvertFileItem[] = [];
        for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            const ext = file.name.split(".").pop()?.toLowerCase() || "";
            const isImage = file.type.startsWith("image/") || ext === "heic" || ext === "heif";
            if (!isImage) continue;

            const id = Math.random().toString(36).substring(2, 9);
            const inputFormat = ext === "jpeg" ? "jpg" : ext;

            // Decide initial target format (avoid converting to itself)
            let defaultTarget = globalTargetFormat;
            if (defaultTarget === inputFormat) {
                defaultTarget = inputFormat === "png" ? "webp" : "png";
            }

            let previewUrl: string | null = null;
            // Native browsers cannot render HEIC/HEIF previews directly
            if (ext !== "heic" && ext !== "heif") {
                previewUrl = URL.createObjectURL(file);
            }

            newItems.push({
                id,
                file,
                name: file.name,
                size: file.size,
                previewUrl,
                inputFormat,
                targetFormat: defaultTarget,
                status: "idle",
            });
        }

        if (newItems.length > 0) {
            setFiles((prev) => [...prev, ...newItems]);
        }
    }, [globalTargetFormat]);

    const triggerFileInput = () => {
        fileInputRef.current?.trigger();
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

    const changeFileTargetFormat = useCallback((id: string, format: string) => {
        setFiles((prev) =>
            prev.map((item) =>
                item.id === id && item.status !== "success" ? {...item, targetFormat: format} : item
            )
        );
    }, []);

    const changeGlobalTargetFormat = useCallback((format: string) => {
        setGlobalTargetFormat(format);
        setFiles((prev) =>
            prev.map((item) => {
                if (item.status === "success") return item;
                // If input format is same as target format, switch to a fallback
                let finalTarget = format;
                if (item.inputFormat === format) {
                    finalTarget = format === "png" ? "webp" : "png";
                }
                return {...item, targetFormat: finalTarget};
            })
        );
    }, []);

    const processItemConversion = useCallback(async (item: ConvertFileItem) => {
        setFiles((prev) =>
            prev.map((f) =>
                f.id === item.id ? {...f, status: "converting", errorMsg: undefined} : f
            )
        );

        try {
            const blob = await convertSingleImage(item.file, item.targetFormat);
            setFiles((prev) =>
                prev.map((f) =>
                    f.id === item.id
                        ? {...f, status: "success", convertedBlob: blob}
                        : f
                )
            );
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Failed to convert";
            setFiles((prev) =>
                prev.map((f) =>
                    f.id === item.id
                        ? {...f, status: "error", errorMsg}
                        : f
                )
            );
        }
    }, []);

    // Perform the conversion process
    const startConversion = async () => {
        if (files.length === 0 || isConverting) return;
        setIsConverting(true);

        const itemsToConvert = files.filter(
            (item) => item.status === "idle" || item.status === "error"
        );

        await Promise.all(itemsToConvert.map(processItemConversion));
        setIsConverting(false);
    };

    const convertSingleItem = async (id: string) => {
        const item = files.find((f) => f.id === id);
        if (!item || item.status === "converting") return;

        await processItemConversion(item);
    };

    // Download handlers
    const triggerSingleDownload = (item: ConvertFileItem) => {
        if (!item.convertedBlob) return;
        const nameWithoutExt = item.name.substring(0, item.name.lastIndexOf("."));
        downloadBlob(item.convertedBlob, `${nameWithoutExt}.${item.targetFormat}`);
    };

    const triggerZipDownload = async () => {
        const successfulFiles = files.filter(
            (item) => item.status === "success" && item.convertedBlob
        );
        if (successfulFiles.length === 0) return;

        const filesToZip = successfulFiles.map((item) => {
            const nameWithoutExt = item.name.substring(0, item.name.lastIndexOf("."));
            return {
                blob: item.convertedBlob!,
                filename: `${nameWithoutExt}.${item.targetFormat}`,
            };
        });

        try {
            await downloadZip(filesToZip, "converted-images.zip");
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

    const hasConverted = successCount > 0;

    return (
        <>
            {/* Tool Title Block */}
            <ToolHeader title={tool.title} description={tool.description} iconId={tool.iconId}/>

            {/* Main Workspace */}
            <div className="space-y-6">
                <FileDropzone
                    ref={fileInputRef}
                    onFilesSelected={handleFiles}
                    multiple
                    accept="image/*,.heic,.heif"
                    showDropzone={totalCount === 0}
                    paddingClassName="p-10"
                    icon={<Image20Regular className="w-8 h-8"/>}
                    title={
                        <p className="text-sm font-extrabold text-text-primary">
                            Drag & drop files here, or <span className="text-primary">browse</span>
                        </p>
                    }
                    description="Supports PNG, JPG, WebP, AVIF, HEIC, TIFF, GIF (Up to 10MB each)"
                />

                {/* Files Section */}
                {totalCount > 0 && (
                    <div className="space-y-4">
                        {/* Toolbar Control */}
                        <div
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-border bg-surface/50 backdrop-blur-md rounded-2xl">
                            <div className="text-xs font-bold text-text-secondary">
                                Files to convert:{" "}
                                <span className="text-text-primary font-extrabold font-mono">
                                        {totalCount}
                                    </span>
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                <div className="flex items-center gap-2">
                                    <label
                                        className="text-[10px] font-black uppercase tracking-wider text-text-muted whitespace-nowrap">
                                        Convert all to:
                                    </label>
                                    <select
                                        value={globalTargetFormat}
                                        onChange={(e) => changeGlobalTargetFormat(e.target.value)}
                                        className="px-2.5 py-1.5 text-xs font-bold bg-surface border border-border rounded-lg outline-none cursor-pointer focus:border-primary"
                                    >
                                        {SUPPORTED_FORMATS.map((fmt) => (
                                            <option key={fmt.id} value={fmt.id}>
                                                {fmt.id.toUpperCase()}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    onClick={triggerFileInput}
                                    disabled={isConverting}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-extrabold tracking-wide uppercase text-white bg-primary hover:bg-primary-hover rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                                >
                                    <Add20Regular className="w-3.5 h-3.5"/>
                                    Add Files
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
                        <div className="space-y-3">
                            {files.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between border border-border bg-surface/40 hover:bg-surface/70 backdrop-blur-md p-4 rounded-2xl gap-4 transition-all duration-200"
                                >
                                    {/* Left Side: Thumbnail & File Info */}
                                    <div className="flex items-center gap-3 min-w-0">
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
                                                    <span
                                                        className="text-[7px] font-black uppercase bg-primary/10 text-primary px-1 rounded">
                                                            {item.inputFormat}
                                                        </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 space-y-1">
                                            <div
                                                className="text-xs font-bold text-text-primary truncate"
                                                title={item.name}
                                            >
                                                {item.name}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-text-muted">
                                                        {formatBytes(item.size)}
                                                    </span>
                                                <span className="w-1 h-1 rounded-full bg-border"/>
                                                <span
                                                    className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-surface-secondary border border-border text-text-secondary">
                                                        {item.inputFormat}
                                                    </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Middle/Right Controls */}
                                    <div className="flex items-center justify-between sm:justify-end gap-4">
                                        {/* Conversion Direction */}
                                        {(item.status === "idle" || item.status === "error") && (
                                            <div className="flex items-center gap-2">
                                                <ArrowSwap20Regular className="w-3.5 h-3.5 text-text-muted"/>
                                                <select
                                                    value={item.targetFormat}
                                                    onChange={(e) =>
                                                        changeFileTargetFormat(item.id, e.target.value)
                                                    }
                                                    disabled={isConverting}
                                                    className="px-2.5 py-1.5 text-xs font-bold bg-surface border border-border rounded-lg outline-none cursor-pointer focus:border-primary disabled:opacity-50"
                                                >
                                                    {SUPPORTED_FORMATS.filter(
                                                        (f) => f.id !== item.inputFormat
                                                    ).map((fmt) => (
                                                        <option key={fmt.id} value={fmt.id}>
                                                            {fmt.id.toUpperCase()}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {/* Result Target Format Indicator */}
                                        {(item.status === "converting" || item.status === "success") && (
                                            <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-text-muted">
                                                        {item.status === "converting" ? "Converting to" : "Converted to"}
                                                    </span>
                                                <span
                                                    className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                                        {item.targetFormat.toUpperCase()}
                                                    </span>
                                            </div>
                                        )}

                                        {/* Status indicators */}
                                        <div className="flex items-center gap-3">
                                            {item.status === "converting" && (
                                                <div className="flex items-center gap-1.5">
                                                    <div
                                                        className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
                                                    <span className="text-[10px] font-bold text-primary">
                                                            Converting...
                                                        </span>
                                                </div>
                                            )}

                                            {item.status === "success" && (
                                                <div className="flex items-center gap-1.5 text-success">
                                                    <CheckmarkCircle20Regular className="w-4 h-4"/>
                                                    <span className="text-[10px] font-extrabold uppercase">
                                                            Success
                                                        </span>
                                                </div>
                                            )}

                                            {item.status === "error" && (
                                                <div
                                                    className="flex items-center gap-1.5 text-danger group relative cursor-help"
                                                    title={item.errorMsg}
                                                >
                                                    <ErrorCircle20Regular className="w-4 h-4"/>
                                                    <span className="text-[10px] font-extrabold uppercase">
                                                            Failed
                                                        </span>
                                                </div>
                                            )}

                                            {/* File Level Actions */}
                                            <div className="flex items-center gap-2 border-l border-border pl-2.5">
                                                {item.status === "success" && (
                                                    <button
                                                        onClick={() => triggerSingleDownload(item)}
                                                        className="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-surface-secondary cursor-pointer transition-colors"
                                                        title="Download this file"
                                                    >
                                                        <ArrowDownload20Regular className="w-4 h-4"/>
                                                    </button>
                                                )}

                                                {item.status === "error" && (
                                                    <button
                                                        onClick={() => convertSingleItem(item.id)}
                                                        className="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-surface-secondary cursor-pointer transition-colors"
                                                        title="Retry conversion"
                                                    >
                                                        <ArrowCounterclockwise20Regular className="w-4 h-4"/>
                                                    </button>
                                                )}

                                                {item.status !== "converting" && (
                                                    <button
                                                        onClick={() => removeFile(item.id)}
                                                        disabled={isConverting}
                                                        className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger-bg/40 cursor-pointer transition-colors disabled:opacity-50"
                                                        title="Remove file"
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
                                        Some conversions failed. Hover/tap on the failure labels or check your images, and click retry to run again.
                                    </span>
                            </div>
                        )}

                        {/* Main CTA Block */}
                        <div
                            className="flex flex-col sm:flex-row items-center justify-between border border-border bg-surface/50 backdrop-blur-md p-4 rounded-2xl gap-4">
                            <div className="text-xs text-text-muted">
                                {successCount > 0 && (
                                    <span>
                                            Successfully converted{" "}
                                        <strong className="text-success font-black">
                                                {successCount}
                                            </strong>{" "}
                                        / {totalCount} files.
                                        </span>
                                )}
                                {successCount === 0 && (
                                    <span>Ready to convert {totalCount} images.</span>
                                )}
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                {/* Convert trigger */}
                                {idleCount + errorCount > 0 && (
                                    <button
                                        onClick={startConversion}
                                        disabled={isConverting}
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold tracking-wide uppercase text-white bg-primary hover:bg-primary-hover disabled:bg-primary/40 cursor-pointer shadow-md shadow-primary/10 active:scale-98 transition-all"
                                    >
                                        {isConverting ? (
                                            <>
                                                <div
                                                    className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                                                Converting...
                                            </>
                                        ) : (
                                            <>
                                                <ArrowSwap20Regular className="w-4 h-4"/>
                                                Convert {idleCount + errorCount} Images
                                            </>
                                        )}
                                    </button>
                                )}

                                {/* Single Output download */}
                                {totalCount === 1 && successCount === 1 && (
                                    <button
                                        onClick={() => triggerSingleDownload(files[0])}
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold tracking-wide uppercase text-white bg-primary hover:bg-primary-hover cursor-pointer shadow-md shadow-primary/10 active:scale-98 transition-all"
                                    >
                                        <ArrowDownload20Regular className="w-4 h-4"/>
                                        Download Image
                                    </button>
                                )}

                                {/* Multiple Output ZIP download */}
                                {totalCount > 1 && hasConverted && (
                                    <button
                                        onClick={triggerZipDownload}
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold tracking-wide uppercase text-white bg-primary hover:bg-primary-hover cursor-pointer shadow-md shadow-primary/10 active:scale-98 transition-all"
                                    >
                                        <ArrowDownload20Regular className="w-4 h-4"/>
                                        Download Converted (ZIP)
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
