// Smoke test: boot the server over stdio via the MCP client, list tools, and
// confirm ajv validation rejects a bad call before any HTTP. No network needed
// (we point at an unroutable base and only test the pre-flight validation path).
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const transport = new StdioClientTransport({
  command: "node",
  args: [path.join(HERE, "server.mjs")],
  env: { ...process.env, MAILKITE_API_KEY: "mk_live_test", MAILKITE_BASE_URL: "http://127.0.0.1:1" },
});

const client = new Client({ name: "smoke", version: "0.0.0" }, { capabilities: {} });
await client.connect(transport);

const { tools } = await client.listTools();
console.log(`tools: ${tools.length}`);
for (const t of tools) console.log(`  ${t.name}  (${Object.keys(t.inputSchema.properties || {}).join(", ") || "—"})`);

// Spot-check send schema is flattened (real field names) and required is correct.
const send = tools.find((t) => t.name === "mailkite_send");
console.log("\nsend required:", JSON.stringify(send.inputSchema.required));
console.log("send has 'from','to','subject' props:",
  ["from", "to", "subject"].every((k) => k in send.inputSchema.properties));

// Validation should reject missing `subject` *before* any HTTP call.
const bad = await client.callTool({ name: "mailkite_send", arguments: { from: "a@b.dev", to: "c@d.dev" } });
console.log("\nbad send -> isError:", bad.isError, "| msg:", bad.content[0].text);

// A management tool with a path param: missing id should be caught too.
const getDom = tools.find((t) => t.name === "mailkite_get_domain");
console.log("\nget_domain input props:", JSON.stringify(Object.keys(getDom.inputSchema.properties)));

await client.close();
console.log("\nOK");
