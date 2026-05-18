/**
 * Stop-list for wiki entity extraction.
 * Any candidate whose normalized form appears here is rejected as a generic term
 * that adds noise without semantic value.
 */
export const ENTITY_STOPLIST = new Set([
  // Generic quantifiers / determiners
  "any", "all", "some", "each", "every", "one", "two", "three", "four", "five",
  "none", "both", "either", "other", "another", "several", "many", "few",
  // Conjunctions / prepositions / filler
  "the", "and", "or", "for", "with", "from", "into", "onto", "over", "under",
  "then", "when", "while", "where", "which", "what", "who", "why", "how",
  "that", "this", "these", "those", "here", "there",
  // Modal / auxiliary verbs
  "can", "will", "shall", "would", "could", "should", "must", "may", "might",
  "also", "just", "only", "even", "already", "still", "yet", "more",
  // Boolean / status tokens
  "true", "false", "yes", "no", "ok", "done", "todo",
  // Common vague action words
  "add", "added", "added", "remove", "removed", "update", "updated",
  "change", "changed", "fix", "fixed", "use", "used", "get", "set",
  "allow", "allowed", "block", "blocked", "enable", "enabled", "disable", "disabled",
  // Generic noun noise
  "active", "audience", "behavior", "behaviour", "benefits", "binary",
  "append", "approval", "audit", "auditable",
  "note", "notes", "type", "types", "item", "items", "list", "value", "values",
  "option", "options", "example", "examples", "result", "results",
  "output", "outputs", "input", "inputs", "data", "info", "information",
  "step", "steps", "section", "sections", "part", "parts", "content",
]);
