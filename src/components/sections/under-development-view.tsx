"use client";

import React from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {
    ArrowLeft20Regular,
    Wrench20Regular
} from "@fluentui/react-icons";
import {ToolIcon} from "@/components/ui/tool-icon";
import {TOOLS} from "@/registry/tools";
import {Tool} from "@/types/tool";

export interface UnderDevelopmentViewProps {
    tool: Tool;
}

const categoryConfig = {
    audio: {
        bg: "bg-blue-500/10 dark:bg-blue-500/20",
        border: "border-blue-500/20 dark:border-blue-500/30",
        text: "text-blue-600 dark:text-blue-400",
        gradient: "from-blue-600 via-indigo-600 to-blue-500",
        shadow: "shadow-blue-500/5",
        label: "Audio Utilities"
    },
    video: {
        bg: "bg-purple-500/10 dark:bg-purple-500/20",
        border: "border-purple-500/20 dark:border-purple-500/30",
        text: "text-purple-600 dark:text-purple-400",
        gradient: "from-purple-600 via-pink-600 to-pink-500",
        shadow: "shadow-purple-500/5",
        label: "Video Utilities"
    },
    image: {
        bg: "bg-rose-500/10 dark:bg-rose-500/20",
        border: "border-rose-500/20 dark:border-rose-500/30",
        text: "text-rose-600 dark:text-rose-400",
        gradient: "from-rose-500 via-orange-500 to-orange-400",
        shadow: "shadow-rose-500/5",
        label: "Image Utilities"
    },
    pdf: {
        bg: "bg-red-500/10 dark:bg-red-500/20",
        border: "border-red-500/20 dark:border-red-500/30",
        text: "text-red-600 dark:text-red-400",
        gradient: "from-red-600 via-rose-600 to-red-500",
        shadow: "shadow-red-500/5",
        label: "PDF Workshop"
    },
    text: {
        bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
        border: "border-emerald-500/20 dark:border-emerald-500/30",
        text: "text-emerald-600 dark:text-emerald-400",
        gradient: "from-emerald-600 via-teal-600 to-teal-500",
        shadow: "shadow-emerald-500/5",
        label: "Text Utilities"
    }
};

export function UnderDevelopmentView({tool}: UnderDevelopmentViewProps) {
    const router = useRouter();
    const config = categoryConfig[tool.category];

    // Filter for related tools in the same category
    const relatedTools = TOOLS
        .filter((t) => t.category === tool.category && t.slug !== tool.slug)
        .slice(0, 3);

    return (
        <div className="w-full flex-1 relative overflow-hidden">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 relative z-10 space-y-12">
                {/* Glassmorphism Hero Panel */}
                <div
                    className="relative border border-border bg-surface/40 backdrop-blur-xl rounded-3xl p-6 sm:p-10 shadow-xl overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
                    <div className="space-y-4 max-w-xl">
                        {/* Tag Badge */}
                        <div
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${config.bg} ${config.border} ${config.text}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"/>
                            {config.label}
                        </div>

                        {/* Title & Description */}
                        <div className="space-y-2">
                            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-text-primary leading-tight">
                                {tool.title}
                            </h1>
                            <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
                                {tool.description}
                            </p>
                        </div>
                    </div>

                    {/* Tool Big Icon Box */}
                    <div
                        className={`w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-2xl ${config.bg} ${config.border} ${config.text} border flex items-center justify-center shadow-lg relative group-hover:scale-105 transition-transform duration-300`}>
                        <div className="transform scale-125 sm:scale-150">
                            <ToolIcon iconId={tool.iconId}/>
                        </div>
                    </div>
                </div>

                {/* Centered Visually Appealing Under Development Message Card */}
                <div
                    className="border border-border bg-surface/50 backdrop-blur-md rounded-3xl p-8 sm:p-16 shadow-sm relative overflow-hidden flex flex-col items-center text-center space-y-6">
                    {/* Glowing effect inside card */}
                    <div
                        className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-30 ${config.bg}`}/>
                    <div
                        className={`absolute -bottom-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-30 ${config.bg}`}/>

                    {/* Pulsing Wrench/Construction Icon */}
                    <div
                        className={`w-14 h-14 rounded-full ${config.bg} ${config.border} ${config.text} border flex items-center justify-center relative animate-pulse`}>
                        <Wrench20Regular className="w-6 h-6 transform scale-110"/>
                    </div>

                    <div className="space-y-2 max-w-md">
                        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-text-primary">
                            Under Development
                        </h2>
                        <p className="text-sm text-text-secondary leading-relaxed font-normal">
                            This tool is currently under active development and will be coming soon.
                        </p>
                    </div>
                </div>

                {/* Suggestions Section */}
                {relatedTools.length > 0 && (
                    <div className="space-y-5 border-t border-border pt-10">
                        <h2 className="text-sm font-extrabold tracking-wider uppercase text-text-muted flex items-center gap-2">
                            Related {tool.category} Utilities
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {relatedTools.map((related) => (
                                <Link
                                    href={`/tools/${related.slug}`}
                                    key={related.slug}
                                    className="group p-4 bg-surface/40 hover:bg-surface border border-border hover:border-border-hover rounded-2xl transition-all duration-300 flex items-start justify-between gap-3 shadow-xs hover:shadow-sm"
                                >
                                    <div className="space-y-1">
                                        <h3 className="text-xs font-extrabold text-text-primary group-hover:text-primary transition-colors duration-200">
                                            {related.title}
                                        </h3>
                                        <p className="text-[10px] text-text-muted line-clamp-2 leading-relaxed">
                                            {related.description}
                                        </p>
                                    </div>
                                    <div
                                        className={`w-8 h-8 rounded-lg shrink-0 ${config.bg} ${config.text} border ${config.border} flex items-center justify-center group-hover:scale-105 transition-transform duration-200`}>
                                        <ToolIcon iconId={related.iconId}/>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
