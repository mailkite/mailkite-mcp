// Bundle the canonical contract into the package at publish/pack time.
//
// The server reads sdks/spec at runtime; once published there's no sibling
// sdks/spec, so we copy it into ./spec (listed in package.json "files", and
// gitignored so the repo keeps a single source of truth). npm runs this on both
// `npm pack` and `npm publish`.
import { cpSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(HERE, "..", "spec");
const dst = path.join(HERE, "spec");

rmSync(dst, { recursive: true, force: true });
cpSync(src, dst, { recursive: true });
console.error(`prepack: bundled ${src} → @mailkite/mcp/spec`);
