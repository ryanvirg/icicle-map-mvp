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
    description: "Land cover across the full Icicle Creek watershed, weighted by subwatershed area.",
    metrics: summary.land,
    source: "USGS NLCD via EPA WSIO", sourceUrl: wsioUrl,
    period: "2019 land cover",
    note: "Other land cover is the remainder after the listed classes, including agriculture and snow/ice. Percentages may not sum to 100 after rounding.",
  },
  {
    id: "soil", title: "Soil", status: "Partial coverage",
    description: "Hydrologic soil groups as a percentage of the entire watershed area.",
    metrics: summary.soil,
    source: "USDA NRCS gSSURGO via EPA WSIO", sourceUrl: wsioUrl,
    period: "July 2020 soil database",
    note: "The remainder is not represented in the four reported groups; it may include unclassified soils, dual groups, water, or unmapped areas. It is not assigned a runoff class.",
  },
  {
    id: "terrain", title: "Terrain", status: "Published data",
    description: "Watershed elevation range and area-weighted mean terrain statistics.",
    metrics: summary.terrain,
    source: "USGS NED / NHDPlus2 via EPA WSIO", sourceUrl: wsioUrl,
    period: "NHDPlus2 elevation snapshot",
    note: "Slope is reported in degrees, not percent grade. Acquisition dates vary across the elevation mosaic. A slope distribution is not supplied by this summary dataset.",
  },
  {
    id: "climate", title: "Climate", status: "Reanalysis estimate",
    description: "Historical climate averages, weighted by the area of each climate grid cell inside the watershed.",
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
