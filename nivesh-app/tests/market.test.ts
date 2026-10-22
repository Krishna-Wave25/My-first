import test from "node:test";
import assert from "node:assert/strict";
import { worstStatus } from "../src/data/status.ts";

test("worstStatus: any sample part makes the whole view sample; partial beats live", () => {
  assert.equal(worstStatus("live", "live"), "live");
  assert.equal(worstStatus("live", "partial"), "partial");
  assert.equal(worstStatus("partial", "sample"), "sample");
  assert.equal(worstStatus("live", "sample"), "sample");
});
