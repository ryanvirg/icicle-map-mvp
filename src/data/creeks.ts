import watershedGeoJson from "./creeks-lakes.json";

type WatershedProperties = Record<string, unknown> & {
  name?: string;
};

type WatershedGeometry = GeoJSON.LineString | GeoJSON.Polygon | GeoJSON.MultiPolygon;

const sourceLakeFeatures = watershedGeoJson.features.filter(
  (feature) => feature.geometry.type === "Polygon",
);
const expectedSourceLakeNames = [
  "Klonaqua Lakes", "Square Lake", "Eightmile Lake", "Klonaqua Lakes",
  "Lower Snow Lake", "Colchuck Lake", "Upper Snow Lake",
];
if (JSON.stringify(sourceLakeFeatures.map((feature) => feature.properties.name)) !== JSON.stringify(expectedSourceLakeNames)) {
  throw new Error("The bundled lake features changed order; review the lake name and merge mapping in creeks.ts.");
}

function mergeLakeFeatures(
  first: (typeof sourceLakeFeatures)[number],
  second: (typeof sourceLakeFeatures)[number],
  name: string,
) {
  const coordinates = (feature: (typeof sourceLakeFeatures)[number]) =>
    feature.geometry.coordinates;
  return {
    ...first,
    properties: { ...first.properties, name },
    geometry: {
      type: "MultiPolygon" as const,
      coordinates: [coordinates(first), coordinates(second)],
    },
  };
}

const correctedLakeFeatures = [
  mergeLakeFeatures(sourceLakeFeatures[0], sourceLakeFeatures[1], "Klonaqua Lakes"),
  { ...sourceLakeFeatures[2], properties: { ...sourceLakeFeatures[2].properties, name: "Square Lake" } },
  { ...sourceLakeFeatures[3], properties: { ...sourceLakeFeatures[3].properties, name: "Eightmile Lake" } },
  mergeLakeFeatures(sourceLakeFeatures[4], sourceLakeFeatures[5], "Snow Lakes"),
  { ...sourceLakeFeatures[6], properties: { ...sourceLakeFeatures[6].properties, name: "Colchuck Lake" } },
];

let sourceLakeIndex = 0;
let correctedLakeIndex = 0;
const correctedFeatures = watershedGeoJson.features.flatMap((feature) => {
  if (feature.geometry.type !== "Polygon") return [feature];
  const currentIndex = sourceLakeIndex++;
  if (currentIndex === 1 || currentIndex === 5) return [];
  return [correctedLakeFeatures[correctedLakeIndex++]];
});

export const WATERSHED_GEOJSON = {
  ...watershedGeoJson,
  features: correctedFeatures,
} as GeoJSON.FeatureCollection<
  WatershedGeometry,
  WatershedProperties
>;

export type WatershedMapFeature = {
  id: string;
  name: string;
  kind: "creek" | "lake";
  vertexCount: number;
  lengthKm?: number;
  areaKm2?: number;
};

function distanceKm(start: number[], end: number[]) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const [startLng, startLat] = start;
  const [endLng, endLat] = end;
  const latDelta = radians(endLat - startLat);
  const lngDelta = radians(endLng - startLng);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(radians(startLat)) *
      Math.cos(radians(endLat)) *
      Math.sin(lngDelta / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function polygonRingAreaKm2(ring: number[][]) {
  const earthRadiusKm = 6371.0088;
  let sum = 0;

  for (let index = 0; index < ring.length - 1; index += 1) {
    const [lng1, lat1] = ring[index];
    const [lng2, lat2] = ring[index + 1];
    const radians = (degrees: number) => (degrees * Math.PI) / 180;
    sum +=
      (radians(lng2) - radians(lng1)) *
      (2 + Math.sin(radians(lat1)) + Math.sin(radians(lat2)));
  }

  return (Math.abs(sum) * earthRadiusKm ** 2) / 2;
}

export const WATERSHED_FEATURES: WatershedMapFeature[] =
  WATERSHED_GEOJSON.features.map((feature, index) => {
    const id = `watershed-feature-${index + 1}`;
    const name = feature.properties.name;
    if (!name) {
      throw new Error(`GeoJSON feature ${index + 1} is missing its asset name.`);
    }

    if (feature.geometry.type === "LineString") {
      const coordinates = feature.geometry.coordinates;
      const lengthKm = coordinates.slice(1).reduce(
        (total, point, pointIndex) =>
          total + distanceKm(coordinates[pointIndex], point),
        0,
      );

      return {
        id,
        name,
        kind: "creek",
        vertexCount: coordinates.length,
        lengthKm,
      };
    }

    const polygons = feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
    const areaKm2 = Math.max(
      0,
      polygons.reduce((total, rings) => total + rings.reduce(
        (area, ring, ringIndex) => area + (ringIndex === 0 ? 1 : -1) * polygonRingAreaKm2(ring),
        0,
      ), 0),
    );

    return {
      id,
      name,
      kind: "lake",
        vertexCount: polygons.reduce((total, rings) => total + rings.reduce((ringTotal, ring) => ringTotal + ring.length, 0), 0),
      areaKm2,
    };
  });

export const CREEK_REACHES = WATERSHED_FEATURES.filter(
  (feature) => feature.kind === "creek",
);

export const LAKE_FEATURES = WATERSHED_FEATURES.filter(
  (feature) => feature.kind === "lake",
);
