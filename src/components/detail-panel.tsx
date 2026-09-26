"use client";

import { FlowChart } from "@/components/flow-chart";
import { FLOW_TARGETS } from "@/data/flow-targets";
import { getLakeInflowSeries, HYDROLOGY_LIBRARY } from "@/data/hydrology";
import type { Scenario } from "@/data/scenarios";
import { PRELOADED_SCENARIOS } from "@/data/scenarios";
import {
  routeHistoricalChannelFlow,
  summerReleaseVolumeAcFt,
} from "@/lib/routing";
import { formatAcFt, formatCfs } from "@/lib/utils";
import type { WatershedFeature } from "@/data/watershed";
import { useEffect, useMemo, useState } from "react";

type UsgsPayload = {
  source: string;
  dataAsOf: string;
  series: { date: string; value: number }[];
  fallbackReason?: string;
};

type Props = {
  feature: WatershedFeature | null;
  scenario: Scenario | null;
  compareScenario: Scenario | null;
};

export function DetailPanel({ feature, scenario, compareScenario }: Props) {
  const [usgs, setUsgs] = useState<UsgsPayload | null>(null);
  const [usgsState, setUsgsState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");

  useEffect(() => {
    if (feature?.id !== "usgs-12458000") return;
    setUsgsState("loading");
    fetch("/api/usgs/12458000")
      .then((r) => r.json())
      .then((data) => {
        setUsgs(data);
        setUsgsState("ready");
      })
      .catch(() => setUsgsState("error"));
  }, [feature?.id]);

  const hydroMeta = scenario
    ? HYDROLOGY_LIBRARY.find((h) => h.id === scenario.hydrologyId)
    : null;

  const routed = useMemo(() => {
    if (!scenario || feature?.id !== "historical-channel") return null;
    return routeHistoricalChannelFlow(
      scenario.hydrologyId,
      scenario.dateStart,
      scenario.dateEnd,
      scenario.regime,
    );
  }, [scenario, feature?.id]);

  const lakeInflow = useMemo(() => {
    if (!feature || feature.kind !== "lake") return null;
    const hydroId =
      scenario?.hydrologyId ?? PRELOADED_SCENARIOS[0].hydrologyId;
    const start = scenario?.dateStart ?? PRELOADED_SCENARIOS[0].dateStart;
    const end = scenario?.dateEnd ?? PRELOADED_SCENARIOS[0].dateEnd;
    return getLakeInflowSeries(hydroId, feature.id, start, end);
  }, [feature, scenario]);

  const volumes = useMemo(() => {
    if (!scenario || !compareScenario) return null;
    return {
      a: summerReleaseVolumeAcFt(
        scenario.regime,
        scenario.dateStart,
        scenario.dateEnd,
      ),
      b: summerReleaseVolumeAcFt(
        compareScenario.regime,
        compareScenario.dateStart,
        compareScenario.dateEnd,
      ),
    };
  }, [scenario, compareScenario]);

  if (!feature) {
    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
        <p className="font-medium text-slate-800">Select a map feature</p>
        <p className="mt-1 max-w-md">
          Hover or click lakes, tributaries, diversions, gages, or the
          Historical Channel to see which series are available.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">{feature.name}</h2>
        <p className="mt-1 text-sm text-slate-600">{feature.description}</p>
        <p className="mt-2 text-xs text-slate-500">
          Series at this location: {feature.seriesAvailable.join(", ")}
        </p>
      </div>

      {feature.kind === "lake" && (
        <FlowChart
          title={`${feature.name} — inflow (pre-run hydrology)`}
          caption={
            scenario
              ? `Hydrology: ${hydroMeta?.label}. No operating regime required for inflow.`
              : "Using default hydrology library id until you select a scenario."
          }
          single={lakeInflow ?? undefined}
          emptyMessage="Lake inflow not available for this id."
        />
      )}

      {feature.id === "historical-channel" && !scenario && (
        <FlowChart
          title="Historical Channel — scenario flow"
          emptyMessage="Select a scenario to plot routed flow at the Historical Channel (60 / 100 cfs targets)."
          showTargets
        />
      )}

      {feature.id === "historical-channel" && scenario && routed && (
        <>
          <FlowChart
            title="Historical Channel — routed flow vs targets"
            caption={`${routed.structure2LossNote} Regime: ${scenario.regime.label}.`}
            center={routed.center}
            lower={routed.lower}
            upper={routed.upper}
            showTargets
          />
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            <p className="font-medium text-slate-900">
              Guiding principle reference lines
            </p>
            <ul className="mt-1 list-disc pl-4">
              {FLOW_TARGETS.map((t) => (
                <li key={t.id}>
                  {t.label}: {formatCfs(t.value)}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {feature.id === "structure-2" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-medium">Routed downstream flow</p>
          <p className="mt-1">
            {scenario
              ? "Scenario routing is shown as an uncertainty band at Structure 2 because conveyance loss is unknown."
              : "Select a scenario to evaluate routed flow. Observed telemetry may still load from Phase 1 fixtures."}
          </p>
          {scenario && routed && (
            <FlowChart
              title="Structure 2 — routed band (illustrative)"
              caption={routed.structure2LossNote}
              center={routed.center}
              lower={routed.lower}
              upper={routed.upper}
            />
          )}
        </div>
      )}

      {feature.id === "usgs-12458000" && (
        <FlowChart
          title="USGS 12458000 — observed flow"
          caption={
            usgs
              ? `Source: ${usgs.source === "usgs_live" ? "USGS live" : "labeled fixture"}. Data as of ${usgs.dataAsOf}. ${usgs.fallbackReason ?? ""}`
              : undefined
          }
          single={usgs?.series}
          loading={usgsState === "loading"}
          emptyMessage={
            usgsState === "error"
              ? "Could not load gage data."
              : "No points returned."
          }
        />
      )}

      {scenario && compareScenario && feature.id === "historical-channel" && volumes && (
        <div className="rounded-lg border border-[#1e3a5f]/20 bg-[#1e3a5f]/5 p-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Summer release volume (Jul–Sep window)
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            Same hydrology and dates; regimes differ only in operating choices.
          </p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded bg-white p-2 shadow-sm">
              <dt className="text-xs text-slate-500">{scenario.name}</dt>
              <dd className="text-lg font-semibold text-slate-900">
                {formatAcFt(volumes.a)}
              </dd>
            </div>
            <div className="rounded bg-white p-2 shadow-sm">
              <dt className="text-xs text-slate-500">{compareScenario.name}</dt>
              <dd className="text-lg font-semibold text-slate-900">
                {formatAcFt(volumes.b)}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
