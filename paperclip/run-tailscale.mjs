#!/usr/bin/env node
// Run Paperclip with the Glass-box dev team on YOUR OWN computer
// (Windows, macOS or Linux) and reach it from your phone through Tailscale.
//
// - Sign-in required: you create your own email + password on first run.
// - Only devices signed in to your Tailscale account can reach it.
// - Agents use the Claude Code login on this computer (your Pro plan).
//   Spending is capped at $20/month ($5 per agent), see team.json.
//
// Needs: Node.js 24+, Tailscale (signed in), Claude Code signed in with your
// Pro account. Don't run it as Administrator/root.
//
// Usage, from the Glass-box folder:  node paperclip/run-tailscale.mjs

import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WIN = process.platform === "win32";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_DIR = path.dirname(HERE);
const PC_HOME = path.join(os.homedir(), ".paperclip");
const CONFIG = path.join(PC_HOME, "instances", "default", "config.json");
const LOG = path.join(PC_HOME, "glass-box-server.log");
const TEAM = JSON.parse(fs.readFileSync(path.join(HERE, "team.json"), "utf8"));

const die = (msg) => { console.error(`\nERROR: ${msg}\n`); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!WIN && process.getuid && process.getuid() === 0) die("Run this as your normal user, not with sudo.");

function has(cmd) {
  try { execFileSync(WIN ? "where" : "which", [cmd], { stdio: "ignore" }); return true; } catch { return false; }
}
if (!has("claude")) {
  console.warn("Note: Claude Code isn't installed, so agents can't run yet.\n" +
    "      Install it with:  npm install -g @anthropic-ai/claude-code   then run  claude  and log in.\n");
}

// --- Tailscale address --------------------------------------------------------
const tsCandidates = WIN
  ? ["tailscale", path.join(process.env.ProgramFiles || "C:\\Program Files", "Tailscale", "tailscale.exe")]
  : ["tailscale", "/Applications/Tailscale.app/Contents/MacOS/Tailscale"];
