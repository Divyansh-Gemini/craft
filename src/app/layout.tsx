import type {Metadata} from "next";
import "../styles/globals.css";
import React from "react";
import {ThemeProvider} from "@/components/theme-provider";

export const metadata: Metadata = {
    title: "Craft — Audio, Video, Image & PDF Tools",
    description: "Convert, trim, merge, compress, and transform audio, video, image, and PDF files. Fast, privacy-first tools that work directly in your browser.",
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
            {children}
        </ThemeProvider>
        </body>
        </html>
    );
}
