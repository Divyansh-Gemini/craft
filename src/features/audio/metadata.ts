// Client-side utility for reading and writing audio metadata
export interface AudioFile {
    id: string;
    file: File;
    title: string;
    artist: string;
    album: string;
    albumArtist: string;
    composer: string;
    genre: string;
    year: string;
    trackNumber: string;
    trackTotal: string;
    discNumber: string;
    discTotal: string;
    comment: string;
    lyrics: string;
    bpm: string;
    grouping: string;
    band: string;
    language: string;
    originalArtist: string;
    copyright: string;
    coverArtUrl: string;
    coverArtData: {
        data: Uint8Array;
        format: string;
    } | null;
    duration: number; // in seconds
    format: string; // e.g. "mp3"
    bitrate: number; // bits per second
    sampleRate: number;
    channels: number;
    isModified: boolean;
    isSaving: boolean;
    isSaved: boolean;
    error?: string;
}

/**
 * Parses an audio file to extract metadata tags and technical properties.
 */
export async function parseAudioFile(file: File): Promise<AudioFile> {
    const id = Math.random().toString(36).substring(2, 9);

    try {
        // Dynamically import music-metadata to ensure it runs only in the browser
        const mm = await import("music-metadata");
        const metadata = await mm.parseBlob(file);
        const {common, format} = metadata;

        let coverArtUrl = "";
        let coverArtData: { data: Uint8Array; format: string } | null = null;

        if (common.picture && common.picture.length > 0) {
            const pic = common.picture[0];
            coverArtData = {
                data: pic.data,
                format: pic.format
            };
            const blob = new Blob([pic.data as any], {type: pic.format});
            coverArtUrl = URL.createObjectURL(blob);
        }

        // Format artist arrays
        const artist = common.artist || (common.artists ? common.artists.join(", ") : "");
        const composer = common.composer ? common.composer.join(", ") : "";
        const genre = common.genre ? common.genre.join(", ") : "";

        // Track and Disc parsing
        const trackNumber = common.track?.no?.toString() || "";
        const trackTotal = common.track?.of?.toString() || "";
        const discNumber = common.disk?.no?.toString() || "";
        const discTotal = common.disk?.of?.toString() || "";

        // Extract comments and lyrics which can be string or object
        const commentList = common.comment;
        let commentText = "";
        if (commentList && commentList.length > 0) {
            const first = commentList[0];
            commentText = typeof first === "string" ? first : (first && typeof first === "object" && "text" in first ? (first as any).text : "");
        }

        const lyricsList = common.lyrics;
        let lyricsText = "";
        if (lyricsList && lyricsList.length > 0) {
            const first = lyricsList[0];
            lyricsText = typeof first === "string" ? first : (first && typeof first === "object" && "text" in first ? (first as any).text : "");
        }

        const grouping = common.grouping || "";
        const language = common.language || "";
        const copyright = common.copyright || "";
        let originalArtist = common.originalartist || "";
        let band = "";

        // Extract band and originalArtist fallbacks from native tags if metadata.native exists
        if (metadata.native) {
            for (const tagType of Object.keys(metadata.native)) {
                const tags = metadata.native[tagType] || [];

                // TXXX:BAND user defined frame
                const bandTag = tags.find(t => t.id === "TXXX" && t.value && typeof t.value === "object" && "description" in t.value && (t.value as any).description === "BAND");
                if (bandTag && bandTag.value) {
                    let bVal = (bandTag.value as any).text || (bandTag.value as any).value || "";
                    if (Array.isArray(bVal)) bVal = bVal.join(", ");
                    band = bVal;
                }

                // TXXX:ORIGINAL ARTIST
                const origArtistTag = tags.find(t => t.id === "TXXX" && t.value && typeof t.value === "object" && "description" in t.value && (t.value as any).description === "ORIGINAL ARTIST");
                if (origArtistTag && origArtistTag.value && !originalArtist) {
                    let oaVal = (origArtistTag.value as any).text || (origArtistTag.value as any).value || "";
                    if (Array.isArray(oaVal)) oaVal = oaVal.join(", ");
                    originalArtist = oaVal;
                }
            }
        }

        return {
            id,
            file,
            title: common.title || file.name.replace(/\.[^/.]+$/, ""), // Fallback to filename without extension
            artist,
            album: common.album || "",
            albumArtist: common.albumartist || "",
            composer,
            genre,
            year: common.year?.toString() || "",
            trackNumber,
            trackTotal,
            discNumber,
            discTotal,
            comment: commentText,
            lyrics: lyricsText,
            bpm: common.bpm?.toString() || "",
            grouping,
            band,
            language,
            originalArtist,
            copyright,
            coverArtUrl,
            coverArtData,
            duration: format.duration || 0,
            format: format.container || "mp3",
            bitrate: format.bitrate || 0,
            sampleRate: format.sampleRate || 0,
            channels: format.numberOfChannels || 2,
            isModified: false,
            isSaving: false,
            isSaved: false
        };
    } catch (error: any) {
        console.error("Error parsing audio file:", error);
        // Return a baseline shell with filename as title
        return {
            id,
            file,
            title: file.name.replace(/\.[^/.]+$/, ""),
            artist: "",
            album: "",
            albumArtist: "",
            composer: "",
            genre: "",
            year: "",
            trackNumber: "",
            trackTotal: "",
            discNumber: "",
            discTotal: "",
            comment: "",
            lyrics: "",
            bpm: "",
            grouping: "",
            band: "",
            language: "",
            originalArtist: "",
            copyright: "",
            coverArtUrl: "",
            coverArtData: null,
            duration: 0,
            format: file.name.split(".").pop() || "mp3",
            bitrate: 0,
            sampleRate: 0,
            channels: 2,
            isModified: false,
            isSaving: false,
            isSaved: false,
            error: error?.message || "Failed to parse file metadata."
        };
    }
}

