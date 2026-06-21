"use client";

import React, {useState, useRef, useMemo, useCallback, useEffect} from "react";
import {useRouter} from "next/navigation";
import {
    ArrowLeft20Regular,
    Copy20Regular,
    Dismiss20Regular,
    ArrowSwap20Regular,
    Document20Regular,
    ItemCompare20Regular,
    DocumentArrowUp20Regular
} from "@fluentui/react-icons";
import {Tool} from "@/types/tool";
import {diffLines, diffWords} from "diff";

interface TextDiffViewProps {
    tool: Tool;
}

interface DiffLineData {
    lineNumber: number;
    content: string;
    type: "added" | "removed" | "modified" | "unchanged";
    words?: any[];
}

interface AlignedRow {
    type: "added" | "removed" | "modified" | "unchanged";
    left?: DiffLineData;
    right?: DiffLineData;
}

// Preset samples for quick testing
const SAMPLES = {
    code: {
        name: "TypeScript React Component",
        original: `import React from 'react';

// A simple button component
export function CustomButton({ label, onClick }) {
    return (
        <button onClick={onClick} className="btn-primary">
            {label}
        </button>
    );
}`,
        modified: `import React, { useMemo } from 'react';
        
interface ButtonProps {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: 'primary' | 'secondary';
}
        
// A highly optimized button component with variant options
export function CustomButton({
    label,
    onClick,
    disabled = false,
    variant = 'primary'
}: ButtonProps) {
    const btnClass = useMemo(() => {
        const base = "px-4 py-2 rounded-lg font-medium transition-all duration-200 cursor-pointer";
        return variant === 'primary'
            ? \`\${base} bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm\`
            : \`\${base} bg-stone-200 hover:bg-stone-300 text-stone-800\`;
    }, [variant]);
        
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={\`\${btnClass} disabled:opacity-50 disabled:cursor-not-allowed\`}
        >
            {label}
        </button>
    );
}`
    },
    json: {
        name: "JSON Configuration",
        original: `{
    "appName": "Craft Tools",
    "version": "1.0.0",
    "features": {
        "darkMode": true,
        "offlineSupport": false,
        "analyticsEnabled": true
    },
    "maxUploadSizeMb": 10
}`,
        modified: `{
    "appName": "Craft Ultimate Tools",
    "version": "1.1.0",
    "features": {
        "darkMode": true,
        "offlineSupport": true,
        "analyticsEnabled": false
    },
    "maxUploadSizeMb": 25,
    "allowedFormats": [
        ".png",
        ".jpg",
        ".pdf",
        ".txt",
        ".json"
    ]
}`
    },
    text: {
        name: "Plain Text Release Notes",
        original: `Welcome to Craft v1.0. This release features support for several text conversion tools and a simple character counter. We hope these utilities help speed up your workflow. Let us know if you find any bugs or have any feature suggestions.`,
        modified: `Welcome to Craft v1.1! This release introduces our brand new Text Difference Viewer with real-time highlights, word-level changes, and Git-style comparison modes. We have also added support for uploading files and syncing textareas. Please share your feedback and bug reports with us.`
    }
};

interface DiffEditorProps {
    title: string;
    type: "original" | "modified";
    value: string;
    onChange: (val: string) => void;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    gutterRef: React.RefObject<HTMLDivElement | null>;
    onScroll: () => void;
    isLineWrap: boolean;
    placeholder: string;
    onClear: () => void;
    onCopy: () => void;
    isCopied: boolean;
    lines: number[];
}

// Shared styling constants for buttons to eliminate code duplication
const BTN_BASE = "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-200 cursor-pointer flex items-center gap-1.5";
const BTN_ACTIVE = "bg-primary/10 border-primary/20 text-primary";
const BTN_INACTIVE = "bg-surface border-border text-text-secondary hover:border-primary hover:text-primary";
const BTN_SECONDARY = `${BTN_BASE} border-border bg-surface text-text-secondary hover:border-primary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed`;
const BTN_DANGER = "px-3 py-1.5 rounded-lg text-xs font-bold border border-border bg-surface text-text-secondary hover:border-danger hover:text-danger hover:bg-danger-bg/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-200";
const BTN_PRESET = "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-surface text-[10px] font-bold text-text-secondary hover:border-primary hover:text-primary transition-all duration-200 cursor-pointer";
const BTN_TAB_BASE = "px-3 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all duration-200";
const BTN_ICON_BASE = "p-1 rounded-md text-text-muted disabled:opacity-40 cursor-pointer transition-colors";

