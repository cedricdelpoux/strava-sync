const LINK_PATH = /^\/(activities|routes)\/(\d+)\/?$/
const STRAVA_HOSTS = ["strava.com", "www.strava.com"]

const TYPES = {activities: "activity", routes: "route"}

const hasEmbedText = (node) =>
  node.children.length === 1 &&
  typeof node.children[0].value === "string" &&
  node.children[0].value.toLowerCase().includes("embed")

exports.parseEmbedLink = (node) => {
  if (node.type !== "link" || !hasEmbedText(node)) {
    return null
  }

  try {
    const {protocol, hostname, pathname} = new URL(node.url)
    const match = pathname.match(LINK_PATH)

    if (protocol !== "https:" || !STRAVA_HOSTS.includes(hostname) || !match) {
      return null
    }

    return {type: TYPES[match[1]], id: match[2]}
  } catch {
    return null
  }
}
