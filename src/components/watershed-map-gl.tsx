"use client";

import {
  CREEK_LINE,
  WATERSHED_FEATURES,
  type WatershedFeature,
} from "@/data/watershed";
import { WATERSHED_BASE_STYLE } from "@/lib/watershed-map-style";
import { useCallback, useMemo } from "react";
import Map, { Layer, Source } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "maplibre-gl";

const MAP_HEIGHT_PX = 420;

const kindColor: Record<WatershedFeature["kind"], string> = {
  lake: "#2563eb",
  tributary: "#0d9488",
  diversion: "#b45309",
  gage: "#ca8a04",
  channel: "#7c3aed",
  confluence: "#64748b",
};

type Props = {
  selectedId: string | null;
  onSelect: (feature: WatershedFeature) => void;
  onReady: () => void;
  onFailed: (message: string) => void;
};

function featureById(id: string): WatershedFeature | undefined {
  return WATERSHED_FEATURES.find((f) => f.id === id);
}

export function WatershedMapGL({
  selectedId,
  onSelect,
  onReady,
  onFailed,
}: Props) {
  const creekGeojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: { name: "Icicle Creek mainstem" },
          geometry: { type: "LineString" as const, coordinates: CREEK_LINE },
        },
      ],
    }),
    [],
  );

  const connectorGeojson = useMemo(() => {
    const creekMid = CREEK_LINE[Math.floor(CREEK_LINE.length / 2)];
    const lines = WATERSHED_FEATURES
      .filter((f) => f.kind === "lake" || f.kind === "tributary")
      .map((f) => ({
        type: "Feature" as const,
        properties: { id: f.id },
        geometry: {
          type: "LineString" as const,
          coordinates: [f.coordinates, creekMid] as [number, number][],
        },
      }));
    return { type: "FeatureCollection" as const, features: lines };
  }, []);

  const pointsGeojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: WATERSHED_FEATURES.map((f) => ({
        type: "Feature" as const,
        properties: {
          id: f.id,
          name: f.name,
          kind: f.kind,
          color: kindColor[f.kind],
          selected: f.id === selectedId,
        },
        geometry: {
          type: "Point" as const,
          coordinates: f.coordinates,
        },
      })),
    }),
    [selectedId],
  );

  const onMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const id = e.features?.[0]?.properties?.id as string | undefined;
      if (!id) return;
      const feature = featureById(id);
      if (feature) onSelect(feature);
    },
    [onSelect],
  );

  return (
    <Map
      initialViewState={{
        longitude: -120.78,
        latitude: 47.57,
        zoom: 9.35,
      }}
      mapStyle={WATERSHED_BASE_STYLE}
      style={{ width: "100%", height: MAP_HEIGHT_PX }}
      attributionControl={false}
      interactiveLayerIds={["watershed-points"]}
      onClick={onMapClick}
      onLoad={onReady}
      onIdle={onReady}
      onError={(e) => onFailed(e.error?.message ?? "MapLibre error")}
    >
      <Source id="creek" type="geojson" data={creekGeojson}>
        <Layer
          id="creek-casing"
          type="line"
          paint={{
            "line-color": "#1e3a5f",
            "line-width": 8,
            "line-opacity": 0.35,
          }}
        />
        <Layer
          id="creek-line"
          type="line"
          paint={{
            "line-color": "#1d4ed8",
            "line-width": 4,
            "line-opacity": 0.95,
          }}
        />
      </Source>
      <Source id="connectors" type="geojson" data={connectorGeojson}>
        <Layer
          id="connector-lines"
          type="line"
          paint={{
            "line-color": "#64748b",
            "line-width": 1.5,
            "line-opacity": 0.55,
            "line-dasharray": [2, 2],
          }}
        />
      </Source>
      <Source id="watershed-points" type="geojson" data={pointsGeojson}>
        <Layer
          id="watershed-points"
          type="circle"
          paint={{
            "circle-color": ["get", "color"],
            "circle-radius": [
              "case",
              ["get", "selected"],
              11,
              ["==", ["get", "kind"], "channel"],
              10,
              8,
            ],
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          }}
        />
      </Source>
    </Map>
  );
}
