"use client";

import React, {useState, useEffect, useMemo, useCallback, useRef} from "react";
import {
    Dismiss20Regular,
    ArrowDownload20Regular,
    MusicNote220Regular,
    Image20Regular,
    ErrorCircle20Regular,
    Delete20Regular,
    Add20Regular,
    Settings20Regular,
    ChevronDown20Regular,
    ChevronRight20Regular,
    Speaker220Regular,
    SpeakerMute20Regular,
    Play20Filled,
    Pause20Filled,
    ArrowSort16Regular,
    ArrowSortUp16Regular,
    ArrowSortDown16Regular,
    CheckmarkCircle20Regular,
} from "@fluentui/react-icons";
import {Tool} from "@/types/tool";
import {ToolHeader} from "@/components/ui/tool-header";
import {FileDropzone} from "@/components/ui/file-dropzone";
import {AudioFile, parseAudioFile, writeAudioMetadata} from "@/features/audio/metadata";

interface EditAudioMetadataViewProps {
    tool: Tool;
}

function TableShimmer() {
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Toolbar Panel Skeleton */}
            <div className="border border-border bg-surface/50 backdrop-blur-md rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Search bar skeleton */}
                    <div className="w-full sm:w-72 h-9 bg-surface-secondary/60 rounded-xl animate-pulse"/>
                    {/* Buttons skeleton */}
                    <div className="flex items-center gap-3">
                        <div className="w-24 h-9 bg-surface-secondary/60 rounded-xl animate-pulse"/>
                        <div className="w-32 h-9 bg-surface-secondary/60 rounded-xl animate-pulse"/>
                    </div>
                </div>
            </div>

            {/* Table Shimmer */}
            <div className="overflow-hidden rounded-3xl border border-border bg-surface/30 backdrop-blur-md shadow-sm">
                <div className="p-4 border-b border-border bg-surface-secondary/40 flex items-center justify-between">
                    <div className="w-1/4 h-4 bg-surface-secondary/80 rounded animate-pulse"/>
                    <div className="w-20 h-4 bg-surface-secondary/80 rounded animate-pulse"/>
                </div>
                <div className="divide-y divide-border/60 p-4 space-y-5">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-4 py-3">
                            <div className="w-4 h-4 bg-surface-secondary/80 rounded animate-pulse shrink-0"/>
                            <div className="w-9 h-9 bg-surface-secondary/80 rounded-md animate-pulse shrink-0"/>
                            <div className="w-1/4 h-3.5 bg-surface-secondary/60 rounded animate-pulse"/>
                            <div className="w-1/6 h-3.5 bg-surface-secondary/40 rounded animate-pulse"/>
                            <div className="w-1/5 h-3.5 bg-surface-secondary/40 rounded animate-pulse"/>
                            <div className="w-16 h-3.5 bg-surface-secondary/40 rounded animate-pulse ml-auto"/>
                        </div>
                    ))}
                </div>
            </div>

            {/* Status bar skeleton */}
            <div
                className="border border-border bg-surface/80 backdrop-blur-md rounded-3xl p-5 shadow-lg flex items-center justify-between">
                <div className="w-32 h-4 bg-surface-secondary/60 rounded animate-pulse"/>
                <div className="w-48 h-9 bg-surface-secondary/60 rounded-xl animate-pulse"/>
            </div>
        </div>
    );
}

