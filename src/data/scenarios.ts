export type OperatingRegime = {
  id: string;
  label: string;
  description: string;
  /** Multiplier on routed release contribution to Historical Channel (0–1). */
  releaseIntensity: number;
  /** Days to delay peak release (wilderness hold shifts water later). */
  releaseLagDays: number;
  summerReleaseCfs: number;
};

export type Scenario = {
  id: string;
  name: string;
  description: string;
  hydrologyId: string;
  dateStart: string;
  dateEnd: string;
  regime: OperatingRegime;
  preloaded: boolean;
};

export const OPERATING_REGIMES: Record<string, OperatingRegime> = {
  wilderness_hold: {
    id: "wilderness_hold",
    label: "Hold storage for wilderness value",
    description:
      "Delay and reduce mid-summer releases to keep alpine storage longer; less water reaches the anadromous zone early.",
    releaseIntensity: 0.55,
    releaseLagDays: 28,
    summerReleaseCfs: 42,
  },
  standard_release: {
    id: "standard_release",
    label: "Release for downstream need",
    description:
      "Earlier, higher releases aligned with hatchery and in-season fish-flow needs at the Historical Channel.",
    releaseIntensity: 1,
    releaseLagDays: 0,
    summerReleaseCfs: 78,
  },
};

export const PRELOADED_SCENARIOS: Scenario[] = [
  {
    id: "scn-wilderness-hold-demo",
    name: "Wilderness hold — illustrative 2024 window",
    description:
      "Same pre-run hydrology and Jul–Oct dates as the release scenario; operating regime holds alpine storage longer.",
    hydrologyId: "dhsvm-cal-2015-2024-avg",
    dateStart: "2024-07-01",
    dateEnd: "2024-10-31",
    regime: OPERATING_REGIMES.wilderness_hold,
    preloaded: true,
  },
  {
    id: "scn-release-demo",
    name: "Release for downstream need — illustrative 2024 window",
    description:
      "Matching hydrology library and season dates; regime releases earlier for Historical Channel targets.",
    hydrologyId: "dhsvm-cal-2015-2024-avg",
    dateStart: "2024-07-01",
    dateEnd: "2024-10-31",
    regime: OPERATING_REGIMES.standard_release,
    preloaded: true,
  },
];

export function copyScenarioWithRegime(
  source: Scenario,
  regime: OperatingRegime,
  name?: string,
): Scenario {
  return {
    ...source,
    id: `${source.id}-copy-${Date.now()}`,
    name: name ?? `${source.name} (copy)`,
    regime,
    preloaded: false,
    description: `${source.description} Operating regime edited locally; routing recalculated only (no DHSVM).`,
  };
}
