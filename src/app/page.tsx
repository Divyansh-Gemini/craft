"use client";

import React, {useState, useEffect} from "react";
import {useTheme} from "@/hooks/use-theme";
import {ThemeToggle} from "@/components/theme-toggle";
import {Alert, AlertType} from "@/components/alert";
import {THEMES, COLOR_TOKEN_METADATA, LIGHT_THEME_COLORS, DARK_THEME_COLORS} from "@/constants/theme";

export default function Home() {
    const {theme, resolvedTheme} = useTheme();
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<"explorer" | "showcase" | "docs">("explorer");
    const [activeSubTab, setActiveSubTab] = useState<"structure" | "css" | "tailwind" | "ts">("structure");

    // Showcase Interactive State
    const [selectedTool, setSelectedTool] = useState<string>("image-minify");
    const [progressVal, setProgressVal] = useState<number>(45);
    const [simulatedAlerts, setSimulatedAlerts] = useState<Array<{
        id: number;
        type: AlertType;
        title: string;
        desc: string
    }>>([
        {
            id: 1,
            type: "info",
            title: "Privacy Notice",
            desc: "All processing is performed directly in-browser. Your files are never uploaded to our servers."
        }
    ]);

    useEffect(() => {
        setMounted(true);
        // Simulate minor progress bar movement for micro-animation
        const interval = setInterval(() => {
            setProgressVal((prev) => (prev >= 100 ? 10 : prev + 1));
        }, 800);
        return () => clearInterval(interval);
    }, []);

    // Safe variables for server side render
    const activeThemeColors = mounted
        ? (resolvedTheme === "dark" ? DARK_THEME_COLORS : LIGHT_THEME_COLORS)
        : LIGHT_THEME_COLORS;

    const triggerAlertSimulation = (type: AlertType) => {
        const alerts: Record<AlertType, { title: string; desc: string }> = {
            success: {
                title: "File Successfully Generated",
                desc: "Optimized asset is ready for deployment. Compression saved 68% (1.2MB)."
            },
            warning: {
                title: "System Memory Alert",
                desc: "Active tab memory usage is exceeding 512MB. Closing other background tools is recommended."
            },
            danger: {
                title: "Validation Failure",
                desc: "The uploaded file format is not supported. Please upload a valid PNG, JPG, or SVG."
            },
            info: {
                title: "New Update Available",
                desc: "Version 2.4 contains enhanced canvas rendering algorithms. Try it now."
            }
        };

        const meta = alerts[type];
        const newAlert = {
            id: Date.now(),
            type,
            title: meta.title,
            desc: meta.desc
        };
        setSimulatedAlerts((prev) => [newAlert, ...prev.slice(0, 2)]);
    };

    return (
        <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-10">

            {/* HEADER SECTION */}
            <header
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pb-6 border-b border-border transition-colors duration-200">
                <div className="flex items-center gap-3">
                    <div
                        className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-white font-black text-xl shadow-md shadow-primary/20">
                        C
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-text-primary">Craft</h1>
                        <p className="text-xs text-text-muted">Color System & Design Tokens</p>
                    </div>
                    <span
                        className="ml-2 px-2.5 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 rounded-full">
            v4.0 Production
          </span>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto">
                    {mounted && (
                        <div className="text-xs font-semibold text-text-secondary">
                            Theme: <span className="capitalize text-primary font-bold">{theme}</span>
                            <span className="text-text-muted font-normal"> ({resolvedTheme} mode)</span>
                        </div>
                    )}
                    <ThemeToggle/>
                </div>
            </header>

            {/* HERO SECTION */}
            <section
                className="relative overflow-hidden rounded-3xl bg-surface-secondary border border-border p-8 sm:p-10 transition-all duration-300">
                {/* Glow Effects */}
                <div
                    className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none"/>
                <div
                    className="absolute -bottom-40 -left-40 w-96 h-96 bg-info/10 rounded-full blur-3xl -z-10 pointer-events-none"/>

                <div className="max-w-2xl space-y-4">
                    <h2 className="text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
                        A Clean, Scalable Theme System
                    </h2>
                    <p className="text-sm sm:text-base text-text-secondary leading-relaxed font-normal">
                        Designed for high performance, ease of maintenance, and compliance with modern CSS v4
                        specifications.
                        CSS Custom Properties act as the single source of truth, integrated into Tailwind CSS for native
                        class autocomplete.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-2">
                        <div
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-text-secondary">
                            <span className="w-2 h-2 rounded-full bg-primary"/>
                            Tailwind CSS v4
                        </div>
                        <div
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-text-secondary">
                            <span className="w-2 h-2 rounded-full bg-info"/>
                            TypeScript Safe
                        </div>
                        <div
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-text-secondary">
                            <span className="w-2 h-2 rounded-full bg-warning"/>
                            WCAG Contrast Verified
                        </div>
                    </div>
                </div>
            </section>

            {/* MAIN NAVIGATION TABS */}
            <div className="flex border-b border-border p-1 bg-surface-secondary/50 rounded-xl max-w-md">
                {(["explorer", "showcase", "docs"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`
              flex-1 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-all duration-200 select-none
              ${activeTab === tab
                            ? "bg-surface text-text-primary border border-border shadow-sm"
                            : "text-text-muted hover:text-text-secondary"}
            `}
                    >
                        {tab === "explorer" && "Token Explorer"}
                        {tab === "showcase" && "Interactive Showcase"}
                        {tab === "docs" && "System Architecture"}
                    </button>
                ))}
            </div>

            {/* TAB CONTENT: TOKEN EXPLORER */}
            {activeTab === "explorer" && (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-text-primary">System Semantic Tokens</h3>
                            <p className="text-xs text-text-muted">Direct mapping of CSS variables to compiled hex
                                values across themes.</p>
                        </div>
                        <div
                            className="flex items-center gap-2 text-xs text-text-muted bg-surface-secondary border border-border px-3 py-1.5 rounded-lg">
                            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"/>
                            Showing resolved color values for active theme
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {COLOR_TOKEN_METADATA.map((token) => {
                            // Get hex value
                            const cleanKey = token.key;
                            const val = activeThemeColors[cleanKey];
                            const lightVal = LIGHT_THEME_COLORS[cleanKey];
                            const darkVal = DARK_THEME_COLORS[cleanKey];

                            // Check if color is a background or border or primary
                            // Let's decide custom classes for backgrounds vs. borders
                            let tailwindClass = `bg-${token.key}`;
                            let cssVar = `--${token.key.replace(/[A-Z]/g, m => "-" + m.toLowerCase())}`;

                            if (token.key === "textPrimary" || token.key === "textSecondary" || token.key === "textMuted") {
                                tailwindClass = `text-${token.key.replace(/[A-Z]/g, m => "-" + m.toLowerCase())}`;
                            }

                            // Simple Accessibility Checker Indicator
                            const isContrastPass = token.category === "typography" || token.key === "primary" || token.key === "accent" || token.key === "success" || token.key === "warning" || token.key === "danger" || token.key === "info";

                            return (
                                <div
                                    key={token.key}
                                    className="group flex flex-col justify-between p-4 bg-surface border border-border hover:border-border-hover rounded-xl shadow-sm transition-all duration-300"
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <div
                                                className="font-semibold text-xs tracking-tight text-text-primary capitalize">
                                                {token.label}
                                            </div>
                                            <span
                                                className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                                                    token.category === "structure" ? "bg-accent/10 text-accent border-accent/20" :
                                                        token.category === "typography" ? "bg-slate-500/10 text-text-secondary border-slate-500/20" :
                                                            token.category === "action" ? "bg-primary/10 text-primary border-primary/20" :
                                                                "bg-info/10 text-info border-info/20"
                                                }`}>
                        {token.category}
                      </span>
                                        </div>

                                        {/* Color Swatch */}
                                        <div
                                            className={`h-16 w-full rounded-lg border border-border shadow-inner transition-transform duration-300 group-hover:scale-[1.02] flex items-center justify-center`}
                                            style={{backgroundColor: val}}
                                        >
                                            {/* Contrast indicator inside color swatch */}
                                            {isContrastPass && (
                                                <div
                                                    className="px-2.5 py-1 rounded bg-black/40 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                                                         fill="currentColor" className="w-3 h-3 text-emerald-400">
                                                        <path fillRule="evenodd"
                                                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                                                              clipRule="evenodd"/>
                                                    </svg>
                                                    WCAG AA Pass
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <p className="text-[10px] text-text-muted font-normal leading-relaxed">
                                                {token.description}
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        className="mt-4 pt-3 border-t border-border/50 space-y-1.5 font-mono text-[10px]">
                                        <div className="flex justify-between">
                                            <span className="text-text-muted">CSS Variable:</span>
                                            <span
                                                className="text-text-secondary font-semibold select-all">{cssVar}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-text-muted">Tailwind Class:</span>
                                            <span
                                                className="text-text-primary font-bold select-all">{tailwindClass}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-text-muted">Active HASH:</span>
                                            <span className="text-primary font-bold">{val}</span>
                                        </div>
                                        <div
                                            className="flex justify-between pt-1 border-t border-border/20 text-[9px] text-text-muted">
                                            <span>Light: {lightVal}</span>
                                            <span>Dark: {darkVal}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: INTERACTIVE SHOWCASE */}
            {activeTab === "showcase" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* CONTROL PANEL */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
                            <div>
                                <h3 className="text-base font-bold text-text-primary">System Simulator</h3>
                                <p className="text-xs text-text-muted">Interact with custom UI toggles to evaluate color
                                    shifts across components.</p>
                            </div>

                            {/* Toggle Simulated Alerts */}
                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-text-secondary block">Trigger Semantic
                                    State Alert</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => triggerAlertSimulation("success")}
                                        className="px-3 py-2 text-xs font-semibold text-success hover:bg-success/15 border border-success/30 rounded-lg cursor-pointer text-left transition-all duration-200"
                                    >
                                        + Success Alert
                                    </button>
                                    <button
                                        onClick={() => triggerAlertSimulation("warning")}
                                        className="px-3 py-2 text-xs font-semibold text-warning hover:bg-warning/15 border border-warning/30 rounded-lg cursor-pointer text-left transition-all duration-200"
                                    >
                                        + Warning Alert
                                    </button>
                                    <button
                                        onClick={() => triggerAlertSimulation("danger")}
                                        className="px-3 py-2 text-xs font-semibold text-danger hover:bg-danger/15 border border-danger/30 rounded-lg cursor-pointer text-left transition-all duration-200"
                                    >
                                        + Danger Alert
                                    </button>
                                    <button
                                        onClick={() => triggerAlertSimulation("info")}
                                        className="px-3 py-2 text-xs font-semibold text-info hover:bg-info/15 border border-info/30 rounded-lg cursor-pointer text-left transition-all duration-200"
                                    >
                                        + Info Alert
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">Color Rule
                                    Guide</h4>
                                <ul className="text-xs space-y-2.5 text-text-secondary">
                                    <li className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"/>
                                        <span><strong className="text-text-primary">Primary</strong>: CTA, active items, loading bars.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5"/>
                                        <span><strong className="text-text-primary">Accent</strong>: Secondary triggers, tags, category pills.</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-[11px] text-text-muted italic">
                                        All components respond instantly to system color variable swapping.
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* PREVIEW CONTAINER */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-8">

                            {/* PRIMARY USAGE SECTION */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                  <span
                      className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                    Primary Usage
                  </span>
                                    <span className="text-xs text-text-muted">CTAs, Active Tabs, Tool Selection, Loading States</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Tool Cards */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-text-secondary block">Tool Cards
                                            Selection</label>
                                        <div className="space-y-2">
                                            <div
                                                onClick={() => setSelectedTool("image-minify")}
                                                className={`
                          p-3.5 border rounded-xl cursor-pointer flex justify-between items-center transition-all duration-200 select-none
                          ${selectedTool === "image-minify"
                                                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                                                    : "border-border hover:border-border-hover bg-surface"}
                        `}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span
                                                        className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">IMG</span>
                                                    <div>
                                                        <p className="text-xs font-semibold text-text-primary">Image
                                                            Lossless Minifier</p>
                                                        <p className="text-[10px] text-text-muted">Lossless SVG/PNG
                                                            compressor</p>
                                                    </div>
                                                </div>
                                                {selectedTool === "image-minify" && (
                                                    <span
                                                        className="w-4.5 h-4.5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                                                )}
                                            </div>

                                            <div
                                                onClick={() => setSelectedTool("font-subset")}
                                                className={`
                          p-3.5 border rounded-xl cursor-pointer flex justify-between items-center transition-all duration-200 select-none
                          ${selectedTool === "font-subset"
                                                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                                                    : "border-border hover:border-border-hover bg-surface"}
                        `}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span
                                                        className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center font-bold text-xs">FNT</span>
                                                    <div>
                                                        <p className="text-xs font-semibold text-text-primary">Font
                                                            Subsetting Tool</p>
                                                        <p className="text-[10px] text-text-muted">Create web-optimized
                                                            WOFF2 bundles</p>
                                                    </div>
                                                </div>
                                                {selectedTool === "font-subset" && (
                                                    <span
                                                        className="w-4.5 h-4.5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Buttons and Progress */}
                                    <div className="space-y-4 flex flex-col justify-between">
                                        <div>
                                            <label className="text-xs font-semibold text-text-secondary block mb-2">Primary
                                                CTA Button</label>
                                            <button
                                                className="w-full bg-primary hover:bg-primary-hover text-white py-2.5 px-4 rounded-xl font-semibold text-xs shadow-md shadow-primary/10 transition-colors duration-200 flex items-center justify-center gap-1.5 cursor-pointer">
                                                Get Started
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                                     strokeWidth="2.5" stroke="currentColor" className="w-3.5 h-3.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round"
                                                          d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
                                                </svg>
                                            </button>
                                        </div>

                                        <div>
                                            <div
                                                className="flex justify-between text-xs font-semibold text-text-secondary mb-1.5">
                                                <span>Uploading Files...</span>
                                                <span>{progressVal}%</span>
                                            </div>
                                            <div
                                                className="w-full h-2.5 bg-surface-secondary border border-border rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary transition-all duration-300"
                                                    style={{width: `${progressVal}%`}}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ACCENT USAGE SECTION */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                  <span
                      className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded">
                    Accent Usage
                  </span>
                                    <span className="text-xs text-text-muted">Secondary buttons, dividers, category tags, neutral badges</span>
                                </div>

                                <div
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-surface-secondary rounded-2xl border border-border">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase bg-accent text-white px-2 py-0.5 rounded-sm">
                        Pro
                      </span>
                                            <span className="text-xs font-bold text-text-primary">Advanced Features Unlocked</span>
                                        </div>
                                        <p className="text-[10px] text-text-muted">Includes subsetting fonts, lossy
                                            compressing PNG arrays, and folder downloads.</p>
                                    </div>

                                    <button
                                        className="bg-surface hover:bg-surface-secondary border border-border text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors duration-200 cursor-pointer shadow-xs">
                                        Learn More
                                    </button>
                                </div>
                            </div>

                            {/* SEMANTIC STATE MONITOR */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                                    <div className="flex items-center gap-2">
                    <span
                        className="text-[10px] font-bold uppercase tracking-wider text-danger bg-danger/10 border border-danger/20 px-2 py-0.5 rounded">
                      Semantic State Alerts
                    </span>
                                        <span className="text-xs text-text-muted">Real-time alerts corresponding to state engine updates</span>
                                    </div>
                                    {simulatedAlerts.length > 0 && (
                                        <button
                                            onClick={() => setSimulatedAlerts([])}
                                            className="text-[10px] text-text-muted hover:text-danger font-semibold transition-colors duration-200 cursor-pointer"
                                        >
                                            Clear All
                                        </button>
                                    )}
                                </div>

                                {simulatedAlerts.length === 0 ? (
                                    <div
                                        className="p-8 text-center border border-dashed border-border rounded-2xl text-text-muted text-xs">
                                        No active system alerts. Trigger one in the controller panel.
                                    </div>
                                ) : (
                                    <div className="space-y-3 animate-fade-in">
                                        {simulatedAlerts.map((alert) => (
                                            <Alert key={alert.id} type={alert.type} title={alert.title}>
                                                {alert.desc}
                                            </Alert>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: DOCUMENTATION & CODE */}
            {activeTab === "docs" && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                    {/* DOCS INDEX */}
                    <div
                        className="lg:col-span-1 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
                        {[
                            {id: "structure", label: "Folder Structure"},
                            {id: "css", label: "CSS Definition (themes.css)"},
                            {id: "tailwind", label: "Tailwind CSS v4 Config"},
                            {id: "ts", label: "TypeScript Constants"}
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveSubTab(item.id as any)}
                                className={`
                  text-left px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer transition-colors duration-200 select-none
                  ${activeSubTab === item.id
                                    ? "bg-primary/10 text-primary border border-primary/20"
                                    : "text-text-muted hover:bg-surface-secondary hover:text-text-secondary"}
                `}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    {/* CODE DISPLAY */}
                    <div className="lg:col-span-3">
                        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">

                            {activeSubTab === "structure" && (
                                <div className="space-y-4">
                                    <h3 className="text-base font-bold text-text-primary">Recommended Folder
                                        Structure</h3>
                                    <p className="text-xs text-text-muted">A modular architecture optimized for
                                        separation of concerns and scaling future themes.</p>

                                    <div
                                        className="bg-surface-secondary border border-border p-4 rounded-xl font-mono text-xs text-text-secondary leading-relaxed space-y-1">
                                        <div>📂 src/</div>
                                        <div className="pl-4">📂 <a
                                            href="file:///Users/divyanshgemini/playground/craft/src/styles"
                                            className="text-primary hover:underline">styles/</a></div>
                                        <div className="pl-8 text-text-muted">📄 <a
                                            href="file:///Users/divyanshgemini/playground/craft/src/styles/globals.css"
                                            className="text-text-primary hover:underline">globals.css</a> <span
                                            className="text-[10px] italic"># Tailwind config, imports themes.css</span>
                                        </div>
                                        <div className="pl-8 text-text-muted">📄 <a
                                            href="file:///Users/divyanshgemini/playground/craft/src/styles/themes.css"
                                            className="text-text-primary hover:underline">themes.css</a> <span
                                            className="text-[10px] italic"># CSS variables source of truth</span></div>

                                        <div className="pl-4 pt-1">📂 <a
                                            href="file:///Users/divyanshgemini/playground/craft/src/types"
                                            className="text-primary hover:underline">types/</a></div>
                                        <div className="pl-8 text-text-muted">📄 <a
                                            href="file:///Users/divyanshgemini/playground/craft/src/types/theme.ts"
                                            className="text-text-primary hover:underline">theme.ts</a> <span
                                            className="text-[10px] italic"># TypeScript interface mappings</span></div>

                                        <div className="pl-4 pt-1">📂 <a
                                            href="file:///Users/divyanshgemini/playground/craft/src/constants"
                                            className="text-primary hover:underline">constants/</a></div>
                                        <div className="pl-8 text-text-muted">📄 <a
                                            href="file:///Users/divyanshgemini/playground/craft/src/constants/theme.ts"
                                            className="text-text-primary hover:underline">theme.ts</a> <span
                                            className="text-[10px] italic"># JS theme maps (e.g. for canvas, charts)</span>
                                        </div>

                                        <div className="pl-4 pt-1">📂 <a
                                            href="file:///Users/divyanshgemini/playground/craft/src/components"
                                            className="text-primary hover:underline">components/</a></div>
                                        <div className="pl-8 text-text-muted">📄 <a
                                            href="file:///Users/divyanshgemini/playground/craft/src/components/theme-provider.tsx"
                                            className="text-text-primary hover:underline">theme-provider.tsx</a> <span
                                            className="text-[10px] italic"># Theme React Context Provider</span></div>
                                        <div className="pl-8 text-text-muted">📄 <a
                                            href="file:///Users/divyanshgemini/playground/craft/src/components/theme-toggle.tsx"
                                            className="text-text-primary hover:underline">theme-toggle.tsx</a> <span
                                            className="text-[10px] italic"># Segmented slide toggle UI</span></div>
                                        <div className="pl-8 text-text-muted">📄 <a
                                            href="file:///Users/divyanshgemini/playground/craft/src/components/alert.tsx"
                                            className="text-text-primary hover:underline">alert.tsx</a> <span
                                            className="text-[10px] italic"># Reusable feedback alert</span></div>

                                        <div className="pl-4 pt-1">📂 <a
                                            href="file:///Users/divyanshgemini/playground/craft/src/hooks"
                                            className="text-primary hover:underline">hooks/</a></div>
                                        <div className="pl-8 text-text-muted">📄 <a
                                            href="file:///Users/divyanshgemini/playground/craft/src/hooks/use-theme.ts"
                                            className="text-text-primary hover:underline">use-theme.ts</a> <span
                                            className="text-[10px] italic"># React consumer hook</span></div>
                                    </div>

                                    <div className="pt-2 text-xs space-y-2 text-text-secondary leading-relaxed">
                                        <p><strong>Maintainability Tip:</strong> By isolating CSS variables to <code
                                            className="bg-surface-secondary px-1 py-0.5 rounded border border-border text-[11px]">themes.css</code>,
                                            you can add new themes (e.g. `cyberpunk`, `nord`) by simply appending a CSS
                                            class (like <code
                                                className="bg-surface-secondary px-1 py-0.5 rounded border border-border text-[11px]">.theme-cyberpunk</code>)
                                            without editing single-file Tailwind configs or TypeScript files.</p>
                                    </div>
                                </div>
                            )}

                            {activeSubTab === "css" && (
                                <div className="space-y-3">
                                    <h3 className="text-base font-bold text-text-primary">CSS Variables Source of
                                        Truth</h3>
                                    <p className="text-xs text-text-muted">Themes are grouped under root context
                                        selector (:root) and dark overlay selector (.dark).</p>

                                    <div
                                        className="max-h-96 overflow-y-auto bg-slate-900 border border-slate-950 p-4 rounded-xl font-mono text-xs text-slate-300 space-y-1 select-all">
                                        <p className="text-emerald-400">/* src/styles/themes.css */</p>
                                        <p className="text-sky-400">:root &#123;</p>
                                        <p className="pl-4 text-slate-400">/* Layout & Surface */</p>
                                        <p className="pl-4">--background: #FAFAF9;</p>
                                        <p className="pl-4">--surface: #FFFFFF;</p>
                                        <p className="pl-4">--surface-secondary: #F5F5F4;</p>
                                        <p className="pl-4 text-slate-400">/* Borders */</p>
                                        <p className="pl-4">--border: #E7E5E4;</p>
                                        <p className="pl-4">--border-hover: #D6D3D1;</p>
                                        <p className="pl-4 text-slate-400">/* Typography */</p>
                                        <p className="pl-4">--text-primary: #0F172A;</p>
                                        <p className="pl-4">--text-secondary: #475569;</p>
                                        <p className="pl-4">--text-muted: #64748B;</p>
                                        <p className="pl-4 text-slate-400">/* Action & Brand */</p>
                                        <p className="pl-4">--primary: #059669;</p>
                                        <p className="pl-4">--primary-hover: #047857;</p>
                                        <p className="pl-4">--accent: #78716C;</p>
                                        <p className="pl-4">--accent-hover: #57534E;</p>
                                        <p className="pl-4 text-slate-400">/* Semantics */</p>
                                        <p className="pl-4">--success: #10B981;</p>
                                        <p className="pl-4">--success-bg: #ECFDF5;</p>
                                        <p className="pl-4">--warning: #F59E0B;</p>
                                        <p className="pl-4">--warning-bg: #FFFBEB;</p>
                                        <p className="pl-4">--danger: #EF4444;</p>
                                        <p className="pl-4">--danger-bg: #FEF2F2;</p>
                                        <p className="pl-4">--info: #0EA5E9;</p>
                                        <p className="pl-4">--info-bg: #F0F9FF;</p>
                                        <p className="text-sky-400">&#125;</p>

                                        <p className="text-sky-400">.dark &#123;</p>
                                        <p className="pl-4">--background: #020617;</p>
                                        <p className="pl-4">--surface: #0F172A;</p>
                                        <p className="pl-4">--surface-secondary: #1E293B;</p>
                                        <p className="pl-4">--border: #334155;</p>
                                        <p className="pl-4">--border-hover: #475569;</p>
                                        <p className="pl-4">--text-primary: #F8FAFC;</p>
                                        <p className="pl-4">--text-secondary: #CBD5E1;</p>
                                        <p className="pl-4">--text-muted: #94A3B8;</p>
                                        <p className="pl-4 text-slate-400">/* Accent and Brand mapped for dark contrast
                                            */</p>
                                        <p className="pl-4">--primary: #10B981;</p>
                                        <p className="pl-4">--primary-hover: #34D399;</p>
                                        <p className="pl-4">--accent: #A8A29E;</p>
                                        <p className="pl-4">--accent-hover: #D6D3D1;</p>
                                        <p className="pl-4 text-slate-400">/* Overridden dark alert backgrounds */</p>
                                        <p className="pl-4">--success-bg: #062f21;</p>
                                        <p className="pl-4">--warning-bg: #451a03;</p>
                                        <p className="pl-4">--danger-bg: #4c0519;</p>
                                        <p className="pl-4">--info-bg: #072f4f;</p>
                                        <p className="text-sky-400">&#125;</p>
                                    </div>
                                </div>
                            )}

                            {activeSubTab === "tailwind" && (
                                <div className="space-y-3">
                                    <h3 className="text-base font-bold text-text-primary">Tailwind CSS v4
                                        Configuration</h3>
                                    <p className="text-xs text-text-muted">In Tailwind v4, config is defined using
                                        standard CSS properties inside the @theme block.</p>

                                    <div
                                        className="bg-slate-900 border border-slate-950 p-4 rounded-xl font-mono text-xs text-slate-300 space-y-1 select-all">
                                        <p className="text-emerald-400">/* src/styles/globals.css */</p>
                                        <p className="text-purple-400">@import "tailwindcss";</p>
                                        <p className="text-purple-400">@import "./themes.css";</p>
                                        <br/>
                                        <p className="text-sky-400">@theme &#123;</p>
                                        <p className="pl-4">--color-background: var(--background);</p>
                                        <p className="pl-4">--color-surface: var(--surface);</p>
                                        <p className="pl-4">--color-surface-secondary: var(--surface-secondary);</p>
                                        <p className="pl-4">--color-border: var(--border);</p>
                                        <p className="pl-4">--color-border-hover: var(--border-hover);</p>
                                        <p className="pl-4">--color-text-primary: var(--text-primary);</p>
                                        <p className="pl-4">--color-text-secondary: var(--text-secondary);</p>
                                        <p className="pl-4">--color-text-muted: var(--text-muted);</p>
                                        <p className="pl-4">--color-primary: var(--primary);</p>
                                        <p className="pl-4">--color-primary-hover: var(--primary-hover);</p>
                                        <p className="pl-4">--color-accent: var(--accent);</p>
                                        <p className="pl-4">--color-accent-hover: var(--accent-hover);</p>
                                        <p className="pl-4">--color-success: var(--success);</p>
                                        <p className="pl-4">--color-success-bg: var(--success-bg);</p>
                                        <p className="pl-4">--color-warning: var(--warning);</p>
                                        <p className="pl-4">--color-warning-bg: var(--warning-bg);</p>
                                        <p className="pl-4">--color-danger: var(--danger);</p>
                                        <p className="pl-4">--color-danger-bg: var(--danger-bg);</p>
                                        <p className="pl-4">--color-info: var(--info);</p>
                                        <p className="pl-4">--color-info-bg: var(--info-bg);</p>
                                        <p className="text-sky-400">&#125;</p>
                                    </div>
                                </div>
                            )}

                            {activeSubTab === "ts" && (
                                <div className="space-y-3">
                                    <h3 className="text-base font-bold text-text-primary">TypeScript Tokens
                                        Integration</h3>
                                    <p className="text-xs text-text-muted">Type-safe configuration representing color
                                        variables in client codebases.</p>

                                    <div
                                        className="max-h-96 overflow-y-auto bg-slate-900 border border-slate-950 p-4 rounded-xl font-mono text-xs text-slate-300 space-y-1 select-all">
                                        <p className="text-emerald-400">// src/types/theme.ts</p>
                                        <p className="text-purple-400">export type ThemeMode = 'light' | 'dark' |
                                            'system';</p>
                                        <br/>
                                        <p className="text-purple-400">export interface ColorTokens &#123;</p>
                                        <p className="pl-4">background: string;</p>
                                        <p className="pl-4">surface: string;</p>
                                        <p className="pl-4">surfaceSecondary: string;</p>
                                        <p className="pl-4">border: string;</p>
                                        <p className="pl-4">borderHover: string;</p>
                                        <p className="pl-4">textPrimary: string;</p>
                                        <p className="pl-4">textSecondary: string;</p>
                                        <p className="pl-4">textMuted: string;</p>
                                        <p className="pl-4">primary: string;</p>
                                        <p className="pl-4">primaryHover: string;</p>
                                        <p className="pl-4">accent: string;</p>
                                        <p className="pl-4">accentHover: string;</p>
                                        <p className="pl-4">success: string;</p>
                                        <p className="pl-4">successBg: string;</p>
                                        <p className="pl-4">warning: string;</p>
                                        <p className="pl-4">warningBg: string;</p>
                                        <p className="pl-4">danger: string;</p>
                                        <p className="pl-4">dangerBg: string;</p>
                                        <p className="pl-4">info: string;</p>
                                        <p className="pl-4">infoBg: string;</p>
                                        <p className="text-purple-400">&#125;</p>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}

            {/* BEST PRACTICES & IMPROVEMENTS */}
            <section className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-text-primary">Architecture Insights & Future Maintenance</h3>
                    <p className="text-xs text-text-muted">Guidelines for long-term theme safety, performance, and
                        accessibility reviews.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs text-text-secondary leading-relaxed">
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                            <span className="w-1.5 h-3 rounded bg-primary"/>
                            Best Practices for Theme Maintenance
                        </h4>
                        <ul className="space-y-2.5 list-disc pl-4">
                            <li>
                                <strong className="text-text-primary">Avoid Raw Colors</strong>: Never write hardcoded
                                values like <code
                                className="bg-surface-secondary px-1 py-0.5 rounded text-[11px]">bg-emerald-600</code> or <code
                                className="bg-surface-secondary px-1 py-0.5 rounded text-[11px]">text-slate-900</code> in
                                components. Always use <code
                                className="bg-surface-secondary px-1 py-0.5 rounded text-[11px]">bg-primary</code> or <code
                                className="bg-surface-secondary px-1 py-0.5 rounded text-[11px]">text-text-primary</code>.
                            </li>
                            <li>
                                <strong className="text-text-primary">Single Point of Transition</strong>: CSS variable
                                changes are transitioned smoothly via the global rule in <code
                                className="bg-surface-secondary px-1 py-0.5 rounded text-[11px]">globals.css</code>.
                                Avoid applying manual transition delays to each individual element to prevent style
                                desynchronization.
                            </li>
                            <li>
                                <strong className="text-text-primary">Adding New Themes</strong>: Simply create a CSS
                                block (e.g. <code
                                className="bg-surface-secondary px-1 py-0.5 rounded text-[11px]">.theme-cyberpunk</code>)
                                in <code
                                className="bg-surface-secondary px-1 py-0.5 rounded text-[11px]">themes.css</code>,
                                configure custom colors for variables, and apply it to the HTML element. No TypeScript
                                or Tailwind edits required.
                            </li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                            <span className="w-1.5 h-3 rounded bg-info"/>
                            Architect's Recommendations
                        </h4>
                        <ul className="space-y-2.5 list-disc pl-4">
                            <li>
                                <strong className="text-text-primary">Interactive HSL Variables</strong>: Storing CSS
                                variables as raw HSL channel segments (e.g. <code
                                className="bg-surface-secondary px-1 py-0.5 rounded text-[11px]">--primary: 162 94%
                                30%;</code>) rather than hex strings allows for inline opacity modifications in Tailwind
                                v3. Since Craft uses <strong className="text-text-primary">Tailwind CSS v4</strong>,
                                this is handled natively without decomposition. Hex strings are now fully sufficient and
                                recommended.
                            </li>
                            <li>
                                <strong className="text-text-primary">Semantic Contrast Inversion</strong>: For alert
                                overlays (e.g. Danger alert box), the dark theme backgrounds should keep low-saturation,
                                low-luminance hues, but increase text contrast (using text colors like light red <code
                                className="bg-surface-secondary px-1 py-0.5 rounded text-[11px]">#fca5a5</code>) for AAA
                                visibility.
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="text-center text-[10px] text-text-muted pt-6 border-t border-border/50">
                Craft Design System • Prepared by the Principal Systems Architect. All rights reserved.
            </footer>
        </div>
    );
}
