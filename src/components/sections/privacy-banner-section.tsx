"use client";

import React from "react";
import {
    Checkmark20Regular,
    Shield20Regular,
    LockClosed20Regular,
    Speaker220Regular,
    Video20Regular,
    Image20Regular,
    Document20Regular, Shield20Filled,
} from "@fluentui/react-icons";

// Type definitions for clean data mapping
interface TrustIndicator {
    title: string;
    description: string;
}

interface ConnectingLine {
    id: string;
    x1: string;
    y1: string;
    x2: string;
    y2: string;
    className: string;
}

interface FormatNode {
    id: string;
    positionClass: string;
    icon: React.ReactNode;
    label: string;
}

// Custom animations injection
const VISUALIZATION_STYLES = `
  @keyframes ripple {
    0% {
      transform: scale(1.0);
      opacity: 0.5;
    }
    50% {
      opacity: 0.25;
    }
    100% {
      transform: scale(3.0);
      opacity: 0;
    }
  }
  @keyframes flowUp {
    to { stroke-dashoffset: 20; }
  }
  @keyframes flowDown {
    to { stroke-dashoffset: -20; }
  }
  @keyframes flowLeft {
    to { stroke-dashoffset: 20; }
  }
  @keyframes flowRight {
    to { stroke-dashoffset: -20; }
  }
  .animate-ripple-1 {
    animation: ripple 6s infinite cubic-bezier(0.16, 1, 0.3, 1);
  }
  .animate-ripple-2 {
    animation: ripple 6s infinite cubic-bezier(0.16, 1, 0.3, 1) 2s;
  }
  .animate-ripple-3 {
    animation: ripple 6s infinite cubic-bezier(0.16, 1, 0.3, 1) 4s;
  }
  .animate-ripple-4 {
    animation: ripple 6s infinite cubic-bezier(0.16, 1, 0.3, 1) 6s;
  }
  .animate-flow-up {
    stroke-dasharray: 4 4;
    animation: flowUp 1s infinite linear;
  }
  .animate-flow-down {
    stroke-dasharray: 4 4;
    animation: flowDown 1s infinite linear;
  }
  .animate-flow-left {
    stroke-dasharray: 4 4;
    animation: flowLeft 1s infinite linear;
  }
  .animate-flow-right {
    stroke-dasharray: 4 4;
    animation: flowRight 1s infinite linear;
  }
`;

// Configuration for data-driven UI layout
const TRUST_INDICATORS: TrustIndicator[] = [
    {
        title: "No Account Required",
        description: "Start converting and editing files immediately. There are no profiles, passwords, or registration forms to manage.",
    },
    {
        title: "Privacy-Conscious",
        description: "Files are handled only to perform the operation you select. We do not retain, distribute, or look at your files.",
    },
    {
        title: "In-Browser Processing",
        description: "Many of our tools work directly inside your browser. This keeps the file data local to your computer for maximum security.",
    },
    {
        title: "Works Across Devices",
        description: "Enjoy fast, secure processing whether you are working on your mobile device, tablet, or desktop computer.",
    },
];

const CONNECTING_LINES: ConnectingLine[] = [
    {id: "top-down", x1: "50%", y1: "12%", x2: "50%", y2: "50%", className: "animate-flow-down"},
    {id: "bottom-up", x1: "50%", y1: "88%", x2: "50%", y2: "50%", className: "animate-flow-up"},
    {id: "left-right", x1: "12%", y1: "50%", x2: "50%", y2: "50%", className: "animate-flow-right"},
    {id: "right-left", x1: "88%", y1: "50%", x2: "50%", y2: "50%", className: "animate-flow-left"},
];

const FORMAT_NODES: FormatNode[] = [
    {
        id: "audio",
        positionClass: "left-1/2 top-[12%] -translate-x-1/2 -translate-y-1/2",
        icon: <Speaker220Regular className="w-4.5 h-4.5"/>,
        label: "Audio File",
    },
    {
        id: "video",
        positionClass: "left-[88%] top-1/2 -translate-x-1/2 -translate-y-1/2",
        icon: <Video20Regular className="w-4.5 h-4.5"/>,
        label: "Video File",
    },
    {
        id: "document",
        positionClass: "left-1/2 top-[88%] -translate-x-1/2 -translate-y-1/2",
        icon: <Document20Regular className="w-4.5 h-4.5"/>,
        label: "Document File",
    },
    {
        id: "image",
        positionClass: "left-[12%] top-1/2 -translate-x-1/2 -translate-y-1/2",
        icon: <Image20Regular className="w-4.5 h-4.5"/>,
        label: "Image File",
    },
];

