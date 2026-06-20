"use client";

import React from "react";
import {
    DocumentText20Regular,
    MusicNote220Regular,
    Cut20Regular,
    Add20Regular,
    ResizeSmall20Regular,
    ArrowSwap20Regular,
    Video20Regular,
    SpeakerMute20Regular,
    ArrowDownload20Regular,
    Image20Regular,
    ResizeImage20Regular,
    DocumentAdd20Regular,
    DocumentTextExtract20Regular,
    DocumentDismiss20Regular,
    Reorder20Regular,
    Document20Regular,
    Code20Regular,
    TextWordCount20Regular,
    ItemCompare20Regular
} from "@fluentui/react-icons";

interface ToolIconProps {
    iconId: string;
    className?: string;
}

export function ToolIcon({iconId, className}: ToolIconProps) {
    const props = {className};
    switch (iconId) {
        case "music-note":
            return <MusicNote220Regular {...props} />;
        case "cut":
            return <Cut20Regular {...props} />;
        case "add":
            return <Add20Regular {...props} />;
        case "resize-small":
            return <ResizeSmall20Regular {...props} />;
        case "arrow-swap":
            return <ArrowSwap20Regular {...props} />;
        case "video":
            return <Video20Regular {...props} />;
        case "speaker-mute":
            return <SpeakerMute20Regular {...props} />;
        case "arrow-download":
            return <ArrowDownload20Regular {...props} />;
        case "image":
            return <Image20Regular {...props} />;
        case "resize-image":
            return <ResizeImage20Regular {...props} />;
        case "document-add":
            return <DocumentAdd20Regular {...props} />;
        case "document-text-extract":
            return <DocumentTextExtract20Regular {...props} />;
        case "document-dismiss":
            return <DocumentDismiss20Regular {...props} />;
        case "reorder":
            return <Reorder20Regular {...props} />;
        case "document":
            return <Document20Regular {...props} />;
        case "code":
            return <Code20Regular {...props} />;
        case "text-word-count":
            return <TextWordCount20Regular {...props} />;
        case "item-compare":
            return <ItemCompare20Regular {...props} />;
        default:
            return <DocumentText20Regular {...props} />;
    }
}