/**
 * Writes updated metadata to an MP3 file.
 * NOTE: browser-id3-writer specifically works on MP3 files (ID3v2.3 tags).
 */
export async function writeAudioMetadata(audioFile: AudioFile): Promise<Blob> {
    try {
        const ID3WriterModule = await import("browser-id3-writer");
        const ID3Writer = ID3WriterModule.ID3Writer || (ID3WriterModule as any).default?.ID3Writer || ID3WriterModule.default || ID3WriterModule;

        const fileBuffer = await audioFile.file.arrayBuffer();
        const writer = new ID3Writer(fileBuffer);

        // Map basic text fields
        if (audioFile.title) writer.setFrame("TIT2", audioFile.title);
        if (audioFile.album) writer.setFrame("TALB", audioFile.album);
        if (audioFile.albumArtist) writer.setFrame("TPE2", audioFile.albumArtist);

        // Artists are passed as an array of strings
        if (audioFile.artist) {
            const artists = audioFile.artist.split(",").map(a => a.trim()).filter(Boolean);
            writer.setFrame("TPE1", artists);
        } else {
            writer.setFrame("TPE1", []);
        }

        // Composers
        if (audioFile.composer) {
            const composers = audioFile.composer.split(",").map(c => c.trim()).filter(Boolean);
            writer.setFrame("TCOM", composers);
        }

        // Genres
        if (audioFile.genre) {
            const genres = audioFile.genre.split(",").map(g => g.trim()).filter(Boolean);
            writer.setFrame("TCON", genres);
        }

        // Track and Disc
        if (audioFile.trackNumber) {
            const trackStr = audioFile.trackTotal
                ? `${audioFile.trackNumber}/${audioFile.trackTotal}`
                : audioFile.trackNumber;
            writer.setFrame("TRCK", trackStr);
        }

        if (audioFile.discNumber) {
            const discStr = audioFile.discTotal
                ? `${audioFile.discNumber}/${audioFile.discTotal}`
                : audioFile.discNumber;
            writer.setFrame("TPOS", discStr);
        }

        // Numerical / Date fields
        if (audioFile.year) {
            const yearVal = parseInt(audioFile.year, 10);
            if (!isNaN(yearVal)) {
                writer.setFrame("TYER", yearVal);
            }
        }

        if (audioFile.bpm) {
            const bpmVal = parseInt(audioFile.bpm, 10);
            if (!isNaN(bpmVal)) {
                writer.setFrame("TBPM", bpmVal);
            }
        }

        // Comment - COMM requires { description: string, text: string }
        if (audioFile.comment) {
            writer.setFrame("COMM", {
                description: "",
                text: audioFile.comment
            });
        }

        // Grouping (TIT1), Language (TLAN), Copyright (TCOP)
        if (audioFile.grouping) writer.setFrame("TIT1", audioFile.grouping);
        if (audioFile.language) writer.setFrame("TLAN", audioFile.language);
        if (audioFile.copyright) writer.setFrame("TCOP", audioFile.copyright);

        // Band (TXXX:BAND) and Original Artist (TXXX:ORIGINAL ARTIST)
        if (audioFile.band) {
            writer.setFrame("TXXX", {
                description: "BAND",
                value: audioFile.band
            });
        }
        if (audioFile.originalArtist) {
            writer.setFrame("TXXX", {
                description: "ORIGINAL ARTIST",
                value: audioFile.originalArtist
            });
        }

        // Lyrics - USLT requires { language: string, description: string, lyrics: string }
        if (audioFile.lyrics) {
            writer.setFrame("USLT", {
                language: "eng",
                description: "",
                lyrics: audioFile.lyrics
            });
        }

        // Cover Art (APIC)
        if (audioFile.coverArtData) {
            const rawData = audioFile.coverArtData.data;
            // Slice the underlying ArrayBuffer to ensure browser-id3-writer receives a buffer starting at offset 0 with correct magic bytes
            const cleanArrayBuffer = rawData.buffer.slice(
                rawData.byteOffset,
                rawData.byteOffset + rawData.byteLength
            );

            writer.setFrame("APIC", {
                type: 3, // 3 is front cover
                data: cleanArrayBuffer,
                description: "Cover Art"
            });
        }

        writer.addTag();
        return writer.getBlob();
    } catch (error: any) {
        console.error("Error writing metadata:", error);
        throw new Error(error?.message || "Failed to write metadata tags to file.");
    }
}
