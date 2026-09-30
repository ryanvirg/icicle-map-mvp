import huc12 from "./sources/icicle-huc12-overlay.json";
import climate from "./sources/icicle-climate-overlay.json";

export type MapOverlayId =
  | "forest"
  | "shrub"
  | "developed"
  | "soil-a"
  | "soil-b"
  | "soil-c"
  | "soil-d"
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
  source: "huc12" | "climate";
  min: number;
  max: number;
  colors: [string, string, string];
};

export const MAP_OVERLAYS: Record<MapOverlayId, MapOverlay> = {
  forest: { id: "forest", category: "land", label: "Forest cover", property: "forestPct", unit: "%", source: "huc12", min: 0, max: 100, colors: ["#f1e5c8", "#91ad78", "#24553a"] },
  shrub: { id: "shrub", category: "land", label: "Shrub / scrub", property: "shrubPct", unit: "%", source: "huc12", min: 0, max: 100, colors: ["#f1e5c8", "#d6a455", "#72502d"] },
  developed: { id: "developed", category: "land", label: "Developed land", property: "developedPct", unit: "%", source: "huc12", min: 0, max: 25, colors: ["#f2ede8", "#db9270", "#9c3d30"] },
  "soil-a": { id: "soil-a", category: "soil", label: "Group A · high infiltration", property: "soilAPct", unit: "%", source: "huc12", min: 0, max: 100, colors: ["#f4e6c8", "#d19b55", "#754323"] },
  "soil-b": { id: "soil-b", category: "soil", label: "Group B · moderate infiltration", property: "soilBPct", unit: "%", source: "huc12", min: 0, max: 100, colors: ["#eee8cf", "#b8a85a", "#53602e"] },
  "soil-c": { id: "soil-c", category: "soil", label: "Group C · slow infiltration", property: "soilCPct", unit: "%", source: "huc12", min: 0, max: 100, colors: ["#ece6d9", "#bd9e7c", "#684d3d"] },
  "soil-d": { id: "soil-d", category: "soil", label: "Group D · very slow infiltration", property: "soilDPct", unit: "%", source: "huc12", min: 0, max: 100, colors: ["#e9e4df", "#a79091", "#584450"] },
  elevation: { id: "elevation", category: "terrain", label: "Mean elevation", property: "elevationMeanFt", unit: "ft", source: "huc12", min: 2500, max: 8000, colors: ["#e9e5ce", "#b99b70", "#624f49"] },
  slope: { id: "slope", category: "terrain", label: "Mean slope", property: "slopeMeanDeg", unit: "°", source: "huc12", min: 0, max: 45, colors: ["#edf0d9", "#a4b36b", "#52613b"] },
  precipitation: { id: "precipitation", category: "climate", label: "Annual precipitation", property: "annualPrecipIn", unit: "in/year", source: "climate", min: 20, max: 100, colors: ["#f4eacb", "#7bb7bc", "#245c85"] },
  temperature: { id: "temperature", category: "climate", label: "Mean temperature", property: "meanTemperatureF", unit: "°F", source: "climate", min: 20, max: 55, colors: ["#5367a4", "#e6d69b", "#b34c37"] },
};

export const HUC12_OVERLAY_GEOJSON = huc12 as GeoJSON.FeatureCollection;
export const CLIMATE_OVERLAY_GEOJSON = climate as GeoJSON.FeatureCollection;

export function defaultOverlayForCategory(category: string): MapOverlayId | null {
  switch (category) {
    case "land": return "forest";
    case "soil": return "soil-a";
    case "terrain": return "elevation";
    case "climate": return "precipitation";
    default: return null;
  }
}
