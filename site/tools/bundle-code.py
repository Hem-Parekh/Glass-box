"""Writes every source file of the website into one Markdown file, in the order the page loads them.

  python site/tools/bundle-code.py        ->  aegis-ascend-website-code.md (repository root)

Left out: images, the vendored jsPDF library (site/jspdf.min.js), the generated skyline.svg and hero3d.js bundle (rebuilt by their tools), site/dist/,
and the standalone optimizer/ and fundmix/ tools.
"""
import datetime
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "aegis-ascend-website-code.md")
LANG = {".html": "html", ".js": "javascript", ".py": "python", ".json": "json", ".sh": "sh", ".txt": "text", ".yml": "yaml", "": "dockerfile"}

PARTS = [
    ("1. Page skeleton and styles", "The HTML shell every page renders inside, with all CSS. The build puts the scripts in place of <!--SCRIPTS-->.", [
        ("site/shell.html", "Page skeleton and all CSS: brand tokens, public pages, workspaces, glass and skyline, whiteboard motion, the assistant panel."),
    ]),
    ("2. Shared engine and helpers", "Loaded first: calculation and formatting code shared by public pages and every workspace.", [
        ("site/calc.js", "Calculation engine: best mix, stress tests, seeded simulation, readiness, term sheets, fee calculators."),
        ("site/optimizer.js", "Equity vs Debt Optimizer (browser port of the Python model)."),
        ("site/ui.js", "Escaping, number formats, the click-any-number explain panel, small SVG charts."),
        ("site/domain.js", "Business arithmetic in integer paise; mirrors server/domain.py."),
        ("site/kit.js", "Workspace components: tables, dialogs, toasts, timelines, kanban, empty states."),
        ("site/pdf.js", "Branded PDF reports: lays out the tools' results and signed reports on A4 pages with jsPDF."),
    ]),
    ("3. Home page 3D emblem", "The WebGL hero scene. site/hero3d.js is built from this source with three.js by site/tools/build-hero3d.sh.", [
        ("site/src/hero3d.js", "The 3D gold emblem built from the logo's outlines, the rising city, stars, camera, bloom and vignette."),
        ("site/tools/build-hero3d.sh", "Bundles the scene with three.js r160 into site/hero3d.js."),
    ]),
    ("4. Data layer", "The front end calls window.GB_API: the browser store in the demo, the Flask API on the server.", [
        ("site/store.js", "Demo store: every action and rule of the server, kept in the browser."),
        ("site/api-server.js", "Adapter that sends the same calls to the Flask API."),
    ]),
    ("5. Public website, motion and the assistant", "Public pages, the scroll intro, the whiteboard motion, the chat assistant and its site map.", [
        ("site/public.js", "Home (scroll intro, live example), Services, Investors, Lenders, Pricing, Trust, About, Contact."),
        ("site/motion.js", "Whiteboard motion: collaboration cursors, hand-drawn ink and sticky notes on the home page."),
        ("site/chat.js", "The \"Ask Aegis\" assistant panel, its quick answers and site guide."),
        ("site/sitemap.json", "The assistant's map of every page and workspace screen."),
    ]),
    ("6. Sign-in and role workspaces", "Sign-in, the workspace shell and router, and one file of screens per role.", [
        ("site/portal.js", "Sign-in and sign-up, the role-based workspace frame, page router."),
        ("site/ws-founder.js", "Founder: fundraise, investors, deal room, cap table, data room, revenue share, loans, fees and invoices."),
        ("site/ws-investor.js", "Investor: portfolio, holdings, sell requests and resale fees, opportunities, deal rooms."),
        ("site/ws-lender.js", "Lender: loan book with Sell buttons, schedules, applications, monitoring, loan sales, fees."),
        ("site/ws-advisor.js", "Advisor: today, pipeline, company file, directory, resales, revaluations, revenue, tools, admin."),
    ]),
    ("7. Standalone pages and build tools", "Pages built beside the main one, and the scripts that build them.", [
        ("site/cma-lock.html", "The 'Advisors only' page shown instead of the CMA tool to anyone else."),
        ("site/build.py", "Inlines everything into site/dist/index.html and writes the CMA pages."),
        ("site/tools/skyline.py", "Draws the New York skyline (site/assets/skyline.svg) and its inline copy."),
        ("site/tools/bundle-code.py", "Writes this file."),
    ]),
    ("8. Server prototype (Flask)", "The first back end, whose rules the new backend reuses. It enforces every rule; the demo copies it.", [
        ("server/app.py", "Flask app: sign-in, sessions, API routes, uploads, the chat endpoint, page serving, admin commands."),
        ("server/actions.py", "Every workspace action with its permission and compliance checks, including automatic fee invoices."),
        ("server/domain.py", "Money, DSCR, repayment schedules, XIRR and limits."),
        ("server/seed.py", "The fictional sample companies, people, loans and invoices."),
        ("server/chat.py", "The website assistant: Claude, answering from the site's facts and site map."),
        ("server/requirements.txt", "Python dependencies."),
    ]),
    ("9. Production backend (FastAPI + PostgreSQL)", "Serves the same site and API on PostgreSQL, reusing the rules in server/actions.py. See backend/README.md.", [
        ("backend/config.py", "Settings from environment variables."),
        ("backend/db.py", "Tables: users, one table per collection, the append-only audit log, sessions, login attempts, password resets, outbox."),
        ("backend/store.py", "Loads records for the rules and writes back only what changed, with the audit diff."),
        ("backend/auth.py", "Argon2 passwords, server-side sessions, throttling, two-step codes, password reset tokens."),
        ("backend/notify.py", "Outbox for email, SMS and WhatsApp, and the sender stand-in."),
        ("backend/storage.py", "File storage: local folder or S3-compatible."),
        ("backend/app.py", "FastAPI app: sign-in, two-step, account security, workspace API, uploads, pages."),
        ("backend/integrations/providers.py", "Provider adapters for KYC, e-signing and payments, and the stand-in provider."),
        ("backend/integrations/service.py", "Starting checks, signings and payments; applying the providers' signed results once."),
        ("backend/integrations/documents.py", "The NDA and engagement letter text, and the signed copy with its certificate."),
        ("backend/integrations/routes.py", "API routes, the provider webhook and the stand-in provider pages."),
        ("backend/cli.py", "Admin commands: init, seed, create advisor, import from the prototype, send the outbox."),
        ("backend/requirements.txt", "Python dependencies."),
        ("Dockerfile", "Container image for the backend."),
        ("docker-compose.yml", "Local stack: PostgreSQL plus the app."),
    ]),
    ("10. Tests", "Run with: python -m pytest server/tests fundmix/tests  and  node site/tests/store.test.js", [
        ("server/tests/test_server.py", "Server rules, permissions, flows, fees and the assistant."),
        ("server/tests/test_parity.py", "Browser and server give identical numbers."),
        ("server/tests/test_demo_store.py", "Runs the demo store tests from Python."),
        ("site/tests/store.test.js", "Demo store matches the server's behaviour."),
        ("backend/tests/test_flask_suite_on_backend.py", "Runs the whole prototype server suite against the new backend."),
        ("backend/tests/shim.py", "Flask-style test client over FastAPI for that suite."),
        ("backend/tests/test_integrations.py", "KYC, e-signing and payments end to end, webhook signatures, repeats and wrong amounts."),
        ("backend/tests/test_security.py", "Sessions, two-step sign-in, password change and reset, outbox, import, action lock."),
    ]),
]


