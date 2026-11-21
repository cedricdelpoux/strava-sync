import {Layer, Source} from "react-map-gl/maplibre"
import React from "react"

const COLOR = "#fc4c02"

const lineLayout = {"line-join": "round", "line-cap": "round"}

const linesToFeatureCollection = (lines) => ({
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: {type: "MultiLineString", coordinates: lines},
    },
  ],
})

const stubsToFeatureCollection = (stubs) => ({
  type: "FeatureCollection",
  features: stubs.map(({hideUntil, showUntil, coordinates}) => ({
    type: "Feature",
    properties: {hideUntil, showUntil},
    geometry: {type: "LineString", coordinates},
  })),
})

// A stub is hidden below its `hideUntil` and from its `showUntil` on (0 for
// never). `zoom` is only allowed as the input of a top-level `step`, hence one
// step per integer zoom.
const ZOOM_STEPS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]

const opacityByZoom = () => {
  const opacityAt = (zoom) => [
    "case",
    [
      "all",
      ["<=", ["get", "hideUntil"], zoom],
      [
        "any",
        ["==", ["get", "showUntil"], 0],
        [">", ["get", "showUntil"], zoom],
      ],
    ],
    1,
    0,
  ]

  return [
    "step",
    ["zoom"],
    opacityAt(ZOOM_STEPS[0] - 1),
    ...ZOOM_STEPS.flatMap((zoom) => [zoom, opacityAt(zoom)]),
  ]
}

export const RawTracks = ({tracks, visible}) => (
  <Source id="raw" type="geojson" data={linesToFeatureCollection(tracks)}>
    <Layer
      id="raw"
      type="line"
      layout={{...lineLayout, visibility: visible ? "visible" : "none"}}
      paint={{"line-color": COLOR, "line-width": 1}}
    />
  </Source>
)

// `parts` are drawn at every zoom, `stubs` depend on the zoom
export const DeclutteredTracks = ({parts, stubs, visible}) => {
  const visibility = visible ? "visible" : "none"

  return (
    <>
      <Source id="parts" type="geojson" data={linesToFeatureCollection(parts)}>
        <Layer
          id="parts"
          type="line"
          layout={{...lineLayout, visibility}}
          paint={{"line-color": COLOR, "line-width": 1}}
        />
      </Source>
      <Source id="stubs" type="geojson" data={stubsToFeatureCollection(stubs)}>
        <Layer
          id="stubs"
          type="line"
          layout={{...lineLayout, visibility}}
          paint={{
            "line-color": COLOR,
            "line-width": 1,
            "line-opacity": opacityByZoom(),
          }}
        />
      </Source>
    </>
  )
}
