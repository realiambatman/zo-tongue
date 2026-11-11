import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => {
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
