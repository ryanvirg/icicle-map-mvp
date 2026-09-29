"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { WatershedMapFeature } from "@/data/creeks";
import dynamic from "next/dynamic";
import { useState } from "react";

const WatershedMapNative = dynamic(
  () =>
    import("@/components/watershed-map-native").then(
      (module) => module.WatershedMapNative,
    ),
  { ssr: false },
);

type Props = {
  selectedFeatureId: string | null;
  showFeatures: boolean;
  onSelectFeature: (feature: WatershedMapFeature) => void;
  className?: string;
};

export function WatershedMap({
  selectedFeatureId,
  showFeatures,
  onSelectFeature,
  className,
}: Props) {
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  return (
    <div
      className={`relative h-full min-h-[300px] w-full overflow-hidden bg-slate-100 ${className ?? ""}`}
      data-testid="watershed-map-container"
    >
      {!mapError && (
        <WatershedMapNative
          selectedFeatureId={selectedFeatureId}
          showFeatures={showFeatures}
          onSelectFeature={onSelectFeature}
          onReady={() => setMapReady(true)}
          onFailed={setMapError}
        />
      )}
      {!mapReady && !mapError && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center text-xs text-slate-600">
          <span className="rounded bg-white/90 px-2 py-1 shadow">
            Loading map…
          </span>
        </div>
      )}
      {mapError && (
        <p
          role="alert"
          className="absolute left-4 top-4 z-10 max-w-[min(32rem,calc(100%-2rem))] rounded-lg border border-red-200 bg-white/95 px-3 py-2 text-sm text-red-800 shadow"
        >
          The interactive map could not be loaded: {mapError}
        </p>
      )}
    </div>
  );
}
