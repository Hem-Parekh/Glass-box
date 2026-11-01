"""Create the Glass-box dev team company and agents in Paperclip (idempotent).

Usage: python3 create_team.py <paperclip-url> <agent-working-dir>
Budgets are 0 (no spending cap); agents use the Claude subscription login.
"""
import json
import sys
import urllib.error
import urllib.request

U, CWD = sys.argv[1], sys.argv[2]
COMPANY = "Glass-box dev team"


def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(U + path, data=data, method=method,
                                 headers={"Content-Type": "application/json"})
    try:
        return json.load(urllib.request.urlopen(req))
    except urllib.error.HTTPError as e:
        sys.exit(f"{method} {path} failed: {e.code} {e.read().decode()[:500]}")


company = next((c for c in call("GET", "/api/companies") if c["name"] == COMPANY), None)
if not company:
    company = call("POST", "/api/companies", {
        "name": COMPANY,
        "description": "Build and maintain the Glass-box software project (github.com/hem-parekh/glass-box).",
        "budgetMonthlyCents": 0,
    })
C = company["id"]
existing = {a["name"]: a["id"] for a in call("GET", f"/api/companies/{C}/agents")}

TEAM = [
    ("CEO", "ceo", "Chief Executive Officer", "crown", None,
     "Sets priorities for the Glass-box project, turns goals into tasks, and delegates to the CTO and team.",
     "You are the CEO of the Glass-box dev team. You own priorities and outcomes for the Glass-box project: "
     "turn the board's goals into clear tasks, delegate technical work to the CTO, and keep the board informed "
     "of progress and blockers."),
    ("CTO", "cto", "Chief Technology Officer", "cpu", "CEO",
     "Owns technical direction and architecture for Glass-box; breaks work down and reviews engineering output.",
     "You are the CTO of the Glass-box dev team. You own the technical direction and architecture of the "
     "Glass-box repository: break technical goals into tasks for the Coder and UX Designer, review their work, "
     "and keep the codebase healthy."),
    ("Coder", "engineer", "Software Engineer", "code", "CTO",
     "Implements features and fixes in the Glass-box repository.",
     "You are a software engineer on the Glass-box dev team. You implement features and fixes in the Glass-box "
     "repository with focused, tested changes, and report results on your tasks."),
    ("UX Designer", "designer", "UX Designer", "sparkles", "CTO",
     "Designs Glass-box interfaces and reviews usability.",
     "You are the UX designer on the Glass-box dev team. You own the usability and visual design of Glass-box: "
     "propose interface designs, review implemented UI for clarity and accessibility, and hand clear specs to "
     "the Coder."),
]

for name, role, title, icon, boss, caps, agents_md in TEAM:
    if name in existing:
        continue
    body = {
        "name": name, "role": role, "title": title, "icon": icon, "capabilities": caps,
        "adapterType": "claude_local", "adapterConfig": {"cwd": CWD},
        "instructionsBundle": {"files": {"AGENTS.md": agents_md}},
        "runtimeConfig": {"heartbeat": {"enabled": False, "wakeOnDemand": True}},
        "budgetMonthlyCents": 0,
    }
    if boss:
        body["reportsTo"] = existing[boss]
    if role == "ceo":
        body["permissions"] = {"canCreateAgents": True}
    res = call("POST", f"/api/companies/{C}/agent-hires", body)
    existing[name] = res.get("agent", res)["id"]

print(f"{COMPANY} ({company.get('issuePrefix')}): " + ", ".join(existing))
