import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * eslint-config-next 16 ships native flat configs, so this imports them
 * directly rather than going through FlatCompat.
 */
const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      // `next dev` writes here — see distDir in next.config.ts
      ".next-dev/**",
      "out/**",
      "build/**",
      "prisma/migrations/**",
      // exFAT AppleDouble sidecars — binary files that keep a .tsx extension.
      "**/._*",
    ],
  },

  ...nextCoreWebVitals,
  ...nextTypescript,

  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },

  {
    // Seed and scripts are CLI tools — they are supposed to print.
    files: ["prisma/**/*.ts", "scripts/**/*.{ts,mjs}"],
    rules: { "no-console": "off" },
  },
];

export default eslintConfig;
