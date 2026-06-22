import React from "react";
import Link from "next/link";

interface ToolCardProps {
    name: string;
    desc: string;
    icon: React.ReactNode;
    href: string;
    onClick?: () => void;
}

export function ToolCard({name, desc, icon, href}: ToolCardProps) {
    return (
        <Link href={href}
              className="group relative flex-col justify-between p-5 bg-surface border border-border hover:border-border-hover hover:shadow-md hover:-translate-y-0.5 rounded-2xl transition-all duration-300 cursor-pointer text-inherit no-underline">
            <div className="space-y-4">
                {/* Tool Icon Box */}
                <div
                    className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center transition-colors duration-300 group-hover:bg-primary group-hover:text-white group-hover:border-primary">
                    {icon}
                </div>

                {/* Title & Description */}
                <div className="space-y-1.5">
                    <h3 className="text-sm font-bold tracking-tight text-text-primary group-hover:text-primary transition-colors duration-200">
                        {name}
                    </h3>
                    <p className="text-xs text-text-muted leading-relaxed font-normal">
                        {desc}
                    </p>
                </div>
            </div>

            {/* Arrow Transition */}
            <div className="flex justify-end pt-5 text-primary group-hover:text-primary-hover">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2.5"
                    stroke="currentColor"
                    className="w-4 h-4 transform transition-transform duration-300 group-hover:translate-x-1"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
                </svg>
            </div>
        </Link>
    );
}
