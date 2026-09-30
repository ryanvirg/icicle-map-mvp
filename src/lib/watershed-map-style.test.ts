import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WATERSHED_GEOJSON } from "@/data/creeks";
import { createWatershedStyle } from "./watershed-map-style";

describe("interactive creek and lake map style", () => {
  it("draws the supplied GeoJSON above a muted basemap", () => {
    const style = createWatershedStyle();
    const source = style.sources["watershed-features"];

    assert.equal(source.type, "geojson");
    if (
      source.type !== "geojson" ||
      typeof source.data === "string" ||
      source.data.type !== "FeatureCollection"
    ) {
      assert.fail("Expected an inline GeoJSON FeatureCollection source");
    }

    assert.equal(source.promoteId, "id");
    assert.equal(source.data.features.length, WATERSHED_GEOJSON.features.length);
    const basemap = style.sources.basemap;
    assert.equal(basemap.type, "raster");
    if (basemap.type !== "raster") {
      assert.fail("Expected a muted raster basemap");
    }
    assert.match(
      basemap.tiles?.[0] ?? "",
      /ArcGIS\/rest\/services\/Canvas\/World_Light_Gray_Base/,
    );
    assert.deepEqual(
      style.layers.map((layer) => layer.id),
      [
        "basemap",
        "huc12-data-overlay",
        "climate-data-overlay",
        "lake-polygons",
        "creek-casing",
        "creek-lines",
        "creek-hit-area",
        "gauge-points",
        "gauge-labels",
      ],
    );
    assert.ok(style.layers.some((layer) => layer.id === "lake-polygons"));
    assert.ok(style.layers.some((layer) => layer.id === "creek-lines"));
    const gauges = style.sources.gauges;
    assert.equal(gauges.type, "geojson");
    if (gauges.type !== "geojson") assert.fail("Expected a GeoJSON gauge source");
    assert.equal(gauges.data, "/gauges.geojson");
    assert.ok(style.layers.some((layer) => layer.id === "gauge-points"));
    assert.ok(style.layers.some((layer) => layer.id === "gauge-labels"));
  });
});
