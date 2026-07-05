<p align="center">
  <a href="https://mailkite.dev">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://mailkite.dev/brand/logo-email-dark.png">
      <img src="https://mailkite.dev/brand/logo-email.png" alt="MailKite" height="56">
    </picture>
  </a>
</p>

<h1 align="center">@mailkite/mcp</h1>

<p align="center">
  <b>Email for every product you ship</b> — receive email as a webhook, send over a verified domain, give an AI agent its own inbox.
  <br>The official <a href="https://mailkite.dev">MailKite</a> library for AI agents (MCP).
</p>

<p align="center">
  <a href="https://mailkite.dev/docs">Docs</a> ·
  <a href="https://mailkite.dev/docs/libraries#mcp">Library guide</a> ·
  <a href="https://mailkite.dev">mailkite.dev</a> ·
  <a href="https://mailkite.dev/docs/ai-agents">AI agents</a>
</p>
<p align="center"><a href="https://www.npmjs.com/package/@mailkite/mcp"><img src="https://img.shields.io/npm/v/@mailkite/mcp?color=2563eb&label=npm" alt="npm"></a></p>

> **Read-only mirror.** This repo is a generated, release-time mirror of the MailKite monorepo (the private source of truth) — development doesn't happen here. Install from npm and open issues against the [MailKite docs](https://mailkite.dev/docs).

## Install

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

## Tools

One tool per MailKite API method, generated from the shared contract. Full list + schemas: **https://mailkite.dev/docs/libraries#mcp**.

<!-- TOOLS:START -->

