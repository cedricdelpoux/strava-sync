import {describe, expect, it} from "vitest"

import {renderActivityCard} from "../card.js"

describe("renderActivityCard", () => {
  it("draws a card on a flat background", async () => {
    const {image, backgroundTiles} = await renderActivityCard({
      coordinates: [
        [1.4, 43.6],
        [1.42, 43.61],
      ],
    })

    expect(backgroundTiles).toBe(0)
    expect(image.subarray(8, 12).toString()).toBe("WEBP")
  })
})
