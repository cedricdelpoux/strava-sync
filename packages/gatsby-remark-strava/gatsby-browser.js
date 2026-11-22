const EMBED_SCRIPT_URL = "https://strava-embeds.com/embed.js"

exports.onRouteUpdate = () => {
  if (!document.querySelector(".strava-embed-placeholder")) {
    return
  }

  // The script turns the placeholders into iframes when it loads, and
  // exposes the same function to do it again on a page it did not load with
  if (window.__STRAVA_EMBED_BOOTSTRAP__) {
    window.__STRAVA_EMBED_BOOTSTRAP__()
  } else if (!document.querySelector(`script[src="${EMBED_SCRIPT_URL}"]`)) {
    const script = document.createElement("script")

    script.src = EMBED_SCRIPT_URL
    script.async = true
    document.head.appendChild(script)
  }
}
