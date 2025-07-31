// import { dirname } from "path";
// import { fileURLToPath } from "url";
// import { FlatCompat } from "@eslint/eslintrc";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// const compat = new FlatCompat({
//   baseDirectory: __dirname,
// });

// const eslintConfig = [
//   ...compat.extends("next/core-web-vitals", "next/typescript"),

//   // 👇 Override specific rules globally
//   {
//     files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
//     rules: {
//       "@typescript-eslint/no-explicit-any": "off",
//       "@typescript-eslint/no-unused-vars": "off",
//     },
//   },
// ];

// export default eslintConfig;

// -------------------- no rule eslint ----------------------
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default [
  {
    files: ["**/*.{js,ts,jsx,tsx}"],
    rules: {}, // ← disables all ESLint rules
  },
];
