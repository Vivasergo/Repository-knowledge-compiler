import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { redactStructured, redactText } from "./redaction.js";
export class AtomicWriteError extends Error {
    committed = false;
    constructor(message, options) {
        super(message, options);
        this.name = "AtomicWriteError";
    }
}
export async function writeJsonAtomically(destination, input, options = {}) {
    const redacted = redactStructured(input);
    return writeSerializedAtomically(destination, `${JSON.stringify(redacted.value, undefined, 2)}\n`, redacted.state, redacted.categories, options);
}
export async function writeTextAtomically(destination, input, options = {}) {
    const redacted = redactText(input);
    return writeSerializedAtomically(destination, redacted.value, redacted.state, redacted.categories, options);
}
async function writeSerializedAtomically(destination, serialized, redactionState, redactionCategories, options) {
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
    }
    catch (error) {
        await rm(temporary, { force: true });
        throw new AtomicWriteError("Atomic write did not commit.", {
            cause: error,
        });
    }
}
