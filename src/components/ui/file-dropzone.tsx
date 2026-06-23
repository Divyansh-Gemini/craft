"use client";

import React, {useRef, useState, useImperativeHandle, forwardRef, DragEvent, ChangeEvent} from "react";

export interface FileDropzoneRef {
    trigger: () => void;
}

interface FileDropzoneProps {
    onFilesSelected: (files: FileList) => void;
    accept?: string;
    multiple?: boolean;
    showDropzone?: boolean;
    icon: React.ReactNode;
    title?: React.ReactNode;
    description?: React.ReactNode;
    className?: string;
    paddingClassName?: string;
    disabled?: boolean;
}

export const FileDropzone = forwardRef<FileDropzoneRef, FileDropzoneProps>(
    (
        {
            onFilesSelected,
            accept,
            multiple = false,
            showDropzone = true,
            icon,
            title,
            description,
            className = "",
            paddingClassName = "p-12",
            disabled = false,
        },
        ref
    ) => {
        const [isDragging, setIsDragging] = useState(false);
        const inputRef = useRef<HTMLInputElement>(null);

        const trigger = () => {
            if (!disabled && inputRef.current) {
                inputRef.current.click();
            }
        };

        useImperativeHandle(ref, () => ({
            trigger,
        }));

        const handleDragOver = (e: DragEvent) => {
            e.preventDefault();
            if (disabled) return;
            setIsDragging(true);
        };

        const handleDragLeave = () => {
            setIsDragging(false);
        };

        const handleDrop = (e: DragEvent) => {
            e.preventDefault();
            if (disabled) return;
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                onFilesSelected(e.dataTransfer.files);
            }
        };

        const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
            if (disabled) return;
            if (e.target.files && e.target.files.length > 0) {
                onFilesSelected(e.target.files);
                e.target.value = ""; // Clear to allow selecting the same file again
            }
        };

        const draggingClass = "border-primary bg-primary/5 shadow-inner";
        const idleClass = "border-border hover:border-primary/40 bg-surface/30 backdrop-blur-md";

        return (
            <>
                <input
                    type="file"
                    ref={inputRef}
                    onChange={handleChange}
                    multiple={multiple}
                    accept={accept}
                    className="hidden"
                    disabled={disabled}
                />

                {showDropzone && (
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={trigger}
                        className={`relative border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all duration-300 group ${paddingClassName} ${
                            isDragging ? draggingClass : idleClass
                        } ${className}`}
                    >
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <div
                                className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 group-hover:scale-105 transition-transform duration-300">
                                {icon}
                            </div>
                            <div className="space-y-1">
                                {title && typeof title === "string" ? (
                                    <p className="text-sm font-extrabold text-text-primary">
                                        {title}
                                    </p>
                                ) : (
                                    title
                                )}
                                {description && typeof description === "string" ? (
                                    <p className="text-[10px] text-text-muted leading-relaxed">
                                        {description}
                                    </p>
                                ) : (
                                    description
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }
);

FileDropzone.displayName = "FileDropzone";
