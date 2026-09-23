import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

import { packLocalTarball } from "./local-package.mjs";

const destination = resolve("artifacts", "local-package");
const cache = resolve(".npm-cache", "pack-local");

await rm(destination, { force: true, recursive: true });
await mkdir(destination, { recursive: true });
const packed = await packLocalTarball({ cache, destination });

process.stdout.write(`${packed.tarball}\n`);
