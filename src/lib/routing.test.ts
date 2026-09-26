import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OPERATING_REGIMES } from "@/data/scenarios";
import { routeHistoricalChannelFlow, summerReleaseVolumeAcFt } from "./routing";

describe("routing", () => {
  it("returns uncertainty band for historical channel", () => {
    const routed = routeHistoricalChannelFlow(
      "dhsvm-cal-2015-2024-avg",
      "2024-07-01",
      "2024-10-31",
      OPERATING_REGIMES.standard_release,
    );
    assert.ok(routed.center.length > 0);
    assert.ok(routed.lower[0].value < routed.center[0].value);
    assert.ok(routed.upper[0].value > routed.center[0].value);
    assert.match(routed.structure2LossNote, /Structure 2/i);
  });

  it("wilderness hold releases less summer volume than standard", () => {
    const a = summerReleaseVolumeAcFt(
      OPERATING_REGIMES.wilderness_hold,
      "2024-07-01",
      "2024-10-31",
    );
    const b = summerReleaseVolumeAcFt(
      OPERATING_REGIMES.standard_release,
      "2024-07-01",
      "2024-10-31",
    );
    assert.ok(a < b);
  });
});
