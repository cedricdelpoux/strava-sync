// In place, so that the parent keeps pointing to it
exports.replaceNode = (node, newNode) => {
  Object.keys(node).forEach((key) => delete node[key])
  Object.assign(node, newNode)
}
