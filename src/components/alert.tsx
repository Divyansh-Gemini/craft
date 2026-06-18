import React from "react";

export type AlertType = "success" | "warning" | "danger" | "info";

interface AlertProps {
    type: AlertType;
    title: string;
    children: React.ReactNode;
}

export function Alert({type, title, children}: AlertProps) {
    // Map alerts to CSS variables/tailwind configurations
    const styles = {
        success: {
            container: "bg-success-bg border-success/30 text-text-primary",
            iconColor: "text-success",
            badge: "bg-success/15 text-success border-success/30",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2"
                     stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round"
                          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            )
        },
        warning: {
            container: "bg-warning-bg border-warning/30 text-text-primary",
            iconColor: "text-warning",
            badge: "bg-warning/15 text-warning border-warning/30",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2"
                     stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round"
                          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                </svg>
            )
        },
        danger: {
            container: "bg-danger-bg border-danger/30 text-text-primary",
            iconColor: "text-danger",
            badge: "bg-danger/15 text-danger border-danger/30",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2"
                     stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round"
                          d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            )
        },
        info: {
            container: "bg-info-bg border-info/30 text-text-primary",
            iconColor: "text-info",
            badge: "bg-info/15 text-info border-info/30",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2"
                     stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round"
                          d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.028M12 8.25h.007v.008H12V8.25zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            )
        }
    };

    const style = styles[type];

    return (
        <div className={`flex gap-3.5 p-4 border rounded-xl shadow-sm transition-all duration-300 ${style.container}`}>
            <div className={`flex-shrink-0 mt-0.5 ${style.iconColor}`}>
                {style.icon}
            </div>
            <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tracking-tight">{title}</span>
                    <span
                        className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full border ${style.badge}`}>
            {type}
          </span>
                </div>
                <div className="text-xs text-text-secondary leading-relaxed font-normal">
                    {children}
                </div>
            </div>
        </div>
    );
}
