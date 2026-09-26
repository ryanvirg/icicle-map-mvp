"use client";

import {
  CREEK_LINE,
  FRENCH_CREEK_LINE,
  LELAND_CREEK_LINE,
  MAP_INITIAL_VIEW,
  WATERSHED_FEATURES,
  type WatershedFeature,
} from "@/data/watershed";
import {
  OPEN_FREEMAP_STYLE,
  WATERSHED_BASE_STYLE,
} from "@/lib/watershed-map-style";
import { useEffect, useRef } from "react";

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

type MapInstance = import("maplibre-gl").Map;

export function WatershedMapNative({
  selectedId,
  onSelect,
  onReady,
  onFailed,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;
    let map: MapInstance;

    const creekMid = CREEK_LINE[Math.floor(CREEK_LINE.length / 2)];
    const connectorLines = WATERSHED_FEATURES
      .filter((f) => f.kind === "lake")
      .map((f) => ({
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "LineString" as const,
          coordinates: [f.coordinates, creekMid],
        },
      }));

    const addLayers = () => {
      if (cancelled || !map) return;
      if (map.getSource("watershed-points")) return;

      map.addSource("creek-lines", {
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
      });
      map.addLayer({
        id: "creek-casing",
        type: "line",
        source: "creek-lines",
        filter: ["==", ["get", "name"], "Icicle Creek"],
        paint: {
          "line-color": "#1e3a5f",
          "line-width": 7,
          "line-opacity": 0.35,
        },
      });
      map.addLayer({
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
          "line-width": ["match", ["get", "name"], "Icicle Creek", 4, 2.5],
        },
      });

      map.addSource("connectors", {
        type: "geojson",
        data: { type: "FeatureCollection", features: connectorLines },
      });
      map.addLayer({
        id: "connector-lines",
        type: "line",
        source: "connectors",
        paint: {
          "line-color": "#64748b",
          "line-width": 1.5,
          "line-dasharray": [2, 2],
          "line-opacity": 0.55,
        },
      });

      map.addSource("watershed-points", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: WATERSHED_FEATURES.map((f) => ({
            type: "Feature",
            properties: {
              id: f.id,
              name: f.name,
              kind: f.kind,
              color: kindColor[f.kind],
            },
            geometry: { type: "Point", coordinates: f.coordinates },
          })),
        },
      });
      map.addLayer({
        id: "watershed-points",
        type: "circle",
        source: "watershed-points",
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": [
            "match",
            ["get", "kind"],
            "channel",
            10,
            "lake",
            9,
            7,
          ],
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 2,
        },
      });
      map.addLayer({
        id: "watershed-labels",
        type: "symbol",
        source: "watershed-points",
        layout: {
          "text-field": ["get", "name"],
          "text-size": 11,
          "text-offset": [0, 1.1],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#1e293b",
          "text-halo-color": "#fff",
          "text-halo-width": 1.2,
        },
      });

      map.on("click", "watershed-points", (e) => {
        const id = e.features?.[0]?.properties?.id as string | undefined;
        if (!id) return;
        const feature = WATERSHED_FEATURES.find((f) => f.id === id);
        if (feature) onSelectRef.current(feature);
      });
      map.on("mouseenter", "watershed-points", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "watershed-points", () => {
        map.getCanvas().style.cursor = "";
      });

      const lngs = WATERSHED_FEATURES.map((f) => f.coordinates[0]);
      const lats = WATERSHED_FEATURES.map((f) => f.coordinates[1]);
      map.fitBounds(
        [
          [Math.min(...lngs) - 0.04, Math.min(...lats) - 0.03],
          [Math.max(...lngs) + 0.04, Math.max(...lats) + 0.03],
        ],
        { padding: 48, duration: 0 },
      );

      onReady();
    };

    import("maplibre-gl")
      .then((maplibregl) => {
        if (cancelled || !containerRef.current) return;
        map = new maplibregl.Map({
          container: containerRef.current,
          style: OPEN_FREEMAP_STYLE,
          center: [MAP_INITIAL_VIEW.longitude, MAP_INITIAL_VIEW.latitude],
          zoom: MAP_INITIAL_VIEW.zoom,
          attributionControl: { compact: true },
        });
        mapRef.current = map;

        map.on("load", addLayers);
        let fellBack = false;
        map.on("error", () => {
          if (fellBack || cancelled) return;
          fellBack = true;
          map.setStyle(WATERSHED_BASE_STYLE);
          map.once("styledata", addLayers);
        });
      })
      .catch((err) => onFailed(String(err)));

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [onFailed, onReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource("watershed-points")) return;
    const source = map.getSource("watershed-points") as import("maplibre-gl").GeoJSONSource;
    source.setData({
      type: "FeatureCollection",
      features: WATERSHED_FEATURES.map((f) => ({
        type: "Feature",
        properties: {
          id: f.id,
          name: f.name,
          kind: f.kind,
          color: kindColor[f.kind],
        },
        geometry: { type: "Point", coordinates: f.coordinates },
      })),
    });
    map.setPaintProperty("watershed-points", "circle-radius", [
      "case",
      ["==", ["get", "id"], selectedId ?? ""],
      12,
      ["match", ["get", "kind"], "channel", 10, 8],
    ]);
  }, [selectedId]);

  return (
    <>
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 max-w-[90%] -translate-x-1/2 rounded-xl bg-white/92 px-4 py-2 text-center shadow-md">
        <p className="text-[11px] font-semibold text-slate-800">Watershed legend</p>
        <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-slate-600">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-600" /> Lakes
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-teal-600" /> Tributaries
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-700" /> Diversions
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-yellow-600" /> Gages
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-violet-600" /> Hist. Channel
          </span>
        </div>
      </div>
    </>
  );
}
