import type { RedactionResult } from "./types.js";

const REDACTED = "[REDACTED]";
const SECRET_KEY =
  /^(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password|passwd|private[_-]?key|secret)$/iu;
const INLINE_PATTERNS: readonly {
  readonly category: string;
  readonly pattern: RegExp;
}[] = [
  {
    category: "private_key",
    pattern:
      /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/gu,
  },
  {
    category: "aws_access_key",
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/gu,
  },
  {
    category: "bearer_token",
    pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b/giu,
  },
  {
    category: "credential_assignment",
    pattern:
      /\b(api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password|passwd|secret)\b(\s*[:=]\s*)["']?[^\s,"']{6,}/giu,
  },
];

export function redactText(input: string): RedactionResult<string> {
  let value = input;
  const categories = new Set<string>();
  for (const { category, pattern } of INLINE_PATTERNS) {
    pattern.lastIndex = 0;
    if (!pattern.test(value)) continue;
    categories.add(category);
    pattern.lastIndex = 0;
    value = value.replace(
      pattern,
      (match, name: string | undefined, joiner: string | undefined) =>
        category === "credential_assignment" && name && joiner
          ? `${name}${joiner}${REDACTED}`
          : REDACTED,
    );
  }
  return {
    value,
    state: categories.size === 0 ? "none" : "redacted",
    categories: [...categories].sort(),
  };
}

export function redactStructured<T>(input: T): RedactionResult<T> {
  const categories = new Set<string>();
  const value = visit(input, undefined) as T;
  return {
    value,
    state: categories.size === 0 ? "none" : "redacted",
    categories: [...categories].sort(),
  };

  function visit(current: unknown, key: string | undefined): unknown {
    if (key && SECRET_KEY.test(key)) {
      categories.add("secret_field");
      return REDACTED;
    }
    if (typeof current === "string") {
      const result = redactText(current);
      for (const category of result.categories) categories.add(category);
      return result.value;
    }
    if (Array.isArray(current)) {
      return current.map((item) => visit(item, undefined));
    }
    if (typeof current !== "object" || current === null) return current;
    return Object.fromEntries(
      Object.entries(current).map(([nestedKey, nested]) => [
        nestedKey,
        visit(nested, nestedKey),
      ]),
    );
  }
}
