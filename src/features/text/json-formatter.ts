// Types for structured JSON formatting
export interface JSONLine {
    key?: string;
    valueText: string;
    type: "object-start" | "object-end" | "array-start" | "array-end" | "primitive";
    path: string;
    indentLevel: number;
    childCount?: number;
}

export interface JSONError {
    message: string;
    line?: number;
    column?: number;
}

export const SAMPLE_JSON = `{
  "appName": "Antigravity Craft",
  "version": "2.0.0",
  "isAwesome": true,
  "rating": 4.9,
  "status": null,
  "features": [
    "JSON Formatter",
    "Text Diff Viewer",
    "Audio Metadata Editor",
    "PDF Toolkit"
  ],
  "author": {
    "name": "Antigravity Team",
    "email": "support@antigravity.ai",
    "founded": 2024
  },
  "metrics": {
    "downloads": 12840,
    "uptimePct": 99.98
  }
}`;

/**
 * Recursive serializer to turn parsed JSON into structured line metadata.
 */
export function serializeToLines(
    value: any,
    path: string = "$",
    indentLevel: number = 0,
    isLast: boolean = true
): JSONLine[] {
    const lines: JSONLine[] = [];

    if (value === null) {
        lines.push({
            valueText: "null" + (isLast ? "" : ","),
            type: "primitive",
            path,
            indentLevel,
        });
    } else if (typeof value === "object") {
        const isArray = Array.isArray(value);
        if (isArray) {
            if (value.length === 0) {
                lines.push({
                    valueText: "[]" + (isLast ? "" : ","),
                    type: "primitive",
                    path,
                    indentLevel,
                });
            } else {
                lines.push({
                    valueText: "[",
                    type: "array-start",
                    path,
                    indentLevel,
                    childCount: value.length,
                });
                value.forEach((item, index) => {
                    const itemPath = `${path}[${index}]`;
                    const itemIsLast = index === value.length - 1;
                    lines.push(...serializeToLines(item, itemPath, indentLevel + 1, itemIsLast));
                });
                lines.push({
                    valueText: "]" + (isLast ? "" : ","),
                    type: "array-end",
                    path,
                    indentLevel,
                });
            }
        } else {
            const keys = Object.keys(value);
            if (keys.length === 0) {
                lines.push({
                    valueText: "{}" + (isLast ? "" : ","),
                    type: "primitive",
                    path,
                    indentLevel,
                });
            } else {
                lines.push({
                    valueText: "{",
                    type: "object-start",
                    path,
                    indentLevel,
                    childCount: keys.length,
                });
                keys.forEach((key, index) => {
                    // Escape keys that contain special characters or spaces
                    const formattedKey = JSON.stringify(key) + ": ";
                    const itemPath = `${path}.${key}`;
                    const itemIsLast = index === keys.length - 1;
                    const childLines = serializeToLines(value[key], itemPath, indentLevel + 1, itemIsLast);

                    if (childLines.length > 0) {
                        childLines[0].key = formattedKey;
                    }
                    lines.push(...childLines);
                });
                lines.push({
                    valueText: "}" + (isLast ? "" : ","),
                    type: "object-end",
                    path,
                    indentLevel,
                });
            }
        }
    } else {
        // primitives: string, number, boolean
        lines.push({
            valueText: JSON.stringify(value) + (isLast ? "" : ","),
            type: "primitive",
            path,
            indentLevel,
        });
    }

    return lines;
}

/**
 * Recursive sorting of object keys.
 */
export function sortObjectKeys(obj: any): any {
    if (obj === null || typeof obj !== "object") {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(sortObjectKeys);
    }
    const sortedObj: any = {};
    const keys = Object.keys(obj).sort();
    keys.forEach((key) => {
        sortedObj[key] = sortObjectKeys(obj[key]);
    });
    return sortedObj;
}

/**
 * Extract line and column numbers from character position.
 */
export function getLineAndColOfPosition(text: string, pos: number) {
    const sub = text.substring(0, pos);
    const lines = sub.split("\n");
    return {
        line: lines.length,
        column: lines[lines.length - 1].length + 1,
    };
}

/**
 * Parses JSON error to extract cleaner line/column debugging details.
 */
export function parseJsonError(err: Error, text: string): JSONError {
    const msg = err.message;
    // Look for "position X"
    const posMatch = msg.match(/position (\d+)/i);
    if (posMatch) {
        const pos = parseInt(posMatch[1], 10);
        const {line, column} = getLineAndColOfPosition(text, pos);
        return {message: msg, line, column};
    }
    // Look for "line X" and "column Y"
    const lineColMatch = msg.match(/line (\d+).*column (\d+)/i);
    if (lineColMatch) {
        return {
            message: msg,
            line: parseInt(lineColMatch[1], 10),
            column: parseInt(lineColMatch[2], 10),
        };
    }
    return {message: msg};
}

/**
 * Helper to re-join formatted lines with configured indent.
 */
export function linesToString(lines: JSONLine[], indentSize: "2" | "3" | "4" | "tab"): string {
    const indentStr = indentSize === "tab" ? "\t" : " ".repeat(Number(indentSize));
    return lines
        .map((line) => {
            const keyPrefix = line.key ? line.key : "";
            const indent = indentStr.repeat(line.indentLevel);
            return indent + keyPrefix + line.valueText;
        })
        .join("\n");
}
