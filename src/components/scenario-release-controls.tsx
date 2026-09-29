"use client";

import type { WatershedMapFeature } from "@/data/creeks";

type Props = {
  lakes: WatershedMapFeature[];
  releaseRates: Record<string, number>;
  onReleaseRateChange: (lakeId: string, value: number) => void;
  onReset: () => void;
};

function getLakeLabels(lakes: WatershedMapFeature[]) {
  const seen = new Map<string, number>();
  const totals = new Map<string, number>();
  for (const lake of lakes) {
    totals.set(lake.name, (totals.get(lake.name) ?? 0) + 1);
  }

  return lakes.map((lake) => {
    const index = (seen.get(lake.name) ?? 0) + 1;
    seen.set(lake.name, index);
    const hasDuplicateName = (totals.get(lake.name) ?? 0) > 1;
    return hasDuplicateName ? `${lake.name} ${index}` : lake.name;
  });
}

export function ScenarioReleaseControls({
  lakes,
  releaseRates,
  onReleaseRateChange,
  onReset,
}: Props) {
  const lakeLabels = getLakeLabels(lakes);

  return (
    <section
      aria-label="Illustrative lake release scenario controls"
      className="absolute bottom-3 left-4 z-20 h-[clamp(180px,25dvh,220px)] w-[min(30rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-[#176b7c]/65 bg-white/60 p-3 shadow-[0_12px_36px_rgba(15,23,42,0.18)] backdrop-blur-xl"
    >
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold text-slate-900">
            Lake release settings
          </h2>
          <p className="text-[10px] leading-tight text-slate-600">
            Illustrative rates · 0–50 cfs each
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="shrink-0 rounded-md border border-slate-300/80 bg-white/60 px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-white/90"
        >
          Reset
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {lakes.map((lake, index) => {
          const value = releaseRates[lake.id] ?? 0;
          const label = lakeLabels[index];
          return (
            <div key={lake.id} className="min-w-0">
              <label
                htmlFor={`release-${lake.id}`}
                className="mb-0 flex items-center justify-between gap-2 text-[10px] leading-tight"
              >
                <span className="truncate font-medium text-slate-800" title={label}>
                  {label}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-[#176b7c]">
                  {value}
                </span>
              </label>
              <input
                id={`release-${lake.id}`}
                type="range"
                min={0}
                max={50}
                step={1}
                value={value}
                onChange={(event) =>
                  onReleaseRateChange(lake.id, Number(event.currentTarget.value))
                }
                aria-label={`${label} release rate in cubic feet per second`}
                className="block h-3 w-full cursor-pointer accent-[#176b7c]"
              />
            </div>
          );
        })}
      </div>
      <p className="mt-1 border-t border-slate-300/50 pt-1 text-[9px] leading-tight text-slate-600">
        Demo only: limits are unverified; downstream effects are not modeled.
      </p>
    </section>
  );
}
