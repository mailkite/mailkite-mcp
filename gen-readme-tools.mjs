// Regenerate the README "Tools" table from the canonical contract (../spec).
//
// Every tool @mailkite/mcp exposes is generated from sdks/spec/api.json at runtime
// (see server.mjs). This script renders that same surface — one row per tool, with
// its signature and access level — into README.md between the TOOLS markers, so the
// published/mirrored repo documents the exact tool set the server advertises. It is
// the doc counterpart to server.mjs and stays in sync as the spec grows.
//
// Run: `node gen-readme-tools.mjs`  (add `--check` to fail if README is stale).

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SPEC = path.resolve(HERE, "..", "spec");
const README = path.join(HERE, "README.md");

const api = JSON.parse(readFileSync(path.join(SPEC, "api.json"), "utf8"));
const schemas = {};
for (const file of readdirSync(path.join(SPEC, "schemas"))) {
  if (!file.endsWith(".json")) continue;
  schemas[file.replace(/\.json$/, "")] = JSON.parse(readFileSync(path.join(SPEC, "schemas", file), "utf8"));
}

const toSnake = (name) => name.replace(/([A-Z])/g, "_$1").toLowerCase();
const toolName = (m) => `mailkite_${toSnake(m.name)}`;

// Flatten a method's args into a signature string: path/query params first, then the
// referenced body schema's own properties. `*` marks required; type comes from the schema.
function signature(method) {
  const parts = [];
  for (const arg of method.args || []) {
    if (arg.in === "path") parts.push(`${arg.name}*`);
    else if (arg.in === "query") parts.push(`${arg.name}*`);
    else if (arg.in === "body" && schemas[arg.schema]) {
      const body = schemas[arg.schema];
      const req = new Set(body.required || []);
      for (const [k, v] of Object.entries(body.properties || {})) {
        const type = v.type || (v.enum ? "enum" : Array.isArray(v.oneOf) ? "any" : "any");
        parts.push(`${k}${req.has(k) ? "*" : ""}: ${type}`);
      }
    }
  }
  return parts.length ? parts.map((p) => `\`${p}\``).join(", ") : "—";
}

// Access level a caller needs, mirroring server.mjs `credentialNote`.
function access(method) {
  if (method.local) return "local";
  return method.http.path.startsWith("/v1/") ? "API key" : "session";
}

// Read-only vs mutating, mirroring server.mjs `buildAnnotations`.
function kind(method) {
  const verb = method.http?.method?.toUpperCase();
  const readOnly = method.readOnly ?? (method.local === true || verb === "GET");
  if (readOnly) return "read";
  return verb === "DELETE" || verb === "PUT" ? "delete/replace" : "write";
}

const exposed = api.methods.filter((m) => !m.sdkOnly);

const rows = exposed.map((m) => {
  const summary = (m.summary || "").split(/(?<=\.)\s/)[0].replace(/\|/g, "\\|").trim();
  return `| \`${toolName(m)}\` | ${signature(m)} | ${access(m)} · ${kind(m)} | ${summary} |`;
});

const table = [
  `_${exposed.length} tools, generated from the [shared API contract](https://github.com/mailkite/mailkite-mcp) — the same spec the server registers at startup. \`*\` marks a required argument. Access: **API key** (\`mk_live_…\`), **session** (management token), or **local** (runs in-process, no network)._`,
  "",
  "| Tool | Signature | Access | What it does |",
  "| --- | --- | --- | --- |",
  ...rows,
].join("\n");

const START = "<!-- TOOLS:START -->";
const END = "<!-- TOOLS:END -->";
const block = `${START}\n\n${table}\n\n${END}`;

let readme = readFileSync(README, "utf8");
const re = new RegExp(`${START}[\\s\\S]*?${END}`);
if (!re.test(readme)) {
  console.error(`gen-readme-tools: could not find ${START} … ${END} markers in README.md`);
  process.exit(1);
}
const next = readme.replace(re, block);

if (process.argv.includes("--check")) {
  if (next !== readme) {
    console.error("gen-readme-tools: README.md is stale — run `node gen-readme-tools.mjs`.");
    process.exit(1);
  }
  console.error("gen-readme-tools: README.md tool table is up to date.");
  process.exit(0);
}

writeFileSync(README, next);
console.error(`gen-readme-tools: wrote ${exposed.length} tools to README.md`);
