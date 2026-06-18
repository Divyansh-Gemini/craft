"use client";

import React, {createContext, useContext, useEffect, useState} from "react";
import {ThemeMode, ThemeContextType} from "@/types/theme";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({children, defaultTheme = "system"}: {
    children: React.ReactNode;
    defaultTheme?: ThemeMode;
}) => {
    const [theme, setThemeState] = useState<ThemeMode>(defaultTheme);
    const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

    // Load theme from localStorage on initial render
    useEffect(() => {
        const savedTheme = localStorage.getItem("theme") as ThemeMode | null;
        if (savedTheme) {
            setThemeState(savedTheme);
        }
    }, []);

    // Sync theme with document class and system media queries
    useEffect(() => {
        const root = window.document.documentElement;
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

        const updateTheme = () => {
            let active: "light" | "dark";

            if (theme === "system") {
                active = mediaQuery.matches ? "dark" : "light";
            } else {
                active = theme;
            }

            setResolvedTheme(active);

            if (active === "dark") {
                root.classList.add("dark");
            } else {
                root.classList.remove("dark");
            }
        };

        updateTheme();

        // Listen to media query changes if theme is set to system
        if (theme === "system") {
            const listener = () => updateTheme();
            mediaQuery.addEventListener("change", listener);
            return () => mediaQuery.removeEventListener("change", listener);
        }
    }, [theme]);

    // Expose theme setting function that also updates localStorage
    const setTheme = (newTheme: ThemeMode) => {
        localStorage.setItem("theme", newTheme);
        setThemeState(newTheme);
    };

    return (
        <ThemeContext.Provider value={{theme, resolvedTheme, setTheme}}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};
