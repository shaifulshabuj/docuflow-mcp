# Architecture & Design Decisions

## Bilingual Ingestion Pipeline

**Context**
During the ingestion process, `docuflow` parses markdown documents into Wiki pages for structured storage and cross-referencing. When ingesting documents in non-English languages (specifically Japanese), the resulting Wiki pages may not be fully optimized for lexical search implementations like FTS5, which typically perform better with English text or require specific tokenizers for CJK languages.

**Decision**
We implemented a bilingual-at-ingestion mechanism for Japanese source documents. When Japanese kana or CJK ideographs are detected during `ingestSource`, a local translation adapter runs before extraction. The generated synthesis page stores both the English translation and the original Japanese, and all generated pages are marked with `bilingual` and `translated` tags.

To maintain strict data confidentiality and avoid reliance on external services, DocuFlow accepts an injected on-prem translator (for example, a local LLM wrapper). A deterministic offline stub is used when no adapter is supplied; it preserves existing Latin product names and code identifiers, while full natural-language English recall requires the local translator.

**Consequences**
- English lexical search (including FTS5-backed indexing) can index and return translated concepts because extraction runs against the English representation.
- No confidential document content is leaked to external cloud providers during the ingestion process.
- The Wiki page format incorporates dual-language (bilingual) structures cleanly, maintaining the original document context while adding searchable metadata.
