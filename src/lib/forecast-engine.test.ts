import assert from "node:assert/strict";
import test from "node:test";
import { templateForecastEngine } from "./forecast/template-engine";

test("template adapter accepts scenario and release inputs and returns the available gauge reference range", async () => {
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
  assert.match(result.note, /no forecast hydrograph was calculated/);
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
