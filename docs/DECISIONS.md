# Architecture & Design Decisions

## Bilingual Ingestion Pipeline

**Context**
During the ingestion process, `docuflow` parses markdown documents into Wiki pages for structured storage and cross-referencing. When ingesting documents in non-English languages (specifically Japanese), the resulting Wiki pages may not be fully optimized for lexical search implementations like FTS5, which typically perform better with English text or require specific tokenizers for CJK languages.

**Decision**
We implemented a bilingual-at-ingestion mechanism for Japanese source documents. When a source document containing Japanese characters is detected during the `ingestSource` process, the system generates and prepends a local English translation stub to the content. The generated wiki pages are also marked with `bilingual` and `translated` tags. 

To maintain strict data confidentiality and avoid reliance on external services, this process uses a local stub/LLM approach without any cloud API calls.

**Consequences**
- English lexical search (FTS5) will be able to index and return these documents seamlessly based on the synthesized English text.
- No confidential document content is leaked to external cloud providers during the ingestion process.
- The Wiki page format incorporates dual-language (bilingual) structures cleanly, maintaining the original document context while adding searchable metadata.
