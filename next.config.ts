import type {NextConfig} from "next";

const nextConfig: NextConfig = {
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    // The following headers enable "Cross-Origin Isolation" (self.crossOriginIsolated).
                    // This is security-required by modern browsers to expose the SharedArrayBuffer API.
                    // SharedArrayBuffer is utilized by ffmpeg.wasm to enable multi-threaded high-performance
                    // video/audio processing (compressing, converting, encoding) in the web browser.
                    {
                        key: "Cross-Origin-Embedder-Policy",
                        value: "require-corp",
                    },
                    {
                        key: "Cross-Origin-Opener-Policy",
                        value: "same-origin",
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