_40 tools, generated from the [shared API contract](https://github.com/mailkite/mailkite-mcp) — the same spec the server registers at startup. `*` marks a required argument. Access: **API key** (`mk_live_…`), **session** (management token), or **local** (runs in-process, no network)._

| Tool | Signature | Access | What it does |
| --- | --- | --- | --- |
| `mailkite_send` | `from*: string`, `to*: any`, `subject: string`, `html: string`, `text: string`, `templateId: string`, `templateData: object`, `cc: any`, `bcc: any`, `replyTo: string`, `inReplyTo: string`, `headers: object`, `attachments: array` | API key · write | Send a message over a verified domain. |
| `mailkite_upload_attachment` | `filename: string`, `path: string`, `url: string`, `content: string`, `contentType: string`, `retentionDays: integer` | API key · write | Upload a file to MailKite storage and get back a secure, time-limited URL. |
| `mailkite_list_templates` | — | session · read | List your saved email templates (light metadata only — no body). |
| `mailkite_list_base_templates` | — | session · read | List the premade base templates (light metadata). |
| `mailkite_get_template` | `id*` | session · read | Get one template (full: subject, html, text, theme). |
| `mailkite_create_template` | `baseId: string`, `name: string`, `subject: string`, `html: string`, `text: string`, `json: string`, `theme: string` | session · write | Create a template. |
| `mailkite_list_domains` | — | session · read | List your domains, each with its webhook URL. |
| `mailkite_create_domain` | `domain*: string` | session · write | Add a domain. |
| `mailkite_get_domain` | `id*` | session · read | Get one domain with DNS records + webhook. |
| `mailkite_delete_domain` | `id*` | session · delete/replace | Remove a domain. |
| `mailkite_verify_domain` | `id*` | session · write | Check DNS and update status. |
| `mailkite_set_webhook` | `id*`, `url*: string` | session · delete/replace | Set or replace the domain's catch-all webhook. |
| `mailkite_delete_webhook` | `id*` | session · delete/replace | Remove the domain's webhook. |
| `mailkite_test_webhook` | `id*` | session · write | Send a signed test event to the domain's webhook. |
| `mailkite_check_domain_availability` | `domain*` | session · read | Check whether a domain is available to register, and at what price. |
| `mailkite_register_domain` | `domain*: string`, `contact*: object`, `years: integer`, `dryRun: boolean` | session · write | Register (buy) a domain on the customer's behalf; provisions mail DNS and adds it to the account in one call. |
| `mailkite_list_routes` | — | session · read | List inbound routing rules. |
| `mailkite_create_route` | `match*: string`, `action: string`, `destination: string`, `agentPrompt: string`, `agentForwardTo: array` | session · write | Create a route (match, action, destination). |
| `mailkite_delete_route` | `id*` | session · delete/replace | Delete an inbound routing rule by id. |
| `mailkite_agent` | `text*: string`, `subject: string`, `from: string`, `html: string`, `routeId: string`, `address: string`, `model: string` | API key · write | Send a message to one of your inbox agents and get its reply. |
| `mailkite_route` | `routeId: string`, `address: string`, `from*: string`, `subject: string`, `text: string`, `html: string` | API key · write | Route a message to one of your registered routes (by `routeId` or `address`), running that route's action — agent, webhook, or forward. |
| `mailkite_list_messages` | — | session · read | List stored messages, newest first. |
| `mailkite_get_message` | `id*` | session · read | Get a message with deliveries + attachments. |
| `mailkite_retry_delivery` | `id*` | session · write | Re-deliver a stored message to its webhook. |
| `mailkite_list_lists` | — | session · read | List your contact lists (static, curated broadcast audiences), each with its member count. |
| `mailkite_create_list` | `name*: string` | session · write | Create a contact list. |
| `mailkite_get_list` | `id*` | session · read | Get one contact list with its member count. |
| `mailkite_update_list` | `id*`, `name*: string` | session · write | Rename a contact list. |
| `mailkite_delete_list` | `id*` | session · delete/replace | Delete a contact list. |
| `mailkite_list_list_contacts` | `id*` | session · read | List the contacts that are members of a list, newest first. |
| `mailkite_add_list_contacts` | `id*`, `contactIds*: array` | session · write | Add contacts (by id, ctr_…) to a list. |
| `mailkite_remove_list_contact` | `id*`, `contactId*` | session · delete/replace | Remove one contact from a list (the contact itself is kept). |
| `mailkite_list_broadcasts` | — | session · read | List your broadcasts (one-to-many sends) with status and send stats. |
| `mailkite_create_broadcast` | `name: string`, `from*: string`, `replyTo: string`, `subject: string`, `preview: string`, `audience: object`, `templateId: string`, `html: string`, `text: string`, `footerAddress: string` | session · write | Create a broadcast draft. |
| `mailkite_get_broadcast` | `id*` | session · read | Get one broadcast with its status and recipient summary. |
| `mailkite_update_broadcast` | `id*`, `name: string`, `from: string`, `replyTo: string`, `subject: string`, `preview: string`, `audience: object`, `templateId: string`, `html: string`, `text: string`, `footerAddress: string` | session · write | Edit a draft broadcast (any of from/subject/audience/html/… ). |
| `mailkite_delete_broadcast` | `id*` | session · delete/replace | Delete a broadcast draft. |
| `mailkite_send_broadcast` | `id*`, `scheduledAt: string` | session · write | Send a broadcast now, or pass an ISO 8601 `scheduledAt` to schedule it. |
| `mailkite_verify_webhook` | `payload*: string`, `signature*: string`, `secret*: string`, `toleranceMs: integer` | local · read | Verify the `x-mailkite-signature` header on an inbound webhook delivery. |
| `mailkite_semantic_search` | `query*` | API key · read | Semantic search over the MailKite documentation — returns the most relevant doc sections for a natural-language query (hybrid vector + keyword search over https://mailkite.dev/docs). |

<!-- TOOLS:END -->

## Use it from an AI agent — MCP + Agent connectors

MailKite speaks the [Model Context Protocol](https://modelcontextprotocol.io): every API method is a tool your AI assistant (Claude, Cursor, …) can call — send mail, manage domains, search the docs, and give an agent its own inbox. Full guide: **[https://mailkite.dev/docs/ai-agents](https://mailkite.dev/docs/ai-agents)**.

**Hosted (recommended) — one-click OAuth, no key to copy:**

```bash
claude mcp add --transport http mailkite https://mcp.mailkite.dev/mcp
```

In Claude Code you can also install the plugin:

```text
/plugin marketplace add mailkite/claude-code
/plugin install mailkite@mailkite
```

Any chat/UI agent: *"Add the MCP server at https://mcp.mailkite.dev/mcp and authenticate in the browser when prompted."*

**Local (static key, offline / CI):**

```json
{ "mcpServers": { "mailkite": { "command": "npx", "args": ["-y", "@mailkite/mcp"], "env": { "MAILKITE_API_KEY": "mk_live_…" } } } }
```

**Give an agent its own inbox.** Route inbound mail to a built-in **inbox agent** (the `agent` route action) and it answers, files, or escalates on its own — see [https://mailkite.dev/docs/ai-agents](https://mailkite.dev/docs/ai-agents).

## All MailKite libraries

Same contract, every language — pick the one for your stack (full list: [https://mailkite.dev/docs/libraries](https://mailkite.dev/docs/libraries)):

| Library | Repo | Distribution |
| --- | --- | --- |
| MailKite for Node.js | [`mailkite-node`](https://github.com/mailkite/mailkite-node) | npm |
| MailKite for Python | [`mailkite-python`](https://github.com/mailkite/mailkite-python) | PyPI |
| MailKite for Ruby | [`mailkite-ruby`](https://github.com/mailkite/mailkite-ruby) | RubyGems |
| MailKite for Java | [`mailkite-java`](https://github.com/mailkite/mailkite-java) | Maven Central |
| MailKite for PHP | [`mailkite-php`](https://github.com/mailkite/mailkite-php) | Packagist |
| MailKite for Go | [`mailkite-go`](https://github.com/mailkite/mailkite-go) | Go modules |
| @mailkite/cli | [`mailkite-cli`](https://github.com/mailkite/mailkite-cli) | npm |
| @mailkite/mcp **(this repo)** | [`mailkite-mcp`](https://github.com/mailkite/mailkite-mcp) | npm |
| @mailkite/client | [`mailkite-js`](https://github.com/mailkite/mailkite-js) | npm |
| @mailkite/expo | [`mailkite-expo`](https://github.com/mailkite/mailkite-expo) | npm |
| MailKiteClient | [`mailkite-swift`](https://github.com/mailkite/mailkite-swift) | Swift Package Manager |
| dev.mailkite:mailkite-client | [`mailkite-kotlin`](https://github.com/mailkite/mailkite-kotlin) | Maven Central |
| mailkite_client | [`mailkite-flutter`](https://github.com/mailkite/mailkite-flutter) | pub.dev |

## Docs & links

- 📚 **Documentation:** https://mailkite.dev/docs
- 📦 **This library's guide:** https://mailkite.dev/docs/libraries#mcp
- 🤖 **AI agents (MCP + inbox agents):** https://mailkite.dev/docs/ai-agents
- 🌐 **Website:** https://mailkite.dev
- 🧭 **All libraries:** https://mailkite.dev/docs/libraries

<sub>Generated from the shared MailKite API contract. © MailKite.</sub>
