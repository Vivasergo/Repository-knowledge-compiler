import { lstat, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createSelfDescriptionManifest, getSelfDescriptionModule, isRkcAction, isRkcHelpTopic, } from "./catalog.js";
export async function resolveRkcHelp(request) {
    const manifest = createSelfDescriptionManifest(request.distribution_version);
    if (request.action !== undefined) {
        if (!isRkcAction(request.action)) {
            throw new Error(`Unsupported RKC action route: ${request.action}.`);
        }
        return {
            mode: "route",
            manifest,
            module: getSelfDescriptionModule("operations"),
            route: {
                action: request.action,
                skill: `rkc-${request.action}`,
                performed: false,
            },
        };
    }
    const topic = resolveTopic(request.topic);
    return {
        mode: "explanation",
        manifest,
        module: getSelfDescriptionModule(topic),
        ...(topic === "project_status"
            ? {
                project_context: request.repository_root === undefined
                    ? unavailableProjectContext()
                    : await inspectProjectHelpContext(request.repository_root),
            }
            : {}),
    };
}
export async function inspectProjectHelpContext(repositoryRoot) {
    const root = resolve(repositoryRoot);
    try {
        if (!(await lstat(root)).isDirectory())
            return unavailableProjectContext(root);
    }
    catch {
        return unavailableProjectContext(root);
    }
    const agents = await readOptionalMarkdown(join(root, "AGENTS.md"));
    const router = await readOptionalMarkdown(join(root, "docs", "ai", "README.md"));
    const entryPoints = [
        ...(agents.status === "present" ? ["AGENTS.md"] : []),
        ...(router.status === "present" ? ["docs/ai/README.md"] : []),
    ];
    const state = agents.status === "unavailable" || router.status === "unavailable"
        ? "inaccessible"
        : agents.status === "missing" && router.status === "missing"
            ? "absent"
            : agents.status === "missing" ||
                (router.status === "missing" &&
                    agents.content?.includes("docs/ai/README.md"))
                ? "incomplete"
                : "present";
    const revision = router.content?.match(/^Verified source revision: `([a-fA-F0-9]{40}|[a-fA-F0-9]{64})`\s*$/mu)?.[1];
    return {
        repository_root: root,
        state,
        entry_points: entryPoints,
        ...(revision === undefined ? {} : { last_verified_revision: revision }),
        evidence: { agents: agents.status, router: router.status },
    };
}
async function readOptionalMarkdown(path) {
    try {
        if (!(await lstat(path)).isFile())
            return { status: "unavailable" };
        return { status: "present", content: await readFile(path, "utf8") };
    }
    catch (error) {
        if (typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "ENOENT") {
            return { status: "missing" };
        }
        return { status: "unavailable" };
    }
}
function resolveTopic(topic) {
    if (topic === undefined)
        return "overview";
    if (!isRkcHelpTopic(topic)) {
        throw new Error(`Unsupported RKC help topic: ${topic}.`);
    }
    return topic;
}
function unavailableProjectContext(repositoryRoot = "") {
    return {
        repository_root: repositoryRoot,
        state: "inaccessible",
        entry_points: [],
        evidence: { agents: "unavailable", router: "unavailable" },
    };
}
