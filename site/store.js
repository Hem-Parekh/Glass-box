/* Demo data store: the same accounts, roles, permissions and actions as the real server
   (server/app.py), kept in this browser's localStorage. Protects nothing; for demonstration only. */
(function (root) {
  "use strict";
  const KEY = "gb_demo_db_v1", SESSION = "gb_demo_session_v1";
  const DEMO_PASSWORD = "demo1234";
  const now = () => new Date().toISOString();
  const uid = (p) => p + "_" + Math.random().toString(36).slice(2, 10);

  function seed() {
    const d = (s) => new Date(s).toISOString();
    const users = [
      { id: "u_founder", email: "founder@demo.in", name: "Priya Nair", role: "founder", company_id: "c_kalyan", title: "Managing Director" },
      { id: "u_founder2", email: "rahul@demo.in", name: "Rahul Deshmukh", role: "founder", company_id: "c_vasai", title: "Founder" },
      { id: "u_founder3", email: "farah@demo.in", name: "Farah Shaikh", role: "founder", company_id: "c_taloja", title: "Director" },
      { id: "u_investor", email: "investor@demo.in", name: "Meera Iyer", role: "investor", firm: "Konkan Growth Partners",
        mandate: { sectors: ["Auto components", "Plastics & packaging"], past_sectors: ["Chemicals", "Auto components"], stages: ["Growth"], ticket_min: 5, ticket_max: 20, instruments: ["equity", "CCPS"] } },
      { id: "u_investor2", email: "angels@demo.in", name: "Vikram Bhatt", role: "investor", firm: "Sahyadri Angels Network",
        mandate: { sectors: ["Chemicals", "Food processing"], past_sectors: ["Plastics & packaging"], stages: ["Expansion", "Growth"], ticket_min: 2, ticket_max: 10, instruments: ["equity", "CCD"] } },
      { id: "u_investor3", email: "familyoffice@demo.in", name: "Arvind Rao", role: "investor", firm: "Rao Family Office",
        mandate: { sectors: ["Plastics & packaging", "Auto components"], past_sectors: [], stages: ["Growth", "Mature"], ticket_min: 10, ticket_max: 30, instruments: ["equity"] } },
      { id: "u_advisor", email: "advisor@demo.in", name: "CA Neha Joshi", role: "advisor", firm: "Aegis Ascend Financial Advisors", title: "Reviewing advisor" },
      { id: "u_lender", email: "lender@demo.in", name: "Suresh Pillai", role: "lender", firm: "Harbour Bank (sample)", title: "Credit manager" },
      { id: "u_lender2", email: "nbfc@demo.in", name: "Kavita Rane", role: "lender", firm: "Sahyadri Finance NBFC (sample)", title: "Head of SME lending" },
    ];
    const companies = [
      { id: "c_kalyan", name: "Kalyan Polymers Pvt Ltd", sector: "Plastics & packaging", stage: "Growth", city: "Bhiwandi", revenue: 68, raise: 12, instrument: "equity",
        twin: {}, readiness: {}, covenants: { dscr_min: 1.25, debt_ebitda_max: 3.5 },
        quarters: [
          { q: "Q1 FY26", ebitda: 1.6, interest: 0.18, principal: 0.55, debt: 5.2 },
          { q: "Q2 FY26", ebitda: 1.5, interest: 0.17, principal: 0.55, debt: 4.7 },
          { q: "Q3 FY26", ebitda: 1.2, interest: 0.15, principal: 0.55, debt: 4.1 },
          { q: "Q4 FY26", ebitda: 0.95, interest: 0.14, principal: 0.55, debt: 3.6 },
        ],
        docs: ["Audited accounts FY24-FY26", "GST returns (12 months)", "CMA data FY25-FY28", "Cap table", "Debt vs equity report"] },
      { id: "c_vasai", name: "Vasai Precision Castings Pvt Ltd", sector: "Auto components", stage: "Growth", city: "Vasai", revenue: 112, raise: 25, instrument: "equity",
        twin: { raise: 25, pre_money: 140, ebitda0: 13, existing_ds: 3 }, readiness: { dscr: 1.62, collateral_cover: 1.6, gst_on_time: 12, data_room_ready: true },
        covenants: { dscr_min: 1.25, debt_ebitda_max: 3.5 },
        quarters: [
          { q: "Q1 FY26", ebitda: 3.4, interest: 0.46, principal: 0.9, debt: 17.1 },
          { q: "Q2 FY26", ebitda: 3.6, interest: 0.44, principal: 0.9, debt: 16.2 },
          { q: "Q3 FY26", ebitda: 3.5, interest: 0.42, principal: 0.9, debt: 15.3 },
          { q: "Q4 FY26", ebitda: 3.9, interest: 0.4, principal: 0.9, debt: 14.4 },
        ],
        docs: ["Audited accounts FY24-FY26", "GST returns (12 months)", "Customer contracts", "Cap table", "Debt vs equity report"] },
      { id: "c_taloja", name: "Taloja Specialty Chemicals Pvt Ltd", sector: "Chemicals", stage: "Expansion", city: "Taloja", revenue: 45, raise: 8, instrument: "equity",
        twin: { raise: 8, pre_money: 36, ebitda0: 4.2, existing_ds: 0.8 }, readiness: { dscr: 1.3, audited_years: 2 }, covenants: { dscr_min: 1.25, debt_ebitda_max: 3.5 },
        quarters: [], docs: ["Audited accounts FY25-FY26", "Cap table"] },
    ];
    const reports = [
      { id: "r_vasai", company_id: "c_vasai", title: "Debt vs equity: Rs 25 cr expansion", status: "approved", engine_version: "gb-engine 1.0.0",
        created_at: d("2026-09-18"), submitted_by: "u_founder2", reviewed_by: "u_advisor", reviewed_at: d("2026-09-28"), review_note: "Assumptions within sector benchmarks. Stress case holds.",
        summary: { best_share: 0.55, net: 6.1, break_even: 210, min_dscr: 1.48, min_dscr_stress: 1.07 }, checks: { validation: true, founder_confirmed: true, verifier: true } },
      { id: "r_taloja", company_id: "c_taloja", title: "Debt vs equity: Rs 8 cr capacity add", status: "in_review", engine_version: "gb-engine 1.0.0",
        created_at: d("2026-10-06"), submitted_by: "u_founder3", summary: { best_share: 0.4, net: 1.2, break_even: 58, min_dscr: 1.31, min_dscr_stress: 1.02 },
        checks: { validation: true, founder_confirmed: true, verifier: true } },
    ];
    const intros = [
      { id: "i_1", company_id: "c_vasai", investor_id: "u_investor", origin: "investor", status: "granted", created_at: d("2026-09-30"), nda_signed_at: d("2026-10-01"),
        views: [{ doc: "Audited accounts FY24-FY26", at: d("2026-10-01T10:12") }, { doc: "Debt vs equity report", at: d("2026-10-02T16:40") }] },
      { id: "i_2", company_id: "c_vasai", investor_id: "u_investor3", origin: "investor", status: "requested", created_at: d("2026-10-08"), views: [] },
    ];
    const loans = [
      { id: "l_kalyan", company_id: "c_kalyan", lender_id: "u_lender2", amount: 6, rate: 0.115, tenor: 5, status: "disbursed", created_at: d("2025-03-01"), transfer: null },
      { id: "l_vasai", company_id: "c_vasai", lender_id: "u_lender", amount: 18, rate: 0.1025, tenor: 7, status: "disbursed", created_at: d("2025-04-15"), transfer: null },
    ];
    const holdings = [
      { id: "h_1", company_id: "c_vasai", investor_id: "u_investor", amount: 4, stake: 0.032, invested_at: d("2026-02-10") },
      { id: "h_2", company_id: "c_taloja", investor_id: "u_investor2", amount: 1.5, stake: 0.045, invested_at: d("2026-07-20") },
    ];
    const audit = [
      { id: uid("a"), at: d("2026-09-28T11:05"), user_id: "u_advisor", user_name: "CA Neha Joshi", action: "review_report", detail: "Approved report: Debt vs equity: Rs 25 cr expansion", company_id: "c_vasai" },
      { id: uid("a"), at: d("2026-10-01T09:58"), user_id: "u_investor", user_name: "Meera Iyer", action: "sign_nda", detail: "Signed NDA for Vasai Precision Castings Pvt Ltd", company_id: "c_vasai" },
    ];
    return { users, companies, reports, intros, loans, holdings, exits: [], enquiries: [], audit };
  }

  // ---------- persistence ----------
  function load() {
    try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch (e) { /* storage blocked */ }
    return seed();
  }
  let DB = load();
  let MEM_SESSION = null;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { /* in-memory only */ } }
  function getSession() { try { return localStorage.getItem(SESSION) || MEM_SESSION; } catch (e) { return MEM_SESSION; } }
  function setSession(id) { MEM_SESSION = id; try { if (id) localStorage.setItem(SESSION, id); else localStorage.removeItem(SESSION); } catch (e) { /* ignore */ } }

  async function hash(pw) {
    try {
      const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("gb-demo:" + pw));
      return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
    } catch (e) { return "plain:" + pw; }
  }

  // ---------- permissions (mirror of server/app.py: visible_state) ----------
  const pub = (u) => u && { id: u.id, name: u.name, role: u.role, firm: u.firm, title: u.title, company_id: u.company_id, mandate: u.mandate };
  function approvedCompanyIds(db) { return new Set(db.reports.filter((r) => r.status === "approved").map((r) => r.company_id)); }
  function teaser(c, db) {
    const rep = db.reports.find((r) => r.company_id === c.id && r.status === "approved");
    return { id: c.id, name: c.name, sector: c.sector, stage: c.stage, city: c.city, revenue: c.revenue, raise: c.raise, instrument: c.instrument, teaser: true,
      reviewed_by: rep && rep.reviewed_by, report_summary: rep && rep.summary };
  }
  function visibleState(db, user) {
    const directory = db.users.filter((u) => u.role === "investor" || u.role === "lender" || u.role === "advisor").map(pub);
    const base = { me: pub(user), directory };
    if (user.role === "advisor") {
      return Object.assign(base, { companies: db.companies, reports: db.reports, intros: db.intros, loans: db.loans, holdings: db.holdings, exits: db.exits,
        enquiries: db.enquiries, audit: db.audit.slice().reverse(), founders: db.users.filter((u) => u.role === "founder").map(pub) });
    }
    if (user.role === "founder") {
      const cid = user.company_id;
      return Object.assign(base, {
        companies: db.companies.filter((c) => c.id === cid), reports: db.reports.filter((r) => r.company_id === cid),
        intros: db.intros.filter((i) => i.company_id === cid), loans: db.loans.filter((l) => l.company_id === cid),
        holdings: db.holdings.filter((h) => h.company_id === cid), exits: db.exits.filter((x) => x.company_id === cid),
        audit: db.audit.filter((a) => a.company_id === cid).reverse(),
      });
    }
    if (user.role === "investor") {
      const mine = db.intros.filter((i) => i.investor_id === user.id);
      const open = new Set(mine.filter((i) => i.status === "granted" && i.nda_signed_at).map((i) => i.company_id));
      const approved = approvedCompanyIds(db);
      const held = new Set(db.holdings.filter((h) => h.investor_id === user.id).map((h) => h.company_id));
      const companies = db.companies.filter((c) => approved.has(c.id) || held.has(c.id) || mine.some((i) => i.company_id === c.id))
        .map((c) => (open.has(c.id) ? Object.assign({}, c, { teaser: false }) : teaser(c, db)));
      return Object.assign(base, {
        companies, reports: db.reports.filter((r) => r.status === "approved" && open.has(r.company_id)),
        intros: mine, loans: [], holdings: db.holdings.filter((h) => h.investor_id === user.id),
        exits: db.exits.filter((x) => x.investor_id === user.id), audit: db.audit.filter((a) => a.user_id === user.id).reverse(),
      });
    }
    // lender
    const loans = db.loans.filter((l) => l.lender_id === user.id);
    const cids = new Set(loans.map((l) => l.company_id));
    return Object.assign(base, {
      companies: db.companies.filter((c) => cids.has(c.id)), reports: db.reports.filter((r) => r.status === "approved" && cids.has(r.company_id)),
      intros: [], loans, holdings: [], exits: [], audit: db.audit.filter((a) => a.user_id === user.id).reverse(),
    });
  }

  // ---------- actions (mirror of server/app.py: ACTIONS) ----------
  class Denied extends Error {}
  const need = (cond, msg) => { if (!cond) throw new Denied(msg); };
  const companyOf = (db, id) => { const c = db.companies.find((x) => x.id === id); need(c, "Company not found"); return c; };
  const ownsCompany = (u, cid) => u.role === "advisor" || (u.role === "founder" && u.company_id === cid);
  const COMPANY_FIELDS = ["name", "sector", "stage", "city", "revenue", "raise", "instrument", "twin", "readiness", "quarters", "covenants", "docs"];
  const MONTH = 30.44 * 24 * 3600 * 1000;

  const ACTIONS = {
    save_company(db, u, p) {
      need(ownsCompany(u, p.company_id), "Only the company's founder can edit it");
      const c = companyOf(db, p.company_id);
      for (const k of Object.keys(p.patch || {})) if (COMPANY_FIELDS.includes(k)) c[k] = p.patch[k];
      return { detail: "Updated " + Object.keys(p.patch || {}).join(", "), company_id: c.id };
    },
    submit_report(db, u, p) {
      need(u.role === "founder" && u.company_id === p.company_id, "Only the company's founder can submit its report");
      const c = companyOf(db, p.company_id);
      need(p.checks && p.checks.validation && p.checks.founder_confirmed && p.checks.verifier, "All release checks must pass before review");
      need(!db.reports.some((r) => r.company_id === c.id && r.status === "in_review"), "A report for this company is already in review");
      const r = { id: uid("r"), company_id: c.id, title: String(p.title || "Debt vs equity report").slice(0, 120), status: "in_review", engine_version: p.engine_version,
        created_at: now(), submitted_by: u.id, summary: p.summary, checks: p.checks, inputs: p.inputs };
      db.reports.push(r);
      return { detail: "Submitted for advisor review: " + r.title, company_id: c.id };
    },
    review_report(db, u, p) {
      need(u.role === "advisor", "Only an advisor can review reports");
      const r = db.reports.find((x) => x.id === p.report_id); need(r, "Report not found");
      need(r.status === "in_review", "This report is not waiting for review");
      need(["approve", "changes"].includes(p.decision), "Choose approve or request changes");
      r.status = p.decision === "approve" ? "approved" : "changes"; r.reviewed_by = u.id; r.reviewed_at = now(); r.review_note = String(p.note || "").slice(0, 500);
      return { detail: (p.decision === "approve" ? "Approved report: " : "Requested changes: ") + r.title, company_id: r.company_id };
    },
    request_intro(db, u, p) {
      need(u.role === "investor", "Only investors can request an introduction");
      need(approvedCompanyIds(db).has(p.company_id), "Only advisor-approved deals are open to investors");
      need(!db.intros.some((i) => i.company_id === p.company_id && i.investor_id === u.id), "You already have an introduction for this company");
      db.intros.push({ id: uid("i"), company_id: p.company_id, investor_id: u.id, origin: "investor", status: "requested", created_at: now(), views: [] });
      return { detail: "Requested an introduction to " + companyOf(db, p.company_id).name, company_id: p.company_id };
    },
    invite_investor(db, u, p) {
      need(u.role === "founder" && u.company_id === p.company_id, "Only the company's founder can invite investors");
      need(approvedCompanyIds(db).has(p.company_id), "Your report must be advisor-approved before investors are introduced");
      const inv = db.users.find((x) => x.id === p.investor_id && x.role === "investor"); need(inv, "Investor not found");
      need(!db.intros.some((i) => i.company_id === p.company_id && i.investor_id === inv.id), "This investor is already introduced");
      db.intros.push({ id: uid("i"), company_id: p.company_id, investor_id: inv.id, origin: "founder", status: "granted", created_at: now(), views: [] });
      return { detail: "Approved an introduction to " + inv.firm, company_id: p.company_id };
    },
    decide_intro(db, u, p) {
      const i = db.intros.find((x) => x.id === p.intro_id); need(i, "Introduction not found");
      need(u.role === "founder" && u.company_id === i.company_id, "Only the company's founder can decide");
      need(i.status === "requested", "This request was already decided");
      i.status = p.decision === "grant" ? "granted" : "declined";
      const inv = db.users.find((x) => x.id === i.investor_id);
      return { detail: (i.status === "granted" ? "Granted access to " : "Declined ") + (inv ? inv.firm : "investor"), company_id: i.company_id };
    },
    sign_nda(db, u, p) {
      const i = db.intros.find((x) => x.id === p.intro_id); need(i, "Introduction not found");
      need(u.role === "investor" && i.investor_id === u.id, "Not your introduction");
      need(i.status === "granted", "The founder has not granted access yet");
      i.nda_signed_at = i.nda_signed_at || now();
      return { detail: "Signed NDA for " + companyOf(db, i.company_id).name, company_id: i.company_id };
    },
    view_doc(db, u, p) {
      const i = db.intros.find((x) => x.id === p.intro_id); need(i, "Introduction not found");
      need(u.role === "investor" && i.investor_id === u.id && i.status === "granted" && i.nda_signed_at, "Sign the NDA to open documents");
      const c = companyOf(db, i.company_id); need((c.docs || []).includes(p.doc), "Document not found");
      i.views.push({ doc: p.doc, at: now() });
      return { detail: "Viewed " + p.doc + " (watermarked: " + u.name + ")", company_id: c.id };
    },
    apply_loan(db, u, p) {
      need(u.role === "founder" && u.company_id === p.company_id, "Only the company's founder can apply");
      const l = db.users.find((x) => x.id === p.lender_id && x.role === "lender"); need(l, "Lender not found");
      const amount = Number(p.amount), rate = Number(p.rate), tenor = Math.trunc(Number(p.tenor));
      need(amount > 0 && rate > 0 && rate < 1 && tenor > 0 && tenor <= 20, "Enter a valid amount, rate and tenor");
      db.loans.push({ id: uid("l"), company_id: p.company_id, lender_id: l.id, amount, rate, tenor, status: "applied", created_at: now(), transfer: null });
      return { detail: "Sent a Rs " + amount + " cr loan application to " + l.firm, company_id: p.company_id };
    },
    lender_decide(db, u, p) {
      const l = db.loans.find((x) => x.id === p.loan_id); need(l, "Loan not found");
      need(u.role === "lender" && l.lender_id === u.id, "Not your loan");
      const next = { sanction: ["applied", "sanctioned"], decline: ["applied", "declined"], disburse: ["sanctioned", "disbursed"] }[p.decision];
      need(next && l.status === next[0], "That step is not available now");
      l.status = next[1]; if (p.rate) l.rate = Number(p.rate);
      return { detail: "Loan " + l.status + " (Rs " + l.amount + " cr)", company_id: l.company_id };
    },
    request_transfer(db, u, p) {
      const l = db.loans.find((x) => x.id === p.loan_id); need(l, "Loan not found");
      need(u.role === "lender" && l.lender_id === u.id, "Not your loan");
      need(l.status === "disbursed" && !l.transfer, "Only a disbursed loan with no open transfer can be transferred");
      l.transfer = { status: "open", step: 0, amount: Number(p.amount) || l.amount, requested_at: now() };
      return { detail: "Asked Aegis Ascend to find a buyer for a Rs " + l.transfer.amount + " cr loan", company_id: l.company_id };
    },
    advance_transfer(db, u, p) {
      need(u.role === "advisor", "Only an advisor can move a transfer forward");
      const l = db.loans.find((x) => x.id === p.loan_id); need(l && l.transfer && l.transfer.status === "open", "No open transfer");
      l.transfer.step += 1; if (l.transfer.step >= 7) l.transfer.status = "completed";
      return { detail: "Loan transfer step " + l.transfer.step + " done", company_id: l.company_id };
    },
    request_exit(db, u, p) {
      const h = db.holdings.find((x) => x.id === p.holding_id); need(h, "Holding not found");
      need(u.role === "investor" && h.investor_id === u.id, "Not your holding");
      need(!db.exits.some((x) => x.holding_id === h.id && x.status !== "completed"), "An exit is already in progress");
      const months = (Date.now() - new Date(h.invested_at).getTime()) / MONTH;
      const x = { id: uid("x"), holding_id: h.id, company_id: h.company_id, investor_id: u.id, price: Number(p.price) || null, months: Math.floor(months),
        status: months >= 6 ? "first_refusal" : "consent_needed", step: 0, created_at: now() };
      db.exits.push(x);
      return { detail: "Asked to sell stake in " + companyOf(db, h.company_id).name + (months < 6 ? " (needs founder consent: under 6 months)" : ""), company_id: h.company_id };
    },
    consent_exit(db, u, p) {
      const x = db.exits.find((e) => e.id === p.exit_id); need(x, "Exit not found");
      need(u.role === "founder" && u.company_id === x.company_id, "Only the company's founder can consent");
      need(x.status === "consent_needed", "No consent is needed for this exit");
      x.status = "first_refusal";
      return { detail: "Gave written consent to an early exit", company_id: x.company_id };
    },
    advance_exit(db, u, p) {
      need(u.role === "advisor", "Only an advisor can move an exit forward");
      const x = db.exits.find((e) => e.id === p.exit_id); need(x && x.status !== "consent_needed" && x.status !== "completed", "No exit to move forward");
      const order = ["first_refusal", "buyer_intro", "valuation", "spa", "transfer", "completed"];
      x.status = order[Math.min(order.indexOf(x.status) + 1, order.length - 1)];
      return { detail: "Exit moved to " + x.status.replace("_", " "), company_id: x.company_id };
    },
    record_investment(db, u, p) {
      need(u.role === "advisor", "Only an advisor records a closed deal");
      const i = db.intros.find((x) => x.id === p.intro_id); need(i && i.status === "granted", "Introduction not found or not granted");
      const amount = Number(p.amount), stake = Number(p.stake);
      need(amount > 0 && stake > 0 && stake < 1, "Enter the amount and stake");
      const investorsOnDeal = new Set(db.holdings.filter((h) => h.company_id === i.company_id && h.round === p.round).map((h) => h.investor_id));
      need(investorsOnDeal.size < 3, "A deal closes with at most 3 investors");
      db.holdings.push({ id: uid("h"), company_id: i.company_id, investor_id: i.investor_id, amount, stake, round: p.round || "current", invested_at: now() });
      return { detail: "Recorded a Rs " + amount + " cr investment", company_id: i.company_id };
    },
  };

  function audit(db, u, action, res) {
    db.audit.push({ id: uid("a"), at: now(), user_id: u ? u.id : null, user_name: u ? u.name : "Website visitor", action, detail: res.detail, company_id: res.company_id || null });
  }

  // ---------- public API (same shape as the server adapter) ----------
  const api = {
    mode: "demo",
    demoPassword: DEMO_PASSWORD,
    async me() { const id = getSession(); const u = id && DB.users.find((x) => x.id === id); return u ? pub(u) : null; },
    async login(email, password) {
      const u = DB.users.find((x) => x.email.toLowerCase() === String(email).trim().toLowerCase());
      const ok = u && (u.pw ? u.pw === (await hash(password)) : password === DEMO_PASSWORD);
      if (!ok) throw new Error("Email or password is wrong.");
      setSession(u.id); audit(DB, u, "login", { detail: "Signed in" }); save();
      return pub(u);
    },
    async signup(f) {
      const email = String(f.email || "").trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter a valid email address.");
      if (String(f.password || "").length < 8) throw new Error("Use a password of at least 8 characters.");
      if (!["founder", "investor", "lender"].includes(f.role)) throw new Error("Choose founder, investor or lender.");
      if (!String(f.name || "").trim()) throw new Error("Enter your name.");
      if (DB.users.some((x) => x.email === email)) throw new Error("An account with this email already exists. Sign in instead.");
      const u = { id: uid("u"), email, name: String(f.name).trim().slice(0, 80), role: f.role, pw: await hash(f.password) };
      if (f.role === "founder") {
        const c = { id: uid("c"), name: String(f.org || "My company").trim().slice(0, 120), sector: f.sector || "Plastics & packaging", stage: "Growth", city: f.city || "Mumbai",
          revenue: 50, raise: 10, instrument: "equity", twin: {}, readiness: {}, quarters: [], covenants: { dscr_min: 1.25, debt_ebitda_max: 3.5 }, docs: [] };
        DB.companies.push(c); u.company_id = c.id;
      } else {
        u.firm = String(f.org || f.name).trim().slice(0, 120);
        if (f.role === "investor") u.mandate = { sectors: [f.sector || "Plastics & packaging"], past_sectors: [], stages: ["Growth"], ticket_min: 2, ticket_max: 20, instruments: ["equity"] };
      }
      DB.users.push(u); setSession(u.id); audit(DB, u, "signup", { detail: "Created a " + u.role + " account", company_id: u.company_id }); save();
      return pub(u);
    },
    async logout() { setSession(null); },
    async state() {
      const u = await api.me(); if (!u) throw new Error("Please sign in.");
      return JSON.parse(JSON.stringify(visibleState(DB, DB.users.find((x) => x.id === u.id))));
    },
    async act(name, payload) {
      const id = getSession(); const u = id && DB.users.find((x) => x.id === id);
      if (!u) throw new Error("Please sign in.");
      const fn = ACTIONS[name]; if (!fn) throw new Error("Unknown action");
      const res = fn(DB, u, payload || {});
      audit(DB, u, name, res); save();
      return res;
    },
    async enquiry(f) {
      if (!String(f.name || "").trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(f.email || "")) || !String(f.message || "").trim()) throw new Error("Enter your name, a valid email and a message.");
      DB.enquiries.push({ id: uid("e"), at: now(), name: String(f.name).slice(0, 80), email: String(f.email).slice(0, 120), company: String(f.company || "").slice(0, 120), message: String(f.message).slice(0, 2000) });
      audit(DB, null, "enquiry", { detail: "Enquiry from " + String(f.name).slice(0, 80) }); save();
    },
    async reset() { DB = seed(); save(); setSession(null); },
  };
  root.GBStore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = { api, seed, visibleState, ACTIONS };
})(typeof globalThis !== "undefined" ? globalThis : this);
