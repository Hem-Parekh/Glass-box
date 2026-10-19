/* Demo data store: the same accounts, roles, rules and actions as the real server, kept in this browser's
   localStorage. A line-for-line mirror of server/actions.py (visibility and every action) and of the parts of
   server/app.py that touch data (sign-in, sign-up, the audit log with before/after diffs, uploads, downloads).
   The demo data comes from server/seed.py: site/build.py injects window.GB_SEED (relative-date markers) and
   resolveSeed() below turns it into dates the same way server/seed.py finalize() does.
   Protects nothing; for demonstration only. site/tests/store.test.js runs the server's rule tests against it. */
(function (root) {
  "use strict";
  const DOM = root.DOM || (typeof require === "function" ? require("./domain.js") : null);
  const KEY = "gb_demo_db_v2", SESSION = "gb_demo_session_v2";
  const DEMO_PASSWORD = "demo1234";
  const MAX_UPLOAD = 1.5 * 1024 * 1024; // the file is kept in localStorage as a data URL

  const COLLECTIONS = ["companies", "reports", "cap_table", "holdings", "offers", "valuations", "sell_requests", "transfers",
    "loans", "loan_transfers", "invoices", "notes", "notifications", "files", "enquiries", "settings"];
  const COMPANY_FIELDS = ["name", "sector", "stage", "city", "revenue", "raise", "instrument", "twin", "readiness", "quarters", "covenants", "docs"];
  const ADVISOR_COMPANY_FIELDS = ["offer_price_paise", "fd_extra_shares", "security_type", "raise_paise"];
  const SELL_OPEN = ["submitted", "under_review", "rofr", "buyer_introduced", "spa_signed"];
  const LT_STEPS = ["submitted", "eligibility", "consent", "buyer_introduced", "deed_signed", "charge_updated", "completed"];
  const UPLOAD_TYPES = { ".pdf": "application/pdf", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xls": "application/vnd.ms-excel",
    ".csv": "text/csv", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };
  const UPLOAD_PURPOSES = ["valuation_report", "dataroom", "monitoring", "loan_doc"];
  const USER_KEYS = ["id", "email", "name", "role", "company_id", "firm", "title", "mandate", "profile"];

  // ---------- errors: Denied is a 403 with the rule's message; anything else the server would answer with a 500 ----------
  class Denied extends Error { constructor(msg) { super(msg); this.status = 403; } }
  const fail = (msg, status) => Object.assign(new Error(msg), { status });
  const crash = () => fail("Something went wrong (500).", 500); // what the server adapter shows for an unhandled server error
  const STATUS_LABEL = { submitted: "submitted", under_review: "under review", rofr: "first-refusal window started", buyer_introduced: "buyer introduced",
    spa_signed: "SPA signed", completed: "transfer complete", rejected: "rejected", withdrawn: "withdrawn", eligibility: "eligibility checked",
    consent: "borrower consent recorded", deed_signed: "assignment deed signed", charge_updated: "charge updated with the ROC" };
  const need = (cond, msg) => { if (!cond) throw new Denied(msg); };
  /** Mirror of actions.valid_date: a real YYYY-MM-DD date or a refusal. */
  function validDate(v, msg) {
    const s = String(v), m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    const ok = m && +m[2] >= 1 && +m[2] <= 12 && +m[3] >= 1 && +m[3] <= new Date(Date.UTC(+m[1], +m[2], 0)).getUTCDate();
    need(ok, msg || "Enter a valid date");
    return s;
  }

  // ---------- Python semantics the rules rely on ----------
  const has = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k);
  const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  /** dict.get(k, d): a missing key (or one holding undefined) gives d. */
  const get = (o, k, d = null) => (has(o, k) && o[k] !== undefined ? o[k] : d);
  /** Python truthiness: None, False, 0, "", [] and {} are false. */
  const truthy = (v) => !(v == null || v === false || v === 0 || v === "" || Number.isNaN(v) || (Array.isArray(v) && !v.length) || (isObj(v) && !Object.keys(v).length));
  const or = (v, d) => (truthy(v) ? v : d);
  /** dict.setdefault(k, d) */
  const setdefault = (o, k, d) => { if (!has(o, k)) o[k] = d; return o[k]; };
  const pystr = (v) => (v == null ? "None" : v === true ? "True" : v === false ? "False" : String(v));
  /** s[:n], counted in code points like Python */
  const cut = (s, n) => Array.from(s).slice(0, n).join("");
  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  const spaced = (s) => s.split("_").join(" "); // str.replace("_", " ")
  /** a <= b for values Python can only compare when both are strings */
  const le = (a, b) => { if (typeof a !== typeof b) throw crash(); return a <= b; };

  function fnum(v) {
    let x;
    if (typeof v === "boolean") x = v ? 1 : 0;
    else if (typeof v === "number") x = v;
    else if (typeof v === "string") {
      const s = v.trim().replace(/(\d)_(?=\d)/g, "$1");
      x = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s) ? Number(s) : NaN;
    } else return null;
    return Number.isFinite(x) ? x : null;
  }
  const inum = (v) => { const x = fnum(v); return x !== null && Number.isInteger(x) ? x : null; };
  const floorDiv = (a, b) => Number(BigInt(a) / BigInt(b)); // non-negative integers only, like the // uses below

  /** Rs 1,23,45,678.90 (Indian grouping) for messages: server/actions.py rs(). */
  function rs(paise) {
    const neg = paise < 0, p = Math.abs(Math.trunc(paise));
    const r = Math.floor(p / 100), ps = p % 100;
    let s = String(r), head = s.slice(0, -3), tail = s.slice(-3);
    while (head.length > 2) { tail = head.slice(-2) + "," + tail; head = head.slice(0, -2); }
    s = head ? head + "," + tail : tail;
    return (neg ? "-" : "") + "Rs " + s + (ps === 0 ? "" : "." + String(ps).padStart(2, "0"));
  }
  /** format(n, ","): 1,234,567 */
  const commas = (n) => (n < 0 ? "-" : "") + DOM.group(Math.abs(n)); // Indian grouping, as actions.grp
  /** date.fromisoformat(s[:10]); a bad date is a server error, as in Python */
  function parseDate(s) {
    if (typeof s !== "string") throw crash();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.slice(0, 10));
    if (!m) throw crash();
    const y = +m[1], mo = +m[2], d = +m[3];
    if (y < 1 || mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) throw crash();
    return [y, mo, d];
  }
  const daysInMonth = (y, m) => [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  function ddmmmyyyy(s) { const [y, m, d] = parseDate(s); return d + " " + DOM.MON[m - 1] + " " + y; }

  const now = () => new Date().toISOString().replace("Z", "+00:00");
  function uid(prefix) {
    const b = new Uint8Array(5);
    if (root.crypto && root.crypto.getRandomValues) root.crypto.getRandomValues(b);
    else for (let i = 0; i < 5; i++) b[i] = Math.floor(Math.random() * 256);
    return prefix + "_" + Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  }
  const today = () => root.GB_TODAY || DOM.todayISO();
  const clone = (v) => JSON.parse(JSON.stringify(v));

  // ---------- seed: resolve server/seed.py markers exactly as finalize() / resolved() do ----------
  /** "@m,d" -> date, "@Tm,d" -> timestamp, "@fy[...]" and key "@fy" -> financial year, loan payments "@paid:N". */
  function resolveSeed(markers, day) {
    const rel = (s) => {
      const m = /^@(T?)(-?\d+),(-?\d+)$/.exec(s);
      if (!m) return s;
      const date = DOM.addDays(DOM.addMonths(day, +m[2]), +m[3]);
      return m[1] ? date + "T10:00:00+00:00" : date;
    };
    const walk = (x) => {
      if (Array.isArray(x)) return x.map(walk);
      if (isObj(x)) { const o = {}; for (const k of Object.keys(x)) o[k === "@fy" ? DOM.fy(day) : k] = walk(x[k]); return o; }
      if (typeof x === "string" && x.startsWith("@fy")) return DOM.fy(rel(x.slice(3)) || day);
      if (typeof x === "string") return rel(x);
      return x;
    };
    const data = walk(markers);
    for (const l of data.loans || []) {
      const skip = parseInt(String(l.payments).split(":")[1], 10);
      const due = [];
      for (let k = 1; k <= l.tenor_months; k++) { const x = DOM.addMonths(l.disbursal_date, k); if (x < day) due.push(x); }
      l.payments = {};
      for (const x of due.slice(0, due.length - skip)) l.payments[x] = x;
    }
    return data;
  }

  function seed() {
    const db = { users: [], audit: [] };
    for (const c of COLLECTIONS) db[c] = [];
    if (!root.GB_SEED) { db.settings = [Object.assign({}, DOM.SETTINGS_DEFAULT)]; return db; }
    const data = resolveSeed(root.GB_SEED, today());
    for (const c of COLLECTIONS) db[c] = data[c] || [];
    const at = now();
    db.users = (data.users || []).map((u) => { // same columns as the server's users table; seeded accounts use the demo password
      const row = {};
      for (const k of USER_KEYS) row[k] = get(u, k);
      row.email = String(row.email).toLowerCase();
      row.pw_hash = null;
      row.created_at = at;
      return row;
    });
    return db;
  }

  // ---------- persistence ----------
  function load() {
    try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch (e) { /* storage blocked */ }
    return seed();
  }
  let DB = load();
  let MEM_SESSION = null;
  const FAILS = {}; // email -> [timestamps], login throttling as on the server
  function save() { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { /* full or blocked: in-memory only */ } }
  function getSession() { try { return localStorage.getItem(SESSION) || MEM_SESSION; } catch (e) { return MEM_SESSION; } }
  function setSession(id) { MEM_SESSION = id; try { if (id) localStorage.setItem(SESSION, id); else localStorage.removeItem(SESSION); } catch (e) { /* ignore */ } }
  const currentUser = () => { const id = getSession(); return (id && DB.users.find((x) => x.id === id)) || null; };

  async function hash(pw) {
    try {
      const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("gb-demo:" + pw));
      return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
    } catch (e) { return "plain:" + pw; }
  }

  // ---------- lookups (server/actions.py) ----------
  const settings = (st) => (st.settings.length ? st.settings[0] : Object.assign({}, DOM.SETTINGS_DEFAULT));
  const find = (coll, id) => coll.find((x) => x.id === id) || null;
  function companyOf(st, cid) { const c = find(st.companies, cid); need(c, "Company not found"); return c; }
  function userOf(st, id, role) {
    const u = st.users.find((x) => x.id === id) || null;
    need(u && (role == null || u.role === role), capitalize(role || "User") + " not found");
    return u;
  }
  const label = (u) => (["investor", "lender"].includes(u.role) && truthy(get(u, "firm")) ? u.firm : u.name);
  function notify(st, userId, kind, text, link) {
    st.notifications.push({ id: uid("nt"), user_id: userId, kind, text, link, at: now(), read: false });
  }
  function notifyAdvisors(st, kind, text, link) { for (const u of st.users) if (u.role === "advisor") notify(st, u.id, kind, text, link); }
  const owns = (u, cid) => u.role === "advisor" || (u.role === "founder" && u.company_id === cid);
  const approved = (st, cid) => st.reports.some((r) => r.company_id === cid && r.status === "approved");
  const holderIds = (st, cid) => new Set(DOM.platformInvestors(st, cid));

  // ---------- visibility ----------
  function pub(u, full) {
    if (!u) return null;
    const out = {};
    for (const k of ["id", "name", "role", "firm", "title", "company_id", "mandate"].concat(full ? ["profile", "email"] : [])) out[k] = get(u, k);
    if (u.role === "lender") out.profile = get(u, "profile");
    return out;
  }

  /** What an investor may see of a company: no twin, no readiness, no cap table. */
  function companyBrief(st, c) {
    const rep = st.reports.find((r) => r.company_id === c.id && r.status === "approved") || null;
    return { id: c.id, name: c.name, sector: c.sector, stage: c.stage, city: c.city, revenue: c.revenue, raise_paise: get(c, "raise_paise"),
      security_type: get(c, "security_type"), offer_price_paise: get(c, "offer_price_paise"), updates: or(get(c, "updates"), []),
      docs: or(get(c, "docs"), []), fd_shares: DOM.fdShares(st, c.id),
      report: rep && { title: rep.title, summary: rep.summary, reviewed_by: get(rep, "reviewed_by"), reviewed_at: get(rep, "reviewed_at"), review_note: get(rep, "review_note") } };
  }

  function lockNotices(st, user, day) {
    const s = settings(st), out = [];
    for (const h of st.holdings) {
      if (h.investor_id === user.id && h.shares > 0) {
        const unlock = DOM.lockUntil(h, s), left = DOM.daysBetween(day, unlock);
        if (left > 0 && left <= 7) {
          const c = find(st.companies, h.company_id);
          out.push({ id: "lock_" + h.id, user_id: user.id, kind: "lock", text: "Lock-in for " + c.name + " ends in " + left + " day" + (left === 1 ? "" : "s") + " (" + ddmmmyyyy(unlock) + ")",
            link: "app-portfolio", at: day + "T00:00:00+00:00", read: false, computed: true });
        }
      }
    }
    return out;
  }

  const byAtDesc = (a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0);
  const publicFile = (f) => { const o = Object.assign({}, f); delete o.data_url; return o; };

  /** server/actions.py visible_state(); auditRows(filter) gives the audit log, newest first. */
  function visibleState(st, user, auditRows, day) {
    const role = user.role, s = settings(st);
    const base = { me: pub(user, true), today: day, settings: s,
      notifications: lockNotices(st, user, day).concat(st.notifications.filter((n) => n.user_id === user.id).sort(byAtDesc).slice(0, 60)) };
    const advisors = st.users.filter((u) => u.role === "advisor").map((u) => pub(u));
    const lenders = st.users.filter((u) => u.role === "lender").map((u) => pub(u));
    let out;
    if (role === "advisor") {
      out = Object.assign(base, { directory: st.users.filter((u) => u.role !== "founder").map((u) => pub(u, true)), founders: st.users.filter((u) => u.role === "founder").map((u) => pub(u)) });
      for (const c of COLLECTIONS) if (c !== "notifications" && c !== "settings") out[c] = st[c];
      out.audit = auditRows(null);
    } else if (role === "founder") {
      const cid = user.company_id;
      const only = (coll) => coll.filter((x) => get(x, "company_id") === cid);
      const offerView = (o) => {
        const named = truthy(get(o, "share_identity")) || o.response === "invested";
        const inv = userOf(st, o.investor_id);
        return Object.assign({}, o, { investor_id: named ? o.investor_id : null, investor_name: named ? label(inv) : "Name shared after the investor consents", views: named ? get(o, "views", []) : [] });
      };
      const sellView = (x) => ({ id: x.id, company_id: x.company_id, shares: x.shares, full: x.full, status: x.status, rofr_until: get(x, "rofr_until"), created_at: x.created_at });
      out = Object.assign(base, { directory: advisors.concat(lenders),
        companies: st.companies.filter((c) => c.id === cid), reports: only(st.reports), cap_table: only(st.cap_table),
        holdings: only(st.holdings).map((h) => Object.assign({}, h, { investor_name: label(userOf(st, h.investor_id)) })),
        offers: only(st.offers).map(offerView), valuations: only(st.valuations), sell_requests: only(st.sell_requests).map(sellView),
        loans: only(st.loans), invoices: st.invoices.filter((i) => i.company_id === cid && i.payer === "company"),
        files: only(st.files), audit: auditRows(["company_id", cid]) });
    } else if (role === "investor") {
      const mine = st.offers.filter((o) => o.investor_id === user.id);
      const hold = st.holdings.filter((h) => h.investor_id === user.id);
      const cids = new Set(mine.map((o) => o.company_id).concat(hold.map((h) => h.company_id)));
      const held = new Set(hold.filter((h) => h.shares > 0).map((h) => h.company_id));
      out = Object.assign(base, { directory: advisors, companies: st.companies.filter((c) => cids.has(c.id)).map((c) => companyBrief(st, c)),
        offers: mine, holdings: hold, valuations: st.valuations.filter((v) => held.has(v.company_id) || cids.has(v.company_id)),
        sell_requests: st.sell_requests.filter((x) => x.investor_id === user.id).map((x) => Object.assign({}, x, { buyer_investor_id: null })),
        transfers: st.transfers.filter((t) => t.from_investor_id === user.id || t.to_investor_id === user.id),
        files: st.files.filter((f) => held.has(f.company_id) && f.purpose === "valuation_report"), audit: auditRows(["user_id", user.id]) });
    } else { // lender
      const loans = st.loans.filter((l) => l.lender_id === user.id);
      const lids = new Set(loans.map((l) => l.id)), cids = new Set(loans.map((l) => l.company_id));
      out = Object.assign(base, { directory: advisors.concat(lenders),
        companies: st.companies.filter((c) => cids.has(c.id)), reports: st.reports.filter((r) => r.status === "approved" && cids.has(r.company_id)),
        loans, loan_transfers: st.loan_transfers.filter((t) => lids.has(t.loan_id) || t.from_lender_id === user.id),
        invoices: st.invoices.filter((i) => i.payer === "lender" && i.payer_id === user.id),
        files: st.files.filter((f) => cids.has(f.company_id) && ["monitoring", "loan_doc"].includes(f.purpose)), audit: auditRows(["user_id", user.id]) });
    }
    out.files = out.files.map(publicFile); // the file itself is only handed out by download()
    return out;
  }

  function canSeeFile(st, user, f) {
    if (user.role === "advisor") return true;
    if (user.role === "founder") return f.company_id === user.company_id;
    if (user.role === "investor") return f.purpose === "valuation_report" && st.holdings.some((h) => h.investor_id === user.id && h.company_id === f.company_id && h.shares > 0);
    return ["monitoring", "loan_doc"].includes(f.purpose) && st.loans.some((l) => l.lender_id === user.id && l.company_id === f.company_id);
  }

  // ---------- actions: each takes (st, user, payload, today), returns [detail, company_id] ----------
  function checkNewHolder(st, cid, investorId, leaving) {
    const s = settings(st), current = holderIds(st, cid);
    if (current.has(investorId)) return;
    const out = leaving != null && current.has(leaving) ? 1 : 0;
    const plat = current.size + 1 - out, mem = DOM.members(st, cid) + 1 - out;
    need(plat <= s.max_platform_investors, "Blocked: this would make " + plat + " platform investors in the company; the limit is " + s.max_platform_investors);
    need(mem <= s.member_limit, "Blocked: this would make " + mem + " members (shareholders); a private company may have at most " + s.member_limit);
  }

  const ACTIONS = {
    // ----- founder -----
    save_company(st, u, p) {
      need(owns(u, get(p, "company_id")), "Only the company's founder or an advisor can edit it");
      const c = companyOf(st, p.company_id);
      const patch = or(get(p, "patch"), {});
      need(isObj(patch), "Bad request");
      const allowed = COMPANY_FIELDS.concat(u.role === "advisor" ? ADVISOR_COMPANY_FIELDS : []);
      for (const k of Object.keys(patch)) {
        let v = patch[k];
        need(allowed.includes(k), "You cannot change " + k);
        if (k === "revenue" || k === "raise") {
          need(fnum(v) !== null && fnum(v) > 0, "Revenue and raise must be positive numbers");
          v = fnum(v);
        } else if (ADVISOR_COMPANY_FIELDS.includes(k) && k !== "security_type") {
          need(inum(v) !== null && inum(v) >= 0, k + " must be a whole number");
          v = inum(v);
        } else if (k === "security_type") {
          need(DOM.SECURITY_TYPES.includes(v), "Choose equity, preference or debentures");
        } else if (["name", "sector", "stage", "city", "instrument"].includes(k)) {
          v = cut(pystr(v).trim(), 120);
          need(v, "Enter a value for " + k);
        }
        c[k] = v;
      }
      return ["Updated " + Object.keys(patch).join(", "), c.id];
    },

    submit_report(st, u, p, day) {
      need(u.role === "founder" && u.company_id === get(p, "company_id"), "Only the company's founder can submit its report");
      const c = companyOf(st, p.company_id);
      const ch = or(get(p, "checks"), {});
      if (!isObj(ch)) throw crash();
      need(truthy(get(ch, "validation")) && truthy(get(ch, "founder_confirmed")) && truthy(get(ch, "verifier")), "All release checks must pass before review");
      need(!st.reports.some((r) => r.company_id === c.id && r.status === "in_review"), "A report for this company is already in review");
      const r = { id: uid("r"), company_id: c.id, title: cut(pystr(or(get(p, "title"), "Debt vs equity report")), 120), status: "in_review",
        engine_version: cut(pystr(or(get(p, "engine_version"), "")), 40), created_at: now(), submitted_by: u.id,
        summary: or(get(p, "summary"), {}), checks: ch, inputs: or(get(p, "inputs"), {}) };
      st.reports.push(r);
      if (get(c, "pipeline_stage", "applied") === "applied") Object.assign(c, { pipeline_stage: "under_review", stage_since: day });
      notifyAdvisors(st, "review", "New report to review: " + c.name, "app-review");
      return ["Submitted for advisor review: " + r.title, c.id];
    },

    apply_loan(st, u, p) {
      const cid = get(p, "company_id");
      need(u.role === "founder" && u.company_id === cid, "Only the company's founder can apply");
      const lender = userOf(st, get(p, "lender_id"), "lender");
      const amount = inum(get(p, "amount_paise")), bps = inum(get(p, "rate_bps")), tenor = inum(get(p, "tenor_months")), mor = inum(or(get(p, "moratorium_months"), 0));
      need(amount && amount > 0 && bps && bps > 0 && bps < 5000 && tenor && tenor > 0 && tenor <= 240 && mor !== null && mor >= 0 && mor < tenor,
        "Enter a valid amount, rate, tenor and moratorium");
      st.loans.push({ id: uid("l"), company_id: cid, lender_id: lender.id, amount_paise: amount, rate_bps: bps, tenor_months: tenor, moratorium_months: mor,
        status: "applied", sanction_date: null, disbursal_date: null, payments: {}, created_at: now() });
      notify(st, lender.id, "loan", "New loan application from " + companyOf(st, cid).name, "app-loanbook");
      return ["Sent a " + rs(amount) + " loan application to " + pystr(get(lender, "firm")), cid];
    },

    // ----- advisor: reports, pipeline, cap table -----
    review_report(st, u, p, day) {
      need(u.role === "advisor", "Only an advisor can review reports");
      const r = find(st.reports, get(p, "report_id"));
      need(r, "Report not found");
      need(r.status === "in_review", "This report is not waiting for review");
      need(["approve", "changes"].includes(get(p, "decision")), "Choose approve or request changes");
      Object.assign(r, { status: p.decision === "approve" ? "approved" : "changes", reviewed_by: u.id, reviewed_at: now(), review_note: cut(pystr(or(get(p, "note"), "")), 500) });
      const c = companyOf(st, r.company_id);
      if (p.decision === "approve" && ["applied", "under_review", null].includes(get(c, "pipeline_stage"))) Object.assign(c, { pipeline_stage: "approved", stage_since: day });
      return [(p.decision === "approve" ? "Approved report: " : "Requested changes: ") + r.title, r.company_id];
    },

    set_stage(st, u, p, day) {
      need(u.role === "advisor", "Only an advisor can move a company");
      const c = companyOf(st, get(p, "company_id"));
      const stage = get(p, "stage");
      need(DOM.PIPELINE.includes(stage), "Unknown stage");
      need(stage !== get(c, "pipeline_stage"), "The company is already in that stage");
      if (["approved", "offering", "funded", "monitoring"].includes(stage)) need(approved(st, c.id), "A company needs an advisor-approved report before it can be " + spaced(stage));
      const old = get(c, "pipeline_stage");
      Object.assign(c, { pipeline_stage: stage, stage_since: day });
      return ["Moved " + c.name + " from " + spaced(or(old, "none")) + " to " + spaced(stage), c.id];
    },

    save_cap_entry(st, u, p) {
      need(u.role === "advisor", "Only an advisor maintains the cap table");
      const c = companyOf(st, get(p, "company_id"));
      const name = cut(pystr(or(get(p, "holder_name"), "")).trim(), 120), kind = get(p, "holder_type"), shares = inum(get(p, "shares")), holders = inum(or(get(p, "holders"), 1));
      need(name && ["founder", "existing"].includes(kind) && shares !== null && shares >= 0 && holders && holders >= 1, "Enter the holder, type (founder or existing), shares and number of holders");
      const e = truthy(get(p, "entry_id")) ? find(st.cap_table, p.entry_id) : null;
      if (e) {
        need(e.company_id === c.id, "Entry not found");
        Object.assign(e, { holder_name: name, holder_type: kind, shares, holders });
      } else {
        st.cap_table.push({ id: uid("ct"), company_id: c.id, holder_name: name, holder_type: kind, shares, holders });
      }
      return ["Cap table: " + name + " holds " + commas(shares) + " shares (" + holders + " holder" + (holders === 1 ? "" : "s") + ")", c.id];
    },

    remove_cap_entry(st, u, p) {
      need(u.role === "advisor", "Only an advisor maintains the cap table");
      const e = find(st.cap_table, get(p, "entry_id"));
      need(e, "Entry not found");
      st.cap_table.splice(st.cap_table.indexOf(e), 1);
      return ["Removed " + e.holder_name + " from the cap table", e.company_id];
    },

    set_checklist(st, u, p) {
      need(u.role === "advisor", "Only an advisor updates the compliance checklist");
      const c = companyOf(st, get(p, "company_id"));
      const item = get(p, "item"), labels = Object.fromEntries(DOM.DOC_CHECKLIST);
      need(has(labels, item), "Unknown checklist item");
      const val = get(p, "date");
      if (truthy(val)) parseDate(val);
      setdefault(c, "checklist", {})[item] = or(val, null);
      if (item === "allotment" && truthy(val)) c.allotment_date = val;
      return [labels[item] + ": " + (truthy(val) ? "done " + ddmmmyyyy(val) : "not done"), c.id];
    },

    set_external_offers(st, u, p, day) {
      need(u.role === "advisor", "Only an advisor records offers");
      const c = companyOf(st, get(p, "company_id"));
      const year = pystr(or(get(p, "fy"), DOM.fy(day))), sec = or(get(p, "security_type"), "equity"), n = inum(get(p, "count"));
      need(DOM.SECURITY_TYPES.includes(sec) && n !== null && n >= 0, "Enter the number of off-platform offers");
      setdefault(setdefault(c, "external_offers", {}), year, {})[sec] = n;
      const used = DOM.offersUsed(st, c.id, year, sec), limit = settings(st).offer_limit;
      need(used <= limit, "That would put " + c.name + " at " + used + " offers in FY " + year + "; the limit is " + limit);
      return ["Off-platform " + sec + " offers for FY " + year + " set to " + n + " (total now " + used + ")", c.id];
    },

    post_update(st, u, p, day) {
      need(owns(u, get(p, "company_id")), "Only the company's founder or an advisor can post updates");
      const c = companyOf(st, p.company_id);
      const text = cut(pystr(or(get(p, "text"), "")).trim(), 600);
      need(text, "Write the update");
      setdefault(c, "updates", []).unshift({ date: day, text });
      for (const iid of holderIds(st, c.id)) notify(st, iid, "update", "Company update from " + c.name, "app-portfolio");
      return ["Posted an update for " + c.name, c.id];
    },

    set_investor_profile(st, u, p) {
      need(u.role === "advisor", "Only an advisor records KYC");
      const inv = userOf(st, get(p, "investor_id"), "investor");
      const prof = inv.profile = isObj(inv.profile) ? inv.profile : {};
      if (get(p, "kyc") !== null) {
        need(["verified", "pending", "not_started"].includes(p.kyc), "Unknown KYC status");
        prof.kyc = p.kyc;
      }
      if (get(p, "accredited") !== null) prof.accredited = truthy(p.accredited);
      return ["Updated " + label(inv) + ": KYC " + pystr(get(prof, "kyc")) + ", accredited " + (truthy(get(prof, "accredited")) ? "yes" : "no"), null];
    },

    save_settings(st, u, p) {
      need(u.role === "advisor", "Only an advisor changes settings");
      const s = settings(st), n = inum(get(p, "max_platform_investors"));
      need(n && n >= 1 && n <= 200, "Platform investor limit must be between 1 and 200");
      s.max_platform_investors = n;
      return ["Platform investor limit set to " + n + " per company", null];
    },

    // ----- advisor: offers and allotment (Section 42, Section 2(68)) -----
    share_offer(st, u, p, day) {
      need(u.role === "advisor", "Only an advisor shares offers");
      const c = companyOf(st, get(p, "company_id"));
      need(["approved", "offering"].includes(get(c, "pipeline_stage")) && approved(st, c.id), "Only a company in Approved or Offering status with a signed-off report can be offered");
      const sec = or(get(p, "security_type"), or(get(c, "security_type"), "equity"));
      need(DOM.SECURITY_TYPES.includes(sec), "Choose equity, preference or debentures");
      const raw = or(get(p, "investor_ids"), []);
      if (typeof raw !== "string" && !Array.isArray(raw)) throw crash();
      const ids = Array.from(new Set(Array.from(raw)));
      need(ids.length, "Select at least one investor");
      const year = DOM.fy(day);
      const already = new Set(st.offers.filter((o) => o.company_id === c.id && o.fy === year && o.security_type === sec).map((o) => o.investor_id));
      const invs = ids.map((i) => userOf(st, i, "investor"));
      for (const inv of invs) need(get(get(inv, "profile") || {}, "kyc") === "verified", label(inv) + " has not completed KYC");
      const fresh = invs.filter((inv) => !already.has(inv.id));
      need(fresh.length, "Every selected investor already has this offer for FY " + year);
      const s = settings(st), used = DOM.offersUsed(st, c.id, year, sec);
      need(used + fresh.length <= s.offer_limit, "Blocked: " + c.name + " has " + used + " of " + s.offer_limit + " " + sec + " offers used in FY " + year + ". Sending " + fresh.length +
        " more would exceed the Section 42 limit; " + (s.offer_limit - used) + " left.");
      for (const inv of fresh) {
        st.offers.push({ id: uid("o"), company_id: c.id, investor_id: inv.id, fy: year, security_type: sec, sent_at: now(), sent_by: u.id,
          response: "pending", responded_at: null, share_identity: false, views: [] });
        notify(st, inv.id, "offer", "New private offer: " + c.name, "app-opportunities");
      }
      if (c.pipeline_stage === "approved") Object.assign(c, { pipeline_stage: "offering", stage_since: day });
      const total = used + fresh.length;
      return ["Shared " + c.name + " with " + fresh.length + " investor" + (fresh.length === 1 ? "" : "s") + " (" + total + " of " + s.offer_limit + " offers used in FY " + year +
        (invs.length > fresh.length ? "; already offered: " + (invs.length - fresh.length) : "") + ")", c.id];
    },

    allot_shares(st, u, p, day) {
      need(u.role === "advisor", "Only an advisor records an allotment");
      const o = find(st.offers, get(p, "offer_id"));
      need(o, "Offer not found");
      need(o.response === "interested", "The investor must express interest before shares are allotted");
      const c = companyOf(st, o.company_id);
      const shares = inum(get(p, "shares")), amount = inum(get(p, "amount_paise")), when = validDate(or(get(p, "allotment_date"), day));
      need(shares && shares > 0 && amount && amount > 0, "Enter the shares allotted and the amount paid");
      need(le(when, day), "The allotment date cannot be in the future");
      checkNewHolder(st, c.id, o.investor_id);
      st.holdings.push({ id: uid("h"), investor_id: o.investor_id, company_id: c.id, shares, allotment_date: when, invested_at: when,
        cost_paise: amount, origin: "allotment", early_consent: null });
      Object.assign(o, { response: "invested", responded_at: or(get(o, "responded_at"), now()) });
      c.allotment_date = when;
      setdefault(c, "checklist", {}).allotment = when;
      if (get(c, "pipeline_stage") === "offering") Object.assign(c, { pipeline_stage: "funded", stage_since: day });
      notify(st, o.investor_id, "allotment", commas(shares) + " shares of " + c.name + " allotted to you", "app-portfolio");
      return ["Allotted " + commas(shares) + " shares of " + c.name + " to " + label(userOf(st, o.investor_id)) + " for " + rs(amount), c.id];
    },

    publish_valuation(st, u, p, day) {
      need(u.role === "advisor", "Only an advisor publishes valuations");
      const c = companyOf(st, get(p, "company_id"));
      const when = get(p, "date"), price = inum(get(p, "price_per_share_paise")), method = get(p, "method"), valuer = cut(pystr(or(get(p, "valuer"), "")).trim(), 120);
      need(truthy(when) && parseDate(when) && le(when, day), "Enter a valuation date that is not in the future");
      need(price && price > 0, "Enter the price per share");
      need(["DCF", "Market multiples"].includes(method), "Choose DCF or market multiples");
      need(valuer, "Enter the registered valuer's name");
      const f = truthy(get(p, "file_id")) ? find(st.files, p.file_id) : null;
      need(!truthy(get(p, "file_id")) || (f && f.company_id === c.id), "Report file not found");
      const prev = DOM.latestValuation(st, c.id);
      st.valuations.push({ id: uid("v"), company_id: c.id, date: when, price_per_share_paise: price, method, valuer,
        report_file: f && f.id, published_at: now(), published_by: u.id });
      for (const iid of holderIds(st, c.id)) notify(st, iid, "valuation", "Revaluation published: " + c.name + " at " + rs(price) + " a share", "app-portfolio");
      return ["Published " + method + " valuation of " + c.name + ": " + rs(price) + " a share (was " + (prev ? rs(prev.price_per_share_paise) : "none") + ")", c.id];
    },

    // ----- investor -----
    respond_offer(st, u, p) {
      const o = find(st.offers, get(p, "offer_id"));
      need(o && u.role === "investor" && o.investor_id === u.id, "Offer not found");
      need(["pending", "interested", "declined"].includes(o.response), "This offer is closed");
      need(["interested", "declined"].includes(get(p, "response")), "Choose interested or decline");
      Object.assign(o, { response: p.response, responded_at: now(), share_identity: truthy(get(p, "share_identity")) && p.response === "interested" });
      const c = companyOf(st, o.company_id);
      notifyAdvisors(st, "offer", label(u) + " " + (p.response === "interested" ? "is interested in" : "declined") + " " + c.name, "app-directory");
      return [(p.response === "interested" ? "Expressed interest in " : "Declined the offer for ") + c.name, c.id];
    },

    view_doc(st, u, p) {
      const o = find(st.offers, get(p, "offer_id"));
      need(o && u.role === "investor" && o.investor_id === u.id && o.response !== "declined", "Offer not found");
      const c = companyOf(st, o.company_id);
      const doc = get(p, "doc");
      need(or(get(c, "docs"), []).includes(doc) || doc === "Advisor-reviewed report", "Document not found");
      setdefault(o, "views", []).push({ doc, at: now() });
      return ["Viewed " + doc + " (watermarked: " + u.name + ")", c.id];
    },

    request_sell(st, u, p, day) {
      const h = find(st.holdings, get(p, "holding_id"));
      need(h && u.role === "investor" && h.investor_id === u.id, "Holding not found");
      need(h.shares > 0, "You no longer hold these shares");
      need(!st.sell_requests.some((x) => x.holding_id === h.id && SELL_OPEN.includes(x.status)), "A sell request for this holding is already open");
      const unlock = DOM.lockUntil(h, settings(st));
      need(day >= unlock || truthy(get(h, "early_consent")), "Locked: you can request to sell from " + ddmmmyyyy(unlock) + ", " + settings(st).lock_months + " months after allotment");
      const given = (k) => get(p, k) !== null && p[k] !== "";
      const n = given("shares") ? inum(p.shares) : h.shares;
      need(n && n > 0 && n <= h.shares, "Enter between 1 and " + commas(h.shares) + " shares");
      const price = given("indicative_price_paise") ? inum(p.indicative_price_paise) : null;
      need(price === null || price > 0, "The indicative price must be positive");
      const c = companyOf(st, h.company_id);
      const x = { id: uid("s"), holding_id: h.id, investor_id: u.id, company_id: c.id, shares: n, full: n === h.shares, indicative_price_paise: price,
        note: cut(pystr(or(get(p, "note"), "")), 500), status: "submitted", rofr_days: null, rofr_until: null, buyer_investor_id: null, spa_date: null,
        price_paise: null, reason: null, created_at: now(), history: [{ status: "submitted", at: now(), by: u.id }] };
      st.sell_requests.push(x);
      notifyAdvisors(st, "sell", "Sell request: " + label(u) + ", " + commas(n) + " shares of " + c.name, "app-requests");
      return ["Requested to sell " + (x.full ? "all" : "") + " " + commas(n) + " shares of " + c.name, c.id];
    },

    withdraw_sell(st, u, p) {
      const x = find(st.sell_requests, get(p, "request_id"));
      need(x && u.role === "investor" && x.investor_id === u.id, "Request not found");
      need(["submitted", "under_review", "rofr"].includes(x.status), "This request can no longer be withdrawn");
      x.status = "withdrawn";
      x.history.push({ status: "withdrawn", at: now(), by: u.id });
      return ["Withdrew a sell request", x.company_id];
    },

    read_notifications(st, u) {
      let n = 0;
      for (const x of st.notifications) if (x.user_id === u.id && !truthy(x.read)) { x.read = true; n += 1; }
      return ["Marked " + n + " notification" + (n === 1 ? "" : "s") + " read", null];
    },

    // ----- advisor: equity resales -----
    record_consent(st, u, p) {
      need(u.role === "advisor", "Only an advisor records the founder's consent");
      const h = find(st.holdings, get(p, "holding_id"));
      need(h, "Holding not found");
      const note = cut(pystr(or(get(p, "note"), "")).trim(), 300);
      need(note, "Describe the written consent (who signed and when)");
      h.early_consent = { by: u.id, at: now(), note };
      notify(st, h.investor_id, "sell", "The founder's written consent allows an early sale of your " + companyOf(st, h.company_id).name + " shares", "app-portfolio");
      return ["Recorded founder consent for an early sale: " + note, h.company_id];
    },

    sell_step(st, u, p, day) {
      need(u.role === "advisor", "Only an advisor moves a sell request");
      const x = find(st.sell_requests, get(p, "request_id"));
      need(x, "Request not found");
      const step = get(p, "step"), c = companyOf(st, x.company_id), h = find(st.holdings, x.holding_id);
      if (step === "reject") {
        need(SELL_OPEN.includes(x.status), "This request is closed");
        const reason = cut(pystr(or(get(p, "reason"), "")).trim(), 300);
        need(reason, "Give a reason");
        Object.assign(x, { status: "rejected", reason });
      } else if (step === "review") {
        need(x.status === "submitted", "Only a submitted request can be put under review");
        x.status = "under_review";
      } else if (step === "rofr") {
        need(x.status === "under_review", "Review the request first");
        const days = inum(get(p, "days"));
        need(days && days >= 15 && days <= 30, "The first-refusal window is 15 to 30 days");
        Object.assign(x, { status: "rofr", rofr_days: days, rofr_until: DOM.addDays(day, days) });
      } else if (step === "buyer") {
        need(x.status === "rofr", "Start the first-refusal window first");
        need(day >= x.rofr_until || truthy(get(p, "waived")), "The first-refusal window runs until " + ddmmmyyyy(x.rofr_until) + ". Record a written waiver to proceed early.");
        const buyer = userOf(st, get(p, "buyer_investor_id"), "investor");
        need(buyer.id !== x.investor_id, "The buyer cannot be the seller");
        need(get(get(buyer, "profile") || {}, "kyc") === "verified", label(buyer) + " has not completed KYC");
        checkNewHolder(st, c.id, buyer.id, x.full ? x.investor_id : null);
        Object.assign(x, { status: "buyer_introduced", buyer_investor_id: buyer.id, rofr_waived: truthy(get(p, "waived")) && day < x.rofr_until });
      } else if (step === "spa") {
        need(x.status === "buyer_introduced", "Introduce a buyer first");
        const price = inum(get(p, "price_paise")), when = validDate(or(get(p, "spa_date"), day));
        need(price && price > 0, "Enter the agreed price per share");
        need(le(when, day), "The SPA date cannot be in the future");
        Object.assign(x, { status: "spa_signed", price_paise: price, spa_date: when });
      } else if (step === "complete") {
        need(x.status === "spa_signed", "Record the signed SPA first");
        need(h && h.shares >= x.shares, "The seller no longer holds these shares");
        const buyer = userOf(st, x.buyer_investor_id, "investor");
        checkNewHolder(st, c.id, buyer.id, x.shares === h.shares ? x.investor_id : null);
        const costMoved = floorDiv(BigInt(h.cost_paise) * BigInt(x.shares), h.shares);
        h.shares -= x.shares;
        h.cost_paise -= costMoved;
        st.holdings.push({ id: uid("h"), investor_id: buyer.id, company_id: c.id, shares: x.shares, allotment_date: day, invested_at: day,
          cost_paise: x.shares * x.price_paise, origin: "transfer", early_consent: null });
        st.transfers.push({ id: uid("t"), sell_request_id: x.id, company_id: c.id, from_investor_id: x.investor_id, to_investor_id: buyer.id,
          shares: x.shares, price_paise: x.price_paise, spa_date: x.spa_date, completed_at: now() });
        x.status = "completed";
        notify(st, buyer.id, "sell", commas(x.shares) + " shares of " + c.name + " transferred to you", "app-portfolio");
      } else {
        throw new Denied("Unknown step");
      }
      x.history.push({ status: x.status, at: now(), by: u.id });
      notify(st, x.investor_id, "sell", "Your sell request for " + c.name + ": " + spaced(x.status), "app-portfolio");
      return ["Resale of " + commas(x.shares) + " " + c.name + " shares by " + label(userOf(st, x.investor_id)) + ": " + STATUS_LABEL[x.status], c.id];
    },

    // ----- lender -----
    lender_decide(st, u, p, day) {
      const l = find(st.loans, get(p, "loan_id"));
      need(l && u.role === "lender" && l.lender_id === u.id, "Not your loan");
      const steps = { sanction: ["applied", "sanctioned"], decline: ["applied", "declined"], disburse: ["sanctioned", "disbursed"] };
      const nxt = has(steps, get(p, "decision")) ? steps[p.decision] : null;
      need(nxt && l.status === nxt[0], "That step is not available now");
      l.status = nxt[1];
      if (nxt[1] === "sanctioned") l.sanction_date = day;
      if (nxt[1] === "disbursed") Object.assign(l, { disbursal_date: day, payments: {} });
      return ["Loan " + l.status + " (" + rs(l.amount_paise) + ")", l.company_id];
    },

    record_repayment(st, u, p, day) {
      const l = find(st.loans, get(p, "loan_id"));
      need(l && ["lender", "advisor"].includes(u.role) && (u.role === "advisor" || l.lender_id === u.id), "Not your loan");
      const row = DOM.schedule(l, day).find((r) => r.due === get(p, "due")) || null;
      need(row, "Instalment not found");
      need(row.status !== "paid", "Already marked as received");
      need(row.due <= DOM.addDays(day, 31), "You can only record instalments due in the next month or earlier");
      setdefault(l, "payments", {})[row.due] = day;
      return ["Recorded the " + companyOf(st, l.company_id).name + " instalment of " + rs(row.payment) + " (due " + ddmmmyyyy(row.due) + ")", l.company_id];
    },

    request_loan_transfer(st, u, p, day) {
      const l = find(st.loans, get(p, "loan_id"));
      need(l && u.role === "lender" && l.lender_id === u.id, "Not your loan");
      need(l.status === "disbursed", "Only a disbursed loan can be transferred");
      need(truthy(get(get(u, "profile") || {}, "regulated")), "Only regulated banks and NBFCs can transfer loans");
      need(!st.loan_transfers.some((t) => t.loan_id === l.id && !["completed", "rejected"].includes(t.status)), "A transfer for this loan is already open");
      const pending = DOM.loanSummary(l, day).principal_pending;
      const amount = get(p, "amount_paise") !== null && p.amount_paise !== "" ? inum(p.amount_paise) : null;
      need(amount !== null || get(p, "amount_paise") === null || p.amount_paise === "", "Enter the amount as a number");
      need(amount === null || (amount > 0 && amount <= pending), "The amount must be up to the outstanding " + rs(pending));
      st.loan_transfers.push({ id: uid("lt"), loan_id: l.id, from_lender_id: u.id, amount_paise: amount, note: cut(pystr(or(get(p, "note"), "")), 500),
        status: "submitted", buyer_lender_id: null, fee_rate: null, fee_paise: null, created_at: now(),
        history: [{ status: "submitted", at: now(), by: u.id }] });
      notifyAdvisors(st, "transfer", "Loan transfer request: " + label(u) + ", " + companyOf(st, l.company_id).name, "app-loantransfers");
      return ["Asked Aegis Ascend to transfer " + rs(or(amount, pending)) + " of the " + companyOf(st, l.company_id).name + " loan", l.company_id];
    },

    loan_transfer_step(st, u, p, day) {
      need(u.role === "advisor", "Only an advisor arranges loan transfers");
      const t = find(st.loan_transfers, get(p, "transfer_id"));
      need(t && !["completed", "rejected"].includes(t.status), "No open transfer");
      const l = find(st.loans, t.loan_id);
      const step = get(p, "step");
      if (step === "reject") {
        const reason = cut(pystr(or(get(p, "reason"), "")).trim(), 300);
        need(reason, "Give a reason");
        Object.assign(t, { status: "rejected", reason });
      } else {
        const next = LT_STEPS[LT_STEPS.indexOf(t.status) + 1];
        need(LT_STEPS.includes(step) && LT_STEPS.indexOf(step) === LT_STEPS.indexOf(t.status) + 1, "Do the steps in order: next is " + spaced(next));
        if (step === "eligibility") {
          const seller = userOf(st, t.from_lender_id, "lender");
          need(truthy(get(get(seller, "profile") || {}, "regulated")), "The selling lender is not a regulated bank or NBFC");
          const held = DOM.daysBetween(l.disbursal_date, day) / 30.4375, mhp = DOM.minHoldingMonths(l);
          need(held >= mhp, "Minimum holding period not met: " + mhp + " months needed, " + held.toFixed(1) + " held");
          t.eligibility = { checked_at: now(), months_held: Number(held.toFixed(1)), min_holding: mhp };
        } else if (step === "consent") {
          t.borrower_consent_at = validDate(or(get(p, "date"), day));
        } else if (step === "buyer_introduced") {
          const buyer = userOf(st, get(p, "buyer_lender_id"), "lender");
          need(buyer.id !== t.from_lender_id, "The buyer must be a different lender");
          need(truthy(get(get(buyer, "profile") || {}, "regulated")), "Loans move only between regulated banks and NBFCs");
          t.buyer_lender_id = buyer.id;
        } else if (step === "deed_signed") {
          t.deed_date = validDate(or(get(p, "date"), day));
        } else if (step === "charge_updated") {
          t.charge_date = validDate(or(get(p, "date"), day));
        } else if (step === "completed") {
          const rate = fnum(get(p, "fee_rate"));
          need(rate !== null && rate >= 0.003 && rate <= 0.005, "The transfer fee is 0.3% to 0.5%");
          const base = or(t.amount_paise, DOM.loanSummary(l, day).principal_pending);
          const fee = DOM.halfUp(base * rate);
          Object.assign(t, { fee_rate: rate, fee_paise: fee });
          l.lender_id = t.buyer_lender_id;
          st.invoices.push({ id: uid("f"), kind: "transfer", company_id: l.company_id, payer: "lender", payer_id: t.from_lender_id,
            period: "Loan transfer " + t.id, amount_paise: fee, gst_paise: floorDiv(fee * 18, 100), issued: day, due: DOM.addDays(day, 15), paid_on: null });
          notify(st, t.buyer_lender_id, "transfer", "A " + companyOf(st, l.company_id).name + " loan has moved to your book", "app-loanbook");
        }
        t.status = step;
      }
      t.history.push({ status: t.status, at: now(), by: u.id });
      notify(st, t.from_lender_id, "transfer", "Loan transfer for " + companyOf(st, l.company_id).name + ": " + spaced(t.status), "app-loanbook");
      return ["Loan transfer of the " + companyOf(st, l.company_id).name + " loan from " + label(userOf(st, t.from_lender_id)) + ": " + STATUS_LABEL[t.status], l.company_id];
    },

    // ----- advisor: notes, invoices -----
    save_note(st, u, p) {
      need(u.role === "advisor", "Only advisors keep notes");
      const kind = get(p, "subject_type"), sid = get(p, "subject_id"), text = cut(pystr(or(get(p, "text"), "")).trim(), 600);
      need(["investor", "lender", "company"].includes(kind) && truthy(sid) && text, "Write the note and choose who it is about");
      if (kind === "company") companyOf(st, sid);
      else userOf(st, sid, kind);
      const due = or(get(p, "due"), null);
      if (due) parseDate(due);
      st.notes.push({ id: uid("n"), subject_type: kind, subject_id: sid, text, due, done: false, by: u.id, at: now() });
      return ["Added a note" + (due ? " due " + ddmmmyyyy(due) : ""), kind === "company" ? sid : null];
    },

    toggle_note(st, u, p) {
      need(u.role === "advisor", "Only advisors keep notes");
      const n = find(st.notes, get(p, "note_id"));
      need(n, "Note not found");
      n.done = !truthy(n.done);
      return [(n.done ? "Completed" : "Reopened") + " a task", n.subject_type === "company" ? n.subject_id : null];
    },

    mark_invoice_paid(st, u, p, day) {
      need(u.role === "advisor", "Only an advisor records payments");
      const f = find(st.invoices, get(p, "invoice_id"));
      need(f && !truthy(f.paid_on), "Invoice not found or already paid");
      f.paid_on = validDate(or(get(p, "date"), day));
      return ["Invoice " + f.id + " marked paid (" + rs(f.amount_paise) + " + GST)", f.company_id];
    },

    save_invoice(st, u, p, day) {
      need(u.role === "advisor", "Only an advisor raises invoices");
      const kind = get(p, "kind");
      need(["advisory", "success", "revenue_share", "monitoring", "transfer"].includes(kind), "Unknown fee type");
      const c = companyOf(st, get(p, "company_id"));
      const amount = inum(get(p, "amount_paise"));
      need(amount && amount > 0, "Enter the amount");
      const payer = ["monitoring", "transfer"].includes(kind) ? "lender" : "company";
      const payerId = payer === "company" ? c.id : userOf(st, get(p, "payer_id"), "lender").id;
      const due = validDate(or(get(p, "due"), DOM.addDays(day, 15)));
      st.invoices.push({ id: uid("f"), kind, company_id: c.id, payer, payer_id: payerId, period: cut(pystr(or(get(p, "period"), "")), 60),
        amount_paise: amount, gst_paise: floorDiv(amount * 18, 100), issued: day, due, paid_on: null });
      return ["Raised a " + spaced(kind) + " invoice for " + c.name + ": " + rs(amount) + " + GST", c.id];
    },
  };

  // ---------- audit log with per-document before/after (server/app.py Store.save + diff) ----------
  function sortDeep(v) {
    if (Array.isArray(v)) return v.map(sortDeep);
    if (isObj(v)) { const o = {}; for (const k of Object.keys(v).sort()) o[k] = sortDeep(v[k]); return o; }
    return v;
  }
  const canon = (v) => JSON.stringify(sortDeep(v === undefined ? null : v));

  /** Only the fields that changed, as {field: [before, after]}. */
  function diff(before, after) {
    if (before == null || after == null) return before == null ? { created: true } : { deleted: true };
    const out = {};
    for (const k of Array.from(new Set(Object.keys(before).concat(Object.keys(after)))).sort()) {
      const b = get(before, k), a = get(after, k);
      if (canon(b) !== canon(a)) out[k] = [b, a];
    }
    return out;
  }

  /** Every document that differs between two copies of the data, in the server's order. */
  function changesBetween(old, cur) {
    const out = [];
    for (const c of COLLECTIONS) {
      const snap = new Map(old[c].map((d) => [d.id, canon(d)]));
      const ids = new Set();
      for (const d of cur[c]) {
        ids.add(d.id);
        const before = snap.get(d.id);
        if (before !== canon(d)) out.push({ collection: c, id: d.id, diff: diff(before ? JSON.parse(before) : null, d) });
      }
      for (const [id, before] of snap) if (!ids.has(id)) out.push({ collection: c, id, diff: diff(JSON.parse(before), null) });
    }
    const usnap = new Map(old.users.map((u) => [u.id, canon(get(u, "profile"))]));
    for (const u of cur.users) {
      if (usnap.get(u.id) !== canon(get(u, "profile"))) {
        out.push({ collection: "users", id: u.id, diff: diff({ profile: JSON.parse(usnap.get(u.id)) }, { profile: get(u, "profile") }) });
      }
    }
    return out;
  }

  function writeAudit(u, action, detail, companyId, changes) {
    DB.audit.push({ id: uid("a"), at: now(), user_id: u ? u.id : null, user_name: u ? u.name : "Website visitor", action, detail,
      company_id: companyId == null ? null : companyId, changes: changes && changes.length ? changes : null });
  }

  function auditRows(filt) {
    const rows = filt ? DB.audit.filter((r) => r[filt[0]] === filt[1]) : DB.audit;
    return rows.slice(-1000).reverse();
  }

  /** Run fn on a working copy; keep it only if fn succeeds, then log what changed (the server's request transaction). */
  function transact(u, action, fn) {
    const work = { audit: DB.audit };
    for (const k of COLLECTIONS.concat(["users"])) work[k] = clone(DB[k]);
    let res;
    try {
      res = fn(work, work.users.find((x) => x.id === u.id));
    } catch (e) {
      if (e instanceof Denied || e.status) throw e;
      throw crash();
    }
    const changes = changesBetween(DB, work);
    DB = work;
    writeAudit(u, action, res.detail, res.company_id, changes);
    save();
    return res;
  }

  const plainPayload = (p) => (isObj(p) ? clone(p) : {});
  const extOf = (name) => {
    const base = name.slice(name.lastIndexOf("/") + 1), i = base.lastIndexOf(".");
    return i > 0 && !/^\.+$/.test(base.slice(0, i)) ? base.slice(i) : "";
  };
  async function dataURL(file, mime) {
    let buf;
    if (file.arrayBuffer) buf = await file.arrayBuffer();
    else buf = await new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => bad(r.error); r.readAsArrayBuffer(file); });
    const bytes = new Uint8Array(buf);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return { url: "data:" + mime + ";base64," + btoa(bin), size: bytes.length };
  }
  const signedIn = () => { const u = currentUser(); if (!u) throw fail("Please sign in.", 401); return u; };
  const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  // ---------- public API (same shape as the server adapter, site/api-server.js) ----------
  const api = {
    mode: "demo",
    demoPassword: DEMO_PASSWORD,
    async me() { return pub(currentUser(), true); },
    async login(email, password) {
      const e = String(email || "").trim().toLowerCase(), t = Date.now();
      const recent = (FAILS[e] || []).filter((x) => t - x < 900000);
      if (recent.length >= 5) throw fail("Too many attempts. Try again in 15 minutes.", 429);
      const u = DB.users.find((x) => x.email === e);
      const pw = String(password || "");
      const ok = u && (u.pw_hash ? u.pw_hash === (await hash(pw)) : pw === DEMO_PASSWORD);
      if (!ok) { FAILS[e] = recent.concat([t]); throw fail("Email or password is wrong.", 401); }
      delete FAILS[e];
      setSession(u.id);
      const out = pub(u, true); // the server answers with the row as it was before last_active moved
      if (u.role === "investor") u.profile = Object.assign({}, u.profile || {}, { last_active: now() });
      writeAudit(u, "login", "Signed in");
      save();
      return clone(out);
    },
    async signup(f) {
      f = plainPayload(f);
      const email = pystr(or(get(f, "email"), "")).trim().toLowerCase(), name = cut(pystr(or(get(f, "name"), "")).trim(), 80);
      const role = get(f, "role"), pw = pystr(or(get(f, "password"), ""));
      if (!EMAIL.test(email)) throw fail("Enter a valid email address.", 400);
      if (Array.from(pw).length < 8) throw fail("Use a password of at least 8 characters.", 400);
      if (!["founder", "investor", "lender"].includes(role)) throw fail("Choose founder, investor or lender.", 400);
      if (!name) throw fail("Enter your name.", 400);
      if (DB.users.some((x) => x.email === email)) throw fail("An account with this email already exists. Sign in instead.", 409);
      const org = cut(pystr(or(get(f, "org"), "")).trim(), 120), sector = cut(pystr(or(get(f, "sector"), "Plastics & packaging")), 60);
      const u = { id: uid("u"), email, name, role, company_id: null, firm: null, title: null, mandate: null, profile: null, pw_hash: await hash(pw), created_at: now() };
      if (role === "founder") {
        const c = { id: uid("c"), name: org || "My company", sector, stage: "Growth", city: "Mumbai", revenue: 50, raise: 10, instrument: "equity",
          raise_paise: 10 * 10000000 * 100, pipeline_stage: "applied", stage_since: today(), security_type: "equity", offer_price_paise: 0,
          fd_extra_shares: 0, external_offers: {}, checklist: {}, updates: [], twin: {}, readiness: {}, quarters: [],
          covenants: { dscr_min: 1.25, debt_ebitda_max: 3.5 }, docs: [] };
        DB.companies.push(c);
        u.company_id = c.id;
      } else {
        u.firm = org || name;
        if (role === "investor") {
          u.mandate = { sectors: [sector], past_sectors: [], stages: ["Growth"], ticket_min: 2, ticket_max: 20, instruments: ["equity"] };
          u.profile = { kyc: "not_started", accredited: false, nda_signed_at: null, last_active: now() };
        } else {
          // a self-registered lender is unverified until Aegis Ascend confirms its RBI registration
          u.profile = { regulated: false, lender_type: null, reg_no: null };
        }
      }
      DB.users.push(u);
      writeAudit(u, "signup", "Created a " + role + " account", u.company_id);
      save();
      setSession(u.id);
      return clone(pub(u, true));
    },
    async logout() { setSession(null); },
    async state() {
      const u = signedIn();
      return clone(visibleState(DB, u, auditRows, today()));
    },
    async act(name, payload) {
      const u = signedIn();
      if (!has(ACTIONS, name)) throw fail("Unknown action", 404);
      const p = plainPayload(payload), day = today();
      return clone(transact(u, name, (st, me) => { const [detail, cid] = ACTIONS[name](st, me, p, day); return { detail, company_id: cid }; }));
    },
    /** Same checks as POST /api/upload; the file is kept in the browser as a data URL. Returns the file record. */
    async upload(file, fields) {
      const u = signedIn();
      fields = fields || {};
      const cid = get(fields, "company_id"), purpose = get(fields, "purpose");
      if (!file || !file.name) throw fail("Choose a file.", 400);
      const ext = extOf(String(file.name)).toLowerCase();
      if (!has(UPLOAD_TYPES, ext)) throw fail("Upload a PDF, Excel, CSV, Word or image file.", 400);
      if (!UPLOAD_PURPOSES.includes(purpose)) throw fail("Unknown upload type.", 400);
      if (!DB.companies.some((c) => c.id === cid)) throw fail("Company not found.", 404);
      const allowed = u.role === "advisor" || (u.role === "founder" && u.company_id === cid && ["dataroom", "monitoring"].includes(purpose));
      if (!allowed) throw fail("You cannot upload files for this company.", 403);
      if (file.size > MAX_UPLOAD) throw fail("The demo keeps files in this browser, so upload files of 1.5 MB or less.", 413);
      const data = await dataURL(file, UPLOAD_TYPES[ext]);
      if (data.size > MAX_UPLOAD) throw fail("The demo keeps files in this browser, so upload files of 1.5 MB or less.", 413);
      const rec = { id: uid("file"), name: cut(String(file.name).replace(/[^\p{L}\p{N}_.\- ()]/gu, "_"), 120), mime: UPLOAD_TYPES[ext], company_id: cid, purpose,
        item: cut(pystr(or(get(fields, "item"), "")), 60) || null, uploaded_by: u.id, at: now(), size: data.size, data_url: data.url };
      transact(u, "upload", (st) => { st.files.push(rec); return { detail: "Uploaded " + rec.name + " (" + spaced(purpose) + ")", company_id: cid }; });
      return clone(publicFile(rec));
    },
    /** Same permission check as GET /api/file/<id>; returns {name, mime, url} with a data URL. */
    async download(id) {
      const u = signedIn();
      const f = DB.files.find((x) => x.id === id);
      if (!f || !canSeeFile(DB, u, f)) throw fail("File not found.", 404);
      writeAudit(u, "download", "Downloaded " + f.name, f.company_id);
      save();
      return { name: f.name, mime: f.mime, url: f.data_url };
    },
    async enquiry(f) {
      f = plainPayload(f);
      const name = cut(pystr(or(get(f, "name"), "")).trim(), 80), email = cut(pystr(or(get(f, "email"), "")).trim(), 120), msg = cut(pystr(or(get(f, "message"), "")).trim(), 2000);
      if (!name || !EMAIL.test(email) || !msg) throw fail("Enter your name, a valid email and a message.", 400);
      DB.enquiries.push({ id: uid("e"), at: now(), name, email, company: cut(pystr(or(get(f, "company"), "")), 120), message: msg });
      writeAudit(null, "enquiry", "Enquiry from " + name);
      save();
    },
    async reset() { DB = seed(); for (const k of Object.keys(FAILS)) delete FAILS[k]; save(); setSession(null); },
    /** Test-only: the raw demo database (site/tests/store.test.js reads counters from it). Not part of the app's API. */
    _db() { return DB; },
  };

  root.GBStore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = { api, ACTIONS, visibleState, resolveSeed, helpers: { rs, ddmmmyyyy, fnum, inum, diff } };
})(typeof globalThis !== "undefined" ? globalThis : this);
