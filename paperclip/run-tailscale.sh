#!/usr/bin/env bash
# Run Paperclip with the Glass-box dev team on YOUR OWN computer (macOS/Linux)
# and reach it from your phone or other devices through Tailscale.
#
# - Sign-in required: you create your own email + password on first run.
# - Only devices signed in to your Tailscale account can reach it.
# - Agents use the Claude Code login on this computer (your Pro plan).
#   Spending is capped at $20/month ($5 per agent).
#
# Needs: Node.js 20+, python3, Tailscale (signed in), and Claude Code signed in
# with your Pro account. Do not run with sudo.
#
# Usage, from the Glass-box repo folder: bash paperclip/run-tailscale.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG="$HOME/.paperclip/instances/default/config.json"
LOG="$HOME/.paperclip/glass-box-server.log"

die() { echo "ERROR: $*" >&2; exit 1; }
[ "$(id -u)" != 0 ] || die "Run this as your normal user, not with sudo."
command -v node >/dev/null || die "Node.js is not installed. Get it from https://nodejs.org (LTS)."
command -v python3 >/dev/null || die "python3 is not installed."
command -v claude >/dev/null || echo "Note: Claude Code isn't installed, so agents can't run yet (npm i -g @anthropic-ai/claude-code, then run 'claude' and log in)." >&2

# --- Tailscale address -------------------------------------------------------
TS=""
for c in tailscale /Applications/Tailscale.app/Contents/MacOS/Tailscale; do
  if command -v "$c" >/dev/null 2>&1 || [ -x "$c" ]; then TS="$c"; break; fi
done
[ -n "$TS" ] || die "Tailscale is not installed. Get it from https://tailscale.com/download and sign in."
TS_IP="$("$TS" ip -4 2>/dev/null | head -n1 || true)"
[ -n "$TS_IP" ] || die "Tailscale is not connected. Open the Tailscale app and sign in, then run this again."
TS_NAME="$("$TS" status --json 2>/dev/null | python3 -c 'import json,sys
try: print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))
except Exception: pass' || true)"

mkdir -p "$HOME/.paperclip"
set -m  # give background servers their own process group so we can stop them cleanly

wait_for() {  # wait_for <url>
  for _ in $(seq 1 100); do curl -sf "$1/api/health" >/dev/null 2>&1 && return 0; sleep 3; done
  return 1
}

mode() { [ -f "$CONFIG" ] && python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["server"].get("deploymentMode",""))' "$CONFIG" || echo none; }

# --- First run: create the team while Paperclip is in local-only mode --------
if [ "$(mode)" != "authenticated" ]; then
  curl -sf http://localhost:3100/api/health >/dev/null 2>&1 && die "Something is already running on port 3100. Stop it (Ctrl+C in its window) and run this again."
  echo "First-time setup: installing Paperclip and creating your team..."
  if [ -f "$CONFIG" ]; then
    npx -y paperclipai run >"$LOG" 2>&1 &
  else
    npx -y paperclipai onboard -y --no-install-service >"$LOG" 2>&1 &
  fi
  PID=$!
  wait_for http://localhost:3100 || { kill -- -"$PID" 2>/dev/null || true; die "Paperclip failed to start; see $LOG"; }
  python3 "$REPO_DIR/paperclip/create_team.py" http://localhost:3100 "$REPO_DIR"
  kill -- -"$PID" 2>/dev/null || true
  wait "$PID" 2>/dev/null || true
  sleep 3
fi

# --- Switch to sign-in mode on the Tailscale network ---------------------------
python3 - "$CONFIG" "$TS_IP" "$TS_NAME" <<'EOF'
import json, sys
path, ip, name = sys.argv[1], sys.argv[2], sys.argv[3]
c = json.load(open(path))
s = c["server"]
s.update(deploymentMode="authenticated", exposure="private", bind="tailnet")
hosts = set(s.get("allowedHostnames") or [])
hosts.update(h for h in (ip, name) if h)
s["allowedHostnames"] = sorted(hosts)
c.setdefault("auth", {}).setdefault("baseUrlMode", "auto")
json.dump(c, open(path, "w"), indent=2)
EOF

URL="http://$TS_IP:3100"
[ -n "$TS_NAME" ] && NAME_URL="http://$TS_NAME:3100" || NAME_URL=""

echo "Starting Paperclip on your Tailscale network..."
PAPERCLIP_TAILNET_BIND_HOST="$TS_IP" npx -y paperclipai run >"$LOG" 2>&1 &
PID=$!
trap 'kill -- -"$PID" 2>/dev/null || true' INT TERM
wait_for "$URL" || { kill -- -"$PID" 2>/dev/null || true; die "Paperclip failed to start; see $LOG"; }
sleep 2

CLAIM="$(sed 's/\x1b\[[0-9;]*m//g' "$LOG" | grep -o 'http[^ ]*/board-claim/[^ ]*' | head -n1 || true)"
CLAIM="${CLAIM/127.0.0.1/$TS_IP}"
CLAIM="${CLAIM/localhost/$TS_IP}"

echo
echo "=============================================================="
echo " Paperclip is running. Open it on any device signed in to"
echo " your Tailscale account (phone, laptop, this computer):"
echo
echo "   $URL"
[ -n "$NAME_URL" ] && echo "   $NAME_URL"
if [ -n "$CLAIM" ]; then
  echo
  echo " FIRST TIME ONLY:"
  echo "  1. Open the address above, choose \"Need an account? Create one\","
  echo "     and pick your email + password. That is your login."
  echo "  2. While signed in, open this one-time link to take ownership"
  echo "     of your Glass-box team:"
  echo
  echo "     $CLAIM"
fi
echo
echo " Keep this window open. Press Ctrl+C to stop Paperclip."
echo " Server log: $LOG"
echo "=============================================================="
wait "$PID"
