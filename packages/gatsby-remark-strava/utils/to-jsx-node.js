// Markdown reads 4+ leading spaces as an indented code block, which swallows
// the multi-line JSX a `render()` template literal returns
const dedent = (markup) => markup.replace(/^[ \t]+/gm, "").trim()

// These packages are ESM only, and only needed for the "mdx" output
exports.toJsxNode = async (markup) => {
  const {fromMarkdown} = await import("mdast-util-from-markdown")
  const {mdxJsx} = await import("micromark-extension-mdx-jsx")
  const {mdxJsxFromMarkdown} = await import("mdast-util-mdx-jsx")

  const tree = fromMarkdown(dedent(markup), {
    extensions: [mdxJsx()],
    mdastExtensions: [mdxJsxFromMarkdown()],
  })
  const [jsxNode] = tree.children

  if (!jsxNode || jsxNode.type !== "mdxJsxFlowElement") {
    throw new Error("The markup is not a single JSX element")
  }

  // Its position points into the markup, not into the document
  delete jsxNode.position

  return jsxNode
}
