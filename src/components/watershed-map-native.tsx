"use client";

import {
  WATERSHED_FEATURES,
  WATERSHED_GEOJSON,
  type WatershedMapFeature,
} from "@/data/creeks";
import { createWatershedStyle } from "@/lib/watershed-map-style";
import type { MapOverlay } from "@/data/map-overlays";
import { useEffect, useRef } from "react";

type Props = {
  selectedFeatureId: string | null;
  dataOverlay: MapOverlay | null;
  onSelectFeature: (feature: WatershedMapFeature) => void;
  onReady: () => void;
  onFailed: (message: string) => void;
};

type MapInstance = import("maplibre-gl").Map;

function applyDataOverlay(map: MapInstance, dataOverlay: MapOverlay | null) {
  const vectorLayers = {
    huc12: "huc12-data-overlay",
    climate: "climate-data-overlay",
  };
  const overlayLayers = [
    ...Object.values(vectorLayers),
    "nlcd-land-cover-overlay",
    "nlcd-tree-canopy-overlay",
    "terrain-relief-overlay",
    "terrain-slope-overlay",
    "ssurgo-mapunits-overlay",
    "prism-precipitation-overlay",
    "prism-temperature-overlay",
  ];
  const activeLayer = dataOverlay
    ? dataOverlay.source === "raster"
      ? dataOverlay.rasterLayer
      : vectorLayers[dataOverlay.source]
    : null;
  for (const layer of overlayLayers) {
    if (map.getLayer(layer)) {
      map.setLayoutProperty(
        layer,
        "visibility",
        layer === activeLayer ? "visible" : "none",
      );
    }
  }
  if (!dataOverlay || !activeLayer || dataOverlay.source === "raster" || !map.getLayer(activeLayer)) return;
  map.setPaintProperty(activeLayer, "fill-color", [
    "interpolate", ["linear"], ["to-number", ["get", dataOverlay.property], dataOverlay.min],
    dataOverlay.min, dataOverlay.colors[0],
    (dataOverlay.min + dataOverlay.max) / 2, dataOverlay.colors[1],
    dataOverlay.max, dataOverlay.colors[2],
  ]);
}

function getFeatureCoordinates(
  feature: (typeof WATERSHED_GEOJSON.features)[number],
) {
  if (feature.geometry.type === "LineString") return feature.geometry.coordinates;
  if (feature.geometry.type === "Polygon") return feature.geometry.coordinates.flat();
  return feature.geometry.coordinates.flat(2);
}

function getWatershedBounds(maplibregl: typeof import("maplibre-gl")) {
  const bounds = new maplibregl.LngLatBounds();
  for (const feature of WATERSHED_GEOJSON.features) {
    for (const [longitude, latitude] of getFeatureCoordinates(feature)) {
      bounds.extend([longitude, latitude]);
    }
  }
  return bounds;
}

export function WatershedMapNative({
  selectedFeatureId,
  dataOverlay,
  onSelectFeature,
  onReady,
  onFailed,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const selectedFeatureIdRef = useRef(selectedFeatureId);
  const dataOverlayRef = useRef(dataOverlay);
  const onSelectFeatureRef = useRef(onSelectFeature);
  const onReadyRef = useRef(onReady);
  const onFailedRef = useRef(onFailed);

  useEffect(() => {
    selectedFeatureIdRef.current = selectedFeatureId;
    dataOverlayRef.current = dataOverlay;
    onSelectFeatureRef.current = onSelectFeature;
    onReadyRef.current = onReady;
    onFailedRef.current = onFailed;
  }, [selectedFeatureId, dataOverlay, onSelectFeature, onReady, onFailed]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;
    let mapLoaded = false;
    let loadTimeout: number | undefined;

    import("maplibre-gl")
      .then((maplibregl) => {
        if (cancelled || !containerRef.current) return;

        maplibregl.setWorkerUrl(
          new URL("maplibre-gl-worker.mjs", document.baseURI).toString(),
        );
        const map = new maplibregl.Map({
          container: containerRef.current,
          style: createWatershedStyle(),
          attributionControl: { compact: true },
          maxZoom: 19,
        });
        mapRef.current = map;
        loadTimeout = window.setTimeout(() => {
          if (!cancelled && !mapLoaded) {
            onFailedRef.current(
              "The map did not finish loading. Check that the basemap and map worker are reachable.",
            );
          }
        }, 15000);

        map.on("load", () => {
          if (cancelled) return;
          mapLoaded = true;
          window.clearTimeout(loadTimeout);
          map.fitBounds(getWatershedBounds(maplibregl), {
            padding: 40,
            maxZoom: 13,
            duration: 0,
          });
          for (const feature of WATERSHED_FEATURES) {
            map.setFeatureState(
              { source: "watershed-features", id: feature.id },
              { selected: feature.id === selectedFeatureIdRef.current },
            );
          }
          applyDataOverlay(map, dataOverlayRef.current);
          onReadyRef.current();
        });
        map.addControl(
          new maplibregl.NavigationControl({
            showCompass: true,
            showZoom: true,
          }),
          "top-right",
        );

        const selectFeature = (event: import("maplibre-gl").MapLayerMouseEvent) => {
          const id = event.features?.[0]?.properties?.id;
          const feature = WATERSHED_FEATURES.find(
            (candidate) => candidate.id === id,
          );
          if (feature) onSelectFeatureRef.current(feature);
        };
        map.on("click", "creek-hit-area", selectFeature);
        map.on("click", "lake-polygons", selectFeature);
        map.on("mouseenter", "creek-hit-area", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "creek-hit-area", () => {
          map.getCanvas().style.cursor = "";
        });
        map.on("mouseenter", "lake-polygons", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "lake-polygons", () => {
          map.getCanvas().style.cursor = "";
        });
        map.on("error", (event) => {
          if (!cancelled && event.error) {
            console.error("MapLibre map error:", event.error);
            if (!mapLoaded && /worker/i.test(event.error.message)) {
              onFailedRef.current(event.error.message);
            }
          }
        });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          onFailedRef.current(
            error instanceof Error ? error.message : String(error),
          );
        }
      });

    return () => {
      cancelled = true;
      window.clearTimeout(loadTimeout);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded() || !map.getSource("watershed-features")) return;

    for (const feature of WATERSHED_FEATURES) {
      map.setFeatureState(
        { source: "watershed-features", id: feature.id },
        { selected: feature.id === selectedFeatureId },
      );
    }
  }, [selectedFeatureId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    applyDataOverlay(map, dataOverlay);
  }, [dataOverlay]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 h-full w-full"
      data-testid="watershed-map-canvas"
    />
  );
}
