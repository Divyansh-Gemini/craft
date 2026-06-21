"use client";

import React from "react";

export interface RadioSelectorOption<T> {
    value: T;
    label: string;
}

interface RadioSelectorProps<T> {
    options: RadioSelectorOption<T>[];
    selectedValue: T;
    onChange: (value: T) => void;
    disabled?: boolean;
    className?: string;
}

/**
 * Reusable RadioSelector component for smooth, animated segmented options
 */
export function RadioSelector<T extends string | number>(
    {
        options,
        selectedValue,
        onChange,
        disabled = false,
        className = "grid-cols-2"
    }: RadioSelectorProps<T>
) {
    return (
        <div className={`grid ${className} gap-2 bg-surface-secondary/40 border border-border p-1 rounded-xl`}>
            {options.map((option) => {
                const isSelected = option.value === selectedValue;
                return (
                    <button
                        key={String(option.value)}
                        onClick={() => onChange(option.value)}
                        disabled={disabled}
                        className={`py-2 rounded-lg text-xs font-black text-center transition-all duration-300 ease-out cursor-pointer border ${
                            isSelected
                                ? "bg-surface text-primary border-border shadow-xs"
                                : "text-text-secondary hover:text-text-primary hover:bg-surface/30 border-transparent"
                        }`}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
