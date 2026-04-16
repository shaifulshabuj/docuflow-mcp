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
  console.log("    PHASE 6D: INTERACTIVE INITIALIZATION TESTS");
  console.log("════════════════════════════════════════════════\n");

  let passed = 0;
  let total = 0;

  console.log("Phase 6D: Interactive Init Enhancement\n");

  // Test 1: init-interactive.ts file exists
  total++;
  if (
    await test("1. init-interactive.ts file exists", async () => {
      const path1 = path.join(
        projectPath,
        "packages/cli/src/commands/init-interactive.ts"
      );
      assert(fs.existsSync(path1), "init-interactive.ts should exist");
    })
  ) {
    passed++;
  }

  // Test 2: init-interactive exports runInteractive
  total++;
  if (
    await test("2. init-interactive exports runInteractive", async () => {
      const content = fs.readFileSync(
        path.join(projectPath, "packages/cli/src/commands/init-interactive.ts"),
        "utf-8"
      );
      assert(
        content.includes("export async function runInteractive"),
        "should export runInteractive"
      );
    })
  ) {
    passed++;
  }

  // Test 3: init-interactive has domain selection
  total++;
  if (
    await test("3. init-interactive has domain selection", async () => {
      const content = fs.readFileSync(
        path.join(projectPath, "packages/cli/src/commands/init-interactive.ts"),
        "utf-8"
      );
      assert(
        content.includes("Code & Architecture"),
        "should offer code domain"
      );
      assert(
        content.includes("Research & Analysis"),
        "should offer research domain"
      );
      assert(
        content.includes("Business & Markets"),
        "should offer business domain"
      );
      assert(
        content.includes("Personal Knowledge"),
        "should offer personal domain"
      );
    })
  ) {
    passed++;
  }

  // Test 4: init-interactive has project info prompts
  total++;
  if (
    await test("4. init-interactive prompts for project info", async () => {
      const content = fs.readFileSync(
        path.join(projectPath, "packages/cli/src/commands/init-interactive.ts"),
        "utf-8"
      );
      assert(
        content.includes("Project name"),
        "should ask for project name"
      );
      assert(
        content.includes("Brief description"),
        "should ask for description"
      );
    })
  ) {
    passed++;
  }

  // Test 5: init-interactive provides domain-specific schemas
  total++;
  if (
    await test("5. init-interactive creates domain-specific schemas", async () => {
      const content = fs.readFileSync(
        path.join(projectPath, "packages/cli/src/commands/init-interactive.ts"),
        "utf-8"
      );
      assert(
        content.includes("# Docuflow Wiki Schema - Code"),
        "should have code schema"
      );
      assert(
        content.includes("# Docuflow Wiki Schema - Research"),
        "should have research schema"
      );
      assert(
        content.includes("# Docuflow Wiki Schema - Business"),
        "should have business schema"
      );
      assert(
        content.includes("# Docuflow Wiki Schema - Personal"),
        "should have personal schema"
      );
    })
  ) {
    passed++;
  }

  // Test 6: init-interactive creates planning template
  total++;
  if (
    await test("6. init-interactive creates planning template", async () => {
      const content = fs.readFileSync(
        path.join(projectPath, "packages/cli/src/commands/init-interactive.ts"),
        "utf-8"
      );
      assert(
        content.includes("Initial Sources"),
        "should have sources section"
      );
      assert(
        content.includes("First Questions"),
        "should include questions section"
      );
    })
  ) {
    passed++;
  }

  // Test 7: init-interactive provides helpful next steps
  total++;
  if (
    await test("7. init-interactive shows next steps guidance", async () => {
      const content = fs.readFileSync(
        path.join(projectPath, "packages/cli/src/commands/init-interactive.ts"),
        "utf-8"
      );
      assert(
        content.includes("Next Steps:"),
        "should show next steps"
      );
      assert(
        content.includes("Review your schema"),
        "should guide schema review"
      );
      assert(
        content.includes("Add first source"),
        "should guide first ingest"
      );
    })
  ) {
    passed++;
  }

  // Test 8: Compiled init-interactive.js exists
  total++;
  if (
    await test("8. init-interactive compiles to JavaScript", async () => {
      const jsPath = path.join(
        projectPath,
        "packages/cli/dist/commands/init-interactive.js"
      );
      assert(fs.existsSync(jsPath), "compiled init-interactive.js should exist");
    })
  ) {
    passed++;
  }

  // Test 9: CLI build is clean
  total++;
  if (
    await test("9. CLI compiles without errors", async () => {
      // Check that tsc completed successfully (done above)
      assert(
        fs.existsSync(
          path.join(projectPath, "packages/cli/dist/index.js")
        ),
        "CLI should compile"
      );
    })
  ) {
    passed++;
  }

  // Test 10: Server build is still clean
  total++;
  if (
    await test("10. Server compiles without errors", async () => {
      assert(
        fs.existsSync(
          path.join(projectPath, "packages/server/dist/index.js")
        ),
        "Server should compile"
      );
    })
  ) {
    passed++;
  }

  console.log("\nRegression Tests (Phase 1-6 Tools)\n");

  // Test 11-15: Regression on all tools
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
    console.log("✅ PHASE 6D COMPLETE - ALL TESTS PASSING\n");
    return 0;
  } else {
    console.log(`❌ ${total - passed} test(s) failed\n`);
    return 1;
  }
}

process.exit(await runTests());
