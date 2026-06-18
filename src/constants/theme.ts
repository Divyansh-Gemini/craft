import {ColorTokens, ThemeConfig} from "@/types/theme";

/**
 * Source values for the Light Theme colors.
 * Matches CSS custom properties defined in themes.css.
 */
export const LIGHT_THEME_COLORS: ColorTokens = {
    background: "#FAFAF9",
    surface: "#FFFFFF",
    surfaceSecondary: "#F5F5F4",
    border: "#E7E5E4",
    borderHover: "#D6D3D1",
    textPrimary: "#0F172A",
    textSecondary: "#475569",
    textMuted: "#64748B",
    primary: "#059669",
    primaryHover: "#047857",
    accent: "#78716C",
    accentHover: "#57534E",
    success: "#10B981",
    successBg: "#ECFDF5",
    warning: "#F59E0B",
    warningBg: "#FFFBEB",
    danger: "#EF4444",
    dangerBg: "#FEF2F2",
    info: "#0EA5E9",
    infoBg: "#F0F9FF",
};

/**
 * Source values for the Dark Theme colors.
 * Matches CSS custom properties defined in themes.css.
 */
export const DARK_THEME_COLORS: ColorTokens = {
    background: "#020617",
    surface: "#0F172A",
    surfaceSecondary: "#1E293B",
    border: "#334155",
    borderHover: "#475569",
    textPrimary: "#F8FAFC",
    textSecondary: "#CBD5E1",
    textMuted: "#94A3B8",
    primary: "#10B981",
    primaryHover: "#34D399",
    accent: "#A8A29E",
    accentHover: "#D6D3D1",
    success: "#10B981",
    successBg: "#062f21", // Dark mode optimized alert background
    warning: "#F59E0B",
    warningBg: "#451a03", // Dark mode optimized warning background
    danger: "#EF4444",
    dangerBg: "#4c0519", // Dark mode optimized danger background
    info: "#0EA5E9",
    infoBg: "#072f4f", // Dark mode optimized info background
};

/**
 * Standard configuration objects for themes in the Craft system.
 */
export const THEMES: { light: ThemeConfig; dark: ThemeConfig } = {
    light: {
        name: "Light Theme",
        colors: LIGHT_THEME_COLORS,
    },
    dark: {
        name: "Dark Theme",
        colors: DARK_THEME_COLORS,
    },
};

/**
 * Array helper of all semantic tokens.
 * Useful for building documentation tables, visual tests, or dynamic token lists.
 */
export const COLOR_TOKEN_METADATA: Array<{
    key: keyof ColorTokens;
    label: string;
    category: "structure" | "typography" | "action" | "semantic";
    description: string;
}> = [
    {
        key: "background",
        label: "Background",
        category: "structure",
        description: "App canvas backdrop. Ensures maximum contrast for layered panels.",
    },
    {
        key: "surface",
        label: "Surface",
        category: "structure",
        description: "Cards, dialogues, and primary container items.",
    },
    {
        key: "surfaceSecondary",
        label: "Surface Secondary",
        category: "structure",
        description: "Secondary content blocks, code listings, and sidebar panels.",
    },
    {
        key: "border",
        label: "Border",
        category: "structure",
        description: "Standard divider and input boundary color.",
    },
    {
        key: "borderHover",
        label: "Border Hover",
        category: "structure",
        description: "Interactive borders on focus or hover transitions.",
    },
    {
        key: "textPrimary",
        label: "Text Primary",
        category: "typography",
        description: "Core reading content, main headings, and dark labels.",
    },
    {
        key: "textSecondary",
        label: "Text Secondary",
        category: "typography",
        description: "Subheadings, supporting metadata, and table headers.",
    },
    {
        key: "textMuted",
        label: "Text Muted",
        category: "typography",
        description: "Disabled states, placeholder text, and secondary hints.",
    },
    {
        key: "primary",
        label: "Primary",
        category: "action",
        description: "Key actions, success path buttons, links, and progress elements.",
    },
    {
        key: "primaryHover",
        label: "Primary Hover",
        category: "action",
        description: "Primary action hover interaction state.",
    },
    {
        key: "accent",
        label: "Accent",
        category: "action",
        description: "Secondary actions, dividers, tags, and secondary button states.",
    },
    {
        key: "accentHover",
        label: "Accent Hover",
        category: "action",
        description: "Secondary action hover interaction state.",
    },
    {
        key: "success",
        label: "Success",
        category: "semantic",
        description: "Complete, saved, downloaded, or validated success signals.",
    },
    {
        key: "successBg",
        label: "Success Background",
        category: "semantic",
        description: "Alert wrapper background for success status indicators.",
    },
    {
        key: "warning",
        label: "Warning",
        category: "semantic",
        description: "Alert warnings, high memory consumption, or non-critical errors.",
    },
    {
        key: "warningBg",
        label: "Warning Background",
        category: "semantic",
        description: "Alert wrapper background for warning status indicators.",
    },
    {
        key: "danger",
        label: "Danger",
        category: "semantic",
        description: "Destructive actions, error text, and processing failures.",
    },
    {
        key: "dangerBg",
        label: "Danger Background",
        category: "semantic",
        description: "Alert wrapper background for critical or destructive failures.",
    },
    {
        key: "info",
        label: "Info",
        category: "semantic",
        description: "Help indicators, tooltips, privacy labels, and info popups.",
    },
    {
        key: "infoBg",
        label: "Info Background",
        category: "semantic",
        description: "Alert wrapper background for info indicators.",
    },
];
