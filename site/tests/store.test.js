/* The demo store (site/store.js) must follow the same rules as the server. This runs the rule scenarios from
   server/tests/test_server.py against it, plus seed and formatting parity with Python.
   Run from anywhere: node site/tests/store.test.js   (exits non-zero on failure) */
"use strict";
const path = require("path");
const assert = require("assert");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const PY = process.env.PYTHON || "python3";
const TODAY = "2026-10-19";
const py = (code) => JSON.parse(execSync(PY + " -c " + JSON.stringify("import json,sys; sys.path.insert(0,'.'); " + code), { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20 }));

// ---------- browser stand-ins ----------
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
if (!globalThis.crypto || !globalThis.crypto.subtle) globalThis.crypto = require("crypto").webcrypto;
globalThis.GB_SEED = py("from server.seed import markers; print(json.dumps(markers()))");
globalThis.GB_TODAY = TODAY;
const DOM = require(path.join(ROOT, "site", "domain.js"));
const { api, ACTIONS, resolveSeed, helpers } = require(path.join(ROOT, "site", "store.js"));

// ---------- helpers mirroring the Python test client ----------
async function login(email, pw = "demo1234") { await api.logout(); return api.login(email, pw); }
async function act(name, payload, status = 200) {
  try {
    const r = await api.act(name, payload);
    assert.strictEqual(status, 200, name + " should have failed with " + status + " but returned " + JSON.stringify(r));
    return r;
  } catch (e) {
    if (e instanceof assert.AssertionError) throw e;
    assert.strictEqual(e.status, status, name + ": " + e.message);
    return { error: e.message };
  }
}
const state = () => api.state();
const db = () => api._db();
const fy = DOM.fy(TODAY);
const CHECKS = { validation: true, founder_confirmed: true, verifier: true };
const sumBy = (xs, f) => xs.reduce((a, x) => a + f(x), 0);

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

// ---------- parity with Python ----------
test("seed resolves exactly like server/seed.py resolved()", async () => {
  const want = py("from server.seed import resolved; print(json.dumps(resolved(%r)))".replace("%r", JSON.stringify(TODAY)));
  assert.deepStrictEqual(resolveSeed(globalThis.GB_SEED, TODAY), want);
});

test("every server action is ported", async () => {
  const names = py("from server.actions import ACTIONS; print(json.dumps(sorted(ACTIONS)))");
  assert.deepStrictEqual(Object.keys(ACTIONS).sort(), names);
});

test("rs, ddmmmyyyy and number parsing match Python", async () => {
  const vals = [0, 5, 99, 100, 12345, 100000, 12345678, 1234567890, -250, 60000000000, 5750000 * 10];
  const want = py("from server.actions import rs; print(json.dumps([rs(v) for v in " + JSON.stringify(vals) + "]))");
  assert.deepStrictEqual(vals.map(helpers.rs), want);
  const dates = ["2026-10-24", "2027-02-28", "2026-01-01"];
  assert.deepStrictEqual(dates.map(helpers.ddmmmyyyy), py("from server.actions import ddmmmyyyy; print(json.dumps([ddmmmyyyy(v) for v in " + JSON.stringify(dates) + "]))"));
  const raw = ["12", " 7 ", "1e3", "1.5", "abc", "", null, true, 3.0, "inf", "1_000"];
  assert.deepStrictEqual(raw.map(helpers.inum), py("from server.actions import inum; print(json.dumps([inum(v) for v in " + JSON.stringify(raw).replace(/null/g, "None").replace(/true/g, "True") + "]))"));
});

