export interface TextCounterStats {
    charCountWithSpaces: number;
    charCountNoSpaces: number;
    wordsArray: string[];
    wordCount: number;
    sentencesCount: number;
    paragraphsCount: number;
    linesCount: number;
    readingMin: number;
    readingSec: number;
    speakingMin: number;
    speakingSec: number;
    topWords: [string, number][];
}

export const STOP_WORDS = new Set([
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

/**
 * Calculates core stats (character counts, sentences, reading and speaking times, keyword frequency).
 */
export function calculateTextStats(text: string): TextCounterStats {
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
}

/**
 * Transforms text case based on target format.
 */
export function transformTextContent(text: string, type: "upper" | "lower" | "title" | "sentence"): string {
    if (!text) return "";
    if (type === "upper") {
        return text.toUpperCase();
    } else if (type === "lower") {
        return text.toLowerCase();
    } else if (type === "title") {
        return text.replace(/\b\w/g, (char) => char.toUpperCase());
    } else if (type === "sentence") {
        return text.toLowerCase().replace(/(^\s*|[.!?]\s+)([a-z])/g, (match) => match.toUpperCase());
    }
    return text;
}
