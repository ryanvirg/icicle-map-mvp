import rasterMetadata from "./sources/icicle-raster-overlay-metadata.json";
import huc12 from "./sources/icicle-huc12-overlay.json";
import climate from "./sources/icicle-climate-overlay.json";

export type MapOverlayId =
  | "land-cover"
  | "tree-canopy"
  | "soil-mapunits"
  | "elevation"
  | "slope"
  | "precipitation"
  | "temperature";

export type MapOverlay = {
  id: MapOverlayId;
  category: "land" | "soil" | "terrain" | "climate";
  label: string;
  property: string;
  unit: string;
  source: "huc12" | "climate" | "raster";
  min: number;
  max: number;
  colors: [string, string, string];
  rasterLayer?: string;
  sourceLabel: string;
  sourceUrl: string;
  period: string;
  resolution: string;
  note: string;
  legendItems?: { label: string; color: string }[];
};

const assets = rasterMetadata.assets;
const elevationMinFt = Math.round(assets.terrainRelief.minElevationM * 3.28084);
const elevationMaxFt = Math.round(assets.terrainRelief.maxElevationM * 3.28084);
const prism = rasterMetadata.assets as typeof rasterMetadata.assets & {
  soilMapunits: { sourceUrl: string; classes: { label: string; color: string }[] };
  climatePrecipitation: { sourceUrl: string; minInches: number; maxInches: number; colors: string[]; legendItems: { label: string; color: string }[] };
  climateTemperature: { sourceUrl: string; minCelsius: number; maxCelsius: number; colors: string[]; legendItems: { label: string; color: string }[] };
};