export function EditAudioMetadataView({tool}: EditAudioMetadataViewProps) {
    const [files, setFiles] = useState<AudioFile[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isParsing, setIsParsing] = useState(false);
    const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
    const [zipProgress, setZipProgress] = useState<{
        current: number;
        total: number;
        stage: "writing" | "zipping"
    } | null>(null);
    const [downloadSuccess, setDownloadSuccess] = useState(false);
    const addMoreInputRef = useRef<HTMLInputElement>(null);

    // Bulk edit fields
    const [bulkFields, setBulkFields] = useState({
        artist: "",
        album: "",
        albumArtist: "",
        genre: "",
        year: "",
        composer: "",
        grouping: "",
        band: "",
        language: "",
        originalArtist: "",
        copyright: "",
        comment: "",
        lyrics: "",
    });

    const [bulkEnabled, setBulkEnabled] = useState({
        artist: false,
        album: false,
        albumArtist: false,
        genre: false,
        year: false,
        composer: false,
        grouping: false,
        band: false,
        language: false,
        originalArtist: false,
        copyright: false,
        comment: false,
        lyrics: false,
    });

    // Handle notifications (Disabled as requested: remove toasts)
    const showNotification = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
        console.log(`[Audio Metadata Editor] ${type.toUpperCase()}: ${message}`);
    }, []);

    const coverUrlsRef = useRef<string[]>([]);

    useEffect(() => {
        coverUrlsRef.current = files.map(f => f.coverArtUrl).filter(url => url && url.startsWith("blob:"));
    }, [files]);

    useEffect(() => {
        return () => {
            coverUrlsRef.current.forEach(url => {
                URL.revokeObjectURL(url);
            });
        };
    }, []);

    // Handle file drop/selection
    const handleFilesSelected = useCallback(async (selectedFileList: FileList) => {
        setIsParsing(true);
        const filesList = Array.from(selectedFileList).filter(file => {
            const ext = file.name.split(".").pop()?.toLowerCase();
            return ext === "mp3" || file.type === "audio/mpeg" || file.type === "audio/mp3";
        });

        if (filesList.length === 0) {
            setIsParsing(false);
            showNotification("Only MP3 files are supported.", "error");
            return;
        }

        try {
            const parsedFiles = await Promise.all(
                filesList.map(file => parseAudioFile(file))
            );

            if (parsedFiles.length > 0) {
                setFiles(prev => [...prev, ...parsedFiles]);
            }
        } catch (err) {
            console.error("Error parsing selected files:", err);
        } finally {
            setIsParsing(false);
        }
    }, [showNotification]);

    // Handle adding more files dynamically
    const handleAddMoreFiles = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setIsParsing(true);
            const filesList = Array.from(e.target.files).filter(file => {
                const ext = file.name.split(".").pop()?.toLowerCase();
                return ext === "mp3" || file.type === "audio/mpeg" || file.type === "audio/mp3";
            });

            if (filesList.length === 0) {
                setIsParsing(false);
                showNotification("Only MP3 files are supported.", "error");
                e.target.value = "";
                return;
            }

            try {
                const parsedFiles = await Promise.all(
                    filesList.map(file => parseAudioFile(file))
                );
                if (parsedFiles.length > 0) {
                    setFiles(prev => [...prev, ...parsedFiles]);
                }
            } catch (err) {
                console.error("Error parsing more files:", err);
            } finally {
                setIsParsing(false);
                e.target.value = "";
            }
        }
    }, [showNotification]);

    const triggerAddMore = () => {
        addMoreInputRef.current?.click();
    };

    // Remove file from list
    const handleRemoveFile = useCallback((id: string) => {
        setFiles(prev => {
            const fileToRemove = prev.find(f => f.id === id);
            if (fileToRemove && fileToRemove.coverArtUrl && fileToRemove.coverArtUrl.startsWith("blob:")) {
                URL.revokeObjectURL(fileToRemove.coverArtUrl);
            }
            return prev.filter(f => f.id !== id);
        });
        setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    }, []);

    // Clear all files
    const handleClearAll = useCallback(() => {
        files.forEach(f => {
            if (f.coverArtUrl && f.coverArtUrl.startsWith("blob:")) {
                URL.revokeObjectURL(f.coverArtUrl);
            }
        });
        setFiles([]);
        setSelectedIds([]);
        showNotification("Cleared all files.", "info");
    }, [files, showNotification]);

    // Update single file field in state
    const handleUpdateField = useCallback((id: string, field: keyof AudioFile, value: any) => {
        setFiles(prev => prev.map(f => {
            if (f.id === id) {
                return {
                    ...f,
                    [field]: value,
                    isModified: true,
                    isSaved: false
                };
            }
            return f;
        }));
    }, []);

    // Change cover art for a file
    const handleCoverChange = useCallback(async (id: string, imageFile: File) => {
        try {
            const buffer = await imageFile.arrayBuffer();
            const coverArtData = {
                data: new Uint8Array(buffer),
                format: imageFile.type
            };
            const coverArtUrl = URL.createObjectURL(imageFile);

            setFiles(prev => prev.map(f => {
                if (f.id === id) {
                    // Revoke old object URL if exists
                    if (f.coverArtUrl && f.coverArtUrl.startsWith("blob:")) {
                        URL.revokeObjectURL(f.coverArtUrl);
                    }
                    return {
                        ...f,
                        coverArtUrl,
                        coverArtData,
                        isModified: true,
                        isSaved: false
                    };
                }
                return f;
            }));
            showNotification("Cover art updated.");
        } catch (err) {
            showNotification("Failed to load cover art image.", "error");
        }
    }, [showNotification]);

    // Remove cover art for a file
    const handleRemoveCover = useCallback((id: string) => {
        setFiles(prev => prev.map(f => {
            if (f.id === id) {
                if (f.coverArtUrl && f.coverArtUrl.startsWith("blob:")) {
                    URL.revokeObjectURL(f.coverArtUrl);
                }
                return {
                    ...f,
                    coverArtUrl: "",
                    coverArtData: null,
                    isModified: true,
                    isSaved: false
                };
            }
            return f;
        }));
        showNotification("Cover art removed.");
    }, [showNotification]);

    // Save metadata changes to the file in memory
    const handleSaveFile = useCallback(async (id: string) => {
        const audioFile = files.find(f => f.id === id);
        if (!audioFile) return;

        if (audioFile.format !== "mp3" && !audioFile.file.name.endsWith(".mp3")) {
            showNotification("Writing tags is only supported for MP3 files.", "error");
            return;
        }

        // Set saving state
        setFiles(prev => prev.map(f => f.id === id ? {...f, isSaving: true} : f));

        try {
            const updatedBlob = await writeAudioMetadata(audioFile);
            // Create a new File object using the modified Blob but preserving the original filename
            const updatedFile = new File([updatedBlob], audioFile.file.name, {type: audioFile.file.type});

            setFiles(prev => prev.map(f => {
                if (f.id === id) {
                    return {
                        ...f,
                        file: updatedFile,
                        isSaving: false,
                        isSaved: true,
                        isModified: false,
                        error: undefined
                    };
                }
                return f;
            }));
            showNotification(`Tags saved successfully for "${audioFile.title}".`);
        } catch (err: any) {
            setFiles(prev => prev.map(f => f.id === id ? {
                ...f,
                isSaving: false,
                error: err.message || "Save failed"
            } : f));
            showNotification(`Failed to save tags: ${err.message}`, "error");
        }
    }, [files, showNotification]);

    // Save all modified files
    const handleSaveAll = useCallback(async () => {
        const modifiedMp3s = files.filter(f => f.isModified && (f.format === "mp3" || f.file.name.endsWith(".mp3")));
        if (modifiedMp3s.length === 0) {
            showNotification("No unsaved MP3 changes found.", "info");
            return;
        }

        showNotification(`Saving ${modifiedMp3s.length} file(s)...`, "info");

        for (const file of modifiedMp3s) {
            await handleSaveFile(file.id);
        }
    }, [files, handleSaveFile, showNotification]);

    // Download a single file (saving metadata on the fly if modified)
    const handleDownloadFile = useCallback(async (id: string) => {
        const audioFile = files.find(f => f.id === id);
        if (!audioFile) return;

        let fileToDownload = audioFile.file;
        const isMp3 = audioFile.format === "mp3" || audioFile.file.name.endsWith(".mp3");

        if (isMp3) {
            setFiles(prev => prev.map(f => f.id === id ? {...f, isSaving: true} : f));
            try {
                const updatedBlob = await writeAudioMetadata(audioFile);
                fileToDownload = new File([updatedBlob], audioFile.file.name, {type: audioFile.file.type});

                setFiles(prev => prev.map(f => {
                    if (f.id === id) {
                        return {
                            ...f,
                            file: fileToDownload,
                            isSaving: false,
                            isSaved: true,
                            isModified: false,
                            error: undefined
                        };
                    }
                    return f;
                }));
            } catch (err: any) {
                setFiles(prev => prev.map(f => f.id === id ? {
                    ...f,
                    isSaving: false,
                    error: err.message || "Save failed"
                } : f));
                showNotification(`Failed to save tags for download: ${err.message}`, "error");
                return;
            }
        }

        const url = URL.createObjectURL(fileToDownload);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileToDownload.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [files, showNotification]);

    // Download multiple files as a ZIP (saving metadata on the fly if modified)
    const handleDownloadZip = useCallback(async (idsToDownload: string[]) => {
        if (idsToDownload.length === 0) {
            showNotification("No files selected to download.", "error");
            return;
        }

        setDownloadSuccess(false);
        setZipProgress({current: 0, total: idsToDownload.length, stage: "writing"});

        try {
            const JSZipModule = await import("jszip");
            const JSZip = (JSZipModule.default || JSZipModule) as any;
            const zip = new JSZip();

            const targets = files.filter(f => idsToDownload.includes(f.id));

            // Deduplicate filenames in ZIP
            const nameCounts: Record<string, number> = {};

            let processedCount = 0;
            for (const item of targets) {
                let fileToZip = item.file;
                const isMp3 = item.format === "mp3" || item.file.name.endsWith(".mp3");

                if (isMp3 && item.isModified) {
                    try {
                        const updatedBlob = await writeAudioMetadata(item);
                        fileToZip = new File([updatedBlob], item.file.name, {type: item.file.type});

                        setFiles(prev => prev.map(f => {
                            if (f.id === item.id) {
                                return {
                                    ...f,
                                    file: fileToZip,
                                    isSaved: true,
                                    isModified: false,
                                    error: undefined
                                };
                            }
                            return f;
                        }));
                    } catch (err: any) {
                        console.error(`Failed to write tags for ${item.file.name}:`, err);
                    }
                }

                let filename = fileToZip.name;

                // If there's duplicate names, suffix them
                if (nameCounts[filename] !== undefined) {
                    nameCounts[filename]++;
                    const extIndex = filename.lastIndexOf(".");
                    const name = filename.substring(0, extIndex);
                    const ext = filename.substring(extIndex);
                    filename = `${name} (${nameCounts[filename]})${ext}`;
                } else {
                    nameCounts[filename] = 0;
                }

                zip.file(filename, fileToZip);
                processedCount++;
                setZipProgress(prev => prev ? {...prev, current: processedCount} : null);
            }

            setZipProgress({current: 0, total: 100, stage: "zipping"});

            const zipContent = await zip.generateAsync({type: "blob"}, (metadata: any) => {
                setZipProgress(prev => prev ? {...prev, current: Math.round(metadata.percent)} : null);
            });
            const url = URL.createObjectURL(zipContent);
            const a = document.createElement("a");
            a.href = url;
            a.download = `audio-metadata-updated-${new Date().toISOString().slice(0, 10)}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showNotification("ZIP downloaded successfully!");
            setDownloadSuccess(true);
            setTimeout(() => {
                setDownloadSuccess(false);
            }, 3000);
        } catch (err: any) {
            console.error("ZIP creation failed:", err);
            showNotification("Failed to generate ZIP file.", "error");
        } finally {
            setZipProgress(null);
        }
    }, [files, showNotification]);

    // Apply bulk edits to selected files
    const handleApplyBulkEdit = useCallback(() => {
        if (selectedIds.length === 0) {
            showNotification("No files selected for bulk editing.", "error");
            return;
        }

        const enabledFields = Object.entries(bulkEnabled)
            .filter(([_, enabled]) => enabled)
            .map(([field]) => field as keyof typeof bulkFields);

        if (enabledFields.length === 0) {
            showNotification("Please select at least one field checkbox to apply bulk edit.", "error");
            return;
        }

        setFiles(prev => prev.map(f => {
            if (selectedIds.includes(f.id)) {
                const updatedFields: Partial<AudioFile> = {
                    isModified: true,
                    isSaved: false
                };

                enabledFields.forEach(field => {
                    const key = field === "albumArtist" ? "albumArtist" : field;
                    updatedFields[key as keyof AudioFile] = bulkFields[field] as any;
                });

                return {
                    ...f,
                    ...updatedFields
                };
            }
            return f;
        }));

        showNotification(`Bulk edit applied to ${selectedIds.length} file(s).`);
        setIsBulkEditOpen(false);
    }, [selectedIds, bulkFields, bulkEnabled, showNotification]);

    // Selection helper for bulk checkboxes
    const handleSelectAll = useCallback((checked: boolean) => {
        if (checked) {
            setSelectedIds(files.map(f => f.id));
        } else {
            setSelectedIds([]);
        }
    }, [files]);

    const handleSelectRow = useCallback((id: string, checked: boolean) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(rowId => rowId !== id));
        }
    }, []);

    // Filter files based on search query
    const filteredFiles = useMemo(() => {
        if (!searchQuery) return files;
        const q = searchQuery.toLowerCase();
        return files.filter(f =>
            f.file.name.toLowerCase().includes(q) ||
            f.title.toLowerCase().includes(q) ||
            f.artist.toLowerCase().includes(q) ||
            f.album.toLowerCase().includes(q) ||
            f.genre.toLowerCase().includes(q)
        );
    }, [files, searchQuery]);

    // Reusable formatter helpers
    const formatBytes = (bytes: number, decimals = 1) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
    };

    const formatDuration = (seconds: number) => {
        if (!seconds || isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div className="space-y-6">
            {/* Header section */}
            <ToolHeader title={tool.title} description={tool.description} iconId={tool.iconId}/>

            {/* Main Content Area */}
            {isParsing ? (
                <TableShimmer/>
            ) : files.length === 0 ? (
                /* Drag and drop upload zone (kept mounted to prevent file handle garbage-collection) */
                <FileDropzone
                    onFilesSelected={handleFilesSelected}
                    accept="audio/mpeg,audio/mp3,.mp3"
                    multiple={true}
                    disabled={isParsing}
                    icon={<MusicNote220Regular className="w-8 h-8"/>}
                    title="Upload MP3 files"
                    description="Drag & drop MP3 files here, or click to browse. Only MP3 files are supported."
                />
            ) : files.length === 1 ? (
                /* SINGLE FILE EDITOR UI */
                <SingleFileEditor
                    audioFile={files[0]}
                    onUpdateField={handleUpdateField}
                    onCoverChange={handleCoverChange}
                    onRemoveCover={handleRemoveCover}
                    onSave={handleSaveFile}
                    onDownload={handleDownloadFile}
                    onAddMore={triggerAddMore}
                    formatBytes={formatBytes}
                    formatDuration={formatDuration}
                />
            ) : (
                /* BATCH / MULTIPLE FILES EDITOR UI */
                <BatchFileEditor
                    files={files}
                    filteredFiles={filteredFiles}
                    selectedIds={selectedIds}
                    searchQuery={searchQuery}
                    bulkFields={bulkFields}
                    bulkEnabled={bulkEnabled}
                    isBulkEditOpen={isBulkEditOpen}
                    setSearchQuery={setSearchQuery}
                    setIsBulkEditOpen={setIsBulkEditOpen}
                    setBulkFields={setBulkFields}
                    setBulkEnabled={setBulkEnabled}
                    onSelectAll={handleSelectAll}
                    onSelectRow={handleSelectRow}
                    onUpdateField={handleUpdateField}
                    onCoverChange={handleCoverChange}
                    onRemoveFile={handleRemoveFile}
                    onSave={handleSaveFile}
                    onSaveAll={handleSaveAll}
                    onDownload={handleDownloadFile}
                    onDownloadZip={handleDownloadZip}
                    onApplyBulkEdit={handleApplyBulkEdit}
                    onAddMore={triggerAddMore}
                    onClearAll={handleClearAll}
                    zipProgress={zipProgress}
                    downloadSuccess={downloadSuccess}
                    formatBytes={formatBytes}
                    formatDuration={formatDuration}
                />
            )}

            {/* Hidden Input to Add More Files */}
            <input
                type="file"
                ref={addMoreInputRef}
                onChange={handleAddMoreFiles}
                multiple
                accept="audio/mpeg,audio/mp3,.mp3"
                className="hidden"
            />
        </div>
    );
}

/* ============================================================================
   CLEARABLE INPUT / TEXTAREA COMPONENTS
   ============================================================================ */
interface ClearableInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
    value: string;
    onChange: (val: string) => void;
    onClear?: () => void;
    containerClassName?: string;
    inputClassName?: string;
}

function ClearableInput({
                            value,
                            onChange,
                            onClear,
                            className = "",
                            containerClassName = "",
                            inputClassName,
                            ...props
                        }: ClearableInputProps) {
    const handleClear = () => {
        if (props.disabled) return;
        onChange("");
        if (onClear) onClear();
    };

    const defaultInputClass = "w-full bg-surface border border-border hover:border-border-hover focus:border-primary rounded-xl pl-3 pr-9 py-3 text-xs text-text-primary font-bold outline-none transition-colors";

    return (
        <div className={`relative group ${containerClassName || "w-full"}`}>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={inputClassName || `${defaultInputClass} ${className}`}
                {...props}
            />
            {value && !props.disabled && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="absolute inset-y-0 right-0 flex items-center pr-1.5 text-text-muted hover:text-text-primary cursor-pointer transition-colors duration-150 animate-fade-in"
                    title="Clear text"
                >
                    <span className="w-5 h-5 rounded-md hover:bg-surface-secondary/60 flex items-center justify-center">
                        <Dismiss20Regular className="w-3 h-3"/>
                    </span>
                </button>
            )}
        </div>
    );
}

interface ClearableTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
    value: string;
    onChange: (val: string) => void;
    onClear?: () => void;
}

function ClearableTextarea({value, onChange, onClear, className = "", ...props}: ClearableTextareaProps) {
    const handleClear = () => {
        if (props.disabled) return;
        onChange("");
        if (onClear) onClear();
    };

    return (
        <div className="relative w-full group">
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full bg-surface border border-border hover:border-border-hover focus:border-primary rounded-xl pl-3 pr-9 py-3 text-xs text-text-primary font-bold outline-none transition-colors resize-y ${className}`}
                {...props}
            />
            {value && !props.disabled && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-2.5 top-3 text-text-muted hover:text-text-primary flex items-center justify-center w-6 h-6 rounded-md hover:bg-surface-secondary/60 cursor-pointer transition-colors duration-150 animate-fade-in"
                    title="Clear lyrics"
                >
                    <Dismiss20Regular className="w-3.5 h-3.5"/>
                </button>
            )}
        </div>
    );
}

