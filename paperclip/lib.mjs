// Shared helpers for run-local.mjs and run-tailscale.mjs.
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const WIN = process.platform === "win32";
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_DIR = path.dirname(HERE);
export const PC_HOME = path.join(os.homedir(), ".paperclip");
export const CONFIG = path.join(PC_HOME, "instances", "default", "config.json");
export const LOG = path.join(PC_HOME, "glass-box-server.log");
export const LOCAL = "http://localhost:3100";
const TEAM = JSON.parse(fs.readFileSync(path.join(HERE, "team.json"), "utf8"));

export const die = (msg) => { console.error(`\nERROR: ${msg}\n`); process.exit(1); };
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function preflight() {
  if (!WIN && process.getuid && process.getuid() === 0) die("Run this as your normal user, not with sudo.");
  try {
    execFileSync(WIN ? "where" : "which", ["claude"], { stdio: "ignore" });
  } catch {
    console.warn("Note: Claude Code isn't installed, so agents can't run yet.\n" +
      "      Install it with:  npm install -g @anthropic-ai/claude-code   then run  claude  and log in.\n");
  }
  fs.mkdirSync(PC_HOME, { recursive: true });
}

export const readConfig = () => (fs.existsSync(CONFIG) ? JSON.parse(fs.readFileSync(CONFIG, "utf8")) : null);
export const writeConfig = (cfg) => fs.writeFileSync(CONFIG, JSON.stringify(cfg, null, 2));

export function startPaperclip(args, env = {}) {
  const out = fs.openSync(LOG, "w");
  return spawn(WIN ? "npx.cmd" : "npx", ["-y", "paperclipai", ...args], {
    stdio: ["ignore", out, out],
    env: { ...process.env, ...env },
    detached: !WIN, // own process group on macOS/Linux so we can stop it cleanly
    shell: WIN,     // Windows needs a shell to run npx.cmd
  });
}

export function stopPaperclip(child) {
  if (!child || child.exitCode !== null) return;
  try {
    if (WIN) execFileSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else process.kill(-child.pid, "SIGTERM");
  } catch {}
}

export async function isUp(base) {
  try { return (await fetch(`${base}/api/health`)).ok; } catch { return false; }
}

export async function waitFor(base, child) {
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) return false;
    if (await isUp(base)) return true;
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

// Creates the company and agents from team.json (skips any that exist) and
// re-applies the budget caps. Needs Paperclip in local-only (no sign-in) mode.
export async function createTeam(base) {
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
  console.log(`${co.name}: ${Object.keys(ids).join(", ")} (budget $${co.budgetMonthlyCents / 100}/month)`);
}

export function openBrowser(url) {
  try {
    if (WIN) spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", detached: true }).unref();
    else spawn(process.platform === "darwin" ? "open" : "xdg-open", [url], { stdio: "ignore", detached: true }).on("error", () => {}).unref();
  } catch {}
}
