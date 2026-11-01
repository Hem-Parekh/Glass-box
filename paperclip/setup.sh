#!/usr/bin/env bash
# Sets up Paperclip with the "Glass-box dev team" company (CEO, CTO, Coder,
# UX Designer) inside a Claude Code cloud session.
#
# Agents run Claude Code with your Claude Pro/Max subscription. Create a token
# on your own computer with `claude setup-token` and add it to the cloud
# environment as the variable CLAUDE_CODE_OAUTH_TOKEN. No API key or budget
# is used.
#
# Usage (as root): bash paperclip/setup.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PC_USER=paperclip
U=http://localhost:3100

if [ -z "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]; then
  echo "WARNING: CLAUDE_CODE_OAUTH_TOKEN is not set; agents will not be able to run." >&2
fi

command -v paperclipai >/dev/null || npm i -g paperclipai

# Paperclip's embedded Postgres refuses to run as root.
id "$PC_USER" >/dev/null 2>&1 || useradd -m -s /bin/bash "$PC_USER"

# Agents work in their own copy of the repo.
if [ ! -d "/home/$PC_USER/glass-box" ]; then
  cp -r "$REPO_DIR" "/home/$PC_USER/glass-box"
  chown -R "$PC_USER:$PC_USER" "/home/$PC_USER/glass-box"
fi

if ! curl -sf "$U/api/health" >/dev/null; then
  if [ ! -f "/home/$PC_USER/.paperclip/instances/default/config.json" ]; then
    CMD="paperclipai onboard -y --no-install-service"
  else
    CMD="paperclipai run"
  fi
  su - "$PC_USER" -w CLAUDE_CODE_OAUTH_TOKEN -c "nohup $CMD > ~/paperclip.log 2>&1 &"
  for _ in $(seq 1 60); do curl -sf "$U/api/health" >/dev/null && break; sleep 3; done
  curl -sf "$U/api/health" >/dev/null || { echo "Paperclip failed to start; see /home/$PC_USER/paperclip.log" >&2; exit 1; }
fi

python3 -I "$REPO_DIR/paperclip/create_team.py" "$U" "/home/$PC_USER/glass-box"
