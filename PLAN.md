# MailKite MCP Server — Plan

> Status: **proposal for review** (no code written yet). This document describes
> what we'll build, why, and a checklist to approve before implementation.

## Goal

Ship `@mailkite/mcp` — a [Model Context Protocol](https://modelcontextprotocol.io)
server that exposes the MailKite API to LLM agents (Claude Desktop, Claude Code,
Cursor, etc.) as tools.

It must be **only the MCP layer**. Everything else is reused:

- **Transport to the API** → the existing Node SDK (`sdks/node`, the `MailKite`
  class). We do not re-implement HTTP, auth, base-URL handling, or error parsing.
- **Operation ↔ endpoint mapping** → the canonical `sdks/spec/api.json`. We do not
  hand-maintain a second list of endpoints.
- **Input validation** → the canonical `sdks/spec/schemas/*.json` compiled with
  **`ajv`**, the exact same validator and schema files used by
  `sdks/conformance/run.mjs`.

If a tool definition, schema, or endpoint ever diverges from the SDKs, that's a
bug. The MCP server reads the same source of truth.

## Architecture

```
                ┌──────────────────────────────────────────────┐
                │  @mailkite/mcp  (NEW — the only new code)      │
                │                                                │
   MCP client   │   server.mjs                                   │
   (Claude) ───▶│    • reads  ../spec/api.json   (tool list)     │
   stdio /tools │    • reads  ../spec/schemas/*  (input schemas) │
                │    • ajv.compile(schema)        (validate)     │──┐
                │    • new MailKite(apiKey)       (reuse SDK)     │  │ HTTPS
                └────────────────────────────────────────────────┘  │ Bearer
                         │ reuse                    │ reuse           ▼
                ┌────────▼────────┐        ┌────────▼────────┐   ┌─────────┐
                │  sdks/node      │        │  sdks/spec      │   │ MailKite│
                │  MailKite class │        │  api.json       │   │  API    │
                │  request()      │        │  schemas/*.json │   │ (Hono)  │
                └─────────────────┘        └─────────────────┘   └─────────┘
```

The server is essentially **one generated mapping**: for each method in
`api.json`, register one MCP tool whose input schema is derived from the shared
JSON Schemas, validate the call with `ajv`, then dispatch through
`MailKite.request(method, path, body)`.

### Why drive everything off `api.json`

`api.json` already encodes, per operation: `name`, `summary`, `http.method`,
`http.path` (with `{id}` placeholders), `args` (each tagged `in: "body"` or
`in: "path"` with an optional `schema`), and `returns`. That is exactly the
information an MCP tool needs. Generating tools from it means new endpoints show
up in the MCP server for free when the spec is updated, and the MCP can never
drift from the SDKs.

## Tool generation rules

For each `method` in `api.json`:

1. **Tool name** — snake_case of the method name, prefixed for clarity:
   `send` → `mailkite_send`, `listDomains` → `mailkite_list_domains`,
   `retryDelivery` → `mailkite_retry_delivery`. (Prefix avoids collisions when
   multiple MCP servers are connected.)
2. **Description** — the method's `summary` from `api.json`, plus a note about
   which credential it needs (send vs. management) pulled from `api.json.auth`.
3. **Input schema** — a single flat JSON Schema object composed from the args:
   - For each `in: "path"` arg (e.g. `id`): add a required `string` property.
   - For the `in: "body"` arg: inline the referenced
     `spec/schemas/<schema>.json` properties/required directly (so the agent
     sees real field names like `from`, `to`, `subject` rather than a nested
     `body` blob).
   - Methods with no args (`listDomains`, `listRoutes`, `listMessages`) get an
     empty-object schema.
4. **Handler** —
   - Validate the assembled body against the compiled `ajv` validator for that
     schema (only for methods that declare a body schema). On failure, return an
     MCP tool error listing `ajv.errorsText()` — the same message shape
     conformance uses.
   - Substitute path args into `http.path` (`/api/domains/{id}` →
     `/api/domains/<id>`, URL-encoded).
   - Call `mk.request(http.method, resolvedPath, body)` — reusing the SDK's
     auth, base URL, JSON handling, and `MailKiteError`.
   - Return the JSON result as the tool's text content. On `MailKiteError`,
     return an MCP error including the HTTP status and server message.

This keeps the hand-written surface to: the generation loop, the path/body
splitter, and the error mapping. No endpoint, schema, or auth logic is copied.

## The 14 tools (straight from `api.json`)

| MCP tool | HTTP | Body schema | Credential |
| --- | --- | --- | --- |
| `mailkite_send` | POST `/v1/send` | `send-request` | API key (`mk_live_…`) |
| `mailkite_list_domains` | GET `/api/domains` | — | session |
| `mailkite_create_domain` | POST `/api/domains` | `create-domain-request` | session |
| `mailkite_get_domain` | GET `/api/domains/{id}` | — | session |
| `mailkite_delete_domain` | DELETE `/api/domains/{id}` | — | session |
| `mailkite_verify_domain` | POST `/api/domains/{id}/verify` | — | session |
| `mailkite_set_webhook` | PUT `/api/domains/{id}/webhook` | `set-webhook-request` | session |
| `mailkite_delete_webhook` | DELETE `/api/domains/{id}/webhook` | — | session |
| `mailkite_test_webhook` | POST `/api/domains/{id}/webhook/test` | — | session |
| `mailkite_list_routes` | GET `/api/routes` | — | session |
| `mailkite_create_route` | POST `/api/routes` | `create-route-request` | session |
| `mailkite_list_messages` | GET `/api/messages` | — | session |
| `mailkite_get_message` | GET `/api/messages/{id}` | — | session |
| `mailkite_retry_delivery` | POST `/api/deliveries/{id}/retry` | — | session |

## Configuration

- `MAILKITE_API_KEY` (required) — Bearer credential. As today, this is either an
  `mk_live_…` API key (for `send`) or a session token (for management). The SDK
  already takes one token; the MCP passes it straight through.
- `MAILKITE_BASE_URL` (optional) — overrides the default `https://api.mailkite.dev`,
  for local/staging testing. Same override the `MailKite` constructor accepts.

Standard MCP client config:

```json
{
  "mcpServers": {
    "mailkite": {
      "command": "npx",
      "args": ["-y", "@mailkite/mcp"],
      "env": { "MAILKITE_API_KEY": "mk_live_…" }
    }
  }
}
```

## Layout

```
sdks/mcp/
  package.json        # @mailkite/mcp; bin: mailkite-mcp; deps: @modelcontextprotocol/sdk, ajv, mailkite
  server.mjs          # the whole server: load spec → register tools → stdio transport
  README.md           # install + client config + tool list
  conformance/?       # optional: assert generated tool schemas == spec schemas
```

- **Transport:** stdio for MVP (what Claude Desktop / Claude Code / Cursor use).
  A streamable-HTTP transport can be added later behind the same tool registry.
- **Dependency on the Node SDK:** `package.json` depends on `mailkite` (the Node
  SDK) so we reuse `MailKite` rather than re-implementing `request()`. During
  local dev it resolves via workspace/`file:../node`.
- **No new schemas, no new endpoint list.** `server.mjs` reads `../spec/api.json`
  and `../spec/schemas/*.json` at startup.

## Decisions taken (override if you disagree)

1. **Generate tools from `api.json`** rather than hand-writing 14 tool defs —
   maximizes reuse, zero drift. (Alternative: hand-write each tool. Rejected as
   duplication.)
2. **Reuse the Node SDK's `request()`** for transport — rather than the MCP doing
   its own `fetch`. Keeps auth/error logic in exactly one place.
3. **Validate with `ajv` against `spec/schemas`** — same validator + files as
   conformance, so the MCP rejects exactly what the SDKs/server would.
4. **One flat input object per tool** (path params + body fields merged) — best
   ergonomics for the model; we split path vs. body internally.
5. **stdio transport, MVP only.**
6. **Tool names `mailkite_<snake_case>`** — namespaced, ecosystem-idiomatic.

## Risks / dependencies (not blockers for the MCP itself)

- **`/v1/send` server route** appears not yet implemented in `api/src/index.ts`
  (documented + called by SDKs, handler pending). The MCP will wrap it correctly
  the moment the route exists; until then `mailkite_send` will surface whatever
  the API returns (likely 404). Flagging — this is an API task, not an MCP task.
- **API-key storage** (`mk_live_…`) may not be wired server-side yet; same note.
- These are pre-existing and identical for the SDKs; the MCP introduces no new
  coupling.

## Validation plan

- `mailkite_send` with missing `subject` → ajv rejects before any HTTP call
  (mirrors the `send-request` schema's `required`).
- Optionally extend `sdks/conformance` (or a tiny local check) to assert each
  generated tool's input schema is consistent with the spec schema it derives
  from, so the MCP stays in lock-step like the other SDKs.
- Smoke test against `MAILKITE_BASE_URL` pointed at a local mock (reuse the
  conformance mock-server idea) to confirm each tool puts the expected bytes on
  the wire.

---

## Build checklist (for your review)

- [ ] **0. Approve this plan** (location `sdks/mcp/`, generate-from-`api.json`
      approach, reuse Node SDK + `ajv` + `spec/schemas`).
- [ ] **1. Scaffold `sdks/mcp/`** — `package.json` (`@mailkite/mcp`, bin
      `mailkite-mcp`, deps `@modelcontextprotocol/sdk`, `ajv`, `mailkite`), README stub.
- [ ] **2. Spec loader** — read `../spec/api.json` + `../spec/schemas/*.json`;
      compile one `ajv` validator per body schema (mirroring `conformance/run.mjs`).
- [ ] **3. Tool generator** — turn each `api.json` method into an MCP tool
      definition (name, description, composed input schema).
- [ ] **4. Handler/dispatch** — validate body via `ajv`; substitute path params;
      call `MailKite.request()`; map result + `MailKiteError` to MCP responses.
- [ ] **5. stdio server wiring** — `@modelcontextprotocol/sdk` `Server` +
      `StdioServerTransport`; read `MAILKITE_API_KEY` / `MAILKITE_BASE_URL`.
- [ ] **6. README** — install, client config snippet, the 14 tools, credentials.
- [ ] **7. Validation/smoke test** — schema-rejection test + mock-server wire test
      (optionally folded into `sdks/conformance`).
- [ ] **8. Docs site** — add an "MCP server" entry alongside the SDKs on
      `website/.../docs/libraries.astro`.
- [ ] **9. (Out of scope here) flag `/v1/send` + API-key storage** to the API.
