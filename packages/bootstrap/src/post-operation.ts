import process from "node:process";

import { TEST_USER_HOME_VARIABLE } from "./lifecycle.js";
import {
  runPostOperationUpdateDiscovery,
  type AutomaticUpdateOperation,
} from "./maintenance.js";

const operation = process.argv[2];
const operations = new Set<AutomaticUpdateOperation>([
  "rkc-create-docs",
  "rkc-update-docs",
  "rkc-audit-docs",
]);

if (
  operation === undefined ||
  !operations.has(operation as AutomaticUpdateOperation)
) {
  process.stderr.write("Expected a completed RKC documentation operation.\n");
  process.exitCode = 2;
} else {
  const testUserHome = process.env[TEST_USER_HOME_VARIABLE];
  await runPostOperationUpdateDiscovery({
    displayNotice: (notice) => {
      process.stdout.write(`${notice}\n`);
    },
    operation: operation as AutomaticUpdateOperation,
    terminalResultKnown: true,
    ...(testUserHome === undefined ? {} : { testUserHome }),
  });
}
