import gaugeFixture from "../../data/fixtures/usgs-12458000.json";
import type {
  ForecastEngine,
  ForecastRunInput,
  ForecastRunResult,
} from "./types";

const SAMPLE_PERCENTILE_BY_CONDITION = {
  dry: 25,
  average: 50,
  wet: 75,
} as const;

function sampleQuantile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const position = (percentile / 100) * (sorted.length - 1);
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const fraction = position - lowerIndex;
  return sorted[lowerIndex] + (sorted[upperIndex] - sorted[lowerIndex]) * fraction;
}

/**
 * Demo adapter for the future DHSVM integration.
 * It validates and packages user choices, but deliberately does not simulate
 * watershed or release impacts.
 */
export const templateForecastEngine: ForecastEngine = {
  async run(input: ForecastRunInput): Promise<ForecastRunResult> {
    if (!input.releases.every((item) => Number.isFinite(item.releaseCfs) && item.releaseCfs >= 0)) {
      throw new Error("Release settings must be non-negative flow rates.");
    }

    const referenceValues = gaugeFixture.series.map((point) => point.value);
    const samplePercentile = SAMPLE_PERCENTILE_BY_CONDITION[input.condition];
    const totalReleaseCfs = input.releases.reduce(
      (total, item) => total + item.releaseCfs,
      0,
    );

    return {
      runId: `template-${Date.now()}`,
      engine: "template-dhsvm-adapter",
      condition: input.condition,
      releaseSettingCount: input.releases.length,
      totalReleaseCfs,
      reference: {
        site: gaugeFixture.site,
        dataAsOf: gaugeFixture.dataAsOf,
        sampleCount: referenceValues.length,
        minCfs: Math.min(...referenceValues),
        maxCfs: Math.max(...referenceValues),
        selectedSamplePercentile: samplePercentile,
        selectedSampleFlowCfs: sampleQuantile(referenceValues, samplePercentile),
      },
      status: "complete",
      note: "Inputs accepted by the template adapter. DHSVM and downstream release routing are not connected, so no forecast hydrograph was calculated.",
    };
  },
};
