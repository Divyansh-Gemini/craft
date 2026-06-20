"use client";

import React, {useEffect, useState} from "react";
import {useTheme} from "@/hooks/use-theme";
import {ThemeMode} from "@/types/theme";
import {WeatherSunny20Regular, WeatherMoon20Regular, Desktop20Regular} from "@fluentui/react-icons";

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
            icon: <WeatherSunny20Regular className="w-4 h-4 text-text-muted group-hover:text-text-secondary"/>,
        },
        {
            value: "dark",
            label: "Dark",
            icon: <WeatherMoon20Regular className="w-4 h-4 text-text-muted group-hover:text-text-secondary"/>,
        },
        {
            value: "system",
            label: "System",
            icon: <Desktop20Regular className="w-4 h-4 text-text-muted group-hover:text-text-secondary"/>,
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
