import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectPath = __dirname;

// Import all tools
const { readModule } = await import("./packages/server/dist/tools/read-module.js");
const { listModules } = await import("./packages/server/dist/tools/list-modules.js");
const { writeSpec } = await import("./packages/server/dist/tools/write-spec.js");
const { readSpecs } = await import("./packages/server/dist/tools/read-specs.js");
const { ingestSource } = await import("./packages/server/dist/tools/ingest-source.js");
const { updateIndex } = await import("./packages/server/dist/tools/update-index.js");
const { listWiki } = await import("./packages/server/dist/tools/list-wiki.js");
const { wikiSearch } = await import("./packages/server/dist/tools/wiki-search.js");
const { queryWiki } = await import("./packages/server/dist/tools/query-wiki.js");
const { lintWiki } = await import("./packages/server/dist/tools/lint-wiki.js");

async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    return true;
  } catch (e) {
    console.error(`✗ ${name}`);
    console.error(`  ${e.message}`);
    return false;
  }
}

async function runTests() {
  console.log("\n════════════════════════════════════════════════");
  console.log("    PHASE 5: DOCUMENTATION + REGRESSION TESTS");
  console.log("════════════════════════════════════════════════\n");

  let passed = 0;
  let total = 0;

  // Test 1: All documentation files exist
  console.log("Phase 5: Documentation Tests\n");

  total++;
  if (
    await test("1. README.md updated with LLM Wiki pattern", async () => {
      const readme = fs.readFileSync(path.join(projectPath, "README.md"), "utf-8");
      assert(readme.includes("LLM Wiki"), "should mention LLM Wiki");
      assert(readme.includes("Phase"), "should reference phases");
      assert(readme.includes("10 total"), "should list all 10 tools");
    })
  ) {
    passed++;
  }

  total++;
  if (
    await test("2. USAGE_EXAMPLES.md exists and is comprehensive", async () => {
      const doc = fs.readFileSync(path.join(projectPath, "docs/USAGE_EXAMPLES.md"), "utf-8");
      assert(doc.includes("ingest_source"), "should have ingest example");
      assert(doc.includes("query_wiki"), "should have query example");
      assert(doc.includes("lint_wiki"), "should have lint example");
      assert(doc.includes("Example"), "should have examples");
    })
  ) {
    passed++;
  }

  total++;
  if (
    await test("3. BEST_PRACTICES.md exists and is detailed", async () => {
      const doc = fs.readFileSync(path.join(projectPath, "docs/BEST_PRACTICES.md"), "utf-8");
      assert(doc.includes("Source Curation"), "should cover source curation");
      assert(doc.includes("Wiki Maintenance"), "should cover maintenance");
      assert(doc.includes("Query Patterns"), "should cover query patterns");
      assert(doc.includes("Health Score"), "should mention health score");
    })
  ) {
    passed++;
  }

  total++;
  if (
    await test("4. EXAMPLE_SCHEMAS.md exists with domain examples", async () => {
      const doc = fs.readFileSync(path.join(projectPath, "docs/EXAMPLE_SCHEMAS.md"), "utf-8");
      assert(doc.includes("Code/Architecture"), "should have architecture schema");
      assert(doc.includes("Research"), "should have research schema");
      assert(doc.includes("Business"), "should have business schema");
      assert(doc.includes("Personal"), "should have personal schema");
    })
  ) {
    passed++;
  }

  total++;
  if (
    await test("5. LLM_WIKI_PATTERN.md exists with deep dive", async () => {
      const doc = fs.readFileSync(path.join(projectPath, "docs/LLM_WIKI_PATTERN.md"), "utf-8");
      assert(doc.includes("Three-Layer Architecture"), "should explain architecture");
      assert(doc.includes("immutable"), "should mention immutability");
      assert(doc.includes("Knowledge Compounds"), "should explain compounding");
    })
  ) {
    passed++;
  }

  console.log("\nPhase 1-4: Regression Tests\n");

  // Test 6-9: Legacy tools
  total++;
  if (
    await test("6. read_module still works", async () => {
      const result = await readModule({ path: "packages/server/src/index.ts" });
      assert(result.path, "should have path");
    })
  ) {
    passed++;
  }

  total++;
  if (
    await test("7. list_modules still works", async () => {
      const result = await listModules({ path: "packages" });
      assert(result.total_files > 0, "should scan files");
    })
  ) {
    passed++;
  }

  total++;
  if (
    await test("8. write_spec still works", async () => {
      const result = await writeSpec({
        project_path: projectPath,
        filename: "phase5_test",
        content: "# Phase 5 Test",
      });
      assert(result.written_to, "should write");
    })
  ) {
    passed++;
  }

  total++;
  if (
    await test("9. read_specs still works", async () => {
      const result = await readSpecs({ project_path: projectPath });
      assert(typeof result.specs === "object", "should return specs");
    })
  ) {
    passed++;
  }

  // Test 10-12: Phase 2 tools
  total++;
  if (
    await test("10. ingest_source still works", async () => {
      const result = await ingestSource({
        project_path: projectPath,
        source_filename: "docuflow_overview.md",
      });
      assert(result.source_id, "should have source_id");
    })
  ) {
    passed++;
  }

  total++;
  if (
    await test("11. update_index still works", async () => {
      const result = await updateIndex({ project_path: projectPath });
      assert(result.entries_indexed > 0, "should index pages");
    })
  ) {
    passed++;
  }

  total++;
  if (
    await test("12. list_wiki still works", async () => {
      const result = await listWiki({ project_path: projectPath });
      assert(result.total_pages > 0, "should list pages");
    })
  ) {
    passed++;
  }

  // Test 13-15: Phase 3 tools
  total++;
  if (
    await test("13. wiki_search still works", async () => {
      const result = await wikiSearch({
        project_path: projectPath,
        query: "tool",
      });
      assert(typeof result.results === "object", "should return results");
    })
  ) {
    passed++;
  }

  total++;
  if (
    await test("14. query_wiki still works", async () => {
      const result = await queryWiki({
        project_path: projectPath,
        question: "What are tools?",
      });
      assert(result.question, "should have question");
    })
  ) {
    passed++;
  }

  total++;
  if (
    await test("15. lint_wiki still works", async () => {
      const result = await lintWiki({ project_path: projectPath });
      assert(typeof result.health_score === "number", "should have health score");
    })
  ) {
    passed++;
  }

  console.log("\n════════════════════════════════════════════════");
  console.log(`RESULTS: ${passed}/${total} tests passing ✓`);
  console.log("════════════════════════════════════════════════\n");

  if (passed === total) {
    console.log("✅ PHASE 5 COMPLETE - ALL TESTS PASSING\n");
    return 0;
  } else {
    console.log(`❌ ${total - passed} test(s) failed\n`);
    return 1;
  }
}

process.exit(await runTests());
