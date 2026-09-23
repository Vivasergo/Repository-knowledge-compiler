#!/usr/bin/env node

import process from "node:process";
import { createInterface } from "node:readline/promises";

import {
  install,
  installedVersion,
  selfUpdate,
  TEST_PAUSE_AFTER_PREPARED_VARIABLE,
  TEST_USER_HOME_VARIABLE,
  uninstall,
  type UninstallResult,
} from "./lifecycle.js";
import { doctor, type DoctorResult } from "./maintenance.js";

const [command, ...arguments_] = process.argv.slice(2);
const testUserHome = process.env[TEST_USER_HOME_VARIABLE];
const testPauseAfterPreparedFile =
  process.env[TEST_PAUSE_AFTER_PREPARED_VARIABLE];

try {
  switch (command) {
    case "install": {
      requireNoArguments(arguments_);
      const result = await install({
        ...(testUserHome === undefined ? {} : { testUserHome }),
        ...(testPauseAfterPreparedFile === undefined
          ? {}
          : { testPauseAfterPreparedFile }),
      });
      process.stdout.write(
        `RKC ${result.active_version} ${result.repeated ? "verified" : "installed"}.\n`,
      );
      process.stdout.write(`Core: ${result.version_path}\n`);
      process.stdout.write(`Skills: ${result.skills.join(", ")}\n`);
      break;
    }
    case "version": {
      requireNoArguments(arguments_);
      process.stdout.write(`${await installedVersion(testUserHome)}\n`);
      break;
    }
    case "doctor": {
      printDoctorResult(
        await doctor({
          mode: parseDoctorMode(arguments_),
          ...(testUserHome === undefined ? {} : { testUserHome }),
        }),
      );
      break;
    }
    case "self-update": {
      requireNoArguments(arguments_);
      const result = await selfUpdate({
        ...(testUserHome === undefined ? {} : { testUserHome }),
      });
      process.stdout.write(
        `RKC ${result.active_version} is active after explicit self-update.\n`,
      );
      process.stdout.write(
        `Retained: ${result.retained_versions.join(", ")}\n`,
      );
      process.stdout.write(
        `Removed: ${result.removed_versions.length === 0 ? "none" : result.removed_versions.join(", ")}\n`,
      );
      break;
    }
    case "uninstall": {
      const flags = parseUninstallFlags(arguments_);
      if (flags.dryRun) {
        printUninstallResult(
          await uninstall({
            dryRun: true,
            ...(testUserHome === undefined ? {} : { testUserHome }),
          }),
        );
        break;
      }

      let confirmed = flags.yes;
      if (!confirmed) {
        const preview = await uninstall({
          ...(testUserHome === undefined ? {} : { testUserHome }),
        });
        printUninstallResult(preview);
        if (!process.stdin.isTTY || !process.stdout.isTTY) {
          process.stderr.write(
            "Uninstall was not confirmed. Rerun with --yes for deliberate non-interactive removal.\n",
          );
          process.exitCode = 2;
          break;
        }
        const prompt = createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        try {
          confirmed =
            (await prompt.question(
              "Delete the complete RKC runtime and all four installed skills? Type yes to continue: ",
            )) === "yes";
        } finally {
          prompt.close();
        }
        if (!confirmed) {
          process.stderr.write("Uninstall cancelled; nothing was removed.\n");
          process.exitCode = 2;
          break;
        }
      }

      const result = await uninstall({
        confirmed: true,
        ...(testUserHome === undefined ? {} : { testUserHome }),
      });
      printUninstallResult(result);
      if (!result.success) process.exitCode = 1;
      break;
    }
    default:
      process.stderr.write(
        "Usage: rkc <install|self-update|doctor|version|uninstall>\n",
      );
      process.exitCode = 2;
  }
} catch (error) {
  process.stderr.write(
    `RKC ${command ?? "command"} failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}

function requireNoArguments(arguments_: string[]): void {
  if (arguments_.length > 0) {
    throw new Error("This command does not accept arguments.");
  }
}

function parseUninstallFlags(arguments_: string[]): {
  dryRun: boolean;
  yes: boolean;
} {
  const allowed = new Set(["--dry-run", "--yes"]);
  for (const argument of arguments_) {
    if (!allowed.has(argument)) {
      throw new Error(`Unknown uninstall option: ${argument}`);
    }
  }
  if (new Set(arguments_).size !== arguments_.length) {
    throw new Error("Uninstall options must not be repeated.");
  }
  return {
    dryRun: arguments_.includes("--dry-run"),
    yes: arguments_.includes("--yes"),
  };
}

function printUninstallResult(result: UninstallResult): void {
  const prefix = result.dry_run
    ? "would inspect"
    : result.confirmed
      ? "uninstall"
      : "confirmation target";
  process.stdout.write(`RKC ${prefix}:\n`);
  for (const target of result.targets) {
    process.stdout.write(
      `- ${target.status}: ${target.path}${target.error === undefined ? "" : ` (${target.error})`}\n`,
    );
  }
}

function parseDoctorMode(
  arguments_: string[],
): "cached" | "check" | "enable" | "disable" {
  if (arguments_.length === 0) return "cached";
  if (arguments_.length !== 1) {
    throw new Error("Doctor accepts at most one update-check option.");
  }
  switch (arguments_[0]) {
    case "--check-updates":
      return "check";
    case "--enable-update-checks":
      return "enable";
    case "--disable-update-checks":
      return "disable";
    default:
      throw new Error(`Unknown doctor option: ${arguments_[0]}`);
  }
}

function printDoctorResult(result: DoctorResult): void {
  const update = result.update;
  process.stdout.write(`Installed: ${update.installed_version}\n`);
  process.stdout.write(`Update status: ${update.status}\n`);
  process.stdout.write(
    `Automatic checks: ${update.automatic_enabled ? "enabled" : "disabled"}\n`,
  );
  if (update.latest_version !== undefined) {
    process.stdout.write(`Latest stable: ${update.latest_version}\n`);
  }
  if (update.last_success_at !== undefined) {
    process.stdout.write(`Last successful check: ${update.last_success_at}\n`);
  }
  if (update.failure_category !== undefined) {
    process.stdout.write(`Check failure: ${update.failure_category}\n`);
  }
  if (update.cache_recovered) {
    process.stdout.write("The corrupt update cache was replaced safely.\n");
  }
  if (update.status === "UPDATE_AVAILABLE") {
    process.stdout.write(
      update.major_update
        ? "A major RKC update is available; review compatibility and migration guidance before updating.\n"
        : "An RKC update is available.\n",
    );
    process.stdout.write(
      "No update was installed. Run: npx repository-knowledge-compiler@latest self-update\n",
    );
  }
}
