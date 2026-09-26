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
  { ssr: false },
);

type Props = {
  selectedId: string | null;
  onSelect: (feature: WatershedFeature) => void;
  className?: string;
};

export function WatershedMap({ selectedId, onSelect, className }: Props) {
  const [glReady, setGlReady] = useState(false);
  const [glFailed, setGlFailed] = useState(false);

  return (
    <div
      className={`relative h-full min-h-[300px] w-full overflow-hidden bg-slate-200 ${className ?? ""}`}
      data-testid="watershed-map-container"
      data-map-ready="true"
    >
      <WatershedSchematicFallback
        embedded
        selectedId={selectedId}
        onSelect={onSelect}
      />
      {!glFailed && (
        <div className="absolute inset-0 z-10">
          <WatershedMapNative
            selectedId={selectedId}
            onSelect={onSelect}
            onReady={() => setGlReady(true)}
            onFailed={() => setGlFailed(true)}
          />
        </div>
      )}
      {!glReady && !glFailed && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-start justify-center bg-transparent pt-3 text-xs text-slate-600">
          <span className="rounded bg-white/90 px-2 py-1 shadow">
            Loading map tiles…
          </span>
        </div>
      )}
    </div>
  );
}
