import assert from "node:assert";
import fs from "node:fs";
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
  console.log("    PHASE 6A: COPILOT INTEGRATION TESTS");
  console.log("════════════════════════════════════════════════\n");

  let passed = 0;
  let total = 0;

  console.log("Phase 6A: Copilot Integration\n");

  // Test 1: .claude/instructions.md exists
  total++;
  if (
    await test("1. .claude/instructions.md file exists", async () => {
      const path1 = path.join(projectPath, ".claude", "instructions.md");
      assert(fs.existsSync(path1), "instructions.md should exist");
    })
  ) {
    passed++;
  }

  // Test 2: instructions.md is readable
  total++;
  if (
    await test("2. .claude/instructions.md is readable", async () => {
      const content = fs.readFileSync(
        path.join(projectPath, ".claude", "instructions.md"),
        "utf-8"
      );
      assert(content.length > 0, "should have content");
    })
  ) {
    passed++;
  }

  // Test 3: instructions.md explains what Docuflow is
  total++;
  if (
    await test("3. Instructions explain what Docuflow is", async () => {
      const content = fs.readFileSync(
        path.join(projectPath, ".claude", "instructions.md"),
        "utf-8"
      );
      assert(
        content.includes("LLM Wiki Pattern"),
        "should mention LLM Wiki Pattern"
      );
      assert(
        content.includes("Three-Layer Architecture"),
        "should explain architecture"
      );
      assert(
        content.includes("compound over time"),
        "should mention knowledge compounding"
      );
    })
  ) {
    passed++;
  }

  // Test 4: instructions.md lists all 10 tools
  total++;
  if (
    await test("4. Instructions list all 10 tools", async () => {
      const content = fs.readFileSync(
        path.join(projectPath, ".claude", "instructions.md"),
        "utf-8"
      );
      const tools = [
        "read_module",
        "list_modules",
        "write_spec",
        "read_specs",
        "ingest_source",
        "update_index",
        "list_wiki",
        "wiki_search",
        "query_wiki",
        "lint_wiki",
      ];
      for (const tool of tools) {
        assert(
          content.includes(tool),
          `should mention ${tool} tool`
        );
      }
    })
  ) {
    passed++;
  }

  // Test 5: instructions.md documents when to use Docuflow
  total++;
  if (
    await test("5. Instructions document when to use Docuflow", async () => {
      const content = fs.readFileSync(
        path.join(projectPath, ".claude", "instructions.md"),
        "utf-8"
      );
      assert(
        content.includes("When to Use Docuflow"),
        "should have when to use section"
      );
      assert(
        content.includes("Use Docuflow When"),
        "should explain use cases"
      );
      assert(
        content.includes("Don't Use Docuflow When"),
        "should explain when not to use"
      );
    })
  ) {
    passed++;
  }

  // Test 6: instructions.md explains workflows
  total++;
  if (
    await test("6. Instructions document standard workflows", async () => {
      const content = fs.readFileSync(
        path.join(projectPath, ".claude", "instructions.md"),
        "utf-8"
      );
      assert(
        content.includes("Standard Workflows"),
        "should document workflows"
      );
      assert(
        content.includes("Workflow 1"),
        "should have workflow 1"
      );
      assert(
        content.includes("Ingest → Query → Lint"),
        "should explain ingest/query/lint"
      );
    })
  ) {
    passed++;
  }

  // Test 7: instructions.md explains automatic usage patterns
  total++;
  if (
    await test("7. Instructions explain automatic usage patterns", async () => {
      const content = fs.readFileSync(
        path.join(projectPath, ".claude", "instructions.md"),
        "utf-8"
      );
      assert(
        content.includes("When Should You Automatically Use Docuflow"),
        "should explain automatic usage"
      );
      assert(
        content.includes("Asks to understand a project"),
        "should mention project analysis"
      );
      assert(
        content.includes("Asks to research a topic"),
        "should mention research"
      );
    })
  ) {
    passed++;
  }

  // Test 8: instructions.md has troubleshooting section
  total++;
  if (
    await test("8. Instructions include troubleshooting", async () => {
      const content = fs.readFileSync(
        path.join(projectPath, ".claude", "instructions.md"),
        "utf-8"
      );
      assert(
        content.includes("Troubleshooting"),
        "should have troubleshooting"
      );
    })
  ) {
    passed++;
  }

  // Test 9: docs/COPILOT_INTEGRATION.md exists
  total++;
  if (
    await test("9. docs/COPILOT_INTEGRATION.md file exists", async () => {
      const integPath = path.join(projectPath, "docs", "COPILOT_INTEGRATION.md");
      assert(fs.existsSync(integPath), "COPILOT_INTEGRATION.md should exist");
    })
  ) {
    passed++;
  }

  // Test 10: COPILOT_INTEGRATION.md is comprehensive
  total++;
  if (
    await test("10. COPILOT_INTEGRATION.md is comprehensive", async () => {
      const content = fs.readFileSync(
        path.join(projectPath, "docs", "COPILOT_INTEGRATION.md"),
        "utf-8"
      );
      assert(
        content.includes("How Discovery Works"),
        "should explain discovery"
      );
      assert(
        content.includes("Workflow Examples"),
        "should have workflow examples"
      );
      assert(
        content.includes("Troubleshooting"),
        "should have troubleshooting"
      );
      assert(content.includes("FAQ"), "should have FAQ section");
    })
  ) {
    passed++;
  }

  // Test 11: Phase 1-5 tools still work (regression)
  console.log("\nRegression Tests (Phase 1-5 Tools)\n");

  total++;
  if (
    await test("11. write_spec still works", async () => {
      const { writeSpec } = await import(
        "./packages/server/dist/tools/write-spec.js"
      );
      const result = await writeSpec({
        project_path: projectPath,
        filename: "phase6a_test",
        content: "# Phase 6A Test",
      });
      assert(result.written_to, "should write file");
    })
  ) {
    passed++;
  }

  total++;
  if (
    await test("12. list_wiki still works", async () => {
      const { listWiki } = await import(
        "./packages/server/dist/tools/list-wiki.js"
      );
      const result = await listWiki({ project_path: projectPath });
      assert(result.total_pages >= 0, "should list pages");
    })
  ) {
    passed++;
  }

  total++;
  if (
    await test("13. query_wiki still works", async () => {
      const { queryWiki } = await import(
        "./packages/server/dist/tools/query-wiki.js"
      );
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
    await test("14. lint_wiki still works", async () => {
      const { lintWiki } = await import(
        "./packages/server/dist/tools/lint-wiki.js"
      );
      const result = await lintWiki({ project_path: projectPath });
      assert(typeof result.health_score === "number", "should have health score");
    })
  ) {
    passed++;
  }

  // Test 15: README links to COPILOT_INTEGRATION.md
  total++;
  if (
    await test("15. README links to COPILOT_INTEGRATION.md", async () => {
      const readme = fs.readFileSync(
        path.join(projectPath, "README.md"),
        "utf-8"
      );
      assert(
        readme.includes("COPILOT_INTEGRATION"),
        "README should link to integration guide"
      );
    })
  ) {
    passed++;
  }

  console.log("\n════════════════════════════════════════════════");
  console.log(`RESULTS: ${passed}/${total} tests passing ✓`);
  console.log("════════════════════════════════════════════════\n");

  if (passed === total) {
    console.log("✅ PHASE 6A COMPLETE - ALL TESTS PASSING\n");
    return 0;
  } else {
    console.log(`❌ ${total - passed} test(s) failed\n`);
    return 1;
  }
}

process.exit(await runTests());
