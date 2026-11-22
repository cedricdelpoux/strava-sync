import js from "@eslint/js"
import globals from "globals"

export default [
  {
    ignores: [
      ".claude/**",
      "**/coverage/**",
      "**/types/**",
      "**/node_modules/**",
      "**/example/.cache/**",
      "**/example/public/**",
      "**/examples/*/.cache/**",
      "**/examples/*/public/**",
    ],
  },
  js.configs.recommended,
  {
    languageOptions: {
      sourceType: "commonjs",
      globals: globals.node,
    },
  },
  {
    files: [
      "packages/strava-sync/**/*.js",
      "packages/strava-declutter/**/*.js",
      "packages/strava-tiles/**/*.js",
    ],
    languageOptions: {
      sourceType: "module",
    },
    rules: {
      "no-control-regex": "off",
    },
  },
  {
    files: [
      "packages/gatsby-*/test/**/*.js",
      "packages/gatsby-*/vitest.config.mjs",
    ],
    languageOptions: {
      sourceType: "module",
    },
  },
  {
    files: [
      "packages/gatsby-remark-strava/gatsby-browser.js",
      "packages/gatsby-remark-strava/test/gatsby-browser.test.js",
    ],
    languageOptions: {globals: {...globals.node, ...globals.browser}},
  },
  {
    files: ["packages/*/example/**/*.js", "packages/*/examples/**/*.js"],
    languageOptions: {
      sourceType: "module",
      parserOptions: {ecmaFeatures: {jsx: true}},
      globals: {...globals.node, ...globals.browser},
    },
    rules: {
      "no-unused-vars": ["error", {varsIgnorePattern: "^React$"}],
    },
  },
]