const PRESET_OPTIONS = [
    { key: "code" as const, label: "Component" },
    { key: "json" as const, label: "JSON Conf" },
    { key: "text" as const, label: "Prose Text" }
];

const DIFF_MODES = [
    { key: "split" as const, label: "Split View" },
    { key: "unified" as const, label: "Unified View" }
];

function DiffEditor({
                        title,
                        type,
                        value,
                        onChange,
                        textareaRef,
                        gutterRef,
                        onScroll,
                        isLineWrap,
                        placeholder,
                        onClear,
                        onCopy,
                        isCopied,
                        lines
                    }: DiffEditorProps) {
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            onChange(text);
        };
        reader.readAsText(file);
        e.target.value = "";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                onChange(text);
            };
            reader.readAsText(file);
        }
    };

    const lineCount = lines.length;

    return (
        <div
            className="flex flex-col border border-border bg-surface/50 backdrop-blur-md rounded-2xl shadow-xs overflow-hidden h-125 sm:h-100"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div
                className="flex items-center justify-between px-4 py-3 bg-surface-secondary/40 border-b border-border/60">
                <div className="flex items-center gap-2">
                    <span
                        className={`w-2.5 h-2.5 rounded-full ${type === "original" ? "bg-danger/80" : "bg-success/80"}`}/>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-text-primary">
                        {title}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {/* File Upload Selector */}
                    <label className={BTN_PRESET}>
                        <DocumentArrowUp20Regular className="w-3.5 h-3.5"/>
                        Load File
                        <input
                            type="file"
                            accept=".txt,.json,.js,.ts,.html,.css,.md"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                    </label>
                    <button
                        onClick={onCopy}
                        disabled={!value}
                        className={`${BTN_ICON_BASE} hover:text-primary`}
                        title={`Copy ${title}`}
                    >
                        {isCopied ? (
                            <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                 strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                            </svg>
                        ) : (
                            <Copy20Regular className="w-4 h-4"/>
                        )}
                    </button>
                    <button
                        onClick={onClear}
                        disabled={!value}
                        className={`${BTN_ICON_BASE} hover:text-danger`}
                        title={`Clear ${title}`}
                    >
                        <Dismiss20Regular className="w-4 h-4"/>
                    </button>
                </div>
            </div>

            {/* Textarea container with gutter */}
            <div className="relative flex-1 min-h-0">
                <div
                    ref={gutterRef}
                    className="absolute left-0 top-0 bottom-0 w-12 select-none text-right pr-3 pt-3 bg-surface border-r border-border/80 text-text-muted/40 font-mono text-[11px] leading-6 overflow-hidden pointer-events-none z-10"
                >
                    {lines.map((n) => (
                        <div key={n} className="h-6 pr-0.5">
                            {n}
                        </div>
                    ))}
                </div>
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onScroll={onScroll}
                    placeholder={placeholder}
                    className="w-full h-full pl-15 pr-4 py-3 bg-transparent font-mono text-sm leading-6 resize-none outline-none border-none overflow-y-auto text-text-primary placeholder:text-text-muted/40 select-text"
                    style={{whiteSpace: isLineWrap ? "pre-wrap" : "pre"}}
                    spellCheck="false"
                />
            </div>

            {/* Bottom stats summary */}
            <div
                className="flex items-center justify-between border-t border-border/60 bg-surface-secondary/40 px-4 py-2 text-[10px] font-bold text-text-muted tracking-wide">
                <span>{value ? lineCount : 0} Lines</span>
                <span>{value.length} Characters</span>
            </div>
        </div>
    );
}

