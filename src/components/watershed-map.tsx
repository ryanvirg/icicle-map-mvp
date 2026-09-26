"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { WatershedSchematicFallback } from "@/components/watershed-schematic-fallback";
import type { WatershedFeature } from "@/data/watershed";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const MAP_HEIGHT_PX = 420;

const WatershedMapGL = dynamic(
  () =>
    import("@/components/watershed-map-gl").then((mod) => mod.WatershedMapGL),
  { ssr: false },
);

type Props = {
  selectedId: string | null;
  onSelect: (feature: WatershedFeature) => void;
};

function webglAvailable(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

export function WatershedMap({ selectedId, onSelect }: Props) {
  const [glReady, setGlReady] = useState(false);
  const [glFailed, setGlFailed] = useState(false);
  const [canUseGl, setCanUseGl] = useState(false);

  useEffect(() => {
    setCanUseGl(webglAvailable());
    if (!webglAvailable()) setGlFailed(true);
  }, []);

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border border-slate-200 shadow-inner"
      style={{ height: MAP_HEIGHT_PX, minHeight: MAP_HEIGHT_PX }}
      data-testid="watershed-map-container"
      data-map-ready="true"
    >
      <WatershedSchematicFallback
        selectedId={selectedId}
        onSelect={onSelect}
        reason={glFailed ? "Using offline vector map (MapLibre unavailable)" : null}
        embedded
      />
      {canUseGl && !glFailed && (
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            glReady ? "opacity-100" : "opacity-0"
          }`}
        >
          <WatershedMapGL
            selectedId={selectedId}
            onSelect={onSelect}
            onReady={() => setGlReady(true)}
            onFailed={() => setGlFailed(true)}
          />
        </div>
      )}
      <div className="pointer-events-none absolute bottom-2 left-2 z-10 rounded bg-white/90 px-2 py-1 text-[10px] text-slate-600 shadow">
        {glReady
          ? "Local watershed view (no basemap tiles) · click a feature"
          : "Offline vector watershed · loading interactive layer…"}
      </div>
    </div>
  );
}
