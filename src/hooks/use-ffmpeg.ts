"use client";

import {useState, useEffect, useCallback} from "react";
import {loadFFmpeg, getFFmpeg} from "@/features/video/ffmpeg";
import {FFmpeg} from "@ffmpeg/ffmpeg";

export function useFFmpeg() {
    const [ffmpeg, setFfmpeg] = useState<FFmpeg | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [error, setError] = useState<Error | null>(null);

    const init = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const instance = await loadFFmpeg((msg) => {
                setLogs((prev) => {
                    // Keep last 100 log lines to avoid performance issues
                    const newLogs = [...prev, msg];
                    if (newLogs.length > 100) {
                        return newLogs.slice(newLogs.length - 100);
                    }
                    return newLogs;
                });
            });
            setFfmpeg(instance);
            setIsLoaded(true);
        } catch (err: any) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Auto-initialize when the component mounts or reference the singleton
    useEffect(() => {
        if (typeof window !== "undefined") {
            try {
                const instance = getFFmpeg();
                if (instance.loaded) {
                    setFfmpeg(instance);
                    setIsLoaded(true);
                }
            } catch (err) {
                console.warn("[useFFmpeg] Initialization check failed:", err);
            }
        }
    }, []);

    return {
        ffmpeg,
        isLoading,
        isLoaded,
        logs,
        error,
        loadFFmpeg: init,
    };
}
