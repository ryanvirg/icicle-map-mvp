"use client";

import { AssetDataPanel } from "@/components/asset-data-panel";
import { ScenarioReleaseControls } from "@/components/scenario-release-controls";
import { WatershedMap } from "@/components/watershed-map";
import {
  CREEK_REACHES,
  LAKE_FEATURES,
  type WatershedMapFeature,
} from "@/data/creeks";
import { Waves } from "lucide-react";
import { useState } from "react";

type DisplayMode = "data" | "scenario";

function MapExplorerInner() {
  const [selectedFeature, setSelectedFeature] =
    useState<WatershedMapFeature | null>(null);
  const [showFeatures, setShowFeatures] = useState(true);
  const [mode, setMode] = useState<DisplayMode>("data");
  const [releaseRates, setReleaseRates] = useState<Record<string, number>>(
    () => Object.fromEntries(LAKE_FEATURES.map((lake) => [lake.id, 0])),
  );
  const combinedReleaseRate = Object.values(releaseRates).reduce(
    (total, rate) => total + rate,
    0,
  );
  const activeLakeCount = Object.values(releaseRates).filter(
    (rate) => rate > 0,
  ).length;

  return (
    <div className="relative h-full min-h-0 w-full">
      <WatershedMap
        className={`absolute inset-x-0 top-0 ${
          mode === "data"
            ? "bottom-[calc(clamp(180px,25dvh,220px)+24px)]"
            : "bottom-[88px]"
        }`}
        selectedFeatureId={selectedFeature?.id ?? null}
        showFeatures={showFeatures}
        onSelectFeature={setSelectedFeature}
      />

      <section className="absolute left-4 top-4 z-20 rounded-xl border border-slate-200/90 bg-white/95 p-3 shadow-md backdrop-blur-sm">
        <h1 className="text-sm font-semibold text-slate-900">
          Icicle Creek Explorer
        </h1>
        <p className="mt-0.5 text-xs text-slate-500">
          {mode === "data"
            ? "Select a creek or lake to explore"
            : "Adjust illustrative lake release settings"}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-[3px] w-4 rounded-full bg-[#176b7c]"
              aria-hidden
            />
            Creeks <span className="text-slate-400">{CREEK_REACHES.length}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-3 rounded-sm border border-[#428a9b] bg-[#a8d6df]"
              aria-hidden
            />
            Lakes <span className="text-slate-400">{LAKE_FEATURES.length}</span>
          </span>
        </div>
        <div
          className="mt-3 inline-flex rounded-lg bg-slate-100 p-1"
          role="group"
          aria-label="Display mode"
        >
          {(["data", "scenario"] as const).map((option) => {
            const selected = mode === option;
            const label = option === "data" ? "Data" : "Scenario";
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                onClick={() => setMode(option)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  selected
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-pressed={showFeatures}
          onClick={() => setShowFeatures((visible) => !visible)}
          className={`mt-2 flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium ${
            showFeatures
              ? "border-slate-200 bg-slate-50 text-slate-800"
              : "border-slate-200 bg-white text-slate-500"
          }`}
        >
          <Waves size={14} aria-hidden />
          {showFeatures ? "Hide" : "Show"} map features
        </button>
      </section>

      {mode === "data" ? (
        <AssetDataPanel
          feature={selectedFeature}
          onClose={() => setSelectedFeature(null)}
        />
      ) : (
        <>
          <ScenarioReleaseControls
            lakes={LAKE_FEATURES}
            releaseRates={releaseRates}
            onReleaseRateChange={(lakeId, value) =>
              setReleaseRates((current) => ({ ...current, [lakeId]: value }))
            }
            onReset={() =>
              setReleaseRates(
                Object.fromEntries(LAKE_FEATURES.map((lake) => [lake.id, 0])),
              )
            }
          />
          <section
            aria-label="Scenario release summary"
            aria-live="polite"
            className="absolute bottom-3 left-1/2 z-20 w-[min(30rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-[#176b7c]/75 bg-white/55 px-4 py-2.5 shadow-[0_12px_36px_rgba(15,23,42,0.16)] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Scenario release settings
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {combinedReleaseRate} cfs combined · {activeLakeCount}{" "}
                  {activeLakeCount === 1 ? "lake" : "lakes"} adjusted
                </p>
              </div>
              <span className="rounded-full bg-[#176b7c]/10 px-2.5 py-1 text-[10px] font-semibold text-[#176b7c]">
                Illustrative
              </span>
            </div>
            <p className="mt-1 text-[10px] leading-snug text-slate-600">
              Sum of slider settings only; downstream impacts are not modeled.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

export function MapExplorer() {
  return <MapExplorerInner />;
}
