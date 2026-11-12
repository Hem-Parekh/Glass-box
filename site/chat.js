/* The website assistant: a chat panel available on every page.
   On the server (window.GB_CHAT_URL set) questions go to POST /api/chat, where Claude answers from the
   website's own facts. Without a server, or when the server reports the assistant offline, the panel
   answers from the quick answers below, which say only what the site says. Never financial advice. */
(function (root) {
  "use strict";
  const KEY = "gb_chat_v1";
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  // ---------- quick answers (offline) ----------
  // Each entry: words that suggest the topic, and the answer. [label](#route) becomes a link.
  const QA = [
    [["what do you do", "who are you", "about", "services", "service", "offer"],
      "We're an independent funding advisory firm in Mumbai. We tell growing Indian businesses whether to raise debt, equity or a mix, then help deliver the deal and stay with the company for five years. We sell no loan and run no fund, so there's no product to push. Read more on [Services](#services)."],
    [["fee", "fees", "cost", "price", "pricing", "charge", "how much", "expensive"],
      "Advisory engagements start from Rs 1 lakh, scaled by company size. On an equity raise there's a 2.5% success fee and a 0.4% revenue share for 5 years, paid by the company. On a loan we arrange, the company pays a 2.5% debt success fee when the loan is disbursed. Investors pay nothing to invest, and 0.3-0.5% of the sale value when they sell. Lenders pay the arranging commission, monitoring (0.25-0.5% a year) and transfers (0.3-0.5%). All fees are plus 18% GST. See [Pricing](#pricing) for the calculator."],
    [["debt or equity", "debt vs equity", "should i", "loan or", "which is better", "mix", "recommend"],
      "That depends on your company's numbers, so it's exactly what an engagement answers. We test every mix from 0% to 100% debt, keep only those where repayment safety (DSCR) holds, including a stress case with sales down 20% and rates up 2 points, and a named advisor signs off the report. You can [try the live model](#login) or [talk to an advisor](#contact)."],
    [["raise", "equity raise", "investor introduction", "funding round", "how does a raise"],
      "We introduce curated investors from our panel and you approve every introduction. Investors hold shares directly in their own name. After the term sheet, a registered valuer values the company, agreements are signed, shares are allotted and PAS-3 is filed within 15 days. The steps are on [Services](#services-equity)."],
    [["exit", "sell", "resale", "lock", "lock-in", "holding period", "6 months"],
      "Investors can sell after a 6-month minimum holding from allotment, or earlier with the founder's written consent. Buying is free; when you sell, a resale fee of 0.3-0.5% of the sale value is charged once the transfer completes. Every resale is private and negotiated: a first-refusal window of 15-30 days, then a one-to-one buyer introduction. There are no public listings, prices or bidding. See [For investors](#investors)."],
    [["tax", "capital gains", "ltcg", "stcg"],
      "As an estimate: gains on shares held under 24 months are taxed at your slab rate, and 24 months or more at 12.5% long-term. The [For investors](#investors) page has an exit tax calculator. Please confirm with your tax adviser."],
    [["investor", "invest", "deal room", "nda", "kyc", "demat"],
      "Investors see fewer companies, each checked by our validation, our engine and an advisor's sign-off. You hold shares in your own name, in demat. Deal rooms open only for companies offered to you, once the founder grants access and you sign the NDA online; every view is logged. Verified KYC is needed first. See [For investors](#investors)."],
    [["lender", "bank", "nbfc", "loan", "monitoring", "transfer", "dscr", "covenant"],
      "For lenders we provide a standardised view of each applicant, quarterly monitoring with traceable figures and early warnings, and help selling loans to other regulated banks and NBFCs: request a sale from your workspace and an advisor arranges it. Lenders pay the arranging commission, monitoring and transfer fees. See [For lenders](#lenders)."],
    [["accurate", "accuracy", "ai", "trust", "check", "how is the report", "report made", "verify", "numbers"],
      "Every report follows eight steps: upload, read, founder confirms, validate, calculate, stress, verify, sign off. Code computes every number; the AI never does the maths. Click any underlined figure on the site to see its formula and where each input came from. See [How every report is made](#home)."],
    [["compliance", "legal", "section 42", "sebi", "rbi", "regulation", "safe", "security", "data"],
      "Compliance is built in: at most 20 platform investors per company, offers counted under Companies Act section 42 and members under section 2(68), verified KYC, and investor money never passes through us. Some security features are still planned, and several legal opinions are being obtained. Details on [Trust & compliance](#trust)."],
    [["founder", "founders", "team", "who runs", "hem", "yash", "vivan"],
      "Aegis Ascend was founded by Hem Parekh, Yash Sharma and Vivan Shah, each a co-founder. Meet them on [About](#about)."],
    [["contact", "talk", "call", "meet", "book", "engagement", "email", "reach"],
      "The quickest way is the enquiry form on [Contact](#contact). Tell us about the company and what you're raising, and an advisor will reply to the email you give."],
    [["sign in", "login", "log in", "account", "sign up", "register", "demo", "workspace"],
      "Founders, investors and lenders can create an account from [Sign in](#login). The demo has one-click sign-ins for each role (password demo1234), and all its companies and people are fictional."],
    [["tool", "tools", "funding twin", "optimizer", "cma", "readiness", "term sheet"],
      "Our advisors use the Funding Twin, the Equity vs Debt Optimizer, the CMA funding report, the Readiness Score and the Term Sheet Analyser, and founders receive the finished, reviewed report. See \"Tools behind the advice\" on the [home page](#home)."],
  ];
  const UNKNOWN = "I don't have that detail. I can tell you about our services, fees, how a raise or loan works, investor exits, and how we keep numbers accurate, or help you find any page. For anything else, the [Contact](#contact) form reaches an advisor.";
  const GREET = "Hello. I can answer questions about Aegis Ascend and help you find your way around the site: ask me where something is, or say \"show me around\". I give general information, not financial advice.";

  // ---------- finding your way (site/sitemap.json, inlined as window.GB_SITEMAP) ----------
  const SM = root.GB_SITEMAP || { public: [], roles: {} };
  const ROLE_NAME = { founder: "founder", investor: "investor", lender: "lender", advisor: "advisor" };
  const role = () => root.GB_ROLE || null;                       // set by the router (site/portal.js)
  const here = () => ((location.hash || "#home").slice(1).split("/")[0] || "home");
  const norm = (q) => " " + q.toLowerCase().replace(/[^a-z0-9%&\s-]/g, " ").replace(/\s+/g, " ") + " ";
  const hits = (t, words) => words.reduce((s, w) => s + (t.includes(" " + w + " ") || (w.includes(" ") && t.includes(w)) ? w.split(" ").length + 1 : 0), 0);
  const link = (p) => "[" + p.label + "](#" + p.route + ")";
  const NAV = /\b(where|find|go to|goto|open|take me|show me|get to|navigate|located|which page|what page|link to|how do i (get|see|find|reach|open|check|view|upload|sell|share|apply|sign|log|create|book|contact|edit|download|request))\b/;

  // every page a question could mean: public pages, then each role's workspace pages
  function candidates() {
    const out = SM.public.map((p) => ({ p, role: null }));
    Object.keys(SM.roles).forEach((r) => SM.roles[r].pages.forEach((p) => out.push({ p, role: r })));
    return out;
  }
  function findPage(t) {
    const mine = role();
    let best = null, top = 0;
    candidates().forEach((c) => {
      const words = c.p.keywords.indexOf(c.p.label.toLowerCase()) < 0 ? c.p.keywords.concat([c.p.label.toLowerCase()]) : c.p.keywords;
      let score = hits(t, words);
      if (!score) return;
      if (c.role && c.role === mine) score += 2;          // your own workspace first
      else if (c.role) score -= 1.5;                      // someone else's workspace only when nothing else fits
      if (score > top) { top = score; best = c; }
    });
    return best;
  }
  const an = (w) => (/^[aeiou]/.test(w) ? "an " : "a ") + w;
  function directions(c) {
    const p = c.p, mine = role();
    if (!c.role) return link(p) + ": " + p.what;
    if (c.role === mine) return "It's in your workspace: " + link(p) + ". " + p.what;
    if (c.role === "advisor") return p.label + " is used by Aegis Ascend advisors" + (mine === "founder" ? "; your advisor prepares your report with it and shares the finished version with you." : ". To have it used for your company, [talk to an advisor](#contact).");
    const r = SM.roles[c.role];
    const who = "the " + ROLE_NAME[c.role] + " workspace";
    if (mine) return p.label + " is in " + who + ", and you're signed in as " + an(mine) + ". It opens with " + an(c.role) + " account.";
    return p.label + " is in " + who + ": " + p.what + " [Sign in](#login) as " + an(c.role) + " to open it (demo: " + r.demo + ", password demo1234), or [create an account](#signup).";
  }
  function onThisPage() {
    const cur = here(), mine = role();
    const p = (mine && SM.roles[mine].pages.find((x) => x.route === cur)) || SM.public.find((x) => x.route === cur);
    if (!p) return tour();
    const list = mine ? SM.roles[mine].pages : SM.public;
    const next = list[(list.indexOf(p) + 1) % list.length];
    return "You're on " + p.label + ". " + p.what + " A good next stop: " + link(next) + ".";
  }
  function tour() {
    const mine = role();
    const pick = mine ? SM.roles[mine].pages.slice(0, 6) : ["home", "services", "pricing", "investors", "lenders", "contact"].map((r) => SM.public.find((p) => p.route === r)).filter(Boolean);
    return (mine ? "Your " + mine + " workspace, in the menu on the left (tabs at the top on phones):" : "Here's the quickest way around the site:") + "\n" +
      pick.map((p) => "- " + link(p) + ": " + p.what).join("\n") + (mine ? "" : "\nWhen you're ready, [sign in](#login) to see your workspace.");
  }

  function quickAnswer(q) {
    const t = norm(q);
    if (/^\s*(hi|hello|hey|namaste)\s*$/.test(t)) return GREET;
    if (/\b(show me around|tour|guide me|where (do|should) i start|what can i do on this site|help me navigate|site map|sitemap|menu)\b/.test(t)) return tour();
    if (/\b(this page|here|what is this|where am i)\b/.test(t) && /\b(what|where|do)\b/.test(t)) return onThisPage();
    const page = findPage(t);
    if (page && NAV.test(t)) return directions(page);
    let best = null, top = 0;
    QA.forEach(([words, a]) => { const score = hits(t, words); if (score > top) { top = score; best = a; } });
    if (best) return best;
    return page ? directions(page) : UNKNOWN;
  }
  function chips() {
    const mine = role();
    const extra = {
      founder: ["Where do I upload documents?", "Where is my cap table?"],
      investor: ["How do I sell my shares?", "Where are new offers?"],
      lender: ["Where are new applications?", "Where do I see overdue loans?"],
      advisor: ["Where do I share an offer?", "Where are reports to review?"],
    };
    return mine ? ["What can I do on this page?", "Show me around"].concat(extra[mine])
      : ["Show me around", "What do you do?", "Where are your fees?", "How do I sign in?", "How does a raise work?"];
  }
  // answers may carry [label](#route) links; everything else is escaped text
  const render = (s) => esc(s).replace(/\[([^\]]+)\]\((#[a-z0-9/_-]*)\)/gi, '<a href="$2">$1</a>');

  // ---------- state ----------
  let msgs = [], online = !!root.GB_CHAT_URL, busy = false, el = null;
  function load() { try { msgs = JSON.parse(sessionStorage.getItem(KEY) || "[]"); } catch (e) { msgs = []; } if (!Array.isArray(msgs)) msgs = []; }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-30))); } catch (e) { /* private mode */ } }

  async function ask(q) {
    if (!online) return quickAnswer(q);
    try {
      const res = await fetch(root.GB_CHAT_URL, { method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Requested-With": "glassbox" },
        body: JSON.stringify({ page: here(), messages: msgs.filter((m) => !m.local).map((m) => ({ role: m.role, content: m.text })) }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.reply) return data.reply;
      if (data.offline) { online = false; note("The live assistant is offline, so I'm answering from our quick answers."); return quickAnswer(q); }
      return data.error || "Something went wrong. Please try again, or use the [Contact](#contact) page.";
    } catch (e) {
      return "I couldn't reach the server. Please check your connection, or use the [Contact](#contact) page.";
    }
  }

  // ---------- view ----------
  function mount() {
    if (el || !document.body) return;
    load();
    el = document.createElement("div");
    el.className = "cb";
    el.innerHTML =
      '<button class="cb-open" type="button" aria-expanded="false" aria-controls="cb-panel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/></svg><span>Ask Aegis</span></button>' +
      '<section class="cb-panel" id="cb-panel" role="dialog" aria-modal="false" aria-labelledby="cb-title" hidden>' +
      '<header><svg class="mark" width="28" height="27" aria-hidden="true"><use href="#emblem"/></svg><div><h2 id="cb-title">Aegis assistant</h2>' +
      '<p>' + (online ? "General information" : "Quick answers") + ' · not financial advice</p></div>' +
      '<button class="cb-close" type="button" aria-label="Close the assistant">×</button></header>' +
      '<div class="cb-log" aria-live="polite"></div>' +
      '<div class="cb-chips"></div>' +
      '<form class="cb-form"><label class="sr-only" for="cb-q">Your question</label><textarea id="cb-q" rows="1" maxlength="800" placeholder="Ask a question or find a page"></textarea>' +
      '<button class="btn primary" type="submit">Send</button></form></section>';
    document.body.appendChild(el);
    const open = el.querySelector(".cb-open"), panel = el.querySelector(".cb-panel"), q = el.querySelector("#cb-q");
    const show = (on) => {
      panel.hidden = !on; open.setAttribute("aria-expanded", String(on)); el.classList.toggle("on", on);
      if (on) { draw(); setTimeout(() => q.focus(), 30); } else open.focus();
    };
    open.addEventListener("click", () => show(panel.hidden));
    el.querySelector(".cb-close").addEventListener("click", () => show(false));
    panel.addEventListener("keydown", (e) => { if (e.key === "Escape") show(false); });
    el.querySelector(".cb-chips").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) send(b.textContent); });
    el.querySelector(".cb-form").addEventListener("submit", (e) => { e.preventDefault(); send(q.value); });
    q.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(q.value); } });
    q.addEventListener("input", () => { q.style.height = "auto"; q.style.height = Math.min(q.scrollHeight, 120) + "px"; });
    // following a link inside an answer closes the panel on phones, where it covers the page
    panel.addEventListener("click", (e) => { if (e.target.closest(".cb-log a") && innerWidth < 640) show(false); });
  }
  function note(text) { msgs.push({ role: "assistant", text, local: true }); }
  function draw() {
    const log = el.querySelector(".cb-log");
    log.innerHTML = '<p class="cb-msg bot">' + render(GREET) + "</p>" +
      msgs.map((m) => '<p class="cb-msg ' + (m.role === "user" ? "me" : "bot") + (m.local ? " note" : "") + '">' + (m.role === "user" ? esc(m.text) : render(m.text)) + "</p>").join("") +
      (busy ? '<p class="cb-msg bot typing" aria-label="The assistant is typing"><i></i><i></i><i></i></p>' : "");
    el.querySelector(".cb-chips").innerHTML = msgs.length ? "" : chips().map((c) => '<button type="button">' + esc(c) + "</button>").join("");
    log.scrollTop = log.scrollHeight;
  }
  async function send(text) {
    const t = String(text || "").trim().slice(0, 800);
    if (!t || busy) return;
    const q = el.querySelector("#cb-q"); q.value = ""; q.style.height = "auto";
    msgs.push({ role: "user", text: t }); busy = true; draw();
    const reply = await ask(t);
    msgs.push({ role: "assistant", text: reply }); busy = false; save(); draw();
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
  }
  root.CHAT = { quickAnswer, findPage: (q) => findPage(norm(q)) };
})(typeof window !== "undefined" ? window : globalThis);