// ---------- server/tests/test_server.py scenarios ----------
test("test_seed_matches_the_brief", async () => {
  const st = db();
  assert.strictEqual(st.users.filter((u) => u.role === "investor").length, 25);
  assert.strictEqual(st.users.filter((u) => u.role === "lender").length, 4);
  assert.strictEqual(st.loans.length, 6);
  assert.strictEqual(DOM.platformInvestors(st, "c_vasai").length, 19);
  assert.strictEqual(DOM.offersUsed(st, "c_kalyan", fy, "equity"), 195);
  assert.strictEqual(sumBy(st.loans, (l) => DOM.loanSummary(l, TODAY).overdue), 1);
  for (const c of ["c_vasai", "c_taloja"]) assert.ok(st.valuations.filter((v) => v.company_id === c).length >= 2);
  assert.strictEqual(st.sell_requests.filter((x) => x.status === "submitted").length, 1);
  assert.strictEqual(st.loan_transfers.length, 1);
  assert.ok(new Set(st.companies.map((c) => c.pipeline_stage)).size >= 3);
});

test("test_cannot_sell_before_six_months", async () => {
  await login("investor@demo.in");
  const r = await act("request_sell", { holding_id: "h_t1" }, 403);
  assert.ok(r.error.includes("Locked") && r.error.includes("24 Oct 2026"), r.error);
  await act("request_sell", { holding_id: "h_v1", shares: 1000, indicative_price_paise: 19500, note: "part sale" });
  const s = await state();
  assert.ok(s.sell_requests.some((x) => x.holding_id === "h_v1" && x.status === "submitted" && !x.full));
  await login("advisor@demo.in");
  await act("record_consent", { holding_id: "h_t1", note: "Farah Shaikh, letter dated 15 Oct 2026" });
  await login("investor@demo.in");
  await act("request_sell", { holding_id: "h_t1" });
});

test("test_offer_over_200_in_a_financial_year_is_blocked", async () => {
  await login("advisor@demo.in");
  for (const sfx of ["23", "25"]) await act("set_investor_profile", { investor_id: "u_investor" + sfx, kyc: "verified" });
  const five = ["21", "22", "23", "24", "25"].map((s) => "u_investor" + s);
  await api.logout();
  const fresh = await api.signup({ name: "Six", email: "six@x.in", password: "secret123", role: "investor" });
  await login("advisor@demo.in");
  await act("set_investor_profile", { investor_id: fresh.id, kyc: "verified" });
  const r = await act("share_offer", { company_id: "c_kalyan", investor_ids: five.concat([fresh.id]) }, 403);
  assert.ok(r.error.includes("Section 42"), r.error);
  assert.strictEqual(DOM.offersUsed(db(), "c_kalyan", fy, "equity"), 195);
  await act("share_offer", { company_id: "c_kalyan", investor_ids: five });
  assert.strictEqual(DOM.offersUsed(db(), "c_kalyan", fy, "equity"), 200);
  await act("share_offer", { company_id: "c_kalyan", investor_ids: [fresh.id] }, 403);
  await act("share_offer", { company_id: "c_kalyan", investor_ids: ["u_investor21"] }, 403);
  await act("share_offer", { company_id: "c_kalyan", investor_ids: [fresh.id], security_type: "debentures" });
});

test("test_twenty_first_platform_investor_is_blocked", async () => {
  await login("advisor@demo.in");
  await act("set_stage", { company_id: "c_vasai", stage: "offering" });
  await act("share_offer", { company_id: "c_vasai", investor_ids: ["u_investor21", "u_investor22"] });
  const offers = {};
  for (const o of (await state()).offers) if (o.company_id === "c_vasai") offers[o.investor_id] = o;
  for (const sfx of ["21", "22"]) {
    await login("inv" + sfx + "@demo.in");
    await act("respond_offer", { offer_id: offers["u_investor" + sfx].id, response: "interested" });
  }
  await login("advisor@demo.in");
  await act("allot_shares", { offer_id: offers.u_investor21.id, shares: 10000, amount_paise: 10000 * 18400 });
  assert.strictEqual(DOM.platformInvestors(db(), "c_vasai").length, 20);
  const r = await act("allot_shares", { offer_id: offers.u_investor22.id, shares: 10000, amount_paise: 10000 * 18400 }, 403);
  assert.ok(r.error.includes("platform investors"), r.error);
  await act("save_settings", { max_platform_investors: 21 });
  await act("allot_shares", { offer_id: offers.u_investor22.id, shares: 10000, amount_paise: 10000 * 18400 });
});

