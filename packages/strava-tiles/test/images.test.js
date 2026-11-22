import {describe, expect, it} from "vitest"

import {renderActivityImage} from "../images.js"

describe("renderActivityImage", () => {
  it("draws an image on a flat background", async () => {
    const {image, backgroundTiles} = await renderActivityImage({
      coordinates: [
        [1.4, 43.6],
        [1.42, 43.61],
      ],
    })

    expect(backgroundTiles).toBe(0)
    expect(image.subarray(8, 12).toString()).toBe("WEBP")
  })
})
