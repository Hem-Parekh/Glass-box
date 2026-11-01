"""Create the Glass-box dev team company and agents in Paperclip (idempotent).

Usage: python3 create_team.py <paperclip-url> <agent-working-dir>
The team, budgets and instructions live in team.json (shared with
run-tailscale.mjs). Spending is capped at $20/month (the Pro plan price),
$5 per agent; Paperclip pauses an agent when it reaches its cap.
"""
import json
import os
import sys
import urllib.error
import urllib.request

U, CWD = sys.argv[1], sys.argv[2]
TEAM = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "team.json")))
CO = TEAM["company"]
AGENT_BUDGET = TEAM["agentBudgetMonthlyCents"]


def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(U + path, data=data, method=method,
                                 headers={"Content-Type": "application/json"})
    try:
        return json.load(urllib.request.urlopen(req))
    except urllib.error.HTTPError as e:
        sys.exit(f"{method} {path} failed: {e.code} {e.read().decode()[:500]}")


company = next((c for c in call("GET", "/api/companies") if c["name"] == CO["name"]), None)
if not company:
    company = call("POST", "/api/companies", CO)
C = company["id"]
existing = {a["name"]: a["id"] for a in call("GET", f"/api/companies/{C}/agents")}

for a in TEAM["agents"]:
    if a["name"] in existing:
        continue
    body = {
        "name": a["name"], "role": a["role"], "title": a["title"], "icon": a["icon"],
        "capabilities": a["capabilities"],
        "adapterType": "claude_local", "adapterConfig": {"cwd": CWD},
        "instructionsBundle": {"files": {"AGENTS.md": a["instructions"]}},
        "runtimeConfig": {"heartbeat": {"enabled": False, "wakeOnDemand": True}},
        "budgetMonthlyCents": AGENT_BUDGET,
    }
    if a["reportsTo"]:
        body["reportsTo"] = existing[a["reportsTo"]]
    if a["role"] == "ceo":
        body["permissions"] = {"canCreateAgents": True}
    res = call("POST", f"/api/companies/{C}/agent-hires", body)
    existing[a["name"]] = res.get("agent", res)["id"]

# Re-apply the caps so re-running also fixes older setups.
call("PATCH", f"/api/companies/{C}", {"budgetMonthlyCents": CO["budgetMonthlyCents"]})
for agent_id in existing.values():
    call("PATCH", f"/api/agents/{agent_id}", {"budgetMonthlyCents": AGENT_BUDGET})

print(f"{CO['name']} ({company.get('issuePrefix')}): " + ", ".join(existing)
      + f" | budget ${CO['budgetMonthlyCents'] / 100:.0f}/month")
