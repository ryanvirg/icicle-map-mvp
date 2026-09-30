import { templateForecastEngine } from "@/lib/forecast/template-engine";

/** Replace this adapter export when the DHSVM-backed engine is available. */
export const forecastEngine = templateForecastEngine;
export { templateForecastEngine };
export type {
  ForecastEngine,
  ForecastRunInput,
  ForecastRunResult,
  ForecastReleaseSetting,
  HydrologicCondition,
} from "@/lib/forecast/types";
