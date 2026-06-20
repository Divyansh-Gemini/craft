import React from "react";
import {Logo} from "@/components/ui/logo";
import Link from "next/link";

export function Footer() {
    return (
        <footer
            className="w-full border-t border-border bg-surface-secondary/40 py-8 transition-colors duration-200 mt-auto">
            <div
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">

                {/* Logo and brief description */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                    {/* Logo */}
                    <Link href="/" className="flex items-center group">
                        <Logo className="h-9 w-auto text-primary hover:opacity-90 transition-opacity duration-200"/>
                    </Link>

                    {/* Vertical Divider */}
                    <div className="hidden sm:block w-px h-4 bg-border"/>

                    {/* Description */}
                    <p className="text-[11px] text-text-muted font-normal leading-relaxed max-w-md">
                        High-performance, secure file transformations running entirely client-side. Built with
                        WebAssembly.
                    </p>
                </div>

                {/* Copyright */}
                <div className="text-[10px] text-text-muted font-mono whitespace-nowrap md:self-center">
                    © 2026 Craft. All rights reserved.
                </div>

            </div>
        </footer>
    );
}
