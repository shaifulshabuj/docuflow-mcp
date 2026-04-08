import { ExtractedFacts } from "./types.js";

function uniq(arr: string[]): string[] {
  return Array.from(new Set(arr.filter((s) => s && s.length > 0)));
}

function collect(re: RegExp, content: string, group = 1): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m[group]) out.push(m[group]);
  }
  return out;
}

const RE_CLASS = /(?:abstract\s+|sealed\s+|partial\s+|public\s+|private\s+|protected\s+|internal\s+|static\s+)*(?:class|interface|struct|enum|record)\s+([A-Z]\w*)/g;
const RE_FUNC_KW = /(?:public|private|protected|internal|static|async|override|function|def|fn|sub)\s+(?:[\w<>\[\],?\s]+?\s+)?([A-Za-z_]\w*)\s*\(/g;
const RE_FUNC_ARROW = /\b([A-Za-z_]\w*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g;
const RE_METHOD_TS = /^\s*(?:public|private|protected|static|async|readonly|\s)*([a-z_]\w*)\s*\([^)]*\)\s*[:{]/gm;

const RE_USING = /\busing\s+([\w.]+)\s*;/g;
const RE_IMPORT_FROM = /\bimport\s+(?:[\w*${}\s,]+\s+from\s+)?['"]([^'"]+)['"]/g;
const RE_REQUIRE = /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g;
const RE_DECORATOR = /@(Injectable|Component|Inject|Service|Module|Directive|Pipe|NgModule|Controller)\b/g;
const RE_NEW_CLASS = /\bnew\s+([A-Z]\w*)\s*\(/g;

const RE_SQL_TABLE = /(?:\bFROM|\bJOIN|\bINTO|\bUPDATE|\bDELETE\s+FROM|\bTABLE)\s+([A-Za-z_][\w.]*)/gi;
const RE_DBSET = /\bDbSet<\s*([A-Z]\w*)\s*>/g;
const RE_TABLE_ATTR = /\[Table\(\s*["']([^"']+)["']/g;
const RE_TABLE_FLUENT = /\.Table\(\s*["']([^"']+)["']\s*\)/g;

const RE_DOTNET_ROUTE = /\[(?:Route|Http(?:Get|Post|Put|Delete|Patch))\(\s*["']([^"']*)["']/g;
const RE_MIN_API = /\bapp\.Map(?:Get|Post|Put|Delete|Patch)\s*\(\s*["']([^"']+)["']/g;
const RE_EXPRESS = /\b(?:router|app)\.(?:get|post|put|delete|patch|use)\s*\(\s*['"]([^'"]+)['"]/g;
const RE_NEST = /@(?:Get|Post|Put|Delete|Patch)\s*\(\s*['"]([^'"]+)['"]/g;
const RE_NG_PATH = /\bpath\s*:\s*['"]([^'"]+)['"]/g;

const RE_CFG_CONNSTR = /\bConnectionStrings:([\w.]+)/g;
const RE_PROCESS_ENV = /\bprocess\.env\.([A-Z_][A-Z0-9_]*)/g;
const RE_DOTNET_ENV = /\bEnvironment\.GetEnvironmentVariable\(\s*["']([^"']+)["']/g;
const RE_ICONFIG = /\bIConfiguration\b/g;
const RE_APPSETTINGS = /\bappsettings(?:\.[A-Za-z0-9]+)?\.json\b/g;

export function extract(content: string): ExtractedFacts {
  const classes = collect(new RegExp(RE_CLASS.source, "g"), content);
  const functions = uniq([
    ...collect(new RegExp(RE_FUNC_KW.source, "g"), content),
    ...collect(new RegExp(RE_FUNC_ARROW.source, "g"), content),
    ...collect(new RegExp(RE_METHOD_TS.source, "gm"), content),
  ]).filter((n) => !["if", "for", "while", "switch", "catch", "return", "function"].includes(n));

  const dependencies = uniq([
    ...collect(new RegExp(RE_USING.source, "g"), content),
    ...collect(new RegExp(RE_IMPORT_FROM.source, "g"), content),
    ...collect(new RegExp(RE_REQUIRE.source, "g"), content),
    ...collect(new RegExp(RE_DECORATOR.source, "g"), content),
    ...collect(new RegExp(RE_NEW_CLASS.source, "g"), content),
  ]);

  const db_tables = uniq([
    ...collect(new RegExp(RE_SQL_TABLE.source, "gi"), content),
    ...collect(new RegExp(RE_DBSET.source, "g"), content),
    ...collect(new RegExp(RE_TABLE_ATTR.source, "g"), content),
    ...collect(new RegExp(RE_TABLE_FLUENT.source, "g"), content),
  ]);

  const endpoints = uniq([
    ...collect(new RegExp(RE_DOTNET_ROUTE.source, "g"), content),
    ...collect(new RegExp(RE_MIN_API.source, "g"), content),
    ...collect(new RegExp(RE_EXPRESS.source, "g"), content),
    ...collect(new RegExp(RE_NEST.source, "g"), content),
    ...collect(new RegExp(RE_NG_PATH.source, "g"), content),
  ]);

  const config_refs: string[] = [];
  config_refs.push(...collect(new RegExp(RE_CFG_CONNSTR.source, "g"), content).map((s) => `ConnectionStrings:${s}`));
  config_refs.push(...collect(new RegExp(RE_PROCESS_ENV.source, "g"), content).map((s) => `process.env.${s}`));
  config_refs.push(...collect(new RegExp(RE_DOTNET_ENV.source, "g"), content));
  if (RE_ICONFIG.test(content)) config_refs.push("IConfiguration");
  if (RE_APPSETTINGS.test(content)) config_refs.push("appsettings.json");

  return {
    classes: uniq(classes),
    functions: uniq(functions),
    dependencies,
    db_tables,
    endpoints,
    config_refs: uniq(config_refs),
  };
}
