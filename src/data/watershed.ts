export type FeatureKind =
  | "lake"
  | "tributary"
  | "diversion"
  | "gage"
  | "channel"
  | "confluence";

export type WatershedFeature = {
  id: string;
  name: string;
  kind: FeatureKind;
  description: string;
  coordinates: [number, number];
  seriesAvailable: string[];
};

/** Mainstem & major tributaries (lng, lat) — illustrative alignment around Leavenworth. */
export const CREEK_LINE: [number, number][] = [
  [-120.842, 47.523],
  [-120.82, 47.538],
  [-120.795, 47.552],
  [-120.768, 47.562],
  [-120.742, 47.572],
  [-120.714, 47.588],
  [-120.698, 47.592],
  [-120.688, 47.594],
  [-120.672, 47.596],
  [-120.661, 47.596],
];

export const FRENCH_CREEK_LINE: [number, number][] = [
  [-120.72, 47.62],
  [-120.702, 47.598],
  [-120.695, 47.592],
];

export const LELAND_CREEK_LINE: [number, number][] = [
  [-120.68, 47.61],
  [-120.672, 47.598],
  [-120.668, 47.594],
];

export const WATERSHED_FEATURES: WatershedFeature[] = [
  {
    id: "colchuck",
    name: "Colchuck Lake",
    kind: "lake",
    description:
      "IPID irrigation storage. 2026 release monitoring. Outlet combines release, seepage, and spill (QAPP).",
    coordinates: [-120.842, 47.523],
    seriesAvailable: ["lake_inflow", "lake_release"],
  },
  {
    id: "square",
    name: "Square Lake",
    kind: "lake",
    description: "IPID irrigation. Active storage ~2,130 ac-ft (2018 feasibility).",
    coordinates: [-120.818, 47.541],
    seriesAvailable: ["lake_inflow", "lake_release"],
  },
  {
    id: "klonaqua",
    name: "Klonaqua Lake",
    kind: "lake",
    description: "IPID irrigation. Monitored releases in 2026.",
    coordinates: [-120.798, 47.552],
    seriesAvailable: ["lake_inflow", "lake_release"],
  },
  {
    id: "eightmile",
    name: "Eightmile Lake",
    kind: "lake",
    description: "IPID storage on the May 2026 sheet; not in 2026 automated release monitoring.",
    coordinates: [-120.778, 47.558],
    seriesAvailable: ["lake_inflow"],
  },
  {
    id: "snow-lakes",
    name: "Upper & Lower Snow Lakes",
    kind: "lake",
    description: "USFWS / Reclamation system. Wilderness holdback tradeoff with anadromous zone flows.",
    coordinates: [-120.752, 47.568],
    seriesAvailable: ["lake_inflow", "lake_release"],
  },
  {
    id: "french",
    name: "French Creek",
    kind: "tributary",
    description: "2026 tributary monitoring. Bull trout temperature concern late season.",
    coordinates: [-120.695, 47.592],
    seriesAvailable: ["tributary_inflow"],
  },
  {
    id: "leland",
    name: "Leland Creek",
    kind: "tributary",
    description: "2026 tributary monitoring.",
    coordinates: [-120.668, 47.594],
    seriesAvailable: ["tributary_inflow"],
  },
  {
    id: "usgs-12458000",
    name: "USGS 12458000",
    kind: "gage",
    description:
      "Icicle Creek above Snow Creek near Leavenworth. Live USGS when available; fixture fallback labeled.",
    coordinates: [-120.714, 47.588],
    seriesAvailable: ["observed_flow"],
  },
  {
    id: "ipid-diversion",
    name: "IPID diversion (RM 5.7)",
    kind: "diversion",
    description: "Irrigation district diversion downstream of the USGS gage.",
    coordinates: [-120.702, 47.591],
    seriesAvailable: ["diversion"],
  },
  {
    id: "lnfh-diversion",
    name: "LNFH diversion (RM 4.5)",
    kind: "diversion",
    description: "Leavenworth National Fish Hatchery supply.",
    coordinates: [-120.688, 47.594],
    seriesAvailable: ["diversion"],
  },
  {
    id: "structure-2",
    name: "Structure 2 (FWS)",
    kind: "gage",
    description:
      "Preliminary telemetry. Routed scenario flow shows an uncertainty band because travel-time loss is unmeasured.",
    coordinates: [-120.672, 47.596],
    seriesAvailable: ["observed_flow", "routed_flow_band"],
  },
  {
    id: "historical-channel",
    name: "Historical Channel",
    kind: "channel",
    description:
      "Comparison site for 60 and 100 cfs guiding principles. Scenario hydrograph requires a selected operating regime.",
    coordinates: [-120.665, 47.596],
    seriesAvailable: ["scenario_flow", "summer_volume"],
  },
  {
    id: "ecology-45b070",
    name: "Ecology 45B070",
    kind: "gage",
    description: "Icicle Creek at Leavenworth (Ecology).",
    coordinates: [-120.661, 47.596],
    seriesAvailable: ["observed_flow"],
  },
];

export const MAP_INITIAL_VIEW = {
  longitude: -120.74,
  latitude: 47.56,
  zoom: 10.8,
};
