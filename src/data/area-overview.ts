import summary from "./sources/icicle-area-summary.json";

export type AreaDataCategory = {
  id: string;
  title: string;
  description: string;
  status: "Published data" | "Partial coverage" | "Reanalysis estimate" | "Not assessed";
  metrics: { label: string; unit?: string; value: number | null }[];
  source: string | null;
  sourceUrl?: string;
  period: string | null;
  note?: string;
};

export const AREA_SUMMARY = summary;
const wsioUrl = "https://gispub.epa.gov/arcgis/rest/services/r4/wsio/MapServer";

export const AREA_DATA_CATEGORIES: AreaDataCategory[] = [
  {
    id: "land", title: "Land", status: "Published data",
    description: "The figures are area-weighted watershed summaries. Use the detailed map layers above to inspect 2025 land-cover and tree-canopy patterns.",
    metrics: summary.land,
    source: "USGS NLCD via EPA WSIO", sourceUrl: wsioUrl,
    period: "2019 watershed summary; map layers use 2025 rasters",
    note: "The summary figures remain from the 2019 NLCD-based EPA WSIO snapshot. The map layers are separate 2025 Annual NLCD images. Other land cover includes agriculture and snow/ice. Percentages may not sum to 100 after rounding.",
  },
  {
    id: "soil", title: "Soil", status: "Partial coverage",
    description: "Explore detailed NRCS soil map-unit boundaries. Hydrologic soil-group percentages below remain area summaries.",
    metrics: summary.soil,
    source: "USDA NRCS gSSURGO via EPA WSIO", sourceUrl: wsioUrl,
    period: "July 2020 soil database",
    note: "The remainder is not represented in the four reported groups; it may include unclassified soils, dual groups, water, or unmapped areas. It is not assigned a runoff class.",
  },
  {
    id: "terrain", title: "Terrain", status: "Published data",
    description: "The figures are HUC12 summary statistics. Use the detailed map layers above for continuous elevation relief and slope.",
    metrics: summary.terrain,
    source: "USGS NED / NHDPlus2 via EPA WSIO", sourceUrl: wsioUrl,
    period: "NHDPlus2 summary; detailed map uses USGS 3DEP",
    note: "The summary slope is in degrees, not percent grade. The new local 3DEP image uses approximately 10 m ground pixels; acquisition dates vary across its elevation mosaic.",
  },
  {
    id: "climate", title: "Climate", status: "Reanalysis estimate",
    description: "Open the PRISM climate maps for finer terrain-aware spatial patterns. The monthly table below is a separate, coarser ERA5 area summary.",
    metrics: [
      { label: "Annual precipitation", unit: "in/year", value: summary.climate.annualPrecipitationIn },
      { label: "Mean temperature", unit: "°F", value: summary.climate.meanTemperatureF },
    ],
    source: "ERA5 (Copernicus) via Open-Meteo",
    sourceUrl: "https://open-meteo.com/en/docs/historical-weather-api",
    period: "1991–2020 averages",
    note: `${summary.climate.cellCount} intersecting 0.25° grid cells (about 25 km). Gridded estimates, not local station observations or forecasts; mountain microclimates are not resolved. Precipitation includes rain and snow water equivalent.`,
  },
  {
    id: "point-sources", title: "Point sources", status: "Not assessed",
    description: "Discharge locations, source types, and permit records. No inventory has been connected; absence of records does not mean no sources exist.",
    metrics: ["Discharge locations", "Source types", "Permit records"].map((label) => ({ label, value: null })),
    source: null, period: null,
  },
];
