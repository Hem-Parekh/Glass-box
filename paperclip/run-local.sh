#!/usr/bin/env bash
# Run Paperclip with the Glass-box dev team on YOUR OWN computer (macOS/Linux).
# Opens at http://localhost:3100. Agents use the Claude Code login already on
# this computer (your Pro subscription); no API key is needed. Spending is capped at $20/month.
#
# Needs: Node.js 24+, python3, and Claude Code signed in with your Pro account
# (run `claude` once and log in). Do not run with sudo.
#
# Usage, from the Glass-box repo folder: bash paperclip/run-local.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
U=http://localhost:3100

if [ "$(id -u)" = 0 ]; then echo "Run this as your normal user, not root/sudo." >&2; exit 1; fi
command -v claude >/dev/null || echo "Note: Claude Code isn't installed; agents can't run until it is (npm i -g @anthropic-ai/claude-code, then run 'claude' and log in)." >&2

PID=""
if ! curl -sf "$U/api/health" >/dev/null; then
  if [ -f "$HOME/.paperclip/instances/default/config.json" ]; then
    npx -y paperclipai run &
  else
    npx -y paperclipai onboard -y --no-install-service &
  fi
  PID=$!
  echo "Starting Paperclip..."
  for _ in $(seq 1 100); do curl -sf "$U/api/health" >/dev/null && break; sleep 3; done
fi

python3 "$REPO_DIR/paperclip/create_team.py" "$U" "$REPO_DIR"
echo "Open $U in your browser. Press Ctrl+C to stop Paperclip."
[ -n "$PID" ] && wait "$PID"
