/**
 * Type definitions for the Craft Design System theme engine.
 */

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ColorTokens {
    background: string;
    surface: string;
    surfaceSecondary: string;
    border: string;
    borderHover: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    primary: string;
    primaryHover: string;
    accent: string;
    accentHover: string;
    success: string;
    successBg: string;
    warning: string;
    warningBg: string;
    danger: string;
    dangerBg: string;
    info: string;
    infoBg: string;
}

export type ThemeTokenKey = keyof ColorTokens;

export interface ThemeConfig {
    name: string;
    colors: ColorTokens;
}

export interface ThemeContextType {
    theme: ThemeMode;
    resolvedTheme: 'light' | 'dark';
    setTheme: (theme: ThemeMode) => void;
}