function renderWordDiff(side: "left" | "right", words?: any[], fallbackContent: string = "") {
    if (!words) return fallbackContent;

    return words.map((part, pIdx) => {
        if (side === "left" && part.added) return null;
        if (side === "right" && part.removed) return null;

        const isHighlight = side === "left" ? part.removed : part.added;
        const hlClass = isHighlight
            ? side === "left"
                ? "bg-danger/25 text-danger font-semibold rounded-xs px-0.5 border border-danger/20"
                : "bg-success/25 text-success font-semibold rounded-xs px-0.5 border border-success/20"
            : "";

        return (
            <span key={pIdx} className={hlClass}>
                {part.value}
            </span>
        );
    });
}

interface SplitCellProps {
    side: "left" | "right";
    lineData?: DiffLineData;
    gutterClass: string;
    bgClass: string;
    sign: string;
    style?: React.CSSProperties;
    isLineWrap: boolean;
    borderRight?: boolean;
}

function SplitCell({
    side,
    lineData,
    gutterClass,
    bgClass,
    sign,
    style,
    isLineWrap,
    borderRight = false
}: SplitCellProps) {
    return (
        <div
            className={`w-[50%] flex shrink-0 ${borderRight ? "border-r border-border/30" : ""} ${bgClass}`}
            style={style}
        >
            <div className={`w-11 shrink-0 select-none text-right pr-2.5 py-0.5 border-r font-mono text-[10px] leading-6 ${gutterClass}`}>
                {lineData ? lineData.lineNumber : ""}
            </div>
            <div className="w-5 shrink-0 select-none text-center py-0.5 font-mono text-[11px] leading-6 text-text-muted/30">
                {sign}
            </div>
            <div className={`flex-1 py-0.5 px-2.5 overflow-x-auto whitespace-pre font-mono text-xs leading-6 ${
                isLineWrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"
            }`}>
                {lineData ? (
                    renderWordDiff(side, lineData.words, lineData.content)
                ) : (
                    <span className="text-transparent"> </span>
                )}
            </div>
        </div>
    );
}

interface UnifiedLineProps {
    leftLineNum?: number;
    rightLineNum?: number;
    sign: string;
    containerClass: string;
    leftGutterClass: string;
    rightGutterClass: string;
    signClass: string;
    contentClass: string;
    isLineWrap: boolean;
    children: React.ReactNode;
}

function UnifiedLine({
    leftLineNum,
    rightLineNum,
    sign,
    containerClass,
    leftGutterClass,
    rightGutterClass,
    signClass,
    contentClass,
    isLineWrap,
    children
}: UnifiedLineProps) {
    return (
        <div className={`flex transition-colors ${containerClass}`}>
            <div className={`w-11 shrink-0 select-none text-right pr-2.5 py-0.5 border-r font-mono text-[10px] leading-6 ${leftGutterClass}`}>
                {leftLineNum !== undefined ? leftLineNum : ""}
            </div>
            <div className={`w-11 shrink-0 select-none text-right pr-2.5 py-0.5 border-r font-mono text-[10px] leading-6 ${rightGutterClass}`}>
                {rightLineNum !== undefined ? rightLineNum : ""}
            </div>
            <div className={`w-5 shrink-0 select-none text-center py-0.5 font-mono text-[11px] leading-6 ${signClass}`}>
                {sign}
            </div>
            <div className={`flex-1 py-0.5 px-3 overflow-x-auto whitespace-pre text-text-primary ${contentClass} ${
                isLineWrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"
            }`}>
                {children}
            </div>
        </div>
    );
}

