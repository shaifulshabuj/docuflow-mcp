import { ENTITY_STOPLIST } from "./extractor-stoplist";

export interface EntityCandidate {
  name: string;
  type: "entity" | "concept" | "person" | "tool" | "pattern";
  /** How the candidate was found: from a heading or from bold prose text. */
  source: "heading" | "bold";
  /** Lines of surrounding context (the paragraph that contained this candidate). */
  context: string;
}

type RuleResult = { ok: true } | { ok: false; reason: string };

/**
 * Rule 1 — Stop-list rejection (fast path)
 * Candidate's normalized form must not be a generic/meaningless term.
 */
function ruleStopList(c: EntityCandidate): RuleResult {
  const normalized = c.name.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "");
  if (ENTITY_STOPLIST.has(normalized)) {
    return { ok: false, reason: `"${c.name}" is a generic stop-list term` };
  }
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length === 1 && ENTITY_STOPLIST.has(words[0]!)) {
    return { ok: false, reason: `"${c.name}" is a generic stop-list term` };
  }
  return { ok: true };
}

/**
 * Rule 2 — No emoji-only or punctuation-only slugs (fast path)
 * Strip emoji; reject if resulting slug is empty or only underscores/dashes.
 */
function ruleNoEmojiOrPunctSlug(c: EntityCandidate): RuleResult {
  const stripped = c.name
    .replace(/[\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}]/gu, "")
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase();
  if (!stripped || /^[_\-]+$/.test(stripped)) {
    return { ok: false, reason: `"${c.name}" produces an empty or punctuation-only slug` };
  }
  return { ok: true };
}

/**
 * Rule 3 — Structural anchor
 * Bold-text candidates are only accepted when they sit inside a meaningful
 * structural paragraph (not a bare bullet point with no prose).
 * Heading candidates always pass this rule.
 */
function ruleStructuralAnchor(c: EntityCandidate): RuleResult {
  if (c.source === "heading") return { ok: true };
  const stripped = c.context.replace(/^\s*[-*+]\s+/, "").trim();
  const wordCount = stripped.split(/\s+/).filter(Boolean).length;
  if (wordCount < 4) {
    return { ok: false, reason: "bold text in bare bullet with no sentence context" };
  }
  return { ok: true };
}

/**
 * Rule 4 — Minimum token signal
 * Must be ≥2 words, OR ≥1 word with a non-sentence-start capital (camelCase/PascalCase),
 * OR contain a code-like separator (_, -, (), ::, .).
 * Heading candidates are exempt — structural position grants authority.
 */
function ruleMinimumTokenSignal(c: EntityCandidate): RuleResult {
  if (c.source === "heading") return { ok: true };
  const name = c.name.trim();
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return { ok: true };
  const word = words[0] ?? "";
  const hasInternalCap = /(?<!^)[A-Z]/.test(word);
  const hasCodeSeparator = /[_\-().::]/.test(word);
  if (hasInternalCap || hasCodeSeparator) return { ok: true };
  return { ok: false, reason: "single generic word with no distinguishing signal" };
}

/**
 * Rule 5 — Context requirement
 * Bold text must have at least 1 sentence of real context (≥6 words).
 * Heading candidates are exempt.
 */
function ruleContextRequirement(c: EntityCandidate): RuleResult {
  if (c.source === "heading") return { ok: true };
  const sentences = c.context.split(/[.!?]+/).filter((s) => s.trim().split(/\s+/).length >= 6);
  if (sentences.length === 0) {
    return { ok: false, reason: "no surrounding sentence context (≥6 words) found" };
  }
  return { ok: true };
}

const RULES: Array<(c: EntityCandidate) => RuleResult> = [
  ruleStopList,
  ruleNoEmojiOrPunctSlug,
  ruleStructuralAnchor,
  ruleMinimumTokenSignal,
  ruleContextRequirement,
];

/**
 * Run all entity quality rules against a candidate.
 * Returns { ok: true } if the candidate passes all rules,
 * or { ok: false, reason } for the first rule that rejects it.
 */
export function passesEntityRules(candidate: EntityCandidate): RuleResult {
  for (const rule of RULES) {
    const result = rule(candidate);
    if (!result.ok) return result;
  }
  return { ok: true };
}
