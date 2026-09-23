import assert from "node:assert/strict";
import test from "node:test";

import { CORE_FOUNDATION_BOUNDARIES } from "./index.js";

void test("core exposes only the V2 runtime boundaries", () => {
  assert.deepEqual(CORE_FOUNDATION_BOUNDARIES, [
    "mechanics",
    "self-description",
    "lifecycle",
    "documentation",
  ]);
});
