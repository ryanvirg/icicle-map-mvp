"use client";

import { AreaDataPanel } from "@/components/area-data-panel";
import { AssetDataPanel } from "@/components/asset-data-panel";
import { ScenarioReleaseControls } from "@/components/scenario-release-controls";
import { WatershedMap } from "@/components/watershed-map";
import {
  CREEK_REACHES,
  LAKE_FEATURES,
  type WatershedMapFeature,
} from "@/data/creeks";
import { useState } from "react";
import { MAP_OVERLAYS, type MapOverlayId } from "@/data/map-overlays";
import { forecastEngine } from "@/lib/forecast";
import type {
  ForecastRunResult,
  HydrologicCondition,
} from "@/lib/forecast/types";

type DisplayMode = "data" | "forecast";

function MapExplorerInner() {
  const [selectedFeature, setSelectedFeature] =
    useState<WatershedMapFeature | null>(null);
  const [mode, setMode] = useState<DisplayMode>("data");
  const [activeOverlay, setActiveOverlay] = useState<MapOverlayId | null>(null);
  const [releaseRates, setReleaseRates] = useState<Record<string, number>>(
    () => Object.fromEntries(LAKE_FEATURES.map((lake) => [lake.id, 0])),
  );
  const [hydrologicCondition, setHydrologicCondition] =
    useState<HydrologicCondition>("average");
  const [runState, setRunState] = useState<
    "idle" | "running" | "complete" | "error"
  >("idle");
  const [runResult, setRunResult] = useState<ForecastRunResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const combinedReleaseRate = Object.values(releaseRates).reduce(
    (total, rate) => total + rate,
    0,
  );
  const activeLakeCount = Object.values(releaseRates).filter(
    (rate) => rate > 0,
  ).length;

  function clearRunResult() {
    setRunState("idle");
    setRunResult(null);
    setRunError(null);
  }

  async function handleRun() {
    setRunState("running");
    setRunResult(null);
    setRunError(null);
    try {
      const result = await forecastEngine.run({
        condition: hydrologicCondition,
        releases: LAKE_FEATURES.map((lake) => ({
          lakeId: lake.id,
          releaseCfs: releaseRates[lake.id] ?? 0,
        })),
      });
      setRunResult(result);
      setRunState("complete");
    } catch (error) {
      setRunError(error instanceof Error ? error.message : "Unknown error");
      setRunState("error");
    }
  }

  return (
    <div className="relative h-full min-h-0 w-full">
      <WatershedMap
        className={`absolute inset-x-0 top-0 ${
          mode === "data"
            ? "bottom-[calc(clamp(180px,25dvh,220px)+24px)]"
            : "bottom-[88px]"
        }`}
        selectedFeatureId={selectedFeature?.id ?? null}
        dataOverlay={mode === "data" && activeOverlay ? MAP_OVERLAYS[activeOverlay] : null}
        onSelectFeature={setSelectedFeature}
      />

      <section
        aria-label="Watershed explorer controls"
        className={`absolute left-4 top-4 z-20 flex w-[min(22rem,calc(100%-4.5rem))] flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white/95 shadow-md backdrop-blur-sm ${
          mode === "data"
            ? "max-h-[calc(100dvh-clamp(180px,25dvh,220px)-56px)]"
            : "max-h-[calc(100dvh-120px)]"
        }`}
      >
        <div className="shrink-0 p-3">
          <h1 className="text-sm font-semibold text-slate-900">
            Icicle Creek Explorer
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {mode === "data"
              ? "Select a creek or lake to explore"
              : "Choose a flow scenario and set illustrative lake releases"}
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
            {(["data", "forecast"] as const).map((option) => {
              const selected = mode === option;
              const label = option === "data" ? "Data" : "Forecast";
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setMode(option);
                    if (option === "forecast") setActiveOverlay(null);
                  }}
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
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain border-t border-slate-200">
          {mode === "data" ? (
            <AreaDataPanel onSelectFeature={setSelectedFeature} activeOverlay={activeOverlay} onSelectOverlay={setActiveOverlay} />
          ) : (
            <ScenarioReleaseControls
              lakes={LAKE_FEATURES}
              releaseRates={releaseRates}
              condition={hydrologicCondition}
              runState={runState}
              runResult={runResult}
              runError={runError}
              onConditionChange={(condition) => {
                setHydrologicCondition(condition);
                clearRunResult();
              }}
              onReleaseRateChange={(lakeId, value) =>
                {
                  setReleaseRates((current) => ({ ...current, [lakeId]: value }));
                  clearRunResult();
                }
              }
              onReset={() => {
                setReleaseRates(
                  Object.fromEntries(LAKE_FEATURES.map((lake) => [lake.id, 0])),
                );
                clearRunResult();
              }}
              onRun={handleRun}
            />
          )}
        </div>
      </section>

      {mode === "data" ? (
        <>
          <AssetDataPanel
            feature={selectedFeature}
            onClose={() => setSelectedFeature(null)}
          />
          {activeOverlay && (() => {
            const overlay = MAP_OVERLAYS[activeOverlay];
            return <section aria-label="Map legend" className="pointer-events-none absolute bottom-[calc(clamp(180px,25dvh,220px)+36px)] right-4 z-20 w-52 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-md backdrop-blur-sm">
              <div className="flex items-start justify-between gap-2">
                <div><h2 className="text-xs font-semibold text-slate-800">{overlay.label}</h2><p className="mt-0.5 text-[10px] text-slate-500">{overlay.source === "climate" ? "ERA5 grid · 0.25° cells" : "EPA WSIO · HUC12 subwatersheds"}</p></div>
                <button type="button" className="pointer-events-auto -mt-1 -mr-1 rounded px-1 text-sm text-slate-500 hover:bg-slate-100" aria-label="Clear map overlay" onClick={() => setActiveOverlay(null)}>×</button>
              </div>
              <div className="mt-2 h-2 rounded" style={{ background: `linear-gradient(90deg, ${overlay.colors.join(", ")})` }} />
              <div className="mt-1 flex justify-between text-[9px] tabular-nums text-slate-600"><span>{overlay.min} {overlay.unit}</span><span>{overlay.max} {overlay.unit}</span></div>
              <p className="mt-2 text-[9px] leading-snug text-slate-500">{overlay.source === "climate" ? "Historical grid-cell normals clipped to the watershed." : "Area-level source estimates; polygons show subwatershed summaries."}</p>
            </section>;
          })()}
        </>
      ) : (
        <>
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
              Input settings only; the template adapter does not calculate downstream impacts.
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
