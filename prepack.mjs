// Bundle the canonical contract into the package at publish/pack time.
//
// The server reads sdks/spec at runtime; once published there's no sibling
// sdks/spec, so we copy it into ./spec (listed in package.json "files", and
// gitignored so the repo keeps a single source of truth). npm runs this on both
// `npm pack` and `npm publish`.
import { cpSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(HERE, "..", "spec");
const dst = path.join(HERE, "spec");

// Regenerate the README tool table from the spec so the published/mirrored repo
// documents the exact tool set the server registers (see gen-readme-tools.mjs).
execFileSync(process.execPath, [path.join(HERE, "gen-readme-tools.mjs")], { stdio: "inherit" });

rmSync(dst, { recursive: true, force: true });
cpSync(src, dst, { recursive: true });
console.error(`prepack: bundled ${src} → @mailkite/mcp/spec`);
