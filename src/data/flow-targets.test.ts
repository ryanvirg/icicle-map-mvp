import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FLOW_TARGETS, LONG_TERM_GOAL_CFS } from "./flow-targets";

describe("flow targets", () => {
  it("matches guiding principle JSON values", () => {
    const byId = Object.fromEntries(FLOW_TARGETS.map((t) => [t.id, t.value]));
    assert.equal(byId.non_drought_year_guiding_principle, 100);
    assert.equal(byId.drought_year_guiding_principle, 60);
    assert.equal(byId.historic_low, 20);
  });

  it("keeps 250 cfs separate from JSON trio", () => {
    assert.equal(LONG_TERM_GOAL_CFS, 250);
    assert.ok(!FLOW_TARGETS.some((t) => t.value === 250));
  });
});
