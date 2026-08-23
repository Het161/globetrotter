import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    // The pure parts are unit-tested: the budget and date engines, and the
    // email templates — all of them strings-and-numbers in, strings-and-numbers
    // out, with no database or network to stand up. Everything else is covered
    // by the manual checklist in docs/REVIEW-CHEATSHEET.md.
    include: ["src/server/engine/**/*.test.ts", "src/server/email/**/*.test.ts"],
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