export const MAP_OVERLAYS: Record<MapOverlayId, MapOverlay> = {
  "land-cover": {
    id: "land-cover",
    category: "land",
    label: "Land-cover classes",
    property: "",
    unit: "class",
    source: "raster",
    min: 0,
    max: 100,
    colors: ["#1c5f2c", "#ccb879", "#466b9f"],
    rasterLayer: "nlcd-land-cover-overlay",
    sourceLabel: "USGS / MRLC Annual NLCD",
    sourceUrl: assets.landCover.sourceUrl,
    period: "2025",
    resolution: "30 m pixels",
    note: "Categorical land cover, clipped to the watershed. It describes surface cover, not ownership or management use.",
    legendItems: [
      { label: "Forest", color: "#397b44" },
      { label: "Shrub / scrub", color: "#ccb879" },
      { label: "Herbaceous", color: "#dfdfc2" },
      { label: "Developed", color: "#d99282" },
      { label: "Barren / snow", color: "#b3ac9f" },
      { label: "Water / wetlands", color: "#466b9f" },
    ],
  },
  "tree-canopy": {
    id: "tree-canopy",
    category: "land",
    label: "Tree-canopy cover",
    property: "",
    unit: "%",
    source: "raster",
    min: 0,
    max: 100,
    colors: ["#f5f5f4", "#a4c49a", "#14532d"],
    rasterLayer: "nlcd-tree-canopy-overlay",
    sourceLabel: "USDA Forest Service / MRLC NLCD Tree Canopy",
    sourceUrl: assets.treeCanopy.sourceUrl,
    period: "2025",
    resolution: "30 m pixels",
    note: "Estimated percent of each pixel covered by tree canopy. This is a continuous canopy estimate, not a forest-type map.",
  },
  "soil-mapunits": {
    id: "soil-mapunits",
    category: "soil",
    label: "Hydrologic soil groups",
    property: "",
    unit: "class",
    source: "raster",
    min: 0,
    max: 1,
    colors: ["#ad8b5e", "#c5a373", "#776244"],
    rasterLayer: "ssurgo-mapunits-overlay",
    sourceLabel: "USDA NRCS SSURGO",
    sourceUrl: prism.soilMapunits.sourceUrl,
    period: "Current survey mapping; soil survey dates vary",
    resolution: "Rasterized SSURGO map units · approx. 30 m grid spacing",
    note: "Each grid cell inherits the dominant hydrologic soil group for its SSURGO map unit. A, B, C, and D describe increasing runoff potential; dual groups show drained / undrained classes. Grid spacing is not the survey's positional accuracy.",
    legendItems: prism.soilMapunits.classes,
  },
  elevation: {
    id: "elevation",
    category: "terrain",
    label: "Elevation + shaded relief",
    property: "",
    unit: "ft",
    source: "raster",
    min: elevationMinFt,
    max: elevationMaxFt,
    colors: ["#456f50", "#c2ae79", "#eeeeea"],
    rasterLayer: "terrain-relief-overlay",
    sourceLabel: "USGS 3DEP",
    sourceUrl: assets.terrainRelief.sourceUrl,
    period: "Elevation snapshot; acquisition dates vary by tile",
    resolution: "Approx. 10 m ground pixels",
    note: `Elevation-tinted multidirectional hillshade. Watershed elevation spans about ${Math.round(assets.terrainRelief.actualMinElevationM * 3.28084).toLocaleString()}–${Math.round(assets.terrainRelief.actualMaxElevationM * 3.28084).toLocaleString()} ft.`,
  },
  slope: {
    id: "slope",
    category: "terrain",
    label: "Slope",
    property: "",
    unit: "°",
    source: "raster",
    min: 0,
    max: 60,
    colors: ["#eef2de", "#ebd775", "#a94938"],
    rasterLayer: "terrain-slope-overlay",
    sourceLabel: "Derived from USGS 3DEP",
    sourceUrl: assets.slope.sourceUrl,
    period: "Derived from the bundled elevation snapshot",
    resolution: "Approx. 10 m ground pixels",
    note: "Slope is calculated from neighboring elevation cells and displayed in degrees.",
  },
  precipitation: {
    id: "precipitation",
    category: "climate",
    label: "Annual precipitation",
    property: "annualPrecipIn",
    unit: "in/year",
    source: "raster",
    min: prism.climatePrecipitation.minInches,
    max: prism.climatePrecipitation.maxInches,
    colors: [prism.climatePrecipitation.colors[0], prism.climatePrecipitation.colors[2], prism.climatePrecipitation.colors[4]],
    rasterLayer: "prism-precipitation-overlay",
    sourceLabel: "PRISM Climate Group",
    sourceUrl: prism.climatePrecipitation.sourceUrl,
    period: "1991–2020 normals",
    resolution: "Approx. 4 km grid cells",
    note: "Interpolated climate normals informed by station observations and terrain. Annual precipitation includes rain and snow water equivalent; not a forecast or a local gauge reading.",
    legendItems: prism.climatePrecipitation.legendItems,
  },
  temperature: {
    id: "temperature",
    category: "climate",
    label: "Mean temperature",
    property: "meanTemperatureF",
    unit: "°F",
    source: "raster",
    min: prism.climateTemperature.minCelsius * 9 / 5 + 32,
    max: prism.climateTemperature.maxCelsius * 9 / 5 + 32,
    colors: [prism.climateTemperature.colors[0], prism.climateTemperature.colors[2], prism.climateTemperature.colors[4]],
    rasterLayer: "prism-temperature-overlay",
    sourceLabel: "PRISM Climate Group",
    sourceUrl: prism.climateTemperature.sourceUrl,
    period: "1991–2020 normals",
    resolution: "Approx. 4 km grid cells",
    note: "Interpolated annual mean temperature normals; topographic patterns are represented more finely than the previous 0.25° grid, but subgrid microclimates remain unresolved.",
    legendItems: prism.climateTemperature.legendItems,
  },
};

export const HUC12_OVERLAY_GEOJSON = huc12 as GeoJSON.FeatureCollection;
export const CLIMATE_OVERLAY_GEOJSON = climate as GeoJSON.FeatureCollection;

export function defaultOverlayForCategory(category: string): MapOverlayId | null {
  switch (category) {
    case "land": return "land-cover";
    case "soil": return "soil-mapunits";
    case "terrain": return "elevation";
    case "climate": return "precipitation";
    default: return null;
  }
}
