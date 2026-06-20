import React from "react";
import {
    Flash20Regular,
    ShieldCheckmark20Regular,
    CloudOff20Regular,
    PersonAccounts20Regular
} from "@fluentui/react-icons";

interface TrustBadge {
    icon: React.ReactNode;
    title: string;
    description: string;
}

const TRUST_BADGES: TrustBadge[] = [
    {
        icon: <ShieldCheckmark20Regular className="w-5 h-5"/>,
        title: "100% In-Browser",
        description: "All file conversions and edits execute locally inside your browser's sandboxed environment.",
    },
    {
        icon: <CloudOff20Regular className="w-5 h-5"/>,
        title: "Zero File Uploads",
        description: "Your files stay on your device. We do not transfer, inspect, copy, or retain your data.",
    },
    {
        icon: <PersonAccounts20Regular className="w-5 h-5"/>,
        title: "No Account Required",
        description: "Start working instantly. No profiles, sign-ups, passwords, or subscriptions to manage.",
    },
    {
        icon: <Flash20Regular className="w-5 h-5"/>,
        title: "Blazing Fast WASM",
        description: "Leverages WebAssembly for near-native client-side processing speeds.",
    },
];

const ITEM_CLASSES = [
    // Index 0: No top/left border
    "flex items-start gap-4",

    // Index 1: Mobile top border, Tablet/Desktop left border
    "flex items-start gap-4 border-t border-border/40 pt-5 sm:border-t-0 sm:pt-0 sm:border-l sm:border-border/40 sm:pl-6",

    // Index 2: Mobile/Tablet top border, Desktop left border
    "flex items-start gap-4 border-t border-border/40 pt-5 sm:border-t sm:pt-6 sm:border-l-0 sm:pl-0 lg:border-t-0 lg:pt-0 lg:border-l lg:border-border/40 lg:pl-6",

    // Index 3: Mobile/Tablet top border, Tablet/Desktop left border
    "flex items-start gap-4 border-t border-border/40 pt-5 sm:border-t sm:pt-6 sm:border-l sm:border-border/40 sm:pl-6 lg:border-t-0 lg:pt-0 lg:border-l lg:border-border/40 lg:pl-6",
];

export function TrustBadgesSection() {
    return (
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div
                className="bg-surface border border-border/80 rounded-2xl p-6 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {TRUST_BADGES.map((badge, index) => (
                    <div key={index} className={ITEM_CLASSES[index]}>
                        {/* Static Icon Container */}
                        <div
                            className="w-9 h-9 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                            {badge.icon}
                        </div>

                        {/* Content */}
                        <div className="space-y-1">
                            <h4 className="text-xs font-bold text-text-primary leading-tight">
                                {badge.title}
                            </h4>
                            <p className="text-xs text-text-muted leading-relaxed font-normal">
                                {badge.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
