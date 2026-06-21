import {diffLines, diffWords} from "diff";

export interface DiffLineData {
    lineNumber: number;
    content: string;
    type: "added" | "removed" | "modified" | "unchanged";
    words?: any[];
}

export interface AlignedRow {
    type: "added" | "removed" | "modified" | "unchanged";
    left?: DiffLineData;
    right?: DiffLineData;
}

export const SAMPLES = {
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

/**
 * Computes side-by-side aligned line differences between two strings using Myers algorithm from js-diff.
 * Pairs consecutive deleted and added line blocks to highlight precise word changes.
 */
export function computeAlignedDiff(
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
