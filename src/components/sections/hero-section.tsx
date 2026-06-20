"use client";

import React from "react";
import {TabCategory} from "./tools-browser-section";

interface HeroSectionProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    searchInputRef: React.RefObject<HTMLInputElement | null>;
    setActiveTab: (tab: TabCategory) => void;
}

interface FloatingShortcut {
    extension: string;
    category: TabCategory;
    positionClass: string;
    animationDuration: string;
    dotColorClass: string;
    connectorPath: string;
}

const FLOATING_SHORTCUTS: FloatingShortcut[] = [
    {
        extension: ".mp3",
        category: "audio",
        positionClass: "top-[22%] left-[12%]",
        animationDuration: "6s",
        dotColorClass: "bg-emerald-500",
        connectorPath: "M 14 24 Q 25 15, 38 42",
    },
    {
        extension: ".mp4",
        category: "video",
        positionClass: "top-[18%] right-[12%]",
        animationDuration: "8s",
        dotColorClass: "bg-sky-500",
        connectorPath: "M 86 20 Q 75 10, 62 40",
    },
    {
        extension: ".png",
        category: "image",
        positionClass: "bottom-[20%] left-[10%]",
        animationDuration: "7s",
        dotColorClass: "bg-amber-500",
        connectorPath: "M 12 78 Q 20 88, 38 68",
    },
    {
        extension: ".pdf",
        category: "pdf",
        positionClass: "bottom-[25%] right-[12%]",
        animationDuration: "9s",
        dotColorClass: "bg-red-500",
        connectorPath: "M 84 74 Q 80 88, 62 66",
    },
];

export function HeroSection({searchQuery, setSearchQuery, searchInputRef, setActiveTab}: HeroSectionProps) {
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [searchInputRef]);

    const handleShortcutClick = (category: TabCategory) => {
        setActiveTab(category);
        const element = document.getElementById("tools");
        if (element) {
            const elementPosition = element.getBoundingClientRect().top + window.scrollY;
            const offsetPosition = elementPosition - 50; // 80px offset to prevent sticky header clipping
            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
        }
    };

    return (
        <section className="relative overflow-hidden w-full pt-20 pb-16 transition-colors duration-200 z-0">

            {/* Subtle decorative background vector connectors */}
            <div className="absolute inset-0 max-w-7xl mx-auto -z-10 pointer-events-none hidden md:block">
                <svg
                    className="w-full h-full opacity-[0.08] dark:opacity-[0.12]"
                    fill="none"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {FLOATING_SHORTCUTS.map((shortcut, idx) => (
                        <path
                            key={idx}
                            d={shortcut.connectorPath}
                            stroke="currentColor"
                            strokeWidth="0.15"
                            strokeDasharray="1.5 1.5"
                        />
                    ))}
                </svg>

                {/* Floating file shortcuts */}
                {FLOATING_SHORTCUTS.map((shortcut, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleShortcutClick(shortcut.category)}
                        className={`absolute ${shortcut.positionClass} animate-bounce bg-surface border border-border/80 px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer pointer-events-auto hover:border-primary hover:shadow-lg transition-all duration-200`}
                        style={{animationDuration: shortcut.animationDuration}}
                    >
                        <span className={`w-2.5 h-2.5 rounded-full ${shortcut.dotColorClass}`}/>
                        <span className="text-[10px] font-bold tracking-wider text-text-secondary font-mono">
                            {shortcut.extension}
                        </span>
                    </button>
                ))}
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
                <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-text-primary leading-tight">
                    Your file <span className="text-primary font-black relative">workshop<span
                    className="absolute left-0 bottom-0.5 w-full h-1.25 bg-primary/10 rounded-sm"/></span>.
                </h2>
                <p className="max-w-xl mx-auto text-sm sm:text-base text-text-secondary leading-relaxed font-normal">
                    Convert, trim, merge, compress, and transform files in seconds.
                    Designed to be fast, simple, and privacy-conscious.
                </p>

                {/* Command Search Container */}
                <div className="max-w-xl mx-auto pt-6">
                    <div className="relative group">
                        <div
                            className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors duration-200">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2"
                                 stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round"
                                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.602 10.602z"/>
                            </svg>
                        </div>
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search tools... (Press '/' to focus)"
                            className="w-full bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-2xl py-3.5 pl-11 pr-14 text-xs shadow-sm transition-all duration-200 text-text-primary placeholder:text-text-muted outline-none"
                        />
                        <div
                            className="absolute inset-y-0 right-0 pr-4 hidden sm:flex items-center pointer-events-none select-none font-mono text-[10px] text-text-muted font-bold">
                            <kbd
                                className="px-1.5 py-0.5 rounded border border-border bg-surface-secondary shadow-xs">/</kbd>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