test("test_partial_resale_that_adds_a_member_over_200_is_blocked", async () => {
  await login("advisor@demo.in");
  await act("save_cap_entry", { company_id: "c_vasai", entry_id: "ct_v3", holder_name: "Employees and early shareholders", holder_type: "existing", shares: 900000, holders: 178 });
  assert.strictEqual(DOM.members(db(), "c_vasai"), 200);
  await login("investor@demo.in");
  await act("request_sell", { holding_id: "h_v1", shares: 1000 });
  const rid = (await state()).sell_requests.find((x) => x.holding_id === "h_v1").id;
  await login("advisor@demo.in");
  await act("sell_step", { request_id: rid, step: "review" });
  await act("sell_step", { request_id: rid, step: "rofr", days: 15 });
  await act("sell_step", { request_id: rid, step: "buyer", buyer_investor_id: "u_investor21" }, 403);
  const r = await act("sell_step", { request_id: rid, step: "buyer", buyer_investor_id: "u_investor21", waived: true }, 403);
  assert.ok(r.error.includes("members"), r.error);
  for (const step of [{ step: "review" }, { step: "rofr", days: 20 }, { step: "buyer", buyer_investor_id: "u_investor21", waived: true },
    { step: "spa", price_paise: 19000 }, { step: "complete" }]) await act("sell_step", Object.assign({}, step, { request_id: "s_1" }));
  const st = db();
  assert.strictEqual(DOM.members(st, "c_vasai"), 200);
  assert.strictEqual(st.holdings.find((h) => h.id === "h_v3").shares, 0);
  const t = st.transfers[0];
  assert.ok(t.to_investor_id === "u_investor21" && t.price_paise === 19000);
  const fresh = st.holdings.find((h) => h.investor_id === "u_investor21" && h.company_id === "c_vasai");
  assert.ok(fresh.shares === t.shares && fresh.cost_paise === t.shares * 19000 && fresh.origin === "transfer");
});

test("test_revaluation_updates_portfolio_value_and_gain", async () => {
  const s0 = DOM.portfolio(db(), "u_investor", TODAY, DOM.SETTINGS_DEFAULT);
  assert.strictEqual(s0.rows.find((r) => r.company_id === "c_vasai").price, 18400);
  await login("advisor@demo.in");
  await act("publish_valuation", { company_id: "c_vasai", date: TODAY, method: "DCF", price_per_share_paise: 20500, valuer: "R. K. Valuers" });
  await act("publish_valuation", { company_id: "c_vasai", date: "2026-11-01", method: "DCF", price_per_share_paise: 1, valuer: "x" }, 403);
  const s1 = DOM.portfolio(db(), "u_investor", TODAY, DOM.SETTINGS_DEFAULT);
  const row = s1.rows.find((r) => r.company_id === "c_vasai"), h = db().holdings.find((x) => x.id === "h_v1");
  assert.ok(row.price === 20500 && row.valuation_date === TODAY);
  assert.strictEqual(row.value, h.shares * 20500);
  assert.strictEqual(row.gain, h.shares * 20500 - h.cost_paise);
  assert.ok(Math.abs(row.gain_pct - (20500 - 16000) / 16000) < 1e-12);
  assert.strictEqual(s1.value - s0.value, h.shares * (20500 - 18400));
  await login("investor@demo.in");
  assert.ok((await state()).notifications.some((n) => n.kind === "valuation" && n.text.includes("Rs 205")));
});

test("test_ownership_is_shares_over_fully_diluted", async () => {
  const st = db();
  const fd = 4200000 + 1800000 + 900000 + 300000 + 200000 + sumBy(st.holdings.filter((h) => h.company_id === "c_vasai"), (h) => h.shares);
  assert.strictEqual(DOM.fdShares(st, "c_vasai"), fd);
  const h = st.holdings.find((x) => x.id === "h_v1");
  assert.strictEqual(DOM.holdingView(st, h, TODAY, DOM.SETTINGS_DEFAULT).ownership, h.shares / fd);
});

