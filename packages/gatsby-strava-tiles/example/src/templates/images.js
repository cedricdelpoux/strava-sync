import React from "react"

const formatDate = (startDate) =>
  new Date(startDate).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

const ActivityImage = ({activityImage, size}) => (
  <li
    style={{
      background: "#fff",
      borderRadius: 8,
      overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.15)",
    }}
  >
    <img
      src={activityImage.image}
      alt={`Tiles covered by ${activityImage.name}`}
      width={size.width}
      height={size.height}
      loading="lazy"
      style={{display: "block", width: "100%", height: "auto"}}
    />
    <div style={{padding: "10px 12px"}}>
      <div style={{fontWeight: 600}}>{activityImage.name}</div>
      <div style={{color: "#666", fontSize: 14, marginTop: 2}}>
        {formatDate(activityImage.startDate)}
        {" · "}
        {(activityImage.distance / 1000).toFixed(1)} km
        {activityImage.added > 0 && ` · ${activityImage.added} new tiles`}
      </div>
    </div>
  </li>
)

const ActivityImages = ({pageContext: {images, size}}) => (
  <main
    style={{
      fontFamily: "system-ui, sans-serif",
      background: "#f4f4f5",
      minHeight: "100vh",
      padding: 20,
    }}
  >
    <h1 style={{fontSize: 20, margin: "0 0 16px"}}>
      {images.length} latest activities
    </h1>
    <ul
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(${
          size.width / 2
        }px, 1fr))`,
        gap: 16,
        listStyle: "none",
        margin: 0,
        padding: 0,
      }}
    >
      {images.map((activityImage) => (
        <ActivityImage
          key={activityImage.id}
          activityImage={activityImage}
          size={size}
        />
      ))}
    </ul>
  </main>
)

export default ActivityImages
