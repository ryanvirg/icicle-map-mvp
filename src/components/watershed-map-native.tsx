"use client";

import {
  WATERSHED_FEATURES,
  WATERSHED_GEOJSON,
  type WatershedMapFeature,
} from "@/data/creeks";
import { createWatershedStyle } from "@/lib/watershed-map-style";
import { useEffect, useRef } from "react";

type Props = {
  selectedFeatureId: string | null;
  showFeatures: boolean;
  onSelectFeature: (feature: WatershedMapFeature) => void;
  onReady: () => void;
  onFailed: (message: string) => void;
};

type MapInstance = import("maplibre-gl").Map;

function getFeatureCoordinates(
  feature: (typeof WATERSHED_GEOJSON.features)[number],
) {
  return feature.geometry.type === "LineString"
    ? feature.geometry.coordinates
    : feature.geometry.coordinates.flat();
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
  showFeatures,
  onSelectFeature,
  onReady,
  onFailed,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const selectedFeatureIdRef = useRef(selectedFeatureId);
  const showFeaturesRef = useRef(showFeatures);
  const onSelectFeatureRef = useRef(onSelectFeature);
  const onReadyRef = useRef(onReady);
  const onFailedRef = useRef(onFailed);

  selectedFeatureIdRef.current = selectedFeatureId;
  showFeaturesRef.current = showFeatures;
  onSelectFeatureRef.current = onSelectFeature;
  onReadyRef.current = onReady;
  onFailedRef.current = onFailed;

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
          setFeatureVisibility(map, showFeaturesRef.current);
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
    if (!map?.isStyleLoaded()) return;
    setFeatureVisibility(map, showFeatures);
  }, [showFeatures]);

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

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 h-full w-full"
      data-testid="watershed-map-canvas"
    />
  );
}

function setFeatureVisibility(map: MapInstance, visible: boolean) {
  const visibility = visible ? "visible" : "none";
  for (const layerId of [
    "lake-polygons",
    "creek-casing",
    "creek-lines",
    "creek-hit-area",
  ]) {
    if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", visibility);
  }
}
