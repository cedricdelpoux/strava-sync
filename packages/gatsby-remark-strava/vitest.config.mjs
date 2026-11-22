import {configDefaults, defineConfig} from "vitest/config"

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, ".claude/**", "examples/**"],
    coverage: {
      include: ["index.js", "gatsby-browser.js", "utils/**"],
      exclude: ["vitest.config.js"],
      reporter: ["text", "lcov"],
    },
  },
})
