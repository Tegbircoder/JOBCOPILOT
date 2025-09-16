import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  define: {
    global: "window",
    "process.env": {}, // minimal env to satisfy libs
  },
  optimizeDeps: {
    include: ["buffer", "process"],
  },
});
