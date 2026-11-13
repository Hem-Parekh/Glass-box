/* Home page (landing): a scroll-driven 3D market scene (three.js + GSAP ScrollTrigger), the worked example in four
   panels, the Expertise explorer, the Approach timeline and the closing call to action. Styles: site/landing.css.
   Three ways to run, chosen before first paint: "3d" (WebGL scene), "lite" (phones and no WebGL: the footage as video)
   and "static" (reduced motion: everything visible, nothing moves).
   The worked-example figures come from the site's calculation engine (calc.js) when the page renders. */
(function (root) {
  "use strict";
  const ASSETS = root.GB_ASSETS || "assets/";
  const M = ASSETS + "media/";
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const span = (x, a, b) => Math.min(1, Math.max(0, (x - a) / (b - a)));

  /* ---------------------------------------------------------------- content (the firm's own) */
  // Tools behind the advice: [name, highlighted word, description, tag, accent, image (null = engine trace), what it shows, workspace page]
  const TOOLS = [
    ["Funding", "Twin", "A live copy of the company's finances. Change an assumption and every chart updates.", "Live model", "#38e07b", null,
      ["Change an assumption, every chart updates", "Every input tagged: founder, benchmark or advisor", "Best mix tested in 5% steps"], "#app-twin"],
    ["Net Effect", "Bridge", "What the founder's share is worth with debt, with equity and with a mix, in rupees.", "Founder value", "#a78bfa", "strategic-advisory",
      ["All equity, all debt and the best mix", "In rupees, in today's money", "Click any figure for its working"], "#app-twin"],
    ["Break-even", "Value", "Above this company value, debt wins. Below it, equity wins.", "Where debt starts to win", "#7fb2ff", "growth-strategy",
      ["The company value where debt overtakes equity", "The growth needed to get there", "Best, expected and worst cases"], "#app-twin"],
    ["Stress", "Slider", "Drag sales down or interest up and watch repayment safety change.", "Repayment safety", "#38bdf8", "business-intelligence",
      ["Sales down, interest up", "DSCR redrawn year by year", "Your minimum DSCR marked on the chart"], "#app-twin"],
    ["Equity vs Debt", "Optimizer", "Every mix from 0% to 100% equity, year by year, and the one that leaves the founder richest.", "0% to 100% equity", "#ffb23f", "market-intelligence",
      ["Every mix in 1% steps, year by year", "Ranked by founder wealth or cash", "Monthly take-home and DSCR for each mix"], "#app-optimizer"],
    ["CMA funding", "report", "A one-page, DSCR-sized funding recommendation from the bank's CMA workbook.", "For lenders", "#2ee6cf", "financial-research",
      ["The bank's CMA workbook, read in the browser", "Debt sized on DSCR", "A one-page PDF for lenders"], "#app-cma"],
    ["Investor Fit", "Score", "Each suggested investor scored on sector, stage, ticket size and past deals, with reasons.", "Curated deals", "#ff8a92", "strategic-advisory",
      ["Scored on sector, stage and ticket size", "Past deals taken into account", "The reasons behind every score"], "#app-investors"],
  ];
  // How every report is made: [title, text, icon]
  const METHOD = [
    ["Upload", "Accounts, GST returns and CMA data.", "upload"], ["Read", "Figures extracted into a strict format.", "file"], ["Confirm", "The founder checks every extracted figure.", "check"],
    ["Validate", "Balances, totals and sudden jumps checked.", "shield"], ["Calculate", "Code computes every number. No AI does maths.", "calc"], ["Stress", "Best, expected, worst; sales -20%, rates +2 points.", "pulse"],
    ["Verify", "Every number in the summary matched to the engine.", "search"], ["Sign off", "A named advisor reviews and stamps the report.", "pen"],
  ];
  const ACCENTS = ["#2ee6cf", "#7fb2ff", "#38bdf8", "#a78bfa", "#38e07b", "#ffb23f", "#ff8a92", "#2ee6cf"];
  const PROMISES = [
    ["For founders", "A clear, evidence-backed answer on debt versus equity, with the risks shown honestly, before you give away a single share or sign a single loan.", "#2ee6cf"],
    ["For investors", "We only bring you the best deals. Every company has passed our validation checks, our calculation engine and an advisor's sign-off.", "#ffb23f"],
    ["Our role", "We are the advisor, independent of any lender, fund or exchange. The recommendation is driven only by what is right for the company and the investor.", "#7fb2ff"],
  ];
  const PILLARS = [
    ["Debt vs equity specialists", "The capital-structure decision is our core product, not a side feature."],
    ["Every number explained", "Click any figure to see its formula, its inputs, where each came from and the engine version."],
    ["Curated deals", "Investors see only companies that pass our engine and an advisor's review."],
    ["Advisor accountability", "Every report carries a visible \"Reviewed by\" stamp from a named advisor."],
    ["Independence", "We sell no loan and run no fund, so our advice has no product to push."],
    ["Founder-owned data", "Nothing reaches an investor without the founder's permission, and every share is logged."],
  ];
  const FOUNDERS = [["Hem Parekh", "hem"], ["Yash Sharma", "yash"], ["Vivan Shah", "vivan"]];
  const ICONS = {
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
    check: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M16 14v4M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M8 18h.01M12 18h.01"/>',
    pulse: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  };
  const XICONS = [
    '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2"/>',
    '<path d="M3 3v18h18"/><path d="M7 16V9M12 16V5M17 16v-4"/>',
    '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
    '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
    '<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/>',
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><circle cx="11.5" cy="14.5" r="2.5"/><path d="M13.3 16.3 15 18"/>',
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  ];
  const svg = (paths, cls) => '<svg class="' + (cls || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + "</svg>";
  const ARROW = svg('<path d="M5 12h14M12 5l7 7-7 7"/>');
  const RIGHT = '<svg class="right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
  const BRAND = '<svg class="mark" viewBox="62 52 420 400" aria-hidden="true"><use href="#emblem"/></svg>Aegis Ascend <span>Financial Advisors</span>';
  const gets = (list, cls) => '<ul class="' + cls + '">' + list.map((g) => "<li>" + g + "</li>").join("") + "</ul>";

  // The live example on the sample company (Kalyan Polymers, Rs 12 crore), straight from the engine, as on the old home page.
  function example() {
    const GB = root.GB, U = root.UI, t = GB.twin({}), b = t.best, q = t.q;
    const diff = (b.value - t.equity.value) / Math.pow(1 + q.discount_rate, q.horizon);
    const path = GB.dscrPath(q, b.loan);
    const maxD = Math.max(...path.map((r) => r.dscr), q.dscr_min * 1.4);
    const bars = path.map((r, i) => { const h = Math.max(2, (r.dscr / maxD) * 56), w = 120 / path.length; return [4 + i * (w + 2), 60 - h, w - 1, h, r.dscr < q.dscr_min ? "#ff4b55" : "#38e07b"]; });
    const vals = t.mixes.map((m) => m.value), lo = Math.min(...vals), hi = Math.max(...vals);
    const pt = (m, i) => [4 + (132 * i) / (t.mixes.length - 1), 56 - ((m.value - lo) / ((hi - lo) || 1)) * 50];
    const curve = t.mixes.map((m, i) => (i ? "L" : "M") + pt(m, i).map((v) => v.toFixed(1)).join(" ")).join(" ");
    const bi = Math.round(b.share * (t.mixes.length - 1)), best = pt(t.mixes[bi], bi);
    return { t, b, q, diff, bars, curve, best, version: t.version, minLine: 60 - (q.dscr_min / maxD) * 56,
      debt: U.pct(b.share), equity: U.pct(1 - b.share), eqFrac: (1 - b.share).toFixed(3), net: U.cr(diff), dscr: U.xx(b.dscr), stress: U.xx(b.dscr_stress),
      raise: U.cr(q.raise, 0), loan: U.cr(b.loan), eq: U.cr(b.equity), ebitda: U.cr(q.ebitda0) };
  }
  function term(x) {
    return '<div class="x-term" role="img" aria-label="Engine trace for the sample company: best mix, net effect and repayment safety">' +
      '<div class="x-term-bar"><i></i><i></i><i></i>' + esc(x.version) + " · Funding Twin</div><pre>" +
      '<span class="c"># sample company: Kalyan Polymers, ' + x.raise + ' raise</span>\n' +
      '<span class="k">best_mix</span>   = <span class="n">' + x.debt + '</span> debt · <span class="n">' + x.equity + '</span> equity\n' +
      '  loan <span class="n">' + x.loan + '</span>  equity <span class="n">' + x.eq + '</span>\n' +
      '<span class="k">net_effect</span> → <span class="n">' + x.net + '</span> vs all-equity  <span class="ok">✓</span>\n' +
      '<span class="k">dscr_min</span>   → <span class="n">' + x.dscr + '</span>  stress <span class="n">' + x.stress + '</span>  <span class="ok">✓</span>\n' +
      '<span class="k">summary</span>    every number matched to the engine <span class="ok">✓</span>\n' +
      '<span class="c">$</span> <span class="cur"></span></pre></div>';
  }

  /* ---------------------------------------------------------------- markup */
  function html(user) {
    const x = example(), NAV = [["services", "Services"], ["investors", "For investors"], ["lenders", "For lenders"], ["pricing", "Pricing"], ["trust", "Trust & compliance"], ["about", "About"]];
    const cta = user ? '<a class="pill ghost" href="#app">Open your workspace</a>' : '<a class="signin" href="#login">Sign in</a><a class="pill ghost" href="#contact">Book an engagement</a>';
    const anatomy = root.PUB && root.PUB.anatomy ? root.PUB.anatomy() : "";
    return '<div class="lp" data-mode="static">' +
      '<header class="top" id="lp-top"><div class="wrap">' +
        '<a class="brand" href="#hero" aria-label="Aegis Ascend Financial Advisors, back to top">' + BRAND + "</a>" +
        '<nav class="nav" aria-label="Main">' + NAV.map(([k, l]) => '<a href="#' + k + '">' + esc(l) + "</a>").join("") + "</nav>" +
        '<div class="top-cta">' + cta + "</div></div></header>" +
      "<main>" +
      '<section class="stage" id="hero" aria-label="Introduction"><span class="anchor" id="example" aria-hidden="true"></span><div class="sticky">' +
        '<img class="poster" src="' + M + 'markets-poster.webp" alt="" fetchpriority="high">' +
        '<div class="layer" id="lp-scene" aria-hidden="true"></div>' +
        '<div class="layer lite" aria-hidden="true"><video id="lp-video" muted loop playsinline preload="none" poster="' + M + 'markets-poster-960.webp">' +
          '<source src="' + M + 'markets-960.webm" type=\'video/webm; codecs="vp9"\'><source src="' + M + 'markets-960.mp4" type="video/mp4"></video></div>' +
        '<div class="layer shade"></div><div class="shade-top"></div><div class="layer vignette"></div>' +
        '<div class="hero" data-hero><div class="wrap">' +
          '<p class="kick rise"><i aria-hidden="true"></i>Aegis Ascend · Financial Advisors</p>' +
          '<h1 class="h1 rise">Smarter Decisions. <span class="hl">Stronger Futures.</span></h1>' +
          '<p class="sub rise">Independent advice on debt, equity or the right mix for growing Indian businesses. Every number traced, checked and signed off before it reaches you, then we deliver the deal.</p>' +
          '<div class="ctas rise"><a class="pill solid" href="#contact">Book an engagement ' + RIGHT + '</a><a class="pill ghost" href="#login">Try the live model ' + RIGHT + "</a></div>" +
        "</div></div>" +
        '<div class="intel"><div class="wrap"><div data-intel-head>' +
          '<p class="kicker">Live example · sample company</p><h2>Debt, equity <span class="hl">or a mix?</span></h2>' +
          '<p class="body">Kalyan Polymers needs ' + x.raise + ". Our engine tests every mix and recommends " + x.debt + " debt and " + x.equity + " equity.</p>" +
          '<p class="caption" data-intel-caption>Sample company · live model · calculated by our engine (' + esc(x.version) + "), not by AI. In the workspace, click any underlined number to see its formula and inputs.</p></div>" +
          '<div class="panels">' +
            '<div class="panel p1" data-panel style="--accent:var(--up)"><p class="lbl">Recommended mix · debt</p><p class="val">' + x.debt + "</p>" +
              '<div class="chart" aria-hidden="true"><svg viewBox="0 0 140 60">' + x.bars.map((r) => '<rect data-grow x="' + r[0].toFixed(1) + '" y="' + r[1].toFixed(1) + '" width="' + r[2].toFixed(1) + '" height="' + r[3].toFixed(1) + '" rx="1.5" fill="' + r[4] + '" opacity=".6"/>').join("") +
                '<line x1="2" x2="138" y1="' + x.minLine.toFixed(1) + '" y2="' + x.minLine.toFixed(1) + '" stroke="rgba(255,255,255,0.35)" stroke-dasharray="2 3"/></svg></div>' +
              '<p class="note">' + x.loan + " loan · repayment safety (DSCR) each year, dashed line at the minimum " + x.q.dscr_min.toFixed(2) + "x</p></div>" +
            '<div class="panel p2" data-panel style="--accent:var(--amber)"><p class="lbl">Recommended mix · equity</p><p class="val">' + x.equity + "</p>" +
              '<div class="chart" aria-hidden="true"><svg viewBox="0 0 60 60" style="width:auto"><circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="6"/>' +
              '<circle data-ring data-to="' + x.eqFrac + '" cx="30" cy="30" r="24" fill="none" stroke="#ffb23f" stroke-width="6" stroke-linecap="round" pathLength="1" stroke-dasharray="' + x.eqFrac + ' 1" transform="rotate(-90 30 30)"/></svg></div>' +
              '<p class="note">' + x.eq + " raised as equity</p></div>" +
            '<div class="panel p3" data-panel style="--accent:var(--sky)"><p class="lbl">Founder better off than all-equity</p><p class="val">' + x.net + "</p>" +
              '<div class="chart" aria-hidden="true"><svg viewBox="0 0 140 60" fill="none"><path data-draw d="' + x.curve + '" stroke="#7fb2ff" stroke-width="2" pathLength="1" stroke-dasharray="1 1"/>' +
              '<line x1="' + x.best[0].toFixed(1) + '" y1="4" x2="' + x.best[0].toFixed(1) + '" y2="58" stroke="rgba(255,255,255,0.25)" stroke-dasharray="2 3"/><circle cx="' + x.best[0].toFixed(1) + '" cy="' + x.best[1].toFixed(1) + '" r="3" fill="#fff"/></svg></div>' +
              '<p class="note">in today\'s money · founder value for every debt share, best mix marked</p></div>' +
            '<div class="panel p4" data-panel style="--accent:var(--down)"><p class="lbl">Lowest repayment safety (DSCR)</p><p class="val small">' + x.dscr + " · stress " + x.stress + "</p>" +
              '<div class="chart"><dl class="inputs"><dt>E</dt><dd>' + x.ebitda + '</dd><dd class="d">EBITDA today</dd><dt>L</dt><dd>' + x.loan + '</dd><dd class="d">loan at the best mix</dd><dt>S</dt><dd>−20% · +2 pts</dd><dd class="d">stress: sales, rates</dd></dl></div>' +
              '<p class="note">Signed off before it is shared: every report carries a named advisor\'s "Reviewed" stamp</p></div>' +
          "</div></div></div>" +
        '<div class="cue" data-cue aria-hidden="true">Scroll to move through the market <i></i></div><div class="layer veil" data-veil></div>' +
      "</div></section>" +
      // promises, the brand, what we stand for
      '<section class="band grid-bg glow-top xsec" id="promise"><div class="wrap"><div class="sec-head"><div class="head" data-reveal><p class="kicker">Who we serve</p>' +
        '<h2>One clear answer, <span class="hl">for everyone at the table.</span></h2></div>' +
        '<ul class="sec-badges" data-reveal><li>Independent</li><li>Every number traced</li><li>Advisor signed</li></ul></div>' +
        '<div class="lp-cards c3">' + PROMISES.map(([t, d, c]) => '<article class="lp-card" data-reveal style="--accent:' + c + '"><p class="kicker">' + t + "</p><p>" + d + "</p></article>").join("") + "</div>" +
        '<div class="lp-meaning" data-reveal><div class="lp-anatomy">' + anatomy + '</div><div><p class="kicker">Our identity</p><h2>Protection, <span class="hl-warm">then ascent.</span></h2>' +
          "<p class=\"lede\">Our identity says what we do: protect a business's interests while creating pathways to sustainable growth.</p>" +
          '<dl class="lp-dl"><div><dt>Aegis</dt><dd>Protection and trusted guidance.</dd></div><div><dt>Ascend</dt><dd>Progress and the pursuit of greater potential.</dd></div>' +
          "<div><dt>The emblem</dt><dd>Structure, strategic thinking and upward ambition. The diamond at its peak stands for clarity of vision and sound financial judgment.</dd></div></dl>" +
          "<p class=\"fine\">Our philosophy is simple: Smarter Decisions. Stronger Futures. Guided by it, we help businesses navigate financial choices, evaluate capital-raising options, and build a stronger foundation for the future.</p></div></div>" +
        '<div class="head" data-reveal style="margin-top:96px"><p class="kicker">What we stand for</p><h2>Six commitments, <span class="hl">kept on every deal.</span></h2></div>' +
        '<div class="lp-cards c3 pillars">' + PILLARS.map(([t, d]) => '<article class="lp-card" data-reveal><h3>' + t + "</h3><p>" + d + "</p></article>").join("") + "</div>" +
      "</div></section>" +
      // how every report is made
      '<section class="band apx" id="method"><div class="wrap"><div class="head" data-reveal><p class="kicker">How every report is made</p>' +
        '<h2>Eight steps, in this order, <span class="hl-warm">for every analysis.</span></h2><p>Nothing skips the checks.</p></div>' +
        '<div class="ap"><aside class="ap-sticky" aria-hidden="true"><div class="ap-visual" id="lp-apVisual"><div class="ap-ico" id="lp-apIco"></div>' +
          '<div class="ap-ring"><svg viewBox="0 0 36 36"><circle class="bg" cx="18" cy="18" r="16" pathLength="8"/><circle class="fg" id="lp-apArc" cx="18" cy="18" r="16" pathLength="8" stroke-dasharray="1 8"/></svg>' +
          '<div><b id="lp-apStep">1</b><small id="lp-apNum">of 8</small></div></div>' +
          '<h3 id="lp-apTitle">Upload</h3><p id="lp-apText"></p><div class="ap-out"><small>The golden rule</small><span>The AI never does the maths.</span></div></div></aside>' +
          '<ol class="ap-steps" id="lp-apSteps"></ol></div>' +
        '<div class="lp-golden" data-reveal><p class="kicker">The golden rule</p><p>The AI never does the maths. Calculation code produces every number. The AI reads documents, suggests assumptions and explains results in plain words, and every number it writes is checked against the code\'s output before a report is released.</p></div>' +
      "</div></section>" +
      // tools behind the advice
      '<section class="band grid-bg glow-top" id="tools"><div class="wrap"><div class="sec-head"><div class="head" data-reveal><p class="kicker">Tools behind the advice</p>' +
        '<h2>Founders and advisors work <span class="hl">in the same tools.</span></h2><p>So every recommendation can be reproduced.</p></div>' +
        '<ul class="sec-badges" data-reveal><li>One engine</li><li>Every figure explained</li><li>No AI arithmetic</li></ul></div>' +
        '<div class="xp" id="lp-xp"><div class="xp-tabs" role="tablist" aria-label="Tools" id="lp-xpTabs"></div><div class="xp-stage" id="lp-xpStage"></div></div>' +
        '<div class="xm" id="lp-xm" aria-label="Tools"></div><div class="xm-dots" id="lp-xmDots" aria-hidden="true"></div></div></section>' +
      // founders
      '<section class="band apx" id="founders"><div class="wrap"><div class="head" data-reveal><p class="kicker">The founders</p>' +
        '<h2>Three partners who <span class="hl">sign their names to the advice.</span></h2><p>Aegis Ascend was founded by three partners who sign their names to the advice.</p></div>' +
        '<div class="lp-founders">' + FOUNDERS.map(([nm, f]) => '<figure class="lp-founder" data-reveal><img src="' + ASSETS + "founder-" + f + '.jpg" alt="Portrait of ' + nm + '" width="480" height="600" loading="lazy" decoding="async"><figcaption><b>' + nm + "</b><small>Co-founder</small></figcaption></figure>").join("") + "</div>" +
      "</div></section>" +
      '<section class="band final" id="start"><div class="wrap"><h2 data-reveal>Should you raise debt, equity <span class="hl">or a mix?</span></h2>' +
        "<p data-reveal>Advisory engagements start from Rs 1 lakh plus GST, scaled by company size and complexity.</p>" +
        '<a class="pill solid" href="#contact">Talk to an advisor ' + RIGHT + "</a></div></section>" +
      "</main>" +
      '<footer><div class="wrap lp-foot"><div><a class="brand" href="#hero">' + BRAND + "</a><p>Smarter Decisions. Stronger Futures. Independent funding advice for growing Indian businesses, from Mumbai.</p></div>" +
        '<nav aria-label="Services"><b>Services</b><a href="#services">Debt vs equity advisory</a><a href="#services-equity">Equity raise and early exit</a><a href="#services-debt">Debt arranging</a></nav>' +
        '<nav aria-label="Firm"><b>Firm</b><a href="#about">About and founders</a><a href="#trust">Trust &amp; compliance</a><a href="#pricing">Pricing</a><a href="#contact">Contact</a></nav>' +
        '<nav aria-label="Workspace"><b>Workspace</b><a href="#login">Sign in</a><a href="#signup">Create an account</a></nav>' +
        '<p class="fine">This website describes planned services and structures. Figures are illustrative estimates, not guarantees. Structures, fees and agreements are subject to review by qualified legal and tax advisers before launch. Ticker numbers in the background footage are decorative. © 2026 Aegis Ascend Financial Advisors.</p>' +
      "</div></footer></div>";
  }

  /* ---------------------------------------------------------------- behaviour */
  let live = null;   // everything the mounted page started, so unmount can stop it

  function mount() {
    unmount();
    const el = document.querySelector(".lp"); if (!el) return;
    const $ = (id) => el.querySelector("#lp-" + id);
    const L = live = { el, off: [], io: [], timers: [], ctx: null, renderer: null, video: null };
    const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); L.off.push(() => t.removeEventListener(ev, fn, o)); };
    const observe = (cb, opts, targets) => { const io = new IntersectionObserver(cb, opts); [].concat(targets).forEach((t) => io.observe(t)); L.io.push(io); return io; };

    // the way to run, before anything moves: 3d | lite | static
    let MODE = "3d";
    try {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) MODE = "static";
      else {
        const c = document.createElement("canvas"), gl = c.getContext("webgl2") || c.getContext("webgl");
        if (!gl || innerWidth < 768 || typeof root.THREE === "undefined") MODE = "lite";
      }
    } catch (e) { MODE = "lite"; }
    if (typeof root.gsap === "undefined") MODE = "static";
    el.dataset.mode = MODE;
    // hold the entrance until the fonts are in, so the headline never swaps typeface while it moves
    el.classList.add("fonts-wait");
    const ready = () => el.classList.remove("fonts-wait");
    L.timers.push(setTimeout(ready, 1500));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ready);

    const x = example();
    // expertise: desktop explorer
    const xpTabs = $("xpTabs"), xpStage = $("xpStage");
    TOOLS.forEach((e, i) => {
      const tab = document.createElement("button");
      tab.className = "xp-tab"; tab.type = "button"; tab.setAttribute("role", "tab"); tab.id = "lp-xpt" + i; tab.setAttribute("aria-controls", "lp-xpp" + i);
      tab.style.setProperty("--accent", e[4]);
      tab.innerHTML = '<span class="n">' + svg(XICONS[i]) + "</span><b>" + e[0] + " " + e[1] + "</b><small>" + e[3] + "</small>";
      xpTabs.appendChild(tab);
      const panel = document.createElement("article");
      panel.className = "xp-panel" + (e[5] ? "" : " tech"); panel.id = "lp-xpp" + i; panel.setAttribute("role", "tabpanel"); panel.setAttribute("aria-labelledby", "lp-xpt" + i);
      panel.style.setProperty("--accent", e[4]);
      panel.innerHTML = (e[5] ? '<div class="xp-media"><img src="' + M + "expertise/" + e[5] + '.webp" alt="" loading="lazy" decoding="async"></div>' : term(x)) +
        '<div class="xp-body"><span class="xp-chip">' + e[3] + "</span><h3>" + e[0] + " <span>" + e[1] + "</span></h3><p>" + e[2] + "</p>" + gets(e[6], "xp-gets") +
        '<a class="xp-cta" href="' + e[7] + '">Open in the workspace ' + ARROW + "</a></div>";
      xpStage.appendChild(panel);
    });
    // expertise: phone carousel
    const xm = $("xm"), xmDots = $("xmDots");
    TOOLS.forEach((e) => {
      const card = document.createElement("article");
      card.className = "xm-card"; card.style.setProperty("--accent", e[4]);
      card.innerHTML = (e[5] ? '<div class="xm-media"><span class="xp-chip">' + e[3] + '</span><img src="' + M + "expertise/" + e[5] + '.webp" alt="" loading="lazy" decoding="async"></div>'
        : '<div class="xm-media tech">' + term(x) + "</div>") +
        '<div class="xm-body"><h3>' + e[0] + " <span>" + e[1] + "</span></h3><p>" + e[2] + "</p>" + gets(e[6], "xm-gets") + '<a class="x-link" href="' + e[7] + '">Open in the workspace ' + ARROW + "</a></div>";
      xm.appendChild(card);
      const dot = document.createElement("button");
      dot.type = "button"; dot.setAttribute("aria-label", e[0] + " " + e[1]); dot.tabIndex = -1;
      dot.addEventListener("click", () => card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" }));
      xmDots.appendChild(dot);
    });
    // approach steps
    const apSteps = $("apSteps");
    METHOD.forEach((st, i) => {
      const li = document.createElement("li");
      li.className = "ap-step"; li.dataset.i = i; li.style.setProperty("--accent", ACCENTS[i]);
      li.innerHTML = '<span class="ap-node" aria-hidden="true"></span><div class="ap-top"><span class="ico">' + svg(ICONS[st[2]]) + '</span><span class="num">Step ' + (i + 1) + "</span></div>" +
        "<h3>" + st[0] + "</h3><p>" + st[1] + "</p>";
      apSteps.appendChild(li);
    });

    // header turns solid once the page moves
    const top = $("top");
    const onScroll = () => top.classList.toggle("solid", scrollY > 24);
    on(window, "scroll", onScroll, { passive: true });
    onScroll();
    // in-page links scroll; the site's router owns the URL hash
    on(el, "click", (ev) => {
      const a = ev.target.closest('a[href^="#"]'); if (!a) return;
      const id = a.getAttribute("href").slice(1);
      const target = id === "hero" ? el.querySelector("#hero") : null;
      if (!target) return;
      ev.preventDefault();
      const y = 0;
      window.scrollTo({ top: y, behavior: MODE === "static" ? "auto" : "smooth" });
    });

    // expertise explorer: tabs, keyboard, gentle autoplay
    (function () {
      const tabs = [].slice.call(el.querySelectorAll(".xp-tab")), panels = [].slice.call(el.querySelectorAll(".xp-panel"));
      let cur = -1, timer = null, user = false;
      const reduce = MODE === "static", DUR = 6500;
      function show(i) {
        cur = (i + tabs.length) % tabs.length;
        tabs.forEach((t, k) => { const yes = k === cur; t.setAttribute("aria-selected", yes); t.tabIndex = yes ? 0 : -1; t.classList.remove("run"); });
        panels.forEach((p, k) => p.classList.toggle("on", k === cur));
        if (!user && !reduce) { void tabs[cur].offsetWidth; tabs[cur].classList.add("run"); }
      }
      function schedule() { clearInterval(timer); if (!user && !reduce) timer = setInterval(() => show(cur + 1), DUR); }
      L.off.push(() => clearInterval(timer));
      tabs.forEach((t, k) => {
        t.style.setProperty("--dur", DUR + "ms");
        t.addEventListener("click", () => { user = true; clearInterval(timer); show(k); });
        t.addEventListener("keydown", (ev) => {
          if (ev.key === "ArrowDown" || ev.key === "ArrowRight") { ev.preventDefault(); user = true; show(cur + 1); tabs[cur].focus(); }
          if (ev.key === "ArrowUp" || ev.key === "ArrowLeft") { ev.preventDefault(); user = true; show(cur - 1); tabs[cur].focus(); }
        });
      });
      const xp = $("xp");
      xp.addEventListener("pointerenter", () => { clearInterval(timer); tabs.forEach((t) => t.classList.remove("run")); });
      xp.addEventListener("pointerleave", () => { if (!user) { show(cur); schedule(); } });
      show(0);
      observe((es) => { if (es[0].isIntersecting) { show(cur); schedule(); } else clearInterval(timer); }, { threshold: 0.3 }, xp);
      const cards = [].slice.call(el.querySelectorAll(".xm-card")), dots = [].slice.call(el.querySelectorAll(".xm-dots button"));
      observe((es) => es.forEach((e) => { if (e.isIntersecting) { const k = cards.indexOf(e.target); dots.forEach((d, j) => d.classList.toggle("on", j === k)); } }), { root: $("xm"), threshold: 0.6 }, cards);
      if (dots[0]) dots[0].classList.add("on");
    })();

    // approach: the step crossing the middle of the screen is the active one
    (function () {
      const items = [].slice.call(el.querySelectorAll(".ap-step")), vis = $("apVisual");
      function activate(i) {
        const st = METHOD[i];
        items.forEach((li, k) => li.classList.toggle("on", k === i));
        vis.style.setProperty("--accent", ACCENTS[i]);
        $("apStep").textContent = i + 1; $("apTitle").textContent = st[0]; $("apText").textContent = st[1];
        $("apIco").innerHTML = svg(ICONS[st[2]]);
        $("apArc").setAttribute("stroke-dasharray", (i + 1) + " 8");   // step count
      }
      activate(0);
      observe((es) => es.forEach((e) => { if (e.isIntersecting) activate(Number(e.target.dataset.i)); }), { rootMargin: "-45% 0px -45% 0px" }, items);
    })();

    if (MODE === "static") return;
    const gsap = root.gsap, ScrollTrigger = root.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);
    const stage = { p: 0, intro: 0, mx: 0, my: 0 };
    const stageEl = el.querySelector("#hero");
    let visible = true, running = true, loop = null;
    function syncLoop() {
      if (!L.renderer) return;
      const want = visible && stage.p < 0.999;
      if (want !== running) { running = want; L.renderer.setAnimationLoop(want ? loop : null); }
    }

    L.ctx = gsap.context(() => {
      observe((es) => { visible = es[0].isIntersecting; syncLoop(); }, {}, stageEl);
      const q = gsap.utils.selector(stageEl);
      const tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: stageEl, start: "top top", end: "bottom bottom", scrub: 0.5, onUpdate: syncLoop } });
      tl.to(stage, { p: 1, duration: 1 }, 0);
      tl.to(q("[data-cue]"), { autoAlpha: 0, duration: 0.04 }, 0.01);
      tl.to(q("[data-hero]"), { autoAlpha: 0, duration: 0.1, ease: "power1.in" }, 0.07);
      tl.fromTo(q("[data-intel-head]"), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.1, ease: "power2.out" }, 0.25);
      tl.fromTo(q("[data-intel-caption]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.06 }, 0.42);
      q("[data-panel]").forEach((panel, i) => {
        const at = 0.28 + i * 0.035;
        tl.fromTo(panel, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.1, ease: "power2.out" }, at);
        const draw = panel.querySelectorAll("[data-draw]"), ring = panel.querySelectorAll("[data-ring]"), grow = panel.querySelectorAll("[data-grow]");
        if (draw.length) tl.fromTo(draw, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.16, ease: "power1.out" }, at + 0.05);
        if (ring.length) tl.fromTo(ring, { attr: { "stroke-dasharray": "0 1" } }, { attr: { "stroke-dasharray": ring[0].getAttribute("data-to") + " 1" }, duration: 0.14, ease: "power2.out" }, at + 0.05);
        if (grow.length) tl.fromTo(grow, { scaleY: 0, transformOrigin: "50% 100%" }, { scaleY: 1, duration: 0.12, stagger: 0.012, ease: "power2.out" }, at + 0.05);
        tl.to(panel, { autoAlpha: 0, duration: 0.06 }, 0.8 + i * 0.01);
      });
      tl.to(q("[data-intel-head]"), { autoAlpha: 0, duration: 0.08 }, 0.8);
      if (MODE === "lite") {
        const lv = el.querySelector("#lp-video");
        L.video = lv; lv.preload = "auto"; lv.play().catch(() => {});
        tl.fromTo(lv, { scale: 1.08, rotateX: 0, yPercent: 0 }, { scale: 1.55, rotateX: 10, yPercent: -6, duration: 1 }, 0);
      }
      gsap.utils.toArray(el.querySelectorAll("[data-reveal]")).forEach((r) => {
        gsap.from(r, { autoAlpha: 0, y: 30, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: r, start: "top 85%", once: true } });
      });
    }, el);
    on(window, "pointermove", (e) => { stage.mx = (e.clientX / innerWidth) * 2 - 1; stage.my = -((e.clientY / innerHeight) * 2 - 1); }, { passive: true });
    requestAnimationFrame(() => ScrollTrigger.refresh());

    if (MODE !== "3d") return;
    const THREE = root.THREE;

    /* ---------------------------------------------------------------- 3D scene */
    const mountEl = $("scene");
    const renderer = L.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance", stencil: false });
    let DPR = Math.min(devicePixelRatio || 1, 1.25);
    renderer.setPixelRatio(DPR);
    mountEl.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#02060f");
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
    function resize() {
      const w = mountEl.clientWidth || innerWidth, h = mountEl.clientHeight || innerHeight;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    on(window, "resize", resize);
    resize();

    const KEYS = [
      { p: 0.0, pos: [0, 0.1, 11.2], look: [0, 0, 0], rot: [-0.07, 0.07] },
      { p: 0.24, pos: [-0.9, -0.25, 8.4], look: [0.45, -0.15, -1], rot: [-0.13, 0.15] },
      { p: 0.56, pos: [1.1, 0.4, 6.2], look: [-0.25, 0.05, -3], rot: [-0.2, -0.08] },
      { p: 0.82, pos: [0.3, 0.1, 4.0], look: [0, -0.05, -6], rot: [-0.24, -0.15] },
      { p: 1.0, pos: [0, -0.05, -5], look: [0, -0.35, -18], rot: [-0.28, -0.2] },
    ];
    const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
    const posCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => v3(k.pos)), false, "centripetal");
    const lookCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => v3(k.look)), false, "centripetal");
    function curveU(p) {
      for (let i = 0; i < KEYS.length - 1; i++) if (p <= KEYS[i + 1].p) return (i + span(p, KEYS[i].p, KEYS[i + 1].p)) / (KEYS.length - 1);
      return 1;
    }
    function rotAt(p) {
      for (let i = 0; i < KEYS.length - 1; i++) {
        const a = KEYS[i], b = KEYS[i + 1];
        if (p <= b.p) { const t = span(p, a.p, b.p); return [a.rot[0] + (b.rot[0] - a.rot[0]) * t, a.rot[1] + (b.rot[1] - a.rot[1]) * t]; }
      }
      return KEYS[KEYS.length - 1].rot;
    }

    // the footage on a plane; scroll scrubs through it
    const video = L.video = document.createElement("video");
    video.muted = true; video.playsInline = true; video.preload = "auto"; video.crossOrigin = "anonymous";
    const SOURCES = [[M + "markets-1280.webm", 'video/webm; codecs="vp9"'], [M + "markets-1280.mp4", "video/mp4"]];
    const src = SOURCES.find((s) => video.canPlayType(s[1]) !== "");
    const vtex = new THREE.VideoTexture(video);
    vtex.colorSpace = THREE.SRGBColorSpace; vtex.minFilter = THREE.LinearFilter; vtex.magFilter = THREE.LinearFilter; vtex.generateMipmaps = false;
    const posterTex = new THREE.TextureLoader().load(M + "markets-poster.webp");
    posterTex.colorSpace = THREE.SRGBColorSpace;
    const DURATION = 15.03;
    let hasVideo = false, shown = false, primed = false;
    function show() {
      if (shown || live !== L) return;
      shown = true; mountEl.classList.add("ready");
      gsap.to(stage, { intro: 1, duration: 2.8, ease: "power2.out", delay: 0.15 });
    }
    function prime() { if (primed || video.readyState < 1) return; primed = true; video.currentTime = 0.04; }
    video.addEventListener("loadeddata", prime);
    video.addEventListener("canplay", prime);
    video.addEventListener("seeked", () => { vtex.needsUpdate = true; if (!hasVideo && video.readyState >= 2) { hasVideo = true; show(); } });
    video.addEventListener("error", show);
    if (src) { video.src = src[0]; video.load(); L.timers.push(setTimeout(show, 2500)); } else show();

    const videoMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: true,
      uniforms: { uVideo: { value: vtex }, uPoster: { value: posterTex }, uUseVideo: { value: 0 }, uFade: { value: 1 }, uDeep: { value: 0 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: [
        "uniform sampler2D uVideo; uniform sampler2D uPoster; uniform float uUseVideo; uniform float uFade; uniform float uDeep; varying vec2 vUv;",
        "void main(){",
        "  vec3 c = mix(texture2D(uPoster, vUv).rgb, texture2D(uVideo, vUv).rgb, uUseVideo);",
        "  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));",
        "  vec3 navy = vec3(0.0015, 0.004, 0.018);",
        "  c = mix(navy, c, 0.2 + 0.8 * smoothstep(0.0, 0.05, l));",
        "  float blueish = smoothstep(0.0, 0.04, c.b - max(c.r, c.g));",
        "  c += vec3(0.0, 0.012, 0.06) * blueish;",
        "  c *= 1.0 + uDeep * 0.25;",
        "  float ex = smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.84, vUv.x);",
        "  float ey = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);",
        "  gl_FragColor = vec4(c, ex * ey * uFade);",
        "  #include <colorspace_fragment>",
        "}"].join("\n"),
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), videoMat);
    plane.renderOrder = 0;
    scene.add(plane);

    // floating ticker tiles from a drawn atlas, with a shader depth of field
    const COLS = 4, ROWS = 12, CW = 512, CH = 128;
    const seeded = (seed) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
    function drawAtlas(blur) {
      const c = document.createElement("canvas"); c.width = CW * COLS; c.height = CH * ROWS;
      const ctx = c.getContext("2d"); if (blur) ctx.filter = "blur(" + blur + "px)";
      const r = seeded(20261112), KINDS = ["figure", "up", "down", "boxUp", "figure", "down", "up", "small", "boxDown", "figure", "up", "small"];
      const fig = () => Math.floor(10000 + r() * 890000).toLocaleString("en-US");
      const chg = () => (r() * 900 + 10).toFixed(2);
      for (let i = 0; i < COLS * ROWS; i++) {
        const kind = KINDS[i % KINDS.length], x0 = (i % COLS) * CW, y0 = Math.floor(i / COLS) * CH, mid = CH / 2 + 4;
        ctx.save(); ctx.translate(x0, y0); ctx.textBaseline = "middle";
        ctx.font = "500 " + (kind === "small" ? 46 : 70) + 'px "IBM Plex Mono", ui-monospace, monospace';
        if (kind === "figure") { ctx.fillStyle = "#f2f6ff"; ctx.fillText(fig(), 24, mid); }
        else if (kind === "small") { ctx.fillStyle = r() > 0.5 ? "#7fb2ff" : "#f2f6ff"; ctx.globalAlpha = 0.85; ctx.fillText(fig() + "  " + chg(), 24, mid); }
        else if (kind === "up" || kind === "down") {
          const up = kind === "up"; ctx.fillStyle = up ? "#38e07b" : "#ff4b55"; ctx.beginPath();
          if (up) { ctx.moveTo(24, mid + 18); ctx.lineTo(64, mid + 18); ctx.lineTo(44, mid - 18); } else { ctx.moveTo(24, mid - 18); ctx.lineTo(64, mid - 18); ctx.lineTo(44, mid + 18); }
          ctx.fill(); ctx.fillStyle = r() > 0.35 ? "#f2f6ff" : up ? "#38e07b" : "#ff4b55"; ctx.fillText(fig(), 84, mid);
        } else {
          const u = kind === "boxUp";
          ctx.fillStyle = u ? "rgba(32,168,84,0.55)" : "rgba(196,40,52,0.5)"; ctx.fillRect(16, 18, 330, CH - 36);
          ctx.strokeStyle = u ? "rgba(90,255,150,0.75)" : "rgba(255,110,120,0.7)"; ctx.lineWidth = 3; ctx.strokeRect(16, 18, 330, CH - 36);
          ctx.fillStyle = "#eafff1"; ctx.font = '500 54px "IBM Plex Mono", ui-monospace, monospace'; ctx.fillText((u ? "+" : "−") + chg(), 36, mid);
        }
        ctx.restore();
      }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
    }
    const COUNT = 110;
    const tickGeo = new THREE.PlaneGeometry(1, 0.25);
    const cells = new Float32Array(COUNT), seeds = new Float32Array(COUNT);
    const tickMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uSharp: { value: null }, uBlur: { value: null }, uFocus: { value: 8 }, uRange: { value: 6 }, uTime: { value: 0 }, uOpacity: { value: 0 } },
      vertexShader: [
        "attribute float aCell; attribute float aSeed; uniform float uTime; varying vec2 vUv; varying float vDepth; varying float vSeed;",
        "void main(){",
        "  vec2 cell = vec2(mod(aCell, " + COLS + ".0), floor(aCell / " + COLS + ".0));",
        "  vUv = vec2((cell.x + uv.x) / " + COLS + ".0, 1.0 - (cell.y + 1.0 - uv.y) / " + ROWS + ".0);",
        "  vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);",
        "  world.y += sin(uTime * 0.35 + aSeed * 6.2831) * 0.07; world.x += cos(uTime * 0.21 + aSeed * 12.0) * 0.05;",
        "  vec4 mv = viewMatrix * world; vDepth = -mv.z; vSeed = aSeed; gl_Position = projectionMatrix * mv;",
        "}"].join("\n"),
      fragmentShader: [
        "uniform sampler2D uSharp; uniform sampler2D uBlur; uniform float uFocus; uniform float uRange; uniform float uTime; uniform float uOpacity;",
        "varying vec2 vUv; varying float vDepth; varying float vSeed;",
        "void main(){",
        "  float blur = clamp(abs(vDepth - uFocus) / uRange, 0.0, 1.0);",
        "  vec4 c = mix(texture2D(uSharp, vUv), texture2D(uBlur, vUv), smoothstep(0.12, 0.8, blur));",
        "  float a = c.a * smoothstep(0.7, 3.2, vDepth) * (1.0 - smoothstep(24.0, 40.0, vDepth));",
        "  a *= (1.0 - blur * 0.5) * (0.8 + 0.2 * sin(uTime * 1.2 + vSeed * 40.0)) * uOpacity;",
        "  if (a < 0.004) discard;",
        "  gl_FragColor = vec4(c.rgb * 1.1, a);",
        "  #include <colorspace_fragment>",
        "}"].join("\n"),
    });
    const ticks = new THREE.InstancedMesh(tickGeo, tickMat, COUNT);
    (function () {
      let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      const m = new THREE.Matrix4(), qt = new THREE.Quaternion(), eu = new THREE.Euler();
      for (let i = 0; i < COUNT; i++) {
        const z = 10 - (i / COUNT) * 38 + (rnd() - 0.5) * 1.5, ang = rnd() * Math.PI * 2, rad = 2.6 + rnd() * 6.5;
        const px = Math.cos(ang) * rad * 1.35, py = Math.sin(ang) * rad * 0.62, w = 0.9 + rnd() * 1.5;
        eu.set((rnd() - 0.5) * 0.25, (rnd() - 0.5) * 0.7 - px * 0.03, 0); qt.setFromEuler(eu);
        m.compose(new THREE.Vector3(px, py, z), qt, new THREE.Vector3(w, w, 1)); ticks.setMatrixAt(i, m);
        cells[i] = Math.floor(rnd() * COLS * ROWS); seeds[i] = rnd();
      }
    })();
    tickGeo.setAttribute("aCell", new THREE.InstancedBufferAttribute(cells, 1));
    tickGeo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
    ticks.renderOrder = 2; ticks.frustumCulled = false;
    let atlasReady = false;
    (document.fonts && document.fonts.load ? document.fonts.load('500 70px "IBM Plex Mono"') : Promise.resolve()).catch(() => {}).then(() => {
      if (live !== L) return;
      tickMat.uniforms.uSharp.value = drawAtlas(0); tickMat.uniforms.uBlur.value = drawAtlas(9); atlasReady = true;
    });

    // chart ribbons drawn in as you scroll
    const ribbons = [];
    function ribbon(from, to, y, z, color, seed, reveal) {
      const n = 90; let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      const pos = new Float32Array(n * 6), ts = new Float32Array(n * 2), idx = [], w = 0.028; let v = 0;
      for (let i = 0; i < n; i++) {
        v += (rnd() - 0.48) * 0.22; v *= 0.97;
        const px = from + ((to - from) * i) / (n - 1), yy = y + v;
        pos.set([px, yy + w, z, px, yy - w, z], i * 6); ts[i * 2] = ts[i * 2 + 1] = i / (n - 1);
        if (i < n - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aT", new THREE.BufferAttribute(ts, 1)); g.setIndex(idx);
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uColor: { value: new THREE.Color(color) }, uReveal: { value: 0 }, uOpacity: { value: 0.9 } },
        vertexShader: "attribute float aT; varying float vT; void main(){ vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader: "uniform vec3 uColor; uniform float uReveal; uniform float uOpacity; varying float vT;\nvoid main(){ if (vT > uReveal) discard; float head = smoothstep(uReveal - 0.08, uReveal, vT); float a = (0.5 + 1.0 * head) * uOpacity * smoothstep(0.0, 0.05, vT); gl_FragColor = vec4(uColor * (1.2 + head * 2.0), a);\n#include <colorspace_fragment>\n}",
      });
      const mesh = new THREE.Mesh(g, mat); mesh.renderOrder = 3; mesh.frustumCulled = false; scene.add(mesh);
      ribbons.push({ mat, reveal });
    }
    ribbon(-9.5, -1.6, 2.5, 1.4, "#38e07b", 11, [0.3, 0.62]);
    ribbon(1.4, 9.5, -2.3, 0.8, "#ff4b55", 29, [0.42, 0.74]);
    ribbon(-7, 7, -3.2, -7, "#4d8dff", 53, [0.86, 1]);

    // grid floor with a travelling scan line
    const gridMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color("#2f7bff") }, uCam: { value: new THREE.Vector3() }, uScan: { value: 0 }, uOpacity: { value: 1 } },
      vertexShader: "varying vec3 vWorld; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
      fragmentShader: [
        "uniform vec3 uColor; uniform vec3 uCam; uniform float uScan; uniform float uOpacity; varying vec3 vWorld;",
        "void main(){",
        "  vec2 g = abs(fract(vWorld.xz * 0.5 - 0.5) - 0.5) / fwidth(vWorld.xz * 0.5);",
        "  float line = 1.0 - min(min(g.x, g.y), 1.0);",
        "  float d = distance(vWorld.xz, uCam.xz);",
        "  float fade = smoothstep(46.0, 6.0, d) * smoothstep(0.0, 4.0, d);",
        "  float scan = exp(-pow(vWorld.z - uScan, 2.0) * 0.08);",
        "  gl_FragColor = vec4(uColor * (1.0 + scan), line * fade * (0.22 + scan * 0.7) * uOpacity);",
        "  #include <colorspace_fragment>",
        "}"].join("\n"),
    });
    const grid = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), gridMat);
    grid.rotation.x = -Math.PI / 2; grid.position.set(0, -4.3, -18); grid.renderOrder = 1;
    scene.add(grid);

    // frame loop
    const P = new THREE.Vector3(), LK = new THREE.Vector3(), mouse = { x: 0, y: 0 };
    let vt = 0.04, last = performance.now(), slow = 0, frames = 0;
    const t0 = last;
    loop = function () {
      const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000), t = (now - t0) / 1000;
      last = now;
      if (frames < 120) { frames++; if (dt > 0.034) slow++; if (frames === 120 && slow > 60 && DPR > 1) { DPR = 1; renderer.setPixelRatio(1); resize(); } }
      const p = stage.p, k = 1 - Math.exp(-dt * 3);
      mouse.x += (stage.mx - mouse.x) * k; mouse.y += (stage.my - mouse.y) * k;
      const u = curveU(p);
      posCurve.getPoint(u, P); lookCurve.getPoint(u, LK);
      P.z += (1 - stage.intro) * 2.4; P.x += mouse.x * 0.25; P.y += mouse.y * 0.15;
      camera.position.copy(P); camera.lookAt(LK);
      const fade = 1 - span(p, 0.74, 0.86);
      videoMat.uniforms.uFade.value = fade;
      videoMat.uniforms.uDeep.value = span(p, 0.2, 0.8);
      videoMat.uniforms.uUseVideo.value = hasVideo ? 1 : 0;
      plane.visible = fade > 0.001;
      const r = rotAt(p); plane.rotation.set(r[0], r[1], 0);
      const sc = 1 + span(p, 0, 0.85) * 0.15; plane.scale.set(sc, sc, 1);
      if (hasVideo) {
        const target = 0.04 + stage.intro * 1.1 + p * (DURATION - 1.35);
        vt += (target - vt) * Math.min(1, dt * 7);
        const tt = Math.min(DURATION - 0.06, Math.max(0.04, vt));
        if (video.readyState >= 2 && !video.seeking && Math.abs(video.currentTime - tt) > 1 / 20) video.currentTime = tt;
      }
      const tu = tickMat.uniforms;
      tu.uTime.value = t;
      tu.uFocus.value = P.z > 1 ? Math.max(3.2, P.z - 0.6) : 7;
      const op = atlasReady ? (0.35 + 0.65 * stage.intro) * (1 + 0.7 * span(p, 0.74, 0.88)) : 0;
      tu.uOpacity.value += (op - tu.uOpacity.value) * Math.min(1, dt * 3);
      ribbons.forEach((rb) => { rb.mat.uniforms.uReveal.value = span(p, rb.reveal[0], rb.reveal[1]); rb.mat.uniforms.uOpacity.value = 0.9; });
      gridMat.uniforms.uCam.value.copy(P);
      gridMat.uniforms.uScan.value = 8 - ((t * 3.5) % 50);
      renderer.render(scene, camera);
    };
    L.scene = scene;
    renderer.setAnimationLoop(loop);
    syncLoop();
  }

  // Stop everything the page started: called before the site draws another page.
  function unmount() {
    const L = live; if (!L) return;
    live = null;
    L.off.forEach((f) => f());
    L.io.forEach((io) => io.disconnect());
    L.timers.forEach((t) => clearTimeout(t));
    if (L.ctx) L.ctx.revert();
    if (L.video) { L.video.pause(); L.video.removeAttribute("src"); L.video.load(); }
    if (L.renderer) {
      L.renderer.setAnimationLoop(null);
      if (L.scene) L.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { Object.values(o.material.uniforms || {}).forEach((u) => u.value && u.value.dispose && u.value.dispose()); o.material.dispose(); } });
      L.renderer.dispose(); L.renderer.forceContextLoss();
    }
  }

  root.LANDING = { html, mount, unmount };
})(typeof globalThis !== "undefined" ? globalThis : this);
