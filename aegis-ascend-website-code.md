# Aegis Ascend website: complete source code

Generated 2026-10-27 from branch claude/tool-access-link-prompt-wqfzbd. Every file below is reproduced in full, in the order the page loads it.

Not included: images (site/assets/*.jpg), the generated skyline.svg (rebuild it with site/tools/skyline.py), the built site/dist/ folder, and the standalone tools in optimizer/ and fundmix/.

## How the pieces fit

1. `site/build.py` reads `site/shell.html` and replaces `<!--SCRIPTS-->` with the scripts in this order: calc, optimizer, ui, domain, kit, seed data, store, public, portal, then the four role files.
2. The result is one self-contained page, `site/dist/index.html`, that runs the demo in the browser.
3. `python -m server.app` serves the same page from Flask, with `api-server.js` in place of the demo store.

## Contents

- **1. Page skeleton and styles**
  - `site/shell.html` (770 lines): Page skeleton and all CSS. The inline skyline template sits near the end.
- **2. Shared engine and helpers**
  - `site/calc.js` (312 lines): Calculation engine: best mix, stress tests, seeded simulation, readiness, term sheets.
  - `site/optimizer.js` (249 lines): Equity vs Debt Optimizer (browser port of the Python model).
  - `site/ui.js` (162 lines): Escaping, number formats, the click-any-number explain panel, small SVG charts.
  - `site/domain.js` (127 lines): Business arithmetic in integer paise; mirrors server/domain.py.
  - `site/kit.js` (242 lines): Workspace components: tables, dialogs, toasts, timelines, kanban, empty states.
- **3. Data layer**
  - `site/store.js` (1022 lines): Demo store: every action and rule of the server, kept in the browser.
  - `site/api-server.js` (31 lines): Adapter that sends the same calls to the Flask API.
- **4. Public website and sign-in**
  - `site/public.js` (316 lines): Home (scroll intro, live example), Services, Investors, Lenders, Pricing, Trust, About, Contact.
  - `site/portal.js` (584 lines): Sign-in and sign-up, the role-based workspace frame, page router.
- **5. Role workspaces**
  - `site/ws-founder.js` (151 lines): Founder: overview, fundraise, investors, deal room, cap table, data room, loans.
  - `site/ws-investor.js` (208 lines): Investor: portfolio, holdings, sell requests, opportunities, deal rooms.
  - `site/ws-lender.js` (172 lines): Lender: loan book, schedules, applications, monitoring, transfers, fees.
  - `site/ws-advisor.js` (518 lines): Advisor: today, pipeline, company file, directory, resales, revaluations, tools, admin.
- **6. Standalone pages and build tools**
  - `site/cma-lock.html` (38 lines): The 'Advisors only' page shown instead of the CMA tool to anyone else.
  - `site/build.py` (46 lines): Inlines everything into site/dist/index.html and writes the CMA pages.
  - `site/tools/skyline.py` (155 lines): Draws the New York skyline (site/assets/skyline.svg) and its inline copy.
- **7. Server (Flask)**
  - `server/app.py` (488 lines): Flask app: sign-in, sessions, API routes, uploads, page serving, admin commands.
  - `server/actions.py` (780 lines): Every workspace action with its permission and compliance checks.
  - `server/domain.py` (180 lines): Money, DSCR, repayment schedules, XIRR and limits.
  - `server/seed.py` (256 lines): The fictional sample companies, people and loans.
  - `server/requirements.txt` (1 lines): Python dependencies.
- **8. Tests**
  - `server/tests/test_server.py` (364 lines): Server rules, permissions and flows.
  - `server/tests/test_parity.py` (39 lines): Browser and server give identical numbers.
  - `server/tests/test_demo_store.py` (12 lines): Runs the demo store tests from Python.
  - `site/tests/store.test.js` (348 lines): Demo store matches the server's behaviour.

Total: 7571 lines.


---

## 1. Page skeleton and styles

The HTML shell every page renders inside, with all CSS (brand tokens, public pages, workspace, glass and skyline). The build puts the scripts in place of <!--SCRIPTS-->.

### `site/shell.html`

Page skeleton and all CSS. The inline skyline template sits near the end.

```html
<title>Aegis Ascend Financial Advisors</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Hanken+Grotesk:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap">
<style>
/* Two scenes. Public pages: the logo's world, obsidian ground, gold geometry, Cinzel capitals.
   Workspace: obsidian rail with the mark, a light stone work area for daytime desk work (dark at night). */
:root{
  --obsidian:#0D0E10;--obsidian-2:#151411;--obsidian-3:#1D1C18;--obsidian-4:#29271F;
  --gold-1:#E8C77B;--gold:#C9A04F;--gold-3:#8E6A2A;--gold-line:rgba(201,160,79,.28);--gold-wash:rgba(201,160,79,.09);
  --ivory:#F1ECE2;--ivory-2:#ABA497;--ivory-3:#7D776C;
  /* workspace (light) */
  --stone:#F2F1EE;--panel:#FFFFFF;--panel-2:#F7F6F3;--ink:#16171A;--ink-2:#47443E;--muted:#6A665D;--line:#E2DED5;--line-2:#CFC9BC;
  --gold-ink:#7B5C1F;--gold-ink-wash:rgba(176,132,51,.12);
  --s-debt:#3F6EA6;--s-equity:#B8892F;--s-mix:#1E8C68;--grid:#ECE9E2;--axis:#BDB6A8;
  --good:#1D7A4C;--good-bg:#E4F2E9;--warn:#946100;--warn-bg:#FBF0D9;--bad:#B0281E;--bad-bg:#FBE8E5;
  --f-display:"Cinzel","Trajan Pro",Georgia,serif;
  --f-sans:"Hanken Grotesk",system-ui,-apple-system,"Segoe UI",Arial,sans-serif;
  --ease-out:cubic-bezier(.16,1,.3,1);
  --r:6px;
  color-scheme:light;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --stone:#101114;--panel:#17191D;--panel-2:#1D2025;--ink:#EEE9DF;--ink-2:#CFC8BA;--muted:#A19A8C;--line:#2A2D33;--line-2:#3A3E45;
  --gold-ink:#DDB868;--gold-ink-wash:rgba(221,184,104,.12);
  --s-debt:#5C88C4;--s-equity:#B08433;--s-mix:#2FA38A;--grid:#23262C;--axis:#4A4E56;
  --good:#5CC48E;--good-bg:#132A1E;--warn:#E9B45A;--warn-bg:#2E2410;--bad:#FF8A7E;--bad-bg:#371816;color-scheme:dark}}
:root[data-theme="dark"]{
  --stone:#101114;--panel:#17191D;--panel-2:#1D2025;--ink:#EEE9DF;--ink-2:#CFC8BA;--muted:#A19A8C;--line:#2A2D33;--line-2:#3A3E45;
  --gold-ink:#DDB868;--gold-ink-wash:rgba(221,184,104,.12);
  --s-debt:#5C88C4;--s-equity:#B08433;--s-mix:#2FA38A;--grid:#23262C;--axis:#4A4E56;
  --good:#5CC48E;--good-bg:#132A1E;--warn:#E9B45A;--warn-bg:#2E2410;--bad:#FF8A7E;--bad-bg:#371816;color-scheme:dark}
*{box-sizing:border-box}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{background:var(--obsidian);color:var(--ivory);font-family:var(--f-sans);font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased;caret-color:var(--gold)}
::selection{background:var(--gold);color:var(--obsidian)}
a{color:var(--gold-1);text-underline-offset:3px;text-decoration-thickness:1px}
a:hover{color:var(--ivory)}
h1,h2,h3,h4{margin:0;line-height:1.15;text-wrap:balance;font-weight:600}
p{margin:0}
:focus-visible{outline:2px solid var(--gold);outline-offset:3px;border-radius:2px}
.container{max-width:1180px;margin:0 auto;padding-inline:clamp(16px,4vw,40px)}
.muted{color:var(--ivory-2)}.small{font-size:14px}
.row{display:flex;flex-wrap:wrap;align-items:center}.gap{gap:14px}.gap-s{gap:8px}.grow{flex:1;min-width:0}
.t-good{color:var(--good)}.t-warn{color:var(--warn)}.t-bad{color:var(--bad)}
.num,.kpi b,.tbl .num,.score,.pts,.meter-top b{font-variant-numeric:tabular-nums lining-nums}
*{scrollbar-color:var(--gold-3) transparent;scrollbar-width:thin}
::-webkit-scrollbar{width:10px;height:10px}::-webkit-scrollbar-thumb{background:var(--gold-3);border-radius:10px;border:3px solid transparent;background-clip:content-box}

/* ---------- the mark ---------- */
.mark{display:block;flex:none}
.wordmark{display:inline-flex;align-items:center;gap:12px;color:var(--ivory);text-decoration:none;white-space:nowrap}
.wordmark:hover{color:var(--ivory)}
.wm-text{display:grid;line-height:1}
.wm-text b{font-family:var(--f-display);font-weight:500;font-size:19px;letter-spacing:.16em}
.wm-text b span{color:var(--gold)}
.wm-text small{font-family:var(--f-display);font-size:9.5px;letter-spacing:.42em;color:var(--ivory-2);margin-top:6px;display:flex;align-items:center;gap:8px}
.wm-text small::before,.wm-text small::after{content:"";height:1px;width:14px;background:var(--gold)}

/* ---------- buttons ---------- */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font:inherit;font-weight:600;font-size:15px;letter-spacing:.01em;border-radius:3px;padding:11px 20px;border:1px solid transparent;cursor:pointer;text-decoration:none;white-space:nowrap;transition:background .2s var(--ease-out),color .2s var(--ease-out),border-color .2s var(--ease-out),transform .15s var(--ease-out)}
.btn:active{transform:translateY(1px)}
.btn.primary{background:var(--gold);color:var(--obsidian)}
.btn.primary:hover{background:var(--gold-1);color:var(--obsidian)}
.btn.ghost{background:transparent;color:var(--ivory);border-color:var(--gold-line)}
.btn.ghost:hover{border-color:var(--gold);color:var(--gold-1)}
.btn.lg{padding:14px 26px;font-size:16px}.btn.sm{padding:7px 12px;font-size:13.5px}.btn.block{width:100%}
.btn[disabled]{opacity:.45;cursor:not-allowed}
.linkbtn{background:none;border:0;padding:0;font:inherit;color:var(--gold-1);text-decoration:underline;text-underline-offset:3px;cursor:pointer}

/* ---------- public header ---------- */
.pub-head{position:sticky;top:env(safe-area-inset-top,0px);z-index:30;background:rgba(13,14,16,.86);backdrop-filter:saturate(1.2) blur(10px);-webkit-backdrop-filter:saturate(1.2) blur(10px);border-bottom:1px solid var(--gold-line)}
.pub-head-in{display:flex;align-items:center;gap:24px;min-height:74px}
.pub-nav{display:flex;gap:0;flex:1;justify-content:center;flex-wrap:nowrap}
.pub-nav a{color:var(--ivory-2);text-decoration:none;font-size:14.5px;padding:8px 11px;position:relative;white-space:nowrap}
.pub-nav a:hover{color:var(--ivory)}
.pub-nav a[aria-current]{color:var(--ivory)}
.pub-nav a[aria-current]::after{content:"";position:absolute;left:50%;bottom:-2px;width:7px;height:7px;background:var(--gold);transform:translateX(-50%) rotate(45deg)}
.pub-cta{display:flex;gap:10px}
.menu-btn{display:none}
@media (max-width:1240px){
  .pub-nav{display:none;position:absolute;left:0;right:0;top:74px;background:var(--obsidian-2);border-bottom:1px solid var(--gold-line);flex-direction:column;padding:12px clamp(16px,4vw,40px)}
  .pub-nav.open{display:flex}.pub-nav a{padding:12px 0;font-size:16px}.pub-nav a[aria-current]::after{left:auto;right:4px;top:50%;bottom:auto;transform:translateY(-50%) rotate(45deg)}
  .menu-btn{display:inline-flex;margin-left:auto}.pub-cta .ghost{display:none}
}
@media (max-width:600px){.pub-cta{display:none}.wm-text b{font-size:16px}.pub-head-in{gap:12px}}

/* ---------- intro: the emblem opens on scroll ---------- */
.intro{position:relative;height:250vh;background:radial-gradient(120% 70% at 50% 0%,#1B1A16 0%,var(--obsidian) 62%)}
.intro-stage{position:sticky;top:0;height:100vh;height:100svh;overflow:hidden;isolation:isolate;display:grid;place-items:center;padding:74px clamp(20px,4vw,48px) 24px}
.intro-stage::before{content:"";position:absolute;inset:0;z-index:-1;opacity:.5;pointer-events:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 .95 0 0 0 0 .85 0 0 0 .08 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.intro-mark{position:absolute;left:50%;top:calc(50% + 6px);width:min(48vh,72vw,470px);aspect-ratio:420/400;transform:translate(-50%,-58%);pointer-events:none;z-index:0}
.ia{position:absolute;inset:0;width:100%;height:100%;overflow:visible;will-change:transform,opacity;transform-origin:50% 60%}
.ia-d{transform-origin:50% 9.75%}
.intro-word{position:absolute;left:0;right:0;top:calc(50% + 6px + min(48vh,72vw,470px)*.46);text-align:center;display:grid;gap:8px;justify-items:center;z-index:1}
.iw-name{font-family:var(--f-display);font-weight:500;font-size:clamp(26px,3.4vw,44px);letter-spacing:.16em;color:var(--ivory);line-height:1}
.iw-name span{color:var(--gold-1)}
.iw-sub{display:flex;align-items:center;gap:14px;font-family:var(--f-display);font-size:clamp(11px,1.1vw,14px);letter-spacing:.42em;text-transform:uppercase;color:var(--gold)}
.iw-sub::before,.iw-sub::after{content:"";width:28px;height:1px;background:var(--gold)}
.intro-cue{margin-top:clamp(14px,3vh,30px);font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:var(--ivory-3);display:grid;justify-items:center;gap:8px}
.intro-cue::after{content:"";width:1px;height:34px;background:linear-gradient(var(--gold),transparent)}
.intro-copy{position:relative;z-index:2;width:min(720px,100%);text-align:center;display:grid;gap:22px;justify-items:center;pointer-events:none}
.intro-copy.live{pointer-events:auto}
.intro-copy>*{will-change:transform,opacity}
.intro h1{font-family:var(--f-display);font-weight:500;font-size:clamp(34px,4.6vw,64px);line-height:1.06;letter-spacing:.02em;color:var(--ivory)}
.intro h1 em{font-style:normal;color:var(--gold-1)}
.intro .lede{font-size:clamp(17px,1.6vw,19px);color:var(--ivory-2);max-width:50ch;text-wrap:pretty}
.intro .ctas{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:4px}
.intro.still{height:auto}.intro.still .intro-stage{position:relative;min-height:100svh;height:auto}
.strip-sec{padding:clamp(40px,7vw,80px) 0 clamp(56px,8vw,96px);background:var(--obsidian)}
.strip-sec .decision{margin-top:0}
.decision{width:min(820px,100%);margin:clamp(22px,4vh,40px) auto 0;background:var(--obsidian-2);border:1px solid var(--gold-line);border-radius:4px;padding:20px 22px;display:grid;gap:14px;text-align:left;box-shadow:0 24px 60px -30px rgba(0,0,0,.8)}
.decision-top{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:baseline}
.decision-top p{font-size:17px}.decision-top p b{color:var(--gold-1);font-weight:600}
.sample{font-size:12.5px;color:var(--ivory-3);letter-spacing:.04em}
.split{position:relative;height:14px;background:var(--obsidian-4);border-radius:2px;overflow:hidden;display:flex;gap:2px}
.split i{display:block;height:100%;transition:flex-basis 1.1s var(--ease-out)}
.split .d{background:#5C88C4}.split .e{background:var(--gold)}
.split-legend{display:flex;justify-content:space-between;font-size:14.5px;color:var(--ivory-2)}
.split-legend b{color:var(--ivory)}
.split-legend i{display:inline-block;width:9px;height:9px;transform:rotate(45deg);margin-right:8px;vertical-align:1px}
.decision-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:var(--gold-line);border:1px solid var(--gold-line)}
.decision-stats div{background:var(--obsidian-2);padding:12px 14px;display:grid;gap:2px}
.decision-stats small{font-size:12.5px;color:var(--ivory-3)}
.decision-stats b{font-size:21px;font-weight:600;color:var(--ivory)}
@media (max-width:640px){.decision-stats{grid-template-columns:minmax(0,1fr)}}
.decision .hint{font-size:13px;color:var(--ivory-3)}
/* the intro on first load: both A's draw upward, the diamond lands, the wordmark rises */
@media (prefers-reduced-motion:no-preference){
  .intro.play .ia path{stroke-dasharray:1;stroke-dashoffset:1;animation:draw 1.3s var(--ease-out) .1s forwards}
  .intro.play .ia-r path{animation-delay:.22s}
  .intro.play .dia{opacity:0;transform-box:fill-box;transform-origin:center;animation:land .8s var(--ease-out) 1.15s forwards}
  .intro.play .intro-word>*{opacity:0;animation:rise .9s var(--ease-out) forwards}
  .intro.play .iw-name{animation-delay:1.3s}.intro.play .iw-sub{animation-delay:1.45s}.intro.play .intro-cue{animation-delay:1.9s}
  .intro-cue::after{animation:cue 2.2s ease-in-out 2.4s infinite;transform-origin:top}
  @keyframes cue{0%,100%{transform:scaleY(.4);opacity:.4}50%{transform:none;opacity:1}}
  @keyframes draw{to{stroke-dashoffset:0}}
  @keyframes land{0%{opacity:0;transform:translateY(-14px) rotate(-45deg) scale(.6)}100%{opacity:1;transform:none}}
  @keyframes rise{from{opacity:0;transform:translateY(14px);filter:blur(4px)}to{opacity:1;transform:none;filter:none}}
}
/* scroll reveals (classes added by PUB.mountHome only when motion is allowed) */
@media (prefers-reduced-motion:no-preference){
  .mo .rv{opacity:0;transform:translateY(22px);transition:opacity .8s var(--ease-out),transform .8s var(--ease-out);transition-delay:calc(var(--i,0) * 80ms)}
  .mo .rv.shown{opacity:1;transform:none}
  .mo .anatomy.rv{transform:none}
  .mo .anatomy .ln path,.mo .anatomy .lead{stroke-dasharray:1;stroke-dashoffset:1}
  .mo .anatomy .dia,.mo .anatomy text,.mo .anatomy .dot{opacity:0}
  .mo .anatomy.shown .ln path{animation:draw 1.3s var(--ease-out) .1s forwards}
  .mo .anatomy.shown .dia{transform-box:fill-box;transform-origin:center;animation:land .7s var(--ease-out) 1.1s forwards}
  .mo .anatomy.shown .lead{animation:draw .6s var(--ease-out) 1.5s forwards}
  .mo .anatomy.shown .dot,.mo .anatomy.shown text{transition:opacity .6s var(--ease-out) 1.6s;opacity:1}
  .mo .method.rv{opacity:1;transform:none;border-top-color:transparent;background:linear-gradient(var(--gold-line),var(--gold-line)) 0 0/0 1px no-repeat;transition:background-size 1.6s var(--ease-out)}
  .mo .method.rv.shown{background-size:100% 1px}
  .mo .method li.rv::after{transform:rotate(45deg) scale(0);transition:transform .5s var(--ease-out);transition-delay:calc(var(--i,0) * 110ms + .2s)}
  .mo .method li.rv.shown::after{transform:rotate(45deg)}
  .mo .founder.rv{transform:none;transition-duration:.4s}
  .mo .founder.rv img{clip-path:inset(100% 0 0 0);transform:scale(1.08);transition:clip-path 1.1s var(--ease-out),transform 1.6s var(--ease-out);transition-delay:calc(var(--i,0) * 150ms)}
  .mo .founder.rv.shown img{clip-path:inset(0 0 0 0);transform:none}
  .mo .founder.rv.shown:hover img{transform:scale(1.03)}
  .mo .index a.rv{transition:opacity .7s var(--ease-out),transform .7s var(--ease-out),padding .25s var(--ease-out),background .25s var(--ease-out);transition-delay:calc(var(--i,0) * 60ms),calc(var(--i,0) * 60ms),0s,0s}
}
/* ---------- public sections ---------- */
.sec{padding-block:clamp(64px,10vw,120px);position:relative}
.sec.tone{background:var(--obsidian-2)}
.sec-head{display:grid;gap:14px;max-width:760px;margin-bottom:clamp(32px,5vw,56px)}
.sec h2,.page h1{font-family:var(--f-display);font-weight:500;font-size:clamp(28px,3.6vw,44px);letter-spacing:.02em;color:var(--ivory)}
.sec-head p,.lede-s{font-size:18px;color:var(--ivory-2);max-width:62ch;text-wrap:pretty}
.rule-top{border-top:1px solid var(--gold-line);padding-top:22px}
.promises{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(24px,4vw,56px)}
.promises h3{font-family:var(--f-display);font-weight:500;font-size:19px;letter-spacing:.06em;color:var(--gold-1);margin-bottom:10px}
.promises p{color:var(--ivory-2)}
@media (max-width:860px){.promises{grid-template-columns:minmax(0,1fr)}}
/* meaning */
.meaning{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:clamp(32px,6vw,88px);align-items:start}
@media (max-width:900px){.meaning{grid-template-columns:minmax(0,1fr)}}
.anatomy{width:100%;max-width:540px;height:auto;justify-self:center;overflow:visible;position:sticky;top:120px;align-self:start}
@media (max-width:900px){.anatomy{position:static}}
.anatomy .ln{fill:none;stroke:url(#goldv2);stroke-width:15}
.anatomy .lead{stroke:var(--ivory-3);stroke-width:1.2;fill:none}
.anatomy .dot{fill:var(--gold-1)}
.anatomy text{fill:var(--ivory-2);font-family:var(--f-sans);font-size:19px}
.anatomy text tspan.k{fill:var(--gold-1);font-family:var(--f-display);font-size:19px;letter-spacing:.12em}
.meaning-list{display:grid;gap:0}
.meaning-list div{display:grid;grid-template-columns:150px minmax(0,1fr);gap:20px;padding:18px 0;border-top:1px solid var(--gold-line)}
.meaning-list dt,.meaning-list .k{font-family:var(--f-display);letter-spacing:.14em;color:var(--gold-1);font-size:15px;padding-top:2px}
.meaning-list p{color:var(--ivory-2)}
.meaning-list dd{margin:0}
@media (max-width:520px){.meaning-list div{grid-template-columns:minmax(0,1fr);gap:4px}}
.motto{font-family:var(--f-display);font-size:clamp(20px,2.4vw,28px);letter-spacing:.14em;color:var(--gold-1);margin-top:28px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.motto::before{content:"";width:40px;height:1px;background:var(--gold)}
/* pillars as a ruled ledger */
.ledger{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:clamp(32px,6vw,80px)}
.ledger>div{display:grid;grid-template-columns:22px minmax(0,1fr);gap:16px;padding:22px 0;border-top:1px solid var(--gold-line)}
.ledger h3{font-size:18px;color:var(--ivory);margin-bottom:6px;font-weight:600}
.ledger p{color:var(--ivory-2)}
.dia-mark{width:10px;height:10px;background:var(--gold);transform:rotate(45deg);margin-top:8px}
@media (max-width:760px){.ledger{grid-template-columns:minmax(0,1fr)}}
/* method */
.method{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(8,minmax(0,1fr));border-top:1px solid var(--gold-line);counter-reset:s}
.method li{padding:22px 14px 0 0;display:grid;gap:8px;align-content:start;position:relative}
.method li::before{counter-increment:s;content:counter(s);font-family:var(--f-display);font-size:30px;color:var(--gold);line-height:1}
.method li::after{content:"";position:absolute;top:-5px;left:0;width:9px;height:9px;background:var(--gold);transform:rotate(45deg)}
.method b{font-size:16px;color:var(--ivory)}
.method span{font-size:14px;color:var(--ivory-2)}
@media (max-width:1060px){.method{grid-template-columns:repeat(4,minmax(0,1fr));row-gap:28px}}
@media (max-width:560px){.method{grid-template-columns:repeat(2,minmax(0,1fr))}}
.golden{margin-top:clamp(36px,5vw,56px);border-top:1px solid var(--gold);border-bottom:1px solid var(--gold-line);padding:22px 0;display:grid;grid-template-columns:minmax(0,260px) minmax(0,1fr);gap:24px}
.golden h3{font-family:var(--f-display);font-weight:500;font-size:20px;letter-spacing:.06em;color:var(--gold-1)}
.golden p{color:var(--ivory-2);max-width:70ch}
@media (max-width:760px){.golden{grid-template-columns:minmax(0,1fr)}}
/* features as an index */
.index{display:grid;border-top:1px solid var(--gold-line)}
.index a{display:grid;grid-template-columns:minmax(0,260px) minmax(0,1fr) auto;gap:24px;align-items:baseline;padding:22px 0;border-bottom:1px solid var(--gold-line);text-decoration:none;color:var(--ivory);transition:padding .25s var(--ease-out),background .25s var(--ease-out)}
.index a:hover{padding-inline:14px;background:var(--gold-wash);color:var(--ivory)}
.index b{font-family:var(--f-display);font-weight:500;font-size:19px;letter-spacing:.05em}
.index span{color:var(--ivory-2)}
.index em{font-style:normal;color:var(--gold-1);font-size:14px;white-space:nowrap}
@media (max-width:760px){.index a{grid-template-columns:minmax(0,1fr)}}
/* founders */
.founders{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(18px,3vw,36px)}
@media (max-width:760px){.founders{grid-template-columns:minmax(0,1fr);max-width:420px;margin-inline:auto}}
.founder{margin:0;display:grid;gap:16px}
.founder .frame{position:relative;aspect-ratio:4/5;overflow:hidden;border:1px solid var(--gold-line);background:#EDEDEB}
.founder .frame::after{content:"";position:absolute;inset:10px;border:1px solid rgba(201,160,79,.55);pointer-events:none}
.founder img{width:100%;height:100%;object-fit:cover;object-position:50% 12%;display:block;transition:transform .8s var(--ease-out)}
.founder:hover img{transform:scale(1.03)}
.founder figcaption{display:grid;gap:4px;text-align:center}
.founder figcaption b{font-family:var(--f-display);font-weight:500;font-size:22px;letter-spacing:.06em;color:var(--ivory)}
.founder figcaption span{font-size:13px;letter-spacing:.22em;text-transform:uppercase;color:var(--gold)}
/* closing */
.close{text-align:center;display:grid;justify-items:center;gap:20px}
.close h2{max-width:20ch}
.close p{color:var(--ivory-2);max-width:56ch}
/* inner pages */
.page{padding-block:clamp(48px,7vw,88px) clamp(64px,9vw,110px);display:grid;gap:clamp(28px,4vw,44px)}
.page>header{display:grid;gap:14px;max-width:820px;padding-bottom:clamp(20px,3vw,36px);border-bottom:1px solid var(--gold-line)}
.page.narrow{max-width:760px}
.card-sec{display:grid;gap:16px;min-width:0;padding-top:28px;border-top:1px solid var(--gold-line)}
.card-sec>h2,.card-sec>h3:first-child{font-family:var(--f-display);font-weight:500;font-size:clamp(22px,2.4vw,28px);letter-spacing:.03em;color:var(--ivory)}
.card-sec h3{font-size:18px;color:var(--gold-1);font-weight:600}
.card-sec p{color:var(--ivory-2);max-width:72ch}
.card-sec p b{color:var(--ivory)}
.three{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(20px,3vw,40px)}
.three .card-sec{border-top:1px solid var(--gold)}
@media (max-width:860px){.three{grid-template-columns:minmax(0,1fr)}}
.two-col{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(24px,4vw,48px)}
@media (max-width:860px){.two-col{grid-template-columns:minmax(0,1fr)}}
.steps{margin:0;padding-left:24px;display:grid;gap:8px;color:var(--ivory-2)}.steps li::marker{color:var(--gold);font-family:var(--f-display)}
.steps b{color:var(--ivory)}
.ticks{list-style:none;margin:0;padding:0;display:grid;gap:8px;color:var(--ivory-2)}
.ticks li{padding-left:24px;position:relative}.ticks li::before{content:"";position:absolute;left:3px;top:.6em;width:7px;height:7px;background:var(--gold);transform:rotate(45deg)}
.ticks b{color:var(--ivory)}
.note{border-top:1px solid var(--gold-line);padding-top:14px;color:var(--ivory-2)}
.roadmap{list-style:none;margin:0;padding:0;display:grid;gap:0}
.roadmap li{display:grid;grid-template-columns:44px minmax(0,1fr);gap:16px;padding:18px 0;border-top:1px solid var(--gold-line)}
.roadmap .step{font-family:var(--f-display);font-size:28px;color:var(--gold);line-height:1}
.cta-band{display:flex;flex-wrap:wrap;gap:24px;justify-content:space-between;align-items:center;border:1px solid var(--gold-line);padding:clamp(24px,4vw,40px);background:linear-gradient(90deg,var(--gold-wash),transparent 60%)}
.cta-band h2{font-family:var(--f-display);font-weight:500;font-size:clamp(22px,2.6vw,30px);letter-spacing:.03em;margin-bottom:6px}
.cta-band p{color:var(--ivory-2)}
/* tables (public dark) */
.tw{overflow-x:auto;max-width:100%}
.tbl{border-collapse:collapse;width:100%;font-size:15px}
.tbl th{text-align:left;font-size:12.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);font-weight:600;border-bottom:1px solid var(--gold);padding:10px 12px 10px 0;white-space:nowrap}
.tbl td{border-bottom:1px solid var(--gold-line);padding:12px 12px 12px 0;vertical-align:top;color:var(--ivory-2)}
.tbl td.strong{font-weight:600;color:var(--ivory);white-space:nowrap}
.tbl td b{color:var(--ivory)}
.tbl .num{text-align:right;white-space:nowrap}
/* forms (public dark) */
.form{display:grid;gap:16px}
.fields{display:grid;gap:14px}.f2{grid-template-columns:repeat(2,minmax(0,1fr))}.f3{grid-template-columns:repeat(3,minmax(0,1fr))}.f4{grid-template-columns:repeat(4,minmax(0,1fr))}.f5{grid-template-columns:repeat(5,minmax(0,1fr));align-items:end}
@media (max-width:900px){.f4,.f5,.f3{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:460px){.f2,.f3,.f4,.f5{grid-template-columns:minmax(0,1fr)}}
.fld{display:grid;gap:6px;min-width:0;align-content:end}
.fld>span:first-child{font-size:14px;color:var(--ivory-2)}
.fld.inline{display:flex;align-items:center;gap:10px}
.in{display:flex;border:1px solid var(--obsidian-4);border-radius:3px;background:var(--obsidian-2);overflow:hidden;min-width:0;transition:border-color .15s,box-shadow .15s}
.in:focus-within{border-color:var(--gold);box-shadow:0 0 0 3px rgba(201,160,79,.2)}
.in input,.in select,.in textarea{flex:1;min-width:0;width:100%;border:0;background:transparent;color:var(--ivory);font:inherit;font-size:15px;padding:10px 12px;outline:none;font-variant-numeric:tabular-nums}
.in select option{background:var(--obsidian-2);color:var(--ivory)}
.in em{font-style:normal;font-size:13px;color:var(--ivory-3);padding:10px 11px;border-left:1px solid var(--obsidian-4);white-space:nowrap}
.in.sm input{padding:6px 9px;width:110px;font-size:14px}
.checkset{display:grid;gap:10px;font-size:15px}
.checkset input,.checks input{accent-color:var(--gold);width:16px;height:16px;vertical-align:-3px}
.form-err{color:var(--bad);font-size:14px}
fieldset.seg{border:0;padding:0;margin:0;display:flex;gap:8px;flex-wrap:wrap}
fieldset.seg legend{font-size:14px;color:var(--ivory-2);margin-bottom:8px}
.seg label{flex:1;position:relative}.seg input{position:absolute;opacity:0}
.seg span{display:block;text-align:center;border:1px solid var(--obsidian-4);border-radius:3px;padding:10px;cursor:pointer;font-weight:500}
.seg input:checked+span{border-color:var(--gold);background:var(--gold-wash);color:var(--gold-1)}
.seg input:focus-visible+span{outline:2px solid var(--gold);outline-offset:2px}
.slider{display:grid;gap:6px;font-size:14.5px}.slider input{width:100%;accent-color:var(--gold)}
.calc-out{display:grid;gap:14px}
.total{font-size:16px;color:var(--ivory-2)}.total b{color:var(--ivory)}
/* notices + chips */
.notice{border:1px solid var(--line-2);background:var(--panel-2);color:var(--ink);border-radius:3px;padding:12px 16px;font-size:15px}
.notice.ok{border-color:var(--good);background:var(--good-bg)}.notice.bad{border-color:var(--bad);background:var(--bad-bg)}
.pub .notice{background:var(--obsidian-3);border-color:var(--gold-line);color:var(--ivory)}
.pub .notice.ok{border-color:var(--gold)}.pub .notice.bad{border-color:#E06C5F}
.toast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(22px + env(safe-area-inset-bottom,0px));z-index:70;max-width:min(560px,92vw);box-shadow:0 14px 40px rgba(0,0,0,.28);animation:toastIn .25s var(--ease-out)}
@keyframes toastIn{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}
.chip{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;padding:3px 10px;border-radius:2px;background:var(--panel-2);color:var(--ink-2);border:1px solid var(--line);white-space:nowrap}
.chip::before{content:"";width:6px;height:6px;background:currentColor;transform:rotate(45deg);opacity:.85}
.chip.ok{background:var(--good-bg);color:var(--good);border-color:transparent}.chip.warn{background:var(--warn-bg);color:var(--warn);border-color:transparent}.chip.bad{background:var(--bad-bg);color:var(--bad);border-color:transparent}
.pub .chip{background:var(--obsidian-3);color:var(--ivory-2);border-color:var(--gold-line)}
.pub .chip.ok{color:var(--gold-1)}
.stamp{display:inline-flex;align-items:center;gap:8px;font-family:var(--f-display);font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold-ink);border:1px solid currentColor;border-radius:2px;padding:4px 10px}
.stamp::before{content:"";width:7px;height:7px;background:currentColor;transform:rotate(45deg)}
.pub .stamp{color:var(--gold-1)}
/* glass-box numbers */
.gx{font:inherit;color:inherit;background:none;border:0;padding:0 1px;cursor:pointer;border-bottom:1px dashed var(--gold);font-variant-numeric:tabular-nums;transition:background .15s}
.gx:hover{background:var(--gold-wash)}
#explain{position:fixed;inset:0;z-index:60;background:rgba(5,6,8,.55);display:flex;justify-content:flex-end}
#explain[hidden]{display:none!important}
.xp{width:min(480px,100%);height:100%;background:var(--obsidian-2);color:var(--ivory);border-left:1px solid var(--gold);padding:26px;overflow:auto;padding-top:calc(26px + env(safe-area-inset-top,0px));animation:xpIn .3s var(--ease-out)}
@keyframes xpIn{from{transform:translateX(24px);opacity:.4}to{transform:none;opacity:1}}
@media (prefers-reduced-motion:reduce){.xp,.toast{animation:none}}
.xp-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px}
.xp-head h2{font-family:var(--f-display);font-weight:500;font-size:17px;letter-spacing:.12em;color:var(--gold-1)}
.xp-body{display:grid;gap:12px}
.xp-body h3{font-size:20px}
.xp-label{font-size:12.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--gold)}
.formula{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-size:13.5px;background:var(--obsidian);border:1px solid var(--gold-line);border-radius:3px;padding:12px 14px;white-space:pre-wrap;margin:0;color:var(--ivory)}
.xp .tbl td{color:var(--ivory-2)}
.xp-ver{font-size:13px;color:var(--ivory-3);border-top:1px solid var(--gold-line);padding-top:12px}
.src{display:inline-block;font-style:normal;font-size:10.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;padding:1px 7px;border-radius:2px;border:1px solid;vertical-align:1px}
.src-founder{color:#7FA6DA}.src-benchmark{color:var(--gold)}.src-advisor{color:#5FC4A7}.src-engine,.src-fee,.src-term,.src-tax,.src-lender,.src-investor{color:var(--ivory-3)}
.ws .src-founder{color:var(--s-debt)}.ws .src-benchmark{color:var(--gold-ink)}.ws .src-advisor{color:var(--s-mix)}.ws .src-engine{color:var(--muted)}
/* footer */
.pub-foot{border-top:1px solid var(--gold-line);padding-block:48px 32px;background:var(--obsidian)}
.foot-grid{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:28px}
.foot-grid h4{font-family:var(--f-display);font-weight:500;font-size:13px;letter-spacing:.2em;color:var(--gold);margin-bottom:12px}
.foot-grid a{display:block;color:var(--ivory-2);text-decoration:none;font-size:15px;padding-block:4px}
.foot-grid a:hover{color:var(--ivory)}
.foot-grid a.wordmark{display:inline-flex;padding:0}
.foot-grid p{margin-top:16px;max-width:36ch;color:var(--ivory-2)}
.fine{margin-top:32px;padding-top:20px;border-top:1px solid var(--gold-line);font-size:13px;color:var(--ivory-3)}
@media (max-width:760px){.foot-grid{grid-template-columns:1fr 1fr}.foot-grid>div:first-child{grid-column:1/-1}}
/* auth */
.auth{min-height:72vh;display:grid;place-items:start center;padding:clamp(40px,7vw,80px) 16px}
.auth-card{width:min(480px,100%);display:grid;gap:18px;background:var(--obsidian-2);border:1px solid var(--gold-line);border-top:2px solid var(--gold);padding:clamp(24px,4vw,36px)}
.auth-card h1{font-family:var(--f-display);font-weight:500;font-size:30px;letter-spacing:.04em}
.demo-box{border-top:1px solid var(--gold-line);padding-top:16px;display:grid;gap:10px}
.demo-box b{font-family:var(--f-display);letter-spacing:.1em;color:var(--gold-1);font-weight:500}
.demo-roles{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.role-btn{display:grid;gap:2px;text-align:left;font:inherit;background:var(--obsidian-3);border:1px solid var(--obsidian-4);border-radius:3px;padding:12px;cursor:pointer;color:var(--ivory);transition:border-color .15s,background .15s}
.role-btn:hover{border-color:var(--gold);background:var(--obsidian-4)}.role-btn span{font-size:12.5px;color:var(--ivory-3)}
@media (max-width:400px){.demo-roles{grid-template-columns:1fr}}
code{font-size:.92em;color:var(--gold-1)}

/* ---------- workspace (operate) ---------- */
.ws{display:grid;grid-template-columns:248px minmax(0,1fr);min-height:100vh;background:var(--stone);color:var(--ink);--surface:var(--panel)}
.ws a{color:var(--gold-ink)}
.ws ::selection{background:var(--gold);color:var(--obsidian)}
.ws-rail{background:var(--obsidian);color:var(--ivory);display:flex;flex-direction:column;gap:6px;padding:20px 14px;position:sticky;top:0;height:100vh;overflow-y:auto;border-right:1px solid var(--gold-line)}
.ws-rail .wordmark{padding:4px 8px 18px;border-bottom:1px solid var(--gold-line);margin-bottom:10px}
.ws-rail .wm-text b{font-size:15px}
.ws-rail .wm-text small{font-size:8px;letter-spacing:.3em}
.ws-rail .mark{width:30px;height:28px}
.ws-nav{display:flex;flex-direction:column;gap:1px}
.ws-nav a{color:var(--ivory-2);text-decoration:none;padding:9px 12px 9px 26px;border-radius:3px;font-size:15px;position:relative;transition:background .15s,color .15s}
.ws-nav a:hover{background:var(--obsidian-3);color:var(--ivory)}
.ws-nav a[aria-current]{color:var(--gold-1);background:var(--obsidian-3);font-weight:600}
.ws-nav a[aria-current]::before{content:"";position:absolute;left:10px;top:50%;width:7px;height:7px;background:var(--gold);transform:translateY(-50%) rotate(45deg)}
.ws-nav .group{font-size:11.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--ivory-3);padding:14px 12px 6px}
.ws-rail .rail-foot{margin-top:auto;padding:14px 8px 0;border-top:1px solid var(--gold-line);display:grid;gap:10px;font-size:13px}
.ws-rail .rail-foot b{color:var(--ivory);font-weight:600;font-size:14.5px}
.ws-rail .rail-foot span{color:var(--ivory-3)}
.ws-rail .linkbtn{color:var(--ivory-3);font-size:13px;text-align:left}
.ws-rail .btn.ghost{color:var(--ivory)}
.ws-main{padding:28px clamp(16px,3vw,36px) 64px;display:grid;grid-template-columns:minmax(0,1fr);gap:20px;align-content:start;min-width:0;animation:wsIn .2s var(--ease-out)}
@keyframes wsIn{from{opacity:.6}to{opacity:1}}
@media (prefers-reduced-motion:reduce){.ws-main{animation:none}}
.ws-demo{font-size:12.5px;color:var(--warn);background:var(--warn-bg);border-radius:2px;padding:6px 10px;justify-self:start}
@media (max-width:900px){
  .ws{grid-template-columns:minmax(0,1fr)}
  .ws-rail{position:static;height:auto;flex-direction:column;padding:12px 14px}
  .ws-rail .wordmark{border:0;padding:4px 0 8px;margin:0}
  .ws-nav{flex-direction:row;overflow-x:auto;gap:2px;padding-bottom:6px}
  .ws-nav a{white-space:nowrap;padding:8px 12px 8px 24px}
  .ws-nav .group{display:none}
  .ws-rail .rail-foot{flex-direction:row;display:flex;align-items:center;justify-content:space-between;padding-top:10px;margin-top:4px}
  .ws-main{padding:20px 16px 48px}
}
.ws h1,.ws h2,.ws h3{color:var(--ink)}
.pg-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;padding-bottom:14px;border-bottom:1px solid var(--line)}
.pg-head h1{font-family:var(--f-display);font-weight:500;font-size:clamp(24px,2.6vw,32px);letter-spacing:.03em;margin-bottom:6px}
.pg-head p{max-width:76ch;color:var(--muted)}
.ws .muted{color:var(--muted)}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:20px;display:grid;gap:14px;min-width:0;align-content:start}
.panel h2{font-size:18px;font-weight:600;letter-spacing:.005em}
.panel h3{font-size:15.5px;font-weight:600}
.grid2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px}
@media (max-width:1000px){.grid2{grid-template-columns:minmax(0,1fr)}}
.kpis{display:grid;gap:12px}.k3{grid-template-columns:repeat(3,minmax(0,1fr))}.k4{grid-template-columns:repeat(4,minmax(0,1fr))}
@media (max-width:1150px){.k4{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:560px){.k3,.k4{grid-template-columns:minmax(0,1fr)}}
.kpi{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:14px 16px;display:grid;gap:3px;align-content:start;min-width:0}
.panel .kpi{background:var(--panel-2);border-color:transparent}
.kpi small{font-size:13px;color:var(--muted)}
.kpi b{font-size:22px;font-weight:600;overflow-wrap:anywhere;color:var(--ink)}
.kpi span{font-size:13px;color:var(--muted)}
.kpi.accent{border-color:var(--gold);box-shadow:inset 0 2px 0 var(--gold)}
.kpi.accent b::before{content:"";display:inline-block;width:9px;height:9px;background:var(--gold);transform:rotate(45deg);margin-right:10px;vertical-align:3px}
/* workspace light-scene overrides for shared components */
.ws .fld>span:first-child{color:var(--ink-2);font-size:13.5px}
.ws .in{background:var(--panel);border-color:var(--line-2);border-radius:4px}
.ws .in:focus-within{border-color:var(--gold-ink);box-shadow:0 0 0 3px var(--gold-ink-wash)}
.ws .in input,.ws .in select,.ws .in textarea{color:var(--ink);font-size:14.5px;padding:8px 10px}
.ws .in select option{background:var(--panel);color:var(--ink)}
.ws .in em{color:var(--muted);border-left-color:var(--line);background:var(--panel-2);padding:8px 9px;font-size:12.5px}
.ws .checkset,.ws .checks{color:var(--ink-2)}
.ws .btn.primary{background:var(--obsidian);color:var(--gold-1)}
.ws .btn.primary:hover{background:var(--obsidian-3);color:var(--gold-1)}
:root[data-theme="dark"] .ws .btn.primary{background:var(--gold);color:var(--obsidian)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .ws .btn.primary{background:var(--gold);color:var(--obsidian)}}
.ws .btn.ghost{color:var(--ink);border-color:var(--line-2)}
.ws .btn.ghost:hover{border-color:var(--gold-ink);color:var(--gold-ink)}
.ws .linkbtn{color:var(--gold-ink)}
.ws .tbl{font-size:14px}
.ws .tbl th{color:var(--muted);border-bottom:1.5px solid var(--line-2);font-size:12px;letter-spacing:.08em;padding:8px 10px}
.ws .tbl td{color:var(--ink);border-bottom:1px solid var(--line);padding:9px 10px}
.ws .tbl td.strong{color:var(--ink)}
.ws .gx{border-bottom-color:var(--gold-ink)}
.ws .gx:hover{background:var(--gold-ink-wash)}
.ws .seg span{border-color:var(--line-2);color:var(--ink-2)}
.ws .seg input:checked+span{border-color:var(--gold-ink);background:var(--gold-ink-wash);color:var(--gold-ink)}
.ws fieldset.seg legend{color:var(--ink-2)}
.ws details summary{color:var(--gold-ink)}
.ws .ws-rail .btn.ghost{color:var(--ivory);border-color:var(--gold-line)}
.ws .ws-rail .btn.ghost:hover{color:var(--gold-1);border-color:var(--gold)}
.twin{display:grid;grid-template-columns:minmax(300px,380px) minmax(0,1fr);gap:20px;align-items:start}
.twin-out{display:grid;gap:20px;min-width:0}
.twin-in{position:sticky;top:20px;max-height:calc(100vh - 40px);overflow:auto}
@media (max-width:1100px){.twin{grid-template-columns:minmax(0,1fr)}.twin-in{position:static;max-height:none}}
.rule{font-family:var(--f-display);font-weight:500;font-size:21px;line-height:1.4;letter-spacing:.01em;border-top:1px solid var(--gold);padding-top:14px}
.narr{font-size:17px;line-height:1.65;max-width:72ch}
.checklist,.checks{list-style:none;margin:0;padding:0;display:grid;gap:9px}
.checklist li,.checks li{padding-left:28px;position:relative}
.checklist li::before,.checks li::before{content:"";position:absolute;left:3px;top:6px;width:11px;height:11px;border:1.5px solid var(--line-2);transform:rotate(45deg)}
.checklist li.done::before,.checks li.done::before{background:var(--gold);border-color:var(--gold)}
.checklist li.done a{color:var(--muted);text-decoration:line-through}
.item{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;padding-block:12px;border-bottom:1px solid var(--line)}
.item.col{display:grid}.item>div:first-child{display:grid}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:16px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:18px;display:grid;gap:10px;align-content:start}
.card-top{display:flex;justify-content:space-between;gap:10px}.card-top>div{display:grid}
.score{font-family:var(--f-display);font-size:28px;color:var(--gold-ink);line-height:1}.score small{font-family:var(--f-sans);font-size:12px;color:var(--muted)}
.reasons{margin:0;padding-left:18px;font-size:14px;color:var(--ink-2);display:grid;gap:2px}
.docs{list-style:none;margin:0;padding:0}.docs li{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)}
.flags{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.flags li{padding:9px 12px 9px 30px;background:var(--panel-2);border-radius:3px;font-size:14.5px;position:relative}
.flags li::before{content:"";position:absolute;left:12px;top:15px;width:8px;height:8px;transform:rotate(45deg);background:var(--line-2)}
.flags li.high::before{background:var(--bad)}.flags li.medium::before{background:var(--warn)}.flags li.low::before{background:var(--s-debt)}
.flags b{margin-right:6px}
.pub .flags li{background:var(--obsidian-3);color:var(--ivory-2)}
.factors{list-style:none;margin:0;padding:0}.factors li{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);font-size:14.5px}
.meter{display:grid;gap:8px}.meter-top{display:flex;justify-content:space-between;align-items:baseline}.meter-top b{font-family:var(--f-display);font-size:30px;font-weight:500}.meter-top small{font-size:13px;color:var(--muted)}
.meter-bar{height:8px;background:var(--panel-2);border-radius:1px;overflow:hidden}.meter-bar i{display:block;height:100%;transition:width .4s var(--ease-out)}
.meter-bar .good{background:var(--good)}.meter-bar .warn{background:var(--warn)}.meter-bar .bad{background:var(--bad)}
.tabs{display:flex;gap:4px;border-bottom:1px solid var(--line);overflow-x:auto}
.tabs button{font:inherit;background:none;border:0;padding:10px 14px;cursor:pointer;color:var(--muted);border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap}
.tabs button[aria-selected="true"]{color:var(--ink);border-color:var(--gold);font-weight:600}
.progress{display:flex;gap:4px;margin-top:6px}.progress i{width:9px;height:9px;transform:rotate(45deg);border:1px solid var(--line-2)}.progress i.on{background:var(--gold);border-color:var(--gold)}
.tsteps{margin:0;padding-left:22px;display:grid;gap:4px}.tsteps li.done{color:var(--muted);text-decoration:line-through}
.nda{display:grid;gap:10px;background:var(--panel-2);border-radius:3px;padding:16px}
.empty{border:1px dashed var(--line-2);border-radius:var(--r);padding:32px;text-align:center;display:grid;gap:6px;color:var(--ink-2)}
.ws .note{color:var(--ink-2);border-top-color:var(--line)}
.tool-launch{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:24px;align-items:center}
@media (max-width:900px){.tool-launch{grid-template-columns:minmax(0,1fr)}}
.ws .ticks{color:var(--ink-2)}.ws .ticks b{color:var(--ink)}
.ws .steps{color:var(--ink-2)}
/* charts */
.chart{width:100%;height:auto;display:block;overflow:visible}
.chart .tick{font-size:11.5px;fill:var(--muted);font-variant-numeric:tabular-nums}
.chart .lab{font-size:13px;fill:var(--ink-2)}
.chart .val,.chart .dl{font-size:12.5px;fill:var(--ink);font-weight:600;font-variant-numeric:tabular-nums}
.chart .reflab{font-size:11.5px;fill:var(--ink-2)}
.pub .chart .tick{fill:var(--ivory-3)}.pub .chart .lab,.pub .chart .reflab{fill:var(--ivory-2)}.pub .chart .val,.pub .chart .dl{fill:var(--ivory)}
.pub{--grid:rgba(201,160,79,.14);--s-debt:#5C88C4;--s-equity:#B08433;--s-mix:#2FA38A}
.chartwrap{position:relative}
.legend{display:flex;flex-wrap:wrap;gap:16px;font-size:13px;color:var(--ink-2);margin-top:6px}
.pub .legend{color:var(--ivory-2)}
.legend i{display:inline-block;width:14px;height:3px;border-radius:2px;margin-right:6px;vertical-align:middle}
.legend i.dash{background:none;border-top:2px dashed;height:0}
.tip{position:absolute;top:6px;background:var(--panel);color:var(--ink);border:1px solid var(--line-2);border-radius:3px;padding:8px 10px;font-size:13px;box-shadow:0 10px 24px rgba(0,0,0,.14);pointer-events:none;min-width:160px}
.tip i{display:inline-block;width:8px;height:8px;margin-right:6px}
/* optimizer page */
.opt-best{display:grid;gap:6px}
.opt-best h2{font-family:var(--f-display);font-weight:500;font-size:clamp(20px,2.2vw,26px);letter-spacing:.02em}
.opt-best h2 b{color:var(--gold-ink);font-weight:600}
.suggest h3{margin-top:6px}
.suggest ul{margin:0;padding-left:20px;display:grid;gap:6px;color:var(--ink-2)}
.suggest ul b{color:var(--ink)}

/* ---------- dashboards: shared components ---------- */
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.block{display:block}.wrap{flex-wrap:wrap}.strike{text-decoration:line-through}
.k5{grid-template-columns:repeat(5,minmax(0,1fr))}.k6{grid-template-columns:repeat(6,minmax(0,1fr))}
@media (max-width:1250px){.k5,.k6{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:700px){.k5,.k6{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:420px){.k5,.k6{grid-template-columns:minmax(0,1fr)}}
.ws .panel,.ws>.ws-main>.kpis>.kpi{box-shadow:0 1px 2px rgba(22,23,26,.04),0 6px 18px -12px rgba(22,23,26,.18)}
.ws .kpis>.kpi{transition:transform .2s var(--ease-out),box-shadow .2s var(--ease-out)}
.ws .kpis>.kpi:hover{transform:translateY(-2px);box-shadow:0 2px 4px rgba(22,23,26,.05),0 12px 26px -14px rgba(22,23,26,.28)}
.panel-head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.panel-head>div{display:grid;gap:2px}
.t-good,.kpi .t-good{color:var(--good)}.t-bad,.kpi .t-bad{color:var(--bad)}.t-warn,.kpi .t-warn{color:var(--warn)}
.kpi .fig,.fig{font:inherit;color:inherit;letter-spacing:inherit}
.fig{display:inline-block;border-radius:3px;transition:background-color .6s var(--ease-out)}
.fig.up{background:var(--good-bg)}.fig.down{background:var(--bad-bg)}
.badge{display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 6px;border-radius:10px;background:var(--gold);color:var(--obsidian);font-size:11.5px;font-weight:700;margin-left:6px;vertical-align:1px}
.btn.danger{background:var(--bad);color:#fff;border-color:var(--bad)}.btn.danger:hover{filter:brightness(1.08)}
.btn:focus-visible,.linkbtn:focus-visible,.dt-sort:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,summary:focus-visible{outline:2px solid var(--gold-ink);outline-offset:2px}
.btn:active:not([disabled]){transform:translateY(1px) scale(.99)}
/* data tables */
.ws .tbl td b{color:var(--ink)}
.dt-tbl td:first-child{min-width:170px}
.ws .panel>svg.chart,.ws .panel>div>svg.chart{max-width:880px}
.kanban{max-width:100%;min-width:0;position:relative}
.kb-move,.dt-search,.dt-filter,.kb-card{position:relative}
.dt{display:grid;gap:10px;min-width:0}
.dt-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.dt-search input,.dt-filter select{font:inherit;font-size:14px;color:var(--ink);background:var(--panel);border:1px solid var(--line-2);border-radius:4px;padding:7px 10px;min-width:0}
.dt-search input{width:min(260px,100%)}
.dt-count{font-size:13px;color:var(--muted);margin-right:auto}
.dt-export{display:flex;gap:6px}
.dt-wrap{max-height:min(70vh,760px);overflow:auto;border:1px solid var(--line);border-radius:4px}
.dt-tbl thead th{position:sticky;top:0;z-index:2;background:var(--panel);box-shadow:inset 0 -1.5px 0 var(--line-2)}
.ws .dt-tbl th{border-bottom:0}
.dt-tbl tbody tr{transition:background .12s}
.dt-tbl tbody tr:hover{background:var(--panel-2)}
.dt-tbl td:first-child,.dt-tbl th:first-child{padding-left:12px}
.dt-sort{font:inherit;letter-spacing:inherit;text-transform:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer;display:inline-flex;align-items:center;gap:4px;font-weight:600}
.dt-arrow{width:10px;height:10px;fill:none;stroke:currentColor;stroke-width:1.6;opacity:.25;transition:transform .2s}
.dt-arrow.asc,.dt-arrow.desc{opacity:1;color:var(--gold-ink)}.dt-arrow.desc{transform:rotate(180deg)}
.dt-tbl th.num .dt-sort{flex-direction:row-reverse}
.dt-tbl td.sel,.dt-tbl th.sel{width:34px}
.dt-pager{display:flex;gap:10px;align-items:center;justify-content:flex-end;font-size:13.5px;color:var(--muted)}
.row-bad td{background:var(--bad-bg)}.row-muted td{color:var(--muted)}
input[type=checkbox]{accent-color:var(--gold-ink);width:16px;height:16px}
@media (max-width:720px){
  .dt-wrap{max-height:none;border:0;overflow:visible}
  .dt-tbl thead{display:none}
  .dt-tbl,.dt-tbl tbody,.dt-tbl tr,.dt-tbl td{display:block;width:100%}
  .dt-tbl tr{border:1px solid var(--line);border-radius:var(--r);padding:8px 12px;margin-bottom:10px;background:var(--panel)}
  .ws .dt-tbl td{display:grid;grid-template-columns:minmax(96px,40%) minmax(0,1fr);gap:10px;border-bottom:1px solid var(--line);padding:7px 0;text-align:left}
  .ws .dt-tbl td:last-child{border-bottom:0}
  .dt-tbl td::before{content:attr(data-label);font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
  .dt-tbl td.num{text-align:left}
  .dt-tbl td.sel{display:block}.dt-tbl td.sel::before{content:none}
}
/* dialogs and toasts */
dialog.modal{border:1px solid var(--line-2);border-radius:8px;padding:0;width:min(560px,calc(100vw - 32px));background:var(--panel);color:var(--ink);box-shadow:0 24px 70px -20px rgba(0,0,0,.45)}
dialog.modal::backdrop{background:rgba(13,14,16,.55);backdrop-filter:blur(2px)}
dialog.modal[open]{animation:mdlIn .22s var(--ease-out)}
@keyframes mdlIn{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}
.modal-in{display:grid;gap:14px;padding:22px}
.modal-in h2{font-size:19px;font-weight:600}
.modal-text{display:grid;gap:8px;color:var(--ink-2);font-size:14.5px}
.modal-text ul{margin:0;padding-left:18px}
.modal .fields{display:grid;gap:12px}
.modal .fld{display:grid;gap:6px}
.modal .fld>span:first-child{font-size:13.5px;color:var(--ink-2)}
.modal .in{display:flex;border:1px solid var(--line-2);border-radius:4px;background:var(--panel)}
.modal .in input,.modal .in select,.modal .in textarea{flex:1;min-width:0;font:inherit;font-size:14.5px;color:var(--ink);background:transparent;border:0;padding:9px 10px;outline:none}
.modal .in:focus-within{border-color:var(--gold-ink);box-shadow:0 0 0 3px var(--gold-ink-wash)}
.modal .in em{font-style:normal;color:var(--muted);border-left:1px solid var(--line);padding:9px;font-size:12.5px;background:var(--panel-2)}
.modal-act{justify-content:flex-end}
.modal .btn.primary{background:var(--obsidian);color:var(--gold-1)}
.chk{display:inline-flex;gap:8px;align-items:flex-start;cursor:pointer}
.chk input{margin-top:3px;flex:none}
#toasts{position:fixed;right:20px;bottom:20px;z-index:90;display:grid;gap:8px;width:min(420px,calc(100vw - 32px))}
.toast2{background:var(--obsidian);color:var(--ivory);border:1px solid var(--gold-line);border-radius:6px;padding:12px 16px 12px 40px;font-size:14.5px;position:relative;box-shadow:0 14px 36px -12px rgba(0,0,0,.5);animation:tIn .28s var(--ease-out)}
.toast2::before{content:"";position:absolute;left:16px;top:17px;width:9px;height:9px;transform:rotate(45deg);background:var(--gold)}
.toast2.bad::before{background:#FF8A7E}
.toast2.out{opacity:0;transform:translateX(16px);transition:opacity .25s,transform .25s}
@keyframes tIn{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}
/* empty, skeleton, motion */
.empty-art{width:96px;height:64px;color:var(--line-2);justify-self:center;margin-bottom:6px}
.empty .btn{justify-self:center;margin-top:6px}
.sk{display:block;height:14px;border-radius:3px;margin:8px 0;background:linear-gradient(90deg,var(--panel-2) 25%,var(--line) 50%,var(--panel-2) 75%);background-size:200% 100%;animation:sk 1.2s linear infinite}
.skel{display:grid;gap:20px}
@keyframes sk{to{background-position:-200% 0}}
@media (prefers-reduced-motion:no-preference){
  .ws-main.enter{animation:pgIn .26s var(--ease-out)}
  @keyframes pgIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  .st{animation:stIn .3s var(--ease-out) both;animation-delay:calc(var(--i,0) * 40ms)}
  @keyframes stIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  rect.bar{transform-box:fill-box;transform-origin:50% 100%}
  rect.bar.h{transform-origin:0 50%}
  rect.bar.grow{animation:barIn .36s var(--ease-out) both}
  rect.bar.h.grow{animation-name:barInH}
  @keyframes barIn{from{transform:scaleY(0)}to{transform:none}}
  @keyframes barInH{from{transform:scaleX(0)}to{transform:none}}
  .timeline li.now::before{animation:pulse 1.8s ease-in-out infinite}
  @keyframes pulse{0%,100%{box-shadow:0 0 0 0 var(--gold-ink-wash)}50%{box-shadow:0 0 0 6px var(--gold-ink-wash)}}
}
@media (prefers-reduced-motion:reduce){.sk{animation:none}dialog.modal[open],.toast2{animation:none}}
/* status timeline */
.timeline{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:0}
.timeline li{flex:1 1 120px;position:relative;padding:22px 10px 0 0;display:grid;gap:2px;font-size:13.5px;color:var(--muted);min-width:110px}
.timeline li::before{content:"";position:absolute;left:0;top:4px;width:11px;height:11px;transform:rotate(45deg);border:1.5px solid var(--line-2);background:var(--panel)}
.timeline li::after{content:"";position:absolute;left:16px;right:4px;top:9px;height:1.5px;background:var(--line)}
.timeline li:last-child::after{display:none}
.timeline li.done{color:var(--ink-2)}.timeline li.done::before{background:var(--gold);border-color:var(--gold)}.timeline li.done::after{background:var(--gold)}
.timeline li.now{color:var(--ink)}.timeline li.now b{font-weight:700}.timeline li.now::before{border-color:var(--gold-ink);background:var(--gold-ink-wash);border-width:2px}
.timeline li.stop{color:var(--bad)}.timeline li.stop::before{background:var(--bad);border-color:var(--bad)}
.timeline b{font-weight:600}
.dt-tbl .timeline li{flex-basis:70px;min-width:70px;font-size:11.5px}
/* kanban */
.kanban{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(230px,1fr);gap:12px;overflow-x:auto;padding-bottom:10px;align-items:start}
.kb-col{background:var(--panel-2);border:1px solid var(--line);border-radius:var(--r);padding:10px;display:grid;gap:10px;align-content:start;min-height:220px;transition:background .15s,border-color .15s,box-shadow .15s}
.kb-col h3{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2);display:flex;justify-content:space-between;padding:2px 4px}
.kb-col.drop{border-color:var(--gold-ink);background:var(--gold-ink-wash);box-shadow:inset 0 0 0 1px var(--gold-ink)}
.kb-list{display:grid;gap:10px}
.kb-card{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:12px;display:grid;gap:8px;cursor:grab;box-shadow:0 1px 2px rgba(22,23,26,.05);transition:transform .18s var(--ease-out),box-shadow .18s var(--ease-out),opacity .18s}
.kb-card:hover{transform:translateY(-2px);box-shadow:0 10px 22px -14px rgba(22,23,26,.35)}
.kb-card.dragging{opacity:.45;transform:rotate(1deg)}
.kb-title{font-weight:600;color:var(--ink)!important;text-decoration:none}
.kb-title:hover{text-decoration:underline}
.kb-facts{display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;margin:0;font-size:12.5px}
.kb-facts dt{color:var(--muted)}.kb-facts dd{margin:0;font-weight:600;font-variant-numeric:tabular-nums}
.kb-move select{font:inherit;font-size:12.5px;color:var(--ink-2);background:transparent;border:1px solid var(--line);border-radius:3px;padding:3px 6px;width:100%}
.kb-empty{text-align:center;padding:20px 0}
.seg-t{display:flex;gap:4px}
/* counters */
.meters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
@media (max-width:760px){.meters{grid-template-columns:minmax(0,1fr)}}
.cmeter{display:grid;gap:6px;font-size:13px}
.meters .cmeter{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:12px 14px}
.cm-top{display:flex;justify-content:space-between;color:var(--muted)}.cm-top b{color:var(--ink);font-variant-numeric:tabular-nums}
.cm-bar{position:relative;height:6px;background:var(--panel-2);border-radius:3px;overflow:visible}
.cm-bar i{display:block;height:100%;border-radius:3px;background:var(--good);transition:width .4s var(--ease-out)}
.cm-bar em{position:absolute;top:-3px;width:1.5px;height:12px;background:var(--ink-2);opacity:.35}
.cmeter.warn .cm-bar i{background:var(--warn)}.cmeter.bad .cm-bar i{background:var(--bad)}.cmeter.bad .cm-top b{color:var(--bad)}.cmeter.warn .cm-top b{color:var(--warn)}
.comp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
.comp-grid .panel{gap:10px}
/* lists */
.alerts,.notes,.notes2,.checklist2,.updates,.msgs{list-style:none;margin:0;padding:0;display:grid}
.alerts li{padding:10px 0 10px 22px;border-bottom:1px solid var(--line);position:relative;display:grid;gap:2px}
.alerts li::before{content:"";position:absolute;left:3px;top:16px;width:8px;height:8px;transform:rotate(45deg);background:var(--line-2)}
.alerts li.warn::before{background:var(--warn)}.alerts li.bad::before{background:var(--bad)}
.alerts li:last-child{border-bottom:0}
.ws .alerts a{color:var(--ink);text-decoration:none}.ws .alerts a:hover{color:var(--gold-ink);text-decoration:underline}
.today{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:16px;align-items:start}
@media (max-width:420px){.today{grid-template-columns:minmax(0,1fr)}}
.notes li{display:grid;grid-template-columns:14px minmax(0,1fr);gap:12px;padding:12px 0;border-bottom:1px solid var(--line)}
.notes li div{display:grid;gap:2px}
.notes li.unread a{font-weight:600}
.nt-kind{width:9px;height:9px;margin-top:6px;transform:rotate(45deg);background:var(--line-2)}
.notes li.unread .nt-kind{background:var(--gold)}
.notes2 li,.checklist2 li{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line)}
.notes2 li.done label,.checklist2 li.done>span:first-child{color:var(--muted)}
.notes2 li.late .muted{color:var(--bad)}
.checklist2 li>span:first-child{display:grid}
.updates li{padding:10px 0;border-bottom:1px solid var(--line);display:grid;gap:2px}
.msgs li{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;padding:10px 0;border-bottom:1px solid var(--line)}
.diff summary{font-size:12.5px;cursor:pointer;margin-top:4px}
.diff code{font-size:12px;color:var(--gold-ink)}
.diff>div{padding:6px 0;border-top:1px solid var(--line)}
.share-bar{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;padding:12px;background:var(--panel-2);border-radius:var(--r)}
.share-count{display:grid;margin-right:auto}
.notice.private{border-color:var(--gold-ink);background:var(--gold-ink-wash)}
.offer-list,.reval-list{display:grid;gap:16px}
.reval-due{display:flex;gap:12px;align-items:center}
.reval.overdue{border-color:var(--bad)}
.progress-bar{height:8px;background:var(--panel-2);border-radius:4px;overflow:hidden}.progress-bar i{display:block;height:100%;background:var(--gold-ink);transition:width .4s var(--ease-out)}
.key{display:inline-block;width:10px;height:10px;border-radius:2px;margin:0 6px 0 12px;vertical-align:-1px}.key.solid{background:var(--s-debt)}.key.light{background:color-mix(in srgb,var(--s-debt) 42%,transparent)}
.key:first-child{margin-left:0}

/* ---------- glass and the New York skyline ----------
   The skyline (site/assets/skyline.svg, drawn by site/tools/skyline.py) sits behind the public pages.
   Text never sits directly on it: copy lives on glass panels (tinted at 60-80% so contrast holds whatever
   is behind) or on near-solid section grounds. Blur is used where it is cheap; phones get a solid tint. */
:root{--glass:rgba(20,19,16,.6);--glass-strong:rgba(15,15,13,.8);--glass-edge:rgba(232,199,123,.22);--glass-hi:inset 0 1px 0 rgba(255,241,214,.07);
  --glass-shadow:0 30px 60px -34px rgba(0,0,0,.85);--glass-blur:blur(14px) saturate(1.25);--r-glass:12px}
.glass,.pub .decision,.page>header,.card-sec,.cta-band,.auth-card,.close,.contact-card{background:var(--glass);border:1px solid var(--glass-edge);border-radius:var(--r-glass);box-shadow:var(--glass-hi),var(--glass-shadow);-webkit-backdrop-filter:var(--glass-blur);backdrop-filter:var(--glass-blur)}
.pub{position:relative;isolation:isolate}
.pub::before{content:"";position:fixed;left:0;right:0;bottom:0;height:min(56vh,480px);z-index:-2;pointer-events:none;background:url("assets/skyline.svg") center bottom/cover no-repeat}
.pub::after{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:linear-gradient(180deg,var(--obsidian) 0%,rgba(13,14,16,.94) 38%,rgba(13,14,16,.42) 74%,rgba(13,14,16,.3) 100%)}
.pub>main{position:relative}
/* reading sections keep a near-solid ground, so the skyline only glows through faintly */
.pub .sec{background:rgba(13,14,16,.9)}
.pub .sec.tone{background:rgba(21,20,17,.92)}
.pub .sec.sky{background:transparent}
.strip-sec{background:transparent}
/* header: a glass bar over everything that scrolls beneath it */
.pub-head{background:rgba(13,14,16,.8);-webkit-backdrop-filter:blur(18px) saturate(1.3);backdrop-filter:blur(18px) saturate(1.3);box-shadow:0 1px 0 rgba(232,199,123,.1),0 18px 40px -30px rgba(0,0,0,.9)}
@media (max-width:1240px){.pub-nav{background:var(--glass-strong);-webkit-backdrop-filter:blur(20px) saturate(1.3);backdrop-filter:blur(20px) saturate(1.3);border-radius:0 0 var(--r-glass) var(--r-glass)}}
/* glass panels */
.pub .decision{padding:22px 24px}
.decision-stats{border-radius:8px;overflow:hidden}
.decision-stats div{background:rgba(13,14,16,.55)}
.page>header{padding:clamp(22px,3vw,34px);max-width:none;border-bottom:1px solid var(--glass-edge)}
.page>header .lede-s{max-width:68ch}
.card-sec{padding:clamp(20px,2.6vw,30px);border-top:1px solid var(--glass-edge)}
.three .card-sec{border-top:1px solid var(--glass-edge);box-shadow:var(--glass-hi),inset 0 2px 0 var(--gold),var(--glass-shadow)}
.cta-band{background:linear-gradient(100deg,rgba(201,160,79,.14),rgba(20,19,16,.62) 55%)}
.auth-card{border-top:1px solid var(--glass-edge);box-shadow:var(--glass-hi),inset 0 2px 0 var(--gold),var(--glass-shadow)}
.auth{min-height:calc(100vh - 74px)}
.close{padding:clamp(32px,5vw,56px) clamp(20px,4vw,56px);max-width:860px;margin-inline:auto}
.contact-card{padding:clamp(20px,3vw,32px)}
.pub-foot{background:rgba(10,10,11,.88);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px)}
.xp{background:rgba(17,16,13,.86);-webkit-backdrop-filter:blur(22px) saturate(1.3);backdrop-filter:blur(22px) saturate(1.3);box-shadow:-30px 0 60px -30px rgba(0,0,0,.8)}
#explain{-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}
.card-sec .tw,.card-sec .calc-out .kpi,.pub .kpi{background:rgba(13,14,16,.45)}
.pub .in,.pub input,.pub select,.pub textarea{background-color:rgba(13,14,16,.7)}
/* hero: the skyline rises and its windows light up as the emblem opens */
.intro-sky{position:absolute;left:0;right:0;bottom:0;height:46%;z-index:0;pointer-events:none;transform:translateY(var(--sky-y,0));will-change:transform}
.intro-sky .sky-svg{display:block;width:100%;height:100%}
.intro-stage{--lit:1}
.intro-sky .w1{opacity:calc(var(--lit) * 1.6 - .1)}
.intro-sky .w2{opacity:calc(var(--lit) * 2 - .7)}
.intro-sky .w3{opacity:calc(var(--lit) * 2.6 - 1.5)}
.intro-mark{z-index:1}.intro-word{z-index:2}.intro-copy{z-index:3}
.intro-copy{padding:clamp(22px,3vw,34px) clamp(18px,3vw,40px);border-radius:var(--r-glass);position:relative}
.intro-copy::before{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;opacity:var(--plate,1);background:var(--glass);border:1px solid var(--glass-edge);box-shadow:var(--glass-hi),var(--glass-shadow);-webkit-backdrop-filter:var(--glass-blur);backdrop-filter:var(--glass-blur)}
/* phones: no blur on scrolling panels (smooth scrolling, crisp text); a stronger tint instead */
@media (max-width:760px){
  .pub .decision,.page>header,.card-sec,.cta-band,.auth-card,.close,.contact-card{-webkit-backdrop-filter:none;backdrop-filter:none;background:rgba(17,16,13,.88)}
  .cta-band{background:linear-gradient(100deg,rgba(201,160,79,.14),rgba(17,16,13,.9) 55%)}
  .intro-copy::before{background:rgba(15,15,13,.72)}
  .pub-head{background:rgba(13,14,16,.9)}
}
/* readers who ask for less transparency, and browsers without backdrop blur, get solid panels */
@media (prefers-reduced-transparency:reduce){
  .pub .decision,.page>header,.card-sec,.cta-band,.auth-card,.close,.contact-card,.intro-copy::before,.pub-head,.xp,.pub-foot{background:var(--obsidian-2);-webkit-backdrop-filter:none;backdrop-filter:none}
}
@supports not ((-webkit-backdrop-filter:blur(1px)) or (backdrop-filter:blur(1px))){
  .pub .decision,.page>header,.card-sec,.cta-band,.auth-card,.close,.contact-card,.intro-copy::before{background:rgba(17,16,13,.9)}
  .pub-head{background:rgba(13,14,16,.95)}
}
/* workspace, light touch: the skyline at the foot of the rail and in each page's masthead; data stays on solid panels */
.ws-rail{background:linear-gradient(180deg,var(--obsidian) 0%,var(--obsidian) 52%,rgba(13,14,16,.74) 100%),url("assets/skyline.svg") 44% bottom/auto 240px no-repeat,var(--obsidian)}
.ws-rail .rail-foot{position:relative;background:rgba(13,14,16,.62);-webkit-backdrop-filter:blur(12px) saturate(1.2);backdrop-filter:blur(12px) saturate(1.2);border:1px solid var(--glass-edge);border-radius:10px;padding:12px;margin-top:auto;box-shadow:var(--glass-hi)}
@media (max-width:900px){.ws-rail{background:var(--obsidian)}.ws-rail .rail-foot{background:none;border:0;border-top:1px solid var(--gold-line);border-radius:0;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none;padding:10px 0 0}}
.ws .masthead{position:relative;isolation:isolate;overflow:hidden;align-items:center;min-height:118px;padding:22px clamp(18px,2.4vw,28px);border:1px solid rgba(232,199,123,.24);border-radius:var(--r-glass);color:var(--ivory);
  background:linear-gradient(90deg,rgba(13,14,16,.97) 0%,rgba(13,14,16,.9) 42%,rgba(13,14,16,.45) 78%,rgba(13,14,16,.3) 100%),url("assets/skyline.svg") right bottom/auto 165% no-repeat,var(--obsidian);box-shadow:0 18px 40px -30px rgba(0,0,0,.6)}
.ws .masthead h1{color:var(--ivory)}
.ws .masthead p,.ws .masthead .muted{color:var(--ivory-2)}
.ws .masthead a{color:var(--gold-1)}
.ws .masthead .chip{background:rgba(29,28,24,.8);color:var(--ivory-2);border-color:var(--gold-line)}
.ws .masthead>:last-child:not(:first-child){position:relative;padding:8px;border-radius:10px;background:rgba(13,14,16,.55);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid var(--glass-edge)}
.ws .masthead .btn.ghost{color:var(--ivory);border-color:var(--gold-line);background:rgba(13,14,16,.4)}
.ws .masthead .btn.ghost:hover{color:var(--gold-1);border-color:var(--gold)}
.ws .masthead .btn.primary{background:var(--gold);color:var(--obsidian)}
.ws .masthead .btn.primary:hover{background:var(--gold-1);color:var(--obsidian)}
.ws .masthead .fld>span:first-child{color:var(--ivory-2)}
@media (max-width:640px){.ws .masthead{background:linear-gradient(180deg,rgba(13,14,16,.94),rgba(13,14,16,.72)),url("assets/skyline.svg") center bottom/auto 120% no-repeat,var(--obsidian)}.ws .masthead>:last-child:not(:first-child){background:none;border:0;padding:0;-webkit-backdrop-filter:none;backdrop-filter:none}}
</style>

<div id="site"><p style="padding:40px;text-align:center;color:#F1ECE2;background:#0D0E10;margin:0">Loading Aegis Ascend…</p></div>
<div id="explain" hidden><div class="xp" role="dialog" aria-modal="true" aria-labelledby="xp-title"><div class="xp-head"><h2 id="xp-title">How this number is made</h2><button class="btn ghost sm xp-close" type="button">Close</button></div><div class="xp-body"></div></div></div>
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
<linearGradient id="goldv" x1="0" y1="1" x2="0" y2="0" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="#8E6A2A"/><stop offset=".5" stop-color="#C9A04F"/><stop offset="1" stop-color="#E8C77B"/></linearGradient>
<linearGradient id="goldv2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E8C77B"/><stop offset=".55" stop-color="#C9A04F"/><stop offset="1" stop-color="#9C7330"/></linearGradient>
<symbol id="emblem" viewBox="62 52 420 400"><g fill="none" stroke="url(#goldv2)" stroke-width="17" stroke-linejoin="miter" stroke-miterlimit="12">
<path d="M80 412 L246 136 L246 440" clip-path="url(#emclipL)"/><path d="M466 412 L300 136 L300 440" clip-path="url(#emclipR)"/>
<path d="M172 404 L273 289 L374 404" clip-path="url(#emclipC)"/></g>
<polygon points="273,62 302,91 273,120 244,91" fill="url(#goldv2)"/></symbol>
<clipPath id="emclipL"><rect x="0" y="0" width="600" height="414"/><rect x="236" y="0" width="20" height="441"/></clipPath>
<clipPath id="emclipR"><rect x="0" y="0" width="600" height="414"/><rect x="290" y="0" width="20" height="441"/></clipPath>
<clipPath id="emclipC"><rect x="0" y="0" width="600" height="395"/></clipPath>
<clipPath id="emclipCL"><rect x="0" y="0" width="273" height="395"/></clipPath>
<clipPath id="emclipCR"><rect x="273" y="0" width="327" height="395"/></clipPath>
</defs></svg>
<!--SKYLINE:START--><template id="tpl-skyline"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 420" preserveAspectRatio="xMidYMax slice" class="sky-svg" aria-hidden="true" focusable="false"><defs><radialGradient id="skyGlow" cx="50%" cy="100%" r="75%"><stop offset="0" stop-color="#C9A04F" stop-opacity=".30"/><stop offset=".45" stop-color="#8E6A2A" stop-opacity=".12"/><stop offset="1" stop-color="#0D0E10" stop-opacity="0"/></radialGradient><linearGradient id="skyFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0D0E10" stop-opacity="0"/><stop offset="1" stop-color="#0D0E10" stop-opacity=".55"/></linearGradient></defs><rect width="1600" height="420" fill="url(#skyGlow)"/><path fill="#221F1A" d="M-10.0 309.0 L46.0 309.0 L46.0 420.0 L-10.0 420.0 Z M40.0 308.0 L46.0 308.0 L46.0 290.0 L66.0 290.0 L66.0 308.0 L72.0 308.0 L72.0 420.0 L40.0 420.0 Z M68.0 287.0 L74.0 287.0 L74.0 269.0 L92.0 269.0 L92.0 287.0 L98.0 287.0 L98.0 420.0 L68.0 420.0 Z M97.0 309.0 L149.0 309.0 L149.0 420.0 L97.0 420.0 Z M145.0 264.0 L154.0 264.0 L154.0 246.0 L181.0 246.0 L181.0 264.0 L190.0 264.0 L190.0 420.0 L145.0 420.0 Z M186.0 295.0 L197.0 295.0 L197.0 277.0 L233.0 277.0 L233.0 295.0 L244.0 295.0 L244.0 420.0 L186.0 420.0 Z M241.0 236.0 L304.0 236.0 L304.0 420.0 L241.0 420.0 Z M301.0 241.0 L313.0 241.0 L313.0 223.0 L350.0 223.0 L350.0 241.0 L362.0 241.0 L362.0 420.0 L301.0 420.0 Z M358.0 294.0 L408.0 294.0 L408.0 420.0 L358.0 420.0 Z M402.0 311.0 L408.0 311.0 L408.0 293.0 L429.0 293.0 L429.0 311.0 L435.0 311.0 L435.0 420.0 L402.0 420.0 Z M430.0 258.0 L441.0 258.0 L441.0 240.0 L478.0 240.0 L478.0 258.0 L489.0 258.0 L489.0 420.0 L430.0 420.0 Z M487.0 238.0 L537.0 238.0 L537.0 420.0 L487.0 420.0 Z M532.0 276.0 L582.0 276.0 L582.0 420.0 L532.0 420.0 Z M581.0 275.0 L591.0 275.0 L591.0 257.0 L624.0 257.0 L624.0 275.0 L634.0 275.0 L634.0 420.0 L581.0 420.0 Z M629.0 222.0 L689.0 222.0 L689.0 420.0 L629.0 420.0 Z M683.0 263.0 L717.0 263.0 L717.0 420.0 L683.0 420.0 Z M711.0 229.0 L720.0 229.0 L720.0 211.0 L751.0 211.0 L751.0 229.0 L760.0 229.0 L760.0 420.0 L711.0 420.0 Z M756.0 269.0 L805.0 269.0 L805.0 420.0 L756.0 420.0 Z M803.0 216.0 L852.0 216.0 L852.0 420.0 L803.0 420.0 Z M847.0 258.0 L859.0 258.0 L859.0 240.0 L898.0 240.0 L898.0 258.0 L910.0 258.0 L910.0 420.0 L847.0 420.0 Z M909.0 250.0 L964.0 250.0 L964.0 420.0 L909.0 420.0 Z M958.0 255.0 L991.0 255.0 L991.0 420.0 L958.0 420.0 Z M991.0 266.0 L1001.0 266.0 L1001.0 248.0 L1034.0 248.0 L1034.0 266.0 L1044.0 266.0 L1044.0 420.0 L991.0 420.0 Z M1038.0 236.0 L1075.0 236.0 L1075.0 420.0 L1038.0 420.0 Z M1074.0 212.0 L1124.0 212.0 L1124.0 420.0 L1074.0 420.0 Z M1120.0 317.0 L1129.0 317.0 L1129.0 299.0 L1159.0 299.0 L1159.0 317.0 L1168.0 317.0 L1168.0 420.0 L1120.0 420.0 Z M1166.0 307.0 L1210.0 307.0 L1210.0 420.0 L1166.0 420.0 Z M1209.0 240.0 L1235.0 240.0 L1235.0 420.0 L1209.0 420.0 Z M1233.0 326.0 L1239.0 326.0 L1239.0 308.0 L1259.0 308.0 L1259.0 326.0 L1265.0 326.0 L1265.0 420.0 L1233.0 420.0 Z M1263.0 259.0 L1273.0 259.0 L1273.0 241.0 L1306.0 241.0 L1306.0 259.0 L1316.0 259.0 L1316.0 420.0 L1263.0 420.0 Z M1312.0 244.0 L1371.0 244.0 L1371.0 420.0 L1312.0 420.0 Z M1365.0 324.0 L1375.0 324.0 L1375.0 306.0 L1409.0 306.0 L1409.0 324.0 L1419.0 324.0 L1419.0 420.0 L1365.0 420.0 Z M1417.0 214.0 L1457.0 214.0 L1457.0 420.0 L1417.0 420.0 Z M1452.0 234.0 L1484.0 234.0 L1484.0 420.0 L1452.0 420.0 Z M1483.0 225.0 L1490.0 225.0 L1490.0 207.0 L1515.0 207.0 L1515.0 225.0 L1522.0 225.0 L1522.0 420.0 L1483.0 420.0 Z M1518.0 277.0 L1565.0 277.0 L1565.0 420.0 L1518.0 420.0 Z M1560.0 247.0 L1609.0 247.0 L1609.0 420.0 L1560.0 420.0 Z"/><path fill="#15140F" d="M-6.0 237.0 L2.0 237.0 L2.0 219.0 L26.0 219.0 L26.0 237.0 L34.0 237.0 L34.0 420.0 L-6.0 420.0 Z M42.0 284.0 L98.0 284.0 L98.0 420.0 L42.0 420.0 Z M111.0 226.0 L166.0 226.0 L166.0 420.0 L111.0 420.0 Z M171.0 237.0 L233.0 237.0 L233.0 420.0 L171.0 420.0 Z M255.0 228.0 L318.0 228.0 L318.0 420.0 L255.0 420.0 Z M326.0 259.0 L332.0 259.0 L332.0 241.0 L354.0 241.0 L354.0 259.0 L360.0 259.0 L360.0 420.0 L326.0 420.0 Z M379.0 316.0 L388.0 316.0 L388.0 298.0 L419.0 298.0 L419.0 316.0 L428.0 316.0 L428.0 420.0 L379.0 420.0 Z M579.0 254.0 L643.0 254.0 L643.0 420.0 L579.0 420.0 Z M870.0 269.0 L880.0 269.0 L880.0 251.0 L911.0 251.0 L911.0 269.0 L921.0 269.0 L921.0 420.0 L870.0 420.0 Z M936.0 273.0 L1003.0 273.0 L1003.0 420.0 L936.0 420.0 Z M1014.0 265.0 L1025.0 265.0 L1025.0 247.0 L1060.0 247.0 L1060.0 265.0 L1071.0 265.0 L1071.0 420.0 L1014.0 420.0 Z M1077.0 227.0 L1120.0 227.0 L1120.0 420.0 L1077.0 420.0 Z M1125.0 190.0 L1159.0 190.0 L1159.0 420.0 L1125.0 420.0 Z M1164.0 233.0 L1210.0 233.0 L1210.0 420.0 L1164.0 420.0 Z M1234.0 296.0 L1276.0 296.0 L1276.0 420.0 L1234.0 420.0 Z M1294.0 230.0 L1328.0 230.0 L1328.0 420.0 L1294.0 420.0 Z M1333.0 267.0 L1379.0 267.0 L1379.0 420.0 L1333.0 420.0 Z M1385.0 263.0 L1395.0 263.0 L1395.0 245.0 L1429.0 245.0 L1429.0 263.0 L1439.0 263.0 L1439.0 420.0 L1385.0 420.0 Z M1453.0 198.0 L1474.5 184.0 L1476.5 168.0 L1478.5 184.0 L1500.0 198.0 L1500.0 420.0 L1453.0 420.0 Z M1515.0 234.0 L1583.0 234.0 L1583.0 420.0 L1515.0 420.0 Z M456.0 175.0 L508.0 175.0 L508.0 420.0 L456.0 420.0 Z M460.0 175.0 L460.0 169.0 L463.6 164.0 L463.6 158.0 L467.2 153.0 L467.2 147.0 L470.8 142.0 L470.8 136.0 L474.4 131.0 L474.4 125.0 L478.0 120.0 L478.0 114.0 L480.5 109.0 L482.0 51.0 L483.5 109.0 L486.0 114.0 L486.0 120.0 L489.6 125.0 L489.6 131.0 L493.2 136.0 L493.2 142.0 L496.8 147.0 L496.8 153.0 L500.4 158.0 L500.4 164.0 L504.0 169.0 L504.0 175.0 Z M746.0 232.0 L844.0 232.0 L844.0 420.0 L746.0 420.0 Z M757.0 200.0 L833.0 200.0 L833.0 420.0 L757.0 420.0 Z M766.0 168.0 L824.0 168.0 L824.0 420.0 L766.0 420.0 Z M774.0 140.0 L816.0 140.0 L816.0 420.0 L774.0 420.0 Z M780.0 118.0 L810.0 118.0 L810.0 420.0 L780.0 420.0 Z M788.0 88.0 L802.0 88.0 L802.0 420.0 L788.0 420.0 Z M793.4 88.0 L794.4 34.0 L795.6 34.0 L796.6 88.0 Z"/><g fill="#E8C77B"><rect class="w1" x="22" y="283" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="-2" y="303" width="2.6" height="3.6" opacity="0.7"/><rect class="w2" x="14" y="303" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="6" y="323" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="14" y="353" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="6" y="373" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="14" y="373" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="22" y="393" width="2.6" height="3.6" opacity="0.85"/><rect class="w2" x="54" y="290" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="62" y="300" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="62" y="320" width="2.6" height="3.6" opacity="0.95"/><rect class="w2" x="70" y="360" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="78" y="360" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="54" y="380" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="62" y="390" width="2.6" height="3.6" opacity="0.95"/><rect class="w2" x="70" y="390" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="78" y="410" width="2.6" height="3.6" opacity="0.7"/><rect class="w2" x="131" y="232" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="131" y="252" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="155" y="252" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="115" y="262" width="2.6" height="3.6" opacity="0.95"/><rect class="w3" x="131" y="262" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="155" y="272" width="2.6" height="3.6" opacity="0.7"/><rect class="w2" x="155" y="302" width="2.6" height="3.6" opacity="0.55"/><rect class="w2" x="139" y="312" width="2.6" height="3.6" opacity="0.55"/><rect class="w3" x="123" y="322" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="115" y="362" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="131" y="372" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="139" y="372" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="131" y="392" width="2.6" height="3.6" opacity="0.95"/><rect class="w3" x="147" y="392" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="175" y="253" width="2.6" height="3.6" opacity="0.85"/><rect class="w2" x="215" y="253" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="207" y="263" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="215" y="263" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="215" y="303" width="2.6" height="3.6" opacity="0.95"/><rect class="w2" x="207" y="333" width="2.6" height="3.6" opacity="0.7"/><rect class="w2" x="191" y="353" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="191" y="363" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="207" y="363" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="175" y="373" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="259" y="244" width="2.6" height="3.6" opacity="0.55"/><rect class="w3" x="259" y="264" width="2.6" height="3.6" opacity="0.85"/><rect class="w2" x="291" y="274" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="259" y="284" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="275" y="284" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="299" y="284" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="259" y="304" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="307" y="314" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="299" y="324" width="2.6" height="3.6" opacity="0.95"/><rect class="w2" x="267" y="364" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="283" y="384" width="2.6" height="3.6" opacity="0.55"/><rect class="w2" x="283" y="394" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="291" y="394" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="330" y="275" width="2.6" height="3.6" opacity="0.55"/><rect class="w2" x="354" y="275" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="330" y="285" width="2.6" height="3.6" opacity="0.85"/><rect class="w2" x="354" y="295" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="346" y="375" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="346" y="385" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="338" y="395" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="383" y="322" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="407" y="372" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="391" y="382" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="415" y="402" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="615" y="270" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="623" y="290" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="631" y="290" width="2.6" height="3.6" opacity="0.7"/><rect class="w3" x="615" y="300" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="591" y="330" width="2.6" height="3.6" opacity="0.55"/><rect class="w3" x="623" y="330" width="2.6" height="3.6" opacity="0.55"/><rect class="w3" x="631" y="330" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="599" y="340" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="631" y="350" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="631" y="370" width="2.6" height="3.6" opacity="0.7"/><rect class="w2" x="631" y="390" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="599" y="400" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="591" y="410" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="599" y="410" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="890" y="275" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="898" y="305" width="2.6" height="3.6" opacity="0.95"/><rect class="w3" x="882" y="315" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="890" y="335" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="882" y="345" width="2.6" height="3.6" opacity="0.55"/><rect class="w2" x="898" y="355" width="2.6" height="3.6" opacity="0.55"/><rect class="w2" x="906" y="365" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="914" y="375" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="890" y="385" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="874" y="405" width="2.6" height="3.6" opacity="0.7"/><rect class="w2" x="996" y="309" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="956" y="319" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="964" y="319" width="2.6" height="3.6" opacity="0.95"/><rect class="w3" x="940" y="349" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="956" y="349" width="2.6" height="3.6" opacity="0.7"/><rect class="w3" x="956" y="359" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="988" y="359" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="964" y="379" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="956" y="409" width="2.6" height="3.6" opacity="0.7"/><rect class="w3" x="980" y="409" width="2.6" height="3.6" opacity="0.55"/><rect class="w3" x="1042" y="281" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="1050" y="281" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="1058" y="281" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="1042" y="301" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="1050" y="311" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="1058" y="311" width="2.6" height="3.6" opacity="0.55"/><rect class="w2" x="1058" y="341" width="2.6" height="3.6" opacity="0.7"/><rect class="w2" x="1034" y="351" width="2.6" height="3.6" opacity="0.95"/><rect class="w3" x="1042" y="351" width="2.6" height="3.6" opacity="0.7"/><rect class="w2" x="1018" y="371" width="2.6" height="3.6" opacity="0.85"/><rect class="w2" x="1026" y="381" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="1018" y="411" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="1034" y="411" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="1113" y="243" width="2.6" height="3.6" opacity="0.95"/><rect class="w2" x="1097" y="253" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="1105" y="263" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="1113" y="263" width="2.6" height="3.6" opacity="0.7"/><rect class="w2" x="1105" y="273" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="1097" y="283" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="1097" y="293" width="2.6" height="3.6" opacity="0.95"/><rect class="w2" x="1113" y="303" width="2.6" height="3.6" opacity="0.55"/><rect class="w3" x="1113" y="313" width="2.6" height="3.6" opacity="0.55"/><rect class="w2" x="1113" y="323" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="1105" y="343" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="1113" y="353" width="2.6" height="3.6" opacity="0.95"/><rect class="w3" x="1113" y="383" width="2.6" height="3.6" opacity="0.95"/><rect class="w2" x="1137" y="246" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="1145" y="246" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="1145" y="256" width="2.6" height="3.6" opacity="0.7"/><rect class="w2" x="1145" y="266" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="1145" y="276" width="2.6" height="3.6" opacity="0.85"/><rect class="w2" x="1153" y="296" width="2.6" height="3.6" opacity="0.55"/><rect class="w2" x="1137" y="336" width="2.6" height="3.6" opacity="0.55"/><rect class="w2" x="1153" y="336" width="2.6" height="3.6" opacity="0.7"/><rect class="w3" x="1192" y="279" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="1192" y="349" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="1176" y="379" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="1192" y="389" width="2.6" height="3.6" opacity="0.55"/><rect class="w3" x="1200" y="389" width="2.6" height="3.6" opacity="0.95"/><rect class="w2" x="1238" y="312" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="1246" y="352" width="2.6" height="3.6" opacity="0.55"/><rect class="w3" x="1270" y="372" width="2.6" height="3.6" opacity="0.7"/><rect class="w2" x="1298" y="236" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="1314" y="306" width="2.6" height="3.6" opacity="0.7"/><rect class="w2" x="1322" y="306" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="1306" y="326" width="2.6" height="3.6" opacity="0.7"/><rect class="w2" x="1314" y="366" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="1322" y="376" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="1345" y="283" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="1361" y="293" width="2.6" height="3.6" opacity="0.7"/><rect class="w3" x="1361" y="303" width="2.6" height="3.6" opacity="0.95"/><rect class="w3" x="1337" y="333" width="2.6" height="3.6" opacity="0.7"/><rect class="w3" x="1361" y="343" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="1353" y="393" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="1389" y="289" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="1413" y="309" width="2.6" height="3.6" opacity="0.55"/><rect class="w2" x="1389" y="319" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="1429" y="339" width="2.6" height="3.6" opacity="0.95"/><rect class="w2" x="1429" y="359" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="1397" y="369" width="2.6" height="3.6" opacity="0.55"/><rect class="w3" x="1413" y="369" width="2.6" height="3.6" opacity="0.7"/><rect class="w3" x="1429" y="369" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="1413" y="409" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="1473" y="204" width="2.6" height="3.6" opacity="0.95"/><rect class="w2" x="1481" y="214" width="2.6" height="3.6" opacity="0.7"/><rect class="w3" x="1481" y="224" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="1473" y="234" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="1457" y="294" width="2.6" height="3.6" opacity="0.95"/><rect class="w2" x="1473" y="324" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="1465" y="334" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="1489" y="334" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="1481" y="364" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="1465" y="394" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="1465" y="404" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="1535" y="260" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="1535" y="310" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="1575" y="330" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="1543" y="340" width="2.6" height="3.6" opacity="0.85"/><rect class="w2" x="1567" y="340" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="1543" y="350" width="2.6" height="3.6" opacity="0.95"/><rect class="w3" x="1575" y="350" width="2.6" height="3.6" opacity="0.7"/><rect class="w2" x="1559" y="360" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="1551" y="380" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="1559" y="380" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="1575" y="380" width="2.6" height="3.6" opacity="0.95"/><rect class="w2" x="1551" y="390" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="476" y="181" width="2.6" height="3.6" opacity="0.85"/><rect class="w2" x="476" y="201" width="2.6" height="3.6" opacity="0.7"/><rect class="w3" x="492" y="201" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="484" y="211" width="2.6" height="3.6" opacity="0.7"/><rect class="w3" x="500" y="221" width="2.6" height="3.6" opacity="0.55"/><rect class="w3" x="500" y="241" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="460" y="261" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="484" y="311" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="500" y="311" width="2.6" height="3.6" opacity="0.95"/><rect class="w3" x="468" y="321" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="476" y="321" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="484" y="351" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="476" y="361" width="2.6" height="3.6" opacity="0.7"/><rect class="w3" x="492" y="361" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="500" y="371" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="476" y="381" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="492" y="401" width="2.6" height="3.6" opacity="0.55"/><rect class="w2" x="460" y="411" width="2.6" height="3.6" opacity="0.95"/><rect class="w2" x="790" y="238" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="806" y="238" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="838" y="238" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="758" y="248" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="766" y="248" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="774" y="248" width="2.6" height="3.6" opacity="0.85"/><rect class="w2" x="830" y="248" width="2.6" height="3.6" opacity="0.7"/><rect class="w2" x="750" y="258" width="2.6" height="3.6" opacity="0.95"/><rect class="w3" x="798" y="258" width="2.6" height="3.6" opacity="0.55"/><rect class="w2" x="782" y="268" width="2.6" height="3.6" opacity="0.55"/><rect class="w3" x="814" y="268" width="2.6" height="3.6" opacity="0.85"/><rect class="w2" x="774" y="278" width="2.6" height="3.6" opacity="0.85"/><rect class="w2" x="822" y="288" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="758" y="298" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="798" y="298" width="2.6" height="3.6" opacity="0.7"/><rect class="w2" x="814" y="298" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="830" y="298" width="2.6" height="3.6" opacity="0.85"/><rect class="w2" x="814" y="308" width="2.6" height="3.6" opacity="0.95"/><rect class="w2" x="774" y="318" width="2.6" height="3.6" opacity="0.85"/><rect class="w2" x="790" y="318" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="758" y="328" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="774" y="328" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="790" y="328" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="814" y="328" width="2.6" height="3.6" opacity="0.55"/><rect class="w3" x="774" y="338" width="2.6" height="3.6" opacity="0.85"/><rect class="w2" x="782" y="338" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="790" y="338" width="2.6" height="3.6" opacity="0.85"/><rect class="w2" x="782" y="348" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="806" y="348" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="814" y="348" width="2.6" height="3.6" opacity="0.95"/><rect class="w3" x="814" y="358" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="838" y="358" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="774" y="368" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="798" y="368" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="822" y="398" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="750" y="408" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="806" y="408" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="785" y="206" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="761" y="216" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="769" y="216" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="817" y="216" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="825" y="216" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="818" y="174" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="770" y="184" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="786" y="146" width="2.6" height="3.6" opacity="0.55"/><rect class="w3" x="810" y="146" width="2.6" height="3.6" opacity="0.55"/></g><path fill="#0A0A0B" d="M-8.0 278.0 L82.0 278.0 L82.0 420.0 L-8.0 420.0 Z M107.0 294.0 L162.0 294.0 L162.0 420.0 L107.0 420.0 Z M190.0 280.0 L263.0 280.0 L263.0 420.0 L190.0 420.0 Z M275.0 332.0 L363.0 332.0 L363.0 420.0 L275.0 420.0 Z M384.0 280.0 L430.0 280.0 L430.0 420.0 L384.0 420.0 Z M451.0 354.0 L512.0 354.0 L512.0 420.0 L451.0 420.0 Z M527.0 286.0 L569.0 286.0 L569.0 420.0 L527.0 420.0 Z M600.0 361.0 L647.0 361.0 L647.0 420.0 L600.0 420.0 Z M670.0 296.0 L725.0 296.0 L725.0 420.0 L670.0 420.0 Z M739.0 286.0 L812.0 286.0 L812.0 420.0 L739.0 420.0 Z M822.0 368.0 L836.0 368.0 L836.0 350.0 L880.0 350.0 L880.0 368.0 L894.0 368.0 L894.0 420.0 L822.0 420.0 Z M1043.0 295.0 L1124.0 295.0 L1124.0 420.0 L1043.0 420.0 Z M1342.0 359.0 L1395.0 359.0 L1395.0 420.0 L1342.0 420.0 Z M1409.0 306.0 L1458.0 306.0 L1458.0 420.0 L1409.0 420.0 Z M1498.0 351.0 L1513.0 351.0 L1513.0 333.0 L1560.0 333.0 L1560.0 351.0 L1575.0 351.0 L1575.0 420.0 L1498.0 420.0 Z M1006.0 74.0 L1030.0 74.0 L1030.0 420.0 L1006.0 420.0 Z M1168.0 420.0 L1168.0 344.0 L1191.0 122.0 L1229.0 122.0 L1252.0 344.0 L1252.0 420.0 Z M1194.0 112.0 L1226.0 112.0 L1226.0 420.0 L1194.0 420.0 Z M1208.8 112.0 L1209.6 16.0 L1210.4 16.0 L1211.2 112.0 Z"/><g fill="#E8C77B"><rect class="w2" x="60" y="284" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="-4" y="294" width="2.6" height="3.6" opacity="0.55"/><rect class="w3" x="-4" y="304" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="20" y="304" width="2.6" height="3.6" opacity="0.95"/><rect class="w2" x="-4" y="314" width="2.6" height="3.6" opacity="0.55"/><rect class="w2" x="52" y="324" width="2.6" height="3.6" opacity="0.85"/><rect class="w2" x="20" y="344" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="20" y="354" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="28" y="354" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="36" y="354" width="2.6" height="3.6" opacity="0.55"/><rect class="w3" x="-4" y="364" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="4" y="364" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="68" y="374" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="-4" y="384" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="20" y="384" width="2.6" height="3.6" opacity="0.85"/><rect class="w2" x="52" y="384" width="2.6" height="3.6" opacity="0.95"/><rect class="w3" x="52" y="394" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="76" y="394" width="2.6" height="3.6" opacity="0.95"/><rect class="w3" x="12" y="404" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="20" y="404" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="36" y="404" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="127" y="300" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="135" y="300" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="111" y="320" width="2.6" height="3.6" opacity="0.55"/><rect class="w2" x="135" y="320" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="135" y="330" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="151" y="330" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="119" y="350" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="143" y="350" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="151" y="370" width="2.6" height="3.6" opacity="0.95"/><rect class="w2" x="119" y="380" width="2.6" height="3.6" opacity="0.55"/><rect class="w2" x="143" y="380" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="143" y="390" width="2.6" height="3.6" opacity="0.95"/><rect class="w3" x="119" y="400" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="143" y="400" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="202" y="316" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="250" y="316" width="2.6" height="3.6" opacity="0.95"/><rect class="w3" x="218" y="326" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="250" y="326" width="2.6" height="3.6" opacity="0.95"/><rect class="w3" x="250" y="336" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="226" y="366" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="250" y="376" width="2.6" height="3.6" opacity="0.95"/><rect class="w2" x="194" y="396" width="2.6" height="3.6" opacity="0.95"/><rect class="w2" x="202" y="406" width="2.6" height="3.6" opacity="0.95"/><rect class="w2" x="295" y="338" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="319" y="338" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="343" y="338" width="2.6" height="3.6" opacity="0.95"/><rect class="w3" x="287" y="348" width="2.6" height="3.6" opacity="0.55"/><rect class="w3" x="351" y="358" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="287" y="368" width="2.6" height="3.6" opacity="0.7"/><rect class="w3" x="319" y="368" width="2.6" height="3.6" opacity="0.95"/><rect class="w3" x="287" y="378" width="2.6" height="3.6" opacity="0.85"/><rect class="w2" x="295" y="378" width="2.6" height="3.6" opacity="0.7"/><rect class="w3" x="311" y="378" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="319" y="388" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="335" y="388" width="2.6" height="3.6" opacity="0.95"/><rect class="w3" x="311" y="398" width="2.6" height="3.6" opacity="0.55"/><rect class="w3" x="343" y="398" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="279" y="408" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="319" y="408" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="412" y="296" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="396" y="326" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="396" y="336" width="2.6" height="3.6" opacity="0.7"/><rect class="w2" x="404" y="336" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="420" y="346" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="404" y="356" width="2.6" height="3.6" opacity="0.85"/><rect class="w2" x="420" y="356" width="2.6" height="3.6" opacity="0.7"/><rect class="w3" x="388" y="366" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="463" y="360" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="471" y="360" width="2.6" height="3.6" opacity="0.55"/><rect class="w3" x="495" y="370" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="455" y="400" width="2.6" height="3.6" opacity="0.95"/><rect class="w2" x="487" y="410" width="2.6" height="3.6" opacity="0.95"/><rect class="w3" x="531" y="292" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="547" y="312" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="555" y="312" width="2.6" height="3.6" opacity="0.95"/><rect class="w2" x="539" y="322" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="539" y="332" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="555" y="342" width="2.6" height="3.6" opacity="0.95"/><rect class="w2" x="531" y="352" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="531" y="362" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="539" y="362" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="555" y="392" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="563" y="392" width="2.6" height="3.6" opacity="0.55"/><rect class="w2" x="539" y="402" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="555" y="402" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="620" y="387" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="628" y="397" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="706" y="332" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="714" y="332" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="698" y="342" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="698" y="352" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="674" y="362" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="674" y="372" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="698" y="372" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="682" y="392" width="2.6" height="3.6" opacity="0.55"/><rect class="w2" x="698" y="402" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="775" y="292" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="799" y="292" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="751" y="312" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="775" y="312" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="759" y="322" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="775" y="322" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="783" y="322" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="775" y="332" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="791" y="332" width="2.6" height="3.6" opacity="0.55"/><rect class="w3" x="799" y="332" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="743" y="342" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="791" y="342" width="2.6" height="3.6" opacity="0.55"/><rect class="w2" x="751" y="362" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="767" y="362" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="775" y="362" width="2.6" height="3.6" opacity="0.7"/><rect class="w2" x="743" y="372" width="2.6" height="3.6" opacity="0.7"/><rect class="w3" x="751" y="402" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="858" y="374" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="882" y="374" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="850" y="384" width="2.6" height="3.6" opacity="0.7"/><rect class="w3" x="858" y="394" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="866" y="394" width="2.6" height="3.6" opacity="0.7"/><rect class="w2" x="1047" y="321" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="1063" y="331" width="2.6" height="3.6" opacity="0.7"/><rect class="w2" x="1071" y="331" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="1103" y="331" width="2.6" height="3.6" opacity="0.55"/><rect class="w2" x="1103" y="341" width="2.6" height="3.6" opacity="0.95"/><rect class="w3" x="1111" y="341" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="1087" y="351" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="1103" y="351" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="1063" y="361" width="2.6" height="3.6" opacity="0.95"/><rect class="w3" x="1071" y="361" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="1111" y="361" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="1071" y="381" width="2.6" height="3.6" opacity="0.55"/><rect class="w3" x="1079" y="401" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="1087" y="401" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="1362" y="365" width="2.6" height="3.6" opacity="0.7"/><rect class="w1" x="1386" y="375" width="2.6" height="3.6" opacity="0.95"/><rect class="w3" x="1346" y="385" width="2.6" height="3.6" opacity="0.55"/><rect class="w2" x="1354" y="385" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="1370" y="385" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="1346" y="395" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="1378" y="395" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="1354" y="405" width="2.6" height="3.6" opacity="0.85"/><rect class="w2" x="1362" y="405" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="1378" y="405" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="1421" y="312" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="1421" y="322" width="2.6" height="3.6" opacity="0.55"/><rect class="w3" x="1421" y="332" width="2.6" height="3.6" opacity="0.55"/><rect class="w3" x="1445" y="342" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="1413" y="352" width="2.6" height="3.6" opacity="0.95"/><rect class="w2" x="1445" y="352" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="1437" y="362" width="2.6" height="3.6" opacity="0.7"/><rect class="w2" x="1445" y="362" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="1437" y="402" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="1566" y="357" width="2.6" height="3.6" opacity="0.7"/><rect class="w2" x="1526" y="377" width="2.6" height="3.6" opacity="0.7"/><rect class="w2" x="1566" y="377" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="1550" y="397" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="1024" y="104" width="2.6" height="3.6" opacity="0.55"/><rect class="w2" x="1010" y="140" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="1017" y="200" width="2.6" height="3.6" opacity="0.55"/><rect class="w1" x="1010" y="224" width="2.6" height="3.6" opacity="0.55"/><rect class="w2" x="1024" y="248" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="1017" y="260" width="2.6" height="3.6" opacity="0.85"/><rect class="w1" x="1010" y="272" width="2.6" height="3.6" opacity="0.95"/><rect class="w3" x="1010" y="296" width="2.6" height="3.6" opacity="0.7"/><rect class="w2" x="1017" y="308" width="2.6" height="3.6" opacity="0.85"/><rect class="w3" x="1017" y="332" width="2.6" height="3.6" opacity="0.55"/><rect class="w3" x="1010" y="344" width="2.6" height="3.6" opacity="0.95"/><rect class="w1" x="1024" y="344" width="2.6" height="3.6" opacity="0.7"/><rect class="w2" x="1010" y="356" width="2.6" height="3.6" opacity="0.55"/><rect class="w3" x="1203" y="141" width="2.6" height="3.6" opacity="0.8"/><rect class="w1" x="1211" y="141" width="2.6" height="3.6" opacity="0.8"/><rect class="w3" x="1202" y="152" width="2.6" height="3.6" opacity="0.8"/><rect class="w1" x="1186" y="229" width="2.6" height="3.6" opacity="0.8"/><rect class="w2" x="1216" y="251" width="2.6" height="3.6" opacity="0.8"/><rect class="w1" x="1189" y="273" width="2.6" height="3.6" opacity="0.8"/><rect class="w1" x="1197" y="273" width="2.6" height="3.6" opacity="0.8"/><rect class="w3" x="1194" y="306" width="2.6" height="3.6" opacity="0.8"/><rect class="w3" x="1193" y="317" width="2.6" height="3.6" opacity="0.8"/><rect class="w1" x="1200" y="328" width="2.6" height="3.6" opacity="0.8"/><rect class="w1" x="1199" y="339" width="2.6" height="3.6" opacity="0.8"/><rect class="w3" x="1223" y="339" width="2.6" height="3.6" opacity="0.8"/></g><g fill="#E8C77B"><circle cx="795" cy="34" r="1.8"/><circle cx="795" cy="34" r="6" opacity=".18"/><circle cx="1210" cy="16" r="1.8"/><circle cx="1210" cy="16" r="6" opacity=".18"/></g><rect y="330" width="1600" height="90" fill="url(#skyFade)"/></svg></template><!--SKYLINE:END-->
<!--SCRIPTS-->
```


---

## 2. Shared engine and helpers

Loaded first. Pure calculation and formatting code shared by public pages and every workspace.

### `site/calc.js`

Calculation engine: best mix, stress tests, seeded simulation, readiness, term sheets.

```javascript
/* Aegis Ascend calculation engine (browser and Node).
   Deterministic: no network, no AI, no randomness except a seeded generator for simulations.
   Money in Rs crore unless a name says otherwise. */
(function (root) {
  "use strict";
  const ENGINE_VERSION = "gb-engine 1.0.0";

  // ---------- small helpers ----------
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const clamp = (x, lo, hi) => Math.min(Math.max(x, lo), hi);
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function normal(rand) { // Box-Muller
    let u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // ---------- loans ----------
  /** Equal yearly instalment: P x r / (1 - (1 + r)^-n). */
  function annuity(P, r, n) {
    if (n <= 0) return 0;
    return r === 0 ? P / n : (P * r) / (1 - Math.pow(1 + r, -n));
  }
  /** Yearly schedule with optional interest-only moratorium. Repays to exactly zero. */
  function loanSchedule(P, r, tenor, moratorium = 0) {
    const rows = [];
    let bal = P;
    const pay = annuity(P, r, tenor);
    for (let t = 1; t <= moratorium + tenor; t++) {
      const interest = bal * r;
      let principal = t > moratorium ? pay - interest : 0;
      if (t === moratorium + tenor) principal = bal; // close rounding drift
      rows.push({ year: t, opening: bal, interest, principal, payment: interest + principal, closing: bal - principal });
      bal -= principal;
    }
    return rows;
  }
  /** Internal rate of return of yearly cash flows cf[0..n] by bisection. */
  function irr(cf) {
    const npv = (r) => cf.reduce((a, c, t) => a + c / Math.pow(1 + r, t), 0);
    let lo = -0.99, hi = 5;
    if (npv(lo) * npv(hi) > 0) return NaN;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      if (npv(lo) * npv(mid) <= 0) hi = mid; else lo = mid;
    }
    return (lo + hi) / 2;
  }

  // ---------- Funding Twin ----------
  const TWIN_DEFAULTS = {
    raise: 12, pre_money: 60, value_growth: 0.18, horizon: 7, loan_rate: 0.11, tenor: 7, moratorium: 0,
    tax_rate: 0.25, discount_rate: 0.14, ebitda0: 5, ebitda_growth: 0.12, existing_ds: 1.5, dscr_min: 1.25,
    cash: 3, growth_sigma: 0.08, sales_drop: 0.2, rate_shock: 0.02, op_leverage: 1.5,
  };

  /** Cash flow test for a loan L: DSCR each year = CFADS / (existing debt service + loan payment). */
  function dscrPath(q, L, opt = {}) {
    const drop = opt.salesDrop || 0, shock = opt.rateShock || 0, egr = opt.ebitdaGrowth !== undefined ? opt.ebitdaGrowth : q.ebitda_growth;
    const sch = loanSchedule(L, q.loan_rate + shock, q.tenor, q.moratorium);
    const years = Math.max(q.horizon, sch.length);
    const out = [];
    for (let t = 1; t <= years; t++) {
      const row = sch[t - 1] || { interest: 0, principal: 0, payment: 0, closing: 0 };
      const ebitda = q.ebitda0 * Math.pow(1 + egr, t) * (1 - clamp(drop * q.op_leverage, 0, 1));
      const tax = q.tax_rate * Math.max(ebitda - row.interest, 0);
      const cfads = ebitda - tax;
      const ds = q.existing_ds + row.payment;
      out.push({ year: t, ebitda, tax, cfads, interest: row.interest, principal: row.principal, ds, dscr: ds > 0 ? cfads / ds : Infinity, cash_after: cfads - ds, outstanding: row.closing });
    }
    return out;
  }
  const minDscr = (path) => Math.min(...path.map((r) => r.dscr));

  /** Founder value at the horizon for a given loan L and equity E (founder starts at 100%). */
  function founderValue(q, L, E, valueGrowth) {
    const g = valueGrowth !== undefined ? valueGrowth : q.value_growth;
    const Vn = (q.pre_money + q.raise) * Math.pow(1 + g, q.horizon);
    const sch = loanSchedule(L, q.loan_rate, q.tenor, q.moratorium);
    const inHorizon = sch.slice(0, q.horizon);
    const paid = sum(inHorizon.map((r) => r.payment));
    const shield = sum(inHorizon.map((r) => r.interest)) * q.tax_rate;
    const outstanding = inHorizon.length ? inHorizon[inHorizon.length - 1].closing : L;
    const debtCost = paid - shield + outstanding; // cash the company gives up for the loan
    const stake = E > 0 ? E / (q.pre_money + E) : 0;
    return { Vn, debtCost, paid, shield, outstanding, stake, value: (1 - stake) * (Vn - debtCost) };
  }

  function twin(input) {
    const q = Object.assign({}, TWIN_DEFAULTS, input || {});
    const A = q.raise;
    const sch = loanSchedule(A, q.loan_rate, q.tenor, q.moratorium);
    const debt = founderValue(q, A, 0), eq = founderValue(q, 0, A);
    const disc = Math.pow(1 + q.discount_rate, q.horizon);
    const net = (debt.value - eq.value) / disc;
    // break-even company value: (1 - s) V = V - C  =>  V = C / s
    const breakEven = eq.stake > 0 ? debt.debtCost / eq.stake : Infinity;
    const breakEvenGrowth = Math.pow(breakEven / (q.pre_money + A), 1 / q.horizon) - 1;
    const cases = {
      best: q.value_growth + q.growth_sigma, expected: q.value_growth, worst: q.value_growth - q.growth_sigma,
    };
    const range = {};
    for (const k in cases) {
      const d = founderValue(q, A, 0, cases[k]), e = founderValue(q, 0, A, cases[k]);
      range[k] = { growth: cases[k], debt: d.value, equity: e.value, net: (d.value - e.value) / disc };
    }
    // DSCR paths for all-debt
    const expPath = dscrPath(q, A);
    const stressPath = dscrPath(q, A, { salesDrop: q.sales_drop, rateShock: q.rate_shock });
    // Best mix: debt share 0..100% in 5% steps
    const mixes = [];
    for (let i = 0; i <= 20; i++) {
      const share = i / 20, L = A * share, E = A - L;
      const fv = founderValue(q, L, E);
      const exp = minDscr(dscrPath(q, L)), str = minDscr(dscrPath(q, L, { salesDrop: 0.2, rateShock: 0.02 }));
      mixes.push({ share, loan: L, equity: E, value: fv.value, stake: fv.stake, dscr: exp, dscr_stress: str, ok: exp >= q.dscr_min && str >= 1.0 });
    }
    const feasible = mixes.filter((m) => m.ok);
    const best = feasible.length ? feasible.reduce((a, b) => (b.value > a.value ? b : a)) : mixes[0];
    return {
      q, version: ENGINE_VERSION, schedule: sch, payment: annuity(A, q.loan_rate, q.tenor),
      total_repaid: sum(sch.map((r) => r.payment)), total_interest: sum(sch.map((r) => r.interest)),
      debt, equity: eq, net, break_even: breakEven, break_even_growth: breakEvenGrowth, range,
      dscr_expected: expPath, dscr_stress: stressPath, min_dscr: minDscr(expPath), min_dscr_stress: minDscr(stressPath),
      mixes, best,
    };
  }

  /** Seeded simulation: chance that all-debt beats all-equity, and chance of a year with DSCR below 1. */
  function simulate(input, runs = 2000, seed = 20261013) {
    const q = Object.assign({}, TWIN_DEFAULTS, input || {});
    const rand = mulberry32(seed);
    let debtWins = 0, defaults = 0, bestWins = 0;
    const t = twin(q), bestL = t.best.loan;
    const nets = [];
    for (let i = 0; i < runs; i++) {
      const g = q.value_growth + q.growth_sigma * normal(rand);
      const eg = q.ebitda_growth + q.growth_sigma * normal(rand);
      const shock = clamp(0.1 * normal(rand), -0.5, 0.5); // one-off level shock to EBITDA
      const d = founderValue(q, q.raise, 0, g).value, e = founderValue(q, 0, q.raise, g).value;
      nets.push(d - e);
      if (d > e) debtWins++;
      const qq = Object.assign({}, q, { ebitda0: q.ebitda0 * (1 + shock) });
      if (minDscr(dscrPath(qq, q.raise, { ebitdaGrowth: eg })) < 1) defaults++;
      const bm = founderValue(q, bestL, q.raise - bestL, g).value;
      if (bm > e) bestWins++;
    }
    nets.sort((a, b) => a - b);
    const pick = (p) => nets[Math.min(nets.length - 1, Math.floor(p * nets.length))];
    return { runs, seed, p_debt_better: debtWins / runs, p_default: defaults / runs, p_bestmix_better: bestWins / runs,
      p10: pick(0.1), p50: pick(0.5), p90: pick(0.9) };
  }

  // ---------- Funding Readiness Score ----------
  const READINESS_DEFAULTS = {
    dscr: 1.4, collateral_cover: 1.2, gst_on_time: 10, audited_years: 3, credit_score: 760, debt_to_ebitda: 2.4,
    revenue_growth: 0.22, ebitda_positive_years: 3, board_in_place: true, clean_cap_table: true,
    data_room_ready: false, team_complete: true, market_story: true,
  };
  function readiness(input) {
    const a = Object.assign({}, READINESS_DEFAULTS, input || {});
    const debt = [], eq = [];
    const add = (list, name, pts, max, ok, fix) => list.push({ name, pts, max, ok, fix });
    add(debt, "Repayment safety (DSCR " + a.dscr.toFixed(2) + ")", a.dscr >= 1.5 ? 25 : a.dscr >= 1.25 ? 18 : a.dscr >= 1 ? 8 : 0, 25, a.dscr >= 1.25,
      "Lift DSCR above 1.25: cut the loan size, lengthen the tenor or improve operating cash flow.");
    add(debt, "Collateral cover " + a.collateral_cover.toFixed(2) + "x", a.collateral_cover >= 1.5 ? 20 : a.collateral_cover >= 1 ? 12 : 4, 20, a.collateral_cover >= 1.25,
      "Raise collateral cover to 1.25x or more, or apply for a CGTMSE-backed loan.");
    add(debt, "GST returns filed on time (" + a.gst_on_time + " of 12 months)", Math.round(15 * clamp(a.gst_on_time, 0, 12) / 12), 15, a.gst_on_time >= 11,
      "File every GST return on time for the next 6 months; lenders check the last 12.");
    add(debt, "Audited accounts (" + a.audited_years + " years)", a.audited_years >= 3 ? 10 : a.audited_years === 2 ? 6 : 2, 10, a.audited_years >= 3,
      "Complete 3 years of audited accounts before applying.");
    add(debt, "Credit score " + a.credit_score, a.credit_score >= 750 ? 15 : a.credit_score >= 700 ? 10 : 3, 15, a.credit_score >= 750,
      "Clear overdue accounts and keep utilisation of existing limits below 70% to lift the credit score above 750.");
    add(debt, "Debt / EBITDA " + a.debt_to_ebitda.toFixed(1) + "x", a.debt_to_ebitda <= 2 ? 15 : a.debt_to_ebitda <= 3.5 ? 9 : 2, 15, a.debt_to_ebitda <= 3,
      "Bring debt to EBITDA below 3x before adding new term debt.");
    add(eq, "Revenue growth " + Math.round(a.revenue_growth * 100) + "% a year", a.revenue_growth >= 0.25 ? 25 : a.revenue_growth >= 0.15 ? 18 : a.revenue_growth >= 0.08 ? 10 : 3, 25, a.revenue_growth >= 0.15,
      "Show a credible plan for 15%+ growth; investors price equity on growth.");
    add(eq, "EBITDA positive for " + a.ebitda_positive_years + " years", a.ebitda_positive_years >= 2 ? 15 : a.ebitda_positive_years === 1 ? 8 : 0, 15, a.ebitda_positive_years >= 2,
      "Reach two years of positive EBITDA, or present a clear path to it.");
    add(eq, "Board and statutory compliance", a.board_in_place ? 15 : 3, 15, !!a.board_in_place, "Hold regular board meetings and bring ROC filings up to date.");
    add(eq, "Clean cap table", a.clean_cap_table ? 15 : 3, 15, !!a.clean_cap_table, "Settle informal promises of shares and document every shareholder.");
    add(eq, "Data room ready", a.data_room_ready ? 10 : 2, 10, !!a.data_room_ready, "Put audited accounts, GST returns, key contracts and the cap table in the data room.");
    add(eq, "Management team complete", a.team_complete ? 10 : 4, 10, !!a.team_complete, "Name a finance lead who can answer investor diligence.");
    add(eq, "Market and use-of-funds story", a.market_story ? 10 : 3, 10, !!a.market_story, "Write a one-page use-of-funds and market note.");
    const score = (l) => sum(l.map((x) => x.pts));
    const verdict = (s) => (s >= 75 ? "Ready" : s >= 55 ? "Nearly ready" : "Not yet ready");
    return { debt: { items: debt, score: score(debt), verdict: verdict(score(debt)) }, equity: { items: eq, score: score(eq), verdict: verdict(score(eq)) },
      plan: debt.concat(eq).filter((x) => !x.ok).map((x) => x.fix) };
  }

  // ---------- Term Sheet Analyser ----------
  const LOAN_TS_DEFAULTS = { amount: 10, rate: 0.105, tenor: 7, processing_fee: 0.01, other_fees: 0.05, prepayment_penalty: 0.02,
    floating: true, personal_guarantee: true, cross_default: false, collateral_margin: 0.25 };
  function loanTermSheet(input) {
    const a = Object.assign({}, LOAN_TS_DEFAULTS, input || {});
    const pay = annuity(a.amount, a.rate, a.tenor);
    const fees = a.amount * a.processing_fee + a.other_fees;
    const cf = [a.amount - fees].concat(Array(a.tenor).fill(-pay));
    const allIn = irr(cf);
    const flags = [];
    if (a.personal_guarantee) flags.push(["high", "Personal guarantee: the founder's own assets are at risk if the company defaults."]);
    if (a.cross_default) flags.push(["high", "Cross-default: a missed payment on any other loan triggers default on this one."]);
    if (a.prepayment_penalty > 0.02) flags.push(["medium", "Prepayment penalty above 2% makes refinancing expensive."]);
    if (a.floating) flags.push(["medium", "Floating rate: a 1-point rise adds about Rs " + (a.amount * 0.01 * a.tenor / 2).toFixed(2) + " cr over the loan."]);
    if (a.collateral_margin > 0.25) flags.push(["medium", "Collateral margin above 25% ties up more assets than usual."]);
    if (allIn - a.rate > 0.005) flags.push(["low", "Fees add " + ((allIn - a.rate) * 100).toFixed(2) + " points to the headline rate."]);
    return { a, payment: pay, fees, all_in: allIn, total_paid: pay * a.tenor + fees, flags };
  }
  const EQ_TS_DEFAULTS = { pre_money: 60, investment: 12, option_pool: 0.08, pool_pre_money: true, liq_pref: 1, participating: false,
    anti_dilution: "broad", board_seats: 1, vetoes: 4 };
  function equityTermSheet(input) {
    const a = Object.assign({}, EQ_TS_DEFAULTS, input || {});
    const post = a.pre_money + a.investment;
    const inv = a.investment / post;
    const pool = a.option_pool;
    const founder = 1 - inv - pool;
    const effPre = a.pool_pre_money ? a.pre_money - pool * post : a.pre_money;
    const pref = a.liq_pref * a.investment;
    const exits = [0.5, 1, 2, 3, 5].map((m) => {
      const exit = post * m;
      let investor;
      if (a.participating) investor = Math.min(exit, pref) + inv * Math.max(exit - pref, 0);
      else investor = Math.max(Math.min(exit, pref), inv * exit);
      const rest = Math.max(exit - investor, 0);
      const founderGets = rest * founder / (founder + pool);
      return { multiple: m, exit, investor, founder: founderGets, founder_pct: exit > 0 ? founderGets / exit : 0 };
    });
    const flags = [];
    if (a.participating) flags.push(["high", "Participating preference: the investor takes the preference and then shares in the rest (double dip)."]);
    if (a.liq_pref > 1) flags.push(["high", a.liq_pref + "x liquidation preference: the investor gets " + a.liq_pref + " times their money first."]);
    if (a.anti_dilution === "full") flags.push(["high", "Full-ratchet anti-dilution: a lower future price resets the investor's whole stake."]);
    if (a.pool_pre_money && pool > 0) flags.push(["medium", "Option pool carved from the pre-money: the effective pre-money is Rs " + effPre.toFixed(1) + " cr, not Rs " + a.pre_money + " cr."]);
    if (pool > 0.1) flags.push(["medium", "Option pool above 10% dilutes the founder more than most SME deals need."]);
    if (a.board_seats >= 2) flags.push(["medium", a.board_seats + " investor board seats can shift control."]);
    if (a.vetoes > 6) flags.push(["medium", a.vetoes + " veto rights: day-to-day decisions may need investor consent."]);
    return { a, post, investor_pct: inv, pool_pct: pool, founder_pct: founder, effective_pre: effPre, exits, flags };
  }

  // ---------- Post-funding monitoring ----------
  const COVENANTS = { dscr_min: 1.25, debt_ebitda_max: 3.5 };
  function monitor(quarters, cov) {
    const c = Object.assign({}, COVENANTS, cov || {});
    return (quarters || []).map((q) => {
      const ds = q.interest + q.principal;
      const tax = (q.tax_rate || 0.25) * Math.max(q.ebitda - q.interest, 0);
      const dscr = ds > 0 ? (q.ebitda - tax) / ds : Infinity;
      const lev = q.ebitda > 0 ? q.debt / (q.ebitda * 4) : Infinity;
      const h1 = dscr / c.dscr_min - 1, h2 = 1 - lev / c.debt_ebitda_max;
      const state = (h) => (h < 0 ? "breach" : h < 0.1 ? "watch" : "ok");
      const worst = [state(h1), state(h2)].includes("breach") ? "breach" : [state(h1), state(h2)].includes("watch") ? "watch" : "ok";
      return Object.assign({}, q, { dscr, debt_ebitda: lev, dscr_headroom: h1, lev_headroom: h2, state: worst });
    });
  }

  // ---------- Investor Fit Score ----------
  function fitScore(company, inv) {
    const m = inv.mandate || {}, reasons = [];
    let s = 0;
    if ((m.sectors || []).includes(company.sector)) { s += 35; reasons.push("Invests in " + company.sector); }
    else if ((m.past_sectors || []).includes(company.sector)) { s += 15; reasons.push("Has a past deal in " + company.sector); }
    else reasons.push("Sector outside mandate");
    if ((m.stages || []).includes(company.stage)) { s += 20; reasons.push("Backs " + company.stage + " companies"); }
    const r = company.raise;
    if (r >= m.ticket_min && r <= m.ticket_max) { s += 25; reasons.push("Ticket Rs " + m.ticket_min + "-" + m.ticket_max + " cr fits Rs " + r + " cr"); }
    else if (r >= m.ticket_min * 0.75 && r <= m.ticket_max * 1.25) { s += 10; reasons.push("Ticket close to Rs " + r + " cr"); }
    else reasons.push("Ticket Rs " + m.ticket_min + "-" + m.ticket_max + " cr does not fit");
    if ((m.instruments || []).includes(company.instrument || "equity")) { s += 10; reasons.push("Takes " + (company.instrument || "equity")); }
    if ((m.past_sectors || []).includes(company.sector) && (m.sectors || []).includes(company.sector)) { s += 10; reasons.push("Track record in the sector"); }
    return { score: s, reasons };
  }

  // ---------- Fees ----------
  function dealFees(input) {
    const a = Object.assign({ raise: 10, revenue: 50, revenue_growth: 0, advisory_lakh: 1, success_rate: 0.025, rev_share: 0.004, years: 5, gst: 0.18 }, input || {});
    const years = [];
    for (let y = 1; y <= a.years; y++) years.push({ year: y, revenue: a.revenue * Math.pow(1 + a.revenue_growth, y - 1), fee_lakh: a.revenue * Math.pow(1 + a.revenue_growth, y - 1) * a.rev_share * 100 });
    const success = a.raise * a.success_rate * 100;
    const share = sum(years.map((y) => y.fee_lakh));
    const total = a.advisory_lakh + success + share;
    return { a, advisory: a.advisory_lakh, success, share, years, total, gst: total * a.gst };
  }
  function debtFees(input) {
    const a = Object.assign({ loan: 10, tenor: 7, rate: 0.105, monitoring: 0.0035, transfer_amount: 6, transfer_fee: 0.004 }, input || {});
    const sch = loanSchedule(a.loan, a.rate, a.tenor);
    const mon = sch.map((r) => ({ year: r.year, outstanding: r.opening, fee_lakh: r.opening * a.monitoring * 100 }));
    return { a, monitoring: mon, monitoring_total: sum(mon.map((m) => m.fee_lakh)), transfer_lakh: a.transfer_amount * a.transfer_fee * 100 };
  }

  // ---------- Early exit tax view ----------
  function exitTax(input) {
    const a = Object.assign({ cost: 1, sale: 1.4, months: 14, slab: 0.3, fmv: 1.4 }, input || {});
    const gain = a.sale - a.cost, longTerm = a.months >= 24;
    const rate = longTerm ? 0.125 : a.slab;
    const notes = [];
    if (a.months < 6) notes.push("Minimum holding is 6 months; an earlier sale needs the founder's written consent.");
    if (a.sale < a.fmv) notes.push("Sale below fair market value: sections 50CA and 56(2)(x) can tax seller and buyer on the gap of Rs " + (a.fmv - a.sale).toFixed(2) + " cr.");
    return { a, gain, long_term: longTerm, rate, tax: Math.max(gain, 0) * rate, net: a.sale - Math.max(gain, 0) * rate, notes };
  }

  const api = { ENGINE_VERSION, TWIN_DEFAULTS, READINESS_DEFAULTS, LOAN_TS_DEFAULTS, EQ_TS_DEFAULTS, COVENANTS,
    annuity, loanSchedule, irr, twin, simulate, dscrPath, founderValue, readiness, loanTermSheet, equityTermSheet, monitor, fitScore, dealFees, debtFees, exitTax };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GB = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
```

### `site/optimizer.js`

Equity vs Debt Optimizer (browser port of the Python model).

```javascript
/* Equity vs Debt Optimizer: browser port of optimizer/equity_debt (model.py, analysis.py, advice.py).
   Same formulas and same numbers as the Python package; tests compare the two.
   Money in rupees; rates as fractions. No network, no AI. */
(function (root) {
  "use strict";
  const MIX = Array.from({ length: 101 }, (_, i) => i / 100);
  const DSCR_RISKY = 1.25, DSCR_DEFAULT = 1.0;
  const METRICS = {
    npv_wealth: "Present value of founder wealth (cash + exit stake)",
    total_cash: "Total founder cash over the horizon",
    wealth: "Exit-inclusive wealth (cash + exit stake, not discounted)",
    npv_cash: "Present value of founder cash only",
  };
  const DEFAULTS = {
    amount: 3e7, pre_money: 6e7, profit_month: 12e5, growth_y1: 0.30, growth_y2: 0.15, interest_rate: 0.15,
    tenure_years: 5, horizon_years: 10, tax_rate: 0, exit_multiple: 5, discount_rate: 0.12, debt_fee: 0, equity_cost: 0,
    payout_ratio: 1, growth_boost_equity: 0, growth_boost_debt: 0, min_dscr_required: 1.0, metric: "npv_wealth",
  };

  // ---------- Indian formatting ----------
  function groupIndian(n) {
    const s = String(Math.abs(Math.round(n)));
    if (s.length <= 3) return s;
    let head = s.slice(0, -3); const tail = s.slice(-3); const parts = [];
    while (head.length > 2) { parts.unshift(head.slice(-2)); head = head.slice(0, -2); }
    if (head) parts.unshift(head);
    return parts.join(",") + "," + tail;
  }
  function inr(x, short, d = 2, sym = "Rs ") {
    if (x === null || x === undefined || Number.isNaN(x)) return "-";
    if (!Number.isFinite(x)) return "n/a";
    const sign = x < 0 ? "-" : "", a = Math.abs(x);
    const f = (v) => v.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
    if (short) { if (a >= 1e7) return sign + sym + f(a / 1e7) + " Cr"; if (a >= 1e5) return sign + sym + f(a / 1e5) + " L"; }
    return sign + sym + groupIndian(a);
  }
  const mixLabel = (e) => { const p = Math.round(e * 100); return p + "% equity / " + (100 - p) + "% debt"; };
  const ratio = (x) => (Number.isFinite(x) ? x.toFixed(2) + "x" : "no loan");
  const pct = (x, d = 1) => (x * 100).toFixed(d) + "%";

  // ---------- validation ----------
  function validate(p) {
    const errors = [], warnings = [];
    if (!(p.amount > 0)) errors.push("The amount to raise must be more than zero.");
    if (!(p.pre_money > 0)) errors.push("The pre-money valuation must be more than zero.");
    if (p.profit_month < 0) errors.push("Profit per month cannot be negative. If the company makes a loss, this model does not apply.");
    for (const [n, v] of [["Year-1 growth", p.growth_y1], ["Year-2+ growth", p.growth_y2]]) {
      if (!(v > -1)) errors.push(n + " must be above -100%."); else if (v > 2) warnings.push(n + " of " + pct(v, 0) + " a year is very high. Check it is not a typo.");
    }
    if (!(p.interest_rate >= 0 && p.interest_rate <= 1)) errors.push("The interest rate must be between 0% and 100%.");
    if (!(p.tenure_years >= 1 && p.tenure_years <= 30)) errors.push("The loan tenure must be between 1 and 30 years.");
    if (!(p.horizon_years >= 1 && p.horizon_years <= 20)) errors.push("The analysis horizon must be between 1 and 20 years.");
    if (!(p.tax_rate >= 0 && p.tax_rate < 1)) errors.push("The tax rate must be between 0% and 100%.");
    if (p.exit_multiple < 0) errors.push("The exit multiple cannot be negative.");
    if (!(p.discount_rate > -0.5 && p.discount_rate <= 1)) errors.push("The discount rate must be between -50% and 100%.");
    if (!(p.debt_fee >= 0 && p.debt_fee < 1) || !(p.equity_cost >= 0 && p.equity_cost < 1)) errors.push("Fees must be between 0% and 100%.");
    if (!(p.payout_ratio >= 0 && p.payout_ratio <= 1)) errors.push("The payout ratio must be between 0% and 100%.");
    if (!(p.min_dscr_required >= 1 && p.min_dscr_required <= 3)) errors.push("The minimum DSCR you accept must be between 1.00 and 3.00.");
    if (!METRICS[p.metric]) errors.push("Unknown ranking metric.");
    if (errors.length) return { errors, warnings };
    if (p.amount > p.pre_money) warnings.push("You are raising more than the company is worth today. All-equity would hand investors over half the company.");
    if (p.tenure_years > p.horizon_years) warnings.push("The loan runs past the analysis horizon. The unpaid balance is deducted from the exit value.");
    if (p.interest_rate > 0.24) warnings.push("Interest above 24% a year is unusually expensive for a business loan.");
    return { errors, warnings };
  }

  // ---------- building blocks ----------
  /** Post-money ownership: equity / (pre-money + equity). */
  const investorOwnership = (eq, pre) => (eq > 0 ? eq / (pre + eq) : 0);
  /** EMI = P x r x (1+r)^n / ((1+r)^n - 1), r = annual / 12, n = months; P / n at 0%. */
  function emi(P, annual, years) {
    const n = Math.round(years * 12), r = annual / 12;
    if (n <= 0) throw new Error("tenure must be at least one month");
    if (r === 0) return P / n;
    const g = Math.pow(1 + r, n);
    return (P * r * g) / (g - 1);
  }
  function amortization(P, annual, years) {
    const n = years * 12, r = annual / 12, pay = emi(P, annual, years), rows = [];
    let bal = P;
    for (let m = 1; m <= n; m++) {
      const i = bal * r, p = m < n ? pay - i : bal;
      rows.push({ month: m, opening: bal, emi: i + p, interest: i, principal: p, closing: bal - p });
      bal -= p;
    }
    return rows;
  }
  /** Yearly interest / principal / EMI / closing balance for one loan over the horizon. */
  function yearlyDebt(D, annual, tenure, H) {
    const nm = tenure * 12, r = annual / 12, pay = emi(D, annual, tenure);
    const interest = new Array(H).fill(0), principal = new Array(H).fill(0), closing = new Array(H).fill(0);
    let bal = D;
    for (let m = 1; m <= H * 12; m++) {
      const y = Math.floor((m - 1) / 12);
      if (m <= nm) { const i = bal * r, p = m === nm ? bal : pay - i; interest[y] += i; principal[y] += p; bal -= p; }
      if (m % 12 === 0) closing[y] = bal;
    }
    return { emiMonth: pay, interest, principal, emi: interest.map((v, k) => v + principal[k]), closing };
  }

  // ---------- projection for one mix ----------
  function projectMix(p, e) {
    const H = p.horizon_years, E = p.amount * e, D = p.amount - E;
    const inv = investorOwnership(E, p.pre_money), fdr = 1 - inv;
    const boost = e * p.growth_boost_equity + (1 - e) * p.growth_boost_debt;
    const g1 = p.growth_y1 + boost, g2 = p.growth_y2 + boost;
    const ds = yearlyDebt(D, p.interest_rate, p.tenure_years, H);
    const disc = (y) => Math.pow(1 + p.discount_rate, -y);
    const yrs = [];
    let cum = 0, retCum = 0, npvCash = 0;
    for (let k = 0; k < H; k++) {
      const profit = 12 * p.profit_month * (1 + g1) * Math.pow(1 + g2, k);
      const interest = ds.interest[k], principal = ds.principal[k], emiY = ds.emi[k];
      const tax = p.tax_rate * Math.max(profit - interest, 0);
      const shield = p.tax_rate * profit - tax;
      const fees = k === 0 ? p.debt_fee * D + p.equity_cost * E : 0;
      const after = profit - emiY - tax - fees;
      const pos = Math.max(after, 0), shortfall = Math.min(after, 0);
      const dist = p.payout_ratio * pos, retained = pos - dist;
      const investor = inv * dist, founder = fdr * dist + shortfall;
      cum += founder; retCum += retained; npvCash += founder * disc(k + 1);
      const value = p.exit_multiple * profit - ds.closing[k] + retCum;
      yrs.push({ year: k + 1, profit, interest, principal, emi: emiY, tax, shield, fees, after, dist, retained, investor, founder, shortfall,
        cum, outstanding: ds.closing[k], value, wealthToDate: cum + fdr * Math.max(value, 0), dscr: emiY > 0 ? profit / emiY : Infinity });
    }
    const last = yrs[H - 1];
    const exitStake = fdr * Math.max(last.value, 0);
    const minDscr = Math.min(...yrs.map((y) => y.dscr));
    return { e, equity: E, debt: D, inv, fdr, emiMonth: ds.emiMonth, years: yrs, total_cash: cum, npv_cash: npvCash, exit_stake: exitStake,
      wealth: cum + exitStake, npv_wealth: npvCash + exitStake * disc(H), min_dscr: minDscr,
      years_below_risky: yrs.filter((y) => y.dscr < DSCR_RISKY).length, years_below_one: yrs.filter((y) => y.dscr < DSCR_DEFAULT).length };
  }

  function firstLastingLead(a, b) {
    const ahead = a.map((v, i) => v >= b[i] - 1e-6);
    if (!ahead[ahead.length - 1]) return null;
    let y = ahead.length;
    while (y > 0 && ahead[y - 1]) y--;
    return y + 1;
  }

  /** Test every equity share 0..100% and pick the founder's best allowed mix. */
  function optimize(input) {
    const p = Object.assign({}, DEFAULTS, input || {});
    const { errors } = validate(p);
    if (errors.length) throw new Error(errors[0]);
    const mixes = MIX.map((e) => projectMix(p, e));
    const req = Math.max(DSCR_DEFAULT, p.min_dscr_required) - 1e-12;
    const feasible = mixes.map((m) => m.min_dscr >= req);
    const risky = mixes.map((m, i) => feasible[i] && m.min_dscr < DSCR_RISKY);
    let best = 0, bestScore = -Infinity;
    mixes.forEach((m, i) => { if (feasible[i] && m[p.metric] > bestScore) { bestScore = m[p.metric]; best = i; } });
    const eq = mixes[100], dt = mixes[0];
    return {
      p, mixes, best, feasible, risky, metric: (i) => mixes[i][p.metric],
      breakevenCash: firstLastingLead(dt.years.map((y) => y.cum), eq.years.map((y) => y.cum)),
      breakevenWealth: firstLastingLead(dt.years.map((y) => y.wealthToDate), eq.years.map((y) => y.wealthToDate)),
    };
  }

  // ---------- analyses ----------
  const HORIZONS = [3, 5, 7, 10, 15, 20];
  function horizonTable(p) {
    return HORIZONS.map((h) => {
      const r = optimize(Object.assign({}, p, { horizon_years: h })), m = r.metric;
      return { horizon: h, best_equity: MIX[r.best], best_score: m(r.best), all_equity: m(100), all_debt: r.feasible[0] ? m(0) : null,
        gap_vs_equity: m(r.best) - m(100), gap_debt_vs_equity: m(0) - m(100), breakeven: r.breakevenCash };
    });
  }
  function horizonExplanation(rows) {
    const a = rows[0], b = rows[rows.length - 1];
    let s = "Over " + a.horizon + " years the best mix is " + mixLabel(a.best_equity) + "; over " + b.horizon + " years it is " + mixLabel(b.best_equity) + ". ";
    s += a.gap_debt_vs_equity < b.gap_debt_vs_equity
      ? "The longer the horizon, the more debt is worth to the founder. A loan costs a fixed amount and stops when the tenure ends, but shares sold to investors keep taking their slice of every year's profit and of the exit value."
      : "Over this range a longer horizon does not favour debt more, usually because the loan runs past the horizon or growth is low.";
    return s;
  }
  const SENS = [
    ["Profit growth", "-10 pts", (p) => ({ growth_y1: p.growth_y1 - 0.1, growth_y2: p.growth_y2 - 0.1 })],
    ["Profit growth", "-5 pts", (p) => ({ growth_y1: p.growth_y1 - 0.05, growth_y2: p.growth_y2 - 0.05 })],
    ["Profit growth", "+5 pts", (p) => ({ growth_y1: p.growth_y1 + 0.05, growth_y2: p.growth_y2 + 0.05 })],
    ["Profit growth", "+10 pts", (p) => ({ growth_y1: p.growth_y1 + 0.1, growth_y2: p.growth_y2 + 0.1 })],
    ["Interest rate", "-2 pts", (p) => ({ interest_rate: Math.max(p.interest_rate - 0.02, 0) })],
    ["Interest rate", "+2 pts", (p) => ({ interest_rate: p.interest_rate + 0.02 })],
    ["Valuation", "-20%", (p) => ({ pre_money: p.pre_money * 0.8 })],
    ["Valuation", "+20%", (p) => ({ pre_money: p.pre_money * 1.2 })],
    ["Loan tenure", "-2 yrs", (p) => ({ tenure_years: Math.max(p.tenure_years - 2, 1) })],
    ["Loan tenure", "+2 yrs", (p) => ({ tenure_years: p.tenure_years + 2 })],
  ];
  function sensitivity(p) {
    const base = optimize(p), bs = base.metric(base.best);
    const rows = [];
    for (const [v, c, fn] of SENS) {
      const q = Object.assign({}, p, fn(p));
      if (q.growth_y1 <= -1 || q.growth_y2 <= -1) continue;
      const r = optimize(q), s = r.metric(r.best);
      rows.push({ variable: v, case: c, best_equity: MIX[r.best], best_score: s, change: s - bs, moved: Math.round((MIX[r.best] - MIX[base.best]) * 100) });
    }
    return { base_equity: MIX[base.best], base_score: bs, rows };
  }
  const downside = (p) => optimize(Object.assign({}, p, { growth_y1: p.growth_y1 / 2, growth_y2: p.growth_y2 / 2 }));

  /** Plain-English suggestions from the numbers (mirror of advice.py). */
  function suggestions(r, down, hrows, short = true) {
    const p = r.p, b = r.best, M = r.mixes, mb = M[b], m = r.metric, f = (x) => inr(x, short);
    const out = [];
    const why = ["Best mix: **" + mixLabel(mb.e) + "**, ranked by " + METRICS[p.metric].toLowerCase() + "."];
    if (b === 0) why.push("All debt wins because the loan costs " + pct(p.interest_rate) + " a year for " + p.tenure_years + " years and then stops, while selling equity would hand investors " + pct(M[100].inv) + " of every year's profit and of the exit value, forever.");
    else if (b === 100) why.push("All equity wins: with these numbers the EMI eats too much of the profit, or the loan breaks your minimum repayment cover, so giving away shares costs the founder less than servicing the debt.");
    else why.push("This is the most debt your profit can safely carry (lowest DSCR " + ratio(mb.min_dscr) + " against your minimum of " + Math.max(1, p.min_dscr_required).toFixed(2) + "x). More debt would be cheaper still, but would leave a year where profit does not cover the EMI with enough room.");
    why.push("Against 100% equity the founder is better off by **" + f(m(b) - m(100)) + "**" + (r.feasible[0] && b !== 0 ? "; against 100% debt by **" + f(m(b) - m(0)) + "**." : "."));
    why.push("Why the answer is usually at one end: each extra rupee of equity dilutes you a little less than the one before (ownership = equity / (valuation + equity)), so mixing rarely beats the better pure option. A mix wins when the loan has to be capped by cash flow, or when the two routes change growth differently.");
    if (p.tax_rate) why.push("Interest is tax-deductible: at " + pct(p.tax_rate) + " tax the loan saves " + f(mb.years.reduce((a, y) => a + y.shield, 0)) + " of tax over the horizon.");
    if (r.breakevenCash) why.push("Pure equity gives more cash in the early years; 100% debt overtakes it in cumulative founder cash from year " + r.breakevenCash + ".");
    out.push(["Why this mix wins", why]);
    const risks = [], db = down.mixes[b];
    if (mb.debt > 0) {
      risks.push(mb.min_dscr < DSCR_RISKY ? "Repayment cover is thin: in the weakest year profit is only " + ratio(mb.min_dscr) + " the EMI. Lenders usually want 1.25x or more." : "Repayment cover is healthy: profit is at least " + ratio(mb.min_dscr) + " the EMI in every year of the loan.");
      risks.push(db.min_dscr < 1 ? "**Growth miss:** if profit grows at half the rate you expect, this mix cannot pay its EMI in some years (DSCR " + ratio(db.min_dscr) + "). You would have to put in " + f(-db.years.reduce((a, y) => a + y.shortfall, 0)) + " of your own money." : "**Growth miss:** at half the expected growth, cover drops to " + ratio(db.min_dscr) + " but the EMI is still paid.");
      risks.push("**Interest-rate risk:** if the loan is on a floating rate, a 2-point rise adds about " + f(mb.debt * 0.02 * p.tenure_years / 2) + " of interest over the loan.");
      risks.push("A term loan usually needs collateral and often a personal guarantee from the founder.");
    }
    if (mb.equity > 0) {
      risks.push("**Dilution:** investors would own " + pct(mb.inv) + " for good; you keep " + pct(mb.fdr) + ".");
      risks.push("**Investor rights:** read the term sheet for board seats, veto rights, liquidation preference and anti-dilution clauses.");
    }
    out.push(["Risks", risks]);
    const fund = ["Debt is cheaper when profit is stable and growth is predictable: the cost is fixed and ends with the tenure.",
      "Equity is safer for uncertain or early businesses: there is no EMI to pay in a bad year.",
      "Keep DSCR above 1.25 in every year so a bad quarter does not become a default.",
      "In India, more than 50% of the votes controls ordinary resolutions, and more than 25% can block special resolutions (which need 75%). Avoid dropping below 51%, and never below 26%, if you want to keep control."];
    if (!p.tax_rate) fund.push("Tax is set to 0%, so the tax shield on interest is not counted. Enter your tax rate under Advanced to include it.");
    if (mb.fdr < 0.51) fund.push("Warning: this mix leaves you " + pct(mb.fdr) + ", below 51%. You would lose sole control of ordinary resolutions.");
    if (mb.fdr <= 0.26) fund.push("Warning: " + pct(mb.fdr) + " is at or below 26%. You could no longer block special resolutions.");
    out.push(["Fundamentals", fund]);
    const dm = (i) => down.mixes[i][p.metric];
    const dd = ["If profit grows at half your expectation (" + pct(p.growth_y1 / 2) + " in year 1, " + pct(p.growth_y2 / 2) + " after), the best mix becomes **" + mixLabel(MIX[down.best]) + "**.",
      "The recommended mix would then give " + f(dm(b)) + " instead of " + f(m(b)) + " (" + f(dm(b) - m(b)) + ")."];
    if (db.years_below_one) dd.push("In " + db.years_below_one + " year(s) profit would not cover the EMI.");
    out.push(["Downside: growth at half the plan", dd]);
    if (hrows) out.push(["If the horizon changes", [horizonExplanation(hrows)]]);
    return out;
  }

  const api = { MIX, METRICS, DEFAULTS, DSCR_RISKY, DSCR_DEFAULT, groupIndian, inr, mixLabel, ratio, pct, validate, investorOwnership, emi,
    amortization, yearlyDebt, projectMix, optimize, firstLastingLead, horizonTable, horizonExplanation, sensitivity, downside, suggestions };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.EDO = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
```

### `site/ui.js`

Escaping, number formats, the click-any-number explain panel, small SVG charts.

```javascript
/* Shared UI helpers: escaping, formatting, the click-any-number explain panel, and small SVG charts. */
(function (root) {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const n = (x, d = 1) => (Number.isFinite(x) ? x.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d }) : "n/a");
  const cr = (x, d = 1) => "Rs " + n(x, d) + " cr";
  const lakh = (x, d = 1) => "Rs " + n(x, d) + " lakh";
  const pct = (x, d = 0) => (Number.isFinite(x) ? (x * 100).toFixed(d) + "%" : "n/a");
  const xx = (x) => (Number.isFinite(x) ? x.toFixed(2) + "x" : "no debt");
  const date = (s) => (s ? new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "");
  const dt = (s) => (s ? new Date(s).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

  // ---------- glass box: every number can explain itself ----------
  const REG = new Map();
  let seq = 0;
  /** Returns a clickable number. info: {title, formula, inputs: [[label, value, source]], note} */
  function gx(display, info) {
    const k = "x" + ++seq;
    REG.set(k, info);
    if (REG.size > 600) REG.delete(REG.keys().next().value);
    return '<button type="button" class="gx" data-gx="' + k + '" title="Show how this number is calculated">' + esc(display) + "</button>";
  }
  function openExplain(k) {
    const info = REG.get(k); if (!info) return;
    const p = document.getElementById("explain");
    const rows = (info.inputs || []).map(([l, v, s]) => "<tr><td>" + esc(l) + "</td><td class=\"num\">" + esc(v) + "</td><td><span class=\"src src-" + esc((s || "engine").split(" ")[0]) + "\">" + esc(s || "engine") + "</span></td></tr>").join("");
    p.querySelector(".xp-body").innerHTML =
      "<h3>" + esc(info.title) + "</h3>" +
      '<div class="xp-label">Formula</div><pre class="formula">' + esc(info.formula) + "</pre>" +
      (rows ? '<div class="xp-label">Inputs used</div><div class="tw"><table class="tbl"><thead><tr><th>Input</th><th class="num">Value</th><th>Source</th></tr></thead><tbody>' + rows + "</tbody></table></div>" : "") +
      (info.note ? '<p class="muted">' + esc(info.note) + "</p>" : "") +
      '<p class="xp-ver">Calculated by ' + esc(root.GB ? root.GB.ENGINE_VERSION : "engine") + " in this page. No AI produced this number.</p>";
    p.hidden = false; p.querySelector(".xp-close").focus();
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-gx]"); if (b) { e.preventDefault(); openExplain(b.dataset.gx); }
    if (e.target.closest(".xp-close") || e.target.id === "explain") document.getElementById("explain").hidden = true;
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { const p = document.getElementById("explain"); if (p) p.hidden = true; } });

  // ---------- charts (single axis, direct labels, hover tooltips) ----------
  const C = { debt: "var(--s-debt)", equity: "var(--s-equity)", mix: "var(--s-mix)", grid: "var(--grid)", axis: "var(--axis)", ink: "var(--ink-2)", bad: "var(--bad)", warn: "var(--warn)" };
  function niceStep(range, k) { const raw = range / k, p = Math.pow(10, Math.floor(Math.log10(raw || 1))), f = raw / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
  function ticks(lo, hi, k = 4) { if (!(hi > lo)) hi = lo + 1; const s = niceStep(hi - lo, k), out = []; for (let v = Math.ceil(lo / s - 1e-9) * s; v <= hi + 1e-9; v += s) out.push(+v.toFixed(8)); return out; }
  let chartSeq = 0;

  /** Horizontal bars with value labels. rows: [{label, value, color, note}] */
  function hbars(rows, opt = {}) {
    const W = 560, rowH = 40, pad = { l: 170, r: 90, t: 8, b: 26 }, H = pad.t + pad.b + rows.length * rowH;
    const mx = Math.max(...rows.map((r) => r.value), 0) * 1.05 || 1, mn = Math.min(0, ...rows.map((r) => r.value));
    const x = (v) => pad.l + (v - mn) / (mx - mn) * (W - pad.l - pad.r);
    let s = '<svg viewBox="0 0 ' + W + " " + H + '" class="chart" role="img" aria-label="' + esc(opt.label || "") + '">';
    for (const t of ticks(mn, mx)) s += '<line x1="' + x(t) + '" x2="' + x(t) + '" y1="' + pad.t + '" y2="' + (H - pad.b) + '" stroke="' + C.grid + '"/><text x="' + x(t) + '" y="' + (H - 8) + '" text-anchor="middle" class="tick">' + n(t, 0) + "</text>";
    rows.forEach((r, i) => {
      const y = pad.t + i * rowH + 8, h = rowH - 16, x0 = x(0), x1 = x(r.value);
      s += '<text x="' + (pad.l - 10) + '" y="' + (y + h / 2 + 4) + '" text-anchor="end" class="lab">' + esc(r.label) + "</text>";
      s += '<rect class="bar h" x="' + Math.min(x0, x1) + '" y="' + y + '" width="' + Math.max(Math.abs(x1 - x0), 1) + '" height="' + h + '" rx="4" fill="' + r.color + '"><title>' + esc(r.label + ": " + cr(r.value)) + "</title></rect>";
      s += '<text x="' + (Math.max(x0, x1) + 8) + '" y="' + (y + h / 2 + 4) + '" class="val">' + esc(opt.fmt ? opt.fmt(r.value) : cr(r.value)) + "</text>";
    });
    return s + "</svg>";
  }

  /** Line chart with crosshair tooltip. series: [{name, color, values, dash}], refs: [{y, label, color}] */
  function lines(xs, series, opt = {}) {
    const id = "lc" + ++chartSeq, W = 560, H = opt.height || 240, pad = { l: 46, r: 16, t: 14, b: 28 };
    const all = series.flatMap((s) => s.values.filter(Number.isFinite)).concat((opt.refs || []).map((r) => r.y));
    let lo = opt.min !== undefined ? opt.min : Math.min(0, ...all), hi = Math.max(...all) * 1.1;
    if (opt.max !== undefined) hi = Math.min(hi, opt.max);
    const X = (i) => pad.l + (xs.length === 1 ? 0.5 : i / (xs.length - 1)) * (W - pad.l - pad.r);
    const Y = (v) => H - pad.b - (Math.min(Math.max(v, lo), hi) - lo) / (hi - lo) * (H - pad.t - pad.b);
    let s = '<div class="chartwrap" id="' + id + '"><svg viewBox="0 0 ' + W + " " + H + '" class="chart" role="img" aria-label="' + esc(opt.label || "") + '">';
    for (const t of ticks(lo, hi)) s += '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + Y(t) + '" y2="' + Y(t) + '" stroke="' + C.grid + '"/><text x="' + (pad.l - 6) + '" y="' + (Y(t) + 4) + '" text-anchor="end" class="tick">' + esc(opt.yfmt ? opt.yfmt(t) : n(t, t % 1 ? 1 : 0)) + "</text>";
    const every = opt.xEvery || Math.ceil(xs.length / 10);
    xs.forEach((x, i) => { if (i % every === 0) s += '<text x="' + X(i) + '" y="' + (H - 8) + '" text-anchor="middle" class="tick">' + esc(x) + "</text>"; });
    for (const r of opt.refs || []) s += '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + Y(r.y) + '" y2="' + Y(r.y) + '" stroke="' + (r.color || C.bad) + '" stroke-dasharray="5 4" stroke-width="1.5"/><text x="' + (W - pad.r) + '" y="' + (Y(r.y) - 5) + '" text-anchor="end" class="reflab">' + esc(r.label) + "</text>";
    for (const se of series) {
      const pts = se.values.map((v, i) => (Number.isFinite(v) ? X(i).toFixed(1) + "," + Y(v).toFixed(1) : null)).filter(Boolean);
      s += '<polyline class="ln" points="' + pts.join(" ") + '" fill="none" stroke="' + se.color + '" stroke-width="2"' + (se.dash ? ' stroke-dasharray="6 4"' : "") + ' stroke-linejoin="round"/>';
      if (se.diamonds) se.values.forEach((v, i) => { if (Number.isFinite(v)) s += '<rect x="' + (X(i) - 4.5).toFixed(1) + '" y="' + (Y(v) - 4.5).toFixed(1) + '" width="9" height="9" transform="rotate(45 ' + X(i).toFixed(1) + " " + Y(v).toFixed(1) + ')" fill="' + se.color + '" stroke="var(--surface,#fff)" stroke-width="1.5"/>'; });
      else se.values.forEach((v, i) => { if (Number.isFinite(v) && (se.dots || xs.length <= 12)) s += '<circle cx="' + X(i) + '" cy="' + Y(v) + '" r="' + (se.hollow && se.hollow[i] ? 4 : 4) + '" fill="' + (se.hollow && se.hollow[i] ? "var(--surface)" : se.color) + '" stroke="' + se.color + '" stroke-width="2"/>'; });
      if (se.endLabel !== false) { const last = se.values.length - 1; if (Number.isFinite(se.values[last])) s += '<text x="' + (X(last) - 4) + '" y="' + (Y(se.values[last]) - 9) + '" text-anchor="end" class="dl">' + esc(se.name) + "</text>"; }
    }
    const dia = (x, y, r, fill) => '<rect x="' + (x - r).toFixed(1) + '" y="' + (y - r).toFixed(1) + '" width="' + 2 * r + '" height="' + 2 * r + '" transform="rotate(45 ' + x.toFixed(1) + " " + y.toFixed(1) + ')" fill="' + fill + '" stroke="var(--surface,#fff)" stroke-width="2"/>';
    for (const m of opt.marks || []) s += dia(X(m.i), Y(m.v), m.gold === false ? 5 : 7, m.gold === false ? "var(--ink-2)" : "var(--gold)") + '<text x="' + X(m.i) + '" y="' + (Y(m.v) + 24) + '" text-anchor="middle" class="dl">' + esc(m.label) + "</text>";
    s += '<line class="xh" x1="0" x2="0" y1="' + pad.t + '" y2="' + (H - pad.b) + '" stroke="var(--axis)" visibility="hidden"/>';
    xs.forEach((x, i) => {
      const w = (W - pad.l - pad.r) / Math.max(xs.length - 1, 1);
      s += '<rect class="hit" data-i="' + i + '" x="' + (X(i) - w / 2) + '" y="' + pad.t + '" width="' + w + '" height="' + (H - pad.t - pad.b) + '" fill="transparent"/>';
    });
    s += "</svg>";
    s += '<div class="legend">' + series.map((se) => '<span><i style="background:' + se.color + '"></i>' + esc(se.name) + "</span>").join("") + (opt.refs || []).map((r) => '<span><i class="dash" style="border-color:' + (r.color || C.bad) + '"></i>' + esc(r.label) + "</span>").join("") + "</div>";
    s += '<div class="tip" hidden></div></div>';
    setTimeout(() => {
      const el = document.getElementById(id); if (!el) return;
      const tip = el.querySelector(".tip"), xh = el.querySelector(".xh"), svg = el.querySelector("svg");
      el.querySelectorAll(".hit").forEach((r) => {
        r.addEventListener("mouseenter", () => {
          const i = +r.dataset.i;
          xh.setAttribute("x1", X(i)); xh.setAttribute("x2", X(i)); xh.setAttribute("visibility", "visible");
          tip.innerHTML = "<b>" + esc(xs[i]) + "</b>" + series.map((se) => '<div><i style="background:' + se.color + '"></i>' + esc(se.name) + ": " + esc(opt.yfmt ? opt.yfmt(se.values[i]) : n(se.values[i], 2)) + "</div>").join("");
          const bb = svg.getBoundingClientRect(), px = X(i) / W * bb.width;
          tip.style.left = Math.min(Math.max(px - 80, 0), bb.width - 170) + "px"; tip.hidden = false;
        });
        r.addEventListener("mouseleave", () => { tip.hidden = true; xh.setAttribute("visibility", "hidden"); });
      });
    }, 0);
    return s;
  }

  /** Vertical bars for a few categories, value-labelled. */
  function vbars(cats, values, color, opt = {}) {
    const W = 560, H = opt.height || 200, pad = { l: 46, r: 10, t: 22, b: 28 };
    const hi = Math.max(...values, 0) * 1.15 || 1;
    const bw = (W - pad.l - pad.r) / cats.length;
    const Y = (v) => H - pad.b - v / hi * (H - pad.t - pad.b);
    let s = '<svg viewBox="0 0 ' + W + " " + H + '" class="chart" role="img" aria-label="' + esc(opt.label || "") + '">';
    for (const t of ticks(0, hi)) s += '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + Y(t) + '" y2="' + Y(t) + '" stroke="' + C.grid + '"/><text x="' + (pad.l - 6) + '" y="' + (Y(t) + 4) + '" text-anchor="end" class="tick">' + n(t, 0) + "</text>";
    cats.forEach((c, i) => {
      const x = pad.l + i * bw + bw * 0.2, w = bw * 0.6, y = Y(values[i]);
      s += '<rect class="bar" x="' + x + '" y="' + y + '" width="' + w + '" height="' + Math.max(H - pad.b - y, 0) + '" rx="4" fill="' + (Array.isArray(color) ? color[i] : color) + '"><title>' + esc(c + ": " + (opt.fmt ? opt.fmt(values[i]) : n(values[i]))) + "</title></rect>";
      if (opt.values !== false) s += '<text x="' + (x + w / 2) + '" y="' + (y - 6) + '" text-anchor="middle" class="val">' + esc(opt.fmt ? opt.fmt(values[i]) : n(values[i])) + "</text>";
      if (!opt.xEvery || i % opt.xEvery === 0) s += '<text x="' + (x + w / 2) + '" y="' + (H - 8) + '" text-anchor="middle" class="tick">' + esc(c) + "</text>";
    });
    return s + "</svg>";
  }

  /** Stacked vertical bars. series: [{name, color, values}] (negative values stack below zero). opt.tops: label over each bar. */
  function stack(cats, series, opt = {}) {
    const W = 560, H = opt.height || 260, pad = { l: 52, r: 10, t: 26, b: 30 };
    const pos = cats.map((_, i) => series.reduce((a, s) => a + Math.max(s.values[i], 0), 0));
    const neg = cats.map((_, i) => series.reduce((a, s) => a + Math.min(s.values[i], 0), 0));
    const hi = Math.max(...pos, 1e-9) * 1.12, lo = Math.min(0, ...neg) * 1.12;
    const Y = (v) => H - pad.b - (v - lo) / (hi - lo) * (H - pad.t - pad.b);
    const bw = (W - pad.l - pad.r) / cats.length;
    let s = '<svg viewBox="0 0 ' + W + " " + H + '" class="chart" role="img" aria-label="' + esc(opt.label || "") + '">';
    for (const t of ticks(lo, hi)) s += '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + Y(t) + '" y2="' + Y(t) + '" stroke="' + C.grid + '"/><text x="' + (pad.l - 6) + '" y="' + (Y(t) + 4) + '" text-anchor="end" class="tick">' + esc(opt.yfmt ? opt.yfmt(t) : n(t, 0)) + "</text>";
    cats.forEach((c, i) => {
      const x = pad.l + i * bw + bw * 0.18, w = bw * 0.64;
      let up = 0, down = 0;
      for (const se of series) {
        const v = se.values[i]; if (!v) continue;
        const y0 = v >= 0 ? up : down, y1 = y0 + v;
        if (v >= 0) up = y1; else down = y1;
        const top = Math.min(Y(y0), Y(y1)), h = Math.abs(Y(y1) - Y(y0));
        s += '<rect class="bar" x="' + x.toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + Math.max(h - 1, 0.5).toFixed(1) + '" fill="' + se.color + '"><title>' + esc(c + " · " + se.name + ": " + (opt.fmt ? opt.fmt(v) : n(v))) + "</title></rect>";
      }
      if (opt.tops) s += '<text x="' + (x + w / 2) + '" y="' + (Y(up) - 7) + '" text-anchor="middle" class="val">' + esc(opt.tops[i]) + "</text>";
      s += '<text x="' + (x + w / 2) + '" y="' + (H - 9) + '" text-anchor="middle" class="tick">' + esc(c) + "</text>";
    });
    s += '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + Y(0) + '" y2="' + Y(0) + '" stroke="' + C.axis + '"/></svg>';
    return s + '<div class="legend">' + series.map((se) => '<span><i style="background:' + se.color + ';height:9px;width:9px"></i>' + esc(se.name) + "</span>").join("") + "</div>";
  }

  /** A 0-100 score meter. */
  function meter(score, label) {
    const st = score >= 75 ? "good" : score >= 55 ? "warn" : "bad";
    return '<div class="meter"><div class="meter-top"><span>' + esc(label) + '</span><b>' + score + '<small>/100</small></b></div><div class="meter-bar"><i class="' + st + '" style="width:' + score + '%"></i></div></div>';
  }
  function chip(state, text) { return '<span class="chip ' + esc(state) + '">' + esc(text) + "</span>"; }

  root.UI = { esc, n, cr, lakh, pct, xx, date, dt, gx, hbars, lines, vbars, stack, meter, chip, C };
})(typeof globalThis !== "undefined" ? globalThis : this);
```

### `site/domain.js`

Business arithmetic in integer paise; mirrors server/domain.py.

```javascript
/* Business arithmetic for the browser: a line-for-line mirror of server/domain.py
   (server/tests/test_parity.py checks both give the same numbers). Money is integer paise. */
(function (root) {
  "use strict";
  const SETTINGS_DEFAULT = { id: "settings", max_platform_investors: 20, offer_limit: 200, offer_warn: 150, member_limit: 200, member_warn: 180, lock_months: 6 };
  const SECURITY_TYPES = ["equity", "preference", "debentures"];
  const PIPELINE = ["applied", "under_review", "approved", "offering", "funded", "monitoring", "closed", "rejected"];
  const DOC_CHECKLIST = [["valuation_report", "Registered valuer's report"], ["mgt14", "Special resolution filed (MGT-14)"], ["pas4", "PAS-4 offer letters issued"],
    ["bank_account", "Separate bank account for the issue"], ["allotment", "Shares allotted"], ["pas3", "PAS-3 filed (within 15 days of allotment)"], ["demat_credit", "Shares credited to demat"]];

  // ---------- dates (ISO "YYYY-MM-DD", calendar arithmetic in UTC) ----------
  const pad = (x) => String(x).padStart(2, "0");
  const iso = (y, m, d) => y + "-" + pad(m) + "-" + pad(d);
  const parts = (s) => [+s.slice(0, 4), +s.slice(5, 7), +s.slice(8, 10)];
  const leap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const mdays = (y, m) => [31, leap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  function addMonths(s, n) {
    const [y0, m0, d0] = parts(s);
    const m = m0 - 1 + n, y = y0 + Math.floor(m / 12), mm = ((m % 12) + 12) % 12 + 1;
    return iso(y, mm, Math.min(d0, mdays(y, mm)));
  }
  const ord = (s) => { const [y, m, d] = parts(s); return Date.UTC(y, m - 1, d) / 86400000; };
  function addDays(s, n) { const t = new Date((ord(s) + n) * 86400000); return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); }
  const daysBetween = (a, b) => ord(b) - ord(a);
  function fy(s) { const [y0, m] = parts(s); const y = m >= 4 ? y0 : y0 - 1; return y + "-" + pad((y + 1) % 100); }
  const halfUp = (x) => Math.floor(x + 0.5);
  function todayISO() { const t = new Date(); return iso(t.getFullYear(), t.getMonth() + 1, t.getDate()); }

  // ---------- loans ----------
  function schedule(loan, today) {
    const P = +loan.amount_paise, bps = +loan.rate_bps, T = +loan.tenor_months, M = +(loan.moratorium_months || 0);
    const start = loan.disbursal_date, paid = loan.payments || {};
    if (!start || P <= 0 || T <= 0) return [];
    const r = bps / 120000, n = T - M;
    let f = 1;
    for (let i = 0; i < n; i++) f = f * (1 + r);
    const emi = n > 0 && r > 0 ? halfUp(P * r * f / (f - 1)) : n > 0 ? halfUp(P / n) : 0;
    const rows = []; let opening = P;
    for (let k = 1; k <= T; k++) {
      const due = addMonths(start, k), interest = halfUp(opening * bps / 120000);
      const principal = k <= M ? 0 : k === T ? opening : Math.min(emi - interest, opening);
      const closing = opening - principal;
      const status = paid[due] ? "paid" : due < today ? "overdue" : "pending";
      rows.push({ n: k, due, opening, interest, principal, payment: interest + principal, closing, status, paid_on: paid[due] || null });
      opening = closing;
    }
    return rows;
  }
  function loanSummary(loan, today) {
    const rows = schedule(loan, today), paid = rows.filter((r) => r.status === "paid"), unpaid = rows.filter((r) => r.status !== "paid");
    const month = today.slice(0, 7), nxt = unpaid[0] || null, repaid = paid.reduce((a, r) => a + r.principal, 0);
    return {
      disbursed: rows.length ? +loan.amount_paise : 0, principal_repaid: repaid, principal_pending: rows.length ? +loan.amount_paise - repaid : 0,
      interest_earned: paid.reduce((a, r) => a + r.interest, 0), interest_this_month: rows.filter((r) => r.due.slice(0, 7) === month).reduce((a, r) => a + r.interest, 0),
      monthly_interest: nxt ? nxt.interest : 0, next_due: nxt && nxt.due, next_amount: nxt && nxt.payment,
      overdue: rows.filter((r) => r.status === "overdue").length, remaining_months: unpaid.length,
    };
  }
  const minHoldingMonths = (loan) => (+loan.tenor_months <= 24 ? 3 : 6);

  // ---------- cap table and counters ----------
  const platformInvestors = (st, cid) => [...new Set(st.holdings.filter((h) => h.company_id === cid && h.shares > 0).map((h) => h.investor_id))].sort();
  const members = (st, cid) => st.cap_table.filter((e) => e.company_id === cid && e.shares > 0).reduce((a, e) => a + (+e.holders || 1), 0) + platformInvestors(st, cid).length;
  function fdShares(st, cid) {
    const c = st.companies.find((x) => x.id === cid);
    if (c && c.fd_shares !== undefined && !st.cap_table) return c.fd_shares; // investor view: the server sends the total
    return st.cap_table.filter((e) => e.company_id === cid).reduce((a, e) => a + e.shares, 0) + st.holdings.filter((h) => h.company_id === cid).reduce((a, h) => a + h.shares, 0) + (+(c && c.fd_extra_shares) || 0);
  }
  function offersUsed(st, cid, year, sec) {
    const c = st.companies.find((x) => x.id === cid);
    const on = new Set(st.offers.filter((o) => o.company_id === cid && o.fy === year && o.security_type === sec).map((o) => o.investor_id));
    return on.size + (+((((c && c.external_offers) || {})[year] || {})[sec]) || 0);
  }
  function latestValuation(st, cid, on) {
    const v = st.valuations.filter((x) => x.company_id === cid && (on == null || x.date <= on));
    return v.length ? v.reduce((a, b) => (b.date > a.date ? b : a)) : null;
  }
  const lockUntil = (h, s) => addMonths(h.allotment_date, s.lock_months);
  function holdingView(st, h, today, s) {
    const v = latestValuation(st, h.company_id), cost = +h.cost_paise;
    const price = v ? v.price_per_share_paise : h.shares ? Math.floor(cost / h.shares) : 0;
    const value = h.shares * price, unlock = lockUntil(h, s);
    return { id: h.id, company_id: h.company_id, shares: h.shares, cost, avg_cost: h.shares ? cost / h.shares : 0, price, valuation_date: v && v.date, value,
      gain: value - cost, gain_pct: cost ? (value - cost) / cost : 0, ownership: h.shares / fdShares(st, h.company_id), lock_until: unlock, eligible: today >= unlock || !!h.early_consent };
  }
  function portfolio(st, investorId, today, s) {
    const rows = st.holdings.filter((h) => h.investor_id === investorId && h.shares > 0).map((h) => holdingView(st, h, today, s));
    const inv = rows.reduce((a, r) => a + r.cost, 0), val = rows.reduce((a, r) => a + r.value, 0);
    return { rows, invested: inv, value: val, gain: val - inv, gain_pct: inv ? (val - inv) / inv : 0, companies: rows.length };
  }
  function capitalGainsEstimate(h, view, today) {
    const months = daysBetween(h.allotment_date, today) / 30.4375, long = months >= 24;
    return { months, long_term: long, gain: view.gain, tax: long ? halfUp(Math.max(view.gain, 0) * 0.125) : null };
  }

  // ---------- returns ----------
  /** XIRR by bisection on [-99%, +1000%]; flows: [{date, amount}] with at least one negative and one positive. */
  function xirr(flows) {
    if (!flows.some((f) => f.amount < 0) || !flows.some((f) => f.amount > 0)) return null;
    const t0 = flows[0].date, npv = (r) => flows.reduce((a, f) => a + f.amount / Math.pow(1 + r, daysBetween(t0, f.date) / 365), 0);
    let lo = -0.99, hi = 10, flo = npv(lo), fhi = npv(hi);
    if (flo * fhi > 0) return null;
    for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2, fm = npv(mid); if (Math.abs(fm) < 1e-6) return mid; if (flo * fm < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; } }
    return (lo + hi) / 2;
  }

  // ---------- money and dates for people ----------
  function group(n) { const s = String(n); if (s.length <= 3) return s; const head = s.slice(0, -3), tail = s.slice(-3); return head.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + tail; }
  /** Rs 1,23,45,678 (full) or Rs 1.23 Cr / Rs 45.6 L (short). */
  function rs(paise, short) {
    if (paise === null || paise === undefined || !Number.isFinite(+paise)) return "–";
    const neg = paise < 0, r = Math.abs(paise) / 100;
    let out;
    if (short && r >= 1e7) out = "Rs " + (r / 1e7).toFixed(r >= 1e9 ? 0 : 2) + " Cr";
    else if (short && r >= 1e5) out = "Rs " + (r / 1e5).toFixed(r >= 1e7 ? 1 : 2) + " L";
    else { const whole = Math.floor(r + 1e-9), ps = Math.round((r - whole) * 100); out = "Rs " + group(whole) + (ps ? "." + pad(ps) : ""); }
    return (neg ? "-" : "") + out;
  }
  const rsPrice = (paise) => "Rs " + group(Math.floor(paise / 100)) + "." + pad(paise % 100);
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dmy = (s) => { if (!s) return "–"; const [y, m, d] = parts(s); return d + " " + MON[m - 1] + " " + y; };
  const shares = (n) => group(Math.round(n));

  root.DOM = { SETTINGS_DEFAULT, SECURITY_TYPES, PIPELINE, DOC_CHECKLIST, addMonths, addDays, daysBetween, fy, halfUp, todayISO, schedule, loanSummary, minHoldingMonths,
    platformInvestors, members, fdShares, offersUsed, latestValuation, lockUntil, holdingView, portfolio, capitalGainsEstimate, xirr, rs, rsPrice, dmy, shares, group, MON };
  if (typeof module !== "undefined" && module.exports) module.exports = root.DOM;
})(typeof globalThis !== "undefined" ? globalThis : this);
```

### `site/kit.js`

Workspace components: tables, dialogs, toasts, timelines, kanban, empty states.

```javascript
/* Workspace components shared by every role: data tables (search, filters, sort, paging, CSV/Excel export,
   cards on phones), dialogs, toasts, count-up figures, status timelines, the kanban board, skeletons and empty states. */
(function (root) {
  "use strict";
  const { esc } = root.UI;
  const reduce = () => root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const strip = (h) => String(h == null ? "" : h).replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').trim();

  // ---------- data tables ----------
  const TABLES = {};
  /** cfg: {columns: [{k, label, num, html(r), val(r), csv(r), sort:false, export:false}], rows, key(r), search(r), filters: [{k, label, options: [[v, l]], match(r, v)}],
   *  pageSize, empty: {title, text, action}, select: true, rowClass(r), name, actions(html for the toolbar)} */
  function table(id, cfg) {
    const t = TABLES[id] || (TABLES[id] = { q: "", f: {}, sort: null, dir: 1, page: 0, sel: new Set() });
    t.cfg = cfg;
    const keys = new Set(cfg.rows.map(cfg.key || ((r) => r.id)));
    for (const k of [...t.sel]) if (!keys.has(k)) t.sel.delete(k);
    return '<div class="dt" data-dt="' + esc(id) + '">' + tableInner(id) + "</div>";
  }
  function view(id) {
    const t = TABLES[id], c = t.cfg, q = t.q.trim().toLowerCase();
    let rows = c.rows.filter((r) => (!q || (c.search ? c.search(r) : c.columns.map((col) => strip(col.html ? col.html(r) : r[col.k])).join(" ")).toLowerCase().includes(q)) &&
      (c.filters || []).every((f) => !t.f[f.k] || (f.match ? f.match(r, t.f[f.k]) : String(r[f.k]) === t.f[f.k])));
    if (t.sort) {
      const col = c.columns.find((x) => x.k === t.sort), v = (r) => (col.val ? col.val(r) : r[col.k]);
      rows = rows.slice().sort((a, b) => { const x = v(a), y = v(b); return (x == null ? 1 : y == null ? -1 : typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * t.dir; });
    }
    return rows;
  }
  function tableInner(id) {
    const t = TABLES[id], c = t.cfg, rows = view(id), size = c.pageSize || 25, pages = Math.max(1, Math.ceil(rows.length / size));
    t.page = Math.min(t.page, pages - 1);
    const shown = rows.slice(t.page * size, t.page * size + size), key = c.key || ((r) => r.id);
    const tools = '<div class="dt-tools">' + (c.noSearch ? "" : '<label class="dt-search"><span class="sr">Search</span><input type="search" data-dt-q placeholder="Search" value="' + esc(t.q) + '" autocomplete="off"></label>') +
      (c.filters || []).map((f) => '<label class="dt-filter"><span class="sr">' + esc(f.label) + '</span><select data-dt-f="' + esc(f.k) + '"><option value="">' + esc(f.label) + ": all</option>" + f.options.map(([v, l]) => '<option value="' + esc(v) + '"' + (t.f[f.k] === String(v) ? " selected" : "") + ">" + esc(l) + "</option>").join("") + "</select></label>").join("") +
      '<span class="dt-count">' + rows.length + " of " + c.rows.length + "</span>" + (c.actions || "") +
      (c.noExport ? "" : '<span class="dt-export"><button type="button" class="btn ghost sm" data-dt-x="csv">CSV</button><button type="button" class="btn ghost sm" data-dt-x="xlsx">Excel</button></span>') + "</div>";
    if (!c.rows.length) return tools.replace('<div class="dt-tools">', '<div class="dt-tools" hidden>') + empty(c.empty && c.empty.title || "Nothing here yet", c.empty && c.empty.text || "", c.empty && c.empty.action);
    const sel = c.select, allOn = sel && shown.length && shown.every((r) => t.sel.has(key(r)));
    const th = (sel ? '<th class="sel"><input type="checkbox" data-dt-all aria-label="Select all on this page"' + (allOn ? " checked" : "") + "></th>" : "") +
      c.columns.map((col) => { const on = t.sort === col.k; return "<th" + (col.num ? ' class="num"' : "") + (col.sort === false ? "" : ' aria-sort="' + (on ? (t.dir > 0 ? "ascending" : "descending") : "none") + '"') + ">" +
        (col.sort === false ? esc(col.label) : '<button type="button" class="dt-sort" data-dt-s="' + esc(col.k) + '">' + esc(col.label) + '<svg class="dt-arrow' + (on ? (t.dir > 0 ? " asc" : " desc") : "") + '" viewBox="0 0 10 10" aria-hidden="true"><path d="M2.5 6.5 5 4l2.5 2.5"/></svg></button>') + "</th>"; }).join("");
    const body = shown.map((r) => '<tr' + (c.rowClass ? ' class="' + c.rowClass(r) + '"' : "") + ">" + (sel ? '<td class="sel"><input type="checkbox" data-dt-row="' + esc(key(r)) + '" aria-label="Select"' + (t.sel.has(key(r)) ? " checked" : "") + "></td>" : "") +
      c.columns.map((col) => '<td data-label="' + esc(col.label) + '"' + (col.num ? ' class="num"' : "") + ">" + (col.html ? col.html(r) : esc(r[col.k])) + "</td>").join("") + "</tr>").join("");
    const pager = pages > 1 ? '<div class="dt-pager"><button type="button" class="btn ghost sm" data-dt-p="-1"' + (t.page ? "" : " disabled") + '>Previous</button><span>Page ' + (t.page + 1) + " of " + pages + '</span><button type="button" class="btn ghost sm" data-dt-p="1"' + (t.page < pages - 1 ? "" : " disabled") + ">Next</button></div>" : "";
    return tools + '<div class="tw dt-wrap"><table class="tbl dt-tbl"><thead><tr>' + th + "</tr></thead><tbody>" + (body || '<tr><td colspan="' + (c.columns.length + (sel ? 1 : 0)) + '" class="muted">No rows match.</td></tr>') + "</tbody></table></div>" + pager;
  }
  function redraw(id, focusQ) {
    const el = document.querySelector('[data-dt="' + id + '"]'); if (!el) return;
    el.innerHTML = tableInner(id);
    if (focusQ) { const i = el.querySelector("[data-dt-q]"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
    el.dispatchEvent(new CustomEvent("dt-change", { bubbles: true, detail: { id, selected: [...TABLES[id].sel] } }));
  }
  const selected = (id) => (TABLES[id] ? [...TABLES[id].sel] : []);
  function clearSel(id) { if (TABLES[id]) TABLES[id].sel.clear(); }
  function select(id, ids) { const t = TABLES[id] || (TABLES[id] = { q: "", f: {}, sort: null, dir: 1, page: 0, sel: new Set() }); t.sel = new Set(ids); }
  document.addEventListener("input", (e) => { const dt = e.target.closest("[data-dt]"); if (dt && e.target.matches("[data-dt-q]")) { const t = TABLES[dt.dataset.dt]; t.q = e.target.value; t.page = 0; redraw(dt.dataset.dt, true); } });
  document.addEventListener("change", (e) => {
    const dt = e.target.closest("[data-dt]"); if (!dt) return;
    const id = dt.dataset.dt, t = TABLES[id], c = t.cfg, key = c.key || ((r) => r.id);
    if (e.target.matches("[data-dt-f]")) { t.f[e.target.dataset.dtF] = e.target.value; t.page = 0; redraw(id); }
    else if (e.target.matches("[data-dt-row]")) { const k = e.target.dataset.dtRow; e.target.checked ? t.sel.add(k) : t.sel.delete(k); redraw(id); }
    else if (e.target.matches("[data-dt-all]")) { const size = c.pageSize || 25; view(id).slice(t.page * size, t.page * size + size).forEach((r) => (e.target.checked ? t.sel.add(key(r)) : t.sel.delete(key(r)))); redraw(id); }
  });
  document.addEventListener("click", (e) => {
    const dt = e.target.closest("[data-dt]"); if (!dt) return;
    const id = dt.dataset.dt, t = TABLES[id], b = e.target.closest("button"); if (!b) return;
    if (b.dataset.dtS) { t.dir = t.sort === b.dataset.dtS ? -t.dir : 1; t.sort = b.dataset.dtS; redraw(id); }
    else if (b.dataset.dtP) { t.page += +b.dataset.dtP; redraw(id); }
    else if (b.dataset.dtX) exportTable(id, b.dataset.dtX);
  });
  function exportTable(id, kind) {
    const c = TABLES[id].cfg, cols = c.columns.filter((col) => col.export !== false), rows = view(id);
    const cell = (col, r) => (col.csv ? col.csv(r) : col.val ? col.val(r) : strip(col.html ? col.html(r) : r[col.k]));
    const data = [cols.map((col) => col.label)].concat(rows.map((r) => cols.map((col) => cell(col, r))));
    const name = (c.name || id).replace(/[^\w-]+/g, "-");
    if (kind === "csv") save(name + ".csv", new Blob(["﻿" + data.map((row) => row.map((v) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(",")).join("\r\n")], { type: "text/csv" }));
    else save(name + ".xlsx", xlsx(data, c.name || "Export"));
    toast("Downloaded " + rows.length + " row" + (rows.length === 1 ? "" : "s") + " as " + (kind === "csv" ? "CSV" : "Excel") + ".");
  }
  function save(name, blob) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // ---------- a minimal .xlsx writer (stored zip, inline strings) ----------
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (u) => { let c = 0xffffffff; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zip(files) {
    const enc = new TextEncoder(), parts = [], dir = []; let off = 0;
    const u16 = (v) => [v & 255, (v >>> 8) & 255], u32 = (v) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
    for (const f of files) {
      const name = enc.encode(f.name), data = enc.encode(f.data), crc = crc32(data);
      const head = [0x50, 0x4b, 3, 4, ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)];
      parts.push(new Uint8Array(head), name, data);
      dir.push([0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)], name);
      off += head.length + name.length + data.length;
    }
    const dirParts = [], start = off; let size = 0;
    for (let i = 0; i < dir.length; i += 2) { const h = new Uint8Array(dir[i]); dirParts.push(h, dir[i + 1]); size += h.length + dir[i + 1].length; }
    const end = new Uint8Array([0x50, 0x4b, 5, 6, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(size), ...u32(start), ...u16(0)]);
    return new Blob([...parts, ...dirParts, end], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }
  function xlsx(rows, sheet) {
    const x = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const col = (i) => { let s = ""; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
    const body = rows.map((r, ri) => '<row r="' + (ri + 1) + '">' + r.map((v, ci) => { const ref = col(ci) + (ri + 1); return typeof v === "number" && Number.isFinite(v) ? '<c r="' + ref + '"><v>' + v + "</v></c>" : '<c r="' + ref + '" t="inlineStr"' + (ri === 0 ? ' s="1"' : "") + "><is><t>" + x(v == null ? "" : v) + "</t></is></c>"; }).join("") + "</row>").join("");
    return zip([
      { name: "[Content_Types].xml", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
      { name: "_rels/.rels", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { name: "xl/workbook.xml", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="' + x(sheet.slice(0, 31)) + '" sheetId="1" r:id="rId1"/></sheets></workbook>' },
      { name: "xl/_rels/workbook.xml.rels", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { name: "xl/styles.xml", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>' },
      { name: "xl/worksheets/sheet1.xml", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + body + "</sheetData></worksheet>" },
    ]);
  }

  // ---------- dialogs ----------
  /** fields: [{name, label, type: text|number|date|select|textarea|checkbox|file, value, options: [[v, l]], hint, required, min, max, step}] -> Promise<values | null> */
  function dialog(o) {
    return new Promise((resolve) => {
      const d = document.createElement("dialog");
      d.className = "modal" + (o.danger ? " danger" : "");
      d.setAttribute("aria-labelledby", "mdl-t");
      const f = (o.fields || []).map((x) => {
        const id = "mf_" + x.name, req = x.required ? " required" : "", hint = x.hint ? '<small class="muted">' + x.hint + "</small>" : "";
        if (x.type === "checkbox") return '<label class="chk"><input type="checkbox" name="' + x.name + '" id="' + id + '"' + (x.value ? " checked" : "") + "> " + esc(x.label) + "</label>" + hint;
        const input = x.type === "select" ? '<select name="' + x.name + '" id="' + id + '"' + req + ">" + x.options.map(([v, l]) => '<option value="' + esc(v) + '"' + (String(x.value) === String(v) ? " selected" : "") + ">" + esc(l) + "</option>").join("") + "</select>"
          : x.type === "textarea" ? '<textarea name="' + x.name + '" id="' + id + '" rows="3"' + req + ">" + esc(x.value || "") + "</textarea>"
          : '<input name="' + x.name + '" id="' + id + '" type="' + (x.type || "text") + '"' + (x.type === "file" ? "" : ' value="' + esc(x.value == null ? "" : x.value) + '"') + (x.min != null ? ' min="' + x.min + '"' : "") + (x.max != null ? ' max="' + x.max + '"' : "") + (x.step ? ' step="' + x.step + '"' : "") + (x.type === "number" ? ' inputmode="decimal"' : "") + req + (x.accept ? ' accept="' + x.accept + '"' : "") + ">";
        return '<label class="fld" for="' + id + '"><span>' + esc(x.label) + '</span><span class="in">' + input + (x.unit ? "<em>" + esc(x.unit) + "</em>" : "") + "</span>" + hint + "</label>";
      }).join("");
      d.innerHTML = '<form method="dialog" class="modal-in"><h2 id="mdl-t">' + esc(o.title) + "</h2>" + (o.text ? '<div class="modal-text">' + o.text + "</div>" : "") + (f ? '<div class="fields">' + f + "</div>" : "") +
        '<p class="form-err notice bad" role="alert" hidden></p><div class="row gap-s modal-act"><button class="btn ghost" value="cancel" type="button" data-mdl-cancel>' + esc(o.cancel || "Cancel") + '</button><button class="btn ' + (o.danger ? "danger" : "primary") + '" value="ok" type="submit">' + esc(o.confirm || "Confirm") + "</button></div></form>";
      document.body.appendChild(d);
      const close = (v) => { d.close(); d.remove(); resolve(v); };
      d.querySelector("[data-mdl-cancel]").addEventListener("click", () => close(null));
      d.addEventListener("cancel", (e) => { e.preventDefault(); close(null); });
      d.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
        const form = e.target, out = {};
        for (const x of o.fields || []) { const el = form.elements[x.name]; out[x.name] = x.type === "checkbox" ? el.checked : x.type === "file" ? el.files[0] || null : el.value; }
        const err = o.validate && o.validate(out);
        if (err) { const box = form.querySelector(".form-err"); box.textContent = err; box.hidden = false; return; }
        close(out);
      });
      d.showModal();
      const first = d.querySelector("input:not([type=checkbox]),select,textarea"); if (first) first.focus();
    });
  }
  const confirm = (title, text, label, danger) => dialog({ title, text, confirm: label, danger }).then((v) => v !== null);

  // ---------- toasts ----------
  function toast(msg, kind) {
    let box = document.getElementById("toasts");
    if (!box) { box = document.createElement("div"); box.id = "toasts"; box.setAttribute("aria-live", "polite"); document.body.appendChild(box); }
    const t = document.createElement("div");
    t.className = "toast2 " + (kind || "ok"); t.setAttribute("role", kind === "bad" ? "alert" : "status"); t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 260); }, kind === "bad" ? 6000 : 3800);
  }

  // ---------- figures that count up, and flash when they change ----------
  const LAST = {};
  /** A number that animates from 0 on first view and from its old value when it changes. fmt: (x) => string */
  const FMT = {};
  function figure(key, value, fmt, cls) {
    FMT[key] = fmt;
    return '<span class="fig ' + (cls || "") + '" data-fig="' + esc(key) + '" data-v="' + value + '">' + esc(fmt(value)) + "</span>";
  }
  function animateFigures(scope, first) {
    scope.querySelectorAll("[data-fig]").forEach((el) => {
      const key = el.dataset.fig, to = +el.dataset.v, fmt = FMT[key], seen = key in LAST, from = seen ? LAST[key] : first ? 0 : to;
      LAST[key] = to;
      if (from === to || reduce() || !fmt) return;
      if (seen) el.classList.add(to > from ? "up" : "down");
      const t0 = performance.now(), dur = 380;
      const step = (now) => { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(from + (to - from) * e); if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(to); };
      requestAnimationFrame(step);
      setTimeout(() => el.classList.remove("up", "down"), 900);
    });
  }

  // ---------- charts draw in once, when they enter the viewport ----------
  let io = null;
  function animateCharts(scope) {
    if (reduce() || !("IntersectionObserver" in root)) return;
    io = io || new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const svg = e.target;
      svg.querySelectorAll("polyline.ln:not([stroke-dasharray])").forEach((p) => {
        const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.getBoundingClientRect();
        p.style.transition = "stroke-dashoffset .38s cubic-bezier(.16,1,.3,1)"; p.style.strokeDashoffset = "0";
        p.addEventListener("transitionend", () => { p.style.strokeDasharray = ""; p.style.transition = ""; }, { once: true });
      });
      svg.querySelectorAll("rect.bar").forEach((r, i) => { r.style.animationDelay = Math.min(i, 16) * 12 + "ms"; r.classList.add("grow"); });
    }), { threshold: 0.2 });
    scope.querySelectorAll("svg.chart:not([data-anim])").forEach((s) => { s.setAttribute("data-anim", "1"); io.observe(s); });
  }

  /** Call after every render. first = the route changed (stagger lists, count figures from zero). */
  function mount(scope, first) {
    animateFigures(scope, first);
    animateCharts(scope);
    if (first && !reduce()) scope.querySelectorAll("[data-stagger]").forEach((g) => [...g.children].slice(0, 14).forEach((c, i) => { c.style.setProperty("--i", i); c.classList.add("st"); }));
  }

  // ---------- small pieces ----------
  const ILLU = '<svg class="empty-art" viewBox="0 0 120 80" aria-hidden="true"><path d="M20 72 L52 16 L52 76 M100 72 L68 16 L68 76 M38 70 L60 46 L82 70" fill="none" stroke="currentColor" stroke-width="3"/><path d="M60 2 L67 9 L60 16 L53 9Z" fill="var(--gold)"/></svg>';
  function empty(title, text, action) { return '<div class="empty">' + ILLU + "<b>" + esc(title) + "</b>" + (text ? "<p>" + text + "</p>" : "") + (action || "") + "</div>"; }
  function skeleton() {
    const line = (w) => '<i class="sk" style="width:' + w + '"></i>';
    return '<div class="skel" aria-busy="true" aria-label="Loading"><div class="pg-head">' + line("38%") + '</div><div class="kpis k4">' + [1, 2, 3, 4].map(() => '<div class="kpi">' + line("50%") + line("70%") + "</div>").join("") + '</div><section class="panel">' + [90, 80, 85, 70, 88, 76].map((w) => line(w + "%")).join("") + "</section></div>";
  }
  /** steps: [[key, label]]; at: {key: iso}; current: key; stop: {label, reason} for withdrawn/rejected */
  function timeline(steps, current, at, stop) {
    const idx = steps.findIndex(([k]) => k === current);
    return '<ol class="timeline' + (stop ? " stopped" : "") + '">' + steps.map(([k, l], i) => '<li class="' + (i < idx ? "done" : i === idx ? (stop ? "done" : "now") : "") + '"><b>' + esc(l) + "</b>" + (at && at[k] ? '<span class="muted small">' + esc(root.DOM.dmy(at[k].slice(0, 10))) + "</span>" : "") + "</li>").join("") +
      (stop ? '<li class="stop"><b>' + esc(stop.label) + "</b>" + (stop.reason ? '<span class="muted small">' + esc(stop.reason) + "</span>" : "") + "</li>" : "") + "</ol>";
  }

  // ---------- kanban ----------
  const BOARDS = {};
  /** cols: [[key, label]]; cards: [{id, col, html, label}]; onMove(id, col) */
  function kanban(id, cols, cards, onMove) {
    BOARDS[id] = onMove;
    return '<div class="kanban" data-kb="' + esc(id) + '">' + cols.map(([k, l]) => { const cs = cards.filter((c) => c.col === k);
      return '<section class="kb-col" data-kb-col="' + esc(k) + '" aria-label="' + esc(l) + '"><h3>' + esc(l) + ' <span class="muted">' + cs.length + "</span></h3>" +
        '<div class="kb-list">' + cs.map((c) => '<article class="kb-card" draggable="true" data-kb-card="' + esc(c.id) + '">' + c.html +
          '<label class="kb-move"><span class="sr">Move ' + esc(c.label) + ' to</span><select data-kb-move="' + esc(c.id) + '"><option value="">Move to…</option>' + cols.filter(([k2]) => k2 !== k).map(([k2, l2]) => '<option value="' + esc(k2) + '">' + esc(l2) + "</option>").join("") + "</select></label></article>").join("") +
        (cs.length ? "" : '<p class="kb-empty muted small">Drop a company here</p>') + "</div></section>"; }).join("") + "</div>";
  }
  let dragging = null;
  document.addEventListener("dragstart", (e) => { const c = e.target.closest && e.target.closest("[data-kb-card]"); if (!c) return; dragging = c.dataset.kbCard; c.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", dragging); });
  document.addEventListener("dragend", (e) => { const c = e.target.closest && e.target.closest("[data-kb-card]"); if (c) c.classList.remove("dragging"); document.querySelectorAll(".kb-col.drop").forEach((x) => x.classList.remove("drop")); dragging = null; });
  document.addEventListener("dragover", (e) => { const col = dragging && e.target.closest && e.target.closest("[data-kb-col]"); if (!col) return; e.preventDefault(); document.querySelectorAll(".kb-col.drop").forEach((x) => x !== col && x.classList.remove("drop")); col.classList.add("drop"); });
  document.addEventListener("drop", (e) => { const col = dragging && e.target.closest("[data-kb-col]"); if (!col) return; e.preventDefault(); const b = col.closest("[data-kb]"), card = dragging; col.classList.remove("drop"); dragging = null; BOARDS[b.dataset.kb](card, col.dataset.kbCol); });
  document.addEventListener("change", (e) => { const s = e.target.closest("[data-kb-move]"); if (!s || !s.value) return; const b = s.closest("[data-kb]"); BOARDS[b.dataset.kb](s.dataset.kbMove, s.value); });

  root.KIT = { table, selected, clearSel, select, exportTable, xlsx, save, dialog, confirm, toast, figure, mount, empty, skeleton, timeline, kanban, strip };
})(typeof globalThis !== "undefined" ? globalThis : this);
```


---

## 3. Data layer

The front end calls window.GB_API. The demo uses the browser store; the Flask server uses the adapter.

### `site/store.js`

Demo store: every action and rule of the server, kept in the browser.

```javascript
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

  const COLLECTIONS = ["companies", "reports", "intros", "cap_table", "holdings", "offers", "valuations", "sell_requests", "transfers",
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
  /** Data saved by an older version of the demo may lack collections added since (e.g. deal rooms): take those from a fresh seed. */
  function upgrade(db) {
    if (!db || typeof db !== "object" || !Array.isArray(db.users)) return seed();
    let fresh = null;
    for (const c of COLLECTIONS.concat(["users", "audit"])) if (!Array.isArray(db[c])) { fresh = fresh || seed(); db[c] = fresh[c] || []; }
    return db;
  }
  function load() {
    try { const s = localStorage.getItem(KEY); if (s) return upgrade(JSON.parse(s)); } catch (e) { /* storage blocked or unreadable */ }
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
      out = Object.assign(base, { directory: advisors.concat(st.users.filter((u) => u.role === "lender" || u.role === "investor").map((u) => pub(u))),
        intros: only(st.intros).map((i) => Object.assign({}, i, { investor_name: label(userOf(st, i.investor_id)) })),
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
      out = Object.assign(base, { directory: advisors, intros: st.intros.filter((i) => i.investor_id === user.id), companies: st.companies.filter((c) => cids.has(c.id)).map((c) => companyBrief(st, c)),
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
      need(u.role === "advisor", "Only an advisor prepares and submits the debt vs equity report");
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

    // ---------- deal rooms (mirror of actions.a_request_intro and friends) ----------
    request_intro(st, u, p) {
      need(u.role === "investor", "Only investors can ask for deal-room access");
      const cid = get(p, "company_id"), c = companyOf(st, cid);
      need(st.offers.some((o) => o.company_id === cid && o.investor_id === u.id && o.response !== "declined"), "Deal rooms open only for companies your advisor has offered to you");
      need(!st.intros.some((i) => i.company_id === cid && i.investor_id === u.id), "You have already asked for access to this deal room");
      st.intros.push({ id: uid("i"), company_id: cid, investor_id: u.id, status: "requested", created_at: now(), nda_signed_at: null, views: [] });
      for (const f of st.users) if (f.role === "founder" && f.company_id === cid) notify(st, f.id, "intro", label(u) + " asked for access to your deal room", "app-investors");
      return ["Asked for access to the " + c.name + " deal room", cid];
    },
    decide_intro(st, u, p) {
      const i = find(st.intros, get(p, "intro_id"));
      need(i, "Introduction not found");
      need(u.role === "founder" && u.company_id === i.company_id, "Only the company's founder can decide");
      need(i.status === "requested", "This request was already decided");
      need(["grant", "decline"].includes(get(p, "decision")), "Choose grant or decline");
      i.status = p.decision === "grant" ? "granted" : "declined";
      notify(st, i.investor_id, "intro", companyOf(st, i.company_id).name + " " + (i.status === "granted" ? "granted" : "declined") + " your deal-room request", "app-rooms");
      return [(i.status === "granted" ? "Granted deal-room access to " : "Declined ") + label(userOf(st, i.investor_id)), i.company_id];
    },
    sign_nda(st, u, p) {
      const i = find(st.intros, get(p, "intro_id"));
      need(i && u.role === "investor" && i.investor_id === u.id, "Introduction not found");
      need(i.status === "granted", "The founder has not granted access yet");
      i.nda_signed_at = i.nda_signed_at || now();
      return ["Signed the NDA for " + companyOf(st, i.company_id).name, i.company_id];
    },
    view_room_doc(st, u, p) {
      const i = find(st.intros, get(p, "intro_id"));
      need(i && u.role === "investor" && i.investor_id === u.id && i.status === "granted" && i.nda_signed_at, "Sign the NDA to open documents");
      const c = companyOf(st, i.company_id);
      need((c.docs || []).includes(get(p, "doc")), "Document not found");
      (i.views = i.views || []).push({ doc: p.doc, at: now() });
      return ["Viewed " + p.doc + " (watermarked: " + u.name + ")", c.id];
    },
    suggest_investor(st, u, p) {
      need(u.role === "founder", "Only founders suggest investors");
      const inv = userOf(st, get(p, "investor_id"), "investor"), c = companyOf(st, u.company_id);
      const note = u.name + " suggests offering to " + label(inv);
      st.notes.push({ id: uid("n"), subject_type: "company", subject_id: c.id, text: note + ".", due: null, done: false, by: u.id, at: now() });
      notifyAdvisors(st, "suggest", note + " (" + c.name + ")", "app-directory");
      return ["Suggested " + label(inv) + " to your advisor. Your advisor decides who receives the offer.", c.id];
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
```

### `site/api-server.js`

Adapter that sends the same calls to the Flask API.

```javascript
/* Server adapter: talks to server/app.py. Sessions use an HttpOnly cookie set by the server. */
(function (root) {
  "use strict";
  async function call(method, path, body) {
    const res = await fetch(path, { method, credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-Requested-With": "glassbox" }, body: body ? JSON.stringify(body) : undefined });
    let data = null;
    try { data = await res.json(); } catch (e) { /* empty body */ }
    if (!res.ok) throw new Error((data && data.error) || "Something went wrong (" + res.status + ").");
    return data;
  }
  root.GB_API = {
    mode: "server",
    async me() { return (await call("GET", "/api/me")).user; },
    async login(email, password) { return (await call("POST", "/api/login", { email, password })).user; },
    async signup(f) { return (await call("POST", "/api/signup", f)).user; },
    async logout() { await call("POST", "/api/logout"); },
    async state() { return call("GET", "/api/state"); },
    async act(name, payload) { return call("POST", "/api/act/" + encodeURIComponent(name), payload || {}); },
    async enquiry(f) { await call("POST", "/api/enquiry", f); },
    async upload(file, fields) {
      const fd = new FormData(); fd.append("file", file);
      for (const k in fields || {}) if (fields[k] != null) fd.append(k, fields[k]);
      const res = await fetch("/api/upload", { method: "POST", credentials: "same-origin", headers: { "X-Requested-With": "glassbox" }, body: fd });
      let data = null; try { data = await res.json(); } catch (e) { /* empty body */ }
      if (!res.ok) throw new Error((data && data.error) || "Upload failed (" + res.status + ").");
      return data.file;
    },
    async reset() { throw new Error("Reset is only available in the demo."); },
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
```


---

## 4. Public website and sign-in

Public pages, the scroll intro, sign-in and the workspace shell with its router.

### `site/public.js`

Home (scroll intro, live example), Services, Investors, Lenders, Pricing, Trust, About, Contact.

```javascript
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
```

### `site/portal.js`

Sign-in and sign-up, the role-based workspace frame, page router.

```javascript
/* Sign-in pages, the role-based workspace, and the page router. */
(function (root) {
  "use strict";
  const UI = root.UI;
  const { esc, n, cr, lakh, pct, xx, date, dt, gx, hbars, lines, vbars, meter, chip, C } = UI;
  const KIT = root.KIT;
  const GB = root.GB, PUB = root.PUB;
  const API = root.GB_API;
  const S = { user: null, data: null, flash: "", twinDraft: {}, sim: null, tsTab: "loan" };
  const $ = (s, el) => (el || document).querySelector(s);
  const app = () => document.getElementById("site");

  // ---------- auth pages ----------
  function login(err) {
    const demo = API.mode === "demo";
    return PUB.page("login", null, '<div class="auth"><div class="auth-card">' +
      "<h1>Sign in</h1><p class=\"muted\">Founders, investors, lenders and advisors each see their own workspace.</p>" +
      (err ? '<div class="notice bad" role="alert">' + esc(err) + "</div>" : "") +
      '<form class="form" data-form="login" novalidate>' +
      '<label class="fld"><span>Email</span><span class="in"><input name="email" id="l_email" type="email" autocomplete="username" required></span></label>' +
      '<label class="fld"><span>Password</span><span class="in"><input name="password" id="l_password" type="password" autocomplete="current-password" required></span></label>' +
      '<button class="btn primary lg block" type="submit">Sign in</button></form>' +
      '<p class="small muted">New here? <a href="#signup">Create an account</a></p>' +
      (demo ? '<div class="demo-box"><b>Demo accounts</b><p class="small muted">This demo keeps accounts and data in your browser only. Pick a role to sign in instantly (password <code>' + esc(API.demoPassword) + "</code>).</p>" +
        '<div class="demo-roles">' + [["founder@demo.in", "Founder", "Priya Nair, Kalyan Polymers"], ["investor@demo.in", "Investor", "Meera Iyer, Konkan Growth"], ["advisor@demo.in", "Advisor", "CA Neha Joshi, Aegis Ascend"], ["lender@demo.in", "Lender", "Suresh Pillai, Harbour Bank"]].map(([e, r, w]) => '<button type="button" class="role-btn" data-act="demo-login" data-email="' + e + '"><b>' + r + "</b><span>" + w + "</span></button>").join("") + "</div>" + '<p class="small muted">Something not loading? <button type="button" class="linkbtn" data-act="reset-demo">Reset demo data</button> to start again from the sample companies.</p></div>' : "") +
      "</div></div>");
  }
  function signup(err) {
    return PUB.page("signup", null, '<div class="auth"><div class="auth-card">' +
      "<h1>Create an account</h1>" + (err ? '<div class="notice bad" role="alert">' + esc(err) + "</div>" : "") +
      '<form class="form" data-form="signup" novalidate>' +
      '<fieldset class="seg"><legend>I am a</legend>' + [["founder", "Founder"], ["investor", "Investor"], ["lender", "Lender"]].map(([v, l], i) => '<label><input type="radio" name="role" value="' + v + '"' + (i ? "" : " checked") + "><span>" + l + "</span></label>").join("") + "</fieldset>" +
      '<label class="fld"><span>Your name</span><span class="in"><input name="name" id="s_name" autocomplete="name" required></span></label>' +
      '<label class="fld"><span>Company, fund or bank</span><span class="in"><input name="org" id="s_org" autocomplete="organization"></span></label>' +
      '<label class="fld"><span>Sector</span><span class="in"><select name="sector" id="s_sector">' + SECTORS.map((s) => "<option>" + s + "</option>").join("") + "</select></span></label>" +
      '<label class="fld"><span>Email</span><span class="in"><input name="email" id="s_email" type="email" autocomplete="email" required></span></label>' +
      '<label class="fld"><span>Password (8 characters or more)</span><span class="in"><input name="password" id="s_password" type="password" autocomplete="new-password" required minlength="8"></span></label>' +
      '<button class="btn primary lg block" type="submit">Create account</button></form>' +
      '<p class="small muted">Already registered? <a href="#login">Sign in</a>. Advisor accounts are created by Aegis Ascend.</p></div></div>');
  }
  const SECTORS = ["Plastics & packaging", "Auto components", "Chemicals", "Food processing", "Textiles", "Engineering", "Pharma", "Electronics"];

  // ---------- workspace shell ----------
  // A string on its own starts a group in the rail.
  const NAVS = {
    founder: [["app", "Overview"], "Fundraise", ["app-fundraise", "Fundraise tracker"], ["app-investors", "Investors"], ["app-dealroom", "Deal room"], ["app-captable", "Cap table"], ["app-dataroom", "Data room"], ["app-revshare", "Revenue share"],
      "Debt", ["app-loans", "Loans & monitoring"], ["app-fees", "Fees"], "Account", ["app-company", "Company profile"], ["app-notifications", "Notifications"], ["app-activity", "Activity log"]],
    investor: [["app", "Portfolio"], ["app-opportunities", "Opportunities"], ["app-deals", "Curated deals"], ["app-rooms", "Deal rooms"], ["app-sells", "Sell requests & exits"], ["app-notifications", "Notifications"], ["app-activity", "Activity log"]],
    advisor: [["app", "Today"], "Deals", ["app-pipeline", "Company pipeline"], ["app-companies", "Companies"], ["app-directory", "Investor directory"], ["app-intros", "Deal rooms"], ["app-requests", "Resale requests"], ["app-revaluations", "Revaluation centre"],
      "Debt", ["app-loantransfers", "Loan transfers"], ["app-loansdesk", "Loans & DSCR"], "Practice", ["app-review", "Review queue"], ["app-compliance", "Compliance"], ["app-revenue", "Revenue"], ["app-tasks", "Notes & tasks"], ["app-templates", "Message templates"],
      "Tools", ["app-twin", "Funding Twin"], ["app-optimizer", "Equity vs Debt Optimizer"], ["app-cma", "CMA funding report"], ["app-readiness", "Readiness Score"], ["app-termsheet", "Term Sheet Analyser"], "Admin", ["app-enquiries", "Enquiries"], ["app-activity", "Audit log"], ["app-settings", "Settings"]],
    lender: [["app", "Loan book"], ["app-desk", "Lender desk"], ["app-applications", "Applications"], ["app-monitor", "Monitoring"], ["app-ltransfers", "Loan transfers"], ["app-lfees", "Fees"], ["app-notifications", "Notifications"], ["app-activity", "Activity log"]],
  };
  function shell(route, body) {
    const u = S.user, nav = NAVS[u.role];
    const who = u.firm ? u.firm : companyName() || "";
    const unread = S.data ? (S.data.notifications || []).filter((x) => !x.read).length : 0;
    const base = route.split("/")[0], parent = { "app-holding": "app", "app-loan": "app", "app-companyfile": "app-pipeline" }[base] || base;
    return '<div class="ws"><aside class="ws-rail">' + PUB.wordmark("#home") +
      '<nav class="ws-nav" aria-label="Workspace">' + nav.map((it) => (typeof it === "string" ? '<span class="group">' + it + "</span>" : '<a href="#' + it[0] + '"' + (parent === it[0] ? ' aria-current="page"' : "") + ">" + it[1] + (it[0] === "app-notifications" && unread ? ' <span class="badge" aria-label="' + unread + ' unread">' + unread + "</span>" : "") + "</a>")).join("") + "</nav>" +
      '<div class="rail-foot"><div><b>' + esc(u.name) + "</b><br><span>" + esc(roleName(u.role)) + (who ? " · " + esc(who) : "") + "</span></div>" +
      '<div class="row gap-s"><button class="btn ghost sm" data-act="logout">Sign out</button>' + (API.mode === "demo" ? '<button class="linkbtn" data-act="reset-demo">Reset demo data</button>' : "") + "</div></div></aside>" +
      '<main class="ws-main" id="ws-main">' + (API.mode === "demo" ? '<span class="ws-demo">Demo: fictional companies and people, kept in this browser</span>' : "") +
      (S.flash ? '<div class="notice ok" role="status">' + esc(S.flash) + "</div>" : "") + body + "</main></div>";
  }
  const roleName = (r) => ({ founder: "Founder", investor: "Investor", advisor: "Advisor", lender: "Lender" })[r];
  const myCompany = () => S.data.companies.find((c) => c.id === S.user.company_id);
  const companyName = () => { const c = S.user.company_id && S.data && S.data.companies.find((x) => x.id === S.user.company_id); return c && c.name; };
  const userName = (id) => { const u = (S.data.directory || []).concat(S.data.founders || []).find((x) => x.id === id); return u ? (u.firm && u.role !== "advisor" ? u.firm : u.name) : id === S.user.id ? S.user.name : "Aegis Ascend user"; };
  const companyById = (id) => S.data.companies.find((c) => c.id === id);
  const statusChip = (s) => chip({ approved: "ok", in_review: "warn", changes: "bad", draft: "", requested: "warn", granted: "ok", declined: "bad", applied: "warn", sanctioned: "ok", disbursed: "ok", consent_needed: "warn", completed: "ok", open: "warn" }[s] || "", ({ in_review: "In review", changes: "Changes requested", consent_needed: "Needs founder consent", first_refusal: "First refusal", buyer_intro: "Buyer introduction", spa: "SPA", open: "In progress" })[s] || s.charAt(0).toUpperCase() + s.slice(1));
  const stamp = (r) => (r && r.status === "approved" ? '<span class="stamp">Reviewed by ' + esc(userName(r.reviewed_by)) + " · " + date(r.reviewed_at) + "</span>" : "");
  const latestReport = (cid) => S.data.reports.filter((r) => r.company_id === cid).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
  const head = (title, sub, extra) => '<div class="pg-head masthead"><div><h1>' + esc(title) + "</h1>" + (sub ? '<p class="muted">' + sub + "</p>" : "") + "</div>" + (extra || "") + "</div>";
  const empty = (t, d) => '<div class="empty"><b>' + esc(t) + "</b><p>" + d + "</p></div>";

  // ---------- FOUNDER ----------
  function founderHome() {
    const c = myCompany(), rep = latestReport(c.id), ok = rep && rep.status === "approved" ? rep : S.data.reports.filter((r) => r.status === "approved")[0];
    const mon = GB.monitor(c.quarters, c.covenants), last = mon[mon.length - 1];
    const offers = S.data.offers || [], keen = offers.filter((o) => o.response === "interested" || o.response === "invested");
    const asks = (S.data.intros || []).filter((i) => i.status === "requested");
    const steps = [
      ["Complete your company profile", !!(c.revenue && c.raise), "app-company"],
      ["Upload the data room", (c.docs || []).length + (S.data.files || []).filter((f) => f.purpose === "dataroom").length >= 4, "app-dataroom"],
      ["Advisor prepares the debt vs equity report", !!rep, "app-fundraise"],
      ["Advisor sign-off", !!ok, "app-fundraise"],
      ["Advisor shares the offer with investors", offers.length > 0, "app-fundraise"],
      ["Approve deal-room requests", (S.data.intros || []).some((i) => i.status === "granted"), "app-investors"],
      ["Investors commit and shares are allotted", (S.data.holdings || []).length > 0, "app-captable"],
    ];
    const stage = { applied: "Applied", under_review: "Under review", approved: "Approved", offering: "Offering", funded: "Funded", monitoring: "Monitoring", closed: "Closed", rejected: "Not taken forward" }[c.pipeline_stage] || "Applied";
    return head(c.name, esc(c.sector) + " · " + esc(c.city) + " · revenue " + cr(c.revenue, 0) + " · raising " + cr(c.raise, 0)) +
      '<div class="kpis k4">' +
      '<div class="kpi"><small>Stage</small><b>' + stage + "</b><span>with your Aegis Ascend advisor</span></div>" +
      '<div class="kpi"><small>Recommended mix</small><b>' + (ok ? pct(ok.summary.best_share) + " debt" : "–") + "</b><span>" + (ok ? pct(1 - ok.summary.best_share) + " equity · advisor-approved" : "after your advisor's review") + "</span></div>" +
      '<div class="kpi"><small>Interested investors</small><b>' + keen.length + "</b><span>of " + offers.length + " offered</span></div>" +
      '<div class="kpi"><small>Report</small><b>' + (rep ? statusChip(rep.status) : "Not started") + "</b><span>" + (rep ? esc(rep.title) : "Your advisor prepares it") + "</span></div></div>" +
      '<div class="grid2"><section class="panel"><h2>Next steps</h2><ol class="checklist">' + steps.map(([t, ok2, r]) => '<li class="' + (ok2 ? "done" : "") + '"><a href="#' + r + '">' + t + "</a></li>").join("") + "</ol>" + stamp(ok) + "</section>" +
      '<section class="panel"><h2>Needs your decision</h2>' + (asks.length ? asks.map((i) => '<div class="item"><div><b>' + esc(i.investor_name) + '</b><span class="muted small">asked for access to your deal room · ' + date(i.created_at) + '</span></div><div class="row gap-s"><button class="btn primary sm" data-act="decide-intro" data-id="' + i.id + '" data-d="grant">Grant access</button><button class="btn ghost sm" data-act="decide-intro" data-id="' + i.id + '" data-d="decline">Decline</button></div></div>').join("") : '<p class="muted">Nothing waiting. Deal-room requests from investors appear here.</p>') +
      '<h3>Fundraise</h3><p>' + (offers.length ? "Your advisor has shared the offer with <b>" + offers.length + "</b> investor" + (offers.length === 1 ? "" : "s") + "; <b>" + keen.length + "</b> interested or committed." : "Your advisor shares the offer with investors once your report is signed off.") + ' <a href="#app-fundraise">Open the tracker</a></p>' +
      (last ? '<h3>Latest covenant check</h3><p>' + esc(last.q) + ": DSCR " + xx(last.dscr) + " " + chip(last.state === "ok" ? "ok" : last.state === "watch" ? "warn" : "bad", last.state === "ok" ? "Within covenants" : last.state === "watch" ? "Close to limit" : "Breach") + ' <a href="#app-loans">Details</a></p>' : "") +
      "</section></div>";
  }

  const TWIN_FIELDS = [
    ["raise", "Amount to raise", "Rs cr", "num", "founder"], ["pre_money", "Company value today (pre-money)", "Rs cr", "num", "founder"],
    ["value_growth", "Company value growth a year", "%", "pct", "founder"], ["horizon", "Years to compare over", "yrs", "int", "founder"],
    ["ebitda0", "EBITDA this year", "Rs cr", "num", "founder"], ["ebitda_growth", "EBITDA growth a year", "%", "pct", "benchmark"],
    ["existing_ds", "Existing debt service a year", "Rs cr", "num", "founder"], ["loan_rate", "Loan interest rate", "%", "pct", "benchmark"],
    ["tenor", "Loan tenor", "yrs", "int", "benchmark"], ["moratorium", "Moratorium", "yrs", "int", "benchmark"],
    ["tax_rate", "Tax rate", "%", "pct", "benchmark"], ["discount_rate", "Discount rate", "%", "pct", "advisor"],
    ["dscr_min", "Minimum DSCR", "x", "num", "advisor"], ["growth_sigma", "Range: growth up or down by", "%", "pct", "advisor"],
  ];
  function twinTarget() {
    if (S.user.role === "founder") return myCompany();
    const id = S.twinCompany || (S.data.companies[0] && S.data.companies[0].id);
    return companyById(id);
  }
  function twinInputs(c) {
    const base = Object.assign({}, GB.TWIN_DEFAULTS, { raise: c.raise }, c.twin || {});
    return Object.assign(base, S.twinDraft[c.id] || {});
  }
  function twinPage() {
    const c = twinTarget(); if (!c) return empty("No company", "There is no company to model yet.");
    const q = twinInputs(c);
    const sel = S.user.role === "advisor" ? '<label class="fld inline"><span>Company</span><span class="in"><select data-act="twin-company">' + S.data.companies.map((x) => "<option value=\"" + x.id + '"' + (x.id === c.id ? " selected" : "") + ">" + esc(x.name) + "</option>").join("") + "</select></span></label>" : "";
    const fv = (k, kind) => kind === "pct" ? +(q[k] * 100).toFixed(4) : q[k];
    return head("Funding Twin", "A live copy of " + esc(c.name) + "'s finances. Change any input and every number below updates. Click a number to see how it is calculated.", sel) +
      '<div class="twin"><form class="panel twin-in" data-form="twin" data-company="' + c.id + '" novalidate><h2>Assumptions</h2>' +
      '<div class="fields f2">' + TWIN_FIELDS.map(([k, l, u, kind, src]) => '<label class="fld" for="t_' + k + '"><span>' + esc(l) + ' <i class="src src-' + src + '">' + src + '</i></span><span class="in"><input id="t_' + k + '" name="' + k + '" data-kind="' + kind + '" value="' + esc(fv(k, kind)) + '" inputmode="decimal"><em>' + u + "</em></span></label>").join("") + "</div>" +
      '<h3>Stress slider</h3><label class="slider" for="t_sales_drop"><span>Sales fall by <b id="sv_sales">' + pct(q.sales_drop) + '</b></span><input type="range" id="t_sales_drop" name="sales_drop" data-kind="pct" min="0" max="40" step="1" value="' + Math.round(q.sales_drop * 100) + '"></label>' +
      '<label class="slider" for="t_rate_shock"><span>Interest rises by <b id="sv_rate">' + (q.rate_shock * 100).toFixed(1) + ' points</b></span><input type="range" id="t_rate_shock" name="rate_shock" data-kind="pct" min="0" max="4" step="0.25" value="' + q.rate_shock * 100 + '"></label>' +
      '<div class="row gap-s"><button class="btn primary" type="button" data-act="twin-save">Save assumptions</button><button class="btn ghost" type="button" data-act="twin-reset">Reset to saved</button></div>' +
      '</form><div class="twin-out" id="twin-out">' + twinResults(c, q) + "</div></div>";
  }
  function twinResults(c, q) {
    const t = GB.twin(q), b = t.best, disc = Math.pow(1 + q.discount_rate, q.horizon);
    const bestNet = (b.value - t.equity.value) / disc;
    const stressExp = GB.dscrPath(q, b.loan), stressNow = GB.dscrPath(q, b.loan, { salesDrop: q.sales_drop, rateShock: q.rate_shock });
    const minS = Math.min(...stressNow.map((r) => r.dscr));
    const fvInfo = (label, L, E, f) => ({ title: "Founder value at year " + q.horizon + ": " + label, formula: "Company value at year N = (pre-money + raise) x (1 + growth)^N\nDebt cost = payments made - interest tax shield + loan still outstanding\nStake sold = equity raised / (pre-money + equity raised)\nFounder value = (1 - stake sold) x (company value - debt cost)",
      inputs: [["Pre-money value", cr(q.pre_money), "founder"], ["Raise", cr(q.raise), "founder"], ["Growth a year", pct(q.value_growth), "founder"], ["Years", q.horizon, "founder"], ["Loan", cr(L), "engine"], ["Equity raised", cr(E), "engine"], ["Company value at year " + q.horizon, cr(f.Vn), "engine"], ["Debt cost", cr(f.debtCost), "engine"], ["Stake sold", pct(f.stake, 1), "engine"]] });
    const fvDebt = GB.founderValue(q, q.raise, 0), fvEq = GB.founderValue(q, 0, q.raise), fvBest = GB.founderValue(q, b.loan, b.equity);
    // plain-language summary built from engine output, then checked number by number
    const facts = { best: pct(b.share), eq: pct(1 - b.share), net: n(bestNet), be: n(t.break_even, 0), beg: pct(t.break_even_growth, 1), dscr: b.dscr.toFixed(2), years: String(q.horizon) };
    const narrative = "We recommend raising " + facts.best + " as debt and " + facts.eq + " as equity. Over " + facts.years + " years this leaves you about Rs " + facts.net + " crore better off in today's money than raising it all as equity. " +
      "Debt wins outright if the company is worth more than Rs " + facts.be + " crore in year " + facts.years + ", which needs value growth of " + facts.beg + " a year. At this mix the lowest repayment safety ratio is " + facts.dscr + ".";
    const found = narrative.match(/\d+(?:,\d{2,3})*(?:\.\d+)?%?/g) || [], allowed = new Set(Object.values(facts));
    const verified = found.filter((x) => allowed.has(x)).length;
    const rep = latestReport(c.id);
    const stressRows = stressNow.map((r) => r.dscr);
    return '<div class="kpis k4">' +
      '<div class="kpi accent"><small>Best mix</small><b>' + gx(pct(b.share) + " debt", { title: "Best mix", formula: "Test debt share 0% to 100% in 5% steps.\nKeep mixes with lowest DSCR >= " + q.dscr_min + " (expected case) and >= 1.00 (sales -20%, rate +2 points).\nPick the highest founder value.", inputs: [["Feasible mixes", t.mixes.filter((m) => m.ok).length + " of 21", "engine"], ["Founder value at best mix", cr(b.value), "engine"], ["Lowest DSCR", xx(b.dscr), "engine"], ["Lowest DSCR under stress", xx(b.dscr_stress), "engine"]] }) + "</b><span>" + cr(b.loan) + " loan + " + cr(b.equity) + " equity</span></div>" +
      '<div class="kpi"><small>Better off than all-equity</small><b>' + gx(cr(bestNet), { title: "Net effect, today's money", formula: "(Founder value at best mix - founder value with all equity) / (1 + discount rate)^N", inputs: [["Founder value, best mix", cr(b.value), "engine"], ["Founder value, all equity", cr(t.equity.value), "engine"], ["Discount rate", pct(q.discount_rate), "advisor"], ["Years", q.horizon, "founder"]] }) + "</b><span>Expected case</span></div>" +
      '<div class="kpi"><small>Break-even value</small><b>' + gx(cr(t.break_even, 0), { title: "Break-even company value", formula: "All-debt and all-equity give the founder the same value when\n(1 - stake sold) x V = V - debt cost\nso V = debt cost / stake sold", inputs: [["Debt cost (all-debt)", cr(t.debt.debtCost), "engine"], ["Stake sold (all-equity)", pct(t.equity.stake, 1), "engine"], ["Needed value growth a year", pct(t.break_even_growth, 1), "engine"]] }) + "</b><span>in year " + q.horizon + "</span></div>" +
      '<div class="kpi"><small>Lowest DSCR, your stress</small><b class="' + (minS < 1 ? "t-bad" : minS < q.dscr_min ? "t-warn" : "") + '">' + gx(xx(minS), { title: "Lowest DSCR under your stress settings", formula: "EBITDA falls by sales drop x operating leverage (" + q.op_leverage + ")\nDSCR = (EBITDA - tax) / (existing debt service + loan payment)", inputs: [["Loan at best mix", cr(b.loan), "engine"], ["Sales drop", pct(q.sales_drop), "founder"], ["Rate rise", (q.rate_shock * 100).toFixed(1) + " points", "founder"], ["Operating leverage", q.op_leverage, "benchmark"]] }) + "</b><span>at the best mix loan</span></div></div>" +
      '<section class="panel"><h2>Net Effect Bridge</h2><p class="muted">What your share is worth in year ' + q.horizon + " under each route (expected case).</p>" +
      hbars([{ label: "All equity", value: t.equity.value, color: C.equity }, { label: "All debt", value: t.debt.value, color: C.debt }, { label: "Best mix (" + pct(b.share) + " debt)", value: b.value, color: C.mix }], { label: "Founder value by route" }) +
      '<p>Founder value: all equity ' + gx(cr(fvEq.value), fvInfo("all equity", 0, q.raise, fvEq)) + ", all debt " + gx(cr(fvDebt.value), fvInfo("all debt", q.raise, 0, fvDebt)) + ", best mix " + gx(cr(fvBest.value), fvInfo("best mix", b.loan, b.equity, fvBest)) + ".</p></section>" +
      '<section class="panel"><h2>Break-even Value</h2><p class="rule">If ' + esc(c.name) + " is worth more than <b>" + cr(t.break_even, 0) + "</b> in " + q.horizon + " years, debt wins. Below that, equity wins.</p><p class=\"muted\">That needs company value to grow " + pct(t.break_even_growth, 1) + " a year from " + cr(q.pre_money + q.raise, 0) + ". Your assumption is " + pct(q.value_growth) + ".</p>" +
      '<div class="tw"><table class="tbl"><thead><tr><th>Case</th><th class="num">Value growth</th><th class="num">Founder value, all debt</th><th class="num">Founder value, all equity</th><th class="num">Net effect today</th></tr></thead><tbody>' +
      ["best", "expected", "worst"].map((k) => { const r = t.range[k]; return "<tr><td>" + k.charAt(0).toUpperCase() + k.slice(1) + '</td><td class="num">' + pct(r.growth) + '</td><td class="num">' + cr(r.debt) + '</td><td class="num">' + cr(r.equity) + '</td><td class="num ' + (r.net < 0 ? "t-bad" : "") + '">' + cr(r.net) + "</td></tr>"; }).join("") + "</tbody></table></div></section>" +
      '<section class="panel"><h2>Stress Slider: repayment safety by year</h2><p class="muted">Loan at the best mix (' + cr(b.loan) + "). Move the sliders on the left.</p>" +
      lines(stressExp.map((r) => "Y" + r.year), [{ name: "Expected", color: C.debt, values: stressExp.map((r) => r.dscr) }, { name: "Your stress", color: C.equity, values: stressRows, dash: true }], { refs: [{ y: q.dscr_min, label: "Minimum " + q.dscr_min.toFixed(2) + "x", color: "var(--warn)" }, { y: 1, label: "1.00x: cash just covers payments", color: "var(--bad)" }], yfmt: (v) => v.toFixed(2) + "x", label: "DSCR by year", max: Math.max(4, q.dscr_min * 2) }) +
      "<p>Cash left after debt service in the worst stressed year: <b>" + cr(Math.min(...stressNow.map((r) => r.cash_after))) + "</b>.</p></section>" +
      '<section class="panel"><h2>Best mix search</h2><p class="muted">Founder value for every debt share from 0% to 100%. Hollow points fail the DSCR tests.</p>' +
      lines(t.mixes.map((m) => pct(m.share)), [{ name: "Founder value", color: C.mix, values: t.mixes.map((m) => m.value), hollow: t.mixes.map((m) => !m.ok), dots: true, endLabel: false }], { yfmt: (v) => "Rs " + n(v, 0), label: "Founder value by debt share", min: Math.min(...t.mixes.map((m) => m.value)) * 0.95, marks: [{ i: Math.round(b.share * 20), v: b.value, label: "Best" }] }) + "</section>" +
      '<section class="panel"><h2>Break-even as a probability</h2>' + (S.sim && S.sim.key === JSON.stringify(q) ? simBlock(S.sim.res) : '<p class="muted">Run 2,000 futures with random growth and earnings shocks. The seed is fixed, so the same inputs always give the same answer.</p><button class="btn primary" data-act="simulate">Run 2,000 simulations</button>') + "</section>" +
      '<section class="panel"><h2>Loan schedule (all-debt case)</h2><div class="tw"><table class="tbl"><thead><tr><th>Year</th><th class="num">Opening</th><th class="num">Interest</th><th class="num">Principal</th><th class="num">Payment</th><th class="num">Closing</th></tr></thead><tbody>' +
      t.schedule.map((r) => "<tr><td>Y" + r.year + '</td><td class="num">' + n(r.opening, 2) + '</td><td class="num">' + n(r.interest, 2) + '</td><td class="num">' + n(r.principal, 2) + '</td><td class="num">' + n(r.payment, 2) + '</td><td class="num">' + n(Math.abs(r.closing) < 1e-9 ? 0 : r.closing, 2) + "</td></tr>").join("") +
      '</tbody></table></div><p class="muted small">Yearly instalment = P x r / (1 - (1 + r)^-n) = ' + gx(cr(t.payment, 2), { title: "Yearly loan instalment", formula: "P x r / (1 - (1 + r)^-n)", inputs: [["P (loan)", cr(q.raise), "founder"], ["r (rate)", pct(q.loan_rate, 2), "benchmark"], ["n (years)", q.tenor, "benchmark"]] }) + ". Total repaid " + cr(t.total_repaid, 2) + ".</p></section>" +
      '<section class="panel"><h2>Plain-language summary</h2><p class="narr">' + esc(narrative) + '</p><p class="small ' + (verified === found.length ? "t-good" : "t-bad") + '">Number check: ' + verified + " of " + found.length + " numbers in this summary match the engine output.</p>" +
      (S.user.role === "advisor" ? submitBlock(c, rep, t, q, verified === found.length) : "") + "</section>";
  }
  function simBlock(s) {
    return '<div class="kpis k3"><div class="kpi"><small>Debt leaves you better off</small><b>' + pct(s.p_debt_better) + '</b><span>of simulated futures (all-debt vs all-equity)</span></div><div class="kpi"><small>Risk of a year with DSCR below 1</small><b class="' + (s.p_default > 0.1 ? "t-bad" : "") + '">' + pct(s.p_default) + '</b><span>with the whole raise as debt</span></div><div class="kpi"><small>Net effect range (10th-90th)</small><b>' + cr(s.p10, 0) + " to " + cr(s.p90, 0) + "</b><span>median " + cr(s.p50, 0) + " (year-N value)</span></div></div><p class=\"muted small\">" + s.runs.toLocaleString("en-IN") + " runs, seed " + s.seed + ".</p>";
  }
  function submitBlock(c, rep, t, q, verifierOk) {
    if (rep && rep.status === "in_review") return '<div class="notice">Your report "' + esc(rep.title) + '" is with the advisor for review.</div>';
    const valid = q.raise > 0 && q.pre_money > 0 && q.horizon >= 3 && q.loan_rate > 0 && q.loan_rate < 0.3 && q.ebitda0 > 0 && q.tenor >= 1;
    return (rep ? '<p>Latest report: ' + statusChip(rep.status) + " " + stamp(rep) + (rep.review_note ? ' <span class="muted">"' + esc(rep.review_note) + '"</span>' : "") + "</p>" : "") +
      '<h3>Release checklist</h3><ul class="checks"><li class="' + (valid ? "done" : "") + '">Validation checks ' + (valid ? "passed" : "failed: check raise, value, rate, EBITDA and tenor") + '</li><li class="done">Engine version recorded: ' + esc(t.version) + '</li><li class="' + (verifierOk ? "done" : "") + '">Number check by the verifier ' + (verifierOk ? "passed" : "failed") + '</li><li><label><input type="checkbox" id="confirm_data"> The founder of ' + esc(c.name) + " has confirmed these figures</label></li><li>Advisor review and sign-off (next)</li></ul>" +
      '<button class="btn primary" data-act="submit-report"' + (valid && verifierOk ? "" : " disabled") + ">Submit for advisor review</button>";
  }

  const READY_FIELDS = [["dscr", "DSCR (repayment safety)", "x", "num"], ["collateral_cover", "Collateral cover", "x", "num"], ["gst_on_time", "GST returns on time, last 12 months", "of 12", "int"], ["audited_years", "Years of audited accounts", "yrs", "int"], ["credit_score", "Company credit score", "", "int"], ["debt_to_ebitda", "Debt / EBITDA", "x", "num"], ["revenue_growth", "Revenue growth a year", "%", "pct"], ["ebitda_positive_years", "Years of positive EBITDA", "yrs", "int"]];
  const READY_CHECKS = [["board_in_place", "Board meets regularly and ROC filings are current"], ["clean_cap_table", "Cap table is documented and clean"], ["data_room_ready", "Data room is ready"], ["team_complete", "A finance lead is in place"], ["market_story", "Use-of-funds and market note written"]];
  function readinessPage() {
    const c = S.user.role === "founder" ? myCompany() : twinTarget();
    const a = Object.assign({}, GB.READINESS_DEFAULTS, c.readiness || {});
    return head("Funding Readiness Score", "How ready " + esc(c.name) + " is to raise debt and equity today, and what to fix first.") +
      '<div class="twin"><form class="panel twin-in" data-form="readiness" data-company="' + c.id + '" novalidate><h2>Your answers</h2><div class="fields f2">' +
      READY_FIELDS.map(([k, l, u, kind]) => '<label class="fld"><span>' + esc(l) + '</span><span class="in"><input name="' + k + '" id="rd_' + k + '" data-kind="' + kind + '" value="' + (kind === "pct" ? +(a[k] * 100).toFixed(2) : a[k]) + '" inputmode="decimal">' + (u ? "<em>" + u + "</em>" : "") + "</span></label>").join("") + "</div>" +
      '<div class="checkset">' + READY_CHECKS.map(([k, l]) => '<label><input type="checkbox" name="' + k + '" id="rd_' + k + '"' + (a[k] ? " checked" : "") + "> " + esc(l) + "</label>").join("") + "</div>" +
      '<button class="btn primary" type="submit">Save answers</button></form><div id="ready-out">' + readyResults(a) + "</div></div>";
  }
  function readyResults(a) {
    const r = GB.readiness(a);
    const list = (s) => '<ul class="factors">' + s.items.map((x) => '<li><span>' + esc(x.name) + '</span><span class="pts ' + (x.ok ? "t-good" : "t-warn") + '">' + x.pts + "/" + x.max + "</span></li>").join("") + "</ul>";
    return '<div class="grid2"><section class="panel">' + meter(r.debt.score, "Debt readiness") + "<p>" + chip(r.debt.score >= 75 ? "ok" : r.debt.score >= 55 ? "warn" : "bad", r.debt.verdict) + "</p>" + list(r.debt) + "</section>" +
      '<section class="panel">' + meter(r.equity.score, "Equity readiness") + "<p>" + chip(r.equity.score >= 75 ? "ok" : r.equity.score >= 55 ? "warn" : "bad", r.equity.verdict) + "</p>" + list(r.equity) + "</section></div>" +
      '<section class="panel"><h2>Fix-it plan</h2>' + (r.plan.length ? '<ol class="steps">' + r.plan.map((p) => "<li>" + esc(p) + "</li>").join("") + "</ol>" : '<p class="t-good">Nothing to fix. You are ready to raise.</p>') + "</section>";
  }

  function cmaPage() {
    const forWho = S.user.role === "advisor" ? "a client company's" : "your company's";
    return head("CMA funding report", "Upload " + forWho + " CMA workbook and project details to get a one-page debt vs equity recommendation sized on DSCR, as a PDF for lenders.") +
      '<section class="panel tool-launch"><div><p>The tool reads the Indian bank CMA format (Form II operating statement, Form III balance sheet), finds the base year, sizes the debt the project can carry at the target DSCR, applies the lender\'s minimum own contribution, stress-tests it, and writes a one-page A4 report.</p></div>' +
      '<ul class="ticks"><li>First sheet read; rows found by the label in column A</li><li>Years in columns B to E, status row below</li><li>NET SALES, PBIT, PROFIT BEFORE TAX and PAT required</li><li>The workbook stays in your browser</li></ul>' +
      '<div><a class="btn primary lg" href="' + esc(root.GB_CMA_URL || "fundmix.html") + '">Open the CMA funding report</a></div></section>';
  }

  // ---------- Equity vs Debt Optimizer (founders and advisors) ----------
  const EDO = root.EDO;
  const OPT_FIELDS = [ // key, label, unit, help
    ["amount", "Amount to raise", "cr", "The total money you want to raise now."],
    ["pre_money", "Valuation today (pre-money)", "cr", "What the company is worth before the new money. Investors' share = their money / (this + their money)."],
    ["profit_month", "Profit per month today", "lakh", "Profit in a typical month. This pays the EMI and the shareholders."],
    ["growth_y1", "Profit growth, year 1", "pct", "Growth in the first year after the money comes in."],
    ["growth_y2", "Profit growth, year 2 on", "pct", "Steady growth each year after year 1."],
    ["interest_rate", "Loan interest", "pct", "Annual rate; EMI is worked out monthly at this rate / 12."],
    ["tenure_years", "Loan tenure", "int", "Years to repay; EMI stops after this."],
    ["horizon_years", "Years to compare over", "int", "1 to 20 years. Equity costs a share every year; debt only until the tenure ends."],
  ];
  const OPT_ADV = [
    ["tax_rate", "Tax rate", "pct", "Leave at 0 if profit is already after tax; otherwise interest saves tax."],
    ["exit_multiple", "Exit value (x annual profit)", "num", "Company value at the end of the horizon, as a multiple of that year's profit."],
    ["discount_rate", "Discount rate", "pct", "Future cash is divided by (1 + this rate) for each year of waiting."],
    ["debt_fee", "Loan processing fee", "pct", "One-time, paid in year 1."],
    ["equity_cost", "Equity transaction cost", "pct", "Legal, valuation and filing costs, paid in year 1."],
    ["payout_ratio", "Profit paid out", "pct", "What is not paid out stays in the company and adds to the exit value."],
    ["growth_boost_equity", "Extra growth if equity-funded", "pct", "Points of growth investors might add."],
    ["growth_boost_debt", "Extra growth if debt-funded", "pct", "Use a negative number if covenants would slow you down."],
    ["min_dscr_required", "Minimum DSCR you accept", "num", "Reject mixes where profit / EMI falls below this in any year."],
  ];
  const UNIT = { cr: [1e7, "Rs cr"], lakh: [1e5, "Rs lakh"], pct: [0.01, "%"], int: [1, "yrs"], num: [1, ""] };
  function optInputs() { return Object.assign({}, EDO.DEFAULTS, S.opt || {}); }
  function optField([k, l, u, help]) {
    const q = optInputs(), [mult, sfx] = UNIT[u];
    const v = +(q[k] / mult).toFixed(6);
    return '<label class="fld" for="o_' + k + '" title="' + esc(help) + '"><span>' + esc(l) + '</span><span class="in"><input id="o_' + k + '" name="' + k + '" data-unit="' + u + '" value="' + v + '" inputmode="decimal">' + (sfx ? "<em>" + sfx + "</em>" : "") + "</span></label>";
  }
  function optimizerPage() {
    const q = optInputs();
    return head("Equity vs Debt Optimizer", "Tests every mix from 0% to 100% equity, year by year, and shows which leaves the founder the most money. Hover a field for what it means; click any underlined number for its working.") +
      '<div class="twin"><form class="panel twin-in" data-form="opt" novalidate><h2>Inputs</h2><div class="fields f2">' + OPT_FIELDS.map(optField).join("") + "</div>" +
      '<details><summary class="small" style="cursor:pointer">Advanced: tax, exit value, fees, payout</summary><div class="fields f2" style="margin-top:12px">' + OPT_ADV.map(optField).join("") + "</div></details>" +
      '<label class="fld"><span>Rank mixes by</span><span class="in"><select name="metric" id="o_metric">' + Object.entries(EDO.METRICS).map(([k, v]) => '<option value="' + k + '"' + (q.metric === k ? " selected" : "") + ">" + esc(v) + "</option>").join("") + "</select></span></label>" +
      '<fieldset class="seg"><legend class="small">Show amounts as</legend><label><input type="radio" name="fmt" value="short"' + (S.optFull ? "" : " checked") + '><span>Rs 1.23 Cr</span></label><label><input type="radio" name="fmt" value="full"' + (S.optFull ? " checked" : "") + "><span>Rs 1,23,45,678</span></label></fieldset>" +
      '<button class="btn ghost" type="button" data-act="opt-reset">Reset to defaults</button>' +
      '<p class="small muted">Decision-support model, not financial advice. Same formulas as the Equity vs Debt Optimizer desktop app.</p></form>' +
      '<div class="twin-out" id="opt-out">' + optResults() + "</div></div>";
  }
  const bold = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  function optResults() {
    const q = optInputs(), v = EDO.validate(q);
    if (v.errors.length) return '<div class="notice bad" role="alert">' + v.errors.map(esc).join("<br>") + "</div>";
    const r = EDO.optimize(q), M = r.mixes, b = r.best, mb = M[b], m = r.metric, short = !S.optFull, f = (x) => EDO.inr(x, short);
    const sel = S.optSel === undefined || S.optSel === null ? b : S.optSel, ms = M[sel];
    const lab = EDO.mixLabel, rejected = r.feasible.filter((x) => !x).length;
    const div = Math.max(...M.map((x) => Math.abs(x[q.metric]))) >= 1e7 ? 1e7 : 1e5, unit = div === 1e7 ? "Cr" : "L";
    const emiInfo = (mx) => ({ title: "Monthly EMI", formula: "EMI = P x r x (1 + r)^n / ((1 + r)^n - 1)\nr = annual rate / 12, n = months", inputs: [["P (loan)", EDO.inr(mx.debt), "founder"], ["Annual rate", EDO.pct(q.interest_rate, 2), "founder"], ["n (months)", String(q.tenure_years * 12), "founder"]] });
    const ownInfo = (mx) => ({ title: "Investor ownership (post-money)", formula: "Ownership = equity / (pre-money valuation + equity)", inputs: [["Equity raised", EDO.inr(mx.equity), "engine"], ["Pre-money valuation", EDO.inr(q.pre_money), "founder"]] });
    let h = (v.warnings.length ? '<div class="notice">' + v.warnings.map(esc).join("<br>") + "</div>" : "");
    h += '<section class="panel opt-best"><h2>Best mix for the founder: <b>' + lab(mb.e) + '</b></h2><p class="muted">Raise ' + f(mb.equity) + " as equity and " + f(mb.debt) + " as a loan. You keep " + gx(EDO.pct(mb.fdr), ownInfo(mb)) + " of the company. Ranked by " + EDO.METRICS[q.metric].toLowerCase() + "." + (rejected ? " " + rejected + " mixes rejected: profit would not cover the EMI with enough room." : "") + "</p>" +
      '<div class="kpis k4"><div class="kpi accent"><small>Your cash a month, year 1</small><b>' + f(mb.years[0].founder / 12) + "</b><span>EMI " + (mb.debt ? gx(f(mb.emiMonth), emiInfo(mb)) : "none") + '</span></div><div class="kpi"><small>Total cash, ' + q.horizon_years + ' years</small><b>' + f(mb.total_cash) + '</b></div><div class="kpi"><small>Exit-inclusive wealth</small><b>' + f(mb.wealth) + '</b></div>' +
      '<div class="kpi"><small>vs 100% equity / 100% debt</small><b>+' + f(m(b) - m(100)) + "</b><span>" + (r.feasible[0] ? (b === 0 ? "this is 100% debt" : f(m(b) - m(0)) + " vs 100% debt") : "100% debt not possible") + "</span></div></div>" +
      (mb.debt ? '<p class="small ' + (r.risky[b] ? "t-warn" : "muted") + '">' + (r.risky[b] ? "Debt cover is thin: in the weakest year profit is " + EDO.ratio(mb.min_dscr) + " the EMI; lenders usually want 1.25x." : "Debt cover is comfortable: profit is at least " + EDO.ratio(mb.min_dscr) + " the EMI in every year of the loan.") + "</p>" : "") + "</section>";
    h += '<section class="panel"><h2>Founder outcome for every mix</h2>' + lines(M.map((x) => Math.round(x.e * 100) + "%"), [{ name: EDO.METRICS[q.metric], color: C.mix, values: M.map((x, i) => x[q.metric] / div), endLabel: false }],
      { xEvery: 10, yfmt: (y) => "Rs " + n(y, 1) + " " + unit, label: "Founder outcome by equity share", min: Math.min(...M.map((x) => x[q.metric])) / div * 0.97, marks: [{ i: b, v: m(b) / div, label: "Best" }].concat(sel !== b ? [{ i: sel, v: m(sel) / div, label: "Viewing", gold: false }] : []) }) + "</section>";
    const idx = [...new Set([0, 25, 50, 75, 100, b, sel])].sort((a, c) => a - c);
    const yr = Math.min(S.optYear || 1, q.horizon_years) - 1;
    const parts = [["EMI to lender", "emi", C.debt], ["Tax", "tax", "var(--axis)"], ["Investors' share", "investor", C.equity], ["Kept in company", "retained", "var(--line-2)"], ["Founder take-home", "founder", C.mix]];
    h += '<section class="panel"><div class="pg-head" style="border:0;padding:0"><h2>Where each month\'s profit goes</h2><label class="fld inline"><span>Year</span><span class="in sm"><select id="o_year" data-opt="year">' + Array.from({ length: q.horizon_years }, (_, k) => "<option" + (k === yr ? " selected" : "") + ">" + (k + 1) + "</option>").join("") + "</select></span></label></div>" +
      UI.stack(idx.map((i) => Math.round(M[i].e * 100) + "% eq" + (i === b ? " (best)" : "")), parts.filter(([, k]) => idx.some((i) => Math.abs(M[i].years[yr][k]) > 1)).map(([nm, k, col]) => ({ name: nm, color: col, values: idx.map((i) => M[i].years[yr][k] / 12 / 1e5) })),
        { yfmt: (y) => n(y, 0) + " L", fmt: (x) => "Rs " + n(x, 2) + " L a month", tops: idx.map((i) => "You " + EDO.inr(M[i].years[yr].founder / 12, true)), label: "Monthly profit split by mix" }) + '<p class="small muted">Each bar is one month\'s profit in year ' + (yr + 1) + ", in Rs lakh.</p></section>";
    h += '<section class="panel"><h2>Look at one mix</h2><label class="slider" for="o_sel"><span>Equity share: <b>' + lab(ms.e) + '</b></span><input type="range" id="o_sel" data-opt="sel" min="0" max="100" step="1" value="' + sel + '"></label>' +
      "<div>" + lines(ms.years.map((y) => "Y" + y.year), [{ name: "100% equity", color: C.equity, values: M[100].years.map((y) => y.cum / 1e5), endLabel: false }, { name: "100% debt", color: C.debt, values: M[0].years.map((y) => y.cum / 1e5), endLabel: false }, { name: "Best (" + Math.round(mb.e * 100) + "% eq)", color: C.mix, values: mb.years.map((y) => y.cum / 1e5), endLabel: false, diamonds: true }].concat(sel !== b && sel !== 0 && sel !== 100 ? [{ name: Math.round(ms.e * 100) + "% eq (viewing)", color: "var(--ink-2)", values: ms.years.map((y) => y.cum / 1e5), dash: true, endLabel: false }] : []),
        { yfmt: (y) => n(y, 0) + " L", label: "Cumulative founder cash", height: 260 }) + '<p class="small muted">Cumulative founder cash, Rs lakh.' + (r.breakevenCash ? " 100% debt is ahead from year " + r.breakevenCash + "." : "") + "</p></div>" +
      "<div>" + (ms.debt ? lines(ms.years.map((y) => "Y" + y.year), [{ name: "DSCR", color: C.debt, values: ms.years.map((y) => (Number.isFinite(y.dscr) ? y.dscr : NaN)), endLabel: false }], { refs: [{ y: EDO.DSCR_RISKY, label: "1.25x lenders' minimum", color: "var(--warn)" }, { y: 1, label: "1.00x just covers EMI", color: "var(--bad)" }], yfmt: (y) => y.toFixed(1) + "x", label: "DSCR by year", height: 260 }) + '<p class="small muted">Profit / EMI by year for ' + lab(ms.e) + ".</p>" : '<div class="empty"><b>No loan in this mix</b><p>There is no EMI to cover.</p></div>') + "</div>" +
      '<div class="tw"><table class="tbl"><thead><tr><th>Year</th><th class="num">Profit</th><th class="num">EMI</th><th class="num">Investors</th><th class="num">You</th><th class="num">You a month</th><th class="num">Cumulative</th><th class="num">DSCR</th></tr></thead><tbody>' +
      ms.years.map((y) => "<tr><td>Y" + y.year + '</td><td class="num">' + f(y.profit) + '</td><td class="num">' + f(y.emi) + '</td><td class="num">' + f(y.investor) + '</td><td class="num">' + f(y.founder) + '</td><td class="num">' + f(y.founder / 12) + '</td><td class="num">' + f(y.cum) + '</td><td class="num">' + EDO.ratio(y.dscr) + "</td></tr>").join("") + "</tbody></table></div>" +
      "<h3>Show the calculation</h3><ol class=\"steps\"><li>Equity = " + f(q.amount) + " x " + Math.round(ms.e * 100) + "% = " + f(ms.equity) + "; loan = " + f(ms.debt) + ".</li>" +
      "<li>Investor ownership = " + f(ms.equity) + " / (" + f(q.pre_money) + " + " + f(ms.equity) + ") = " + gx(EDO.pct(ms.inv, 2), ownInfo(ms)) + "; you keep " + EDO.pct(ms.fdr, 2) + ".</li>" +
      (ms.debt ? "<li>EMI = P x r x (1 + r)^n / ((1 + r)^n - 1) with P = " + f(ms.debt) + ", r = " + EDO.pct(q.interest_rate, 2) + " / 12, n = " + q.tenure_years * 12 + ": " + gx(EDO.inr(ms.emiMonth), emiInfo(ms)) + " a month.</li>" : "<li>No loan, so no EMI.</li>") +
      "<li>Year 1 profit = " + f(q.profit_month) + " x (1 + " + EDO.pct(q.growth_y1) + ") x 12 = " + f(ms.years[0].profit) + "; after the EMI" + (q.tax_rate ? " and tax" : "") + ", you get " + EDO.pct(ms.fdr, 2) + " of what is paid out: " + f(ms.years[0].founder) + " (" + f(ms.years[0].founder / 12) + " a month).</li>" +
      "<li>Exit stake = " + EDO.pct(ms.fdr, 2) + " x (" + q.exit_multiple + " x final-year profit - loan still owed + cash kept) = " + f(ms.exit_stake) + ".</li></ol></section>";
    const hr = EDO.horizonTable(q);
    h += '<section class="panel"><h2>If the horizon is longer</h2><div class="tw"><table class="tbl"><thead><tr><th>Horizon</th><th>Best mix</th><th class="num">Best outcome</th><th class="num">vs 100% equity</th><th>Debt ahead in cash</th></tr></thead><tbody>' +
      hr.map((x) => "<tr><td>" + x.horizon + " years</td><td>" + lab(x.best_equity) + '</td><td class="num">' + f(x.best_score) + '</td><td class="num">' + f(x.gap_vs_equity) + "</td><td>" + (x.breakeven ? "year " + x.breakeven : "not within horizon") + "</td></tr>").join("") + '</tbody></table></div><p class="muted">' + esc(EDO.horizonExplanation(hr)) + "</p></section>";
    const sn = EDO.sensitivity(q);
    h += '<section class="panel"><h2>How sure is the answer?</h2><div class="tw"><table class="tbl"><thead><tr><th>If this changes</th><th>Best mix</th><th class="num">Best outcome</th><th class="num">Change</th></tr></thead><tbody>' +
      sn.rows.map((x) => "<tr><td>" + esc(x.variable + " " + x.case) + "</td><td>" + lab(x.best_equity) + (x.moved ? ' <span class="chip warn">moved ' + (x.moved > 0 ? "+" : "") + x.moved + " pts</span>" : "") + '</td><td class="num">' + f(x.best_score) + '</td><td class="num ' + (x.change < 0 ? "t-bad" : "") + '">' + f(x.change) + "</td></tr>").join("") + "</tbody></table></div></section>";
    h += '<section class="panel suggest"><h2>Suggestions</h2>' + EDO.suggestions(r, EDO.downside(q), hr, short).map(([t, items]) => "<h3>" + esc(t) + "</h3><ul>" + items.map((it) => "<li>" + bold(it) + "</li>").join("") + "</ul>").join("") + '<p class="small muted">Written from the numbers by fixed rules, not by AI.</p></section>';
    h += '<section class="panel"><h2>All mixes</h2><div class="tw" style="max-height:420px;overflow:auto"><table class="tbl"><thead><tr><th>Mix</th><th class="num">You keep</th><th class="num">EMI a month</th><th class="num">You a month, Y1</th><th class="num">Total cash</th><th class="num">Exit stake</th><th class="num">' + esc(EDO.METRICS[q.metric]) + '</th><th class="num">Lowest DSCR</th></tr></thead><tbody>' +
      M.filter((x, i) => i % 5 === 0 || i === b).map((x) => { const i = Math.round(x.e * 100); return "<tr" + (i === b ? ' style="font-weight:600"' : "") + "><td>" + lab(x.e) + (i === b ? ' <span class="chip ok">best</span>' : r.feasible[i] ? "" : ' <span class="chip bad">rejected</span>') + '</td><td class="num">' + EDO.pct(x.fdr) + '</td><td class="num">' + f(x.emiMonth) + '</td><td class="num">' + f(x.years[0].founder / 12) + '</td><td class="num">' + f(x.total_cash) + '</td><td class="num">' + f(x.exit_stake) + '</td><td class="num">' + f(x[q.metric]) + '</td><td class="num">' + EDO.ratio(x.min_dscr) + "</td></tr>"; }).join("") + "</tbody></table></div></section>";
    return h;
  }
  function readOpt(form) {
    const q = {};
    for (const el of form.querySelectorAll("input[data-unit]")) {
      const x = Number(String(el.value).replace(/,/g, "").trim());
      if (el.value.trim() === "" || !Number.isFinite(x)) { q[el.name] = NaN; continue; }
      const u = el.dataset.unit; q[el.name] = u === "int" ? Math.round(x) : x * UNIT[u][0];
    }
    q.metric = form.elements.metric.value;
    S.optFull = form.querySelector('input[name="fmt"]:checked').value === "full";
    return q;
  }

  function termSheetPage() {
    const tab = S.tsTab;
    return head("Term Sheet Analyser", "The real cost and the risky clauses of a sanction letter or an equity term sheet.") +
      '<div class="tabs" role="tablist"><button role="tab" aria-selected="' + (tab === "loan") + '" data-act="ts-tab" data-t="loan">Loan sanction letter</button><button role="tab" aria-selected="' + (tab === "equity") + '" data-act="ts-tab" data-t="equity">Equity term sheet</button></div>' +
      (tab === "loan" ? '<div class="twin"><form class="panel twin-in" data-calc="loants" novalidate><h2>Terms</h2><div class="fields f2">' +
        PUB.field("amount", "Loan amount", 10, "Rs cr") + PUB.field("rate", "Headline rate", 10.5, "%") + PUB.field("tenor", "Tenor", 7, "years") + PUB.field("processing_fee", "Processing fee", 1, "%") + PUB.field("other_fees", "Other upfront fees", 0.05, "Rs cr") + PUB.field("prepayment_penalty", "Prepayment penalty", 2, "%") + PUB.field("collateral_margin", "Collateral margin", 25, "%") +
        '</div><div class="checkset"><label><input type="checkbox" name="floating" checked> Floating rate</label><label><input type="checkbox" name="personal_guarantee" checked> Personal guarantee</label><label><input type="checkbox" name="cross_default"> Cross-default clause</label></div></form><div id="calc-loants">' + loanTs({}) + "</div></div>"
        : '<div class="twin"><form class="panel twin-in" data-calc="eqts" novalidate><h2>Terms</h2><div class="fields f2">' +
        PUB.field("pre_money", "Stated pre-money value", 60, "Rs cr") + PUB.field("investment", "Investment", 12, "Rs cr") + PUB.field("option_pool", "Option pool (post-money)", 8, "%") + PUB.field("liq_pref", "Liquidation preference", 1, "x") + PUB.field("board_seats", "Investor board seats", 1, "") + PUB.field("vetoes", "Veto rights", 4, "") +
        '<label class="fld"><span>Anti-dilution</span><span class="in"><select name="anti_dilution" id="f_anti"><option value="broad">Broad-based weighted average</option><option value="full">Full ratchet</option><option value="none">None</option></select></span></label>' +
        '</div><div class="checkset"><label><input type="checkbox" name="pool_pre_money" checked> Pool created from the pre-money</label><label><input type="checkbox" name="participating"> Participating preference</label></div></form><div id="calc-eqts">' + eqTs({}) + "</div></div>");
  }
  const flagList = (flags) => (flags.length ? '<ul class="flags">' + flags.map(([s, t]) => '<li class="' + s + '"><b>' + ({ high: "High risk", medium: "Watch", low: "Note" })[s] + "</b> " + esc(t) + "</li>").join("") + "</ul>" : '<p class="t-good">No risky clauses found.</p>');
  function loanTs(v) {
    const r = GB.loanTermSheet(v);
    return '<section class="panel"><div class="kpis k3"><div class="kpi accent"><small>All-in cost a year</small><b>' + gx(pct(r.all_in, 2), { title: "All-in annual cost", formula: "Rate that makes: (loan - upfront fees) = present value of all instalments\nSolved by bisection (IRR)", inputs: [["Loan", cr(r.a.amount), "term sheet"], ["Upfront fees", cr(r.fees, 2), "term sheet"], ["Instalment", cr(r.payment, 2) + " a year", "engine"], ["Tenor", r.a.tenor + " years", "term sheet"]] }) + '</b><span>vs ' + pct(r.a.rate, 2) + ' headline</span></div><div class="kpi"><small>Yearly instalment</small><b>' + cr(r.payment, 2) + '</b></div><div class="kpi"><small>Total paid incl. fees</small><b>' + cr(r.total_paid, 2) + "</b></div></div><h3>Clauses</h3>" + flagList(r.flags) + "</section>";
  }
  function eqTs(v) {
    const r = GB.equityTermSheet(v);
    return '<section class="panel"><div class="kpis k3"><div class="kpi accent"><small>Your stake after the round</small><b>' + gx(pct(r.founder_pct, 1), { title: "Founder ownership after the round", formula: "1 - investor % - option pool %\nInvestor % = investment / post-money", inputs: [["Post-money", cr(r.post), "engine"], ["Investor", pct(r.investor_pct, 1), "engine"], ["Option pool", pct(r.pool_pct, 1), "term sheet"]] }) + '</b><span>investor ' + pct(r.investor_pct, 1) + ", pool " + pct(r.pool_pct, 1) + '</span></div><div class="kpi"><small>Effective pre-money</small><b>' + cr(r.effective_pre, 1) + '</b><span>stated ' + cr(r.a.pre_money, 0) + '</span></div><div class="kpi"><small>Post-money</small><b>' + cr(r.post, 0) + "</b></div></div>" +
      "<h3>Who gets what at exit</h3><div class=\"tw\"><table class=\"tbl\"><thead><tr><th>Exit value</th><th class=\"num\">Investor</th><th class=\"num\">Founder</th><th class=\"num\">Founder share of exit</th></tr></thead><tbody>" +
      r.exits.map((e) => "<tr><td>" + cr(e.exit, 0) + " (" + e.multiple + 'x post)</td><td class="num">' + cr(e.investor) + '</td><td class="num">' + cr(e.founder) + '</td><td class="num">' + pct(e.founder_pct, 1) + "</td></tr>").join("") + "</tbody></table></div><h3>Clauses</h3>" + flagList(r.flags) + "</section>";
  }

  function monitorBlock(c, readOnly) {
    const m = GB.monitor(c.quarters, c.covenants), cov = Object.assign({}, GB.COVENANTS, c.covenants);
    return (m.length ? lines(m.map((x) => x.q), [{ name: "DSCR", color: C.debt, values: m.map((x) => x.dscr) }], { refs: [{ y: cov.dscr_min, label: "Covenant " + cov.dscr_min.toFixed(2) + "x", color: "var(--bad)" }], yfmt: (v) => v.toFixed(2) + "x", label: "DSCR by quarter", height: 200 }) +
      '<div class="tw"><table class="tbl"><thead><tr><th>Quarter</th><th class="num">EBITDA</th><th class="num">Interest</th><th class="num">Principal</th><th class="num">Debt</th><th class="num">DSCR</th><th class="num">Debt / EBITDA</th><th>Status</th></tr></thead><tbody>' +
      m.map((x) => "<tr><td>" + esc(x.q) + '</td><td class="num">' + n(x.ebitda, 2) + '</td><td class="num">' + n(x.interest, 2) + '</td><td class="num">' + n(x.principal, 2) + '</td><td class="num">' + n(x.debt, 1) + '</td><td class="num">' + gx(xx(x.dscr), { title: "Quarterly DSCR", formula: "(EBITDA - tax) / (interest + principal)\ntax = 25% x (EBITDA - interest)", inputs: [["EBITDA", cr(x.ebitda, 2), "founder"], ["Interest", cr(x.interest, 2), "founder"], ["Principal", cr(x.principal, 2), "founder"]], note: "Headroom to the " + cov.dscr_min + "x covenant: " + pct(x.dscr_headroom) }) + '</td><td class="num">' + n(x.debt_ebitda, 2) + "x</td><td>" + chip(x.state === "ok" ? "ok" : x.state === "watch" ? "warn" : "bad", x.state === "ok" ? "Within covenants" : x.state === "watch" ? "Close to limit" : "Breach") + "</td></tr>").join("") + "</tbody></table></div>" +
      (m[m.length - 1].state !== "ok" ? '<div class="notice bad">Early warning: ' + esc(m[m.length - 1].q) + " is " + (m[m.length - 1].state === "watch" ? "within 10% of a covenant limit" : "in breach of a covenant") + ". Founder and lender have been alerted.</div>" : "")
      : '<p class="muted">No quarterly figures yet.</p>') +
      (readOnly ? "" : '<h3>Add a quarter</h3><form class="fields f5" data-form="quarter">' + PUB.field("q", "Quarter", "Q1 FY27", "") + PUB.field("ebitda", "EBITDA", "", "Rs cr") + PUB.field("interest", "Interest", "", "Rs cr") + PUB.field("principal", "Principal", "", "Rs cr") + PUB.field("debt", "Debt outstanding", "", "Rs cr") + '<button class="btn primary" type="submit">Add quarter</button></form>');
  }
  function feesPage() {
    const c = myCompany();
    return head("Fees", "What an engagement costs, based on your raise and revenue. All fees are plus 18% GST.") +
      '<section class="panel"><form class="calc" data-calc="fees"><div class="fields f4">' + PUB.field("raise", "Equity raised", c.raise, "Rs cr") + PUB.field("revenue", "Company revenue", c.revenue, "Rs cr") + PUB.field("revenue_growth", "Revenue growth a year", 10, "%") + PUB.field("advisory_lakh", "Advisory fee", 1, "Rs lakh") + '</div></form><div id="calc-fees">' + PUB.feeCalc({ raise: c.raise, revenue: c.revenue, revenue_growth: 0.1 }) + "</div></section>";
  }
  function companyPage() {
    const c = myCompany();
    return head("Company profile", "Used for investor matching and your reports.") +
      '<form class="panel form" data-form="company"><div class="fields f2">' + PUB.field("name", "Company name", c.name, "") +
      '<label class="fld"><span>Sector</span><span class="in"><select name="sector" id="cp_sector">' + SECTORS.map((s) => "<option" + (s === c.sector ? " selected" : "") + ">" + s + "</option>").join("") + "</select></span></label>" +
      '<label class="fld"><span>Stage</span><span class="in"><select name="stage" id="cp_stage">' + ["Expansion", "Growth", "Mature"].map((s) => "<option" + (s === c.stage ? " selected" : "") + ">" + s + "</option>").join("") + "</select></span></label>" +
      PUB.field("city", "City", c.city, "") + PUB.field("revenue", "Revenue", c.revenue, "Rs cr") + PUB.field("raise", "Amount to raise", c.raise, "Rs cr") +
      '</div><button class="btn primary" type="submit">Save profile</button></form>';
  }
  function activityPage() {
    const rows = S.data.audit || [];
    return head(S.user.role === "advisor" ? "Audit log" : "Activity log", "Append-only record of who did what and when.") +
      '<section class="panel">' + (rows.length ? '<div class="tw"><table class="tbl"><thead><tr><th>When</th><th>Who</th><th>What</th></tr></thead><tbody>' + rows.slice(0, 200).map((a) => "<tr><td>" + dt(a.at) + "</td><td>" + esc(a.user_name) + "</td><td>" + esc(a.detail) + "</td></tr>").join("") + "</tbody></table></div>" : '<p class="muted">Nothing yet.</p>') + "</section>";
  }

  function reviewPage() {
    const q = S.data.reports.slice().sort((a, b) => (a.status === "in_review" ? -1 : 1));
    return head("Review queue", "Check the release checklist, challenge the assumptions, then sign off or send back.") +
      q.map((r) => { const c = companyById(r.company_id), s = r.summary || {};
        return '<section class="panel"><div class="pg-head"><div><h2>' + esc(r.title) + '</h2><p class="muted">' + esc(c.name) + " · " + esc(r.engine_version || "") + " · submitted " + date(r.created_at) + "</p></div>" + statusChip(r.status) + "</div>" +
          '<div class="kpis k4"><div class="kpi"><small>Best mix</small><b>' + pct(s.best_share) + ' debt</b></div><div class="kpi"><small>Net effect</small><b>' + cr(s.net) + '</b></div><div class="kpi"><small>Break-even</small><b>' + cr(s.break_even, 0) + '</b></div><div class="kpi"><small>Lowest DSCR</small><b>' + xx(s.min_dscr) + "</b><span>stress " + xx(s.min_dscr_stress) + "</span></div></div>" +
          '<ul class="checks"><li class="' + (r.checks && r.checks.validation ? "done" : "") + '">Validation checks passed</li><li class="' + (r.checks && r.checks.founder_confirmed ? "done" : "") + '">Data confirmed by the founder</li><li class="' + (r.checks && r.checks.verifier ? "done" : "") + '">Verifier number check passed</li><li class="done">Engine version recorded</li></ul>' +
          (r.status === "in_review" ? '<form data-form="review" data-id="' + r.id + '"><label class="fld"><span>Review note</span><span class="in"><textarea name="note" id="rv_' + r.id + '" rows="2" placeholder="What you checked and anything the founder should change"></textarea></span></label><div class="row gap-s"><button class="btn primary" type="submit" name="decision" value="approve">Approve and stamp</button><button class="btn ghost" type="submit" name="decision" value="changes">Request changes</button><button class="btn ghost" type="button" data-act="open-twin" data-id="' + c.id + '">Open in Funding Twin</button></div></form>'
            : stamp(r) + (r.review_note ? '<p class="muted">"' + esc(r.review_note) + '"</p>' : "")) + "</section>"; }).join("");
  }
  function enquiriesPage() {
    return head("Enquiries", "From the website contact form.") + '<section class="panel">' + (S.data.enquiries.length ? S.data.enquiries.slice().reverse().map((e) => '<div class="item col"><div><b>' + esc(e.name) + '</b> <span class="muted small">' + esc(e.email) + (e.company ? " · " + esc(e.company) : "") + " · " + dt(e.at) + "</span></div><p>" + esc(e.message) + "</p></div>").join("") : '<p class="muted">No enquiries yet. Send one from the Contact page.</p>') + "</section>";
  }

  function lenderFeesPage() {
    return head("Fees", "Aegis Ascend debt fees are paid by the lender.") + '<section class="panel"><form class="calc" data-calc="debt"><div class="fields f3">' + PUB.field("loan", "Loan amount", 10, "Rs cr") + PUB.field("tenor", "Tenor", 7, "years") + PUB.field("rate", "Interest rate", 10.5, "%") + PUB.field("monitoring", "Monitoring fee", 0.35, "% a year") + PUB.field("transfer_amount", "Amount transferred", 6, "Rs cr") + PUB.field("transfer_fee", "Transfer fee", 0.4, "%") + '</div></form><div id="calc-debt">' + PUB.debtCalc({}) + "</div></section>";
  }

  function notificationsPage() {
    const N = S.data.notifications || [];
    return head("Notifications", "Offers, revaluations, lock-in dates and request updates.", N.some((x) => !x.read) ? '<button class="btn ghost sm" data-act="read-all">Mark all read</button>' : "") +
      '<section class="panel">' + (N.length ? '<ul class="notes" data-stagger>' + N.map((x) => '<li class="' + (x.read ? "" : "unread") + '"><span class="nt-kind nt-' + esc(x.kind) + '" aria-hidden="true"></span><div><a href="#' + esc(x.link || "app") + '">' + esc(x.text) + '</a><span class="muted small">' + (x.computed ? "Reminder" : dt(x.at)) + "</span></div></li>").join("") + "</ul>"
        : KIT.empty("You are up to date", "New offers, revaluations and request updates will appear here.")) + "</section>";
  }

  // Pages by role. ws-investor.js, ws-lender.js, ws-advisor.js and ws-founder.js add theirs through root.WS.
  const PAGES = {
    founder: { app: founderHome, "app-fees": feesPage, "app-company": companyPage, "app-activity": activityPage, "app-notifications": notificationsPage },
    investor: { "app-activity": activityPage, "app-notifications": notificationsPage },
    advisor: { "app-review": reviewPage, "app-termsheet": termSheetPage, "app-optimizer": optimizerPage, "app-cma": cmaPage, "app-twin": twinPage, "app-readiness": readinessPage, "app-enquiries": enquiriesPage, "app-activity": activityPage },
    lender: { "app-lfees": lenderFeesPage, "app-activity": activityPage, "app-notifications": notificationsPage },
  };

  // ---------- router ----------
  const PUBLIC = { home: PUB.home, services: PUB.services, "services-equity": PUB.services, "services-debt": PUB.services, pricing: PUB.pricing, investors: PUB.investors, lenders: PUB.lenders, trust: PUB.trust, about: PUB.about, contact: PUB.contact };
  async function refresh() { S.data = await API.state(); }
  let lastRoute = "";
  function robots(on) {
    let m = document.querySelector('meta[name="robots"]');
    if (!m) { m = document.createElement("meta"); m.name = "robots"; document.head.appendChild(m); }
    m.content = on ? "noindex, nofollow" : "index, follow";
  }
  async function render(opts) {
    const full = (location.hash || "#home").slice(1) || "home";
    const route = full.split("/")[0];
    S.param = decodeURIComponent(full.split("/").slice(1).join("/"));
    let html;
    robots(route.startsWith("app"));
    if (PUBLIC[route]) html = PUBLIC[route](S.user, opts && opts.msg);
    else if (route === "login") html = S.user ? (location.hash = "#app", "") : login(opts && opts.err);
    else if (route === "signup") html = S.user ? (location.hash = "#app", "") : signup(opts && opts.err);
    else if (route.startsWith("app")) {
      if (!S.user) { location.hash = "#login"; return; }
      if (!S.data || (opts && opts.reload)) {
        if (!S.data) app().innerHTML = shell(route, KIT.skeleton());
        try { await refresh(); } catch (e) {
          const signedOut = /sign in/i.test(e.message || "");
          if (!signedOut) KIT.toast("Your workspace could not load: " + (e.message || e) + (API.mode === "demo" ? ". Use Reset demo data on the sign-in page to start fresh." : ""), "bad");
          S.user = null; location.hash = "#login"; return;
        }
      }
      const page = PAGES[S.user.role][route] || PAGES[S.user.role].app;
      html = shell(full, page(S.param));
    } else html = PUB.home(S.user);
    if (html === "") return;
    const first = full !== lastRoute;
    lastRoute = full;
    app().innerHTML = html;
    S.flash = "";
    if (route === "home") PUB.mountHome();
    if (route.startsWith("app")) { const m = document.getElementById("ws-main"); if (first && m) m.classList.add("enter"); KIT.mount(app(), first); }
    if (PUBLIC[route] && route.startsWith("services-")) { const el = document.getElementById(route); if (el) el.scrollIntoView(); } else if (!(opts && opts.keepScroll)) window.scrollTo(0, 0);
    document.title = route.startsWith("app") || (PUBLIC[route] && route !== "home") ? (document.querySelector("h1") ? document.querySelector("h1").textContent + " | Aegis Ascend" : "Aegis Ascend Financial Advisors") : "Aegis Ascend Financial Advisors";
  }
  async function after(res, msg) { KIT.toast(msg || (res && res.detail) || "Saved."); await render({ reload: true, keepScroll: true }); }
  function fail(e) { KIT.toast(e.message || String(e), "bad"); }

  // ---------- input parsing ----------
  function readForm(form) {
    const out = {};
    for (const el of form.elements) {
      if (!el.name) continue;
      if (el.type === "checkbox") out[el.name] = el.checked;
      else if (el.type === "radio") { if (el.checked) out[el.name] = el.value; }
      else out[el.name] = el.value;
    }
    return out;
  }
  const num = (v) => { const x = Number(String(v).replace(/,/g, "").trim()); return Number.isFinite(x) ? x : NaN; };
  const PCT_KEYS = { fees: ["revenue_growth"], exit: ["slab"], debt: ["rate", "monitoring", "transfer_fee"], loants: ["rate", "processing_fee", "prepayment_penalty", "collateral_margin"], eqts: ["option_pool"] };
  function calcValues(kind, form) {
    const raw = readForm(form), v = {};
    for (const k in raw) {
      if (typeof raw[k] === "boolean" || k === "anti_dilution") { v[k] = raw[k]; continue; }
      const x = num(raw[k]); if (!Number.isFinite(x) || x < 0) continue;
      v[k] = (PCT_KEYS[kind] || []).includes(k) ? x / 100 : x;
    }
    if (kind === "fees" && v.revenue_growth !== undefined) v.revenue_growth = v.revenue_growth; // already a fraction
    if (v.tenor) v.tenor = Math.max(1, Math.round(v.tenor));
    if (v.months !== undefined) v.months = Math.round(v.months);
    return v;
  }
  const CALCS = { fees: PUB.feeCalc, exit: PUB.exitCalc, debt: PUB.debtCalc, loants: loanTs, eqts: eqTs };

  function twinFromForm(form) {
    const v = {};
    for (const el of form.querySelectorAll("input[data-kind]")) {
      const x = num(el.value); if (!Number.isFinite(x)) continue;
      v[el.name] = el.dataset.kind === "pct" ? x / 100 : el.dataset.kind === "int" ? Math.max(0, Math.round(x)) : x;
    }
    if (v.horizon !== undefined) v.horizon = Math.min(Math.max(v.horizon, 1), 20);
    if (v.tenor !== undefined) v.tenor = Math.min(Math.max(v.tenor, 1), 20);
    return v;
  }

  // ---------- events ----------
  document.addEventListener("input", (e) => {
    const calc = e.target.closest("[data-calc]");
    if (calc) { const k = calc.dataset.calc; const out = document.getElementById("calc-" + k); if (out) out.innerHTML = CALCS[k](calcValues(k, calc)); return; }
    const tf = e.target.closest('form[data-form="twin"]');
    if (tf) {
      const c = companyById(tf.dataset.company); S.twinDraft[c.id] = twinFromForm(tf);
      const q = twinInputs(c);
      $("#sv_sales").textContent = pct(q.sales_drop); $("#sv_rate").textContent = (q.rate_shock * 100).toFixed(2).replace(/0$/, "") + " points";
      if (q.raise > 0 && q.pre_money > 0) $("#twin-out").innerHTML = twinResults(c, q);
      return;
    }
    const rf = e.target.closest('form[data-form="readiness"]');
    if (rf) { $("#ready-out").innerHTML = readyResults(readinessValues(rf)); return; }
    const of = e.target.closest('form[data-form="opt"]');
    if (of) { S.opt = readOpt(of); $("#opt-out").innerHTML = optResults(); return; }
    if (e.target.dataset.opt === "sel") { S.optSel = +e.target.value; const y = window.scrollY; $("#opt-out").innerHTML = optResults(); window.scrollTo(0, y); const sl = $("#o_sel"); if (sl) sl.focus(); }
  });
  document.addEventListener("change", (e) => {
    if (e.target.matches('[data-act="twin-company"]')) { S.twinCompany = e.target.value; render({ keepScroll: true }); }
    if (e.target.dataset.opt === "year") { S.optYear = +e.target.value; $("#opt-out").innerHTML = optResults(); return; }
    const ofc = e.target.closest('form[data-form="opt"]'); if (ofc) { S.opt = readOpt(ofc); $("#opt-out").innerHTML = optResults(); return; }
    const rf = e.target.closest('form[data-form="readiness"]'); if (rf && e.target.type === "checkbox") $("#ready-out").innerHTML = readyResults(readinessValues(rf));
    const calc = e.target.closest("[data-calc]"); if (calc) { const k = calc.dataset.calc; document.getElementById("calc-" + k).innerHTML = CALCS[k](calcValues(k, calc)); }
  });
  function readinessValues(form) {
    const v = {};
    for (const [k, , , kind] of READY_FIELDS) { const x = num(form.elements[k].value); if (Number.isFinite(x)) v[k] = kind === "pct" ? x / 100 : kind === "int" ? Math.round(x) : x; }
    for (const [k] of READY_CHECKS) v[k] = form.elements[k].checked;
    return Object.assign({}, GB.READINESS_DEFAULTS, v);
  }

  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]"); if (!b || b.tagName === "SELECT") return;
    const act = b.dataset.act, id = b.dataset.id;
    try {
      switch (act) {
        case "toggle-menu": { const nav = $(".pub-nav"); const open = nav.classList.toggle("open"); b.setAttribute("aria-expanded", open); return; }
        case "demo-login": S.user = await API.login(b.dataset.email, API.demoPassword); S.data = null; location.hash = "#app"; return;
        case "logout": await API.logout(); S.user = null; S.data = null; S.twinDraft = {}; location.hash = "#home"; return;
        case "reset-demo": await API.reset(); S.user = null; S.data = null; S.twinDraft = {}; location.hash = "#login"; await render(); return;
        case "twin-save": { const c = twinTarget(); const patch = Object.assign({}, c.twin, S.twinDraft[c.id] || {}); delete patch.sales_drop; delete patch.rate_shock; const res = await API.act("save_company", { company_id: c.id, patch: { twin: patch, raise: patch.raise || c.raise } }); delete S.twinDraft[c.id]; return after(res, "Assumptions saved."); }
        case "twin-reset": { const c = twinTarget(); delete S.twinDraft[c.id]; return render({ keepScroll: true }); }
        case "simulate": { const c = twinTarget(), q = twinInputs(c); b.disabled = true; b.textContent = "Running…"; await new Promise((r) => setTimeout(r, 20)); S.sim = { key: JSON.stringify(q), res: GB.simulate(q) }; $("#twin-out").innerHTML = twinResults(c, q); return; }
        case "submit-report": {
          if (!$("#confirm_data").checked) throw new Error("Tick the box to confirm the figures first.");
          const c = twinTarget(), q = twinInputs(c), t = GB.twin(q), disc = Math.pow(1 + q.discount_rate, q.horizon);
          if (S.twinDraft[c.id]) await API.act("save_company", { company_id: c.id, patch: { twin: Object.assign({}, c.twin, S.twinDraft[c.id]) } });
          const res = await API.act("submit_report", { company_id: c.id, title: "Debt vs equity: " + cr(q.raise, 0) + " raise", engine_version: t.version, inputs: q,
            summary: { best_share: t.best.share, net: (t.best.value - t.equity.value) / disc, break_even: t.break_even, min_dscr: t.best.dscr, min_dscr_stress: t.best.dscr_stress },
            checks: { validation: true, founder_confirmed: true, verifier: true } });
          delete S.twinDraft[c.id]; return after(res);
        }
        case "doc-remove": { const c = myCompany(); const docs = c.docs.slice(); docs.splice(+b.dataset.k, 1); return after(await API.act("save_company", { company_id: c.id, patch: { docs } }), "Document removed."); }
        case "opt-reset": S.opt = null; S.optSel = null; S.optYear = 1; return render({ keepScroll: true });
        case "ts-tab": S.tsTab = b.dataset.t; return render({ keepScroll: true });
        case "decide-intro": { const ok = b.dataset.d === "grant" || (await KIT.confirm("Decline this request?", "<p>The investor will be told.</p>", "Decline", true)); if (ok) return after(await API.act("decide_intro", { intro_id: id, decision: b.dataset.d })); return; }
        case "open-twin": S.twinCompany = id; location.hash = "#app-twin"; return;
        case "read-all": return after(await API.act("read_notifications", {}), "All notifications marked read.");
        default: if (WS.clicks[act]) return await WS.clicks[act](b, id);
      }
    } catch (err) { fail(err); }
  });

  document.addEventListener("submit", async (e) => {
    const f = e.target.closest("form[data-form]"); if (!f) { if (e.target.closest("[data-calc]")) e.preventDefault(); return; }
    e.preventDefault();
    const kind = f.dataset.form, v = readForm(f);
    const showErr = (m) => { const box = f.querySelector(".form-err"); if (box) { box.textContent = m; box.hidden = false; } else fail({ message: m }); };
    try {
      switch (kind) {
        case "login": S.user = await API.login(v.email, v.password); S.data = null; location.hash = "#app"; return;
        case "signup": S.user = await API.signup(v); S.data = null; location.hash = "#app"; return;
        case "enquiry": await API.enquiry(v); return render({ msg: "Thank you. Your enquiry has reached our advisors." });
        case "twin": return;
        case "readiness": { const c = companyById(f.dataset.company); const vals = readinessValues(f); return after(await API.act("save_company", { company_id: c.id, patch: { readiness: vals } }), "Answers saved."); }
        case "doc-add": { const c = myCompany(); const d = String(v.doc || "").trim(); if (!d) throw new Error("Enter a document name."); return after(await API.act("save_company", { company_id: c.id, patch: { docs: (c.docs || []).concat([d.slice(0, 120)]) } }), "Document added."); }
        case "quarter": {
          const c = myCompany(), q = { q: String(v.q || "").trim().slice(0, 20) };
          for (const k of ["ebitda", "interest", "principal", "debt"]) { q[k] = num(v[k]); if (!Number.isFinite(q[k]) || q[k] < 0) throw new Error("Enter EBITDA, interest, principal and debt as numbers."); }
          if (!q.q) throw new Error("Name the quarter, for example Q1 FY27.");
          return after(await API.act("save_company", { company_id: c.id, patch: { quarters: (c.quarters || []).concat([q]) } }), "Quarter added and covenants rechecked.");
        }
        case "company": {
          const patch = { name: String(v.name).trim().slice(0, 120), sector: v.sector, stage: v.stage, city: String(v.city).trim().slice(0, 60), revenue: num(v.revenue), raise: num(v.raise) };
          if (!patch.name || !(patch.revenue > 0) || !(patch.raise > 0)) throw new Error("Enter the company name, revenue and raise.");
          return after(await API.act("save_company", { company_id: S.user.company_id, patch }), "Profile saved.");
        }
        default: if (WS.forms[kind]) return await WS.forms[kind](f, v, e);
          break;
        case "review": { const decision = e.submitter && e.submitter.value; return after(await API.act("review_report", { report_id: f.dataset.id, decision, note: v.note })); }
      }
    } catch (err) {
      if (kind === "login") return render({ err: err.message });
      if (kind === "signup") return render({ err: err.message });
      showErr(err.message);
    }
  });

  // Role modules (ws-*.js) load after this file and register pages, click and form handlers here.
  const WS = root.WS = { S, API, PAGES, clicks: {}, forms: {}, render, after, fail, head, shell, esc, statusChip, stamp, companyById, userName, myCompany, latestReport, monitorBlock, readForm, num, roleName, SECTORS };
  window.addEventListener("hashchange", () => render());
  const boot = async () => { try { S.user = await API.me(); } catch (e) { S.user = null; } render(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else setTimeout(boot, 0);
})(typeof globalThis !== "undefined" ? globalThis : this);
```


---

## 5. Role workspaces

One file of screens per role.

### `site/ws-founder.js`

Founder: overview, fundraise, investors, deal room, cap table, data room, loans.

```javascript
/* Founder workspace additions: fundraise tracker, cap table with the planned round, data room, revenue share, loans and monitoring. */
(function (root) {
  "use strict";
  const WS = root.WS, UI = root.UI, DOM = root.DOM, KIT = root.KIT;
  const { esc, gx, pct, chip } = UI;
  const { rs, rsPrice, dmy } = DOM;
  const S = WS.S, API = WS.API;
  const D = () => S.data;
  const today = () => D().today;
  const STAGES = [["applied", "Applied"], ["under_review", "Under review"], ["approved", "Approved"], ["offering", "Offering"], ["funded", "Funded"], ["monitoring", "Monitoring"]];
  const DATAROOM = [["accounts", "Audited accounts, last 3 years", "audited"], ["gst", "GST returns, last 12 months", "gst"], ["cma", "CMA data and projections", "cma"], ["captable", "Cap table", "cap table"], ["board", "Board resolution approving the raise", "board"], ["contracts", "Key customer contracts", "contract"], ["bank", "Bank statements, last 12 months", "bank statement"], ["report", "Debt vs equity report", "debt vs equity"]];

  // ---------- fundraise tracker ----------
  function fundraise() {
    const c = WS.myCompany(), fy = DOM.fy(today()), sec = c.security_type || "equity";
    const O = D().offers.filter((o) => o.fy === fy && o.security_type === sec), offersN = O.length, ext = (((c.external_offers || {})[fy]) || {})[sec] || 0;
    const keen = D().offers.filter((o) => o.response === "interested"), committed = D().offers.filter((o) => o.response === "invested");
    const raised = D().holdings.reduce((a, h) => a + h.cost_paise, 0);
    const ck = c.checklist || {}, pending = DOM.DOC_CHECKLIST.filter(([k]) => !ck[k]);
    const idx = Math.max(0, STAGES.findIndex(([k]) => k === c.pipeline_stage));
    return WS.head("Fundraise tracker", "Where your raise stands. Investors' names appear only after they agree to share them with you.") +
      '<section class="panel"><h2>Stage</h2>' + (c.pipeline_stage === "rejected" ? '<p class="t-bad">Your application was not taken forward. Your advisor will explain why.</p>' : KIT.timeline(STAGES, STAGES[idx][0], { [c.pipeline_stage]: c.stage_since })) + "</section>" +
      '<div class="kpis k4" data-stagger><div class="kpi"><small>Offers sent this year</small><b>' + gx(String(offersN + ext), { title: "Offers counted for FY " + fy, formula: "Investors offered through Aegis Ascend + offers your company made directly. Limit 200 per financial year for each kind of security.", inputs: [["Through Aegis Ascend", String(offersN), "offer log"], ["Made directly", String(ext), "advisor"]] }) + "</b><span>of " + (D().settings || {}).offer_limit + " allowed in FY " + fy + '</span></div>' +
      '<div class="kpi"><small>Interested</small><b>' + keen.length + '</b></div><div class="kpi"><small>Committed</small><b>' + committed.length + '</b></div><div class="kpi"><small>Raised so far</small><b>' + rs(raised, true) + "</b><span>of " + rs(c.raise_paise, true) + "</span></div></div>" +
      '<div class="grid2"><section class="panel"><h2>Investors</h2>' + (keen.length + committed.length ? '<ul class="docs">' + committed.concat(keen).map((o) => "<li><span>" + (o.investor_id ? "<b>" + esc(o.investor_name) + "</b>" : '<span class="muted">' + esc(o.investor_name) + "</span>") + "</span>" + chip(o.response === "invested" ? "ok" : "warn", o.response === "invested" ? "Committed" : "Interested") + "</li>").join("") + "</ul>" : '<p class="muted">No responses yet.</p>') +
      '<p class="small muted">' + O.filter((o) => o.response === "pending").length + " offers awaiting a reply, " + O.filter((o) => o.response === "declined").length + " declined.</p></section>" +
      '<section class="panel"><h2>Documents still pending</h2>' + (pending.length ? '<ul class="checklist2">' + pending.map(([, l]) => "<li>" + esc(l) + "</li>").join("") + '</ul><p class="small muted">Your advisor marks these as each filing is done.</p>' : '<p class="t-good">All filings done.</p>') + "</section></div>";
  }

  // ---------- cap table and the planned round ----------
  function captable() {
    const c = WS.myCompany(), cap = D().cap_table, H = D().holdings.filter((h) => h.shares > 0);
    const rows = cap.map((e) => ({ name: e.holder_name, type: e.holder_type === "founder" ? "Founder" : "Existing shareholder", holders: e.holders || 1, shares: e.shares }))
      .concat(H.map((h) => ({ name: h.investor_name, type: "Platform investor", holders: 1, shares: h.shares })));
    const extra = c.fd_extra_shares || 0, fd = rows.reduce((a, r) => a + r.shares, 0) + extra;
    const rep = WS.latestReport(c.id), eqShare = rep && rep.status === "approved" && rep.summary ? 1 - rep.summary.best_share : 0.5;
    const plan = S.round || { amount: Math.round((c.raise_paise || 0) * eqShare / 100), price: (c.offer_price_paise || 0) / 100 };
    const newShares = plan.price > 0 ? Math.floor(plan.amount / plan.price) : 0, post = fd + newShares;
    const members = rows.reduce((a, r) => a + r.holders, 0);
    return WS.head("Cap table", "Everyone who owns " + esc(c.name) + ", on a fully diluted basis, and what the planned round does to it.") +
      '<section class="panel">' + KIT.table("f-cap", { name: "cap-table", rows, key: (r) => r.name, noSearch: true, pageSize: 50,
        columns: [{ k: "name", label: "Holder", html: (r) => "<b>" + esc(r.name) + "</b>" + (r.holders > 1 ? '<span class="muted small block">' + r.holders + " holders</span>" : "") }, { k: "type", label: "Type" },
          { k: "shares", label: "Shares", num: true, html: (r) => DOM.shares(r.shares) }, { k: "pct", label: "Today", num: true, val: (r) => r.shares / fd, html: (r) => pct(r.shares / fd, 2) },
          { k: "post", label: "After the round", num: true, val: (r) => r.shares / post, html: (r) => pct(r.shares / post, 2) }] }) +
      '<p class="small muted">Fully diluted shares ' + DOM.shares(fd) + " including " + DOM.shares(extra) + " unissued options and convertibles. Members today: " + members + " of the 200 a private company may have.</p></section>" +
      '<section class="panel"><h2>Effect of the planned round</h2><form class="fields f3" data-form="f-round"><label class="fld"><span>Equity to raise</span><span class="in"><input name="amount" inputmode="decimal" value="' + (plan.amount / 1e7).toFixed(2) + '"><em>Rs cr</em></span></label>' +
      '<label class="fld"><span>Price per share</span><span class="in"><input name="price" inputmode="decimal" value="' + plan.price + '"><em>Rs</em></span></label><div class="fld"><span>&nbsp;</span><button class="btn ghost" type="submit">Recalculate</button></div></form>' +
      '<div class="kpis k4"><div class="kpi"><small>New shares</small><b>' + DOM.shares(newShares) + '</b></div><div class="kpi"><small>Post-money fully diluted</small><b>' + DOM.shares(post) + '</b></div><div class="kpi"><small>New investors will own</small><b>' + gx(pct(newShares / (post || 1), 2), { title: "New investors' stake", formula: "New shares / (fully diluted shares today + new shares)\nNew shares = equity raised / price per share", inputs: [["Equity raised", rs(plan.amount * 100), "founder"], ["Price per share", "Rs " + plan.price, "advisor"], ["Fully diluted today", DOM.shares(fd), "cap table"]] }) + "</b></div>" +
      '<div class="kpi"><small>Founders after the round</small><b>' + pct(rows.filter((r) => r.type === "Founder").reduce((a, r) => a + r.shares, 0) / (post || 1), 2) + "</b><span>from " + pct(rows.filter((r) => r.type === "Founder").reduce((a, r) => a + r.shares, 0) / (fd || 1), 2) + "</span></div></div>" +
      '<p class="small muted">Default amount: the equity share of your advisor-approved mix (' + pct(eqShare) + "). The final round size and price are set in the term sheet.</p></section>";
  }

  // ---------- data room ----------
  function dataroom() {
    const c = WS.myCompany(), F = (D().files || []).filter((f) => f.purpose === "dataroom"), docs = c.docs || [];
    const word = (k) => DATAROOM.find((x) => x[0] === k)[2];
    const has = (k) => F.some((f) => f.item === k) || docs.some((d) => d.toLowerCase().includes(word(k)));
    const done = DATAROOM.filter(([k]) => has(k)).length;
    const views = D().offers.flatMap((o) => (o.views || []).map((v) => Object.assign({ who: o.investor_name }, v))).sort((a, b) => (a.at < b.at ? 1 : -1));
    return WS.head("Data room", "Documents investors and lenders review. Upload each item; your advisor shares the room only with investors who have the offer.") +
      '<section class="panel"><div class="panel-head"><h2>Checklist</h2><b>' + done + " of " + DATAROOM.length + '</b></div><div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + DATAROOM.length + '" aria-valuenow="' + done + '"><i style="width:' + done / DATAROOM.length * 100 + '%"></i></div>' +
      '<ul class="checklist2">' + DATAROOM.map(([k, l]) => { const f = F.filter((x) => x.item === k); return '<li class="' + (has(k) ? "done" : "") + '"><span>' + esc(l) + (f.length ? '<span class="muted small block">' + f.map((x) => esc(x.name) + " · " + dmy(x.at.slice(0, 10))).join(", ") + "</span>" : "") + '</span><button class="btn ghost sm" data-act="f-upload" data-id="' + k + '">' + (f.length ? "Replace" : "Upload") + "</button></li>"; }).join("") + "</ul></section>" +
      '<div class="grid2"><section class="panel"><h2>Other documents</h2><ul class="docs">' + docs.map((d, k) => "<li><span>" + esc(d) + '</span><button class="linkbtn small" data-act="doc-remove" data-k="' + k + '">Remove</button></li>').join("") +
      F.filter((f) => !f.item).map((f) => "<li><span>" + esc(f.name) + '</span><button class="linkbtn small" data-act="file" data-id="' + f.id + '">Download</button></li>').join("") + "</ul>" +
      '<form class="row gap-s" data-form="doc-add"><span class="in grow"><input name="doc" id="doc_name" placeholder="Document name, e.g. Board resolution" aria-label="Document name"></span><button class="btn ghost" type="submit">Add</button></form></section>' +
      '<section class="panel"><h2>Who viewed what</h2>' + (views.length ? '<div class="tw"><table class="tbl"><thead><tr><th>Investor</th><th>Document</th><th>When</th></tr></thead><tbody>' + views.map((v) => "<tr><td>" + esc(v.who) + "</td><td>" + esc(v.doc) + "</td><td>" + UI.dt(v.at) + "</td></tr>").join("") + "</tbody></table></div>" : '<p class="muted">No views yet. Views by investors who have not shared their name are not shown.</p>') + "</section></div>";
  }

  // ---------- revenue share ----------
  function revshare() {
    const c = WS.myCompany(), F = (D().invoices || []).filter((f) => f.kind === "revenue_share").sort((a, b) => (a.issued < b.issued ? 1 : -1));
    const paid = F.filter((f) => f.paid_on), due = F.filter((f) => !f.paid_on), sum = (L) => L.reduce((a, f) => a + f.amount_paise + f.gst_paise, 0);
    return WS.head("Revenue share", "0.4% of revenue each quarter for 5 years after the raise, plus 18% GST. Invoiced by Aegis Ascend from your quarterly accounts.") +
      '<div class="kpis k3" data-stagger><div class="kpi"><small>Paid to date</small><b>' + rs(sum(paid), true) + "</b><span>incl. GST, " + paid.length + ' quarters</span></div><div class="kpi"><small>Due</small><b class="' + (due.some((f) => f.due < today()) ? "t-bad" : "") + '">' + rs(sum(due), true) + "</b><span>" + due.length + " invoice" + (due.length === 1 ? "" : "s") + '</span></div><div class="kpi"><small>Quarterly estimate</small><b>' + gx(rs(Math.round(c.revenue * 1e9 / 4 * 0.004), true), { title: "Revenue share for a quarter", formula: "Annual revenue / 4 x 0.4%", inputs: [["Annual revenue", UI.cr(c.revenue, 0), "founder"]], note: "Plus 18% GST." }) + "</b><span>before GST</span></div></div>" +
      '<section class="panel"><h2>Statements</h2>' + KIT.table("f-rs", { name: "revenue-share", rows: F, noSearch: true, empty: { title: "No statements yet", text: "Revenue share starts in the first quarter after your equity raise closes." },
        columns: [{ k: "period", label: "Quarter" }, { k: "amount_paise", label: "Amount", num: true, csv: (f) => f.amount_paise / 100, html: (f) => rs(f.amount_paise) }, { k: "gst_paise", label: "GST", num: true, csv: (f) => f.gst_paise / 100, html: (f) => rs(f.gst_paise) },
          { k: "due", label: "Due", html: (f) => dmy(f.due) }, { k: "paid_on", label: "Status", html: (f) => (f.paid_on ? chip("ok", "Paid " + dmy(f.paid_on)) : chip(f.due < today() ? "bad" : "warn", f.due < today() ? "Overdue" : "Due")) }] }) + "</section>";
  }

  // ---------- loans and monitoring ----------
  function loans() {
    const c = WS.myCompany(), L = D().loans, lenders = (D().directory || []).filter((u) => u.role === "lender");
    return WS.head("Loans & monitoring", "Your loans, applications and quarterly covenant checks. Lenders pay all Aegis Ascend debt fees.") +
      '<section class="panel"><h2>Loans</h2>' + KIT.table("f-loans", { name: "loans", rows: L, noSearch: true, empty: { title: "No loans yet", text: "Apply through Aegis Ascend below." },
        columns: [{ k: "lender", label: "Lender", val: (l) => WS.userName(l.lender_id), html: (l) => esc(WS.userName(l.lender_id)) }, { k: "amount_paise", label: "Amount", num: true, csv: (l) => l.amount_paise / 100, html: (l) => rs(l.amount_paise, true) },
          { k: "rate_bps", label: "Rate", num: true, html: (l) => (l.rate_bps / 100).toFixed(2) + "%" }, { k: "tenor_months", label: "Tenor", html: (l) => l.tenor_months + " months" + (l.moratorium_months ? " · " + l.moratorium_months + " mo moratorium" : "") },
          { k: "out", label: "Outstanding", num: true, val: (l) => DOM.loanSummary(l, today()).principal_pending, html: (l) => (l.status === "disbursed" ? rs(DOM.loanSummary(l, today()).principal_pending, true) : "–") },
          { k: "next", label: "Next EMI", val: (l) => DOM.loanSummary(l, today()).next_due, html: (l) => { const s = DOM.loanSummary(l, today()); return l.status === "disbursed" ? (s.next_due ? dmy(s.next_due) + '<span class="muted small block">' + rs(s.next_amount) + "</span>" : "Repaid") + (s.overdue ? ' <span class="chip bad">' + s.overdue + " overdue</span>" : "") : "–"; } },
          { k: "status", label: "Status", html: (l) => WS.statusChip(l.status) }] }) +
      '<h3>Apply through Aegis Ascend</h3><form class="fields f5" data-form="f-apply"><label class="fld"><span>Lender</span><span class="in"><select name="lender_id" id="al_lender">' + lenders.map((l) => '<option value="' + l.id + '">' + esc(l.firm) + "</option>").join("") + "</select></span></label>" +
      UI_field("amount", "Amount", c.raise, "Rs cr") + UI_field("rate", "Expected rate", 10.5, "%") + UI_field("tenor", "Tenor", 7, "years") + UI_field("moratorium", "Moratorium", 0, "months") + '<button class="btn primary" type="submit">Send application</button></form></section>' +
      '<section class="panel"><div class="panel-head"><h2>Covenant monitoring</h2><button class="btn ghost sm" data-act="f-upload-q">Upload quarterly accounts</button></div>' + WS.monitorBlock(c, false) + "</section>";
  }
  const UI_field = (id, label, val, sfx) => root.PUB.field("al_" + id, label, val, sfx).replace('name="al_' + id + '"', 'name="' + id + '"');

  // ---------- investors (fit-ranked panel) and deal room ----------
  function investors() {
    const c = WS.myCompany(), I = D().intros || [];
    const named = new Map(D().offers.filter((o) => o.investor_id).map((o) => [o.investor_id, o.response]));
    const panel = (D().directory || []).filter((u) => u.role === "investor").map((u) => Object.assign({ fit: root.GB.fitScore(c, u) }, u)).sort((a, b) => b.fit.score - a.fit.score);
    const asks = I.filter((i) => i.status === "requested");
    return WS.head("Investors", "Ranked by Investor Fit Score. Your advisor decides who receives the offer; you decide who enters your deal room.") +
      (asks.length ? '<section class="panel"><h2>Deal-room requests</h2>' + asks.map((i) => '<div class="item"><div><b>' + esc(i.investor_name) + '</b><span class="muted small">asked ' + UI.date(i.created_at) + '</span></div><div class="row gap-s"><button class="btn primary sm" data-act="decide-intro" data-id="' + i.id + '" data-d="grant">Grant access</button><button class="btn ghost sm" data-act="decide-intro" data-id="' + i.id + '" data-d="decline">Decline</button></div></div>').join("") + "</section>" : "") +
      '<div class="cards" data-stagger>' + panel.map((u) => { const i = I.find((x) => x.investor_id === u.id), resp = named.get(u.id);
        return '<article class="card"><div class="card-top"><div><b>' + esc(u.firm || u.name) + '</b><span class="muted small">' + esc(u.name) + '</span></div><div class="score" title="Investor Fit Score">' + u.fit.score + "<small>/100</small></div></div>" +
          '<ul class="reasons">' + u.fit.reasons.map((r) => "<li>" + esc(r) + "</li>").join("") + "</ul>" +
          (i ? "<p>" + WS.statusChip(i.status) + (i.nda_signed_at ? " " + chip("ok", "NDA signed") : "") + "</p>" : resp ? "<p>" + chip(resp === "invested" || resp === "interested" ? "ok" : "warn", resp === "invested" ? "Invested" : resp === "interested" ? "Interested" : "Offer " + resp) + "</p>" : "") +
          (i && i.status === "requested" ? '<div class="row gap-s"><button class="btn primary sm" data-act="decide-intro" data-id="' + i.id + '" data-d="grant">Grant access</button><button class="btn ghost sm" data-act="decide-intro" data-id="' + i.id + '" data-d="decline">Decline</button></div>'
            : !i && !resp ? '<button class="btn ghost sm" data-act="f-suggest" data-id="' + u.id + '">Suggest to my advisor</button>' : "") + "</article>"; }).join("") + "</div>";
  }
  function dealroom() {
    const c = WS.myCompany(), I = D().intros || [];
    const views = I.flatMap((i) => (i.views || []).map((v) => Object.assign({ who: i.investor_name }, v))).sort((a, b) => (a.at < b.at ? 1 : -1));
    return WS.head("Deal room", "Documents investors can open after you grant access and they sign the NDA. Every view is watermarked and logged.") +
      '<div class="grid2"><section class="panel"><h2>Documents</h2><ul class="docs">' + (c.docs || []).map((d, k) => "<li><span>" + esc(d) + '</span><button class="linkbtn small" data-act="doc-remove" data-k="' + k + '">Remove</button></li>').join("") + "</ul>" +
      '<form class="row gap-s" data-form="doc-add"><span class="in grow"><input name="doc" id="doc_name2" placeholder="Document name, e.g. Board resolution" aria-label="Document name"></span><button class="btn ghost" type="submit">Add</button></form>' +
      '<p class="small muted">Upload the files themselves in the <a href="#app-dataroom">data room</a>.</p></section>' +
      '<section class="panel"><h2>Who has access</h2>' + (I.length ? '<ul class="docs">' + I.map((i) => "<li><span>" + esc(i.investor_name) + '</span><span>' + WS.statusChip(i.status) + (i.nda_signed_at ? " " + chip("ok", "NDA " + UI.date(i.nda_signed_at)) : "") + "</span></li>").join("") + "</ul>" : '<p class="muted">No requests yet.</p>') +
      "<h3>Who viewed what</h3>" + (views.length ? '<div class="tw"><table class="tbl"><thead><tr><th>Investor</th><th>Document</th><th>When</th></tr></thead><tbody>' + views.map((v) => "<tr><td>" + esc(v.who) + "</td><td>" + esc(v.doc) + "</td><td>" + UI.dt(v.at) + "</td></tr>").join("") + "</tbody></table></div>" : '<p class="muted">No views yet.</p>') + "</section></div>";
  }

  Object.assign(WS.clicks, {
    "f-suggest": async (b, id) => { if (await KIT.confirm("Suggest this investor to your advisor?", "<p>Your advisor checks the investor's KYC and the offer limits, and decides whether to share the offer.</p>", "Suggest")) return WS.after(await API.act("suggest_investor", { investor_id: id })); },
    "f-upload": async (b, item) => {
      const l = (DATAROOM.find((x) => x[0] === item) || [item, item])[1];
      const v = await KIT.dialog({ title: "Upload: " + l, confirm: "Upload", fields: [{ name: "file", label: "File (PDF, Excel, Word, CSV or image)", type: "file", accept: ".pdf,.xlsx,.xls,.csv,.docx,.png,.jpg,.jpeg" }], validate: (x) => (x.file ? null : "Choose a file") });
      if (!v) return;
      await API.upload(v.file, { company_id: S.user.company_id, purpose: "dataroom", item });
      return WS.after(null, "Uploaded " + v.file.name + ".");
    },
    "f-upload-q": async () => {
      const v = await KIT.dialog({ title: "Upload quarterly accounts", text: "<p>Upload the file for your advisor and lenders, then enter the quarter's figures below so DSCR and covenant headroom are recalculated.</p>", confirm: "Upload", fields: [{ name: "file", label: "Quarterly accounts", type: "file", accept: ".pdf,.xlsx,.xls,.csv" }], validate: (x) => (x.file ? null : "Choose a file") });
      if (!v) return;
      await API.upload(v.file, { company_id: S.user.company_id, purpose: "monitoring" });
      return WS.after(null, "Uploaded " + v.file.name + ". Now add the quarter's figures.");
    },
    file: async (b, id) => {
      if (API.download) { const f = await API.download(id); const a = document.createElement("a"); a.href = f.url; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); return; }
      location.href = "/api/file/" + encodeURIComponent(id);
    },
  });
  Object.assign(WS.forms, {
    "f-round": (f, v) => { const a = WS.num(v.amount), p = WS.num(v.price); if (!(a > 0) || !(p > 0)) throw new Error("Enter the amount and price as positive numbers."); S.round = { amount: a * 1e7, price: p }; return WS.render({ keepScroll: true }); },
    "f-apply": async (f, v) => {
      const amt = WS.num(v.amount), rate = WS.num(v.rate), ten = WS.num(v.tenor), mor = WS.num(v.moratorium || 0);
      if (!(amt > 0 && rate > 0 && ten > 0 && mor >= 0)) throw new Error("Enter the amount, rate, tenor and moratorium as numbers.");
      return WS.after(await API.act("apply_loan", { company_id: S.user.company_id, lender_id: v.lender_id, amount_paise: Math.round(amt * 1e9), rate_bps: Math.round(rate * 100), tenor_months: Math.round(ten * 12), moratorium_months: Math.round(mor) }));
    },
  });
  Object.assign(WS.PAGES.founder, { "app-investors": investors, "app-dealroom": dealroom, "app-fundraise": fundraise, "app-captable": captable, "app-dataroom": dataroom, "app-revshare": revshare, "app-loans": loans });
})(typeof globalThis !== "undefined" ? globalThis : this);
```

### `site/ws-investor.js`

Investor: portfolio, holdings, sell requests, opportunities, deal rooms.

```javascript
/* Investor workspace: portfolio (demat-style), holding detail, sell requests and private offers. */
(function (root) {
  "use strict";
  const WS = root.WS, UI = root.UI, DOM = root.DOM, KIT = root.KIT;
  const { esc, gx, pct, chip, lines, C } = UI;
  const { rs, rsPrice, dmy } = DOM;
  const S = WS.S;
  const my = (s) => DOM.MON[+s.slice(5, 7) - 1] + " '" + s.slice(2, 4);
  const settings = () => S.data.settings || DOM.SETTINGS_DEFAULT;
  const today = () => S.data.today;
  const co = (id) => WS.companyById(id) || { name: id, sector: "" };
  const gainCls = (x) => (x > 0 ? "t-good" : x < 0 ? "t-bad" : "");
  const signed = (p, short) => (p > 0 ? "+" : "") + rs(p, short);
  const signedPct = (x) => (x > 0 ? "+" : "") + pct(x, 2);
  const SELL_STEPS = [["submitted", "Submitted"], ["under_review", "Under review"], ["rofr", "First-refusal window"], ["buyer_introduced", "Buyer introduced"], ["spa_signed", "SPA signed"], ["completed", "Transfer complete"]];
  const OPEN = ["submitted", "under_review", "rofr", "buyer_introduced", "spa_signed"];
  const openSell = (hid) => S.data.sell_requests.find((x) => x.holding_id === hid && OPEN.includes(x.status));

  function views() {
    const st = { companies: S.data.companies, holdings: S.data.holdings, valuations: S.data.valuations };
    return DOM.portfolio(st, S.user.id, today(), settings()).rows.map((v) => Object.assign(v, { h: S.data.holdings.find((h) => h.id === v.id), c: co(v.company_id) }));
  }
  function xirrOf(rows) {
    const flows = rows.map((r) => ({ date: r.h.invested_at || r.h.allotment_date, amount: -r.cost })).concat([{ date: today(), amount: rows.reduce((a, r) => a + r.value, 0) }]).sort((a, b) => (a.date < b.date ? -1 : 1));
    return DOM.xirr(flows);
  }
  function lockBadge(v) {
    if (v.eligible) return chip("ok", v.h.early_consent && today() < v.lock_until ? "Eligible: founder consent" : "Eligible to sell");
    return chip("warn", "Locked until " + dmy(v.lock_until));
  }
  function sellButton(v, cls) {
    const open = openSell(v.id);
    if (open) return '<a class="btn ghost sm ' + (cls || "") + '" href="#app-sells">Request ' + esc(open.status.replace("_", " ")) + "</a>";
    return v.eligible ? '<button class="btn primary sm ' + (cls || "") + '" data-act="inv-sell" data-id="' + v.id + '">Request to sell</button>'
      : '<button class="btn ghost sm ' + (cls || "") + '" disabled title="You can request to sell from ' + dmy(v.lock_until) + '">Request to sell</button>';
  }
  const valueInfo = (v) => ({ title: "Current value of your " + v.c.name + " shares", formula: "Shares held x latest price per share", inputs: [["Shares", DOM.shares(v.shares), "allotment"], ["Price per share", rsPrice(v.price), "registered valuer"], ["Valuation date", dmy(v.valuation_date), "advisor"]] });

  // ---------- portfolio ----------
  function portfolio() {
    const rows = views(), inv = rows.reduce((a, r) => a + r.cost, 0), val = rows.reduce((a, r) => a + r.value, 0), g = val - inv, x = rows.length ? xirrOf(rows) : null;
    const curve = valueCurve(rows);
    return WS.head("Portfolio", esc(S.user.firm || "") + " · shares held directly in your name, valued at the latest registered valuation") +
      '<div class="kpis k5" data-stagger>' +
      '<div class="kpi"><small>Total invested</small><b>' + gx(rs(inv, true), { title: "Total invested", formula: "Sum of the amount paid for every holding", inputs: rows.map((r) => [r.c.name, rs(r.cost), "allotment"]) }) + "</b></div>" +
      '<div class="kpi"><small>Current value</small><b>' + KIT.figure("inv-val", val, (y) => rs(y, true)) + "</b><span>at latest valuations</span></div>" +
      '<div class="kpi"><small>Gain or loss</small><b class="' + gainCls(g) + '">' + KIT.figure("inv-gain", g, (y) => signed(y, true)) + '</b><span class="' + gainCls(g) + '">' + signedPct(inv ? g / inv : 0) + "</span></div>" +
      '<div class="kpi"><small>Companies held</small><b>' + KIT.figure("inv-n", rows.length, (y) => String(Math.round(y))) + "</b></div>" +
      '<div class="kpi"><small>XIRR</small><b class="' + gainCls(x || 0) + '">' + (x == null ? "–" : gx(signedPct(x), { title: "XIRR (annualised return)", formula: "The yearly rate r that makes the present value of every cash flow zero:\nsum of amount / (1 + r)^(days since first investment / 365) = 0\nInvestments are outflows; today's value is the final inflow.", inputs: rows.map((r) => ["Invested in " + r.c.name + " on " + dmy(r.h.invested_at), rs(-r.cost), "allotment"]).concat([["Value today", rs(val), "latest valuations"]]) })) + "</b><span>annualised</span></div></div>" +
      '<section class="panel"><div class="panel-head"><h2>Holdings</h2><span class="muted small">Ownership is shares / fully diluted shares. Click a company for its valuations, documents and tax view.</span></div>' +
      KIT.table("inv-holdings", {
        name: "holdings", rows, pageSize: 20, noSearch: rows.length < 6,
        empty: { title: "No holdings yet", text: "Private offers from your advisor appear under Opportunities.", action: '<a class="btn primary" href="#app-opportunities">See opportunities</a>' },
        columns: [
          { k: "company", label: "Company", val: (r) => r.c.name, html: (r) => '<a href="#app-holding/' + r.id + '"><b>' + esc(r.c.name) + '</b></a><span class="muted small block">' + esc(r.c.sector) + "</span>" },
          { k: "invested_at", label: "Invested", val: (r) => r.h.invested_at, html: (r) => dmy(r.h.invested_at) },
          { k: "allotment", label: "Allotted", val: (r) => r.h.allotment_date, html: (r) => dmy(r.h.allotment_date) },
          { k: "shares", label: "Shares", num: true, val: (r) => r.shares, html: (r) => DOM.shares(r.shares) },
          { k: "own", label: "Ownership", num: true, val: (r) => r.ownership, html: (r) => gx(pct(r.ownership, 2), { title: "Ownership", formula: "Shares held / total fully diluted shares", inputs: [["Shares held", DOM.shares(r.shares), "allotment"], ["Fully diluted shares", DOM.shares(r.c.fd_shares), "cap table"]] }) },
          { k: "cost", label: "Invested", num: true, val: (r) => r.cost, csv: (r) => r.cost / 100, html: (r) => rs(r.cost, true) },
          { k: "avg", label: "Avg cost / share", num: true, val: (r) => r.avg_cost, csv: (r) => r.avg_cost / 100, html: (r) => rsPrice(Math.round(r.avg_cost)) },
          { k: "price", label: "Latest price", num: true, val: (r) => r.price, csv: (r) => r.price / 100, html: (r) => rsPrice(r.price) + '<span class="muted small block">' + dmy(r.valuation_date) + "</span>" },
          { k: "value", label: "Current value", num: true, val: (r) => r.value, csv: (r) => r.value / 100, html: (r) => gx(rs(r.value, true), valueInfo(r)) },
          { k: "gain", label: "Gain / loss", num: true, val: (r) => r.gain, csv: (r) => r.gain / 100, html: (r) => '<span class="' + gainCls(r.gain) + '">' + signed(r.gain, true) + '<span class="small block">' + signedPct(r.gain_pct) + "</span></span>" },
          { k: "status", label: "Status", val: (r) => (r.eligible ? "Eligible" : "Locked " + r.lock_until), html: lockBadge },
          { k: "act", label: "Action", sort: false, export: false, html: (r) => sellButton(r) },
        ],
      }) + "</section>" +
      (curve.labels.length > 1 ? '<section class="panel"><h2>Portfolio value at each valuation</h2>' + lines(curve.labels, [{ name: "Value", color: C.mix, values: curve.values, endLabel: false }, { name: "Invested", color: C.equity, values: curve.cost, dash: true, endLabel: false }], { yfmt: (y) => "Rs " + UI.n(y, 1) + " Cr", label: "Portfolio value by valuation date", height: 220 }) + "</section>" : "");
  }
  function valueCurve(rows) {
    const dates = [...new Set(S.data.valuations.filter((v) => rows.some((r) => r.company_id === v.company_id)).map((v) => v.date))].sort();
    const at = (d) => rows.filter((r) => r.h.allotment_date <= d).reduce((a, r) => { const v = DOM.latestValuation(S.data, r.company_id, d); return a + (v ? r.shares * v.price_per_share_paise : r.cost); }, 0);
    const cost = (d) => rows.filter((r) => r.h.allotment_date <= d).reduce((a, r) => a + r.cost, 0);
    return { labels: dates.map((d) => my(d)), values: dates.map((d) => at(d) / 1e9), cost: dates.map((d) => cost(d) / 1e9) };
  }

  // ---------- holding detail ----------
  const DOCS = ["Share Subscription Agreement (SSA)", "Shareholders' Agreement (SHA)", "Allotment letter", "PAS-4 private placement offer letter"];
  function holding(id) {
    const v = views().find((x) => x.id === id);
    if (!v) return WS.head("Holding not found", '<a href="#app">Back to the portfolio</a>');
    const c = v.c, vals = S.data.valuations.filter((x) => x.company_id === c.id).sort((a, b) => (a.date < b.date ? -1 : 1));
    const own = vals.filter((x) => x.date >= v.h.allotment_date || x === vals[0]);
    const tax = DOM.capitalGainsEstimate(v.h, v, today()), open = openSell(v.id);
    const files = S.data.files || [];
    return WS.head(c.name, esc(c.sector) + " · " + esc(c.city || "") + ' · <a href="#app">Back to the portfolio</a>', sellButton(v)) +
      '<div class="kpis k4" data-stagger><div class="kpi"><small>Shares</small><b>' + DOM.shares(v.shares) + "</b><span>" + pct(v.ownership, 2) + ' of the company</span></div><div class="kpi"><small>Current value</small><b>' + gx(rs(v.value, true), valueInfo(v)) + "</b><span>" + rsPrice(v.price) + " a share</span></div>" +
      '<div class="kpi"><small>Gain or loss</small><b class="' + gainCls(v.gain) + '">' + signed(v.gain, true) + '</b><span class="' + gainCls(v.gain) + '">' + signedPct(v.gain_pct) + '</span></div><div class="kpi"><small>Holding status</small><b>' + lockBadge(v) + "</b><span>Allotted " + dmy(v.h.allotment_date) + "</span></div></div>" +
      (open ? '<section class="panel"><h2>Your sell request</h2>' + sellTimeline(open) + "</section>" : "") +
      '<div class="grid2"><section class="panel"><h2>Valuation history</h2>' + lines(vals.map((x) => my(x.date)), [{ name: "Price per share", color: C.mix, values: vals.map((x) => x.price_per_share_paise / 100), endLabel: false }], { yfmt: (y) => "Rs " + UI.n(y, 0), label: "Price per share at each quarterly valuation", height: 200 }) + "</section>" +
      '<section class="panel"><h2>Your value over time</h2>' + lines(own.map((x) => my(x.date)), [{ name: "Your value", color: C.mix, values: own.map((x) => v.shares * x.price_per_share_paise / 1e7), endLabel: false }, { name: "Invested", color: C.equity, values: own.map(() => v.cost / 1e7), dash: true, endLabel: false }], { yfmt: (y) => "Rs " + UI.n(y, 1) + " L", label: "Value of your shares", height: 200 }) + "</section></div>" +
      '<section class="panel"><h2>Valuations</h2><div class="tw"><table class="tbl"><thead><tr><th>Date</th><th>Method</th><th>Registered valuer</th><th class="num">Price per share</th><th>Report</th></tr></thead><tbody>' +
      vals.slice().reverse().map((x) => { const f = x.report_file && files.find((y) => y.id === x.report_file); return "<tr><td>" + dmy(x.date) + "</td><td>" + esc(x.method) + "</td><td>" + esc(x.valuer) + '</td><td class="num">' + rsPrice(x.price_per_share_paise) + "</td><td>" + (f ? '<button class="linkbtn" data-act="file" data-id="' + f.id + '">Download</button>' : '<span class="muted small">Held by Aegis Ascend</span>') + "</td></tr>"; }).join("") + "</tbody></table></div></section>" +
      '<div class="grid2"><section class="panel"><h2>Tax view if sold today <span class="chip warn">Estimate</span></h2>' +
      '<p>Held <b>' + Math.floor(tax.months) + " months</b> since allotment: " + (tax.long_term ? "<b>long-term</b> capital gain (24 months or more)." : "<b>short-term</b> capital gain (under 24 months).") + "</p>" +
      '<p>Gain at today\'s valuation: <b class="' + gainCls(tax.gain) + '">' + signed(tax.gain) + "</b>.</p>" +
      (tax.long_term ? "<p>Estimated tax at 12.5%: <b>" + gx(rs(tax.tax), { title: "Estimated long-term capital gains tax", formula: "max(gain, 0) x 12.5%", inputs: [["Gain", rs(tax.gain), "valuation"], ["Rate", "12.5%", "Income-tax Act, unlisted shares"]], note: "Before any indexation, exemptions or surcharge. Confirm with your tax adviser." }) + "</b>.</p>" : "<p>Short-term gains on unlisted shares are added to your income and taxed at your slab rate.</p>") +
      '<p class="small muted">An estimate for planning only, using the latest valuation as the sale price. It is not tax advice.</p></section>' +
      '<section class="panel"><h2>Documents</h2><ul class="docs">' + DOCS.map((d) => "<li><span>" + esc(d) + '</span><button class="btn ghost sm" data-act="inv-doc" data-id="' + v.id + '" data-doc="' + esc(d) + '">Download</button></li>').join("") + "</ul>" +
      '<p class="small muted">Signed originals are held by Aegis Ascend; the download is a summary of the key terms.</p></section></div>' +
      '<section class="panel"><h2>Company updates</h2>' + ((c.updates || []).length ? '<ul class="updates">' + c.updates.map((u) => "<li><span class=\"muted small\">" + dmy(u.date) + "</span><p>" + esc(u.text) + "</p></li>").join("") + "</ul>" : '<p class="muted">No updates yet.</p>') + "</section>";
  }

  // ---------- sell requests ----------
  function sellTimeline(x) {
    const at = {}; (x.history || []).forEach((h) => (at[h.status] = h.at));
    const stop = x.status === "withdrawn" ? { label: "Withdrawn" } : x.status === "rejected" ? { label: "Rejected", reason: x.reason } : null;
    const cur = stop ? (x.history.slice().reverse().find((h) => !["withdrawn", "rejected"].includes(h.status)) || { status: "submitted" }).status : x.status;
    return KIT.timeline(SELL_STEPS, cur, at, stop) +
      '<p class="small muted">' + (x.full ? "Full stake" : "Part sale") + ": " + DOM.shares(x.shares) + " shares" + (x.indicative_price_paise ? " · your indicative price " + rsPrice(x.indicative_price_paise) + " (seen only by the advisor)" : "") +
      (x.status === "rofr" ? " · first-refusal window until " + dmy(x.rofr_until) : "") + (x.price_paise ? " · agreed price " + rsPrice(x.price_paise) : "") + "</p>" +
      (["submitted", "under_review", "rofr"].includes(x.status) ? '<button class="btn ghost sm" data-act="inv-withdraw" data-id="' + x.id + '">Withdraw request</button>' : "");
  }
  function sells() {
    const L = S.data.sell_requests.slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return WS.head("Sell requests & exits", "Exit after the 6-month minimum holding, or earlier with the founder's written consent. Resales are private: your advisor introduces buyers one to one.") +
      (L.length ? L.map((x) => '<section class="panel"><div class="panel-head"><h2>' + esc(co(x.company_id).name) + "</h2>" + chip(x.status === "completed" ? "ok" : x.status === "rejected" || x.status === "withdrawn" ? "bad" : "warn", x.status.replace("_", " ")) + "</div>" + sellTimeline(x) + "</section>").join("")
        : '<section class="panel">' + KIT.empty("No sell requests", "Holdings become eligible 6 months after allotment. Request a sale from the portfolio.", '<a class="btn primary" href="#app">Go to the portfolio</a>') + "</section>") +
      '<section class="panel"><h2>Exit tax view</h2><p class="small muted">Try a sale price before you ask to sell. An estimate, not tax advice.</p><form class="calc" data-calc="exit"><div class="fields f5">' + root.PUB.field("cost", "Amount invested", 1, "Rs cr") + root.PUB.field("sale", "Sale price", 1.4, "Rs cr") + root.PUB.field("months", "Months held", 14, "months") + root.PUB.field("slab", "Your slab rate", 30, "%") + root.PUB.field("fmv", "Fair market value", 1.4, "Rs cr") + '</div></form><div id="calc-exit">' + root.PUB.exitCalc({}) + "</div></section>";
  }

  // ---------- curated deals and deal rooms ----------
  function deals() {
    const offered = new Set(S.data.offers.filter((o) => o.response !== "declined").map((o) => o.company_id));
    const L = S.data.companies.filter((c) => offered.has(c.id)).map((c) => Object.assign({ fit: root.GB.fitScore(Object.assign({}, c, { raise: (c.raise_paise || 0) / 1e9 }), S.user) }, c)).sort((a, b) => b.fit.score - a.fit.score);
    return WS.head("Curated deals", "Companies that passed validation, the engine and an advisor's sign-off, and that your advisor has offered to you.") +
      (L.length ? '<div class="cards" data-stagger>' + L.map((c) => { const i = (S.data.intros || []).find((x) => x.company_id === c.id), r = c.report, sm = (r && r.summary) || {};
        return '<article class="card"><div class="card-top"><div><b>' + esc(c.name) + '</b><span class="muted small">' + esc(c.sector) + " · " + esc(c.stage) + " · " + esc(c.city || "") + '</span></div><div class="score" title="Investor Fit Score">' + c.fit.score + "<small>/100</small></div></div>" +
          "<p>Raising <b>" + rs(c.raise_paise, true) + "</b> · revenue " + UI.cr(c.revenue, 0) + "</p>" + (r ? '<p class="small">Engine view: best mix ' + pct(sm.best_share) + " debt · lowest DSCR " + UI.xx(sm.min_dscr) + " (stress " + UI.xx(sm.min_dscr_stress) + ")</p>" : "") +
          (r && r.reviewed_by ? '<span class="stamp">Reviewed by ' + esc(WS.userName(r.reviewed_by)) + "</span>" : "") +
          '<ul class="reasons">' + c.fit.reasons.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul>" +
          (i ? "<p>" + WS.statusChip(i.status) + (i.status === "granted" ? ' <a href="#app-rooms">Open deal room</a>' : "") + "</p>" : '<button class="btn primary sm" data-act="inv-intro" data-id="' + c.id + '">Request deal-room access</button>') + "</article>"; }).join("") + "</div>"
        : '<section class="panel">' + KIT.empty("No deals yet", "Deals your advisor offers to you appear here with their fit score.", '<a class="btn ghost" href="#app-opportunities">See opportunities</a>') + "</section>");
  }
  function rooms() {
    const mine = (S.data.intros || []).filter((i) => i.status === "granted");
    return WS.head("Deal rooms", "Sign the NDA to open documents. Each document is watermarked with your name and every view is logged for the founder.") +
      (mine.length ? mine.map((i) => { const c = co(i.company_id), r = c.report, sm = (r && r.summary) || {};
        return '<section class="panel"><h2>' + esc(c.name) + "</h2>" + (!i.nda_signed_at ? '<div class="nda"><p>By signing you agree to keep all information about ' + esc(c.name) + " confidential, use it only to evaluate this investment, and not to contact the company's customers, lenders or staff without permission.</p><label class=\"chk\"><input type=\"checkbox\" id=\"nda_" + i.id + '"> I agree to the NDA</label> <button class="btn primary sm" data-act="inv-nda" data-id="' + i.id + '">Sign NDA</button></div>'
          : "<p>" + chip("ok", "NDA signed " + UI.date(i.nda_signed_at)) + "</p>" + (r ? '<div class="kpis k4"><div class="kpi"><small>Best mix</small><b>' + pct(sm.best_share) + ' debt</b></div><div class="kpi"><small>Net effect vs equity</small><b>' + UI.cr(sm.net) + '</b></div><div class="kpi"><small>Break-even value</small><b>' + UI.cr(sm.break_even, 0) + '</b></div><div class="kpi"><small>Lowest DSCR</small><b>' + UI.xx(sm.min_dscr) + "</b><span>stress " + UI.xx(sm.min_dscr_stress) + "</span></div></div>" : "") +
            '<h3>Documents</h3><ul class="docs">' + (c.docs || []).map((d) => "<li><span>" + esc(d) + '</span><button class="btn ghost sm" data-act="inv-room-doc" data-id="' + i.id + '" data-doc="' + esc(d) + '">Open</button></li>').join("") + "</ul>") + "</section>"; }).join("")
        : '<section class="panel">' + KIT.empty("No open deal rooms", "Request access from Curated deals. The founder decides who gets in.", '<a class="btn primary" href="#app-deals">See curated deals</a>') + "</section>");
  }

  // ---------- opportunities ----------
  function opportunities() {
    const O = S.data.offers.filter((o) => o.response !== "invested").sort((a, b) => (a.sent_at < b.sent_at ? 1 : -1));
    return WS.head("Opportunities", "Private offers your advisor has shared with you alone.") +
      '<div class="notice private" role="note"><b>Private offer.</b> Each offer is made to you personally under a private placement. Do not forward it or share its documents.</div>' +
      (O.length ? '<div class="offer-list" data-stagger>' + O.map(offerCard).join("") + "</div>" : '<section class="panel">' + KIT.empty("No offers right now", "When your advisor shares a company that fits your mandate, it appears here.") + "</section>");
  }
  function offerCard(o) {
    const c = co(o.company_id), r = c.report, s = (r && r.summary) || {};
    return '<article class="panel offer"><div class="panel-head"><div><h2>' + esc(c.name) + '</h2><p class="muted">' + esc(c.sector) + " · " + esc(c.city || "") + " · " + esc(o.security_type) + " · offered " + dmy(o.sent_at.slice(0, 10)) + "</p></div>" +
      chip(o.response === "interested" ? "ok" : o.response === "declined" ? "bad" : "warn", o.response === "pending" ? "Awaiting your reply" : o.response === "interested" ? "Interest expressed" : "Declined") + "</div>" +
      '<div class="kpis k4"><div class="kpi"><small>Raising</small><b>' + rs(c.raise_paise, true) + '</b></div><div class="kpi"><small>Offer price</small><b>' + (c.offer_price_paise ? rsPrice(c.offer_price_paise) : "–") + "</b><span>a share</span></div>" +
      '<div class="kpi"><small>Engine best mix</small><b>' + pct(s.best_share) + ' debt</b></div><div class="kpi"><small>Lowest DSCR</small><b>' + UI.xx(s.min_dscr) + "</b><span>stress " + UI.xx(s.min_dscr_stress) + "</span></div></div>" +
      (r ? '<p><span class="stamp">Reviewed by ' + esc(WS.userName(r.reviewed_by)) + " · " + UI.date(r.reviewed_at) + "</span> " + (r.review_note ? '<span class="muted">"' + esc(r.review_note) + '"</span>' : "") + "</p>" : "") +
      '<div class="row gap-s wrap"><button class="btn ghost sm" data-act="inv-report" data-id="' + o.id + '">Read the advisor-reviewed report</button>' +
      (o.response === "pending" || o.response === "declined" ? '<button class="btn primary sm" data-act="inv-interest" data-id="' + o.id + '">Express interest</button>' : "") +
      (o.response === "pending" || o.response === "interested" ? '<button class="btn ghost sm" data-act="inv-decline" data-id="' + o.id + '">Decline</button>' : "") + "</div></article>";
  }

  // ---------- actions ----------
  Object.assign(WS.clicks, {
    "inv-intro": async (b, id) => WS.after(await WS.API.act("request_intro", { company_id: id }), "Request sent. The founder decides who enters the deal room."),
    "inv-nda": async (b, id) => { const box = document.getElementById("nda_" + id); if (!box || !box.checked) throw new Error("Tick the box to agree to the NDA first."); return WS.after(await WS.API.act("sign_nda", { intro_id: id }), "NDA signed. The deal room is open."); },
    "inv-room-doc": async (b, id) => WS.after(await WS.API.act("view_room_doc", { intro_id: id, doc: b.dataset.doc }), "Opened \"" + b.dataset.doc + "\", watermarked with your name. The view is logged for the founder."),
    "inv-sell": async (b, id) => {
      const v = views().find((x) => x.id === id);
      const vals = await KIT.dialog({ title: "Request to sell: " + v.c.name, confirm: "Send request",
        text: "<p>You hold <b>" + DOM.shares(v.shares) + "</b> shares. Selling the full stake is simplest: a part sale to a new buyer adds a shareholder, which the company's 200-member limit may not allow.</p><p class=\"small muted\">Your advisor runs the first-refusal window and introduces buyers one to one. Nothing is listed publicly.</p>",
        fields: [{ name: "kind", label: "What to sell", type: "select", value: "full", options: [["full", "Full stake (" + DOM.shares(v.shares) + " shares)"], ["part", "Part of my shares"]] },
          { name: "shares", label: "Shares to sell (part sale only)", type: "number", min: 1, max: v.shares, step: 1 },
          { name: "price", label: "Indicative price per share (optional, seen only by your advisor)", type: "number", min: 0, step: "0.01", unit: "Rs" },
          { name: "note", label: "Note for your advisor (optional)", type: "textarea" }],
        validate: (x) => (x.kind === "part" && !(+x.shares > 0 && +x.shares < v.shares) ? "Enter between 1 and " + (v.shares - 1) + " shares for a part sale" : x.price && !(+x.price > 0) ? "The indicative price must be positive" : null) });
      if (!vals) return;
      if (!(await KIT.confirm("Confirm your sell request", "<p>" + (vals.kind === "full" ? "Full stake: " + DOM.shares(v.shares) : DOM.shares(+vals.shares)) + " shares of " + esc(v.c.name) + (vals.price ? " at an indicative " + rsPrice(Math.round(+vals.price * 100)) + " a share" : "") + ".</p>", "Confirm and send"))) return;
      return WS.after(await WS.API.act("request_sell", { holding_id: id, shares: vals.kind === "full" ? null : +vals.shares, indicative_price_paise: vals.price ? Math.round(+vals.price * 100) : null, note: vals.note }), "Sell request sent. Track it under Sell requests.");
    },
    "inv-withdraw": async (b, id) => { if (await KIT.confirm("Withdraw this sell request?", "<p>Your advisor will stop looking for a buyer.</p>", "Withdraw", true)) return WS.after(await WS.API.act("withdraw_sell", { request_id: id })); },
    "inv-interest": async (b, id) => {
      const c = co(S.data.offers.find((o) => o.id === id).company_id);
      const v = await KIT.dialog({ title: "Express interest in " + c.name, confirm: "Express interest", text: "<p>Your advisor will contact you about ticket size and documents. Nothing is binding until you sign the SSA and SHA.</p>",
        fields: [{ name: "share", label: "Share my name with the founder", type: "checkbox", value: true, hint: "Founders see interested investors' names only with consent." }] });
      if (v) return WS.after(await WS.API.act("respond_offer", { offer_id: id, response: "interested", share_identity: v.share }), "Interest sent to your advisor.");
    },
    "inv-decline": async (b, id) => { if (await KIT.confirm("Decline this offer?", "<p>Your advisor will be told. You can change your mind while the offer is open.</p>", "Decline offer", true)) return WS.after(await WS.API.act("respond_offer", { offer_id: id, response: "declined" })); },
    "inv-report": async (b, id) => {
      const o = S.data.offers.find((x) => x.id === id), c = co(o.company_id), r = c.report || {}, s = r.summary || {};
      await WS.API.act("view_doc", { offer_id: id, doc: "Advisor-reviewed report" });
      await KIT.dialog({ title: r.title || "Advisor-reviewed report", confirm: "Close", cancel: "Back",
        text: "<p class=\"small muted\">Watermarked: " + esc(S.user.name) + " · " + dmy(today()) + ". Private, do not forward.</p><ul class=\"ticks\"><li>Best mix: " + pct(s.best_share) + " debt, " + pct(1 - s.best_share) + " equity</li><li>Founder better off than all-equity by " + UI.cr(s.net) + " (today's money)</li><li>Debt wins above a company value of " + UI.cr(s.break_even, 0) + "</li><li>Lowest DSCR " + UI.xx(s.min_dscr) + ", stress case " + UI.xx(s.min_dscr_stress) + "</li></ul>" +
          (r.review_note ? "<p>Advisor's note: \"" + esc(r.review_note) + "\"</p>" : "") + "<p class=\"small muted\">Every number comes from the calculation engine and was checked by the advisor before sign-off.</p>" });
      return WS.render({ reload: true, keepScroll: true });
    },
    "inv-doc": (b, id) => {
      const v = views().find((x) => x.id === id), d = b.dataset.doc;
      const text = d + "\n\nSummary prepared by Aegis Ascend Financial Advisors (demo data, fictional)\n\nInvestor: " + S.user.name + (S.user.firm ? " (" + S.user.firm + ")" : "") + "\nCompany: " + v.c.name +
        "\nShares: " + DOM.shares(v.shares) + "\nAmount paid: " + rs(v.cost) + "\nAllotment date: " + dmy(v.h.allotment_date) + "\nMinimum holding: 6 months, until " + dmy(v.lock_until) + "\n\nThe signed original is held by Aegis Ascend.";
      KIT.save(d.replace(/[^\w]+/g, "-").toLowerCase() + "-" + v.c.name.split(" ")[0].toLowerCase() + ".txt", new Blob([text], { type: "text/plain" }));
    },
  });

  Object.assign(WS.PAGES.investor, { "app-deals": deals, "app-rooms": rooms, app: portfolio, "app-holding": holding, "app-sells": sells, "app-opportunities": opportunities });
})(typeof globalThis !== "undefined" ? globalThis : this);
```

### `site/ws-lender.js`

Lender: loan book, schedules, applications, monitoring, transfers, fees.

```javascript
/* Lender workspace: loan book, loan detail with the repayment schedule, applications, monitoring and loan transfers. */
(function (root) {
  "use strict";
  const WS = root.WS, UI = root.UI, DOM = root.DOM, KIT = root.KIT, GB = root.GB;
  const { esc, gx, pct, chip, lines, vbars, C } = UI;
  const { rs, dmy } = DOM;
  const S = WS.S;
  const today = () => S.data.today;
  const co = (id) => WS.companyById(id) || { name: id, quarters: [] };
  const my = (s) => DOM.MON[+s.slice(5, 7) - 1] + " '" + s.slice(2, 4);
  const LT_STEPS = [["submitted", "Requested"], ["eligibility", "Eligibility checked"], ["consent", "Borrower consent"], ["buyer_introduced", "Buyer lender introduced"], ["deed_signed", "Assignment deed signed"], ["charge_updated", "Charge updated with ROC"], ["completed", "Transfer complete"]];

  /** Latest quarterly DSCR and its band: green >= 1.5, amber 1.25 to 1.5, red below 1.25. */
  function dscr(c) {
    const m = GB.monitor(c.quarters || [], c.covenants), last = m[m.length - 1];
    if (!last) return { v: null, html: '<span class="muted small">No quarters yet</span>' };
    const band = last.dscr >= 1.5 ? "ok" : last.dscr >= 1.25 ? "warn" : "bad";
    return { v: last.dscr, band, q: last.q, html: chip(band, UI.xx(last.dscr)) + '<span class="muted small block">' + esc(last.q) + "</span>" };
  }
  function rowsOf(L) { return L.map((l) => Object.assign({ l, c: co(l.company_id), s: DOM.loanSummary(l, today()) }, {})); }
  const tenorTxt = (l) => Math.round(l.tenor_months / 12 * 10) / 10 + " yrs" + (l.moratorium_months ? " · " + l.moratorium_months + " mo moratorium" : "");
  const rate = (l) => (l.rate_bps / 100).toFixed(2) + "%";

  function earnings(loans) {
    const t = today(), months = [];
    for (let k = -12; k < 12; k++) months.push(DOM.addMonths(t.slice(0, 8) + "01", k).slice(0, 7));
    const earned = {}, planned = {};
    for (const l of loans) for (const r of DOM.schedule(l, t)) { const m = r.due.slice(0, 7); if (r.status === "paid") earned[m] = (earned[m] || 0) + r.interest; else planned[m] = (planned[m] || 0) + r.interest; }
    const cur = t.slice(0, 7);
    return { cats: months.map((m) => my(m + "-01")), vals: months.map((m) => ((m < cur ? earned[m] || 0 : (earned[m] || 0) + (planned[m] || 0)) / 1e7)), colors: months.map((m) => (m < cur ? C.debt : "color-mix(in srgb, var(--s-debt) 42%, transparent)")) };
  }

  // ---------- loan book ----------
  function book() {
    const L = S.data.loans.filter((l) => l.status === "disbursed"), R = rowsOf(L);
    const sum = (k) => R.reduce((a, r) => a + (r.s[k] || 0), 0);
    const next = R.filter((r) => r.s.next_due).sort((a, b) => (a.s.next_due < b.s.next_due ? -1 : 1))[0];
    const e = earnings(L), overdue = R.filter((r) => r.s.overdue);
    return WS.head("Loan book", esc(S.user.firm || "") + " · every figure is worked out from each loan's repayment schedule") +
      (overdue.length ? '<div class="notice bad" role="status">' + overdue.length + " loan" + (overdue.length === 1 ? " has" : "s have") + " an overdue instalment: " + overdue.map((r) => '<a href="#app-loan/' + r.l.id + '">' + esc(r.c.name) + "</a>").join(", ") + ".</div>" : "") +
      '<div class="kpis k6" data-stagger>' +
      '<div class="kpi"><small>Total lent</small><b>' + KIT.figure("l-lent", sum("disbursed"), (y) => rs(y, true)) + "</b></div>" +
      '<div class="kpi"><small>Principal outstanding</small><b>' + gx(rs(sum("principal_pending"), true), { title: "Principal outstanding", formula: "Sum over loans of (amount disbursed - principal in instalments received)", inputs: R.map((r) => [r.c.name, rs(r.s.principal_pending), "schedule"]) }) + "</b></div>" +
      '<div class="kpi"><small>Interest earned to date</small><b class="t-good">' + KIT.figure("l-int", sum("interest_earned"), (y) => rs(y, true)) + "</b></div>" +
      '<div class="kpi"><small>Interest due this month</small><b>' + rs(sum("interest_this_month"), true) + "</b></div>" +
      '<div class="kpi"><small>Next repayment</small><b>' + (next ? rs(next.s.next_amount, true) : "–") + "</b><span>" + (next ? dmy(next.s.next_due) + " · " + esc(next.c.name.split(" ")[0]) : "") + "</span></div>" +
      '<div class="kpi"><small>Active loans</small><b>' + KIT.figure("l-n", L.length, (y) => String(Math.round(y))) + "</b></div></div>" +
      '<section class="panel"><div class="panel-head"><h2>Loans</h2><span class="muted small">DSCR from the latest quarterly accounts: green 1.5x or more, amber 1.25x to 1.5x, red below 1.25x.</span></div>' +
      KIT.table("l-book", { name: "loan-book", rows: R, key: (r) => r.l.id, empty: { title: "No active loans", text: "Disbursed loans appear here with their schedules." },
        filters: [{ k: "band", label: "DSCR", options: [["ok", "Green"], ["warn", "Amber"], ["bad", "Red"]], match: (r, v) => dscr(r.c).band === v }],
        columns: [
          { k: "co", label: "Borrower", val: (r) => r.c.name, html: (r) => '<a href="#app-loan/' + r.l.id + '"><b>' + esc(r.c.name) + "</b></a>" + (r.s.overdue ? ' <span class="chip bad">Overdue</span>' : "") },
          { k: "dates", label: "Sanctioned / disbursed", val: (r) => r.l.disbursal_date, html: (r) => dmy(r.l.sanction_date) + '<span class="muted small block">' + dmy(r.l.disbursal_date) + "</span>" },
          { k: "amt", label: "Disbursed", num: true, val: (r) => r.s.disbursed, csv: (r) => r.s.disbursed / 100, html: (r) => rs(r.s.disbursed, true) },
          { k: "rate", label: "Rate", num: true, val: (r) => r.l.rate_bps, html: (r) => rate(r.l) },
          { k: "tenor", label: "Tenor", val: (r) => r.l.tenor_months, html: (r) => tenorTxt(r.l) },
          { k: "repaid", label: "Principal repaid", num: true, val: (r) => r.s.principal_repaid, csv: (r) => r.s.principal_repaid / 100, html: (r) => rs(r.s.principal_repaid, true) },
          { k: "pending", label: "Principal pending", num: true, val: (r) => r.s.principal_pending, csv: (r) => r.s.principal_pending / 100, html: (r) => rs(r.s.principal_pending, true) },
          { k: "int", label: "Interest earned", num: true, val: (r) => r.s.interest_earned, csv: (r) => r.s.interest_earned / 100, html: (r) => rs(r.s.interest_earned, true) },
          { k: "mint", label: "Monthly interest", num: true, val: (r) => r.s.monthly_interest, csv: (r) => r.s.monthly_interest / 100, html: (r) => rs(r.s.monthly_interest, true) },
          { k: "next", label: "Next instalment", val: (r) => r.s.next_due, html: (r) => (r.s.next_due ? dmy(r.s.next_due) + '<span class="muted small block">' + rs(r.s.next_amount, true) + "</span>" : "Repaid") },
          { k: "dscr", label: "Latest DSCR", val: (r) => dscr(r.c).v, csv: (r) => dscr(r.c).v, html: (r) => dscr(r.c).html },
        ] }) + "</section>" +
      '<section class="panel"><h2>Interest income by month</h2>' + vbars(e.cats, e.vals, e.colors, { fmt: (v) => "Rs " + UI.n(v, 1) + " L", label: "Interest income by month, last 12 months earned and next 12 projected", height: 230, values: false, xEvery: 3 }) +
      '<p class="small muted"><span class="key solid"></span>Earned (instalments received) <span class="key light"></span>Projected from the schedules. Rs lakh.</p></section>';
  }

  // ---------- loan detail ----------
  function detail(id) {
    const l = S.data.loans.find((x) => x.id === id);
    if (!l) return WS.head("Loan not found", '<a href="#app">Back to the loan book</a>');
    const c = co(l.company_id), rows = DOM.schedule(l, today()), s = DOM.loanSummary(l, today());
    const tr = (S.data.loan_transfers || []).filter((t) => t.loan_id === l.id).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
    const openT = tr && !["completed", "rejected"].includes(tr.status);
    const paid = rows.filter((r) => r.status === "paid").slice(-18);
    const mine = l.lender_id === S.user.id;
    return WS.head(c.name, rs(l.amount_paise, true) + " at " + rate(l) + " · " + tenorTxt(l) + ' · <a href="#app">Back to the loan book</a>',
      mine && l.status === "disbursed" && !openT ? '<button class="btn ghost" data-act="l-transfer" data-id="' + l.id + '">Request loan transfer</button>' : "") +
      '<div class="kpis k4" data-stagger><div class="kpi"><small>Outstanding</small><b>' + rs(s.principal_pending, true) + "</b><span>of " + rs(s.disbursed, true) + ' disbursed</span></div><div class="kpi"><small>Interest earned</small><b class="t-good">' + rs(s.interest_earned, true) + "</b></div>" +
      '<div class="kpi"><small>Next instalment</small><b>' + (s.next_due ? rs(s.next_amount, true) : "–") + "</b><span>" + (s.next_due ? dmy(s.next_due) : "Fully repaid") + '</span></div><div class="kpi"><small>Latest DSCR</small><b>' + dscr(c).html + "</b></div></div>" +
      (tr ? '<section class="panel"><h2>Loan transfer</h2>' + transferTimeline(tr) + "</section>" : "") +
      '<div class="grid2"><section class="panel"><h2>Outstanding balance</h2>' + lines(rows.map((r) => my(r.due)), [{ name: "Outstanding", color: C.debt, values: rows.map((r) => r.closing / 1e9), endLabel: false }], { xEvery: Math.ceil(rows.length / 8), yfmt: (y) => "Rs " + UI.n(y, 1) + " Cr", label: "Outstanding principal after each instalment", height: 210, marks: s.next_due ? [{ i: Math.max(rows.findIndex((r) => r.due === s.next_due), 0), v: rows[Math.max(rows.findIndex((r) => r.due === s.next_due), 0)].closing / 1e9, label: "Now" }] : [] }) + "</section>" +
      '<section class="panel"><h2>Interest earned by month</h2>' + (paid.length ? vbars(paid.map((r) => my(r.due)), paid.map((r) => r.interest / 1e7), C.debt, { fmt: (v) => UI.n(v, 2) + " L", label: "Interest received each month", height: 210, values: false, xEvery: 3 }) : KIT.empty("No instalments received yet", "")) + "</section></div>" +
      '<section class="panel"><h2>Repayment schedule</h2>' + KIT.table("l-sched-" + l.id, { name: "schedule-" + c.name.split(" ")[0], rows, key: (r) => String(r.n), pageSize: 24, noSearch: true,
        filters: [{ k: "status", label: "Status", options: [["paid", "Paid"], ["pending", "Pending"], ["overdue", "Overdue"]] }],
        rowClass: (r) => (r.status === "overdue" ? "row-bad" : ""),
        columns: [
          { k: "n", label: "#", num: true, val: (r) => r.n, html: (r) => String(r.n) },
          { k: "due", label: "Due", val: (r) => r.due, html: (r) => dmy(r.due) },
          { k: "opening", label: "Opening", num: true, val: (r) => r.opening, csv: (r) => r.opening / 100, html: (r) => rs(r.opening) },
          { k: "interest", label: "Interest", num: true, val: (r) => r.interest, csv: (r) => r.interest / 100, html: (r) => gx(rs(r.interest), { title: "Interest for instalment " + r.n, formula: "Opening balance x annual rate / 12, rounded to the paisa", inputs: [["Opening balance", rs(r.opening), "schedule"], ["Annual rate", rate(l), "sanction letter"]] }) },
          { k: "principal", label: "Principal", num: true, val: (r) => r.principal, csv: (r) => r.principal / 100, html: (r) => rs(r.principal) },
          { k: "closing", label: "Closing", num: true, val: (r) => r.closing, csv: (r) => r.closing / 100, html: (r) => rs(r.closing) },
          { k: "status", label: "Status", val: (r) => r.status, html: (r) => chip(r.status === "paid" ? "ok" : r.status === "overdue" ? "bad" : "", r.status === "paid" ? "Paid " + dmy(r.paid_on) : r.status.charAt(0).toUpperCase() + r.status.slice(1)) +
            (mine && r.status !== "paid" && r.due <= DOM.addDays(today(), 31) ? ' <button class="linkbtn small" data-act="l-paid" data-id="' + l.id + '" data-due="' + r.due + '">Mark received</button>' : "") },
        ] }) +
      '<p class="small muted">Interest-only during the moratorium, then a level EMI: P x r x (1 + r)^n / ((1 + r)^n - 1), with r the monthly rate. The last instalment clears the balance.</p></section>' +
      '<section class="panel"><h2>Quarterly monitoring</h2>' + WS.monitorBlock(c, true) + "</section>" +
      '<section class="panel"><h2>Documents</h2><ul class="docs">' + ["Sanction letter", "Loan agreement", "Hypothecation deed", "CMA data and projections"].map((d) => "<li><span>" + d + '</span><span class="muted small">Held by Aegis Ascend</span></li>').join("") +
      (S.data.files || []).filter((f) => f.company_id === c.id).map((f) => "<li><span>" + esc(f.name) + '</span><button class="linkbtn" data-act="file" data-id="' + f.id + '">Download</button></li>').join("") + "</ul></section>";
  }
  function transferTimeline(t) {
    const at = {}; (t.history || []).forEach((h) => (at[h.status] = h.at));
    const stop = t.status === "rejected" ? { label: "Rejected", reason: t.reason } : null;
    const cur = stop ? (t.history.slice().reverse().find((h) => h.status !== "rejected") || { status: "submitted" }).status : t.status;
    return KIT.timeline(LT_STEPS, cur, at, stop) + '<p class="small muted">' + (t.amount_paise ? rs(t.amount_paise) : "Full outstanding") + (t.buyer_lender_id ? " · buyer: " + esc(WS.userName(t.buyer_lender_id)) : "") + (t.fee_paise ? " · transfer fee " + rs(t.fee_paise) + " (" + pct(t.fee_rate, 1) + ")" : "") + (t.note ? " · " + esc(t.note) : "") + "</p>";
  }

  // ---------- lender desk (overview) ----------
  function desk() {
    const L = S.data.loans, live = L.filter((l) => l.status === "disbursed");
    const alerts = live.filter((l) => { const m = GB.monitor(co(l.company_id).quarters || [], co(l.company_id).covenants); return m.length && m[m.length - 1].state !== "ok"; });
    return WS.head("Lender desk", esc(S.user.firm || "")) +
      '<div class="kpis k4" data-stagger><div class="kpi"><small>New applications</small><b>' + L.filter((l) => l.status === "applied").length + '</b></div><div class="kpi"><small>Loans monitored</small><b>' + live.length + '</b></div>' +
      '<div class="kpi"><small>Book</small><b>' + rs(live.reduce((a, l) => a + l.amount_paise, 0), true) + '</b><span>disbursed</span></div><div class="kpi"><small>Covenant alerts</small><b class="' + (alerts.length ? "t-bad" : "") + '">' + alerts.length + "</b></div></div>" +
      '<section class="panel"><p>Every applicant arrives with founder-confirmed data, an engine-run DSCR analysis and an advisor\'s sign-off. <a href="#app-applications">Review applications</a> · <a href="#app-monitor">Monitoring</a> · <a href="#app">Loan book</a></p>' +
      (alerts.length ? '<ul class="alerts">' + alerts.map((l) => '<li class="bad"><a href="#app-loan/' + l.id + '">' + esc(co(l.company_id).name) + ": latest quarter is close to or in breach of a covenant</a></li>").join("") + "</ul>" : "") + "</section>";
  }

  // ---------- applications ----------
  function applications() {
    const L = S.data.loans.filter((l) => ["applied", "sanctioned", "declined"].includes(l.status));
    return WS.head("Applications", "Each applicant arrives with founder-confirmed data, the engine's DSCR analysis and an advisor's sign-off.") +
      (L.length ? L.map((l) => { const c = co(l.company_id), rep = S.data.reports.find((r) => r.company_id === l.company_id), rd = GB.readiness(c.readiness), t = GB.twin(Object.assign({}, c.twin, { raise: c.raise }));
        return '<section class="panel"><div class="panel-head"><div><h2>' + esc(c.name) + '</h2><p class="muted">' + esc(c.sector) + " · asks " + rs(l.amount_paise, true) + " at " + rate(l) + " for " + tenorTxt(l) + "</p></div>" + WS.statusChip(l.status) + "</div>" +
          '<div class="kpis k4"><div class="kpi"><small>Debt readiness</small><b>' + rd.debt.score + "/100</b><span>" + rd.debt.verdict + '</span></div><div class="kpi"><small>Lowest DSCR, all-debt</small><b>' + UI.xx(t.min_dscr) + "</b><span>stress " + UI.xx(t.min_dscr_stress) + '</span></div><div class="kpi"><small>Engine best mix</small><b>' + pct(t.best.share) + ' debt</b></div><div class="kpi"><small>Advisor report</small><b>' + (rep ? "Approved" : "None") + "</b></div></div>" +
          (l.status === "applied" ? '<div class="row gap-s"><button class="btn primary sm" data-act="l-decide" data-id="' + l.id + '" data-d="sanction">Sanction</button><button class="btn ghost sm" data-act="l-decide" data-id="' + l.id + '" data-d="decline">Decline</button></div>' : l.status === "sanctioned" ? '<button class="btn primary sm" data-act="l-decide" data-id="' + l.id + '" data-d="disburse">Mark disbursed</button>' : "") + "</section>"; }).join("")
        : '<section class="panel">' + KIT.empty("No applications", "Applications sent to you through Aegis Ascend appear here.") + "</section>");
  }
  function monitoring() {
    const L = S.data.loans.filter((l) => l.status === "disbursed");
    return WS.head("Monitoring", "Quarterly covenant checks for loans you hold. Alerts reach you and the founder before a breach.") +
      (L.length ? L.map((l) => '<section class="panel"><h2>' + esc(co(l.company_id).name) + " · " + rs(l.amount_paise, true) + "</h2>" + WS.monitorBlock(co(l.company_id), true) + "</section>").join("") : '<section class="panel">' + KIT.empty("No disbursed loans", "Monitoring starts at disbursal.") + "</section>");
  }
  function transfers() {
    const T = (S.data.loan_transfers || []).slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return WS.head("Loan transfers", "Loans move only between regulated banks and NBFCs, arranged by Aegis Ascend. Request one from a loan's page.") +
      (T.length ? T.map((t) => { const l = S.data.loans.find((x) => x.id === t.loan_id); return '<section class="panel"><div class="panel-head"><h2>' + esc(co(l ? l.company_id : "").name) + "</h2>" + chip(t.status === "completed" ? "ok" : t.status === "rejected" ? "bad" : "warn", t.status.replace("_", " ")) + "</div>" + transferTimeline(t) + "</section>"; }).join("")
        : '<section class="panel">' + KIT.empty("No transfer requests", "Open a loan to request a transfer to another regulated lender.", '<a class="btn primary" href="#app">Open the loan book</a>') + "</section>");
  }
  function fees() {
    const F = S.data.invoices || [];
    return WS.head("Fees", "Aegis Ascend debt fees are paid by the lender: monitoring 0.25% to 0.5% a year, transfers 0.3% to 0.5%. All plus 18% GST.") +
      '<section class="panel"><h2>Your invoices</h2>' + KIT.table("l-fees", { name: "fees", rows: F, noSearch: true, empty: { title: "No invoices yet", text: "Monitoring and transfer fees appear here." },
        columns: [{ k: "kind", label: "Fee", html: (f) => esc(f.kind.replace("_", " ")) + '<span class="muted small block">' + esc(f.period) + "</span>" }, { k: "amount_paise", label: "Amount", num: true, csv: (f) => f.amount_paise / 100, html: (f) => rs(f.amount_paise) },
          { k: "gst_paise", label: "GST 18%", num: true, csv: (f) => f.gst_paise / 100, html: (f) => rs(f.gst_paise) }, { k: "due", label: "Due", html: (f) => dmy(f.due) }, { k: "paid_on", label: "Status", html: (f) => (f.paid_on ? chip("ok", "Paid " + dmy(f.paid_on)) : f.due < today() ? chip("bad", "Overdue") : chip("warn", "Due")) }] }) + "</section>" +
      WS.PAGES.lender["app-lfees-calc"]();
  }

  Object.assign(WS.clicks, {
    "l-decide": async (b, id) => {
      const d = b.dataset.d, words = { sanction: "Sanction this loan?", decline: "Decline this application?", disburse: "Mark this loan as disbursed today?" };
      if (await KIT.confirm(words[d], d === "disburse" ? "<p>The repayment schedule starts from today.</p>" : "", d === "decline" ? "Decline" : "Confirm", d === "decline")) return WS.after(await WS.API.act("lender_decide", { loan_id: id, decision: d }));
    },
    "l-paid": async (b, id) => {
      if (await KIT.confirm("Record this instalment as received?", "<p>Instalment due " + dmy(b.dataset.due) + ". This updates interest earned and principal outstanding.</p>", "Record payment")) return WS.after(await WS.API.act("record_repayment", { loan_id: id, due: b.dataset.due }));
    },
    "l-transfer": async (b, id) => {
      const l = S.data.loans.find((x) => x.id === id), s = DOM.loanSummary(l, today());
      const v = await KIT.dialog({ title: "Request a loan transfer", confirm: "Send to Aegis Ascend",
        text: "<p>Aegis Ascend checks eligibility (RBI minimum holding: " + DOM.minHoldingMonths(l) + " months for this loan), gets the borrower's consent and introduces regulated buyers only.</p>",
        fields: [{ name: "amount", label: "Amount to transfer (blank for the full outstanding " + rs(s.principal_pending) + ")", type: "number", min: 0, step: "0.01", unit: "Rs" }, { name: "note", label: "Note (optional)", type: "textarea" }],
        validate: (x) => (x.amount && !(+x.amount > 0 && Math.round(+x.amount * 100) <= s.principal_pending) ? "Enter an amount up to " + rs(s.principal_pending) : null) });
      if (v) return WS.after(await WS.API.act("request_loan_transfer", { loan_id: id, amount_paise: v.amount ? Math.round(+v.amount * 100) : null, note: v.note }), "Transfer request sent to Aegis Ascend.");
    },
  });

  const calc = WS.PAGES.lender["app-lfees"];
  WS.PAGES.lender["app-lfees-calc"] = () => calc().replace(/^[\s\S]*?<section/, "<section");
  Object.assign(WS.PAGES.lender, { "app-desk": desk, app: book, "app-loan": detail, "app-applications": applications, "app-monitor": monitoring, "app-ltransfers": transfers, "app-lfees": fees });
  WS.lender = { dscr, transferTimeline, LT_STEPS, rate, tenorTxt };
})(typeof globalThis !== "undefined" ? globalThis : this);
```

### `site/ws-advisor.js`

Advisor: today, pipeline, company file, directory, resales, revaluations, tools, admin.

```javascript
/* Advisor console: Today, pipeline, company file, investor directory and offers, resale requests, loan transfers,
   revaluations, compliance, revenue, notes and tasks, message templates, audit log and settings. */
(function (root) {
  "use strict";
  const WS = root.WS, UI = root.UI, DOM = root.DOM, KIT = root.KIT, GB = root.GB;
  const { esc, gx, pct, chip, lines, C } = UI;
  const { rs, rsPrice, dmy } = DOM;
  const S = WS.S, API = WS.API;
  const D = () => S.data;
  const today = () => D().today;
  const fyNow = () => DOM.fy(today());
  const set = () => D().settings || DOM.SETTINGS_DEFAULT;
  const co = (id) => WS.companyById(id) || { id, name: id };
  const person = (id) => (D().directory || []).find((u) => u.id === id) || {};
  const who = (id) => { const u = person(id); return u.firm || u.name || id; };
  const my = (s) => DOM.MON[+s.slice(5, 7) - 1] + " '" + s.slice(2, 4);
  const STAGES = [["applied", "Applied"], ["under_review", "Under review"], ["approved", "Approved"], ["offering", "Offering"], ["funded", "Funded"], ["monitoring", "Monitoring"], ["closed", "Closed"], ["rejected", "Rejected"]];
  const stageName = (k) => (STAGES.find((x) => x[0] === k) || [k, k])[1];
  const SELL_STEPS = [["submitted", "Submitted"], ["under_review", "Under review"], ["rofr", "First refusal"], ["buyer_introduced", "Buyer introduced"], ["spa_signed", "SPA signed"], ["completed", "Transfer complete"]];
  const SELL_OPEN = ["submitted", "under_review", "rofr", "buyer_introduced", "spa_signed"];
  const age = (iso) => DOM.daysBetween(iso.slice(0, 10), today());
  const ageTxt = (n) => (n === 0 ? "today" : n === 1 ? "1 day" : n + " days");

  // ---------- counters ----------
  const used = (cid, sec) => DOM.offersUsed(D(), cid, fyNow(), sec || co(cid).security_type || "equity");
  const mem = (cid) => DOM.members(D(), cid);
  const plat = (cid) => DOM.platformInvestors(D(), cid).length;
  function meter(n, of, warn, label) {
    const cls = n >= of ? "bad" : n >= warn ? "warn" : "ok";
    return '<div class="cmeter ' + cls + '" title="' + esc(label) + '"><div class="cm-top"><span>' + esc(label) + "</span><b>" + n + " / " + of + '</b></div><div class="cm-bar"><i style="width:' + Math.min(100, n / of * 100) + '%"></i><em style="left:' + warn / of * 100 + '%"></em></div></div>';
  }
  const offerMeter = (cid, sec) => meter(used(cid, sec), set().offer_limit, set().offer_warn, "Offers FY " + fyNow() + (sec && sec !== "equity" ? " (" + sec + ")" : ""));
  const memberMeter = (cid) => meter(mem(cid), set().member_limit, set().member_warn, "Members");
  const platMeter = (cid) => meter(plat(cid), set().max_platform_investors, set().max_platform_investors - 2, "Platform investors");
  const lastVal = (cid) => DOM.latestValuation(D(), cid);
  const funded = (c) => D().holdings.some((h) => h.company_id === c.id && h.shares > 0);
  const revalDue = (c) => { const v = lastVal(c.id); return v ? DOM.addMonths(v.date, 3) : today(); };
  const report = (cid) => D().reports.filter((r) => r.company_id === cid && r.status === "approved").sort((a, b) => (a.reviewed_at < b.reviewed_at ? 1 : -1))[0];
  function dscrOf(c) { const m = GB.monitor(c.quarters || [], c.covenants), l = m[m.length - 1]; return l ? l.dscr : null; }

  // ---------- Today ----------
  function alerts() {
    const t = today(), A = [];
    for (const c of D().companies.filter(funded)) { const due = revalDue(c), d = DOM.daysBetween(t, due); if (d <= 14) A.push({ kind: "Revaluation", sev: d < 0 ? "bad" : "warn", text: c.name + (d < 0 ? ": revaluation overdue by " + ageTxt(-d) : ": revaluation due " + dmy(due)), link: "app-revaluations", sort: d }); }
    for (const x of D().sell_requests.filter((x) => SELL_OPEN.includes(x.status))) { const a = age(x.history[x.history.length - 1].at); if (a > 5) A.push({ kind: "Request", sev: "warn", text: who(x.investor_id) + " · " + co(x.company_id).name + ": resale request waiting " + ageTxt(a), link: "app-requests", sort: -a }); }
    for (const x of D().loan_transfers.filter((x) => !["completed", "rejected"].includes(x.status))) { const a = age(x.history[x.history.length - 1].at); if (a > 5) A.push({ kind: "Request", sev: "warn", text: who(x.from_lender_id) + ": loan transfer waiting " + ageTxt(a), link: "app-loantransfers", sort: -a }); }
    for (const c of D().companies) { const ck = c.checklist || {}; if (ck.allotment && !ck.pas3) { const due = DOM.addDays(ck.allotment, 15), d = DOM.daysBetween(t, due); A.push({ kind: "PAS-3", sev: d < 0 ? "bad" : "warn", text: c.name + ": PAS-3 " + (d < 0 ? "overdue since " : "due ") + dmy(due), link: "app-companyfile/" + c.id, sort: d }); } }
    for (const h of D().holdings.filter((h) => h.shares > 0)) { const u = DOM.lockUntil(h, set()), d = DOM.daysBetween(t, u); if (d > 0 && d <= 7) A.push({ kind: "Lock-in", sev: "", text: who(h.investor_id) + " · " + co(h.company_id).name + ": lock-in ends " + dmy(u), link: "app-companyfile/" + h.company_id, sort: d }); }
    for (const c of D().companies) {
      for (const sec of DOM.SECURITY_TYPES) { const n = used(c.id, sec); if (n >= set().offer_warn) A.push({ kind: "Limit", sev: n >= set().offer_limit ? "bad" : "warn", text: c.name + ": " + n + " of " + set().offer_limit + " " + sec + " offers used in FY " + fyNow(), link: "app-compliance", sort: -n }); }
      const m = mem(c.id); if (m >= set().member_warn) A.push({ kind: "Limit", sev: m >= set().member_limit ? "bad" : "warn", text: c.name + ": " + m + " of " + set().member_limit + " members", link: "app-compliance", sort: -m });
      const p = plat(c.id); if (p >= set().max_platform_investors - 1) A.push({ kind: "Limit", sev: p >= set().max_platform_investors ? "bad" : "warn", text: c.name + ": " + p + " of " + set().max_platform_investors + " platform investors", link: "app-compliance", sort: -p });
    }
    for (const l of D().loans.filter((l) => l.status === "disbursed")) {
      const c = co(l.company_id), s = DOM.loanSummary(l, t), d = dscrOf(c);
      if (s.overdue) A.push({ kind: "DSCR", sev: "bad", text: c.name + ": " + s.overdue + " overdue instalment" + (s.overdue === 1 ? "" : "s") + " to " + who(l.lender_id), link: "app-loansdesk", sort: -100 });
      if (d != null && d < 1.25) A.push({ kind: "DSCR", sev: "bad", text: c.name + ": DSCR " + UI.xx(d) + " is below the 1.25x covenant", link: "app-loansdesk", sort: -50 });
    }
    const seen = new Set();
    return A.filter((a) => (seen.has(a.text) ? false : seen.add(a.text)));
  }
  function todayPage() {
    const A = alerts(), tasks = D().notes.filter((n) => !n.done && n.due && n.due <= DOM.addDays(today(), 3)).sort((a, b) => (a.due < b.due ? -1 : 1));
    const openReq = D().sell_requests.filter((x) => SELL_OPEN.includes(x.status)).length + D().loan_transfers.filter((x) => !["completed", "rejected"].includes(x.status)).length;
    const groups = ["Revaluation", "Request", "PAS-3", "Lock-in", "Limit", "DSCR"];
    const inReview = D().reports.filter((r) => r.status === "in_review");
    return WS.head("Today", dmy(today()) + " · what needs you, most urgent first") +
      '<div class="kpis k4" data-stagger><div class="kpi"><small>Needs attention</small><b class="' + (A.some((a) => a.sev === "bad") ? "t-bad" : "") + '">' + KIT.figure("a-alerts", A.length, (y) => String(Math.round(y))) + '</b><span>' + A.filter((a) => a.sev === "bad").length + ' overdue or blocked</span></div>' +
      '<div class="kpi"><small>Open requests</small><b>' + openReq + '</b><span>resales and loan transfers</span></div><div class="kpi"><small>Reports to review</small><b>' + inReview.length + '</b></div><div class="kpi"><small>Tasks due</small><b>' + tasks.length + "</b><span>in the next 3 days</span></div></div>" +
      '<div class="today">' + groups.map((g) => { const L = A.filter((a) => a.kind === g).sort((a, b) => a.sort - b.sort); if (!L.length) return ""; const title = { Revaluation: "Revaluations", Request: "Requests waiting more than 5 days", "PAS-3": "PAS-3 filing deadlines", "Lock-in": "Lock-ins ending this week", Limit: "Companies near a limit", DSCR: "Repayment alerts" }[g];
        return '<section class="panel"><h2>' + title + '</h2><ul class="alerts" data-stagger>' + L.map((a) => '<li class="' + a.sev + '"><a href="#' + a.link + '">' + esc(a.text) + "</a></li>").join("") + "</ul></section>"; }).join("") +
      '<section class="panel"><h2>Tasks due</h2>' + (tasks.length ? '<ul class="alerts">' + tasks.map((n) => '<li class="' + (n.due < today() ? "bad" : "warn") + '"><label class="chk"><input type="checkbox" data-act="a-note-toggle" data-id="' + n.id + '"> ' + esc(n.text) + '</label><span class="muted small">' + subjectName(n) + " · due " + dmy(n.due) + "</span></li>").join("") + "</ul>" : '<p class="muted">Nothing due.</p>') + "</section>" +
      (inReview.length ? '<section class="panel"><h2>Reports to review</h2><ul class="alerts">' + inReview.map((r) => '<li><a href="#app-review">' + esc(co(r.company_id).name + ": " + r.title) + "</a></li>").join("") + "</ul></section>" : "") +
      (A.length ? "" : '<section class="panel">' + KIT.empty("All clear", "No overdue revaluations, waiting requests or limit warnings.") + "</section>") + "</div>";
  }

  // ---------- pipeline ----------
  function cardInfo(c) {
    const r = report(c.id), O = D().offers.filter((o) => o.company_id === c.id);
    return { r, interested: O.filter((o) => o.response === "interested").length, committed: O.filter((o) => o.response === "invested").length, days: c.stage_since ? DOM.daysBetween(c.stage_since, today()) : 0 };
  }
  function pipeline() {
    const view = S.pipeView || "board", L = D().companies;
    const toggle = '<div class="seg-t" role="group" aria-label="View"><button class="btn sm ' + (view === "board" ? "primary" : "ghost") + '" data-act="a-pipeview" data-id="board" aria-pressed="' + (view === "board") + '">Board</button><button class="btn sm ' + (view === "table" ? "primary" : "ghost") + '" data-act="a-pipeview" data-id="table" aria-pressed="' + (view === "table") + '">Table</button></div>';
    const cards = L.map((c) => { const k = cardInfo(c), mix = k.r ? pct(1 - k.r.summary.best_share) + " equity / " + pct(k.r.summary.best_share) + " debt" : "Mix after review";
      return { id: c.id, col: c.pipeline_stage || "applied", label: c.name, html: '<a href="#app-companyfile/' + c.id + '" class="kb-title">' + esc(c.name) + '</a><p class="small muted">' + rs(c.raise_paise, true) + " · " + mix + "</p>" +
        '<dl class="kb-facts"><div><dt>Offers FY</dt><dd>' + used(c.id) + "/" + set().offer_limit + "</dd></div><div><dt>Interested · committed</dt><dd>" + k.interested + " · " + k.committed + "</dd></div><div><dt>Platform investors</dt><dd>" + plat(c.id) + "/" + set().max_platform_investors + "</dd></div><div><dt>Members</dt><dd>" + mem(c.id) + "/" + set().member_limit + "</dd></div></dl>" +
        '<p class="small muted">' + ageTxt(k.days) + " in stage</p>" }; });
    return WS.head("Company pipeline", "Drag a company to move it, or use its Move menu. Every move is confirmed and logged.", toggle) +
      (view === "board" ? KIT.kanban("pipe", STAGES, cards, move)
        : '<section class="panel">' + KIT.table("a-pipe", { name: "pipeline", rows: L, filters: [{ k: "pipeline_stage", label: "Stage", options: STAGES }],
          columns: [{ k: "name", label: "Company", html: (c) => '<a href="#app-companyfile/' + c.id + '"><b>' + esc(c.name) + '</b></a><span class="muted small block">' + esc(c.sector) + "</span>" },
            { k: "pipeline_stage", label: "Stage", html: (c) => stageName(c.pipeline_stage) },
            { k: "raise", label: "Raise", num: true, val: (c) => c.raise_paise, csv: (c) => c.raise_paise / 100, html: (c) => rs(c.raise_paise, true) },
            { k: "mix", label: "Debt / equity", val: (c) => (cardInfo(c).r ? cardInfo(c).r.summary.best_share : null), html: (c) => (cardInfo(c).r ? pct(cardInfo(c).r.summary.best_share) + " / " + pct(1 - cardInfo(c).r.summary.best_share) : "–") },
            { k: "offers", label: "Offers FY", num: true, val: (c) => used(c.id), html: (c) => used(c.id) + "/" + set().offer_limit },
            { k: "int", label: "Interested", num: true, val: (c) => cardInfo(c).interested, html: (c) => String(cardInfo(c).interested) },
            { k: "com", label: "Committed", num: true, val: (c) => cardInfo(c).committed, html: (c) => String(cardInfo(c).committed) },
            { k: "plat", label: "Platform inv.", num: true, val: (c) => plat(c.id), html: (c) => plat(c.id) + "/" + set().max_platform_investors },
            { k: "mem", label: "Members", num: true, val: (c) => mem(c.id), html: (c) => mem(c.id) + "/" + set().member_limit },
            { k: "days", label: "Days in stage", num: true, val: (c) => cardInfo(c).days, html: (c) => String(cardInfo(c).days) }] }) + "</section>");
  }
  async function move(cid, stage) {
    const c = co(cid);
    if (c.pipeline_stage === stage) return;
    if (!(await KIT.confirm("Move " + c.name + "?", "<p>From <b>" + stageName(c.pipeline_stage) + "</b> to <b>" + stageName(stage) + "</b>. The move is recorded in the audit log.</p>", "Move company"))) return WS.render({ keepScroll: true });
    try { await WS.after(await API.act("set_stage", { company_id: cid, stage })); } catch (e) { WS.fail(e); WS.render({ keepScroll: true }); }
  }

  // ---------- company file ----------
  function companyFile(cid) {
    const c = co(cid);
    if (!c.name || c.name === cid) return WS.head("Company not found", '<a href="#app-pipeline">Back to the pipeline</a>');
    const fd = DOM.fdShares(D(), c.id), cap = D().cap_table.filter((e) => e.company_id === c.id);
    const H = D().holdings.filter((h) => h.company_id === c.id && h.shares > 0);
    const capRows = cap.map((e) => ({ id: e.id, name: e.holder_name, type: e.holder_type, holders: e.holders || 1, shares: e.shares, entry: e }))
      .concat(H.map((h) => ({ id: h.id, name: who(h.investor_id), type: "platform", holders: 1, shares: h.shares, h })));
    const O = D().offers.filter((o) => o.company_id === c.id).sort((a, b) => (a.sent_at < b.sent_at ? 1 : -1));
    const V = D().valuations.filter((v) => v.company_id === c.id).sort((a, b) => (a.date < b.date ? -1 : 1));
    const ck = c.checklist || {}, F = D().invoices.filter((f) => f.company_id === c.id), N = D().notes.filter((n) => n.subject_type === "company" && n.subject_id === c.id);
    const ext = ((c.external_offers || {})[fyNow()] || {});
    return WS.head(c.name, esc(c.sector) + " · " + esc(c.city || "") + " · " + chip("", stageName(c.pipeline_stage)) + ' · <a href="#app-pipeline">Back to the pipeline</a>',
      '<div class="row gap-s wrap">' + (["approved", "offering"].includes(c.pipeline_stage) ? '<a class="btn primary" href="#app-directory" data-act="a-pick-co" data-id="' + c.id + '">Share offer</a>' : "") + '<button class="btn ghost" data-act="a-update" data-id="' + c.id + '">Post update</button></div>') +
      '<div class="meters">' + offerMeter(c.id) + memberMeter(c.id) + platMeter(c.id) + "</div>" +
      '<section class="panel"><div class="panel-head"><h2>Cap table</h2><button class="btn ghost sm" data-act="a-cap" data-id="' + c.id + '">Add founder or shareholder</button></div>' +
      KIT.table("a-cap-" + c.id, { name: "cap-table-" + c.name.split(" ")[0], rows: capRows, noSearch: true, pageSize: 50,
        columns: [{ k: "name", label: "Holder", html: (r) => "<b>" + esc(r.name) + "</b>" + (r.holders > 1 ? '<span class="muted small block">' + r.holders + " holders</span>" : "") },
          { k: "type", label: "Type", html: (r) => ({ founder: "Founder", existing: "Existing shareholder", platform: "Platform investor" })[r.type] },
          { k: "shares", label: "Shares", num: true, html: (r) => DOM.shares(r.shares) },
          { k: "pct", label: "% fully diluted", num: true, val: (r) => r.shares / fd, html: (r) => gx(pct(r.shares / fd, 2), { title: "Fully diluted ownership", formula: "Shares / (all shares on the cap table + unissued options and convertibles)", inputs: [["Shares", DOM.shares(r.shares), "cap table"], ["Fully diluted shares", DOM.shares(fd), "cap table"], ["of which options and convertibles", DOM.shares(c.fd_extra_shares || 0), "advisor"]] }) },
          { k: "act", label: "", sort: false, export: false, html: (r) => (r.entry ? '<button class="linkbtn small" data-act="a-cap" data-id="' + c.id + '" data-entry="' + r.entry.id + '">Edit</button>' : r.h && today() < DOM.lockUntil(r.h, set()) && !r.h.early_consent ? '<button class="linkbtn small" data-act="a-consent" data-id="' + r.h.id + '">Record founder consent</button>' : r.h && r.h.early_consent ? '<span class="muted small">Consent recorded</span>' : "") }] }) +
      '<p class="small muted">Fully diluted shares ' + DOM.shares(fd) + ", including " + DOM.shares(c.fd_extra_shares || 0) + ' unissued options and convertibles. <button class="linkbtn small" data-act="a-terms" data-id="' + c.id + '">Edit offer terms</button></p></section>' +
      '<div class="grid2"><section class="panel"><div class="panel-head"><h2>Offer log</h2><button class="btn ghost sm" data-act="a-external" data-id="' + c.id + '">Off-platform offers: ' + (ext[c.security_type || "equity"] || 0) + "</button></div>" +
      KIT.table("a-offers-" + c.id, { name: "offers-" + c.name.split(" ")[0], rows: O, pageSize: 10, filters: [{ k: "response", label: "Response", options: [["pending", "Pending"], ["interested", "Interested"], ["declined", "Declined"], ["invested", "Invested"]] }],
        empty: { title: "No offers yet", text: "Share the company from the investor directory once it is approved." },
        columns: [{ k: "inv", label: "Investor", val: (o) => who(o.investor_id), html: (o) => esc(who(o.investor_id)) }, { k: "sent_at", label: "Sent", html: (o) => dmy(o.sent_at.slice(0, 10)) },
          { k: "fy", label: "FY", html: (o) => esc(o.fy) }, { k: "security_type", label: "Security", html: (o) => esc(o.security_type) },
          { k: "response", label: "Response", html: (o) => chip(o.response === "invested" || o.response === "interested" ? "ok" : o.response === "declined" ? "bad" : "warn", o.response) + (o.response === "interested" ? ' <button class="linkbtn small" data-act="a-allot" data-id="' + o.id + '">Record allotment</button>' : "") }] }) + "</section>" +
      '<section class="panel"><div class="panel-head"><h2>Valuation history</h2>' + (funded(c) || V.length ? '<button class="btn ghost sm" data-act="a-reval" data-id="' + c.id + '">Publish revaluation</button>' : "") + "</div>" +
      (V.length > 1 ? lines(V.map((v) => my(v.date)), [{ name: "Price per share", color: C.mix, values: V.map((v) => v.price_per_share_paise / 100), endLabel: false }], { yfmt: (y) => "Rs " + UI.n(y, 0), label: "Price per share", height: 170 }) : "") +
      (V.length ? '<ul class="docs">' + V.slice().reverse().map((v) => "<li><span>" + dmy(v.date) + " · " + esc(v.method) + " · " + esc(v.valuer) + "</span><b>" + rsPrice(v.price_per_share_paise) + "</b></li>").join("") + "</ul>" : '<p class="muted">No valuations yet.</p>') + "</section></div>" +
      '<div class="grid2"><section class="panel"><h2>Documents checklist</h2><ul class="checklist2">' + DOM.DOC_CHECKLIST.map(([k, l]) => { const done = ck[k], pas3 = k === "pas3" && ck.allotment && !done ? DOM.addDays(ck.allotment, 15) : null;
        return '<li class="' + (done ? "done" : "") + '"><label class="chk"><input type="checkbox" data-act="a-check" data-id="' + c.id + '" data-item="' + k + '"' + (done ? " checked" : "") + "> " + esc(l) + "</label>" + (done ? '<span class="muted small">' + dmy(done) + "</span>" : pas3 ? '<span class="small ' + (pas3 < today() ? "t-bad" : "t-warn") + '">due ' + dmy(pas3) + "</span>" : "") + "</li>"; }).join("") + "</ul></section>" +
      '<section class="panel"><div class="panel-head"><h2>Fees</h2><button class="btn ghost sm" data-act="a-invoice" data-id="' + c.id + '">Raise invoice</button></div>' + invoiceTable("a-fees-" + c.id, F, true) + "</section></div>" +
      '<section class="panel"><div class="panel-head"><h2>Notes and tasks</h2><button class="btn ghost sm" data-act="a-note" data-type="company" data-id="' + c.id + '">Add note</button></div>' + notesList(N) + "</section>";
  }

  // ---------- investor directory and offer sharing ----------
  const investors = () => (D().directory || []).filter((u) => u.role === "investor");
  function invStats(u) { const H = D().holdings.filter((h) => h.investor_id === u.id && h.shares > 0); return { invested: H.reduce((a, h) => a + h.cost_paise, 0), held: new Set(H.map((h) => h.company_id)).size }; }
  function directory() {
    const offerable = D().companies.filter((c) => ["approved", "offering"].includes(c.pipeline_stage) && report(c.id));
    if (!S.offerCo || !offerable.some((c) => c.id === S.offerCo)) S.offerCo = offerable[0] && offerable[0].id;
    const c = S.offerCo && co(S.offerCo), sec = c ? c.security_type || "equity" : "equity";
    const offered = new Set(c ? D().offers.filter((o) => o.company_id === c.id && o.fy === fyNow() && o.security_type === sec).map((o) => o.investor_id) : []);
    const rows = investors().map((u) => Object.assign({ st: invStats(u), fit: c ? GB.fitScore(Object.assign({}, c, { raise: (c.raise_paise || 0) / 1e9 }), u) : null }, u));
    const sel = KIT.selected("a-dir").filter((id) => !offered.has(id));
    const left = c ? set().offer_limit - used(c.id, sec) : 0;
    const sectors = [...new Set(investors().flatMap((u) => (u.mandate && u.mandate.sectors) || []))].sort();
    const bar = c ? '<div class="share-bar" id="share-bar"><label class="fld inline"><span>Company</span><span class="in"><select data-act="a-offer-co" aria-label="Company to offer">' + offerable.map((x) => '<option value="' + x.id + '"' + (x.id === c.id ? " selected" : "") + ">" + esc(x.name) + "</option>").join("") + "</select></span></label>" +
      '<div class="share-count"><b>Offers this year: ' + used(c.id, sec) + " / " + set().offer_limit + "</b><span class=\"small " + (left < 10 ? "t-bad" : left <= set().offer_limit - set().offer_warn ? "t-warn" : "muted") + "\">" + left + " left in FY " + fyNow() + " (" + sec + ")</span></div>" +
      '<button class="btn ghost sm" data-act="a-shortlist">Suggest a shortlist</button><button class="btn primary" data-act="a-share"' + (sel.length ? "" : " disabled") + ">Share offer with " + sel.length + " selected</button></div>"
      : '<div class="notice">No company is approved for offering yet. Approve a report in the review queue first.</div>';
    return WS.head("Investor directory", "Onboarded investors. Select investors, then share an approved company with them. Each investor offered counts towards the company's 200 offers this financial year.") +
      '<section class="panel">' + bar +
      KIT.table("a-dir", { name: "investor-directory", rows, select: true, pageSize: 30,
        search: (u) => [u.name, u.firm, ((u.mandate || {}).sectors || []).join(" ")].join(" "),
        filters: [{ k: "sector", label: "Sector", options: sectors.map((s) => [s, s]), match: (u, v) => ((u.mandate || {}).sectors || []).includes(v) },
          { k: "ticket", label: "Ticket", options: [["s", "Up to Rs 1 Cr"], ["m", "Rs 1-5 Cr"], ["l", "Rs 5 Cr and above"]], match: (u, v) => { const mx = (u.profile || {}).ticket_max_paise || 0; return v === "s" ? mx <= 1e9 : v === "m" ? mx > 1e9 && mx <= 5e9 : mx > 5e9; } },
          { k: "kyc", label: "KYC", options: [["verified", "Verified"], ["pending", "Pending"], ["not_started", "Not started"]], match: (u, v) => (u.profile || {}).kyc === v },
          { k: "acc", label: "Accredited", options: [["yes", "Yes"], ["no", "No"]], match: (u, v) => !!(u.profile || {}).accredited === (v === "yes") }],
        rowClass: (u) => (offered.has(u.id) ? "row-muted" : ""),
        columns: [
          { k: "name", label: "Investor", val: (u) => u.firm || u.name, html: (u) => "<b>" + esc(u.firm || u.name) + '</b><span class="muted small block">' + esc(u.name) + (offered.has(u.id) ? " · already offered this year" : "") + "</span>" },
          { k: "kyc", label: "KYC", val: (u) => (u.profile || {}).kyc, html: (u) => chip({ verified: "ok", pending: "warn" }[(u.profile || {}).kyc] || "bad", ({ verified: "Verified", pending: "Pending", not_started: "Not started" })[(u.profile || {}).kyc] || "Not started") + ' <button class="linkbtn small" data-act="a-kyc" data-id="' + u.id + '">Edit</button>' },
          { k: "nda", label: "NDA", val: (u) => (u.profile || {}).nda_signed_at, html: (u) => ((u.profile || {}).nda_signed_at ? "Yes · " + dmy(u.profile.nda_signed_at.slice(0, 10)) : "No") },
          { k: "acc", label: "Accredited", val: (u) => ((u.profile || {}).accredited ? 1 : 0), html: (u) => ((u.profile || {}).accredited ? "Yes" : "No") },
          { k: "sectors", label: "Sectors", sort: false, html: (u) => esc(((u.mandate || {}).sectors || []).join(", ")) },
          { k: "ticket", label: "Ticket", num: true, val: (u) => (u.profile || {}).ticket_max_paise, html: (u) => (u.profile ? rs(u.profile.ticket_min_paise, true) + "–" + rs(u.profile.ticket_max_paise, true).replace("Rs ", "") : "–") },
          { k: "inv", label: "Invested", num: true, val: (u) => u.st.invested, csv: (u) => u.st.invested / 100, html: (u) => rs(u.st.invested, true) },
          { k: "held", label: "Companies", num: true, val: (u) => u.st.held, html: (u) => String(u.st.held) },
          { k: "active", label: "Last active", val: (u) => (u.profile || {}).last_active, html: (u) => ((u.profile || {}).last_active ? dmy(u.profile.last_active.slice(0, 10)) : "–") },
          { k: "fit", label: "Fit", num: true, val: (u) => (u.fit ? u.fit.score : null), html: (u) => (u.fit ? gx(String(u.fit.score), { title: "Investor Fit Score for " + c.name, formula: "Sector, stage, ticket size and past deals, scored out of 100", inputs: u.fit.reasons.map((r) => [r, "", "engine"]) }) : "–") },
        ] }) + "</section>";
  }

  // ---------- resale requests ----------
  function requests() {
    const R = D().sell_requests.slice().sort((a, b) => (SELL_OPEN.includes(a.status) === SELL_OPEN.includes(b.status) ? (a.created_at < b.created_at ? 1 : -1) : SELL_OPEN.includes(a.status) ? -1 : 1));
    const hold = (x) => D().holdings.find((h) => h.id === x.holding_id) || { shares: 0, allotment_date: today() };
    const addsMember = (x) => !x.full;
    return WS.head("Resale requests", "Private, one-to-one resales. No listings, no prices shown to other investors, no bidding. Prefer full-stake sales: a part sale to a new buyer adds a member.") +
      '<section class="panel">' + KIT.table("a-req", { name: "resale-requests", rows: R, pageSize: 20,
        filters: [{ k: "status", label: "Status", options: SELL_STEPS.concat([["withdrawn", "Withdrawn"], ["rejected", "Rejected"]]) }],
        empty: { title: "No resale requests", text: "Investors' sell requests arrive here after the 6-month lock-in." },
        columns: [
          { k: "inv", label: "Investor", val: (x) => who(x.investor_id), html: (x) => "<b>" + esc(who(x.investor_id)) + '</b><span class="muted small block">' + esc(co(x.company_id).name) + "</span>" },
          { k: "shares", label: "Shares", num: true, val: (x) => x.shares, html: (x) => DOM.shares(x.shares) + '<span class="muted small block">' + pct(x.shares / DOM.fdShares(D(), x.company_id), 2) + " of company</span>" },
          { k: "full", label: "Sale", val: (x) => (x.full ? "Full" : "Partial"), html: (x) => (x.full ? "Full stake" : 'Partial <span class="chip warn" title="A new buyer becomes an extra member">Adds a member</span>') },
          { k: "elig", label: "Eligible from", val: (x) => DOM.lockUntil(hold(x), set()), html: (x) => dmy(DOM.lockUntil(hold(x), set())) },
          { k: "price", label: "Indicative price", num: true, val: (x) => x.indicative_price_paise, csv: (x) => (x.indicative_price_paise || 0) / 100, html: (x) => (x.indicative_price_paise ? rsPrice(x.indicative_price_paise) : "–") },
          { k: "status", label: "Status", val: (x) => x.status, html: (x) => chip(x.status === "completed" ? "ok" : ["rejected", "withdrawn"].includes(x.status) ? "bad" : "warn", x.status.replace(/_/g, " ")) + (x.status === "rofr" ? '<span class="muted small block">until ' + dmy(x.rofr_until) + "</span>" : x.buyer_investor_id ? '<span class="muted small block">buyer ' + esc(who(x.buyer_investor_id)) + "</span>" : "") },
          { k: "age", label: "Age", num: true, val: (x) => age(x.created_at), html: (x) => ageTxt(age(x.created_at)) },
          { k: "act", label: "Next step", sort: false, export: false, html: (x) => sellActions(x) },
        ] }) + "</section>";
  }
  function sellActions(x) {
    const b = (step, label, cls) => '<button class="btn ' + (cls || "ghost") + ' sm" data-act="a-sell" data-id="' + x.id + '" data-step="' + step + '">' + label + "</button>";
    const rej = b("reject", "Reject");
    return '<div class="row gap-s wrap">' + ({ submitted: b("review", "Start review", "primary") + rej, under_review: b("rofr", "Start first-refusal window", "primary") + rej, rofr: b("buyer", "Introduce buyer", "primary") + rej,
      buyer_introduced: b("spa", "Record SPA signed", "primary") + rej, spa_signed: b("complete", "Complete transfer", "primary") + rej }[x.status] || "") + "</div>";
  }
  function buyerOptions(x) {
    const h = D().holdings.find((y) => y.id === x.holding_id), holders = new Set(DOM.platformInvestors(D(), x.company_id));
    const leaving = x.full ? 1 : 0;
    return investors().filter((u) => u.id !== x.investor_id && (u.profile || {}).kyc === "verified").filter((u) => {
      if (holders.has(u.id)) return true;
      return holders.size + 1 - leaving <= set().max_platform_investors && mem(x.company_id) + 1 - leaving <= set().member_limit;
    }).map((u) => [u.id, (u.firm || u.name) + (holders.has(u.id) ? " (already a shareholder)" : "")]).concat(h ? [] : []);
  }

  // ---------- loans and transfers ----------
  const LT = [["submitted", "Requested"], ["eligibility", "Eligibility"], ["consent", "Borrower consent"], ["buyer_introduced", "Buyer introduced"], ["deed_signed", "Deed signed"], ["charge_updated", "Charge with ROC"], ["completed", "Complete"]];
  function loanTransfers() {
    const T = D().loan_transfers.slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return WS.head("Loan transfers", "Transfers of loan exposures between regulated banks and NBFCs. Check eligibility, get the borrower's consent, introduce a regulated buyer, then record the deed, the ROC charge and the fee (0.3% to 0.5%).") +
      '<section class="panel">' + KIT.table("a-lt", { name: "loan-transfers", rows: T, empty: { title: "No transfer requests", text: "Lenders request transfers from their loan pages." },
        columns: [
          { k: "co", label: "Borrower", val: (t) => co(loan(t).company_id).name, html: (t) => "<b>" + esc(co(loan(t).company_id).name) + '</b><span class="muted small block">from ' + esc(who(t.from_lender_id)) + "</span>" },
          { k: "out", label: "Outstanding", num: true, val: (t) => DOM.loanSummary(loan(t), today()).principal_pending, csv: (t) => DOM.loanSummary(loan(t), today()).principal_pending / 100, html: (t) => rs(DOM.loanSummary(loan(t), today()).principal_pending, true) + (t.amount_paise ? '<span class="muted small block">transfer ' + rs(t.amount_paise, true) + "</span>" : "") },
          { k: "ten", label: "Remaining", num: true, val: (t) => DOM.loanSummary(loan(t), today()).remaining_months, html: (t) => DOM.loanSummary(loan(t), today()).remaining_months + " months" },
          { k: "dscr", label: "Latest DSCR", val: (t) => dscrOf(co(loan(t).company_id)), html: (t) => (WS.lender ? WS.lender.dscr(co(loan(t).company_id)).html : "") },
          { k: "status", label: "Status", html: (t) => KIT.timeline(LT, t.status === "rejected" ? (t.history.slice().reverse().find((h) => h.status !== "rejected") || {}).status : t.status, null, t.status === "rejected" ? { label: "Rejected", reason: t.reason } : null) },
          { k: "act", label: "Next step", sort: false, export: false, html: (t) => (["completed", "rejected"].includes(t.status) ? (t.fee_paise ? "Fee " + rs(t.fee_paise) : "") : '<div class="row gap-s wrap"><button class="btn primary sm" data-act="a-lt" data-id="' + t.id + '">' + esc((LT[LT.findIndex((s) => s[0] === t.status) + 1] || ["", ""])[1]) + '</button><button class="btn ghost sm" data-act="a-lt-reject" data-id="' + t.id + '">Reject</button></div>') },
        ] }) + "</section>";
  }
  const loan = (t) => D().loans.find((l) => l.id === t.loan_id);
  function loansDesk() {
    const L = D().loans.filter((l) => l.status === "disbursed");
    return WS.head("Loans and DSCR", "Every disbursed loan arranged through Aegis Ascend, with repayment status and the latest quarterly DSCR.") +
      '<section class="panel">' + KIT.table("a-loans", { name: "loans", rows: L,
        columns: [{ k: "co", label: "Borrower", val: (l) => co(l.company_id).name, html: (l) => "<b>" + esc(co(l.company_id).name) + "</b>" }, { k: "lender", label: "Lender", val: (l) => who(l.lender_id), html: (l) => esc(who(l.lender_id)) },
          { k: "amt", label: "Disbursed", num: true, val: (l) => l.amount_paise, csv: (l) => l.amount_paise / 100, html: (l) => rs(l.amount_paise, true) },
          { k: "out", label: "Outstanding", num: true, val: (l) => DOM.loanSummary(l, today()).principal_pending, csv: (l) => DOM.loanSummary(l, today()).principal_pending / 100, html: (l) => rs(DOM.loanSummary(l, today()).principal_pending, true) },
          { k: "next", label: "Next instalment", val: (l) => DOM.loanSummary(l, today()).next_due, html: (l) => dmy(DOM.loanSummary(l, today()).next_due) },
          { k: "od", label: "Overdue", num: true, val: (l) => DOM.loanSummary(l, today()).overdue, html: (l) => (DOM.loanSummary(l, today()).overdue ? chip("bad", DOM.loanSummary(l, today()).overdue + " overdue") : chip("ok", "Up to date")) },
          { k: "dscr", label: "Latest DSCR", val: (l) => dscrOf(co(l.company_id)), html: (l) => (WS.lender ? WS.lender.dscr(co(l.company_id)).html : "") }] }) + "</section>";
  }

  // ---------- revaluation centre ----------
  function revaluations() {
    const L = D().companies.filter(funded).map((c) => ({ c, v: lastVal(c.id), due: revalDue(c) })).sort((a, b) => (a.due < b.due ? -1 : 1));
    return WS.head("Revaluation centre", "Every funded company is revalued each quarter by a registered valuer. Publishing updates every investor's portfolio and notifies them.") +
      (L.length ? '<div class="reval-list" data-stagger>' + L.map(({ c, v, due }) => { const d = DOM.daysBetween(today(), due);
        return '<section class="panel reval ' + (d < 0 ? "overdue" : "") + '"><div class="panel-head"><div><h2>' + esc(c.name) + '</h2><p class="muted">' + plat(c.id) + " platform investors · last " + (v ? rsPrice(v.price_per_share_paise) + " on " + dmy(v.date) + " (" + esc(v.method) + ")" : "none") + "</p></div>" +
          '<div class="reval-due"><b class="' + (d < 0 ? "t-bad" : d <= 14 ? "t-warn" : "") + '">' + (d < 0 ? "Overdue by " + ageTxt(-d) : "Due " + dmy(due)) + '</b><button class="btn ' + (d <= 14 ? "primary" : "ghost") + ' sm" data-act="a-reval" data-id="' + c.id + '">Revalue</button></div></div></section>'; }).join("") + "</div>"
        : '<section class="panel">' + KIT.empty("No funded companies", "Companies appear here once shares are allotted.") + "</section>");
  }

  // ---------- compliance ----------
  function compliance() {
    const C2 = D().companies.filter((c) => !["rejected", "closed"].includes(c.pipeline_stage));
    const locks = D().holdings.filter((h) => h.shares > 0 && today() < DOM.lockUntil(h, set())).sort((a, b) => (DOM.lockUntil(a, set()) < DOM.lockUntil(b, set()) ? -1 : 1));
    return WS.head("Compliance", "Section 42 offers, Section 2(68) members, platform investor caps, holding periods and filings, for every company.", '<a class="btn ghost" href="#app-activity">Open the audit log</a>') +
      '<div class="comp-grid" data-stagger>' + C2.map((c) => { const ck = c.checklist || {}, live = ["offering", "funded", "monitoring"].includes(c.pipeline_stage);
        const missing = live ? DOM.DOC_CHECKLIST.filter(([k]) => !ck[k] && !(c.pipeline_stage === "offering" && ["allotment", "pas3", "demat_credit"].includes(k))) : [];
        return '<section class="panel"><div class="panel-head"><h2><a href="#app-companyfile/' + c.id + '">' + esc(c.name) + "</a></h2>" + chip("", stageName(c.pipeline_stage)) + "</div>" +
          offerMeter(c.id) + memberMeter(c.id) + platMeter(c.id) +
          (missing.length ? '<p class="small"><b>Missing:</b> ' + missing.map(([, l]) => esc(l)).join("; ") + "</p>" : live ? '<p class="small t-good">Filings complete</p>' : "") + "</section>"; }).join("") + "</div>" +
      '<section class="panel"><h2>Holding-period timers</h2>' + KIT.table("a-locks", { name: "lock-ins", rows: locks, noSearch: true, empty: { title: "No holdings in lock-in", text: "" },
        columns: [{ k: "inv", label: "Investor", val: (h) => who(h.investor_id), html: (h) => esc(who(h.investor_id)) }, { k: "co", label: "Company", val: (h) => co(h.company_id).name, html: (h) => esc(co(h.company_id).name) },
          { k: "allot", label: "Allotted", val: (h) => h.allotment_date, html: (h) => dmy(h.allotment_date) }, { k: "until", label: "Locked until", val: (h) => DOM.lockUntil(h, set()), html: (h) => dmy(DOM.lockUntil(h, set())) },
          { k: "left", label: "Days left", num: true, val: (h) => DOM.daysBetween(today(), DOM.lockUntil(h, set())), html: (h) => String(DOM.daysBetween(today(), DOM.lockUntil(h, set()))) + (h.early_consent ? ' <span class="chip ok">Consent</span>' : "") }] }) + "</section>";
  }

  // ---------- audit log ----------
  function audit() {
    const rows = D().audit || [];
    const acts = [...new Set(rows.map((a) => a.action))].sort(), users = [...new Set(rows.map((a) => a.user_name))].sort();
    return WS.head("Audit log", "Append-only: every offer, revaluation, request, transfer and status change, with who, when, and the values before and after.") +
      '<section class="panel">' + KIT.table("a-audit", { name: "audit-log", rows, pageSize: 40,
        filters: [{ k: "action", label: "Action", options: acts.map((a) => [a, a.replace(/_/g, " ")]) }, { k: "user_name", label: "User", options: users.map((u) => [u, u]) }, { k: "company_id", label: "Company", options: D().companies.map((c) => [c.id, c.name]) }],
        columns: [{ k: "at", label: "When", html: (a) => UI.dt(a.at) }, { k: "user_name", label: "Who", html: (a) => esc(a.user_name) }, { k: "action", label: "Action", html: (a) => esc(a.action.replace(/_/g, " ")) },
          { k: "detail", label: "What changed", sort: false, csv: (a) => a.detail + (a.changes ? " | " + JSON.stringify(a.changes) : ""), html: (a) => esc(a.detail) + (a.changes && a.changes.length ? '<details class="diff"><summary>Before and after (' + a.changes.length + ")</summary>" + a.changes.map((ch) => '<div class="small"><b>' + esc(ch.collection) + " " + esc(ch.id) + "</b>" + Object.entries(ch.diff).map(([k, v]) => Array.isArray(v) ? '<div><code>' + esc(k) + "</code>: " + esc(short(v[0])) + " → " + esc(short(v[1])) + "</div>" : "<div>" + esc(k) + "</div>").join("") + "</div>").join("") + "</details>" : "") }] }) + "</section>";
  }
  const short = (v) => { const s = v === undefined ? "–" : JSON.stringify(v); return s.length > 90 ? s.slice(0, 87) + "..." : s; };

  // ---------- revenue ----------
  const KINDS = [["advisory", "Advisory fees"], ["success", "Success fees (2.5%)"], ["revenue_share", "Revenue share (0.4%)"], ["monitoring", "Debt monitoring"], ["transfer", "Transfer fees"]];
  function invoiceTable(id, F, compact) {
    return KIT.table(id, { name: "invoices", rows: F, noSearch: compact, pageSize: compact ? 8 : 25, empty: { title: "No invoices", text: "" },
      filters: compact ? [] : [{ k: "kind", label: "Fee", options: KINDS }, { k: "st", label: "Status", options: [["paid", "Paid"], ["due", "Due"], ["overdue", "Overdue"]], match: (f, v) => (f.paid_on ? "paid" : f.due < today() ? "overdue" : "due") === v }],
      columns: [{ k: "kind", label: "Fee", html: (f) => esc((KINDS.find((k) => k[0] === f.kind) || [f.kind, f.kind])[1]) + '<span class="muted small block">' + esc(compact ? f.period : co(f.company_id).name + " · " + f.period) + "</span>" },
        { k: "amount_paise", label: "Amount", num: true, csv: (f) => f.amount_paise / 100, html: (f) => rs(f.amount_paise) }, { k: "gst_paise", label: "GST 18%", num: true, csv: (f) => f.gst_paise / 100, html: (f) => rs(f.gst_paise) },
        { k: "due", label: "Due", html: (f) => dmy(f.due) },
        { k: "paid_on", label: "Status", val: (f) => f.paid_on || "", html: (f) => (f.paid_on ? chip("ok", "Paid " + dmy(f.paid_on)) : chip(f.due < today() ? "bad" : "warn", f.due < today() ? "Overdue" : "Due") + ' <button class="linkbtn small" data-act="a-paid" data-id="' + f.id + '">Mark paid</button>') }] });
  }
  function revenue() {
    const F = D().invoices, sum = (L) => L.reduce((a, f) => a + f.amount_paise, 0);
    const months = []; for (let k = -11; k <= 0; k++) months.push(DOM.addMonths(today().slice(0, 8) + "01", k).slice(0, 7));
    const ser = KINDS.map(([k, l], i) => ({ name: l, color: ["var(--s-equity)", "var(--s-mix)", "var(--gold-ink, #7B5C1F)", "var(--s-debt)", "var(--muted)"][i], values: months.map((m) => sum(F.filter((f) => f.kind === k && (f.paid_on || f.issued).slice(0, 7) === m)) / 1e7) }));
    return WS.head("Revenue", "Every fee Aegis Ascend earns, with GST at 18%. Revenue share is 0.4% of revenue for 5 years; monitoring 0.25% to 0.5% a year; transfers 0.3% to 0.5%.", '<button class="btn ghost" data-act="a-invoice">Raise invoice</button>') +
      '<div class="kpis k5" data-stagger>' + KINDS.map(([k, l]) => { const L = F.filter((f) => f.kind === k), paid = L.filter((f) => f.paid_on), due = L.filter((f) => !f.paid_on);
        return '<div class="kpi"><small>' + esc(l) + "</small><b>" + rs(sum(paid), true) + '</b><span>paid · ' + rs(sum(due), true) + " due</span></div>"; }).join("") + "</div>" +
      '<section class="panel"><h2>Fees by month</h2>' + UI.stack(months.map((m) => my(m + "-01")), ser, { fmt: (v) => "Rs " + UI.n(v, 2) + " L", yfmt: (y) => UI.n(y, 0) + " L", label: "Fees invoiced or received by month, Rs lakh", height: 240 }) + "</section>" +
      '<section class="panel"><h2>Invoices</h2>' + invoiceTable("a-rev", F.slice().sort((a, b) => (a.issued < b.issued ? 1 : -1)), false) + "</section>";
  }

  // ---------- notes and tasks ----------
  function subjectName(n) { return n.subject_type === "company" ? co(n.subject_id).name : who(n.subject_id); }
  function notesList(N) {
    return N.length ? '<ul class="notes2">' + N.map((n) => '<li class="' + (n.done ? "done" : n.due && n.due < today() ? "late" : "") + '"><label class="chk"><input type="checkbox" data-act="a-note-toggle" data-id="' + n.id + '"' + (n.done ? " checked" : "") + "> " + esc(n.text) + '</label><span class="muted small">' + (n.due ? "due " + dmy(n.due) : "no due date") + "</span></li>").join("") + "</ul>" : '<p class="muted">No notes yet.</p>';
  }
  function tasks() {
    const N = D().notes.slice().sort((a, b) => (a.done - b.done) || ((a.due || "9") < (b.due || "9") ? -1 : 1));
    return WS.head("Notes and tasks", "On any investor, lender or company. Tasks with a due date show on Today.", '<button class="btn primary" data-act="a-note">Add note</button>') +
      '<section class="panel">' + KIT.table("a-notes", { name: "notes", rows: N, filters: [{ k: "subject_type", label: "About", options: [["company", "Company"], ["investor", "Investor"], ["lender", "Lender"]] }, { k: "st", label: "Status", options: [["open", "Open"], ["done", "Done"]], match: (n, v) => (v === "done") === n.done }],
        empty: { title: "No notes yet", text: "Add a note or task about an investor, lender or company.", action: '<button class="btn primary" data-act="a-note">Add note</button>' },
        columns: [{ k: "text", label: "Note", html: (n) => '<label class="chk"><input type="checkbox" data-act="a-note-toggle" data-id="' + n.id + '"' + (n.done ? " checked" : "") + '> <span class="' + (n.done ? "muted strike" : "") + '">' + esc(n.text) + "</span></label>" },
          { k: "about", label: "About", val: (n) => subjectName(n), html: (n) => esc(subjectName(n)) + '<span class="muted small block">' + n.subject_type + "</span>" },
          { k: "due", label: "Due", val: (n) => n.due || "", html: (n) => (n.due ? '<span class="' + (!n.done && n.due < today() ? "t-bad" : "") + '">' + dmy(n.due) + "</span>" : "–") }] }) + "</section>";
  }

  // ---------- message templates ----------
  const TPL_KEY = "aegis_offer_templates_v1";
  const TPL_DEFAULT = { subject: "Private offer: {company_name}", body: "Dear {investor_name},\n\n{company_name} ({sector}) is raising {raise}. Its debt vs equity report has been reviewed and signed off by our advisors, and you can read it in your Aegis Ascend workspace under Opportunities.\n\nThis is a private offer made to you personally. Please do not forward it.\n\nRegards,\n{advisor_name}\nAegis Ascend Financial Advisors" };
  function loadTpl() { try { return Object.assign({}, TPL_DEFAULT, JSON.parse(localStorage.getItem(TPL_KEY) || "{}")); } catch (e) { return Object.assign({}, TPL_DEFAULT); } }
  function fill(t, u, c) { return t.replace(/\{investor_name\}/g, u.name).replace(/\{investor_firm\}/g, u.firm || u.name).replace(/\{company_name\}/g, c.name).replace(/\{sector\}/g, c.sector).replace(/\{raise\}/g, rs(c.raise_paise, true)).replace(/\{offer_price\}/g, c.offer_price_paise ? rsPrice(c.offer_price_paise) : "the offer price").replace(/\{advisor_name\}/g, S.user.name); }
  function templates() {
    const t = loadTpl(), offered = D().offers.filter((o) => o.fy === fyNow()).sort((a, b) => (a.sent_at < b.sent_at ? 1 : -1));
    const cid = S.tplCo || (offered[0] && offered[0].company_id) || (D().companies[0] || {}).id, c = co(cid);
    const recips = offered.filter((o) => o.company_id === cid).map((o) => person(o.investor_id)).filter((u) => u.id);
    return WS.head("Message templates", "Write once, then send individually addressed private messages to investors who already have the offer in their workspace. Nothing is sent from here: each button opens your email or WhatsApp with one message for one person.") +
      '<div class="grid2"><section class="panel"><h2>Template</h2><form class="form" data-form="a-tpl"><label class="fld"><span>Email subject</span><span class="in"><input name="subject" value="' + esc(t.subject) + '"></span></label>' +
      '<label class="fld"><span>Message</span><span class="in"><textarea name="body" rows="11">' + esc(t.body) + "</textarea></span></label>" +
      '<p class="small muted">Placeholders: {investor_name} {investor_firm} {company_name} {sector} {raise} {offer_price} {advisor_name}</p><div class="row gap-s"><button class="btn primary" type="submit">Save template</button><button class="btn ghost" type="button" data-act="a-tpl-reset">Restore default</button></div></form></section>' +
      '<section class="panel"><h2>Send for a company</h2><label class="fld"><span>Company</span><span class="in"><select data-act="a-tpl-co">' + D().companies.map((x) => '<option value="' + x.id + '"' + (x.id === cid ? " selected" : "") + ">" + esc(x.name) + "</option>").join("") + "</select></span></label>" +
      (recips.length ? '<ul class="msgs">' + recips.map((u) => { const body = fill(t.body, u, c), sub = fill(t.subject, u, c);
        return "<li><div><b>" + esc(u.firm || u.name) + '</b><span class="muted small block">' + esc(u.name) + (u.email ? " · " + esc(u.email) : "") + '</span></div><div class="row gap-s"><a class="btn ghost sm" href="mailto:' + encodeURIComponent(u.email || "") + "?subject=" + encodeURIComponent(sub) + "&body=" + encodeURIComponent(body) + '">Email</a><a class="btn ghost sm" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(body) + '">WhatsApp</a><button class="btn ghost sm" data-act="a-copy" data-text="' + esc(body) + '">Copy</button></div></li>'; }).join("") + "</ul>"
        : KIT.empty("Nobody to message yet", "Share the offer from the investor directory first; messages go only to investors who already hold this company's offer.")) + "</section></div>";
  }

  // ---------- companies (readiness and reports) and deal rooms ----------
  function companies() {
    return WS.head("Companies", "All client companies, with readiness scores and report status. Open any company in the Funding Twin to prepare its report.") +
      '<section class="panel">' + KIT.table("a-cos", { name: "companies", rows: D().companies,
        columns: [{ k: "name", label: "Company", html: (c) => '<a href="#app-companyfile/' + c.id + '"><b>' + esc(c.name) + "</b></a>" }, { k: "sector", label: "Sector" },
          { k: "revenue", label: "Revenue", num: true, html: (c) => UI.cr(c.revenue, 0) }, { k: "raise", label: "Raise", num: true, html: (c) => UI.cr(c.raise, 0) },
          { k: "debt", label: "Debt ready", num: true, val: (c) => GB.readiness(c.readiness).debt.score, html: (c) => String(GB.readiness(c.readiness).debt.score) },
          { k: "equity", label: "Equity ready", num: true, val: (c) => GB.readiness(c.readiness).equity.score, html: (c) => String(GB.readiness(c.readiness).equity.score) },
          { k: "report", label: "Report", val: (c) => (WS.latestReport(c.id) || {}).status || "", html: (c) => (WS.latestReport(c.id) ? WS.statusChip(WS.latestReport(c.id).status) : "None") },
          { k: "act", label: "", sort: false, export: false, html: (c) => '<button class="linkbtn" data-act="open-twin" data-id="' + c.id + '">Funding Twin</button>' }] }) + "</section>";
  }
  function intros() {
    const I = (D().intros || []).slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return WS.head("Deal rooms", "Investors who asked for a company's deal room after receiving its offer. The founder grants access; the investor signs the NDA; every document view is logged.") +
      '<section class="panel">' + KIT.table("a-intros", { name: "deal-rooms", rows: I, filters: [{ k: "status", label: "Status", options: [["requested", "Requested"], ["granted", "Granted"], ["declined", "Declined"]] }],
        empty: { title: "No deal-room requests", text: "Investors request access from their curated deals." },
        columns: [{ k: "co", label: "Company", val: (i) => co(i.company_id).name, html: (i) => esc(co(i.company_id).name) }, { k: "inv", label: "Investor", val: (i) => who(i.investor_id), html: (i) => esc(who(i.investor_id)) },
          { k: "status", label: "Status", html: (i) => WS.statusChip(i.status) }, { k: "nda", label: "NDA", val: (i) => i.nda_signed_at || "", html: (i) => (i.nda_signed_at ? dmy(i.nda_signed_at.slice(0, 10)) : "–") },
          { k: "views", label: "Document views", num: true, val: (i) => (i.views || []).length, html: (i) => String((i.views || []).length) },
          { k: "offer", label: "Offer", sort: false, html: (i) => { const o = D().offers.find((x) => x.company_id === i.company_id && x.investor_id === i.investor_id); return o ? chip(o.response === "interested" || o.response === "invested" ? "ok" : o.response === "declined" ? "bad" : "warn", o.response) + (o.response === "interested" ? ' <button class="linkbtn small" data-act="a-allot" data-id="' + o.id + '">Record allotment</button>' : "") : "–"; } }] }) + "</section>";
  }

  // ---------- settings ----------
  function settingsPage() {
    const s = set();
    return WS.head("Settings", "Limits the platform enforces on the server for every action.") +
      '<section class="panel"><form class="form" data-form="a-settings"><div class="fields f3"><label class="fld"><span>Platform investors per company</span><span class="in"><input name="max" type="number" min="1" max="200" value="' + s.max_platform_investors + '"></span><small class="muted">Default 20. Changing it is recorded in the audit log.</small></label></div><button class="btn primary" type="submit">Save</button></form>' +
      '<ul class="ticks"><li>Offers: warn at ' + s.offer_warn + ", block at " + s.offer_limit + " per company per financial year per security type (Section 42)</li><li>Members: warn at " + s.member_warn + ", block at " + s.member_limit + " (Section 2(68))</li><li>Minimum holding: " + s.lock_months + " months from allotment, unless the founder consents in writing</li></ul></section>";
  }

  // ---------- actions ----------
  const act = (name, p, msg) => API.act(name, p).then((r) => WS.after(r, msg));
  Object.assign(WS.clicks, {
    "a-pipeview": (b, id) => { S.pipeView = id; return WS.render({ keepScroll: true }); },
    "a-pick-co": (b, id) => { S.offerCo = id; },
    "a-shortlist": () => {
      const c = co(S.offerCo), sec = c.security_type || "equity", offered = new Set(D().offers.filter((o) => o.company_id === c.id && o.fy === fyNow() && o.security_type === sec).map((o) => o.investor_id));
      const left = set().offer_limit - used(c.id, sec);
      const top = investors().filter((u) => (u.profile || {}).kyc === "verified" && !offered.has(u.id)).map((u) => ({ u, f: GB.fitScore(Object.assign({}, c, { raise: (c.raise_paise || 0) / 1e9 }), u).score })).filter((x) => x.f >= 60).sort((a, b) => b.f - a.f).slice(0, Math.min(10, left));
      const t = top.map((x) => x.u.id);
      KIT.select("a-dir", t);
      KIT.toast(t.length ? "Selected " + t.length + " verified investors with a fit score of 60 or more who have not had this offer." : "No new verified investors score 60 or more for this company.");
      return WS.render({ keepScroll: true });
    },
    "a-share": async () => {
      const c = co(S.offerCo), sec = c.security_type || "equity", ids = KIT.selected("a-dir"), n = used(c.id, sec), lim = set().offer_limit;
      const offered = new Set(D().offers.filter((o) => o.company_id === c.id && o.fy === fyNow() && o.security_type === sec).map((o) => o.investor_id));
      const fresh = ids.filter((i) => !offered.has(i)), unverified = fresh.filter((i) => (person(i).profile || {}).kyc !== "verified");
      if (unverified.length) return KIT.toast(unverified.map(who).join(", ") + (unverified.length === 1 ? " has" : " have") + " not completed KYC. Deselect them first.", "bad");
      const over = n + fresh.length > lim;
      if (!(await KIT.dialog({ title: "Share " + c.name + " with " + fresh.length + " investor" + (fresh.length === 1 ? "" : "s") + "?", confirm: over ? "Blocked" : "Share offer", danger: over,
        text: '<p>Offers this financial year (' + fyNow() + ", " + sec + "): <b>" + n + " / " + lim + "</b> now, <b>" + (n + fresh.length) + " / " + lim + "</b> after sending.</p>" +
          (over ? '<p class="t-bad">Blocked: this would exceed the Section 42 limit of ' + lim + " offers. Select at most " + (lim - n) + ".</p>" : n + fresh.length >= set().offer_warn ? '<p class="t-warn">Above ' + set().offer_warn + ": plan the remaining offers carefully.</p>" : "") +
          '<ul class="small">' + fresh.map((i) => "<li>" + esc(who(i)) + "</li>").join("") + "</ul><p class=\"small muted\">Each investor gets a private offer in their workspace. Nothing is published.</p>",
        validate: () => (over ? "Too many investors selected: " + (lim - n) + " offers left this year." : null) }))) return;
      await act("share_offer", { company_id: c.id, investor_ids: fresh, security_type: sec });
      KIT.clearSel("a-dir"); WS.render({ keepScroll: true });
    },
    "a-kyc": async (b, id) => {
      const u = person(id), v = await KIT.dialog({ title: "KYC and accreditation: " + (u.firm || u.name), confirm: "Save",
        fields: [{ name: "kyc", label: "KYC status", type: "select", value: (u.profile || {}).kyc || "not_started", options: [["verified", "Verified"], ["pending", "Pending"], ["not_started", "Not started"]] }, { name: "acc", label: "Accredited investor", type: "checkbox", value: !!(u.profile || {}).accredited }] });
      if (v) return act("set_investor_profile", { investor_id: id, kyc: v.kyc, accredited: v.acc });
    },
    "a-sell": async (b, id) => {
      const x = D().sell_requests.find((y) => y.id === id), step = b.dataset.step, c = co(x.company_id);
      if (step === "review") return act("sell_step", { request_id: id, step });
      if (step === "rofr") { const v = await KIT.dialog({ title: "Start the first-refusal window", text: "<p>The company's nominees and existing shareholders get first right to buy " + DOM.shares(x.shares) + " shares, as the SHA requires.</p>", confirm: "Start window", fields: [{ name: "days", label: "Window length", type: "number", value: 21, min: 15, max: 30, unit: "days", hint: "15 to 30 days" }], validate: (v) => (+v.days >= 15 && +v.days <= 30 ? null : "Choose 15 to 30 days") }); if (v) return act("sell_step", { request_id: id, step, days: +v.days }); return; }
      if (step === "buyer") {
        const opts = buyerOptions(x), early = today() < x.rofr_until;
        if (!opts.length) return KIT.toast("No verified investor can buy without breaking the 20-investor or 200-member limit.", "bad");
        const v = await KIT.dialog({ title: "Introduce a buyer", confirm: "Introduce", text: "<p>Introductions are one to one and do not count as a Section 42 offer. Only investors who keep the company within its limits are listed.</p>" + (!x.full ? '<p class="t-warn">This is a part sale: a new buyer adds a member (' + mem(c.id) + " / " + set().member_limit + " now).</p>" : "") + (early ? '<p class="t-warn">The first-refusal window runs until ' + dmy(x.rofr_until) + ". Tick the waiver only if every rights-holder has waived in writing.</p>" : ""),
          fields: [{ name: "buyer", label: "Buyer", type: "select", options: opts }].concat(early ? [{ name: "waived", label: "Rights-holders have waived first refusal in writing", type: "checkbox" }] : []), validate: (v) => (early && !v.waived ? "Wait for the window to end, or record a written waiver" : null) });
        if (v) return act("sell_step", { request_id: id, step, buyer_investor_id: v.buyer, waived: !!v.waived });
        return;
      }
      if (step === "spa") { const v = await KIT.dialog({ title: "Record the signed SPA", confirm: "Record SPA", fields: [{ name: "date", label: "SPA date", type: "date", value: today(), max: today() }, { name: "price", label: "Agreed price per share", type: "number", min: 0, step: "0.01", unit: "Rs", value: x.indicative_price_paise ? x.indicative_price_paise / 100 : "" }], validate: (v) => (+v.price > 0 ? null : "Enter the agreed price") }); if (v) return act("sell_step", { request_id: id, step, spa_date: v.date, price_paise: Math.round(+v.price * 100) }); return; }
      if (step === "complete") {
        const h = D().holdings.find((y) => y.id === x.holding_id), full = h && h.shares === x.shares, newBuyer = !DOM.platformInvestors(D(), c.id).includes(x.buyer_investor_id);
        const m2 = mem(c.id) + (newBuyer ? 1 : 0) - (full ? 1 : 0), p2 = plat(c.id) + (newBuyer ? 1 : 0) - (full ? 1 : 0);
        if (await KIT.confirm("Complete the transfer?", "<p>" + DOM.shares(x.shares) + " shares move from " + esc(who(x.investor_id)) + " to " + esc(who(x.buyer_investor_id)) + " at " + rsPrice(x.price_paise) + ". Both portfolios, the cap table and the member count update.</p><p>After the transfer: members <b>" + m2 + " / " + set().member_limit + "</b>, platform investors <b>" + p2 + " / " + set().max_platform_investors + "</b>.</p><p class=\"small muted\">This cannot be undone.</p>", "Complete transfer")) return act("sell_step", { request_id: id, step });
        return;
      }
      if (step === "reject") { const v = await KIT.dialog({ title: "Reject this request", danger: true, confirm: "Reject", fields: [{ name: "reason", label: "Reason (shared with the investor)", type: "textarea", required: true }], validate: (v) => (v.reason.trim() ? null : "Give a reason") }); if (v) return act("sell_step", { request_id: id, step, reason: v.reason }); }
    },
    "a-consent": async (b, id) => { const v = await KIT.dialog({ title: "Record the founder's written consent", text: "<p>Allows this investor to request a sale before the 6-month minimum holding. Keep the signed letter on file.</p>", confirm: "Record consent", fields: [{ name: "note", label: "Who signed, and the letter's date", type: "text", required: true }], validate: (v) => (v.note.trim() ? null : "Describe the consent") }); if (v) return act("record_consent", { holding_id: id, note: v.note }); },
    "a-lt": async (b, id) => {
      const t = D().loan_transfers.find((x) => x.id === id), next = LT[LT.findIndex((s) => s[0] === t.status) + 1][0];
      if (next === "buyer_introduced") { const opts = (D().directory || []).filter((u) => u.role === "lender" && u.id !== t.from_lender_id && (u.profile || {}).regulated).map((u) => [u.id, u.firm + " (" + ((u.profile || {}).lender_type || "") + ")"]); const v = await KIT.dialog({ title: "Introduce a buyer lender", text: "<p>Regulated banks and NBFCs only.</p>", confirm: "Introduce", fields: [{ name: "buyer", label: "Buyer", type: "select", options: opts }] }); if (v) return act("loan_transfer_step", { transfer_id: id, step: next, buyer_lender_id: v.buyer }); return; }
      if (next === "completed") { const l = loan(t), base = t.amount_paise || DOM.loanSummary(l, today()).principal_pending; const v = await KIT.dialog({ title: "Complete the transfer", text: "<p>The loan moves to " + esc(who(t.buyer_lender_id)) + "'s book. Transfer amount " + rs(base) + ".</p>", confirm: "Complete transfer", fields: [{ name: "rate", label: "Transfer fee", type: "number", value: 0.4, min: 0.3, max: 0.5, step: "0.05", unit: "%", hint: "0.3% to 0.5%, paid by the selling lender, plus GST" }], validate: (v) => (+v.rate >= 0.3 && +v.rate <= 0.5 ? null : "The fee is 0.3% to 0.5%") }); if (v) return act("loan_transfer_step", { transfer_id: id, step: next, fee_rate: +v.rate / 100 }); return; }
      const label = { eligibility: "Check eligibility: regulated seller, RBI minimum holding period met?", consent: "Record the borrower's consent?", deed_signed: "Record the signed deed of assignment?", charge_updated: "Record the charge updated with the ROC?" }[next];
      if (await KIT.confirm(label, "", "Confirm")) return act("loan_transfer_step", { transfer_id: id, step: next });
    },
    "a-lt-reject": async (b, id) => { const v = await KIT.dialog({ title: "Reject this transfer", danger: true, confirm: "Reject", fields: [{ name: "reason", label: "Reason", type: "textarea" }], validate: (v) => (v.reason.trim() ? null : "Give a reason") }); if (v) return act("loan_transfer_step", { transfer_id: id, step: "reject", reason: v.reason }); },
    "a-reval": async (b, id) => {
      const c = co(id), v0 = lastVal(id);
      const v = await KIT.dialog({ title: "Revalue " + c.name, confirm: "Review and publish",
        text: "<p>Last valuation: " + (v0 ? rsPrice(v0.price_per_share_paise) + " on " + dmy(v0.date) + " (" + esc(v0.method) + ")" : "none") + ".</p>",
        fields: [{ name: "date", label: "Valuation date", type: "date", value: today(), max: today() }, { name: "method", label: "Method", type: "select", value: "DCF", options: [["DCF", "Discounted cash flow (DCF)"], ["Market multiples", "Market multiples"]] },
          { name: "price", label: "Price per share", type: "number", min: 0, step: "0.01", unit: "Rs" }, { name: "valuer", label: "Registered valuer", type: "text", value: v0 ? v0.valuer : "" }, { name: "file", label: "Valuer's report (PDF)", type: "file", accept: ".pdf,.xlsx,.docx" }],
        validate: (x) => (!(+x.price > 0) ? "Enter the price per share" : !x.valuer.trim() ? "Enter the registered valuer" : !x.date || x.date > today() ? "The date cannot be in the future" : null) });
      if (!v) return;
      const p = Math.round(+v.price * 100), H = D().holdings.filter((h) => h.company_id === id && h.shares > 0), delta = v0 ? H.reduce((a, h) => a + h.shares, 0) * (p - v0.price_per_share_paise) : 0;
      if (!(await KIT.confirm("Publish this valuation?", "<p>" + rsPrice(p) + " a share" + (v0 ? " (" + (p >= v0.price_per_share_paise ? "+" : "") + pct(p / v0.price_per_share_paise - 1, 1) + ")" : "") + ". " + H.length + " investors' portfolios change by " + rs(delta, true) + " in total, and each is notified.</p>", "Publish"))) return;
      let fileId = null;
      if (v.file) fileId = (await API.upload(v.file, { company_id: id, purpose: "valuation_report" })).id;
      return act("publish_valuation", { company_id: id, date: v.date, method: v.method, price_per_share_paise: p, valuer: v.valuer, file_id: fileId });
    },
    "a-allot": async (b, id) => {
      const o = D().offers.find((x) => x.id === id), c = co(o.company_id), price = c.offer_price_paise || 0, isNew = !DOM.platformInvestors(D(), c.id).includes(o.investor_id);
      const v = await KIT.dialog({ title: "Record allotment: " + who(o.investor_id), confirm: "Record allotment",
        text: "<p>After this allotment: platform investors <b>" + (plat(c.id) + (isNew ? 1 : 0)) + " / " + set().max_platform_investors + "</b>, members <b>" + (mem(c.id) + (isNew ? 1 : 0)) + " / " + set().member_limit + "</b>.</p>",
        fields: [{ name: "shares", label: "Shares allotted", type: "number", min: 1, step: 1 }, { name: "amount", label: "Amount received", type: "number", min: 0, step: "0.01", unit: "Rs", hint: price ? "At the offer price of " + rsPrice(price) + " a share" : "" }, { name: "date", label: "Allotment date (shares credited to demat)", type: "date", value: today(), max: today() }],
        validate: (x) => (!(+x.shares > 0) ? "Enter the shares" : !(+x.amount > 0) ? "Enter the amount received" : null) });
      if (v) return act("allot_shares", { offer_id: id, shares: +v.shares, amount_paise: Math.round(+v.amount * 100), allotment_date: v.date });
    },
    "a-cap": async (b, id) => {
      const e = b.dataset.entry && D().cap_table.find((x) => x.id === b.dataset.entry);
      const v = await KIT.dialog({ title: e ? "Edit " + e.holder_name : "Add a founder or existing shareholder", confirm: "Save",
        fields: [{ name: "name", label: "Holder (or group, e.g. Employees)", value: e ? e.holder_name : "" }, { name: "type", label: "Type", type: "select", value: e ? e.holder_type : "existing", options: [["founder", "Founder"], ["existing", "Existing shareholder"]] },
          { name: "shares", label: "Shares", type: "number", min: 0, step: 1, value: e ? e.shares : "" }, { name: "holders", label: "Number of holders in this row", type: "number", min: 1, step: 1, value: e ? e.holders || 1 : 1, hint: "Each holder counts as a member towards the 200 limit" }],
        validate: (x) => (!x.name.trim() || !(+x.shares >= 0) || !(+x.holders >= 1) ? "Enter the holder, shares and number of holders" : null) });
      if (v) return act("save_cap_entry", { company_id: id, entry_id: e ? e.id : null, holder_name: v.name, holder_type: v.type, shares: +v.shares, holders: +v.holders });
    },
    "a-terms": async (b, id) => {
      const c = co(id), v = await KIT.dialog({ title: "Offer terms: " + c.name, confirm: "Save",
        fields: [{ name: "price", label: "Offer price per share", type: "number", min: 0, step: "0.01", unit: "Rs", value: (c.offer_price_paise || 0) / 100 }, { name: "sec", label: "Security offered", type: "select", value: c.security_type || "equity", options: DOM.SECURITY_TYPES.map((s) => [s, s.charAt(0).toUpperCase() + s.slice(1)]) },
          { name: "extra", label: "Unissued options and convertibles (for fully diluted shares)", type: "number", min: 0, step: 1, value: c.fd_extra_shares || 0 }] });
      if (v) return act("save_company", { company_id: id, patch: { offer_price_paise: Math.round(+v.price * 100), security_type: v.sec, fd_extra_shares: +v.extra } });
    },
    "a-external": async (b, id) => {
      const c = co(id), sec = c.security_type || "equity", cur = (((c.external_offers || {})[fyNow()]) || {})[sec] || 0;
      const v = await KIT.dialog({ title: "Offers made outside the platform", text: "<p>The Section 42 limit of " + set().offer_limit + " counts every person " + esc(c.name) + " offered " + sec + " to in FY " + fyNow() + ", including offers it made directly.</p>", confirm: "Save",
        fields: [{ name: "n", label: "Off-platform offers in FY " + fyNow(), type: "number", min: 0, step: 1, value: cur }] });
      if (v) return act("set_external_offers", { company_id: id, fy: fyNow(), security_type: sec, count: +v.n });
    },
    "a-check": async (b) => {
      const id = b.dataset.id, item = b.dataset.item, on = b.checked;
      if (on) { const v = await KIT.dialog({ title: (DOM.DOC_CHECKLIST.find((x) => x[0] === item) || [])[1], confirm: "Mark done", fields: [{ name: "date", label: "Date", type: "date", value: today(), max: today() }] }); if (!v) { b.checked = false; return; } return act("set_checklist", { company_id: id, item, date: v.date }); }
      return act("set_checklist", { company_id: id, item, date: null });
    },
    "a-update": async (b, id) => { const v = await KIT.dialog({ title: "Post a company update", text: "<p>Shareholders on the platform are notified.</p>", confirm: "Post", fields: [{ name: "text", label: "Update", type: "textarea" }], validate: (x) => (x.text.trim() ? null : "Write the update") }); if (v) return act("post_update", { company_id: id, text: v.text }); },
    "a-invoice": async (b, id) => {
      const lenders = (D().directory || []).filter((u) => u.role === "lender");
      const v = await KIT.dialog({ title: "Raise an invoice", confirm: "Raise invoice", fields: [{ name: "co", label: "Company", type: "select", value: id || "", options: D().companies.map((c) => [c.id, c.name]) }, { name: "kind", label: "Fee", type: "select", options: KINDS },
        { name: "lender", label: "Payer lender (monitoring and transfer fees)", type: "select", options: lenders.map((u) => [u.id, u.firm]) }, { name: "period", label: "Period or description" }, { name: "amount", label: "Amount before GST", type: "number", min: 0, step: "0.01", unit: "Rs" }, { name: "due", label: "Due date", type: "date", value: DOM.addDays(today(), 15) }],
        validate: (x) => (+x.amount > 0 ? null : "Enter the amount") });
      if (v) return act("save_invoice", { company_id: v.co, kind: v.kind, payer_id: v.lender, period: v.period, amount_paise: Math.round(+v.amount * 100), due: v.due });
    },
    "a-paid": async (b, id) => { if (await KIT.confirm("Mark this invoice paid today?", "", "Mark paid")) return act("mark_invoice_paid", { invoice_id: id }); },
    "a-note": async (b, id) => {
      const opts = [["company", "Company"], ["investor", "Investor"], ["lender", "Lender"]];
      const subjects = D().companies.map((c) => ["company:" + c.id, "Company · " + c.name]).concat((D().directory || []).filter((u) => u.role === "investor" || u.role === "lender").map((u) => [u.role + ":" + u.id, (u.role === "investor" ? "Investor · " : "Lender · ") + (u.firm || u.name)]));
      const v = await KIT.dialog({ title: "Add a note or task", confirm: "Add", fields: [{ name: "about", label: "About", type: "select", value: id ? (b.dataset.type || "company") + ":" + id : subjects[0][0], options: subjects }, { name: "text", label: "Note", type: "textarea" }, { name: "due", label: "Due date (optional, makes it a task)", type: "date" }], validate: (x) => (x.text.trim() ? null : "Write the note") });
      if (!v) return; const [t, sid] = v.about.split(":"); void opts;
      return act("save_note", { subject_type: t, subject_id: sid, text: v.text, due: v.due || null });
    },
    "a-note-toggle": (b, id) => act("toggle_note", { note_id: id }),
    "a-copy": async (b) => { try { await navigator.clipboard.writeText(b.dataset.text); KIT.toast("Message copied."); } catch (e) { KIT.toast("Copy is blocked here; select the text in the template instead.", "bad"); } },
    "a-tpl-reset": () => { try { localStorage.removeItem(TPL_KEY); } catch (e) { /* storage blocked */ } return WS.render({ keepScroll: true }); },
  });
  Object.assign(WS.forms, {
    "a-tpl": (f, v) => { try { localStorage.setItem(TPL_KEY, JSON.stringify({ subject: v.subject, body: v.body })); KIT.toast("Template saved in this browser."); } catch (e) { KIT.toast("Could not save the template here.", "bad"); } return WS.render({ keepScroll: true }); },
    "a-settings": (f, v) => act("save_settings", { max_platform_investors: +v.max }),
  });
  document.addEventListener("change", (e) => {
    if (e.target.matches('[data-act="a-offer-co"]')) { S.offerCo = e.target.value; WS.render({ keepScroll: true }); }
    if (e.target.matches('[data-act="a-tpl-co"]')) { S.tplCo = e.target.value; WS.render({ keepScroll: true }); }
  });
  document.addEventListener("dt-change", (e) => {
    if (e.detail.id !== "a-dir") return;
    const btn = document.querySelector('[data-act="a-share"]'); if (!btn) return;
    const n = e.detail.selected.length; btn.disabled = !n; btn.textContent = "Share offer with " + n + " selected";
  });
  Object.assign(WS.PAGES.advisor, { "app-companies": companies, "app-intros": intros, app: todayPage, "app-pipeline": pipeline, "app-companyfile": companyFile, "app-directory": directory, "app-requests": requests, "app-revaluations": revaluations,
    "app-loantransfers": loanTransfers, "app-loansdesk": loansDesk, "app-compliance": compliance, "app-revenue": revenue, "app-tasks": tasks, "app-templates": templates, "app-activity": audit, "app-settings": settingsPage });
})(typeof globalThis !== "undefined" ? globalThis : this);
```


---

## 6. Standalone pages and build tools

Pages built beside the main one, and the scripts that build them.

### `site/cma-lock.html`

The 'Advisors only' page shown instead of the CMA tool to anyone else.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>CMA funding report | Aegis Ascend</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600&family=Hanken+Grotesk:wght@400;500;600&display=swap">
<style>
:root{--obsidian:#0D0E10;--obsidian-2:#151411;--gold:#C9A04F;--gold-1:#E8C77B;--gold-line:rgba(201,160,79,.32);--ivory:#F4EFE6;--ivory-2:#CFC8BA;--ivory-3:#ABA497;--ease:cubic-bezier(.16,1,.3,1)}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%}
body{min-height:100vh;display:grid;place-items:center;padding:24px 16px;background:linear-gradient(180deg,var(--obsidian) 0%,rgba(13,14,16,.9) 45%,rgba(13,14,16,.35) 100%),url("assets/skyline.svg") center bottom/max(100%,1100px) auto no-repeat,var(--obsidian);color:var(--ivory);font:16px/1.6 "Hanken Grotesk",system-ui,sans-serif}
main{width:min(520px,100%);text-align:center;display:grid;gap:18px;justify-items:center;padding:40px 28px;border:1px solid rgba(232,199,123,.22);border-radius:12px;background:rgba(20,19,16,.62);-webkit-backdrop-filter:blur(14px) saturate(1.25);backdrop-filter:blur(14px) saturate(1.25);box-shadow:inset 0 1px 0 rgba(255,241,214,.07),0 30px 60px -34px rgba(0,0,0,.85)}
svg.mark{width:64px;height:62px}
.wm{font-family:Cinzel,Georgia,serif;letter-spacing:.16em;font-size:14px;color:var(--ivory)}.wm span{color:var(--gold-1)}
h1{font-family:Cinzel,Georgia,serif;font-weight:500;font-size:clamp(26px,5vw,34px);letter-spacing:.04em;margin:4px 0 0}
p{margin:0;color:var(--ivory-2);max-width:42ch}
.small{font-size:13.5px;color:var(--ivory-3)}
.row{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:6px}
a.btn{display:inline-flex;align-items:center;padding:12px 22px;border-radius:3px;font-weight:600;font-size:15px;text-decoration:none;border:1px solid transparent;transition:background .2s,border-color .2s,color .2s}
a.primary{background:var(--gold);color:var(--obsidian)}a.primary:hover{background:var(--gold-1)}
a.ghost{color:var(--ivory);border-color:var(--gold-line)}a.ghost:hover{border-color:var(--gold);color:var(--gold-1)}
a:focus-visible{outline:2px solid var(--gold-1);outline-offset:3px}
@media (prefers-reduced-motion:no-preference){main{animation:in .4s var(--ease)}@keyframes in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}}
</style>
</head>
<body>
<main>
  <svg class="mark" viewBox="62 52 420 400" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E8C77B"/><stop offset=".55" stop-color="#C9A04F"/><stop offset="1" stop-color="#9C7330"/></linearGradient></defs><g fill="none" stroke="url(#lg)" stroke-width="17" stroke-linejoin="miter" stroke-miterlimit="12"><path d="M80 412 L246 136 L246 440"/><path d="M466 412 L300 136 L300 440"/><path d="M172 404 L273 289 L374 404"/></g><polygon points="273,62 302,91 273,120 244,91" fill="url(#lg)"/></svg>
  <div class="wm">AEGIS <span>ASCEND</span></div>
  <h1>Advisors only</h1>
  <p>The CMA funding report is prepared by your Aegis Ascend advisor. Sign in with an advisor account to open it.</p>
  <p class="small">Founders receive the finished, advisor-reviewed report through their workspace.</p>
  <div class="row"><a class="btn primary" href="./#login">Sign in</a><a class="btn ghost" href="./#app">Back to the workspace</a></div>
</main>
</body>
</html>
```

### `site/build.py`

Inlines everything into site/dist/index.html and writes the CMA pages.

```python
"""Builds the Aegis Ascend demo website (one self-contained page) into site/dist/.
   python site/build.py   ->  site/dist/index.html (demo store) + site/dist/fundmix.html (CMA tool)"""
import json
import os
import shutil
import sys
HERE = os.path.dirname(os.path.abspath(__file__))
read = lambda p: open(os.path.join(HERE, p), encoding="utf-8").read()

def seed_markers():
    """The demo starts from the same seed as the server (server/seed.py), with dates relative to the visitor's today."""
    sys.path.insert(0, os.path.dirname(HERE))
    from server.seed import markers
    return json.dumps(markers(), separators=(",", ":"))


def scripts_inline():
    parts = [read("calc.js"), read("optimizer.js"), read("ui.js"), read("domain.js"), read("kit.js"),
             "window.GB_SEED = " + seed_markers() + ";", read("store.js"),
             'window.GB_API = window.GBStore; window.GB_CMA_URL = "fundmix.html"; window.GB_ASSETS = "assets/";',
             read("public.js"), read("portal.js"), read("ws-investor.js"), read("ws-lender.js"), read("ws-advisor.js"), read("ws-founder.js")]
    return "\n".join("<script>\n" + p.replace("</script", "<\\/script") + "\n</script>" for p in parts)

def main():
    os.makedirs(os.path.join(HERE, "dist"), exist_ok=True)
    html = read("shell.html").replace("<!--SCRIPTS-->", scripts_inline())
    open(os.path.join(HERE, "dist", "index.html"), "w", encoding="utf-8").write(html)
    # founder portraits travel beside the page
    os.makedirs(os.path.join(HERE, "dist", "assets"), exist_ok=True)
    for f in os.listdir(os.path.join(HERE, "assets")):
        shutil.copy(os.path.join(HERE, "assets", f), os.path.join(HERE, "dist", "assets", f))
    # the CMA tool is advisors-only: fundmix.html shows the advisors-only page unless the demo session is an advisor's,
    # and the tool itself (cma-tool.html) sends anyone else back. The demo protects nothing; the server enforces this for real.
    guard = ('<script>(function(){var ok=false;try{var id=localStorage.getItem("gb_demo_session_v2"),db=JSON.parse(localStorage.getItem("gb_demo_db_v2")||"null");'
             'var u=db&&id&&db.users.filter(function(x){return x.id===id})[0];ok=!!(u&&u.role==="advisor");}catch(e){}%s})();</script>')
    lock = read("cma-lock.html").replace("</head>", guard % 'if(ok)location.replace("cma-tool.html")' + "</head>")
    open(os.path.join(HERE, "dist", "fundmix.html"), "w", encoding="utf-8").write(lock)
    cma = open(os.path.join(HERE, "..", "fundmix", "web", "index.html"), encoding="utf-8").read()
    page = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '<meta name="robots" content="noindex">' + guard % 'if(!ok)location.replace("fundmix.html")' +
            "<style>[hidden]{display:none!important}body{margin:0}img{max-width:100%}</style></head><body>" + cma + "</body></html>")
    open(os.path.join(HERE, "dist", "cma-tool.html"), "w", encoding="utf-8").write(page)
    print("wrote site/dist/index.html", len(html) // 1024, "KB, fundmix.html (advisors-only gate) and cma-tool.html")

if __name__ == "__main__":
    main()
```

### `site/tools/skyline.py`

Draws the New York skyline (site/assets/skyline.svg) and its inline copy.

```python
"""Draws the New York night skyline used behind the site's glass panels.

Three silhouette layers (far, mid, near) against a warm gold horizon glow, with lit windows in the
house gold. Landmarks: Chrysler Building, Empire State Building, 432 Park Avenue, One World Trade Center.
Deterministic (fixed random seed), so every build produces the same picture.

  python site/tools/skyline.py
writes site/assets/skyline.svg (background image) and refreshes the inline copy in site/shell.html
(between <!--SKYLINE:START--> and <!--SKYLINE:END-->), whose lit windows the home intro switches on as you scroll.
"""
import os
import random
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
W, H = 1600, 420
GROUND = H
rng = random.Random(1931)  # the Empire State Building's opening year

FAR, MID, NEAR = "#221F1A", "#15140F", "#0A0A0B"
GOLD = "#E8C77B"


def rect(x, y, w, h):
    return [(x, y), (x + w, y), (x + w, GROUND), (x, GROUND)]


def path(points):
    return "M" + " L".join("%.1f %.1f" % p for p in points) + " Z"


shapes = {"far": [], "mid": [], "near": []}
windows = []  # (x, y, cls, opacity)


def lit(layer, x0, x1, y0, y1, p, step=(8, 10)):
    """Scatter lit windows inside a box (left, right, top, bottom)."""
    sx, sy = step
    y = y0 + 6
    while y < y1 - 8:
        x = x0 + 4
        while x < x1 - 5:
            if rng.random() < p:
                windows.append((x, y, rng.choice(("w1", "w1", "w2", "w3")), rng.choice((.55, .7, .85, .95)), layer))
            x += sx
        y += sy


def block(layer, x, w, top, p=0.0, crown=None):
    pts = rect(x, top, w, GROUND - top)
    if crown == "step":  # a setback near the top
        s = max(4, w // 5)
        pts = [(x, top + 18), (x + s, top + 18), (x + s, top), (x + w - s, top), (x + w - s, top + 18), (x + w, top + 18), (x + w, GROUND), (x, GROUND)]
    elif crown == "spire":
        pts = [(x, top), (x + w / 2 - 2, top - 14), (x + w / 2, top - 30), (x + w / 2 + 2, top - 14), (x + w, top), (x + w, GROUND), (x, GROUND)]
    shapes[layer].append(path(pts))
    if p:
        lit(layer, x, x + w, top + (18 if crown == "step" else 0), GROUND, p)


# far layer: a low, dense ridge
x = -10
while x < W:
    w = rng.randint(26, 64)
    block("far", x, w, GROUND - rng.randint(110, 215), crown=rng.choice((None, None, "step")))
    x += w - rng.randint(0, 6)

# mid layer: midtown, with gaps left for the landmarks
x = -6
while x < W:
    w = rng.randint(34, 70)
    h = rng.randint(120, 230)
    if not (430 < x + w and x < 545) and not (720 < x + w and x < 870):
        block("mid", x, w, GROUND - h, p=.10, crown=rng.choice((None, "step", None, "spire" if rng.random() < .25 else None)))
    x += w + rng.randint(4, 26)

# Chrysler Building: tower, stepped crown, needle
cx, cw, ctop = 482, 52, 175
shapes["mid"].append(path(rect(cx - cw / 2, ctop, cw, GROUND - ctop)))
lit("mid", cx - cw / 2, cx + cw / 2, ctop, GROUND, .14)
crown, half, y = [], cw / 2 - 4, ctop
for _ in range(6):
    crown.append((cx - half, y)); y -= 6; crown.append((cx - half, y)); half -= 3.6; y -= 5
left = crown + [(cx - 1.5, y), (cx, y - 58), (cx + 1.5, y)]
right = [(2 * cx - px, py) for px, py in reversed(crown)]
shapes["mid"].append(path(left + right))

# Empire State Building: setbacks, mast, antenna, with a beacon
ex = 795
tiers = [(98, 232), (76, 200), (58, 168), (42, 140), (30, 118), (14, 88)]
prev_top = GROUND
for w, top in tiers:
    shapes["mid"].append(path(rect(ex - w / 2, top, w, prev_top - top + 2)))
    if w > 20:
        lit("mid", ex - w / 2, ex + w / 2, top, prev_top, .16)
    prev_top = top
shapes["mid"].append(path([(ex - 1.6, 88), (ex - .6, 34), (ex + .6, 34), (ex + 1.6, 88)]))

# near layer: lower foreground blocks
x = -8
while x < W:
    w = rng.randint(40, 90)
    h = rng.randint(55, 150)
    if not (995 < x + w and x < 1040) and not (1150 < x + w and x < 1270):
        block("near", x, w, GROUND - h, p=.16, crown=rng.choice((None, None, "step")))
    x += w + rng.randint(10, 40)

# 432 Park Avenue: the pencil tower
shapes["near"].append(path(rect(1006, 74, 24, GROUND - 74)))
lit("near", 1006, 1030, 74, GROUND, .12, step=(7, 12))

# One World Trade Center: base, tapering obelisk, antenna, beacon
shapes["near"].append(path([(1168, GROUND), (1168, 344), (1191, 122), (1229, 122), (1252, 344), (1252, GROUND)]))
shapes["near"].append(path(rect(1194, 112, 32, 10)))
shapes["near"].append(path([(1208.8, 112), (1209.6, 16), (1210.4, 16), (1211.2, 112)]))
for yy in range(130, 340, 11):
    t = (yy - 122) / (344 - 122)
    l, r = 1191 - 23 * t, 1229 + 23 * t
    xx = l + 6
    while xx < r - 6:
        if rng.random() < .13:
            windows.append((xx, yy, rng.choice(("w1", "w2", "w3")), .8, "near"))
        xx += 8


def svg(inline):
    """inline=True: classes w1/w2/w3 on windows so CSS can switch them on; the file version shows them lit."""
    out = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" preserveAspectRatio="xMidYMax slice"%s>' % (W, H, ' class="sky-svg" aria-hidden="true" focusable="false"' if inline else ' role="img" aria-label="New York skyline at night"'),
           '<defs><radialGradient id="skyGlow" cx="50%" cy="100%" r="75%"><stop offset="0" stop-color="#C9A04F" stop-opacity=".30"/><stop offset=".45" stop-color="#8E6A2A" stop-opacity=".12"/><stop offset="1" stop-color="#0D0E10" stop-opacity="0"/></radialGradient>'
           '<linearGradient id="skyFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0D0E10" stop-opacity="0"/><stop offset="1" stop-color="#0D0E10" stop-opacity=".55"/></linearGradient></defs>',
           '<rect width="%d" height="%d" fill="url(#skyGlow)"/>' % (W, H)]
    for layer, fill in (("far", FAR), ("mid", MID), ("near", NEAR)):
        out.append('<path fill="%s" d="%s"/>' % (fill, " ".join(shapes[layer])))
        if layer in ("mid", "near"):
            out.append('<g fill="%s">' % GOLD + "".join('<rect%s x="%.0f" y="%.0f" width="2.6" height="3.6" opacity="%s"/>' % (' class="%s"' % c if inline else "", x, y, o) for x, y, c, o, lay in windows if lay == layer) + "</g>")
    # beacons on the two tallest towers
    out.append('<g fill="%s"><circle cx="%d" cy="34" r="1.8"/><circle cx="%d" cy="34" r="6" opacity=".18"/><circle cx="1210" cy="16" r="1.8"/><circle cx="1210" cy="16" r="6" opacity=".18"/></g>' % (GOLD, ex, ex))
    out.append('<rect y="%d" width="%d" height="%d" fill="url(#skyFade)"/>' % (H - 90, W, 90))
    out.append("</svg>")
    return "".join(out)


if __name__ == "__main__":
    with open(os.path.join(SITE, "assets", "skyline.svg"), "w", encoding="utf-8") as f:
        f.write(svg(False))
    shell_path = os.path.join(SITE, "shell.html")
    shell = open(shell_path, encoding="utf-8").read()
    block_html = '<!--SKYLINE:START--><template id="tpl-skyline">' + svg(True) + "</template><!--SKYLINE:END-->"
    if "<!--SKYLINE:START-->" in shell:
        shell = re.sub(r"<!--SKYLINE:START-->.*?<!--SKYLINE:END-->", lambda m: block_html, shell, flags=re.S)
    else:
        shell = shell.replace("<!--SCRIPTS-->", block_html + "\n<!--SCRIPTS-->")
    open(shell_path, "w", encoding="utf-8").write(shell)
    print("skyline: %d lit windows, %d KB" % (len(windows), len(svg(False)) // 1024))
```


---

## 7. Server (Flask)

The real back end. It enforces every rule; the demo copies it.

### `server/app.py`

Flask app: sign-in, sessions, API routes, uploads, page serving, admin commands.

```python
"""Aegis Ascend Financial Advisors web app: the public website, sign-in, and the role-based workspace.

Same pages as the demo (site/), but accounts and data live on the server:
- passwords hashed with werkzeug (scrypt), sessions in a signed HttpOnly cookie
- every rule about who can see or change what is enforced here (server/actions.py), not in the browser
- every change is written to an append-only audit log with its before and after values

Run:  pip install -r server/requirements.txt
      GB_SECRET_KEY=... python -m server.app          (http://127.0.0.1:8000)
"""
import json, os, re, secrets, sqlite3, time
from datetime import date
from functools import wraps

from flask import Flask, Response, abort, g, jsonify, request, send_file, session
from werkzeug.security import check_password_hash, generate_password_hash

from server import seed as SEED
from server.actions import ACTIONS, COLLECTIONS, Denied, can_see_file, now, pub, uid, visible_state

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
# page scripts in load order (site/build.py inlines the same list for the demo)
SCRIPTS = ("calc.js", "optimizer.js", "ui.js", "domain.js", "kit.js", "api-server.js", "public.js", "portal.js",
           "ws-investor.js", "ws-lender.js", "ws-advisor.js", "ws-founder.js")
SITE_FILES = set(SCRIPTS)
ASSET_FILES = {"founder-hem.jpg": "image/jpeg", "founder-yash.jpg": "image/jpeg", "founder-vivan.jpg": "image/jpeg", "skyline.svg": "image/svg+xml"}
UPLOAD_TYPES = {".pdf": "application/pdf", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xls": "application/vnd.ms-excel",
                ".csv": "text/csv", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg"}
UPLOAD_PURPOSES = ("valuation_report", "dataroom", "monitoring", "loan_doc")
DEMO_PASSWORD = "demo1234"
USER_COLS = ("id", "email", "name", "role", "company_id", "firm", "title", "mandate", "profile", "pw_hash", "created_at")


# ---------------- storage ----------------
SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL,
  company_id TEXT, firm TEXT, title TEXT, mandate TEXT, pw_hash TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS docs (
  collection TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (collection, id));
CREATE TABLE IF NOT EXISTS audit (
  seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL, at TEXT NOT NULL, user_id TEXT, user_name TEXT,
  action TEXT NOT NULL, detail TEXT, company_id TEXT);
CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT, 'audit log is append-only'); END;
CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT, 'audit log is append-only'); END;
"""
MIGRATIONS = (("users", "profile", "ALTER TABLE users ADD COLUMN profile TEXT"),
              ("audit", "changes", "ALTER TABLE audit ADD COLUMN changes TEXT"))


class Store:
    """Loads every collection into plain dicts, then writes back what changed and reports each change."""

    def __init__(self, conn):
        self.conn = conn
        self.data = {c: [json.loads(r[0]) for r in conn.execute("SELECT data FROM docs WHERE collection=? ORDER BY rowid", (c,))] for c in COLLECTIONS}
        self.users = [user_row(r) for r in conn.execute("SELECT * FROM users")]
        self._snap = {c: {d["id"]: json.dumps(d, sort_keys=True) for d in self.data[c]} for c in COLLECTIONS}
        self._usnap = {u["id"]: json.dumps(u.get("profile"), sort_keys=True) for u in self.users}

    def __getattr__(self, name):
        if name in COLLECTIONS:
            return self.data[name]
        raise AttributeError(name)

    def __getitem__(self, name):
        return self.data[name]

    def save(self):
        """Write changed documents; return [(collection, id, before, after)] for the audit log."""
        changes = []
        for c in COLLECTIONS:
            ids = set()
            for d in self.data[c]:
                ids.add(d["id"])
                s = json.dumps(d, sort_keys=True)
                old = self._snap[c].get(d["id"])
                if old != s:
                    self.conn.execute("INSERT OR REPLACE INTO docs (collection, id, data) VALUES (?,?,?)", (c, d["id"], s))
                    changes.append((c, d["id"], json.loads(old) if old else None, d))
            for gone in set(self._snap[c]) - ids:
                self.conn.execute("DELETE FROM docs WHERE collection=? AND id=?", (c, gone))
                changes.append((c, gone, json.loads(self._snap[c][gone]), None))
        for u in self.users:
            s = json.dumps(u.get("profile"), sort_keys=True)
            if self._usnap.get(u["id"]) != s:
                self.conn.execute("UPDATE users SET profile=? WHERE id=?", (s, u["id"]))
                changes.append(("users", u["id"], {"profile": json.loads(self._usnap[u["id"]])}, {"profile": u.get("profile")}))
        return changes


def diff(before, after):
    """Only the fields that changed, as {field: [before, after]}."""
    if before is None or after is None:
        return {"created" if before is None else "deleted": True}
    keys = set(before) | set(after)
    return {k: [before.get(k), after.get(k)] for k in sorted(keys) if before.get(k) != after.get(k)}


def user_row(r):
    d = dict(r)
    for k in ("mandate", "profile"):
        d[k] = json.loads(d[k]) if d.get(k) else None
    return d


def db():
    if "db" not in g:
        g.db = sqlite3.connect(app.config["DATABASE"])
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys=ON")
    return g.db


def init_db(seed_demo=False):
    conn = sqlite3.connect(app.config["DATABASE"])
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    for table, col, sql in MIGRATIONS:
        if col not in [r[1] for r in conn.execute("PRAGMA table_info(%s)" % table)]:
            conn.execute(sql)
    if not conn.execute("SELECT 1 FROM docs WHERE collection='settings'").fetchone():
        conn.execute("INSERT INTO docs (collection, id, data) VALUES ('settings','settings',?)", (json.dumps(SEED.SETTINGS_DEFAULT),))
    if seed_demo and not conn.execute("SELECT 1 FROM users LIMIT 1").fetchone():
        seed(conn)
    conn.commit()
    conn.close()


def write_audit(conn, user, action, detail, company_id=None, changes=None):
    conn.execute("INSERT INTO audit (id, at, user_id, user_name, action, detail, company_id, changes) VALUES (?,?,?,?,?,?,?,?)",
                 (uid("a"), now(), user["id"] if user else None, user["name"] if user else "Website visitor", action, detail, company_id,
                  json.dumps(changes) if changes else None))


def add_user(conn, email, name, role, password, **extra):
    u = dict(id=extra.pop("id", None) or uid("u"), email=email.lower(), name=name, role=role,
             company_id=extra.get("company_id"), firm=extra.get("firm"), title=extra.get("title"),
             mandate=json.dumps(extra["mandate"]) if extra.get("mandate") else None,
             profile=json.dumps(extra["profile"]) if extra.get("profile") else None,
             pw_hash=generate_password_hash(password, **({"method": "pbkdf2:sha256:20000"} if extra.get("demo") else {})), created_at=now())
    conn.execute("INSERT INTO users (%s) VALUES (%s)" % (",".join(USER_COLS), ",".join(":" + c for c in USER_COLS)), u)
    return u


def today():
    return app.config.get("TODAY") or date.today().isoformat()


def seed(conn):
    data = SEED.resolved(today())
    for u in data.pop("users"):
        # demo accounts share a published password, so a lighter hash is enough; real accounts use scrypt
        add_user(conn, u.pop("email"), u.pop("name"), u.pop("role"), DEMO_PASSWORD, demo=True, **u)
    conn.execute("DELETE FROM docs WHERE collection='settings'")
    for c, docs in data.items():
        for d in docs:
            conn.execute("INSERT INTO docs (collection, id, data) VALUES (?,?,?)", (c, d["id"], json.dumps(d)))


# ---------------- app ----------------
app = Flask(__name__)
app.config.update(
    DATABASE=os.environ.get("GB_DATABASE", os.path.join(ROOT, "server", "glassbox.db")),
    UPLOADS=os.environ.get("GB_UPLOADS", os.path.join(ROOT, "server", "uploads")),
    SECRET_KEY=os.environ.get("GB_SECRET_KEY") or secrets.token_hex(32),
    SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("GB_SECURE_COOKIES", "0") == "1",
    PERMANENT_SESSION_LIFETIME=8 * 3600, MAX_CONTENT_LENGTH=8_000_000,
)
_FAILS = {}  # (ip, email) -> [timestamps] for login throttling


@app.teardown_appcontext
def _close(exc):
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()


@app.after_request
def _headers(resp):
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "same-origin"
    resp.headers["Content-Security-Policy"] = (
        "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; "
        "connect-src 'self'; frame-ancestors 'none'")
    if request.path.startswith("/api/"):
        resp.headers["Cache-Control"] = "no-store"
        resp.headers["X-Robots-Tag"] = "noindex, nofollow"
    return resp


def current_user():
    uid_ = session.get("uid")
    if not uid_:
        return None
    r = db().execute("SELECT * FROM users WHERE id=?", (uid_,)).fetchone()
    return user_row(r) if r else None


def api(fn):
    """JSON endpoint guard: custom header blocks cross-site form posts (CSRF); errors become JSON."""
    @wraps(fn)
    def wrapper(*a, **kw):
        if request.method != "GET" and request.headers.get("X-Requested-With") != "glassbox":
            return jsonify(error="Missing request header."), 400
        try:
            return fn(*a, **kw)
        except Denied as e:
            return jsonify(error=str(e)), 403
    return wrapper


def body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


@app.get("/api/me")
@api
def me():
    return jsonify(user=pub(current_user(), True))


@app.post("/api/login")
@api
def login():
    p = body()
    email = str(p.get("email") or "").strip().lower()
    key = (request.remote_addr, email)
    recent = [t for t in _FAILS.get(key, []) if time.time() - t < 900]
    if len(recent) >= 5:
        return jsonify(error="Too many attempts. Try again in 15 minutes."), 429
    r = db().execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if not r or not check_password_hash(r["pw_hash"], str(p.get("password") or "")):
        _FAILS[key] = recent + [time.time()]
        return jsonify(error="Email or password is wrong."), 401
    _FAILS.pop(key, None)
    session.clear()
    session.permanent = True
    session["uid"] = r["id"]
    u = user_row(r)
    if u["role"] == "investor":
        prof = dict(u.get("profile") or {}, last_active=now())
        db().execute("UPDATE users SET profile=? WHERE id=?", (json.dumps(prof), u["id"]))
    write_audit(db(), u, "login", "Signed in")
    db().commit()
    return jsonify(user=pub(u, True))


@app.post("/api/logout")
@api
def logout():
    session.clear()
    return jsonify(ok=True)


@app.post("/api/signup")
@api
def signup():
    p = body()
    email = str(p.get("email") or "").strip().lower()
    name = str(p.get("name") or "").strip()[:80]
    role = p.get("role")
    pw = str(p.get("password") or "")
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return jsonify(error="Enter a valid email address."), 400
    if len(pw) < 8:
        return jsonify(error="Use a password of at least 8 characters."), 400
    if role not in ("founder", "investor", "lender"):
        return jsonify(error="Choose founder, investor or lender."), 400
    if not name:
        return jsonify(error="Enter your name."), 400
    conn = db()
    if conn.execute("SELECT 1 FROM users WHERE email=?", (email,)).fetchone():
        return jsonify(error="An account with this email already exists. Sign in instead."), 409
    org = str(p.get("org") or "").strip()[:120]
    sector = str(p.get("sector") or "Plastics & packaging")[:60]
    extra = {}
    if role == "founder":
        c = dict(id=uid("c"), name=org or "My company", sector=sector, stage="Growth", city="Mumbai", revenue=50, **{"raise": 10}, instrument="equity",
                 raise_paise=10 * 10_000_000 * 100, pipeline_stage="applied", stage_since=today(), security_type="equity", offer_price_paise=0,
                 fd_extra_shares=0, external_offers={}, checklist={}, updates=[],
                 twin={}, readiness={}, quarters=[], covenants=dict(dscr_min=1.25, debt_ebitda_max=3.5), docs=[])
        conn.execute("INSERT INTO docs (collection, id, data) VALUES ('companies',?,?)", (c["id"], json.dumps(c)))
        extra["company_id"] = c["id"]
    else:
        extra["firm"] = org or name
        if role == "investor":
            extra["mandate"] = dict(sectors=[sector], past_sectors=[], stages=["Growth"], ticket_min=2, ticket_max=20, instruments=["equity"])
            extra["profile"] = dict(kyc="not_started", accredited=False, nda_signed_at=None, last_active=now())
        else:
            # a self-registered lender is unverified until Aegis Ascend confirms its RBI registration
            extra["profile"] = dict(regulated=False, lender_type=None, reg_no=None)
    u = add_user(conn, email, name, role, pw, **extra)
    u["mandate"], u["profile"] = extra.get("mandate"), extra.get("profile")
    write_audit(conn, u, "signup", "Created a %s account" % role, extra.get("company_id"))
    conn.commit()
    session.clear()
    session.permanent = True
    session["uid"] = u["id"]
    return jsonify(user=pub(u, True))


@app.get("/api/state")
@api
def state():
    u = current_user()
    if not u:
        return jsonify(error="Please sign in."), 401
    conn = db()

    def audit_rows(filt):
        q, args = "SELECT id, at, user_id, user_name, action, detail, company_id, changes FROM audit", ()
        if filt:
            q += " WHERE %s=?" % ("company_id" if filt[0] == "company_id" else "user_id")
            args = (filt[1],)
        rows = [dict(r) for r in conn.execute(q + " ORDER BY seq DESC LIMIT 1000", args)]
        for r in rows:
            r["changes"] = json.loads(r["changes"]) if r.get("changes") else None
        return rows
    return jsonify(visible_state(Store(conn), u, audit_rows, today()))


@app.post("/api/act/<name>")
@api
def act(name):
    u = current_user()
    if not u:
        return jsonify(error="Please sign in."), 401
    fn = ACTIONS.get(name)
    if not fn:
        return jsonify(error="Unknown action"), 404
    conn = db()
    st = Store(conn)
    me_ = next(x for x in st.users if x["id"] == u["id"])
    detail, company_id = fn(st, me_, body(), today())
    changes = st.save()
    write_audit(conn, u, name, detail, company_id, [dict(collection=c, id=i, diff=diff(b, a)) for c, i, b, a in changes])
    conn.commit()
    return jsonify(detail=detail, company_id=company_id)


@app.post("/api/upload")
@api
def upload():
    u = current_user()
    if not u:
        return jsonify(error="Please sign in."), 401
    f, cid, purpose = request.files.get("file"), request.form.get("company_id"), request.form.get("purpose")
    if not f or not f.filename:
        return jsonify(error="Choose a file."), 400
    ext = os.path.splitext(f.filename)[1].lower()
    if ext not in UPLOAD_TYPES:
        return jsonify(error="Upload a PDF, Excel, CSV, Word or image file."), 400
    if purpose not in UPLOAD_PURPOSES:
        return jsonify(error="Unknown upload type."), 400
    conn = db()
    st = Store(conn)
    if not any(c["id"] == cid for c in st.companies):
        return jsonify(error="Company not found."), 404
    allowed = u["role"] == "advisor" or (u["role"] == "founder" and u["company_id"] == cid and purpose in ("dataroom", "monitoring"))
    if not allowed:
        return jsonify(error="You cannot upload files for this company."), 403
    os.makedirs(app.config["UPLOADS"], exist_ok=True)
    rec = dict(id=uid("file"), name=re.sub(r"[^\w.\- ()]", "_", f.filename)[:120], mime=UPLOAD_TYPES[ext], company_id=cid, purpose=purpose,
               item=str(request.form.get("item") or "")[:60] or None, uploaded_by=u["id"], at=now())
    path = os.path.join(app.config["UPLOADS"], rec["id"])
    f.save(path)
    rec["size"] = os.path.getsize(path)
    st.files.append(rec)
    changes = st.save()
    write_audit(conn, u, "upload", "Uploaded %s (%s)" % (rec["name"], purpose.replace("_", " ")), cid, [dict(collection=c, id=i, diff=diff(b, a)) for c, i, b, a in changes])
    conn.commit()
    return jsonify(file=rec)


@app.get("/api/file/<fid>")
@api
def get_file(fid):
    u = current_user()
    if not u:
        return jsonify(error="Please sign in."), 401
    st = Store(db())
    f = next((x for x in st.files if x["id"] == fid), None)
    if not f or not can_see_file(st, u, f):
        return jsonify(error="File not found."), 404
    write_audit(db(), u, "download", "Downloaded " + f["name"], f["company_id"])
    db().commit()
    return send_file(os.path.join(app.config["UPLOADS"], f["id"]), mimetype=f["mime"], as_attachment=True, download_name=f["name"])


@app.post("/api/enquiry")
@api
def enquiry():
    p = body()
    name, email, msg = str(p.get("name") or "").strip()[:80], str(p.get("email") or "").strip()[:120], str(p.get("message") or "").strip()[:2000]
    if not name or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email) or not msg:
        return jsonify(error="Enter your name, a valid email and a message."), 400
    conn = db()
    e = dict(id=uid("e"), at=now(), name=name, email=email, company=str(p.get("company") or "")[:120], message=msg)
    conn.execute("INSERT INTO docs (collection, id, data) VALUES ('enquiries',?,?)", (e["id"], json.dumps(e)))
    write_audit(conn, None, "enquiry", "Enquiry from " + name)
    conn.commit()
    return jsonify(ok=True)


# ---------------- pages ----------------
@app.get("/")
def index():
    shell = open(os.path.join(SITE, "shell.html"), encoding="utf-8").read()
    pre, post = SCRIPTS[:SCRIPTS.index("api-server.js") + 1], SCRIPTS[SCRIPTS.index("api-server.js") + 1:]
    tags = "".join('<script src="/static/%s"></script>' % f for f in pre)
    tags += '<script>window.GB_CMA_URL = "/fundmix.html"; window.GB_ASSETS = "/assets/";</script>'
    tags += "".join('<script src="/static/%s"></script>' % f for f in post)
    html = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            "<link rel=\"icon\" href=\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%230D0E10'/%3E%3Cpath d='M16 5l6 6-6 6-6-6z' fill='%23C9A04F'/%3E%3Cpath d='M6 28l8-12v12M26 28l-8-12v12' stroke='%23C9A04F' stroke-width='2' fill='none'/%3E%3C/svg%3E\">"
            "<style>[hidden]{display:none!important}body{margin:0}img{max-width:100%}</style></head><body>"
            + shell.replace("<!--SCRIPTS-->", tags) + "</body></html>")
    return Response(html, mimetype="text/html")


@app.get("/static/<name>")
def static_file(name):
    if name not in SITE_FILES:
        abort(404)
    return send_file(os.path.join(SITE, name), mimetype="text/javascript", max_age=300)


@app.get("/assets/<name>")
def asset_file(name):
    if name not in ASSET_FILES:
        abort(404)
    return send_file(os.path.join(SITE, "assets", name), mimetype=ASSET_FILES[name], max_age=86400)


@app.get("/fundmix.html")
def fundmix():
    """The CMA funding report tool is for advisors only; everyone else gets the advisors-only page (same look as the site)."""
    u = current_user()
    if not u or u["role"] != "advisor":
        return Response(open(os.path.join(SITE, "cma-lock.html"), encoding="utf-8").read(), status=403 if u else 401, mimetype="text/html")
    cma = open(os.path.join(ROOT, "fundmix", "web", "index.html"), encoding="utf-8").read()
    return Response('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
                    '<meta name="robots" content="noindex"><style>[hidden]{display:none!important}body{margin:0}</style></head><body>' + cma + "</body></html>", mimetype="text/html")


# ---------------- admin commands ----------------
@app.cli.command("init-db")
def _init_db():
    """Create the tables (no demo data)."""
    init_db(seed_demo=False)
    print("Database ready at", app.config["DATABASE"])


@app.cli.command("seed-demo")
def _seed_demo():
    """Create the tables and load the fictional demo accounts (password demo1234)."""
    init_db(seed_demo=True)
    print("Demo data loaded. Sign in as founder@demo.in, investor@demo.in, advisor@demo.in or lender@demo.in with password", DEMO_PASSWORD)


@app.cli.command("create-advisor")
def _create_advisor():
    """Create an advisor account (advisors cannot sign themselves up)."""
    import getpass
    init_db()
    email = input("Advisor email: ").strip().lower()
    name = input("Full name: ").strip()
    pw = getpass.getpass("Password (8+ characters): ")
    if len(pw) < 8:
        raise SystemExit("Password too short")
    conn = sqlite3.connect(app.config["DATABASE"])
    add_user(conn, email, name, "advisor", pw, firm="Aegis Ascend Financial Advisors", title="Advisor")
    conn.commit()
    print("Advisor created:", email)


if __name__ == "__main__":
    if not os.environ.get("GB_SECRET_KEY"):
        print("  Note: GB_SECRET_KEY is not set, so sign-ins reset when the server restarts.")
    init_db(seed_demo=os.environ.get("GB_SEED_DEMO", "1") == "1")
    print("\n  Open http://127.0.0.1:8000\n")
    app.run(host=os.environ.get("GB_HOST", "127.0.0.1"), port=int(os.environ.get("GB_PORT", "8000")), debug=False)
```

### `server/actions.py`

Every workspace action with its permission and compliance checks.

```python
"""Who can see what, and every change a signed-in user can make.

Each action takes (st, user, payload, today), checks the rules, mutates the loaded collections and returns
(detail, company_id). The API layer saves the changes and writes them, with before/after values, to the
append-only audit log. site/store.js mirrors this file for the browser-only demo.
"""
import uuid
from datetime import datetime, timezone

from server import domain as D

COLLECTIONS = ("companies", "reports", "intros", "cap_table", "holdings", "offers", "valuations", "sell_requests", "transfers",
               "loans", "loan_transfers", "invoices", "notes", "notifications", "files", "enquiries", "settings")
COMPANY_FIELDS = ("name", "sector", "stage", "city", "revenue", "raise", "instrument", "twin", "readiness", "quarters", "covenants", "docs")
ADVISOR_COMPANY_FIELDS = ("offer_price_paise", "fd_extra_shares", "security_type", "raise_paise")
SELL_OPEN = ("submitted", "under_review", "rofr", "buyer_introduced", "spa_signed")
STATUS_LABEL = dict(submitted="submitted", under_review="under review", rofr="first-refusal window started", buyer_introduced="buyer introduced",
                    spa_signed="SPA signed", completed="transfer complete", rejected="rejected", withdrawn="withdrawn", eligibility="eligibility checked",
                    consent="borrower consent recorded", deed_signed="assignment deed signed", charge_updated="charge updated with the ROC")
LT_STEPS = ("submitted", "eligibility", "consent", "buyer_introduced", "deed_signed", "charge_updated", "completed")


class Denied(Exception):
    pass


def need(cond, msg):
    if not cond:
        raise Denied(msg)


def now():
    return datetime.now(timezone.utc).isoformat()


def uid(prefix):
    return prefix + "_" + uuid.uuid4().hex[:10]


def fnum(v):
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    return x if x == x and x not in (float("inf"), float("-inf")) else None


def inum(v):
    x = fnum(v)
    return int(x) if x is not None and x == int(x) else None


def valid_date(v, msg="Enter a valid date"):
    try:
        D.d(str(v))
        need(len(str(v)) == 10, msg)
    except ValueError:
        raise Denied(msg)
    return str(v)


def rs(paise):
    """Rs 1,23,45,678.90 (Indian grouping) for messages."""
    neg, p = paise < 0, abs(int(paise))
    r, ps = divmod(p, 100)
    s = str(r)
    head, tail = s[:-3], s[-3:]
    while len(head) > 2:
        tail = head[-2:] + "," + tail
        head = head[:-2]
    s = (head + "," + tail) if head else tail
    return ("-" if neg else "") + "Rs " + s + ("" if ps == 0 else ".%02d" % ps)


def grp(n):
    """Indian digit grouping: 2,50,000."""
    return rs(int(n) * 100)[3:] if n >= 0 else "-" + rs(-int(n) * 100)[3:]


def ddmmmyyyy(s):
    x = D.d(s)
    return "%d %s %d" % (x.day, ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][x.month - 1], x.year)


# ---------------- lookups ----------------
def settings(st):
    return st.settings[0] if st.settings else dict(D.SETTINGS_DEFAULT)


def find(coll, id_):
    return next((x for x in coll if x["id"] == id_), None)


def company_of(st, cid):
    c = find(st.companies, cid)
    need(c, "Company not found")
    return c


def user_of(st, id_, role=None):
    u = next((x for x in st.users if x["id"] == id_), None)
    need(u and (role is None or u["role"] == role), (role or "User").capitalize() + " not found")
    return u


def label(u):
    return (u.get("firm") if u["role"] in ("investor", "lender") and u.get("firm") else u["name"])


def notify(st, user_id, kind, text, link):
    st.notifications.append(dict(id=uid("nt"), user_id=user_id, kind=kind, text=text, link=link, at=now(), read=False))


def notify_advisors(st, kind, text, link):
    for u in st.users:
        if u["role"] == "advisor":
            notify(st, u["id"], kind, text, link)


def owns(u, cid):
    return u["role"] == "advisor" or (u["role"] == "founder" and u["company_id"] == cid)


def approved(st, cid):
    return any(r["company_id"] == cid and r["status"] == "approved" for r in st.reports)


def holder_ids(st, cid):
    return set(D.platform_investors(st, cid))


# ---------------- visibility ----------------
def pub(u, full=False):
    if not u:
        return None
    keys = ("id", "name", "role", "firm", "title", "company_id", "mandate") + (("profile", "email") if full else ())
    out = {k: u.get(k) for k in keys}
    if u["role"] == "lender":
        out["profile"] = u.get("profile")
    return out


def company_brief(st, c, today):
    """What an investor may see of a company: no twin, no readiness, no cap table."""
    rep = next((r for r in st.reports if r["company_id"] == c["id"] and r["status"] == "approved"), None)
    return dict(id=c["id"], name=c["name"], sector=c["sector"], stage=c["stage"], city=c["city"], revenue=c["revenue"], raise_paise=c.get("raise_paise"),
                security_type=c.get("security_type"), offer_price_paise=c.get("offer_price_paise"), updates=c.get("updates") or [],
                docs=c.get("docs") or [], fd_shares=D.fd_shares(st, c["id"]), report=rep and dict(title=rep["title"], summary=rep["summary"],
                reviewed_by=rep.get("reviewed_by"), reviewed_at=rep.get("reviewed_at"), review_note=rep.get("review_note")))


def lock_notices(st, user, today):
    s = settings(st)
    out = []
    for h in st.holdings:
        if h["investor_id"] == user["id"] and h["shares"] > 0:
            unlock = D.lock_until(h, s)
            left = D.days_between(today, unlock)
            if 0 < left <= 7:
                c = find(st.companies, h["company_id"])
                out.append(dict(id="lock_" + h["id"], user_id=user["id"], kind="lock", text="Lock-in for %s ends in %d day%s (%s)" % (c["name"], left, "" if left == 1 else "s", ddmmmyyyy(unlock)),
                                link="app-portfolio", at=today + "T00:00:00+00:00", read=False, computed=True))
    return out


def visible_state(st, user, audit_rows, today):
    role = user["role"]
    s = settings(st)
    base = dict(me=pub(user, True), today=today, settings=s,
                notifications=lock_notices(st, user, today) + sorted([n for n in st.notifications if n["user_id"] == user["id"]], key=lambda n: n["at"], reverse=True)[:60])
    advisors = [pub(u) for u in st.users if u["role"] == "advisor"]
    if role == "advisor":
        return dict(base, directory=[pub(u, True) for u in st.users if u["role"] != "founder"], founders=[pub(u) for u in st.users if u["role"] == "founder"],
                    **{c: getattr(st, c) for c in COLLECTIONS if c not in ("notifications", "settings")}, audit=audit_rows(None))
    if role == "founder":
        cid = user["company_id"]
        only = lambda coll: [x for x in coll if x.get("company_id") == cid]  # noqa: E731
        def offer_view(o):
            named = o.get("share_identity") or o["response"] == "invested"
            inv = user_of(st, o["investor_id"])
            return dict(o, investor_id=o["investor_id"] if named else None, investor_name=label(inv) if named else "Name shared after the investor consents", views=[] if not named else o.get("views", []))
        def sell_view(x):
            return dict(id=x["id"], company_id=x["company_id"], shares=x["shares"], full=x["full"], status=x["status"], rofr_until=x.get("rofr_until"), created_at=x["created_at"])
        return dict(base, directory=advisors + [pub(u) for u in st.users if u["role"] in ("lender", "investor")],
                    intros=[dict(i, investor_name=label(user_of(st, i["investor_id"]))) for i in only(st.intros)],
                    companies=[c for c in st.companies if c["id"] == cid], reports=only(st.reports), cap_table=only(st.cap_table),
                    holdings=[dict(h, investor_name=label(user_of(st, h["investor_id"]))) for h in only(st.holdings)],
                    offers=[offer_view(o) for o in only(st.offers)], valuations=only(st.valuations), sell_requests=[sell_view(x) for x in only(st.sell_requests)],
                    loans=only(st.loans), invoices=[i for i in st.invoices if i["company_id"] == cid and i["payer"] == "company"],
                    files=only(st.files), audit=audit_rows(("company_id", cid)))
    if role == "investor":
        mine = [o for o in st.offers if o["investor_id"] == user["id"]]
        hold = [h for h in st.holdings if h["investor_id"] == user["id"]]
        cids = {o["company_id"] for o in mine} | {h["company_id"] for h in hold}
        held = {h["company_id"] for h in hold if h["shares"] > 0}
        sells = [x for x in st.sell_requests if x["investor_id"] == user["id"]]
        return dict(base, directory=advisors, intros=[i for i in st.intros if i["investor_id"] == user["id"]],
                    companies=[company_brief(st, c, today) for c in st.companies if c["id"] in cids],
                    offers=mine, holdings=hold, valuations=[v for v in st.valuations if v["company_id"] in held or v["company_id"] in cids],
                    sell_requests=[dict(x, buyer_investor_id=None) for x in sells],
                    transfers=[t for t in st.transfers if user["id"] in (t["from_investor_id"], t["to_investor_id"])],
                    files=[f for f in st.files if f["company_id"] in held and f["purpose"] == "valuation_report"], audit=audit_rows(("user_id", user["id"])))
    # lender
    loans = [l for l in st.loans if l["lender_id"] == user["id"]]
    lids = {l["id"] for l in loans}
    cids = {l["company_id"] for l in loans}
    return dict(base, directory=advisors + [pub(u) for u in st.users if u["role"] == "lender"],
                companies=[c for c in st.companies if c["id"] in cids], reports=[r for r in st.reports if r["status"] == "approved" and r["company_id"] in cids],
                loans=loans, loan_transfers=[t for t in st.loan_transfers if t["loan_id"] in lids or t["from_lender_id"] == user["id"]],
                invoices=[i for i in st.invoices if i["payer"] == "lender" and i["payer_id"] == user["id"]],
                files=[f for f in st.files if f["company_id"] in cids and f["purpose"] in ("monitoring", "loan_doc")], audit=audit_rows(("user_id", user["id"])))


def can_see_file(st, user, f):
    if user["role"] == "advisor":
        return True
    if user["role"] == "founder":
        return f["company_id"] == user["company_id"]
    if user["role"] == "investor":
        return f["purpose"] == "valuation_report" and any(h["investor_id"] == user["id"] and h["company_id"] == f["company_id"] and h["shares"] > 0 for h in st.holdings)
    return f["purpose"] in ("monitoring", "loan_doc") and any(l["lender_id"] == user["id"] and l["company_id"] == f["company_id"] for l in st.loans)


# ---------------- founder ----------------
def a_save_company(st, u, p, today):
    need(owns(u, p.get("company_id")), "Only the company's founder or an advisor can edit it")
    c = company_of(st, p["company_id"])
    patch = p.get("patch") or {}
    need(isinstance(patch, dict), "Bad request")
    allowed = COMPANY_FIELDS + (ADVISOR_COMPANY_FIELDS if u["role"] == "advisor" else ())
    for k, v in patch.items():
        need(k in allowed, "You cannot change " + k)
        if k in ("revenue", "raise"):
            need(fnum(v) is not None and fnum(v) > 0, "Revenue and raise must be positive numbers")
            v = fnum(v)
        elif k in ADVISOR_COMPANY_FIELDS and k != "security_type":
            need(inum(v) is not None and inum(v) >= 0, k + " must be a whole number")
            v = inum(v)
        elif k == "security_type":
            need(v in D.SECURITY_TYPES, "Choose equity, preference or debentures")
        elif k in ("name", "sector", "stage", "city", "instrument"):
            v = str(v).strip()[:120]
            need(v, "Enter a value for " + k)
        c[k] = v
    return "Updated " + ", ".join(patch.keys()), c["id"]


def a_submit_report(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor prepares and submits the debt vs equity report")
    c = company_of(st, p["company_id"])
    ch = p.get("checks") or {}
    need(ch.get("validation") and ch.get("founder_confirmed") and ch.get("verifier"), "All release checks must pass before review")
    need(not any(r["company_id"] == c["id"] and r["status"] == "in_review" for r in st.reports), "A report for this company is already in review")
    r = dict(id=uid("r"), company_id=c["id"], title=str(p.get("title") or "Debt vs equity report")[:120], status="in_review",
             engine_version=str(p.get("engine_version") or "")[:40], created_at=now(), submitted_by=u["id"],
             summary=p.get("summary") or {}, checks=ch, inputs=p.get("inputs") or {})
    st.reports.append(r)
    if c.get("pipeline_stage", "applied") == "applied":
        c.update(pipeline_stage="under_review", stage_since=today)
    notify_advisors(st, "review", "New report to review: " + c["name"], "app-review")
    return "Submitted for advisor review: " + r["title"], c["id"]


def a_apply_loan(st, u, p, today):
    cid = p.get("company_id")
    need(u["role"] == "founder" and u["company_id"] == cid, "Only the company's founder can apply")
    lender = user_of(st, p.get("lender_id"), "lender")
    amount, bps, tenor, mor = inum(p.get("amount_paise")), inum(p.get("rate_bps")), inum(p.get("tenor_months")), inum(p.get("moratorium_months") or 0)
    need(amount and amount > 0 and bps and 0 < bps < 5000 and tenor and 0 < tenor <= 240 and mor is not None and 0 <= mor < tenor, "Enter a valid amount, rate, tenor and moratorium")
    st.loans.append(dict(id=uid("l"), company_id=cid, lender_id=lender["id"], amount_paise=amount, rate_bps=bps, tenor_months=tenor, moratorium_months=mor,
                         status="applied", sanction_date=None, disbursal_date=None, payments={}, created_at=now()))
    notify(st, lender["id"], "loan", "New loan application from " + company_of(st, cid)["name"], "app-loanbook")
    return "Sent a %s loan application to %s" % (rs(amount), lender.get("firm")), cid


# ---------------- advisor: reports, pipeline, cap table ----------------
def a_review_report(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor can review reports")
    r = find(st.reports, p.get("report_id"))
    need(r, "Report not found")
    need(r["status"] == "in_review", "This report is not waiting for review")
    need(p.get("decision") in ("approve", "changes"), "Choose approve or request changes")
    r.update(status="approved" if p["decision"] == "approve" else "changes", reviewed_by=u["id"], reviewed_at=now(), review_note=str(p.get("note") or "")[:500])
    c = company_of(st, r["company_id"])
    if p["decision"] == "approve" and c.get("pipeline_stage") in ("applied", "under_review", None):
        c.update(pipeline_stage="approved", stage_since=today)
    return ("Approved report: " if p["decision"] == "approve" else "Requested changes: ") + r["title"], r["company_id"]


def a_set_stage(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor can move a company")
    c = company_of(st, p.get("company_id"))
    stage = p.get("stage")
    need(stage in D.PIPELINE, "Unknown stage")
    need(stage != c.get("pipeline_stage"), "The company is already in that stage")
    if stage in ("approved", "offering", "funded", "monitoring"):
        need(approved(st, c["id"]), "A company needs an advisor-approved report before it can be " + stage.replace("_", " "))
    old = c.get("pipeline_stage")
    c.update(pipeline_stage=stage, stage_since=today)
    return "Moved %s from %s to %s" % (c["name"], (old or "none").replace("_", " "), stage.replace("_", " ")), c["id"]


def a_save_cap_entry(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor maintains the cap table")
    c = company_of(st, p.get("company_id"))
    name, kind, shares, holders = str(p.get("holder_name") or "").strip()[:120], p.get("holder_type"), inum(p.get("shares")), inum(p.get("holders") or 1)
    need(name and kind in ("founder", "existing") and shares is not None and shares >= 0 and holders and holders >= 1, "Enter the holder, type (founder or existing), shares and number of holders")
    e = find(st.cap_table, p.get("entry_id")) if p.get("entry_id") else None
    if e:
        need(e["company_id"] == c["id"], "Entry not found")
        e.update(holder_name=name, holder_type=kind, shares=shares, holders=holders)
    else:
        st.cap_table.append(dict(id=uid("ct"), company_id=c["id"], holder_name=name, holder_type=kind, shares=shares, holders=holders))
    return "Cap table: %s holds %s shares (%d holder%s)" % (name, grp(shares), holders, "" if holders == 1 else "s"), c["id"]


def a_remove_cap_entry(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor maintains the cap table")
    e = find(st.cap_table, p.get("entry_id"))
    need(e, "Entry not found")
    st.cap_table.remove(e)
    return "Removed %s from the cap table" % e["holder_name"], e["company_id"]


def a_set_checklist(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor updates the compliance checklist")
    c = company_of(st, p.get("company_id"))
    item = p.get("item")
    need(item in dict(D.DOC_CHECKLIST), "Unknown checklist item")
    val = p.get("date")
    if val:
        D.d(val)
    c.setdefault("checklist", {})[item] = val or None
    if item == "allotment" and val:
        c["allotment_date"] = val
    return "%s: %s" % (dict(D.DOC_CHECKLIST)[item], "done " + ddmmmyyyy(val) if val else "not done"), c["id"]


def a_set_external_offers(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor records offers")
    c = company_of(st, p.get("company_id"))
    year, sec, n = str(p.get("fy") or D.fy(today)), p.get("security_type") or "equity", inum(p.get("count"))
    need(sec in D.SECURITY_TYPES and n is not None and n >= 0, "Enter the number of off-platform offers")
    c.setdefault("external_offers", {}).setdefault(year, {})[sec] = n
    used = D.offers_used(st, c["id"], year, sec)
    need(used <= settings(st)["offer_limit"], "That would put %s at %d offers in FY %s; the limit is %d" % (c["name"], used, year, settings(st)["offer_limit"]))
    return "Off-platform %s offers for FY %s set to %d (total now %d)" % (sec, year, n, used), c["id"]


def a_post_update(st, u, p, today):
    need(owns(u, p.get("company_id")), "Only the company's founder or an advisor can post updates")
    c = company_of(st, p["company_id"])
    text = str(p.get("text") or "").strip()[:600]
    need(text, "Write the update")
    c.setdefault("updates", []).insert(0, dict(date=today, text=text))
    for iid in holder_ids(st, c["id"]):
        notify(st, iid, "update", "Company update from " + c["name"], "app-portfolio")
    return "Posted an update for " + c["name"], c["id"]


def a_set_investor_profile(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor records KYC")
    inv = user_of(st, p.get("investor_id"), "investor")
    prof = inv["profile"] = inv.get("profile") or {}
    if p.get("kyc") is not None:
        need(p["kyc"] in ("verified", "pending", "not_started"), "Unknown KYC status")
        prof["kyc"] = p["kyc"]
    if p.get("accredited") is not None:
        prof["accredited"] = bool(p["accredited"])
    return "Updated %s: KYC %s, accredited %s" % (label(inv), prof.get("kyc"), "yes" if prof.get("accredited") else "no"), None


def a_save_settings(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor changes settings")
    s = settings(st)
    n = inum(p.get("max_platform_investors"))
    need(n and 1 <= n <= 200, "Platform investor limit must be between 1 and 200")
    s["max_platform_investors"] = n
    return "Platform investor limit set to %d per company" % n, None


# ---------------- advisor: offers and allotment (Section 42, Section 2(68)) ----------------
def a_share_offer(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor shares offers")
    c = company_of(st, p.get("company_id"))
    need(c.get("pipeline_stage") in ("approved", "offering") and approved(st, c["id"]), "Only a company in Approved or Offering status with a signed-off report can be offered")
    sec = p.get("security_type") or c.get("security_type") or "equity"
    need(sec in D.SECURITY_TYPES, "Choose equity, preference or debentures")
    ids = list(dict.fromkeys(p.get("investor_ids") or []))
    need(ids, "Select at least one investor")
    year = D.fy(today)
    already = {o["investor_id"] for o in st.offers if o["company_id"] == c["id"] and o["fy"] == year and o["security_type"] == sec}
    invs = [user_of(st, i, "investor") for i in ids]
    for inv in invs:
        need((inv.get("profile") or {}).get("kyc") == "verified", label(inv) + " has not completed KYC")
    new = [inv for inv in invs if inv["id"] not in already]
    need(new, "Every selected investor already has this offer for FY " + year)
    s = settings(st)
    used = D.offers_used(st, c["id"], year, sec)
    need(used + len(new) <= s["offer_limit"], "Blocked: %s has %d of %d %s offers used in FY %s. Sending %d more would exceed the Section 42 limit; %d left." % (
        c["name"], used, s["offer_limit"], sec, year, len(new), s["offer_limit"] - used))
    for inv in new:
        st.offers.append(dict(id=uid("o"), company_id=c["id"], investor_id=inv["id"], fy=year, security_type=sec, sent_at=now(), sent_by=u["id"],
                              response="pending", responded_at=None, share_identity=False, views=[]))
        notify(st, inv["id"], "offer", "New private offer: " + c["name"], "app-opportunities")
    if c["pipeline_stage"] == "approved":
        c.update(pipeline_stage="offering", stage_since=today)
    total = used + len(new)
    return "Shared %s with %d investor%s (%d of %d offers used in FY %s%s)" % (c["name"], len(new), "" if len(new) == 1 else "s", total, s["offer_limit"], year,
                                                                                "; already offered: %d" % (len(invs) - len(new)) if len(invs) > len(new) else ""), c["id"]


def check_new_holder(st, cid, investor_id, leaving=None):
    """A new holder must keep platform investors <= the limit and members <= 200. `leaving` is a seller who exits completely."""
    s = settings(st)
    current = holder_ids(st, cid)
    if investor_id in current:
        return
    plat = len(current) + 1 - (1 if leaving in current else 0)
    mem = D.members(st, cid) + 1 - (1 if leaving in current else 0)
    need(plat <= s["max_platform_investors"], "Blocked: this would make %d platform investors in the company; the limit is %d" % (plat, s["max_platform_investors"]))
    need(mem <= s["member_limit"], "Blocked: this would make %d members (shareholders); a private company may have at most %d" % (mem, s["member_limit"]))


def a_allot_shares(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor records an allotment")
    o = find(st.offers, p.get("offer_id"))
    need(o, "Offer not found")
    need(o["response"] == "interested", "The investor must express interest before shares are allotted")
    c = company_of(st, o["company_id"])
    shares, amount, when = inum(p.get("shares")), inum(p.get("amount_paise")), valid_date(p.get("allotment_date") or today)
    need(shares and shares > 0 and amount and amount > 0, "Enter the shares allotted and the amount paid")
    need(when <= today, "The allotment date cannot be in the future")
    check_new_holder(st, c["id"], o["investor_id"])
    st.holdings.append(dict(id=uid("h"), investor_id=o["investor_id"], company_id=c["id"], shares=shares, allotment_date=when, invested_at=when,
                            cost_paise=amount, origin="allotment", early_consent=None))
    o.update(response="invested", responded_at=o.get("responded_at") or now())
    c["allotment_date"] = when
    c.setdefault("checklist", {})["allotment"] = when
    if c.get("pipeline_stage") == "offering":
        c.update(pipeline_stage="funded", stage_since=today)
    notify(st, o["investor_id"], "allotment", "%s shares of %s allotted to you" % (grp(shares), c["name"]), "app-portfolio")
    return "Allotted %s shares of %s to %s for %s" % (grp(shares), c["name"], label(user_of(st, o["investor_id"])), rs(amount)), c["id"]


def a_publish_valuation(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor publishes valuations")
    c = company_of(st, p.get("company_id"))
    when, price, method, valuer = p.get("date"), inum(p.get("price_per_share_paise")), p.get("method"), str(p.get("valuer") or "").strip()[:120]
    need(when and D.d(when) and when <= today, "Enter a valuation date that is not in the future")
    need(price and price > 0, "Enter the price per share")
    need(method in ("DCF", "Market multiples"), "Choose DCF or market multiples")
    need(valuer, "Enter the registered valuer's name")
    f = find(st.files, p.get("file_id")) if p.get("file_id") else None
    need(not p.get("file_id") or (f and f["company_id"] == c["id"]), "Report file not found")
    prev = D.latest_valuation(st, c["id"])
    st.valuations.append(dict(id=uid("v"), company_id=c["id"], date=when, price_per_share_paise=price, method=method, valuer=valuer,
                              report_file=f and f["id"], published_at=now(), published_by=u["id"]))
    for iid in holder_ids(st, c["id"]):
        notify(st, iid, "valuation", "Revaluation published: %s at %s a share" % (c["name"], rs(price)), "app-portfolio")
    return "Published %s valuation of %s: %s a share (was %s)" % (method, c["name"], rs(price), rs(prev["price_per_share_paise"]) if prev else "none"), c["id"]


# ---------------- investor ----------------
def a_respond_offer(st, u, p, today):
    o = find(st.offers, p.get("offer_id"))
    need(o and u["role"] == "investor" and o["investor_id"] == u["id"], "Offer not found")
    need(o["response"] in ("pending", "interested", "declined"), "This offer is closed")
    need(p.get("response") in ("interested", "declined"), "Choose interested or decline")
    o.update(response=p["response"], responded_at=now(), share_identity=bool(p.get("share_identity")) and p["response"] == "interested")
    c = company_of(st, o["company_id"])
    notify_advisors(st, "offer", "%s %s %s" % (label(u), "is interested in" if p["response"] == "interested" else "declined", c["name"]), "app-directory")
    return ("Expressed interest in " if p["response"] == "interested" else "Declined the offer for ") + c["name"], c["id"]


def a_view_doc(st, u, p, today):
    o = find(st.offers, p.get("offer_id"))
    need(o and u["role"] == "investor" and o["investor_id"] == u["id"] and o["response"] != "declined", "Offer not found")
    c = company_of(st, o["company_id"])
    need(p.get("doc") in (c.get("docs") or []) or p.get("doc") == "Advisor-reviewed report", "Document not found")
    o.setdefault("views", []).append(dict(doc=p["doc"], at=now()))
    return "Viewed " + p["doc"] + " (watermarked: " + u["name"] + ")", c["id"]


# ---------------- deal rooms: investor asks, founder grants, investor signs the NDA ----------------
def a_request_intro(st, u, p, today):
    need(u["role"] == "investor", "Only investors can ask for deal-room access")
    cid = p.get("company_id")
    c = company_of(st, cid)
    need(any(o["company_id"] == cid and o["investor_id"] == u["id"] and o["response"] != "declined" for o in st.offers),
         "Deal rooms open only for companies your advisor has offered to you")
    need(not any(i["company_id"] == cid and i["investor_id"] == u["id"] for i in st.intros), "You have already asked for access to this deal room")
    st.intros.append(dict(id=uid("i"), company_id=cid, investor_id=u["id"], status="requested", created_at=now(), nda_signed_at=None, views=[]))
    for f in st.users:
        if f["role"] == "founder" and f.get("company_id") == cid:
            notify(st, f["id"], "intro", label(u) + " asked for access to your deal room", "app-investors")
    return "Asked for access to the %s deal room" % c["name"], cid


def a_decide_intro(st, u, p, today):
    i = find(st.intros, p.get("intro_id"))
    need(i, "Introduction not found")
    need(u["role"] == "founder" and u["company_id"] == i["company_id"], "Only the company's founder can decide")
    need(i["status"] == "requested", "This request was already decided")
    need(p.get("decision") in ("grant", "decline"), "Choose grant or decline")
    i["status"] = "granted" if p["decision"] == "grant" else "declined"
    notify(st, i["investor_id"], "intro", "%s %s your deal-room request" % (company_of(st, i["company_id"])["name"], "granted" if i["status"] == "granted" else "declined"), "app-rooms")
    return ("Granted deal-room access to " if i["status"] == "granted" else "Declined ") + label(user_of(st, i["investor_id"])), i["company_id"]


def a_sign_nda(st, u, p, today):
    i = find(st.intros, p.get("intro_id"))
    need(i and u["role"] == "investor" and i["investor_id"] == u["id"], "Introduction not found")
    need(i["status"] == "granted", "The founder has not granted access yet")
    i["nda_signed_at"] = i.get("nda_signed_at") or now()
    return "Signed the NDA for " + company_of(st, i["company_id"])["name"], i["company_id"]


def a_view_room_doc(st, u, p, today):
    i = find(st.intros, p.get("intro_id"))
    need(i and u["role"] == "investor" and i["investor_id"] == u["id"] and i["status"] == "granted" and i.get("nda_signed_at"), "Sign the NDA to open documents")
    c = company_of(st, i["company_id"])
    need(p.get("doc") in (c.get("docs") or []), "Document not found")
    i.setdefault("views", []).append(dict(doc=p["doc"], at=now()))
    return "Viewed " + p["doc"] + " (watermarked: " + u["name"] + ")", c["id"]


def a_suggest_investor(st, u, p, today):
    need(u["role"] == "founder", "Only founders suggest investors")
    inv = user_of(st, p.get("investor_id"), "investor")
    c = company_of(st, u["company_id"])
    note = "%s suggests offering to %s" % (u["name"], label(inv))
    st.notes.append(dict(id=uid("n"), subject_type="company", subject_id=c["id"], text=note + ".", due=None, done=False, by=u["id"], at=now()))
    notify_advisors(st, "suggest", note + " (" + c["name"] + ")", "app-directory")
    return "Suggested %s to your advisor. Your advisor decides who receives the offer." % label(inv), c["id"]


def a_request_sell(st, u, p, today):
    h = find(st.holdings, p.get("holding_id"))
    need(h and u["role"] == "investor" and h["investor_id"] == u["id"], "Holding not found")
    need(h["shares"] > 0, "You no longer hold these shares")
    need(not any(x["holding_id"] == h["id"] and x["status"] in SELL_OPEN for x in st.sell_requests), "A sell request for this holding is already open")
    s = settings(st)
    unlock = D.lock_until(h, s)
    need(today >= unlock or h.get("early_consent"), "Locked: you can request to sell from %s, %d months after allotment" % (ddmmmyyyy(unlock), s["lock_months"]))
    n = inum(p.get("shares")) if p.get("shares") not in (None, "") else h["shares"]
    need(n and 0 < n <= h["shares"], "Enter between 1 and %s shares" % grp(h["shares"]))
    price = inum(p.get("indicative_price_paise")) if p.get("indicative_price_paise") not in (None, "") else None
    need(price is None or price > 0, "The indicative price must be positive")
    c = company_of(st, h["company_id"])
    x = dict(id=uid("s"), holding_id=h["id"], investor_id=u["id"], company_id=c["id"], shares=n, full=n == h["shares"], indicative_price_paise=price,
             note=str(p.get("note") or "")[:500], status="submitted", rofr_days=None, rofr_until=None, buyer_investor_id=None, spa_date=None,
             price_paise=None, reason=None, created_at=now(), history=[dict(status="submitted", at=now(), by=u["id"])])
    st.sell_requests.append(x)
    notify_advisors(st, "sell", "Sell request: %s, %s shares of %s" % (label(u), grp(n), c["name"]), "app-requests")
    return "Requested to sell %s %s shares of %s" % ("all" if x["full"] else "", grp(n), c["name"]), c["id"]


def a_withdraw_sell(st, u, p, today):
    x = find(st.sell_requests, p.get("request_id"))
    need(x and u["role"] == "investor" and x["investor_id"] == u["id"], "Request not found")
    need(x["status"] in ("submitted", "under_review", "rofr"), "This request can no longer be withdrawn")
    x["status"] = "withdrawn"
    x["history"].append(dict(status="withdrawn", at=now(), by=u["id"]))
    return "Withdrew a sell request", x["company_id"]


def a_read_notifications(st, u, p, today):
    n = 0
    for x in st.notifications:
        if x["user_id"] == u["id"] and not x["read"]:
            x["read"] = True
            n += 1
    return "Marked %d notification%s read" % (n, "" if n == 1 else "s"), None


# ---------------- advisor: equity resales ----------------
def a_record_consent(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor records the founder's consent")
    h = find(st.holdings, p.get("holding_id"))
    need(h, "Holding not found")
    note = str(p.get("note") or "").strip()[:300]
    need(note, "Describe the written consent (who signed and when)")
    h["early_consent"] = dict(by=u["id"], at=now(), note=note)
    notify(st, h["investor_id"], "sell", "The founder's written consent allows an early sale of your %s shares" % company_of(st, h["company_id"])["name"], "app-portfolio")
    return "Recorded founder consent for an early sale: " + note, h["company_id"]


def a_sell_step(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor moves a sell request")
    x = find(st.sell_requests, p.get("request_id"))
    need(x, "Request not found")
    step = p.get("step")
    c = company_of(st, x["company_id"])
    h = find(st.holdings, x["holding_id"])
    if step == "reject":
        need(x["status"] in SELL_OPEN, "This request is closed")
        reason = str(p.get("reason") or "").strip()[:300]
        need(reason, "Give a reason")
        x.update(status="rejected", reason=reason)
    elif step == "review":
        need(x["status"] == "submitted", "Only a submitted request can be put under review")
        x["status"] = "under_review"
    elif step == "rofr":
        need(x["status"] == "under_review", "Review the request first")
        days = inum(p.get("days"))
        need(days and 15 <= days <= 30, "The first-refusal window is 15 to 30 days")
        x.update(status="rofr", rofr_days=days, rofr_until=D.add_days(today, days))
    elif step == "buyer":
        need(x["status"] == "rofr", "Start the first-refusal window first")
        need(today >= x["rofr_until"] or p.get("waived"), "The first-refusal window runs until %s. Record a written waiver to proceed early." % ddmmmyyyy(x["rofr_until"]))
        buyer = user_of(st, p.get("buyer_investor_id"), "investor")
        need(buyer["id"] != x["investor_id"], "The buyer cannot be the seller")
        need((buyer.get("profile") or {}).get("kyc") == "verified", label(buyer) + " has not completed KYC")
        check_new_holder(st, c["id"], buyer["id"], leaving=x["investor_id"] if x["full"] else None)
        x.update(status="buyer_introduced", buyer_investor_id=buyer["id"], rofr_waived=bool(p.get("waived")) and today < x["rofr_until"])
    elif step == "spa":
        need(x["status"] == "buyer_introduced", "Introduce a buyer first")
        price, when = inum(p.get("price_paise")), valid_date(p.get("spa_date") or today)
        need(price and price > 0, "Enter the agreed price per share")
        need(when <= today, "The SPA date cannot be in the future")
        x.update(status="spa_signed", price_paise=price, spa_date=when)
    elif step == "complete":
        need(x["status"] == "spa_signed", "Record the signed SPA first")
        need(h and h["shares"] >= x["shares"], "The seller no longer holds these shares")
        buyer = user_of(st, x["buyer_investor_id"], "investor")
        leaving = x["investor_id"] if x["shares"] == h["shares"] else None
        check_new_holder(st, c["id"], buyer["id"], leaving=leaving)
        cost_moved = h["cost_paise"] * x["shares"] // h["shares"]
        h["shares"] -= x["shares"]
        h["cost_paise"] -= cost_moved
        st.holdings.append(dict(id=uid("h"), investor_id=buyer["id"], company_id=c["id"], shares=x["shares"], allotment_date=today, invested_at=today,
                                cost_paise=x["shares"] * x["price_paise"], origin="transfer", early_consent=None))
        st.transfers.append(dict(id=uid("t"), sell_request_id=x["id"], company_id=c["id"], from_investor_id=x["investor_id"], to_investor_id=buyer["id"],
                                 shares=x["shares"], price_paise=x["price_paise"], spa_date=x["spa_date"], completed_at=now()))
        x["status"] = "completed"
        notify(st, buyer["id"], "sell", "%s shares of %s transferred to you" % (grp(x["shares"]), c["name"]), "app-portfolio")
    else:
        raise Denied("Unknown step")
    x["history"].append(dict(status=x["status"], at=now(), by=u["id"]))
    notify(st, x["investor_id"], "sell", "Your sell request for %s: %s" % (c["name"], x["status"].replace("_", " ")), "app-portfolio")
    return "Resale of %s %s shares by %s: %s" % (grp(x["shares"]), c["name"], label(user_of(st, x["investor_id"])), STATUS_LABEL[x["status"]]), c["id"]


# ---------------- lender ----------------
def a_lender_decide(st, u, p, today):
    l = find(st.loans, p.get("loan_id"))
    need(l and u["role"] == "lender" and l["lender_id"] == u["id"], "Not your loan")
    nxt = {"sanction": ("applied", "sanctioned"), "decline": ("applied", "declined"), "disburse": ("sanctioned", "disbursed")}.get(p.get("decision"))
    need(nxt and l["status"] == nxt[0], "That step is not available now")
    l["status"] = nxt[1]
    if nxt[1] == "sanctioned":
        l["sanction_date"] = today
    if nxt[1] == "disbursed":
        l.update(disbursal_date=today, payments={})
    return "Loan %s (%s)" % (l["status"], rs(l["amount_paise"])), l["company_id"]


def a_record_repayment(st, u, p, today):
    l = find(st.loans, p.get("loan_id"))
    need(l and u["role"] in ("lender", "advisor") and (u["role"] == "advisor" or l["lender_id"] == u["id"]), "Not your loan")
    row = next((r for r in D.schedule(l, today) if r["due"] == p.get("due")), None)
    need(row, "Instalment not found")
    need(row["status"] != "paid", "Already marked as received")
    need(row["due"] <= D.add_days(today, 31), "You can only record instalments due in the next month or earlier")
    l.setdefault("payments", {})[row["due"]] = today
    return "Recorded the %s instalment of %s (due %s)" % (company_of(st, l["company_id"])["name"], rs(row["payment"]), ddmmmyyyy(row["due"])), l["company_id"]


def a_request_loan_transfer(st, u, p, today):
    l = find(st.loans, p.get("loan_id"))
    need(l and u["role"] == "lender" and l["lender_id"] == u["id"], "Not your loan")
    need(l["status"] == "disbursed", "Only a disbursed loan can be transferred")
    need((u.get("profile") or {}).get("regulated"), "Only regulated banks and NBFCs can transfer loans")
    need(not any(t["loan_id"] == l["id"] and t["status"] not in ("completed", "rejected") for t in st.loan_transfers), "A transfer for this loan is already open")
    pending = D.loan_summary(l, today)["principal_pending"]
    amount = inum(p.get("amount_paise")) if p.get("amount_paise") not in (None, "") else None
    need(amount is not None or p.get("amount_paise") in (None, ""), "Enter the amount as a number")
    need(amount is None or 0 < amount <= pending, "The amount must be up to the outstanding %s" % rs(pending))
    st.loan_transfers.append(dict(id=uid("lt"), loan_id=l["id"], from_lender_id=u["id"], amount_paise=amount, note=str(p.get("note") or "")[:500],
                                  status="submitted", buyer_lender_id=None, fee_rate=None, fee_paise=None, created_at=now(),
                                  history=[dict(status="submitted", at=now(), by=u["id"])]))
    notify_advisors(st, "transfer", "Loan transfer request: %s, %s" % (label(u), company_of(st, l["company_id"])["name"]), "app-loantransfers")
    return "Asked Aegis Ascend to transfer %s of the %s loan" % (rs(amount or pending), company_of(st, l["company_id"])["name"]), l["company_id"]


def a_loan_transfer_step(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor arranges loan transfers")
    t = find(st.loan_transfers, p.get("transfer_id"))
    need(t and t["status"] not in ("completed", "rejected"), "No open transfer")
    l = find(st.loans, t["loan_id"])
    step = p.get("step")
    if step == "reject":
        reason = str(p.get("reason") or "").strip()[:300]
        need(reason, "Give a reason")
        t.update(status="rejected", reason=reason)
    else:
        need(step in LT_STEPS and LT_STEPS.index(step) == LT_STEPS.index(t["status"]) + 1, "Do the steps in order: next is " + LT_STEPS[LT_STEPS.index(t["status"]) + 1].replace("_", " "))
        if step == "eligibility":
            seller = user_of(st, t["from_lender_id"], "lender")
            need((seller.get("profile") or {}).get("regulated"), "The selling lender is not a regulated bank or NBFC")
            held = D.days_between(l["disbursal_date"], today) / 30.4375
            mhp = D.min_holding_months(l)
            need(held >= mhp, "Minimum holding period not met: %d months needed, %.1f held" % (mhp, held))
            t["eligibility"] = dict(checked_at=now(), months_held=round(held, 1), min_holding=mhp)
        elif step == "consent":
            t["borrower_consent_at"] = valid_date(p.get("date") or today)
        elif step == "buyer_introduced":
            buyer = user_of(st, p.get("buyer_lender_id"), "lender")
            need(buyer["id"] != t["from_lender_id"], "The buyer must be a different lender")
            need((buyer.get("profile") or {}).get("regulated"), "Loans move only between regulated banks and NBFCs")
            t["buyer_lender_id"] = buyer["id"]
        elif step == "deed_signed":
            t["deed_date"] = valid_date(p.get("date") or today)
        elif step == "charge_updated":
            t["charge_date"] = valid_date(p.get("date") or today)
        elif step == "completed":
            rate = fnum(p.get("fee_rate"))
            need(rate is not None and 0.003 <= rate <= 0.005, "The transfer fee is 0.3% to 0.5%")
            base = t["amount_paise"] or D.loan_summary(l, today)["principal_pending"]
            fee = D.half_up(base * rate)
            t.update(fee_rate=rate, fee_paise=fee)
            l["lender_id"] = t["buyer_lender_id"]
            st.invoices.append(dict(id=uid("f"), kind="transfer", company_id=l["company_id"], payer="lender", payer_id=t["from_lender_id"],
                                    period="Loan transfer " + t["id"], amount_paise=fee, gst_paise=fee * 18 // 100, issued=today, due=D.add_days(today, 15), paid_on=None))
            notify(st, t["buyer_lender_id"], "transfer", "A %s loan has moved to your book" % company_of(st, l["company_id"])["name"], "app-loanbook")
        t["status"] = step
    t["history"].append(dict(status=t["status"], at=now(), by=u["id"]))
    notify(st, t["from_lender_id"], "transfer", "Loan transfer for %s: %s" % (company_of(st, l["company_id"])["name"], t["status"].replace("_", " ")), "app-loanbook")
    return "Loan transfer of the %s loan from %s: %s" % (company_of(st, l["company_id"])["name"], label(user_of(st, t["from_lender_id"])), STATUS_LABEL[t["status"]]), l["company_id"]


# ---------------- advisor: notes, invoices ----------------
def a_save_note(st, u, p, today):
    need(u["role"] == "advisor", "Only advisors keep notes")
    kind, sid, text = p.get("subject_type"), p.get("subject_id"), str(p.get("text") or "").strip()[:600]
    need(kind in ("investor", "lender", "company") and sid and text, "Write the note and choose who it is about")
    if kind == "company":
        company_of(st, sid)
    else:
        user_of(st, sid, kind)
    due = p.get("due") or None
    if due:
        D.d(due)
    st.notes.append(dict(id=uid("n"), subject_type=kind, subject_id=sid, text=text, due=due, done=False, by=u["id"], at=now()))
    return "Added a note" + (" due " + ddmmmyyyy(due) if due else ""), sid if kind == "company" else None


def a_toggle_note(st, u, p, today):
    need(u["role"] == "advisor", "Only advisors keep notes")
    n = find(st.notes, p.get("note_id"))
    need(n, "Note not found")
    n["done"] = not n["done"]
    return ("Completed" if n["done"] else "Reopened") + " a task", n["subject_id"] if n["subject_type"] == "company" else None


def a_mark_invoice_paid(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor records payments")
    f = find(st.invoices, p.get("invoice_id"))
    need(f and not f["paid_on"], "Invoice not found or already paid")
    f["paid_on"] = valid_date(p.get("date") or today)
    return "Invoice %s marked paid (%s + GST)" % (f["id"], rs(f["amount_paise"])), f["company_id"]


def a_save_invoice(st, u, p, today):
    need(u["role"] == "advisor", "Only an advisor raises invoices")
    kind = p.get("kind")
    need(kind in ("advisory", "success", "revenue_share", "monitoring", "transfer"), "Unknown fee type")
    c = company_of(st, p.get("company_id"))
    amount = inum(p.get("amount_paise"))
    need(amount and amount > 0, "Enter the amount")
    payer = "lender" if kind in ("monitoring", "transfer") else "company"
    payer_id = c["id"] if payer == "company" else user_of(st, p.get("payer_id"), "lender")["id"]
    due = valid_date(p.get("due") or D.add_days(today, 15))
    st.invoices.append(dict(id=uid("f"), kind=kind, company_id=c["id"], payer=payer, payer_id=payer_id, period=str(p.get("period") or "")[:60],
                            amount_paise=amount, gst_paise=amount * 18 // 100, issued=today, due=due, paid_on=None))
    return "Raised a %s invoice for %s: %s + GST" % (kind.replace("_", " "), c["name"], rs(amount)), c["id"]


ACTIONS = {name[2:]: fn for name, fn in list(globals().items()) if name.startswith("a_") and callable(fn)}
```

### `server/domain.py`

Money, DSCR, repayment schedules, XIRR and limits.

```python
"""Pure business arithmetic shared by the rules, the API and the tests.

Money is integer paise everywhere. Dates are ISO strings: "YYYY-MM-DD" for business dates.
site/domain.js is a line-for-line mirror for the browser; keep the two in step
(server/tests/test_parity.py runs both on the same inputs).
"""
import math
from datetime import date

SETTINGS_DEFAULT = dict(
    id="settings",
    max_platform_investors=20,
    offer_limit=200, offer_warn=150,
    member_limit=200, member_warn=180,
    lock_months=6,
)
SECURITY_TYPES = ("equity", "preference", "debentures")
PIPELINE = ("applied", "under_review", "approved", "offering", "funded", "monitoring", "closed", "rejected")
DOC_CHECKLIST = (
    ("valuation_report", "Registered valuer's report"),
    ("mgt14", "Special resolution filed (MGT-14)"),
    ("pas4", "PAS-4 offer letters issued"),
    ("bank_account", "Separate bank account for the issue"),
    ("allotment", "Shares allotted"),
    ("pas3", "PAS-3 filed (within 15 days of allotment)"),
    ("demat_credit", "Shares credited to demat"),
)


def d(s):
    return date.fromisoformat(s[:10])


def add_months(s, n):
    """Same day n calendar months later, clamped to the month's last day."""
    x = d(s)
    m = x.month - 1 + n
    y, m = x.year + m // 12, m % 12 + 1
    last = [31, 29 if (y % 4 == 0 and y % 100 != 0) or y % 400 == 0 else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]
    return date(y, m, min(x.day, last)).isoformat()


def add_days(s, n):
    return date.fromordinal(d(s).toordinal() + n).isoformat()


def days_between(a, b):
    return d(b).toordinal() - d(a).toordinal()


def fy(s):
    """Indian financial year, April to March: 2026-10-19 -> '2026-27'."""
    x = d(s)
    y = x.year if x.month >= 4 else x.year - 1
    return "%d-%02d" % (y, (y + 1) % 100)


def half_up(x):
    return int(math.floor(x + 0.5))


# ---------------- loans ----------------
def schedule(loan, today):
    """Monthly schedule in paise. Interest-only during the moratorium, then a level EMI.
    Interest each month = opening x rate / 12, rounded to the paisa; the last instalment clears the balance."""
    P, bps = int(loan["amount_paise"]), int(loan["rate_bps"])
    T, M = int(loan["tenor_months"]), int(loan.get("moratorium_months") or 0)
    start, paid = loan.get("disbursal_date"), loan.get("payments") or {}
    if not start or P <= 0 or T <= 0:
        return []
    r = bps / 120000.0
    n = T - M
    f = 1.0
    for _ in range(n):
        f = f * (1 + r)
    emi = half_up(P * r * f / (f - 1)) if n > 0 and r > 0 else (half_up(P / n) if n > 0 else 0)
    rows, opening = [], P
    for k in range(1, T + 1):
        due = add_months(start, k)
        interest = half_up(opening * bps / 120000.0)
        if k <= M:
            principal = 0
        elif k == T:
            principal = opening
        else:
            principal = min(emi - interest, opening)
        closing = opening - principal
        status = "paid" if due in paid else ("overdue" if due < today else "pending")
        rows.append(dict(n=k, due=due, opening=opening, interest=interest, principal=principal,
                         payment=interest + principal, closing=closing, status=status, paid_on=paid.get(due)))
        opening = closing
    return rows


def loan_summary(loan, today):
    rows = schedule(loan, today)
    paid = [r for r in rows if r["status"] == "paid"]
    unpaid = [r for r in rows if r["status"] != "paid"]
    month = today[:7]
    nxt = unpaid[0] if unpaid else None
    repaid = sum(r["principal"] for r in paid)
    return dict(
        disbursed=int(loan["amount_paise"]) if rows else 0,
        principal_repaid=repaid,
        principal_pending=(int(loan["amount_paise"]) - repaid) if rows else 0,
        interest_earned=sum(r["interest"] for r in paid),
        interest_this_month=sum(r["interest"] for r in rows if r["due"][:7] == month),
        monthly_interest=nxt["interest"] if nxt else 0,
        next_due=nxt and nxt["due"], next_amount=nxt and nxt["payment"],
        overdue=sum(1 for r in rows if r["status"] == "overdue"),
        remaining_months=len(unpaid),
    )


def min_holding_months(loan):
    """RBI transfer of loan exposures (2021): 3 months for loans of 2 years or less, otherwise 6 months."""
    return 3 if int(loan["tenor_months"]) <= 24 else 6


# ---------------- cap table and counters ----------------
def platform_investors(st, cid):
    return sorted({h["investor_id"] for h in st["holdings"] if h["company_id"] == cid and h["shares"] > 0})


def members(st, cid):
    """Section 2(68): founders and existing shareholders (each row may stand for several holders) plus platform investors."""
    return sum(int(e.get("holders") or 1) for e in st["cap_table"] if e["company_id"] == cid and e["shares"] > 0) + len(platform_investors(st, cid))


def fd_shares(st, cid):
    c = next(x for x in st["companies"] if x["id"] == cid)
    return (sum(e["shares"] for e in st["cap_table"] if e["company_id"] == cid)
            + sum(h["shares"] for h in st["holdings"] if h["company_id"] == cid)
            + int(c.get("fd_extra_shares") or 0))


def offers_used(st, cid, year, sec):
    """Section 42: each person offered counts once per financial year and security type, plus offers the company made off-platform."""
    c = next(x for x in st["companies"] if x["id"] == cid)
    on = {o["investor_id"] for o in st["offers"] if o["company_id"] == cid and o["fy"] == year and o["security_type"] == sec}
    return len(on) + int(((c.get("external_offers") or {}).get(year) or {}).get(sec) or 0)


def latest_valuation(st, cid, on=None):
    v = [x for x in st["valuations"] if x["company_id"] == cid and (on is None or x["date"] <= on)]
    return max(v, key=lambda x: x["date"]) if v else None


def lock_until(h, settings):
    return add_months(h["allotment_date"], settings["lock_months"])


def holding_view(st, h, today, settings):
    v = latest_valuation(st, h["company_id"])
    cost = int(h["cost_paise"])
    price = v["price_per_share_paise"] if v else (cost // h["shares"] if h["shares"] else 0)
    value = h["shares"] * price
    unlock = lock_until(h, settings)
    return dict(
        id=h["id"], company_id=h["company_id"], shares=h["shares"], cost=cost,
        avg_cost=(cost / h["shares"]) if h["shares"] else 0,
        price=price, valuation_date=v and v["date"], value=value,
        gain=value - cost, gain_pct=((value - cost) / cost) if cost else 0,
        ownership=h["shares"] / fd_shares(st, h["company_id"]),
        lock_until=unlock, eligible=today >= unlock or bool(h.get("early_consent")),
    )


def portfolio(st, investor_id, today, settings):
    rows = [holding_view(st, h, today, settings) for h in st["holdings"] if h["investor_id"] == investor_id and h["shares"] > 0]
    inv, val = sum(r["cost"] for r in rows), sum(r["value"] for r in rows)
    return dict(rows=rows, invested=inv, value=val, gain=val - inv, gain_pct=((val - inv) / inv) if inv else 0, companies=len(rows))


def capital_gains_estimate(holding, view, today):
    """Unlisted shares: 24 months or more is long-term at 12.5%; shorter is short-term at the investor's slab rate."""
    months = days_between(holding["allotment_date"], today) / 30.4375
    long_term = months >= 24
    gain = view["gain"]
    return dict(months=months, long_term=long_term, gain=gain, tax=half_up(max(gain, 0) * 0.125) if long_term else None)
```

### `server/seed.py`

The fictional sample companies, people and loans.

```python
"""Fictional demo data, defined once.

seed_data(rel) builds every collection. `rel(months, days, ts=False)` turns an offset from today into a date,
so the demo never goes stale. The server passes a resolver; site/build.py passes a marker writer
("@m,d" / "@T m,d") and site/store.js resolves the markers in the browser, so both modes start identical.
"""
from server.domain import SETTINGS_DEFAULT

INVESTORS = [  # id suffix, name, firm, sectors, ticket lakh (min, max), kyc, accredited
    ("", "Meera Iyer", "Konkan Growth Partners", ["Auto components", "Plastics & packaging"], (500, 2000), "verified", True),
    ("2", "Vikram Bhatt", "Sahyadri Angels Network", ["Chemicals", "Food processing"], (200, 1000), "verified", True),
    ("3", "Arvind Rao", "Rao Family Office", ["Plastics & packaging", "Auto components"], (1000, 3000), "verified", True),
    ("04", "Ananya Kulkarni", "Kulkarni Family Office", ["Auto components", "Engineering"], (50, 300), "verified", True),
    ("05", "Rohan Mehta", "Mehta Holdings", ["Plastics & packaging"], (50, 200), "verified", False),
    ("06", "Sneha Patil", "Patil Angels", ["Food processing", "Chemicals"], (25, 150), "verified", False),
    ("07", "Karan Shah", "Shah Capital", ["Auto components"], (100, 500), "verified", True),
    ("08", "Divya Menon", "Menon Investments", ["Plastics & packaging", "Pharma"], (50, 250), "verified", True),
    ("09", "Aditya Joshi", "Joshi Family Trust", ["Engineering"], (25, 100), "verified", False),
    ("10", "Pooja Agarwal", "Agarwal Ventures", ["Textiles", "Auto components"], (50, 300), "verified", True),
    ("11", "Nikhil Rane", "Rane Partners", ["Chemicals"], (100, 400), "verified", True),
    ("12", "Kavya Reddy", "Reddy Growth Fund", ["Pharma", "Chemicals"], (200, 800), "verified", True),
    ("13", "Siddharth Gupta", "Gupta Family Office", ["Auto components", "Electronics"], (100, 600), "verified", True),
    ("14", "Meenal Desai", "Desai Angels", ["Food processing"], (25, 100), "verified", False),
    ("15", "Harsh Vora", "Vora Capital", ["Plastics & packaging", "Engineering"], (50, 250), "verified", True),
    ("16", "Ishita Banerjee", "Banerjee Holdings", ["Textiles"], (25, 150), "verified", False),
    ("17", "Varun Nair", "Nair Ventures", ["Auto components", "Plastics & packaging"], (100, 500), "verified", True),
    ("18", "Tanvi Kapoor", "Kapoor Family Trust", ["Electronics"], (50, 200), "verified", True),
    ("19", "Omkar Sawant", "Sawant Investments", ["Engineering", "Auto components"], (25, 120), "verified", False),
    ("20", "Ritu Malhotra", "Malhotra Partners", ["Pharma"], (100, 400), "verified", True),
    ("21", "Farhan Qureshi", "Qureshi Capital", ["Chemicals", "Plastics & packaging"], (50, 300), "verified", True),
    ("22", "Gauri Bhosale", "Bhosale Family Office", ["Chemicals"], (25, 150), "verified", True),
    ("23", "Manish Jain", "Jain Ventures", ["Plastics & packaging", "Textiles"], (50, 250), "pending", False),
    ("24", "Leela Krishnan", "Krishnan Angels", ["Food processing", "Pharma"], (25, 100), "verified", True),
    ("25", "Deepak Chawla", "Chawla Holdings", ["Auto components"], (100, 500), "pending", True),
]
LAKH = 100_000 * 100  # one lakh rupees in paise
CRORE = 100 * LAKH


def inv_id(sfx):
    return "u_investor" + sfx


def seed_data(rel):
    T = lambda m=0, dd=0: rel(m, dd, True)  # noqa: E731
    D = lambda m=0, dd=0: rel(m, dd, False)  # noqa: E731
    users = [
        dict(id="u_founder", email="founder@demo.in", name="Priya Nair", role="founder", company_id="c_kalyan", title="Managing Director"),
        dict(id="u_founder2", email="rahul@demo.in", name="Rahul Deshmukh", role="founder", company_id="c_vasai", title="Founder"),
        dict(id="u_founder3", email="farah@demo.in", name="Farah Shaikh", role="founder", company_id="c_taloja", title="Director"),
        dict(id="u_advisor", email="advisor@demo.in", name="CA Neha Joshi", role="advisor", firm="Aegis Ascend Financial Advisors", title="Reviewing advisor"),
        dict(id="u_lender", email="lender@demo.in", name="Suresh Pillai", role="lender", firm="Harbour Bank (sample)", title="Credit manager",
             profile=dict(regulated=True, lender_type="Bank", reg_no="Sample bank licence")),
        dict(id="u_lender2", email="nbfc@demo.in", name="Kavita Rane", role="lender", firm="Sahyadri Finance NBFC (sample)", title="Head of SME lending",
             profile=dict(regulated=True, lender_type="NBFC", reg_no="Sample RBI CoR")),
        dict(id="u_lender3", email="konkanbank@demo.in", name="Mahesh Gawde", role="lender", firm="Konkan Co-operative Bank (sample)", title="Branch credit head",
             profile=dict(regulated=True, lender_type="Bank", reg_no="Sample bank licence")),
        dict(id="u_lender4", email="deccan@demo.in", name="Neelam Sethi", role="lender", firm="Deccan Capital NBFC (sample)", title="Credit lead",
             profile=dict(regulated=True, lender_type="NBFC", reg_no="Sample RBI CoR")),
    ]
    emails = {"": "investor@demo.in", "2": "angels@demo.in", "3": "familyoffice@demo.in"}
    for k, (sfx, name, firm, sectors, (tmin, tmax), kyc, acc) in enumerate(INVESTORS):
        users.append(dict(id=inv_id(sfx), email=emails.get(sfx, "inv%s@demo.in" % sfx), name=name, role="investor",
                          firm=firm + ("" if sfx in emails else " (sample)"),
                          mandate=dict(sectors=sectors, past_sectors=[], stages=["Growth", "Expansion"], ticket_min=tmin / 100, ticket_max=tmax / 100, instruments=["equity"]),
                          profile=dict(kyc=kyc, accredited=acc, nda_signed_at=T(-10 - k % 7, -k) if kyc == "verified" else None,
                                       ticket_min_paise=tmin * LAKH, ticket_max_paise=tmax * LAKH, last_active=T(0, -(k * 3) % 40))))

    cov = dict(dscr_min=1.25, debt_ebitda_max=3.5)
    full = {k: D(-8, -5 + i) for i, k in enumerate(["valuation_report", "mgt14", "pas4", "bank_account", "allotment", "pas3", "demat_credit"])}
    companies = [
        dict(id="c_kalyan", name="Kalyan Polymers Pvt Ltd", sector="Plastics & packaging", stage="Growth", city="Bhiwandi", revenue=68, instrument="equity",
             **{"raise": 12}, raise_paise=12 * CRORE, pipeline_stage="offering", stage_since=D(0, -20), security_type="equity", offer_price_paise=24000,
             fd_extra_shares=150_000, external_offers={"@fy": {"equity": 175}},
             checklist=dict(valuation_report=D(0, -25), mgt14=D(0, -18)), updates=[],
             twin={}, readiness={}, covenants=cov, quarters=[
                 dict(q="Q1 FY26", ebitda=1.6, interest=0.18, principal=0.55, debt=5.2), dict(q="Q2 FY26", ebitda=1.5, interest=0.17, principal=0.55, debt=4.7),
                 dict(q="Q3 FY26", ebitda=1.2, interest=0.15, principal=0.55, debt=4.1), dict(q="Q4 FY26", ebitda=0.95, interest=0.14, principal=0.55, debt=3.6)],
             docs=["Audited accounts FY24-FY26", "GST returns (12 months)", "CMA data FY25-FY28", "Cap table", "Debt vs equity report"]),
        dict(id="c_vasai", name="Vasai Precision Castings Pvt Ltd", sector="Auto components", stage="Growth", city="Vasai", revenue=112, instrument="equity",
             **{"raise": 25}, raise_paise=25 * CRORE, pipeline_stage="monitoring", stage_since=D(-7), security_type="equity", offer_price_paise=16000,
             allotment_date=D(-8), fd_extra_shares=200_000, external_offers={}, checklist=full,
             updates=[dict(date=D(-1, -4), text="Q1 FY27 revenue up 14% on last year; second casting line commissioned on schedule."),
                      dict(date=D(-4), text="Signed a three-year supply contract with a two-wheeler OEM.")],
             twin={"raise": 25, "pre_money": 140, "ebitda0": 13, "existing_ds": 3}, readiness=dict(dscr=1.62, collateral_cover=1.6, gst_on_time=12, data_room_ready=True), covenants=cov, quarters=[
                 dict(q="Q1 FY26", ebitda=3.4, interest=0.46, principal=0.9, debt=17.1), dict(q="Q2 FY26", ebitda=3.6, interest=0.44, principal=0.9, debt=16.2),
                 dict(q="Q3 FY26", ebitda=3.5, interest=0.42, principal=0.9, debt=15.3), dict(q="Q4 FY26", ebitda=3.9, interest=0.4, principal=0.9, debt=14.4)],
             docs=["Audited accounts FY24-FY26", "GST returns (12 months)", "Customer contracts", "Cap table", "Debt vs equity report"]),
        dict(id="c_taloja", name="Taloja Specialty Chemicals Pvt Ltd", sector="Chemicals", stage="Expansion", city="Taloja", revenue=45, instrument="equity",
             **{"raise": 8}, raise_paise=8 * CRORE, pipeline_stage="funded", stage_since=D(-5, -20), security_type="equity", offer_price_paise=9500,
             allotment_date=D(-6, 5), fd_extra_shares=80_000, external_offers={},
             checklist={k: v for k, v in dict(valuation_report=D(-6, -2), mgt14=D(-6, 0), pas4=D(-6, 1), bank_account=D(-6, 1), allotment=D(-6, 5), pas3=D(-6, 14)).items()},
             updates=[dict(date=D(-1, -12), text="Solvent recovery unit approved by the pollution control board.")],
             twin={"raise": 8, "pre_money": 36, "ebitda0": 4.2, "existing_ds": 0.8}, readiness=dict(dscr=1.3, audited_years=2), covenants=cov, quarters=[],
             docs=["Audited accounts FY25-FY26", "Cap table"]),
        dict(id="c_nashik", name="Nashik Agro Foods Pvt Ltd", sector="Food processing", stage="Expansion", city="Nashik", revenue=38, instrument="equity",
             **{"raise": 6}, raise_paise=6 * CRORE, pipeline_stage="under_review", stage_since=D(0, -3), security_type="equity", offer_price_paise=0,
             fd_extra_shares=0, external_offers={}, checklist={}, updates=[],
             twin={"raise": 6, "pre_money": 30, "ebitda0": 3.1, "existing_ds": 0.5}, readiness=dict(dscr=1.4, audited_years=3), covenants=cov, quarters=[],
             docs=["Audited accounts FY24-FY26"]),
    ]
    checks = dict(validation=True, founder_confirmed=True, verifier=True)
    reports = [
        dict(id="r_vasai", company_id="c_vasai", title="Debt vs equity: Rs 25 cr expansion", status="approved", engine_version="gb-engine 1.0.0",
             created_at=T(-9, -12), submitted_by="u_founder2", reviewed_by="u_advisor", reviewed_at=T(-9, -2),
             review_note="Assumptions within sector benchmarks. Stress case holds.", summary=dict(best_share=0.55, net=6.1, break_even=210, min_dscr=1.48, min_dscr_stress=1.07), checks=checks),
        dict(id="r_kalyan", company_id="c_kalyan", title="Debt vs equity: Rs 12 cr growth raise", status="approved", engine_version="gb-engine 1.0.0",
             created_at=T(0, -32), submitted_by="u_founder", reviewed_by="u_advisor", reviewed_at=T(0, -25),
             review_note="Debt capacity limited by the falling DSCR; equity-heavy mix is right.", summary=dict(best_share=0.25, net=1.4, break_even=96, min_dscr=1.31, min_dscr_stress=1.04), checks=checks),
        dict(id="r_taloja", company_id="c_taloja", title="Debt vs equity: Rs 8 cr capacity add", status="approved", engine_version="gb-engine 1.0.0",
             created_at=T(-7, -10), submitted_by="u_founder3", reviewed_by="u_advisor", reviewed_at=T(-7), review_note="Approved with a 40% debt cap.",
             summary=dict(best_share=0.4, net=1.2, break_even=58, min_dscr=1.31, min_dscr_stress=1.02), checks=checks),
        dict(id="r_nashik", company_id="c_nashik", title="Debt vs equity: Rs 6 cr cold-chain expansion", status="in_review", engine_version="gb-engine 1.0.0",
             created_at=T(0, -3), submitted_by="u_advisor", summary=dict(best_share=0.5, net=0.9, break_even=44, min_dscr=1.38, min_dscr_stress=1.06), checks=checks),
    ]
    cap = [
        dict(id="ct_k1", company_id="c_kalyan", holder_name="Priya Nair", holder_type="founder", shares=3_000_000, holders=1),
        dict(id="ct_k2", company_id="c_kalyan", holder_name="Suresh Nair", holder_type="founder", shares=1_200_000, holders=1),
        dict(id="ct_k3", company_id="c_kalyan", holder_name="Friends and family", holder_type="existing", shares=400_000, holders=12),
        dict(id="ct_v1", company_id="c_vasai", holder_name="Rahul Deshmukh", holder_type="founder", shares=4_200_000, holders=1),
        dict(id="ct_v2", company_id="c_vasai", holder_name="Anita Deshmukh", holder_type="founder", shares=1_800_000, holders=1),
        dict(id="ct_v3", company_id="c_vasai", holder_name="Employees and early shareholders", holder_type="existing", shares=900_000, holders=158),
        dict(id="ct_v4", company_id="c_vasai", holder_name="Konkan Angels LLP", holder_type="existing", shares=300_000, holders=1),
        dict(id="ct_t1", company_id="c_taloja", holder_name="Farah Shaikh", holder_type="founder", shares=2_000_000, holders=1),
        dict(id="ct_t2", company_id="c_taloja", holder_name="Imran Shaikh", holder_type="founder", shares=800_000, holders=1),
        dict(id="ct_t3", company_id="c_taloja", holder_name="Early backers", holder_type="existing", shares=250_000, holders=6),
        dict(id="ct_n1", company_id="c_nashik", holder_name="Sunil Pawar", holder_type="founder", shares=1_500_000, holders=1),
        dict(id="ct_n2", company_id="c_nashik", holder_name="Rekha Pawar", holder_type="founder", shares=1_000_000, holders=1),
    ]

    # Vasai: 19 platform investors (the limit test sits at 19 / 20); Taloja: 4, still inside the 6-month lock.
    vasai = [("", 400), ("3", 300)] + list(zip(["%02d" % i for i in range(4, 21)], [80, 64, 48, 120, 96, 40, 56, 72, 88, 104, 48, 64, 32, 40, 56, 80, 72]))
    taloja = [("", 120), ("2", 80), ("21", 60), ("22", 50)]
    holdings, offers = [], []
    for sfx, lakh in vasai:
        shares = lakh * LAKH // 16000
        holdings.append(dict(id="h_v" + (sfx or "1"), investor_id=inv_id(sfx), company_id="c_vasai", shares=shares, allotment_date=D(-8),
                             invested_at=D(-8, -12), cost_paise=shares * 16000, origin="allotment", early_consent=None))
        offers.append(dict(id="o_v" + (sfx or "1"), company_id="c_vasai", investor_id=inv_id(sfx), fy="@fy" + rel(-9, 0, False), security_type="equity",
                           sent_at=T(-9), sent_by="u_advisor", response="invested", responded_at=T(-9, 6), share_identity=True, views=[]))
    for sfx, lakh in taloja:
        shares = lakh * LAKH // 9500
        holdings.append(dict(id="h_t" + (sfx or "1"), investor_id=inv_id(sfx), company_id="c_taloja", shares=shares, allotment_date=D(-6, 5),
                             invested_at=D(-6, -8), cost_paise=shares * 9500, origin="allotment", early_consent=None))
        offers.append(dict(id="o_t" + (sfx or "1"), company_id="c_taloja", investor_id=inv_id(sfx), fy="@fy" + rel(-6, -20, False), security_type="equity",
                           sent_at=T(-6, -20), sent_by="u_advisor", response="invested", responded_at=T(-6, -14), share_identity=True, views=[]))
    for sfx in ("23", "24"):
        offers.append(dict(id="o_t" + sfx, company_id="c_taloja", investor_id=inv_id(sfx), fy="@fy" + rel(-6, -20, False), security_type="equity",
                           sent_at=T(-6, -20), sent_by="u_advisor", response="declined", responded_at=T(-6, -15), share_identity=False, views=[]))
    # Kalyan: 20 platform offers this year + 175 made off-platform = 195 / 200.
    responses = {"2": ("interested", True), "3": ("declined", False), "05": ("interested", False), "08": ("interested", True), "10": ("declined", False)}
    for k, sfx in enumerate(["", "2", "3"] + ["%02d" % i for i in range(4, 21)]):
        resp, share = responses.get(sfx, ("pending", False))
        offers.append(dict(id="o_k" + (sfx or "1"), company_id="c_kalyan", investor_id=inv_id(sfx), fy="@fy", security_type="equity",
                           sent_at=T(0, -6 - k % 5), sent_by="u_advisor", response=resp, responded_at=T(0, -2) if resp != "pending" else None,
                           share_identity=share, views=[]))

    valuations = [
        dict(id="v_v1", company_id="c_vasai", date=D(-8), price_per_share_paise=16000, method="Market multiples", valuer="R. K. Valuers (sample)", report_file=None, published_at=T(-8), published_by="u_advisor"),
        dict(id="v_v2", company_id="c_vasai", date=D(-5), price_per_share_paise=17200, method="DCF", valuer="R. K. Valuers (sample)", report_file=None, published_at=T(-5, 2), published_by="u_advisor"),
        dict(id="v_v3", company_id="c_vasai", date=D(-2), price_per_share_paise=18400, method="DCF", valuer="R. K. Valuers (sample)", report_file=None, published_at=T(-2, 2), published_by="u_advisor"),
        dict(id="v_t1", company_id="c_taloja", date=D(-6, 5), price_per_share_paise=9500, method="DCF", valuer="Mehta & Associates, Registered Valuers (sample)", report_file=None, published_at=T(-6, 5), published_by="u_advisor"),
        dict(id="v_t2", company_id="c_taloja", date=D(-3, -10), price_per_share_paise=9100, method="Market multiples", valuer="Mehta & Associates, Registered Valuers (sample)", report_file=None, published_at=T(-3, -8), published_by="u_advisor"),
        dict(id="v_k1", company_id="c_kalyan", date=D(0, -25), price_per_share_paise=24000, method="DCF", valuer="R. K. Valuers (sample)", report_file=None, published_at=T(0, -24), published_by="u_advisor"),
    ]
    sell_requests = [dict(id="s_1", holding_id="h_v3", investor_id=inv_id("3"), company_id="c_vasai", shares=300 * LAKH // 16000, full=True,
                          indicative_price_paise=19000, note="Rebalancing the family office book.", status="submitted", rofr_days=None, rofr_until=None,
                          buyer_investor_id=None, spa_date=None, price_paise=None, reason=None, created_at=T(0, -2),
                          history=[dict(status="submitted", at=T(0, -2), by=inv_id("3"))])]
    # loans: payments recorded for every instalment already due, except the latest one on l_2 (overdue)
    loans = [
        dict(id="l_1", lender_id="u_lender", company_id="c_vasai", amount_paise=18 * CRORE, rate_bps=1025, tenor_months=84, moratorium_months=6, sanction_date=D(-18, -20), disbursal_date=D(-18), skip_last=0),
        dict(id="l_2", lender_id="u_lender", company_id="c_kalyan", amount_paise=6 * CRORE, rate_bps=1150, tenor_months=60, moratorium_months=0, sanction_date=D(-20, -15), disbursal_date=D(-20, -10), skip_last=1),
        dict(id="l_3", lender_id="u_lender", company_id="c_taloja", amount_paise=35 * CRORE // 10, rate_bps=1100, tenor_months=48, moratorium_months=3, sanction_date=D(-7, -12), disbursal_date=D(-7), skip_last=0),
        dict(id="l_4", lender_id="u_lender2", company_id="c_kalyan", amount_paise=25 * CRORE // 10, rate_bps=1250, tenor_months=36, moratorium_months=0, sanction_date=D(-14, -9), disbursal_date=D(-14), skip_last=0),
        dict(id="l_5", lender_id="u_lender3", company_id="c_vasai", amount_paise=5 * CRORE, rate_bps=975, tenor_months=60, moratorium_months=0, sanction_date=D(-30, -14), disbursal_date=D(-30), skip_last=0),
        dict(id="l_6", lender_id="u_lender4", company_id="c_nashik", amount_paise=15 * CRORE // 10, rate_bps=1300, tenor_months=24, moratorium_months=0, sanction_date=D(-5, -10), disbursal_date=D(-5), skip_last=0),
    ]
    for l in loans:
        l.update(status="disbursed", created_at=l["sanction_date"], payments="@paid:%d" % l.pop("skip_last"))
    loan_transfers = [dict(id="lt_1", loan_id="l_4", from_lender_id="u_lender2", amount_paise=None, note="Portfolio rebalancing: reducing plastics exposure.",
                           status="submitted", buyer_lender_id=None, fee_rate=None, fee_paise=None, created_at=T(0, -3),
                           history=[dict(status="submitted", at=T(0, -3), by="u_lender2")])]

    def inv(id_, kind, cid, payer, payer_id, period, amount, issued, due, paid):
        return dict(id=id_, kind=kind, company_id=cid, payer=payer, payer_id=payer_id, period=period, amount_paise=amount,
                    gst_paise=amount * 18 // 100, issued=issued, due=due, paid_on=paid)
    vasai_raised = sum(h["cost_paise"] for h in holdings if h["company_id"] == "c_vasai")
    taloja_raised = sum(h["cost_paise"] for h in holdings if h["company_id"] == "c_taloja")
    q_rev_vasai = 112 * CRORE // 4 * 4 // 1000  # 0.4% of a quarter's revenue
    invoices = [
        inv("f_1", "advisory", "c_vasai", "company", "c_vasai", "Engagement", LAKH, D(-10), D(-9, -15), D(-9, -18)),
        inv("f_2", "advisory", "c_kalyan", "company", "c_kalyan", "Engagement", LAKH, D(-2), D(-1, -15), D(-1, -20)),
        inv("f_3", "advisory", "c_taloja", "company", "c_taloja", "Engagement", LAKH, D(-8), D(-7, -15), D(-7, -10)),
        inv("f_4", "advisory", "c_nashik", "company", "c_nashik", "Engagement", LAKH, D(0, -12), D(0, 3), None),
        inv("f_5", "success", "c_vasai", "company", "c_vasai", "Equity raise", vasai_raised * 25 // 1000, D(-8), D(-7, -15), D(-7, -12)),
        inv("f_6", "success", "c_taloja", "company", "c_taloja", "Equity raise", taloja_raised * 25 // 1000, D(-6, 5), D(-5, -10), D(-5, -12)),
        inv("f_7", "revenue_share", "c_vasai", "company", "c_vasai", "Quarter 1", q_rev_vasai, D(-5), D(-4, -15), D(-4, -16)),
        inv("f_8", "revenue_share", "c_vasai", "company", "c_vasai", "Quarter 2", q_rev_vasai, D(-2), D(-1, -15), D(-1, -14)),
        inv("f_9", "revenue_share", "c_taloja", "company", "c_taloja", "Quarter 1", 45 * CRORE // 4 * 4 // 1000, D(-3, 5), D(0, -5), None),
        inv("f_10", "revenue_share", "c_vasai", "company", "c_vasai", "Quarter 3", q_rev_vasai, D(0, -5), D(0, 10), None),
        inv("f_11", "monitoring", "c_vasai", "lender", "u_lender", "Loan l_1, last quarter", 18 * CRORE * 35 // 10000 // 4, D(-1), D(0, -15), D(0, -14)),
        inv("f_12", "monitoring", "c_kalyan", "lender", "u_lender2", "Loan l_4, last quarter", 25 * CRORE // 10 * 35 // 10000 // 4, D(-1), D(0, -15), None),
    ]
    notes = [
        dict(id="n_1", subject_type="company", subject_id="c_taloja", text="Chase the depository for the demat credit confirmation.", due=D(0, 2), done=False, by="u_advisor", at=T(0, -4)),
        dict(id="n_2", subject_type="investor", subject_id=inv_id("05"), text="Call Rohan about his Kalyan interest and ticket size.", due=D(0, -1), done=False, by="u_advisor", at=T(0, -3)),
        dict(id="n_3", subject_type="lender", subject_id="u_lender2", text="Share the l_4 monitoring pack with interested buyers.", due=D(0, 5), done=False, by="u_advisor", at=T(0, -2)),
    ]
    notifications = [
        dict(id="nt_1", user_id=inv_id(""), kind="offer", text="New private offer: Kalyan Polymers Pvt Ltd", link="app-opportunities", at=T(0, -6), read=False),
        dict(id="nt_2", user_id=inv_id(""), kind="valuation", text="Revaluation published: Vasai Precision Castings at Rs 184.00 a share", link="app-portfolio", at=T(-2, 2), read=True),
        dict(id="nt_3", user_id=inv_id("3"), kind="sell", text="Your sell request for Vasai Precision Castings was submitted", link="app-portfolio", at=T(0, -2), read=False),
        dict(id="nt_4", user_id="u_lender2", kind="transfer", text="Loan transfer request for Kalyan Polymers received by Aegis Ascend", link="app-loanbook", at=T(0, -3), read=False),
    ]
    intros = [
        dict(id="i_1", company_id="c_kalyan", investor_id=inv_id("2"), status="requested", created_at=T(0, -1), nda_signed_at=None, views=[]),
        dict(id="i_2", company_id="c_kalyan", investor_id=inv_id("08"), status="granted", created_at=T(0, -4), nda_signed_at=T(0, -3),
             views=[dict(doc="Audited accounts FY24-FY26", at=T(0, -3)), dict(doc="CMA data FY25-FY28", at=T(0, -2))]),
        dict(id="i_3", company_id="c_vasai", investor_id=inv_id(""), status="granted", created_at=T(-9, 2), nda_signed_at=T(-9, 3),
             views=[dict(doc="Debt vs equity report", at=T(-9, 3))]),
    ]
    return dict(users=users, companies=companies, reports=reports, intros=intros, cap_table=cap, holdings=holdings, offers=offers, valuations=valuations,
                sell_requests=sell_requests, transfers=[], loans=loans, loan_transfers=loan_transfers, invoices=invoices, notes=notes,
                notifications=notifications, files=[], enquiries=[], settings=[dict(SETTINGS_DEFAULT)])


def finalize(data, today):
    """Resolve the two markers that need today or another field: "@fy[date]" and a loan's "@paid:N"."""
    from server.domain import add_months, fy

    def walk(x):
        if isinstance(x, dict):
            return {(fy(today) if k == "@fy" else k): walk(v) for k, v in x.items()}
        if isinstance(x, list):
            return [walk(v) for v in x]
        if isinstance(x, str) and x.startswith("@fy"):
            return fy(x[3:] or today)
        return x
    data = walk(data)
    for l in data["loans"]:
        skip = int(str(l["payments"]).split(":")[1])
        due = [add_months(l["disbursal_date"], k) for k in range(1, l["tenor_months"] + 1)]
        due = [x for x in due if x < today]
        l["payments"] = {x: x for x in due[:len(due) - skip]}
    return data


def resolved(today):
    from server.domain import add_days, add_months
    return finalize(seed_data(lambda m, dd, ts: (lambda s: s + "T10:00:00+00:00" if ts else s)(add_days(add_months(today, m), dd))), today)


def markers():
    """The same data with relative-date markers, for the browser demo to resolve on first load."""
    return seed_data(lambda m, dd, ts: ("@T" if ts else "@") + "%d,%d" % (m, dd))
```

### `server/requirements.txt`

Python dependencies.

```text
flask>=3.0
```


---

## 8. Tests

Run with: python -m pytest server/tests fundmix/tests  and  node site/tests/store.test.js

### `server/tests/test_server.py`

Server rules, permissions and flows.

```python
import json, os, sqlite3, sys
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from server import app as srv  # noqa: E402
from server import domain as D  # noqa: E402

H = {"X-Requested-With": "glassbox"}
TODAY = "2026-10-19"


@pytest.fixture()
def client(tmp_path):
    srv.app.config.update(DATABASE=str(tmp_path / "t.db"), UPLOADS=str(tmp_path / "up"), TESTING=True, TODAY=TODAY)
    srv._FAILS.clear()
    srv.init_db(seed_demo=True)
    return srv.app.test_client()


def store():
    conn = sqlite3.connect(srv.app.config["DATABASE"])
    conn.row_factory = sqlite3.Row
    return srv.Store(conn)


def login(c, email, pw="demo1234"):
    c.post("/api/logout", headers=H)
    r = c.post("/api/login", json={"email": email, "password": pw}, headers=H)
    assert r.status_code == 200, r.get_json()
    return r.get_json()["user"]


def act(c, name, payload, status=200):
    r = c.post("/api/act/" + name, json=payload, headers=H)
    assert r.status_code == status, (name, r.get_json())
    return r.get_json()


def state(c):
    r = c.get("/api/state")
    assert r.status_code == 200
    return r.get_json()


CHECKS = {"validation": True, "founder_confirmed": True, "verifier": True}


# ---------------- platform basics ----------------
def test_pages_served(client):
    r = client.get("/")
    assert r.status_code == 200 and b"/static/portal.js" in r.data and b"/static/ws-advisor.js" in r.data
    assert "frame-ancestors 'none'" in r.headers["Content-Security-Policy"]
    for f in srv.SCRIPTS:
        assert client.get("/static/" + f).status_code == 200, f
    assert client.get("/static/store.js").status_code == 404  # demo store is never served
    assert client.get("/static/../server/app.py").status_code == 404
    r = client.get("/fundmix.html")  # the CMA tool is advisors-only
    assert r.status_code == 401 and b"Advisors only" in r.data
    login(client, "advisor@demo.in")
    assert "noindex" in client.get("/api/state").headers["X-Robots-Tag"]


def test_passwords_are_hashed(client):
    conn = sqlite3.connect(srv.app.config["DATABASE"])
    h = conn.execute("SELECT pw_hash FROM users WHERE email='founder@demo.in'").fetchone()[0]
    assert "demo1234" not in h and h.startswith(("scrypt:", "pbkdf2:"))


def test_requires_login_and_csrf_header(client):
    assert client.get("/api/state").status_code == 401
    assert client.post("/api/act/save_company", json={}, headers=H).status_code == 401
    r = client.post("/api/login", json={"email": "founder@demo.in", "password": "demo1234"})
    assert r.status_code == 400  # no custom header -> blocked


def test_wrong_password_and_throttle(client):
    for _ in range(5):
        assert client.post("/api/login", json={"email": "founder@demo.in", "password": "nope"}, headers=H).status_code == 401
    assert client.post("/api/login", json={"email": "founder@demo.in", "password": "demo1234"}, headers=H).status_code == 429


def test_signup_rules(client):
    assert client.post("/api/signup", json={"name": "X", "email": "x@y.in", "password": "1234567", "role": "founder"}, headers=H).status_code == 400
    assert client.post("/api/signup", json={"name": "X", "email": "x@y.in", "password": "12345678", "role": "advisor"}, headers=H).status_code == 400
    assert client.post("/api/signup", json={"name": "X", "email": "founder@demo.in", "password": "12345678", "role": "founder"}, headers=H).status_code == 409
    r = client.post("/api/signup", json={"name": "New", "email": "new@co.in", "password": "secret123", "role": "founder", "org": "NewCo"}, headers=H)
    assert r.status_code == 200
    s = state(client)
    assert [c["name"] for c in s["companies"]] == ["NewCo"] and s["companies"][0]["pipeline_stage"] == "applied"


def test_seed_matches_the_brief(client):
    st = store()
    fy = D.fy(TODAY)
    assert sum(1 for u in st.users if u["role"] == "investor") == 25
    assert sum(1 for u in st.users if u["role"] == "lender") == 4 and len(st.loans) == 6
    assert len(D.platform_investors(st, "c_vasai")) == 19
    assert D.offers_used(st, "c_kalyan", fy, "equity") == 195
    assert sum(D.loan_summary(l, TODAY)["overdue"] for l in st.loans) == 1
    assert all(sum(1 for v in st.valuations if v["company_id"] == c) >= 2 for c in ("c_vasai", "c_taloja"))
    assert len([x for x in st.sell_requests if x["status"] == "submitted"]) == 1 and len(st.loan_transfers) == 1
    assert len({c["pipeline_stage"] for c in st.companies}) >= 3


# ---------------- required rule tests ----------------
def test_cannot_sell_before_six_months(client):
    login(client, "investor@demo.in")
    r = client.post("/api/act/request_sell", json={"holding_id": "h_t1"}, headers=H)  # Taloja, allotted under 6 months ago
    assert r.status_code == 403 and "Locked" in r.get_json()["error"] and "24 Oct 2026" in r.get_json()["error"]
    act(client, "request_sell", {"holding_id": "h_v1", "shares": 1000, "indicative_price_paise": 19500, "note": "part sale"})
    s = state(client)
    assert any(x["holding_id"] == "h_v1" and x["status"] == "submitted" and not x["full"] for x in s["sell_requests"])
    # the founder's written consent, recorded by the advisor, lifts the lock early
    login(client, "advisor@demo.in")
    act(client, "record_consent", {"holding_id": "h_t1", "note": "Farah Shaikh, letter dated 15 Oct 2026"})
    login(client, "investor@demo.in")
    act(client, "request_sell", {"holding_id": "h_t1"})


def test_offer_over_200_in_a_financial_year_is_blocked(client):
    login(client, "advisor@demo.in")
    for sfx in ("23", "25"):
        act(client, "set_investor_profile", {"investor_id": "u_investor" + sfx, "kyc": "verified"})
    five = ["u_investor%s" % s for s in ("21", "22", "23", "24", "25")]
    # a new, verified investor makes six: 195 + 6 = 201 -> the whole share is refused
    client.post("/api/logout", headers=H)
    new = client.post("/api/signup", json={"name": "Six", "email": "six@x.in", "password": "secret123", "role": "investor"}, headers=H).get_json()["user"]
    login(client, "advisor@demo.in")
    act(client, "set_investor_profile", {"investor_id": new["id"], "kyc": "verified"})
    r = client.post("/api/act/share_offer", json={"company_id": "c_kalyan", "investor_ids": five + [new["id"]]}, headers=H)
    assert r.status_code == 403 and "Section 42" in r.get_json()["error"]
    assert D.offers_used(store(), "c_kalyan", D.fy(TODAY), "equity") == 195
    act(client, "share_offer", {"company_id": "c_kalyan", "investor_ids": five})
    assert D.offers_used(store(), "c_kalyan", D.fy(TODAY), "equity") == 200
    act(client, "share_offer", {"company_id": "c_kalyan", "investor_ids": [new["id"]]}, 403)
    # the same investor offered again in the same year does not count twice
    act(client, "share_offer", {"company_id": "c_kalyan", "investor_ids": ["u_investor21"]}, 403)
    # a different kind of security has its own 200
    act(client, "share_offer", {"company_id": "c_kalyan", "investor_ids": [new["id"]], "security_type": "debentures"})


def test_twenty_first_platform_investor_is_blocked(client):
    login(client, "advisor@demo.in")
    act(client, "set_stage", {"company_id": "c_vasai", "stage": "offering"})
    act(client, "share_offer", {"company_id": "c_vasai", "investor_ids": ["u_investor21", "u_investor22"]})
    offers = {o["investor_id"]: o for o in state(client)["offers"] if o["company_id"] == "c_vasai"}
    for sfx in ("21", "22"):
        login(client, "inv%s@demo.in" % sfx)
        act(client, "respond_offer", {"offer_id": offers["u_investor" + sfx]["id"], "response": "interested"})
    login(client, "advisor@demo.in")
    act(client, "allot_shares", {"offer_id": offers["u_investor21"]["id"], "shares": 10000, "amount_paise": 10000 * 18400})
    assert len(D.platform_investors(store(), "c_vasai")) == 20
    r = client.post("/api/act/allot_shares", json={"offer_id": offers["u_investor22"]["id"], "shares": 10000, "amount_paise": 10000 * 18400}, headers=H)
    assert r.status_code == 403 and "platform investors" in r.get_json()["error"]
    # the limit is a setting
    act(client, "save_settings", {"max_platform_investors": 21})
    act(client, "allot_shares", {"offer_id": offers["u_investor22"]["id"], "shares": 10000, "amount_paise": 10000 * 18400})


def test_partial_resale_that_adds_a_member_over_200_is_blocked(client):
    login(client, "advisor@demo.in")
    act(client, "save_cap_entry", {"company_id": "c_vasai", "entry_id": "ct_v3", "holder_name": "Employees and early shareholders",
                                   "holder_type": "existing", "shares": 900000, "holders": 178})
    assert D.members(store(), "c_vasai") == 200
    login(client, "investor@demo.in")
    act(client, "request_sell", {"holding_id": "h_v1", "shares": 1000})
    rid = next(x["id"] for x in state(client)["sell_requests"] if x["holding_id"] == "h_v1")
    login(client, "advisor@demo.in")
    act(client, "sell_step", {"request_id": rid, "step": "review"})
    act(client, "sell_step", {"request_id": rid, "step": "rofr", "days": 15})
    act(client, "sell_step", {"request_id": rid, "step": "buyer", "buyer_investor_id": "u_investor21"}, 403)  # window still open
    r = client.post("/api/act/sell_step", json={"request_id": rid, "step": "buyer", "buyer_investor_id": "u_investor21", "waived": True}, headers=H)
    assert r.status_code == 403 and "members" in r.get_json()["error"]
    # a full-stake sale to a new buyer keeps the count at 200 and goes through
    for step in ({"step": "review"}, {"step": "rofr", "days": 20}, {"step": "buyer", "buyer_investor_id": "u_investor21", "waived": True},
                 {"step": "spa", "price_paise": 19000}, {"step": "complete"}):
        act(client, "sell_step", dict(step, request_id="s_1"))
    st = store()
    assert D.members(st, "c_vasai") == 200
    assert next(h for h in st.holdings if h["id"] == "h_v3")["shares"] == 0
    t = st.transfers[0]
    assert t["to_investor_id"] == "u_investor21" and t["price_paise"] == 19000
    new = next(h for h in st.holdings if h["investor_id"] == "u_investor21" and h["company_id"] == "c_vasai")
    assert new["shares"] == t["shares"] and new["cost_paise"] == t["shares"] * 19000 and new["origin"] == "transfer"


def test_revaluation_updates_portfolio_value_and_gain(client):
    s0 = D.portfolio(store(), "u_investor", TODAY, D.SETTINGS_DEFAULT)
    v_row = next(r for r in s0["rows"] if r["company_id"] == "c_vasai")
    assert v_row["price"] == 18400
    login(client, "advisor@demo.in")
    act(client, "publish_valuation", {"company_id": "c_vasai", "date": TODAY, "method": "DCF", "price_per_share_paise": 20500, "valuer": "R. K. Valuers"})
    act(client, "publish_valuation", {"company_id": "c_vasai", "date": "2026-11-01", "method": "DCF", "price_per_share_paise": 1, "valuer": "x"}, 403)
    s1 = D.portfolio(store(), "u_investor", TODAY, D.SETTINGS_DEFAULT)
    row = next(r for r in s1["rows"] if r["company_id"] == "c_vasai")
    h = next(h for h in store().holdings if h["id"] == "h_v1")
    assert row["price"] == 20500 and row["valuation_date"] == TODAY
    assert row["value"] == h["shares"] * 20500
    assert row["gain"] == h["shares"] * 20500 - h["cost_paise"]
    assert abs(row["gain_pct"] - (20500 - 16000) / 16000) < 1e-12
    assert s1["value"] - s0["value"] == h["shares"] * (20500 - 18400)
    login(client, "investor@demo.in")
    assert any(n["kind"] == "valuation" and "Rs 205" in n["text"] for n in state(client)["notifications"])


def test_ownership_is_shares_over_fully_diluted(client):
    st = store()
    fd = 4_200_000 + 1_800_000 + 900_000 + 300_000 + 200_000 + sum(h["shares"] for h in st.holdings if h["company_id"] == "c_vasai")
    assert D.fd_shares(st, "c_vasai") == fd
    h = next(x for x in st.holdings if x["id"] == "h_v1")
    assert D.holding_view(st, h, TODAY, D.SETTINGS_DEFAULT)["ownership"] == h["shares"] / fd


def test_loan_interest_and_principal_match_the_schedule(client):
    st = store()
    l2 = next(l for l in st.loans if l["id"] == "l_2")
    rows = D.schedule(l2, TODAY)
    assert rows[0]["interest"] == 5_750_000 * 10  # Rs 5,75,000: 6 crore x 11.5% / 12
    assert sum(r["principal"] for r in rows) == l2["amount_paise"] and rows[-1]["closing"] == 0
    for r in rows:
        assert r["opening"] - r["principal"] == r["closing"]
    s = D.loan_summary(l2, TODAY)
    paid = [r for r in rows if r["status"] == "paid"]
    assert s["interest_earned"] == sum(r["interest"] for r in paid)
    assert s["principal_pending"] == paid[-1]["closing"] == l2["amount_paise"] - sum(r["principal"] for r in paid)
    assert s["overdue"] == 1 and s["next_due"] == next(r["due"] for r in rows if r["status"] == "overdue")
    # moratorium: interest only, no principal
    l1 = next(l for l in st.loans if l["id"] == "l_1")
    assert all(r["principal"] == 0 for r in D.schedule(l1, TODAY)[:6]) and D.schedule(l1, TODAY)[6]["principal"] > 0
    # recording the overdue instalment clears it and moves the numbers by exactly that row
    login(client, "lender@demo.in")
    act(client, "record_repayment", {"loan_id": "l_2", "due": s["next_due"]})
    s2 = D.loan_summary(next(l for l in store().loans if l["id"] == "l_2"), TODAY)
    row = next(r for r in rows if r["due"] == s["next_due"])
    assert s2["overdue"] == 0 and s2["interest_earned"] == s["interest_earned"] + row["interest"]
    assert s2["principal_pending"] == s["principal_pending"] - row["principal"]


def test_each_role_sees_only_its_own_data(client):
    login(client, "investor@demo.in")
    s = state(client)
    assert {h["investor_id"] for h in s["holdings"]} == {"u_investor"}
    assert "cap_table" not in s and "loans" not in s and all("twin" not in c for c in s["companies"])
    assert {d["role"] for d in s["directory"]} == {"advisor"}
    assert "c_nashik" not in {c["id"] for c in s["companies"]}
    act(client, "request_sell", {"holding_id": "h_v3"}, 403)  # another investor's holding
    act(client, "respond_offer", {"offer_id": "o_k2", "response": "interested"}, 403)  # another investor's offer
    login(client, "founder@demo.in")
    s = state(client)
    assert [c["id"] for c in s["companies"]] == ["c_kalyan"]
    hidden = [o for o in s["offers"] if o["investor_id"] is None]
    assert hidden and all(o["investor_name"].startswith("Name shared") for o in hidden)
    assert {o["investor_name"] for o in s["offers"] if o["investor_id"]} == {"Sahyadri Angels Network", "Menon Investments (sample)"}
    act(client, "share_offer", {"company_id": "c_kalyan", "investor_ids": ["u_investor21"]}, 403)
    login(client, "lender@demo.in")
    s = state(client)
    assert {l["id"] for l in s["loans"]} == {"l_1", "l_2", "l_3"}
    act(client, "record_repayment", {"loan_id": "l_4", "due": "2026-10-14"}, 403)
    act(client, "publish_valuation", {"company_id": "c_vasai"}, 403)


def test_files_follow_the_same_rules(client, tmp_path):
    login(client, "advisor@demo.in")
    from io import BytesIO
    r = client.post("/api/upload", data={"file": (BytesIO(b"%PDF-1.4 report"), "valuation.pdf"), "company_id": "c_taloja", "purpose": "valuation_report"},
                    headers=H, content_type="multipart/form-data")
    assert r.status_code == 200
    fid = r.get_json()["file"]["id"]
    act(client, "publish_valuation", {"company_id": "c_taloja", "date": TODAY, "method": "DCF", "price_per_share_paise": 9800, "valuer": "Mehta & Associates", "file_id": fid})
    login(client, "angels@demo.in")  # holds Taloja
    assert client.get("/api/file/" + fid).status_code == 200
    login(client, "familyoffice@demo.in")  # does not hold Taloja
    assert client.get("/api/file/" + fid).status_code == 404
    bad = client.post("/api/upload", data={"file": (BytesIO(b"x"), "evil.exe"), "company_id": "c_taloja", "purpose": "dataroom"}, headers=H, content_type="multipart/form-data")
    assert bad.status_code == 400


def test_audit_log_records_every_state_change(client):
    login(client, "advisor@demo.in")
    act(client, "sell_step", {"request_id": "s_1", "step": "review"})
    act(client, "publish_valuation", {"company_id": "c_vasai", "date": TODAY, "method": "DCF", "price_per_share_paise": 19000, "valuer": "R. K. Valuers"})
    act(client, "set_stage", {"company_id": "c_nashik", "stage": "rejected"})
    rows = state(client)["audit"]
    by = {r["action"]: r for r in rows}
    sell = by["sell_step"]["changes"]
    s1 = next(c for c in sell if c["id"] == "s_1")["diff"]
    assert s1["status"] == ["submitted", "under_review"]
    assert any(c["collection"] == "valuations" and c["diff"] == {"created": True} for c in by["publish_valuation"]["changes"])
    assert next(c for c in by["set_stage"]["changes"] if c["id"] == "c_nashik")["diff"]["pipeline_stage"] == ["under_review", "rejected"]
    assert all(r["user_name"] == "CA Neha Joshi" for r in rows if r["action"] in by)
    conn = sqlite3.connect(srv.app.config["DATABASE"])
    with pytest.raises(sqlite3.DatabaseError):
        conn.execute("UPDATE audit SET detail='x'")
    with pytest.raises(sqlite3.DatabaseError):
        conn.execute("DELETE FROM audit")


def test_loan_transfer_between_regulated_lenders(client):
    login(client, "advisor@demo.in")
    act(client, "loan_transfer_step", {"transfer_id": "lt_1", "step": "consent"}, 403)  # out of order
    act(client, "loan_transfer_step", {"transfer_id": "lt_1", "step": "eligibility"})
    act(client, "loan_transfer_step", {"transfer_id": "lt_1", "step": "consent"})
    act(client, "loan_transfer_step", {"transfer_id": "lt_1", "step": "buyer_introduced", "buyer_lender_id": "u_lender2"}, 403)  # same lender
    act(client, "loan_transfer_step", {"transfer_id": "lt_1", "step": "buyer_introduced", "buyer_lender_id": "u_lender4"})
    act(client, "loan_transfer_step", {"transfer_id": "lt_1", "step": "deed_signed"})
    act(client, "loan_transfer_step", {"transfer_id": "lt_1", "step": "charge_updated"})
    act(client, "loan_transfer_step", {"transfer_id": "lt_1", "step": "completed", "fee_rate": 0.006}, 403)
    act(client, "loan_transfer_step", {"transfer_id": "lt_1", "step": "completed", "fee_rate": 0.004})
    st = store()
    l4 = next(l for l in st.loans if l["id"] == "l_4")
    assert l4["lender_id"] == "u_lender4"
    fee = next(f for f in st.invoices if f["kind"] == "transfer")
    assert fee["amount_paise"] == D.half_up(D.loan_summary(l4, TODAY)["principal_pending"] * 0.004) and fee["payer_id"] == "u_lender2"
    login(client, "deccan@demo.in")
    assert "l_4" in {l["id"] for l in state(client)["loans"]}
    # an unverified, self-registered lender cannot start a transfer
    client.post("/api/logout", headers=H)
    client.post("/api/signup", json={"name": "L", "email": "l@x.in", "password": "secret123", "role": "lender"}, headers=H)
    assert all((d.get("profile") or {}).get("regulated") for d in state(client)["directory"] if d["role"] == "lender" and d["id"].startswith("u_lender"))


def test_deal_room_requests_need_an_offer_and_founder_approval(client):
    login(client, "familyoffice@demo.in")  # declined Kalyan's offer
    act(client, "request_intro", {"company_id": "c_kalyan"}, 403)
    act(client, "request_intro", {"company_id": "c_nashik"}, 403)  # never offered
    login(client, "investor@demo.in")  # Kalyan offer pending
    act(client, "request_intro", {"company_id": "c_kalyan"})
    act(client, "request_intro", {"company_id": "c_kalyan"}, 403)  # only once
    iid = next(i["id"] for i in state(client)["intros"] if i["company_id"] == "c_kalyan")
    act(client, "sign_nda", {"intro_id": iid}, 403)  # not granted yet
    login(client, "rahul@demo.in")
    act(client, "decide_intro", {"intro_id": iid, "decision": "grant"}, 403)  # another company's founder
    login(client, "founder@demo.in")
    s = state(client)
    assert {i["investor_name"] for i in s["intros"]} >= {"Konkan Growth Partners", "Sahyadri Angels Network"}
    act(client, "decide_intro", {"intro_id": iid, "decision": "grant"})
    act(client, "suggest_investor", {"investor_id": "u_investor21"})
    login(client, "investor@demo.in")
    act(client, "view_room_doc", {"intro_id": iid, "doc": "Cap table"}, 403)  # NDA first
    act(client, "sign_nda", {"intro_id": iid})
    act(client, "view_room_doc", {"intro_id": iid, "doc": "Cap table"})
    login(client, "founder@demo.in")
    i = next(x for x in state(client)["intros"] if x["id"] == iid)
    assert i["status"] == "granted" and i["nda_signed_at"] and i["views"][0]["doc"] == "Cap table"
    login(client, "advisor@demo.in")
    assert any("suggests offering" in n["text"] for n in state(client)["notes"])


def test_only_advisors_submit_the_debt_vs_equity_report(client):
    payload = {"company_id": "c_kalyan", "title": "Debt vs equity", "checks": CHECKS, "summary": {"best_share": 0.3}}
    login(client, "founder@demo.in")
    act(client, "submit_report", payload, 403)
    login(client, "advisor@demo.in")
    act(client, "submit_report", payload)


def test_cma_tool_is_for_advisors_only(client):
    for email in ("founder@demo.in", "investor@demo.in", "lender@demo.in"):
        login(client, email)
        r = client.get("/fundmix.html")
        assert r.status_code == 403 and b"Advisors only" in r.data and b"CMA" in r.data
    login(client, "advisor@demo.in")
    r = client.get("/fundmix.html")
    assert r.status_code == 200 and b"Advisors only" not in r.data
```

### `server/tests/test_parity.py`

Browser and server give identical numbers.

```python
"""site/domain.js must give the same numbers as server/domain.py (the demo and the real server show the same figures)."""
import json, os, shutil, subprocess, sys
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from server import domain as D  # noqa: E402
from server.seed import resolved  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TODAY = "2026-10-19"
pytestmark = pytest.mark.skipif(not shutil.which("node"), reason="node is not installed")


def js(expr, data):
    code = "const D=require(%r);const st=%s;const today=%r;process.stdout.write(JSON.stringify(%s));" % (
        os.path.join(ROOT, "site", "domain.js"), json.dumps(data), TODAY, expr)
    return json.loads(subprocess.run(["node", "-e", code], capture_output=True, text=True, check=True).stdout)


def test_loan_schedules_match():
    st = resolved(TODAY)
    out = js("st.loans.map(l=>({rows:D.schedule(l,today),sum:D.loanSummary(l,today)}))", st)
    for l, j in zip(st["loans"], out):
        assert j["rows"] == D.schedule(l, TODAY), l["id"]
        assert j["sum"] == D.loan_summary(l, TODAY), l["id"]


def test_counters_and_portfolio_match():
    st = resolved(TODAY)
    fy = D.fy(TODAY)
    out = js("({off:D.offersUsed(st,'c_kalyan',%r,'equity'),mem:D.members(st,'c_vasai'),fd:D.fdShares(st,'c_vasai'),"
             "pf:D.portfolio(st,'u_investor',today,D.SETTINGS_DEFAULT),fy:D.fy(today),lock:D.addMonths('2026-08-31',6)})" % fy, st)
    assert out["off"] == D.offers_used(st, "c_kalyan", fy, "equity")
    assert out["mem"] == D.members(st, "c_vasai") and out["fd"] == D.fd_shares(st, "c_vasai")
    py = D.portfolio(st, "u_investor", TODAY, D.SETTINGS_DEFAULT)
    for k in ("invested", "value", "gain", "companies"):
        assert out["pf"][k] == py[k]
    assert [r["lock_until"] for r in out["pf"]["rows"]] == [r["lock_until"] for r in py["rows"]]
    assert out["fy"] == fy and out["lock"] == D.add_months("2026-08-31", 6) == "2027-02-28"
```

### `server/tests/test_demo_store.py`

Runs the demo store tests from Python.

```python
"""The browser-only demo (site/store.js) must follow the same rules as the server: runs site/tests/store.test.js."""
import os, shutil, subprocess, sys
import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
pytestmark = pytest.mark.skipif(not shutil.which("node"), reason="node is not installed")


def test_demo_store_mirrors_the_server():
    r = subprocess.run(["node", os.path.join(ROOT, "site", "tests", "store.test.js")], cwd=ROOT, capture_output=True, text=True,
                       env=dict(os.environ, PYTHON=sys.executable), timeout=300)
    assert r.returncode == 0, r.stdout + r.stderr
```

### `site/tests/store.test.js`

Demo store matches the server's behaviour.

```javascript
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

test("test_deal_room_requests_need_an_offer_and_founder_approval", async () => {
  await login("familyoffice@demo.in");
  await act("request_intro", { company_id: "c_kalyan" }, 403);
  await act("request_intro", { company_id: "c_nashik" }, 403);
  await login("investor@demo.in");
  await act("request_intro", { company_id: "c_kalyan" });
  await act("request_intro", { company_id: "c_kalyan" }, 403);
  const iid = (await api.state()).intros.find((i) => i.company_id === "c_kalyan").id;
  await act("sign_nda", { intro_id: iid }, 403);
  await login("rahul@demo.in");
  await act("decide_intro", { intro_id: iid, decision: "grant" }, 403);
  await login("founder@demo.in");
  await act("decide_intro", { intro_id: iid, decision: "grant" });
  await act("suggest_investor", { investor_id: "u_investor21" });
  await login("investor@demo.in");
  await act("view_room_doc", { intro_id: iid, doc: "Cap table" }, 403);
  await act("sign_nda", { intro_id: iid });
  await act("view_room_doc", { intro_id: iid, doc: "Cap table" });
  await login("founder@demo.in");
  const i = (await api.state()).intros.find((x) => x.id === iid);
  assert.strictEqual(i.status, "granted"); assert.strictEqual(i.views[0].doc, "Cap table");
  await act("submit_report", { company_id: "c_kalyan", checks: { validation: true, founder_confirmed: true, verifier: true } }, 403);
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
```
