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

One tool per MailKite API method, generated from the shared contract — including `mailkite_send`, `mailkite_semantic_search`, `mailkite_agent`, domain/route/webhook management, and more. Full list + schemas: **https://mailkite.dev/docs/libraries#mcp**.

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
