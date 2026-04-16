import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectPath = __dirname;

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
  console.log("    PHASE 6B: TOOL ENHANCEMENT TESTS");
  console.log("════════════════════════════════════════════════\n");

  let passed = 0;
  let total = 0;

  console.log("Phase 6B: New Tools (Guidance & Transparency)\n");

  // Test 1: get_schema_guidance tool works
  total++;
  if (
    await test("1. get_schema_guidance tool works", async () => {
      const { getSchemataGuidance } = await import(
        "./packages/server/dist/tools/get-schema-guidance.js"
      );
      const result = await getSchemataGuidance({ project_path: projectPath });
      assert(result.domain, "should detect domain");
      assert(result.recommended_pages, "should have recommended pages");
      assert(result.existing_pages, "should list existing pages");
      assert(result.recommendations, "should have recommendations");
    })
  ) {
    passed++;
  }

  // Test 2: get_schema_guidance returns recommendations
  total++;
  if (
    await test("2. get_schema_guidance provides actionable recommendations", async () => {
      const { getSchemataGuidance } = await import(
        "./packages/server/dist/tools/get-schema-guidance.js"
      );
      const result = await getSchemataGuidance({ project_path: projectPath });
      assert(result.recommendations.length > 0, "should have recommendations");
      // Check for emoji markers that indicate actionable recommendations
      assert(
        result.recommendations.some((r) => /[✓✅🌱📚⚠️💡🔍🔗]/.test(r)),
        "recommendations should be actionable"
      );
    })
  ) {
    passed++;
  }

  // Test 3: preview_generation tool exists
  total++;
  if (
    await test("3. preview_generation tool works", async () => {
      const { previewGeneration } = await import(
        "./packages/server/dist/tools/preview-generation.js"
      );
      const result = await previewGeneration({
        tool_name: "query_wiki",
        project_path: projectPath,
        params: { question: "What is docuflow?" },
      });
      assert(result.tool_name, "should have tool name");
      assert(result.predicted_actions, "should have predicted actions");
      assert(result.estimated_impact, "should have impact estimate");
    })
  ) {
    passed++;
  }

  // Test 4: preview shows predicted actions
  total++;
  if (
    await test("4. preview_generation shows predicted actions", async () => {
      const { previewGeneration } = await import(
        "./packages/server/dist/tools/preview-generation.js"
      );
      const result = await previewGeneration({
        tool_name: "ingest_source",
        project_path: projectPath,
        params: { source_filename: "test.md" },
      });
      assert(
        result.predicted_actions.length > 0,
        "should show what tool will do"
      );
      assert(
        result.predicted_actions.some((a) => a.includes("✓")),
        "actions should be clear"
      );
    })
  ) {
    passed++;
  }

  // Test 5: preview shows predicted outputs
  total++;
  if (
    await test("5. preview_generation shows predicted outputs", async () => {
      const { previewGeneration } = await import(
        "./packages/server/dist/tools/preview-generation.js"
      );
      const result = await previewGeneration({
        tool_name: "lint_wiki",
        project_path: projectPath,
        params: {},
      });
      assert(
        result.predicted_outputs.length > 0,
        "should show what tool will produce"
      );
    })
  ) {
    passed++;
  }

  // Test 6: preview shows data modification
  total++;
  if (
    await test("6. preview_generation shows whether data will be modified", async () => {
      const { previewGeneration } = await import(
        "./packages/server/dist/tools/preview-generation.js"
      );

      const ingestResult = await previewGeneration({
        tool_name: "ingest_source",
        project_path: projectPath,
        params: { source_filename: "test.md" },
      });
      assert(
        ingestResult.data_modified === true,
        "ingest should modify data"
      );

      const queryResult = await previewGeneration({
        tool_name: "query_wiki",
        project_path: projectPath,
        params: { question: "test" },
      });
      assert(
        queryResult.data_modified === false,
        "query should not modify data"
      );
    })
  ) {
    passed++;
  }

  // Test 7: preview shows impact level
  total++;
  if (
    await test("7. preview_generation shows impact level (low/medium/high)", async () => {
      const { previewGeneration } = await import(
        "./packages/server/dist/tools/preview-generation.js"
      );
      const result = await previewGeneration({
        tool_name: "save_answer_as_page",
        project_path: projectPath,
        params: { answer: "test", page_title: "test" },
      });
      assert(
        ["low", "medium", "high"].includes(result.estimated_impact),
        "should have valid impact level"
      );
    })
  ) {
    passed++;
  }

  // Test 8: preview shows files affected
  total++;
  if (
    await test("8. preview_generation lists files that will be affected", async () => {
      const { previewGeneration } = await import(
        "./packages/server/dist/tools/preview-generation.js"
      );
      const result = await previewGeneration({
        tool_name: "ingest_source",
        project_path: projectPath,
        params: { source_filename: "test.md" },
      });
      assert(
        result.files_affected.length > 0,
        "should list affected files"
      );
    })
  ) {
    passed++;
  }

  // Test 9: preview gives proceed recommendation
  total++;
  if (
    await test("9. preview_generation includes proceed recommendation", async () => {
      const { previewGeneration } = await import(
        "./packages/server/dist/tools/preview-generation.js"
      );
      const result = await previewGeneration({
        tool_name: "query_wiki",
        project_path: projectPath,
        params: { question: "test" },
      });
      assert(
        result.proceed_recommendation,
        "should recommend whether to proceed"
      );
    })
  ) {
    passed++;
  }

  // Test 10: Unknown tool is handled gracefully
  total++;
  if (
    await test("10. preview_generation handles unknown tools gracefully", async () => {
      const { previewGeneration } = await import(
        "./packages/server/dist/tools/preview-generation.js"
      );
      const result = await previewGeneration({
        tool_name: "nonexistent_tool",
        project_path: projectPath,
        params: {},
      });
      assert(
        result.proceed_recommendation.includes("❌"),
        "should indicate error for unknown tool"
      );
    })
  ) {
    passed++;
  }

  console.log("\nRegression Tests (Phase 1-5 Tools)\n");

  // Test 11-15: Regression on existing tools
  total++;
  if (
    await test("11. ingest_source still works", async () => {
      const { ingestSource } = await import(
        "./packages/server/dist/tools/ingest-source.js"
      );
      const result = await ingestSource({
        project_path: projectPath,
        source_filename: "README.md",
      });
      assert(result.source_id, "should ingest");
    })
  ) {
    passed++;
  }

  total++;
  if (
    await test("12. query_wiki still works", async () => {
      const { queryWiki } = await import(
        "./packages/server/dist/tools/query-wiki.js"
      );
      const result = await queryWiki({
        project_path: projectPath,
        question: "What are tools?",
      });
      assert(result.question, "should query");
    })
  ) {
    passed++;
  }

  total++;
  if (
    await test("13. lint_wiki still works", async () => {
      const { lintWiki } = await import(
        "./packages/server/dist/tools/lint-wiki.js"
      );
      const result = await lintWiki({ project_path: projectPath });
      assert(typeof result.health_score === "number", "should lint");
    })
  ) {
    passed++;
  }

  total++;
  if (
    await test("14. list_wiki still works", async () => {
      const { listWiki } = await import(
        "./packages/server/dist/tools/list-wiki.js"
      );
      const result = await listWiki({ project_path: projectPath });
      assert(result.total_pages >= 0, "should list wiki");
    })
  ) {
    passed++;
  }

  total++;
  if (
    await test("15. update_index still works", async () => {
      const { updateIndex } = await import(
        "./packages/server/dist/tools/update-index.js"
      );
      const result = await updateIndex({
        project_path: projectPath,
      });
      assert(result.entries_indexed >= 0 || result.index_updated, "should update index");
    })
  ) {
    passed++;
  }

  console.log("\n════════════════════════════════════════════════");
  console.log(`RESULTS: ${passed}/${total} tests passing ✓`);
  console.log("════════════════════════════════════════════════\n");

  if (passed === total) {
    console.log("✅ PHASE 6B COMPLETE - ALL TESTS PASSING\n");
    return 0;
  } else {
    console.log(`❌ ${total - passed} test(s) failed\n`);
    return 1;
  }
}

process.exit(await runTests());
