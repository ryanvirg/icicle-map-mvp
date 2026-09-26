import type { DailySeries } from "@/data/hydrology";
import { getHistoricalChannelBaseFlow } from "@/data/hydrology";
import type { OperatingRegime } from "@/data/scenarios";

export type RoutedChannelFlow = {
  center: DailySeries;
  lower: DailySeries;
  upper: DailySeries;
  structure2LossNote: string;
};

const STRUCTURE2_LOSS_FRACTION = 0.22;
const STRUCTURE2_UNCERTAINTY = 0.18;

function addSeries(a: DailySeries, b: DailySeries): DailySeries {
  const map = new Map(b.map((p) => [p.date, p.value]));
  return a.map((p) => ({
    date: p.date,
    value: p.value + (map.get(p.date) ?? 0),
  }));
}

function scaleSeries(series: DailySeries, factor: number): DailySeries {
  return series.map((p) => ({ date: p.date, value: p.value * factor }));
}

function lagSeries(series: DailySeries, lagDays: number): DailySeries {
  if (lagDays <= 0) return series;
  const pad = series.slice(0, lagDays).map((p) => ({ ...p, value: p.value * 0.15 }));
  const shifted = series.slice(0, series.length - lagDays);
  return [...pad, ...shifted];
}

export function routeHistoricalChannelFlow(
  hydrologyId: string,
  start: string,
  end: string,
  regime: OperatingRegime,
): RoutedChannelFlow {
  const base = getHistoricalChannelBaseFlow(hydrologyId, start, end);
  const releasePulse = base.map((p) => ({
    date: p.date,
    value: regime.summerReleaseCfs * regime.releaseIntensity * 0.35,
  }));
  const laggedRelease = lagSeries(releasePulse, regime.releaseLagDays);
  const center = addSeries(base, laggedRelease);

  const lossBand = STRUCTURE2_LOSS_FRACTION + STRUCTURE2_UNCERTAINTY;
  const lower = scaleSeries(center, 1 - lossBand);
  const upper = scaleSeries(center, 1 + STRUCTURE2_UNCERTAINTY * 0.5);

  return {
    center,
    lower,
    upper,
    structure2LossNote:
      "Structure 2 travel-time and conveyance loss are not measured (2025 QAPP). Routed flow is shown as a band, not a single line.",
  };
}

/** Illustrative acre-feet released to the channel Jul 1 – Sep 30 (1 cfs ≈ 1.9835 ac-ft/day). */
export function summerReleaseVolumeAcFt(
  regime: OperatingRegime,
  start: string,
  end: string,
): number {
  const year = start.slice(0, 4);
  const windowStart = new Date(`${year}-07-01T12:00:00Z`).getTime();
  const windowEnd = new Date(`${year}-09-30T12:00:00Z`).getTime();
  const startMs = new Date(start + "T12:00:00Z").getTime();
  const endMs = new Date(end + "T12:00:00Z").getTime();
  const from = Math.max(startMs, windowStart);
  const to = Math.min(endMs, windowEnd);
  let days = 0;
  for (let t = from; t <= to; t += 86400000) days += 1;
  const cfs = regime.summerReleaseCfs * regime.releaseIntensity;
  return cfs * 1.9835 * days;
}
