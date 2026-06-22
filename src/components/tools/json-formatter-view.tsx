"use client";

import React, {useState, useRef, useMemo, useCallback} from "react";
import {
    Copy20Regular,
    Dismiss20Regular,
    ArrowDownload20Regular,
    Code20Regular,
    DocumentAdd20Regular,
    ChevronRight20Regular,
    ChevronDown20Regular,
} from "@fluentui/react-icons";
import {Tool} from "@/types/tool";

import {
    JSONLine,
    SAMPLE_JSON,
    serializeToLines,
    sortObjectKeys,
    parseJsonError,
    linesToString
} from "@/features/text/json-formatter";

interface JsonFormatterViewProps {
    tool: Tool;
}

export function JsonFormatterView({tool}: JsonFormatterViewProps) {
    const [inputJson, setInputJson] = useState("");
    const [indentSize, setIndentSize] = useState<"2" | "3" | "4" | "tab">("2");
    const [sortKeys, setSortKeys] = useState(false);
    const [isMinified, setIsMinified] = useState(false);
    const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());
    const [isDragging, setIsDragging] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lineNumbersRef = useRef<HTMLDivElement>(null);
    const outputScrollRef = useRef<HTMLDivElement>(null);

    // Sync input textarea scroll with input line numbers column
    const handleInputScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        if (lineNumbersRef.current) {
            lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
        }
    };

    // Auto-parse input JSON
    const parsedData = useMemo(() => {
        const trimmed = inputJson.trim();
        if (!trimmed) {
            return {isValid: true, data: null, error: null};
        }
        try {
            const parsed = JSON.parse(trimmed);
            return {isValid: true, data: parsed, error: null};
        } catch (err: any) {
            const errorDetails = parseJsonError(err, inputJson);
            return {isValid: false, data: null, error: errorDetails};
        }
    }, [inputJson]);

    // Derive formatted output representation
    const formattedData = useMemo(() => {
        if (!parsedData.isValid || parsedData.data === null) {
            return {lines: [], minifiedText: ""};
        }

        let targetData = parsedData.data;
        if (sortKeys) {
            targetData = sortObjectKeys(targetData);
        }

        // 1. Structured lines for tree view / formatting
        const lines = serializeToLines(targetData, "$", 0, true);

        // 2. Raw minified representation
        const minifiedText = JSON.stringify(targetData);

        return {lines, minifiedText};
    }, [parsedData, sortKeys]);

    // Process structured lines to filter out collapsed blocks and update text
    const processedOutputLines = useMemo(() => {
        const rawLines = formattedData.lines;
        const renderedLines: Array<JSONLine & {
            originalLineIndex: number;
            isFoldable: boolean;
            isCollapsed: boolean
        }> = [];

        let i = 0;
        while (i < rawLines.length) {
            const line = rawLines[i];
            const isCollapsed = collapsedPaths.has(line.path);

            if (isCollapsed && (line.type === "object-start" || line.type === "array-start")) {
                // Find matching close brace/bracket line
                let endLineIndex = -1;
                for (let j = i + 1; j < rawLines.length; j++) {
                    if (rawLines[j].path === line.path && (rawLines[j].type === "object-end" || rawLines[j].type === "array-end")) {
                        endLineIndex = j;
                        break;
                    }
                }

                const endsWithComma = endLineIndex !== -1 && rawLines[endLineIndex].valueText.endsWith(",");
                const collapsedText = line.type === "object-start" ? "{...}" : "[...]";
                const finalValueText = collapsedText + (endsWithComma ? "," : "");

                renderedLines.push({
                    ...line,
                    valueText: finalValueText,
                    originalLineIndex: i,
                    isFoldable: true,
                    isCollapsed: true,
                });

                // Skip inner elements
                if (endLineIndex !== -1) {
                    i = endLineIndex + 1;
                } else {
                    i++;
                }
            } else {
                const isFoldable = line.type === "object-start" || line.type === "array-start";
                renderedLines.push({
                    ...line,
                    originalLineIndex: i,
                    isFoldable,
                    isCollapsed: false,
                });
                i++;
            }
        }

        return renderedLines;
    }, [formattedData.lines, collapsedPaths]);

    // Calculate number of lines in raw input text for gutter
    const inputLinesCount = useMemo(() => {
        if (!inputJson) return 1;
        return inputJson.split("\n").length;
    }, [inputJson]);

    // Toggle single path collapsed state
    const togglePathCollapse = (path: string) => {
        setCollapsedPaths((prev) => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    };

    // Expand / Collapse all operations
    const handleExpandAll = () => {
        setCollapsedPaths(new Set());
    };

    const handleCollapseAll = () => {
        const allPaths = new Set<string>();
        formattedData.lines.forEach((line) => {
            if (line.type === "object-start" || line.type === "array-start") {
                allPaths.add(line.path);
            }
        });
        setCollapsedPaths(allPaths);
    };

    const handleCollapseToLevel = (level: number) => {
        const paths = new Set<string>();
        formattedData.lines.forEach((line) => {
            if ((line.type === "object-start" || line.type === "array-start") && line.indentLevel >= level) {
                paths.add(line.path);
            }
        });
        setCollapsedPaths(paths);
    };

    // Drag and Drop files
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            await handleFile(file);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await handleFile(file);
        }
    };

    const handleFile = async (file: File) => {
        try {
            const text = await file.text();
            setInputJson(text);
        } catch (err) {
            console.error("Failed to read dropped file", err);
        }
    };

    // Click quick example JSON
    const handleLoadSample = () => {
        setInputJson(SAMPLE_JSON);
    };

    // Clear editors
    const handleClear = () => {
        setInputJson("");
        setCollapsedPaths(new Set());
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    };

    // Copy to clipboard
    const handleCopy = useCallback(async () => {
        const textToCopy = isMinified
            ? formattedData.minifiedText
            : linesToString(formattedData.lines, indentSize);

        if (!textToCopy) return;

        try {
            await navigator.clipboard.writeText(textToCopy);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error("Clipboard copy failed:", err);
        }
    }, [isMinified, formattedData, indentSize]);

    // Download formatted file
    const handleDownload = () => {
        const textToDownload = isMinified
            ? formattedData.minifiedText
            : linesToString(formattedData.lines, indentSize);

        if (!textToDownload) return;

        const blob = new Blob([textToDownload], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = isMinified ? "minified.json" : "formatted.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Navigate selection to error line & col
    const handleGoToError = () => {
        if (!textareaRef.current || !parsedData.error || !parsedData.error.line) return;
        const lines = inputJson.split("\n");
        const errorLine = parsedData.error.line;
        let charOffset = 0;
        for (let i = 0; i < errorLine - 1; i++) {
            charOffset += lines[i].length + 1; // add length plus newline
        }
        const col = parsedData.error.column || 1;
        charOffset += col - 1;

        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(charOffset, charOffset + 1);
    };

    // Color code render
    const renderValueText = (valueText: string, type: string) => {
        const endsWithComma = valueText.endsWith(",");
        const coreText = endsWithComma ? valueText.slice(0, -1) : valueText;

        let colorClass = "text-text-primary";
        if (type === "primitive") {
            if (coreText.startsWith('"')) {
                colorClass = "text-emerald-600 dark:text-emerald-400 font-medium whitespace-pre";
            } else if (coreText === "true" || coreText === "false") {
                colorClass = "text-indigo-600 dark:text-indigo-400 font-bold";
            } else if (coreText === "null") {
                colorClass = "text-gray-400 dark:text-gray-500 font-semibold";
            } else {
                // Numeric
                colorClass = "text-amber-600 dark:text-amber-400 font-semibold";
            }
        } else if (["object-start", "object-end", "array-start", "array-end"].includes(type)) {
            colorClass = "text-text-primary/70 dark:text-text-primary/80 font-bold";
        }

        return (
            <>
                <span className={colorClass}>{coreText}</span>
                {endsWithComma && <span className="text-text-primary/50 dark:text-text-primary/40 font-normal">,</span>}
            </>
        );
    };

    return (
        <>
            {/* Header Information */}
            <div
                className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-5 gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                            <span
                                className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                                <Code20Regular className="w-4 h-4"/>
                            </span>
                        <h1 className="text-xl sm:text-2xl font-black text-text-primary">
                            {tool.title}
                        </h1>
                    </div>
                    <p className="text-xs sm:text-sm text-text-muted">
                        {tool.description}
                    </p>
                </div>

                {/* Example & Clear buttons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleLoadSample}
                        className="px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-bold text-text-secondary hover:border-primary hover:text-primary transition-all duration-200 cursor-pointer"
                    >
                        Load Example
                    </button>
                    <button
                        onClick={handleClear}
                        className="px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-bold text-text-secondary hover:border-danger hover:text-danger transition-all duration-200 cursor-pointer"
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Configuration Toolbar */}
            <div
                className="flex flex-wrap items-center justify-between bg-surface/50 border border-border/80 backdrop-blur-md rounded-2xl p-4 gap-4">
                {/* Formatting Settings */}
                <div className="flex flex-wrap items-center gap-4">
                    {/* Indent select */}
                    <div className="flex items-center gap-2">
                        <label htmlFor="indent-select" className="text-xs font-bold text-text-secondary">
                            Indent:
                        </label>
                        <select
                            id="indent-select"
                            value={indentSize}
                            onChange={(e) => setIndentSize(e.target.value as any)}
                            disabled={isMinified}
                            className="bg-surface border border-border rounded-lg text-xs font-bold px-2 py-1 outline-none text-text-primary focus:border-primary transition-all disabled:opacity-50"
                        >
                            <option value="2">2 Spaces</option>
                            <option value="3">3 Spaces</option>
                            <option value="4">4 Spaces</option>
                            <option value="tab">Tabs</option>
                        </select>
                    </div>

                    {/* Sort Keys Toggle */}
                    <button
                        onClick={() => setSortKeys(!sortKeys)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold transition-all duration-200 cursor-pointer ${
                            sortKeys
                                ? "bg-primary/10 border-primary/20 text-primary"
                                : "bg-surface border-border text-text-secondary hover:border-primary/45"
                        }`}
                    >
                        {sortKeys ? "✓ Sorted Keys" : "Sort Keys A-Z"}
                    </button>

                    {/* Format Mode toggle */}
                    <div className="flex rounded-lg border border-border overflow-hidden bg-surface p-0.5">
                        <button
                            onClick={() => setIsMinified(false)}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                                !isMinified
                                    ? "bg-primary text-white"
                                    : "text-text-muted hover:text-text-secondary"
                            }`}
                        >
                            Prettify
                        </button>
                        <button
                            onClick={() => setIsMinified(true)}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                                isMinified
                                    ? "bg-primary text-white"
                                    : "text-text-muted hover:text-text-secondary"
                            }`}
                        >
                            Minify
                        </button>
                    </div>

                </div>

                {/* Expand/Collapse Actions (Only shown in Pretty Mode & when valid JSON exists) */}
                {!isMinified && parsedData.isValid && inputJson.trim() !== "" && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                            onClick={handleExpandAll}
                            className="px-2.5 py-1 rounded-lg border border-border hover:border-primary/50 text-[10px] font-bold text-text-secondary hover:text-primary transition-all cursor-pointer"
                        >
                            Expand All
                        </button>
                        <button
                            onClick={handleCollapseAll}
                            className="px-2.5 py-1 rounded-lg border border-border hover:border-primary/50 text-[10px] font-bold text-text-secondary hover:text-primary transition-all cursor-pointer"
                        >
                            Collapse All
                        </button>
                        <button
                            onClick={() => handleCollapseToLevel(1)}
                            className="px-2.5 py-1 rounded-lg border border-border hover:border-primary/50 text-[10px] font-bold text-text-secondary hover:text-primary transition-all cursor-pointer"
                        >
                            Lvl 1 Fold
                        </button>
                        <button
                            onClick={() => handleCollapseToLevel(2)}
                            className="px-2.5 py-1 rounded-lg border border-border hover:border-primary/50 text-[10px] font-bold text-text-secondary hover:text-primary transition-all cursor-pointer"
                        >
                            Lvl 2 Fold
                        </button>
                    </div>
                )}
            </div>

            {/* Primary Dual Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-125 lg:h-162.5 items-stretch">
                {/* Left Pane: Input Editor */}
                <div
                    className="flex flex-col border border-border bg-surface rounded-2xl overflow-hidden shadow-xs relative">
                    {/* Editor Header */}
                    <div
                        className="h-14 flex items-center justify-between px-4 bg-surface-secondary/40 border-b border-border/80 select-none">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-text-primary">JSON Raw Input</span>
                            {inputJson.trim() !== "" && (
                                <span
                                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
                                        parsedData.isValid
                                            ? "bg-success-bg border-success/20 text-success"
                                            : "bg-danger-bg border-danger/20 text-danger"
                                    }`}
                                >
                                        {parsedData.isValid ? "VALID" : "INVALID"}
                                    </span>
                            )}
                        </div>
                        <span className="text-[10px] text-text-muted font-bold">
                                {inputLinesCount} Lines | {inputJson.length} Chars
                            </span>
                    </div>

                    {/* File Upload drag-over zone */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className="flex-1 flex min-h-0 relative"
                    >
                        {/* Line Numbers Column */}
                        <div
                            ref={lineNumbersRef}
                            className="w-11 bg-surface-secondary/20 border-r border-border/50 text-right pr-2 py-4 select-none font-mono text-xs text-text-muted/60 leading-6 overflow-hidden"
                        >
                            {Array.from({length: inputLinesCount}).map((_, idx) => (
                                <div key={idx} className="h-6">
                                    {idx + 1}
                                </div>
                            ))}
                        </div>

                        {/* Main Input Textarea */}
                        <textarea
                            ref={textareaRef}
                            value={inputJson}
                            onChange={(e) => setInputJson(e.target.value)}
                            onScroll={handleInputScroll}
                            placeholder='Type, paste, or drop your raw JSON here to format...'
                            wrap="off"
                            className="flex-1 p-4 bg-transparent outline-none border-none font-mono text-xs text-text-primary leading-6 resize-none overflow-auto select-text min-h-75 lg:min-h-0 whitespace-pre"
                        />

                        {/* Drag & Drop Overlay */}
                        {isDragging && (
                            <div
                                className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary backdrop-blur-xs flex flex-col items-center justify-center text-primary font-bold text-sm gap-2 pointer-events-none">
                                <DocumentAdd20Regular className="w-8 h-8 animate-bounce"/>
                                Drop JSON file here to upload
                            </div>
                        )}

                        {/* Floating upload button when empty */}
                        {inputJson.trim() === "" && (
                            <div
                                className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center pointer-events-none p-6 select-none">
                                <div
                                    className="w-12 h-12 rounded-full bg-surface-secondary/60 border border-border flex items-center justify-center text-text-muted">
                                    <Code20Regular className="w-5 h-5 text-text-muted/70"/>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-text-secondary">Drag & Drop or browse to
                                        upload</p>
                                    <p className="text-[10px] text-text-muted">Supports .json, text files</p>
                                </div>
                                <label
                                    className="px-3 py-1.5 rounded-lg border border-border hover:border-primary/50 text-[10px] font-bold text-text-secondary hover:text-primary bg-surface pointer-events-auto cursor-pointer transition-colors shadow-xs">
                                    Browse File
                                    <input
                                        type="file"
                                        accept=".json,application/json,text/plain"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        )}
                    </div>

                    {/* Error Warning display (if JSON is invalid) */}
                    {!parsedData.isValid && parsedData.error && inputJson.trim() !== "" && (
                        <div
                            className="bg-danger-bg border-t border-danger/25 p-3 flex items-start gap-2.5 text-xs text-danger relative animate-slide-up select-none">
                            <Dismiss20Regular className="w-4 h-4 shrink-0 mt-0.5"/>
                            <div className="space-y-1 flex-1">
                                <p className="font-bold">JSON Parsing Error</p>
                                <p className="opacity-90">{parsedData.error.message}</p>
                                {parsedData.error.line && (
                                    <button
                                        onClick={handleGoToError}
                                        className="inline-flex items-center gap-1 mt-1 text-[10px] font-extrabold bg-danger/10 hover:bg-danger/20 border border-danger/30 hover:border-danger/40 px-2 py-0.5 rounded transition-all cursor-pointer uppercase"
                                    >
                                        Go to line {parsedData.error.line}, col {parsedData.error.column}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Pane: Formatted Output */}
                <div
                    className="flex flex-col border border-border bg-surface rounded-2xl overflow-hidden shadow-xs relative">
                    {/* Output Header */}
                    <div
                        className="h-14 flex items-center justify-between px-4 bg-surface-secondary/40 border-b border-border/80 select-none">
                        <span className="text-xs font-bold text-text-primary">Formatted JSON</span>
                        {/* Quick copy / download toolbar */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCopy}
                                disabled={!parsedData.isValid || inputJson.trim() === ""}
                                className="p-1.5 rounded-lg border border-border bg-surface text-text-muted hover:border-primary hover:text-primary transition-all disabled:opacity-30 disabled:hover:border-border disabled:hover:text-text-muted cursor-pointer"
                                title="Copy to Clipboard"
                            >
                                {isCopied ? (
                                    <span
                                        className="text-[10px] font-bold px-1.5 text-primary flex items-center gap-1">
                                            ✓ Copied
                                        </span>
                                ) : (
                                    <Copy20Regular className="w-3.5 h-3.5"/>
                                )}
                            </button>
                            <button
                                onClick={handleDownload}
                                disabled={!parsedData.isValid || inputJson.trim() === ""}
                                className="p-1.5 rounded-lg border border-border bg-surface text-text-muted hover:border-primary hover:text-primary transition-all disabled:opacity-30 disabled:hover:border-border disabled:hover:text-text-muted cursor-pointer"
                                title="Download JSON File"
                            >
                                <ArrowDownload20Regular className="w-3.5 h-3.5"/>
                            </button>
                        </div>
                    </div>

                    {/* Dynamic content rendering wrapper */}
                    <div
                        ref={outputScrollRef}
                        className="flex-1 p-4 overflow-auto min-h-75 lg:min-h-0 relative select-text"
                    >
                        {/* 1. Empty / placeholder state */}
                        {inputJson.trim() === "" && (
                            <div
                                className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 select-none">
                                <p className="text-xs font-bold text-text-muted">Awaiting JSON input...</p>
                                <p className="text-[10px] text-text-muted/80 mt-1 max-w-60">
                                    Type in raw data on the left panel or load an example to view formatted output
                                    here.
                                </p>
                            </div>
                        )}

                        {/* 2. Error state (fallback output layout) */}
                        {!parsedData.isValid && inputJson.trim() !== "" && (
                            <div
                                className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 select-none">
                                <div
                                    className="w-10 h-10 rounded-full bg-danger/10 border border-danger/25 text-danger flex items-center justify-center mb-2.5">
                                    <Dismiss20Regular className="w-5 h-5"/>
                                </div>
                                <p className="text-xs font-bold text-text-danger">Invalid JSON Structure</p>
                                <p className="text-[10px] text-text-muted mt-1 max-w-65 leading-relaxed">
                                    Please correct syntax errors in the left editor panel. Formatting will update
                                    live once fixed.
                                </p>
                            </div>
                        )}

                        {/* 3. Prettified Tree View rendering */}
                        {parsedData.isValid && inputJson.trim() !== "" && !isMinified && (
                            <div className="font-mono text-xs leading-6 flex flex-col w-full">
                                {processedOutputLines.map((line, idx) => {
                                    const isFoldable = line.isFoldable;
                                    const isCollapsed = line.isCollapsed;

                                    return (
                                        <div
                                            key={`${line.path}-${idx}`}
                                            className="group/line flex items-start hover:bg-surface-secondary/35 rounded pl-1 -ml-1 pr-1 w-full relative"
                                        >
                                            {/* Left line gutter actions */}
                                            <div
                                                className="flex items-center select-none w-14 shrink-0 border-r border-border/40 mr-3 text-text-muted/50 justify-between">
                                                {/* original line number */}
                                                <span className="text-[10px] tracking-tighter text-left w-7">
                                                        {line.originalLineIndex + 1}
                                                    </span>

                                                {/* Fold / Unfold trigger button */}
                                                <div className="w-5 h-5 flex items-center justify-center pr-1.5">
                                                    {isFoldable && (
                                                        <button
                                                            onClick={() => togglePathCollapse(line.path)}
                                                            className="w-4 h-4 rounded hover:bg-surface-secondary flex items-center justify-center text-text-muted hover:text-primary transition-all cursor-pointer"
                                                            title={isCollapsed ? "Expand block" : "Collapse block"}
                                                        >
                                                            {isCollapsed ? (
                                                                <ChevronRight20Regular className="w-3.5 h-3.5"/>
                                                            ) : (
                                                                <ChevronDown20Regular className="w-3.5 h-3.5"/>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Formatted Code block */}
                                            <div
                                                className="flex-1 select-text flex items-start whitespace-pre"
                                                style={{
                                                    paddingLeft: `${line.indentLevel * (indentSize === "tab" ? 20 : Number(indentSize) * 8)}px`,
                                                }}
                                            >
                                                {/* Optional Key rendering */}
                                                {line.key && (
                                                    <>
                                                            <span
                                                                className="select-text text-sky-600 dark:text-sky-400 font-bold"
                                                            >
                                                                {line.key.slice(0, -2)}
                                                            </span>
                                                        <span
                                                            className="text-text-primary/50 dark:text-text-primary/45 font-normal mr-1.5">:</span>
                                                    </>
                                                )}
                                                {/* Value representation */}
                                                <span className="select-text">
                                                        {renderValueText(line.valueText, line.type)}
                                                    </span>

                                                {/* Visual collapse helper marker */}
                                                {isCollapsed && (
                                                    <button
                                                        onClick={() => togglePathCollapse(line.path)}
                                                        className="select-none ml-1.5 px-1.5 py-px text-[9px] font-extrabold bg-surface-secondary hover:bg-surface border border-border text-text-muted hover:text-primary rounded-md tracking-wide cursor-pointer transition-colors"
                                                        title="Click to expand"
                                                    >
                                                        {line.type === "object-start"
                                                            ? `${line.childCount} ${line.childCount === 1 ? "key" : "keys"}`
                                                            : `${line.childCount} ${line.childCount === 1 ? "item" : "items"}`}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* 4. Minified display output */}
                        {parsedData.isValid && inputJson.trim() !== "" && isMinified && (
                            <div
                                className="font-mono text-xs leading-relaxed select-text whitespace-pre bg-surface-secondary/45 border border-border/60 rounded-xl p-4 h-full overflow-auto">
                                <span className="text-text-primary select-text">{formattedData.minifiedText}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
