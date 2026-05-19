# Migrating to DocuFlow v1.7

> *"Every tool built to manage work eventually becomes work itself."*
> — [LinkedIn post on the Tracker's Paradox](https://www.linkedin.com/posts/shaifulshabuj_softwareengineering-productdevelopment-softwarearchitecture-ugcPost-7461730048954474496-ASZF)

## Why this is happening

By v1.5.2, DocuFlow had drifted into the very anti-pattern that post warns about. The repo had 11 CLI subcommands, 15 MCP tools, a watch daemon, an AI-bridge selector, a UI, and a REST API. The value-out promise — *intent in, value out* — was buried under operational scaffolding. v1.6.0 restored the signal by tightening the entity extractor (256 → 96 pages on the dogfood, 76 unit tests). v1.7 completes the surface reset: the core workflow is now front-and-centre, and everything else is clearly labelled Advanced.

The test every PR now answers in one sentence: *"Does this make the user's problem easier, not our system easier to build?"*

## What changed in v1.6 (quality pass)

Tightened the entity extractor with six rules (stop-list, no emoji/punct slugs, structural anchors, min token signal, context requirement, section-heading noise). Empirical result on this repo: 256 → 96 entity pages, 0 single-word generics remaining. Added 76 vitest unit tests. Zero surface changes — every command still worked.

## What changes in v1.7 (this milestone)

- **New core CLI commands**: `docuflow query "<question>"` and `docuflow ingest <file>` make the wiki's value-in and value-out pipes directly shell-accessible.
- **Help screen reorganised**: `docuflow --help` shows 5 core commands; `docuflow advanced --help` shows the 9 operational commands one level deeper.
- **Every existing command still works at its old path.** The `advanced` prefix is optional everywhere.

## Command mapping

| Old path | New preferred path | Still works as-is? |
|---|---|---|
| `docuflow init` | `docuflow init` | yes (core) |
| `docuflow status` | `docuflow status` | yes (core) |
| `docuflow rewiki` | `docuflow rewiki` | yes (core) |
| `docuflow watch` | `docuflow advanced watch` | yes, indefinitely |
| `docuflow sync` | `docuflow advanced sync` | yes |
| `docuflow ui` | `docuflow advanced ui` | yes |
| `docuflow start` | `docuflow advanced ui` (alias) | yes |
| `docuflow review` | `docuflow advanced review` | yes |
| `docuflow recent` | `docuflow advanced recent` | yes |
| `docuflow suggest` | `docuflow advanced suggest` | yes |
| `docuflow update` | `docuflow advanced update` | yes |
| `docuflow upgrade` | `docuflow advanced update` (alias) | yes |
| *(new)* | `docuflow query "<question>"` | new in v1.7 |
| *(new)* | `docuflow ingest <file>` | new in v1.7 |

**Every old command still works through v2.x.** The `advanced` prefix is a label, not a barrier.

## CLAUDE.md auto-generation

`docuflow init` now writes a CLAUDE.md that features the 4 core MCP tools (`query_wiki`, `ingest_source`, `wiki_search`, `read_module`) and demotes the other 11 to an "Advanced" section. The server still registers all 15 — the change is doc-only. Existing agents using `lint_wiki`, `save_answer_as_page`, etc. continue to work unchanged.

Re-running `docuflow init` on a project with an existing CLAUDE.md is now idempotent: the generator replaces only the content between `<!-- BEGIN DOCUFLOW -->` / `<!-- END DOCUFLOW -->` markers, leaving surrounding content untouched.

## What's coming in v2.0 (package split)

`@doquflow/core` (irreducible MCP server) and `@doquflow/studio` (UI, REST API, daemons). `@doquflow/cli` stays as a meta-package depending on both — the existing install path (`npm install -g @doquflow/cli`) is unchanged. The split makes it possible to deploy a lean server-only instance without pulling in the full operational surface.

## What's coming in v3.0 (evidence-based pruning)

If studio features show real usage, they earned their keep. If not, they retire. No decisions will be made before there's evidence.

## The "no" list until v2.0

Every PR has to answer the question above in one sentence. Until v2.0:

- ❌ No new MCP tools
- ❌ No new CLI subcommands
- ❌ No new UI views
- ❌ No new integrations
- ✅ Extractor precision, schema authoring UX, query-result quality, value-out docs

## Questions?

Open an issue on the repo. The umbrella tracking this whole reset is [#1](https://github.com/shaifulshabuj/docuflow-mcp/issues/1).
