import {defineConfig} from "vitest/config"

export default defineConfig({
  test: {
    coverage: {
      include: ["index.js", "card.js", "lib/**"],
      reporter: ["text"],
    },
  },
})
