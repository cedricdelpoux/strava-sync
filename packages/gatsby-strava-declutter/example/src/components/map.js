import "maplibre-gl/dist/maplibre-gl.css"

import {getVersion, setWorkerUrl} from "maplibre-gl"
import MapGL from "react-map-gl/maplibre"
import React, {useCallback, useEffect, useRef, useState} from "react"
import {withPrefix} from "gatsby"

// Free, without an API key
const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron"

const setLabelsVisibility = (map, visible) =>
  map
    .getStyle()
    .layers.filter(({type}) => type === "symbol")
    .forEach(({id}) =>
      map.setLayoutProperty(id, "visibility", visible ? "visible" : "none")
    )

// MapLibre only runs in the browser: nothing renders on the server, nor
// before the first browser render (see gatsby-node.js)
export const Map = ({initialViewState, showLabels = true, children}) => {
  const [isMounted, setIsMounted] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const mapRef = useRef(null)

  useEffect(() => {
    // Copied into the site by gatsby-node.js
    setWorkerUrl(
      `${window.location.origin}${withPrefix(
        `/maplibre-gl-worker-${getVersion()}.mjs`
      )}`
    )
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isLoaded) setLabelsVisibility(mapRef.current.getMap(), showLabels)
  }, [isLoaded, showLabels])

  const onLoad = useCallback(() => setIsLoaded(true), [])

  if (!isMounted) return null

  return (
    <MapGL
      ref={mapRef}
      onLoad={onLoad}
      initialViewState={initialViewState}
      mapStyle={MAP_STYLE}
      // The view in the URL, to share or reload a place
      hash
      style={{width: "100%", height: "100%"}}
    >
      {children}
    </MapGL>
  )
}
