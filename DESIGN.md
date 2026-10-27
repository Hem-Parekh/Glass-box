---
name: Aegis Ascend Financial Advisors
description: 'Smarter Decisions. Stronger Futures. Independent debt, equity and mix advice, built inside the gold emblem on obsidian.'
colors:
  obsidian: "#0D0E10"
  obsidian-raised: "#151411"
  obsidian-high: "#1D1C18"
  obsidian-edge: "#29271F"
  gold-light: "#E8C77B"
  gold: "#C9A04F"
  gold-deep: "#8E6A2A"
  gold-line: "rgba(201,160,79,.28)"
  gold-wash: "rgba(201,160,79,.09)"
  ivory: "#F1ECE2"
  ivory-soft: "#ABA497"
  ivory-faint: "#7D776C"
  stone: "#F2F1EE"
  panel: "#FFFFFF"
  panel-sunk: "#F7F6F3"
  ink: "#16171A"
  ink-soft: "#47443E"
  muted: "#6A665D"
  line: "#E2DED5"
  line-strong: "#CFC9BC"
  gold-ink: "#7B5C1F"
  stone-dark: "#101114"
  panel-dark: "#17191D"
  gold-ink-dark: "#DDB868"
  series-debt: "#3F6EA6"
  series-equity: "#B8892F"
  series-mix: "#1E8C68"
  series-debt-dark: "#5C88C4"
  series-equity-dark: "#B08433"
  series-mix-dark: "#2FA38A"
  good: "#1D7A4C"
  warn: "#946100"
  bad: "#B0281E"
typography:
  display:
    fontFamily: "Cinzel, 'Trajan Pro', Georgia, serif"
    fontSize: "clamp(34px, 4.6vw, 64px)"
    fontWeight: 500
    lineHeight: 1.06
    letterSpacing: "0.02em"
  headline:
    fontFamily: "Cinzel, 'Trajan Pro', Georgia, serif"
    fontSize: "clamp(28px, 3.6vw, 44px)"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "0.02em"
  title:
    fontFamily: "Cinzel, 'Trajan Pro', Georgia, serif"
    fontSize: "19px"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "0.06em"
  page-title:
    fontFamily: "Cinzel, 'Trajan Pro', Georgia, serif"
    fontSize: "clamp(24px, 2.6vw, 32px)"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "0.03em"
  wordmark:
    fontFamily: "Cinzel, 'Trajan Pro', Georgia, serif"
    fontSize: "19px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.16em"
  panel-title:
    fontFamily: "'Hanken Grotesk', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "0.005em"
  body:
    fontFamily: "'Hanken Grotesk', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  lede:
    fontFamily: "'Hanken Grotesk', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.6
  data:
    fontFamily: "'Hanken Grotesk', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.2
    fontFeature: "'tnum' 1, 'lnum' 1"
  label:
    fontFamily: "'Hanken Grotesk', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
    fontSize: "12.5px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.1em"
rounded:
  hair: "2px"
  sm: "3px"
  md: "4px"
  panel: "6px"
  glass: "12px"
