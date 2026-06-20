"use client";

import React, {useState, useEffect, useRef} from "react";
import {ToolCard} from "@/components/ui/tool-card";
import {
    Apps20Regular,
    DocumentText20Regular,
    MusicNote220Regular,
    Video20Regular,
    Image20Regular,
    Document20Regular
} from "@fluentui/react-icons";
import {useRouter} from "next/navigation";
import {ToolIcon} from "@/components/ui/tool-icon";
import {TOOLS} from "@/registry/tools";

export type TabCategory = "all" | "audio" | "video" | "image" | "pdf" | "text";

interface ToolsBrowserSectionProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    activeTab: TabCategory;
    setActiveTab: (tab: TabCategory) => void;
}

// Config mapping filter tabs to icons and descriptive labels
const TABS_CONFIG = [
    {id: "all", label: "All Tools", icon: <Apps20Regular className="w-4 h-4 shrink-0"/>},
    {id: "audio", label: "Audio", icon: <MusicNote220Regular className="w-4 h-4 shrink-0"/>},
    {id: "video", label: "Video", icon: <Video20Regular className="w-4 h-4 shrink-0"/>},
    {id: "image", label: "Image", icon: <Image20Regular className="w-4 h-4 shrink-0"/>},
    {id: "pdf", label: "PDF", icon: <Document20Regular className="w-4 h-4 shrink-0"/>},
    {id: "text", label: "Text", icon: <DocumentText20Regular className="w-4 h-4 shrink-0"/>},
] as const;

export function ToolsBrowserSection({
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab
}: ToolsBrowserSectionProps) {
    const [pillStyle, setPillStyle] = useState({left: 0, width: 0});
    const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
    const router = useRouter();

    // Keep active background sliding pill aligned dynamically on resize and active tab changes
    useEffect(() => {
        const updatePill = () => {
            const activeElement = tabRefs.current[activeTab];
            if (activeElement) {
                setPillStyle({
                    left: activeElement.offsetLeft,
                    width: activeElement.offsetWidth,
                });
            }
        };

        updatePill();
        window.addEventListener("resize", updatePill);
        return () => window.removeEventListener("resize", updatePill);
    }, [activeTab]);


    // Compute search and tab matching state values
    const filteredTools = TOOLS.filter((tool) => {
        const matchesTab = activeTab === "all" || tool.category === activeTab;
        const matchesQuery =
            tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tool.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesQuery;
    });

    // Get count of matching tools dynamically to display inside tab labels
    const getTabCount = (category: TabCategory) => {
        return TOOLS.filter((tool) => {
            const matchesTab = category === "all" || tool.category === category;
            const matchesQuery =
                tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tool.description.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesTab && matchesQuery;
        }).length;
    };

    return (
        <main id="tools" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8">

            {/* Accessible Tab Filter Bar */}
            <div
                className="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-4 select-none w-full">
                {/* Horizontal swipeable tablist hiding default scrollbars on mobile viewport dimensions, stretching to full width */}
                <div
                    role="tablist"
                    aria-label="Filter tools by file type"
                    className="relative flex items-center w-full bg-surface-secondary/50 p-1 rounded-xl overflow-x-auto scrollbar-none [ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                >
                    {/* Animated sliding background active tab indicator */}
                    <div
                        className="absolute top-1 bottom-1 rounded-lg bg-surface border border-border/80 shadow-xs transition-all duration-300 ease-out z-0"
                        style={{
                            left: `${pillStyle.left}px`,
                            width: `${pillStyle.width}px`
                        }}
                    />

                    {TABS_CONFIG.map((tab) => {
                        const count = getTabCount(tab.id);
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                ref={(el) => {
                                    tabRefs.current[tab.id] = el;
                                }}
                                id={`tab-${tab.id}`}
                                role="tab"
                                aria-selected={isActive}
                                aria-controls="tools-grid"
                                tabIndex={isActive ? 0 : -1}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    relative flex-1 px-4 py-2.5 text-sm font-bold rounded-lg cursor-pointer transition-colors duration-200 flex items-center justify-center gap-2 shrink-0 z-10 whitespace-nowrap
                                    focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none select-none
                                    ${isActive
                                    ? "text-primary"
                                    : "text-text-muted hover:text-text-secondary"}
                                `}
                            >
                                {tab.icon}
                                <span className="capitalize">{tab.label}</span>
                                <span
                                    className={`text-[10px] font-bold px-1.5 py-px rounded-md border transition-colors duration-200 z-20 ${
                                        isActive
                                            ? "bg-primary/10 border-primary/20 text-primary"
                                            : "bg-surface-secondary/80 border-border text-text-muted"
                                    }`}
                                >
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {searchQuery && (
                    <div className="text-xs text-text-muted font-normal">
                        Showing {filteredTools.length} of {TOOLS.length} total tools
                    </div>
                )}
            </div>

            {/* Dynamic Tab Panel grid list */}
            {filteredTools.length === 0 ? (
                <div
                    role="tabpanel"
                    id="tools-grid"
                    aria-labelledby={`tab-${activeTab}`}
                    className="w-full py-16 px-4 text-center border border-dashed border-border rounded-2xl bg-surface-secondary/20 max-w-md mx-auto space-y-4"
                >
                    <div
                        className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center text-text-muted mx-auto shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2"
                             stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round"
                                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
                        </svg>
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-sm font-bold text-text-primary">No tools match your search</h4>
                        <p className="text-xs text-text-muted max-w-xs mx-auto leading-relaxed">
                            We couldn't find any tools matching &ldquo;<span
                            className="text-primary font-bold">{searchQuery}</span>&rdquo;. Try searching for generic
                            words like &ldquo;compress&rdquo; or &ldquo;merge&rdquo;.
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setSearchQuery("");
                            setActiveTab("all");
                        }}
                        className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                    >
                        Reset Filters
                    </button>
                </div>
            ) : (
                <div
                    role="tabpanel"
                    id="tools-grid"
                    aria-labelledby={`tab-${activeTab}`}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                >
                    {filteredTools.map((tool) => (
                        <ToolCard
                            key={tool.slug}
                            name={tool.title}
                            desc={tool.description}
                            icon={<ToolIcon iconId={tool.iconId}/>}
                            onClick={() => router.push(`/tools/${tool.slug}`)}
                        />
                    ))}
                </div>
            )}
        </main>
    );
}
