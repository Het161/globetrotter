import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    // Only the pure engines are unit-tested. Everything else is covered by the
    // manual checklist in docs/REVIEW-CHEATSHEET.md.
    include: ["src/server/engine/**/*.test.ts"],
    // exFAT AppleDouble sidecars look like test files but are binary.
    exclude: ["**/node_modules/**", "**/._*"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
