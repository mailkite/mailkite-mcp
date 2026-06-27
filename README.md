# @mailkite/mcp

[Model Context Protocol](https://modelcontextprotocol.io) server for
[MailKite](https://mailkite.dev). It exposes the MailKite API to LLM agents
(Claude Desktop, Claude Code, Cursor, …) as tools — send mail, manage domains,
webhooks, routes, and inbound messages, all from a chat.

> **Read-only mirror.** This repo is a generated, release-time mirror of the MailKite
> monorepo (the private source of truth); the source isn't developed here. Install
> `@mailkite/mcp` from npm rather than cloning, and see the docs at
> <https://mailkite.dev/docs/libraries#mcp>.

It's a **thin layer**. The tools, their input schemas, and validation all come
from the shared SDK contract in [`../spec`](../spec); transport, auth, and error
handling come from the [MailKite Node SDK](https://github.com/mailkite/mailkite-node). Nothing about the API is
duplicated here — update the spec and the MCP follows.

> ### Hosted vs local — which should I use?
>
> Most users should connect to the **hosted remote MCP** instead of running this
> package: `https://mcp.mailkite.dev/mcp` (Streamable HTTP, one-click **OAuth** — no
> key to copy, no local process). In Claude Code that's the **plugin**
> (`/plugin marketplace add mailkite/claude-code` → `/plugin install mailkite@mailkite`)
> or `claude mcp add --transport http mailkite https://mcp.mailkite.dev/mcp`. See
> <https://mailkite.dev/docs/ai-agents>.
>
> Run **this local server** when you want a **static key** (no browser OAuth), **offline /
> CI** use, a stdio-only client, a custom `MAILKITE_BASE_URL`, or `verifyWebhook` to run
> fully locally. Both expose the exact same tools (same `../spec`).

## Install / configure

Point your MCP client at the server and give it your MailKite credential. The
token is the same one the SDKs take: an `mk_live_…` API key (for sending) or a
management session token.

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

| Env var | Required | Default | Notes |
| --- | --- | --- | --- |
| `MAILKITE_API_KEY` | yes | — | Bearer credential (`mk_live_…` API key or session token) |
| `MAILKITE_BASE_URL` | no | `https://api.mailkite.dev` | Override for local/staging |

## Tools

One tool per MailKite API operation (generated from [`../spec/api.json`](../spec/api.json)):

| Tool | Operation |
| --- | --- |
| `mailkite_send` | Send a message over a verified domain |
| `mailkite_agent` | Send a message to an inbox agent and get its reply |
| `mailkite_route` | Route a message to a registered route and run its action |
| `mailkite_list_domains` | List your domains |
| `mailkite_create_domain` | Add a domain (returns DNS records) |
| `mailkite_get_domain` | Get one domain with DNS + webhook |
| `mailkite_delete_domain` | Remove a domain |
| `mailkite_verify_domain` | Check DNS and update status |
| `mailkite_set_webhook` | Set/replace the domain catch-all webhook |
| `mailkite_delete_webhook` | Remove the domain webhook |
| `mailkite_test_webhook` | Send a signed test event to the webhook |
| `mailkite_list_routes` | List inbound routing rules |
| `mailkite_create_route` | Create a route (match, action, destination) |
| `mailkite_list_messages` | List stored messages |
| `mailkite_get_message` | Get a message with deliveries + attachments |
| `mailkite_retry_delivery` | Re-deliver a stored message to its webhook |
| `mailkite_verify_webhook` | Verify an `x-mailkite-signature` header (local — no API call) |

`mailkite_verify_webhook` is a **local** tool: it runs the SDK's `verifyWebhook`
in-process (no credential, no network) and returns `{ "valid": true | false }`.
Every other tool is one MailKite API operation.

Each tool's input is a flat object with the real field names (e.g.
`mailkite_send` takes `from`, `to`, `subject`, `html`, `text`, …). Required
fields and types are enforced with [`ajv`](https://ajv.js.org) against the same
JSON Schemas in [`../spec/schemas`](../spec/schemas) that the SDKs and
conformance harness use — invalid calls are rejected before any HTTP request.

## How it works

```
api.json  ──▶  one MCP tool per method (name, description, input schema)
schemas/* ──▶  ajv validators (validate the call before dispatch)
Node SDK  ──▶  MailKite.request(method, path, body)  (auth, HTTP, errors)
              local methods (verifyWebhook) dispatch in-process — no HTTP
```

See [`PLAN.md`](./PLAN.md) for the full design.

## Develop

```bash
npm install
npm test        # boots the server over stdio, lists tools, checks validation + wire bytes
```

## License

MIT