def main():
    out, total = [], 0
    w = out.append
    w("# Aegis Ascend website: complete source code\n")
    w("Generated %s. Every file below is reproduced in full, in the order the page loads it.\n" % datetime.date.today().isoformat())
    w("Not included: images, the vendored jsPDF library `site/jspdf.min.js` (MIT licence), the generated `site/assets/skyline.svg` and `site/hero3d.js` (rebuilt by `site/tools/skyline.py` and `site/tools/build-hero3d.sh`), the built `site/dist/` folder, and the standalone tools in `optimizer/` and `fundmix/`.\n")
    w("## How the pieces fit\n")
    w("1. `site/build.py` reads `site/shell.html` and replaces `<!--SCRIPTS-->` with the scripts: calc, optimizer, ui, domain, kit, jsPDF, pdf, hero3d, the seed data and site map, store, public, motion, chat, portal, then the four role files.")
    w("2. The result is one self-contained page, `site/dist/index.html`, that runs the demo in the browser.")
    w("3. `python -m server.app` serves the same page from Flask, with `api-server.js` in place of the demo store.\n")
    w("## Contents\n")
    for title, _, files in PARTS:
        w("- **%s**" % title)
        for path, desc in files:
            n = sum(1 for _ in open(os.path.join(ROOT, path), encoding="utf-8"))
            total += n
            w("  - `%s` (%d lines): %s" % (path, n, desc))
    w("\nTotal: %d lines in %d files.\n" % (total, sum(len(f) for _, _, f in PARTS)))
    for title, intro, files in PARTS:
        w("\n---\n\n## %s\n\n%s\n" % (title, intro))
        for path, desc in files:
            src = open(os.path.join(ROOT, path), encoding="utf-8").read()
            fence = "````" if "```" in src else "```"
            lang = LANG.get(os.path.splitext(path)[1], "text")
            w("### `%s`\n\n%s\n\n%s%s\n%s%s%s\n" % (path, desc, fence, lang, src, "" if src.endswith("\n") else "\n", fence))
    open(OUT, "w", encoding="utf-8").write("\n".join(out))
    print("wrote %s: %d files, %d lines, %d KB" % (os.path.relpath(OUT, ROOT), sum(len(f) for _, _, f in PARTS), total, os.path.getsize(OUT) // 1024))


if __name__ == "__main__":
    main()
