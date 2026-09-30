export type HydrologicCondition = "dry" | "average" | "wet";

export type ForecastReleaseSetting = {
  lakeId: string;
  releaseCfs: number;
};

export type ForecastRunInput = {
  condition: HydrologicCondition;
  releases: ForecastReleaseSetting[];
};

export type ForecastRunResult = {
  runId: string;
  engine: string;
  condition: HydrologicCondition;
  releaseSettingCount: number;
  totalReleaseCfs: number;
  reference: {
    site: string;
    dataAsOf: string;
    sampleCount: number;
    minCfs: number;
    maxCfs: number;
    selectedSamplePercentile: 25 | 50 | 75;
    selectedSampleFlowCfs: number;
  };
  status: "complete";
  note: string;
};

export interface ForecastEngine {
  run(input: ForecastRunInput): Promise<ForecastRunResult>;
}
