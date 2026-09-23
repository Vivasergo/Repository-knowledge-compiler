export const CORE_FOUNDATION_BOUNDARIES = [
  "mechanics",
  "self-description",
  "lifecycle",
  "documentation",
] as const;

export * from "./documentation/index.js";
export * from "./mechanics/index.js";
export * from "./lifecycle/index.js";
export * from "./self-description/index.js";
