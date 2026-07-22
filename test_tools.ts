import { getContext } from "./packages/studio/src/tools/context.js";
import { queryWiki } from "./packages/core/src/tools/query-wiki.js";

async function runTests() {
  console.log("=== Testing context tool ===");
  try {
    console.log("Indexing...");
    await getContext({ operation: "index", directory: ".docuflow/sources/samples" });
    console.log("Querying 'HR approval'...");
    const ctxResult = await getContext({ operation: "query", directory: ".docuflow/sources/samples", query: "HR approval" });
    console.log(JSON.stringify(ctxResult, null, 2));
  } catch (err) {
    console.error("Context tool failed:", err);
  }

  console.log("\n=== Testing queryWiki tool ===");
  try {
    const qResult = await queryWiki({ query: "How many days of leave require HR approval?" });
    console.log(JSON.stringify(qResult, null, 2));
  } catch (err) {
    console.error("queryWiki tool failed:", err);
  }
}

runTests();
