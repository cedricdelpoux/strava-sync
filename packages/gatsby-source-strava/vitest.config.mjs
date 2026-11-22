import {configDefaults, defineConfig} from "vitest/config"

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, ".claude/**", "example/**"],
    coverage: {
      include: ["gatsby-node.js", "utils/**"],
      exclude: ["vitest.config.js"],
      reporter: ["text", "lcov"],
    },
  },
})
