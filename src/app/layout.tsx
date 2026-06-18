import type {Metadata} from "next";
import "../styles/globals.css";
import React from "react";

export const metadata: Metadata = {
    title: "Craft",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className={`h-full antialiased`}
        >
        <body className="min-h-full flex flex-col">{children}</body>
        </html>
    );
}
