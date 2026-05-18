import { passesEntityRules, type EntityCandidate } from "../extractor-rules";

function ok(c: Partial<EntityCandidate> & { name: string }): EntityCandidate {
  return {
    type: "entity",
    source: "bold",
    context: "This is a full sentence that provides enough context for the candidate.",
    ...c,
  };
}

describe("passesEntityRules", () => {
  // ── Rule 1: Structural anchor ──────────────────────────────────────────────

  describe("Rule 1 — structural anchor", () => {
    it("accepts heading candidates regardless of context", () => {
      const c = ok({ name: "Foo", source: "heading", context: "" });
      expect(passesEntityRules(c).ok).toBe(true);
    });

    it("rejects bold text in bare bullet with no sentence context", () => {
      const c = ok({ name: "FooBar", source: "bold", context: "- FooBar" });
      const r = passesEntityRules(c);
      expect(r.ok).toBe(false);
      expect((r as any).reason).toMatch(/bare bullet/);
    });

    it("accepts bold text with surrounding prose (≥4 words in context)", () => {
      const c = ok({ name: "FooBar", source: "bold", context: "FooBar is the main orchestrator for routing decisions." });
      expect(passesEntityRules(c).ok).toBe(true);
    });
  });

  // ── Rule 2: Minimum token signal ──────────────────────────────────────────

  describe("Rule 2 — minimum token signal", () => {
    it("accepts multi-word names", () => {
      const c = ok({ name: "Entity Extractor", source: "heading" });
      expect(passesEntityRules(c).ok).toBe(true);
    });

    it("accepts camelCase single word", () => {
      const c = ok({ name: "WikiPage", source: "heading" });
      expect(passesEntityRules(c).ok).toBe(true);
    });

    it("accepts identifier with underscore", () => {
      const c = ok({ name: "ingest_source", source: "heading" });
      expect(passesEntityRules(c).ok).toBe(true);
    });

    it("rejects single generic lowercase word", () => {
      const c = ok({ name: "server", source: "bold", context: "The server handles all requests coming in from the agent." });
      const r = passesEntityRules(c);
      expect(r.ok).toBe(false);
      expect((r as any).reason).toMatch(/single generic word/);
    });
  });

  // ── Rule 3: Stop-list ──────────────────────────────────────────────────────

  describe("Rule 3 — stop-list rejection", () => {
    it("rejects 'true'", () => {
      const c = ok({ name: "true", source: "heading" });
      const r = passesEntityRules(c);
      expect(r.ok).toBe(false);
      expect((r as any).reason).toMatch(/stop-list/);
    });

    it("rejects 'any'", () => {
      const c = ok({ name: "any", source: "heading" });
      expect(passesEntityRules(c).ok).toBe(false);
    });

    it("rejects 'todo'", () => {
      const c = ok({ name: "todo", source: "heading" });
      expect(passesEntityRules(c).ok).toBe(false);
    });

    it("accepts a meaningful domain term", () => {
      const c = ok({ name: "WikiCategory", source: "heading" });
      expect(passesEntityRules(c).ok).toBe(true);
    });
  });

  // ── Rule 4: No emoji/punct-only slug ──────────────────────────────────────

  describe("Rule 4 — no emoji or punctuation-only slugs", () => {
    it("rejects emoji-only name", () => {
      const c = ok({ name: "🚀", source: "heading" });
      const r = passesEntityRules(c);
      expect(r.ok).toBe(false);
      expect((r as any).reason).toMatch(/slug/);
    });

    it("accepts name that has text after emoji", () => {
      const c = ok({ name: "DocuFlow MCP", source: "heading" });
      expect(passesEntityRules(c).ok).toBe(true);
    });
  });

  // ── Rule 5: Context requirement ────────────────────────────────────────────

  describe("Rule 5 — context requirement", () => {
    it("skips context check for headings", () => {
      const c = ok({ name: "WikiEngine", source: "heading", context: "" });
      expect(passesEntityRules(c).ok).toBe(true);
    });

    it("rejects bold text with no long sentence in context", () => {
      const c = ok({ name: "DocuFlow MCP", source: "bold", context: "DocuFlow MCP. Short." });
      const r = passesEntityRules(c);
      expect(r.ok).toBe(false);
      expect((r as any).reason).toMatch(/context/);
    });

    it("accepts bold text with a proper sentence in context", () => {
      const c = ok({
        name: "DocuFlow MCP",
        source: "bold",
        context: "DocuFlow MCP is the primary server-side component that handles all wiki management operations.",
      });
      expect(passesEntityRules(c).ok).toBe(true);
    });
  });

  // ── Garbage patterns from real noise ──────────────────────────────────────

  describe("known garbage patterns", () => {
    const garbage = [
      { name: "any", source: "heading" as const },
      { name: "add", source: "heading" as const },
      { name: "true", source: "bold" as const },
      { name: "false", source: "bold" as const },
      { name: "done", source: "heading" as const },
      { name: "allowed", source: "bold" as const },
    ];

    for (const g of garbage) {
      it(`rejects "${g.name}"`, () => {
        const c = ok(g);
        expect(passesEntityRules(c).ok).toBe(false);
      });
    }
  });

  // ── Legitimate entity patterns ─────────────────────────────────────────────

  describe("legitimate entities pass", () => {
    const good = [
      { name: "WikiCategory", source: "heading" as const },
      { name: "ingest_source", source: "heading" as const },
      { name: "MCP Server", source: "heading" as const },
      { name: "DocuFlow", source: "bold" as const, context: "DocuFlow is the core AI documentation assistant that powers all wiki operations in the repository." },
      { name: "LLM Wiki Pattern", source: "heading" as const },
    ];

    for (const g of good) {
      it(`accepts "${g.name}"`, () => {
        const c = ok(g);
        expect(passesEntityRules(c).ok).toBe(true);
      });
    }
  });
});
