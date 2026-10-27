/* Public website for Aegis Ascend Financial Advisors. Content from the investor pitch (v2.0, October 2026)
   and the firm's brand statement. */
(function (root) {
  "use strict";
  const { esc, n, cr, lakh, pct, xx, gx, vbars } = root.UI;
  const ASSETS = root.GB_ASSETS || "assets/";
  const FIRM = "Aegis Ascend Financial Advisors";

  const NAV = [["services", "Services"], ["investors", "For investors"], ["lenders", "For lenders"], ["pricing", "Pricing"], ["trust", "Trust & compliance"], ["about", "About"]];
  const mark = (size = 34) => '<svg class="mark" width="' + size + '" height="' + Math.round(size * 0.95) + '" aria-hidden="true"><use href="#emblem"/></svg>';
  const wordmark = (href = "#home") => '<a href="' + href + '" class="wordmark" aria-label="' + FIRM + ', home">' + mark(36) +
    '<span class="wm-text"><b>AEGIS <span>ASCEND</span></b><small>FINANCIAL ADVISORS</small></span></a>';

  function header(active, user) {
    return '<header class="pub-head"><div class="container pub-head-in">' + wordmark() +
      '<nav class="pub-nav" aria-label="Main">' + NAV.map(([k, l]) => '<a href="#' + k + '"' + (active === k ? ' aria-current="page"' : "") + ">" + l + "</a>").join("") + "</nav>" +
      '<div class="pub-cta">' + (user ? '<a class="btn primary" href="#app">Open your workspace</a>' : '<a class="btn ghost" href="#login">Sign in</a><a class="btn primary" href="#contact">Book an engagement</a>') + "</div>" +
      '<button class="btn ghost menu-btn" type="button" data-act="toggle-menu" aria-expanded="false">Menu</button>' +
      "</div></header>";
  }
  function footer() {
    return '<footer class="pub-foot"><div class="container"><div class="foot-grid">' +
      "<div>" + wordmark() + '<p>Smarter Decisions. Stronger Futures. Independent funding advice for growing Indian businesses, from Mumbai.</p></div>' +
      '<div><h4>SERVICES</h4><a href="#services">Debt vs equity advisory</a><a href="#services-equity">Equity raise and early exit</a><a href="#services-debt">Debt arranging</a></div>' +
      '<div><h4>FIRM</h4><a href="#about">About and founders</a><a href="#trust">Trust & compliance</a><a href="#pricing">Pricing</a><a href="#contact">Contact</a></div>' +
      '<div><h4>WORKSPACE</h4><a href="#login">Sign in</a><a href="#signup">Create an account</a></div>' +
      '</div><p class="fine">This website describes planned services and structures. Figures are illustrative estimates, not guarantees. Structures, fees and agreements are subject to review by qualified legal and tax advisers before launch. © 2026 ' + FIRM + '.</p></div></footer>';
  }
  const page = (active, user, body) => '<div class="pub">' + header(active, user) + "<main>" + body + "</main>" + footer() + "</div>";
  const pageHead = (title, lede) => "<header><h1>" + title + "</h1>" + (lede ? '<p class="lede-s">' + lede + "</p>" : "") + "</header>";

  // ---------- home ----------
  function decisionStrip() {
    const t = root.GB.twin({}), b = t.best;
    const diff = (b.value - t.equity.value) / Math.pow(1 + t.q.discount_rate, t.q.horizon);
    return '<div class="decision" aria-label="Live example on a sample company">' +
      '<div class="decision-top"><p>Kalyan Polymers needs <b>Rs 12 crore</b>. Debt, equity or a mix?</p><span class="sample">Sample company · live model</span></div>' +
      '<div class="split" role="img" aria-label="Recommended: ' + pct(b.share) + ' debt, ' + pct(1 - b.share) + ' equity"><i class="d" data-to="' + b.share * 100 + '" style="flex-basis:50%"></i><i class="e" data-to="' + (1 - b.share) * 100 + '" style="flex-basis:50%"></i></div>' +
      '<div class="split-legend"><span><i style="background:#5C88C4"></i>Debt <b>' + gx(pct(b.share), { title: "Best mix: debt share", formula: "Test debt share 0% to 100% in 5% steps.\nKeep mixes with DSCR >= " + t.q.dscr_min + " (expected) and >= 1.00 (sales -20%, rate +2 points).\nPick the one with the highest founder value.", inputs: [["Raise", cr(t.q.raise), "founder"], ["Pre-money value", cr(t.q.pre_money), "founder"], ["Loan rate", pct(t.q.loan_rate, 1), "benchmark"], ["Minimum DSCR", t.q.dscr_min.toFixed(2), "advisor"], ["DSCR at this mix", xx(b.dscr), "engine"], ["Stress DSCR at this mix", xx(b.dscr_stress), "engine"]] }) +
      '</b></span><span><i style="background:var(--gold)"></i>Equity <b>' + pct(1 - b.share) + "</b></span></div>" +
      '<div class="decision-stats"><div><small>Founder better off than all-equity</small><b>' + gx(cr(diff), { title: "Net effect vs all-equity, in today's money", formula: "(Founder value with best mix - founder value with all equity) / (1 + discount rate)^years", inputs: [["Founder value, best mix (year " + t.q.horizon + ")", cr(b.value), "engine"], ["Founder value, all equity (year " + t.q.horizon + ")", cr(t.equity.value), "engine"], ["Discount rate", pct(t.q.discount_rate), "advisor"], ["Years", t.q.horizon, "founder"]] }) + "</b></div>" +
      "<div><small>Lowest repayment safety (DSCR)</small><b>" + gx(xx(b.dscr), { title: "Lowest DSCR at the recommended mix", formula: "DSCR = cash available for debt service / (interest + principal)\nCash available = EBITDA - tax", inputs: [["EBITDA today", cr(t.q.ebitda0), "founder"], ["EBITDA growth", pct(t.q.ebitda_growth), "benchmark"], ["Existing debt service", cr(t.q.existing_ds) + " a year", "founder"], ["Loan", cr(b.loan), "engine"]] }) + "</b></div>" +
      '<div><small>Signed off before it is shared</small><b><span class="stamp">Reviewed</span></b></div></div>' +
      '<p class="hint">Click any underlined number to see its formula, inputs and where each input came from.</p></div>';
  }
  const PILLARS = [
    ["Debt vs equity specialists", "The capital-structure decision is our core product, not a side feature."],
    ["Every number explained", "Click any figure to see its formula, its inputs, where each came from and the engine version."],
    ["Curated deals", "Investors see only companies that pass our engine and an advisor's review."],
    ["Advisor accountability", "Every report carries a visible \"Reviewed by\" stamp from a named advisor."],
    ["Independence", "We sell no loan and run no fund, so our advice has no product to push."],
    ["Founder-owned data", "Nothing reaches an investor without the founder's permission, and every share is logged."],
  ];
  const METHOD = [
    ["Upload", "Accounts, GST returns and CMA data."], ["Read", "Figures extracted into a strict format."], ["Confirm", "The founder checks every extracted figure."],
    ["Validate", "Balances, totals and sudden jumps checked."], ["Calculate", "Code computes every number. No AI does maths."], ["Stress", "Best, expected, worst; sales -20%, rates +2 points."],
    ["Verify", "Every number in the summary matched to the engine."], ["Sign off", "A named advisor reviews and stamps the report."],
  ];
  const FEATURES = [
    ["Funding Twin", "A live copy of the company's finances. Change an assumption and every chart updates.", "app-twin"],
    ["Net Effect Bridge", "What the founder's share is worth with debt, with equity and with a mix, in rupees.", "app-twin"],
    ["Break-even Value", "Above this company value, debt wins. Below it, equity wins.", "app-twin"],
    ["Stress Slider", "Drag sales down or interest up and watch repayment safety change.", "app-twin"],
    ["Equity vs Debt Optimizer", "Every mix from 0% to 100% equity, year by year, and the one that leaves the founder richest.", "app-optimizer"],
    ["CMA funding report", "A one-page, DSCR-sized funding recommendation from the bank's CMA workbook.", "app-cma"],
    ["Investor Fit Score", "Each suggested investor scored on sector, stage, ticket size and past deals, with reasons.", "app-investors"],
  ];
  const FOUNDERS = [["Hem Parekh", "hem"], ["Yash Sharma", "yash"], ["Vivan Shah", "vivan"]];

  function anatomy() {
    // The mark, annotated with the meanings the firm gives it.
    return '<svg class="anatomy" viewBox="0 0 690 500" role="img" aria-label="The Aegis Ascend emblem: a diamond above a geometric frame">' +
      '<g transform="translate(40 20)"><g fill="none" class="ln" stroke-linejoin="miter" stroke-miterlimit="12">' +
      '<path pathLength="1" d="M80 412 L246 136 L246 440" clip-path="url(#emclipL)"/><path pathLength="1" d="M466 412 L300 136 L300 440" clip-path="url(#emclipR)"/>' +
      '<path pathLength="1" d="M172 404 L273 289 L374 404" clip-path="url(#emclipC)"/></g>' +
      '<polygon class="dia" points="273,62 302,91 273,120 244,91" fill="url(#goldv2)"/></g>' +
      '<path class="lead" pathLength="1" d="M352 111 L440 111 L456 84"/><circle class="dot" cx="352" cy="111" r="3.5"/>' +
      '<text x="460" y="60"><tspan class="k">DIAMOND</tspan><tspan x="460" dy="26">Clarity of vision,</tspan><tspan x="460" dy="24">sound judgment</tspan></text>' +
      '<path class="lead" pathLength="1" d="M410 272 L470 272 L490 248"/><circle class="dot" cx="410" cy="272" r="3.5"/>' +
      '<text x="494" y="226"><tspan class="k">THE FRAME</tspan><tspan x="494" dy="26">Structure, strategy,</tspan><tspan x="494" dy="24">upward ambition</tspan></text>' +
      "</svg>";
  }

  // The emblem as three layers: the left A, the right A (each with its half of the
  // shared crossbar) and the diamond, so the intro can pull the A's apart.
  function introMark() {
    const vb = 'viewBox="62 52 420 400" aria-hidden="true"', g = '<g fill="none" stroke="url(#goldv2)" stroke-width="17" stroke-linejoin="miter" stroke-miterlimit="12">';
    return '<div class="intro-mark">' +
      '<svg class="ia ia-l" ' + vb + ">" + g + '<path pathLength="1" d="M80 412 L246 136 L246 440" clip-path="url(#emclipL)"/><path pathLength="1" d="M172 404 L273 289 L300 320" clip-path="url(#emclipCL)"/></g></svg>' +
      '<svg class="ia ia-r" ' + vb + ">" + g + '<path pathLength="1" d="M466 412 L300 136 L300 440" clip-path="url(#emclipR)"/><path pathLength="1" d="M374 404 L273 289 L246 320" clip-path="url(#emclipCR)"/></g></svg>' +
      '<svg class="ia ia-d" ' + vb + '><polygon class="dia" points="273,62 302,91 273,120 244,91" fill="url(#goldv2)"/></svg></div>';
  }

  function home(user) {
    return page("home", user,
      '<section class="intro" id="ascent"><div class="intro-stage"><div class="intro-sky" aria-hidden="true"></div>' + introMark() +
      '<div class="intro-word" aria-hidden="true"><p class="iw-name">AEGIS <span>ASCEND</span></p><p class="iw-sub">Financial Advisors</p><span class="intro-cue">Scroll</span></div>' +
      '<div class="intro-copy">' +
      "<h1>Smarter Decisions.<br><em>Stronger Futures.</em></h1>" +
      '<p class="lede">Independent advice on debt, equity or the right mix for growing Indian businesses. Every number traced, checked and signed off before it reaches you, then we deliver the deal.</p>' +
      '<div class="ctas"><a class="btn primary lg" href="#contact">Book an engagement</a><a class="btn ghost lg" href="#login">Try the live model</a></div>' +
      "</div></div></section>" +
      '<section class="strip-sec"><div class="container">' + decisionStrip() + "</div></section>" +
      '<section class="sec tone"><div class="container promises">' +
      '<div class="rule-top"><h3>FOR FOUNDERS</h3><p>A clear, evidence-backed answer on debt versus equity, with the risks shown honestly, before you give away a single share or sign a single loan.</p></div>' +
      '<div class="rule-top"><h3>FOR INVESTORS</h3><p>We only bring you the best deals. Every company has passed our validation checks, our calculation engine and an advisor\'s sign-off.</p></div>' +
      '<div class="rule-top"><h3>OUR ROLE</h3><p>We are the advisor, independent of any lender, fund or exchange. The recommendation is driven only by what is right for the company and the investor.</p></div>' +
      "</div></section>" +
      '<section class="sec" id="meaning"><div class="container meaning">' + anatomy() +
      '<div><div class="sec-head"><h2>Protection, then ascent</h2><p>Our identity says what we do: protect a business\'s interests while creating pathways to sustainable growth.</p></div>' +
      '<dl class="meaning-list">' +
      '<div><dt>AEGIS</dt><dd><p>Protection and trusted guidance.</p></dd></div>' +
      '<div><dt>ASCEND</dt><dd><p>Progress and the pursuit of greater potential.</p></dd></div>' +
      '<div><dt>THE EMBLEM</dt><dd><p>Structure, strategic thinking and upward ambition. The diamond at its peak stands for clarity of vision and sound financial judgment.</p></dd></div>' +
      '</dl>' +
      '<p class="muted" style="margin-top:22px;max-width:60ch">Our philosophy is simple: Smarter Decisions. Stronger Futures. Guided by it, we help businesses navigate financial choices, evaluate capital-raising options, and build a stronger foundation for the future.</p>' +
      "</div></div></section>" +
      '<section class="sec tone"><div class="container"><div class="sec-head"><h2>What we stand for</h2></div><div class="ledger">' +
      PILLARS.map(([t, d]) => '<div><span class="dia-mark" aria-hidden="true"></span><div><h3>' + t + "</h3><p>" + d + "</p></div></div>").join("") + "</div></div></section>" +
      '<section class="sec"><div class="container"><div class="sec-head"><h2>How every report is made</h2><p>Eight steps, in this order, for every analysis. Nothing skips the checks.</p></div>' +
      '<ol class="method">' + METHOD.map(([t, d]) => "<li><b>" + t + "</b><span>" + d + "</span></li>").join("") + "</ol>" +
      '<div class="golden"><h3>The golden rule</h3><p>The AI never does the maths. Calculation code produces every number. The AI reads documents, suggests assumptions and explains results in plain words, and every number it writes is checked against the code\'s output before a report is released.</p></div></div></section>' +
      '<section class="sec tone"><div class="container"><div class="sec-head"><h2>Tools behind the advice</h2><p>Founders and advisors work in the same tools, so every recommendation can be reproduced.</p></div><div class="index">' +
      FEATURES.map(([t, d, r]) => '<a href="#' + r + '"><b>' + t + "</b><span>" + d + "</span><em>Open in the workspace</em></a>").join("") + "</div></div></section>" +
      '<section class="sec" id="founders"><div class="container"><div class="sec-head"><h2>The founders</h2><p>Aegis Ascend was founded by three partners who sign their names to the advice.</p></div><div class="founders">' +
      FOUNDERS.map(([nm, f]) => '<figure class="founder"><div class="frame"><img src="' + ASSETS + "founder-" + f + '.jpg" alt="Portrait of ' + nm + '" width="480" height="600" decoding="async"></div><figcaption><b>' + nm + "</b><span>Co-founder</span></figcaption></figure>").join("") + "</div></div></section>" +
      '<section class="sec sky"><div class="container close"><h2>Should you raise debt, equity or a mix?</h2><p>Advisory engagements start from Rs 1 lakh plus GST, scaled by company size and complexity.</p><a class="btn primary lg" href="#contact">Talk to an advisor</a></div></section>');
  }

  // ---------- the intro: the emblem opens as the page scrolls ----------
  // The stage is pinned while the section scrolls past. Over the first part the two
  // A's slide apart to the edges, the diamond rises to crown the headline, the
  // wordmark fades, and the headline, lede and buttons come forward between the A's.
  let played = false, M = null, ticking = false;
  const clamp = (v) => Math.max(0, Math.min(1, v)), ease = (t) => 1 - Math.pow(1 - t, 3);
  function measure() {
    const sec = document.getElementById("ascent"); if (!sec) return (M = null);
    const st = sec.querySelector(".intro-stage"), mark = sec.querySelector(".intro-mark"), d = sec.querySelector(".ia-d"), copy = sec.querySelector(".intro-copy");
    [d, copy].forEach((el) => (el.style.transform = ""));
    const vw = st.clientWidth, mr = mark.getBoundingClientRect(), cr = copy.getBoundingClientRect();
    const narrow = vw < 760, s1 = narrow ? 1.05 : 1.15, mw = mr.width;
    // Each A covers roughly half the mark. Move it until its outer edge sits near the viewport edge;
    // on narrow screens it goes partly off-canvas and dims behind the text instead.
    const dx = narrow ? vw * 0.36 : Math.max(vw / 2 - 28 - (s1 * mw) / 2 + mw * 0.04, 0);
    const dTop = mr.top + mr.height * (39 / 400), dy = cr.top - 30 - dTop;
    const sky = sec.querySelector(".intro-sky"), tpl = document.getElementById("tpl-skyline");
    if (sky && tpl && !sky.firstChild) sky.appendChild(tpl.content.cloneNode(true));
    M = { st, sky, sec, mark, l: sec.querySelector(".ia-l"), r: sec.querySelector(".ia-r"), d, copy, kids: [...copy.children], word: sec.querySelector(".intro-word"), dx, dy, s1, narrow };
  }
  function update(force) {
    if (!M || !M.sec.isConnected) return;
    const r = M.sec.getBoundingClientRect(), run = r.height - innerHeight;
    const p = force != null ? force : clamp(-r.top / (run * 0.8 || 1));
    const a = ease(clamp(p / 0.6)), w = clamp(p / 0.22);
    const op = M.narrow ? 1 - 0.78 * a : 1;
    M.l.style.transform = "translate3d(" + (-M.dx * a).toFixed(1) + "px," + (-12 * a).toFixed(1) + "px,0) scale(" + (1 + (M.s1 - 1) * a).toFixed(3) + ")";
    M.r.style.transform = "translate3d(" + (M.dx * a).toFixed(1) + "px," + (-12 * a).toFixed(1) + "px,0) scale(" + (1 + (M.s1 - 1) * a).toFixed(3) + ")";
    M.l.style.opacity = M.r.style.opacity = op.toFixed(3);
    M.d.style.transform = "translate3d(0," + (M.dy * a).toFixed(1) + "px,0) scale(" + (1 - 0.55 * a).toFixed(3) + ")";
    M.word.style.opacity = (1 - w).toFixed(3);
    M.word.style.transform = "translateY(" + (-28 * w).toFixed(1) + "px)";
    M.kids.forEach((k, i) => {
      const c = ease(clamp((p - 0.26 - i * 0.07) / 0.36));
      k.style.opacity = c.toFixed(3);
      k.style.transform = "translateY(" + (48 * (1 - c)).toFixed(1) + "px) scale(" + (0.86 + 0.14 * c).toFixed(3) + ")";
      k.style.filter = c < 1 ? "blur(" + (6 * (1 - c)).toFixed(2) + "px)" : "";
    });
    M.copy.classList.toggle("live", p > 0.55);
    M.st.style.setProperty("--lit", (0.25 + 0.75 * a).toFixed(3));
    M.st.style.setProperty("--sky-y", (22 * (1 - a)).toFixed(2) + "%");
    M.copy.style.setProperty("--plate", ease(clamp((p - 0.2) / 0.3)).toFixed(3));
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; update(); }); } }
  function mountHome() {
    const sec = document.getElementById("ascent"); if (!sec) return;
    const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    sec.classList.toggle("still", !!reduce);
    if (!played && !reduce) sec.classList.add("play");
    played = true;
    measure(); update(reduce ? 1 : null);
    reveal(reduce);
  }
  window.addEventListener("scroll", () => { if (M && !M.sec.classList.contains("still")) onScroll(); }, { passive: true });
  // Below the hero, sections arrive as they scroll in: a short staggered rise, the
  // emblem drawn line by line, founders' portraits uncovered from the bottom.
  const RV = [".decision", ".sec-head", ".promises>div", "#meaning .anatomy", ".meaning-list>div", "#meaning .muted", ".ledger>div", ".method", ".method li", ".golden", ".index a", ".founder", ".close>*"];
  let io;
  function reveal(reduce) {
    const main = document.getElementById("ascent"); if (!main) return;
    if (io) io.disconnect();
    if (reduce || !("IntersectionObserver" in window)) { fillSplit(false); return; }
    document.documentElement.classList.add("mo");
    io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("shown"); if (e.target.classList.contains("decision")) setTimeout(() => fillSplit(true), 350); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    RV.forEach((sel) => {
      const seen = new Map();
      document.querySelectorAll(sel).forEach((el) => {
        const k = el.parentElement, i = seen.get(k) || 0; seen.set(k, i + 1);
        el.classList.add("rv"); el.style.setProperty("--i", Math.min(i, 7)); io.observe(el);
      });
    });
  }
  function fillSplit(anim) {
    document.querySelectorAll(".decision .split i").forEach((i) => { if (!anim) i.style.transition = "none"; i.style.flexBasis = i.dataset.to + "%"; });
  }
  let rz;
  window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { if (document.getElementById("ascent")) { measure(); update(document.getElementById("ascent").classList.contains("still") ? 1 : null); } }, 120); });

  // ---------- shared bits ----------
  function table(head, rows) {
    return '<div class="tw"><table class="tbl"><thead><tr>' + head.map((h) => "<th>" + h + "</th>").join("") + "</tr></thead><tbody>" + rows.map((r) => "<tr>" + r.map((c, i) => "<td" + (i ? "" : ' class="strong"') + ">" + c + "</td>").join("") + "</tr>").join("") + "</tbody></table></div>";
  }
  function field(id, label, val, sfx, attrs) {
    return '<label class="fld" for="f_' + id + '"><span>' + esc(label) + '</span><span class="in"><input id="f_' + id + '" name="' + id + '" value="' + esc(val) + '" inputmode="decimal" autocomplete="off"' + (attrs || "") + ">" + (sfx ? "<em>" + esc(sfx) + "</em>" : "") + "</span></label>";
  }

  function services(user) {
    return page("services", user, '<div class="container page">' +
      pageHead("One relationship, from decision to deal", "We start with the debt vs equity answer, arrange whichever route it recommends, and stay with the company for five years.") +
      '<section class="card-sec"><h2>Debt vs equity advisory</h2><p>Data intake and validation, the full debt vs equity analysis with ranges and stress tests, an advisor-reviewed report with the "Reviewed by" stamp, and a review meeting with the founder. From Rs 1 lakh.</p>' +
      '<ul class="ticks"><li>Funding Twin: a live model of the company you can change and re-run</li><li>Equity vs Debt Optimizer: every mix from 0% to 100% equity, year by year</li><li>CMA funding report: a one-page, DSCR-sized recommendation for lenders</li><li>Net Effect Bridge and Break-even Value</li><li>Funding Readiness Score with a fix-it plan</li></ul></section>' +
      '<section class="card-sec" id="services-equity"><h2>Equity raise and early exit</h2><p>Each equity deal closes with <b>at most 3 investors</b>, each holding shares directly in their own name. After a <b>6-month minimum holding</b>, or earlier with the founder\'s consent, investors can exit through a private sale that we advise on, at the new valuation.</p>' +
      table(["Element", "How it works"], [["Investors per deal", "Maximum 3, hand-picked for fit"], ["How investors hold", "Shares in the company in their own name, in demat"], ["Company type", "Private limited company"], ["Agreements", "Share Subscription Agreement (SSA) and Shareholders' Agreement (SHA); optional co-investment agreement"], ["Minimum holding", "6 months, written into the SHA"], ["Earlier exit", "With founder consent, to any buyer"], ["Resale price", "At the new valuation; the investor keeps the gain or bears the loss"], ["Our fees", "Paid by the company: 2.5% cash success fee and 0.4% revenue share for 5 years"]]) +
      '<div class="two-col"><div><h3>How a raise closes</h3><ol class="steps">' + ["Company signs our engagement letter (advisory fee from Rs 1 lakh).", "We deliver the advisor-reviewed debt vs equity report.", "We introduce curated investors from our panel; the founder approves every introduction.", "Term sheet agreed with up to 3 investors.", "A registered valuer prepares the valuation report and shareholders pass a special resolution.", "SSA and SHA are signed; investors pay into a separate bank account opened for the issue.", "The company allots shares within 60 days of receiving the money and files PAS-3 within 15 days of allotment.", "Shares are credited to each investor's demat account; our success fee is invoiced and the revenue share begins."].map((s) => "<li>" + s + "</li>").join("") + "</ol></div>" +
      '<div><h3>How an early exit works</h3><ol class="steps">' + ["<b>Notice:</b> the investor tells the company and us they want to sell, after 6 months or earlier with written founder consent.", "<b>First refusal:</b> the company's nominees and existing shareholders get first right to buy, within a period fixed in the SHA.", "<b>Buyer introduction:</b> we privately introduce suitable buyers; the seller may also bring their own.", "<b>Fresh valuation:</b> a registered valuer sets fair market value for the transfer.", "<b>Share Purchase Agreement:</b> buyer and seller sign a separately negotiated SPA.", "<b>Board approval and transfer:</b> shares move through the depository and stamp duty is paid.", "<b>Non-resident buyer:</b> FEMA pricing rules apply and form FC-TRS is filed within 60 days."].map((s) => "<li>" + s + "</li>").join("") + "</ol></div></div>" +
      '<p class="note">Private by design. Every resale is a negotiated, one-to-one transaction. We do not list shares publicly, display prices or run bidding.</p></section>' +
      '<section class="card-sec" id="services-debt"><h2>Debt: arrange, monitor, transfer</h2><p>We arrange loans from banks and NBFCs, monitor them after disbursal, and help lenders transfer loans to other regulated lenders. <b>Lenders pay all our debt fees</b>, so the borrower\'s cost of capital stays clean.</p>' +
      table(["Element", "How it works"], [["Our role", "Arranger and monitoring partner"], ["Lenders", "Banks and NBFCs"], ["Loan buyers", "Other regulated lenders: banks, NBFCs and ARCs"], ["Arranging", "Commission agreed with each lender, paid at disbursal"], ["Monitoring fee", "0.25-0.5% a year on the outstanding loan, paid by the lender until repaid"], ["Transfer fee", "0.3-0.5% of the loan amount transferred, paid by the lender(s)"]]) +
      '<div class="two-col"><div><h3>Arranging a loan</h3><ol class="steps">' + ["The debt vs equity report recommends debt or a mix.", "The Readiness Score and eligibility check confirm what lenders are likely to offer.", "The CMA funding report is generated from validated numbers.", "We submit to partner lenders under DSA or service-provider agreements.", "The founder compares sanction letters in the Term Sheet Analyser.", "The loan is disbursed, the lender pays our commission, and monitoring begins."].map((s) => "<li>" + s + "</li>").join("") + "</ol></div>" +
      '<div><h3>Monitoring</h3><ul class="ticks"><li>Quarterly accounts feed the engine, which recalculates DSCR and covenant headroom.</li><li>Early-warning alerts reach founder and lender before a breach.</li><li>Lenders receive a standardised quarterly report with every figure traceable.</li><li>The monitoring history becomes a ready-made diligence pack if the loan is later transferred.</li></ul></div></div></section>' +
      "</div>");
  }

  function feeCalc(v) {
    const f = root.GB.dealFees(v);
    return '<div class="calc-out"><div class="kpis k3"><div class="kpi"><small>Advisory fee</small><b>' + lakh(f.advisory) + '</b></div><div class="kpi"><small>Success fee (2.5%)</small><b>' + gx(lakh(f.success), { title: "Equity success fee", formula: "Amount raised x 2.5%", inputs: [["Amount raised", cr(f.a.raise), "founder"], ["Rate", "2.5%", "fee schedule"]] }) +
      '</b></div><div class="kpi"><small>Revenue share, 5 years</small><b>' + gx(lakh(f.share), { title: "Revenue share over 5 years", formula: "Sum over 5 years of net revenue x 0.4%", inputs: f.years.map((y) => ["Year " + y.year + " revenue", cr(y.revenue), "founder"]) }) + "</b></div></div>" +
      vbars(["Advisory", "Success fee"].concat(f.years.map((y) => "Rev. share Y" + y.year)), [f.advisory, f.success].concat(f.years.map((y) => y.fee_lakh)), ["var(--s-debt)", "var(--s-equity)"].concat(f.years.map(() => "var(--s-mix)")), { fmt: (x) => n(x, 1), label: "Fees by type, Rs lakh", height: 210 }) +
      '<p class="total">Total about <b>' + lakh(f.total) + "</b> (" + cr(f.total / 100, 2) + ") over 5 years, plus 18% GST of " + lakh(f.gst) + ". Debt fees are paid by lenders and come on top.</p></div>";
  }
  function pricing(user) {
    return page("pricing", user, '<div class="container page">' +
      pageHead("Three fees, one five-year relationship", "We earn from the company we advise at three points: an advisory fee from Rs 1 lakh, a 2.5% cash success fee when money is raised, and a 0.4% revenue share for 5 years. Lenders pay our debt fees.") +
      '<section class="card-sec"><h2>Fee schedule</h2>' + table(["Fee", "Amount", "Paid by", "When"], [["Advisory engagement", "From Rs 1 lakh, scaled by size", "Company", "At engagement"], ["Equity success fee", "2.5% of amount raised (minimum fee applies)", "Company", "At deal close"], ["Revenue share", "0.4% of net revenue for 5 years", "Company", "Quarterly"], ["Investor diligence", "Flat fee (optional)", "Investor", "Before investing"], ["Resale advisory", "Agreed per transaction", "Selling investor", "At transfer"], ["Debt arranging", "Commission per lender agreement", "Lender", "At disbursal"], ["Debt monitoring", "0.25-0.5% a year on outstanding loan", "Lender", "Yearly"], ["Debt transfer", "0.3-0.5% of amount transferred", "Lender(s)", "At transfer"]]) +
      '<p class="muted small">All fees are plus 18% GST. Clients deduct TDS on professional fees, which we claim back.</p></section>' +
      '<section class="card-sec"><h2>What one deal is worth</h2><form class="calc" data-calc="fees"><div class="fields f4">' +
      field("raise", "Equity raised", 10, "Rs cr") + field("revenue", "Company revenue", 50, "Rs cr") + field("revenue_growth", "Revenue growth a year", 0, "%") + field("advisory_lakh", "Advisory fee", 1, "Rs lakh") +
      '</div></form><div id="calc-fees">' + feeCalc({}) + "</div></section>" +
      '<section class="card-sec"><h2>Revenue share terms</h2>' + table(["Term", "What it says"], [["Rate and period", "0.4% of revenue for 5 years from deal close"], ["Revenue definition", "Net revenue from operations per audited accounts, excluding GST, returns and discounts; includes subsidiaries and related companies"], ["Payment", "Quarterly within 30 days of quarter end, adjusted after the annual audit; interest on late payment"], ["Information rights", "Quarterly revenue statements; one CA review a year, paid by the company if underpayment exceeds 5%"], ["Buyout", "On acquisition, IPO or a major round, the company may settle the remaining term for a set amount based on the last 12 months' revenue"], ["Bundled services", "Yearly funding-health review, DSCR and covenant monitoring, priority support for the next raise"], ["Disclosure", "Investors receive the agreement before they invest"]]) + "</section></div>");
  }

  function exitCalc(v) {
    const t = root.GB.exitTax(v);
    return '<div class="kpis k3"><div class="kpi"><small>Gain</small><b>' + cr(t.gain, 2) + '</b></div><div class="kpi"><small>' + (t.long_term ? "Long-term gain at 12.5%" : "Short-term gain at slab rate") + "</small><b>" + gx(cr(t.tax, 2), { title: "Tax on the gain", formula: t.long_term ? "Gain x 12.5% (held 24 months or more)" : "Gain x investor's slab rate (held under 24 months)", inputs: [["Gain", cr(t.gain, 2), "engine"], ["Months held", t.a.months, "investor"], ["Rate", pct(t.rate, 1), t.long_term ? "tax law" : "investor"]] }) + '</b></div><div class="kpi"><small>Net after tax</small><b>' + cr(t.net, 2) + "</b></div></div>" +
      (t.notes.length ? '<ul class="flags">' + t.notes.map((x) => '<li class="medium">' + esc(x) + "</li>").join("") + "</ul>" : "");
  }
  function investors(user) {
    return page("investors", user, '<div class="container page">' +
      pageHead("Fewer companies. Every one checked.", "Every company we introduce has passed our validation checks, our calculation engine and an advisor's sign-off. You see fewer companies, and every one arrives with a report you can check number by number.") +
      '<div class="three"><section class="card-sec"><h3>Curated, not listed</h3><p>Only advisor-approved companies appear in your deal list, each with an Investor Fit Score and the reasons behind it.</p></section><section class="card-sec"><h3>Direct ownership</h3><p>At most 3 investors per deal, each holding shares in their own name, in demat. Money flows from investor to company, never through us.</p></section><section class="card-sec"><h3>A way out</h3><p>After 6 months, or earlier with founder consent, sell privately at a fresh valuation. We introduce buyers; nothing is listed or auctioned.</p></section></div>' +
      '<section class="card-sec"><h2>Founder-owned data</h2><p>You request an introduction; the founder decides. Once access is granted you sign an NDA online, and the deal room opens. Documents are watermarked with your name and every view is logged for the founder to see.</p></section>' +
      '<section class="card-sec"><h2>Tax view for investors</h2>' + table(["Situation", "Treatment"], [["Sold within 24 months", "Short-term capital gain, taxed at the investor's slab rate"], ["Sold after 24 months", "Long-term capital gain at 12.5%"], ["Sold below fair market value", "Sections 50CA and 56(2)(x) can tax seller and buyer on the gap, so every resale uses a current valuation"], ["Share transfer", "Small stamp duty on each transfer"], ["Advisory fees", "18% GST"]]) +
      '<h3>Exit tax calculator</h3><form class="calc" data-calc="exit"><div class="fields f4">' + field("cost", "Amount invested", 1, "Rs cr") + field("sale", "Sale price", 1.4, "Rs cr") + field("months", "Months held", 14, "months") + field("slab", "Your slab rate", 30, "%") + field("fmv", "Fair market value", 1.4, "Rs cr") +
      '</div></form><div id="calc-exit">' + exitCalc({}) + '</div><p class="muted small">Indicative only. Confirm with your tax adviser.</p></section>' +
      '<div class="cta-band"><div><h2>Join the investor panel</h2><p>Tell us your sectors, stage and ticket size. We match deals to your mandate.</p></div><a class="btn primary lg" href="#signup">Create an investor account</a></div></div>');
  }

  function debtCalc(v) {
    const f = root.GB.debtFees(v);
    return '<div class="kpis k3"><div class="kpi"><small>Monitoring fees over the loan</small><b>' + lakh(f.monitoring_total) + '</b></div><div class="kpi"><small>First-year monitoring</small><b>' + lakh(f.monitoring[0].fee_lakh) + '</b></div><div class="kpi"><small>Transfer fee</small><b>' + gx(lakh(f.transfer_lakh), { title: "Loan transfer fee", formula: "Amount transferred x transfer fee %", inputs: [["Amount transferred", cr(f.a.transfer_amount), "lender"], ["Fee", pct(f.a.transfer_fee, 2), "fee schedule"]] }) + "</b></div></div>" +
      vbars(f.monitoring.map((m) => "Y" + m.year), f.monitoring.map((m) => m.fee_lakh), "var(--s-debt)", { fmt: (x) => n(x, 1), label: "Monitoring fee by year, Rs lakh", height: 190 });
  }
  function lenders(user) {
    return page("lenders", user, '<div class="container page">' +
      pageHead("Better applications. Faster credit decisions.", "Lenders see the same report as the founder, with founder-confirmed data and every number traceable to its source. That makes lenders a distribution partner, not a target.") +
      '<div class="three"><section class="card-sec"><h3>Lender-side view</h3><p>A standardised, verified applicant analysis: DSCR paths, stress cases, readiness factors and the advisor\'s sign-off.</p></section><section class="card-sec"><h3>Monitoring</h3><p>Quarterly accounts feed the engine. You get covenant headroom and early-warning alerts before a breach.</p></section><section class="card-sec"><h3>Transfers</h3><p>We find regulated buyers for loan exposures under RBI rules on transfer of loan exposures, with the monitoring history as the diligence pack.</p></section></div>' +
      '<section class="card-sec"><h2>Debt fee calculator</h2><p>All debt fees are paid by the lender, never the borrower.</p><form class="calc" data-calc="debt"><div class="fields f3">' + field("loan", "Loan amount", 10, "Rs cr") + field("tenor", "Tenor", 7, "years") + field("rate", "Interest rate", 10.5, "%") + field("monitoring", "Monitoring fee", 0.35, "% a year") + field("transfer_amount", "Amount transferred", 6, "Rs cr") + field("transfer_fee", "Transfer fee", 0.4, "%") +
      '</div></form><div id="calc-debt">' + debtCalc({}) + "</div></section>" +
      '<div class="cta-band"><div><h2>Partner with us</h2><p>DSA or service-provider agreements with banks and NBFCs.</p></div><a class="btn primary lg" href="#signup">Create a lender account</a></div></div>');
  }

  function trust(user) {
    return page("trust", user, '<div class="container page">' +
      pageHead("Accuracy is the product", "We are structured as an advisory firm to companies. Investors hold shares directly, loans stay with regulated lenders, and money moves only between the parties to each deal.") +
      '<section class="card-sec"><h2>Compliance by design</h2>' + table(["Activity", "How we structure it"], [["Debt vs equity advice", "Corporate finance advisory under an engagement letter"], ["Equity raise", "Up to 3 investors subscribe directly to shares; well within private placement limits"], ["Early-exit resales", "Private, one-to-one introductions; each sale a negotiated SPA through the depository"], ["Debt arranging", "DSA or service-provider agreements with banks and NBFCs; fees paid by the lender"], ["Debt transfer", "Arranged between regulated lenders under RBI rules on transfer of loan exposures"], ["Our fees", "Cash success fee and revenue share contract, keeping our advice independent"]]) +
      '<div class="two-col"><div><h3>Our commitments</h3><ul class="ticks"><li>Investor money flows only from investor to company, never through us.</li><li>Resales are private and negotiated, never listed or auctioned.</li><li>Loans are made only by regulated lenders; borrowers pay us nothing.</li><li>We hold no shares in clients, so every recommendation is independent.</li></ul></div>' +
      '<div><h3>Legal opinions being obtained</h3><ul class="ticks"><li>Treatment of the Investor Fit Score and investor diligence fee under SEBI advisory rules.</li><li>Wording of success-fee and revenue-share agreements.</li><li>DSA agreements and RBI digital lending compliance.</li><li>Consent flows under the Digital Personal Data Protection Act, 2023.</li></ul></div></div></section>' +
      '<section class="card-sec"><h2>Security</h2>' + table(["Area", "What we do"], [["Data protection law", "Follow India's Digital Personal Data Protection Act, 2023: clear consent, purpose limits, ability to delete data, breach process."], ["Where data lives", "Host in an Indian cloud region. Encrypt files and database at rest and in transit."], ["Access control", "Multi-factor login, role-based permissions, row-level security in the database, full audit trail."], ["Deal room", "Investors sign an NDA online. Documents are watermarked, view-limited and every access is logged."], ["AI vendors", "Business API plan with a signed data processing agreement. Only the data needed is sent."], ["Testing", "Independent security test before the pilot goes live, then yearly."]]) + "</section>" +
      '<section class="card-sec"><h2>Quality controls</h2>' + table(["Risk", "Control"], [["Formula error in the engine", "30 or more golden test cases built by a CA or finance modeler in Excel. The engine must match every one to the paise. Property tests too: a loan always repays to exactly zero, ownership always sums to 100%."], ["Bad or messy founder data", "Automatic checks (balance sheet balances, totals add up, sudden jumps flagged) plus a confirm screen before any analysis runs."], ["AI misreads a document", "Strict output format, a test set of real documents, a 95% target on key fields, and mandatory founder confirmation."], ["AI writes a wrong number", "A verifier compares every number in the narrative with the engine output. Any mismatch blocks the report."], ["Over-optimistic forecasts", "Benchmark limits by sector, a range of cases, and advisor challenge before sign-off."], ["Results cannot be explained later", "Each report stores inputs, assumptions and engine version so it can be re-run exactly."]]) +
      '<h3>Release checklist for every report</h3><ol class="steps"><li>All validation checks passed and data confirmed by the founder.</li><li>Engine version and assumption set recorded.</li><li>Number-check by the verifier passed.</li><li>Advisor reviewed and signed off.</li><li>Disclaimer shown: estimates, not guarantees.</li></ol></section></div>');
  }

  function about(user) {
    return page("about", user, '<div class="container page">' +
      pageHead("Built on one question", "Growing Indian businesses make their biggest financial decision, how to fund the next stage, with advice from people who each sell one answer: a banker sells loans, an investor sells equity, and a CA works it out by hand in Excel. We give the independent, risk-tested answer, then deliver the deal.") +
      '<section class="card-sec"><h2>The founders</h2><div class="founders">' +
      FOUNDERS.map(([nm, f]) => '<figure class="founder"><div class="frame"><img src="' + ASSETS + "founder-" + f + '.jpg" alt="Portrait of ' + nm + '" width="480" height="600" decoding="async"></div><figcaption><b>' + nm + "</b><span>Co-founder</span></figcaption></figure>").join("") + "</div></section>" +
      '<section class="card-sec"><h2>Who we serve first</h2><p>A profitable, asset-heavy SME choosing between a bank loan and its first outside equity.</p>' + table(["Attribute", "Pilot target"], [["Sector", "Manufacturing, starting with one sub-sector"], ["Revenue", "Rs 20-150 crore"], ["Profitability", "EBITDA-positive for at least 2 years"], ["Raise size", "Rs 5-30 crore"], ["Pilot city", "Mumbai and nearby industrial clusters"]]) +
      '<ul class="ticks"><li><b>They have a genuine choice.</b> Lenders will fund them and investors want them, so the comparison changes the outcome.</li><li><b>They are underserved.</b> Too large for self-serve loan apps, too small for investment banks.</li><li><b>The stakes are visible.</b> On a Rs 10 crore raise, the right structure can be worth crores to the founder over 5-7 years.</li></ul></section>' +
      '<section class="card-sec"><h2>How we compare</h2>' + table(["Player type", "What they do", "Our advantage"], [["Fundraising marketplaces", "Connect startups with angels and funds", "We first test whether equity is right at all"], ["Venture debt funds", "Lend to VC-backed startups", "We compare every option independently"], ["Revenue-based financing", "Short-term revenue-linked capital", "One product vs our full recommendation"], ["SME lenders", "Small business loans", "We add the equity view and founder-value analysis"], ["CA firms", "Project reports, CMA data, tax", "We model dilution, risk ranges and close the deal"], ["Boutique advisors", "Full-service capital raising", "Same rigour at SME-friendly pricing"]]) + "</section>" +
      '<section class="card-sec"><h2>Roadmap</h2><ol class="roadmap">' + [["Validate", "6 weeks", "20 founder interviews; concierge pilot with 10 SMEs", "At least 3 paying clients or deals reaching a lender or investor"], ["MVP", "16 weeks", "Engine, Funding Twin, AI layer, reports, Readiness Score, CMA/DPR, curated equity deals", "Engine matches 100% of golden tests; 2 live deals"], ["Ongoing services", "Phase 2", "Monitoring, Term Sheet Analyser, lender view, early-exit resale advisory", "Signed agreements with partner lenders"], ["Debt desk", "Phase 3", "Loan transfers between regulated lenders", "Active monitored loan book with partner lenders"]].map(([t, w, f, g], i) => '<li><span class="step">' + i + "</span><div><b>" + t + '</b> <span class="muted">' + w + "</span><p>" + f + '</p><p class="small muted">Gate: ' + g + "</p></div></li>").join("") + "</ol></section></div>");
  }

  function contact(user, msg) {
    return page("contact", user, '<div class="container page narrow">' +
      pageHead("Talk to an advisor", "Tell us about the company and what you are raising. An advisor will reply to the email you give.") +
      (msg ? '<div class="notice ok" role="status">' + esc(msg) + "</div>" : "") +
      '<form class="form contact-card" data-form="enquiry" novalidate>' +
      '<label class="fld"><span>Your name</span><span class="in"><input name="name" id="e_name" autocomplete="name" required></span></label>' +
      '<label class="fld"><span>Email</span><span class="in"><input name="email" id="e_email" type="email" autocomplete="email" required></span></label>' +
      '<label class="fld"><span>Company</span><span class="in"><input name="company" id="e_company" autocomplete="organization"></span></label>' +
      '<label class="fld"><span>What do you need?</span><span class="in"><textarea name="message" id="e_message" rows="5" required placeholder="For example: Rs 12 crore for a new extrusion line; choosing between a term loan and equity."></textarea></span></label>' +
      '<div class="form-err" hidden></div><div><button class="btn primary lg" type="submit">Send enquiry</button></div></form></div>');
  }

  root.PUB = { home, mountHome, services, pricing, investors, lenders, trust, about, contact, header, footer, page, wordmark, mark, feeCalc, exitCalc, debtCalc, field, FIRM };
})(typeof globalThis !== "undefined" ? globalThis : this);
