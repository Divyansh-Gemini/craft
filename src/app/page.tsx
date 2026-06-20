"use client";

import React, {useState, useRef} from "react";
import {HeroSection} from "@/components/sections/hero-section";
import {TrustBadgesSection} from "@/components/sections/trust-badges-section";
import {ToolsBrowserSection, TabCategory} from "@/components/sections/tools-browser-section";
import {PrivacyBannerSection} from "@/components/sections/privacy-banner-section";

export default function Home() {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<TabCategory>("all");
    const searchInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="flex-1 w-full flex flex-col bg-background text-text-primary transition-colors duration-200">
            {/* Hero Section with Search Input */}
            <HeroSection
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchInputRef={searchInputRef}
                setActiveTab={setActiveTab}
            />

            {/* Horizontal Trust Badges Grid */}
            <TrustBadgesSection/>

            {/* Dynamic Filter Tab List and Tool Grid Browser */}
            <ToolsBrowserSection
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            />

            {/* Privacy Feature Banner */}
            <PrivacyBannerSection/>
        </div>
    );
}
