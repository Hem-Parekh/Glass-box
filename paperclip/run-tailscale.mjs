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

import { execFileSync } from "node:child_process";
import path from "node:path";
import {
  CONFIG, LOCAL, LOG, WIN, createTeam, die, isUp, preflight, readConfig,
  sleep, startPaperclip, stopPaperclip, waitFor, writeConfig,
} from "./lib.mjs";
import fs from "node:fs";

preflight();

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

// --- First run: create the team while Paperclip is in local-only mode ---------
if (readConfig()?.server?.deploymentMode !== "authenticated") {
  if (await isUp(LOCAL)) die("Something is already running on port 3100. Close it and run this again.");
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
writeConfig(cfg);

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