/* ============================================================================
   REUSABLE METADATA FIELD COMPONENTS
   ============================================================================ */
interface FormInputFieldProps {
    label: string;
    description?: string;
    value: string;
    onChange: (val: string) => void;
    placeholder: string;
    pattern?: string;
    isTextArea?: boolean;
    rows?: number;
    colSpanClass?: string;
    disabled?: boolean;
    // Bulk-specific
    isBulk?: boolean;
    bulkChecked?: boolean;
    onBulkCheckedChange?: (checked: boolean) => void;
}

function FormInputField({
                            label,
                            description,
                            value,
                            onChange,
                            placeholder,
                            pattern,
                            isTextArea = false,
                            rows = 3,
                            colSpanClass = "",
                            disabled = false,
                            isBulk = false,
                            bulkChecked = false,
                            onBulkCheckedChange,
                        }: FormInputFieldProps) {
    const wrapperClass = `space-y-1 ${colSpanClass}`;

    return (
        <div className={wrapperClass}>
            {isBulk ? (
                <label className="flex items-center gap-2 text-[10px] font-bold text-text-secondary cursor-pointer">
                    <input
                        type="checkbox"
                        checked={bulkChecked}
                        onChange={(e) => onBulkCheckedChange?.(e.target.checked)}
                        className="rounded border-border accent-primary text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
                    />
                    {label}
                </label>
            ) : (
                <label className="text-[10px] font-black uppercase text-text-muted tracking-wider">
                    {label}
                    {description && (
                        <>{" "}<span className="text-[9px] text-text-muted font-normal">{description}</span></>
                    )}
                </label>
            )}

            {isTextArea ? (
                <ClearableTextarea
                    disabled={disabled}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    rows={rows}
                />
            ) : (
                <ClearableInput
                    disabled={disabled}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    pattern={pattern}
                />
            )}
        </div>
    );
}

interface TableInputFieldProps {
    value: string;
    onChange: (val: string) => void;
    disabled?: boolean;
    placeholder?: string;
    containerClassName?: string;
    textCenter?: boolean;
}

function TableInputField({
                             value,
                             onChange,
                             disabled = false,
                             placeholder = "",
                             containerClassName = "",
                             textCenter = false,
                         }: TableInputFieldProps) {
    const inputClassName = `w-full bg-surface-secondary/40 border border-border/50 hover:border-border focus:border-primary focus:bg-surface rounded-md py-1 text-xs text-text-primary font-bold outline-none transition-all duration-150 disabled:opacity-50 ${
        textCenter ? "pl-1 pr-6 text-center" : "pl-2 pr-7"
    }`;

    return (
        <ClearableInput
            value={value}
            disabled={disabled}
            placeholder={placeholder}
            onChange={onChange}
            containerClassName={containerClassName}
            inputClassName={inputClassName}
        />
    );
}

/* ============================================================================
   SINGLE FILE EDITOR COMPONENT
   ============================================================================ */
interface SingleFileEditorProps {
    audioFile: AudioFile;
    onUpdateField: (id: string, field: keyof AudioFile, value: any) => void;
    onCoverChange: (id: string, file: File) => void;
    onRemoveCover: (id: string) => void;
    onSave: (id: string) => void;
    onDownload: (id: string) => void | Promise<void>;
    onAddMore: () => void;
    formatBytes: (bytes: number) => string;
    formatDuration: (seconds: number) => string;
}