spacing:
  xs: "8px"
  sm: "14px"
  md: "20px"
  lg: "28px"
  gutter: "clamp(16px, 4vw, 40px)"
  section: "clamp(64px, 10vw, 120px)"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.obsidian}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "11px 20px"
  button-primary-hover:
    backgroundColor: "{colors.gold-light}"
    textColor: "{colors.obsidian}"
  button-primary-lg:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.obsidian}"
    rounded: "{rounded.sm}"
    padding: "14px 26px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ivory}"
    rounded: "{rounded.sm}"
    padding: "11px 20px"
  button-ghost-hover:
    textColor: "{colors.gold-light}"
  button-workspace-primary:
    backgroundColor: "{colors.obsidian}"
    textColor: "{colors.gold-light}"
    rounded: "{rounded.sm}"
    padding: "11px 20px"
  button-workspace-primary-hover:
    backgroundColor: "{colors.obsidian-high}"
    textColor: "{colors.gold-light}"
  input-public:
    backgroundColor: "{colors.obsidian-raised}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
  input-workspace:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 10px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "20px"
  kpi:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.data}"
    rounded: "{rounded.panel}"
    padding: "14px 16px"
  chip:
    backgroundColor: "{colors.panel-sunk}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.hair}"
    padding: "3px 10px"
  stamp-reviewed:
    backgroundColor: "transparent"
    textColor: "{colors.gold-ink}"
    rounded: "{rounded.hair}"
    padding: "4px 10px"
  decision-strip:
    backgroundColor: "{colors.obsidian-raised}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.md}"
    padding: "20px 22px"
  workspace-rail:
    backgroundColor: "{colors.obsidian}"
    textColor: "{colors.ivory-soft}"
    width: "248px"
    padding: "20px 14px"
  public-header:
    backgroundColor: "{colors.obsidian}"
    textColor: "{colors.ivory-soft}"
    height: "74px"
---

# Design System: Aegis Ascend Financial Advisors

## Overview

**Creative North Star: "The Emblem as Architecture"**

The firm's gold emblem is not a logo placed on a page; it is the page's structure. On the public site the obsidian field carries the mark's own geometry at viewport scale: two gold uprights frame the content column, outer diagonals run to the corners, a faint chevron sits under the live decision, and a single gold diamond lands above the headline. Everything after the hero borrows from that vocabulary: gold hairline rules instead of boxes, rotated-square diamonds instead of bullets and icons, Cinzel capitals for every name the firm speaks in its own voice.

There are two scenes. **Persuade** (public pages) lives in the logo's world: obsidian ground with a faint warm grain, warm ivory reading text, gold reserved for structure, emphasis and action. **Operate** (the founder and advisor workspace) keeps an obsidian rail carrying the wordmark, then opens a light stone work area with white panels for daytime desk work, switching to a dark work area under `prefers-color-scheme: dark`. The workspace speaks in data: Hanken Grotesk, tabular numerals, three fixed series colours, and the gold diamond kept for the one recommended answer.

Density is calm on the public side (generous section padding, ruled ledgers, long measure capped at 62-72ch) and working-dense in the workspace (20px panel padding, 12-20px gaps, KPI rows). Motion is ceremonial once, the Ascent on the home hero; below it, home sections arrive on scroll with a short staggered rise, and the workspace uses feedback motion only. The world refuses the fintech template: no light hero, no dashboard screenshot, no row of icon cards.

**Key Characteristics:**
- Obsidian ground, gold geometry, ivory text on public pages; stone and white panels in the workspace.
- Cinzel in spaced capitals for display, wordmark and section names; Hanken Grotesk for reading and data.
- Gold hairline rules (`gold-line`) as the main structural device; very few filled containers.
- The rotated-square diamond is the house marker: active place, chosen option, list bullet, recommended value.
- Every number is a dashed-underlined, clickable "glass-box" figure that opens its formula.
- One signature motion (the Ascent), quiet scroll reveals on the home page, and 150-250ms feedback motion in the workspace.

## Colors

A two-scene palette: the logo's obsidian and gold for the firm's voice, a warm stone-and-ink neutral set for working, and a fixed three-colour chart palette for debt, equity and the mix.

