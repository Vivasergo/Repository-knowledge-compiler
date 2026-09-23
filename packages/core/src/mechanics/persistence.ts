import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { redactStructured, redactText } from "./redaction.js";

export interface AtomicWriteOptions {
  readonly before_commit?: () => void | Promise<void>;
}

export interface AtomicWriteResult {
  readonly path: string;
  readonly redaction_state: "none" | "redacted";
  readonly redaction_categories: readonly string[];
}

export class AtomicWriteError extends Error {
  readonly committed = false;

  constructor(message: string, options: ErrorOptions) {
    super(message, options);
    this.name = "AtomicWriteError";
  }
}

export async function writeJsonAtomically(
  destination: string,
  input: unknown,
  options: AtomicWriteOptions = {},
): Promise<AtomicWriteResult> {
  const redacted = redactStructured(input);
  return writeSerializedAtomically(
    destination,
    `${JSON.stringify(redacted.value, undefined, 2)}\n`,
    redacted.state,
    redacted.categories,
    options,
  );
}

export async function writeTextAtomically(
  destination: string,
  input: string,
  options: AtomicWriteOptions = {},
): Promise<AtomicWriteResult> {
  const redacted = redactText(input);
  return writeSerializedAtomically(
    destination,
    redacted.value,
    redacted.state,
    redacted.categories,
    options,
  );
}

async function writeSerializedAtomically(
  destination: string,
  serialized: string,
  redactionState: AtomicWriteResult["redaction_state"],
  redactionCategories: readonly string[],
  options: AtomicWriteOptions,
): Promise<AtomicWriteResult> {
  const target = resolve(destination);
  const directory = dirname(target);
  await mkdir(directory, { recursive: true });
  const temporary = join(directory, `.${randomUUID()}.rkc-write.tmp`);
  try {
    await writeFile(temporary, serialized, { encoding: "utf8", flag: "wx" });
    await options.before_commit?.();
    await rename(temporary, target);
    return {
      path: target,
      redaction_state: redactionState,
      redaction_categories: redactionCategories,
    };
  } catch (error) {
    await rm(temporary, { force: true });
    throw new AtomicWriteError("Atomic write did not commit.", {
      cause: error,
    });
  }
}
