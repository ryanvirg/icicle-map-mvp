import type { WatershedMapFeature } from "@/data/creeks";
import type { DailySeries } from "@/data/hydrology";

/** Stable, visibly synthetic monthly flow series for reaches without a verified gauge link. */
export function getIllustrativeStreamflow(
  feature: WatershedMapFeature,
  years = 5,
): DailySeries {
  const seed = Array.from(feature.id).reduce(
    (sum, character) => sum + character.charCodeAt(0),
    0,
  );
  const base = feature.name.toLowerCase() === "icicle creek" ? 95 : 22 + (seed % 55);
  const series: DailySeries = [];
  const endYear = 2025;

  for (let year = endYear - years + 1; year <= endYear; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const seasonal = Math.cos(((month - 5) / 12) * Math.PI * 2);
      const yearEffect = 1 + 0.16 * Math.sin((year - 2010) * 0.63 + seed);
      const monthVariation = 1 + 0.1 * Math.sin(month * 2.2 + seed);
      series.push({
        date: `${year}-${String(month).padStart(2, "0")}-01`,
        value:
          Math.round(
            Math.max(1, base * (1 + 0.9 * seasonal) * yearEffect * monthVariation) * 10,
          ) / 10,
      });
    }
  }

  return series;
}
