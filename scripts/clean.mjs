import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const workspaceNames = ["bootstrap", "core"];

await Promise.all(
  workspaceNames.map((name) =>
    rm(resolve("packages", name, "dist"), { force: true, recursive: true }),
  ),
);

await rm(resolve("packages", "bootstrap", "payload"), {
  force: true,
  recursive: true,
});

await rm(resolve("artifacts"), { force: true, recursive: true });
await rm(resolve(".npm-cache"), { force: true, recursive: true });
