#!/usr/bin/env node
// MailKite MCP server.
//
// This is *only* the MCP layer. Everything else is reused:
//   • Operation ↔ endpoint mapping → ../spec/api.json  (the canonical contract)
//   • Input validation             → ../spec/schemas/*.json compiled with ajv
//                                     (the same files + validator as conformance)
//   • Transport / auth / errors    → the MailKite Node SDK (../node)
//
// We read api.json at startup and register one MCP tool per method. A call is
// validated against the shared JSON Schema, then dispatched through the SDK's
// low-level request(). No endpoint list, schema, or HTTP logic is duplicated.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import Ajv from "ajv";
import { MailKite, MailKiteError } from "mailkite";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Prefer a spec bundled into the package (copied in at publish time by prepack);
// fall back to the sibling sdks/spec when running straight from the repo.
const SPEC = existsSync(path.join(HERE, "spec")) ? path.join(HERE, "spec") : path.resolve(HERE, "..", "spec");

// ---- load the canonical contract --------------------------------------------
const api = JSON.parse(readFileSync(path.join(SPEC, "api.json"), "utf8"));

// Compile one ajv validator per body schema — same config + files as
// sdks/conformance/run.mjs, so the MCP rejects exactly what the SDKs reject.
const ajv = new Ajv({ allErrors: true, strict: false });
const schemas = {}; // id -> parsed schema
const validators = {}; // id -> compiled validator
for (const file of readdirSync(path.join(SPEC, "schemas"))) {
  if (!file.endsWith(".json")) continue;
  const id = file.replace(/\.json$/, "");
  const schema = JSON.parse(readFileSync(path.join(SPEC, "schemas", file), "utf8"));
  schemas[id] = schema;
  validators[id] = ajv.compile(schema);
}

// ---- turn each api.json method into an MCP tool -----------------------------
function toSnake(name) {
  return name.replace(/([A-Z])/g, "_$1").toLowerCase();
}
const toolName = (method) => `mailkite_${toSnake(method.name)}`;

// Build the flat input schema for a method: path params (as strings) merged with
// the referenced body schema's properties, so the model sees real field names.
function buildInputSchema(method) {
  const properties = {};
  const required = [];

  for (const arg of method.args || []) {
    if (arg.in === "path") {
      properties[arg.name] = { type: "string", description: `Path parameter \`${arg.name}\`.` };
      required.push(arg.name);
    } else if (arg.in === "query") {
      properties[arg.name] = { type: "string", description: `Query parameter \`${arg.name}\`.` };
      required.push(arg.name);
    } else if (arg.in === "body" && arg.schema && schemas[arg.schema]) {
      const body = schemas[arg.schema];
      Object.assign(properties, body.properties || {});
      for (const r of body.required || []) required.push(r);
    }
  }

  return { type: "object", properties, required, additionalProperties: false };
}

const credentialNote = (method) => {
  if (method.local) return "Runs locally (no API call) — no credentials needed.";
  return method.http.path.startsWith("/v1/")
    ? "Requires an API key (mk_live_…)."
    : "Requires a management session token.";
};

// Human-readable display title, e.g. `checkDomainAvailability` → "Check Domain Availability".
const toTitle = (name) =>
  name.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim();

// MCP tool annotations (per the spec's ToolAnnotations) — read-only vs. mutating hints a client
// uses to decide how much to trust/confirm a call. Read-only = makes no state change: `local`
// helpers (pure computation) and every GET. For mutating tools the HTTP verb tells us whether the
// change is destructive (DELETE/PUT replace or remove — also idempotent) vs. an additive
// create/patch (POST/PATCH). `readOnly` on the method overrides the verb heuristic.
const buildAnnotations = (method) => {
  const verb = method.http?.method?.toUpperCase();
  const readOnly = method.readOnly ?? (method.local === true || verb === "GET");
  const annotations = { title: toTitle(method.name), readOnlyHint: readOnly };
  if (!readOnly) {
    const destructive = verb === "DELETE" || verb === "PUT";
    annotations.destructiveHint = destructive;
    annotations.idempotentHint = destructive;
  }
  return annotations;
};

// Expose one tool per spec method — EXCEPT those flagged `sdkOnly` (encrypt/decrypt/reply*).
// Those are SDK-local helpers with no meaning as an agent tool (they return a string an HTTP
// handler echoes back, or need raw key material), so the spec marks them off-limits to MCP.
// Mirrors the remote server's `spec.methods.filter((m) => !m.sdkOnly)` (api/src/mcp/tools.ts) so
// both surfaces advertise an identical tool set. `verifyWebhook` is `local` but NOT `sdkOnly`, so
// it stays — it's a genuinely useful agent tool that runs in-process.
const tools = api.methods
  .filter((method) => !method.sdkOnly)
  .map((method) => ({
  name: toolName(method),
  description: `${method.summary} ${credentialNote(method)}${
    method.agentConfirm
      ? " Does NOT register automatically — returns a dashboard link for the user to review the price and confirm. An assistant can never purchase a domain on its own."
      : ""
  }`,
  inputSchema: buildInputSchema(method),
  annotations: buildAnnotations(method),
  _method: method, // kept server-side for dispatch; not sent to the client
}));

const byToolName = new Map(tools.map((t) => [t.name, t]));

