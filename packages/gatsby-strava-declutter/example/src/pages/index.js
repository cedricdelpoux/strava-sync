import React, {useEffect, useMemo, useState} from "react"
import {graphql, withPrefix} from "gatsby"

import {DeclutteredTracks, RawTracks} from "../components/tracks"
import {Map} from "../components/map"

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)

  return sorted[Math.floor(sorted.length / 2)]
}

// Where most activities are, which a few far away trips don't move
const getInitialViewState = (declutters) => {
  const starts = declutters
    .map(({parts, stubs}) => [...parts, ...stubs.map((s) => s.coordinates)][0])
    .filter(Boolean)
    .map((line) => line[0])

  if (starts.length === 0) return {longitude: 0, latitude: 0, zoom: 1}

  return {
    longitude: median(starts.map(([lng]) => lng)),
    latitude: median(starts.map(([, lat]) => lat)),
    zoom: 9,
  }
}

const panelStyle = {
  position: "absolute",
  top: 10,
  left: 10,
  padding: "8px 12px",
  background: "white",
  borderRadius: 4,
  boxShadow: "0 1px 4px rgba(0, 0, 0, 0.3)",
  fontSize: 14,
}

const PageIndex = ({data}) => {
  const [withDeclutter, setWithDeclutter] = useState(true)
  const [withLabels, setWithLabels] = useState(true)
  const [tracks, setTracks] = useState([])

  useEffect(() => {
    fetch(withPrefix("/tracks.json"))
      .then((response) => response.json())
      .then(setTracks)
  }, [])

  const {parts, stubs, initialViewState} = useMemo(() => {
    const drawn = data.activities.nodes
      .map(({declutter}) => declutter)
      .filter((declutter) => declutter && !declutter.hidden)

    return {
      parts: drawn.flatMap(({parts}) => parts),
      stubs: drawn.flatMap(({stubs}) => stubs),
      initialViewState: getInitialViewState(drawn),
    }
  }, [data])

  return (
    <main style={{position: "relative", height: "100%"}}>
      <Map initialViewState={initialViewState} showLabels={withLabels}>
        <RawTracks tracks={tracks} visible={!withDeclutter} />
        <DeclutteredTracks
          parts={parts}
          stubs={stubs}
          visible={withDeclutter}
        />
      </Map>
      <div style={panelStyle}>
        <label style={{display: "block"}}>
          <input
            type="checkbox"
            checked={withDeclutter}
            onChange={(event) => setWithDeclutter(event.target.checked)}
          />{" "}
          With Declutter
        </label>
        <label style={{display: "block"}}>
          <input
            type="checkbox"
            checked={withLabels}
            onChange={(event) => setWithLabels(event.target.checked)}
          />{" "}
          With labels
        </label>
      </div>
    </main>
  )
}

export default PageIndex

export const pageQuery = graphql`
  query IndexQuery {
    activities: allStravaActivity {
      nodes {
        declutter {
          hidden
          parts
          stubs {
            hideUntil
            showUntil
            coordinates
          }
        }
      }
    }
  }
`

export const Head = () => <title>gatsby-strava-declutter</title>
