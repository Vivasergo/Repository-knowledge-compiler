import assert from "node:assert/strict";
import test from "node:test";

import { BOOTSTRAP_PACKAGE_NAME, FOUNDATION_VERSION } from "./index.js";

void test("bootstrap identity matches the V2 package contract", () => {
  assert.equal(BOOTSTRAP_PACKAGE_NAME, "repository-knowledge-compiler");
  assert.equal(FOUNDATION_VERSION, "2.0.0");
});
