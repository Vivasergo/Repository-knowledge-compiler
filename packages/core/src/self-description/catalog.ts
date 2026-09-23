import { RKC_DOCUMENTATION_PROMPT_VERSION } from "../documentation/prompt-version.js";

export const RKC_HELP_TOPICS = [
  "overview",
  "architecture",
  "operations",
  "artifacts",
  "quality",
  "safety",
  "installation",
  "updates",
  "hosts",
  "troubleshooting",
  "project_status",
] as const;

export type RkcHelpTopic = (typeof RKC_HELP_TOPICS)[number];

export const RKC_ACTIONS = [
  "create-docs",
  "update-docs",
  "audit-docs",
] as const;
export type RkcAction = (typeof RKC_ACTIONS)[number];

export interface SelfDescriptionManifest {
  readonly format_version: 1;
  readonly product: "Repository Knowledge Compiler";
  readonly distribution_version: string;
  readonly documentation_prompt_version: string;
  readonly skills: readonly string[];
  readonly supported_hosts: readonly {
    readonly id: "codex-vscode" | "github-copilot-vscode";
    readonly status: "supported_after_conformance";
  }[];
  readonly capabilities: readonly string[];
  readonly topics: readonly RkcHelpTopic[];
  readonly provider_specific_instruction_files: false;
}

export interface SelfDescriptionModule {
  readonly topic: RkcHelpTopic;
  readonly title: string;
  readonly summary: string;
  readonly facts: readonly string[];
  readonly related_skills: readonly string[];
}

const skills = [
  "rkc-help",
  "rkc-create-docs",
  "rkc-update-docs",
  "rkc-audit-docs",
] as const;

const modules: Readonly<Record<RkcHelpTopic, SelfDescriptionModule>> = {
  overview: module(
    "overview",
    "RKC overview",
    "RKC creates and maintains task-routed, evidence-backed Markdown to help coding agents find relevant repository knowledge without re-reading the entire codebase for every task.",
    [
      "RKC is provider-neutral and repository-agnostic.",
      "RKC aims to reduce future agent context and token use, speed up task navigation, and improve the accuracy of changes.",
      "Documentation prioritizes routing, guardrails, hidden contracts, risky flows, and verified repository facts.",
      "RKC does not edit product code or turn repository documentation into a generated encyclopedia.",
    ],
    ["rkc-help", "rkc-create-docs"],
  ),
  architecture: module(
    "architecture",
    "Architecture",
    "A versioned per-user runtime supplies the protocol and safety mechanics; thin skills select operations.",
    [
      "Target repositories need no RKC project-local state; the installed runtime remains user-scoped.",
      "Permanent repository knowledge remains in Markdown.",
      "Root AGENTS.md is the mandatory provider-neutral entry point for documentation created by RKC.",
    ],
    ["rkc-help"],
  ),
  operations: module(
    "operations",
    "Operations",
    "Four skills separate help, documentation creation, focused maintenance, and audit.",
    [
      "rkc-create-docs investigates the repository, proposes a documentation plan, and writes only after owner approval.",
      "rkc-update-docs performs focused maintenance; rkc-audit-docs reports drift and corrects documentation only when authorized.",
    ],
    skills,
  ),
  artifacts: module(
    "artifacts",
    "Artifacts and documentation",
    "The primary product artifact is a layered Markdown documentation set stored in the target repository.",
    [
      "AGENTS.md is the compact entry router and docs/ai/README.md may provide deeper task routing.",
      "Document count follows repository complexity rather than a fixed quota.",
      "Existing documentation is preserved and reconciled within the approved scope.",
    ],
    ["rkc-create-docs", "rkc-update-docs", "rkc-audit-docs"],
  ),
  quality: module(
    "quality",
    "Quality and terminal status",
    "RKC separates verified facts from risks, external dependencies, legacy behavior, and items requiring verification.",
    [
      "High-impact claims require direct repository evidence.",
      "Mechanical checks cover paths, links, language, required sections, and scope; the host agent checks meaning against repository evidence.",
      "Completion is bounded by the requested operation rather than an unlimited improvement loop.",
    ],
    ["rkc-audit-docs", "rkc-help"],
  ),
  safety: module(
    "safety",
    "Safety model",
    "RKC is read-oriented by default and limits permanent mutation to authorized documentation behavior.",
    [
      "Application source, dependencies, CI/CD, secrets, and production configuration remain read-only during documentation operations.",
      "Project code is not executed without separate authorization.",
      "Incidental code risks are reported rather than fixed automatically.",
    ],
    ["rkc-audit-docs", "rkc-help"],
  ),
  installation: module(
    "installation",
    "Installation lifecycle",
    "The bootstrap installs one versioned runtime and four skills per user without adding target-project dependencies.",
    [
      "Create Docs can start in any repository without project initialization.",
      "Self-update is explicit and retains the active version plus two usable predecessors.",
      "Confirmed uninstall removes the fixed per-user runtime and managed skill directories while preserving repositories.",
    ],
    ["rkc-create-docs", "rkc-help"],
  ),
  updates: module(
    "updates",
    "Installed-runtime updates",
    "Update discovery is lazy, machine-local, advisory, and separate from repository-documentation updates.",
    [
      "Successful automatic checks use a seven-day cadence; failed checks retry after 24 hours.",
      "Normal help reports cached state; doctor --check-updates performs a fresh diagnostic check.",
      "No discovered update is installed automatically.",
    ],
    ["rkc-help", "rkc-update-docs"],
  ),
  hosts: module(
    "hosts",
    "Host integration",
    "Codex and GitHub Copilot use the same provider-neutral skills and installed protocol.",
    [
      "RKC generates no provider-specific repository instruction files.",
      "The documentation protocol is host-neutral.",
      "Other compatible agents require separate validation before a support claim.",
    ],
    ["rkc-help"],
  ),
  troubleshooting: module(
    "troubleshooting",
    "Troubleshooting",
    "RKC reports missing or inaccessible installation and uncertain repository documentation instead of inventing an answer.",
    [
      "Use rkc version for installed-version evidence.",
      "Use rkc doctor for cached diagnostics or rkc doctor --check-updates for fresh update evidence.",
      "Resolve incompatible installation or ambiguous repository documentation before claiming readiness.",
    ],
    ["rkc-help"],
  ),
  project_status: module(
    "project_status",
    "Current project status",
    "Project answers use the actual repository documentation and its declared verification baseline.",
    [
      "Missing documentation routes call for Create Docs; no project initialization is required.",
      "A missing or unclear verified revision means freshness is unknown.",
      "The canonical Markdown index records verified source provenance and material scope limits.",
    ],
    ["rkc-help", "rkc-create-docs"],
  ),
};

