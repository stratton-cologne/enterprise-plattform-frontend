import path from "path";
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");

    const allowedHosts = (env.VITE_ALLOWED_HOSTS ?? "")
        .split(",")
        .map((host) => host.trim())
        .filter(Boolean);

    const hmrHost = (env.VITE_HMR_HOST ?? "").trim();
    const hmrClientPort = Number(env.VITE_HMR_CLIENT_PORT || "");
    const hmrProtocol = (env.VITE_HMR_PROTOCOL ?? "").trim();

    return {
        plugins: [vue()],
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
            },
        },
        server: {
            host: "0.0.0.0",
            port: 5173,
            strictPort: true,
            allowedHosts: allowedHosts.length > 0 ? allowedHosts : true,
            hmr: hmrHost
                ? {
                      host: hmrHost,
                      protocol: hmrProtocol || "ws",
                      clientPort: Number.isFinite(hmrClientPort) && hmrClientPort > 0 ? hmrClientPort : undefined,
                  }
                : undefined,
            proxy: {
                "/api": {
                    target: env.VITE_API_PROXY_TARGET || env.VITE_API_URL || "http://127.0.0.1:8000",
                    changeOrigin: true,
                },
            },
        },
    };
});
