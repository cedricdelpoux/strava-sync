const visit = require("unist-util-visit")

const {getActivity} = require("./utils/get-activity.js")
const {getEmbedMarkup} = require("./utils/get-embed-markup.js")
const {parseEmbedLink} = require("./utils/parse-embed-link.js")
const {replaceNode} = require("./utils/replace-node.js")
const {toJsxNode} = require("./utils/to-jsx-node.js")

const OUTPUTS = ["html", "mdx"]

const findEmbedLinks = (markdownAST) => {
  const links = []

  visit(markdownAST, "paragraph", (paragraphNode) => {
    if (paragraphNode.children.length !== 1) {
      return
    }

    const [node] = paragraphNode.children
    const embed = parseEmbedLink(node)

    if (embed) {
      links.push({paragraphNode, url: node.url, embed})
    }
  })

  return links
}

module.exports = async ({markdownAST, cache, reporter}, pluginOptions) => {
  const {render, debug} = pluginOptions
  const output = pluginOptions.output || "html"

  if (!OUTPUTS.includes(output)) {
    reporter.warn(
      `remark-strava: Invalid \`output\` option "${output}", expected one of: ${OUTPUTS.join(
        ", "
      )}`
    )
    return
  }

  if (render !== undefined && typeof render !== "function") {
    reporter.warn("remark-strava: The `render` option must be a function")
    return
  }

  const isJsx = output === "mdx"

  await Promise.all(
    findEmbedLinks(markdownAST).map(
      async ({paragraphNode, url, embed: {type, id}}) => {
        try {
          const markup =
            render && type === "activity"
              ? render(await getActivity({id, options: pluginOptions, cache}))
              : getEmbedMarkup({type, id, jsx: isJsx})

          // The markup replaces the whole paragraph, because a <div> cannot
          // sit inside a <p>
          replaceNode(
            paragraphNode,
            isJsx ? await toJsxNode(markup) : {type: "html", value: markup}
          )

          if (debug) {
            reporter.success(`remark-strava: EMBED OK ${url}`)
          }
        } catch (error) {
          // The link stays a link meanwhile
          reporter.warn(`remark-strava: EMBED NOK ${url}: ${error.message}`)
        }
      }
    )
  )

  return markdownAST
}
