"use client";

import { DetailPanel } from "@/components/detail-panel";
import { ScenarioPanel } from "@/components/scenario-panel";
import { SourcesBar } from "@/components/sources-bar";
import { WatershedMap } from "@/components/watershed-map";
import { PRELOADED_SCENARIOS, type Scenario } from "@/data/scenarios";
import { WATERSHED_FEATURES, type WatershedFeature } from "@/data/watershed";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

function MapExplorerInner() {
  const searchParams = useSearchParams();
  const [scenarios, setScenarios] = useState<Scenario[]>(PRELOADED_SCENARIOS);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    PRELOADED_SCENARIOS[0].id,
  );
  const [feature, setFeature] = useState<WatershedFeature | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(true);

  const featureFromUrl = searchParams.get("feature");
  const urlFeature = featureFromUrl
    ? WATERSHED_FEATURES.find((f) => f.id === featureFromUrl) ?? null
    : null;
  const activeFeature = feature ?? urlFeature;

  const scenario = scenarios.find((s) => s.id === selectedScenarioId) ?? null;
  const compareScenario = useMemo(() => {
    if (!scenario) return null;
    return (
      scenarios.find(
        (s) =>
          s.hydrologyId === scenario.hydrologyId &&
          s.dateStart === scenario.dateStart &&
          s.id !== scenario.id,
      ) ?? null
    );
  }, [scenario, scenarios]);

  return (
    <div className="relative h-[calc(100vh-3.25rem)] w-full min-h-[480px]">
      <WatershedMap
        className="absolute inset-0 h-full w-full"
        selectedId={activeFeature?.id ?? null}
        onSelect={(f) => {
          setFeature(f);
          setMobileDrawerOpen(true);
        }}
      />

      <aside
        className={`absolute top-3 right-3 z-20 flex w-[min(100%-1.5rem,380px)] max-h-[calc(100%-1.5rem)] flex-col gap-2 overflow-hidden transition-transform md:translate-x-0 ${
          mobileDrawerOpen ? "translate-x-0" : "translate-x-[calc(100%+1rem)]"
        }`}
      >
        <button
          type="button"
          className="absolute -left-10 top-2 rounded-l-md bg-white px-2 py-1 text-xs font-medium shadow md:hidden"
          onClick={() => setMobileDrawerOpen((o) => !o)}
        >
          {mobileDrawerOpen ? "Hide" : "Panel"}
        </button>
        <div className="overflow-y-auto rounded-xl border border-slate-200/90 bg-white/95 shadow-lg backdrop-blur-sm">
          <div className="border-b border-slate-100 px-3 py-2">
            <h1 className="text-sm font-semibold text-slate-900">
              Icicle Creek scenarios
            </h1>
            <p className="text-[11px] text-slate-600">
              Click the map · compare regimes at the Historical Channel
            </p>
          </div>
          <ScenarioPanel
            scenarios={scenarios}
            selectedId={selectedScenarioId}
            onSelect={setSelectedScenarioId}
            onScenariosChange={setScenarios}
            compact
          />
          <div className="border-t border-slate-100 p-2">
            <DetailPanel
              feature={activeFeature}
              scenario={scenario}
              compareScenario={compareScenario}
              compact
            />
          </div>
          <div className="border-t border-slate-100 p-2">
            <SourcesBar hydrologyId={scenario?.hydrologyId} compact />
          </div>
        </div>
      </aside>
    </div>
  );
}

export function MapExplorer() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-3.25rem)] items-center justify-center text-sm text-slate-600">
          Loading explorer…
        </div>
      }
    >
      <MapExplorerInner />
    </Suspense>
  );
}