function ts(args) {
  for (const c of tsCandidates) {
    try { return execFileSync(c, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch {}
  }
  return null;
}
const tsIp = (ts(["ip", "-4"]) || "").trim().split(/\s+/)[0];
if (!tsIp) die("Tailscale isn't installed or isn't connected.\n       Install it from https://tailscale.com/download, sign in, then run this again.");
let tsName = "";
try { tsName = JSON.parse(ts(["status", "--json"]) || "{}").Self.DNSName.replace(/\.$/, ""); } catch {}

// --- Helpers -----------------------------------------------------------------
fs.mkdirSync(PC_HOME, { recursive: true });

function startPaperclip(args, env = {}) {
  const out = fs.openSync(LOG, "w");
  const child = spawn(WIN ? "npx.cmd" : "npx", ["-y", "paperclipai", ...args], {
    stdio: ["ignore", out, out],
    env: { ...process.env, ...env },
    detached: !WIN, // own process group on macOS/Linux so we can stop it cleanly
    shell: WIN,     // Windows needs a shell to run npx.cmd
  });
  return child;
}
function stopPaperclip(child) {
  if (!child || child.exitCode !== null) return;
  try {
    if (WIN) execFileSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else process.kill(-child.pid, "SIGTERM");
  } catch {}
}
async function waitFor(base, child) {
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) return false;
    try { if ((await fetch(`${base}/api/health`)).ok) return true; } catch {}
    await sleep(3000);
  }
  return false;
}
async function api(base, method, p, body) {
  const res = await fetch(base + p, {
    method, headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) die(`${method} ${p} failed: ${res.status} ${(await res.text()).slice(0, 400)}`);
  return res.json();
}
async function createTeam(base) {
  const co = TEAM.company;
  let company = (await api(base, "GET", "/api/companies")).find((c) => c.name === co.name);
  if (!company) company = await api(base, "POST", "/api/companies", co);
  const ids = {};
  for (const a of await api(base, "GET", `/api/companies/${company.id}/agents`)) ids[a.name] = a.id;
  for (const a of TEAM.agents) {
    if (ids[a.name]) continue;
    const body = {
      name: a.name, role: a.role, title: a.title, icon: a.icon, capabilities: a.capabilities,
      adapterType: "claude_local", adapterConfig: { cwd: REPO_DIR },
      instructionsBundle: { files: { "AGENTS.md": a.instructions } },
      runtimeConfig: { heartbeat: { enabled: false, wakeOnDemand: true } },
      budgetMonthlyCents: TEAM.agentBudgetMonthlyCents,
    };
    if (a.reportsTo) body.reportsTo = ids[a.reportsTo];
    if (a.role === "ceo") body.permissions = { canCreateAgents: true };
    const res = await api(base, "POST", `/api/companies/${company.id}/agent-hires`, body);
    ids[a.name] = (res.agent || res).id;
  }
  await api(base, "PATCH", `/api/companies/${company.id}`, { budgetMonthlyCents: co.budgetMonthlyCents });
  for (const id of Object.values(ids)) {
    await api(base, "PATCH", `/api/agents/${id}`, { budgetMonthlyCents: TEAM.agentBudgetMonthlyCents });
  }
  console.log(`Created ${co.name}: ${Object.keys(ids).join(", ")} (budget $${co.budgetMonthlyCents / 100}/month)`);
}
const readConfig = () => (fs.existsSync(CONFIG) ? JSON.parse(fs.readFileSync(CONFIG, "utf8")) : null);

// --- First run: create the team while Paperclip is in local-only mode ---------
const LOCAL = "http://localhost:3100";
if (readConfig()?.server?.deploymentMode !== "authenticated") {
  try { if ((await fetch(`${LOCAL}/api/health`)).ok) die("Something is already running on port 3100. Close it and run this again."); } catch {}
  console.log("First-time setup: installing Paperclip and creating your team (this can take a few minutes)...");
  const child = startPaperclip(readConfig() ? ["run"] : ["onboard", "-y", "--no-install-service"]);
  if (!(await waitFor(LOCAL, child))) { stopPaperclip(child); die(`Paperclip failed to start. See ${LOG}`); }
  await createTeam(LOCAL);
  stopPaperclip(child);
  await sleep(4000);
}

// --- Switch to sign-in mode on the Tailscale network --------------------------
const cfg = readConfig();
if (!cfg) die(`Paperclip config not found at ${CONFIG}. See ${LOG}`);
Object.assign(cfg.server, { deploymentMode: "authenticated", exposure: "private", bind: "tailnet" });
cfg.server.allowedHostnames = [...new Set([...(cfg.server.allowedHostnames || []), tsIp, tsName].filter(Boolean))].sort();
cfg.auth = { baseUrlMode: "auto", ...(cfg.auth || {}) };
fs.writeFileSync(CONFIG, JSON.stringify(cfg, null, 2));

const URL_IP = `http://${tsIp}:3100`;
console.log("Starting Paperclip on your Tailscale network...");
const server = startPaperclip(["run"], { PAPERCLIP_TAILNET_BIND_HOST: tsIp });
const shutdown = () => { stopPaperclip(server); process.exit(0); };
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
if (!(await waitFor(URL_IP, server))) { stopPaperclip(server); die(`Paperclip failed to start. See ${LOG}`); }
await sleep(2000);

const logText = fs.readFileSync(LOG, "utf8").replace(/\x1b\[[0-9;]*m/g, "");
let claim = (logText.match(/https?:\/\/\S*\/board-claim\/\S+/) || [""])[0];
claim = claim.replace("127.0.0.1", tsIp).replace("localhost", tsIp);

const lines = [
  "==============================================================",
  " Paperclip is running. Open it on any device signed in to",
  " your Tailscale account (phone, laptop, this computer):",
  "",
  `   ${URL_IP}`,
  ...(tsName ? [`   http://${tsName}:3100`] : []),
];
if (claim) {
  lines.push(
    "",
    " FIRST TIME ONLY:",
    '  1. Open the address above, choose "Need an account? Create one",',
    "     and pick your email + password. That is your login.",
    "  2. While signed in, open this one-time link to take ownership",
    "     of your Glass-box team:",
    "",
    `     ${claim}`,
  );
}
lines.push(
  "",
  " Keep this window open. Press Ctrl+C to stop Paperclip.",
  ` Server log: ${LOG}`,
  "==============================================================",
);
console.log("\n" + lines.join("\n"));

server.on("exit", (code) => { console.log(`Paperclip stopped (exit code ${code}). See ${LOG}`); process.exit(code ?? 0); });
