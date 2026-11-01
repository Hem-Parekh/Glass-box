#!/usr/bin/env node
// Run Paperclip with the Glass-box dev team on THIS computer only
// (Windows, macOS or Linux). Opens http://localhost:3100 in your browser.
//
// - Only this computer can reach it, so there is no sign-in.
// - Agents use the Claude Code login on this computer (your Pro plan).
//   Spending is capped at $20/month ($5 per agent), see team.json.
//
// Needs: Node.js 24+ and Claude Code signed in with your Pro account.
// Usage, from the Glass-box folder:  node paperclip/run-local.mjs

import {
  CONFIG, LOCAL, LOG, createTeam, die, isUp, openBrowser, preflight,
  readConfig, startPaperclip, stopPaperclip, waitFor, writeConfig,
} from "./lib.mjs";

preflight();
if (await isUp(LOCAL)) die(`Paperclip is already running. Open ${LOCAL} in your browser.`);

// If run-tailscale.mjs switched Paperclip to sign-in mode, switch it back to
// this-computer-only mode. Your company and agents are kept.
const cfg = readConfig();
if (cfg && cfg.server.deploymentMode !== "local_trusted") {
  Object.assign(cfg.server, { deploymentMode: "local_trusted", exposure: "private", bind: "loopback", host: "127.0.0.1" });
  writeConfig(cfg);
  console.log(`Switched Paperclip back to this-computer-only mode (${CONFIG}).`);
}

console.log(cfg ? "Starting Paperclip..." : "First-time setup: installing Paperclip (this can take a few minutes)...");
const server = startPaperclip(cfg ? ["run"] : ["onboard", "-y", "--no-install-service"]);
const shutdown = () => { stopPaperclip(server); process.exit(0); };
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
if (!(await waitFor(LOCAL, server))) { stopPaperclip(server); die(`Paperclip failed to start. See ${LOG}`); }

await createTeam(LOCAL);
if (cfg) openBrowser(LOCAL); // first-time onboarding opens the browser itself

console.log([
  "",
  "==============================================================",
  ` Paperclip is running:  ${LOCAL}`,
  "",
  " Open that address in your browser on this computer.",
  " Keep this window open. Press Ctrl+C to stop Paperclip.",
  ` Server log: ${LOG}`,
  "==============================================================",
].join("\n"));

server.on("exit", (code) => { console.log(`Paperclip stopped (exit code ${code}). See ${LOG}`); process.exit(code ?? 0); });