// ---- dispatch ---------------------------------------------------------------
const apiKey = process.env.MAILKITE_API_KEY;
const baseUrl = process.env.MAILKITE_BASE_URL;
const mk = new MailKite(apiKey || "", baseUrl || undefined);

// Split a tool's flat input into (resolved path, validated body).
function resolveCall(method, input) {
  input = input || {};
  let urlPath = method.http.path;
  let bodySchemaId = null;
  const query = [];

  for (const arg of method.args || []) {
    if (arg.in === "path") {
      const value = input[arg.name];
      if (value == null || value === "") throw new Error(`Missing required path parameter: ${arg.name}`);
      urlPath = urlPath.replace(`{${arg.name}}`, encodeURIComponent(String(value)));
    } else if (arg.in === "query") {
      const value = input[arg.name];
      if (value == null || value === "") throw new Error(`Missing required query parameter: ${arg.name}`);
      query.push(`${encodeURIComponent(arg.name)}=${encodeURIComponent(String(value))}`);
    } else if (arg.in === "body" && arg.schema) {
      bodySchemaId = arg.schema;
    }
  }
  if (query.length) urlPath += (urlPath.includes("?") ? "&" : "?") + query.join("&");

  let body;
  if (bodySchemaId) {
    // The body is exactly the schema's own properties (path params are excluded,
    // since every body schema is additionalProperties:false).
    const keys = Object.keys(schemas[bodySchemaId].properties || {});
    body = {};
    for (const k of keys) if (input[k] !== undefined) body[k] = input[k];

    const validate = validators[bodySchemaId];
    if (!validate(body)) {
      throw new Error(`Invalid input for ${bodySchemaId}: ${ajv.errorsText(validate.errors)}`);
    }
  }

  return { method: method.http.method, urlPath, body };
}

// ---- MCP server -------------------------------------------------------------
const server = new Server(
  { name: "mailkite", version: api.version || "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map(({ name, description, inputSchema, annotations }) => ({
    name,
    description,
    inputSchema,
    annotations,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const tool = byToolName.get(req.params.name);
  if (!tool) {
    return { isError: true, content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }] };
  }

  // Local methods (e.g. verifyWebhook) run in-process — no API key, no network.
  // Validate against the same JSON Schema, then dispatch through the SDK.
  if (tool._method.local) {
    try {
      const input = req.params.arguments || {};
      const bodyArg = (tool._method.args || []).find((a) => a.in === "body");
      if (bodyArg?.schema) {
        const validate = validators[bodyArg.schema];
        if (!validate(input)) {
          return {
            isError: true,
            content: [{ type: "text", text: `Invalid input for ${bodyArg.schema}: ${ajv.errorsText(validate.errors)}` }],
          };
        }
      }
      if (tool._method.name !== "verifyWebhook") {
        throw new Error(`No local handler for ${tool._method.name}`);
      }
      const valid = mk.verifyWebhook(input.signature, input.payload, input.secret, input.toleranceMs);
      return { content: [{ type: "text", text: JSON.stringify({ valid }, null, 2) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `Error: ${err.message}` }] };
    }
  }

  // Gated methods (e.g. domain registration) must be approved by a human and are never run
  // automatically by an AI agent. Return the dashboard URL to confirm instead of calling the API.
  if (tool._method.agentConfirm) {
    const dash = (process.env.MAILKITE_DASHBOARD_URL || "https://app.mailkite.dev").replace(/\/+$/, "");
    const domain = (req.params.arguments && req.params.arguments.domain) || "the domain";
    return {
      content: [
        {
          type: "text",
          text:
            `Domain registration can't be completed automatically — it has to be approved by you.\n\n` +
            `Open the dashboard to review the price and confirm the purchase of ${domain}:\n` +
            `${dash}/domains\n\n` +
            `Once it's registered there, tell me to continue.`,
        },
      ],
    };
  }

  if (!apiKey) {
    return {
      isError: true,
      content: [{ type: "text", text: "MAILKITE_API_KEY is not set. Provide it in the MCP server env." }],
    };
  }

  // uploadAttachment is the one method whose input isn't a plain JSON body: `path` is read
  // off the local disk and streamed as a raw binary upload. The generic resolveCall →
  // mk.request() path only does JSON, so delegate to the SDK method, which picks the
  // transport (path/bytes → binary, url/content → JSON). Validate against the same schema.
  if (tool._method.name === "uploadAttachment") {
    try {
      const input = req.params.arguments || {};
      const validate = validators["upload-attachment-request"];
      if (validate && !validate(input)) {
        return { isError: true, content: [{ type: "text", text: `Invalid input for upload-attachment-request: ${ajv.errorsText(validate.errors)}` }] };
      }
      const result = await mk.uploadAttachment(input);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      const text = err instanceof MailKiteError ? `MailKite API error ${err.status}: ${err.message}` : `Error: ${err.message}`;
      return { isError: true, content: [{ type: "text", text }] };
    }
  }

  try {
    const { method, urlPath, body } = resolveCall(tool._method, req.params.arguments);
    const result = await mk.request(method, urlPath, body);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    const text =
      err instanceof MailKiteError
        ? `MailKite API error ${err.status}: ${err.message}`
        : `Error: ${err.message}`;
    return { isError: true, content: [{ type: "text", text }] };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
// Note: stdout is the MCP transport — never console.log here. Use stderr.
console.error(`mailkite mcp server ready — ${tools.length} tools, base ${mk.baseUrl}`);
