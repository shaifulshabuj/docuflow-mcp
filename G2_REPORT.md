# G2 Validation Report (Synthetic Self-Supply)

## 1. Specimens Generated
- `leave_request.py`: Ground truth legacy code. Hardcodes that leave > 3 days requires HR approval.
- `休暇申請.md`: Old Japanese design doc. 
- `customer_manual.md`: Drifted customer manual. Asserts that leave > 5 days requires HR approval.

## 2. Validation Run
- **Environment**: Fixed `better-sqlite3` native module bindings for local test. 
- **Ingestion**: Successfully ran `docuflow ingest` on the specimens. FTS5 SQLite tables and `.docuflow/wiki/` files were successfully generated locally.
- **Search vs Language Barrier**: Lexical search (BM25) via `queryWiki` using English terms like "HR approval" struggles to retrieve the raw Japanese files (`customer_manual.md` and `休暇申請.md`).
- **Code vs Docs Drift**: The code establishes >3 days for HR approval, while the manual documents >5 days. This directly demonstrates the founding principle: **"SOURCE CODE is the ONLY truth"**.

## 3. Conclusions & Next Steps
- As anticipated in the spec forks, **Bilingual-first (translating at ingestion)** is essential for cross-lingual teams, because English-based lexical search falls apart when querying Japanese documents.
- For semantic search via the `context` tool, we must either rely on the translated texts in the Wiki or swap the embeddings model to a multilingual one (e.g., `intfloat/multilingual-e5-small`) instead of `all-MiniLM-L6-v2`.
- The synthetic specimen pipeline successfully reproduces shaiful's 4 workplace pains in a safe, isolated manner without risking real data leakage.
