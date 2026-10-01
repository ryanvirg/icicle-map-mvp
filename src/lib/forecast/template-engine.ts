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

/** Display-only routing factors; replace with calibrated outputs when available. */
const DEMO_GAUGES = [
  { id: "usgs-12458000", name: "USGS Icicle Creek", station: "12458000", releaseFactor: 1, lagSteps: 0 },
  { id: "structure-2", name: "FWS Structure 2", station: "Structure 2", releaseFactor: 0.75, lagSteps: 1 },
  { id: "ecology-45b070", name: "Ecology Icicle Creek", station: "45B070", releaseFactor: 0.65, lagSteps: 2 },
] as const;

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
 * It builds fixture-based display curves with explicitly uncalibrated routing
 * adjustments; it is not a watershed or release-impact model.
 */
export const templateForecastEngine: ForecastEngine = {
  async run(input: ForecastRunInput): Promise<ForecastRunResult> {
    if (!input.releases.every((item) => Number.isFinite(item.releaseCfs) && item.releaseCfs >= 0)) {
      throw new Error("Release settings must be non-negative flow rates.");
    }

    const referenceValues = gaugeFixture.series.map((point) => point.value);
    const samplePercentile = SAMPLE_PERCENTILE_BY_CONDITION[input.condition];
    const selectedSampleFlowCfs = sampleQuantile(referenceValues, samplePercentile);
    const medianReferenceFlow = sampleQuantile(referenceValues, 50);
    const totalReleaseCfs = input.releases.reduce(
      (total, item) => total + item.releaseCfs,
      0,
    );
    const baselineScale = selectedSampleFlowCfs / medianReferenceFlow;
    const baseline = referenceValues.map((value) => value * baselineScale);
    const hydrographs = DEMO_GAUGES.map((gauge) => ({
      gaugeId: gauge.id,
      name: gauge.name,
      station: gauge.station,
      hydrograph: baseline.map((baselineCfs, index) => ({
        step: `Step ${index + 1}`,
        baselineCfs,
        scenarioCfs:
          baselineCfs +
          (index >= gauge.lagSteps ? totalReleaseCfs * gauge.releaseFactor : 0),
      })),
    }));

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
        selectedSampleFlowCfs,
      },
      hydrographs,
      status: "complete",
      note: "Illustrative hydrographs only. The same USGS fixture trace is reused at each gauge; scenario lines add the selected lake releases using uncalibrated display-only reach factors and lag steps. DHSVM, observed conditions at the other gauges, and calibrated downstream routing are not connected.",
    };
  },
};
