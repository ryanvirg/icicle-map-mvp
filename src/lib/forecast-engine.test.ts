import assert from "node:assert/strict";
import test from "node:test";
import { templateForecastEngine } from "./forecast/template-engine";

test("template adapter returns fixture-based baseline and illustrative release hydrographs at mapped gauges", async () => {
  const result = await templateForecastEngine.run({
    condition: "wet",
    releases: [
      { lakeId: "colchuck", releaseCfs: 12 },
      { lakeId: "snow-lakes", releaseCfs: 8 },
    ],
  });

  assert.equal(result.status, "complete");
  assert.equal(result.engine, "template-dhsvm-adapter");
  assert.equal(result.condition, "wet");
  assert.equal(result.releaseSettingCount, 2);
  assert.equal(result.totalReleaseCfs, 20);
  assert.deepEqual(
    [result.reference.site, result.reference.sampleCount, result.reference.minCfs, result.reference.maxCfs],
    ["12458000", 8, 128, 412],
  );
  assert.equal(result.reference.selectedSamplePercentile, 75);
  assert.equal(result.reference.selectedSampleFlowCfs, 319.75);
  assert.deepEqual(result.hydrographs.map((gauge) => gauge.gaugeId), [
    "usgs-12458000",
    "structure-2",
    "ecology-45b070",
  ]);
  const usgs = result.hydrographs[0].hydrograph[0];
  assert.equal(usgs.scenarioCfs - usgs.baselineCfs, 20);
  const structure2 = result.hydrographs[1].hydrograph;
  assert.equal(structure2[0].scenarioCfs, structure2[0].baselineCfs);
  assert.equal(structure2[1].scenarioCfs - structure2[1].baselineCfs, 15);
  assert.match(result.note, /uncalibrated display-only reach factors/);
});

test("template adapter rejects invalid release rates", async () => {
  await assert.rejects(
    () =>
      templateForecastEngine.run({
        condition: "dry",
        releases: [{ lakeId: "colchuck", releaseCfs: -1 }],
      }),
    /non-negative flow rates/,
  );
});
