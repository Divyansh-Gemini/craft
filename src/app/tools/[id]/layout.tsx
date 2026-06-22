"use client";

import React from "react";
import Link from "next/link";
import {ArrowLeft20Regular} from "@fluentui/react-icons";

export default function ToolLayout({children}: {
    children: React.ReactNode;
}) {
    return (
        <div className="w-full flex-1 flex flex-col relative overflow-hidden">
            {/* Background Glow */}
            <div
                className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-125 rounded-full blur-[120px] opacity-10 dark:opacity-15 bg-radial from-primary/50 to-transparent pointer-events-none"
            />

            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 relative z-20">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-xs font-bold text-text-muted hover:text-primary transition-colors duration-200 cursor-pointer group"
                >
                    <ArrowLeft20Regular
                        className="w-4 h-4 transform transition-transform duration-300 group-hover:-translate-x-0.5"/>
                    Back to All Tools
                </Link>
            </div>
            {children}
        </div>
    );
}
