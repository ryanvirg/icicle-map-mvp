import {
  CREEK_LINE,
  FRENCH_CREEK_LINE,
  LELAND_CREEK_LINE,
  WATERSHED_FEATURES,
} from "@/data/watershed";
import type { StyleSpecification } from "maplibre-gl";

export const OPEN_FREEMAP_STYLE =
  "https://tiles.openfreemap.org/styles/liberty";

const kindColor: Record<string, string> = {
  lake: "#2563eb",
  tributary: "#0d9488",
  diversion: "#b45309",
  gage: "#ca8a04",
  channel: "#7c3aed",
  confluence: "#64748b",
};

function connectorFeatures() {
  const creekMid = CREEK_LINE[Math.floor(CREEK_LINE.length / 2)];
  return WATERSHED_FEATURES
    .filter((f) => f.kind === "lake")
    .map((f) => ({
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: [f.coordinates, creekMid],
      },
    }));
}

/** Offline-first style: watershed vectors always present; tiles are added later. */
export function createWatershedStyle(): StyleSpecification {
  return {
    version: 8,
    name: "icicle-watershed-offline-base",
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      "creek-lines": {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: { name: "Icicle Creek" },
              geometry: { type: "LineString", coordinates: CREEK_LINE },
            },
            {
              type: "Feature",
              properties: { name: "French Creek" },
              geometry: { type: "LineString", coordinates: FRENCH_CREEK_LINE },
            },
            {
              type: "Feature",
              properties: { name: "Leland Creek" },
              geometry: { type: "LineString", coordinates: LELAND_CREEK_LINE },
            },
          ],
        },
      },
      connectors: {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: connectorFeatures(),
        },
      },
      "watershed-points": {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: WATERSHED_FEATURES.map((f) => ({
            type: "Feature",
            properties: {
              id: f.id,
              name: f.name,
              kind: f.kind,
              color: kindColor[f.kind] ?? "#64748b",
            },
            geometry: { type: "Point", coordinates: f.coordinates },
          })),
        },
      },
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": "rgba(220, 230, 240, 0.15)" },
      },
      {
        id: "creek-casing",
        type: "line",
        source: "creek-lines",
        filter: ["==", ["get", "name"], "Icicle Creek"],
        paint: {
          "line-color": "#1e3a5f",
          "line-width": 8,
          "line-opacity": 0.45,
        },
      },
      {
        id: "creek-line",
        type: "line",
        source: "creek-lines",
        paint: {
          "line-color": [
            "match",
            ["get", "name"],
            "Icicle Creek",
            "#1d4ed8",
            "#0d9488",
          ],
          "line-width": ["match", ["get", "name"], "Icicle Creek", 5, 3],
          "line-opacity": 1,
        },
      },
      {
        id: "connector-lines",
        type: "line",
        source: "connectors",
        paint: {
          "line-color": "#475569",
          "line-width": 2,
          "line-dasharray": [2, 2],
          "line-opacity": 0.75,
        },
      },
      {
        id: "watershed-points",
        type: "circle",
        source: "watershed-points",
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": [
            "match",
            ["get", "kind"],
            "channel",
            11,
            "lake",
            10,
            8,
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2.5,
        },
      },
      {
        id: "watershed-labels",
        type: "symbol",
        source: "watershed-points",
        layout: {
          "text-field": ["get", "name"],
          "text-size": 12,
          "text-offset": [0, 1.15],
          "text-anchor": "top",
          "text-max-width": 10,
        },
        paint: {
          "text-color": "#0f172a",
          "text-halo-color": "#ffffff",
          "text-halo-width": 2,
        },
      },
    ],
  };
}

/** Optional remote raster underlay (additive). */
export function addRemoteBasemapIfAvailable(
  map: import("maplibre-gl").Map,
): void {
  if (map.getSource("remote-basemap")) return;
  try {
    map.addSource("remote-basemap", {
      type: "raster",
      tiles: [
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap",
    });
    map.addLayer(
      {
        id: "remote-basemap",
        type: "raster",
        source: "remote-basemap",
        paint: { "raster-opacity": 0.85 },
      },
      "creek-casing",
    );
  } catch {
    /* vectors remain visible without tiles */
  }
}
