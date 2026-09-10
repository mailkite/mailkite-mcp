// Wire test: point the MCP server at a local mock and assert each tool puts the
// expected method + path + Bearer + body on the wire (i.e. the SDK dispatch is
// wired to api.json correctly). Confirms path-param substitution and body split.
import http from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API_KEY = "mk_live_test";
let last = null;

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (d) => chunks.push(d));
  req.on("end", () => {
    const raw = Buffer.concat(chunks).toString("utf8");
    last = { method: req.method, path: req.url, auth: req.headers["authorization"], body: raw ? JSON.parse(raw) : null };
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, echo: last.path }));
  });
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

const transport = new StdioClientTransport({
  command: "node",
  args: [path.join(HERE, "server.mjs")],
  env: { ...process.env, MAILKITE_API_KEY: API_KEY, MAILKITE_BASE_URL: baseUrl },
});
const client = new Client({ name: "wire", version: "0.0.0" }, { capabilities: {} });
await client.connect(transport);

let failures = 0;
function check(label, cond, detail) {
  console.log(`${cond ? "✓" : "✗"} ${label}${cond ? "" : "  — " + detail}`);
  if (!cond) failures++;
}

// 1. send: POST /v1/send with body, Bearer auth.
await client.callTool({ name: "mailkite_send", arguments: { from: "a@x.dev", to: "b@y.dev", subject: "hi", text: "yo" } });
check("send → POST /v1/send", last.method === "POST" && last.path === "/v1/send", JSON.stringify(last));
check("send → Bearer key", last.auth === `Bearer ${API_KEY}`, last.auth);
check("send → body has no path leakage", JSON.stringify(last.body) === JSON.stringify({ from: "a@x.dev", to: "b@y.dev", subject: "hi", text: "yo" }), JSON.stringify(last.body));

// 2. get_domain: path param substituted, no body.
await client.callTool({ name: "mailkite_get_domain", arguments: { id: "dom_123" } });
check("get_domain → GET /api/domains/dom_123", last.method === "GET" && last.path === "/api/domains/dom_123", last.path);
check("get_domain → no body", last.body === null, JSON.stringify(last.body));

// 3. set_webhook: path id + body url, kept separate.
await client.callTool({ name: "mailkite_set_webhook", arguments: { id: "dom_9", url: "https://h.dev/hook" } });
check("set_webhook → PUT /api/domains/dom_9/webhook", last.method === "PUT" && last.path === "/api/domains/dom_9/webhook", last.path);
check("set_webhook → body is just {url}", JSON.stringify(last.body) === JSON.stringify({ url: "https://h.dev/hook" }), JSON.stringify(last.body));

// 4. retry_delivery: deliveries path.
await client.callTool({ name: "mailkite_retry_delivery", arguments: { id: "dlv_1" } });
check("retry_delivery → POST /api/deliveries/dlv_1/retry", last.method === "POST" && last.path === "/api/deliveries/dlv_1/retry", last.path);

// 5. verify_webhook: a local method — must NOT touch the network and returns {valid}.
const beforeVerify = last;
const validArgs = {
  signature: "t=1750000000000,v1=3d790f831e170ddba4d001f27532bf2c1fc68ebed52eef72fe453dfa1196b03c",
  payload: '{"type":"email.received","id":"evt_123","message":"It works."}',
  secret: "whsec_mailkite_test",
  toleranceMs: 0,
};
const okRes = await client.callTool({ name: "mailkite_verify_webhook", arguments: validArgs });
check("verify_webhook → no HTTP request made", last === beforeVerify, "a network call was made");
check("verify_webhook → valid signature ⇒ {valid:true}", JSON.parse(okRes.content[0].text).valid === true, okRes.content[0].text);

const badRes = await client.callTool({
  name: "mailkite_verify_webhook",
  arguments: { ...validArgs, secret: "whsec_wrong" },
});
check("verify_webhook → wrong secret ⇒ {valid:false}", JSON.parse(badRes.content[0].text).valid === false, badRes.content[0].text);

await client.close();
server.close();
console.log(failures === 0 ? "\nALL WIRE CHECKS PASS" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
