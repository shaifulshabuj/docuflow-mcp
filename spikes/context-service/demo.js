const fs = require("fs");
const path = require("path");
const { getContext } = require("../../packages/studio/dist/tools/context");

async function main() {
  const sampleDir = path.join(__dirname, "sample-dir");
  const arg = process.argv[2];

  if (!arg || (arg !== "index" && arg !== "query")) {
    console.error("Usage: node demo.js <index|query>");
    process.exit(1);
  }

  if (arg === "index") {
    // Step 1: Create a tiny sample directory
    if (!fs.existsSync(sampleDir)) {
      fs.mkdirSync(sampleDir, { recursive: true });
    }
    fs.writeFileSync(path.join(sampleDir, "apple.txt"), "An apple is a red or green fruit.");
    fs.writeFileSync(path.join(sampleDir, "banana.txt"), "A banana is a yellow curved fruit.");
    fs.writeFileSync(path.join(sampleDir, "cherry.txt"), "A cherry is a small red stone fruit.");

    console.log("--- Indexing ---");
    const indexResult = await getContext({
      operation: "index",
      directory: sampleDir
    });
    console.log(indexResult);
    console.log("Done! Now run: node demo.js query");
  } else if (arg === "query") {
    // Step 2: Query the index in a FRESH process
    console.log("--- Querying 'yellow' ---");
    const queryResult1 = await getContext({
      operation: "query",
      directory: sampleDir,
      query: "yellow"
    });
    console.log(JSON.stringify(queryResult1, null, 2));

    console.log("\n--- Querying 'red' ---");
    const queryResult2 = await getContext({
      operation: "query",
      directory: sampleDir,
      query: "red"
    });
    console.log(JSON.stringify(queryResult2, null, 2));
  }
}

main().catch(console.error);
