"use client";

import { DetailPanel } from "@/components/detail-panel";
import { ScenarioPanel } from "@/components/scenario-panel";
import { SourcesBar } from "@/components/sources-bar";
import { WatershedMap } from "@/components/watershed-map";
import { PRELOADED_SCENARIOS, type Scenario } from "@/data/scenarios";
import { WATERSHED_FEATURES, type WatershedFeature } from "@/data/watershed";
import { useEffect, useMemo, useState } from "react";

export function MapExplorer() {
  const [scenarios, setScenarios] = useState<Scenario[]>(PRELOADED_SCENARIOS);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    PRELOADED_SCENARIOS[0].id,
  );
  const [feature, setFeature] = useState<WatershedFeature | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("feature");
    if (!id) return;
    const match = WATERSHED_FEATURES.find((f) => f.id === id);
    if (match) setFeature(match);
  }, []);

  const scenario = scenarios.find((s) => s.id === selectedScenarioId) ?? null;
  const compareScenario = useMemo(() => {
    if (!scenario) return null;
    return scenarios.find(
      (s) =>
        s.hydrologyId === scenario.hydrologyId &&
        s.dateStart === scenario.dateStart &&
        s.id !== scenario.id,
    ) ?? null;
  }, [scenario, scenarios]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">
          Icicle Creek watershed
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Map-first view of connectivity: alpine lakes, tributaries, diversions,
          gages, and the Historical Channel. Choose a scenario before downstream
          hydrographs; lake inflow uses pre-run hydrology alone.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <WatershedMap
          selectedId={feature?.id ?? null}
          onSelect={setFeature}
        />
        <ScenarioPanel
          scenarios={scenarios}
          selectedId={selectedScenarioId}
          onSelect={setSelectedScenarioId}
          onScenariosChange={setScenarios}
        />
      </div>

      <DetailPanel
        feature={feature}
        scenario={scenario}
        compareScenario={compareScenario}
      />

      <SourcesBar hydrologyId={scenario?.hydrologyId} />
    </div>
  );
}
