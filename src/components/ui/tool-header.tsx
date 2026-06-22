"use client";

import React from "react";
import {ToolIcon} from "@/components/ui/tool-icon";

interface ToolHeaderProps {
    title: string;
    description: string;
    iconId?: string;
    icon?: React.ReactNode;
    children?: React.ReactNode;
}

export function ToolHeader(
    {
        title,
        description,
        iconId,
        icon,
        children
    }: ToolHeaderProps
) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-6 gap-4">
            <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                    {/* Icon */}
                    <span
                        className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                        {iconId ? <ToolIcon iconId={iconId} className="w-4 h-4"/> : icon}
                    </span>

                    {/* Title */}
                    <h1 className="text-xl sm:text-2xl font-black text-text-primary">
                        {title}
                    </h1>
                </div>

                {/* Description */}
                <p className="text-xs sm:text-sm text-text-muted">
                    {description}
                </p>
            </div>

            {children && (
                <div className="flex items-center gap-2 flex-wrap">
                    {children}
                </div>
            )}
        </div>
    );
}