test("test_loan_interest_and_principal_match_the_schedule", async () => {
  const l2 = db().loans.find((l) => l.id === "l_2");
  const rows = DOM.schedule(l2, TODAY);
  assert.strictEqual(rows[0].interest, 5750000 * 10);
  assert.ok(sumBy(rows, (r) => r.principal) === l2.amount_paise && rows[rows.length - 1].closing === 0);
  for (const r of rows) assert.strictEqual(r.opening - r.principal, r.closing);
  const s = DOM.loanSummary(l2, TODAY), paid = rows.filter((r) => r.status === "paid");
  assert.strictEqual(s.interest_earned, sumBy(paid, (r) => r.interest));
  assert.ok(s.principal_pending === paid[paid.length - 1].closing && s.principal_pending === l2.amount_paise - sumBy(paid, (r) => r.principal));
  assert.ok(s.overdue === 1 && s.next_due === rows.find((r) => r.status === "overdue").due);
  const l1 = db().loans.find((l) => l.id === "l_1");
  assert.ok(DOM.schedule(l1, TODAY).slice(0, 6).every((r) => r.principal === 0) && DOM.schedule(l1, TODAY)[6].principal > 0);
  await login("lender@demo.in");
  await act("record_repayment", { loan_id: "l_2", due: s.next_due });
  const s2 = DOM.loanSummary(db().loans.find((l) => l.id === "l_2"), TODAY), row = rows.find((r) => r.due === s.next_due);
  assert.ok(s2.overdue === 0 && s2.interest_earned === s.interest_earned + row.interest);
  assert.strictEqual(s2.principal_pending, s.principal_pending - row.principal);
});

test("test_each_role_sees_only_its_own_data", async () => {
  await login("investor@demo.in");
  let s = await state();
  assert.deepStrictEqual(new Set(s.holdings.map((h) => h.investor_id)), new Set(["u_investor"]));
  assert.ok(!("cap_table" in s) && !("loans" in s) && s.companies.every((c) => !("twin" in c)));
  assert.deepStrictEqual(new Set(s.directory.map((d) => d.role)), new Set(["advisor"]));
  assert.ok(!s.companies.some((c) => c.id === "c_nashik"));
  assert.ok(s.today === TODAY && s.settings.max_platform_investors === 20);
  await act("request_sell", { holding_id: "h_v3" }, 403);
  await act("respond_offer", { offer_id: "o_k2", response: "interested" }, 403);
  await login("founder@demo.in");
  s = await state();
  assert.deepStrictEqual(s.companies.map((c) => c.id), ["c_kalyan"]);
  const hidden = s.offers.filter((o) => o.investor_id === null);
  assert.ok(hidden.length && hidden.every((o) => o.investor_name.startsWith("Name shared")));
  assert.deepStrictEqual(new Set(s.offers.filter((o) => o.investor_id).map((o) => o.investor_name)), new Set(["Sahyadri Angels Network", "Menon Investments (sample)"]));
  await act("share_offer", { company_id: "c_kalyan", investor_ids: ["u_investor21"] }, 403);
  await login("lender@demo.in");
  s = await state();
  assert.deepStrictEqual(new Set(s.loans.map((l) => l.id)), new Set(["l_1", "l_2", "l_3"]));
  await act("record_repayment", { loan_id: "l_4", due: "2026-10-14" }, 403);
  await act("publish_valuation", { company_id: "c_vasai" }, 403);
});