export function createSelfDescriptionManifest(
  distributionVersion: string,
): SelfDescriptionManifest {
  if (
    !/^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/u.test(distributionVersion)
  ) {
    throw new Error("RKC distribution version is not valid SemVer.");
  }
  return {
    format_version: 1,
    product: "Repository Knowledge Compiler",
    distribution_version: distributionVersion,
    documentation_prompt_version: RKC_DOCUMENTATION_PROMPT_VERSION,
    skills,
    supported_hosts: [
      { id: "codex-vscode", status: "supported_after_conformance" },
      {
        id: "github-copilot-vscode",
        status: "supported_after_conformance",
      },
    ],
    capabilities: [
      "evidence_backed_documentation_creation",
      "documentation_maintenance",
      "documentation_audit",
      "read_only_help",
      "installed_runtime_update_discovery",
      "versioned_markdown_documentation_protocol",
    ],
    topics: RKC_HELP_TOPICS,
    provider_specific_instruction_files: false,
  };
}

export function getSelfDescriptionModule(
  topic: RkcHelpTopic,
): SelfDescriptionModule {
  return modules[topic];
}

export function isRkcHelpTopic(value: string): value is RkcHelpTopic {
  return RKC_HELP_TOPICS.includes(value as RkcHelpTopic);
}

export function isRkcAction(value: string): value is RkcAction {
  return RKC_ACTIONS.includes(value as RkcAction);
}

function module(
  topic: RkcHelpTopic,
  title: string,
  summary: string,
  facts: readonly string[],
  relatedSkills: readonly string[],
): SelfDescriptionModule {
  return {
    topic,
    title,
    summary,
    facts,
    related_skills: relatedSkills,
  };
}
