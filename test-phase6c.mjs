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
  console.log("    PHASE 6C: ENHANCED DOCUMENTATION TESTS");
  console.log("════════════════════════════════════════════════\n");

  let passed = 0;
  let total = 0;

  console.log("Phase 6C: Documentation Files\n");

  // Test 1: TROUBLESHOOTING.md exists
  total++;
  if (
    await test("1. docs/TROUBLESHOOTING.md file exists", async () => {
      const path1 = path.join(projectPath, "docs", "TROUBLESHOOTING.md");
      assert(fs.existsSync(path1), "TROUBLESHOOTING.md should exist");
    })
  ) {
    passed++;
  }

  // Test 2: TROUBLESHOOTING.md is comprehensive
  total++;
  if (
    await test("2. TROUBLESHOOTING.md is comprehensive", async () => {
      const content = fs.readFileSync(
        path.join(projectPath, "docs", "TROUBLESHOOTING.md"),
        "utf-8"
      );
      assert(content.includes("Problem:"), "should have problem sections");
      assert(
        content.includes("Troubleshooting"),
        "should mention troubleshooting"
      );
      assert(content.includes("FAQ"), "should have FAQ");
      assert(
        content.includes("not found"),
        "should address common errors"
      );
    })
  ) {
    passed++;
  }

  // Test 3: WHEN_TO_USE.md exists
  total++;
  if (
    await test("3. docs/WHEN_TO_USE.md file exists", async () => {
      const path1 = path.join(projectPath, "docs", "WHEN_TO_USE.md");
      assert(fs.existsSync(path1), "WHEN_TO_USE.md should exist");
    })
  ) {
    passed++;
  }

  // Test 4: WHEN_TO_USE.md is comprehensive
  total++;
  if (
    await test("4. WHEN_TO_USE.md provides decision guidance", async () => {
      const content = fs.readFileSync(
        path.join(projectPath, "docs", "WHEN_TO_USE.md"),
        "utf-8"
      );
      assert(
        content.includes("Decision Tree"),
        "should have decision tree"
      );
      assert(
        content.includes("Use Docuflow If"),
        "should list use cases"
      );
      assert(
        content.includes("Don't Use Docuflow If"),
        "should list non-use cases"
      );
      assert(content.includes("Examples:"), "should have examples");
    })
  ) {
    passed++;
  }

  // Test 5: README links to new docs
  total++;
  if (
    await test("5. README links to new documentation", async () => {
      const readme = fs.readFileSync(
        path.join(projectPath, "README.md"),
        "utf-8"
      );
      assert(
        readme.includes("TROUBLESHOOTING"),
        "README should link to TROUBLESHOOTING"
      );
      assert(
        readme.includes("WHEN_TO_USE"),
        "README should link to WHEN_TO_USE"
      );
    })
  ) {
    passed++;
  }

  // Test 6: TROUBLESHOOTING has quick fixes table
  total++;
  if (
    await test("6. TROUBLESHOOTING includes quick fixes table", async () => {
      const content = fs.readFileSync(
        path.join(projectPath, "docs", "TROUBLESHOOTING.md"),
        "utf-8"
      );
      assert(
        content.includes("Quick Fixes"),
        "should have quick fixes table"
      );
      assert(
        content.includes("|"),
        "should use table format"
      );
    })
  ) {
    passed++;
  }

  // Test 7: WHEN_TO_USE has cost-benefit analysis
  total++;
  if (
    await test("7. WHEN_TO_USE includes cost-benefit analysis", async () => {
      const content = fs.readFileSync(
        path.join(projectPath, "docs", "WHEN_TO_USE.md"),
        "utf-8"
      );
      assert(
        content.includes("Cost-Benefit"),
        "should discuss costs vs benefits"
      );
      assert(
        content.includes("Break-Even"),
        "should explain break-even point"
      );
    })
  ) {
    passed++;
  }

  // Test 8: WHEN_TO_USE has domain-specific guidance
  total++;
  if (
    await test("8. WHEN_TO_USE provides domain-specific guidance", async () => {
      const content = fs.readFileSync(
        path.join(projectPath, "docs", "WHEN_TO_USE.md"),
        "utf-8"
      );
      assert(
        content.includes("Code/Architecture"),
        "should cover code domain"
      );
      assert(content.includes("Research"), "should cover research domain");
      assert(content.includes("Business"), "should cover business domain");
      assert(content.includes("Personal"), "should cover personal domain");
    })
  ) {
    passed++;
  }

  // Test 9: TROUBLESHOOTING addresses all major issues
  total++;
  if (
    await test("9. TROUBLESHOOTING addresses all major pain points", async () => {
      const content = fs.readFileSync(
        path.join(projectPath, "docs", "TROUBLESHOOTING.md"),
        "utf-8"
      );
      assert(
        content.includes("not working"),
        "should cover 'not working' issue"
      );
      assert(
        content.includes("slow"),
        "should cover performance"
      );
      assert(
        content.includes("Data loss or corruption"),
        "should cover data safety"
      );
      assert(
        content.includes("lost"),
        "should cover confusion/orientation"
      );
    })
  ) {
    passed++;
  }

  // Test 10: WHEN_TO_USE uses clear formatting
  total++;
  if (
    await test("10. WHEN_TO_USE uses clear decision formats", async () => {
      const content = fs.readFileSync(
        path.join(projectPath, "docs", "WHEN_TO_USE.md"),
        "utf-8"
      );
      assert(
        content.includes("✅"),
        "should use checkmark for yes"
      );
      assert(
        content.includes("❌"),
        "should use X mark for no"
      );
      assert(
        content.includes("🚩"),
        "should use warning emoji for red flags"
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
    await test("14. get_schema_guidance still works", async () => {
      const { getSchemataGuidance } = await import(
        "./packages/server/dist/tools/get-schema-guidance.js"
      );
      const result = await getSchemataGuidance({ project_path: projectPath });
      assert(result.domain, "should provide guidance");
    })
  ) {
    passed++;
  }

  total++;
  if (
    await test("15. preview_generation still works", async () => {
      const { previewGeneration } = await import(
        "./packages/server/dist/tools/preview-generation.js"
      );
      const result = await previewGeneration({
        tool_name: "query_wiki",
        project_path: projectPath,
        params: { question: "test" },
      });
      assert(result.tool_name, "should preview");
    })
  ) {
    passed++;
  }

  console.log("\n════════════════════════════════════════════════");
  console.log(`RESULTS: ${passed}/${total} tests passing ✓`);
  console.log("════════════════════════════════════════════════\n");

  if (passed === total) {
    console.log("✅ PHASE 6C COMPLETE - ALL TESTS PASSING\n");
    return 0;
  } else {
    console.log(`❌ ${total - passed} test(s) failed\n`);
    return 1;
  }
}

process.exit(await runTests());
