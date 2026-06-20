"use client";

import React, {useState, useRef, useMemo, useCallback} from "react";
import {useRouter} from "next/navigation";
import {
    ArrowLeft20Regular,
    Copy20Regular,
    Dismiss20Regular,
    TextWordCount20Regular,
    Clock20Regular,
    Speaker220Regular
} from "@fluentui/react-icons";
import {Tool} from "@/types/tool";

const STOP_WORDS = new Set([
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "as", "at",
    "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
    "can", "cannot", "could", "did", "do", "does", "doing", "down", "during",
    "each", "few", "for", "from", "further",
    "had", "has", "have", "having", "he", "her", "here", "hers", "herself", "him", "himself", "his", "how",
    "i", "if", "in", "into", "is", "it", "its", "itself",
    "me", "more", "most", "my", "myself",
    "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "our", "ours", "ourselves", "out", "over", "own",
    "same", "she", "should", "so", "some", "such",
    "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there", "these", "they", "this", "those", "through", "to", "too", "under", "until", "up", "very",
    "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom", "why", "with", "would",
    "you", "your", "yours", "yourself", "yourselves",
    "will", "etc", "shall", "doesnt", "dont", "im", "youre", "theyre", "ive", "weve"
]);

interface TextCounterViewProps {
    tool: Tool;
}

