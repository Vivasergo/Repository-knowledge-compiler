import process from "node:process";

import { TEST_USER_HOME_VARIABLE } from "./lifecycle.js";
import {
  finishResearchWorkspace,
  startResearchWorkspace,
} from "./research-workspace.js";

const [operation, first, second, verification, ...extra] =
  process.argv.slice(2);
const testUserHome = process.env[TEST_USER_HOME_VARIABLE];
const context = testUserHome === undefined ? {} : { testUserHome };
try {
  if (operation === "start" && first && second && verification === undefined) {
    process.stdout.write(
      `${await startResearchWorkspace({ repository: first, revision: second, ...context })}\n`,
    );
  } else if (
    operation === "finish" &&
    first &&
    (second === "retain" || second === "delete") &&
    verification === "--verified" &&
    extra.length === 0
  ) {
    process.stdout.write(
      `${await finishResearchWorkspace({ run: first, disposition: second, verified: true, ...context })}\n`,
    );
  } else {
    throw new Error(
      "Expected start <repository> <checked-revision>, or finish <run> retain|delete --verified.",
    );
  }
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 2;
}
