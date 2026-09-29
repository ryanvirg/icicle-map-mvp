import watershedGeoJson from "./creeks-lakes.json";

type WatershedProperties = Record<string, unknown> & {
  name?: string;
};

export const WATERSHED_GEOJSON = watershedGeoJson as GeoJSON.FeatureCollection<
  GeoJSON.LineString | GeoJSON.Polygon,
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

    const rings = feature.geometry.coordinates;
    const areaKm2 = Math.max(
      0,
      rings.reduce(
        (area, ring, ringIndex) =>
          area +
          (ringIndex === 0 ? 1 : -1) * polygonRingAreaKm2(ring),
        0,
      ),
    );

    return {
      id,
      name,
      kind: "lake",
      vertexCount: rings.reduce((total, ring) => total + ring.length, 0),
      areaKm2,
    };
  });

export const CREEK_REACHES = WATERSHED_FEATURES.filter(
  (feature) => feature.kind === "creek",
);

export const LAKE_FEATURES = WATERSHED_FEATURES.filter(
  (feature) => feature.kind === "lake",
);
