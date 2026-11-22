import {defineConfig} from "vitest/config"

export default defineConfig({
  test: {
    coverage: {
      include: ["index.js", "images.js", "lib/**"],
      reporter: ["text", "lcov"],
    },
  },
})
