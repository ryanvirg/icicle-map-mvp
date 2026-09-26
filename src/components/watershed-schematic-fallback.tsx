"use client";

import { CREEK_LINE, WATERSHED_FEATURES, type WatershedFeature } from "@/data/watershed";

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
  reason?: string | null;
  embedded?: boolean;
};

/** SVG connectivity diagram when WebGL / MapLibre is unavailable. */
export function WatershedSchematicFallback({
  selectedId,
  onSelect,
  reason,
  embedded = false,
}: Props) {
  const lngs = CREEK_LINE.map((c) => c[0]);
  const lats = CREEK_LINE.map((c) => c[1]);
  const minLng = Math.min(...lngs) - 0.02;
  const maxLng = Math.max(...lngs) + 0.02;
  const minLat = Math.min(...lats) - 0.02;
  const maxLat = Math.max(...lats) + 0.02;

  const project = (lng: number, lat: number) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * 1000;
    const y = (1 - (lat - minLat) / (maxLat - minLat)) * 360;
    return { x, y };
  };

  const creekPath = CREEK_LINE
    .map((c, i) => {
      const { x, y } = project(c[0], c[1]);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <div
      className={
        embedded
          ? "absolute inset-0 h-full w-full bg-slate-100"
          : "relative w-full overflow-hidden rounded-lg border border-amber-200 bg-slate-100 shadow-inner"
      }
      style={embedded ? undefined : { height: 420, minHeight: 420 }}
      data-testid="watershed-schematic-fallback"
      data-map-ready="true"
      data-vectors-painted="true"
    >
      {reason && !embedded && (
        <p className="absolute left-2 top-2 z-10 max-w-[90%] rounded bg-amber-50 px-2 py-1 text-[10px] text-amber-900">
          {reason}
        </p>
      )}
      <svg
        viewBox="0 0 1000 360"
        className="h-full w-full"
        role="img"
        aria-label="Icicle Creek watershed schematic"
      >
        <rect width="1000" height="360" fill="#e2e8f0" />
        <path
          d={creekPath}
          fill="none"
          stroke="#1e3a5f"
          strokeWidth={10}
          strokeOpacity={0.25}
        />
        <path d={creekPath} fill="none" stroke="#1d4ed8" strokeWidth={5} />
        {WATERSHED_FEATURES.filter(
          (f) => f.kind === "lake" || f.kind === "tributary",
        ).map((f) => {
          const creekMid = project(
            CREEK_LINE[Math.floor(CREEK_LINE.length / 2)][0],
            CREEK_LINE[Math.floor(CREEK_LINE.length / 2)][1],
          );
          const { x, y } = project(f.coordinates[0], f.coordinates[1]);
          return (
            <line
              key={`${f.id}-conn`}
              x1={x}
              y1={y}
              x2={creekMid.x}
              y2={creekMid.y}
              stroke="#64748b"
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.6}
            />
          );
        })}
        {WATERSHED_FEATURES.map((f) => {
          const { x, y } = project(f.coordinates[0], f.coordinates[1]);
          const selected = f.id === selectedId;
          return (
            <g key={f.id}>
              <circle
                cx={x}
                cy={y}
                r={selected ? 14 : 10}
                fill={kindColor[f.kind]}
                stroke="#fff"
                strokeWidth={2}
                className="cursor-pointer"
                onClick={() => onSelect(f)}
              />
              <title>{f.name}</title>
            </g>
          );
        })}
      </svg>
      {!embedded && (
        <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-[10px] text-slate-600 shadow">
          Schematic watershed (offline fallback)
        </div>
      )}
    </div>
  );
}
