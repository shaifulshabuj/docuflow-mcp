# Architecture Decisions

## Semantic Search Model Switch

- **Date**: 2026-07-16
- **Context**: The existing `all-MiniLM-L6-v2` model struggles with bilingual/Japanese lexical search, which necessitated a semantic multilingual fallback.
- **Decision**: Swap the embedding model in `packages/studio/src/tools/context.ts` from `"Xenova/all-MiniLM-L6-v2"` to `"Xenova/multilingual-e5-small"`.
- **Reasoning**: `multilingual-e5-small` supports multilingual queries effectively and satisfies local deployment constraints. Its output dimension is 384, matching `all-MiniLM-L6-v2`, allowing the switch without needing to change the `sqlite-vec` database schema.
- **Implementation Details**: The `e5` family of models requires prefixes to differentiate the query and passage contexts for optimal retrieval quality. We implemented this by prepending `"passage: "` to documents during indexing and `"query: "` to queries at query time in `context.ts`.
