import type {Metadata} from "next";
import "../styles/globals.css";
import React from "react";
import {ThemeProvider} from "@/components/theme-provider";
import {Header} from "@/components/layout/header";
import {Footer} from "@/components/layout/footer";

export const metadata: Metadata = {
    title: "Craft - File Utilities Workshop",
    description: "High-performance browser-side file conversion, compression, and media tools.",
};

// Inline script executed immediately before paint to prevent theme flash
const themeFlashBlockerScript = `
  (function() {
    try {
      var theme = localStorage.getItem('theme') || 'system';
      var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {}
  })()
`;

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className="h-full antialiased"
            suppressHydrationWarning
        >
        <head>
            <script dangerouslySetInnerHTML={{__html: themeFlashBlockerScript}}/>
        </head>
        <body className="min-h-full flex flex-col bg-background text-text-primary transition-colors duration-200">
        <ThemeProvider>
            {/* Global Navigation Header */}
            <Header/>

            {/* Main Page Area */}
            <main className="flex-1 flex flex-col">
                {children}
            </main>

            {/* Global Nav Footer */}
            <Footer/>
        </ThemeProvider>
        </body>
        </html>
    );
}