export function TextCounterView({tool}: TextCounterViewProps) {
    const router = useRouter();
    const [text, setText] = useState("");
    const [isCopied, setIsCopied] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Memoize derived computations to optimize performance on typing
    const stats = useMemo(() => {
        const charCountWithSpaces = text.length;
        const charCountNoSpaces = text.replace(/\s/g, "").length;

        const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
        const wordCount = words.length;

        const sentencesCount = text
            .split(/[.!?]+/)
            .filter((s) => s.trim().length > 0).length;

        const paragraphsCount = text
            .split(/\n+/)
            .filter((p) => p.trim().length > 0).length;

        const linesCount = text.length > 0 ? text.split(/\r\n|\r|\n/).length : 0;

        // Reading & Speaking times
        // Average reading speed: 200 WPM
        const readingTimeSec = Math.ceil((wordCount / 200) * 60);
        const readingMin = Math.floor(readingTimeSec / 60);
        const readingSec = readingTimeSec % 60;

        // Average speaking speed: 130 WPM
        const speakingTimeSec = Math.ceil((wordCount / 130) * 60);
        const speakingMin = Math.floor(speakingTimeSec / 60);
        const speakingSec = speakingTimeSec % 60;

        // Top 5 word frequency analysis
        let topWords: [string, number][] = [];
        if (text.trim()) {
            const cleanText = text
                .toLowerCase()
                .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "");
            const filteredWords = cleanText
                .split(/\s+/)
                .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
            const freq: { [key: string]: number } = {};
            filteredWords.forEach((w) => {
                freq[w] = (freq[w] || 0) + 1;
            });
            topWords = Object.entries(freq)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
        }

        return {
            charCountWithSpaces,
            charCountNoSpaces,
            wordsArray: words,
            wordCount,
            sentencesCount,
            paragraphsCount,
            linesCount,
            readingMin,
            readingSec,
            speakingMin,
            speakingSec,
            topWords
        };
    }, [text]);

    const {
        charCountWithSpaces,
        charCountNoSpaces,
        wordsArray,
        wordCount,
        sentencesCount,
        paragraphsCount,
        linesCount,
        readingMin,
        readingSec,
        speakingMin,
        speakingSec,
        topWords
    } = stats;

    const handleCopy = useCallback(async () => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error("Clipboard copy failed:", err);
        }
    }, [text]);

    const handleClear = useCallback(() => {
        setText("");
        textareaRef.current?.focus();
    }, []);

    // Text transformations
    const transformText = useCallback((type: "upper" | "lower" | "title" | "sentence") => {
        if (!text) return;
        let result = text;
        if (type === "upper") {
            result = text.toUpperCase();
        } else if (type === "lower") {
            result = text.toLowerCase();
        } else if (type === "title") {
            result = text.replace(/\b\w/g, (char) => char.toUpperCase());
        } else if (type === "sentence") {
            result = text.toLowerCase().replace(/(^\s*|[.!?]\s+)([a-z])/g, (match) => match.toUpperCase());
        }
        setText(result);
    }, [text]);

    return (
        <div className="w-full flex-1 bg-background relative overflow-hidden">
            {/* Background Glow */}
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
                                <TextWordCount20Regular className="w-4 h-4"/>
                            </span>
                            <h1 className="text-xl sm:text-2xl font-black text-text-primary">
                                {tool.title}
                            </h1>
                        </div>
                        <p className="text-xs sm:text-sm text-text-muted">
                            {tool.description}
                        </p>
                    </div>

                    {/* Toolbar Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => transformText("upper")}
                            disabled={!text}
                            className="px-3 py-1.5 rounded-lg border border-border bg-surface text-[10px] font-bold text-text-secondary hover:border-primary hover:text-primary disabled:opacity-50 disabled:hover:border-border disabled:hover:text-text-secondary cursor-pointer transition-colors"
                        >
                            UPPERCASE
                        </button>
                        <button
                            onClick={() => transformText("lower")}
                            disabled={!text}
                            className="px-3 py-1.5 rounded-lg border border-border bg-surface text-[10px] font-bold text-text-secondary hover:border-primary hover:text-primary disabled:opacity-50 disabled:hover:border-border disabled:hover:text-text-secondary cursor-pointer transition-colors"
                        >
                            lowercase
                        </button>
                        <button
                            onClick={() => transformText("title")}
                            disabled={!text}
                            className="px-3 py-1.5 rounded-lg border border-border bg-surface text-[10px] font-bold text-text-secondary hover:border-primary hover:text-primary disabled:opacity-50 disabled:hover:border-border disabled:hover:text-text-secondary cursor-pointer transition-colors"
                        >
                            Title Case
                        </button>
                        <button
                            onClick={() => transformText("sentence")}
                            disabled={!text}
                            className="px-3 py-1.5 rounded-lg border border-border bg-surface text-[10px] font-bold text-text-secondary hover:border-primary hover:text-primary disabled:opacity-50 disabled:hover:border-border disabled:hover:text-text-secondary cursor-pointer transition-colors"
                        >
                            Sentence Case
                        </button>
                    </div>
                </div>

                {/* Primary Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div
                        className="border border-border bg-surface/50 backdrop-blur-md rounded-2xl p-5 space-y-3 shadow-xs hover:border-primary/30 transition-all duration-300">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                            Characters
                        </div>
                        <div className="space-y-1">
                            <div className="text-2xl font-black text-text-primary tracking-tight">
                                {charCountWithSpaces}
                            </div>
                            <div className="text-[10px] text-text-muted">
                                {charCountNoSpaces} excluding spaces
                            </div>
                        </div>
                    </div>

                    <div
                        className="border border-border bg-surface/50 backdrop-blur-md rounded-2xl p-5 space-y-3 shadow-xs hover:border-primary/30 transition-all duration-300">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                            Words
                        </div>
                        <div className="space-y-1">
                            <div className="text-2xl font-black text-text-primary tracking-tight">
                                {wordCount}
                            </div>
                            <div className="text-[10px] text-text-muted">
                                {wordsArray.length > 0 ? `${wordsArray.length} distinct items` : "No words typed"}
                            </div>
                        </div>
                    </div>

                    <div
                        className="border border-border bg-surface/50 backdrop-blur-md rounded-2xl p-5 space-y-3 shadow-xs hover:border-primary/30 transition-all duration-300">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                            Sentences
                        </div>
                        <div className="space-y-1">
                            <div className="text-2xl font-black text-text-primary tracking-tight">
                                {sentencesCount}
                            </div>
                            <div className="text-[10px] text-text-muted">
                                {wordCount > 0 ? `Avg ${(wordCount / Math.max(1, sentencesCount)).toFixed(1)} words/sentence` : "No text"}
                            </div>
                        </div>
                    </div>

                    <div
                        className="border border-border bg-surface/50 backdrop-blur-md rounded-2xl p-5 space-y-3 shadow-xs hover:border-primary/30 transition-all duration-300">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                            Paragraphs
                        </div>
                        <div className="space-y-1">
                            <div className="text-2xl font-black text-text-primary tracking-tight">
                                {paragraphsCount}
                            </div>
                            <div className="text-[10px] text-text-muted">
                                {linesCount} total line breaks
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Workspace Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Text Input Block */}
                    <div className="lg:col-span-2 space-y-4">
                        <div
                            className="relative border border-border bg-surface focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 rounded-2xl transition-all duration-300 shadow-xs overflow-hidden">
                            <textarea
                                ref={textareaRef}
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Type, paste, or drag and drop your text here to begin counting..."
                                className="w-full min-h-[300px] sm:min-h-[400px] p-5 text-sm leading-relaxed text-text-primary bg-transparent resize-y outline-none select-text border-none"
                            />

                            {/* Textarea Bottom Action Bar */}
                            <div
                                className="flex items-center justify-between border-t border-border/60 bg-surface-secondary/40 px-4 py-3">
                                <div className="text-[10px] text-text-muted font-bold tracking-wide">
                                    {wordCount} Words | {charCountWithSpaces} Characters
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleClear}
                                        disabled={!text}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wide uppercase text-text-secondary hover:text-danger hover:bg-danger-bg/40 disabled:opacity-50 disabled:hover:text-text-secondary disabled:hover:bg-transparent cursor-pointer transition-colors duration-200"
                                    >
                                        <Dismiss20Regular className="w-3.5 h-3.5"/>
                                        Clear
                                    </button>
                                    <button
                                        onClick={handleCopy}
                                        disabled={!text}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wide uppercase text-white bg-primary hover:bg-primary-hover disabled:bg-primary/55 cursor-pointer shadow-xs transition-colors duration-200"
                                    >
                                        <Copy20Regular className="w-3.5 h-3.5"/>
                                        {isCopied ? "Copied!" : "Copy Text"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Analysis Details */}
                    <div className="space-y-6">
                        {/* Time Estimates */}
                        <div
                            className="border border-border bg-surface/50 backdrop-blur-md rounded-2xl p-6 space-y-5 shadow-xs">
                            <h2 className="text-xs font-black uppercase tracking-wider text-text-muted border-b border-border pb-3">
                                Time Estimation
                            </h2>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <span
                                        className="w-10 h-10 shrink-0 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center">
                                        <Clock20Regular className="w-5 h-5"/>
                                    </span>
                                    <div className="space-y-0.5">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                                            Reading Time
                                        </div>
                                        <div className="text-sm font-bold text-text-primary">
                                            {wordCount > 0 ? (
                                                <>
                                                    {readingMin > 0 && `${readingMin}m `}
                                                    {readingSec}s
                                                </>
                                            ) : (
                                                "0s"
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <span
                                        className="w-10 h-10 shrink-0 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center">
                                        <Speaker220Regular className="w-5 h-5"/>
                                    </span>
                                    <div className="space-y-0.5">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                                            Speaking Time
                                        </div>
                                        <div className="text-sm font-bold text-text-primary">
                                            {wordCount > 0 ? (
                                                <>
                                                    {speakingMin > 0 && `${speakingMin}m `}
                                                    {speakingSec}s
                                                </>
                                            ) : (
                                                "0s"
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Top Words Frequency */}
                        <div
                            className="border border-border bg-surface/50 backdrop-blur-md rounded-2xl p-6 space-y-4 shadow-xs">
                            <h2 className="text-xs font-black uppercase tracking-wider text-text-muted border-b border-border pb-3">
                                Keyword Density
                            </h2>
                            {topWords.length > 0 ? (
                                <div className="space-y-3.5">
                                    {topWords.map(([word, freq]) => {
                                        const percentage = Math.round((freq / wordsArray.length) * 100);
                                        return (
                                            <div key={word} className="space-y-1.5">
                                                <div
                                                    className="flex items-center justify-between text-xs font-semibold">
                                                    <span className="text-text-primary font-mono">{word}</span>
                                                    <span className="text-text-muted font-mono">
                                                        {freq}x ({percentage}%)
                                                    </span>
                                                </div>
                                                <div
                                                    className="h-1.5 w-full bg-surface-secondary rounded-full overflow-hidden border border-border/50">
                                                    <div
                                                        className="h-full bg-primary rounded-full transition-all duration-300"
                                                        style={{width: `${percentage}%`}}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-8 text-center text-xs text-text-muted italic">
                                    Type some words to see keyword density.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
