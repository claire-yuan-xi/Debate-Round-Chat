#!/bin/bash
# Copies the team app's secrets from web/.env.local into the round-chat-team Vercel
# project, without printing them. Also makes a fresh SESSION_SECRET for production.
set -euo pipefail
cd "$(dirname "$0")/.."

get() {
  (cd web && node -e '
    const { loadEnvConfig } = require("@next/env");
    const value = loadEnvConfig(process.cwd()).combinedEnv[process.argv[1]] || "";
    process.stdout.write(value.trim());
  ' "$1")
}

put() {
  if [ -z "$2" ]; then
    echo "✗ $1 is missing from web/.env.local"
    return 1
  fi
  printf "%s" "$2" | npx vercel env add "$1" production --sensitive --force --yes >/dev/null 2>&1
  echo "✓ $1"
}

put SANITY_API_WRITE_TOKEN "$(get SANITY_API_WRITE_TOKEN)"
put GMAIL_USER "$(get GMAIL_USER)"
put GMAIL_APP_PASSWORD "$(get GMAIL_APP_PASSWORD | tr -d '[:space:]')"
put SESSION_SECRET "$(openssl rand -base64 32)"
echo "Done. Tell Claude to deploy."