### Primary
- **Emblem Gold** (#C9A04F): primary buttons, hairline rules at full strength, the diamond marker, focus rings, scrollbars, method numerals, table headers on dark. The middle of the logo's gold scale.
- **Crest Gold** (#E8C77B): the light end of the scale. Links, emphasised words in headlines ("Stronger Futures."), the hero diamond, Cinzel sub-headings on dark, primary-button hover, gold text on the workspace's obsidian primary button.
- **Burnished Gold** (#8E6A2A): the dark end of the scale. The base stop of the emblem's vertical gradient and the scrollbar thumb. Not used as text.
- **Gold Hairline** (rgba(201,160,79,.28)) and **Gold Wash** (rgba(201,160,79,.09)): every divider, card edge and header border on dark; hover and selected fills. The hairline is what gives the dark pages their structure.
- **Deep Gold Ink** (#7B5C1F light, #DDB868 dark): gold as text on light workspace surfaces (links, scores, "Best mix" emphasis, the Reviewed-by stamp, selected segments). Emblem Gold is too light for text on white; this is its readable stand-in.

### Neutral
- **Obsidian** (#0D0E10): the public page ground, the workspace rail, the footer, and text on gold buttons.
- **Obsidian Raised / High / Edge** (#151411, #1D1C18, #29271F): toned sections, the decision strip, the explain panel, the auth card (raised); notices, chips and rail hover (high); input borders and the split-bar track (edge). Warm, not blue.
- **Warm Ivory** (#F1ECE2): headings and primary text on dark.
- **Ivory Soft** (#ABA497): body and secondary text on dark; nav links at rest.
- **Ivory Faint** (#7D776C): fine print, captions, input suffix units, "sample" labels.
- **Stone** (#F2F1EE, dark #101114): the workspace work area behind panels.
- **Panel / Panel Sunk** (#FFFFFF / #F7F6F3; dark #17191D / #1D2025): workspace panels and cards; KPI tiles inside panels, notices, NDA blocks.
- **Ink / Ink Soft / Muted** (#16171A / #47443E / #6A665D): workspace text, labels, secondary text and chart ticks.
- **Line / Line Strong** (#E2DED5 / #CFC9BC): workspace dividers; input borders and table header rules.

### Chart series
- **Debt Blue** (light #3F6EA6, dark #5C88C4): every debt series, debt bars, the debt half of the split bar, low-severity flags.
- **Equity Gold** (light #B8892F, dark #B08433): every equity series. Deliberately a duller, browner gold than Emblem Gold so data never reads as brand emphasis.
- **Mix Green** (light #1E8C68, dark #2FA38A): the mix / best-mix series.
- The dark set applies under the dark workspace theme and on all public (dark) pages. Grid lines are #ECE9E2 (light) / #23262C (dark) / a 14% gold tint on public pages; axes #BDB6A8 / #4A4E56.

### Status
- **Good / Warn / Bad** (#1D7A4C / #946100 / #B0281E light; #5CC48E / #E9B45A / #FF8A7E dark), each with a pale tinted background, for chips, notices, readiness meters and severity flags. The demo-data banner uses Warn.

### Named Rules
**The Single Best Rule.** In every chart and data view the gold diamond marks exactly one thing: the single "Best" point. Series markers, including the best-mix series' own markers, use their own series colour; a secondary "Viewing" mark is an ink-coloured diamond, never gold.

**The Gold Is Structure Rule.** On dark pages gold appears as line, marker, numeral and action, never as a large fill. The largest gold areas are the primary button and the split bar's equity half.

**The Readable Gold Rule.** On light surfaces gold text is always Deep Gold Ink (#7B5C1F), never Emblem Gold.

## Typography

**Display Font:** Cinzel (with Trajan Pro, Georgia, serif)
**Body Font:** Hanken Grotesk (with system-ui, -apple-system, Segoe UI, Arial, sans-serif)
**Label/Mono Font:** ui-monospace / SF Mono / Menlo / Consolas, only for formulas in the explain panel.

**Character:** Cinzel is the logo's own lettering: inscriptional capitals that make the firm sound settled and formal. Hanken Grotesk is a plain, warm grotesque that keeps numbers and long explanations easy to read. Cinzel names things; Hanken explains them.

### Hierarchy
- **Display** (Cinzel 500, clamp(34px, 4.6vw, 64px), 1.06, +0.02em): the hero H1 only, the tagline.
- **Headline** (Cinzel 500, clamp(28px, 3.6vw, 44px), 1.15, +0.02em): public section and inner-page H1/H2. Closing and CTA bands step down to clamp(22px, 2.6vw, 30px).
- **Title** (Cinzel 500, 19-22px, +0.05-0.06em): promise headings, feature index names, founder names, golden-rule headings; usually in Crest Gold on dark.
- **Page title** (Cinzel 500, clamp(24px, 2.6vw, 32px), +0.03em): the workspace page header. The workspace's only Cinzel besides scores, meters and the "rule" statement.
- **Panel title** (Hanken 600, 18px; sub-titles 15.5px): workspace panel headings.
- **Body** (Hanken 400, 16px, 1.6): all reading text. Ledes 17-19px; long narrative 17px at 1.65 capped at 72ch.
- **Data** (Hanken 600, 21-22px, tabular lining numerals): KPI values and decision-strip stats. Scores and meters use Cinzel 28-30px.
- **Label** (Hanken 600, 12.5px, +0.1em, uppercase): table headers, explain-panel labels, source tags (10.5px), rail group labels (11.5px, +0.18em).
- **Wordmark** (Cinzel 500, 19px, +0.16em; sub-line 9.5px at +0.42em flanked by 14px gold rules).

### Named Rules
**The Cinzel Names, Hanken Explains Rule.** Cinzel is for names, headings, numerals of the method and the wordmark; it never sets paragraphs, form labels or table cells.

**The Tabular Rule.** Every figure, in tables, KPIs, inputs and charts, sets in tabular lining numerals.

## Layout

The public site is a centred column, 1180px max, with a fluid gutter of clamp(16px, 4vw, 40px). Sections breathe at clamp(64px, 10vw, 120px) block padding, alternating the obsidian ground with a raised tone. Content is organised as ruled ledgers rather than cards: two- and three-column grids whose items are separated by gold hairlines on top, a feature index of full-width ruled rows, an 8-column method strip (4 columns under 1060px, 2 under 560px), and a 0.9fr / 1.1fr meaning split with a sticky emblem anatomy drawing.

The hero is full-bleed, min(92vh, 900px) tall, with a centred 780px column. Its geometry is computed from that column: the uprights sit on the column's edges, so the frame always fits the content rather than the viewport.

The workspace is a 248px obsidian rail beside a fluid work area (28px top padding, clamp(16px, 3vw, 36px) sides, 20px gaps between panels). Working layouts are two equal columns, 3- or 4-up KPI rows, auto-fill card grids (290px minimum), and the "twin" layout: a sticky 300-380px input column beside the outputs.

Responsive behaviour: public navigation collapses to a menu under 1240px; the header CTAs hide under 600px. Under 900px the rail becomes a top bar with a horizontally scrolling nav. Multi-column grids drop to one column between 1150px and 760px. Grids always use `minmax(0, 1fr)` tracks so long numbers never force horizontal scroll.

## Elevation & Depth

The system is flat and line-built. Depth comes from tonal steps (obsidian to raised to high on dark; stone to white panel to sunk panel on light) and from gold or grey hairlines, not from shadows. Shadows appear only on things that float above the page: the hero's decision strip, the toast, and chart tooltips. Focus is shown with a gold outline or a soft gold ring, never a shadow lift.

### Shadow Vocabulary
- **Decision lift** (`box-shadow: 0 24px 60px -30px rgba(0,0,0,.8)`): the hero decision strip, so it sits on the chevron's base.
- **Toast** (`box-shadow: 0 14px 40px rgba(0,0,0,.28)`): the fixed bottom toast.
- **Tooltip** (`box-shadow: 0 10px 24px rgba(0,0,0,.14)`): chart crosshair tooltips.
- **Accent edge** (`box-shadow: inset 0 2px 0 #C9A04F`): the highlighted KPI tile's gold top edge (a line, not a lift).
- **Focus ring** (`box-shadow: 0 0 0 3px rgba(201,160,79,.2)`; workspace uses the Deep Gold Ink wash): input focus.
- **Glass** (`box-shadow: inset 0 1px 0 rgba(255,241,214,.07), 0 30px 60px -34px rgba(0,0,0,.85)`): glass panels only; a light top edge plus a soft drop so the panel floats over the skyline.

### Named Rules
**The Hairline Before Box Rule.** Separate content with a 1px gold hairline first; reach for a filled panel only in the workspace, where panels hold working tools.

## Shapes

Corners are nearly square. Chips, stamps, source tags and the split bar use a 2px hair radius; buttons and public inputs 3px; the decision strip, workspace inputs and chart bars 4px; workspace panels, cards and KPI tiles 6px. Nothing is pill-shaped or fully round except chart line points.

The recurring silhouette is the **diamond**: a square rotated 45 degrees, 6-11px. It is the active-nav marker (below the link on public pages, left of it in the rail), the bullet of tick lists, ledgers and method steps, the dot inside chips and stamps, the checklist box (hollow, filled gold when done), the progress pips, and the severity flag. The emblem itself (two uprights with mitred diagonals, a chevron, a diamond peak, in a vertical gold gradient #8E6A2A to #C9A04F to #E8C77B) is the only illustration; founder portraits sit in a 4:5 frame with an inset gold hairline 10px in.

## Components

### Buttons
Quiet and certain: square-cornered, firm weight, no gradients.
- **Shape:** gently squared (3px).
- **Primary:** Emblem Gold fill with obsidian text, Hanken 600 15px, 11px 20px padding; large 16px at 14px 26px; small 13.5px at 7px 12px.
- **Hover / Active / Focus:** hover lifts to Crest Gold; active presses down 1px; focus is a 2px gold outline offset 3px. Transitions 200ms on the shared ease-out curve.
- **Ghost:** transparent with ivory text and a gold hairline border; hover turns border Emblem Gold and text Crest Gold.
- **Workspace primary:** inverted for light work areas: obsidian fill with Crest Gold text, hovering to Obsidian High. In the dark workspace theme it reverts to the gold primary. Workspace ghost uses ink text and a Line Strong border, hovering to Deep Gold Ink.
- **Text link button:** underlined Crest Gold (Deep Gold Ink in the workspace).

### Chips
- **Style:** 12.5px Hanken 600, 3px 10px, hair radius, a small currentColor diamond before the text. Sunk-panel fill with a Line border by default; status chips take the status colour on its pale background with no border. On public pages chips are Obsidian High with a gold hairline.

### Reviewed-by Stamp (signature)
- Cinzel 12px, uppercase, +0.14em, Deep Gold Ink (Crest Gold on dark), 1px currentColor border, hair radius, a leading diamond. It is the visual form of advisor sign-off and appears on shared reports.

### Cards / Containers
- **Corner Style:** 6px in the workspace; public containers are hairline-ruled sections with no radius, except the decision strip (4px) and auth card (square, 2px gold top border).
- **Background:** white panel on stone; KPI tiles inside panels use the sunk panel with no border.
- **Shadow Strategy:** none at rest (see Elevation & Depth).
- **Border:** 1px Line in the workspace; 1px gold hairline on dark.
- **Internal Padding:** panels 20px, cards 18px, KPI tiles 14px 16px.
- **Accent KPI:** the highlighted tile gets a gold border, a 2px inset gold top edge and a gold diamond before its value.

### Inputs / Fields
- **Style:** public: raised obsidian fill, Obsidian Edge border, 3px radius, 10px 12px padding, ivory 15px text; unit suffixes sit in a bordered right cell in Ivory Faint. Workspace: white fill, Line Strong border, 4px radius, 8px 10px padding, 14.5px ink text, suffix cell on the sunk panel.
- **Focus:** border turns gold (Deep Gold Ink in the workspace) with a 3px soft gold ring; 150ms.
- **Segmented choice:** bordered equal-width options; the checked one gets a gold border, gold wash and gold text.
- **Error:** text in Bad at 14px under the form; checkboxes, radios and sliders use gold as accent colour.

### Navigation
- **Public header:** sticky, 74px, 86% obsidian with a 10px backdrop blur and a gold hairline bottom. Links are Ivory Soft 14.5px, ivory on hover and when current; the current page carries a 7px gold diamond centred below it. Under 1240px the links drop into a raised-obsidian menu, current marker moving to the right edge.
- **Workspace rail:** obsidian, 248px, the wordmark at the top over a gold hairline. Links are Ivory Soft 15px with 3px radius; hover fills Obsidian High; current is Crest Gold, 600 weight, Obsidian High fill, with a 7px gold diamond at its left. Group labels are uppercase 11.5px Ivory Faint. The signed-in person and sign-out sit at the foot.

### Glass-box Number (signature)
- Any figure that can explain itself is an inline button with a 1px dashed gold underline (Deep Gold Ink in the workspace) and a gold-wash hover. Clicking slides in the explain panel from the right: raised obsidian, a 1px gold left edge, 480px wide, Cinzel title, a monospace formula block, an inputs table with coloured source tags, and an engine-version footnote.

### Decision Strip and the Ascent (signature)
- The hero's live decision: a raised-obsidian strip with a gold hairline and 4px radius, a sample label, a 14px split bar (Debt Blue and Emblem Gold halves on an Obsidian Edge track, 2px gap), a diamond-keyed legend, and a three-cell stats grid divided by gold hairlines.
- **The Ascent (scroll intro):** the home page opens on the emblem alone, split into three layers: the left A, the right A (each with its half of the shared crossbar, clipped at x=273) and the diamond. On first load both A's draw upward and the diamond lands, then the wordmark rises. The 250vh section pins a 100svh stage. Across the first 60% of the scroll, the A's slide apart to the viewport edges (on screens narrower than 760px they slide partly off-canvas and dim to 22%). The diamond rises and shrinks to crown the headline, and the wordmark fades. From 26% on, the headline, lede and buttons come forward in turn (48px rise, scale .86 to 1, blur 6px to 0). The values are driven by `update()` in public.js. With reduced motion the stage is unpinned and shown in its end state.
- **Home scroll reveals:** `PUB.mountHome` adds `.rv` to section heads, promises, ledger rows, method steps, tool rows, founders and the closing CTA, and adds `.shown` through an IntersectionObserver. Items rise 22px and fade in over 0.8s, staggered 80ms by sibling index. The emblem anatomy draws its strokes, lands its diamond, then draws its leader lines. The method rule draws left to right as its diamonds pop. Founder portraits wipe up from the bottom. Everything is gated by `html.mo` (set only when motion is allowed), so the content is visible without JS or with reduced motion. Never use `.in` as a state class, because it is the input-field wrapper.

### Charts
- Single axis, direct labels and value labels, a crosshair tooltip on hover, and a legend of short colour bars (dashed for reference lines). Bars have 4px corners; lines are 2px with round joins; reference lines are 1.5px dashed in Warn or Bad.
- Series colour is fixed by meaning: debt, equity, mix. Line points are series-coloured circles (hollow for options that fail a test); the best-mix series may use series-coloured diamond markers. The single "Best" mark is a 7px gold diamond with a surface-coloured stroke and a label below; a "Viewing" mark is a 5px ink diamond.

## Do's and Don'ts

### Do:
- **Do** build public pages on obsidian (#0D0E10) with ivory text and gold hairline rules (rgba(201,160,79,.28)) as the primary structure.
- **Do** set every name, heading and the wordmark in Cinzel 500 with positive tracking, and every paragraph, label and number in Hanken Grotesk.
- **Do** use the rotated-square diamond for markers, bullets, current-place and chosen-option states.
- **Do** keep the gold diamond in charts for the single "Best" mark; give every series marker its own series colour.
- **Do** colour debt, equity and mix with the fixed series palette (light #3F6EA6 / #B8892F / #1E8C68; dark #5C88C4 / #B08433 / #2FA38A).
- **Do** make figures clickable glass-box numbers with the dashed gold underline when they have a formula behind them.
- **Do** keep workspace motion to 150-250ms feedback and honour reduced motion everywhere.

### Don't:
- **Don't** open with a light hero, a dashboard screenshot or a row of icon cards.
- **Don't** put a gold diamond on any chart point other than the one "Best" mark, and don't use gold as a series colour beyond Equity Gold.
- **Don't** set Emblem Gold (#C9A04F) as text on white; use Deep Gold Ink (#7B5C1F).
- **Don't** add drop shadows to panels or cards at rest, or round corners beyond 6px; glass panels (12px, below) are the one exception.
- **Don't** add a second ceremonial animation; the Ascent is the only one. Scroll reveals stay short (≤0.8s per item) and never loop.

## Workspace dashboards (added with the investor, lender, advisor and founder dashboards)

- **Components** live in `site/kit.js`:
  - **Data tables:** search, filters, sortable sticky headers, paging, CSV and .xlsx export; they turn into labelled cards below 720px.
  - **Dialogs:** native `<dialog>` with a focus trap and Esc to close.
  - **Toasts.**
  - **Count-up figures:** they flash green or red when the value changes.
  - **Status timelines:** the current step pulses.
  - **Kanban board:** HTML5 drag, plus a "Move to" select for keyboard users.
  - **Skeletons and empty states:** the empty states carry the emblem line drawing.
- **Motion:**
  - Every animation stays under 400ms on `--ease-out`.
  - Page enter: 10px rise.
  - List stagger: 40ms per item.
  - Charts: lines draw in and bars grow, once, on entering the viewport.
  - All of it is off under `prefers-reduced-motion`.
- **Counters** (offers, members, platform investors) are thin meters with a tick at the warning threshold: green, then amber at the warning, then red at the limit.
- **Colour:** gains and losses use `--good` and `--bad`. Projected values (future interest) use the series colour at 42% opacity.
- **Cards and panels** keep the brand's 6px radius, with a soft two-layer shadow and a 2px lift on hover.

## Glass and the New York skyline

The public site, the sign-in pages and the CMA lock page sit in front of a New York skyline at night: a black silhouette with gold lit windows. The skyline includes the Chrysler Building, the Empire State Building, 432 Park Avenue and One World Trade Center. Panels in front of it are smoked glass. In the workspace, only the rail and the page masthead carry it.

- **Source:**
  - `site/tools/skyline.py` draws the skyline from a fixed seed.
  - It writes `site/assets/skyline.svg`, used as a background image.
  - It also writes an inline copy into `site/shell.html` as `#tpl-skyline`. The home intro switches that copy's windows on as you scroll.
  - Re-run the script after changing it; never edit the SVG by hand.
- **Glass:**
  - Tint `rgba(20,19,16,.6)`, with `rgba(15,15,13,.8)` for the strong variant.
  - Blur `blur(14px) saturate(1.25)`.
  - 1px edge `rgba(232,199,123,.22)`.
  - 12px radius.
  - The Glass shadow above.
  - Glass is used on: the header, the decision strip, page headers, section cards, the CTA band, the auth card, the contact form, the explain panel and the footer.
- **The Readable Text Rule:**
  - Text never sits directly on the skyline.
  - Every line of copy is on a glass panel tinted at least .6, or on a section ground at .9 or more.
  - The header is tinted .8 (.9 on phones), so gold content scrolling under it never washes out the nav.
- **Where the skyline shows:**
  - In the hero, behind the decision strip, between inner-page cards and behind the sign-in card.
  - Content sections cover it with near-solid obsidian. The closing CTA section (`.sec.sky`) lets it through.
- **Phones (≤760px):**
  - Panels drop the blur and use a .88 tint, so scrolling stays smooth.
  - Readers who set `prefers-reduced-transparency`, and browsers without `backdrop-filter`, get solid panels.
- **Workspace:**
  - The rail shows the skyline at its foot behind a dark veil; the signed-in card there is a glass plate.
  - Page headers are dark mastheads with the skyline at the right and ivory text.
  - Data tables, KPI tiles and working panels stay solid white. Glass never touches data.