test("test_files_follow_the_same_rules (demo uploads)", async () => {
  const file = (name, body, size) => { const b = new Blob([body]); return { name, size: size === undefined ? b.size : size, arrayBuffer: () => b.arrayBuffer() }; };
  await login("advisor@demo.in");
  const rec = await api.upload(file("valuation.pdf", "%PDF-1.4 report"), { company_id: "c_taloja", purpose: "valuation_report" });
  assert.ok(rec.id && rec.mime === "application/pdf" && rec.size === 15 && !("data_url" in rec));
  await act("publish_valuation", { company_id: "c_taloja", date: TODAY, method: "DCF", price_per_share_paise: 9800, valuer: "Mehta & Associates", file_id: rec.id });
  const kalyan = await api.upload(file("kalyan valuation.pdf", "%PDF-1.4 k"), { company_id: "c_kalyan", purpose: "valuation_report" });
  assert.ok(!JSON.stringify(await state()).includes("data:application/pdf"), "state() must not carry file contents");
  await assert.rejects(api.upload(file("evil.exe", "x"), { company_id: "c_taloja", purpose: "dataroom" }), /Upload a PDF/);
  await assert.rejects(api.upload(file("big.pdf", "x", 2 * 1024 * 1024), { company_id: "c_taloja", purpose: "dataroom" }), /1.5 MB/);
  await login("angels@demo.in"); // holds Taloja
  const got = await api.download(rec.id);
  assert.ok(got.name === "valuation.pdf" && got.mime === "application/pdf");
  assert.strictEqual(Buffer.from(got.url.split(",")[1], "base64").toString(), "%PDF-1.4 report");
  assert.ok(!JSON.stringify(await state()).includes("data:"), "investor state must not carry file contents");
  await login("familyoffice@demo.in"); // does not hold Taloja
  await assert.rejects(api.download(rec.id), /File not found\./);
  await login("investor@demo.in"); // holds Vasai and Taloja, not Kalyan
  await assert.rejects(api.download(kalyan.id), /File not found\./);
  await login("founder@demo.in"); // a founder uploads only data-room and monitoring files for their own company
  await assert.rejects(api.upload(file("v.pdf", "x"), { company_id: "c_kalyan", purpose: "valuation_report" }), /cannot upload/);
  await api.upload(file("deck.pdf", "x"), { company_id: "c_kalyan", purpose: "dataroom" });
});

test("test_audit_log_records_every_state_change", async () => {
  await login("advisor@demo.in");
  await act("sell_step", { request_id: "s_1", step: "review" });
  await act("publish_valuation", { company_id: "c_vasai", date: TODAY, method: "DCF", price_per_share_paise: 19000, valuer: "R. K. Valuers" });
  await act("set_stage", { company_id: "c_nashik", stage: "rejected" });
  await act("set_investor_profile", { investor_id: "u_investor23", kyc: "verified" });
  const rows = (await state()).audit;
  assert.deepStrictEqual(Object.keys(rows[0]).sort(), ["action", "at", "changes", "company_id", "detail", "id", "user_id", "user_name"]);
  assert.strictEqual(rows[0].action, "set_investor_profile"); // newest first
  const by = {};
  for (const r of rows) by[r.action] = r;
  const s1 = by.sell_step.changes.find((c) => c.id === "s_1").diff;
  assert.deepStrictEqual(s1.status, ["submitted", "under_review"]);
  assert.ok(by.publish_valuation.changes.some((c) => c.collection === "valuations" && JSON.stringify(c.diff) === '{"created":true}'));
  assert.deepStrictEqual(by.set_stage.changes.find((c) => c.id === "c_nashik").diff.pipeline_stage, ["under_review", "rejected"]);
  const prof = by.set_investor_profile.changes.find((c) => c.collection === "users" && c.id === "u_investor23").diff.profile;
  assert.ok(prof[0].kyc === "pending" && prof[1].kyc === "verified");
  assert.ok(rows.filter((r) => r.action in by).every((r) => r.user_name === "CA Neha Joshi"));
  assert.strictEqual(by.login.changes, null);
  // a refused action changes nothing and is not logged
  const n = db().audit.length;
  await act("set_stage", { company_id: "c_nashik", stage: "rejected" }, 403);
  assert.strictEqual(db().audit.length, n);
});

