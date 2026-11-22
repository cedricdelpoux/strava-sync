exports.getEmbedMarkup = ({type, id, jsx = false}) => {
  const className = jsx ? "className" : "class"

  return `<div ${className}="strava-embed-placeholder" data-embed-type="${type}" data-embed-id="${id}"></div>`
}