export function TextDiffView({tool}: TextDiffViewProps) {
    const router = useRouter();

    // State for editable inputs
    const [originalText, setOriginalText] = useState("");
    const [modifiedText, setModifiedText] = useState("");

    // UI preferences
    const [isLineWrap, setIsLineWrap] = useState(false);
    const [diffMode, setDiffMode] = useState<"split" | "unified">("split");
    const [showInputs, setShowInputs] = useState(true);

    // Success indicator for copy actions
    const [copyState, setCopyState] = useState<{ [key: string]: boolean }>({
        original: false,
        modified: false
    });

    // Refs for scroll synchronization in Editors
    const origTextareaRef = useRef<HTMLTextAreaElement>(null);
    const origGutterRef = useRef<HTMLDivElement>(null);
    const modTextareaRef = useRef<HTMLTextAreaElement>(null);
    const modGutterRef = useRef<HTMLDivElement>(null);

    // Sync original editor gutter scroll
    const handleOrigScroll = useCallback(() => {
        if (origGutterRef.current && origTextareaRef.current) {
            origGutterRef.current.scrollTop = origTextareaRef.current.scrollTop;
        }
    }, []);

    // Sync modified editor gutter scroll
    const handleModScroll = useCallback(() => {
        if (modGutterRef.current && modTextareaRef.current) {
            modGutterRef.current.scrollTop = modTextareaRef.current.scrollTop;
        }
    }, []);


    // Swap content option
    const handleSwap = useCallback(() => {
        setOriginalText((prevOrig) => {
            setModifiedText(prevOrig);
            return modifiedText;
        });
    }, [modifiedText]);

    // Cleaners
    const handleClear = useCallback((target: "original" | "modified" | "both") => {
        if (target === "original" || target === "both") {
            setOriginalText("");
            origTextareaRef.current?.focus();
        }
        if (target === "modified" || target === "both") {
            setModifiedText("");
            modTextareaRef.current?.focus();
        }
    }, []);

    // Clipboard Copiers
    const triggerCopyAlert = (key: string) => {
        setCopyState((prev) => ({...prev, [key]: true}));
        setTimeout(() => {
            setCopyState((prev) => ({...prev, [key]: false}));
        }, 2000);
    };

    const handleCopyInput = useCallback(async (text: string, key: string) => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            triggerCopyAlert(key);
        } catch (err) {
            console.error("Clipboard copy failed:", err);
        }
    }, []);

    // Load Preset
    const handleLoadSample = (key: keyof typeof SAMPLES) => {
        setOriginalText(SAMPLES[key].original);
        setModifiedText(SAMPLES[key].modified);
    };


    // Memoize aligned diff data calculation for performance
    const diffResult = useMemo(() => {
        const {rows, stats} = computeAlignedDiff(originalText, modifiedText);
        return {rows, stats};
    }, [originalText, modifiedText]);

    const {rows, stats} = diffResult;


    // Sync vertical scroll for the editors whenever heights or contents adjust
    useEffect(() => {
        handleOrigScroll();
        handleModScroll();
    }, [originalText, modifiedText, isLineWrap, handleOrigScroll, handleModScroll]);

    // Gutter Line Numbers Builder
    const getLineNumbersList = (textStr: string) => {
        const count = Math.max(1, textStr.split(/\r?\n/).length);
        return Array.from({length: count}, (_, i) => i + 1);
    };

    const originalLines = useMemo(() => getLineNumbersList(originalText), [originalText]);
    const modifiedLines = useMemo(() => getLineNumbersList(modifiedText), [modifiedText]);

    // Style for aligned spacer pattern
    const spacerStyle = {
        backgroundImage: "repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(148, 163, 184, 0.05) 8px, rgba(148, 163, 184, 0.05) 16px)"
    };

    return (
        <div className="w-full flex-1 bg-background relative overflow-hidden">
            {/* Background Glow */}
            <div
                className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-125 rounded-full blur-[120px] opacity-10 dark:opacity-15 bg-radial from-primary/50 to-transparent pointer-events-none"
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10 space-y-6">
                {/* Back Link */}
                <button
                    onClick={() => router.push("/")}
                    className="inline-flex items-center gap-2 text-xs font-bold text-text-muted hover:text-primary transition-colors duration-200 cursor-pointer group"
                >
                    <ArrowLeft20Regular
                        className="w-4 h-4 transform transition-transform duration-300 group-hover:-translate-x-0.5"
                    />
                    Back to All Tools
                </button>

                {/* Header Title Block */}
                <div
                    className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-6 gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                            <span
                                className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                                <ItemCompare20Regular className="w-4 h-4"/>
                            </span>
                            <h1 className="text-xl sm:text-2xl font-black text-text-primary">
                                {tool.title}
                            </h1>
                        </div>
                        <p className="text-xs sm:text-sm text-text-muted">
                            {tool.description}
                        </p>
                    </div>

                    {/* Quick Presets Dropdown */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                            Try Samples:
                        </span>
                        {PRESET_OPTIONS.map((preset) => (
                            <button
                                key={preset.key}
                                onClick={() => handleLoadSample(preset.key)}
                                className={BTN_PRESET}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Global Toolbar Bar */}
                <div
                    className="flex flex-wrap items-center justify-between gap-4 bg-surface/40 backdrop-blur-md border border-border/80 rounded-2xl p-4">
                    {/* Left: View Controls */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowInputs(!showInputs)}
                            className={`${BTN_BASE} ${showInputs ? BTN_ACTIVE : BTN_INACTIVE}`}
                        >
                            <Document20Regular className="w-3.5 h-3.5"/>
                            {showInputs ? "Hide Editors" : "Show Editors"}
                        </button>

                        <span className="w-px h-5 bg-border mx-1"/>

                        <div className="flex bg-surface border border-border rounded-lg p-0.5">
                            {DIFF_MODES.map((mode) => (
                                <button
                                    key={mode.key}
                                    onClick={() => setDiffMode(mode.key)}
                                    className={`${BTN_TAB_BASE} ${
                                        diffMode === mode.key
                                            ? "bg-primary text-white shadow-xs"
                                            : "text-text-secondary hover:text-primary"
                                    }`}
                                >
                                    {mode.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right: Functional Toggles */}
                    <div className="flex items-center gap-3">
                        {/* Swap Option */}
                        <button
                            onClick={handleSwap}
                            disabled={!originalText && !modifiedText}
                            className={BTN_SECONDARY}
                            title="Swap original and modified text"
                        >
                            <ArrowSwap20Regular className="w-3.5 h-3.5"/>
                            <span className="text-[10px] uppercase">Swap</span>
                        </button>

                        {/* Line Wrap Toggle */}
                        <button
                            onClick={() => setIsLineWrap(!isLineWrap)}
                            className={`${BTN_BASE} ${isLineWrap ? BTN_ACTIVE : BTN_INACTIVE}`}
                        >
                            <span className="text-[10px] uppercase">Wrap</span>
                            <span className={`w-2 h-2 rounded-full ${isLineWrap ? "bg-primary" : "bg-text-muted/40"}`}/>
                        </button>

                        {/* Clear All */}
                        <button
                            onClick={() => handleClear("both")}
                            disabled={!originalText && !modifiedText}
                            className={BTN_DANGER}
                        >
                            Clear All
                        </button>
                    </div>
                </div>

                {/* Inputs Block (Collapsible) */}
                {showInputs && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
                        <DiffEditor
                            title="Original Text"
                            type="original"
                            value={originalText}
                            onChange={setOriginalText}
                            textareaRef={origTextareaRef}
                            gutterRef={origGutterRef}
                            onScroll={handleOrigScroll}
                            isLineWrap={isLineWrap}
                            placeholder="Paste or drag-and-drop the original text here..."
                            onClear={() => handleClear("original")}
                            onCopy={() => handleCopyInput(originalText, "original")}
                            isCopied={copyState.original}
                            lines={originalLines}
                        />

                        <DiffEditor
                            title="Modified Text"
                            type="modified"
                            value={modifiedText}
                            onChange={setModifiedText}
                            textareaRef={modTextareaRef}
                            gutterRef={modGutterRef}
                            onScroll={handleModScroll}
                            isLineWrap={isLineWrap}
                            placeholder="Paste or drag-and-drop the modified/newer text here..."
                            onClear={() => handleClear("modified")}
                            onCopy={() => handleCopyInput(modifiedText, "modified")}
                            isCopied={copyState.modified}
                            lines={modifiedLines}
                        />
                    </div>
                )}

                {/* Differences View Output Block */}
                <div
                    className="border border-border bg-surface backdrop-blur-md rounded-2xl shadow-xs overflow-hidden flex flex-col">
                    {/* Header */}
                    <div
                        className="flex items-center justify-between px-4 py-3 bg-surface-secondary/50 border-b border-border/60">
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-primary"/>
                                <h2 className="text-xs font-extrabold uppercase tracking-wider text-text-primary">
                                    Real-Time Difference Output
                                    ({diffMode === "split" ? "Split side-by-side" : "Unified inline"})
                                </h2>
                            </div>
                            {(originalText || modifiedText) && (
                                <div
                                    className="flex items-center gap-1.5 select-none text-[10px] font-extrabold font-mono tracking-wider">
                                    <span
                                        className="px-2 py-0.5 rounded-md bg-success-bg text-success border border-success/10">
                                        +{stats.additions + stats.modified} Additions
                                    </span>
                                    <span
                                        className="px-2 py-0.5 rounded-md bg-danger-bg text-danger border border-danger/10">
                                        -{stats.removals + stats.modified} Deletions
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Render Area */}
                    <div className="flex-1 min-h-125 max-h-237.5 overflow-y-auto bg-surface relative select-text">
                        {rows.length === 0 ? (
                            <div
                                className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-surface-secondary/10">
                                <ItemCompare20Regular className="w-10 h-10 text-text-muted/30"/>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-text-secondary">
                                        No Comparison Content
                                    </p>
                                    <p className="text-xs text-text-muted max-w-sm">
                                        Enter different texts in the original and modified panels above, or load a
                                        sample preset to see visual differences in real-time.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="font-mono text-xs divide-y divide-border/10 flex flex-col select-text">
                                {diffMode === "split" ? (
                                    /* Split side-by-side View */
                                    rows.map((row, index) => {
                                        let leftBg = "bg-transparent";
                                        let leftGutter = "bg-surface-secondary/10 border-r-border/30 text-text-muted/40";
                                        let leftStyle = {};
                                        let leftSign = "";

                                        let rightBg = "bg-transparent";
                                        let rightGutter = "bg-surface-secondary/10 border-r-border/30 text-text-muted/40";
                                        let rightStyle = {};
                                        let rightSign = "";

                                        if (row.type === "removed") {
                                            leftBg = "bg-danger-bg/25 text-text-primary";
                                            leftGutter = "bg-danger-bg/40 text-danger/80 border-r-danger/25 font-bold";
                                            leftSign = "-";
                                            rightBg = "bg-surface-secondary/5";
                                            rightStyle = spacerStyle;
                                        } else if (row.type === "added") {
                                            leftBg = "bg-surface-secondary/5";
                                            leftStyle = spacerStyle;
                                            rightBg = "bg-success-bg/25 text-text-primary";
                                            rightGutter = "bg-success-bg/40 text-success/80 border-r-success/25 font-bold";
                                            rightSign = "+";
                                        } else if (row.type === "modified") {
                                            leftBg = "bg-danger-bg/20 text-text-primary border-r border-danger/10";
                                            leftGutter = "bg-danger-bg/35 text-danger/70 border-r-danger/20";
                                            leftSign = "-";
                                            rightBg = "bg-success-bg/20 text-text-primary";
                                            rightGutter = "bg-success-bg/35 text-success/70 border-r-success/20";
                                            rightSign = "+";
                                        } else {
                                            // Unchanged
                                            leftGutter = "bg-surface-secondary/15 text-text-muted/30 border-r-border/20";
                                            rightGutter = "bg-surface-secondary/15 text-text-muted/30 border-r-border/20";
                                        }

                                        return (
                                            <div
                                                key={`row-${index}`}
                                                className="flex border-b border-border/5 hover:bg-surface-secondary/15 dark:hover:bg-surface-secondary/5 group transition-colors"
                                            >
                                                <SplitCell
                                                    side="left"
                                                    lineData={row.left}
                                                    gutterClass={leftGutter}
                                                    bgClass={leftBg}
                                                    sign={leftSign}
                                                    style={leftStyle}
                                                    isLineWrap={isLineWrap}
                                                    borderRight={true}
                                                />
                                                <SplitCell
                                                    side="right"
                                                    lineData={row.right}
                                                    gutterClass={rightGutter}
                                                    bgClass={rightBg}
                                                    sign={rightSign}
                                                    style={rightStyle}
                                                    isLineWrap={isLineWrap}
                                                />
                                            </div>
                                        );
                                    })
                                ) : (
                                    /* Unified inline View */
                                    rows.flatMap((row, index) => {
                                        const elements: React.ReactNode[] = [];

                                        if (row.type === "unchanged") {
                                            elements.push(
                                                <UnifiedLine
                                                    key={`u-unchanged-${index}`}
                                                    leftLineNum={row.left?.lineNumber}
                                                    rightLineNum={row.right?.lineNumber}
                                                    sign=" "
                                                    containerClass="hover:bg-surface-secondary/20 dark:hover:bg-surface-secondary/10"
                                                    leftGutterClass="border-r-border/30 bg-surface-secondary/15 text-text-muted/40"
                                                    rightGutterClass="border-r-border/30 bg-surface-secondary/15 text-text-muted/40"
                                                    signClass="text-text-muted/30"
                                                    contentClass=""
                                                    isLineWrap={isLineWrap}
                                                >
                                                    {row.left?.content}
                                                </UnifiedLine>
                                            );
                                        } else if (row.type === "removed") {
                                            elements.push(
                                                <UnifiedLine
                                                    key={`u-removed-${index}`}
                                                    leftLineNum={row.left?.lineNumber}
                                                    sign="-"
                                                    containerClass="bg-danger-bg/25 hover:bg-danger-bg/30 transition-colors"
                                                    leftGutterClass="border-r-danger/25 bg-danger-bg/40 text-danger/80"
                                                    rightGutterClass="border-r-border/20 bg-danger-bg/10 text-text-muted/20"
                                                    signClass="text-danger/70 bg-danger-bg/10"
                                                    contentClass="bg-danger-bg/5"
                                                    isLineWrap={isLineWrap}
                                                >
                                                    {row.left?.content}
                                                </UnifiedLine>
                                            );
                                        } else if (row.type === "added") {
                                            elements.push(
                                                <UnifiedLine
                                                    key={`u-added-${index}`}
                                                    rightLineNum={row.right?.lineNumber}
                                                    sign="+"
                                                    containerClass="bg-success-bg/25 hover:bg-success-bg/30 transition-colors"
                                                    leftGutterClass="border-r-border/20 bg-success-bg/10 text-text-muted/20"
                                                    rightGutterClass="border-r-success/25 bg-success-bg/40 text-success/80"
                                                    signClass="text-success/70 bg-success-bg/10"
                                                    contentClass="bg-success-bg/5"
                                                    isLineWrap={isLineWrap}
                                                >
                                                    {row.right?.content}
                                                </UnifiedLine>
                                            );
                                        } else if (row.type === "modified") {
                                            if (row.left) {
                                                elements.push(
                                                    <UnifiedLine
                                                        key={`u-mod-left-${index}`}
                                                        leftLineNum={row.left.lineNumber}
                                                        sign="-"
                                                        containerClass="bg-danger-bg/20 hover:bg-danger-bg/25 transition-colors"
                                                        leftGutterClass="border-r-danger/20 bg-danger-bg/35 text-danger/80"
                                                        rightGutterClass="border-r-border/20 bg-danger-bg/10 text-text-muted/20"
                                                        signClass="text-danger/70 bg-danger-bg/10"
                                                        contentClass="bg-danger-bg/5"
                                                        isLineWrap={isLineWrap}
                                                    >
                                                        {renderWordDiff("left", row.left.words, row.left.content)}
                                                    </UnifiedLine>
                                                );
                                            }
                                            if (row.right) {
                                                elements.push(
                                                    <UnifiedLine
                                                        key={`u-mod-right-${index}`}
                                                        rightLineNum={row.right.lineNumber}
                                                        sign="+"
                                                        containerClass="bg-success-bg/20 hover:bg-success-bg/25 transition-colors"
                                                        leftGutterClass="border-r-border/20 bg-success-bg/10 text-text-muted/20"
                                                        rightGutterClass="border-r-success/20 bg-success-bg/35 text-success/80"
                                                        signClass="text-success/70 bg-success-bg/10"
                                                        contentClass="bg-success-bg/5"
                                                        isLineWrap={isLineWrap}
                                                    >
                                                        {renderWordDiff("right", row.right.words, row.right.content)}
                                                    </UnifiedLine>
                                                );
                                            }
                                        }

                                        return elements;
                                    })
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Computes side-by-side aligned line differences between two strings using Myers algorithm from js-diff.
 * Pairs consecutive deleted and added line blocks to highlight precise word changes.
 */
function computeAlignedDiff(
    oldText: string,
    newText: string
): {
    rows: AlignedRow[];
    stats: { additions: number; removals: number; modified: number; unchanged: number };
} {
    const changes = diffLines(oldText, newText);

    const rows: AlignedRow[] = [];
    let leftLineCounter = 1;
    let rightLineCounter = 1;

    let additions = 0;
    let removals = 0;
    let modified = 0;
    let unchanged = 0;

    for (let i = 0; i < changes.length; i++) {
        const change = changes[i];
        const lines = change.value.split(/\r?\n/);
        // Remove last empty line from splits ending with a newline
        if (lines.length > 0 && lines[lines.length - 1] === "") {
            lines.pop();
        }

        if (!change.added && !change.removed) {
            // Unchanged block
            for (const line of lines) {
                rows.push({
                    type: "unchanged",
                    left: {
                        lineNumber: leftLineCounter++,
                        content: line,
                        type: "unchanged"
                    },
                    right: {
                        lineNumber: rightLineCounter++,
                        content: line,
                        type: "unchanged"
                    }
                });
                unchanged++;
            }
        } else if (change.removed) {
            // Check if next change represents a sequential additions block. If so, pair as modified line-by-line
            const nextChange = changes[i + 1];
            if (nextChange && nextChange.added) {
                const nextLines = nextChange.value.split(/\r?\n/);
                if (nextLines.length > 0 && nextLines[nextLines.length - 1] === "") {
                    nextLines.pop();
                }

                const maxLinesCount = Math.max(lines.length, nextLines.length);
                for (let j = 0; j < maxLinesCount; j++) {
                    if (j < lines.length && j < nextLines.length) {
                        // Pair deleted & added lines
                        const origLine = lines[j];
                        const modLine = nextLines[j];
                        const wordDiff = diffWords(origLine, modLine);

                        rows.push({
                            type: "modified",
                            left: {
                                lineNumber: leftLineCounter++,
                                content: origLine,
                                type: "removed",
                                words: wordDiff
                            },
                            right: {
                                lineNumber: rightLineCounter++,
                                content: modLine,
                                type: "added",
                                words: wordDiff
                            }
                        });
                        modified++;
                    } else if (j < lines.length) {
                        // Extra deleted lines
                        rows.push({
                            type: "removed",
                            left: {
                                lineNumber: leftLineCounter++,
                                content: lines[j],
                                type: "removed"
                            }
                        });
                        removals++;
                    } else {
                        // Extra added lines
                        rows.push({
                            type: "added",
                            right: {
                                lineNumber: rightLineCounter++,
                                content: nextLines[j],
                                type: "added"
                            }
                        });
                        additions++;
                    }
                }
                i++; // Skip the next index since it was processed as paired additions
            } else {
                // Pure deletions
                for (const line of lines) {
                    rows.push({
                        type: "removed",
                        left: {
                            lineNumber: leftLineCounter++,
                            content: line,
                            type: "removed"
                        }
                    });
                    removals++;
                }
            }
        } else if (change.added) {
            // Pure additions
            for (const line of lines) {
                rows.push({
                    type: "added",
                    right: {
                        lineNumber: rightLineCounter++,
                        content: line,
                        type: "added"
                    }
                });
                additions++;
            }
        }
    }

    return {
        rows,
        stats: {additions, removals, modified, unchanged}
    };
}
