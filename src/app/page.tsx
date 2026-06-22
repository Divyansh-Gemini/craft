"use client";

import React, {useState, useRef, useEffect, useLayoutEffect} from "react";
import {HeroSection} from "@/components/sections/hero-section";
import {TrustBadgesSection} from "@/components/sections/trust-badges-section";
import {ToolsBrowserSection, TabCategory} from "@/components/sections/tools-browser-section";
import {PrivacyBannerSection} from "@/components/sections/privacy-banner-section";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function Home() {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<TabCategory>("all");
    const searchInputRef = useRef<HTMLInputElement>(null);

    const isRestoringRef = useRef(false);

    // Restore selected tab and scroll position from sessionStorage on mount
    useIsomorphicLayoutEffect(() => {
        const savedTab = sessionStorage.getItem("activeTab") as TabCategory;
        if (savedTab) {
            setActiveTab(savedTab);
        }

        const savedScrollY = sessionStorage.getItem("homeScrollY");
        const scrollY = savedScrollY ? parseInt(savedScrollY, 10) : 0;

        isRestoringRef.current = true;

        // Scroll immediately before paint to prevent visual jumps
        window.scrollTo(0, scrollY);

        // Run a secondary restoration pass in case of height shift/re-render, then release guard
        const timer = setTimeout(() => {
            window.scrollTo(0, scrollY);
            isRestoringRef.current = false;
        }, 50);

        return () => clearTimeout(timer);
    }, []);

    // Listen to scroll events to save scroll position
    useEffect(() => {
        let timeoutId: NodeJS.Timeout | null = null;

        const handleScroll = () => {
            if (isRestoringRef.current) return;
            if (timeoutId) return;

            timeoutId = setTimeout(() => {
                timeoutId = null;
                if (!isRestoringRef.current && window.location.pathname === "/") {
                    sessionStorage.setItem("homeScrollY", window.scrollY.toString());
                }
            }, 100);
        };

        window.addEventListener("scroll", handleScroll, {passive: true});

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            // Save the exact final scroll position immediately on unmount
            if (!isRestoringRef.current && window.location.pathname === "/") {
                sessionStorage.setItem("homeScrollY", window.scrollY.toString());
            }
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    // Helper wrapper to update both state and sessionStorage
    const handleSetActiveTab = (tab: TabCategory) => {
        setActiveTab(tab);
        sessionStorage.setItem("activeTab", tab);
    };

    return (
        <div className="flex-1 w-full flex flex-col bg-background text-text-primary transition-colors duration-200">
            {/* Hero Section with Search Input */}
            <HeroSection
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchInputRef={searchInputRef}
                setActiveTab={handleSetActiveTab}
            />

            {/* Horizontal Trust Badges Grid */}
            <TrustBadgesSection/>

            {/* Dynamic Filter Tab List and Tool Grid Browser */}
            <ToolsBrowserSection
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                activeTab={activeTab}
                setActiveTab={handleSetActiveTab}
            />

            {/* Privacy Feature Banner */}
            <PrivacyBannerSection/>
        </div>
    );
}