test("test_loan_transfer_between_regulated_lenders", async () => {
  await login("advisor@demo.in");
  await act("loan_transfer_step", { transfer_id: "lt_1", step: "consent" }, 403);
  await act("loan_transfer_step", { transfer_id: "lt_1", step: "eligibility" });
  await act("loan_transfer_step", { transfer_id: "lt_1", step: "consent" });
  await act("loan_transfer_step", { transfer_id: "lt_1", step: "buyer_introduced", buyer_lender_id: "u_lender2" }, 403);
  await act("loan_transfer_step", { transfer_id: "lt_1", step: "buyer_introduced", buyer_lender_id: "u_lender4" });
  await act("loan_transfer_step", { transfer_id: "lt_1", step: "deed_signed" });
  await act("loan_transfer_step", { transfer_id: "lt_1", step: "charge_updated" });
  await act("loan_transfer_step", { transfer_id: "lt_1", step: "completed", fee_rate: 0.006 }, 403);
  await act("loan_transfer_step", { transfer_id: "lt_1", step: "completed", fee_rate: 0.004 });
  const st = db(), l4 = st.loans.find((l) => l.id === "l_4");
  assert.strictEqual(l4.lender_id, "u_lender4");
  const fee = st.invoices.find((f) => f.kind === "transfer");
  assert.ok(fee.amount_paise === DOM.halfUp(DOM.loanSummary(l4, TODAY).principal_pending * 0.004) && fee.payer_id === "u_lender2");
  await login("deccan@demo.in");
  assert.ok((await state()).loans.some((l) => l.id === "l_4"));
  await api.logout();
  const me = await api.signup({ name: "L", email: "l@x.in", password: "secret123", role: "lender" });
  assert.deepStrictEqual(me.profile, { regulated: false, lender_type: null, reg_no: null });
  assert.ok((await state()).directory.filter((d) => d.role === "lender" && d.id.startsWith("u_lender")).every((d) => (d.profile || {}).regulated));
});

test("sign-in, sign-up and session match the server", async () => {
  await assert.rejects(api.state(), /Please sign in\./);
  await assert.rejects(api.login("founder@demo.in", "nope"), /Email or password is wrong\./);
  const me = await login("investor@demo.in");
  assert.deepStrictEqual(Object.keys(me).sort(), ["company_id", "email", "firm", "id", "mandate", "name", "profile", "role", "title"]);
  assert.notStrictEqual(db().users.find((u) => u.id === "u_investor").profile.last_active, me.profile.last_active);
  await api.logout();
  await assert.rejects(api.signup({ name: "X", email: "x@y.in", password: "1234567", role: "founder" }), /at least 8/);
  await assert.rejects(api.signup({ name: "X", email: "x@y.in", password: "12345678", role: "advisor" }), /Choose founder/);
  await assert.rejects(api.signup({ name: "X", email: "founder@demo.in", password: "12345678", role: "founder" }), /already exists/);
  await api.signup({ name: "New", email: "new@co.in", password: "secret123", role: "founder", org: "NewCo" });
  const s = await state();
  assert.ok(s.companies.length === 1 && s.companies[0].name === "NewCo" && s.companies[0].pipeline_stage === "applied");
  await api.logout();
  await login("new@co.in", "secret123");
  // with the wrong password above, this makes five failures
  for (let i = 0; i < 4; i++) await assert.rejects(api.login("founder@demo.in", "nope"), /wrong/);
  await assert.rejects(api.login("founder@demo.in", "demo1234"), /Too many attempts/);
});

// ---------- runner ----------
(async () => {
  let failed = 0;
  for (const [name, fn] of tests) {
    await api.reset();
    try { await fn(); console.log("ok   " + name); } catch (e) { failed += 1; console.log("FAIL " + name + "\n     " + (e.stack || e).toString().split("\n").slice(0, 4).join("\n     ")); }
  }
  console.log((tests.length - failed) + " passed, " + failed + " failed");
  process.exit(failed ? 1 : 0);
})();
