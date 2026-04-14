import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    server: {
      port: 3000,
      host: "0.0.0.0",
    },
    plugins: [react()],
    // SECURITY: Removed GEMINI_API_KEY injection - API keys should NEVER be in frontend
    // All Gemini API calls now go through the secure backend server
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
  };
});