const RIPPLE_WAVES = [
    {id: 1, animationClass: "animate-ripple-1"},
    {id: 2, animationClass: "animate-ripple-2"},
    {id: 3, animationClass: "animate-ripple-3"},
    {id: 4, animationClass: "animate-ripple-4"},
];

export function PrivacyBannerSection() {
    return (
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div
                className="relative overflow-hidden bg-surface-secondary border border-border rounded-3xl p-8 sm:p-10 flex flex-col lg:flex-row items-center justify-between gap-10 shadow-sm transition-all duration-300">

                {/* Subtle grid backdrop */}
                <div
                    className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] pointer-events-none -z-10"
                    style={{
                        backgroundImage: "radial-gradient(var(--text-muted) 1px, transparent 1px)",
                        backgroundSize: "16px 16px"
                    }}
                />

                {/* Left Side: Copy & Trust Checklist */}
                <div className="flex-1 space-y-6 max-w-xl text-left">
                    <div className="space-y-3">
                        <div
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold tracking-wider text-primary uppercase">
                            <Shield20Filled className="w-3.5 h-3.5 text-primary"/>
                            Privacy First
                        </div>
                        <h3 className="text-2xl font-bold tracking-tight text-text-primary">Designed for privacy</h3>
                        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-normal">
                            We believe that processing files should be secure, straightforward, and transparent. Craft
                            is designed to handle your files with care, ensuring a simple experience without tracking:
                        </p>
                    </div>

                    {/* User-Relevant Trust Indicators Checklist */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        {TRUST_INDICATORS.map((indicator, index) => (
                            <div key={index} className="flex items-start gap-2.5">
                                <span
                                    className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
                                    <Checkmark20Regular className="w-3 h-3"/>
                                </span>
                                <div>
                                    <h4 className="text-xs font-bold text-text-primary">{indicator.title}</h4>
                                    <p className="text-[10px] text-text-muted mt-0.5">{indicator.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Side: Symmetrical Multi-Format Visual Area */}
                <div
                    className="w-full max-w-95 h-full aspect-4/3 rounded-2xl border border-border bg-surface shadow-md p-5 flex flex-col justify-between select-none relative group"
                    aria-hidden="true"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                        <span
                            className="text-[9px] font-bold text-text-secondary font-mono tracking-wider flex items-center gap-1">
                          <LockClosed20Regular className="w-3.5 h-3.5 text-primary"/>
                          FILE WORKSPACE
                        </span>
                        <span className="w-2 h-2 rounded-full bg-primary"/>
                    </div>

                    {/* Centralized Grid Network Graphic */}
                    <div
                        className="flex-1 aspect-square mx-auto relative flex items-center justify-center my-2 overflow-hidden">
                        <style dangerouslySetInnerHTML={{__html: VISUALIZATION_STYLES}}/>

                        {/* SVG Connecting lines (Animated dashed paths flowing to center) */}
                        <svg
                            className="absolute inset-0 w-full h-full text-border group-hover:text-primary/25 transition-colors duration-300"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            {CONNECTING_LINES.map((line) => (
                                <line
                                    key={line.id}
                                    x1={line.x1}
                                    y1={line.y1}
                                    x2={line.x2}
                                    y2={line.y2}
                                    stroke="currentColor"
                                    strokeWidth="1"
                                    className={line.className}
                                />
                            ))}
                        </svg>

                        {/* Concentric expanding ripples radiating from Shield */}
                        {RIPPLE_WAVES.map((wave) => (
                            <div
                                key={wave.id}
                                className={`absolute w-14 h-14 rounded-full border border-primary/25 bg-primary/2 ${wave.animationClass} z-10 pointer-events-none`}
                            />
                        ))}

                        {/* Central Security Core */}
                        <div
                            className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-sm z-20 group-hover:scale-105 transition-transform duration-300">
                            <Shield20Regular className="w-6 h-6"/>
                        </div>

                        {/* Format Nodes (Top, Right, Bottom, Left) */}
                        {FORMAT_NODES.map((node) => (
                            <div
                                key={node.id}
                                className={`absolute w-9 h-9 rounded-xl bg-surface border border-border shadow-xs flex items-center justify-center text-text-secondary z-20 hover:border-primary/40 hover:text-primary transition-all duration-300 ${node.positionClass}`}
                                title={node.label}
                            >
                                {node.icon}
                            </div>
                        ))}
                    </div>

                    {/* Description caption */}
                    <div
                        className="border-t border-border/60 pt-3 text-center text-[9px] text-text-muted leading-relaxed">
                        Direct multi-format workshop. No persistent data storage.
                    </div>
                </div>

            </div>
        </section>
    );
}
