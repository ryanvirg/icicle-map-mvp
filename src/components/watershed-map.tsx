"use client";

import { CREEK_LINE, WATERSHED_FEATURES, type WatershedFeature } from "@/data/watershed";
import Map, { Layer, Marker, Source } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useMemo, useState } from "react";

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
};

export function WatershedMap({ selectedId, onSelect }: Props) {
  const [mapError, setMapError] = useState<string | null>(null);

  const geojson = useMemo(
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

  if (mapError) {
    return (
      <div className="flex h-[min(52vh,420px)] items-center justify-center rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Map failed to load: {mapError}
      </div>
    );
  }

  return (
    <div className="relative h-[min(52vh,420px)] overflow-hidden rounded-lg border border-slate-200 shadow-inner">
      <Map
        initialViewState={{
          longitude: -120.78,
          latitude: 47.57,
          zoom: 9.2,
        }}
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        style={{ width: "100%", height: "100%" }}
        onError={(e) => setMapError(e.error?.message ?? "Unknown map error")}
      >
        <Source id="creek" type="geojson" data={geojson}>
          <Layer
            id="creek-line"
            type="line"
            paint={{
              "line-color": "#1d4ed8",
              "line-width": 4,
              "line-opacity": 0.85,
            }}
          />
        </Source>
        {WATERSHED_FEATURES.map((f) => (
          <Marker
            key={f.id}
            longitude={f.coordinates[0]}
            latitude={f.coordinates[1]}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onSelect(f);
            }}
          >
            <button
              type="button"
              title={f.name}
              className={`rounded-full border-2 border-white shadow-md transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f] ${
                selectedId === f.id ? "scale-125 ring-2 ring-[#1e3a5f]" : ""
              }`}
              style={{
                width: f.kind === "channel" ? 18 : 14,
                height: f.kind === "channel" ? 18 : 14,
                backgroundColor: kindColor[f.kind],
              }}
              aria-label={f.name}
            />
          </Marker>
        ))}
      </Map>
      <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-[10px] text-slate-600 shadow">
        Lakes · tributaries · diversions · gages · Historical Channel
      </div>
    </div>
  );
}
