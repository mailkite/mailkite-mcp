# MailKite MCP server.
#
# Built from the published npm package, not from this repo's sources: the repo is
# a read-only mirror of a monorepo path, so `mailkite` resolves as file:../node
# and sdks/spec (which server.mjs reads at startup) has no sibling here. The
# npm tarball is what prepack produces — spec/ bundled in, `mailkite` pinned to
# the registry — so it is the only self-contained form of this server.
FROM node:22-alpine

ENV NODE_ENV=production

# Pinned so a rebuild of this image is reproducible. Bump with each release.
ARG MCP_VERSION=0.20.0

RUN npm install -g --omit=dev "@mailkite/mcp@${MCP_VERSION}" \
 && npm cache clean --force

# stdio transport: no ports, no writable state. MAILKITE_API_KEY is supplied by
# the MCP client at run time.
USER node

ENTRYPOINT ["mailkite-mcp"]
