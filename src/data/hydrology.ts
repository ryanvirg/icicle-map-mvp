export type DailySeries = { date: string; value: number }[];

export type HydrologyPackage = {
  id: string;
  label: string;
  description: string;
  climateNote: string;
  dataAsOf: string;
};

export const HYDROLOGY_LIBRARY: HydrologyPackage[] = [
  {
    id: "dhsvm-cal-2015-2024-avg",
    label: "DHSVM calibration ensemble — average water years",
    description:
      "Pre-run watershed output (illustrative). Historic wet/average/dry library; not executed in this app.",
    climateNote: "Representative post-calibration period; relative climate change stays on the modeling track.",
    dataAsOf: "2026-09-01",
  },
];

function dayIndex(date: string, start: string): number {
  const ms = 24 * 60 * 60 * 1000;
  return Math.round(
    (new Date(date + "T12:00:00Z").getTime() -
      new Date(start + "T12:00:00Z").getTime()) /
      ms,
  );
}

function generateInflow(
  start: string,
  end: string,
  base: number,
  peak: number,
): DailySeries {
  const out: DailySeries = [];
  const startMs = new Date(start + "T12:00:00Z");
  const endMs = new Date(end + "T12:00:00Z");
  for (let t = startMs.getTime(); t <= endMs.getTime(); t += 86400000) {
    const d = new Date(t);
    const iso = d.toISOString().slice(0, 10);
    const i = dayIndex(iso, start);
    const seasonal =
      base +
      peak * Math.sin((Math.PI * i) / 120) +
      8 * Math.sin((Math.PI * i) / 14);
    out.push({ date: iso, value: Math.max(5, seasonal) });
  }
  return out;
}

const LAKE_BASE: Record<string, { base: number; peak: number }> = {
  colchuck: { base: 18, peak: 45 },
  square: { base: 12, peak: 30 },
  klonaqua: { base: 10, peak: 28 },
  eightmile: { base: 8, peak: 22 },
  "snow-lakes": { base: 35, peak: 90 },
};

export function getLakeInflowSeries(
  hydrologyId: string,
  lakeId: string,
  start: string,
  end: string,
): DailySeries {
  if (!HYDROLOGY_LIBRARY.some((h) => h.id === hydrologyId)) {
    return [];
  }
  const params = LAKE_BASE[lakeId] ?? { base: 10, peak: 20 };
  return generateInflow(start, end, params.base, params.peak);
}

export function getHistoricalChannelBaseFlow(
  hydrologyId: string,
  start: string,
  end: string,
): DailySeries {
  if (!HYDROLOGY_LIBRARY.some((h) => h.id === hydrologyId)) {
    return [];
  }
  return generateInflow(start, end, 55, 35);
}
