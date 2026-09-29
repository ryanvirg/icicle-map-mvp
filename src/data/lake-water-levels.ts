import type { WatershedMapFeature } from "@/data/creeks";

export type MonthlyWaterLevel = {
  date: string;
  value: number;
};

const MONTHS_TO_SHOW = 72;

function stableFeatureSeed(feature: WatershedMapFeature) {
  return [...`${feature.id}:${feature.name}`].reduce(
    (seed, character) => (seed * 31 + character.charCodeAt(0)) % 997,
    7,
  );
}

/**
 * Supplies clearly illustrative monthly levels until measured lake records are
 * connected. Values are demo feet relative to an arbitrary baseline.
 */
export function getIllustrativeLakeLevels(
  feature: WatershedMapFeature,
): MonthlyWaterLevel[] {
  const seed = stableFeatureSeed(feature);
  const baseline = 8 + (seed % 110) / 10;
  const seasonalRange = 2 + (seed % 50) / 10;

  return Array.from({ length: MONTHS_TO_SHOW }, (_, index) => {
    const year = 2020 + Math.floor(index / 12);
    const monthIndex = index % 12;
    const seasonal =
      Math.sin(((monthIndex - 2) / 12) * 2 * Math.PI) * seasonalRange;
    const annualVariation = Math.sin((year - 2020) * 1.7 + seed) * 0.35;

    return {
      date: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
      value: Number((baseline + seasonal + annualVariation).toFixed(1)),
    };
  });
}
