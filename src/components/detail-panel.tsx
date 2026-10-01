"use client";

import { FlowChart } from "@/components/flow-chart";
import { HistoricalChannelChart } from "@/components/historical-channel-chart";
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
  compact?: boolean;
};

export function DetailPanel({
  feature,
  scenario,
  compareScenario,
  compact,
}: Props) {
  const [usgs, setUsgs] = useState<UsgsPayload | null>(null);
  const [usgsState, setUsgsState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");

  useEffect(() => {
    if (feature?.id !== "usgs-12458000") return;
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

  const routedPrimary = useMemo(() => {
    if (!scenario || feature?.id !== "historical-channel") return null;
    return routeHistoricalChannelFlow(
      scenario.hydrologyId,
      scenario.dateStart,
      scenario.dateEnd,
      scenario.regime,
    );
  }, [scenario, feature?.id]);

  const routedCompare = useMemo(() => {
    if (!compareScenario || feature?.id !== "historical-channel") return null;
    return routeHistoricalChannelFlow(
      compareScenario.hydrologyId,
      compareScenario.dateStart,
      compareScenario.dateEnd,
      compareScenario.regime,
    );
  }, [compareScenario, feature?.id]);

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

  const pad = compact ? "p-0" : "p-4";

  if (!feature) {
    return (
      <div
        className={`flex min-h-[120px] flex-col items-center justify-center text-center text-xs text-slate-600 ${pad}`}
      >
        <p className="font-medium text-slate-800">Select a map feature</p>
        <p className="mt-1 max-w-xs">
          Lakes, tributaries, diversions, gages, or the Historical Channel.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${pad}`}>
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{feature.name}</h2>
        <p className="mt-0.5 text-[11px] leading-snug text-slate-600">
          {feature.description}
        </p>
      </div>

      {feature.kind === "lake" && (
        <FlowChart
          title={`${feature.name} — inflow`}
          caption={
            scenario
              ? `Pre-run hydrology: ${hydroMeta?.label}`
              : "Default hydrology library until a scenario is selected."
          }
          single={lakeInflow ?? undefined}
          emptyMessage="Lake inflow not available for this id."
        />
      )}

      {feature.id === "historical-channel" && !scenario && (
        <p className="text-xs text-slate-600">
          Select a scenario to plot routed flow with 60 / 100 / 20 cfs and 250
          cfs reference lines.
        </p>
      )}

      {feature.id === "historical-channel" && scenario && routedPrimary && (
        <>
          <HistoricalChannelChart
            primary={routedPrimary}
            primaryLabel={scenario.name}
            compare={routedCompare ?? undefined}
            compareLabel={compareScenario?.name}
            caption={`${routedPrimary.structure2LossNote} Illustrative routing only.`}
          />
          <ul className="text-[10px] text-slate-600">
            {FLOW_TARGETS.map((t) => (
              <li key={t.id}>
                {t.label}: {formatCfs(t.value)}
              </li>
            ))}
          </ul>
        </>
      )}

      {feature.id === "structure-2" && scenario && routedPrimary && (
        <FlowChart
          title="Structure 2 — routed band"
          caption={routedPrimary.structure2LossNote}
          center={routedPrimary.center}
          lower={routedPrimary.lower}
          upper={routedPrimary.upper}
        />
      )}

      {feature.id === "usgs-12458000" && (
        <FlowChart
          title="USGS 12458000"
          caption={
            usgs
              ? `${usgs.source === "usgs_live" ? "USGS live" : "Fixture"} · ${usgs.dataAsOf}`
              : undefined
          }
          single={usgs?.series}
          loading={
            feature.id === "usgs-12458000" &&
            (usgsState === "idle" || usgsState === "loading")
          }
          emptyMessage="No gage data."
        />
      )}

      {scenario &&
        compareScenario &&
        feature.id === "historical-channel" &&
        volumes && (
          <div className="rounded-md bg-slate-50 p-2 text-xs">
            <p className="font-semibold text-slate-900">
              Summer release volume (illustrative)
            </p>
            <p className="text-[10px] text-slate-500">
              Jul–Sep window · same hydrology & dates · not measured release
              accounting. Order-of-magnitude vs 2018 active storage (1,150–2,130
              ac-ft per IPID lake; 12,730 Snow Lakes).
            </p>
            <dl className="mt-2 grid gap-2">
              <div>
                <dt className="text-[10px] text-slate-500">{scenario.name}</dt>
                <dd className="font-semibold text-slate-900">
                  {formatAcFt(volumes.a)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] text-slate-500">
                  {compareScenario.name}
                </dt>
                <dd className="font-semibold text-slate-900">
                  {formatAcFt(volumes.b)}
                </dd>
              </div>
            </dl>
          </div>
        )}
    </div>
  );
}
