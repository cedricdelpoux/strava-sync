// Loaded on demand: `sharp` is an optional peer dependency
export async function getSharp() {
  try {
    return (await import("sharp")).default
  } catch (error) {
    throw new Error(
      "strava-tiles: drawing activity cards needs `sharp`, which could not be " +
        `resolved from ${import.meta.dirname}. Install it in your project: ` +
        "npm install sharp",
      {cause: error}
    )
  }
}
