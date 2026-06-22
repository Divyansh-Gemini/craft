import {Tool} from "@/types/tool";
import {UnderDevelopmentView} from "@/components/sections/under-development-view";
import {TextCounterView} from "@/components/tools/text-counter-view";
import {JsonFormatterView} from "@/components/tools/json-formatter-view";
import {TextDiffView} from "@/components/tools/text-diff-view";
import {ConvertImageView} from "@/components/tools/convert-image-view";
import {ResizeImageView} from "@/components/tools/resize-image-view";
import {CompressImageView} from "@/components/tools/compress-image-view";
import {IcoGeneratorView} from "@/components/tools/ico-generator-view";
import {PdfToImagesView} from "@/components/tools/pdf-to-images-view";
import {MergePdfView} from "@/components/tools/merge-pdf-view";
import {RemovePdfView} from "@/components/tools/remove-pdf-view";

export const TOOLS: Tool[] = [
    {
        slug: "edit-audio-metadata",
        title: "Edit Audio Metadata",
        description: "Modify tags, artwork, and technical details for MP3, FLAC, WAV, and other formats.",
        category: "audio",
        iconId: "music-note",
        component: UnderDevelopmentView
    },
    {
        slug: "trim-audio",
        title: "Trim Audio",
        description: "Cut audio files to the perfect start and end times.",
        category: "audio",
        iconId: "cut",
        component: UnderDevelopmentView
    },
    {
        slug: "merge-audio",
        title: "Merge Audio",
        description: "Combine multiple audio tracks into a single file.",
        category: "audio",
        iconId: "add",
        component: UnderDevelopmentView
    },
    {
        slug: "compress-audio",
        title: "Compress Audio",
        description: "Reduce audio file size without losing any audio quality.",
        category: "audio",
        iconId: "resize-small",
        component: UnderDevelopmentView
    },
    {
        slug: "convert-audio",
        title: "Convert Audio Format",
        description: "Convert between MP3, WAV, FLAC, M4A, and other formats.",
        category: "audio",
        iconId: "arrow-swap",
        component: UnderDevelopmentView
    },

    // Video Tools (8)
    {
        slug: "trim-video",
        title: "Trim Video",
        description: "Cut video files to the perfect duration.",
        category: "video",
        iconId: "cut",
        component: UnderDevelopmentView
    },
    {
        slug: "merge-video",
        title: "Merge Video",
        description: "Combine multiple video clips into a single video file.",
        category: "video",
        iconId: "add",
        component: UnderDevelopmentView
    },
    {
        slug: "compress-video",
        title: "Compress Video",
        description: "Reduce video file size while maintaining original quality.",
        category: "video",
        iconId: "resize-small",
        component: UnderDevelopmentView
    },
    {
        slug: "mute-video",
        title: "Mute Video",
        description: "Remove the audio track from any video clip.",
        category: "video",
        iconId: "speaker-mute",
        component: UnderDevelopmentView
    },
    {
        slug: "extract-audio",
        title: "Extract Audio from Video",
        description: "Save the audio track of a video as a standalone audio file.",
        category: "video",
        iconId: "arrow-download",
        component: UnderDevelopmentView
    },
    {
        slug: "video-to-gif",
        title: "Video to GIF",
        description: "Convert a video clip into an animated GIF image.",
        category: "video",
        iconId: "image",
        component: UnderDevelopmentView
    },
    {
        slug: "convert-video",
        title: "Convert Video Format",
        description: "Convert between MP4, WebM, AVI, and other formats.",
        category: "video",
        iconId: "arrow-swap",
        component: UnderDevelopmentView
    },
    {
        slug: "image-audio-to-video",
        title: "Image + Audio → Video",
        description: "Create a video by combining a static image with an audio track.",
        category: "video",
        iconId: "video",
        component: UnderDevelopmentView
    },

    // Image Tools (4)
    {
        slug: "resize-image",
        title: "Resize Image",
        description: "Scale and adjust image width and height dimensions.",
        category: "image",
        iconId: "resize-image",
        component: ResizeImageView
    },
    {
        slug: "compress-image",
        title: "Compress Image",
        description: "Compress PNG, JPG, or WebP images without quality degradation.",
        category: "image",
        iconId: "resize-small",
        component: CompressImageView
    },
    {
        slug: "convert-image",
        title: "Convert Image Format",
        description: "Convert between PNG, JPG, WebP, AVIF, and other formats.",
        category: "image",
        iconId: "arrow-swap",
        component: ConvertImageView
    },
    {
        slug: "generate-ico",
        title: "Generate ICO (from Image/SVG)",
        description: "Convert vector SVG files or standard PNG/JPG images into favicon ICO files.",
        category: "image",
        iconId: "image",
        component: IcoGeneratorView
    },

    // PDF Tools (6)
    {
        slug: "merge-pdf",
        title: "Merge PDFs",
        description: "Join multiple PDF files into a single document.",
        category: "pdf",
        iconId: "document-add",
        component: MergePdfView
    },
    {
        slug: "extract-pdf",
        title: "Extract PDF Pages",
        description: "Extract specific pages or page ranges from a PDF file.",
        category: "pdf",
        iconId: "document-text-extract",
        component: UnderDevelopmentView
    },
    {
        slug: "remove-pdf",
        title: "Remove PDF Pages",
        description: "Delete unwanted pages from a PDF document.",
        category: "pdf",
        iconId: "document-dismiss",
        component: RemovePdfView
    },
    {
        slug: "reorder-pdf",
        title: "Reorder PDF Pages",
        description: "Rearrange the page sequence inside a PDF file.",
        category: "pdf",
        iconId: "reorder",
        component: UnderDevelopmentView
    },
    {
        slug: "images-to-pdf",
        title: "Image(s) → PDF",
        description: "Convert one or more images into a single PDF document.",
        category: "pdf",
        iconId: "document",
        component: UnderDevelopmentView
    },
    {
        slug: "pdf-to-images",
        title: "PDF → Image(s)",
        description: "Convert PDF pages into high-quality PNG or JPG images.",
        category: "pdf",
        iconId: "image",
        component: PdfToImagesView
    },

    // Text Tools (3)
    {
        slug: "json-formatter",
        title: "JSON Formatter",
        description: "Beautify, format, and validate JSON data structures.",
        category: "text",
        iconId: "code",
        component: JsonFormatterView
    },
    {
        slug: "text-counter",
        title: "Text Counter",
        description: "Count characters, words, sentences, and lines in your text.",
        category: "text",
        iconId: "text-word-count",
        component: TextCounterView
    },
    {
        slug: "text-diff",
        title: "Text Difference Viewer",
        description: "Compare two text blocks and highlight additions, deletions, and changes.",
        category: "text",
        iconId: "item-compare",
        component: TextDiffView
    }
];
