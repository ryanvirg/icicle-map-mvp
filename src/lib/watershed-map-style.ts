import { WATERSHED_FEATURES, WATERSHED_GEOJSON } from "@/data/creeks";
import { CLIMATE_OVERLAY_GEOJSON, HUC12_OVERLAY_GEOJSON } from "@/data/map-overlays";
import type { StyleSpecification } from "maplibre-gl";

/** Muted public basemap with consistent creek and lake symbology. */
export function createWatershedStyle(): StyleSpecification {
  return {
    version: 8,
    name: "icicle-creek-and-lakes-map",
    sources: {
      basemap: {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        attribution:
          "Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap contributors, and the GIS user community",
      },
      "watershed-features": {
        type: "geojson",
        promoteId: "id",
        data: {
          ...WATERSHED_GEOJSON,
          features: WATERSHED_GEOJSON.features.map((feature, index) => ({
            ...feature,
            properties: {
              ...feature.properties,
              id: WATERSHED_FEATURES[index].id,
              name: WATERSHED_FEATURES[index].name,
              kind: WATERSHED_FEATURES[index].kind,
            },
          })),
        },
      },
      "huc12-overlay": { type: "geojson", data: HUC12_OVERLAY_GEOJSON },
      "climate-overlay": { type: "geojson", data: CLIMATE_OVERLAY_GEOJSON },
      gauges: { type: "geojson", data: "/gauges.geojson" },
    },
    layers: [
      {
        id: "basemap",
        type: "raster",
        source: "basemap",
        minzoom: 0,
        maxzoom: 19,
      },
      {
        id: "huc12-data-overlay",
        type: "fill",
        source: "huc12-overlay",
        layout: { visibility: "none" },
        paint: {
          "fill-color": "#4d8d78",
          "fill-opacity": 0.66,
          "fill-outline-color": "#ffffff",
        },
      },
      {
        id: "climate-data-overlay",
        type: "fill",
        source: "climate-overlay",
        layout: { visibility: "none" },
        paint: {
          "fill-color": "#4d8d78",
          "fill-opacity": 0.72,
          "fill-outline-color": "#ffffff",
        },
      },
      {
        id: "lake-polygons",
        type: "fill",
        source: "watershed-features",
        filter: ["==", ["get", "kind"], "lake"],
        paint: {
          "fill-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            "#5d8d9b",
            "#9fb9bb",
          ],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            0.72,
            0.52,
          ],
          "fill-outline-color": "#557d84",
        },
      },
      {
        id: "creek-casing",
        type: "line",
        source: "watershed-features",
        filter: ["==", ["get", "kind"], "creek"],
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#ffffff",
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            7,
            5,
          ],
          "line-opacity": 0.95,
          "line-blur": 0.2,
        },
      },
      {
        id: "creek-lines",
        type: "line",
        source: "watershed-features",
        filter: ["==", ["get", "kind"], "creek"],
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#245563",
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            4.25,
            2.75,
          ],
          "line-opacity": 1,
        },
      },
      {
        id: "creek-hit-area",
        type: "line",
        source: "watershed-features",
        filter: ["==", ["get", "kind"], "creek"],
        paint: {
          "line-color": "#176b7c",
          "line-width": 16,
          "line-opacity": 0,
        },
      },
      {
        id: "gauge-points",
        type: "circle",
        source: "gauges",
        paint: {
          "circle-radius": 6,
          "circle-color": [
            "match", ["get", "agency"],
            "USGS", "#225f86",
            "Ecology", "#267c5d",
            "USFWS", "#b56622",
            "#475569",
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      },
      {
        id: "gauge-labels",
        type: "symbol",
        source: "gauges",
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-size": 11,
          "text-offset": [0, 1.05],
          "text-anchor": "top",
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#1e293b",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      },
    ],
  };
}
