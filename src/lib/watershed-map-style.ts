import type { StyleSpecification } from "maplibre-gl";

export const OPEN_FREEMAP_STYLE =
  "https://tiles.openfreemap.org/styles/liberty";

/** Offline vector fallback when raster tiles are unreachable. */
export const WATERSHED_BASE_STYLE: StyleSpecification = {
  version: 8,
  name: "icicle-watershed-local",
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#e8eef4" },
    },
  ],
};