function SingleFileEditor(
    {
        audioFile,
        onUpdateField,
        onCoverChange,
        onRemoveCover,
        onDownload,
        onAddMore,
        formatBytes,
        formatDuration,
    }: SingleFileEditorProps
) {
    const coverInputRef = useRef<HTMLInputElement>(null);
    const [audioUrl, setAudioUrl] = useState("");
    const [coverError, setCoverError] = useState(false);

    useEffect(() => {
        setCoverError(false);
    }, [audioFile.coverArtUrl]);

    useEffect(() => {
        const url = URL.createObjectURL(audioFile.file);
        setAudioUrl(url);

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [audioFile.file]);

    const isMp3 = audioFile.format === "mp3" || audioFile.file.name.endsWith(".mp3");

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT SIDEBAR: Artwork, Quick Player, Tech Info */}
                <div className="space-y-6">
                    {/* Artwork Container */}
                    <div
                        className="border border-border bg-surface/50 backdrop-blur-md rounded-3xl p-5 shadow-sm space-y-4 text-center">
                        <div className="text-xs font-black uppercase tracking-wider text-text-muted text-left">
                            Album Artwork
                        </div>
                        <div
                            onClick={() => coverInputRef.current?.click()}
                            className="relative aspect-square w-full rounded-2xl overflow-hidden border border-border bg-surface-secondary/40 flex items-center justify-center cursor-pointer group shadow-inner transition-all duration-300 hover:border-primary/50"
                        >
                            {audioFile.coverArtUrl && !coverError ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                    src={audioFile.coverArtUrl}
                                    alt="Cover Art"
                                    onError={() => setCoverError(true)}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center text-text-muted p-6">
                                    <Image20Regular className="w-16 h-16 stroke-1 mb-2 text-text-muted/40"/>
                                    <p className="text-xs font-bold text-text-muted/70">No cover art</p>
                                </div>
                            )}

                            {/* Cover Edit Overlay */}
                            <div
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-300">
                                <Add20Regular className="w-7 h-7 mb-1"/>
                                <span className="text-[10px] font-extrabold uppercase tracking-wide">
                                    {audioFile.coverArtUrl && !coverError ? "Replace Cover" : "Add Cover"}
                                </span>
                            </div>
                        </div>

                        <input
                            type="file"
                            ref={coverInputRef}
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    onCoverChange(audioFile.id, e.target.files[0]);
                                }
                            }}
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                        />

                        {audioFile.coverArtUrl && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveCover(audioFile.id);
                                }}
                                className="w-full py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wide border border-danger/20 text-danger bg-danger-bg/20 hover:bg-danger-bg/60 cursor-pointer transition-colors duration-200"
                            >
                                Remove Cover Art
                            </button>
                        )}
                    </div>

                    {/* Quick Player */}
                    <div
                        className="border border-border bg-surface/50 backdrop-blur-md rounded-3xl p-5 shadow-sm space-y-3">
                        <div className="text-xs font-black uppercase tracking-wider text-text-muted">
                            Audio Preview
                        </div>
                        <CustomAudioPlayer
                            src={audioUrl}
                            title={audioFile.title}
                            artist={audioFile.artist}
                        />
                    </div>

                    {/* Technical details */}
                    <div
                        className="border border-border bg-surface/50 backdrop-blur-md rounded-3xl p-5 shadow-sm space-y-4">
                        <div
                            className="text-xs font-black uppercase tracking-wider text-text-muted border-b border-border pb-2">
                            Technical Metadata
                        </div>
                        <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                            <div>
                                <span className="text-[10px] font-bold text-text-muted block uppercase">Format</span>
                                <span className="font-extrabold text-text-primary uppercase">{audioFile.format}</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-text-muted block uppercase">Bitrate</span>
                                <span className="font-extrabold text-text-primary">
                                    {audioFile.bitrate ? `${Math.round(audioFile.bitrate / 1000)} kbps` : "Unknown"}
                                </span>
                            </div>
                            <div>
                                <span
                                    className="text-[10px] font-bold text-text-muted block uppercase">Sample Rate</span>
                                <span className="font-extrabold text-text-primary">
                                    {audioFile.sampleRate ? `${(audioFile.sampleRate / 1000).toFixed(1)} kHz` : "Unknown"}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-text-muted block uppercase">Channels</span>
                                <span className="font-extrabold text-text-primary">
                                    {audioFile.channels === 1 ? "Mono" : audioFile.channels === 2 ? "Stereo" : `${audioFile.channels} Ch`}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-text-muted block uppercase">Duration</span>
                                <span
                                    className="font-extrabold text-text-primary">{formatDuration(audioFile.duration)}</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-text-muted block uppercase">File Size</span>
                                <span
                                    className="font-extrabold text-text-primary">{formatBytes(audioFile.file.size)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Interactive Metadata Form */}
                <div className="lg:col-span-2">
                    <div
                        className="border border-border bg-surface/50 backdrop-blur-md rounded-3xl p-6 shadow-sm space-y-6">
                        <div
                            className="text-sm font-black text-text-primary border-b border-border pb-3 flex items-center justify-between flex-wrap gap-2">
                            <span>Metadata Tags</span>
                            <div className="flex items-center gap-3 flex-wrap">
                                {!isMp3 && (
                                    <span className="text-[10px] text-warning font-bold">
                                        * Writing tags only supported for MP3
                                    </span>
                                )}
                                {audioFile.isSaving && (
                                    <span
                                        className="inline-flex items-center gap-1 text-[10px] font-extrabold text-primary animate-pulse">
                                        <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                                        Saving Tags...
                                    </span>
                                )}
                                <button
                                    onClick={onAddMore}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-bold text-text-secondary hover:text-primary hover:border-primary/40 cursor-pointer transition-colors duration-200"
                                >
                                    <Add20Regular className="w-3.5 h-3.5"/>
                                    Add Files
                                </button>
                            </div>
                        </div>

                        {/* Input Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormInputField
                                label="Song Title"
                                value={audioFile.title}
                                onChange={(val) => onUpdateField(audioFile.id, "title", val)}
                                placeholder="Enter song title"
                            />

                            <FormInputField
                                label="Artist(s)"
                                description="(comma separated)"
                                value={audioFile.artist}
                                onChange={(val) => onUpdateField(audioFile.id, "artist", val)}
                                placeholder="Enter artist names"
                            />

                            <FormInputField
                                label="Album Title"
                                value={audioFile.album}
                                onChange={(val) => onUpdateField(audioFile.id, "album", val)}
                                placeholder="Enter album title"
                            />

                            <FormInputField
                                label="Album Artist"
                                value={audioFile.albumArtist}
                                onChange={(val) => onUpdateField(audioFile.id, "albumArtist", val)}
                                placeholder="Enter album artist"
                            />

                            <FormInputField
                                label="Genre"
                                description="(comma separated)"
                                value={audioFile.genre}
                                onChange={(val) => onUpdateField(audioFile.id, "genre", val)}
                                placeholder="Pop, Rock, Jazz, etc."
                            />

                            <FormInputField
                                label="Release Year"
                                value={audioFile.year}
                                onChange={(val) => onUpdateField(audioFile.id, "year", val)}
                                placeholder="e.g. 2026"
                                pattern="\d{4}"
                            />

                            {/* Track Number & Total */}
                            <div className="grid grid-cols-2 gap-3">
                                <FormInputField
                                    label="Track No."
                                    value={audioFile.trackNumber}
                                    onChange={(val) => onUpdateField(audioFile.id, "trackNumber", val)}
                                    placeholder="e.g. 3"
                                />
                                <FormInputField
                                    label="Track Total"
                                    value={audioFile.trackTotal}
                                    onChange={(val) => onUpdateField(audioFile.id, "trackTotal", val)}
                                    placeholder="e.g. 12"
                                />
                            </div>

                            <FormInputField
                                label="Composer(s)"
                                value={audioFile.composer}
                                onChange={(val) => onUpdateField(audioFile.id, "composer", val)}
                                placeholder="Enter composer name"
                            />

                            <FormInputField
                                label="Grouping"
                                value={audioFile.grouping}
                                onChange={(val) => onUpdateField(audioFile.id, "grouping", val)}
                                placeholder="Enter content group/section"
                            />

                            <FormInputField
                                label="Band"
                                value={audioFile.band}
                                onChange={(val) => onUpdateField(audioFile.id, "band", val)}
                                placeholder="Enter band/orchestra name"
                            />

                            <FormInputField
                                label="Language"
                                value={audioFile.language}
                                onChange={(val) => onUpdateField(audioFile.id, "language", val)}
                                placeholder="e.g. eng, deu, etc."
                            />

                            <FormInputField
                                label="Original Artist"
                                value={audioFile.originalArtist}
                                onChange={(val) => onUpdateField(audioFile.id, "originalArtist", val)}
                                placeholder="Enter original performer name"
                            />

                            <FormInputField
                                colSpanClass="md:col-span-2"
                                label="Copyright"
                                value={audioFile.copyright}
                                onChange={(val) => onUpdateField(audioFile.id, "copyright", val)}
                                placeholder="e.g. 2026 Example Records"
                            />

                            <FormInputField
                                colSpanClass="md:col-span-2"
                                label="Comments"
                                value={audioFile.comment}
                                onChange={(val) => onUpdateField(audioFile.id, "comment", val)}
                                placeholder="Enter comments"
                            />

                            <FormInputField
                                colSpanClass="md:col-span-2"
                                isTextArea
                                label="Lyrics"
                                value={audioFile.lyrics}
                                onChange={(val) => onUpdateField(audioFile.id, "lyrics", val)}
                                placeholder="Paste song lyrics here..."
                                rows={5}
                            />
                        </div>

                        {/* Actions bar */}
                        <div className="border-t border-border pt-5 flex justify-end">
                            <button
                                onClick={() => onDownload(audioFile.id)}
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold text-white bg-primary hover:bg-primary-hover cursor-pointer transition-colors duration-200 shadow-xs"
                            >
                                <ArrowDownload20Regular className="w-4 h-4"/>
                                Download File
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ============================================================================
   BATCH / MULTIPLE FILES EDITOR COMPONENT
   ============================================================================ */
interface BulkFields {
    artist: string;
    album: string;
    albumArtist: string;
    genre: string;
    year: string;
    composer: string;
    grouping: string;
    band: string;
    language: string;
    originalArtist: string;
    copyright: string;
    comment: string;
    lyrics: string;
}

interface BulkEnabled {
    artist: boolean;
    album: boolean;
    albumArtist: boolean;
    genre: boolean;
    year: boolean;
    composer: boolean;
    grouping: boolean;
    band: boolean;
    language: boolean;
    originalArtist: boolean;
    copyright: boolean;
    comment: boolean;
    lyrics: boolean;
}

interface BatchFileEditorProps {
    files: AudioFile[];
    filteredFiles: AudioFile[];
    selectedIds: string[];
    searchQuery: string;
    bulkFields: BulkFields;
    bulkEnabled: BulkEnabled;
    isBulkEditOpen: boolean;
    setSearchQuery: (q: string) => void;
    setIsBulkEditOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setBulkFields: React.Dispatch<React.SetStateAction<BulkFields>>;
    setBulkEnabled: React.Dispatch<React.SetStateAction<BulkEnabled>>;
    onSelectAll: (checked: boolean) => void;
    onSelectRow: (id: string, checked: boolean) => void;
    onUpdateField: (id: string, field: keyof AudioFile, value: any) => void;
    onCoverChange: (id: string, file: File) => void;
    onRemoveFile: (id: string) => void;
    onSave: (id: string) => void;
    onSaveAll: () => void;
    onDownload: (id: string) => void | Promise<void>;
    onDownloadZip: (ids: string[]) => void | Promise<void>;
    onApplyBulkEdit: () => void;
    onAddMore: () => void;
    onClearAll: () => void;
    zipProgress: { current: number; total: number; stage: "writing" | "zipping" } | null;
    downloadSuccess: boolean;
    formatBytes: (bytes: number) => string;
    formatDuration: (seconds: number) => string;
}

