---
name: audit-component
description: Deep MD3 spec audit of one component against m3.material.io and Compose androidx-main, producing docs/audits/<component>.md plus GitHub issues for confirmed findings. Usage: /audit-component <ComponentName>
---

# Component Spec Audit

Audit ONE component (`$ARGUMENTS`) against the spec sources, produce a report, and file
issues for confirmed findings. **Audit and fix are separate** — never change component
code in this flow. The pilot example to imitate: `docs/audits/button.md`.

## Spec priority (for conflicts)

1. m3.material.io (current token tables — note: focus/pressed state layers are 0.10 and
   disabled containers 0.10 in current tokens; old 0.12 guidance is dead)
2. Compose `androidx.compose.material3` @ androidx-main
3. material-web (maintenance mode; polish reference only)

Record every conflict AND its ruling with a one-line reason in the report.

## Step 1 — Read the implementation first

- `src/components/<Name>/` — component(s), `.module.css`, tests, stories
- `docs/audits/2026-07-15-cross-cutting.md` — the component's known issues (Tier table)
- `src/styles/tokens.css` values for any token the component references

## Step 2 — m3.material.io (Playwright MCP; WebFetch does NOT work on this SPA)

Navigate to `https://m3.material.io/components/<component>/specs`, then
`browser_run_code_unsafe` with `page.waitForTimeout(3000)` + `page.evaluate(() =>
document.body.innerText)` for the prose (anatomy, states, measurements, shape morph).

Token tables are `token-viewer` custom elements and MUST be interacted with. Loop over
every token set (use `page.evaluate` clicks ONLY — `page.locator().click()` hangs):

1. `document.querySelectorAll('button.active-token-set-button')[0].click()` → wait 600ms
2. Pick the set from `[role="menuitem"]` by text → wait 1000ms
3. Click the `expand_all` control inside the first `token-viewer` (find by
   `textContent.trim() === 'expand_all'`, click its closest button) → wait 800ms
4. Extract `token-viewer` `innerText`; strip the header chrome

Values render as resolved baseline-light hexes — map them back to color roles
(#6750A4=primary, #49454F=on-surface-variant, #CAC4D0=outline-variant, #1D1B20=on-surface,
#E8DEF8=secondary-container, #F7F2FA=surface-container-low, #F3EDF7=surface-container…).
Ignore the bottom "Baseline tokens" viewer if its sets are labeled `[Deprecated]`.
Dump raw extracts to the scratchpad immediately — context is precious.

## Step 3 — Compose (delegate to a background subagent)

Spawn an agent to fetch raw `.kt` from
`https://raw.githubusercontent.com/androidx/androidx/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/`
(list the `tokens/` dir via the GitHub contents API when guessing names fails):

- The component file(s) + its `*Defaults` object + token files (all variants/sizes)
- Supporting: `ShapeTokens`, `TypeScaleTokens`, `ElevationTokens`, `StateTokens`,
  `MotionScheme`/`*MotionTokens` when motion is involved
- **CRITICAL**: extract BOTH the token values AND the `*Defaults` implemented values —
  Compose hardcodes corrections with TODO comments where token files are wrong (Button
  had 3 such cases). Report dp numbers, role names, opacities, spring params verbatim;
  forbid guessing; require flagging anything unresolved.

## Step 4 — Behavior (interactive components)

- Keyboard: expected keys from the WAI-ARIA APG pattern for the widget class
  (menu button, dialog, radio group, slider…) + Compose semantics (Role, focus behavior)
- Check the implementation actually handles them (read the handlers; run existing tests)
- Focus management: initial focus, trap, restore; ARIA attributes and roles
- State layers hover 0.08 / focus 0.10 / pressed 0.10 / dragged 0.16; Ripple/FocusRing
  usage; 48dp touch targets; `prefers-reduced-motion` for JS-driven animation

## Step 5 — Report: `docs/audits/<component>.md` (Japanese, follow button.md's format)

1. 結論サマリ: what matches (list explicitly — it proves coverage), then a CONFIRMED
   findings table (ID like B1/M1…, impl vs あるべき値, severity) — CONFIRMED means both
   sources agree or one source + no contradiction
2. 軽微/判断のみ items (PLAUSIBLE, conflicting, or judgment calls — NOT issued)
3. ソース間の食い違い table with rulings
4. Detailed per-dimension tables (sizes / shapes / colors per state / motion / behavior)
5. Anything learned that improves this skill → update this SKILL.md in the same PR

## Step 6 — Issues & PR

- One GitHub issue per CONFIRMED finding group (English, labels: `phase-b` + `tokens`/
  `a11y`/`vrt` as relevant), each citing `docs/audits/<component>.md <ID>` and expected
  Chromatic impact
- PR the report to `develop` from branch `docs/<component>-audit`; fixes come later as
  separate 1-issue PRs (bundle only findings that rewrite the same code region)
