import type { StyleSpecification } from "maplibre-gl";

/** No external tile URLs — works offline and in restricted environments. */
export const WATERSHED_BASE_STYLE: StyleSpecification = {
  version: 8,
  name: "icicle-watershed-local",
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#e2e8f0",
      },
    },
    {
      id: "background-hillshade",
      type: "background",
      paint: {
        "background-color": "#dbeafe",
      },
      layout: {
        visibility: "none",
      },
    },
  ],
};
