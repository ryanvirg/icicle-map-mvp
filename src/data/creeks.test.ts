import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CREEK_REACHES,
  LAKE_FEATURES,
  WATERSHED_FEATURES,
  WATERSHED_GEOJSON,
} from "./creeks";

describe("creeks and lakes GeoJSON", () => {
  it("loads all supplied lines and polygons with map details", () => {
    assert.equal(WATERSHED_GEOJSON.type, "FeatureCollection");
    assert.equal(WATERSHED_GEOJSON.features.length, 13);
    assert.equal(CREEK_REACHES.length, 8);
    assert.equal(LAKE_FEATURES.length, 5);
    assert.equal(WATERSHED_FEATURES.length, 13);
    assert.equal(
      WATERSHED_GEOJSON.features.filter(
        (feature) => feature.geometry.type === "LineString",
      ).length,
      8,
    );
    assert.equal(
      WATERSHED_GEOJSON.features.filter(
        (feature) => feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon",
      ).length,
      5,
    );
    assert.ok(
      WATERSHED_GEOJSON.features.every(
        (feature, index) =>
          feature.properties.name === WATERSHED_FEATURES[index].name,
      ),
    );
    assert.ok(CREEK_REACHES.every((feature) => (feature.lengthKm ?? 0) > 0));
    assert.ok(LAKE_FEATURES.every((feature) => (feature.areaKm2 ?? 0) > 0));
    assert.deepEqual(
      CREEK_REACHES.map((feature) => feature.name),
      [
        "Icicle Creek",
        "Leland Creek",
        "French Creek",
        "Eightmile Creek",
        "Mountaineer Creek",
        "Snow Creek",
        "Prospect Creek",
        "Klonaqua Creek",
      ],
    );
    assert.deepEqual(
      LAKE_FEATURES.map((feature) => feature.name),
      [
        "Klonaqua Lakes",
        "Square Lake",
        "Eightmile Lake",
        "Snow Lakes",
        "Colchuck Lake",
      ],
    );
    assert.equal(LAKE_FEATURES.filter((feature) => feature.name === "Klonaqua Lakes").length, 1);
    assert.equal(LAKE_FEATURES.filter((feature) => feature.name === "Snow Lakes").length, 1);
    assert.ok(LAKE_FEATURES.filter((feature) => feature.name === "Klonaqua Lakes" || feature.name === "Snow Lakes").every((feature) => feature.vertexCount > 0 && (feature.areaKm2 ?? 0) > 0));
  });
});
