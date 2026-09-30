"use client";

import type { WatershedMapFeature } from "@/data/creeks";
import type {
  ForecastRunResult,
  HydrologicCondition,
} from "@/lib/forecast/types";
import { Button } from "@/components/ui/button";

const HYDROLOGIC_CONDITIONS: {
  id: HydrologicCondition;
  label: string;
  description: string;
}[] = [
  { id: "dry", label: "Dry", description: "Lower-flow example" },
  { id: "average", label: "Average", description: "Mid-flow example" },
  { id: "wet", label: "Wet", description: "Higher-flow example" },
];

type Props = {
  lakes: WatershedMapFeature[];
  releaseRates: Record<string, number>;
  condition: HydrologicCondition;
  runState: "idle" | "running" | "complete" | "error";
  runResult: ForecastRunResult | null;
  runError: string | null;
  onConditionChange: (condition: HydrologicCondition) => void;
  onReleaseRateChange: (lakeId: string, value: number) => void;
  onReset: () => void;
  onRun: () => void;
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
  condition,
  runState,
  runResult,
  runError,
  onConditionChange,
  onReleaseRateChange,
  onReset,
  onRun,
}: Props) {
  const lakeLabels = getLakeLabels(lakes);

  return (
    <section
      aria-label="Illustrative lake release scenario controls"
      className="p-3"
    >
      <div className="mb-3">
        <h2 className="text-xs font-semibold text-slate-900">
          Watershed conditions
        </h2>
        <p className="mt-0.5 text-[10px] leading-tight text-slate-600">
          Choose an illustrative flow class for the template run.
        </p>
        <div className="mt-2 grid grid-cols-3 gap-1.5" role="group" aria-label="Watershed flow scenario">
          {HYDROLOGIC_CONDITIONS.map((option) => {
            const selected = condition === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onConditionChange(option.id)}
                className={`rounded-md border px-2 py-1.5 text-left transition-colors ${
                  selected
                    ? "border-[#176b7c] bg-[#176b7c]/10 text-[#145866] ring-1 ring-[#176b7c]/20"
                    : "border-slate-200 bg-white/70 text-slate-700 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <span className="block text-[11px] font-semibold">{option.label}</span>
                <span className="block text-[9px] leading-tight text-slate-500">{option.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-1.5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold text-slate-900">
            Lake release settings
          </h2>
          <p className="text-[10px] leading-tight text-slate-600">
            Set example releases in cfs for each mapped lake.
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
      <div className="grid grid-cols-1 gap-3">
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
                  {value} cfs
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
                className="block h-6 w-full cursor-pointer accent-[#176b7c]"
              />
            </div>
          );
        })}
      </div>
      <div className="sticky bottom-0 -mx-3 mt-2 border-t border-slate-200 bg-white/95 px-3 pb-1 pt-2 backdrop-blur-sm">
        <Button
          type="button"
          onClick={onRun}
          disabled={runState === "running"}
          className="w-full bg-[#176b7c] hover:bg-[#145866]"
        >
          {runState === "running" ? "Preparing run…" : "Run scenario"}
        </Button>
        <p className="mt-1.5 text-[9px] leading-tight text-slate-500">
          Dry/Average/Wet use P25/P50/P75 of 8 bundled gage-fixture points for this demo; they are not annual percentiles. DHSVM and downstream routing are not connected, and the 0–50 cfs slider range is unverified.
        </p>
        {runState === "complete" && runResult && (
          <p role="status" className="mt-2 rounded-md bg-emerald-50 px-2 py-1.5 text-[10px] leading-snug text-emerald-900">
            Template input accepted: {runResult.condition} / sample P{runResult.reference.selectedSamplePercentile} = {runResult.reference.selectedSampleFlowCfs.toFixed(1)} cfs from gage {runResult.reference.site} fixture ({runResult.reference.dataAsOf}); {runResult.releaseSettingCount} release settings total {runResult.totalReleaseCfs} cfs. No forecast hydrograph was calculated.
          </p>
        )}
        {runState === "error" && runError && (
          <p role="alert" className="mt-2 rounded-md bg-red-50 px-2 py-1.5 text-[10px] text-red-800">
            Run could not be prepared: {runError}
          </p>
        )}
      </div>
    </section>
  );
}