function BatchFileEditor({
                             files,
                             filteredFiles,
                             selectedIds,
                             searchQuery,
                             bulkFields,
                             bulkEnabled,
                             isBulkEditOpen,
                             setSearchQuery,
                             setIsBulkEditOpen,
                             setBulkFields,
                             setBulkEnabled,
                             onSelectAll,
                             onSelectRow,
                             onUpdateField,
                             onCoverChange,
                             onRemoveFile,
                             onDownload,
                             onDownloadZip,
                             onApplyBulkEdit,
                             onAddMore,
                             onClearAll,
                             zipProgress,
                             downloadSuccess,
                         }: BatchFileEditorProps) {
    useRef<HTMLInputElement>(null);
    const gridCoverRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const [sortConfig, setSortConfig] = useState<{
        key: keyof AudioFile | "filename";
        direction: "asc" | "desc";
    } | null>(null);

    const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

    const handleSort = (key: keyof AudioFile | "filename") => {
        setSortConfig(prev => {
            if (prev && prev.key === key) {
                if (prev.direction === "asc") {
                    return {key, direction: "desc"};
                }
                return null; // unsorted
            }
            return {key, direction: "asc"};
        });
    };

    const renderSortIcon = (key: keyof AudioFile | "filename") => {
        const isSorted = sortConfig?.key === key;
        if (isSorted) {
            return sortConfig.direction === "asc" ? (
                <ArrowSortUp16Regular className="w-3.5 h-3.5 text-primary shrink-0 transition-colors"/>
            ) : (
                <ArrowSortDown16Regular className="w-3.5 h-3.5 text-primary shrink-0 transition-colors"/>
            );
        }
        return (
            <ArrowSort16Regular
                className="w-3.5 h-3.5 text-text-muted/30 group-hover/header:text-text-muted/70 group-hover/header:opacity-100 opacity-0 transition-all shrink-0"/>
        );
    };

    const sortedFiles = useMemo(() => {
        if (!sortConfig) return filteredFiles;

        return [...filteredFiles].sort((a, b) => {
            let aVal: any;
            let bVal: any;

            if (sortConfig.key === "filename") {
                aVal = a.file.name.toLowerCase();
                bVal = b.file.name.toLowerCase();
            } else if (sortConfig.key === "year" || sortConfig.key === "trackNumber") {
                aVal = parseInt(a[sortConfig.key] || "0", 10);
                bVal = parseInt(b[sortConfig.key] || "0", 10);
                if (isNaN(aVal)) aVal = 0;
                if (isNaN(bVal)) bVal = 0;
            } else {
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];
                aVal = typeof valA === "string" ? valA.toLowerCase() : valA || "";
                bVal = typeof valB === "string" ? valB.toLowerCase() : valB || "";
            }

            if (aVal < bVal) {
                return sortConfig.direction === "asc" ? -1 : 1;
            }
            if (aVal > bVal) {
                return sortConfig.direction === "asc" ? 1 : -1;
            }
            return 0;
        });
    }, [filteredFiles, sortConfig]);

    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
        filename: 200,
        title: 200,
        artist: 200,
        album: 200,
        albumArtist: 150,
        genre: 120,
        year: 80,
        track: 110,
        composer: 150,
        grouping: 120,
        band: 150,
        language: 100,
        originalArtist: 150,
        copyright: 180,
        comment: 200,
        lyrics: 200,
    });

    const activeResizeCol = useRef<string | null>(null);
    const startX = useRef<number>(0);
    const startWidth = useRef<number>(0);

    const handleResizeStart = useCallback((e: React.MouseEvent, colKey: string) => {
        e.preventDefault();
        activeResizeCol.current = colKey;
        startX.current = e.clientX;
        const defaultWidths: Record<string, number> = {
            filename: 200,
            title: 200,
            artist: 200,
            album: 200,
            albumArtist: 150,
            genre: 120,
            year: 80,
            track: 110,
            composer: 150,
            grouping: 120,
            band: 150,
            language: 100,
            originalArtist: 150,
            copyright: 180,
            comment: 200,
            lyrics: 200,
        };
        startWidth.current = columnWidths[colKey] || defaultWidths[colKey] || 150;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!activeResizeCol.current) return;
            const dx = moveEvent.clientX - startX.current;
            const newWidth = Math.max(60, startWidth.current + dx);
            setColumnWidths(prev => ({
                ...prev,
                [activeResizeCol.current!]: newWidth,
            }));
        };

        const handleMouseUp = () => {
            activeResizeCol.current = null;
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
    }, [columnWidths]);

    return (
        <div className="space-y-6">

            {/* Toolbar Panel */}
            <div className="border border-border bg-surface/50 backdrop-blur-md rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    {/* Search bar */}
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by title, artist, album, genre..."
                            className="w-full bg-surface border border-border hover:border-border-hover focus:border-primary rounded-xl pl-4 pr-10 py-2.5 text-xs text-text-primary font-bold outline-none transition-colors"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                            >
                                <Dismiss20Regular className="w-4 h-4"/>
                            </button>
                        )}
                    </div>

                    {/* General Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={onAddMore}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border bg-surface text-text-secondary border-border hover:bg-surface-secondary/40 hover:text-primary cursor-pointer transition-colors duration-200"
                        >
                            <Add20Regular className="w-4 h-4"/>
                            Add Files
                        </button>

                        <button
                            onClick={() => setIsBulkEditOpen(prev => !prev)}
                            disabled={selectedIds.length === 0}
                            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                isBulkEditOpen
                                    ? "bg-primary text-white border-primary"
                                    : "bg-surface text-text-secondary border-border hover:bg-surface-secondary/40"
                            }`}
                        >
                            <Settings20Regular className="w-4 h-4"/>
                            Bulk Edit Tags
                            {selectedIds.length > 0 && <span
                                className="ml-1 px-1.5 py-0.2 bg-black/10 text-white dark:bg-white/10 dark:text-text-primary rounded-md text-[10px] font-black">{selectedIds.length}</span>}
                            {isBulkEditOpen ? <ChevronDown20Regular className="w-3.5 h-3.5"/> :
                                <ChevronRight20Regular className="w-3.5 h-3.5"/>}
                        </button>

                        <button
                            onClick={onClearAll}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border bg-surface text-text-secondary border-border hover:bg-danger-bg/20 hover:text-danger hover:border-danger/40 cursor-pointer transition-colors duration-200"
                        >
                            <Dismiss20Regular className="w-4 h-4"/>
                            Clear All
                        </button>
                    </div>
                </div>

                {/* BULK EDIT COMPOSER COMPONENT */}
                {isBulkEditOpen && selectedIds.length > 0 && (
                    <div className="border border-primary/20 bg-primary/5 rounded-2xl p-5 space-y-4 animate-slide-down">
                        <div
                            className="text-xs font-extrabold text-primary uppercase tracking-wider flex items-center justify-between border-b border-primary/10 pb-2">
                            <span>Bulk Edit Tags ({selectedIds.length} items selected)</span>
                            <span className="text-[10px] text-text-muted font-normal lowercase">Check field checkbox to apply bulk update</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Artist */}
                            <FormInputField
                                isBulk
                                label="Artist"
                                bulkChecked={bulkEnabled.artist}
                                onBulkCheckedChange={(checked) => setBulkEnabled(prev => ({...prev, artist: checked}))}
                                disabled={!bulkEnabled.artist}
                                value={bulkFields.artist}
                                onChange={(val) => setBulkFields(prev => ({...prev, artist: val}))}
                                placeholder="Enter bulk artist name"
                            />

                            {/* Album */}
                            <FormInputField
                                isBulk
                                label="Album"
                                bulkChecked={bulkEnabled.album}
                                onBulkCheckedChange={(checked) => setBulkEnabled(prev => ({...prev, album: checked}))}
                                disabled={!bulkEnabled.album}
                                value={bulkFields.album}
                                onChange={(val) => setBulkFields(prev => ({...prev, album: val}))}
                                placeholder="Enter bulk album name"
                            />

                            {/* Album Artist */}
                            <FormInputField
                                isBulk
                                label="Album Artist"
                                bulkChecked={bulkEnabled.albumArtist}
                                onBulkCheckedChange={(checked) => setBulkEnabled(prev => ({
                                    ...prev,
                                    albumArtist: checked
                                }))}
                                disabled={!bulkEnabled.albumArtist}
                                value={bulkFields.albumArtist}
                                onChange={(val) => setBulkFields(prev => ({...prev, albumArtist: val}))}
                                placeholder="Enter bulk album artist"
                            />

                            {/* Genre */}
                            <FormInputField
                                isBulk
                                label="Genre"
                                bulkChecked={bulkEnabled.genre}
                                onBulkCheckedChange={(checked) => setBulkEnabled(prev => ({...prev, genre: checked}))}
                                disabled={!bulkEnabled.genre}
                                value={bulkFields.genre}
                                onChange={(val) => setBulkFields(prev => ({...prev, genre: val}))}
                                placeholder="Enter bulk genre"
                            />

                            {/* Year */}
                            <FormInputField
                                isBulk
                                label="Year"
                                bulkChecked={bulkEnabled.year}
                                onBulkCheckedChange={(checked) => setBulkEnabled(prev => ({...prev, year: checked}))}
                                disabled={!bulkEnabled.year}
                                value={bulkFields.year}
                                onChange={(val) => setBulkFields(prev => ({...prev, year: val}))}
                                placeholder="Enter bulk year"
                            />

                            {/* Composer */}
                            <FormInputField
                                isBulk
                                label="Composer"
                                bulkChecked={bulkEnabled.composer}
                                onBulkCheckedChange={(checked) => setBulkEnabled(prev => ({
                                    ...prev,
                                    composer: checked
                                }))}
                                disabled={!bulkEnabled.composer}
                                value={bulkFields.composer}
                                onChange={(val) => setBulkFields(prev => ({...prev, composer: val}))}
                                placeholder="Enter bulk composer"
                            />

                            {/* Grouping */}
                            <FormInputField
                                isBulk
                                label="Grouping"
                                bulkChecked={bulkEnabled.grouping}
                                onBulkCheckedChange={(checked) => setBulkEnabled(prev => ({
                                    ...prev,
                                    grouping: checked
                                }))}
                                disabled={!bulkEnabled.grouping}
                                value={bulkFields.grouping}
                                onChange={(val) => setBulkFields(prev => ({...prev, grouping: val}))}
                                placeholder="Enter bulk grouping"
                            />

                            {/* Band */}
                            <FormInputField
                                isBulk
                                label="Band"
                                bulkChecked={bulkEnabled.band}
                                onBulkCheckedChange={(checked) => setBulkEnabled(prev => ({...prev, band: checked}))}
                                disabled={!bulkEnabled.band}
                                value={bulkFields.band}
                                onChange={(val) => setBulkFields(prev => ({...prev, band: val}))}
                                placeholder="Enter bulk band"
                            />

                            {/* Language */}
                            <FormInputField
                                isBulk
                                label="Language"
                                bulkChecked={bulkEnabled.language}
                                onBulkCheckedChange={(checked) => setBulkEnabled(prev => ({
                                    ...prev,
                                    language: checked
                                }))}
                                disabled={!bulkEnabled.language}
                                value={bulkFields.language}
                                onChange={(val) => setBulkFields(prev => ({...prev, language: val}))}
                                placeholder="Enter bulk language"
                            />

                            {/* Original Artist */}
                            <FormInputField
                                isBulk
                                label="Original Artist"
                                bulkChecked={bulkEnabled.originalArtist}
                                onBulkCheckedChange={(checked) => setBulkEnabled(prev => ({
                                    ...prev,
                                    originalArtist: checked
                                }))}
                                disabled={!bulkEnabled.originalArtist}
                                value={bulkFields.originalArtist}
                                onChange={(val) => setBulkFields(prev => ({...prev, originalArtist: val}))}
                                placeholder="Enter bulk original performer"
                            />

                            {/* Copyright */}
                            <FormInputField
                                isBulk
                                label="Copyright"
                                bulkChecked={bulkEnabled.copyright}
                                onBulkCheckedChange={(checked) => setBulkEnabled(prev => ({
                                    ...prev,
                                    copyright: checked
                                }))}
                                disabled={!bulkEnabled.copyright}
                                value={bulkFields.copyright}
                                onChange={(val) => setBulkFields(prev => ({...prev, copyright: val}))}
                                placeholder="Enter bulk copyright"
                            />

                            {/* Comments */}
                            <FormInputField
                                isBulk
                                label="Comments"
                                bulkChecked={bulkEnabled.comment}
                                onBulkCheckedChange={(checked) => setBulkEnabled(prev => ({...prev, comment: checked}))}
                                disabled={!bulkEnabled.comment}
                                value={bulkFields.comment}
                                onChange={(val) => setBulkFields(prev => ({...prev, comment: val}))}
                                placeholder="Enter bulk comments"
                            />

                            {/* Lyrics */}
                            <FormInputField
                                isBulk
                                isTextArea
                                colSpanClass="md:col-span-3"
                                label="Lyrics"
                                bulkChecked={bulkEnabled.lyrics}
                                onBulkCheckedChange={(checked) => setBulkEnabled(prev => ({...prev, lyrics: checked}))}
                                disabled={!bulkEnabled.lyrics}
                                value={bulkFields.lyrics}
                                onChange={(val) => setBulkFields(prev => ({...prev, lyrics: val}))}
                                placeholder="Enter bulk lyrics"
                                rows={3}
                            />
                        </div>
                        <div className="flex justify-end gap-3 border-t border-primary/10 pt-3">
                            <button
                                onClick={() => setIsBulkEditOpen(false)}
                                className="px-3 py-1.5 border border-border rounded-xl text-xs font-bold text-text-secondary hover:bg-surface transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onApplyBulkEdit}
                                className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-extrabold transition-colors cursor-pointer shadow-xs"
                            >
                                Apply Changes
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* TABULAR (EXCEL-LIKE) GRID */}
            <div
                className="overflow-auto max-h-[70vh] rounded-3xl border border-border bg-surface/30 backdrop-blur-md shadow-sm relative">
                <table className="w-full border-collapse text-left text-xs table-fixed min-w-[2000px]">
                    <colgroup>
                        {/* checkbox */}
                        <col style={{width: "48px"}}/>
                        {/* cover */}
                        <col style={{width: "64px"}}/>
                        <col style={{width: `${columnWidths.filename}px`}}/>
                        <col style={{width: `${columnWidths.title}px`}}/>
                        <col style={{width: `${columnWidths.artist}px`}}/>
                        <col style={{width: `${columnWidths.album}px`}}/>
                        <col style={{width: `${columnWidths.albumArtist}px`}}/>
                        <col style={{width: `${columnWidths.genre}px`}}/>
                        <col style={{width: `${columnWidths.year}px`}}/>
                        <col style={{width: `${columnWidths.track}px`}}/>
                        <col style={{width: `${columnWidths.composer}px`}}/>
                        <col style={{width: `${columnWidths.grouping}px`}}/>
                        <col style={{width: `${columnWidths.band}px`}}/>
                        <col style={{width: `${columnWidths.language}px`}}/>
                        <col style={{width: `${columnWidths.originalArtist}px`}}/>
                        <col style={{width: `${columnWidths.copyright}px`}}/>
                        <col style={{width: `${columnWidths.comment}px`}}/>
                        <col style={{width: `${columnWidths.lyrics}px`}}/>
                        {/* actions */}
                        <col style={{width: "120px"}}/>
                    </colgroup>
                    <thead
                        className="bg-surface-secondary/60 text-text-muted font-black uppercase tracking-wider border-b border-border">
                    <tr>
                        <th className="p-4 w-12 text-center select-none sticky top-0 bg-surface-secondary/95 backdrop-blur-md z-20">
                            <input
                                type="checkbox"
                                checked={files.length > 0 && selectedIds.length === files.length}
                                onChange={(e) => onSelectAll(e.target.checked)}
                                className="rounded border-border accent-primary text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                            />
                        </th>
                        <th className="p-4 w-16 text-center select-none sticky top-0 bg-surface-secondary/95 backdrop-blur-md z-20">Cover</th>

                        <th
                            onClick={() => handleSort("filename")}
                            className="p-4 group/header select-none cursor-pointer hover:bg-surface-secondary/80 animate-fade-in sticky top-0 bg-surface-secondary/95 backdrop-blur-md z-20"
                        >
                            <div className="flex items-center gap-1 justify-between pr-2">
                                <span className="truncate block">Filename</span>
                                {renderSortIcon("filename")}
                            </div>
                            <div
                                onMouseDown={(e) => handleResizeStart(e, "filename")}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize bg-border/20 group-hover/header:bg-primary/30 hover:bg-primary/60 active:bg-primary transition-colors z-10"
                            />
                        </th>

                        <th
                            onClick={() => handleSort("title")}
                            className="p-4 group/header select-none cursor-pointer hover:bg-surface-secondary/80 sticky top-0 bg-surface-secondary/95 backdrop-blur-md z-20"
                        >
                            <div className="flex items-center gap-1 justify-between pr-2">
                                <span className="truncate block">Title</span>
                                {renderSortIcon("title")}
                            </div>
                            <div
                                onMouseDown={(e) => handleResizeStart(e, "title")}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize bg-border/20 group-hover/header:bg-primary/30 hover:bg-primary/60 active:bg-primary transition-colors z-10"
                            />
                        </th>

                        <th
                            onClick={() => handleSort("artist")}
                            className="p-4 group/header select-none cursor-pointer hover:bg-surface-secondary/80 sticky top-0 bg-surface-secondary/95 backdrop-blur-md z-20"
                        >
                            <div className="flex items-center gap-1 justify-between pr-2">
                                <span className="truncate block">Artist(s)</span>
                                {renderSortIcon("artist")}
                            </div>
                            <div
                                onMouseDown={(e) => handleResizeStart(e, "artist")}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize bg-border/20 group-hover/header:bg-primary/30 hover:bg-primary/60 active:bg-primary transition-colors z-10"
                            />
                        </th>

                        <th
                            onClick={() => handleSort("album")}
                            className="p-4 group/header select-none cursor-pointer hover:bg-surface-secondary/80 sticky top-0 bg-surface-secondary/95 backdrop-blur-md z-20"
                        >
                            <div className="flex items-center gap-1 justify-between pr-2">
                                <span className="truncate block">Album</span>
                                {renderSortIcon("album")}
                            </div>
                            <div
                                onMouseDown={(e) => handleResizeStart(e, "album")}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize bg-border/20 group-hover/header:bg-primary/30 hover:bg-primary/60 active:bg-primary transition-colors z-10"
                            />
                        </th>

                        <th
                            onClick={() => handleSort("albumArtist")}
                            className="p-4 group/header select-none cursor-pointer hover:bg-surface-secondary/80 sticky top-0 bg-surface-secondary/95 backdrop-blur-md z-20"
                        >
                            <div className="flex items-center gap-1 justify-between pr-2">
                                <span className="truncate block">Album Artist</span>
                                {renderSortIcon("albumArtist")}
                            </div>
                            <div
                                onMouseDown={(e) => handleResizeStart(e, "albumArtist")}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize bg-border/20 group-hover/header:bg-primary/30 hover:bg-primary/60 active:bg-primary transition-colors z-10"
                            />
                        </th>

                        <th
                            onClick={() => handleSort("genre")}
                            className="p-4 group/header select-none cursor-pointer hover:bg-surface-secondary/80 sticky top-0 bg-surface-secondary/95 backdrop-blur-md z-20"
                        >
                            <div className="flex items-center gap-1 justify-between pr-2">
                                <span className="truncate block">Genre</span>
                                {renderSortIcon("genre")}
                            </div>
                            <div
                                onMouseDown={(e) => handleResizeStart(e, "genre")}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize bg-border/20 group-hover/header:bg-primary/30 hover:bg-primary/60 active:bg-primary transition-colors z-10"
                            />
                        </th>

                        <th
                            onClick={() => handleSort("year")}
                            className="p-4 group/header select-none cursor-pointer hover:bg-surface-secondary/80 sticky top-0 bg-surface-secondary/95 backdrop-blur-md z-20"
                        >
                            <div className="flex items-center gap-1 justify-between pr-2">
                                <span className="truncate block">Year</span>
                                {renderSortIcon("year")}
                            </div>
                            <div
                                onMouseDown={(e) => handleResizeStart(e, "year")}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize bg-border/20 group-hover/header:bg-primary/30 hover:bg-primary/60 active:bg-primary transition-colors z-10"
                            />
                        </th>

                        <th
                            onClick={() => handleSort("trackNumber")}
                            className="p-4 group/header select-none cursor-pointer hover:bg-surface-secondary/80 sticky top-0 bg-surface-secondary/95 backdrop-blur-md z-20"
                        >
                            <div className="flex items-center gap-1 justify-between pr-2">
                                <span className="truncate block">Track</span>
                                {renderSortIcon("trackNumber")}
                            </div>
                            <div
                                onMouseDown={(e) => handleResizeStart(e, "track")}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize bg-border/20 group-hover/header:bg-primary/30 hover:bg-primary/60 active:bg-primary transition-colors z-10"
                            />
                        </th>

                        <th
                            onClick={() => handleSort("composer")}
                            className="p-4 group/header select-none cursor-pointer hover:bg-surface-secondary/80 sticky top-0 bg-surface-secondary/95 backdrop-blur-md z-20"
                        >
                            <div className="flex items-center gap-1 justify-between pr-2">
                                <span className="truncate block">Composer</span>
                                {renderSortIcon("composer")}
                            </div>
                            <div
                                onMouseDown={(e) => handleResizeStart(e, "composer")}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize bg-border/20 group-hover/header:bg-primary/30 hover:bg-primary/60 active:bg-primary transition-colors z-10"
                            />
                        </th>

                        <th
                            onClick={() => handleSort("grouping")}
                            className="p-4 group/header select-none cursor-pointer hover:bg-surface-secondary/80 sticky top-0 bg-surface-secondary/95 backdrop-blur-md z-20"
                        >
                            <div className="flex items-center gap-1 justify-between pr-2">
                                <span className="truncate block">Grouping</span>
                                {renderSortIcon("grouping")}
                            </div>
                            <div
                                onMouseDown={(e) => handleResizeStart(e, "grouping")}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize bg-border/20 group-hover/header:bg-primary/30 hover:bg-primary/60 active:bg-primary transition-colors z-10"
                            />
                        </th>

                        <th
                            onClick={() => handleSort("band")}
                            className="p-4 group/header select-none cursor-pointer hover:bg-surface-secondary/80 sticky top-0 bg-surface-secondary/95 backdrop-blur-md z-20"
                        >
                            <div className="flex items-center gap-1 justify-between pr-2">
                                <span className="truncate block">Band</span>
                                {renderSortIcon("band")}
                            </div>
                            <div
                                onMouseDown={(e) => handleResizeStart(e, "band")}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize bg-border/20 group-hover/header:bg-primary/30 hover:bg-primary/60 active:bg-primary transition-colors z-10"
                            />
                        </th>

                        <th
                            onClick={() => handleSort("language")}
                            className="p-4 group/header select-none cursor-pointer hover:bg-surface-secondary/80 sticky top-0 bg-surface-secondary/95 backdrop-blur-md z-20"
                        >
                            <div className="flex items-center gap-1 justify-between pr-2">
                                <span className="truncate block">Language</span>
                                {renderSortIcon("language")}
                            </div>
                            <div
                                onMouseDown={(e) => handleResizeStart(e, "language")}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize bg-border/20 group-hover/header:bg-primary/30 hover:bg-primary/60 active:bg-primary transition-colors z-10"
                            />
                        </th>

                        <th
                            onClick={() => handleSort("originalArtist")}
                            className="p-4 group/header select-none cursor-pointer hover:bg-surface-secondary/80 sticky top-0 bg-surface-secondary/95 backdrop-blur-md z-20"
                        >
                            <div className="flex items-center gap-1 justify-between pr-2">
                                <span className="truncate block">Original Artist</span>
                                {renderSortIcon("originalArtist")}
                            </div>
                            <div
                                onMouseDown={(e) => handleResizeStart(e, "originalArtist")}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize bg-border/20 group-hover/header:bg-primary/30 hover:bg-primary/60 active:bg-primary transition-colors z-10"
                            />
                        </th>

                        <th className="p-4 group/header select-none sticky top-0 bg-surface-secondary/95 backdrop-blur-md z-20">
                            <span className="truncate block pr-2">Copyright</span>
                            <div
                                onMouseDown={(e) => handleResizeStart(e, "copyright")}
                                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize bg-border/20 group-hover/header:bg-primary/30 hover:bg-primary/60 active:bg-primary transition-colors z-10"
                            />
                        </th>

                        <th className="p-4 group/header select-none sticky top-0 bg-surface-secondary/95 backdrop-blur-md z-20">
                            <span className="truncate block pr-2">Comment</span>
                            <div
                                onMouseDown={(e) => handleResizeStart(e, "comment")}
                                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize bg-border/20 group-hover/header:bg-primary/30 hover:bg-primary/60 active:bg-primary transition-colors z-10"
                            />
                        </th>

                        <th className="p-4 group/header select-none sticky top-0 bg-surface-secondary/95 backdrop-blur-md z-20">
                            <span className="truncate block pr-2">Lyrics</span>
                            <div
                                onMouseDown={(e) => handleResizeStart(e, "lyrics")}
                                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize bg-border/20 group-hover/header:bg-primary/30 hover:bg-primary/60 active:bg-primary transition-colors z-10"
                            />
                        </th>

                        <th className="p-4 w-32 text-center select-none sticky top-0 bg-surface-secondary/95 backdrop-blur-md z-20">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {sortedFiles.map((item, index) => {
                        const isMp3 = item.format === "mp3" || item.file.name.endsWith(".mp3");
                        const isSelected = selectedIds.includes(item.id);

                        return (
                            <tr
                                key={item.id}
                                className={`group hover:bg-surface/60 border-b border-border/50 transition-colors duration-150 ${
                                    isSelected ? "bg-primary/5 hover:bg-primary/10" : index % 2 === 0 ? "bg-surface/40" : "bg-surface-secondary/30"
                                }`}
                            >
                                {/* Checkbox select */}
                                <td className={`p-4 text-center border-l-4 ${item.isModified ? "border-l-warning" : "border-l-transparent"} transition-all duration-150`}>
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => onSelectRow(item.id, e.target.checked)}
                                        className="rounded border-border accent-primary text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                                    />
                                </td>

                                {/* Small Cover art (clickable to edit) */}
                                <td className="p-4 text-center">
                                    <div className="flex items-center justify-center">
                                        <div
                                            onClick={() => gridCoverRefs.current[item.id]?.click()}
                                            className="relative w-9 h-9 rounded-md border border-border overflow-hidden bg-surface-secondary flex items-center justify-center cursor-pointer group shadow-xs"
                                            title={item.coverArtUrl && !imageErrors[item.id] ? "Click to change cover" : "Click to add cover"}
                                        >
                                            {item.coverArtUrl && !imageErrors[item.id] ? (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img
                                                    src={item.coverArtUrl}
                                                    alt="Artwork"
                                                    onError={() => setImageErrors(prev => ({...prev, [item.id]: true}))}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <Image20Regular className="w-5 h-5 text-text-muted/40"/>
                                            )}
                                            <div
                                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                                <Add20Regular className="w-5 h-5 text-white"/>
                                            </div>
                                        </div>
                                        <input
                                            type="file"
                                            ref={el => {
                                                gridCoverRefs.current[item.id] = el;
                                            }}
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    setImageErrors(prev => ({...prev, [item.id]: false}));
                                                    onCoverChange(item.id, e.target.files[0]);
                                                }
                                            }}
                                            accept="image/jpeg,image/png,image/webp"
                                            className="hidden"
                                        />
                                    </div>
                                </td>

                                {/* Original Filename */}
                                <td className="p-4 max-w-xs truncate font-medium text-text-secondary"
                                    title={item.file.name}>
                                    <div className="flex items-center gap-1.5">
                                        {item.error && (
                                            <ErrorCircle20Regular className="w-4 h-4 text-danger shrink-0 animate-pulse"
                                                                  title={`Error: ${item.error}`}/>
                                        )}
                                        <span className="truncate">{item.file.name}</span>
                                    </div>
                                </td>

                                {/* Title Input */}
                                <td className="p-3">
                                    <TableInputField
                                        value={item.title}
                                        disabled={!isMp3}
                                        onChange={(val) => onUpdateField(item.id, "title", val)}
                                    />
                                </td>

                                {/* Artist Input */}
                                <td className="p-3">
                                    <TableInputField
                                        value={item.artist}
                                        disabled={!isMp3}
                                        onChange={(val) => onUpdateField(item.id, "artist", val)}
                                    />
                                </td>

                                {/* Album Input */}
                                <td className="p-3">
                                    <TableInputField
                                        value={item.album}
                                        disabled={!isMp3}
                                        onChange={(val) => onUpdateField(item.id, "album", val)}
                                    />
                                </td>

                                {/* Album Artist Input */}
                                <td className="p-3">
                                    <TableInputField
                                        value={item.albumArtist}
                                        disabled={!isMp3}
                                        onChange={(val) => onUpdateField(item.id, "albumArtist", val)}
                                    />
                                </td>

                                {/* Genre Input */}
                                <td className="p-3">
                                    <TableInputField
                                        value={item.genre}
                                        disabled={!isMp3}
                                        onChange={(val) => onUpdateField(item.id, "genre", val)}
                                    />
                                </td>

                                {/* Year Input */}
                                <td className="p-3">
                                    <TableInputField
                                        value={item.year}
                                        disabled={!isMp3}
                                        onChange={(val) => onUpdateField(item.id, "year", val)}
                                    />
                                </td>

                                {/* Track Input */}
                                <td className="p-3">
                                    <div className="flex items-center gap-1">
                                        <TableInputField
                                            value={item.trackNumber}
                                            disabled={!isMp3}
                                            placeholder="#"
                                            onChange={(val) => onUpdateField(item.id, "trackNumber", val)}
                                            containerClassName="w-12"
                                            textCenter
                                        />
                                        <span className="text-text-muted">/</span>
                                        <TableInputField
                                            value={item.trackTotal}
                                            disabled={!isMp3}
                                            placeholder="N"
                                            onChange={(val) => onUpdateField(item.id, "trackTotal", val)}
                                            containerClassName="w-12"
                                            textCenter
                                        />
                                    </div>
                                </td>

                                {/* Composer Input */}
                                <td className="p-3">
                                    <TableInputField
                                        value={item.composer}
                                        disabled={!isMp3}
                                        onChange={(val) => onUpdateField(item.id, "composer", val)}
                                    />
                                </td>

                                {/* Grouping Input */}
                                <td className="p-3">
                                    <TableInputField
                                        value={item.grouping}
                                        disabled={!isMp3}
                                        onChange={(val) => onUpdateField(item.id, "grouping", val)}
                                    />
                                </td>

                                {/* Band Input */}
                                <td className="p-3">
                                    <TableInputField
                                        value={item.band}
                                        disabled={!isMp3}
                                        onChange={(val) => onUpdateField(item.id, "band", val)}
                                    />
                                </td>

                                {/* Language Input */}
                                <td className="p-3">
                                    <TableInputField
                                        value={item.language}
                                        disabled={!isMp3}
                                        onChange={(val) => onUpdateField(item.id, "language", val)}
                                    />
                                </td>

                                {/* Original Artist Input */}
                                <td className="p-3">
                                    <TableInputField
                                        value={item.originalArtist}
                                        disabled={!isMp3}
                                        onChange={(val) => onUpdateField(item.id, "originalArtist", val)}
                                    />
                                </td>

                                {/* Copyright Input */}
                                <td className="p-3">
                                    <TableInputField
                                        value={item.copyright}
                                        disabled={!isMp3}
                                        onChange={(val) => onUpdateField(item.id, "copyright", val)}
                                    />
                                </td>

                                {/* Comment Input */}
                                <td className="p-3">
                                    <TableInputField
                                        value={item.comment}
                                        disabled={!isMp3}
                                        onChange={(val) => onUpdateField(item.id, "comment", val)}
                                    />
                                </td>

                                {/* Lyrics Input */}
                                <td className="p-3">
                                    <TableInputField
                                        value={item.lyrics}
                                        disabled={!isMp3}
                                        onChange={(val) => onUpdateField(item.id, "lyrics", val)}
                                    />
                                </td>

                                {/* Action Column */}
                                <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        {item.isSaving ? (
                                            <div
                                                className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <button
                                                onClick={() => onDownload(item.id)}
                                                className="p-1.5 rounded-lg border border-border bg-surface text-text-secondary hover:text-primary hover:border-primary/50 cursor-pointer transition-colors"
                                                title="Download this file"
                                            >
                                                <ArrowDownload20Regular className="w-3.5 h-3.5"/>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => onRemoveFile(item.id)}
                                            className="p-1.5 rounded-lg border border-border bg-surface text-text-secondary hover:text-danger hover:border-danger/50 cursor-pointer transition-colors"
                                            title="Remove file from list"
                                        >
                                            <Delete20Regular className="w-3.5 h-3.5"/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>

            {/* FLOATING ACTION BOTTOM BAR */}
            <div
                className="border border-border bg-surface/80 backdrop-blur-md rounded-3xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4 sticky bottom-4">
                <div className="text-xs font-bold text-text-secondary min-w-50">
                    {zipProgress ? (
                        <div className="flex flex-col gap-1.5 w-full">
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-extrabold text-primary animate-pulse flex items-center gap-1.5">
                                    <span
                                        className="w-2.5 h-2.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                                    {zipProgress.stage === "writing" ? "Writing metadata tags..." : "Creating ZIP archive..."}
                                </span>
                                <span className="text-[10px] text-text-muted">
                                    {zipProgress.stage === "writing"
                                        ? `${zipProgress.current} / ${zipProgress.total} files`
                                        : `${zipProgress.current}%`
                                    }
                                </span>
                            </div>
                            <div className="w-full h-1 bg-surface rounded-full overflow-hidden border border-border">
                                <div
                                    className="bg-primary h-full transition-all duration-300 rounded-full"
                                    style={{
                                        width: `${zipProgress.stage === "writing"
                                            ? (zipProgress.current / zipProgress.total) * 100
                                            : zipProgress.current}%`
                                    }}
                                />
                            </div>
                        </div>
                    ) : downloadSuccess ? (
                        <span className="font-extrabold text-success flex items-center gap-1.5 text-xs animate-fade-in">
                            <CheckmarkCircle20Regular className="w-4 h-4 text-success"/>
                            ZIP downloaded successfully!
                        </span>
                    ) : selectedIds.length === 0 ? (
                        <span>No files selected. Click checkbox to select.</span>
                    ) : (
                        <span>{selectedIds.length} of {files.length} files selected</span>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {selectedIds.length > 0 && (
                        <button
                            onClick={() => {
                                if (selectedIds.length === 1) {
                                    onDownload(selectedIds[0]);
                                } else {
                                    onDownloadZip(selectedIds);
                                }
                            }}
                            disabled={!!zipProgress}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold text-white bg-primary hover:bg-primary-hover cursor-pointer transition-colors duration-200 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ArrowDownload20Regular className="w-4 h-4"/>
                            {selectedIds.length === 1 ? "Download Selected" : "Download Selected (ZIP)"}
                        </button>
                    )}

                    <button
                        onClick={() => onDownloadZip(files.map(f => f.id))}
                        disabled={!!zipProgress}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold text-white bg-primary hover:bg-primary-hover cursor-pointer transition-colors duration-200 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <ArrowDownload20Regular className="w-4 h-4"/>
                        Download All (ZIP)
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ============================================================================
   CUSTOM AUDIO PLAYER COMPONENT
   ============================================================================ */
interface CustomAudioPlayerProps {
    src: string;
    title: string;
    artist: string;
}

function CustomAudioPlayer({src, title, artist}: CustomAudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        setIsPlaying(false);
        setCurrentTime(0);
    }, [src]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleDurationChange = () => setDuration(audio.duration || 0);
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener("timeupdate", handleTimeUpdate);
        audio.addEventListener("durationchange", handleDurationChange);
        audio.addEventListener("play", handlePlay);
        audio.addEventListener("pause", handlePause);
        audio.addEventListener("ended", handleEnded);

        return () => {
            audio.removeEventListener("timeupdate", handleTimeUpdate);
            audio.removeEventListener("durationchange", handleDurationChange);
            audio.removeEventListener("play", handlePlay);
            audio.removeEventListener("pause", handlePause);
            audio.removeEventListener("ended", handleEnded);
        };
    }, [src]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(err => console.error("Play failed:", err));
        }
    };

    const toggleMute = () => {
        if (!audioRef.current) return;
        audioRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!audioRef.current) return;
        const time = parseFloat(e.target.value);
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    };

    const formatTime = (secs: number) => {
        if (isNaN(secs)) return "0:00";
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    return (
        <div className="bg-surface/60 border border-border/80 rounded-2xl p-4 shadow-inner space-y-3">
            <audio ref={audioRef} src={src || undefined} preload="metadata"/>

            {/* Title / Artist details */}
            <div className="text-left">
                <div className="text-xs font-black text-text-primary truncate">{title || "Unknown Title"}</div>
                <div className="text-[10px] text-text-muted truncate">{artist || "Unknown Artist"}</div>
            </div>

            {/* Controls Row */}
            <div className="flex items-center gap-3">
                {/* Play/Pause Button */}
                <button
                    onClick={togglePlay}
                    className="w-10 h-10 shrink-0 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                >
                    {isPlaying ? (
                        <Pause20Filled className="w-5 h-5"/>
                    ) : (
                        <Play20Filled className="w-5 h-5 translate-x-0.5"/>
                    )}
                </button>

                {/* Progress bar and Time */}
                <div className="flex-1 space-y-1">
                    <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleProgressChange}
                        className="w-full accent-primary h-1 rounded-lg appearance-none cursor-pointer"
                        style={{
                            background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${
                                duration ? (currentTime / duration) * 100 : 0
                            }%, var(--surface-secondary) ${
                                duration ? (currentTime / duration) * 100 : 0
                            }%, var(--surface-secondary) 100%)`
                        }}
                    />
                    <div className="flex items-center justify-between text-[9px] text-text-muted font-bold font-mono">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Mute Button */}
                <button
                    onClick={toggleMute}
                    className="p-2 text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
                >
                    {isMuted ? (
                        <SpeakerMute20Regular className="w-5 h-5 text-primary"/>
                    ) : (
                        <Speaker220Regular className="w-5 h-5 text-text-secondary"/>
                    )}
                </button>
            </div>
        </div>
    );
}
