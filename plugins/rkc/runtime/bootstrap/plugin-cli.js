import { lstat, mkdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { BOOTSTRAP_PACKAGE_NAME, FOUNDATION_VERSION } from "./identity.js";
import { resolveUserHome, TEST_USER_HOME_VARIABLE } from "./lifecycle.js";
import { runResearchNotesCommand } from "./research-workspace.js";
// Runtime of the generated Claude Code plugin (plugins/rkc). It is not part of
// the npm package: scripts/assemble-claude-plugin.mjs copies the emitted file
// to plugins/rkc/runtime/bootstrap/ next to the compiled core in runtime/core/.
export const PLUGIN_NAME = "rkc";
export const PLUGIN_SKILLS = [
    "help",
    "create-docs",
    "update-docs",
    "audit-docs",
];
export const PLUGIN_CORE_PACKAGE = "runtime/core";
export const PLUGIN_ENTRY = "scripts/rkc.mjs";
export const PLUGIN_DOCUMENTATION_MASTER_PROMPT = "documentation/RKC-Documentation-Master-Prompt.md";
export const PLUGIN_SELF_DESCRIPTION_MANIFEST = "self-description-manifest.json";
const usage = "Usage: rkc.mjs <check-docs <repository-root> <relative-path>... | research-notes <start|finish> ... | version>";
// Exit codes: 0 success, 1 Markdown issues found, 2 usage, runtime or
// integrity failure.
export async function runPluginCli(options) {
    const [command, ...arguments_] = options.argv;
    const pluginRoot = resolve(options.pluginRoot);
    const testUserHome = (options.env ?? process.env)[TEST_USER_HOME_VARIABLE];
    try {
        switch (command) {
            case "check-docs": {
                const [repositoryRoot, ...paths] = arguments_;
                if (repositoryRoot === undefined || paths.length === 0) {
                    throw new Error("Expected check-docs <repository-root> <relative-path>...");
                }
                if (!(await lstat(repositoryRoot)).isDirectory()) {
                    throw new Error(`Not a repository directory: ${repositoryRoot}`);
                }
                const core = await (options.loadCore ?? loadPluginCore)(pluginRoot);
                const result = await core.checkMarkdownDocumentation(repositoryRoot, paths);
                options.io.stdout(`${JSON.stringify(result, null, 2)}\n`);
                return result.valid ? 0 : 1;
            }
            case "research-notes": {
                options.io.stdout(`${await runResearchNotesCommand(arguments_, async () => {
                    const rkcRoot = join(await resolveUserHome(testUserHome), ".rkc-plugin");
                    await mkdir(rkcRoot, { recursive: true, mode: 0o700 });
                    return rkcRoot;
                })}\n`);
                return 0;
            }
            case "version": {
                if (arguments_.length > 0) {
                    throw new Error("This command does not accept arguments.");
                }
                const identity = await verifyPluginIdentity(pluginRoot);
                const userHome = await resolveUserHome(testUserHome);
                options.io.stdout([
                    `RKC ${identity.version} (Claude Code plugin)`,
                    `Prompt: ${identity.documentation_prompt_version}`,
                    `Plugin root: ${identity.plugin_root}`,
                    `Research notes: ${join(userHome, ".rkc-plugin", "temp")}`,
                    "",
                ].join("\n"));
                return 0;
            }
            default:
                options.io.stderr(`${usage}\n`);
                return 2;
        }
    }
    catch (error) {
        options.io.stderr(`${error instanceof Error ? error.message : String(error)}\n`);
        return 2;
    }
}
// Mirrors validateInstalledVersion for the npm installation: every
// version-bearing file in the plugin must describe the same RKC release.
export async function verifyPluginIdentity(pluginRoot) {
    const root = resolve(pluginRoot);
    const plugin = await readJson(join(root, ".claude-plugin", "plugin.json"));
    if (plugin.name !== PLUGIN_NAME || plugin.version !== FOUNDATION_VERSION) {
        throw new Error(`RKC plugin manifest does not match runtime ${FOUNDATION_VERSION}.`);
    }
    const manifest = await readJson(join(root, "core-manifest.json"));
    const promptVersion = manifest.documentation_prompt_version;
    if (manifest.format_version !== 1 ||
        manifest.package_name !== BOOTSTRAP_PACKAGE_NAME ||
        manifest.distribution !== "claude-code-plugin" ||
        manifest.version !== FOUNDATION_VERSION ||
        manifest.core_package !== PLUGIN_CORE_PACKAGE ||
        manifest.plugin_entry !== PLUGIN_ENTRY ||
        manifest.self_description_manifest !== PLUGIN_SELF_DESCRIPTION_MANIFEST ||
        manifest.documentation_master_prompt !==
            PLUGIN_DOCUMENTATION_MASTER_PROMPT ||
        typeof promptVersion !== "string" ||
        !/^RKC-DOCS-CREATE-\d+\.\d+$/u.test(promptVersion)) {
        throw new Error("RKC plugin core manifest is incompatible.");
    }
    const prompt = await readFile(join(root, PLUGIN_DOCUMENTATION_MASTER_PROMPT), "utf8");
    if (!prompt.split(/\r?\n/u).includes(`Prompt version: ${promptVersion}`)) {
        throw new Error(`RKC master prompt does not declare ${promptVersion} for this plugin.`);
    }
    const selfDescription = await readJson(join(root, PLUGIN_SELF_DESCRIPTION_MANIFEST));
    if (selfDescription.format_version !== 1 ||
        selfDescription.distribution_version !== FOUNDATION_VERSION ||
        selfDescription.documentation_prompt_version !== promptVersion ||
        selfDescription.provider_specific_instruction_files !== false) {
        throw new Error("RKC plugin self-description is incompatible.");
    }
    for (const skill of PLUGIN_SKILLS) {
        if (!(await lstat(join(root, "skills", skill, "SKILL.md"))).isFile()) {
            throw new Error(`RKC plugin skill is missing: ${skill}`);
        }
    }
    return {
        version: FOUNDATION_VERSION,
        documentation_prompt_version: promptVersion,
        plugin_root: root,
    };
}
async function loadPluginCore(pluginRoot) {
    const entry = join(pluginRoot, PLUGIN_CORE_PACKAGE, "index.js");
    const loaded = await import(pathToFileURL(entry).href);
    if (typeof loaded !== "object" ||
        loaded === null ||
        !("checkMarkdownDocumentation" in loaded) ||
        typeof loaded.checkMarkdownDocumentation !== "function") {
        throw new Error("The RKC plugin core has no Markdown check capability.");
    }
    return {
        checkMarkdownDocumentation: loaded.checkMarkdownDocumentation,
    };
}
async function readJson(path) {
    const value = JSON.parse(await readFile(path, "utf8"));
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error(`Expected a JSON object: ${path}`);
    }
    return value;
}
