"use client";

import React from "react";
import {ThemeToggle} from "@/components/theme-toggle";
import {Logo} from "@/components/ui/logo";
import Link from "next/link";

export function Header() {
    return (
        <header
            className="w-full border-b border-border bg-surface/50 backdrop-blur-md sticky top-0 z-50 transition-colors duration-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center cursor-pointer group" scroll={false}>
                    <Logo className="h-7 w-auto text-primary hover:opacity-90 transition-opacity duration-200"/>
                </Link>

                {/* Theme Toggle */}
                <div className="flex items-center gap-3">
                    <ThemeToggle/>
                </div>
            </div>
        </header>
    );
}
