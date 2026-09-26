"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { WatershedSchematicFallback } from "@/components/watershed-schematic-fallback";
import type { WatershedFeature } from "@/data/watershed";
import dynamic from "next/dynamic";
import { useState } from "react";

const WatershedMapNative = dynamic(
  () =>
    import("@/components/watershed-map-native").then(
      (mod) => mod.WatershedMapNative,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-slate-200 text-sm text-slate-600">
        Loading map engine…
      </div>
    ),
  },
);

type Props = {
  selectedId: string | null;
  onSelect: (feature: WatershedFeature) => void;
  className?: string;
};

export function WatershedMap({ selectedId, onSelect, className }: Props) {
  const [glReady, setGlReady] = useState(false);
  const [glFailed, setGlFailed] = useState(false);

  if (glFailed) {
    return (
      <div className={className} data-map-ready="true">
        <WatershedSchematicFallback
          selectedId={selectedId}
          onSelect={onSelect}
          reason="MapLibre could not load basemap or vector layers."
        />
      </div>
    );
  }

  return (
    <div
      className={`relative h-full min-h-[300px] w-full bg-slate-200 ${className ?? ""}`}
      data-testid="watershed-map-container"
      data-map-ready="true"
    >
      <WatershedMapNative
        selectedId={selectedId}
        onSelect={onSelect}
        onReady={() => setGlReady(true)}
        onFailed={() => setGlFailed(true)}
      />
      {!glReady && (
        <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-slate-200/70 text-sm text-slate-600">
          Loading map tiles…
        </div>
      )}
    </div>
  );
}
