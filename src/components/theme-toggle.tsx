"use client";

import React, {useEffect, useState} from "react";
import {useTheme} from "@/hooks/use-theme";
import {ThemeMode} from "@/types/theme";

export function ThemeToggle() {
    const {theme, setTheme} = useTheme();
    const [mounted, setMounted] = useState(false);

    // Avoid hydration mismatch by only rendering the interactive UI on client
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="h-9 w-60 rounded-lg bg-surface-secondary border border-border animate-pulse"/>
        );
    }

    const options: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
        {
            value: "light",
            label: "Light",
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    className="w-4 h-4"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 3v2.25m0 13.5V21M9.75 12h-4.5m13.5 0h-4.5m-2.94-6.33L9.63 7.8m7.56 8.4l-1.92-1.92m-9.69 0l1.92-1.92m7.56-8.4l-1.92 1.92M12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z"
                    />
                </svg>
            ),
        },
        {
            value: "dark",
            label: "Dark",
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    className="w-4 h-4"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
                    />
                </svg>
            ),
        },
        {
            value: "system",
            label: "System",
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    className="w-4 h-4"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
                    />
                </svg>
            ),
        },
    ];

    return (
        <div
            className="relative flex p-0.5 bg-surface-secondary border border-border rounded-lg shadow-sm transition-all duration-300">
            {options.map((opt) => {
                const isActive = theme === opt.value;
                return (
                    <button
                        key={opt.value}
                        onClick={() => setTheme(opt.value)}
                        className={`
                            relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-all duration-200 focus:outline-none select-none z-10
                            ${isActive ? "text-text-primary" : "text-text-muted hover:text-text-secondary"}
                        `}
                    >
                        {/* Sliding Pill Background inside active button */}
                        {isActive && (
                            <span
                                className="absolute inset-0 bg-surface border border-border shadow-sm rounded-md -z-10 transition-transform duration-300"/>
                        )}
                        {opt.icon}
                        <span>{opt.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
