import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "scripts/verify/out",
    emptyOutDir: true,
    ssr: "scripts/verify/verify.ts",
    rollupOptions: {
      output: {
        format: "es",
        entryFileNames: "verify.mjs",
      },
    },
  },
});