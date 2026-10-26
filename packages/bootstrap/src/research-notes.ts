import process from "node:process";

import { installedContext, TEST_USER_HOME_VARIABLE } from "./lifecycle.js";
import { runResearchNotesCommand } from "./research-workspace.js";

const testUserHome = process.env[TEST_USER_HOME_VARIABLE];
try {
  process.stdout.write(
    `${await runResearchNotesCommand(
      process.argv.slice(2),
      async () => (await installedContext(testUserHome)).rkc_root,
    )}\n`,
  );
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 2;
}
