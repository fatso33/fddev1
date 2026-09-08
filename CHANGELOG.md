# Changelog

## Widget Studio review follow-up — 2026-09-05

`docs/Widget-Studio-Review-Followup-Implementation.md` closed out the four items left
after the post-implementation review fix pass below. Section headings (e.g. Layout,
Background) in the component Appearance panel no longer render with zero fields
beneath them once every field in that group is tier-hidden — the heading now hides
along with its fields, but stays visible whenever a field is shown only because it
holds an authored non-default value (Part 2.1's tier-bypass guarantee). `Ctrl+D` now
duplicates the active multi-selection (or single selection) as one undo step, matching
Delete's and the align toolbar's own "the whole selection is one action" convention —
multi-select and the align/distribute toolbar themselves turned out to already exist
and work; the review's original "no multi-select or align tools" framing was wrong,
only the keybinding was actually missing. A one-line hint in the Layers panel now
points at the shift-click-to-multi-select gesture when 2+ components exist, since the
align toolbar was otherwise undiscoverable without already knowing it. One stale doc
line in `FlightDeck-Widget-Standard-v1.28.md` §5 (still describing the rule-tier
appearance editor as unbuilt, after §2 had already been corrected) is fixed to match.

`widget-studio` (item 1: `StudioInspector.js`; item 3: `StudioState.js` +
`StudioCanvas.js`; item 4: `StudioLayersPanel.js`). Outer repo (item 2: `docs/`).
Nothing pushed.

## Widget Studio post-implementation review fixes — 2026-09-05

The senior lead's post-implementation review of the whole UX Revamp
(`docs/Widget-Studio-Revamp-Post-Implementation-Review.md`) found 23 issues across the
critics' original findings plus new ones; this closes every item in the review's own
"Recommended order" plus 6 of 8 §9 polish items — see the review doc's own "Resolution
status" section for the full per-item table.

Highlights: **rule ordering** (`style.rules[]` was first-match-wins with no reorder
control at all — a natural-order two-threshold gauge silently never reached its second
threshold) now has Move Up/Down controls, verified against the real evaluator; the
**validator** now catches undeclared state references in `binding.stateRef`,
`style.rules[].when`, and `visibleWhen` (previously silent — a widget whose conditional
formatting could never fire still validated as fully compliant); a **fresh rule on a
widget with no declared state vars** no longer gets kicked to the raw-JSON fallback; the
component **LAYOUT & LAYERING panel** is now disclosure-tiered (Guided drops from 12
fields to 3); **Part 2.1's "surfaces regardless of tier" guarantee** now actually covers
both axes it promises, not just `showWhen`; the **binding panel's Simple picker** has an
escape hatch ("Find it by moving it" / "switch to Full mode") when a value falls outside
its 4 hardcoded categories; **`FDWS v1.29`** (the Theme Override widening to
stroke/glow/border-glow colors) finally has a published delta spec, and two other
documentation-drift issues are fixed; plus 6 smaller polish items (hit targets, operator
labels, mangled auto-generated state var names, new-component layer group, blocked-export
dialog wording, the Theme Override chip disappearing instead of disabling).

One review claim didn't hold up: the SimVar Tester's offline gating (`Start search`/
`Fire & Watch`) was reported broken, but both already show "Not connected" correctly on
inspection and live testing — no code change needed there. One item is explicitly
deferred: `Ctrl+D`/multi-select/alignment tools is a real feature, not a polish-sized fix.

`widget-studio` `292f3d1`, `8332456`, `35dbd0e`, `2f9d768`, `f591197`, `afff99a`. Outer
repo `f6d2136`. Nothing pushed.

## Widget Studio header staleness fix — 2026-09-05

Found live while verifying Wave 4's G10 slice (below), confirmed unrelated to
it: the top header's widget name/revision badge only refreshed on
`WIDGET_DEF_LOADED`/`WIDGET_META_UPDATED`, missing `HISTORY_CHANGE`
(Undo/Redo after any widget-meta edit) and `WIDGET_SAVED` (a plain Save
bumping revision) — reproduces identically via the pre-existing Display Name
field, nothing to do with the new panel. The update is cheap and idempotent,
so it now runs on every notify instead of maintaining a changeType allowlist
a future state method can silently fall outside of.

`widget-studio` `415a2d4`. Nothing pushed.

## Widget Studio UX Revamp, Wave 4 G10 — Full whole-widget JSON read/apply panel — 2026-09-05

The bigger, editable sibling of Wave 2's per-section read-only JSON view
(`applySectionJsonViews()`), reserved for Wave 4 from the start. A new
"{ } Full JSON" button in the widget-root header, visible only at Full tier,
opens a modal with the complete widget definition as pretty-printed JSON.
Apply parses and validates it — malformed JSON or a non-object top-level
value is rejected inline, modal stays open — then applies it via the
existing `setWidgetDef()`, which was already the complete, safe "load a new
widget definition" primitive (full clone, no allowlist stripping,
auto-defaults, resets stale selection, records undo history). No new
state-layer code needed — this slice is purely a new UI surface built on
something already proven safe.

Live-verified: byte-for-byte textarea prefill, malformed/non-object JSON
rejection, a real edit committing and reverting via Undo, applying a
definition that drops the currently-selected component (graceful fallback),
and a genuinely unrecognised field surviving the round-trip into §10.4's own
Unrecognised Properties section.

`widget-studio` `6b0209f`. Studio-only, no `shared/` involvement, no FDWS
bump. **Closes Wave 4 in full** (Part 8, §10.4, G10 full panel all shipped).
Nothing pushed.

## Widget Studio UX Revamp, Wave 4 §10.4 — Unrecognised properties — 2026-09-05

A widget file may carry JSON keys this build's registry doesn't know —
imported from a newer Studio, or hand-authored. They already survive
import → edit → save/export silently today (confirmed: nothing in the
round-trip path reconstructs a def or component from a fixed key list),
but were invisible and un-editable. This slice makes them visible.

New `findUnrecognisedComponentPaths()`/`findUnrecognisedDefPaths()`
(`StudioValidator.js`) diff a component's `props`/`binding`/`style` against
the registry's own `getFieldsForType()`, stopping the instant they hit an
already-declared path so dynamically-keyed content (`style.rules`,
`style.states`) never false-positives as "unrecognised." Widget-root
detection is deliberately shallow — top-level `def` keys only, since
`def.meta`/`def.style`'s own internals are hand-coded with no registry
backing to diff against safely without a second, undrift-checked allowlist.

New "Unrecognised Properties" blocks render at the bottom of Data & Content
and Appearance (or their own section, for a wholly unclassified key),
always visible regardless of Guided/Build/Full tier — a data-safety
guarantee, not a hideable convenience. Scalars get an inline "edit
(unvalidated)" affordance behind a loud warning, reusing the existing
generic `commitField()`; objects and arrays stay strictly read-only.

Found and fixed a real latent bug along the way: `commitField()` silently
no-op'd on a bare single-segment path (re-committing the unchanged old
value instead of the new one) since every prior call site only ever used
nested paths — exercised for the first time by the new "wholly
unclassified component-root key" bucket.

`widget-studio` `85c30d7`. Studio-only, no `shared/` involvement, no FDWS
bump. Second of three Wave 4 slices — only G10's full whole-widget JSON
read/apply panel remains. Nothing pushed.

## Widget Studio UX Revamp, Wave 4 Part 8 — Recent widgets quick-switch — 2026-09-05

First slice of Wave 4. A popover is a fully separate, independently-saved
widget definition, and the Studio holds exactly one widget in memory at a
time — so building a host+popover pair meant manually saving the host,
scrolling the Templates tab to find the popover by name, opening it, editing,
saving, then scrolling back to find the host by name again. Adds a "Recent"
dropdown to the menu bar tracking the last 8 opened/saved widgets and
popovers, one click to jump to any of them — not a multi-document IDE, just
skipping the "find it by name" step every time.

Along the way, fixed a pre-existing gap: the Templates tab's saved-widget/
-popover "Open" button replaced the current widget with zero confirmation,
unlike every other widget-replacing action in the app (New, New Popover,
Load Template) — a rare footgun that this feature would have made routine by
making switching far more frequent. Both the Templates "Open" button and the
new Recent dropdown now share one `confirmAndSwitchWidget()` helper.

Recency is tracked only for defs with a stable saved-library identity (not
brand-new, never-saved drafts), on open and on save, and self-prunes when a
tracked widget is deleted — no dead entries left in the dropdown.

`widget-studio` `717c4fe`. Studio-only, no `shared/` involvement, no FDWS
bump. Nothing pushed.

## Widget Studio UX Revamp, Wave 3 G6 Slice 3 — true two-level nesting, closes G6 and Wave 3 — 2026-09-05

The actual "two-level condition builder" the proposal names. Slices 1-2
brought `visibleWhen`, `style.rules[].when`, and `interactions[].condition`
to one-level compound (ALL/ANY) support, but all three still only *detected*
a genuinely nested expression and safely routed it to a JSON textarea — none
of them let an author *build* one visually. This slice adds that: a
condition-list item can now be either a leaf or a one-level-deep nested
ALL/ANY group, added via a new "+ Add Group" button alongside "+ Add
Condition".

Scoped to exactly two levels — matching the proposal's own wording, not
arbitrary recursive nesting. A group containing a group still safely falls
back to the JSON escape hatch, exactly as both prior slices left it; the
runtime already supports arbitrary depth, so raising this UI ceiling later is
a small, contained change if ever asked for, not a rewrite.

Because all three surfaces already shared one method
(`renderConditionListEditor()`, from slice 1), this shipped as one change
with no per-surface work — verified with a deep pass on `visibleWhen` (add,
edit, switch combinator, remove a leaf, remove a whole group, round-trip
through a fresh re-render) and a shallow confirmation on the other two
(including the interactions modal's Cancel-leaves-nothing-behind guarantee),
plus a direct `ConditionEvaluator.js` check that a UI-built two-level
condition evaluates correctly at runtime.

`widget-studio` `e27f707`. Studio-only, no `shared/` involvement, no FDWS
bump. **Closes G6, which closes Wave 3 in full.** Nothing pushed.

## Widget Studio UX Revamp, Wave 3 G6 Slice 2 — shared compound condition editor for interactions — 2026-09-05

Applies G6 slice 1's shared `renderConditionListEditor()` to the Add/Edit
Interaction modal's "Only Run If" condition — the last of the three G6
surfaces needing one-level compound support (`visibleWhen` and `style.rules`
already had it). This surface is a Save/Cancel-transactional modal, not an
immediate-commit panel, so the shared editor gained a `deferred` option: its
"Use This Component's Own Value" row skips the immediate state-var creation
it does elsewhere, deferring to the modal's own Submit handler so Cancel
still leaves nothing behind.

Fixes a real, confirmed lossy bug along the way: re-opening a hand-authored
compound `interactions[].condition` used to seed from only its first
sub-clause and silently drop the rest on the next Save. The full structure
now round-trips exactly.

No runtime change — `ConditionEvaluator.js` already evaluates `allOf`/`anyOf`
at arbitrary depth for this surface too.

`widget-studio` `19a4849`. Studio-only, no `shared/` involvement, no FDWS
bump. Nothing pushed.

## Widget Studio UX Revamp, Wave 3 G6 Slice 1 — shared compound condition editor for style.rules — 2026-09-05

Re-verifying G6 (the "two-level condition builder") against current source found
the three affected surfaces aren't equally behind: `visibleWhen` already has a
full one-level compound editor (ALL/ANY combinator + N condition rows);
`style.rules[].when` and `interactions[].condition` are both single-leaf only.
This slice extracts `visibleWhen`'s editor into a shared, reusable
`renderConditionListEditor()` and applies it to `style.rules[].when` — bringing
rules up to the same one-level compound capability, including a JSON escape
hatch for the condition that rules never had before. `interactions[].condition`
(different, deferred-until-Submit commit semantics, plus a known lossy-edit
bug) and true two-level nesting are separate, later slices.

Found and fixed a real, previously-latent bug during verification: the "too
complex for the visual editor, use JSON" fallback only ever checked the
outermost expression shape — so a genuinely two-level condition (an `allOf`
containing a nested `anyOf`) passed as "simple" and would have been silently
destroyed on the next row edit. Fixed to check that every condition-array
member is actually a flat leaf before treating an expression as editable.

No runtime change: `ConditionEvaluator.js` already evaluates `allOf`/`anyOf` at
arbitrary depth for both surfaces — this was purely an authoring-UI gap.

`widget-studio` `5f46213`. Studio-only, no `shared/` involvement, no FDWS bump.
Nothing pushed.

## Widget Studio UX Revamp, Wave 3 Slice 4 (Part 7 item 1) — drag-to-place from the palette — 2026-09-05

Closes Part 7 in full. Both testers tried to drag palette cards onto the canvas
and couldn't — click-to-add was the only way in. Palette cards are now
draggable, landing grid-snapped exactly where they're dropped; click-to-add
stays for keyboard/accessibility.

Extracting the shared placement logic into `createComponentFromPaletteItem()`
surfaced a real, previously-undocumented bug: the old click-to-add placement
comment claimed to "find next available empty position" but never actually
checked occupancy — every 4th+ component added from the palette in a row
silently landed exactly on top of an earlier one. Click-to-add now runs a
genuine best-effort free-cell search, falling back to a fixed position only
when the grid is genuinely full (this app deliberately allows intentional
overlap elsewhere — layered instrument needles/bugs — so a full grid isn't
treated as an error).

`widget-studio` `6fc3f85`. Studio-only, no `shared/` involvement, no FDWS bump.
Nothing pushed.

## Widget Studio UX Revamp, Wave 3 Slice 3 (Part 7 item 3) — unconfigured visual affordance — 2026-09-05

Slice 2 made a fresh `core.display`/`core.button` capable of arriving genuinely
unconfigured (no binding, no interaction) instead of secretly pre-wired to junk —
but "empty" and "wired to garbage" still looked identical on canvas and in the
layer tree, which is Marcus's exact complaint (V15).

A new `isComponentUnconfigured(comp)` (`StudioValidator.js`) drives a dashed,
gray "not connected" cue — an outline + tag on canvas, a matching badge in the
layer tree — deliberately scoped to the 4 types where the check is unambiguous:
`core.display`/`core.indicator` (no `readSimVar`/`stateVar`), `core.input` (no
`readSimVar`/`writeEvent`/`stateVar`), `core.button` (no `stateRef`/
`sublabelStateRef` and no interactions). `core.label` is deliberately excluded —
an unbound label is its normal, intentional static-text state, not a broken one.
The other 11 types are left alone for now; widening later is a small, contained
change if evidence for it shows up.

`widget-studio` `9db2af8`. Studio-only, no `shared/` involvement, no FDWS bump.
Nothing pushed.

## Widget Studio UX Revamp, Wave 3 Slice 2 (Part 7 items 2+4) — neutral seed defaults & blank-template hygiene — 2026-09-05

A freshly-placed `core.display` used to arrive pre-bound to `com1ActFreq`/
`FREQ_COM`/"ACT"/"MHz", and a fresh `core.button` pre-wired to a live
`CUSTOM_EVENT` dispatch — both looked configured but weren't wired to anything the
author actually meant, and that junk survived Duplicate (V15). This is exactly how
four preset buttons in a real test build all ended up non-functional despite
following the intended workflow.

Both palette defaults now arrive neutral: the display has no binding and a generic
format, the button has no interaction. Scoped to exactly these two types (matching
the proposal's own wording and the real bug) — every other palette control ships a
meaningful, correctly-typed demonstration binding nobody has complained about, and
widening the fix to them would have been scope creep. The Blank Starter Widget
template's own sample button carried the identical `CUSTOM_EVENT` wiring baked in
as saved data — fixed the same way, including its `capabilities.writeEvents`
manifest entry.

`widget-studio` `48eb319`. Studio-only, no `shared/` involvement, no FDWS bump.
Nothing pushed.

## Widget Studio UX Revamp, Wave 3 Slice 1 (Part 6 item 5, V7) — "Shows"/"Called" field pairing — 2026-09-05

Closes Part 6 in full (items 1-4 shipped in Wave 0a) and opens Wave 3. The two name
fields a component can have — the text it actually shows at runtime, and the
Studio-only authoring name used in the layer tree/panel header — rendered in two
unrelated accordion sections with no cross-reference and no mention of the runtime
fallback between them.

Scoped to exactly the 3 component types where this pairing is real: `core.label`
(`props.text`), `core.button`/`core.indicator` (`props.label`) — confirmed via source
as the only types with both a `def.label` runtime fallback and a matching registry
Content-group field. These now render as one paired row, "Shows" next to "Called," in
place of the old bare "Display Label" field — the content field's own per-type
tooltip (e.g. `core.button`'s `binding.stateRef` note) is preserved, with the fallback
behavior appended. The other 15 component types are untouched.

`widget-studio` `16308da`. Studio-only, no `shared/` involvement, no FDWS bump.
Nothing pushed.

## Widget Studio UX Revamp, G10 — per-section JSON at Full tier — 2026-09-05

Full tier's own design promises "every field, flat and searchable, plus per-section
JSON" — field search is Part 3 (deferred), this is the per-section JSON half, closing
G10's Wave-2 scope (the full whole-widget read/apply panel stays separate, later,
Wave-4 work). Every one of the 10 real Inspector accordion sections (6 widget-root + 4
per-component) gets a read-only "View JSON" toggle, visible only at Full tier, showing
exactly that section's own underlying data.

An Explore pass traced each section's own commit handlers to their real top-level keys
rather than guessing a shape — catching a genuine inconsistency along the way:
METADATA & SPECIFICATION's `id`/`revision` live on the widget def directly while every
other field in that section lives under `def.meta`.

`buildAccordionGroup()` gained an optional `jsonData` param (recorded, not rendered,
at call time); a new `applySectionJsonViews()` injects the toggle+block after the
whole panel finishes rendering, mirroring the existing `applyTierMoreBadges()`
pattern — needed so the JSON block lands at the bottom of every section consistently,
including the two ("empty shell now, populated later") sections whose real content
appends afterward.

A real bug caught live: the first pass hid the toggle entirely on 5 sections whenever
their underlying data was legitimately unset (nothing declared yet) rather than
"not applicable" — fixed by normalizing each to the same empty default its own
section body already uses.

`widget-studio` `0580221`. Studio-only, no `shared/` involvement, no FDWS bump.
Nothing pushed.

## Widget Studio UX Revamp, Part 1.2 — the named-editor promise is CI-backed — 2026-09-05

Ingrid's §1.2 ask: an allowlist test asserting a fixed list of controls still resolve
to their own named, hand-coded implementations and never quietly fall back to the
generic field-rendering engine. Her original 2026-09-03 list had drifted since —
`arcBandsEditor`/`rowListEditor` were deliberately migrated onto the generic engine
since then (they're supposed to be generic now), `composeEditor` no longer exists as
a control name, and `contextMapBuilder` was never a `FIELDS` control at all (it only
appears in `ACTIONS[].params`). The 7 names still genuinely bespoke-by-design today
are exactly `scripts/check-registry-drift.mjs`'s own `DEFERRED_CONTROLS` Set.

That set was already checked one direction (never silently unhandled — the existing
`unregisteredControls` check, which fails the build). Added the missing direction:
`bespokeRegressions` fails the build if any `DEFERRED_CONTROLS` name also gained a
`FIELD_RENDERERS` entry — exactly the "resolves to a generic fallback" regression
Ingrid's quote names — reusing the script's existing sets rather than a second
hand-maintained list. Added `staleAllowlistEntries` alongside it as an
informational-only companion (a name no longer declared anywhere in the registry).

Verified both directions actually fire: temporarily added a throwaway
`conditionBuilder` entry to `FIELD_RENDERERS`, confirmed the check now fails under a
new "BESPOKE CONTROL REGRESSION" heading; separately commented out `visibleWhen`'s
registry row, confirmed the advisory heading fires and the script still exits 0. Both
scratch edits reverted and confirmed clean via `git status` before the real commit.

Script-only, single-repo (outer repo owns `scripts/`) — no `shared/` involvement, no
runtime or Studio UI change. Nothing pushed.

## Widget Studio UX Revamp, theme-override runtime widening — FDWS v1.29 — 2026-09-05

Part B3 (Wave 2) found the runtime only ever consumed three color fields under
`style.themeOverride`: `typography.color`, `border.color`, `background` — everything
else stayed a raw literal regardless of theme or manual override. Re-verifying
against current source found the real gap was exactly three more color-valued
fields: `typography.stroke.color`, `typography.glow.color`, `border.glow.color`
(font/size/weight, border width/style/radius, align, offset, and orientation aren't
colors and need nothing here, despite the original handoff brief's broader framing).

`BaseComponent.js`'s `applyStyles()` and `applyOptionalStateStyle()` now resolve all
three through the existing `resolveThemedColor()` helper, reading the matching
`style.themeOverride.typography.stroke.color`/`.typography.glow.color`/
`.border.glow.color` paths — reusing the existing `typography`/`border` colorKinds
rather than adding new ones. `PropertyRegistry.js` bumped `FDWS_VERSIONS` to `1.29`
and declared the three new override fields. `StudioInspector.js`'s Appearance panel
gained matching hand-coded Stroke/Glow/Border Glow Color fields on the Base tab
(same pattern as Text/Border Color); State/Rule tabs are unaffected, still rendering
these fields generically.

Live-verified in Device View (the real runtime renderer): auto-derivation produces
sane light-mode colors for all three; Manual overrides render verbatim on the
non-base theme and fall back to the raw literal on the base theme; the State tab's
generic fields are unchanged; `applyOptionalStateStyle()`'s new resolve calls were
proven via a direct pure-function test matching its exact call shape.

Outer repo `575cc8f`, `widget-studio` `b320e5b`, `flight-deck-pwa` `be52473`
(a real functional sync, not inert — the PWA runs this same runtime code). Nothing
pushed.

## Widget Studio UX Revamp, V13 migrate/delete chip — 2026-09-05

Wave 0 already shipped the validator-panel warning for an orphaned
`style.states.<name>` key (left behind by e.g. a Button Variant change). This adds
the proposal's remaining ask — an inline fix, not just a report. A warning row
renders directly below the Appearance panel's target strip for each orphaned key,
reusing the existing `resolveStateStyleConfig(comp)` lookup rather than re-deriving
`StudioValidator.js`'s detection logic.

Three cases, matching the validator's own two-branch wording: a free valid target
gets Migrate + Delete; a valid target already holding its own data gets Delete only
(Migrate omitted, not disabled, with a tooltip explaining why); no valid target at
all (the component type has no state-style support) gets Delete only.

Live-verified: Migrate renames the key and clears the row; a live re-run of
`StudioValidator.validate()` confirms the underlying warning is genuinely gone, not
just the UI; the "both keys present" edge case correctly omits Migrate; the
no-support-at-all wording is correct on `core.label`; no false positives on
components with no `style.states` or only a correctly-named one.

`widget-studio` `537e59b`. Studio-only. Nothing pushed.

## Widget Studio UX Revamp, Part 2 Slices 2 & 3 (§2.1 guarantee + widget-root tiering) — 2026-09-04

Completes Part 2. Two independent, Studio-only slices:

**Slice 2 — showWhen-suppressed-but-set guarantee (§2.1).** A field a `showWhen`
condition currently hides no longer silently vanishes when it holds a genuinely
authored, non-default value. It now renders anyway, dimmed, with a
human-readable reason (`"Format ≠ LATLON_DMS — still set to 'lon'"`) and a
one-click Clear, bypassing both `showWhen` and tier hiding the same way. Reuses
the existing raw-value reader (`getFieldValue()`) and every `FIELD_RENDERERS`
function unchanged. A value equal to its own registry `default` stays silently
skipped, same as before — only a genuinely different, authored value triggers
the reveal. Live-verified on `core.display`'s `props.coordAxis`.

**Slice 3 — widget-root panel tiering (G9's other half).** Tiers the 6
hand-coded widget-root accordion groups (Metadata, Grid & Dimensions, Canvas
Appearance & Border, Theme, Deck Events, Capabilities Matrix), which previously
carried zero `data-tier` attributes at all. No mechanism changes — Slice 1's
`tierHidesField()`/`applyUiMode()`/`applyTierMoreBadges()` already scan the
whole container for any `[data-tier]` element, so this is pure markup editing.
Guided keeps only the widget's own Display Name; Deck Events and Capabilities
Matrix are wholly Full-tier (one wrap per section). Live-verified: correct
per-section "N more" counts, correct reveal behavior, Full shows everything
with zero stray badges, existing accordion/field behavior unaffected.

`widget-studio` `e0aca81` (Slice 2), `d01a09f` (Slice 3). Nothing pushed.

## Widget Studio UX Revamp, Part 2 Slice 1 (three disclosure tiers) — 2026-09-04

Replaces the Simple/Advanced binary with three tiers — Guided, Build (default),
Full — per the proposal's Part 2. Re-verifying found both stated prerequisites
already satisfied: the "~124 `default:` values" work was already done (Part 1's
Wave-1 gap-closing pass), and the "26-30 fields" problem was already stale —
`tier:'simple'` already averages 15.4 fields/type (min 14, max 22) across all 18
component types. So this slice is the mechanism plus a curated Guided tier, not
Build-tier rework.

`shared/widgets/PropertyRegistry.js`: a new `guided: true` boolean layered onto
34 already-`simple`-tier fields (not a new tier value) — 5 shared `COMMON_FIELDS`
plus 1-3 per-type fields judged essential to a first, working widget of that
type, picked by hand against the actual field list rather than a group-name
heuristic. `StudioInspector.js`: `uiMode` → `uiTier`
(`'guided'|'build'|'full'`), same `localStorage` key reinterpreted for
migration (advanced→full, simple→build, no saved value→guided); one unified
`tierHidesField()` replaces the old two-pass binary visibility toggle.

Ships together with the "⋯ N more" per-section reveal — not deferred, since it's
the escape hatch that makes hiding fields by tier acceptable at all. Caught live:
an initial version computed each section's hidden-field count from inside
`buildAccordionGroup()`, right after its own `renderFn(body)` call — correct for
most sections, but APPEARANCE and DATA & CONTENT build their accordion shell with
an *empty* `renderFn` and populate the body separately afterward, so the count
always saw an empty body there and undercounted to zero for the two most
field-dense sections in the app. Fixed by moving the pass to run once, after the
whole panel has finished rendering, matching `applyUiMode()`'s own timing
requirement instead of assuming every section populates itself synchronously
inside `buildAccordionGroup()`.

Live-verified: all three `localStorage` migration paths; curated Guided fields
show/hide correctly per component; "N more" reveals exactly its section's hidden
fields without leaving the tier, and persists per section *title* across a
component reselection — matching the pre-existing `expandedGroups` accordion-state
precedent, not a new per-component-scoping bug; Layout & Layering/Grid
Position/Behavior's Add Interaction button (never tiered) unaffected; the
widget-root panel and every untouched accordion show zero stray badges.

Deferred, explicitly out of scope: widget-root panel tiering (G9's other half —
6 accordion groups, zero `data-tier` fields today, nothing there runs through the
registry engine) and Ingrid's §2.1 showWhen-suppressed-but-set guarantee
(confirmed entirely unbuilt).

First slice to touch `shared/` — `PropertyRegistry.js` synced via
`scripts/sync-shared.mjs` into both trees. `widget-studio` `ba20a07`;
`flight-deck-pwa` `20b5098` (registry copy only, functionally inert there).
Nothing pushed.

## Widget Studio UX Revamp, Part 5a Slice 3 (syncFrom / V14) — 2026-09-04

Completes Part 5a. Adds a fourth option to every condition-source dropdown
(`visibleWhen` row, a `style.rules[].when`, an interaction's "Only Run If") —
"Use This Component's Own Value" — that declares or reuses a `state[].syncFrom`
var mirroring the selected component's own `binding.readSimVar`, then points the
condition at it. This is the hop Marcus's oil-temp rule needed and nothing in the
UI pointed at: `state[].syncFrom` already makes a local state var track a live
SimVar/Deck Event at runtime (`CompositeWidget.js:421-450`), so this slice is
authoring UI only — no runtime, validator, or `shared/` change.

Two new `StudioState.js` primitives: `resolveSyncFromVarName(simVar)` (pure —
returns an existing match or the deterministic name a fresh var would get) and
`ensureSyncFromVar(simVar)` (idempotent create, deliberately skips its own
`saveHistory` so callers land it and their own component update as one undo step
— same pattern `pasteStyleToSelection()` already established). The two
immediate-commit editors (`visibleWhen`, `style.rules`) call `saveHistory` once
then commit with `recordHistory:false`; the interaction modal defers everything
to Submit (tracked via a dialog-local `ownValueSimVar`, cleared on Cancel so
nothing is created for an abandoned pick) and shows an honest "will create/reuse
state var … on Save" note rather than misrepresenting the pending var as already
declared. A shared `conditionStateOptionsHtml()` fragment keeps the three
dropdowns' wording from drifting; the option is omitted, not disabled, when the
component has no read binding to mirror.

Live-verified: creation vs. reuse (an existing `syncFrom` match resolves to the
same var, no duplicate), one-step undo reverts both halves together in all three
editors, Cancel on the interaction modal leaves nothing behind, the option is
absent for a no-binding component, and the existing declared-var/Custom-path
options are unchanged.

`StudioInspector.js`/`StudioState.js` are Studio-only — single-repo commit,
`widget-studio` `00a669c`. Nothing pushed.

## Widget Studio UX Revamp, Part 5a Slice 2 (Connect dialog Test tab) — 2026-09-04

Adds the third tab from the Part 5a spec: inline live verification before committing a
binding. **Read kind** probes the live value directly — raw addresses via
`SimBridge.probeReadSimVar`, Catalogue/Previously-Used picks via a two-step
`resolveDeckEvent()` → `probeReadSimVar()` (re-verifying found `resolveDeckEvent()`
alone only returns the mapping, never a value — confirmed against its one existing
call site, the sidebar's resolved-info line). Unmapped names reuse that same sidebar's
"no mapping in the active profile" wording rather than a new message.

**Write kind gets no fake inline test.** A write event can't be verified by reading it
back — only Fire & Watch (firing the event, watching a separately-chosen SimVar) proves
anything, and that needs context this small dialog doesn't have. Building a "looks
tested, isn't" affordance here would repeat V20's own trap one dialog over, so instead:
explanatory copy plus an "Open in Fire & Watch →" button that hands off to the real
bottom-bar SimVar Tester via a new `StudioSimVarTester.prefillFireAndWatch(event)` entry
point — the small prefill hook flagged as deferred work when Slice 1 shipped.
`StudioInspector` is constructed before `StudioSimVarTester` in `StudioApp.js`, so the
cross-panel reference is assigned right after both exist, mirroring the loosely-coupled
`state.testerParsed` pattern already used for the reverse direction (tester → inspector
paste buttons).

Live-verified: not-connected messaging matches the tester's own copy; empty-selection
states on both kinds; the write-kind hand-off genuinely opens the drawer (checked the
container's own class, not just an `isOpen` flag) with the event pre-filled; tab
switching doesn't disturb state the other two tabs or commit rely on; a stray test
component left over from Slice 1's verification (`comp_pscd`) was found and cleaned up
before this slice's own testing began.

`StudioInspector.js`/`StudioSimVarTester.js`/`StudioApp.js` are Studio-only —
single-repo commit, `widget-studio` `dcff384`. Nothing pushed.

## Widget Studio UX Revamp, Part 5a Slice 1 (Connect dialog + V20 fix) — 2026-09-04

Adds a "Connect…" button next to the Read/Write Deck Event rows in the SimVars &
Bindings panel, opening a new dialog with two tabs — Catalogue (browse
`shared/deckEvents.js` by category, plus a new free-text search and a "Previously Used"
section from existing custom/pack data — no new catalogue content, per project policy)
and Raw Address (the same sanitize/diff-hint validation the existing custom-input
already uses, plus an always-enabled Unit field with corrected copy explaining why it
only appears here). The existing Advanced dropdown/custom-input fields and Simple-mode
picker are untouched — Connect is additive, not a replacement.

**The V20 fix**: picking a write target now proposes (default-checked) the interaction
that actually makes it fire, so Connect can't produce the "looks wired, does nothing"
state V20 describes. Reuses two pieces of logic already built in Wave 0a/0b rather than
re-deriving them: `StudioValidator`'s inline consumption check (extracted as exported
`isWriteEventConsumed(comp)`) and `StudioMenuBar`'s export-time "Wire this up"
proposals (moved into exported `proposeWireUp(comp)` in `StudioValidator.js`, since
both call sites already depend on that module). This caught a real gap in the plan's
first draft: `proposeWireUp()` already knows the *correct* trigger per component type
(`fineChange` for `core.rotary`, `increment`+`decrement` for `core.stepper`, etc.) — the
initial design had assumed `tap` universally, correct only for `core.button`.

Deferred, explicitly out of scope for this slice: the Test tab (`StudioSimVarTester`
reuse), "Use this component's own value" (`syncFrom`, V14), and Deck Events catalogue
*content* expansion (Part 5b — the user's own manual work, not delegated to Claude).

Live-verified end to end: Catalogue search/pick → paired interaction created →
re-validating confirms `UNWIRED_WRITE_EVENT` is gone; re-picking an already-consumed
event creates no duplicate; unchecking the pairing checkbox is an honest opt-out (event
set, no interaction, validator still warns); `core.input` shows no pairing UI at all
(self-dispatching); `core.rotary` proposes `fineChange` correctly; Raw Address writes
both the address and unit, and a stale unit clears on switching back to Catalogue;
existing Advanced dropdown works unchanged alongside the new button.

`StudioInspector.js`/`StudioMenuBar.js`/`StudioValidator.js` are Studio-only —
single-repo commit, `widget-studio` `867fe6c`. Nothing pushed.

## Widget Studio UX Revamp, Wave 2 Part B3 (Part 4, third slice) — 2026-09-04

Adds a discoverable entry point into per-component theme-override editing — a
"`<Light/Dark>` Override" chip alongside Normal/Pressed/Rule in the Appearance panel's
target strip, shown only when the widget is in Manual theme mode. Previously the only
route in was knowing that (a) the widget needed Manual mode, set in a separate
accordion group, and (b) the canvas header's sun/moon Live Theme Preview button had to
be flipped to the non-base theme — nothing in the Inspector itself pointed at this.

Architecturally, Theme is a **modifier of the Base tab, not a fifth peer target**: no
state/rule field path has ever consulted the theme-edit context, and structurally
can't — `BaseComponent.js` has nowhere to put a themed variant of a state or rule
(confirmed: only `style.themeOverride` off the *base* style object is ever read). So
this adds no new `target.kind` to the B1/B2 retargeting machinery — the chip just flips
`StudioState.previewTheme` (the same setter the canvas's own sun/moon button already
calls), which is the entire mechanism the existing `isOverrideEdit` context already
derived from. No new render call, no new persistent UI state.

Disabled (native `disabled`, so a click is genuinely inert, not just visually inactive)
with the proposal's own §4.1 wording as the title whenever a State or Rule tab is
active: *"Theme overrides apply to the Base style only — states and rules are already
conditional."* Hidden entirely outside Manual mode, matching the existing precedent
that the override banner/hint are already Manual-only.

**Deliberately does not widen the field set** past the 3 fields the runtime already
supports (`typography.color`, `border.color`, `background`) —
`resolveThemedColors()`/`resolveThemedBackground()` have no consumer at all for
font/stroke/glow/border-props/align/offset/orientation under `themeOverride`. Shipping
Studio UI for those would be inert — the exact "looks wired, does nothing" trap this
project exists to eliminate. Full widening needs a `BaseComponent.js` runtime change
(plus likely a `ThemeColor.js` `colorKind` extension for stroke/glow's smart
auto-derivation) — the same shape of prerequisite V24 was for Base/State/Rule's glow
merge — flagged as separate follow-up work, not built here.

Live-verified: chip appears only in Manual mode; clicking it flips `previewTheme` and
shows the existing banner; Text Color correctly writes to
`style.themeOverride.typography.color` (base value untouched); clicking again reverts;
the chip is present-but-disabled with the exact title text on the Pressed tab, and a
click there is a genuine no-op; switching back to Auto mode removes the chip entirely.

`StudioInspector.js` is Studio-only — single-repo commit, `widget-studio` `98060f3`.
Nothing pushed. **With this, Part 4 (Unified Appearance States) has all three
cascade-layer targets (Base/State/Rule) fully unified, plus theme-override
discoverability** — the one remaining gap is the documented, deferred field-set
widening above, not part of this wave's scope.

## Widget Studio UX Revamp, Wave 2 Part B2 (Part 4, second slice) — 2026-09-04

Conditional style rules (`style.rules[]`) are now a third target for the generic field
engine Part B1 built for Base/State — a rule chip in the Appearance panel's target
strip, alongside Normal/Pressed, retargeted via `style.rules.<index>.style.*`. This
replaces the old, separate "Conditional Formatting" row-list section
(`renderConditionalFormatting`, deleted entirely) rather than widening its compact
controls in place — once Base/State share one field engine, a second parallel
style-editing UI for rules would leave two competing ways to edit the same data. The
condition (state/operator/value) side is unchanged in shape, just relocated into a
small editor block shown when a rule's chip is active; only the *style* side is now
generic. Because nothing in that block touches `style` anymore (only `when`), the V18
read-modify-write hazard the old row list's `readCurrentRow()` guarded against is now
structurally impossible there, not just patched around.

A rule also gets Wave 2 Part A's "Clear (don't inherit)" checkboxes for
stroke/glow/border-glow (previously State-only), and the per-rule "Advanced: edit style
as JSON" escape hatch is kept — one route among several now, not the only one for
stroke/glow/align/orientation/gradient.

**A real bug found via fresh re-verification before implementing, not by review**:
`commitField()`'s `cloneLevel` spreads every intermediate path segment with `{...obj}`,
which silently converts an **array** into a plain object with numeric string keys.
`style.rules` is an array; committing any rule-target field through the untouched code
would have corrupted it on the first write, breaking `Array.isArray(style.rules)`
checks everywhere (rule matching, the chip list) for that component from then on. Fixed
by preserving array-ness in `cloneLevel`. Live-verified specifically:
`Array.isArray(rules)` stays `true` after a commit, and `resolveActiveRuleStyle()`
still matches/misses correctly against real state values post-fix.

Also extracted `remapAppearancePath()` as the one shared path-rewrite used by
`retargetAppearanceFields()`/`renderClearInheritedToggle()`/`applyClearedFieldState()`,
replacing three independent inline implementations before a third target could make
them drift.

Live-verified end to end: add rule → chip appears with live condition summary → edit
condition (only `when` changes) → set fields via the generic engine (round-trips to
`style.rules[idx].style.*`, glow-blur-only still preserves inherited color) → Clear
toggle round-trips `null` → JSON escape hatch write is picked up by the generic engine
on next render → remove rule (confirm modal, chip and rule both disappear, tab resets).
`core.gauge` and `core.label` re-verified unaffected (no `stateCfg` still renders
`[Normal] [+ Rule]` with no stray chip).

`StudioInspector.js` is Studio-only — single-repo commit, `widget-studio` `af9df10`.
Nothing pushed.

## Widget Studio UX Revamp, Wave 2 Part B1 (Part 4, first slice) — 2026-09-04

First slice of Part 4 (Unified Appearance States): unified the Base tab and the
interaction-state ("Pressed"/"Active"/etc.) tab of the Appearance panel onto one
generic per-target field renderer, replacing ~700 lines of duplicated hand-written
markup and write-handlers. Built by retargeting Part 1's already-proven
`renderRegistryFields`/`getFieldValue`/`commitField` engine — for the first time
pointed at `COMMON_FIELDS`' `style.*` rows instead of only `TYPE_FIELDS` — via a small
new path-remapping step (`retargetAppearanceFields`) that rewrites `style.` to
`style.states.<name>.` for the State target. Rule chips and the Theme chip (the rest of
Part 4's target strip) are the natural next slices, now that this mechanism exists.

Closes part of gap **G4**: the State tab gains Alignment, Offset, Orientation, and
Background Image support for the first time — previously Base-tab only. Also fixes an
existing inconsistency found along the way: Simple/Advanced tiering, already correctly
applied on the Base tab (confirmed its existing `data-tier="advanced"` markup already
matched the registry's own tier values), now applies to the State tab too, which had
none before.

`evaluateShowWhen` and the four primitive field renderers gained a backward-compatible
`inheritedValue` fallback (via a new `resolveEffectiveValue()` helper) so a retargeted
field can show and gate on "what Base's value is," dimmed — matching the old hand-coded
state tab's `eff()` convention. A no-op for every existing Base-target/`TYPE_FIELDS`
caller, since none of them ever set `inheritedValue`.

Text Color, Border Color, and the whole Background section stay hand-coded on the Base
tab only — Manual theme mode (FDWS v1.18) redirects their writes to
`style.themeOverride.*`, which the generic engine has no per-field write-redirect
concept for yet, and which never applies to State/Rule anyway. The Theme chip (a future
slice) is where this gets solved properly instead of as a Base-tab special case.

**Caught live in verification, not by review**: the first draft of this change dropped
Wave 2 Part A's "Clear (don't inherit)" checkboxes (the V24 `null` sentinel) entirely —
re-ported them onto the new engine, then found a second bug immediately after
(`renderRegistryFields` clears its own mount's `innerHTML` on entry, which wiped out
the checkboxes when they shared a mount) — fixed by giving them a separate child mount.

Live-verified: state-blur-only still widens with Base's color preserved (V24
unaffected), the Clear toggles round-trip `null`/removed-key correctly and disable+dim
their sub-object's own inputs, Simple/Advanced tiering works on both tabs, and
already-shipped `TYPE_FIELDS` panels (`core.gauge`, `core.selector`) render unchanged —
confirming the shared renderer changes are additive.

`StudioInspector.js` is Studio-only (not under `shared/`) — single-repo commit,
`widget-studio` `3f141b7`. Nothing pushed.

## Widget Studio UX Revamp, Wave 2 Part A (V24) — 2026-09-04

First slice of Wave 2. `BaseComponent.applyStyles()` merged `typography`/`border`
across base -> state -> rule layers with a one-level property spread, which treated
`typography.glow`, `typography.stroke`, and `border.glow` as atomic — a state or rule
layer supplying a *partial* sub-object (e.g. only `blur`) replaced the whole thing,
silently dropping a lower layer's `color` and disabling the effect entirely, since the
CSS-building guards key off `.color`/`.width`. Confirmed live-reachable today, not just
a future risk: the Studio's own State tab already lets an author edit a state's Glow
Blur without touching Color, and that alone triggered the bug.

Added `mergeStyleSubObject()` to deep-merge those three sub-objects per-key across
layers. `null` at any layer is now the explicit "clear inherited value" sentinel
(distinct from `undefined`/absent, which still inherits normally) — the intentional
replacement for the old accidental "any colorless sub-object disables inheritance"
behavior, so the merge fix doesn't quietly remove a capability. `FDWS_VERSIONS`
bumped to `1.28`, documented as non-additive (`docs/FlightDeck-Widget-Standard-v1.28.md`)
since it changes runtime behavior for any existing widget that happened to rely on the
old atomic replace. A new **"Clear (don't inherit)"** checkbox was added to the
interaction-state tab's Text Outline, Text Glow, and Border Glow blocks — the only
place besides a rule's raw JSON textarea where these three sub-objects are authored
today (the wider rule-level editor is upcoming Wave 2 work, Part 4).

`applyOptionalStateStyle()` (the separate, non-merging code path used for rocker
zones/stepper buttons/selector positions) was re-checked and confirmed unaffected — it
never composes layers at all, so there was nothing to fix there.

Live-verified via direct `ButtonComponent` instantiation (base color + state-blur-only
now correctly widens the glow instead of disabling it; the `null` sentinel disables it
regardless of Base; a Base-only single-layer render is byte-identical to before) and via
the actual Studio UI (the new checkboxes render, dim their block's fields while active,
and round-trip `null`/removed-key correctly through `getComponent()`).

Three repos, one canonical edit (`shared/widgets/PropertyRegistry.js` +
`shared/widgets/components/BaseComponent.js` + new
`docs/FlightDeck-Widget-Standard-v1.28.md`, synced): outer repo `b9d05ef`,
`widget-studio` `ceeb1aa`, `flight-deck-pwa` `6ecbfcc`. None pushed.

## Widget Studio UX Revamp, Step 3 Part B — 2026-09-04

Converted `core.gauge`, the last of the 8 originally-blocked component types, onto the
registry-driven Inspector engine — **Step 3 is now fully closed, and all 18
`TYPE_FIELDS` component types are registry-driven.**

Arc's visibility was already a correct, already-declared `showWhen`
(`transform === 'arc'`) the engine already handled generically — no new mechanism
needed. Adopted `props.axis`'s existing `showWhen` (`transform === 'translate'`) as a
deliberate fix over the old hand-coded panel, which showed Axis unconditionally even
though the runtime's `arc-fill` transform never reads it. Fixed `props.pivot`'s
control-type bug (declared `text`; the runtime and hand-coded panel both treat it as an
object `{x, y}`) with a new dedicated `pivotEditor` control. Gave `renderRangeEditor` an
optional `commitOverride` parameter, mirroring `renderRowListEditor`'s existing pattern —
letting one function serve both `valueRange`/`outputRange` and the nested
`compose.valueRange`/`compose.outputRange` via `commitField`, which is what let
`renderComposeRange` (a byte-for-byte duplicate that existed only because the range
editor had no override mechanism) be **deleted**, not just left unused.
`arcBandsEditor` needed no new function at all — `props.arc.bands` just needed a
`rowSpec`, same as any other row-list field.

Compose (a whole optional sub-object, created with a rich default on enable and deleted
entirely on disable) stayed a small hand-coded toggle — `commitField`'s write-only
semantics can't express "create with defaults" or "delete this key" generically, and
forcing it through `showWhen` would mean inventing a grammar for one use site.

**A real bug found live, not by re-reading source**: `props.transform`'s registry
`default` was `undefined`. A native `<select>` shows its first `<option>` selected with
nothing explicitly marked, so the dropdown *looked* right even though the underlying
value was never actually `'rotate'` — and `evaluateShowWhen` reads the *raw* stored
value, not a field's registered default, so Pivot's `showWhen: {equals: 'rotate'}`
silently never matched until a user touched the Transform dropdown once. Every prior
`showWhen` in this codebase happened to use `notEquals`, or reference a default that
didn't coincidentally match its gate, so this never surfaced before. Fixed two ways:
`props.transform`'s default set to `'rotate'` (confirmed against `resolveTransformFn`'s
own fallthrough), and `evaluateShowWhen` gained an optional `siblingFields` parameter so
an `equals`/`notEquals`/`equalsAny` check against an unset field now falls back to that
field's own registered default. Also fixed while auditing the rest of the panel's
defaults the same way: `props.axis`/`props.compose.axis` both defaulted to `undefined`;
the runtime falls back to `'y'` for both.

With Step 3 closed, Part 1.2's named-editor CI check can now structurally start
(nothing in `DEFERRED_CONTROLS` blocks it) — a separate, not-yet-requested task.

Three repos, one canonical edit (`shared/widgets/PropertyRegistry.js` +
`scripts/check-registry-drift.mjs`, synced): outer repo `5788356`, `widget-studio`
`9f48dc3`, `flight-deck-pwa` `7dc27b5`. None pushed.

## Widget Studio UX Revamp, Step 3 Part A — 2026-09-04

Converted 7 of the 8 remaining blocked component types onto the registry-driven Inspector
engine: `core.selector`, `core.rocker`, `core.slider`, `core.image`, `core.ref`,
`core.indicator` fully, and `core.list` as a hybrid (registry fields for
`itemsBinding.stateVar`/`maxVisible`/`scrollable`, the hand-coded Item Template JSON
editor kept as-is and appended after — it needs `JSON.parse` validation no generic
control has, so it's marked with a new `control: 'bespoke'` registry marker, distinct
from `control: null`'s "deprecated" meaning). `core.gauge` deferred to its own immediate
follow-up (Part B) — the largest type (22 fields), the only one needing
`rangeEditor`/`arcBandsEditor`, and it has its own `props.pivot` control-type bug.

Three parallel research passes into the runtime source (not just the proposal's own
prose — a worked-plan section already labeled "corrected by independent verification")
found the real shape of this work was different from how it was scoped:

- **The composite controls collapse to far fewer real implementations than their
  registry names suggested.** `rowListEditor`/`arcBandsEditor`/`detentEditor` are all one
  existing method (`renderRowListEditor`); a `compose.*Range` duplicate function existed
  only because the range editor had no nested-commit-path mechanism, which
  `commitField` (built in the prior pass) already generically provides. Of the 6
  "picker" controls the proposal described as one sophisticated composite, only
  `simVarPicker`/`eventPicker` actually are (and neither blocks any of these 8 types) —
  `stateRefPicker`/`assetPicker` were already plain text/selects everywhere,
  `widgetLibraryPicker` never existed as a picker at all, and `stateVarPicker` is a
  plain `<select>` in every instance that matters here.
- **`stateStyleEditor` extraction blocks nothing in this step** — `style.states` is a
  `COMMON_FIELDS` entry the registry engine deliberately never renders (existing design,
  dedicated hand-built panel elsewhere); this was incorrectly filed as a Step 3
  prerequisite and is corrected in the proposal doc.
- **8 more registry data-quality bugs**, the same class as `core.pad`'s already-fixed
  `props.mode`: `core.selector.mode` (`discrete`/`continuous` in the registry vs. the
  runtime's actual `rotary`/`lever`, which the hand-coded panel it replaced already had
  right), `core.selector.axis`/`core.rocker.axis`/`core.slider.axis` (all
  `horizontal`/`vertical` vs. the runtime's literal `x`/`y` check — every old registry
  value silently fell through to `y`), `core.indicator.severity` **and** `.shape` (both
  mismatched runtime and the hand-coded panel), `core.image.fit` (`'tile'` isn't a valid
  CSS `object-fit` keyword; the real third option is `'fill'`), and `core.list`'s
  `itemsBinding` (declared at the wrong, non-nested path) and `textBinding` (dead on this
  type's own props — the real read is on a *child* component's props inside
  `itemTemplate`, removed rather than fixed).
- Fixing `core.indicator`'s severity enum **finally lights up `optionIcons`**
  (implemented since Wave 1, dark until now because this type was blocked) — Part 1.1's
  colour-swatch acceptance criterion. A new `.fd-ind-sev-advisory` CSS rule was also
  needed — that severity value had no colour mapping at all before this pass, so fixing
  only the registry would have made it selectable but invisible. Verified live: four
  colour-swatched options, Advisory renders visibly cyan.

Independently reviewed before implementation; the review caught one blocking issue (an
earlier draft of this plan would have dropped `optionIcons` entirely instead of
correcting it — reversed, since it's a real, working, one-consumer feature this pass
exists to finally light up) and two minor corrections (a stale `contextMapBuilder`
reference in the CI-check update note; `core.list.itemTemplate`'s marker made a
distinct `'bespoke'` value instead of overloading `control: null`).

Three repos, one canonical edit (`shared/widgets/PropertyRegistry.js` +
`scripts/check-registry-drift.mjs`, synced): outer repo `a994d75`, `widget-studio`
`131ce8f`, `flight-deck-pwa` `b8562dc`. None pushed.

## Widget Studio UX Revamp, Wave 1 gap-closing pass — 2026-09-04

Closed Steps 1, 2, and the row-completeness half of Step 4 from the previous entry's
worked plan: 8 component types converted onto Wave 1's registry-driven Inspector engine
(`core.tape`, `core.rotary`, `core.container`, `core.stepper`, `core.pad`, `core.divider`,
`core.display`, `core.input`). Re-verifying the worked plan against the runtime source
before implementing — not just trusting its own prose — found it still understated the
gap: **8 registry data-quality bugs**, independent of the rendering engine, that would
have shipped as regressions if the "free" conversions had gone in as-is.

**The one real functional bug, not just a display gap:** `core.pad`'s `props.mode` had
stale registry options (`['xy','x','y']`) that don't match what `PadComponent.js` actually
reads (`'relative'`/`'absolute'`) — every old value silently fell through to `'relative'`
at runtime, a "passes every validator, silently does nothing" bug. Fixed and verified live
(dropdown now reads "Relative (Pan)" / "Absolute (Cursor)", commits the correct enum).

**Wrong-or-missing `default:` values**, contradicting Wave 1's original "no gaps" claim for
that population pass: `core.pad.sensitivity`, `core.rotary.circular` (registry had it
backwards — `false`, when the runtime's real default is `true`),
`core.container.gap`/`.columns`, `core.divider.orientation`, six of `core.tape`'s eleven
fields, and (found live, during this pass's own verification) `core.display.decimals`.
All corrected against their runtime source, each with a comment citing the line checked.

`core.display.format` also needed its own literal `options:` list instead of the shared
`optionsRef:'VALUE_FORMATS'` — that list deliberately excludes `ODOMETER` (since
`core.input` reads the same list and it has no input-mask meaning), so converting as
originally planned would have silently dropped it from the dropdown.

**Engine fix:** `renderPlainField`/`renderCheckboxField`/`renderSelectField` showed
`getFieldValue(...) ?? ''` (blank when unset) while every hand-coded panel they replace
showed `props.x ?? <default>`. Added `?? field.default`, finally using the `default:` data
Wave 1 populated for this. Display-only — `commitField` still never backfills a default
into the stored widget def.

**Found, deliberately not fixed here:** `core.indicator`'s `props.severity` registry
options don't match `IndicatorComponent.js`'s real values either — left alone since that
type is still Step-3-blocked on `stateVarPicker` regardless; documented for whoever picks
up Step 3 next.

**Step 3** (8 types blocked on a registry row-spec schema, 3 new generic pickers, and
extracting `stateStyleEditor` from its 700-line closure) stays its own deferred wave, by
explicit choice, matching how Waves 0a/0b/1 were each scoped.

Three repos, one canonical edit (`shared/widgets/PropertyRegistry.js`, synced): outer repo
`f959584`, `widget-studio` `f500e08`, `flight-deck-pwa` `10b2d22`. None pushed.

## Widget Studio UX Revamp, Wave 1 — 2026-09-03

Part 1's root-cause fix — "nothing makes a newly-specced property arrive well-presented" —
landed for real, narrower than the proposal's own text but fully verified live rather than
claimed. `PropertyRegistry.js` has declared `getFieldsForType()` since Phase 0 and
`StudioInspector.js` imported it; nothing ever called it. Every props/style field was still
hand-written per component type across a 4,000+ line file.

**What shipped.** `default:` populated on all 137 field declarations (124 unique paths) —
the stated prerequisite for Part 2's tier-visibility guarantee, done in full, no gaps. A
real generic field-rendering engine (`FIELD_RENDERERS`, nested-path `getFieldValue`/
`commitField`, `evaluateShowWhen`) — scoped to the true single-value primitives: text,
number, checkbox, select (gained an emoji-swatch option for colour-coded choices, since a
native `<option>` can't hold a styled swatch element), color, iconPicker. `core.label` and
`core.button` converted onto it, fixing 3 live registry/UI drift bugs for free —
`props.truncate`, `props.icon`, `props.hasLed` were declared in the registry all along but
unreachable in the old hand-coded panels. `scripts/check-registry-drift.mjs` gained a
"registry → UI" check (every declared control must resolve to a real renderer), confirmed
to fail correctly when broken.

**What's still open, with concrete reasons found only once the actual registration was
attempted** — not visible from reading the code beforehand, including a dedicated research
pass before planning: `rowListEditor`/`arcBandsEditor`/`detentEditor` need a per-field row
spec the registry doesn't declare anywhere; `stateStyleEditor` turned out to be inline logic
inside a ~700-line render closure, not an extractable function; the composite condition/
bindings pickers already have working dedicated panels elsewhere that a naive merged-field
render would have duplicated rather than replaced. All allowlisted explicitly as
`DEFERRED_CONTROLS` in the new CI check, with the reason recorded, rather than silently
passed or falsely claimed as covered. Concrete silver lining: of the 16 unconverted
component types, **8 use only the implemented primitives** — 6 convert as-is
(`core.tape`, `core.rotary`, `core.container`, `core.stepper`, `core.pad`, `core.divider`)
and 2 (`core.display`, `core.input`) need a small registry/engine prerequisite first or
they silently regress. See the worked plan in
`docs/Widget-Studio-UX-Revamp-Proposal.md` ("Closing Wave 1's gaps").

*Corrected 2026-09-04:* this entry originally said "7 of the remaining 17", omitting
`core.tape` — the largest free conversion available. The proposal's companion note also
carried an inverted trap warning about `binding.testStateVar`; both are corrected in the
proposal doc, which now also records the real trap (hand-coded `showWhen` gates that the
registry does not declare).

Three repos, one canonical edit (`shared/widgets/PropertyRegistry.js`, synced): outer repo
`db248f3`, `widget-studio` `f4e6879`, `flight-deck-pwa` `9764245`. None pushed.

## Widget Studio UX Revamp, Wave 0a + 0b — 2026-09-03

A fully-critiqued proposal (three simulated testers — a novice, an intermediate, an expert
— two critique rounds) audited `widget-studio/` and found four bugs that destroy work or
ship broken widgets, independent of any redesign. All four, plus the widest-blast-radius
item flagged alongside them, are now fixed.

**Wave 0a.** Two new widgets sharing the still-default `com.flightdeck.customwidget` id
used to **silently destroy each other on save** — no naming step on "New," no uniqueness
check on "Save." Both are fixed together: New is now a real form (name, category, author,
auto-derived+editable package id, checked for uniqueness against the library), and Save
detects a collision with a *different* widget (via a session-local instance id, not the
widget's own id) and offers Overwrite / Save as New ID / Cancel instead of clobbering
silently. Separately, a conditional-formatting rule's "Advanced JSON" textarea — the
*only* route to border glow in a rule, the exact gap this whole audit was commissioned
over — was rebuilding the rule's style from only its four known controls on every edit,
silently discarding anything authored through the textarea the moment any other control in
the row was touched. It now preserves what it doesn't have a control for. And
`binding.writeEvent` — presented as a working connection — did nothing on most component
types without a matching interaction row; a first-time tester set it, watched it accept the
value, and reported a dead button as finished. Now flagged live. Autosave-restore, previously
silent, now shows a dismissible banner naming what was restored and when.

**Wave 0b.** Wider blast radius by design (per the proposal's own sequencing), so scoped
separately. Every color field in the Inspector is a swatch+text pair whose two halves
listened to different DOM events — commits silently depended on which channel a value
arrived through. All 17 hand-duplicated pairs now go through one shared, both-channels
helper. Separately, every prop edit rebuilt the whole Inspector panel from scratch,
dropping keyboard focus to `<body>` mid-edit; the panel now captures and restores focus
and cursor position across its own re-render. The interaction Trigger dropdown covered 5
of the 20 triggers the runtime actually fires — nine component types (stepper, rotary,
rocker, selector, list, pad, slider's detent, the guard overlay) couldn't have their
defining interaction authored at all; all 15 are now registered, filtered per component
type so a stepper no longer sees a rotary's triggers. `scripts/check-registry-drift.mjs`
gained a matching triggers↔registry check. And export is now blocked — not just warned —
when a component's write-capable binding provably cannot fire, with a "Wire this up"
one-click fix that proposes (never silently writes) the correct interaction per component
type; a stray `binding.writeEvent` on a `core.rocker` (which reads a completely different
field, `props.zones[].writeEvent`) still blocks but gets no auto-fix, since there's nothing
correct to propose.

**One correction to the proposal's own record, found during implementation, not before
it:** V13 (a variant rename orphaning `style.states`) was already fixed in
`StudioValidator.js` — the audit's evidence doc didn't check whether the validator already
caught it. Verified live; no code change was needed for that item.

Three repos, one canonical edit: `shared/widgets/PropertyRegistry.js`'s `TRIGGERS` array
gained the 15 new rows plus a `componentTypes` filter field, synced into both app repos
and committed separately in each (outer `faa8a3d`, `widget-studio` `d72c950`,
`flight-deck-pwa` `aee3833`; Wave 0a: `widget-studio` `d7e5027`, outer `f0107c0`). None
pushed. Waves 1+ (registry-driven Inspector rendering, three disclosure tiers, the Connect
dialog, Deck Events catalogue coverage) are proposed but not started — see
`docs/Widget-Studio-UX-Revamp-Proposal.md`.

## Version control completed — four repositories — 2026-09-03

The project now has full history for the first time. Two parts of it had none at all.

**`pc-bridge/`** held everything Release 1.0 built — the overlay profile model and its migration, aircraft matching, `deckEvents[]` seeding, the whole SimConnect server — on disk, protected by nothing but `.bak` copies written after a botched edit corrupted `profileManager.js` mid-session. **The repo root** was equally exposed, and worse in one respect: `shared/` is the *source of truth* for the component library, `SecurityValidator`, `SimBridge` and `deckEvents`, yet only its synced *copies* under the app repos were tracked — the originals could have been lost while the duplicates survived. Alongside it, 26 FDWS delta specs, the binding-system audit and plan, and a 400 KB changelog, all recoverable from nothing.

Both are now git repositories, giving **four siblings**: the root, `flight-deck-pwa`, `widget-studio` and `pc-bridge`.

⚠ The root repo **gitignores the three app directories** rather than tracking them. Adding them would make git record each as an *embedded repository* — a gitlink with no `.gitmodules` behind it, which clones as an empty directory and silently loses every file. Four independently-versioned siblings is the honest arrangement. `pc-bridge/.gitignore` also excludes `certs/`, since `bridge-key.pem` is a private key and `certManager.js` regenerates the pair on demand.

**`flight-deck-pwa` and `widget-studio` are pushed** to `fatso33/fddev` and `fatso33/wsdev`. **`pc-bridge` and the root repo are deliberately local** — not an oversight, and not to be "fixed" later without asking.

That leaves one asymmetry worth stating plainly: the source of truth lives in an unpushed repo while its synced copies are public. Editing `shared/` now means sync, commit in the root repo *and* each affected app repo, then push only the two with remotes.

## Binding System 1.2 — "Say what we mean" — 2026-09-03

Renumbered from 2.0: with row unification cancelled there is no migration and nothing breaking left in it, and cancelling "Studio inside PC Bridge" freed the number. There is no Release 2.0.

**The transponder mode dial has never worked, and the reason was worse than the bug report.** `xpndrModeSet` was mapped to `XPNDR_STATE_INC`, written up here as an increment wired to a set — a plausible-looking event doing something adjacent to what was meant. Checking the name against the SDK's own event enum found **no `KEY_*STATE*` entry of any kind** among its 2,081 names. It is not an event. The dispatch was a silent no-op, confirmed live: firing it leaves `TRANSPONDER STATE:1` untouched. Both the code comment and this project's own plan described it confidently as "cycles the enum one step forward" and "no-op-safe"; neither author checked whether the name existed, and dressing a guess up as a safe default is what kept it invisible.

Asobo sets the mode by writing the SimVar directly — `(>A:TRANSPONDER STATE:#TRANSPONDER_INDEX#, Enum)` — which is why no event exists. That exposed a **third instance of the K:-path fall-through bug**: `PREFIXED_VAR_RE` accepts `A:` as a write target but `dispatchSimEvent` had no `A:` branch, exactly as it had no `L:` branch before 1.1. Both now route through the in-sim module as calculator code. Verified live on a C172SP: writing 1/4/3/0 gave STBY/ALT/ON/OFF, read back correctly each time, aircraft restored afterwards.

**A mode dial bound to an `Enum` never highlighted anything.** `props.positions[].value` is whatever the author wrote — usually a string like `"OFF"` — while a SimVar bound with unit `Enum` arrives as a number, and `"1" === 1` is false. It read as a styling bug rather than a comparison one. Now coerced at the comparison and nowhere else: normalising the incoming value would change what gets written back out and what `positionChange` reports, so the authored value stays the contract and only the test is made tolerant. Both call sites changed together, since the highlight and the pointer must agree.

**The spec now points forward.** FDWS v1.2 §1.5 claims bare unprefixed names resolve as `A:` SimVars. v1.4 §1.2 already corrected that properly — quoting the sentence, issuing a normative correction, noting it was never true of the reference implementation. The gap was one-directional: v1.2 said nothing, so anyone landing there got a confident wrong answer. It now carries a dated editorial note and a status banner pointing at v1.4, **with the original claim left intact** — rewriting one delta spec would make the other 25 untrustworthy. The note also puts the **two axes of portability** side by side for the first time: prefixed identifiers travel across *hosts*, bare Deck Event names travel across *aircraft*, they pull in opposite directions, and an author is choosing between them whether or not they realise it.

**Addresses get a namespace dropdown** instead of expecting people to know `L:` must be typed by hand and that `H:` exists. It shares the row's middle column, so the layout is unchanged. The dropdown is a **view** over the stored string, never a replacement — and a bare stored value stays bare unless someone actively picks a different namespace, because rewriting every legacy row on first save would be a silent data migration performed by a window opened only to look at something. Every address shape in the shipped profile round-trips byte-identically. Testing it turned up a **third prefix-handling gap**: `PREFIXED_VAR_RE` is case-insensitive while the dispatch branches used case-sensitive `startsWith`, so a stored `l:foo` bypassed the profile and then fell through to the K: path — the same failure by yet another route.

**Row unification is cancelled, not deferred.** It was this release's headline item until investigation showed the premise is wrong: no Deck Event name carries both a read and a write. They are disjoint by construction — `com1StbyFreq` reads, `com1StbySet` writes — measured at 39 catalog reads against 50 writes with **zero** names in common, and zero collisions in the live profile. Merging the two objects would unify nothing while discarding the kind distinction that currently comes free from which object a name lives in, at the cost of a migration across every saved profile. Pairing by naming convention was checked as the replacement and is also unviable: stripping the usual verb suffixes finds a plausible partner for only 25 of 50 writes, by guesswork, and the rest are actions with no readable state. If adjacency is wanted, a finer optional `group` key on deck events buys it presentationally with nothing to maintain correctly.

**Also:** `bridge-ui.html` finally has an **Install** button. It has had Uninstall since it was written, so PC Bridge appeared able to remove widgets it could not add. That nearly shipped a boot crash — the handler first imported `shared/SecurityValidator.js` to validate the picked file, but that module imports `../widgets/PropertyRegistry.js`, a path written for its *synced* destinations; from `shared/` it resolves to a repo-root directory that does not exist, so the import throws `ERR_MODULE_NOT_FOUND` and takes the whole bridge down before any UI appears. Proven, backed out for structural checks needing no cross-package import, and the reason recorded at the call site.

## Binding System 1.1-B: find the variable by moving it — 2026-09-03

Payware aircraft expose their switches as local variables nobody has documented. A Fenix defines hundreds of its own, and handing someone a list of 400 meaningless names helps nobody. So instead: watch every local variable the loaded aircraft defines, let the user physically move the control in the cockpit, and report which ones changed.

**The in-sim module does the diffing, and owns no timer.** The shim (now v0.4.0) enumerates on `@watch`, and each `@sample` reports only what moved since the last one and re-baselines. PC Bridge drives the cadence by writing `@sample` every 100ms, so the shim is completely idle between commands. That choice matters twice over: there is no documented per-frame tick for a standalone MISC module, so inventing one would have been the riskiest part of the feature; and a shim left diffing every frame after PC Bridge disconnects would be a permanent frame-time cost the user could neither see nor stop without restarting the sim. A module that only acts when spoken to cannot have that bug. Names are fetched only for the handful of variables that survive ranking, never for the whole table.

It uses the modern `MSFS_Vars.h` API — `fsVarsGetLVarName` / `fsVarsLVarGet` / `fsVarsGetUnitId` — because MSFS 2024 marks the `gauges.h` named-variable calls deprecated. Enumeration walks ids from 0 until lookups stop resolving, which is the only method available: neither API offers an enumerate-all or a count, and nothing documents that ids are dense. **They are** — 659 on a C172SP, measured live.

**The ranking is the feature, and a live measurement shaped it.** With nobody touching anything, 8 local variables change on *every single sample* — 6DOF camera position, a camera API heartbeat, a render sequence counter — scoring 45 changes across 45 samples. A control flipped once changes exactly once. So "changed on 80%+ of samples" became a reliable auto-exclude rather than noise the user has to look past, and what survives sorts by fewest changes, then fewest distinct values. The count of what was filtered is shown rather than hidden: silently discarding is how you lose the one somebody wanted. Candidates already bound in the active profile are tagged, not removed.

Available in both binding tools. PC Bridge's config window drives it over IPC; Widget Studio drives the same search over the WebSocket, in the tester drawer — placed between Paste & Test and Fire & Watch, since it and Paste & Test both answer "which variable is this" while Fire & Watch verifies a write. Picking a candidate loads it into the paste box, so Test and every existing Paste button work on it with no new code. There is one session across the whole bridge: starting a second stops the first rather than letting two clients corrupt each other's baselines, and the client that took over is told so, instead of the other window appearing to break by itself. Sessions record their owning socket, expire after 120 seconds, and are torn down on disconnect or when the config window closes.

**Verified live at every layer before the next was built on it.** A standalone SimConnect probe (`tools/probe-shim-watch.mjs`) proved the shim's protocol against a real aircraft first; then `server.js`'s own code was driven headlessly against the sim — 659 variables enumerated, 59 samples in 6 seconds at the intended 100ms cadence, 8 moved and all 8 correctly filtered, so with no user input the candidate list is correctly **empty** rather than 8 red herrings. Offline, the shim's C++ was extracted verbatim and compiled against stubs for 30 assertions covering struct offsets, a deliberately sparse id space, truncation, and command parsing — including that `@sam` must not match `@sample`.

Two traps worth recording. `recvClientData.data` is node-simconnect's `RawBuffer`, which reads *sequentially* from an internal offset; treating it as a Node Buffer throws **inside the event listener**, where the emitter swallows it, so a bad parser and a dead shim look identical from outside. And `ALREADY_CREATED` from `createClientData` is good news — the shim's `module_init` got there first, and on the watch channel specifically it proves the new build is what the sim loaded.

Packaging needed a new tool. `fspackagetool.exe` run headlessly still prints "Attached to EXE - waiting for completion", exits 0, and writes nothing; MSFS Dev Mode's Project Editor works but needs the sim running with a human in it, and previously wrote to a different directory than the installer reads from, silently shipping a stale build. `wasm-shim/repackage.mjs` now assembles the package directly and takes its version from the definition XML, so a manifest cannot disagree with it.

**Still unproven:** an actual switch flip producing the right candidate — only a human at the controls can do that. Note that base-sim Asobo aircraft mostly drive their switches from `A:` variables, so a null result on a C172 is expected; this earns its keep on payware.

## Release 1.2 "Studio inside PC Bridge" — cancelled — 2026-09-03

**Widget Studio stays hosted on GitHub Pages.** This had already shrunk from plumbing to a UX consolidation once 0.3-A gave Studio a live PC Bridge connection, leaving only "one window instead of two". 1.1-B then put the third binding tool into Studio's own drawer over that same socket, so the two windows are no longer split by capability at all — nothing remains that Studio can only do from inside Electron. Staying on Pages is also better than neutral: Studio updates without reinstalling PC Bridge, opens from any machine on the network rather than only the one running the sim, and needs no packaging step or second Electron window.

One item outlives the cancellation, since it was never really about 1.2: `bridge-ui.html` has an Uninstall button and no Install. Widgets do reach PC Bridge — pushed over the WebSocket from Studio or the PWA, or dropped into the `widgets/` folder by hand — so it is an asymmetric-UI gap rather than a blocker, worth a file-drop install whenever that page is next touched.

## Binding System 1.1: the bindings list on the phone, and the paste path it leans on — 2026-09-03

**1.1-A (the SDK variable browser) was cancelled, deliberately.** A catalogue built from the MSFS SDK knows base-sim names — the ones you can already guess — and by definition cannot know the payware LVars that are the hard case. HubHop covers exactly the half the SDK cannot. More decisively, the live probe added in 0.1–0.3 already gives *ground truth*, and catalogue membership is strictly weaker evidence: a name can be in the SDK and absent from the loaded aircraft, or absent from the SDK and work perfectly. 115 KB, a build step and four integration points for an advisory hint that could never block was not worth it. Cancelling also retires two risks where the catalogue could have wrongly discouraged a *correct* binding. The investigation is recorded in the plan so it does not get reopened from scratch — including two corrections it turned up: the SDK *does* ship a K: event list (2,081 names in `MSFS_EventsEnum.h`, contrary to the plan's assumption), and the `ModelBehaviorDefs` scrape everything was to be built on yields 7.7% unit coverage and pairs events to SimVars at ~65% precision — confidently wrong a third of the time, in a tool built to eliminate silent wrong bindings.

**The effort went to the paste path that decision leans on.** Testing `parsePastedBinding()` against the shapes HubHop actually publishes found three defects. `(>K:COM1_RADIO_SWAP)` — a K: event with no value, which is how most toggles are published and arguably the single most common paste there is — returned `complex` and reported itself untestable, because the bare-event branch accepted only `H:`. `(L:S_XPDR_IDENT)` — an LVar read with no unit, which HubHop lists constantly — did the same, because the read branch required a comma. Both now parse.

The third was worse than unparsed: **`1 (>L:S_XPDR_IDENT)` was classified as a K: event.** That routed an L:Var *set* to `transmitClientEvent`, which cannot set a local variable, failing in the sim with nothing useful surfaced. It is now its own kind, `lvarset`. Fixing the parse exposed the matching server-side bug it had been hiding: `PREFIXED_VAR_RE` already accepted `L:` as a raw write target, so a widget bound to `L:S_XPDR_IDENT` passed the prefix check and then fell through to the K: path anyway. `dispatchSimEvent()` now routes `L:` to the WASM shim as calculator code — the same transport H:Events use, and the only way to set a local variable from outside the sim. Payware often exposes its switches *only* as L:Vars, so this was the common case for addon aircraft, not an edge case. `lvarset` and `hevent` are separate kinds sharing one transport, so every consumer handling one now handles both, and for both the Test path *is* the save path — the green tick means something. The two deliberate copies of the parser were verified to agree on 18 inputs by extracting the pc-bridge copy out of its HTML and executing it against the Studio one.

**1.1-C: the PWA gets a real per-component bindings list.** Release 0.1-D hid the generic binding fields for composite widgets because they wrote `config.binding.readSimVar`/`writeEvent`, keys `CompositeWidget` has never read — leaving the phone able to *see* a broken binding but not touch it. This is the editor that closes that. One row per binding *site* rather than per component (a `core.input` carries both a read and a write and they fail independently), each showing the component label, the logical name as an editable field, what it resolves to under the active profile, and ▶ to fire it or ↻ to read it. The phone is where you find out something is wrong — sitting on the runway, tapping a button that does nothing — and Studio lives on the PC behind the sim.

Local-state bindings (`stateVar`, `stateRef`) are excluded on purpose: they address the widget's own state, never the sim, and including them would bury com12combo's 12 real rows among 47 irrelevant ones. Edits stage on a deep copy, so Cancel genuinely discards and an unedited Apply passes the original object straight through rather than a clone.

**Two pre-existing bugs surfaced while building it.** `extractWidgetVariables()` had never scanned `interactions[].action.event` — and a button's own `binding` is usually empty, its write living in a `core.dispatchEvent` action. The extractor had therefore been blind to **every button in the library** since it was written, so a widget whose only sim write was a button tap registered no placeholder profile row on install. Catalogue names got away with it because their rows already existed; the custom ones (`THROTTLE1_SET`, `CUSTOM_EVENT`) did not. Both extractors now share one traversal, which is the only reason the gap surfaced at all. Separately, `RESOLVE_DECK_EVENT` only ever answered for reads, so the list could show what a telemetry binding pointed at but not what a button actually fired — the more common thing to be wrong about, and the harder one to diagnose from the cockpit.

A UI bug caught by measuring rather than eyeballing: the list first shipped with its own `max-height`/`overflow-y`, stacking a second touch scroller inside the already-scrolling inspector body — dragging a row scrolled the list, dragging beside it scrolled the modal, and the list's bottom sat *under* the actions bar, so the last row stayed clipped even at scroll maximum. Removed; Apply/Cancel live outside the scrolling body and stay reachable however long the list gets.

**1.1-B (wiggle-to-find) is parked** on the reasoning that cancelled 1.1-A: if HubHop answers "which variable is this", watching every LVar for one that twitches is largely redundant, and it is the most expensive item in the plan — the only C++, a shim rebuild, the only in-sim verification. Its design is finished and recorded: the transport worry was misplaced (the shim should diff in-sim and report deltas, not stream values out — 8 KB holds ~680 delta records against a wiggle's 1–5), and every API it needs is confirmed present in headers the shim already includes.

**Housekeeping:** `pc-bridge/` finally has its own git repo. It was the only part of the suite with no version history at all, and it holds the overlay model, the migration, aircraft matching and seeding. `certs/` is excluded — `bridge-key.pem` is a private key.

## Binding System 1.0-A + 1.0-B: widgets that arrive working — FDWS v1.27 — 2026-09-03

An aircraft-specific widget author already knows the binding — `L:S_XPDR_IDENT` *is* the content of a Fenix transponder widget. Until now there was nowhere to put that knowledge, so it travelled out-of-band in a forum post and was re-typed by every installer, with every chance of a silent typo. New optional top-level `deckEvents[]` gives it a home: PC Bridge copies a declared suggestion into its profile table on install, so the widget arrives **already mapped** instead of as a row of blanks. Full spec in `docs/FlightDeck-Widget-Standard-v1.27.md`.

Declaring is not binding — a component still binds via `binding.readSimVar`/`writeEvent`, and a widget can still reference a name it never declares (that auto-registers blank, exactly as before). The field adds a way to say *more*, never a new requirement, and an older host ignores it entirely.

**Seeding, and what is never overwritten.** A new row is created from its suggestion and is *not* flagged "needs configuration" — it is already mapped, and the orange dot would send someone to fix something that works. An untouched seeded row is re-seeded when the widget's `revision` increases, so a corrected address reaches users. **A row the user has edited is never re-seeded**; the proposed value is reported via a new `SEED_CONFLICTS` broadcast instead. Silently clobbering someone's hand-tuning and silently freezing them out of a fix are both wrong, so the host does neither and lets them choose. Uninstalling likewise spares hand-tuned rows — they may be in use elsewhere and outlive the widget that introduced them.

Verified across the whole lifecycle: install seeds 2 of 3 rows (the third declared no suggestion); re-install at the same revision is a no-op; revision 4 re-seeds an untouched row; revision 5 over a user-edited row changes nothing and reports one conflict; uninstall removes the plain row and spares the edited one.

**Namespacing (1.0-B).** Custom names should be namespaced with a dot — `fenix.xpndrIdent`. Not new grammar: `.` already survived the sanitizers, so these have always been legal. Namespacing is by **pack/aircraft, not by widget**, so several of your widgets share one row rather than making the user configure one physical switch twice. A custom name colliding with a catalog name is rejected at import — there is no principled resolution — mirroring the check Deck Event Packs already had. The config UI's Custom tab now groups by namespace, falling back to source widget for pre-v1.27 names.

**Validation** lands in both `SecurityValidator` (import gate) and `StudioValidator` (while authoring, so problems surface before a file leaves the machine). Rejected: raw addresses used as names, catalog collisions, duplicates, missing/invalid `kind`, unknown write `valueFormat`. Warned: un-namespaced names, and a read suggestion with no unit — which would default to `number` and be wrong for text variables.

**Studio authoring UI** ships with the field, per the standing rule that no FDWS addition goes out JSON-only: a new **DECK EVENTS (v1.27)** panel with a guided add dialog that relabels itself for read vs write and refuses the same names the validators do.

**A bug the browser pass caught that every validator missed.** The Studio panel routed its edits through `updateWidgetMeta()`, which spreads whatever it is given into `widgetDef.meta` and lifts only `id`/`revision` to the top level — so declared events were landing at `meta.deckEvents`, where nothing reads them. The toast fired, the dialog validated, the validators passed, and the field went nowhere; the panel then rendered zero rows because it reads the top-level field. Fixed with a dedicated `setDeckEvents()` on `StudioState` so the destination is unambiguous rather than inherited from a generic setter. Worth noting that no amount of unit-level checking would have found this — only driving the actual UI did.

### Three things worth knowing

**An import path that would have broken both apps.** I wrote `import { DECK_EVENT_NAMES } from '../deckEvents.js'` in `shared/SecurityValidator.js`. These files' imports are written for their *synced destinations*, not for `shared/` itself — sync puts `SecurityValidator.js` and `deckEvents.js` in the same directory in both apps, so it needed `./`. Caught before syncing; both copies now verified to load.

**Two different lists both called VALUE_FORMATS.** `PropertyRegistry.VALUE_FORMATS` is the *display formatter* set (`RAW_TEXT`, `DEGREE_3`, `SQUAWK_CODE`…) used to render a value in a widget. PC Bridge's write `valueFormat` is a different set that includes `MHZ_FLOAT`, absent from the other. They share six member names and differ at both ends, so reusing either for the other would silently accept nonsense. The new one is named `WRITE_VALUE_FORMATS` with the distinction documented at both sites — the registry's own header warns about exactly this class of drift.

**`extractWidgetVariables()`'s return shape changed** from `{ reads, writes }` to `{ reads, writes, suggestions }`. Additive — both long-standing callers destructure only the first two — but noted in the spec because a host implementing v1.27 needs the third key.

## Binding System 1.0-D fix: un-ticking the aircraft checkbox didn't stick — 2026-09-03

Reported live: un-tick "auto-switch to this profile for the loaded aircraft" on a profile, Save & Apply, reopen — still ticked.

`migrateProfileToOverlay()` omits the `match` key entirely when a profile has no rules, and `saveProfile()` then merged `{ ...stored, ...incoming }` — so the previous rules were resurrected on every save and clearing them was impossible by construction. The comment on that merge read *"preserve fields the editing UI doesn't round-trip (e.g. `match`)"*, which was true when written and became false about twenty minutes later when the match UI landed **in the same release**. The code changed; the assumption behind it didn't.

The UI now sends `match: null` rather than `undefined` (an explicit null survives IPC as a *present* key, which is what distinguishes "clear these" from "not editing these"), and `saveProfile()` treats a present key as authoritative while still preserving an absent one. Verified: set, clear, and preserve-when-absent all behave.

Worth noting why the harness testing missed it — it exercised the checkbox's effect on the input field and never the round-trip through save. The UI was right; the persistence wasn't.

## Binding System 1.0-D revision: tick a box instead of typing a title — 2026-09-03

Replaces 1.0-D's free-text-only aircraft matching with a checkbox that captures the loaded aircraft's `TITLE`, plus a collision check. The matching engine is unchanged — this is entirely about how rules get written.

**Why the field alone was wrong.** Nobody would type `C172SP G1000 Passengers` correctly, and a mistyped rule fails silently — the worst failure mode this whole workstream exists to remove. The checkbox captures the exact string the sim reports, so it cannot be wrong.

**Why the field stays.** A worry that liveries would multiply titles turned out to be unfounded: checked against the installed PMDG 737 livery pack, **43 liveries define no title at all** — MSFS 2024's `livery.cfg` uses `ui_variation` instead, so liveries share their base aircraft's title. But *variants* still multiply it. The PMDG 737-800 ships **12 titles**, one per winglet/cabin/freighter combination, all flying the same cockpit:

```
737-800 PAX BW HD    737-800BCF BW     737-800 BB2 BW
737-800 PAX BW SC    737-800BCF SSW    737-800 BBJ2 SSW
737-800 PAX BW TC    737-800BDSF BW
737-800 PAX SSW HD   737-800BDSF SSW
737-800 PAX SSW SC
737-800 PAX SSW TC
```

Exact-only matching would mean loading and ticking twelve times for one aeroplane, where `737-800*` does it in one. So the checkbox **populates** the rule list rather than replacing it: one mechanism, zero-friction default, and the result is visible and editable for anyone who wants to broaden it. When a rule matches exactly, the hint points out that shortening it with `*` would cover the other variants.

The checkbox reflects whether the loaded aircraft is *covered* — including by a wildcard — rather than merely whether it was clicked, so it reads as "this profile handles the aircraft I'm in". Unticking removes only the rules that actually cover the current aircraft, leaving unrelated ones alone. With no aircraft detected it disables itself and says why, rather than silently doing nothing.

**Collisions, treated as two different problems.** Two profiles claiming the *same exact title* is ambiguous with no principled winner, so the save is refused and names the other profile. A wildcard that merely *overlaps* is not ambiguous — the longest-literal-prefix tiebreak resolves it and an exact rule always beats a wildcard covering it — so that is confirmed rather than blocked, naming which profile would win. Blocking it would prevent a perfectly reasonable "general 737 profile, one variant special-cased" setup.

Verified: exact duplicate is caught and named; wildcard overlap reports the right winner; unrelated rules are clean; `C172SP G1000 Passengers` resolves to the exact-rule profile while `C172SP Classic` falls to the wildcard one. In the UI, the tick/untick cycle captures and removes correctly, selective untick leaves `737-800*` and `A320*` in place while removing only the covering rule, the no-aircraft state disables with an explanation, and a colliding save is blocked with an error banner.

## Binding System 1.0-D: aircraft-matched profiles — 2026-09-02

Ships with 1.0-C, never after it: making forks safe and cheap means more of them, and without auto-switching that is *more* ways to fly the Baron on the PMDG mapping than existed before, since a wrong-but-valid event dispatches perfectly happily.

**Aircraft identity is read on its own data definition.** `TITLE` and `ATC MODEL` are string SimVars, so they cannot ride `addVarToTierChunk()`'s `FLOAT64` path at all — they need `STRING256` and a definition of their own, using the same isolation reasoning the 0.2-A probe documents. Requested at `SECOND`.

**Change detection is the load-bearing part, and deliberately does not use `DATA_REQUEST_FLAG_CHANGED`.** MSFS re-reports `TITLE` at moments that are not aircraft changes — menu round-trips, flight resets, livery swaps, reconnects — so acting on every report would stomp a profile the user had just chosen by hand. Comparing against a last-acted-on title is what makes a manual selection stick for as long as you stay in one aircraft, and it is precisely why no per-session "pin" is needed. Verified live: over ~21 reports of an unchanged aircraft, exactly **one** change was acted on.

The first report of a session is treated as a baseline rather than a change, so connecting to the sim never overrides the profile you deliberately left selected.

**One persisted setting, not a pin** — "Automatically switch profiles when I change aircraft", on by default, saved immediately rather than with the profile (it is an app preference, not part of the profile being edited, so tying it to Save would make it vanish on cancel).

**Match on `TITLE`.** Rules are comma-separated globs where only `*` is special. The glob is a direct matcher rather than a generated regex — these are hand-typed by users, so a stray `(` or `+` should be a literal, and there is no backtracking to worry about. Ties break on the longest literal prefix, so `PMDG 737-800*` beats `PMDG*` regardless of profile order.

`ATC MODEL` is supported but is not what to reach for: measured live, it returns `"ATCCOM.AC_MODEL C172.0.text"` — a localization key — while `TITLE` returns `"C172SP G1000 Passengers"`. Nothing pre-fills from it.

An auto-switch rebuilds the live SimConnect chunks and broadcasts, so the profile name the PWA renders (0.2-B(d)) cannot go stale.

Verified against the running sim: the subscription reads the real aircraft on connect, repeated identical reports do not re-trigger, and the match resolves as expected across several titles. The switch action itself still wants a real in-sim aircraft change to exercise end to end.

### Note on method

Mid-implementation I corrupted `pc-bridge/profileManager.js` with a bad string-slice in a one-liner, duplicating the file's contents. It was fully recoverable (the original was intact after the seam) and nothing was lost, but pc-bridge is not git-tracked and I had no backup — which this plan's own ground rules explicitly call for before large edits to that file. `.bak` copies now exist for `profileManager.js`, `server.js`, `main.js` and `config-ui.html`. Repeated backslash-mangling through the shell is what led there; the fix was to write a matcher that needs no escaping at all, which is also the better implementation.

## Binding System 1.0-C: profiles are overlays, not clones — 2026-09-02

Closes the fork trap. A custom SimVar Binding Profile used to be a **full clone** of the base taken at fork time, and `load()`'s refresh-from-code ran only for `default_ga` — so copying a profile to change one row silently opted you out of every future fix to every other row. Profiles now store only their **differences**.

**Storage.** A custom profile is `{parentProfileId, overrides:{mappings, simVars}}`. `getActiveProfile()` keeps its old signature and returns the *resolved* view (base + overrides), so no existing consumer changed — that is what kept this tractable. A new `getActiveProfileRaw()` serves writers, and `resolveProfile()`/`setProfileRow()`/`resetProfileRow()`/`getOverriddenKeys()` round it out.

**Migration** runs once at load, is idempotent, and reports what it kept rather than acting silently. Against the real `profiles.json`: `c172` kept 0 rows (it was a pure clone with no customizations at all), `c1722` kept 13. The file shrank from 36.6 KB to 14.9 KB. Backup written to `profiles.pre-overlay.json` — pc-bridge is not git-tracked, so there is no other undo.

The fix is demonstrable rather than theoretical: `c172` now resolves to include `xpndrIdentState`, a row added to the base by 0.2-E *after* c172 was forked, which it could never have received before.

**Two writers had to change, and one would have failed silently.** `registerDiscoveredVars()` mutated `getActiveProfile()`'s return — now a resolved *copy*, so every discovery would have been written to a temporary object and lost. It now writes to the base layer, which is both the correctness fix and the decision 1.0-A's seeding is built on: a widget's rows belong to every profile, not just whichever happened to be selected at install time. `unregisterDiscoveredVars()` swept only flat tables and would have stranded rows in every overlay profile; it now sweeps `overrides` too.

**Conversion happens at one boundary in each direction**, so the config UI keeps editing a flat table exactly as before: `get-profiles-data` sends resolved profiles (plus a new `overriddenKeys` map), and `saveProfile()` re-diffs an incoming flat profile back into overrides. A pleasant consequence is that `createNewProfile()` needed no change at all — it still clones the visible table, and the diff reduces that to `overrides:{}` on save, so forking is now free by construction.

**Per-row Reset.** Shown only on rows the current profile actually pins, so provenance is visible at a glance — an inherited row simply has no button. Deliberately a local edit plus `markDirty()` rather than an immediate write, matching every other field in the UI: `saveProfile()`'s re-diff means a row put back to its base value drops out of `overrides` on its own. Overridden-ness is computed live against the edit cache rather than read from stored state, so the button appears and disappears as you type.

**`+ Add Variable`.** The Custom tab was previously populated *only* by auto-discovery, so a variable could not be mapped before building the widget that references it — backwards from how anyone works. Validates against the same bare-identifier grammar the rest of the suite uses: rejects `A:`/`L:`/`H:`/`K:` addresses (those bypass profiles entirely and need no row), rejects characters the downstream sanitizers would strip, and rejects duplicates.

Verified in a browser against the real migrated data: Reset appears on exactly the 5 customized telemetry rows in `c1722` and none of the 39 inherited ones, reverts correctly and then hides itself; zero Reset buttons on Default or on the override-free `c172`; and all six Add Variable cases (read-only profile, raw address, bad characters, duplicate, valid read, valid write) produce their correct distinct message. Dotted names like `fenix.xpndrIdent` are accepted as-is, confirming 1.0-B's namespace convention needs no code changes.

## Live verification against MSFS 2024 — 2026-09-02

Ran the 0.3/0.4 work against a real PC Bridge with the sim connected (default C172 G1000, transponder in ALT, on ground). Three things confirmed and two measured.

**The string-SimVar probe works end to end.** `A:TITLE` with unit `string` — and with `STRING256`, the form originally tried — both return `"C172SP G1000 Passengers"`. Unprefixed `TITLE` returns the same, confirming 0.1-B's normalization. `A:TITLE` with unit `number` still returns garbage (`4.2e+34`), which is correct: that is now only reachable by explicitly asking for a number.

**Fire-and-watch's premise is verified.** A control event (`K:TOGGLE_BEACON_LIGHTS`) moves `LIGHT BEACON` 1 → 0 and back; `K:XPNDR_IDENT_ON` moves `TRANSPONDER IDENT:1`; and the `xpndrIdent` Deck Event added in 0.2-E does too. So 0.2-E's ident lamp is correctly wired: the write and the read genuinely connect.

**The ident pulse is ~8 seconds, so 0.2-E needs no hold mechanism.** Measured: `TRANSPONDER IDENT:1` goes to `1` within ~23 ms of firing and drops back to `0` after ~7.9 s on its own. The feared one-frame blink does not exist, so the deferred `binding.minHoldMs` field / shared-component timer is not needed at all. That closes the open question 0.2-E(d) was parked on.

**`ATC MODEL` is a localization key, which changes 1.0-D.** It reads `"ATCCOM.AC_MODEL C172.0.text"`, not a model name, while `TITLE` reads `"C172SP G1000 Passengers"`. Aircraft-matched profiles should therefore treat `title` as the documented primary and pre-fill only from it; `atcModel` stays available but is not something an author can sensibly write glob rules against.

**A note on method, since it nearly produced a false report.** An initial pass concluded that no ident event worked — every candidate no-opped. That was the test harness, not the sim: `dispatchSimEvent()` resolves a *bare* name through the active profile's mappings, so raw SimConnect names like `TOGGLE_BEACON_LIGHTS` are rejected before reaching SimConnect; they need the `K:` escape-hatch prefix or a real Deck Event name. A control test on a known-good event is what caught it. Worth remembering the next time something "obviously doesn't work" — the same shape of mistake as the camera-widget dead end, but in the opposite direction.

## Binding System 0.4: one tester, many rows — 2026-09-02

Release 0.4 of `docs/Binding-System-Implementation-Plan.md`. Pure UI restructuring of features that already worked; no storage migration, no FDWS bump, no new SimConnect surface. Shipped before 1.0 deliberately, so the row layout is settled before 1.0-C adds per-row Reset and `+ Add Variable` to those same rows.

**PC Bridge: one tester instead of ninety-three.** 0.2-A's paste box was built per row — `buildMappingEntry()` wrapped an input, Parse, Test and a result span around every mapping, which on the Default profile meant **93 paste boxes on one page** for a tool whose result is entirely row-independent. It also forced an ordering that didn't match the work: you had to pick a target row before you were allowed to find out whether an address even reads.

There is now a single sticky tester above the category tabs, and each row carries one small **Paste** button fed from a shared structured buffer (a parsed result is a *pair* — name+unit or event+value — so it can't ride the system clipboard). Paste has four states, each with its own reason surfaced in the button's tooltip: nothing parsed yet, wrong shape for this row, row locked by the read-only Default profile, or ready. The shape check improves in the move — instead of accepting a click and then explaining the mismatch, incompatible rows grey out the moment something is parsed.

This also **deletes** rather than guards against the bug fixed earlier the same day: with one tester there is no row whose stale fields can be read by mistake, so the locked-row fallback in `handlePasteTest()` is gone entirely and the tester always probes exactly what was parsed.

**Widget Studio: tester and fire-and-watch move to the bottom bar.** Both left the component Property Inspector for a new **SimVar Tester** drawer beside Sim Bench (same drawer shell; opening one closes the other). Neither tool was ever about the selected component, and both took permanent space in an already dense sidebar.

⚠ **Fire-and-watch became standalone, which is a behaviour change rather than a relocation.** It previously fired *the selected component's* `binding.writeEvent`; with no selection to read it now takes an event, a value, and a SimVar to observe. Both guardrails carried over verbatim: it fires through `SimBridge.sendEvent()` — the real dispatch path, not the calculator-code path the read test uses, which is the whole point of it — and it reports **"nothing moved — check aircraft state"** rather than claiming failure, since a correct event legitimately no-ops with the transponder off or on the ground.

Parsing a read now also pre-fills fire-and-watch's observe field, and parsing a write pre-fills its event and value — the two are almost always used together.

**What stayed in the sidebar:** the resolved-unit line (`Unit: Bco16 — from profile "Default"`). It is a property annotation about the selected binding, not a tester, and it is the only place in Studio that shows what a Deck Event resolves to. Getting values *into* the sidebar is via **Paste** buttons on the Read and Write custom fields, reading the same buffer through `StudioState.testerParsed` so the tester and the inspector don't need to know about each other.

**Parser extracted** to `widget-studio/js/StudioBindingParse.js`, now shared by Studio's two consumers instead of drifting. It remains a deliberate second copy of `config-ui.html`'s — that file is a plain non-module `<script>` — and the two are behaviourally identical as of 0.4, noted at both sites.

Verified in a browser rather than by inspection: PC Bridge's four Paste states each produce their correct distinct reason (via a harness stubbing Electron IPC), paste applies both fields (`TRANSPONDER CODE:1`/`Bco16` → `A:TITLE`/`string`), and the tester sends exactly the parsed values to the probe. In Studio: the drawer opens, both shapes parse and pre-fill, the wrong-shape guard fires, and read/write pastes apply correctly with the value-location notice.

## Binding System 0.3 follow-up: Studio server setting, and two SimBridge URL bugs — 2026-09-02

Three cleanups closing out the 0.1–0.3 batch below.

**Test now tests what you pasted, and Parse admits when it filled nothing.** Two bugs in `config-ui.html`, found chasing why `(A:TITLE, string)` still returned 0 after the string-probe fix below. `handlePasteParse()` only writes into a row's name/unit fields when they're editable — correct — but then reported "Parsed as a read binding — filled in below" regardless, so on a catalog row under the read-only Default profile the message was simply untrue. And `handlePasteTest()` read the unit and name straight out of those DOM fields with no such guard, so on a locked row it tested the row's *existing* mapping rather than the pasted one. Together: paste a string SimVar onto a locked row, and the `string` sentinel never reached the probe at all — producing exactly the baffling `Live value: 0` the fix below was supposed to have cured. Test now falls back to the parsed values wherever a field is locked, and prefers the field only where Parse could actually write to it.

Also quietened a spurious `SIMCONNECT_EXCEPTION_UNRECOGNIZED_ID` in the log: the probe called `clearDataDefinition()` unconditionally, and clearing a definition SimConnect has never seen raises it. Harmless, but it reads exactly like a real binding failure and cost a debugging session. Now guarded by a `probeReadDefinitionExists` flag, reset on reconnect since a fresh handle carries no definitions. The probe also logs which datatype it used, so a text-vs-number mismatch is visible rather than inferred from a silent zero.

**The paste-box probe can read string SimVars.** `(A:TITLE, STRING256)` came back as `Live value: 0`, for two compounding reasons. `STRING256` is a *datatype*, not a unit — SimConnect's `addToDataDefinition(defId, datumName, unitsName, datumType)` wants an empty unit and `SIMCONNECT_DATATYPE.STRING256`, which is exactly what the MSFS SDK's own SimvarWatcher sample does. And the probe hardcoded `FLOAT64` on both the definition and the read, so a string could never have come back regardless of what was typed: `readFloat64()` over text yields 0, silently.

`probeReadSimVar()` now accepts `string` / `string256` / `stringv` / `str` / `text` in the Unit box as the way to request a text read — the thing anyone reaching for a string SimVar tries first — and translates it into the correct parameter, reading the result with `readString256()`. Unit tooltips in both `config-ui.html` and Studio's inspector now say so, naming `TITLE`, `ATC MODEL` and `ATC ID`. This is also a prerequisite for 1.0-D, which needs `TITLE`/`ATC MODEL` for aircraft-matched profiles; without it there was no way to check what those variables actually report before building against them.

**Studio's paste box now accepts write syntax, and reports the value instead of dropping it.** It previously handled read shapes only, on the stated grounds that "Studio's Live Test is read-only" — which stopped being true when 0.3-C added the fire-and-watch write test to the same file. The real constraint is structural: `1 (>K:XPNDR_IDENT_ON)` parses to an event *and* a value, and while `config-ui.html` has a box for each (`event` + `valueFormat`), a widget binding has nowhere to put the value — there is no `binding.value` in FDWS. For a raw address it belongs on `interactions[].actions[].value`; for a bare Deck Event it belongs to PC Bridge's profile row. Either way, never on `binding`. So pasting a write now fills the Write Deck Event and surfaces the parsed value as a toast naming where it has to go, rather than silently discarding half of what was pasted. Conditionals and multi-step RPN are reported as unstorable rather than mis-parsed. The toast is used deliberately: `updateBinding()` re-renders the panel synchronously and detaches the inline result element.

**Studio can now set its PC Bridge server address.** The bridge status pill in Studio's top bar is now a button (keyboard-reachable) opening a "PC Bridge Server" dialog; its tooltip also names the URL currently being attempted. 0.3-A shipped Studio a working `SimBridge` but no way to point it anywhere, which made it unreachable in the common case — Studio is normally opened over `file://` or a local `http://` dev server, and `getResolvedUrl()` derives its scheme from `window.location.protocol`, so it auto-resolved to `ws://`. Persistence, normalization and socket reconnection were already handled by `setServerUrl()`; this is purely the missing UI.

**Corrected a wrong comment in `StudioApp.js`.** It claimed a locally-served Studio reaches PC Bridge over plain `ws://` with "no certificate involved." PC Bridge creates exactly one server — `https.createServer()` in `server.js` — with no plain-HTTP fallback, so it only ever speaks `wss://`. The comment was written from an assumption that was never checked against a running bridge, and it directly contradicted the correction already recorded in the implementation plan.

**Two real bugs in `shared/SimBridge.js`, both affecting the PWA too:**

- **A bare host normalized to `ws://`.** `setServerUrl('192.168.1.50:8080')` derived its scheme from the page protocol, so typing a bare address into the new dialog produced an unreachable `ws://` URL — the dialog built to escape that trap fell straight back into it. A bare host now defaults to `wss://`, since no reachable `ws://` bridge exists by construction. An explicitly typed `ws://` is still honored for a hand-modified TLS-less bridge. The PWA had the same latent bug whenever it wasn't served from PC Bridge's own `https://` address.
- **`this.customUrl` went stale after a set.** It was read once in the constructor and never updated, so any consumer reading it back saw the old value. The PWA's `SettingsView` happens to sidestep this by re-reading `localStorage` directly; Studio's new dialog read the property and opened blank instead of pre-filled. `setServerUrl()` now keeps it in step on both the set and clear paths.

Verified live in a browser against a running Studio: bare host → `wss://`, reopening pre-fills the saved value, clearing reverts to auto-detect.

## Binding System 0.1–0.3: stop the lying, paste and report, Studio goes live — 2026-09-02

Implements Releases 0.1, 0.2 and 0.3 of `docs/Binding-System-Implementation-Plan.md`, itself the output of the binding-system audit in `docs/Binding-System-Audit-and-Proposal.md`. Live-tested against a real PC Bridge + MSFS 2024 session rather than SimBench's mock. No FDWS version bump was needed anywhere in this range. PWA `e3d3d21`, Widget Studio `e65922e`.

**0.1 — "Stop the lying."** Three controls that accepted input and silently discarded it, plus the read path that never worked:
- `binding.unit` was authored in Studio, sanitized, and transmitted, then dropped by the `SUBSCRIBE_SIMVAR` handler's destructure. Now honored on the raw-address path, with a `rawVarUnits` memo so a SimConnect reconnect (which re-resolves with no client in scope) doesn't silently revert every raw binding to unit `number`.
- `A:` was never stripped before `addToDataDefinition`, which wants the bare name — the same bug the write path had already fixed for `K:`. Normalization now happens once, immediately before the SimConnect call, so it covers the widget escape hatch *and* PC Bridge's own profile table, which had the identical defect and no fix planned for it. `L:` keeps its prefix (SimConnect accepts it). `K:`/`H:` read bindings are now rejected outright instead of being handed over as if readable.
- Studio's "SimConnect Unit" box is disabled and labelled when the binding is a bare Deck Event, whose unit PC Bridge owns.
- The PWA's Property Inspector binding fields are hidden for FDWS composites, whose bindings live in `config.definition.components[]` and were never read from `config.binding`. `ButtonConfigPopover` is unaffected — it already writes to the definition and genuinely works.

**0.2 — "Paste and report."** A paste-and-test box in PC Bridge's binding config table, which needed no new plumbing since PC Bridge already holds the SimConnect connection. It parses the shapes people actually paste from forums, splits them into the name/unit or event/format fields, and tests them: reads through an isolated scratch data definition (never a real widget's chunk, which under `DATA_REQUEST_FLAG_CHANGED` one bad field can poison), writes through the WASM shim's `execute_calculator_code`. Verbatim RPN is a *test* capability only — what gets stored is the structured result, so `.fdwidget` gains no new expressive power and one write path keeps its encoding.

Failure reporting, all of which previously reached only the PC: a new `SIM_EVENT_DISPATCH_FAILED` broadcast for the write path (which had no report of any kind), `SIMVAR_BINDING_ERROR` now consumed by the PWA, `GET_PENDING_MAPPINGS` called on connect so unmapped bindings surface before takeoff, and the active Binding Profile name — already on the wire and discarded — shown on the phone.

Also: discovered/custom rows in the config table are editable while the read-only Default profile is active (catalog rows stay locked), which previously blocked the addon-aircraft workflow at its first step; a new `sanitizeWithReport()` shows what sanitization would strip, live in Studio's binding box, without changing the return type of a function with ~15 call sites; `StudioValidator`'s binding check no longer fires on every valid raw SimVar (its pattern had no space) and now checks write events, which had no check at all.

New `xpndrIdentState` Deck Event → `TRANSPONDER IDENT:1` / `Bool`, wired to the Garmin transponder widget's ident lamp, which until now was bound to a local boolean and lit because you tapped it rather than because the aircraft was identing. Unit confirmed against the SDK's own `Transponder.xml`, which reads it as `Bool`; the `Percent` form common on forums only works because RPN coerces.

**0.3 — "Studio goes live."** `SimBridge.js` moved into `shared/` and synced, giving Widget Studio its first connection to PC Bridge — the root cause behind the mock-only test bench, the absence of live validation, and the export/import round trip. Paste-and-test and live unit resolution in the binding editor, plus a fire-and-watch write test that fires through the real dispatch path and reads an observed SimVar before and after, reporting "nothing moved — check aircraft state" rather than claiming failure, since a correct event legitimately does nothing in the wrong aircraft state.

**Two SimConnect bugs found only by running it:**
- `node-simconnect`'s `addToClientDataDefinition()` defaults an omitted `datumId` to `0`, so two fields on one Client Data Area definition collide as `SIMCONNECT_EXCEPTION_DUPLICATE_ID`. Hit while building the shim's return channel; fixed by passing datum IDs explicitly.
- `CLIENT_DATA_REQUEST_FLAG_CHANGED` silently drops a byte-identical repeat write — **including in the pre-existing H:Event dispatch path**, not just the new return channel. Any H:Event-bound cockpit control pressed twice without an intervening state change had silently no-opped on the second press since the 2026-08-23 shim build, with no error anywhere. Nobody had noticed until the paste box made testing the same string twice a natural thing to do. Fixed in both directions; see `docs/PC-Bridge-HEvent-Shim.md`.

**Deliberately deferred:** 0.3-C's fire-and-watch uses manual SimVar picking for base-sim aircraft as well as payware, rather than auto-picking by scraping `ModelBehaviorDefs`. That scraper is real shared work the 1.1 variable-browser catalog needs anyway, and building a one-off now would have meant redoing it; manual picking was already the plan's payware path, so only the base-sim convenience is postponed.

## FDWS v1.26 follow-up #2: a remounted widget still didn't get its value — 2026-09-01

Live-tested the `seedChunkSnapshot()` fix above (PC Bridge restarted): a fresh PWA connection now populates COM/NAV radio values immediately, confirming that half of the fix works. But switching to a different page and back still left the radios widget blank until an actual sim-side change happened. Root cause: `seedChunkSnapshot()` only runs from inside `subscribeDynamicSimVar()`'s "brand new var" branch — it early-returns a no-op for a var already tracked at its current tier, which is almost always true for a widget mounting mid-session (PC Bridge is long-lived; some earlier widget instance already subscribed the same SimVar). A full PWA reload works because that's a brand-new WebSocket connection, and `wss.on('connection', ...)` already dumps the full `simStateCache` on connect — but switching pages doesn't drop the WebSocket at all (one persistent connection for the whole app session), it just tears down and recreates the widget instance, which re-sends `SUBSCRIBE_SIMVAR` for a var the server already silently considers handled.

Fixed by having the `SUBSCRIBE_SIMVAR` and `SYNC_SCHEMA_MANIFEST` handlers check `simStateCache` directly and hand the requesting client its current value immediately, regardless of what `subscribeDynamicSimVar()`'s own tracking decides — doesn't depend on re-arming anything SimConnect-side, so it covers the remount case the first fix structurally couldn't reach. See `docs/FlightDeck-Widget-Standard-v1.26.md`'s new §6.

## FDWS v1.26 compatibility audit — 2026-09-01

Re-ran the same compatibility sweep FDWS v1.25 got: `sync-shared.mjs`, `check-registry-drift.mjs` (clean), and a repo-wide grep for a stray hardcoded FDWS version whitelist outside the three synced `PropertyRegistry.js` copies (none found — `FDWS_VERSIONS` was already at `'1.26'` in all three from the original polling work). Found one real gap: `StudioValidator.js` had warning coverage for `binding.pollFrequencyHz`/`state[].pollFrequencyHz` (non-numeric/non-positive, or declared with no `syncFrom`) but nothing for their new v1.26 sibling `pollGroup` — added matching checks (non-string/empty value; declared with no `syncFrom` for the state-var case) in both places.

## FDWS v1.26 follow-up: blank widget values until something changed them — 2026-09-01

Found live testing the NAV1/2 radios widget against a running MSFS 2024 session: a freshly-added widget's display stayed at its blank/default value — not slow, genuinely never populated — until either a preset/manual dispatch or a direct sim-side change actually wrote a new value. Root cause was the `DATA_REQUEST_FLAG_CHANGED` polling change shipped earlier this session (above): SimConnect silently captures the current value as a baseline the moment a request is (re-)armed and only transmits on a later genuine change from that baseline — it doesn't send an initial snapshot just because the request is new. This affected not just newly-subscribed widgets but potentially every dynamic SimVar after any PC Bridge/MSFS reconnect, since the reconnect path re-arms every var the same way.

Fixed by pairing every periodic `CHANGED`-flagged arm with a one-shot `SimConnectPeriod.ONCE` request (new `seedChunkSnapshot()` in `pc-bridge/server.js`) under a distinct request ID aliased to the same data definition — delivers one immediate, unconditional snapshot, then the ongoing periodic request takes over. See `docs/FlightDeck-Widget-Standard-v1.26.md`'s new §5 for the full writeup.

## Virtual Yoke: expo response curve + freehand/mounted mount type — 2026-09-01

Follow-up to the SimVar polling investigation, prompted by a question about whether the Virtual Yoke page's write path had any inherent lag (it doesn't — it's an unthrottled, immediate K:Event dispatch, unrelated to the polling changes above) and a request to research the best response curve for a bare-hand phone-tilt yoke replacement, since the previous curve (linear until 75% deflection, eased only for the final approach to the limit) wasn't chosen with center precision in mind.

Researched real-yoke feel (force feedback comes almost entirely from spring centering/breakout force, not a nonlinear mechanical linkage) and standard practice for imprecise, force-feedback-less input devices (RC transmitters, gamepad thumbsticks, MSFS's/X-Plane's own axis sensitivity sliders): a classic expo curve, `y = k·x³ + (1-k)·x`, softens gain near center to damp hand tremor while still reaching full deflection at full tilt. Plotted this against the original curve and a generalized-logistic alternative before implementing, to compare gain behavior at both ends rather than guess.

**`VirtualYokeEngine._applyResponseCurve()` replaced** — the knee-based cubic Hermite ease is gone, replaced by the classic expo formula. **New `mountMode`** (`'freehand'`/`'mounted'`, default freehand, persisted like the existing sensitivity settings), anticipating a user 3D-printing a self-centering yoke mount for the phone: a mechanical rig already provides the spring-centering a bare hand lacks, so it needs a much lighter expo coefficient (`EXPO_K_MOUNTED = 0.15`) than freehand holding (`EXPO_K_FREEHAND = 0.5`) — exposed as named presets over a single tunable coefficient rather than two hardcoded curves, since an actual DIY rig's spring rate can't be known in advance. New "Mount type" toggle added to the Settings page's Virtual Yoke card. See `docs/Virtual-Yoke-Page.md`'s Response curve/Mount type sections for the full reasoning.

## FDWS v1.26: instant-on-change SimVar polling + binding.pollGroup — 2026-09-01

Widget author reported COM1/2 and NAV1/2 radio widgets' frequency displays lagging up to a full second behind an actual sim change (e.g. a preset button). Root cause: `pc-bridge/server.js`'s "normal" polling tier (FDWS v1.7) requested SimConnect data at a flat `SimConnectPeriod.SECOND`, unconditionally, whether or not the value had actually changed.

**Fix: `DataRequestFlag.DATA_REQUEST_FLAG_CHANGED` on both polling tiers**, combined with `SimConnectPeriod.SIM_FRAME` for both (previously only the fast tier). SimConnect now checks every simulated frame but only transmits a chunk's data when something in it actually changed — near-instant reaction to a real change, essentially zero standing cost for a value that's static most of the time. Explicitly *not* fixed by telling widget authors to declare more bindings fast-tier — that would trade the lag for a real, scaling per-frame cost on every subscriber regardless of whether anything's actually moving, which was the concern that came up when this was discussed before implementing.

**New `binding.pollGroup` / `state[].pollGroup`** (optional string, additive). Since `DATA_REQUEST_FLAG_CHANGED` sends a whole chunk's data if any one field in it changed, chunk *composition* now matters — one jittery var sharing a chunk with 19 quiet ones would drag the whole chunk's traffic up. Defaults to the subscribing widget's own definition id, so a widget's own vars land in the same chunk(s) automatically with zero authoring effort; an explicit value lets an author deliberately merge chunks across widgets or split a noisy var out. Two widgets referencing the same shared logical SimVar: first subscriber's group placement wins (already-deduped globally, delivery already broadcasts to everyone — no duplicate SimConnect requests either way, see the full discussion in the spec doc's §2).

`pc-bridge/server.js`'s chunk bookkeeping was reworked from one flat subscribe-order array per tier to per-group bookkeeping plus a direct `reqId -> fields` map, which also simplified the `simObjectData` frame parser (no more chunk-index arithmetic over a flat array). See [FlightDeck-Widget-Standard-v1.26.md](docs/FlightDeck-Widget-Standard-v1.26.md) for full details.

## Widget Studio: Appearance section reorg + Normal/state style tab — 2026-09-01

Follow-up polish to the v1.25 state-style work, requested after actually using it — the Appearance accordion had gotten crowded once every field had a state-style twin sitting right below it.

**Field reordering** (base style and the state-style section identically, so the two stay visually parallel): Typography row now reads Font Family/Font Weight, then Text Color/Font Size (previously Font Family/Font Size, Font Weight/Text Color — grouping the two selects together and the two "how it looks" fields together). Text Outline & Glow: Outline Color before Outline Width. Border & Radius: Border Style moved above Border Width/Corner Radius, since picking solid/dashed/dotted first is the more natural order than sizing a border you haven't picked a style for yet.

**Border Glow now has "Glow inward instead of outward" in the state-style section too** — was only on the base style; the state section had Border Glow Color/Blur but never the inset checkbox.

**State-style section brought to full field parity with the base style** (Font Family/Weight, Outline, Glow — previously only Border/Background/Text Color were exposed there at all) — a side effect of applying the same reordering to both, but a real gap-fill on its own.

**New Normal/&lt;state&gt; tab toggle.** Rather than showing the full base style stacked above the full state-style override (the crowding complaint), the Appearance section now shows one or the other, switched by a two-button toggle ("Normal" / the component's state tab label — "Pressed", "Edit State", "Dragging", etc.) right below Style Presets. State-tab fields show the actual *effective* value (state override, or the inherited base value when unset) dimmed via reduced opacity when it's inherited rather than a blank/placeholder field — an author can see exactly what they'd be overriding before touching it. Clearing a dimmed field (or picking a select's "— inherit (current value) —" option) removes the override. Purely a `StudioInspector.js` UI change — no FDWS field, JSON shape, or runtime behavior involved, so no spec version bump.

## FDWS v1.25: editState/pressed/dragging/engaged interaction states; two app-level fullscreen/keyboard bugs — 2026-09-01

Reported together from a Pixel screen recording: switching to Fullscreen mode showed the toggle already checked even though the app wasn't actually fullscreen yet, and after that, tapping a COM STBY frequency field would sometimes dismiss the on-screen keyboard the instant it opened along with a visible flash of the widget.

**Fullscreen checkbox out of sync with reality** — `FullscreenManager.js`'s `bindToggle()` set the checkbox from `enabled` (the persisted on/off *intent* in `localStorage`), not the real `document.fullscreenElement` state — since browsers never auto-resume fullscreen on page load/reload (as the file's own doc comment already noted), the checkbox could read "on" the instant the menu was opened even though the page wasn't fullscreen yet. Fixed by always deriving the checkbox from the real state, kept in sync in both directions by the existing `fullscreenchange` listener (previously only handled the "exited" direction, never "entered").

**Any resize tore down and rebuilt the entire page** — `app.js`'s `handleOrientationChange()` called the full `renderActivePage()` (destroys and recreates every widget instance) on any width/height change past the orientation watcher's 5px threshold, not just a real portrait/landscape flip. Both the on-screen keyboard opening (which shrinks the layout viewport well past 5px) and the Fullscreen API's status-bar transition trigger that same threshold, so either one tore the whole grid down and rebuilt it — which yanks focus off whatever's focused (dismissing the keyboard the moment it opens, since the `<input>` it was anchored to gets destroyed and recreated) and, since the resize watcher re-checks itself ~80ms after its first pass, could rebuild twice at two different transient sizes during the fullscreen transition's animation, producing a visible flash. New `refreshGridGeometry()` handles a same-orientation/same-tier resize in place instead — re-measures column width, re-applies the grid's CSS custom properties, and calls each already-mounted widget's own `applyLayoutStyles()` (no destroy/recreate) — reserving the full teardown for an actual orientation or device-tier change.

**FDWS v1.25** — while fixing the keyboard/toolbar interaction, found that `core.input`'s `selectOnFocus` (native `inputEl.select()` on focus) is exactly what was triggering Android Chrome's cut/copy/paste/select-all toolbar on every tap into a populated field. Replaced it with an "arm on focus, replace on next keystroke" flag (consumed via `beforeinput`, setting the selection just-in-time instead of leaving one standing) — same "tap and type to replace" behavior, no native selection ever sits in the field for the OS to build a toolbar around. That removed the field's only visual cue that it was armed, which led to giving `core.input` a new `editState` state (author-customizable via the existing-but-previously-Studio-UI-less `style.states` mechanism) for its whole focused session, as the replacement cue. That in turn generalized to six other component types that had the same gap (either a hardcoded fixed-color CSS "something is happening" look, or no feedback at all): `pressed` (`core.button` momentary/swap, `core.rocker` per zone, `core.stepper` per button), `dragging` (`core.rotary`, `core.slider`), and `engaged` (`core.pad`) — plus `core.selector`'s existing per-position `active` glow, previously hardcoded, now overridable the same way. Widget Studio's Property Inspector gained its first real UI for `style.states` (declared since earlier versions as `control: 'stateStyleEditor'`, never implemented) — a "State Style" section in Appearance, shown per component type/variant. See `docs/FlightDeck-Widget-Standard-v1.25.md`.

All FDWS-side changes live in `shared/`, synced to both apps via `scripts/sync-shared.mjs`; the fullscreen/resize fixes are `flight-deck-pwa`-only app code, not part of the widget spec.

## Border glow: Edit View gap and a stale-shadow bug, both same-day — 2026-09-01

Two follow-up fixes to the `style.border.glow` feature shipped the day before (see entry below), both found by actually using it.

**Edit View never drew it at all.** `StudioCanvas.js`'s `renderComponentVisual()` — the simplified mock renderer Edit View uses, entirely separate from the real `BaseComponent.js` path Device View/the PWA use — already applied `border.radius` generically but had no `box-shadow` handling whatsoever. An author authoring a glow in Edit View saw nothing of their own; the only glow-like thing visible on a selected component was Studio's pre-existing selection-highlight chrome (fixed `4px` radius, unrelated to the authored style), easy to mistake for "the glow isn't following my radius." Fixed by adding the same `box-shadow` derivation next to the existing `borderRadius` line there.

**A stale, unrounded shadow left stranded on `core.button`'s wrapper.** Reported live as "a faint square outline" around an otherwise-rounded button — real bug, not the Edit View gap above (this one showed in Device View too) and not `clipToBounds` (confirmed off). `ButtonComponent` runs `applyStyles()` twice: once before its inner `btnNode` exists (that pass's `surfaceTarget` falls back to the outer wrapper), once more right after (now targeting `btnNode` for real). The existing double-border fix already clears the wrapper's stale `border`/`background` on the second pass, but never `boxShadow` — invisible as long as `border.radius` was also set explicitly (both passes then compute the same radius, so the stray wrapper shadow happened to match), but setting `glow` *without* an explicit radius exposed it: the wrapper's stranded shadow sat at `border-radius: 0` while `btnNode`'s fresh one picked up its `6px` stylesheet default — two overlapping shadows, the square one's corners peeking out past the round one. Fixed by adding `boxShadow` to the same wrapper-reset block. Reproduced against the actual reported widget file (imported directly into a running Widget Studio session via its own state API, not a hand-built repro) and reconfirmed clean via computed-style diffs before/after the fix.

Both fixes live in `shared/`, synced to both apps via `scripts/sync-shared.mjs`. Write-up folded into `docs/FlightDeck-Widget-Standard-v1.24.md` §4 rather than a new spec version — neither changes the spec, both are implementation bugs in code written to serve it.

## FDWS v1.24: border glow; divider Nudge X/Y fixed — 2026-08-31

Two style-system fixes requested together.

**`style.border.glow`** (new, FDWS v1.24) — a soft glow around a component's border, the same "annunciator bloom" `style.typography.glow` (v1.15) already gives text, but for the edge instead: `glow.color` (unset = off, same convention as the typography version), `glow.blur` (px, defaults to 6), and `glow.inset` (new — no text equivalent, since text has no "inward") to glow inward instead of outward. Rendered as a single `box-shadow` on the same node `border.width`/`.color`/`.radius`/`.style` already target — nothing else in the render pipeline used `box-shadow`, so no collision to reconcile. Set unconditionally (empty string when unset) so a `style.rules`/`style.states` swap that drops the glow actually clears a previously-applied one. `core.divider` gets it for free with no special-casing — its line itself is a separate inner node, the glow applies to the component's own bounding box like any other type. Widget Studio's Inspector gained matching "Border Glow Color" / "Glow Spread (px)" / "Glow inward instead of outward" controls in the existing Border section, wired the same way the v1.15 Typography Glow controls already are. `FDWS_VERSIONS` bumped to `1.24` (single source, `shared/widgets/PropertyRegistry.js` — both validators import it, no separate enum to update); `scripts/check-registry-drift.mjs` confirmed clean after the change. See `docs/FlightDeck-Widget-Standard-v1.24.md`.

**`core.divider` ignored Nudge X/Y** — reported separately, while discussing the glow feature above. `style.offset.x/y` is a universal field and Widget Studio's Inspector already showed the controls for a divider, but `BaseComponent.js`'s offset logic applies the pixel nudge to whichever inner node a component registers (`labelNode`/`valueNode`/`inputNode`/`btnNode`/`dotNode`) — `DividerComponent` never registered its own `lineNode` there, so the nudge had nowhere to land. A second, related gap: even after adding `lineNode` to that list, `DividerComponent.render()` creates `lineNode` *after* `super.render()` already ran the offset logic once — the same node-not-created-yet ordering problem `ButtonComponent` already works around by calling `applyStyles()` a second time once its own node exists; mirrored that fix. No schema/version change needed — this was a pure runtime bug, not a new field. Verified live in Widget Studio's Device View (the real renderer, not the simplified edit-canvas mock) via computed `transform` on `.fd-comp-divider-line`.

Both fixes live in `shared/` and were pushed to `flight-deck-pwa`/`widget-studio` via `scripts/sync-shared.mjs`.

## Configurable Button: first "quick add" built-in widget — 2026-09-01

Replaced the native "Switch / Push Button" widget entirely with a new configurable button — the first of a planned family of built-in widgets meant to be simple to add and configure. Placing it from the Add Widget drawer now opens a config popover immediately: button type (Toggle/Momentary), a style preset (six named looks, moved out of Widget Studio into `shared/` so both apps draw from the same list), an optional corner LED that lights when active, a label, and Deck Event read/write bindings (with a custom/freeform escape hatch, same dropdown-plus-custom-entry UI the Property Inspector already used). Defaults to a 3x3 footprint, with a real (now-enforced) 2x2 minimum. Cancelling right after adding undoes the whole add; editing an existing button later reopens the same popover from the Property Inspector via a new "Configure Button…" link, where Cancel just closes.

Built as an FDWS composite widget (a single `core.button` component) rather than a native JS class — composite components have no fixed pixel floor, so this sidesteps the still-open native-widget min-height/clipping bug entirely for this widget (that bug remains tracked separately for the other native widgets). Each placed button carries its own embedded FDWS definition (`config.definition`), so many buttons can share the one catalog entry while each keeps its own label/style/binding. All 14 shipped default-profile buttons (Autopilot, Lights) were migrated to the new shape rather than left on the old one.

A stale-render bug was caught and fixed while building this: `CompositeWidget` only ever resolved its FDWS definition once, in the constructor, so a config-only update that swapped in a new `config.definition` would silently keep rendering the old one — `updateConfig()` now re-resolves it. Also closed a real, separate gap along the way: a widget's declared `minW`/`minH` was previously documentation only, never enforced by the resize stepper — it is now.

## Nudge-preview delay shortened to 1s; widget min-height overflow fixed for real — 2026-08-31

Two small follow-ups. The auto-reposition nudge preview's hold delay dropped from 2s to 1s, per the user's own follow-up request — a one-line `setTimeout` change.

Separately, the user reported a 2-row-tall widget bleeding into the row below it, in the same rows the menu/App Profile corner widgets occupy. Root cause matched a bug already fixed once before, just under-scoped: `.fd-widget`'s flat `min-height: 44px` touch-target floor exceeds a widget's own actual grid allocation whenever `h * rowHeight + gap < 44px` (any `h:2` widget, on most tiers) — CSS Grid doesn't grow a track to fit an oversized `min-height`, so the widget just overflows its own cell instead. The earlier fix only reset `min-height` for the two corner widget IDs specifically; confirmed via direct measurement that an *ordinary* widget placed well away from the corners (row 10, `h:2`) hit the exact same bug (44px rendered vs 39px expected) — it was never actually about being "in the same rows as the corner widgets," just that a 2-row-tall widget happened to sit there.

Fixed generally in `BaseWidget.applyLayoutStyles()`: `min-height` is now computed per-widget as `min(44px, its own h*rowHeight + (h-1)*gap)`, read live from the grid's inherited `--row-height`/`--grid-gap` custom properties, rather than a flat CSS value — every widget still gets a comfortable touch-target floor for genuinely short spans, but never one taller than its own declared cell (this incidentally also fixes `h:1` widgets, which were *always* overflowing by 26-28px depending on tier — just never reported, since `h:1` widgets are rare in this app's actual widget catalog). The corner-specific `min-height: 0` override in `grid.css` is now dead code and removed — `BaseWidget`'s general fix covers those two widgets the same as everything else.

**A bug in the fix itself, caught before shipping:** the new `getComputedStyle()` read initially returned wrong values (hardcoded fallback defaults, not the tier's real row-height/gap) for every widget's very first mount — `BaseWidget.mount()` was calling `applyLayoutStyles()` *before* `container.appendChild(this.element)`, and inherited CSS custom properties only resolve correctly once an element is actually connected to that container's DOM subtree. Caught by directly inspecting a fresh corner widget's computed `min-height` (32px instead of the expected 39px) rather than just eyeballing that it "looked fine." Fixed by moving `applyLayoutStyles()` to run after the append — harmless reordering, since nothing else in `mount()` depends on layout styles being applied before Shadow DOM setup/render. Re-verified on a genuine fresh mount (not a manual re-call) afterward: 39px, matching the real tier math.

## Toggleable smart auto-reposition for edit-mode drag-and-drop — 2026-08-31

User wanted control over what happens when a dragged widget overlaps another. Previously, `LayoutEngine.resolveLayoutWithPushDown()` ran unconditionally on every drop, shoving every colliding widget straight down with no way to opt out or reject the placement. Planned via `/plan` (see the approved plan for the full design) with two clarifications: a vertical conflict's fallback direction (down/up primary → try right if no room, mirroring the horizontal case's fallback-to-down) and whether the "blocked" feedback in off-mode should share the same 2-second hold as the nudge preview (it does — one consistent timing rule).

New `LayoutEngine.resolveSmartNudge()` replaces the push-down cascade for drag-and-drop specifically (every other call site — `handleCompactLayout`, `handleMirrorLayout`, `addNewWidgetToPage`, widget resize via the Property Inspector — is untouched, still uses the old unconditional cascade, since none of them are "the user just dropped one widget onto another"). For each widget the drop candidate collides with: the overlap rectangle's width vs height picks the conflict axis (the standard minimum-penetration-axis heuristic — a thin vertical sliver of overlap means a left/right conflict, a thin horizontal sliver means a top/bottom conflict), the overlap's center vs the existing widget's own center picks the direction away from the overlap, and the widget is shifted exactly far enough to clear the incoming one. If that has no room (grid bounds or a further collision, including the reserved corner cells), one fallback direction is tried; if that also fails, the *entire* placement is rejected — nothing partially applied, even if other colliding widgets could have been resolved.

A new toolbar toggle ("Nudge", `EditToolbar.js` — the first on/off toggle-style button in a toolbar of otherwise one-shot actions) controls this: on, drops nudge; off, an overlapping drop snaps back with a toast instead of committing (the dragged widget's own layout is never mutated during drag — only a CSS transform — so "reject" is just leaving it alone). Defaults **off** and persists to `localStorage` (`flightdeck_auto_reposition`), same pattern as `FullscreenManager`/`WakeLockManager`. A reserved corner cell (menu/App Profile badge) can never be a nudge target or a valid drop target either way — a structural rule, not part of the toggle.

While dragging, holding a candidate position that overlaps something for 2 seconds shows a live preview — one amber `.fd-nudge-preview` ghost per widget that would move (computed speculatively via the same `resolveSmartNudge()`, nothing persisted until an actual drop), or the existing cyan drop-target ghost turns red (`.is-blocked`) if the placement would be rejected. Only *showing* the preview is gated behind the 2s hold; moving to a different candidate cell clears it instantly, so idle dragging-around never triggers the speculative recompute needlessly.

Verified extensively: all four nudge directions confirmed directly against the documented examples, the fallback chain (primary blocked → fallback → reject) confirmed both in isolation and via a real end-to-end drag (a diagonal overlap correctly picked the vertical axis, found "up" blocked at the grid's top edge, and correctly fell back to "right" — not a bug, the algorithm working exactly as designed on an overlap shape the manual test hadn't deliberately engineered), off-mode reject-and-toast confirmed to leave layouts genuinely unchanged, the toggle's default/persistence confirmed across a reload, and the live 2-second preview ghost confirmed to render at the exact resolved nudge position before any drop occurs.

## Reserved-corner shading made solid enough to actually read as blocked — 2026-08-31

User asked to extend the "disabled" shaded zone (marking the margin the curved-corner-clearance work reserves next to each corner widget) to fully cover the corner's whole grid footprint. It already did, positionally — `.fd-reserved-corner-indicator`'s size and grid placement exactly matched the reserved layout (confirmed by direct measurement: identical `getBoundingClientRect()` to the corner widget's own outer element) — but the real page grid's own edit-mode gutter bands (from the entry above) render underneath it uniformly across the whole page, including in that reserved margin, since `.fd-page-grid`'s background has no concept of "reserved" columns. At the indicator's previous low-alpha hatch-only styling, the cyan gutter bands showing through visually dominated, so the margin still read as ordinary explorable grid space with a faint gray tint, not a clearly blocked zone.

Added an actual `background-color: rgba(10, 12, 16, 0.6)` underneath the existing diagonal hatch (both painted via the same element, `background-color` composites behind `background-image` layers), dark enough to mask the competing cyan lines rather than just add a hatch on top of them. Verified visually via a 4x CSS `zoom` on the live page (the reserved patch is only ~25px wide at typical viewport sizes, easy to miss in a normal screenshot) — confirms the shaded zone now clearly and legibly covers the corner's entire reserved footprint, not just technically occupies it.

## Edit-mode grid guides redesigned as gap gutters, not lines — 2026-08-31

The previous fix (below) made the guide pattern's tile size account for the grid's gap, which stopped it drifting away from the widget grid — but the user reported a real widget's top/left edge still looked like it bled slightly past a guide line, while its bottom/right edge sat slightly inside one. Root cause: a thin 1px line drawn at each tile's *start* is inherently ambiguous relative to a widget's own two edges — the widget's left/top edge sits flush where a column/row *starts* (matches the line), but its right/bottom edge sits flush where the *gap* starts, which is gap-px *before* the next tile's line. A single line can only ever agree with one of a widget's two edges at a time. It also made the (already-acknowledged, if imperceptible on its own) sub-pixel column-rounding residual read as noticeably "off," since it was being judged against a hard 1px target.

Replaced the line-drawing `linear-gradient` + `background-size` pair with two `repeating-linear-gradient`s (one per axis) that shade the *entire gap* as a translucent band instead of a single line — the repeat interval is defined by the gradient's own last color-stop, so there's no longer a separate `background-size` expression to keep in sync with it. A real widget's edges now bound that gutter band exactly on *both* sides by construction, since CSS Grid's gap literally *is* the space between two widgets — verified against a real placed widget's rendered left and right edges, both landing within 0.004px of the gutter's boundaries (floating-point noise, not a real residual). Also reduced the container's `border-radius` from 8px to 4px, since an 88-column tier's raw column width can be under 10px — small enough that the old 8px corner rounding could visibly clip into the very first column's own guide band.

## Edit-mode grid guides fixed to actually match the widget grid — 2026-08-31

User reported the edit-mode background grid dots didn't line up with the real widget grid. Root cause: `.fd-page-grid.edit-mode-active`'s `background-size` used `100% / cols` for column pitch and plain `row-height` for row pitch, silently assuming zero gap between tracks — real CSS Grid columns/rows are `(container - (n-1)*gap) / n`, so the pattern was off from the very first line, and the error compounded every column/row (very visible on the 44/60/88-column tiers). A second, smaller bug: `background-origin` defaults to `padding-box`, but the grid's real widgets live in the content box (inset by the container's own 4px padding), adding a fixed extra offset on top.

Fixed both in pure CSS — `background-size` now bakes the gap into both axes' `calc()` (row pitch is exact, pure px math; column pitch works the gap into a mixed percentage/px expression, correct on average since the browser's actual per-column rounding can differ from the theoretical value by well under a pixel), and `background-origin: content-box` aligns the pattern's origin with where grid items actually start. Verified by comparing a real widget's `getBoundingClientRect()` left edge against the exact expected column boundary computed from the grid's own custom properties (`--grid-cols`/`--grid-gap`) — a placed widget at column 16 of an 88-column grid landed within 0.44px of the theoretical boundary, versus what would have been tens of pixels of drift under the old bug at that column count.

## Edit-mode grid guides now show the corner widgets' reserved margin — 2026-08-31

User asked for the edit-mode grid background to visually reflect the cells the menu/App Profile corner widgets have reserved — previously, the grid-guide dots (`.fd-page-grid.edit-mode-active`) treated the whole page uniformly, giving no visual hint that the narrow margin column next to each corner widget (added in the curved-corner-clearance work above) is still off-limits, even though it looks like ordinary empty grid space.

New `.fd-reserved-corner-indicator` divs (one per corner) are now always created in `mountCornerWidgets()` (`app.js`), positioned via inline `grid-column`/`grid-row` to match each corner's *full* reserved footprint (including the margin the visible button/badge doesn't cover — the same `layout` object `getCornerWidgetLayouts()` already returns), appended before the widget itself mounts so they sit visually underneath it. They're invisible outside edit mode and use a diagonal hatch + dashed border in a muted gray (`--text-label`-ish tone) rather than the existing cyan grid-guide color, so they read as "blocked," not "here's the grid." Toggling is instant and needs no re-render: a new `this.cornerOverlayEl` reference lets `toggleEditMode()` flip the same `.edit-mode-active` class on the corner overlay that it already flips on the real page grid, and `mountCornerWidgets()` sets the class correctly at creation time too, in case a page re-renders while already mid-edit. Verified live: entering/exiting edit mode toggles the hatch instantly, and it survives an in-place re-render triggered while edit mode is already active.

## Menu dropdown anchors to the menu button instead of centering — 2026-08-31

User asked for the nav dropdown to visually extend from the menu button, like the button itself is unfurling it, rather than appearing centered across the screen. `.menu-dropdown` (`css/main.css`) dropped its `left: 50%; transform: translateX(-50%)` centering for a `left: 12px` fallback plus a narrower `width: min(280px, calc(100% - 24px))` (was effectively full-width, `calc(100% - 32px)` capped at 440px) — compact enough to read as anchored to a button rather than a full-width drawer. The 12px fallback is only a default: `wireCornerInteractions()`'s menu click handler (`app.js`) now reads the menu button's actual `getBoundingClientRect()` and sets `menuDropdown.style.left` from it fresh on every open (only while opening, not closing, so nothing shifts mid-close-animation) — needed since the button's x-position isn't fixed, it scales with the corner widget's declared width per orientation/tier (see the grid-margin entries above). Verified live in both landscape and mobile-portrait that the dropdown opens flush under the button in each, and that outside-click-to-close (unrelated, untouched logic) still works.

## Corner widget margin tuned down from 2 columns to 1 — 2026-08-31

User confirmed the grid-widening fix (below) worked correctly on their Pixel 10, but felt the margin was a touch more generous than needed. `getCornerWidgetLayouts()`'s widen amount dropped from +2 declared columns to +1 for both corner widgets (menu 3→4, App Profile badge 5→6, down from 5/7) — a one-line change, since `visibleCols`/`totalCols` and the nested-grid inner-alignment in `MenuToggleWidget`/`AppProfileWidget` already handle any margin width without modification. Verified via pixel measurement in both landscape and mobile-portrait that the button/badge remain flush with their cell's inner edge with the new, narrower margin (roughly half the previous offset, as expected).

## Grid-space margin confirmed correct; padding-based approach ruled out — 2026-08-31

Shortly after the entry below shipped, the user reported the *previous* (`.fs-inset` padding) fix had actually looked fine on their Pixel 10 in an earlier test, and asked to revert the grid-widening change back to it — reverted cleanly via `git revert`. Minutes later, the user tested `.fs-inset` properly on-device and sent two screenshots: outside Fullscreen, the menu button and App Profile badge look correct with visible edge clearance; inside Fullscreen, the icon/text visibly shifted inward as intended, but the button/badge's own **border and box-shadow stayed exactly where they were** — still flush with the true screen edge, still clipped by the curve — making the button look slightly smaller (icon off-center inside an unmoved border) without actually fixing the clipping.

This makes sense in hindsight and is worth remembering: `.fs-inset` added `padding-left`/`padding-right` to `.garmin-menu-btn`/`.aircraft-badge`, but never changed those elements' own width or position — they still filled 100% of the *original* (non-widened) grid cell. Padding only pushes an element's *content* inward from its own border; it can't move the border itself, since the border is drawn at the padded box's own edge. To actually move the border/box-shadow inward, the element's own box has to shrink and reposition — which is precisely what the grid-widening approach (wider reserved cell, smaller inner-aligned button) does and the padding approach structurally cannot.

Re-reverted (`git revert` of the revert) back to the grid-widening implementation from the entry below, now confirmed as the only one of the three attempts that can work by construction rather than by luck. The user also independently re-derived and accepted the tradeoff this approach makes: since the widened footprint is *permanent* rather than conditional on Fullscreen state, the reserved margin is always there — which avoids a worse problem a conditional widen would have (a widget already placed in that space could suddenly collide with a newly-widened corner cell the moment the user toggles Fullscreen on), at the cost of a slightly wider permanent margin even outside Fullscreen.

## Curved-corner clearance replaced with a permanent grid-space margin — 2026-08-31

User tested the previous fix (see the entry below) on their actual hardware and found it worked on a Pixel 7 Pro but *not* a Pixel 10 — curved-corner clipping amount is genuinely device-specific, so no single fixed cushion value applied at runtime was ever going to be reliably correct for every phone. Reverted to the user's own original proposal instead: make the padding structural rather than conditional. `FlightDeckApp.getCornerWidgetLayouts()` now gives each corner widget a grid footprint 2 columns wider than its visible button/badge — the menu toggle goes from a declared 3×2 to 5×2, the App Profile badge from 5×2 to 7×2 — permanently reserved space toward the true screen edge that a real widget can never be placed into (the existing reserved-corner collision machinery, `resolveWithReservedCorners()`/`getReservedCornerEntries()`, needed no changes at all, since it already operates purely in terms of grid cells regardless of what's visually inside them). This sidesteps needing to know a device's curvature at all: the margin is simply always there, a little more generous than any given phone strictly needs rather than being wrong for some of them.

The actual button/badge stays the same visual size as before rather than stretching to fill the wider cell: each widget's `render()` now builds a small nested CSS Grid inside its own box, using the same column count and gap the outer page grid uses (`visibleCols`/`totalCols`/`gap`, computed in `getCornerWidgetLayouts()` and passed through `config`) — reproducing the outer grid's exact per-column pixel width, so the button spans just the *inner* `visibleCols` columns (right-aligned for the menu, left-aligned for the badge) at exactly its old size, with the extra 2 columns as genuinely empty space toward the outside edge. Testing this at a deliberately mismatched viewport/orientation combination (forcing the app to keep using tablet-landscape's 88-column grid math against a 375px-wide container) surfaced a real, if narrow, robustness gap: a CSS grid item's default `min-width: auto` lets it overflow past an assigned track that's narrower than its own content's minimum size (icon + padding), rather than shrinking — added `min-width: 0` on both the button and badge as a defensive fix, confirmed not to change normal-case rendering. Verified via exact pixel measurement in both realistic landscape and mobile-portrait viewports (after correcting the test itself — an earlier resize-without-reload measurement had accidentally left the app's own orientation state stale) that the button/badge sit flush with the inner edge of their now-wider cell with zero overflow, matching their pre-widen size.

Also removed the previous attempt's `.fs-inset`-class/`fullscreenchange`-listener machinery entirely, now dead code with nothing left to drive it.

## Corner widgets get curved-corner clearance in fullscreen mode — 2026-08-30

User reported that with Fullscreen mode on, the menu button and App Profile badge (now flush against the true screen edges since the status bar's own clearance is gone) get visibly clipped by their Pixel 10 Pro XL's curved screen corners. Proposed fix was widening each corner widget's grid footprint by a column or two and inner-aligning the button within it — workable, but that would cost real placeable space between the two corners on every device, all the time, even ones without curved corners. Went with a narrower fix instead: `env(safe-area-inset-*)` isn't reliably populated for corner *rounding* the way it is for notches/cutouts, so it can't be trusted alone, but padding only the button/badge's own inner content in from its outer edge — leaving the widget's grid cell (and `app.js`'s reserved-corner collision math) completely untouched — costs nothing in the space between the two corners.

**First attempt was a real bug, caught by the user re-testing rather than trusting my own verification.** Shipped a `:fullscreen .garmin-menu-btn`/`:fullscreen .aircraft-badge` CSS rule, confirmed via CSSOM inspection that it loaded correctly, and reported it done — but the rule could never have worked. `MenuToggleWidget`/`AppProfileWidget` render inside a real Shadow DOM (`BaseWidget`'s `adoptedStyleSheets`), and a stylesheet adopted into a shadow root can only match ancestors *within that same shadow tree*; `:fullscreen` only ever applies to `<html>`, which sits in the light DOM, entirely outside the shadow boundary — so the selector silently never matched, in any fullscreen state, on any device. The CSSOM check only proved the rule text parsed and loaded, not that it could ever apply; the Browser pane's own inability to grant real `requestFullscreen()` for a non-trusted-gesture call meant this never got exercised end-to-end before being called done. User reported "still doesn't work" even after clearing cache and waiting out GitHub Pages' CDN cache window, which correctly pointed back at the code rather than deployment/caching.

Fixed by switching to the same pattern this app already uses for connection-status coloring (`.bridge-connected`/`.sim-connected`): a plain class (`.fs-inset`) toggled directly on the button/badge element from JS, which — unlike an ancestor-combinator selector — works fine within an adopted shadow-root stylesheet since it only needs to match the element's own class list. New `MenuToggleWidget.setFullscreenInset()`/`AppProfileWidget.setFullscreenInset()`, driven by a new `FlightDeckApp.updateFullscreenInset()` that reads `document.fullscreenElement` — called both from `mountCornerWidgets()` (since the corner widgets are destroyed/recreated every render and would otherwise lose the class) and from a new one-time `document.addEventListener('fullscreenchange', ...)` (since fullscreen can toggle without any render happening at all). Verified this time by actually applying/removing the class in the Browser pane and confirming computed padding moves (`16px→30px` menu, `12px→26px` badge) and cleanly reverts — a check the previous, broken version of this fix never actually performed. Real curved-corner clearance on the Pixel 10 Pro XL still needs on-device confirmation, since the Fullscreen API itself remains blocked for non-trusted-gesture calls in the sandboxed dev browser — but the underlying mechanism (the class actually landing on the element, and the CSS actually applying once it's there) is now genuinely confirmed working, not just assumed.

## Corner widgets get a state-matched accent border/floor-line — 2026-08-30

Same-day follow-up to the corner-widgets pass below: the user felt the menu button and App Profile badge didn't visually stand apart from ordinary page widgets enough. Mocked up six on-theme treatments as an Artifact (cyan border, bottom accent line, outer glow, corner status pip, a border+line combo, and a double-lined "instrument bezel" border) before touching code, all built from tokens already in `main.css`. User picked the border+line combo, with two refinements: the menu button's accent should track its own connection-status color rather than a fixed cyan, and the App Profile badge should switch from cyan to a fixed green identity (magenta, tried first, was reverted the same session in favor of green).

Implemented in `css/main.css` only, no JS change needed. `.garmin-menu-btn`'s `border-color` and a new inset `box-shadow: ... , inset 0 -2px 0 0 currentColor` floor line both use `currentColor` instead of a literal color, so they automatically follow whatever `color` the existing `.bridge-connected`/`.sim-connected` classes already set (white at rest, cyan once PC Bridge connects, magenta once the simulator connects) — one CSS variable instead of three separate ones to keep in sync per state, and it let the two connection-state rules actually get *shorter* (they no longer need to separately repeat `border-color`). `.aircraft-badge` moved off `--accent-cyan` to a fixed `--accent-green` for its text, border, and the same floor-line treatment — independent of any connection state (briefly `--accent-magenta` first, swapped to green minutes later per the user's own follow-up). Verified live in both dark and light themes and across all three menu-button connection states (toggling `BRIDGE_STATUS`/`SIM_STATUS` through the real EventBus) via the Browser pane.

## Menu button and App Profile badge become real corner widgets, freeing the header row for content — 2026-08-30

User pointed out that in landscape orientation, the fixed `.top-bar` header left a lot of dead horizontal space between the menu button and the App Profile badge, and asked whether the widget grid could be extended into it. A first attempt turned the two into real `BaseWidget` instances (`MenuToggleWidget.js`, then-named `AircraftBadgeWidget.js`) living in a separate `.fd-pinned-row` strip above `#content-area` — this reclaimed the whitespace *within that strip*, but the user correctly identified it didn't actually solve the problem: a widget added via the normal Add-Widget flow still landed in the page's own grid, physically below the strip, since two stacked DOM containers can never share one visual row. Reworked from scratch based on the user's own design: the menu toggle (fixed 3×2, top-left) and App Profile badge (renamed `AppProfileWidget.js` — "aircraft badge" no longer described its function) are now floated directly on top of the real page grid's own row 1-2 cells via a new `.fd-corner-overlay` (`position: sticky; height: 0; overflow: visible` — the standard "pin without consuming layout space" pattern), reusing the exact same `LayoutEngine.applyGridToContainer()` column math as `.fd-page-grid` so both agree pixel-for-pixel. Both corner widgets are destroyed and rebuilt fresh on every `renderActivePage()` call (all branches, including Settings and the Virtual Yoke rotate-prompt, both of which have no real page grid at all) rather than kept alive outside it — cheap, since neither carries SimVar bindings or other state — which also sidestepped Phase 1's messiest problem: a persistent container needed its own parallel lifecycle and a shared-mutable-`LayoutEngine`-state gotcha that never fully went away.

The reserved corner cells are virtual, computed at render time by `app.js`'s new `getReservedCornerEntries()`/`getCornerWidgetLayouts()` (sizes authored against the same 20-col-portrait/44-col-landscape mobile reference every other widget's `defaultLayout` already uses, proportionally scaled per tier/orientation) — never written to `Profile`/`Page` storage, since this chrome is app-global, not page content. Every collision-aware call site (`addNewWidgetToPage`, drag-and-drop, `handleUpdateWidgetConfig`, `handleCompactLayout`, `handleMirrorLayout`) now keeps real widgets from landing on a reserved cell. That surfaced a real bug in the first implementation attempt: `LayoutEngine.resolveLayoutWithPushDown()` always keeps whichever widget id you pass it as "moving" fixed at its target and pushes *everything else* out of the way — splicing the reserved corners into that call as ordinary list entries had it backwards, pushing the fixed corners around instead of the real widget trying to land on them. Fixed with two new helper methods (`resolveWithReservedCorners()`/`resolveListWithReservedCorners()`) that always run a corner as the "mover" in a follow-up pass, so real widgets get evicted, never the reverse. A related gap: pages saved before this feature existed had real widgets already sitting in row 1 where a corner now renders — `renderActivePage()` now runs every page's widgets through the same reserved-corner eviction on load (in-memory only, matching `normalizeLayout()`'s existing not-persisted-until-Saved behavior), so old layouts self-heal on next view instead of visually colliding.

A follow-up the same day, after the user reported the corner widgets visually overlapping the real widget row directly below them: root cause was `.fd-widget`'s existing `min-height: 44px` touch-target floor — the corner widgets' 2-row allocation computes to less than 44px in the mobile-landscape grid (2×18px + 3px gap = 39px), and CSS Grid doesn't grow a track to fit an oversized item's min-height, so the corner widget simply overflowed its cell by the difference and bled into the row below. Fixed with a `[data-widget-id="__corner_menu__"], [data-widget-id="__corner_profile__"] { min-height: 0; }` override in `grid.css`, confirmed via exact pixel measurement (gap between corner and next row went from a -2px overlap to a clean 3px, matching the grid gap).

Also added: while in page-edit mode, the menu widget swaps to a pencil icon and tapping it shows/hides the edit toolbar (`FlightDeckApp.toggleEditToolbarVisibility()`) instead of opening the nav dropdown — needed since the toolbar's own row can otherwise cover the same top rows the corner widgets (and any real widget placed between them) occupy; resets to visible every time edit mode is entered/exited, a temporary peek rather than a persisted preference. Verified live in the browser across mobile/tablet tiers, portrait/landscape, edit mode entry/exit, drag-toward-a-corner eviction, add-widget placement in the reclaimed space, Settings, and the rotate-prompt — no console errors beyond the sandboxed environment's expected missing-PC-Bridge WebSocket failures.

## Menu button repositioned off-center and doubles as a connection-status indicator — 2026-08-30

Follow-up to the Fullscreen toggle below: with the status bar now hideable, the menu button's old dead-center position (`.garmin-menu-btn` was `position:absolute; left:50%`) collides with a phone's camera cutout in portrait — previously the status bar's own vertical clearance kept it clear of that. Rather than just nudging it, removed the two separate PC Bridge/Simulator connection-status dots (`#sim-status`/`#sim-connect-status`, the `.status-indicators`/`.wifi-badge` CSS) and folded that information into the menu button itself: left-aligned (no longer centered, so it can't collide with a centered cutout), neutral color with no connection, cyan (`--accent-cyan`) once PC Bridge connects, magenta (new `--accent-magenta` token, both light/dark themes) once the simulator itself connects — simulator-connected implies bridge-connected, so magenta takes priority when both are true. `app.js`'s `BRIDGE_STATUS`/`SIM_STATUS` handlers now track both flags and call a shared `updateMenuButtonStatus()` instead of touching two separate badge elements. Verified live: toggling each event independently produced the correct cyan/magenta/neutral transitions on the actual button.

## Fullscreen toast now gives the correct instructions — 2026-08-30

User reported the message shown after enabling Fullscreen (the toggle added just prior) told them to press Back to exit, but there's no in-app Back action. That message turned out to be Android's own system-level toast for entering the Fullscreen Web API — it can't be edited or suppressed from the page at all, so instead of fighting it, `FullscreenManager.js` gained an `onEnter` callback (fired every time fullscreen is actually entered, including the auto-resume-on-next-gesture path) that `app.js` wires to its own toast with the actually-correct instructions ("use the Fullscreen toggle in the menu"). Both messages will still appear — the OS one can't be suppressed — but the app's own toast now tells the user the real way to get the status bar back.

## Fullscreen toggle to hide the mobile status bar — 2026-08-30

User asked about making the PWA fullscreen to reclaim the space the mobile status bar (time/signal/battery) takes up, especially in landscape. Deliberately did **not** use the manifest's `display: "fullscreen"`/`display_override` mode — that goes through Android's WebAPK-generation-time manifest translation, the same layer that had a real cross-Chrome-version bug for the `orientation` field a day earlier (see the rotation-lock entry below), and changing it again would require every device to reinstall the app to pick it up. Used the standard Fullscreen API (`requestFullscreen()`/`exitFullscreen()`) instead: works in both an installed PWA and a plain browser tab, reversible at runtime with no reinstall. New `js/core/FullscreenManager.js` mirrors the existing `WakeLockManager.js` pattern (persisted `localStorage` preference, `bindToggle()` wiring a checkbox) — a new toggle row in the menu alongside Night Cockpit/Keep Screen Awake. Since browsers never resume fullscreen automatically after a page load/reload (only from a real user gesture), it re-requests on the user's very next tap if it was left enabled last session. Confirmed working on both the Pixel 7 and Pixel 10 Pro XL — the Fullscreen API is blocked entirely in the sandboxed browser used for development, so this could only be verified live, same as the Virtual Yoke's motion sensors.

## Auto-compact turned off by default; edit toolbar moved to the top — 2026-08-30

User reported that customizing a page's widget layout kept bumping widgets up to the top whenever there was empty space above them, even when that gap was left on purpose. Root cause: `LayoutEngine.compactLayout()` ran unconditionally on nearly every render/add/remove/move (including a plain page view, not just an edit action), always pulling every widget but the one just dragged up to close any gap above it. Split into `normalizeLayout()` (coordinate cleanup only — still needed everywhere, since old saved data can be x/y-only or col/row-only) and `compactLayout()` (the actual gap-closing pass), and every automatic path now uses the former; the latter only runs from a new explicit "Compact" action in the edit toolbar. Verified live: moved a widget down to leave a deliberate gap, re-rendered the page the same way a normal view does — the gap survived; clicking the new Compact button closed it on demand.

Same pass, since the toolbar needed a 6th button (Compact) added: found a real, unrelated bug while looking at it — the toolbar rendered 5 buttons in a `grid-template-columns: repeat(4, 1fr)` layout, silently wrapping the 5th onto a second row that the grid's reserved `padding-bottom: 74px` didn't account for, which likely explains reported overlap independent of any redesign. Rather than just fixing the column count, moved the whole toolbar from a fixed-bottom bar to the top, taking over the app's own header's flex slot while editing (hides `.top-bar`, shows the toolbar in the same place) — this needs no overlap/padding math at all since it's normal document flow, not `position: fixed`, and frees the entire bottom of the grid for widgets. All 6 buttons (existing 5 + new Compact) are icon+caption, one row. Verified live: entering edit mode hides the header and shows the toolbar with zero grid overlap; leaving edit mode restores the header.

## Virtual Yoke: pitch inverted in one of the two landscape holds — 2026-08-30

User reported that on the Virtual Yoke page, rotating the phone counterclockwise into landscape (buttons/volume up on their Pixel 10 Pro XL) gave correct pitch and roll, but rotating clockwise into landscape instead (buttons down) gave inverted pitch — roll was correct in both holds, and re-centering didn't fix it. Root cause: pitch is decomposed from rotation about the phone's own physical long (body) axis, and that axis reverses direction between the two landscape holds — the edge that ends up "up" swaps sides — even though the real-world nose-up/nose-down motion the pilot makes is identical either way. Roll is decomposed from rotation about the screen-normal axis, which points out of the screen toward the user in *both* holds, so it never needed correction — exactly matching the reported split. `screen.orientation.lock('landscape')` (`docs/Virtual-Yoke-Page.md`) permits either hold with no signal to the app about which is active, so nothing upstream was compensating.

Fixed in `VirtualYokeEngine.js`: new `_getScreenOrientationAngle()` reads `screen.orientation.angle` (falling back to legacy `window.orientation`, then to `90` — the hold this engine's sign was originally tuned against — if neither API exists), and pitch's sign is flipped only when the angle is `270` (landscape-secondary/clockwise-from-portrait); `90` (landscape-primary) is unchanged. Confirmed fixed by the user testing both landscape holds on a real device (Pixel 7 and Pixel 10 Pro XL) — device motion sensors aren't something that can be verified in a browser preview.

## PWA auto-rotated despite Android's system-level rotation lock being on — 2026-08-30

User installed the PWA fresh on a Pixel 7 and found it auto-rotated between portrait/landscape even with Android's own auto-rotate setting disabled — while the same install steps on a Pixel 10 correctly respected the lock, and visiting the same URL in a plain Chrome tab (not installed) respected it on both phones. That split — only the *installed* app on one specific device ignored the OS lock — pointed at Chrome's WebAPK generation rather than `manifest.json`'s `"orientation": "any"` itself: when Chrome installs a PWA as a standalone app on Android, it builds a real wrapper APK with its own native `AndroidManifest.xml`, translating the web manifest's `orientation` field into a native `android:screenOrientation` attribute at install time — a step a plain browser tab never goes through. `manifest.json`'s `display_override` listed `"fullscreen"` (true immersive mode, which by design hands full orientation control to the sensor, bypassing the system rotation lock — meant for games/kiosk apps) ahead of `"standalone"`; nothing in the app actually uses immersive fullscreen (no `requestFullscreen()` calls anywhere), so it was removed from the fallback list as a first attempt.

That alone didn't fix it, though — the same bug persisted on the Pixel 7 after the manifest change, with the Pixel 10 still unaffected. Actual cause turned out to be a known Chromium bug in older Chrome builds' translation of `"orientation": "any"` into the native `screenOrientation` constant (should map to "unspecified"/defer-to-system, but some versions produced a sensor-forcing constant instead) — confirmed once updating Chrome via the Play Store on the Pixel 7 resolved it, with no further manifest change needed. The `display_override` cleanup (dropping unused `"fullscreen"`) is left in regardless, since it serves no purpose here and remains a plausible contributor on other Chrome/Android combinations.

## Widget Studio: state/operator/value editor rows collapsed to a sliver — 2026-08-29

User reported the new "Only Run If" condition row (v1.23, below) rendering broken — the state picker collapsed to ~18px wide while the operator dropdown and value field looked normal. Root cause, confirmed with a minimal isolated repro: a plain `display:flex` row here breaks because `.prop-select`/`.prop-input` both declare `width:100%`, which corrupts `flex-basis:auto`'s "use the item's own width" resolution — an unconstrained-flex select/input reports a flex-basis near the WHOLE ROW's width, starving a `flex:1` sibling down to ~0px. A first fix attempt (switching to CSS Grid's `repeat(auto-fit, minmax(60px,1fr)) auto`, matching what looked like a working precedent) traded that for a worse failure: any trailing track after `repeat(auto-fit, ...)` that isn't a definite `<length>` makes the browser unable to solve the repeat count at all, silently falling back to exactly 1 column — every field stacked full-width instead of sitting side by side. Checking other places using the same pattern found this was pre-existing, not something this session introduced: Conditional Formatting's rule rows (`style.rules`, FDWS v1.15) and the Conditional Visibility (`visibleWhen`) editor's condition rows had the identical bug, just never reported (state/op/value still displayed, one per line, which reads as "ugly" rather than "broken").

Fixed properly: `.row-list-item`/`.row-field-grid` (new, chrome-free variant for a sub-row nested inside another row) are `display:flex` with every direct child getting `flex: 1 1 0` — the explicit `0` basis is what sidesteps the width:100%-derived-basis trap, since `flex-basis:auto` is never consulted once a shorthand's own basis is set — and buttons (which have no `.prop-select`/`.prop-input` class to corrupt anything) are excluded via a plain `> button` selector so they keep their natural small size instead of competing for growth. Verified live across all affected editors: Conditional Visibility, Conditional Formatting, the popover interaction's Context Map rows, and the new interaction condition row all now correctly distribute width instead of collapsing.

## FDWS v1.23: `interactions[].condition` — skip an interaction's action based on state — 2026-08-29

Following the Save-race fix above, the user reported a related but separate bug: tapping an *unset* COM radio preset button (empty frequency slot) dispatched `0.000` to the sim — a real, invalid frequency — instead of doing nothing. `visibleWhen` couldn't fix this without also hiding the button's long-press-to-set affordance. Added `interactions[].condition`, an optional predicate (same `allOf`/`anyOf`/`equals`/`gt`/… grammar `visibleWhen` already uses) checked immediately before an interaction's action (and feedback) would run — `false` skips the whole interaction. `InteractionDispatcher.js`'s shared `runInteraction()` evaluates it via the same `ConditionEvaluator.js` `visibleWhen`/`style.rules` already share, so both apps pick it up with no per-app runtime code. `StudioInspector.js`'s interaction modal gained an "Only Run If" section (single condition row, same UI pattern as Conditional Formatting) and `StudioValidator.js` cross-checks it, so this is authorable entirely in Widget Studio — no hand-edited JSON, and no widget file was touched to fix this session's own COM12 combo widget (that's left for the user to apply via Studio, per their explicit request not to hand-edit the widget). Verified live: a test widget's tap correctly no-ops while its bound state is empty and correctly dispatches once set. Full spec: `docs/FlightDeck-Widget-Standard-v1.23.md`.

## PC Bridge: a duplicate widget file fed a second, genuine sync-loop bug — 2026-08-29

Same day, after fixing the previous sync-loop bug (`updatedAt` clobbering, below), the user reported the exact same symptom recurring — but for a different widget (`com.flightdeck.throttle`) and a different root cause. `pc-bridge/widgets/` had two files claiming the same widget id: `throttle.v4.fdwidget` (a leftover predating the current `${sanitizeFileName(id)}.fdwidget` naming convention) and `com_flightdeck_throttle.fdwidget` (current). `userPresetManager.js`'s `load()` had no dedup-by-id guard, so both loaded into `this.widgets` as separate entries — and the old file, missing `updatedAt` entirely, fell back (in `getManifest()`) to `this.lastUpdated`, a *global* "time of the last save of anything" clock that kept shifting on every save (including this bug's own prior iterations), feeding an unstable comparison into the client's `reconcilePushUp()` that made it think it needed to push the widget again every single time — and every push's own `USER_PRESETS_UPDATED` broadcast immediately re-triggered the client's full sync check, same self-sustaining loop shape as before, different trigger. Fixed three ways: quarantined the stale duplicate file; `load()` now dedupes by id (keeps the copy with the higher revision, warns about the loser, so this can't silently recur); `getManifest()`'s per-item fallback changed from `this.lastUpdated` to `0` (an unstamped item now reads as "no timestamp," not "constantly refreshing timestamp"); and `SimBridge.js`'s `checkAndSyncPresets()` gained a 2-second debounce as a backstop, so a future one-off inconsistency self-corrects after one extra round trip instead of looping forever.

## `core.input`: on-screen keyboard advanced focus to the next field instead of dismissing — 2026-08-29

User reported that on COM1/COM2's collapsible radio widget, with COM2 visible, typing into the COM1 STBY field and pressing the on-screen keyboard's action key moved focus to COM2 STBY instead of just dismissing the keyboard — not something either app's own code was doing (no `<form>`, no explicit next-field navigation anywhere in `CompositeWidget.js`/`InputComponent.js`); mobile keyboards infer a "Next" action from nearby focusable elements unless told otherwise. Fixed by setting `enterKeyHint = 'done'` on every rendered `core.input` (`InputComponent.js`, shared) — an explicit hint that this is a standalone field, not a step in a multi-field form, matching the existing `keydown` handler's behavior for a physical Enter key (`inputEl.blur()`). Couldn't verify against a real on-screen keyboard directly (no virtual keyboard renders in the sandboxed test browser used this session), but this is the standard, spec-defined fix for exactly this symptom.

## Popover Save race: masked input's pending edit lost if tapped before it blurs — 2026-08-29

User reported the COM1/COM2 collapsible radio widget's preset popover (v1.22 above) accepted a typed frequency but didn't actually save it: the label stayed blank and pressing the preset button dispatched `0.000`. Reproduced live in the browser by driving the real DOM: a masked `core.input` (FDWS v1.11) only commits its typed value into local state on a native `blur`/`change` event, not on every keystroke — and the popover's "Save" button reads that local-state value via `core.commitToHost` at tap-time. If the frequency field hadn't already lost focus by the time Save was tapped, the read-and-commit fired against the field's stale/empty seeded value, not what was actually typed. A real mouse click reliably blurs the previously-focused element before its own click handler runs (default browser focus-shift ordering), but that ordering isn't something to depend on across every touch/WebView combination a phone could be running.

Fixed by making the commit deterministic instead of timing-dependent: `InputComponent.js` gained `flushPendingEdit()` (commits a dirty pending edit immediately, independent of any DOM event), and `InteractionDispatcher.js`'s shared `runInteraction()` now calls `host.flushPendingEdits?.()` before processing any `'tap'`/`'longpress'` action — `CompositeWidget.js` and Widget Studio's `MockWidgetHost.js` both implement it by iterating their own renderers. Verified by mounting the actual widget definition and driving its real DOM (long-press → type digits via `input` events → tap Save with **zero** blur) end-to-end in a browser: preset array now commits and the label updates correctly every time.

## FDWS v1.22: session-only state persistence — 2026-08-29

User reported the COM1/COM2 collapsible radio widget's presets (fixed via v1.21, below) shouldn't actually be durable forever — different flights legitimately want different presets, and yesterday's frequencies silently surviving into today's flight is stale data, not a convenience. Neither existing value covered "survives switching pages mid-session, resets on next launch": `persist: false` doesn't even survive a page switch within the same sitting (`app.js`'s `switchPage()` destroys and rebuilds every widget instance on the outgoing page), and `persist: true` is durable via IndexedDB until manually cleared.

`state[].persist` gains a third value, `"session"`: written into the same in-memory widget-instance `config.state` `true` uses (so it survives a destroy/rebuild from page navigation), but the `WIDGET_CONFIG_CHANGED` event now carries a `sessionOnly` flag that makes `app.js`'s handler skip the `storage.saveProfile()` IndexedDB write — the one line that distinguishes durable from session-only. `com_flightdeck_com12combo.fdwidget`'s `presets` var updated from `persist: true` to `persist: "session"`. Widget Studio's state-var editor (`StudioLayersPanel.js`) changed from a Persist checkbox to a three-option select; `StudioValidator.js` extended to validate the new value and its array+syncFrom exclusion. Full spec: `docs/FlightDeck-Widget-Standard-v1.22.md`.

Caught a real syntax bug writing this feature's Studio UI: a tooltip string (`"...resets the next time it's launched..."`) had an apostrophe inside a single-quoted JS string nested in a template literal — confirmed by extracting the exact line into isolation and executing it (`SyntaxError: Unexpected identifier 's'`). Oddly, `node --check` on the full file didn't flag it either before or after the fix, for reasons not fully understood — verified this one by direct execution instead of trusting the whole-file syntax check. Fixed by rewording to avoid the contraction.

## FDWS v1.21: `persist:true` allowed on local-only array state — 2026-08-29

FDWS v1.2 §3.2 blocked `persist: true` on any `type: "array"` state var, unconditionally — reasoning at the time was that array state exists for bulk data streamed live from PC Bridge (`syncFrom`: flight plans, message queues), which shouldn't be persisted since it's re-populated fresh every connect. That reasoning never actually applied to a small, local, user-authored array with no `syncFrom` — but the rule as written blocked that case too. User's COM1/COM2 collapsible radio widget hit exactly this gap: its 4-slot preset array (edited via the existing `core.openWidgetPopover`/`core.commitToHost` popover flow) reset to blank on every reload, since array-typed persistence was unconditionally ignored regardless of the widget's own `persist: false` declaration matching what the old rule enforced anyway.

Loosened the rule to only reject the actual live-sync conflict: `persist: true` + `type: "array"` is now disallowed only when `syncFrom` is also set. `CompositeWidget.js`'s init warning and `setLocalState()`'s persist gate, `StudioValidator.js`'s matching warning, and `StudioLayersPanel.js`'s state-var editor (Persist checkbox now only disabled for array+syncFrom, re-evaluated live as either field changes) all updated. `com_flightdeck_com12combo.fdwidget`'s `presets` flipped to `persist: true` as the first real consumer (superseded by v1.22's `"session"` above, the same day, once the actual requirement turned out to be narrower than full durability). Full spec: `docs/FlightDeck-Widget-Standard-v1.21.md`.

## PC Bridge sync-loop bug: `updatedAt` clobbered on every push — 2026-08-29

User reported the PWA "kept syncing with PC Bridge continuously" after connecting, and separately that PC Bridge's config window ("SimVar Binding Profile Configuration") became fully unresponsive after saving a SimVar binding. Live log capture (relaunched PC Bridge from a terminal to watch output) caught the actual mechanism: `userPresetManager.js`'s `saveUserPreset()` unconditionally overwrote `data.updatedAt = Date.now()` on every save, regardless of whether the pushed item already carried a real timestamp from the client. Since the PWA's own local copy never learns the server's re-stamped time, the very next sync check's `computeDiff()` (which compares by `updatedAt`) always saw the PC's copy as newer, reported it "missing" on the client, and the resulting pull/push cycle re-triggered a fresh `USER_PRESETS_UPDATED` broadcast every round trip — a genuine, unbounded ping-pong with no external timer needed to sustain it, purely network-round-trip-paced (~1s per cycle in the captured log). The client side already did this correctly (`StorageManager.js`'s `saveProfile()` only stamps `updatedAt` if the incoming value is missing) — the PC Bridge side didn't match it. Fixed by making PC Bridge's stamp conditional the same way. The config-window freeze was very likely this loop (each cycle also re-triggered the SimVar-binding-rebuild path below, and its live-refresh listener) rather than a separate bug — confirmed clean after the fix: two legitimate connects, no repeating cycle, normal radio-tuning events flowing.

Separately hardened the config window's own live-refresh listener (`config-ui.html`) against a fast burst of `SIMVAR_BINDING_ERROR`/`SIMVAR_BINDINGS_UPDATED` broadcasts regardless of root cause — debounced (400ms) and re-entrancy-guarded instead of doing a full IPC round-trip + DOM rebuild per message.

## PC Bridge: isolate a bad SimVar binding instead of corrupting its whole polling batch — 2026-08-29

Root-caused a live bug: gauge/tape widgets bound to freshly-added `INDICATED ALTITUDE`/`GENERAL ENG RPM` SimVars showed no values at all. Cause: the unit field was set to `"number"` — not a real SimConnect unit for either variable (needs `"feet"`/`"rpm"`) — and PC Bridge's `config-ui.html` unit-field placeholder literally suggested `"number"` as an example, for any binding type. A SimConnect rejection of one field's `addToDataDefinition()` call used to silently corrupt every *other* field sharing its polling chunk too: the `simObjectData` reader walks the returned buffer assuming exactly as many values as were supposed to be defined, so one silently-rejected field leaves every field after it misaligned — garbage, not just missing.

Fixed properly rather than just documented: `addToDataDefinition()`'s return value (`sendId`, expressly provided by `node-simconnect` to correlate a later exception back to the call that caused it) is now tracked per-field. On a genuine SimConnect exception, `handleInvalidSimVarBinding()` traces it to the exact logical name, drops that one field from the chunk's order list, and triggers a debounced full rebuild of that chunk (`rebuildDynamicSimVarChunks()`, reusing the same rebuild path a reconnect already takes) — restoring correct buffer alignment for every other field instead of leaving them all corrupted. The bad binding is surfaced two ways: a live warning line in `bridge-ui.html`'s log, and a persistent red ✕ indicator next to the offending row in `config-ui.html` (parallel to the existing orange "auto-discovered, unmapped" ● indicator), refreshed via a new `SIMVAR_BINDING_ERROR` broadcast — which required also wiring `status-update` IPC messages through to the config window at all, since it turned out to only ever reach the tray/bridge window before this. Also fixed the actually-broken units in the live binding profile, and updated the placeholder/tooltip copy to stop suggesting `"number"` for a dimensional variable.

## PC Bridge now serves `https`/`wss` with a self-signed certificate — 2026-08-29

Flight Deck's PWA is hosted on GitHub Pages (`https://`), and `SimBridge.js`'s connection-URL resolution already auto-upgrades to `wss://` whenever the page itself is loaded over `https://` — but PC Bridge's `server.js` only ever spoke plain `http`/`ws`, so that upgraded connection could never actually succeed: browsers refuse to open a plain, unencrypted WebSocket from a secure page outright (blocked as mixed content, no override possible from JS). This is very likely also what was surfacing as an unexpected address-bar/security banner on an installed (fullscreen) PWA — Chrome/Android surfaces that UI on an otherwise chrome-less standalone PWA specifically when it detects an insecure connection attempt.

New `certManager.js` generates (and persists to `pc-bridge/certs/`) a self-signed certificate — via the already-installed `selfsigned` package — covering `localhost`, `127.0.0.1`, and every LAN IP `getLanInterfaces()` detects; regenerates automatically if the detected LAN IPs change (new network/router) or the cert nears its 2-year expiry. `server.js` now awaits that cert before creating an `https.createServer(...)` instead of plain `http`, with the WebSocket server attached the same way as before. Verified live end-to-end: `https://<LAN-IP>:8080/api/health` returns 200, `wss://` handshakes and streams real telemetry correctly.

Since a WebSocket handshake can't itself show a "this certificate isn't trusted" browser prompt, each device needs a one-time step: visiting `https://<PC's LAN IP>:<port>/api/health` directly in that device's own browser to accept the warning there first. Flight Deck's Settings page gets an "Open Trust Page" link that does exactly that, shown only when the resolved connection is `wss://`; PC Bridge's own startup log and `bridge-ui.html` explain the same step. Also fixed a live bug this surfaced: `SettingsView.js` derived the bridge's HTTP origin from its WebSocket URL with `wsUrl.replace(/^ws/, 'http')` — for `wss://` this produced the invalid `httpss://` (only the "ws" prefix matches; the trailing "s" was left behind).

## Blank-template FDWS staleness fix + live MSFS verification (found a real SimBridge telemetry bug) — 2026-08-29

Widget Studio's "Blank Starter Widget" (the template `promptNewWidget()`/`createNewPopoverWidget()` build every new widget/popover from) hardcoded `"fdws": "1.1"`/`"1.3"` regardless of which fields the author actually goes on to use — so a widget built from it using, say, a v1.20 `core.gauge` arc still exported declaring `"fdws": "1.1"` forever, since nothing in the authoring flow ever bumped it. `StudioTemplates.js` and `StudioState.js` now stamp both blank templates with `FDWS_VERSIONS`' own latest entry instead of a literal, so a freshly created widget always starts truthfully declaring whatever that build of Studio actually supports. (Studio-only fix, not tracked in the `flight-deck-pwa` git repo.)

Then tested the full FDWS v1.20 feature set live against a running MSFS 2024 session: launched PC Bridge, confirmed `SimConnect connected: SunRise`, connected `flight-deck-pwa`'s `SimBridge` to it over a real WebSocket, and built a widget combining the new arc gauge, scrolling tape, and digit-drum odometer, all bound to `com1ActFreq` (the one Deck Event with a real profile mapping already in place — this project has no flight/engine-instrument Deck Events like airspeed or N1 yet, a real gap, left for a future pass). All three rendered the live COM1 frequency (118.700 MHz) with mathematically exact values, independently recomputed by hand.

While wiring up the live connection, found and fixed a real bug in `SimBridge.js`'s telemetry handler: `const telemetry = packet.data ? { ...packet.data, ...packet } : packet;` re-spread the whole message envelope (`type`, `profile`, and the original nested `data` object) back on top of the already-flattened simvar values — so every telemetry frame with a `.data` wrapper silently queued three bogus "simvar" entries (`type`/`profile`/`data` as if they were readings) into `EventBus.ingestTelemetry()` alongside the real ones. Confirmed live: before the fix, a frame with no real values yet showed as `{ type: 'simData', profile: 'c1722', data: {} }` in the pending telemetry queue; after, an identical frame correctly showed only `{ com1ActFreq: 118.7 }`. Fixed to `packet.data || packet` — whichever one actually holds the values, used alone. Real simvar data was never lost by the old code (a valid `.data` payload still got merged in), just polluted with extra noise on every frame.

## FDWS v1.20 continued: tintable SVG faces, scrolling tapes, digit-drum odometers, HSI pivot helper — 2026-08-29

The rest of the advanced-instruments initiative (see the arc entry directly below), all shipped under the same v1.20 version since they were scoped together as one push.

**Tintable SVG instrument faces**: `core.image` gains `props.renderMode: "inline"` — an SVG asset is injected as live DOM markup instead of an opaque `<img>`, so any shape inside it authored with `fill="currentColor"` follows the component's own (already fully theme-resolved) `style.typography.color`, including that field's own state-driven Conditional Formatting rules. New `resolveAssetSvgText()` on both `CompositeWidget.js` and Widget Studio's independent `MockWidgetHost.js`. Verified live: an inline circle's fill correctly tracked an authored color.

**`core.tape`**: a new component type for scrolling airspeed/altitude/heading tapes — tick marks and labels generated from a few authored numbers (interval, major-every-N, px-per-unit), not a pre-drawn asset, computed fresh from the bound value on every update so it works for any open-ended range. Building it surfaced a real, previously-invisible timing bug: `CompositeWidget.render()`'s mount loop calls every component's *first* `update()` while the whole widget tree is still detached from the document (everything is built offscreen, then attached in one shot once the loop finishes) — harmless for every existing component (they only ever set CSS properties, never measure anything), but fatal for a component that needs its own real size on first render. Fixed with a one-shot `queueMicrotask` retry after the initial 0×0 measurement, which reliably runs after that synchronous mount completes regardless of whether the browser has produced an actual rendered frame yet — confirmed empirically that `requestAnimationFrame` and `ResizeObserver` callbacks do NOT reliably fire in this session's own verification harness (the Browser pane doesn't composite frames when not actively displayed), which is exactly why the microtask approach was needed rather than either of those.

**`core.display` `ODOMETER` format**: a mechanical rolling-digit-drum readout (classic 3-drum altimeter), each digit computed as `(value / 10^place) % 10` and positioned via a CSS percentage `translateY` — resolved at paint time, so (unlike the tape) it has no measurement-timing concern at all. Verified live: exact expected drum offsets for a 5-digit readout at value 4523.

**Widget Studio "Stack & Match Pivot"**: a new button in the existing multi-select Align/Distribute toolbar — copies the first-selected component's layout box onto the rest of the selection, and (for `core.gauge` layers) its Pivot too. Closes the last practical gap for authoring a multi-layer compass instrument (an HSI's rotating card + heading bug + course needle sharing one exact visual center) without hand-tuning col/row/w/h/pivot per layer.

Full field/format details: `docs/FlightDeck-Widget-Standard-v1.20.md`.

## FDWS v1.20: real curved `core.gauge` arcs with zone bands — 2026-08-29

First step of a broader initiative (user-requested, after an audit of every component's advanced-instrument capabilities) to make ANY flight-sim instrument widget — attitude indicators, N1/N2 arcs, CDIs/HSIs, airspeed/altitude tapes, mechanical digit-drum altimeters — fully buildable in Widget Studio with zero hand-edited `.fdwidget` JSON. The audit's headline finding: the one existing "advanced instrument" in the suite (the Garmin Attitude Indicator, built on `core.gauge.props.compose`) was itself never actually authorable in Studio when it was built — `compose` had no Inspector UI at the time, so it was necessarily hand-edited JSON, exactly the failure mode this initiative is closing.

`core.gauge` gains a fourth transform mode, `"arc"` — a real curved SVG sweep (`stroke-dasharray`/`stroke-dashoffset` on an inline `<path>`, computed from radius + start/end angle via straightforward polar-to-cartesian math), replacing the need to fake a circular dial with `arc-fill`'s straight-bar `scaleX()` hack or a pre-baked raster image. A new `props.arc` config carries radius/stroke width/angle span/colors plus an optional `bands` array — static colored zone segments (caution/redline) positioned by ratio (0–1) of the value range rather than raw value or angle, so they stay correctly placed if the sweep or value range changes later. `showFill: false` gets a pure zone-marker ring for widgets that want a separate rotating needle layered on top instead (same multi-layer-component convention the Attitude Indicator's rotate+translate composition already established) — this is genuinely one field slot per gauge (arc XOR needle-via-transform, stacked as separate components), not a merged multi-needle primitive.

Ships with full Widget Studio authoring UI in the same pass (per this project's standing "no JSON-only spec fields" rule, the exact rule `compose` broke the first time): an "Arc" transform option, a full field group (radius, stroke width, start/end angle, track/fill color pickers, show-fill toggle, line cap), and a Zone Bands row-list editor reusing the same add/remove editor `core.slider`'s Detents and `core.rocker`'s Zones already use — shown only when Arc is selected. `StudioValidator.js` warns (non-blocking) on a zero-width sweep or an out-of-range/backwards zone band. Verified live in the actual PWA runtime: installed a synthetic N1 gauge (240° sweep, a 90–100% redline band, bound to a state var at 82%) and confirmed the SVG path/arc-length/dashoffset math is exact to several decimal places, both at initial mount and after a value-driven `update()`. Full writeup: `docs/FlightDeck-Widget-Standard-v1.20.md`.

## Popover modal chrome theming + `core.label` empty-text fallback bug — 2026-08-28

User re-imported a widget bundled via the new v1.19 `popovers` field and found two real bugs live in the PWA. (1) The popover modal's own card chrome (`WidgetPopoverModal.js` in both flight-deck-pwa and Widget Studio — independent, non-synced implementations) was hardcoded to literal dark hex colors regardless of the app's theme or the popover definition's own styling, since that chrome belongs to the modal wrapper, not anything the popover author authors. Fixed in both copies to use the same theme-aware CSS custom properties (`--card-bg`, `--accent-cyan`, `--accent-cyan-glow`) the rest of each app already defines per `[data-theme]`.

(2) A `core.label` with an intentionally-empty `props.text` (e.g. a background/spacer label meant to render nothing) showed its own Studio-authoring `label` metadata field (e.g. "COM 1 BG") instead — but only sometimes, which is what made it look theme-specific. Root cause: `LabelComponent.update()` used `this.def.props?.text || this.def.label || ''`, and an empty string is falsy in JS, so it fell through to the metadata label every single render, in every theme, for any label with no binding. It stayed invisible for months whenever the component's authored typography color happened to equal its own background color (a real, documented trick for hiding leftover placeholder text — see `ThemeColor.js`) — the wrong text was always there, just camouflaged. The instant those two colors diverge for any reason (a manual `style.themeOverride`, or simply the color-contrast fix in the same session above), the camouflage breaks and the bug becomes visible. `render()` already had the correct `props.text !== undefined` check; `update()` now matches it. Confirmed via a live repro in the actual PWA (installed the widget, toggled `data-theme`, inspected the shadow DOM in both themes) that this was the true mechanism — an earlier same-session diagnosis blamed `ThemeColor.js`'s auto-derivation curve compressing panel/root contrast, which was a real, separate finding (worth a future look) but not what was actually happening here.

Audited the rest of the component library for the same `|| this.def.label` anti-pattern: `ButtonComponent.js` and `IndicatorComponent.js` already used the correct `!== undefined` check everywhere; `LabelComponent.js` was the only real-runtime offender. Widget Studio's own separate Design-canvas mock renderer (`StudioCanvas.js` — not synced from `shared/`, a hand-rolled preview independent of the real component classes) had the identical bug duplicated three times (`core.label`, `core.button`, annunciator label) and was fixed the same way.

## FDWS v1.19: bundle a widget's popover(s) into one exported `.fdwidget` — 2026-08-28

Since v1.3, a widget using `core.openWidgetPopover` and its popover-kind widget always had to ship and be installed as two separate files — a real papercut for a community widget author sharing one file that happens to use a popover, and a silent trap for the recipient (looks fine in the catalog until the moment someone triggers the interaction that opens the missing popover).

Widget root gains one optional field: `popovers` — an array of full `kind:"popover"` FDWS definitions embedded directly in the host. Purely a packaging convenience, not a runtime change: `popoverWidgetId` still resolves against the installed registry by id exactly as before. On import (`WidgetRegistry.installDefinition()` in the PWA, mirrored by `StorageManager.importWidgetDefinitionJSON()`), each embedded popover is installed/saved exactly as if it had arrived as its own file — own catalog entry, own PC Bridge push — then the `popovers` array is stripped off the host definition actually persisted, so nothing is stored twice. On export, the PWA's catalog drawer and Widget Studio's export flow both now collect the widget's own referenced `popoverWidgetId`s and inline whichever are installed/saved locally, replacing Studio's old behavior of downloading the host and each popover as separate files with a single bundled download; a referenced-but-not-yet-saved popover still can't be bundled (nothing to bundle), so Studio's export gate now only prompts for that case rather than for every popover-using widget by default. `SecurityValidator.js` validates each embedded entry by recursing into its own validator once (kind forced to `"popover"`, one level of nesting only — a popover can't itself open another popover). Widget Studio's import flow additionally registers a bundle's embedded popover(s) into the local saved-widgets library, so they're immediately available to the `popoverWidgetId` picker and to a later re-export. Full writeup: `docs/FlightDeck-Widget-Standard-v1.19.md`.

## FDWS v1.18 fixes + ecosystem compatibility audit — 2026-08-28

Two problems found right after v1.18 shipped: (1) an earlier edit to `shared/widgets/components/BaseComponent.js`'s color-resolution block silently failed to apply (a stale `Edit` result was misread as already-applied) — its `applyStyles()` still called the removed `themeAdjustComponentColors()` by name, throwing `ReferenceError` on every component render and leaving Widget Studio's Device View blank. Fixed by actually applying the intended change (now uses `resolveThemedColors()`/`resolveThemedBackground()`, matching every other updated call site) and re-synced to both apps. (2) A full ecosystem audit (same pattern as the v1.17 pc-bridge audit below) checked every FDWS-version/component-type/field allowlist in the suite for v1.18 compatibility: `pc-bridge`'s widget/profile sync stays fully opaque to widget internals (revision/updatedAt-based, never inspects `style.*`) so it needed no changes; `SecurityValidator.js`'s import gate and `StudioValidator.js`'s Specification Validator both already derive `FDWS_VERSIONS`/component types from the one shared registry; widget export (`.fdwidget`/JSON/clipboard) round-trips the whole definition object with no field allowlist; Copy/Paste Style already deep-clones the whole `style` object, `themeOverride` included; Widget Popovers construct their `CompositeWidget`/`MockWidgetHost` instances against the popover's own definition, so `baseTheme`/`themeMode` propagate automatically with no popover-specific code needed. One real gap found and fixed: `StudioValidator.js` had a `revision`-malformed-value warning but no equivalent for `baseTheme`/`themeMode` — added, matching `SecurityValidator.js`'s identical check. `scripts/check-registry-drift.mjs` passes clean.

Verified live end-to-end after the fix: Widget Studio's Device View renders again, the Specification Validator reports full v1.18 compliance, and the real PWA runtime (a placed NAV 1 Radio widget, both dark and auto-derived-light rendering) works with zero errors.

## FDWS v1.18: manual per-theme styling (`baseTheme` / `themeMode` / `style.themeOverride`) — 2026-08-28

Every widget's colors were always authored once for dark mode, with light mode produced automatically (`ThemeColor.js`'s HSL derivation, see the 2026-08-27 theme-aware-widgets entry below). That's a good default but not always the right one — a saturated accent can drift somewhere an author wouldn't pick by hand, and there was no way to fix just that without opting the whole widget out of theming.

Widget root gains two optional fields: `baseTheme` (`"dark"`, default | `"light"` — which theme `style.*` is literally authored for; flipping it alone recolors nothing, it just changes which theme is "authored" vs. "derived") and `themeMode` (`"auto"`, default, unchanged behavior | `"manual"`). In manual mode, any component (and the widget root) can carry a `style.themeOverride` — literal typography/border color and/or a whole background descriptor for the *non-base* theme; any field left unset keeps auto-deriving, so manual is never all-or-nothing per component. `ThemeColor.js` also now derives symmetrically in either direction (light-authored → dark-derived, mirroring the original dark → light curves), not just the original one-way case.

Widget Studio: a new "THEME" panel (widget root Inspector) sets `baseTheme`/`themeMode`; flipping to Manual seeds every component's override from its current auto-derived value as an editable starting point rather than a blank one. The existing Live Theme Preview toggle doubles as "which theme am I editing" — while in Manual mode and previewing the non-base theme, every component's Text/Border/Background Color fields target the override instead of the base style, with a small banner making that explicit. Edit View's Design canvas, Device View, and the real PWA runtime all resolve overrides identically (three new shared resolver functions in `ThemeColor.js`, used everywhere the old direct derivation calls used to be). Full writeup: `docs/FlightDeck-Widget-Standard-v1.18.md`.

## Page Presets (auto-fork/revert), SimVar Binding Profile rename + storage split, widget-uninstall cleanup — 2026-08-27

User asked how presets/widgets/components are saved between PC Bridge and the PWA, which surfaced three real gaps: no "Page Preset" concept existed at all (editing one page always re-saved the *entire* Profile, and doing so on the shipped default silently never reached PC Bridge, since `isDefaultProfile` gated the sync push); PC Bridge's SimVar/Deck-Event mapping tables (user wants these renamed "SimVar Binding Profile," having been mislabeled "aircraft profile") were mirroring into the exact same `pc-bridge/page_presets/` folder `userPresetManager.js` uses for real page-layout data — confirmed live and bidirectional, not just a naming nit: `userPresetManager.load()` ingests every `.json` it finds there unconditionally, so the two stray mapping-table files already on disk (`profile_1787549596070.json` "c172", `profile_1787549985754.json` "c1722") were being miscounted as page presets; and deleting a custom widget never cleaned up the Deck Events it auto-registered, so `config-ui.html`'s Custom tab kept showing groups for widgets long gone, with no uninstall UI anywhere in PC Bridge to even trigger a delete.

**Page Presets — overlay/fork data model (`flight-deck-pwa`):** `Profile.js` gained `parentProfileId` (set only on an auto-forked "Custom" App Profile) plus `hydrateInheritedPages()`/`hasOwnPage()`/`removeOwnPage()`/`promoteToOwnPage()`. A fork only ever stores the pages it actually overrides — `toJSON()` excludes anything still just inherited — and any page it doesn't override resolves live from its parent at activation time (`app.js`'s new `activateProfile()`, now the single path everywhere a profile gets loaded, replacing every direct `new Profile(raw)`). `handleSaveLayout()` now runs `ensureEditableProfile()` first: editing a page while a shipped default is active auto-forks (or reuses an existing fork of that same default) via `forkFromDefault()`, moves just the edited page in as a real override, and switches to it; editing a page in an existing fork that's still only inherited promotes it in place. A new "Revert Page" toolbar button (`EditToolbar.js`) removes one page's override and re-hydrates the default fallback, leaving every other overridden page in the same fork untouched — verified live that reverting Autopilot after also editing Lights left Lights' override intact and Autopilot's widget layout back at its shipped position. New profile/page ids are readable slugs (`Profile.slugifyName()`, e.g. `custom_a91f`) instead of `profile_<timestamp>`. The nav menu (`index.html`'s `#menu-dropdown`) was static HTML with nothing reading `profile.pages`; `app.js`'s new `renderPageMenu()` now injects any page outside the shipped default set, plus a "+ Add Page" action (`handleAddCustomPage()`) that forks first if needed. Also patched a bug this model would otherwise have introduced: the pre-existing `WIDGET_CONFIG_CHANGED` runtime-preset handler saved `activeProfile.toJSON()` directly, which would have silently dropped a runtime update (e.g. a radio preset set from PC Bridge) landing on a still-inherited page in a fork — now promotes the page first. Verified end-to-end live (scripted against `window.flightDeck`): fork-on-first-edit, fork reuse across a second page, per-page revert, custom page creation + menu injection, and a full page reload all round-tripped correctly through IndexedDB.

**SimVar Binding Profile rename + storage split (`pc-bridge`):** New `STORAGE_DIRS.bindingProfiles` (`pc-bridge/binding_profiles/`) in `userPresetManager.js`; `profileManager.js`'s `saveProfile()`/`deleteProfile()` mirror writes moved there from `STORAGE_DIRS.pagePresets`. `userPresetManager.load()` now migrates any stray binding-profile-shaped file it finds sitting in `page_presets/` (has `mappings`/`simVars`, no `pages` array) into `binding_profiles/` on next startup instead of loading it as a page preset — verified against copies of the two real stray files in isolation, both migrated correctly with zero false positives left in `page_presets/`. UI text relabeled "Aircraft Profile" → "SimVar Binding Profile" in `config-ui.html` (title, profile-selector label, new-profile placeholder) and `bridge-ui.html` (card label, new binding-profiles count box + folder button); PWA-side profile UI relabeled "App Profile" for consistency (`ProfileSelector.js`, `index.html`) so the same word doesn't describe two different concepts across the two apps. New profile ids in both `config-ui.html` and `ProfileSelector.js`/`Profile.js` are readable slugs, same pattern as Page Presets above. Wire protocol (IPC channel names, JSON field names `mappings`/`simVars`) deliberately left unchanged — pure relabel/storage fix, no behavior change to the sync protocol.

**Widget-uninstall Deck Event cleanup (`pc-bridge`):** New `profileManager.unregisterDiscoveredVars(widgetId)` strips every `mappings`/`simVars` entry stamped `discoveredFrom === widgetId` across all profiles — the removal counterpart `registerDiscoveredVars()` never had. Wired into the existing PWA-initiated `DELETE_USER_PRESET` WebSocket handler (`server.js`) and a brand-new `uninstall-widget` IPC handler (`main.js`), the latter backing a new per-widget list + "Uninstall" button in `bridge-ui.html`'s Widgets card — there was previously no way to uninstall a widget from within PC Bridge at all, only a folder-open button. Added `notifyUserPresetsUpdated()` export from `server.js` so both the WebSocket and IPC delete paths broadcast the same live-refresh event to connected PWA clients.

`node --check` clean on every touched `pc-bridge` file (`profileManager.js`, `server.js`, `main.js`, `userPresetManager.js`); `bridge-ui.html`/`config-ui.html` reviewed but not runtime-testable outside Electron (`require('electron')`) — worth a manual pass in the packaged app.

## pc-bridge fix: DEFAULT_COMPONENT_TYPES was stale since FDWS v1.2 — 2026-08-27

Follow-up to the `core.divider` addition below: audited the whole codebase for anything else that might reject/mishandle the new type or `"fdws":"1.17"`. Everything in `widget-studio`/`flight-deck-pwa` checked out clean (`StudioValidator.js`'s component-type and FDWS-version checks are both derived dynamically from `PropertyRegistry.js`, not hardcoded), but `pc-bridge/userPresetManager.js`'s `DEFAULT_COMPONENT_TYPES` set — which stops a user-saved *custom component* file (a PC-Bridge-specific building block, unrelated to a widget's own `components[]` array) from colliding with a built-in `core.*` name — was missing seven types that shipped in FDWS v1.2 (`core.gauge`/`slider`/`selector`/`rocker`/`list`/`ref`/`pad`), not just the new `core.divider`. Added all eight. Low real-world impact (`pc-bridge/components/` is empty today, so nothing was actually colliding), but the list is now a complete match for the current core component catalog instead of silently stuck at a pre-v1.2 subset.

## FDWS v1.17: core.divider — a grid-snapped separator line — 2026-08-27

User asked for a way to draw a simple line in Widget Studio to separate sections (e.g. a COM1 block from a preset-button block) — with adjustable color, weight, and dash style, ideally freeform-or-grid-snap. Recommended and built the grid-snapped version: a true freeform any-angle line (independent two-endpoint geometry, its own draw/drag-endpoints interaction in the Design canvas) would have been a materially bigger feature with no shared authoring machinery with the rest of the component system; grid-snapped fully covers the requested use case and reuses everything that already exists (palette drag, grid resize, Property Inspector).

**New:** `core.divider` (FDWS v1.17, [`docs/FlightDeck-Widget-Standard-v1.17.md`](docs/FlightDeck-Widget-Standard-v1.17.md) — additive, no breaking changes). `props.orientation` (`horizontal`/`vertical`) is its only new field — thickness/color/dash-style deliberately reuse the existing `style.border.width`/`.color`/ the new `.style` instead of a parallel schema, so a divider's color is theme-aware for free (same `ThemeColor.js` border-color derivation every other component's border already gets) and it's edited with the Inspector's existing Border controls, not a new panel.

**Also new (generic, not divider-specific): `style.border.style`** — `solid` (default, unchanged prior behavior) | `dashed` | `dotted`. Any component's border can use it now, not just a divider's line.

Implementation:
- `shared/widgets/components/DividerComponent.js` (new) — draws a zero-size inner node with a single-edge CSS border (`border-top`/`border-left` depending on orientation), theme-adjusted via the same `themeAdjustColor()` every other component's border already uses.
- `shared/widgets/components/ComponentRegistry.js` — registered `core.divider`.
- `shared/widgets/components/BaseComponent.js` — generic border application now reads `border.style` (was always hardcoded `'solid'`).
- `shared/widgets/PropertyRegistry.js` — `FDWS_VERSIONS` includes `'1.17'`; `COMMON_FIELDS` gained `style.border.style`; `TYPE_FIELDS['core.divider']` documents `props.orientation`. Both `SecurityValidator.js` and `StudioValidator.js` already import `FDWS_VERSIONS`/component types from this one file, so no separate validator edits were needed for either the new version or the new type.
- `widget-studio/js/StudioLayersPanel.js` — new "Divider Line (v1.17)" palette entry (Text & Display category) with sensible defaults; `addComponentFromPalette()` now supports a per-template `defaultStyle` override (a divider wants a Border default, not the usual typography default every other type gets) — every other palette entry is unaffected.
- `widget-studio/js/StudioInspector.js` — `core.divider` case in the type-specific properties panel (Orientation dropdown), plus a new "Border Style" dropdown (Solid/Dashed/Dotted) in the Border section every component type's Inspector already has.
- `widget-studio/js/StudioCanvas.js` — matching `core.divider` case in the Design-canvas's own separate mock renderer, so Edit View's preview looks identical to Device View/the real PWA.
- `flight-deck-pwa/css/widgets.css` / `widget-studio/css/widgets.css` — small `.fd-comp-divider-line { flex-shrink: 0; }` rule in each (everything else is inline).

**Verified live**, in all three rendering surfaces: Edit View's mock preview, Device View's real `ComponentRegistry`-driven renderer, and — after discovering an active PWA service worker was silently serving stale cached JS during this check (unregistered + hard-reloaded to get past it) — the real `flight-deck-pwa` files directly. Dark→light border-color derivation matched exactly across all three (`rgb(51,65,85)` → `rgb(197,203,211)`), dash style and thickness held. Specification Validator run against a `core.divider` widget reports full v1.17 compliance with no unrecognized-type warning. Palette → Inspector → rendered-output round-trip confirmed via the actual "+ Add Divider Line" click path, not just scripted definitions.

## Widget Studio fix: a gradient typed into "Background Color" silently broke light-mode theming — 2026-08-27

User set the p1 button's background to a gradient in Widget Studio and reported it stayed dark in light mode — in both Widget Studio and the real PWA.

Root cause: the "Background Color" field pairs a native `<input type="color">` (hex only) with a free-text sibling, deliberately unrestricted so an author can type `var(...)`/`rgba(...)` values the color picker can't produce. That same freedom let a full `linear-gradient(...)` string get typed into it while Background Type stayed on "Solid Color," saving `{ type: "color", color: "linear-gradient(...)" }`. That's valid CSS on its own — `background: <that string>` paints correctly the very first time — so it looked like it worked. But `ThemeColor.js`'s `themeAdjustColor()` (the code that derives a light-mode counterpart, from [[project_theme_aware_widgets]]'s theming work two fixes back) expects `background.color` to actually *be* a color; fed a gradient string, it finds nothing parseable and returns the string unchanged for both themes — so the exact same dark gradient renders in light mode too, with no error anywhere. Confirmed against the user's real `.fdwidget` file: `button_ez2`'s `style.background` was exactly this malformed shape (`type: "color"` holding a `linear-gradient(...)` value), while every other gradient-background button in the same file was correctly `type: "gradient"` with the string under `gradient` — this one component alone had the mistyped shape.

Three-part fix:
1. **Data**: corrected the user's own widget file directly — `button_ez2`'s background is now `{ type: "gradient", gradient: "linear-gradient(...)" }`, matching every other gradient button in the file. Verified live: the button's derived light-mode gradient (`rgb(228,231,235)`/`rgb(234,236,240)`) now differs correctly from its dark one (`rgb(27,38,54)`/`rgb(9,13,20)`), matching the other gradient buttons.
2. **Prevent it going forward**: `StudioInspector.js`'s Background Color field (both the per-component editor and the widget-root Canvas Appearance editor) now detects a `linear-/radial-/conic-gradient(...)` value on `change` and auto-switches Background Type to "CSS Gradient" instead of saving it under `color`, with a toast explaining why. Verified live: typing a gradient string into the field and firing `change` produces `{ type: "gradient", gradient: "..." }`, not the broken shape.
3. **Catch what's already broken**: `StudioValidator.js` now warns when `background.type === "color"` but `background.color` looks like a gradient function — "renders correctly in dark mode but won't adapt to light mode." Verified live: running the validator against a component still holding the old malformed shape surfaces the warning.

No FDWS impact — `style.background.type`/`.gradient`/`.color` are all pre-existing fields; this was purely an authoring-tool data-shape bug plus a defensive validator addition.

## Widget Studio: edit existing interactions, stop modals closing on outside click — 2026-08-27

Two small fixes from the same user, same day.

**Interaction triggers can now be edited in place**, not just added/deleted. The Behavior group's interaction cards previously only had a ✕ delete button — changing anything about an existing trigger meant deleting it and re-adding it from scratch, losing any fields you weren't touching. `StudioInspector.js`'s `openAddInteractionModal(comp, editIdx)` now takes an optional index; when present, it prefills the Trigger/Action dropdowns, every action-specific field (event, value, fromStateRef, field(s), popover + context rows, contextKey, ack event), and the Feedback haptic/sound selects from that interaction's own saved values, retitles to "Edit Interaction Trigger," and on submit replaces that array index instead of appending. Prefill only applies when the Action dropdown still matches what was saved — switching to a different action type mid-edit falls back to the same fresh defaults Add already uses, since the old fields don't mean anything for a different action. A new ✎ button sits next to each card's ✕. Verified live (scripted against the running Studio instance): editing a `core.dispatchEvent` trigger's value from 42→99 replaced the interaction in place (array length stayed 1) with every other field intact.

**Modals no longer close on an outside/backdrop click.** `StudioModal.js`'s shared `openModal()` had `overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(null); })` — a stray click just outside the card (easy to trigger on a wide form like Add/Edit Interaction Trigger) silently discarded the whole in-progress form with no confirmation. Removed that handler; added Escape-to-close instead, so there's still a keyboard-driven way out beyond the ✕/Cancel buttons. This is the shared modal helper every Studio modal goes through (confirm dialogs, Add/Edit Interaction, etc.), so the fix applies everywhere at once. Verified live: a click on the overlay leaves the modal open; Escape closes it.

## Widget Studio fix: Device View buttons weren't reacting to the Live Theme Preview toggle — 2026-08-27

User reported that after the theming work earlier today, a button with no author-set `style.background` (relying on the runtime's own default button color) switched correctly in Edit View but stayed dark in Device View.

Root cause: `studio.css` carried a large dead block, "AVIONICS RUNTIME COMPONENT SYSTEM (STUDIO & DEVICE VIEWPORT)" (~170 lines at the end of the file), left over from an old prototype render path. It redefined `.fd-comp-btn-inner`, `.fd-btn-swap`, `.fd-comp-input-wrapper`, and `.fd-comp-display` with hardcoded, non-theme-aware literals (e.g. `background-color: #162030`) — the exact same class names the *real* `ButtonComponent`/`InputComponent`/`DisplayComponent` (`shared/widgets/components/`) use, which are correctly styled in `widgets.css` with `var(--btn-bg, ...)`. Since `index.html` loads `widgets.css` before `studio.css` and both rules have equal specificity, the dead block always won the cascade — silently overriding the theme-aware default for any component that doesn't set an explicit literal color (an explicit `style.background` always wins as an inline style regardless, which is why authored colors and gradients were unaffected and why this was easy to miss). Edit View was never affected because `StudioCanvas.js` renders its own separate lightweight preview DOM, not the real component classes — only Device View (which intentionally uses the real renderers via `ComponentRegistry`, per the "real component renderers" design from the 13-item batch) hit this.

Fix: deleted the dead block from `studio.css`, keeping only `.fd-device-composite-root` (the one rule in it that's actually unique/still used). Verified live: a `variant: "momentary"` button with no `style.background` now correctly resolves `#1a1e2b` in dark / `#e2e8f0` in light inside Device View, matching Edit View and the real `--btn-bg` token values; toggle/swap buttons (which set an explicit gradient) were unaffected before and after, confirming the fix is scoped to the CSS-default fallback path. `.fd-comp-display`/`.fd-comp-input-wrapper` were also silently affected by the same dead block (no CSS default background either way — matches the real widgets.css/PWA behavior of leaving those transparent unless the widget author sets one) and are fixed by the same deletion, though no live widget in this session exercised that path with a missing background to regress.

## Widget Studio follow-up: gated Move Widget toggle, toolbar button placement, collapsed template gallery, adaptive outline color — 2026-08-27

Same-day follow-up to the 13-item UX batch above, four more items from the same user.

**Device View's drag handle is now opt-in via a "Move Widget" toggle.** User liked being able to drag-reposition the active widget (shipped in the batch above) but didn't like the small blue corner handle sitting on top of the widget's own content by default. Added `StudioDeviceView.moveWidgetMode` (off by default, a plain instance field — position itself already isn't part of the widget def, so there's nothing here that needs to persist or survive a reload either), a new toggle button next to the Col/Row fields, and gated the drag handle's very existence on it in `renderWidgetInstanceInsideDevice()` — off means no handle in the DOM at all, not just hidden, and dragging is impossible; the Col/Row fields keep working either way. Verified: handle absent by default, appears/disappears correctly across a full toggle round-trip.

**Grid-overlay and theme-preview toggle buttons moved next to the zoom controls in Device View**, matching where their Edit-view equivalents already sit (`canvas-header-right`, immediately before the zoom cluster) — they'd been sitting in `device-header-left` instead, inconsistent with Edit view's own layout. Pure DOM reordering in `initDOM()`'s header markup, no behavior change. Verified the resulting `device-header-right` child order matches Edit view's pattern exactly.

**Library tab's template gallery is now collapsed by default.** It used to render fully expanded above "My Saved Widgets"/"My Saved Popovers," so reaching your own library meant scrolling past the entire built-in template set every time. `StudioLayersPanel.js`'s `renderTemplatesTab()` now wraps the template cards in a native `<details>`/`<summary>` (no `open` attribute) instead of a plain header + list — free collapse/expand and keyboard support with zero new state to manage, styled to match the existing `.panel-section-header`/`.panel-title` look plus a rotating chevron. Verified: "MY SAVED WIDGETS" sits ~213px from the top of the panel collapsed vs. ~1480px expanded — confirms the templates are genuinely removed from layout when collapsed, not just visually hidden.

**Component-outline color now adapts to the widget's own background**, replacing a single flat `rgba(148,163,184,0.28)` the user reported as "very thin and light grey, hard to see" — accurate: that gray had barely any contrast against a dark-authored widget (the common case in this app) and was still weak against a light one. `StudioCanvas.js`'s `applyWidgetStyles()` now computes the widget's effective root background (the resolved literal color when one's authored, else the canvas's own theme-appropriate default backdrop) via a standard relative-luminance weighting (`hexPerceivedLightness()` — green reads far brighter to the eye than blue at the same numeric value, so a plain RGB average would misjudge some colors), and sets a `--outline-color` custom property consumed by the `.no-outlines`-gated CSS rule: light outline on a dark widget, dark slate outline on a light widget. Width also bumped 1px→1.5px for general visibility. Verified live by forcing the widget root background to `#f8fafc` (outline flipped to `rgba(15,23,42,0.55)`) and `#0a0c10` (flipped back to `rgba(255,255,255,0.55)`).

**Verified live** (temporary alternate-port Studio instance): `node --check` clean on every touched file, CSS brace-balanced, zero console errors across the full pass. Docs updated to match: `widget-studio/README.md`'s Edit/Device View, Live Theme Preview, and Community Deck Events Packs bullets, plus a new Library-tab bullet.

## Widget Studio UX batch: zoom/fit rewrite, Interactive Sim mode removed, layer visibility toggles, live state values, and five real bugs found along the way — 2026-08-27
## Widget Studio UX batch: zoom/fit rewrite, Interactive Sim mode removed, layer visibility toggles, live state values, and five real bugs found along the way — 2026-08-27

User handed over a 13-item punch list covering most of Widget Studio's chrome. No FDWS/spec change anywhere in this entry — every item is Studio UI or its own rendering, not the wire format.

**Interactive Sim mode removed entirely.** `StudioCanvas.js` used to have two edit sub-modes (`editSubMode`: `'design'`/`'simulate'`), the second a full duplicate live-interactive canvas (its own inline mock widget host, `ComponentRegistry`-driven renderers, its own reactive dispatch). User only wants Design + Device View. Removed `renderInteractiveSimComponents()` (~130 lines) and its four now-dead imports, `StudioState.editSubMode`/`setEditSubMode()`, the mode-pill buttons and their CSS. Device View already covers everything Interactive Sim did (real renderers, real taps/longpresses, reactive bindings) plus a device frame it never had.

**Zoom/fit was fundamentally broken in both viewports — found via user report ("large widget doesn't fit at 100%", "Fit just resets to 100%", "mobile device View clips at the top") and confirmed as one root cause in both places:** `.canvas-viewport-content` / `.device-viewport-stage` were `display:flex; align-items:center; justify-content:center` around a `transform:scale`'d child. `transform` never changes an element's own layout box, so at zoom≠100% the scaled content's overflow split evenly on every side of a flex-centered box — and a plain `overflow:auto` ancestor can only scroll toward positive offsets from the top-left, never to a centered child's "negative" overflow. Content past a certain size was genuinely unreachable no matter how far you scrolled; "Fit" (`Math.min(1.0, ...)`) also could never zoom IN, so a small widget just looked like a no-op reset.
- **Fix**: both scaled elements now use `transform-origin: top left`; the old flex-centered wrappers are plain blocks; a new `positionCanvasContent()`/`positionDeviceContent()` computes symmetric padding in JS each render — centered when content fits, collapsing toward a minimum (never negative) once it doesn't, so every pixel stays reachable by ordinary scrolling regardless of zoom or grid size. Device View needed a structural change too — a new `stageContentElement` wrapper, since the old two-level structure would have made `.device-viewport-stage` (the scroll container) both the measurement target AND the padding target, a circular read (padding changes your own `clientWidth`).
- `fitZoomToContent()`/`autoFitDevice()` now run automatically on `WIDGET_DEF_LOADED`/`WIDGET_LAYOUT_UPDATED`/switching into that view, not just the manual "Fit" click — opening a widget larger than the last one no longer opens clipped at a stale zoom. No cap at 1.0 anymore, so a small widget/device correctly zooms in past 100% too.
- Verified: loading the user's 40×20-grid widget auto-computed zoom=0.23 (was defaulting to 100%, clipped); switching Device View to a compact-portrait device auto-computed scale=0.64 with padding collapsed to the 30px minimum on the constraining (vertical) axis.
- Zoom granularity: 25% steps over [50%, 200%] (Edit) / 15% steps over [40%, 150%] (Device) → 10% steps over [10%, 300%] in both, per the user's "more granular zoom" ask.

**Grid-lines and outline toggles did nothing — two separate root causes, both found by reading, not guessing:**
- Grid lines: `applyWidgetStyles()` unconditionally set an *inline* `backgroundImage: 'none'` every render. An inline style always wins over a stylesheet rule for the same element/property regardless of which class is present, so `.canvas-widget-grid:not(.no-grid-lines)`'s dot-grid rule had nothing left to reveal — the button's own class/active-state toggled correctly, there was just nothing left for it to control. Fixed by clearing to `''` instead of `'none'`, so the stylesheet rule (or the widget's own background-image branch, when it has one) takes over again.
- Component outlines: the `.no-outlines` class was toggled correctly but **never had a CSS rule at all**, in either direction — the "toggle component outlines" feature was never actually implemented, just its button. Added `.canvas-widget-grid:not(.no-outlines) .studio-component-node { outline: 1px dashed ...; }`, distinct from and beaten by the existing stronger `.hovered`/`.selected` outlines.

**Drag alignment guide lines removed** per request — `updateAlignmentGuides()`, its call sites in `startDraggingComponent()`, and the `.canvas-guide-line*` CSS all deleted.

**Device View's background silently ignored the theme-preview toggle — the specific bug the user reported ("switch to Device View in light mode, background remains dark").** `.device-screen`'s background was a hardcoded literal (`#090c12`), never a `var(...)` reference, so it never consumed `.fd-widget-preview-scope`'s light-mode token block even though the element already had that class and a `data-theme` attribute. Changed to `var(--bg-main, #090c12)` — this represents the simulated app's own page background (behind the mock topbar/widgets), so it should track the toggle like everything else drawn inside the screen. The physical device bezel (`.device-frame`) is deliberately left hardcoded — it's hardware chrome, not app UI, the same way a real phone's plastic case doesn't recolor with its OS theme. Also added a second theme toggle button directly in Device View's own header bar (the canvas toolbar's button isn't visible while you're in Device View at all), wired to the same shared `StudioState.previewTheme` as the Edit-view one.

**A related, `componentType`-scoped color bug, also user-reported ("p1 button still shows up dark in light mode"):** traced to `renderComponentVisual()`'s mock fallback for an unstyled `core.button` background — hardcoded `'#1e293b'`, while the REAL default (`widgets.css`'s `.fd-comp-btn-inner { background: var(--btn-bg, #1e293b); }`) is genuinely theme-aware and already went light correctly in Device View/the real PWA. Design mode's own placeholder just never matched. Fixed to `bgColor || 'var(--btn-bg, #1e293b)'` — resolves against the same `.fd-widget-preview-scope` block, zero extra logic. Verified: the user's `button_ez2` ("p1", `variant:"momentary"`, no authored background) now resolves to `#e2e8f0`, `main.css`'s real light `--btn-bg`.

**Hide layer groups/components in the editor** (Layers panel): new eye-toggle per row, `StudioState.hiddenInEditorIds`/`hiddenLayerGroupIds` (two `Set`s, same session-only pattern as `multiSelectedIds` — never touches `widgetDef`, so it's structurally impossible for a hide-in-editor toggle to leak into a save/export, both of which JSON-clone `widgetDef` alone). `StudioCanvas.js`'s `renderDesignComponents()` skips a hidden component/group; Device View and export both iterate `def.components` directly and were never touched, so they always show everything regardless. Verified both directions live: hidden component vanishes from Design canvas, still renders in Device View.

**Layers tab now lists highest-Z first**, per request. Two things needed fixing, not one: `StudioLayersPanel.js` was already computing `effectiveZ` for the on-screen badge but never sorting by it (raw array order), and layer GROUPS themselves were iterated in their own raw declaration order regardless of `group.z`. Fixed both — one `.sort((a,b) => b.effectiveZ - a.effectiveZ)` on the filtered component list (inherited for free by the grouped/ungrouped derivations, since filtering preserves order), and a second sort on the group iteration itself. Verified against the user's widget: Z values now read `[160,150,150,150,150,150,110,110,110,110,110,100,20,20,20,20,20,20,20,20,10]`, strictly descending.

**Removed the live-rendered component preview swatch** from the top of the Property Inspector, and its `buildLivePreviewNode()` method, per request.

**Property groups (SIMVARS & BINDINGS, VISIBILITY & GUARD, typography/border/background, ...) get real visual separation** — they previously used a `rgba(255,255,255,0.02)` header tint, nearly invisible against the `.prop-field` rows inside. Every group goes through the same `buildAccordionGroup()` template, so one CSS change fixed all of them: a cyan-tinted header background + a 3px left accent bar, `.group-title` recolored to the accent.

**Undo/Redo were stacked vertically, not inline** — `.action-btn-group` (their wrapper) had no CSS rule at all, defaulting to `display:block`; `.bar-btn` is itself `display:flex`, which blockifies its own outer box, so two block-level buttons in a block parent stacked. Added `.action-btn-group { display:flex; align-items:center; gap:8px; }` — the one-line fix once actually diagnosed. Verified both buttons land at the identical Y-offset now.

**Device View: removed the hardcoded "TRANSPONDER" ambient companion widget**, and added real drag-to-reposition for the active widget via a small corner handle on the slot (not the whole slot — Device View's content is *live*-interactive, unlike Design mode's static mock, so making the whole slot draggable would fight every one of the widget's own tap/longpress handlers; the handle is the one always-safe grab point). **Found and fixed a real pre-existing crash along the way**: the Col/Row position inputs called `this.state.setDevicePlacement(...)`, which was never defined anywhere in `StudioState.js` — every position edit via those inputs has been throwing since that UI shipped. Added the missing method (mirrors `setDeviceOrientation`'s shape), which both the numeric inputs and the new drag handler now share.

**State tab shows each local state var's live current value**, not just its declared default — updates in real time while interacting with the widget in Device View, so an author can confirm a tap/input actually changed the state they expect. New plumbing: `MockWidgetHost.js`'s `createMockHost()` accepts an optional `onLocalStateChange(name, val)`, fired from `setLocalState()` (and so, transitively, `swapLocalState()`); `StudioDeviceView.js` wires it to a new `StudioState.setLiveStateValue()` (a plain `Map`, reseeded on `WIDGET_DEF_LOADED`, skips its own notify when a value hasn't actually changed so `SIM_TELEMETRY_UPDATED`'s frequent re-renders don't thrash the State tab). Verified end-to-end with a real simulated tap (not a direct state-setter call) on the rendered COM2 toggle button in Device View: the State tab's "Current:" line for `com2visible` updated `false` → `true` live.

**Verified live throughout** (temporary alternate-port Studio instance): `node --check` clean on every touched file; zero console errors across the full test pass — loading the user's widget, toggling every button, dragging the device widget, tapping a live component, switching Edit ↔ Device repeatedly. One disclosed gap: the verification session's browser pane doesn't composite frames (no user has it open), so `transform`/`getBoundingClientRect` reads on scaled elements returned pre-transform values even though the inline styles, computed zoom math, and non-transform computed styles (background-color, flex layout, outline) all checked out correctly and consistently — worth a quick visual spot-check by the user, though there's no structural reason to expect `transform: scale()` (completely standard CSS) to behave differently in a real, visible browser.

## Custom widgets are now light/dark theme-aware — auto-applied in the PWA, live-previewed in Widget Studio — 2026-08-27

User asked whether the PWA's existing dark/light toggle could work for custom widgets — it didn't: widget colors (`style.background.color`, `style.border.color`, `style.typography.color`) are authored once as literal hex and written straight into inline styles by `BaseComponent.applyStyles()`, never touching the app's `[data-theme]`-driven CSS custom properties. **No FDWS spec change anywhere in this entry** — everything below derives entirely from fields that already existed (`style.*.color`, a component's `type`, its `layer.group`); `FDWS_VERSIONS` (`shared/widgets/PropertyRegistry.js`) stays at `1.16`, unmodified. Every existing widget, regardless of the `fdws` version it declares, gets this behavior automatically with zero re-authoring.

**New module, `shared/widgets/components/ThemeColor.js`** (synced to both apps): `themeAdjustColor()` infers a semantic role — `surface` (any fill), `border`, `text-primary`/`text-secondary`, or `accent` (any color with HSL saturation ≥35%, regardless of where it's used) — from the color's own HSL values plus context `BaseComponent` already has, and remaps lightness/saturation via a role-specific curve, preserving hue exactly. Curves calibrated against `flight-deck-pwa/css/main.css`'s real `[data-theme="light"]` token pairs. `themeAdjustGradient()` does the same for every hex/`rgb()`/`rgba()` color token found inside a CSS gradient string, preserving alpha and the surrounding gradient syntax (function, angle, stop percentages) untouched — gradients were prototyped as "no safe generic transform" and initially left alone, then added once the rest proved out.

**Wired into the real render path**: `BaseComponent.applyStyles()` (all three synced copies) now theme-adjusts `typography.color`/`border.color`/a `type:"color"` `background.color` whenever `this.widget.getPreviewTheme()` returns `'light'`. That capability is implemented by every widget host so this file never needs to know which one it's talking to: `CompositeWidget.js` (`getPreviewTheme()` reads the PWA's existing `data-theme` attribute), `MockWidgetHost.js` (`createMockHost(def, { theme })`, used by Device View), and a `getPreviewTheme()` added to `StudioCanvas.js`'s own inline Interactive-Sim mock host. `app.js`'s theme-toggle handler now also calls `this.renderActivePage()` on flip — colors are resolved once per `applyStyles()` call, not reactively, so every mounted widget needs a fresh render pass to pick up the new theme.

**Widget Studio gets a live theme-preview toggle** (`StudioCanvas.js`'s canvas-header-bar, a sun/moon button next to the grid/outline toggles): backed by `StudioState.previewTheme`/`setPreviewTheme()` (new `PREVIEW_THEME_CHANGED` event), it drives Design mode's hand-rolled `renderComponentVisual()`, Interactive Sim mode, and Device View (`StudioDeviceView.js`) — one flag, all three surfaces.

**Two real bugs found via live testing against actual widgets, both fixed same day:**
1. **Color-matching (camouflage) broken by per-componentType role splitting.** A real widget (`com1_com2_radios_collapsible.v26.fdwidget`) sets a label's `typography.color` to the *exact same* literal hex as its own `background.color` (hides placeholder text on purpose), and reuses one panel's exact background hex on unrelated sibling components (so they blend into one seamless surface) — both intentional authoring tricks. The original design split "fill" colors into four roles (`background`/`surface`/`surface-raised`/`surface-well`) picked by `componentType`/`layer.group`, so two byte-identical authored colors could derive into two slightly different light-mode colors — hidden text became visible, seamless panels showed a seam ("weird white squares," per the user's report against Device View). **Fix**: collapsed all four into one `surface` curve (any two identical authored fills now always derive identically, regardless of component type), and added `themeAdjustComponentColors()`, which resolves a component's background first and reuses that exact output for its border/typography whenever the author set them to match on purpose.
2. **`var(--text-white, ...)`-style colors never reacted to Widget Studio's preview toggle.** Turns out this pattern isn't something a user needs to type — it's Widget Studio's own *default* color for any newly-added/unstyled component (`StudioLayersPanel.js`, `StudioTemplates.js`), so most widgets contain it pervasively without the author ever choosing to. `studio.css` never redefined `--text-white`/`--accent-green`/etc. per theme (Studio's own chrome is deliberately dark-only), so these colors just sat frozen in Studio's preview — same pattern already worked correctly in the real PWA, since `main.css` *does* redefine them per `[data-theme]`. **Fix**: added a `.fd-widget-preview-scope` CSS block to `studio.css` mirroring `main.css`'s exact token values for both themes, scoped to just the widget-preview containers (`StudioCanvas`'s `canvas-widget-grid`, `StudioDeviceView`'s `device-screen`) via a stamped `data-theme` attribute — Studio's own UI chrome stays dark, unaffected.

**A third bug, pre-existing and unrelated to any of the above, found via a user screenshot of the actual running PWA (not Studio)**: `CompositeWidget.js`'s widget-root outer bezel defaulted its background to `var(--panel-bg, #10141c)` — and `--panel-bg` was never defined anywhere in this codebase, not in `main.css`, not anywhere. Any widget with no authored root `style.background` (the user's widget only declares a root `border`) silently got this literal dark fallback forever, in both themes — a bug that predates today's session entirely and was missed by earlier live-verification because every test widget up to that point happened to declare an explicit root/component background. Fixed to `var(--card-bg, #10141c)` — the token `main.css` actually defines with real per-theme values, and what `StudioDeviceView.js`'s equivalent fallback already used.

**Verified live, repeatedly, against the user's actual multi-bug-surfacing widget** — first in Widget Studio (Design mode, Interactive Sim mode, and Device View, each independently), then end-to-end in the real running PWA: installed via the actual `WidgetRegistry.installDefinition()` (the same call the drawer's "Install .fdwidget" file picker makes), placed via `addNewWidgetToPage()`, toggled via the real "Night Cockpit" checkbox and its real `change` handler — not synthetic. Zero console errors throughout. User-confirmed working after the final fix.

## New FDWS v1.14: `props.presetSlot`/`props.emptyLabel`/`variant:"preset"` removed from `core.button` entirely — 2026-08-25

Follow-up to the preset-slot checkbox fix above. User pushed back on the checkbox approach itself: "I dont think we need need the Preset memory slot button variant at all? ... would it maybe make sense to have the user able to choose a stateRef for their buttons primary and sublabel? This will avoid unnecessary property bloat." I initially recommended keeping `presetSlot`/`emptyLabel` for backward compatibility rather than a breaking removal. User overrode that explicitly: **"I'd like to remove it completely for the reason that a lot of the widgets currently in the project will be replaced with new modern widgets. These will become the new default widgets. The old widgets (like the garmin ones) are remnants of design testing and they will not be in the final release."** — full removal authorized.

**Shipped as FDWS v1.14** (`docs/FlightDeck-Widget-Standard-v1.14.md`) — the **third non-additive revision** (after v1.10 and v1.11):

- `core.button.props.presetSlot`, `props.emptyLabel`, and `variant: "preset"` are removed from the spec entirely — not deprecated, gone. A host has no obligation to render them.
- `binding.stateRef` (v1.11, previously only for `core.label`/`core.display`) is generalized to `core.button`'s primary label. Unlike `core.label`'s nullish-only fallback, the button's `stateRef` falls back to `props.label` on **any falsy value including `""`** — this deliberately absorbs what `emptyLabel` used to do as one unified concept, so `props.label` is now the "shown when empty" text.
- New `binding.sublabelStateRef` (independent of `stateRef`, same falsy-fallback semantics against `props.sublabel`) lets a button's sublabel bind to a second, separately-indexed local-state path — e.g. label bound to `presets[0].label`, sublabel bound to `presets[0].freq`.
- `fdws` enum extended to `1.14` in both validators (array + the separate error-message string, both files); Studio UI labels and all four `README.md`s bumped.

**Ecosystem footprint audited** (22 files reference `presetSlot`/`emptyLabel`/`variant:"preset"`) — split into two buckets per the v1.10 precedent (unwired "remnant" content doesn't need migrating, only actively-shipped content does):
- **Actively shipped, migrated**: `widget-studio/js/StudioTemplates.js` ("NAV 1 Radio Decomposed" and "COM Radios Panel Widget" templates) and `shared/widgets/definitions/sampleWidgets.js` (imported by `flight-deck-pwa/js/core/StorageManager.js`'s `ensureDefaultDefinitions()`, seeds IndexedDB on first run) — both bumped to `fdws: "1.14"` and rewired onto `binding.stateRef`/`sublabelStateRef`. Migrating `sampleWidgets.js` also turned up **stale dead `core.editPreset` interactions** that had been silently broken since v1.10 removed that action and nobody had caught it — removed.
- **Left as remnants (unwired, will not ship)**: garmin-widgets/, working-widgets/, pc-bridge/widgets/, and `shared/widgets/definitions/com.flightdeck.comradios.json` (confirmed via grep it has zero JS importers) — per the user's own framing, these are design-testing leftovers, not final-release content.

**Runtime changes:**
- `shared/widgets/components/ButtonComponent.js` rewritten: dropped all `presetSlot`/`emptyLabel` logic, added `readStateRef` import and `stateRef`/`sublabelStateRef` resolution in both `render()` and `update()`. Kept the "always create the span if a binding is present, even when currently empty" rule from the v1.9 erratum — same footgun, re-keyed to the new binding.
- Three independent broadcast-loop implementations extended to match a changed state var against a button's `sublabelStateRef` base path (alongside the existing `stateRef` match): `flight-deck-pwa/js/widgets/CompositeWidget.js`, `widget-studio/widgets/components/MockWidgetHost.js`, `widget-studio/js/StudioCanvas.js`'s `_notifyDependents`. All three also had `core.applyPresetToField`'s slot-fallback simplified from `action.presetSlot !== undefined ? action.presetSlot : (compDef.props?.presetSlot ?? 0)` to `action.presetSlot ?? 0`, since `props.presetSlot` no longer exists.

**Studio UI changes** (`widget-studio/js/StudioInspector.js`): removed "Preset Memory Slot" from the Button Variant dropdown and removed the "Show preset value on this button" checkbox + Preset Slot Index/Empty Slot Label fields added in the previous entry — all superseded. Added a new "Bind Sublabel to State Path" field (shown only for `core.button`) alongside the existing "Bind to Local State Path" field, whose hint was updated to describe its new role for buttons.

**Validator changes** (`widget-studio/js/StudioValidator.js`): removed the presetSlot triple-source-of-truth cross-check added in the previous entry (now dead code, the field it checked doesn't exist). Added three new deprecation warnings for a widget still using any of the removed fields, each naming the exact migration (e.g. `props.presetSlot` → `binding.stateRef: "presets[N].freq"`).

**Docs:** `docs/FlightDeck-Widget-Standard-v1.9.md` got a dated superseding note under its original `emptyLabel` section (not rewritten, per the project's convention of treating adopted delta specs as historical record). All four `README.md`s (root, `flight-deck-pwa/`, `widget-studio/`, `pc-bridge/`) bumped to v1.14 and the root's "deliberate exceptions" sentence updated from two to three.

**Verified**: `node --check` clean on all touched JS. Live verification (dynamic import of the real `ButtonComponent.js`/`StudioInspector.js`/`StudioValidator.js`, fresh tab): a button with `binding.stateRef` set displays correctly and updates reactively on a broadcast; `binding.sublabelStateRef` updates independently of `stateRef`; falsy-fallback confirmed (`presets[0].label` resolving to `""` falls back to `props.label`, not a blank string); Studio's Button Variant dropdown no longer offers "Preset Memory Slot" and no presetSlot/emptyLabel fields appear; the new sublabel-stateRef field appears only for `core.button`; all three new deprecation warnings fire correctly against a synthetic widget still using the removed fields, with zero false positives on the migrated templates.

## Widget Studio: removing a preset button's built-in label no longer requires hand-editing JSON — 2026-08-25

Follow-up to the "P1"/"P2" label question: user's actual goal is buttons that display *nothing* of their own — a separate `core.label` (bound via `binding.stateRef`) does all the display, for both the preset's label and its frequency. Confirmed this needs `props.presetSlot` (and `props.emptyLabel`) removed from the button entirely — as long as `presetSlot` is set at all, `ButtonComponent.js`'s built-in `freq → label → emptyLabel` fallback always shows something. User explicitly asked: no JSON hand-editing, close the gap in Studio itself.

**Two real Studio UI gaps found and fixed** (`widget-studio/js/StudioInspector.js`, `core.button`'s Props panel):
1. The "Preset Slot Index"/"Empty Slot Label" fields were only shown when `variant === "preset"` — a button using any other variant (the user's own buttons are all `variant: "momentary"`) with `presetSlot` already set had no way to even see, let alone edit, those fields.
2. Even when visible, "Preset Slot Index" is a number input — blank always resolves to `0`, never to "unset." There was no way to remove `presetSlot` once set, short of hand-editing exported JSON.

**Fix:** added a "Show preset value on this button" checkbox, decoupled entirely from `variant` (shown for every `core.button`, any variant) and reflecting whether `props.presetSlot !== undefined`. Unchecking it removes both `presetSlot` and `emptyLabel` from `props` outright (not just clearing them to `0`/`""`) — the button then renders with zero built-in text, permanently, purely a tap/longpress hit target. Checking it sets `presetSlot: 0` (or restores the previous value) and reveals the slot/empty-label sub-fields again.

**Removed a conflicting piece of old logic in the process**: a pre-existing `queueMicrotask` convenience (auto-persisting `presetSlot: 0` whenever `variant === "preset"` had none set) directly fought the new checkbox — unchecking it on a `variant: "preset"` button got silently undone on the very next render, since that old logic couldn't distinguish "never configured" from "deliberately turned off." Confirmed live before removing it: the checkbox state visibly reverted to checked immediately after a fresh re-select. Removed the old auto-persist entirely; the checkbox is now the only thing that ever sets `presetSlot`'s initial value.

**Verified live** (temporary alternate-port Studio instance — port 3001 was occupied by a genuine concurrent session this time, confirmed via the tool's own "another chat's dev server" flag rather than the stale-process pattern seen earlier in this repo, so left untouched): full toggle cycle on a `variant: "preset"` button — uncheck removes both keys, re-select confirms it stays removed (the bug, before removing the conflicting old logic, was that it silently reverted here); re-check restores `presetSlot: 0`; uncheck-then-reselect again confirms it now holds permanently. Separately confirmed the checkbox and its fields correctly appear for a `variant: "swap"` button with `presetSlot` manually set — the user's exact real-world combination. `node --check` clean. Temporary verification server and its `launch.json` entry removed after testing.

## Fixed: `core.button` (and technically `core.input`) rendered a visible double border — 2026-08-25

User noticed a double border on their popover's Cancel/Save buttons specifically. Root cause in `BaseComponent.js`'s `applyStyles()`: any author-set `style.border`/`style.background` was written to **both** a component's outer wrapper (`this.element`) and its inner "surface" node (`btnNode` for `core.button`, `inputNode` for `core.input`) — via a `surfaceNodes.forEach(...)` alongside a separate always-on write to `this.element`. For `core.button` this is very visible: the base CSS (`widgets.css`/`studio.css`) already gives `.fd-comp-btn-inner` its own default background/border/radius and `4-6px` of padding, so an author-set border rendered as two concentric boxes a few pixels apart. For `core.input` the same double-write happens, but `.fd-comp-input-wrapper` has zero padding and `.fd-comp-input-field` is CSS-hardcoded `border: none`/`background: transparent` — so the two borders land almost exactly on top of each other, which is why the user only noticed it on buttons.

**Fix**: border/background/background-image now write to exactly one target node per component — `this.btnNode || this.element` — matching whichever node each type's own base CSS treats as the real bordered/backgrounded surface (the inner chip for `core.button`; the wrapper for everything else, including `core.input`, which never had a `btnNode`). Also had to explicitly clear `this.element`'s border/background when the target isn't `this.element`, since `ButtonComponent.render()` calls `applyStyles()` twice — once via `super.render()` before `btnNode` exists (so that first pass unavoidably targets `this.element`), and once more right after — without the explicit clear, the first pass's write stayed stranded on the wrapper forever, silently reintroducing the exact same double-border this fix exists to remove. (Live-verification with the naive one-line fix, before adding the clear, initially looked like it hadn't worked at all — turned out to be this two-pass render, not module caching this time, confirmed by testing in a brand-new tab.)

**Verified live** (fresh tab, real classes via dynamic `import()`, not reimplementations): a `core.button` with `style.border` — wrapper now `0px none`, inner chip carries the full author-specified border, exactly once. `core.input` — wrapper carries the author's border/background as before (unaffected, matches pre-existing CSS design), inner field stays `0px none`. `core.label` (no surface node at all) — border still applies to the wrapper exactly as before, confirming no regression for component types without an inner surface. Button background — wrapper transparent, chip carries the color, once. `node --check` clean on all three synced copies.

## Fixed: all four preset buttons showed slot 0's frequency; added a validator check for the class of bug — 2026-08-25

User reported: entering a P2 preset frequency never showed up on the P2 button, but entering a P1 frequency showed up on *every* button. Root cause in `com1_com2_radios_collapsible.v22.fdwidget`: `btn_p2`/`btn_p3`/`btn_p4` were duplicated from `btn_p1`, and "which slot" a preset button represents is declared independently in three places — `props.presetSlot` (drives `ButtonComponent.js`'s label-text logic), the tap interaction's own `presetSlot` (drives `core.applyPresetToField`), and `binding.stateRef`/the longpress popover's context `stateRef`s (drive live updates and the edit popover) — with nothing enforcing they agree. Duplicating a button correctly updated the latter two for each copy but left `props.presetSlot: 0` untouched on all three duplicates, so every button's *displayed* label kept reading `presets[0]` regardless of which slot its tap/binding/popover actually targeted — exactly the reported symptom. This was a pure widget-authoring data-entry mistake, not a runtime bug; the Studio Inspector's own preset-slot tooltip already warned this could happen ("nothing cross-checks these automatically, so keep them in sync by hand") — nothing previously enforced it.

**Fixed the user's file directly**: `props.presetSlot` corrected to `1`/`2`/`3` on `btn_p2`/`btn_p3`/`btn_p4` respectively (revision bumped to 23) — no other fields needed to change, since the interaction/binding/popover context were already correct on all three.

**Added a Widget Studio validator check** (`widget-studio/js/StudioValidator.js`) so this class of bug surfaces automatically going forward, Studio-only (no spec/schema change, no new FDWS version): for any `core.button` with `props.presetSlot` set, warns if any of the following disagree with it — a `core.applyPresetToField` tap interaction's own `presetSlot`, a `core.openWidgetPopover` interaction's context `stateRef` slot indices, or `binding.stateRef`'s slot index.

**Verified live**: constructed a synthetic widget def reproducing the exact bug pattern (a second preset button with `props.presetSlot: 0` but tap/binding/popover-context all correctly pointing at slot 1) and ran it through the real `StudioValidator.validate()` (dynamically imported, not a reimplementation) — all three new checks fired with the correct slot numbers in the warning text. A correctly-wired equivalent produced zero warnings. `node --check` clean.

## Widget Studio: `visibleWhen`'s nested-path condition (FDWS v1.13) now authorable in the UI — 2026-08-25

User's stated goal: "make everything configurable through the UI." The v1.13 spec addition shipped earlier today (`visibleWhen.state` resolving a nested/indexed path like `presets[0].label`) had no way to actually author it in Widget Studio — the Inspector's "VISIBILITY & GUARD" panel's `state` field was a strict `<select>` populated only from the widget's declared `state[]` array, with no way to type an arbitrary path. Closing that gap.

**Fix, `widget-studio/js/StudioInspector.js`'s `renderVisibilityAndGuard()`:**
- Each condition row's `state` dropdown gained a "Custom / nested path…" option (reusing the same `CUSTOM_OPTION_VALUE` sentinel and "reveal a text field, don't commit an empty value yet" pattern already used by every other Custom… dropdown in this panel — binding pickers, event pickers). Selecting it reveals a text input for typing `presets[0].label`-style paths.
- A condition whose `state` doesn't match any declared `state[]` var name is automatically treated as a custom path on render, so a hand-edited or previously-set nested-path condition round-trips correctly back into the visual editor (select shows "Custom…", text field pre-filled) instead of falling through to the JSON-escape-hatch view.
- Added a hint (ⓘ) on the "Conditional Visibility (visibleWhen)" section explaining the new option.
- `widget-studio/README.md`'s Conditional Visibility bullet updated to describe the new capability (previously said "against declared state vars" only).

**Verified live**: added a condition on a real component, selected "Custom / nested path…", typed `presets[0].label`, set operator to `notEquals` — confirmed the component's `visibleWhen` committed as `{"allOf":[{"state":"presets[0].label","notEquals":""}]}`. Re-selected the component to force a fresh panel render and confirmed the condition round-trips correctly (dropdown still shows "Custom / nested path…", field still shows the saved path) rather than reverting to a blank/broken state. Removed the test condition and confirmed cleanup leaves `visibleWhen` unset. `node --check` clean.

## New FDWS v1.13: `visibleWhen.state` resolves nested/indexed paths — 2026-08-25

User asked how to hide the preset-label component (added earlier today, bound via `binding.stateRef: "presets[0].label"`) until a preset is actually configured, and show it once set. Checked first rather than assuming: `visibleWhen`'s leaf predicate already has exactly the right comparators (`equals`/`notEquals`, normative since v1.1) to express "hide when empty" — `{"state": "presets[0].label", "notEquals": ""}` — but `evaluateVisibilityExpr()` only ever resolved `state` as a flat top-level variable name (`allState[expr.state]` / `getLocalState(expr.state)`), the same limitation `binding.stateRef` (v1.11) was built to solve for component values, just never carried over to visibility.

**Shipped as FDWS v1.13** (`docs/FlightDeck-Widget-Standard-v1.13.md`) — fully additive, no new field, no schema change:

- `BaseComponent.js`'s `evaluateVisibilityExpr()` now checks whether `expr.state` contains `[` or `.` (impossible in a flat variable name, so unambiguous) and, when it does, resolves via `readStateRef()` — the same `StateRefPath.js` utility `binding.stateRef` already uses — instead of the flat lookup. A plain flat name takes the identical code path as before v1.13; no existing widget's visibility behavior changes.
- `fdws` enum extended to `1.13` in both validators; Studio UI labels and `README.md` bumped.

**Verified live**: dynamically imported the actual (fixed) `LabelComponent.js`/`BaseComponent.js` in the browser and instantiated a label bound to `presets[0].label` with `visibleWhen: {allOf:[{state:"presets[0].label", notEquals:""}]}` — confirmed it renders `display:"none"` while the preset is unconfigured, then correctly flips to visible (and shows the saved text) after simulating a preset save via `update()`. Confirmed a plain flat-name `visibleWhen` (`{state:"com2visible", equals:"true"}`) still resolves exactly as before. `node --check` clean on all touched files. (Caught and corrected one test artifact along the way: the first live-verification attempt showed the fix not working — turned out to be a stale in-page ES-module cache from earlier testing in the same tab, not a real defect; reloading the page and re-testing confirmed the fix works correctly.)

## Fixed: a preset button with `emptyLabel: ""` never displays its saved frequency — 2026-08-25

User reported `btn_p1` in a further-edited version of their COM1/COM2 widget wasn't picking up the frequency label after saving a preset via the popover, and asked for a diagnosis. Root cause was in the renderer, not the widget JSON: `shared/widgets/components/ButtonComponent.js`'s `render()` only creates the label `<span>` when the text it computes at mount is non-empty — a reasonable rule for an icon-only button with genuinely no label, but a real footgun for a preset-slot button combined with `props.emptyLabel: ""`. At mount, an unconfigured `presets[0]` (`{label:"", freq:""}`) plus an empty `emptyLabel` computes to an empty string, so no `<span>` is ever created and `this.labelNode` stays `undefined` — meaning `update()`'s `if (this.labelNode) { ... }` guard silently no-ops **forever**, even after a real preset is saved, since there's no DOM node to write into and nothing ever creates one after mount.

**Investigated the rest of the ecosystem before fixing** (per user's explicit request) — grepped for every place `fd-comp-btn-label`/the label-creation logic could be duplicated. Found exactly one canonical implementation (`shared/widgets/components/ButtonComponent.js`, synced to both apps) and confirmed `StudioCanvas.js`'s separate design-canvas mock button renderer (a different, simpler component-palette preview, unrelated to the live editing canvas which already reuses the real `ComponentRegistry`-based renderer) doesn't implement `presetSlot`/`emptyLabel` logic at all — not affected, nothing to fix there.

**Fix:** `render()` now creates the label span whenever `props.presetSlot !== undefined`, regardless of what the computed text is at that instant — a preset button's content is inherently dynamic and needs the span to exist from mount so later `update()` calls always have somewhere to write. Every other button variant (icon-only swap, etc.) keeps the exact original skip-if-empty behavior. Pure runtime bug fix — no schema/JSON change, no new FDWS version. Added a dated erratum to `docs/FlightDeck-Widget-Standard-v1.9.md`'s Implementation status section (the field this defect affects, `emptyLabel`, shipped in v1.9) rather than silently rewriting that already-adopted document, per this project's convention of treating adopted delta specs as historical record.

**Verified live**: dynamically imported the real (fixed) `ButtonComponent.js` in the browser and instantiated it directly with the exact reported scenario (`presetSlot: 0`, `emptyLabel: ""`, `presets[0]` starting empty) — confirmed the label span now exists immediately at mount (empty text, as expected) and correctly updates to `"118.700"` after simulating a preset save. Confirmed a plain icon-only swap button (`variant: "swap"`, no `presetSlot`) still gets no label span at all — unchanged. `node --check` clean on all three synced copies.

## New FDWS v1.12: `state[].seedFromContext`, and the COM preset popover's pre-fill bug fixed — 2026-08-25

Follow-up to a bug found while auditing the user's work-in-progress `com1_com2_radios_collapsible.v10.fdwidget` + `com_preset_popover.v5.fdwidget` at their request ("look over it and see if there are things that need to be fixed"): the popover's `scratchLabel`/`scratchFreq` state vars always defaulted to `""` with nothing seeding them from the preset slot's actual current values — so long-pressing an *already-configured* preset opened the editor blank, and an unwary Save would silently wipe it. Checked the one confirmed-working reference in the repo (`garmin-widgets/radios-atc/com.flightdeck.garmin.navpreseteditor.json`) and found it uses a different architecture entirely: inputs bind directly to `$context.<key>.value` and commit live on every `change`, which works but means Cancel no longer means "discard" — any already-blurred field is already committed. Presented two options; user chose **(b): keep true Cancel-discards Save/Cancel semantics**, which the spec had no way to express — nothing seeds a popover's own local scratch state from the host's context on open, and there's no "on mount" trigger to build a workaround from either.

**Proposed and, after user approval, shipped as FDWS v1.12** (`docs/FlightDeck-Widget-Standard-v1.12.md`) — fully additive, no breaking change (unlike v1.10/v1.11):

- New `state[].seedFromContext` (optional string, popover widgets only): names a Context Map key; the state var's initial value comes from that key's resolved value instead of `default`, exactly once, when the popover instance is actually constructed (a real longpress-open — never during ordinary Studio authoring edits, unlike a general "mount" trigger would have been, which was considered and rejected specifically because Studio's design canvas re-renders on nearly every edit).
- `flight-deck-pwa/js/widgets/CompositeWidget.js`'s `initLocalState()` resolves it against `this.popoverContext`. Required a real ordering fix: `WidgetPopoverModal.js` (PWA) was assigning `popoverContext` *after* constructing the `CompositeWidget`, by which point `initLocalState()` (constructor-called) had already run with nothing to seed from — `popoverContext` now passes in via `instanceConfig.config` instead, before `initLocalState()` runs. `widget-studio/widgets/components/MockWidgetHost.js` needed no equivalent fix — its `createMockHost()` already receives `popoverContext` in time.
- Widget Studio's Add/Edit State Variable modal (`StudioLayersPanel.js`) gained a "Seed From Context Key" field, shown only when editing a `kind: "popover"` widget.
- `fdws` enum extended to `1.12` in both validators; Studio UI labels and `README.md` bumped.
- **Applied the fix to the actual popover file**: `com_preset_popover.v5.fdwidget` bumped to `"fdws": "1.12"` (revision 6), and `scratchFreq`/`scratchLabel` gained `"seedFromContext": "currentFreq"`/`"currentLabel"` — the only change needed; `input_plabel`/`input_pfreq`'s bindings, the Save button's `core.commitToHost` actions, and Cancel are all untouched, since they were already correct — only the missing initial value was the bug.

**Verified live**: dynamically imported the actual shipped `MockWidgetHost.js` in the browser console and called `createMockHost()` directly (not a reimplementation) with a synthetic `popoverContext` — confirmed a `seedFromContext`-tagged var resolves to the context value while a plain var without it still falls back to its own `default`, and confirmed a normal (non-popover, no `popoverContext`) instantiation safely falls back to `default` for a `seedFromContext`-tagged var too. Confirmed the new Studio field is hidden for a `kind: "widget"` definition and appears correctly for `kind: "popover"`, and that submitting it round-trips `seedFromContext` onto the actual state entry. `node --check` clean on all 12 touched files. The real `com_preset_popover.v5.fdwidget` file was validated as parseable JSON after editing.

## New FDWS v1.11 (breaking): masked/range-enforced format-driven inputs, `binding.stateRef`, `selectOnFocus` — 2026-08-25

User asked for three authoring capabilities after confirming (before any code was touched) whether they were possible today: (1) an input field whose valid shape/range is tied to a named format (e.g. COM: `###.###` 118.000–136.975, NAV: `###.##` 108.00–117.95), rejecting out-of-format entry and auto-prefilling the leading `1` every COM/NAV frequency starts with so the user only has to type the remaining digits; (2) a displayed text/value sourced from a nested/indexed local-state path (e.g. a label above a preset button showing that preset's own saved label); (3) an input whose existing text selects itself on focus, configurable per field. Investigated first and confirmed none of the three existed — `core.input`'s `format` was display-only with zero input semantics, `props.min`/`props.max` existed but were undocumented in Studio's UI and decoupled from `format`, only `core.button`'s hardcoded `presetSlot` prop could show a nested array value (no generic mechanism), and there was no select-on-focus anywhere. Presented a full plan (format catalog design, `binding.stateRef` design, versioning) before implementing; two open design questions (should masking be automatic or opt-in; should an out-of-range commit clamp or revert) were resolved by the user as **automatic** and **reject-and-revert**, both matching the tone this project already set with v1.10's own deliberate compatibility break.

**Shipped as FDWS v1.11 (`docs/FlightDeck-Widget-Standard-v1.11.md`) — the second non-additive release:**

- **Format Catalog** (`ValueFormatter.FORMAT_SPECS` + `registerFormatSpec()`, mirroring the existing `vendor.*` custom-format precedent so future formats need no runtime change): `FREQ_COM` → `{intDigits:3, decDigits:3, min:118.000, max:136.975, autoPrefill:'1'}`, `FREQ_NAV` → `{intDigits:3, decDigits:2, min:108.00, max:117.95, autoPrefill:'1'}`.
- **`InputComponent.js` masked-entry rewrite**: focus on an *empty* field with a cataloged format auto-prefills (e.g. `"1"`, cursor after it) — an already-populated field is left alone. Typing derives a digit-only buffer from the field's own current text every keystroke (blocks non-digits, caps at `intDigits+decDigits` total), re-rendering the fixed `int.dec` mask live — this is what turns typing `228` after the auto `1` into `122.8` with no separate decimal keystroke. Commit (blur/Enter) parses against `min`/`max` (component `props.min`/`props.max` override the format's defaults when set) and **rejects-and-reverts to the last known-good value** on failure, per the user's explicit choice, rather than clamping to a boundary. Formats with no catalog entry are completely unaffected — plain free-text, exactly as before.
- **`binding.stateRef`** (new, fully additive): addresses a nested/indexed local-state path (e.g. `presets[0].label`) using the same `StateRefPath.js` grammar already used by popover Context Maps and `fromStateRef`. Generalizes what was previously only possible via `core.button`'s hardcoded preset-slot special case. Added to all five places that needed it: `CompositeWidget.js`'s and `MockWidgetHost.js`'s `setLocalState()` broadcast loops, `StudioCanvas.js`'s `_notifyDependents()`, and the initial-mount loops in `StudioDeviceView.js` and `WidgetPopoverModal.js` (Studio's copy) — the latter two previously only resolved `binding.readSimVar` at first paint, a pre-existing gap for plain `stateVar`-only bindings too, closed as part of the same fix since it sat right next to the new `stateRef` case.
- **`core.input.props.selectOnFocus`** (new, fully additive): selects existing text on focus, only when the field isn't empty — composes cleanly with the masking auto-prefill above since the two are mutually exclusive by construction (auto-prefill only fires on empty, select only fires on non-empty).
- **Studio UI (`StudioInspector.js`)**: `core.input` gained Min/Max fields (previously nonexistent in the UI despite the runtime already supporting `props.min`/`props.max` — auto-populated from the chosen format's catalog entry, but only when not already set, never clobbering an explicit author value) and a "Select all text on focus" checkbox. The existing generic SIMVARS & BINDINGS panel (already rendered for every component type, not gated) gained a "Bind to Local State Path" field for `stateRef`, alongside the existing "Bound Local State Var" field — available on `core.label` for the first time as a real authoring control, not just a runtime capability with no UI.
- `fdws` enum extended to `1.11` in both validators; every "FDWS v1.10" Studio UI label and `README.md`'s version pointer bumped to v1.11.

**Verified live** (this session's own Widget Studio instance): typed the user's exact example on the loaded widget's real `input_com1_stby` field (format `FREQ_COM`) — empty-focus auto-prefilled `"1"`, typing `2`,`2`,`8` produced `"1"→"12"→"122"→"122.8"` live, blur committed `"122.800"`; then focused the now-populated field (confirmed no re-prefill), typed an out-of-range `"137.000"`, and confirmed blur reverted it to `"122.800"` rather than clamping. Confirmed the Min/Max fields (placeholders `118`/`136.975`, sourced from the format) and the Select-on-focus checkbox render in the Props panel, and the new "Bind to Local State Path" field renders in Bindings. Set `label_act_com1`'s `binding.stateRef` to `presets[0].label` via that field and confirmed the live Simulate-mode label immediately reflected the resolved value (empty, matching the actual unconfigured preset) instead of its old static `"ACT"` text — proving the new initial-mount resolution path. Attempting to also trigger the longpress-edit-popover round-trip via synthetic `PointerEvent`s to prove the live *broadcast* path (not just initial mount) didn't fire in this headless context — an apparent quirk in the pre-existing longpress timer plumbing unrelated to this change, not something worth chasing further. Instead isolated and directly executed the exact `parseStateRef`/`readStateRef` calls the broadcast loop now makes against a mock widget object in Node, confirming `stateRefBase === changedName` matching and correct value resolution before and after a simulated commit. `node --check` clean on all 19 touched files.

## New FDWS v1.10 (breaking): legacy preset-edit modal removed entirely, `core.applyPresetToField.sourceField` added — 2026-08-25

Follow-up to the v1.9 entry below: user reported that tapping an *empty* preset slot in Widget Studio's Simulate mode was popping up an old single-frequency edit modal — a legacy fallback (`openEditorIfEmpty`, default `true`) that `MockWidgetHost.js`'s copy of `core.applyPresetToField` honored even less carefully than the real PWA runtime (it opened the modal unconditionally on empty, ignoring the flag altogether). Rather than patch the fallback, the user asked to discard the legacy modal completely — the flight deck ecosystem has standardized on user-authored `core.openWidgetPopover` (FDWS v1.3) popovers instead — and asked for `core.applyPresetToField` to support applying more than one value from a single preset slot (e.g. a slot holding both a COM1 and COM2 standby frequency).

**Investigated before making changes (per user request to review the plan first) and found the blast radius was larger than the immediate bug:**
- `core.editPreset` (an action that existed only to unconditionally open the same legacy modal) is used for real in four currently-shipped widgets (`pc-bridge/widgets/com_flightdeck_com1com2radio.fdwidget`, `pc-bridge/widgets/com_flightdeck_comradios.fdwidget`, `garmin-widgets/radios-atc/com_flightdeck_comradios.fdwidget`, `working-widgets/com_flightdeck_com1com2radio.fdwidget`) — user confirmed these are dev-test remnants slated for removal before final release; left unmigrated intentionally.
- `RadioWidget.js` — a separate, native (non-FDWS-composite) built-in widget class, unrelated to the interaction-action system — also called the same legacy modal directly for its own preset UI. User confirmed (after being shown it backs the default `"Radios"` page seed data in `StorageManager.js`'s built-in `default_ga` profile) that it's dead weight and should be removed too, including stripping its three `RadioWidget` instances (COM1/COM2/XPNDR) from that seed data.
- `widget-studio/js/StudioTemplates.js` ships a starter template wiring `longpress → core.editPreset` on four preset buttons — user asked to drop just the longpress entries for now (template rework is separate future work).

**Fix, shipped as FDWS v1.10 (see `docs/FlightDeck-Widget-Standard-v1.10.md`) — the first non-additive FDWS release:**
- `core.applyPresetToField`: `openEditorIfEmpty` and its modal fallback removed from both runtime copies (`flight-deck-pwa/js/widgets/CompositeWidget.js`, `widget-studio/widgets/components/MockWidgetHost.js`) and the design-canvas mock (`StudioCanvas.js`) — an unconfigured slot (empty or `"---"`) is now always a silent no-op, full stop.
- Added `core.applyPresetToField.sourceField` (optional string, default resolves exactly as before via `.freq`/`.value`) — lets one preset slot object carry more than one applicable value (e.g. `presets[0].com1Freq` and `presets[0].com2Freq`). No new batch/array action shape: multiple values are applied via multiple `tap`-triggered `core.applyPresetToField` interactions on the same button, each with its own `sourceField`/`field`/`event` — already-supported behavior of the interaction runner (`handleInteraction` has always run every interaction matching a fired trigger), verified live.
- `core.editPreset` removed outright: from both runtime switches and Widget Studio's `StudioValidator.js` `CORE_ACTION_TYPES` allow-list (widgets still using it now fail Studio's validator and get an inert longpress at runtime — no crash, matches v1.1 §4.1's "unknown action degrades safely" rule).
- Deleted `PresetEditModal.js` (canonical `shared/widgets/components/`, resynced) and `RadioWidget.js` (`flight-deck-pwa/js/widgets/RadioWidget.js`), removed the latter's `WidgetRegistry.js` catalog entry and import, and stripped its three seeded instances (plus the `'RadioWidget'` entry in `isDefaultWidget()`'s allow-list) from `StorageManager.js`'s default profile — `page_radios` now seeds with `widgets: []` for a fresh install until reseeded with real FDWS composite widgets.
- `StudioInspector.js`: replaced the "Open edit popup if slot is unconfigured" checkbox with a "Preset Field" text input (`sourceField`) in the Add Interaction modal, with a hint explaining the multi-value-via-multiple-interactions pattern.
- `StudioTemplates.js`: dropped the four `longpress → core.editPreset` entries from the bundled COM radio starter template (tap-to-apply only, for now).
- `fdws` enum extended to `1.10` in both validators (`shared/SecurityValidator.js`, `widget-studio/js/StudioValidator.js`); every "FDWS v1.9" user-facing label in Studio and `README.md`'s version pointer bumped to v1.10.
- User's widget: removed the now-inert `openEditorIfEmpty: false` key from `btn_p1`'s tap interaction (revision 12) — no functional change, since it was already a no-op by the new default behavior.

**Verified live** (this session's own Widget Studio instance, port 5051 — see the entry below for why the previous attempt used another session's stale server): reloaded Studio, confirmed zero console errors (so `RadioWidget.js`'s removal didn't break app startup); tapped the empty `btn_p1` preset in Simulate mode and confirmed no modal opened (`document.querySelector('.studio-modal-box, [class*="preset-edit"]')` → null, no "edit preset"/"preset editor" text anywhere in the page); opened the Add Interaction modal and confirmed the checkbox is gone and the new "Preset Field" input is present; added a second `tap` interaction with `sourceField: "com2Freq"`, `field: "com2StbyFreq"`, `event: "com2StbySet"` alongside the existing COM1 one and confirmed both persisted correctly in the live widget definition (`window.__studioApp.state.widgetDef`); ran the FDWS validator against the widget with both interactions present — "WIDGET FULLY COMPLIANT WITH FLIGHT DECK WIDGET STANDARD v1.10", zero errors. `node --check` clean on all 15 touched `.js` files.

## New FDWS v1.9: `core.button.props.emptyLabel`, and a preset-button tap bug fixed — 2026-08-25

User was building a COM1/COM2 collapsible widget with a preset button (`com1_com2_radios_collapsible.v10.fdwidget`) plus its edit popover (`com_preset_popover.v5.fdwidget`) and reported two problems: the empty-slot placeholder text (`"---"`) couldn't be changed, and tapping an *unconfigured* preset slot was writing `"---"` into `com1StbyFreq` and dispatching it as a live sim event — corrupting the standby frequency instead of no-op'ing.

**Root cause, both problems:**
- `"---"` was hardcoded in `ButtonComponent.js`'s `render()`/`update()` (two places) as the fallback when `presets[slot]` has no `freq`/`label` — no field existed to override it.
- The widget's `btn_p1` component wired its `tap` trigger directly to `core.setLocalState` + `core.dispatchEvent`, each reading `presets[0].freq` via `fromStateRef` and applying it unconditionally. The spec has defined a purpose-built action for exactly this, `core.applyPresetToField` (v1.1), which guards on `freqVal && freqVal !== '---'` before applying anything and only opens an edit prompt (or no-ops) otherwise — the widget just wasn't using it. **This was a widget-authoring bug, not an FDWS v1.8 spec limitation**; `core.applyPresetToField`'s guard has existed since v1.1 (already documented as the required mechanism in `docs/FlightDeck-Widget-Standard-v1.3.md`).

**Fix — new FDWS v1.9 (see `docs/FlightDeck-Widget-Standard-v1.9.md` for the full delta spec):**
- Added optional `core.button.props.emptyLabel` (default `"---"`) — `ButtonComponent.js` (canonical `shared/widgets/components/`, synced into both apps) now reads `props.emptyLabel ?? '---'` in both places instead of the literal.
- `widget-studio/js/StudioInspector.js`: added an "Empty Slot Label" text field next to the existing "Preset Slot Index" field (shown only for `variant: "preset"`), and corrected the Preset Slot Index tooltip, which had been citing the unguarded `core.setLocalState`/`core.dispatchEvent` pattern as an example — it now points authors at `core.applyPresetToField`.
- `shared/SecurityValidator.js` and `widget-studio/js/StudioValidator.js`: `fdws` enum extended to `1.9` (both apps' import/authoring validators — same class of gap called out in the entry below, fixed proactively this time before it could bite).
- Bumped every "FDWS v1.8" user-facing label (Widget Studio's spec badge, "Standard: vX.X.0" indicator, validator modal title/pass banner, Sim Bench subtitle, Export JSON toast) and `README.md`'s version pointer to v1.9.
- User's widget files updated directly: `com1_com2_radios_collapsible.v10.fdwidget` bumped to `"fdws": "1.9"` (revision 11), `btn_p1`'s two unguarded tap interactions replaced with a single `core.applyPresetToField` (`presetSlot: 0`, `field: "com1StbyFreq"`, `event: "com1StbySet"`, `openEditorIfEmpty: false` since the widget already has its own long-press-to-edit popover), and `props.emptyLabel: "---"` added (preserves current on-screen appearance while making it author-configurable going forward). The popover widget (`com_preset_popover.v5.fdwidget`) needed no changes — it already only ever writes into `presets[0]` via `core.commitToHost`, which was never the buggy path.

**Verified:** `node --check` on every edited `.js` file (both app copies post-sync) — all parse clean. JSON-validity and content of both edited `.fdwidget` files re-read and confirmed correct. **Not verified live in-browser** — Widget Studio's dev server port (5051) was already occupied by another session's instance at the time, and this session's browser tooling can't reach a server it didn't start. Recommend the user reload Widget Studio, re-import `com1_com2_radios_collapsible.v10.fdwidget`, and confirm: (1) the preset button still shows `"---"` when empty, (2) tapping it while empty no longer changes the STBY display, (3) long-press → edit → Save still populates the slot and a subsequent tap applies it correctly.

## Closed the gap: neither app actually accepted `"fdws": "1.8"` yet — 2026-08-25

User asked to confirm both apps fully support the new v1.8 spec just added. They didn't: `SecurityValidator.validateFDWSDefinition()` — described in its own docstring as "the check every import path in every app runs before a definition is allowed in at all" — had its `fdws` enum hardcoded to `['1.0'..'1.7']`. Since `shared/SecurityValidator.js` is the canonical copy synced into both apps, **any widget declaring `"fdws": "1.8"` (exactly what the v1.8 spec tells an author to do once they use `style.align`/`style.offset` on a non-`core.label` component, or `align.v`) would have been rejected outright on import in both the PWA and Widget Studio**, despite the rendering code fully supporting it. `widget-studio/js/StudioValidator.js` (Studio's separate, more thorough authoring-time validator) had the identical hardcoded enum gap.

**Fix:**
- `shared/SecurityValidator.js`'s `validateFDWSDefinition()`: enum extended to include `'1.8'`, re-synced via `node scripts/sync-shared.mjs` into `flight-deck-pwa/js/core/SecurityValidator.js` and `widget-studio/core/SecurityValidator.js`.
- `widget-studio/js/StudioValidator.js`'s `validate()`: same enum fix, plus its stale docstring (still said "v1.5" even before this session) updated to v1.8.
- Confirmed via full-repo grep that no other version-enum gate exists anywhere in either app or `pc-bridge` — `pc-bridge/server.js`'s two "FDWS v1.7" mentions are historical comments about when `pollFrequencyHz` shipped, not a validation gate; `pc-bridge` never validates widget definitions itself.
- Updated every user-facing "FDWS v1.7" version label to v1.8: Widget Studio's top-nav spec badge and "Standard: vX.X.0" indicator (`StudioApp.js`), the validator modal title/pass banner and its launch-button tooltip (`StudioStatusBar.js`), the Sim Bench subtitle (`StudioSimBench.js`), and the "Export JSON" toast (`StudioMenuBar.js`). Left the several genuinely historical "FDWS v1.7: pollFrequencyHz was introduced here" code comments alone (`StudioValidator.js`, `StudioInspector.js`, `StudioLayersPanel.js`, `EventBus.js`, `SimBridge.js`) — those correctly describe *when* a feature shipped, not the current spec version, and rewriting them to "v1.8" would make them wrong.
- `README.md`'s "current FDWS version" pointer (already stale at "v1.5" before this session, predating even v1.6/v1.7) corrected to v1.8 with the full version chain linked.
- Confirmed no other schema-level rejection risk: grepped `SecurityValidator.js` for any style-sub-key whitelist that could silently strip `style.align`/`style.offset` during sanitization — none exists (it clones-and-checks-known-keys per §4.1 Rule 2, doesn't strip unknowns), and `StudioValidator.js` likewise has no style-shape whitelist beyond an unrelated background-image asset-reference check. Both fields were already passing through untouched even before today's enum fix — the *only* blocker was the version-string gate itself.

**Verified live:** in Widget Studio, set the loaded widget's `fdws` to `"1.8"` and called `StudioValidator.validate()` directly — `valid: true`, zero errors (previously would have errored on the version string alone). In the PWA, built a synthetic FDWS v1.8 definition with a `core.label` using both `style.align:{h,v}` and `style.offset:{x,y}` and ran it through `SecurityValidator.validateFDWSDefinition()` — `valid: true`, and confirmed via the returned `sanitizedDefinition` that both fields round-tripped byte-for-byte, not stripped. Zero console errors in either app (the only console errors present are the expected PC-Bridge WebSocket-connection-refused noise from running with no bridge attached, unrelated to this change). Re-confirmed `shared/`, `widget-studio/`, and `flight-deck-pwa/`'s component and `SecurityValidator.js` copies are still byte-identical after the sync.

## New FDWS v1.8: generic `style.align`/`style.offset` — content alignment & fine-position nudge — 2026-08-25

User building the COM1/COM2 widget noticed `core.display` and `core.input` on the same row rendered with visually mismatched text baselines (different font-metric/box-model centering between the two types) and there was no author-facing control to fix it — the only alignment field in the whole spec was `core.label`'s informal, undocumented, horizontal-only `props.align`. Confirmed via full spec re-read (v1.1 PDF through v1.7) that no version defines alignment or positioning for any component type. See `docs/FlightDeck-Widget-Standard-v1.8.md` for the full normative delta spec.

**Added two new generic per-component `style` fields, available on every component type** (not per-type props — consistent with how `typography`/`border`/`background` already work):
- `style.align = { h: 'left'|'center'|'right', v: 'top'|'center'|'bottom' }` — coarse content placement within the component's own box.
- `style.offset = { x, y }` (px) — a `transform: translate()` pixel nudge layered on top of `align`, for truing up two adjacent components whose default rendering doesn't quite line up (the actual fix for the reported symptom).

**Implementation, in the canonical `shared/widgets/components/`** (then `node scripts/sync-shared.mjs`'d into both apps — see the sync-discipline correction above):
- `BaseComponent.applyStyles()`: applies `align` as `justifyContent`/`alignItems` on the component's own wrapper, **and** on a new `boxNode` reference for the component types whose visible surface is an inner node that itself fills the wrapper edge-to-edge and is its own flex container (`core.display`'s `readoutBox`, `core.indicator`'s `indBox`, `core.button`'s already-tracked `btnNode`) — the wrapper's own alignment has no visible effect on those, same underlying issue as the Typography fix earlier today. `core.input` is a further special case (no children to flex-align): `align.h` sets the input's own `text-align`; `align.v` is a deliberate no-op there (ADR below). `offset` applies a `translate()` to whichever content node the type registers (`labelNode`/`valueNode`/`inputNode`/`btnNode`/`dotNode`, priority order).
- `DisplayComponent.js`/`IndicatorComponent.js`: now register `this.boxNode` (readoutBox/indBox respectively), following the same render-order-fix pattern as the Typography work (re-run `applyStyles()` after the node exists).
- `LabelComponent.js`: migrated `this.textNode` → `this.labelNode` (so it participates in the generic node cascade like every other type), and kept `props.align` as a renderer-level fallback — used only when `style.align.h` is absent — for backward compatibility with widgets shipped before v1.8 (`garmin-widgets/`, `working-widgets/`, etc. — confirmed several real widgets use it via grep).
- `StudioInspector.js`: added a "Content Alignment & Position" subsection to the existing "VISUAL STYLING & TYPOGRAPHY" panel (H/V align selects + X/Y nudge number fields), removed the now-redundant `core.label`-only "Text Alignment" dropdown, and added an eager migration (same `queueMicrotask` pattern as the earlier `presetSlot` fix): the moment a `core.label` with `props.align` set and no `style.align.h` is opened in the inspector, it's rewritten to `style.align.h` and `props.align` is cleared.
- `StudioCanvas.js` (design-canvas mock renderer, Studio-only, not part of the shared sync): added a generic post-pass after the existing per-type switch, applying `align`/`offset` the same way — simpler single-pass version since the mock's text spans are always direct children of `container` (no nested box structure to worry about there, unlike the real renderer).

**ADR — user-confirmed design decisions (asked via clarifying questions before implementing):**
1. **`core.label`'s legacy `props.align` handling: migrate immediately** (not "keep as permanent fallback + redundant UI") — the Studio UI's dedicated label-only control is removed and any label opened in the inspector is rewritten onto the new unified `style.align.h` right away. (The renderer-level `props.align` fallback still exists underneath this — required regardless, for widgets never re-opened in Studio; see spec §1.1's migration note for why that distinction matters.)
2. **`core.input` keeps its full-size touch target** — `align.v` has no visible effect on `core.input` (it fills its box edge-to-edge on purpose, for touchscreen reliability) rather than shrinking it to an intrinsic height so vertical align could move it. `offset.y` is the correct tool for `core.input`'s vertical fine-position instead.

**Verified live:** set `input_com1_stby`'s `align.h` to `right` and `offset.y` to `-3` via the actual Property Inspector controls — confirmed both the design canvas's mock `<span>` (`textAlign:"right"`, `transform:"translate(0px, -3px)"`) and the real Simulate-mode `<input class="fd-comp-input-field">` (`getComputedStyle` → `text-align:right`, `transform: matrix(1,0,0,1,0,-3)`) updated correctly. Set `disp_com1_act`'s `align.h` to `right` and confirmed `.fd-comp-display-box`'s own `justify-content` (not just the outer wrapper) changed to `flex-end` — the `boxNode` fix, without which this would have silently had zero visual effect. Confirmed `label_act_com1` (a real component in the loaded widget, `props.align:"left"`, no `style.align`) auto-migrated to `props:{text:"ACT"}` / `style.align:{h:"left"}` the moment it was opened in the inspector, and still renders identically (`justify-content: flex-start`) after migration — zero visual regression. Zero console errors throughout. Re-ran `diff -rq` confirming `shared/` and both apps' component directories stayed in sync after the change.

## Fixed dead Typography/Border/Background properties in the Property Inspector — 2026-08-25

User noticed changing Font Size under Typography did nothing to an `core.input` field's rendered text, and asked for a full audit of the Property Inspector sidebar for other properties that write to config but never actually affect rendering. Audited every category (Typography, Appearance/Border/Background, Layout, Layering, Props, Bindings, Interaction Triggers, Visibility/Guard) across both of Widget Studio's independent preview renderers — the design-mode canvas (`StudioCanvas.js`) and the Simulate/Device-view renderer (`BaseComponent.js` + `widgets/components/*Component.js`).

**Found three distinct root causes**, all affecting Typography for `core.input`/`core.button`/`core.display`/`core.indicator`, plus Border/Background for `core.button`/`core.input`:

1. `StudioCanvas.js`'s design-canvas mock renderer hardcoded literal font values (`fontSize:'14px'`, fixed color/family) for `core.input`, and partially hardcoded them (weight/family) for `core.button`/`core.display`/`core.indicator`, instead of reading `comp.style.typography` — this was the direct, primary cause of the reported symptom.
2. `BaseComponent.applyStyles()` (the real Simulate/Device-view renderer) only ever cascaded `typography.color` to the inner `btnNode`/`inputNode`/`labelNode` — `size`/`weight`/`family` were applied only to the (invisible) outer wrapper `<div>`, never to the actual visible surface. `core.display`'s value node wasn't cascaded to at all. Since the inner CSS classes (`.fd-comp-input-field`, `.fd-comp-btn-inner`, `.fd-comp-display-value`) hardcode their own font rules, those silently won over the wrapper.
3. A render-order bug in `ButtonComponent.js`, `InputComponent.js`, `DisplayComponent.js`, and `IndicatorComponent.js`: each calls `super.render()` (which runs `applyStyles()`) *before* creating its own inner node (`btnNode`/`inputNode`/`valueNode`/`labelNode`), so the first — and for non-toggle buttons, only — style pass always ran with that node still `undefined`, silently skipping the cascade even after fixing (2).

**Fix, applied identically in both `widget-studio/widgets/components/` and its separate hand-duplicated copy `flight-deck-pwa/js/widgets/components/`** (these are two independent copies of the same five files, not a shared import — confirmed via diff both were byte-for-byte affected):
- `BaseComponent.js`: generalized the typography/border/background cascade into `textNodes`/`surfaceNodes` arrays covering `btnNode`, `inputNode`, `labelNode`, and (newly) `valueNode`, applied as inline styles directly on those nodes — inline styles always win over a class rule's hardcoded value regardless of specificity, so no CSS changes were needed.
- `ButtonComponent.js`, `InputComponent.js`, `DisplayComponent.js`, `IndicatorComponent.js`: added a second `this.applyStyles()` call immediately after each subclass assigns its inner node, so the cascade actually reaches it.
- `StudioCanvas.js`: replaced the remaining hardcoded typography literals in the `core.input`/`core.button`/`core.display`/`core.indicator` mock-render branches with reads from `style.typography` (keeping the old literals only as `||` fallback defaults for components with no explicit typography set).

**Deliberately left alone:** the Interaction Triggers dropdown still lists `hold`/`doubleTap`/`release`, which are not wired in `BaseComponent.attachInteractions()` — flagged in the audit but intentionally not fixed this pass, per user direction. `core.gauge`/`core.slider`/`core.selector`/`core.rocker`/`core.list`/`core.pad`/`core.ref` render as static schematic icons in the design-mode canvas by design (their real props do drive the Simulate/Device-view renderer correctly) — not a bug, just a simplification of the authoring-time preview.

**Verified live:** loaded the `com12combo` (COM1/COM2 Radios Collapsible) widget in Widget Studio, selected `input_com1_stby`, and changed Font Size from 13→40 via the actual Property Inspector control — confirmed the design canvas's mock `<span>` and the Simulate-mode's real `<input class="fd-comp-input-field">` both updated to 40px. Confirmed per-button border/background colors in Simulate mode now correctly vary per component (previously always fell back to the CSS default on first paint, before the toggle-variant retry path masked it for some buttons). Zero console errors. Syntax-checked all five patched `flight-deck-pwa` files with `node --check` since no FDWS composite widget was installed on this environment's default PWA pages to click-test end-to-end there directly — the PWA patch is byte-identical to the Widget Studio patch already verified live, using the same shared class logic.

**Not yet checked:** whether `working-widgets/` or `garmin-widgets/` contain their own further-duplicated copies of these component-renderer files (the audit only found the two under `widget-studio/` and `flight-deck-pwa/`) — flagged for follow-up if a third copy turns up.

**Correction, same day:** the fix above was originally applied by editing `widget-studio/widgets/components/` and `flight-deck-pwa/js/widgets/components/` directly, missing that `shared/widgets/components/` (see `README.md` §"keeping the widget-component library in sync") is the actual canonical source — those two app directories are one-way sync *output* from `node scripts/sync-shared.mjs` and get silently overwritten the next time anyone runs it. `shared/`'s copies still had the original bugs. Copied the verified-fixed `BaseComponent.js`/`ButtonComponent.js`/`InputComponent.js`/`DisplayComponent.js`/`IndicatorComponent.js` into `shared/widgets/components/` and re-ran `node scripts/sync-shared.mjs`; confirmed both app copies are now byte-identical to `shared/` (`diff -rq`) and the file still parses (`node --check`). `StudioCanvas.js` correctly needed no equivalent change — it's Studio's own design-canvas-only file, not part of the shared sync.

## RESOLVED 2026-08-26 (Widget Studio 2.0, Phase 5): legacy preset-editing paths removed — see `docs/FlightDeck-Widget-Standard-v1.16.md`

Executed the checklist below, with two adjustments the widget author made explicitly rather than following it literally:
- Step 1's migration target `navradios.json`/`comradios.fdwidget` were **deleted outright** instead of migrated — confirmed by the author as old/unused, not part of the shipped widget set (along with `navPresetEditor.json` and all three files' `pc-bridge/widgets/` mirrors).
- Step 2's sweep found the migration was still needed elsewhere: `sampleWidgets.js`'s and `StudioTemplates.js`'s own NAV1/COM Radios samples, and `pc-bridge/widgets/com_flightdeck_com1com2radio.fdwidget`, were all still on `core.applyPresetToField` (the "reference widget already half-migrated" note below was about the now-deleted `navradios.json`, not these — they were never touched by that earlier partial migration). All three migrated to the modern pattern before the action was removed, so nothing shipped broke. Also found and deleted an orphaned, independently-stale duplicate (`shared/widgets/definitions/com.flightdeck.comradios.json`, imported by nothing) that had drifted all the way back to pre-v1.10/v1.14 field names.
- Step 3 executed: `core.applyPresetToField` removed from `InteractionDispatcher.js` (the one shared dispatcher since Phase 0 — not three separate files anymore) and `PropertyRegistry.js`'s `ACTIONS`. No `PresetEditModal.js` existed to delete by this point.
- Step 4's distinction held: this was "no widget the app still ships uses it," confirmed by grep across the whole tree before removing the runtime case.

`core.editPreset` was already removed in v1.10 (see that entry above) — this pass only concerned `core.applyPresetToField`, the one action still standing from this checklist.

---

## Flagged: legacy vs. modern preset-editing paths — reference this before ever removing the legacy mode/widgets

User's insight, confirmed by tracing the actual dispatcher code: `core.applyPresetToField` and `core.editPreset` are **legacy actions**, both existing purely to gate access to `openPresetEditModal()` (`flight-deck-pwa/js/widgets/components/PresetEditModal.js`) — a hardcoded, fixed COM/NAV frequency-tuning dialog baked into the runtime. `applyPresetToField` bundles two behaviors: an "apply" half (copy a configured preset's freq into a target field + dispatch the sim write event) and an "edit" half (if the slot is unconfigured, pop open the legacy modal, unless `openEditorIfEmpty: false` disables it). `editPreset` unconditionally opens the same legacy modal.

**The modern replacement, already built and working:** `longpress` → `core.openWidgetPopover` opens an author-designed custom popover widget (full control over fields, layout, Save/Cancel semantics) instead of the fixed legacy modal; `tap` → chained `core.setLocalState` + `core.dispatchEvent`, each using the `fromStateRef` option added earlier today, fully replaces `applyPresetToField`'s "apply" half using composable primitives instead of a single-purpose action.

**Confirmed this isn't just theoretical — the existing reference widget already prefers the modern path where it can:** `garmin-widgets/radios-atc/com.flightdeck.garmin.navradios.json`'s preset buttons already set `openEditorIfEmpty: false` on their `applyPresetToField` tap action (only using it for the apply half) and already use `core.openWidgetPopover` on `longpress` for editing — i.e., even the "authoritative" shipped widget has already moved off the legacy edit-modal path, just not off the legacy apply-action itself (predates `fromStateRef`'s existence).

**Decision:** do not invest further UI work in Widget Studio for `applyPresetToField`/`editPreset` (dropped/narrowed from the earlier-flagged background task — see `task_2eacc14f`, now scoped to just `core.ackIndicator`, an unrelated action with no legacy baggage that's still worth exposing). Do **not** remove the legacy actions or `PresetEditModal.js` from the runtime yet — `garmin-widgets/radios-atc/com.flightdeck.garmin.navradios.json` and `com_flightdeck_comradios.fdwidget` (and their `pc-bridge/widgets/` mirrors) still reference `applyPresetToField` for their tap-to-apply behavior and would break.

**When it's time to actually remove the legacy mode, this is the checklist:**
1. Migrate `navradios.json`'s and `comradios.fdwidget`'s preset-button `tap` interactions from `core.applyPresetToField` to the modern chained `setLocalState`/`dispatchEvent` + `fromStateRef` pattern (see `com12combo`'s `btn_p1` component for the working reference implementation).
2. Confirm no other shipped/community widget still references `core.applyPresetToField`, `core.editPreset`, or `openPresetEditModal` (grep the whole tree, including `pc-bridge/widgets/`).
3. Only then consider removing the `core.applyPresetToField`/`core.editPreset` cases from `CompositeWidget.js`, `MockWidgetHost.js`, and `StudioCanvas.js`'s dispatchers, and deleting `PresetEditModal.js` (all 3 synced copies) and its `openPresetEditModal` import in each.
4. Note the fields-widget-author distinction: this is purely about the *reference implementation's* own preset buttons — nothing stops a third-party community widget from continuing to use the legacy action even after `navradios.json` migrates, so "safe to remove" really means "no widget the app still ships or actively supports uses it," not literally zero possible usage anywhere.

## Made widget dimensions an exact contract: fixed rows, non-growing columns — 2026-08-25

Follow-up to the Device View rendering-fidelity investigation. User asked the sharper architectural question: rather than continuing to patch CSS to match auto-growing row behavior, should the PWA's dimension model itself be fixed, since "if I design a widget at 20×10, I want it to show up as 20×10" — not as a minimum that content can silently grow past? Agreed this was the better fix. Confirmed columns had the identical latent issue (a bare `1fr` track is implicitly `minmax(auto, 1fr)` per the CSS Grid spec, so a column can also grow past its proportional share to fit content) — same mechanism, same fix needed, on both axes.

**Backed up first:** copied all `garmin-widgets/`, `pc-bridge/widgets/`, `shared/widgets/definitions/`, `working-widgets/`, and `StorageManager.js` (built-in default page layouts) into `working-widgets/backup-pre-fixed-grid-2026-08-25/` before touching anything, in case the behavior change needed reverting.

**The fix, applied identically everywhere a page grid or a widget's own internal grid is built** (6 locations across both apps — real PWA and Widget Studio each independently construct both an outer page grid and a widget's internal grid):
- Rows: `grid-auto-rows: minmax(Npx, auto)` → `grid-auto-rows: Npx` — a widget's declared row count is now `rows × rowHeight + gaps`, always, full stop. Content that doesn't fit is clipped by the widget's own `overflow:hidden` root instead of silently growing every row across the whole page.
- Columns: bare `repeat(N, 1fr)` → `repeat(N, minmax(0, 1fr))` — forces strict proportional division; a component's intrinsic min-content width can no longer widen a column past its fair share.
- Files touched: `flight-deck-pwa/css/grid.css` (`.fd-page-grid`), `flight-deck-pwa/js/core/LayoutEngine.js` (`applyGridToContainer()`), `flight-deck-pwa/js/widgets/CompositeWidget.js` (widget's own internal grid — the real runtime), `widget-studio/js/StudioDeviceView.js` (Studio's page grid AND its widget-instance internal grid — two separate spots in the same file), `widget-studio/widgets/components/WidgetPopoverModal.js` (Studio's popover internal grid — the PWA's own popover modal just constructs a real `CompositeWidget` and inherits the fix from there, so it didn't need a separate edit). Also fixed a small pre-existing inconsistency while in `StudioDeviceView.js`: its widget-instance internal grid used `gap: 3px` where the real `CompositeWidget.js` uses `4px` — now matches.

**Deliberately left alone:** `ContainerComponent.js`'s `core.container` nested sub-grid (an optional internal layout helper for grouping children within a component, not part of a widget's overall declared footprint — auto-sizing may actually be desirable there) and `StudioCanvas.js`'s main Edit View design canvas (a fixed 48×44 authoring-convenience grid that was never meant to preview final on-device appearance — Device View is the dedicated preview surface for that).

**Verified extensively before calling it safe:**
- All 4 built-in default pages (Radios, Autopilot, Lights, Virtual Yoke — native `RadioWidget`/`ButtonWidget`/`DisplayWidget` class instances, not FDWS composites) checked for content overflow after the change: zero overflow on every widget, in every page.
- Installed the user's actual `com12combo` (COM1/COM2 Radios Collapsible) FDWS widget definition into a live PWA session and measured it directly: overall widget overflow is exactly 0px in both axes. (Two small 8px-font labels — "ACT"/"STBY" — clip by ~2px now where the old auto-grow behavior would have silently stretched the whole page's row band to hide it; this is the new system correctly surfacing a genuine tight-fit in the widget's own design, not a bug introduced by the fix — the user can bump that label's row height by 1 or drop to 7px font to close it exactly.)
- Cross-app consistency check: loaded the identical widget definition into both the real PWA (landscape orientation, 1280×720 browser window) and Widget Studio's Device View (Compact profile, landscape) and measured the rendered height in both: **207px in both apps, exactly**, matching the `10 rows × 18px + 9 × 3px gap` formula precisely. This is the concrete proof the fix accomplishes what was asked: Studio's preview and the real PWA now compute pixel-identical widget dimensions for the same widget definition and orientation.
- Zero new console errors in either app (pre-existing WebSocket-to-PC-Bridge connection errors are expected in a dev environment with no bridge running, unrelated to this change).

## Documented: page grid "expansion" past declared rows is accidental, not a feature — 2026-08-25

User asked whether filling a page completely (e.g. a 20×44 portrait page) and adding one more widget causes the page to automatically expand with a scrollable overflow area. Researched end-to-end and confirmed: **yes, this already happens today, but it was never built as a deliberate feature.**

- `LayoutEngine.findNextFreeSlot()`'s row search (`while (row < 200) { ... }`) is hardcoded to 200, completely untied to the page's declared row count — `LayoutEngine` doesn't even store a row count as a property (only `gridCols`).
- `LayoutEngine.hasCollision()`'s boundary check validates columns (`col + w - 1 > this.gridCols`) but has no equivalent row check at all.
- `flight-deck-pwa/css/grid.css`'s `.fd-page-grid` only declares `grid-auto-rows` — no `grid-template-rows` row-count ceiling — so CSS Grid implicitly creates as many row tracks as needed.
- `#content-area` (main.css), the direct parent of the page grid, is `overflow-y: auto`, not clipped.
- `app.js`'s `addNewWidgetToPage()` takes whatever `findNextFreeSlot()` returns and adds it to the page unconditionally, with no bounds check in between.

Net effect: once a page's declared rows are full, adding another widget silently places it at row 45+ and it renders correctly, reachable by scrolling. Confirmed via exhaustive grep that there is no deliberate "expand grid" feature anywhere — no button, menu action, or automatic resize-on-full logic; `Page.setGrid()` exists but its only callers are `StorageManager.js`'s migration routines, never anything user-facing.

**Decision: left as-is for now** (it works, just not on purpose) — deprioritized in favor of finishing the current widget/popover authoring work. Flagged here and in project memory in case it's revisited later, e.g. to make it a deliberate bounded feature with real UX around "your page is extending," or to tighten the missing bounds checks so pages can't silently overflow.

## Fixed Preset Slot Index field silently not saving when left at "0" — 2026-08-25

User reported setting Preset Slot Index to 0 in Studio, but it didn't make it into the exported widget — confirmed by re-checking their file, `presetSlot` was still absent. Root cause: my own fix from earlier today displayed the field's value as `props.presetSlot ?? 0` — so if `presetSlot` was never actually set, the input just showed "0" already, with nothing for the user to change. Since browsers only fire `change` when a value is actually edited, a user who wanted slot 0 (matching what was already displayed) never triggered anything, and the value was never written into the component at all — it only ever existed as a display fallback, not a saved one.

**Fix:** the moment the Property Inspector renders a `core.button` with `variant: "preset"` and `presetSlot` still `undefined`, it now eagerly persists a real `0` via `updateCompProp()` (deferred with `queueMicrotask` to avoid mutating state mid-render). From then on, the displayed "0" is always backed by an actual saved value — no more silent gap between what the UI shows and what actually exports.

**Verified live:** selected a fresh preset-variant button without ever touching the Preset Slot Index field — confirmed `props.presetSlot` was genuinely `0` (not `undefined`) immediately. Confirmed setting it to a different value (2) and deselecting/reselecting the component doesn't reset or reloop it — stays at 2. Zero console errors.

## Fixed Widget Studio Device View rendering to match the real PWA — 2026-08-25

User reported their COM1/COM2 collapsible widget looked visibly different (flatter/wider) in Widget Studio's Device View than on their actual phone, and asked why — with the stated goal that Studio's preview should look identical to the real app.

**Root cause 1:** `StudioState.js`'s `DEVICE_PROFILES.compact` used `rowHeight:14/gap:2` (portrait) and `15/2` (landscape) — values I picked myself earlier this session when doubling the grid, derived by "halving the old numbers," instead of copying the real app's actual current constants. The real app's `LayoutEngine.getGridSpec()` uses `16/3` (portrait) and `18/3` (landscape). Fixed by making `DEVICE_PROFILES.compact` exactly match.

**Root cause 2 (the bigger one):** `StudioDeviceView.js`'s page grid used a rigid `grid-auto-rows: ${spec.rowHeight}px` — every row locked to exactly N pixels, content clipped if it needed more. The real app's `grid.css` uses `grid-auto-rows: minmax(var(--row-height, 16px), auto)` — rows have a *minimum* height that grows to fit actual component content (padding, font size, etc. all compound through nested `1fr` grid tracks' implicit `auto` minimums). Since Studio's rigid rows couldn't grow, a real widget with real text/button content rendered flatter and wider in Studio than it does on an actual phone, where rows organically expand. Fixed by changing to `grid-auto-rows: minmax(${spec.rowHeight}px, auto)`, matching the real app exactly.

**Verified live:** loaded the user's actual widget definition into Studio, switched to the "Compact Phone" profile, and confirmed the page grid now computes `minmax(16px, auto)` / `gap:3px` (previously `14px` rigid / `2px`) and that rows visibly grow (measured 31–40px per row instead of the base 16px) to fit the widget's real button/input content — matching the mechanism that makes the real phone screenshot render taller than a naive "10 rows × 16px" calculation would suggest.

**Not a bug — flagged as a separate, larger finding:** Studio's other three device profiles (Mobile Standard/Pro, Tablet Standard, Tablet Pro/Desktop — 14×30, 24×36, 30×44 grids) **do not correspond to anything the real PWA currently implements.** Confirmed via grep: `LayoutEngine.getDeviceTier()` exists but is never called anywhere; `getGridSpec(orientation)` takes no device-size parameter at all — every device, phone or tablet, gets the identical compact 20×44/44×20 grid in the real app, full stop. Any widget designed against Studio's non-compact profiles will NOT look the same when actually placed in the PWA today, regardless of the real device's screen size. This needs a decision from the user: implement real multi-tier grid support in the PWA, or restrict/label Studio's device picker to reflect that only "Compact" currently means anything in the shipped app.

**The "TRANSPONDER" widget visible below the user's widget in their Device View screenshot is intentional, not a bug** — `StudioDeviceView.js`'s `renderAmbientCompanionWidgets()` deliberately fills empty page space with fake demo content to visualize "what a realistic page might look like around your widget." It is never part of the actual exported widget and will not appear when the widget is really placed on a page in the PWA.

## Confirmed "preset label/freq not showing on button" is an authoring gap, not a bug — 2026-08-25

Same user, same widget: their `btn_p1` preset button showed a static `"---"` instead of the popover-edited frequency. Checked the uploaded `.fdwidget` file directly — `btn_p1.props` has `variant:"preset"` and `binding.stateVar:"presets"` but is missing `presetSlot` entirely. Since `ButtonComponent.js`'s dynamic-label logic is gated on `props.presetSlot !== undefined`, the button falls through to its static `props.label` unconditionally — this exactly reproduces the reported symptom and needs no runtime fix (the display mechanism itself, and the Studio UI field for `presetSlot`, were both already fixed earlier today). Confirmed live: setting `presetSlot:0` and populating `presets[0]` made the button correctly display `"118.700"`. User needs to reopen `btn_p1` in Studio's Property Inspector, set Preset Slot Index to 0 (already exposed in the UI), and re-export.

## New runtime feature: `fromStateRef` on `setLocalState`/`dispatchEvent`, plus `presetSlot` UI field — 2026-08-25

User building tap-to-apply preset buttons deliberately avoiding the legacy `core.applyPresetToField` action (considered old code, likely to be deprecated in favor of the popover-based pattern) asked for two things: (1) show the popover-edited label/freq on the preset button itself, (2) make tapping a populated preset button copy its frequency into the standby field, without using `applyPresetToField`.

**(1) turned out to already be fully built into the runtime, just missing one Studio UI field.** `ButtonComponent.js`'s `update()` already displays `presets[props.presetSlot].freq` (or `.label`, or `'---'`) as the button's own label automatically, reactively, whenever its bound `presets` state var changes — exactly the mechanism needed, zero new runtime code. But `props.presetSlot` was never exposed anywhere in Studio's `core.button` Property Inspector (`StudioInspector.js`) — "Preset Memory Slot" was selectable as a Button Variant, but functionally inert without hand-editing JSON to add the slot index. **Fix:** added a "Preset Slot Index" number field, shown only when Variant = Preset.

**(2) needed a real runtime addition**, mirroring the `core.commitToHost.field` precedent from earlier today: added an optional `fromStateRef` to both `core.setLocalState` and `core.dispatchEvent`, reading via the same `StateRefPath.js` "`name[index].field`" grammar popovers already use (e.g. `presets[0].freq`) instead of only a static literal or `eventData.value` (which a plain button tap never carries). This lets a preset button's `tap` chain two modern-primitive interactions — `setLocalState(field: stbyFreq, fromStateRef: presets[0].freq)` then `dispatchEvent(event: stbySet, fromStateRef: presets[0].freq)` — fully replacing what `applyPresetToField` used to do, without touching that legacy action at all. Implemented identically across all three interaction dispatchers that exist in this codebase: `flight-deck-pwa/js/widgets/CompositeWidget.js` (real runtime), `widget-studio/widgets/components/MockWidgetHost.js` (Device View popover/page simulator), and `widget-studio/js/StudioCanvas.js` (the single-widget Interactive Sim mode's separate lightweight mock — brought in for consistency even though it wasn't strictly asked, so all three simulation surfaces behave identically to the real app).

**Widget Studio UI additions:** the Add Interaction modal's `core.setLocalState` and `core.dispatchEvent` payload editors (`StudioInspector.js`) each gained a "From State Ref (optional)" field that overrides the existing static Value field when filled in. Also fixed a small pre-existing gap while touching `core.dispatchEvent`'s editor: it previously had no Value field at all — `onSubmit` silently hardcoded `actionObj.value = 1` regardless of what an author might want dispatched; now there's a real Value input, consistent with `setLocalState`'s. `StudioValidator.js` gained a matching cross-check for `fromStateRef` — validates the path parses via `parseStateRef` and that its base name is a declared state var — mirroring the existing `commitToHost.field` check. Interaction cards in the panel now also show a "From: ..." line when `fromStateRef` is set.

**Verified live, full stack:** confirmed the Preset Slot field renders and persists in the Property Inspector; confirmed `fromStateRef` round-trips correctly through the Add Interaction modal into the action JSON and displays on the interaction card; confirmed `StudioValidator.validate()` is clean on a correct widget and warns on an undeclared `fromStateRef` base name. End-to-end runtime test against `MockWidgetHost.js`: a preset button bound to a 4-entry `presets` array with `presetSlot: 0` displayed `"118.700"` (from `presets[0].freq`) automatically on render; simulating its `tap` correctly set `stbyFreq` to `"118.700"` and dispatched `stbySet` with that same value — no `applyPresetToField` involved anywhere. `node --check` clean on all five edited files. Zero console errors throughout.

## Widget Studio: structured Array Items builder for state var defaults — 2026-08-25

User asked whether declaring an `array`-typed state var's default value (e.g. a `presets` array of `{label, freq}` objects, needed for the preset-editor popover work) could be done entirely through Widget Studio's UI, without hand-typing JSON. Confirmed it couldn't: the Add/Edit State Variable modal's "Default Value" field (`StudioLayersPanel.js`) was a single-line text input that had to contain valid JSON typed directly into it, for any array default no matter how simple.

**Fix:** replaced that field, for `type: "array"` only, with a structured row-based builder — "+ Add Text Item" / "+ Add Object Item" buttons, per-item "✕ Remove Item", and for object items, per-field key/value inputs with "+ Field" / "✕" controls, all generic (works for any array-of-objects or array-of-scalars shape, not just presets). No JSON typing required for the common case. A collapsed "Advanced: Edit as JSON" textarea remains available as an escape hatch for shapes the row grid can't represent (nested arrays, etc.), two-way synced with the row builder.

**Bug found and fixed during my own verification, before it shipped:** the initial implementation mutated the builder's backing array (`arrayItems`) only on each input's `change` event (which only fires on blur/Enter), then had "+ Add Item"/"✕ Remove Item" call `renderArrayItems()` — which rebuilds the *entire* row list from that backing array. Result: editing one row, then clicking an add/remove button *anywhere else in the list* while that edit was still unblurred would silently discard it, since the rebuild used stale data. Fixed by making every structural mutation (add item, remove item, add field, remove field) first re-read the *entire* builder's live DOM state via a shared `readArrayItemsFromDom()` helper, then mutate, then re-render — so no unblurred edit can ever be lost regardless of which control triggers the rebuild. The same helper is now also what `onSubmit` and the "Advanced: Edit as JSON" toggle use, so all three paths agree on what "current state" means.

**Verified live:** built a `presets2` array var with an object item (`{label:"TWR", freq:"118.700"}`, both fields left unblurred) followed by a text item (`"second-item"`, also unblurred) — submitted directly without triggering any `change` events, confirmed the state var's `default` came out exactly `[{"label":"TWR","freq":"118.700"},"second-item"]`. Repeated with two object items, edited both without blurring, removed the first item, then submitted — confirmed the second item's unblurred edit (`{"label":"ATIS"}`) survived correctly. Zero console errors throughout, `node --check` clean.

## New runtime feature: `core.commitToHost.field`, for staged Save/Cancel popovers — 2026-08-25

User designing a preset-editor popover wanted true Save/Cancel semantics: stage edits in local scratch state as the user types, only commit them to the host when an explicit Save button is pressed, discard everything on Cancel. Confirmed this wasn't previously possible: `core.commitToHost`'s handler in `CompositeWidget.js` only ever read `eventData.value` — the value carried by whatever native DOM event fired the interaction — and a button's own `tap` event carries no value at all, so a Save button had no way to reach into a separate input component's typed value. Also confirmed in passing that the `applyOn: 'onHostTap'` Context Map option (already exposed in Studio's UI) is fully unimplemented — `WidgetPopoverModal.js`'s `onCommitToHost` writes immediately regardless of what `applyOn` says; grepped the whole PWA and found zero consumers of that string anywhere.

**Fix — new optional `action.field` on `core.commitToHost`:** when present, commits `this.getLocalState(action.field)` (a named local state var) instead of `eventData.value`. This lets a popover author bind inputs to local scratch state (writes there work fine — the only privilege check is on writes to `$context.*`, not to normal local vars), and have a Save button chain multiple `commitToHost` interactions (one per field, each naming its own scratch var) followed by `core.closePopover`, while Cancel just does `core.closePopover` alone with nothing committed. Implemented identically in both real interaction dispatchers: `flight-deck-pwa/js/widgets/CompositeWidget.js` (the actual runtime) and `widget-studio/widgets/components/MockWidgetHost.js` (Device View's popover simulator, a parallel implementation Studio maintains since it has no `CompositeWidget`/`WidgetRegistry` of its own — confirmed via its own docstring this exists specifically to mirror the real dispatcher). `MockWidgetHost.js` isn't part of the `shared/` sync (no `shared/widgets/components/MockWidgetHost.js` exists), so it needed its own direct edit.

**Widget Studio UI updated:** the Add Interaction modal's `core.commitToHost` fields (`StudioInspector.js`) gained a "Local State Field to Commit (optional)" text input alongside the existing Context Key field, with a hint explaining when to use it. `StudioValidator.js` gained a matching undeclared-state-var warning for `action.field`, mirroring the existing `compose.stateVar` cross-check pattern.

**Also fixed while in there:** the pre-existing `binding.stateVar` "undeclared state variable" validator warning didn't exempt `$context.*` bindings — meaning every legitimately-authored popover field using the Custom stateVar option added earlier this session would trip a false-positive warning. Excluded `$context.`-prefixed names from that check.

**Verified live, full round trip:** built a test host + popover directly against `MockWidgetHost.js`/`WidgetPopoverModal.js` (Studio's Device View simulator) — opened the popover, typed into an input bound to local scratch state (`scratchFreq`), tapped a Save button with `commitToHost(field: 'scratchFreq') → closePopover` chained on one `tap` trigger, confirmed the host's real state (`hostFreq`) updated to the typed value and the popover closed. Repeated with a Cancel button (`closePopover` only) after typing a different value — confirmed the host's state was untouched and the popover still closed correctly. Confirmed via `StudioValidator.validate()`: a clean widget validates with zero warnings, an undeclared `field` reference correctly warns, and a `$context.*` binding correctly does not. Confirmed the new modal field renders via `openAddInteractionModal()`. `node --check` on all four edited files. Zero console errors throughout.

## Widget Studio: added missing `change`/`focus`/`blur` interaction triggers — 2026-08-25

User building a preset-editor popover got stuck on step 6 of the linking walkthrough: wiring a `core.input` field's `change` trigger to `core.commitToHost` — `change` wasn't in the Add Interaction modal's Trigger dropdown at all.

**Confirmed:** `change` (plus `focus`/`blur`) are real, fully-working runtime triggers — but only for `core.input`, which has its own hand-wired native DOM listeners in `InputComponent.js` (`change`/`focus`/`blur`, separate from every other component's generic tap/longpress pointer-event system in `BaseComponent.attachInteractions()`). Studio's `TRIGGERS` array (`StudioInspector.js`) only ever listed `['tap', 'longpress', 'hold', 'doubleTap', 'release']` — `change` was simply never added.

**Bonus finding:** 3 of those 5 existing options are dead. `hold`, `doubleTap`, and `release` don't exist anywhere in the runtime's interaction-wiring code — only `tap`/`longpress` (pointer events, all components) and `change`/`focus`/`blur` (native DOM events, `core.input` only) actually do anything. The dropdown was offering three non-functional choices while missing three real ones.

**Fix:** added `change`, `focus`, `blur` to `TRIGGERS`. Left `hold`/`doubleTap`/`release` in place (backward-compat for any already-authored widget JSON that might reference them, even though nothing fires them) rather than removing — noted in a comment why they're there.

**Verified live:** loaded the NAV1 Radio template, selected its `core.input`, opened the Add Interaction modal, confirmed the Trigger dropdown now lists `tap, longpress, change, focus, blur, hold, doubleTap, release`. Zero console errors.

## Widget Studio: fixed the same Custom… revert bug in read/write/ack/push — 2026-08-25

Follow-up to the stateVar fix below — user asked to fix the same synchronous-revert bug in the other 4 fields it was flagged in but not fixed for.

**Fix:** all four (`readSimVar`, `writeEvent`, `ackEvent`, `pushEvent`) share one function, `wireBindingKind()` in `StudioInspector.js` — so this was a single change: removed the premature `updateBinding()` call from the branch that fires when the default select switches to `CUSTOM_OPTION_VALUE`, matching the fix already applied to the stateVar field. The block now only reveals itself on selection; the underlying binding value is left untouched until the user actually commits something (via the custom-select's `change` or the custom-input's blur/Enter `change`, both unchanged).

**Verified live:** for `readSimVar` — selected Custom on a `core.display`'s Read Deck Event, confirmed the block stayed visible and the original `nav1ActFreq` binding was untouched immediately after selecting, then typed `L:MyCustomVar` and confirmed it committed correctly with the block still visible afterward. Repeated for `writeEvent` on a `core.button` (which additionally exercises the `customSelect` "used by another saved widget" dropdown, unchanged by this fix) — same correct behavior, committed `H:MyCustomEvent`. `ackEvent`/`pushEvent` use the identical code path so weren't independently re-tested. Zero console errors throughout.

## Widget Studio: added Custom stateVar binding, needed for popover $context fields — 2026-08-25

Follow-up to yesterday's popover-workflow explanation. User building a preset-editor popover (following the `com.flightdeck.garmin.navpreseteditor.json` pattern) got stuck binding a component to `$context.<key>.value` — the "Bound Local State Var (state[])" field in `StudioInspector.js`'s SIMVARS & BINDINGS panel was a plain `<select>` populated only from the widget's own declared `state[]` array, with no free-text fallback (unlike the sibling `readSimVar`/`writeEvent`/`ackEvent`/`pushEvent` fields two rows up, which all already have a "Custom…" option + text input). `$context.*` references are a valid FDWS v1.3 binding target for popovers but aren't declared state vars, so there was no way to enter one through the UI.

**Fix:** added a "Custom…" option to the stateVar select plus a text-input fallback block, mirroring the existing pattern for the other binding fields in the same panel.

**Bug found and fixed while building this, not present in the shipped version:** the existing read/write/ack/push "Custom…" pattern has a latent bug — selecting "Custom…" immediately calls `updateBinding()` with the (still-empty) custom input's value, and since `StudioState.notify()` is fully synchronous, this triggers an immediate full `StudioInspector.render()` that rebuilds the panel from that now-still-empty value — snapping the select back to "None" and hiding the just-revealed text field before a real user could ever type into it. Avoided this in the new stateVar wiring by *not* calling `updateBinding()` when the select merely switches to Custom — only the existing input's own `change` handler (which already only fires on blur/Enter) commits a value. The same latent bug still exists in the four sibling fields (read/write/ack/push) — not fixed here since it wasn't what was asked, flagging in case it's worth a follow-up.

**Verified live:** loaded the NAV1 Radio template, selected its `core.input`, selected "Custom…" on the state-var dropdown (confirmed the text field stayed visible and the existing `stbyFreq` binding wasn't clobbered), typed `$context.currentFreq.value` and confirmed it committed to `binding.stateVar` correctly, and confirmed the dropdown + field both survive the next re-render still showing the custom value. Zero console errors.

## Widget Studio: added missing RAW_TEXT and SQUAWK_CODE value formats — 2026-08-24 (later same day)

User building a preset-label editor in Widget Studio (a popover, following the `com.flightdeck.garmin.navpreseteditor.json` pattern) noticed the `core.input`/`core.display` Format dropdown had no plain-text option, and asked me to confirm and fix it.

**Confirmed:** `RAW_TEXT` was already a real, working runtime format — used by `navpreseteditor.json`'s `label_field` — but only worked by accident: `ValueFormatter.format()` (`shared/widgets/components/ValueFormatter.js`) had no explicit `case 'RAW_TEXT'`, so it fell through to the numeric `default` branch, which happened to return the string unchanged only because `Number("some text")` is `NaN`. Separately, `SQUAWK_CODE` (used by the transponder widget's squawk-code input) *did* have a proper explicit case in `ValueFormatter.js` already, but neither format was listed in `StudioValidator.VALUE_FORMATS` (widget-studio/js/StudioValidator.js) — the array `StudioInspector.js` uses to populate that dropdown — so authors couldn't select either one from the UI, only by hand-editing exported JSON.

**Fix:** added `RAW_TEXT` and `SQUAWK_CODE` to `StudioValidator.VALUE_FORMATS`; gave `RAW_TEXT` an explicit `case` in `ValueFormatter.js` (`formatted = String(val)`) instead of relying on the numeric-fallback coincidence. Edited the canonical `shared/widgets/components/ValueFormatter.js` and ran `node scripts/sync-shared.mjs` to propagate into `flight-deck-pwa/js/widgets/components/` and `widget-studio/widgets/components/`. `StudioValidator.js` itself isn't part of the shared/ sync (Studio-only file), edited directly.

**Verified live:** loaded the NAV1 Radio template into a running Widget Studio session, selected its `core.input` component, confirmed the Format dropdown now lists `RAW_TEXT` and `SQUAWK_CODE` alongside the existing formats; called `ValueFormatter.format('KJFK', 'RAW_TEXT')` → `"KJFK"`, `ValueFormatter.format(1200, 'SQUAWK_CODE')` → `"1200"`, `ValueFormatter.format('', 'RAW_TEXT')` → `"---"` (empty-value guard still applies) — all correct.

## garmin-widgets/ + shared/: doubled remaining widget page-grid footprints — 2026-08-24 (later same day)

Follow-up to the grid-doubling change below — user asked to also check `garmin-widgets/` and `shared/` for the same `layout.defaultW/defaultH/minW/minH` pattern already fixed in `working-widgets/`.

**garmin-widgets/ (8 of 9 files doubled):** `autopilot/com.flightdeck.garmin.gfc.annunciator.json` (22×7/14×5 → 44×14/28×10), `autopilot/com.flightdeck.garmin.gfc.controlpanel.json` (22×16/16×12 → 44×32/32×24), `flight-instruments/com_flightdeck_garmin_attitudeindicator.fdwidget` (7×7/7×7 → 14×14/14×14, description text updated to match), `lights/com.flightdeck.garmin.lighting.exterior.json` (20×10/12×8 → 40×20/24×16), `lights/com.flightdeck.garmin.lighting.interior.json` (16×10/12×8 → 30×20/24×16 — `defaultW` capped at 30 instead of the literal double of 32, since that would have exceeded the widget's own unchanged `maxW:30`), `radios-atc/com.flightdeck.garmin.navradios.json` (10×6/6×4 → 20×12/12×8), `radios-atc/com_flightdeck_comradios.fdwidget` (10×6/6×4 → 20×12/12×8), `radios-atc/com_flightdeck_garmin_transponder.fdwidget` (12×8/8×6 → 24×16/16×12). `maxW`/`maxH` left unchanged everywhere per instruction. Each file's `revision` bumped by 1.

**Left as-is:** `radios-atc/com.flightdeck.garmin.navpreseteditor.json` is `kind: "popover"` — traced `WidgetPopoverModal.js` and confirmed the popover modal card uses fixed CSS sizing (`min-width: 320px; max-width: 92vw`) and never reads `layout.defaultW/defaultH`, so that field is dead for popovers and doubling it would have had no effect.

**Attitude indicator verified not to break:** every internal component (`attitude_sphere`'s bank-rotate + pitch-translate `core.gauge.props.compose`, the FD cue, bank pointers, slip ball, and the full AFCS annunciator grid) is positioned against the widget's own internal `layout.grid: {columns:28, rows:28}`, which is completely independent of the page grid and was left untouched — only the page-placement `defaultW/H`/`minW/H` changed, doubled symmetrically (7×7 → 14×14) so the widget keeps rendering as a square. Verified live in Widget Studio: loaded the updated file into `StudioState`, confirmed all 31 components render on canvas with no console errors, and ran `StudioValidator.validate()` — the only errors returned are pre-existing asset-encoding issues unrelated to this change (each image asset is missing an `"encoding": "base64"` field the validator now expects), not introduced by it.

**shared/ (auto-synced to flight-deck-pwa/ and widget-studio/ via `node scripts/sync-shared.mjs`):** `shared/widgets/definitions/com.flightdeck.comradios.json` (10×6/6×4 → 20×12/12×8, revision 2→3) and the three widgets embedded in `shared/widgets/definitions/sampleWidgets.js` — `com.example.nav1radio` (10×4/6×3 → 20×8/12×6), `com.example.layeredswitch` (8×4/4×2 → 16×8/8×4), and its own embedded `com.flightdeck.comradios` copy (10×6/6×4 → 20×12/12×8) — each revision bumped by 1. Ran the sync script afterward and confirmed both `flight-deck-pwa/js/widgets/definitions/` and `widget-studio/widgets/definitions/` picked up the new values.

**pc-bridge/widgets/ reconciled to match** (separate follow-up, same session): `com_flightdeck_comradios.fdwidget`, `com_flightdeck_garmin_transponder.fdwidget`, and `com_flightdeck_garmin_attitudeindicator.fdwidget` copied wholesale from their now-updated `garmin-widgets/` counterparts (diffed first — only layout/revision/updatedAt/description differed, so a full overwrite was safe); `com_flightdeck_com1com2radio.fdwidget` copied from the now-updated `working-widgets/` generator output. `com_flightdeck_garmin_navradios.fdwidget` — which has known-stale pre-Deck-Events content, already flagged separately as drifted from its `garmin-widgets/` source of truth — got only its `layout.defaultW/H/minW/H` doubled and `revision` bumped in place, deliberately *not* overwritten wholesale, so this pass doesn't silently paper over that pre-existing content-drift issue. Also discovered along the way: `com_flightdeck_comradios.fdwidget` and `com_flightdeck_com1com2radio.fdwidget` in pc-bridge had picked up doubled/partially-doubled layout values from some other, unknown prior process before this reconciliation touched them (newer `updatedAt` than their source-of-truth counterparts) — now fully reconciled regardless of how they got there. All 5 files validated as well-formed JSON with the expected doubled `layout` values after the change.

## Doubled compact page grid resolution: 10×22/22×10 → 20×44/44×20 — 2026-08-24 (later same day)

User asked to double the page grid resolution for all devices — the "compact" tier's portrait grid goes from 10 columns × 22 rows to 20×44, landscape from 22×10 to 44×20 — for finer-grained widget placement, without changing the physical on-screen device size.

**PWA (`flight-deck-pwa/`):** updated every hardcoded default-grid literal to the new values and halved `rowHeight`/`gap` (portrait 32px/6px → 16px/3px; landscape 36px/6px → 18px/3px) so a page's total rendered height stays essentially unchanged even though it now has twice as many rows — `js/models/Page.js` (constructor defaults, config-driven fallbacks, and the legacy v1/v2→v2.3 grid-adapt migration path), `js/core/LayoutEngine.js` (`getGridSpec()`, constructor default, `mirrorLayout()` default params), `css/grid.css` (CSS custom-property fallbacks), `js/app.js` (initial `LayoutEngine` construction, drag-clamp fallback, and the portrait/landscape full-vs-half-width proportional mapping used when adding a new widget), and `js/ui/PropertyInspector.js` (the manual resize stepper's col/row max bounds — also fixed a pre-existing bug there where the height-max check was hardcoded to 22 regardless of orientation instead of respecting each orientation's own row count).

**Built-in default profiles & migration (`js/core/StorageManager.js`):** all four built-in pages (Radios, Autopilot, Lights, Virtual Yoke) had their portrait/landscape grid blocks and every widget's `col`/`row`/`x`/`y`/`w`/`h` doubled in place (e.g. COM1's portrait `w:10,h:4` → `w:20,h:8`), preserving each widget's proportional footprint and position on the new denser grid. Bumped the default profile version to `2.4.0` and added a second migration stage (`upgraded4x` flag, mirroring the existing `2.3.1`/`upgraded2x` stage that did the original 5×11→10×22 doubling) so any previously-saved profile — built-in or user-created — gets its grid and widget coordinates doubled again on next load, without re-doubling profiles that already went through it.

**Built-in widget default sizes (`js/widgets/WidgetRegistry.js`):** doubled every catalog widget's `defaultLayout` (`ButtonWidget`, `DisplayWidget`, `RotaryWidget`, `AnnunciatorWidget`, `RadioWidget`, and the Virtual Yoke system widgets) so newly-placed widgets keep the same proportional size on the new grid; also doubled the FDWS custom-widget-definition fallback size (used when a `.fdwidget` doesn't declare its own `layout.defaultW`/`defaultH`) from 8×4 to 16×8.

**Widget Studio (`widget-studio/js/`):** `StudioState.js`'s `DEVICE_PROFILES.compact` grid doubled to 20×44/44×20, with `rowHeight`/`gap` halved (28px/5px → 14px/2px portrait; 30px/5px → 15px/2px landscape) while keeping the simulated device's physical `width`/`height` (380×740 / 740×380) unchanged — otherwise every cell in the Studio's device simulator would have rendered at half its previous pixel size. `StudioDeviceView.js`'s doc comment and the device-picker dropdown's "Compact Phone" label text updated to match.

**`working-widgets/` (in-progress COM 1/2 Radio):** `build-com1com2radio.mjs`'s `layout.defaultW/defaultH/minW/minH` (the widget's page-grid placement footprint, not its own internal component grid) doubled from 10×5/6×4 to 20×10/12×8 so it keeps the same relative on-screen size when placed; `layout.grid: {columns:24, rows:11}` — the widget's own internal component-authoring space — is independent of the page grid and left untouched. Regenerated `com_flightdeck_com1com2radio.fdwidget` from the script (`node build-com1com2radio.mjs`) and bumped `revision` to 2.

**Left as-is (already compatible or out of scope):** `SecurityValidator.js` (byte-identical across `flight-deck-pwa/`, `shared/`, `widget-studio/`) and `StudioValidator.js`'s 1–44 column/row bounds validate a *widget's own internal component-authoring grid* (unrelated to the page grid, default 12×6), and the new landscape page-grid column count (44) already fits inside that ceiling with no change needed. A stale on-disk exported profile at `pc-bridge/page_presets/profile_1787543982460.json` still has old-size grid data but doesn't need manual fixing — it will pick up the new `StorageManager.js` migration stage automatically the next time it's loaded into the PWA.

## New widget: COM 1/2 Radio (Collapsible) + Widget Studio simulator fix — 2026-08-24 (later same day)

User asked whether a combined COM1/COM2 radio widget — COM1 always shown, with a small header toggle that swaps a COM2 section in and out in place of the preset shelf — was possible with current FDWS, ahead of building it as a working draft (first of a pair; a NAV1/2 equivalent is planned next). Confirmed it needed no spec or runtime changes: `visibleWhen` (two component sets sharing identical grid cells, gated on the same boolean state var with opposite `equals`) and `core.toggleLocalState` already cover it exactly, the same pattern already shipping in the Garmin Attitude Indicator's AFCS annunciator lanes.

**Built:** `working-widgets/com_flightdeck_com1com2radio.fdwidget` (`fdws: "1.1"` — needs nothing newer), generated via `working-widgets/build-com1com2radio.mjs` (kept alongside the output so the grid-position math is easy to re-derive rather than hand-edited). COM1 section is byte-for-byte the default COM Radios widget's own layout/bindings. A single `core.button` (`variant: "toggle"`, `hasLed: true`, bound to a new local-only `com2Visible` boolean state var, `persist: true`) replaces what would otherwise have been two separate mutually-exclusive-labeled buttons — `ButtonComponent.js`'s existing toggle variant already lights the button (cyan glow + LED) whenever its bound value is truthy, so one button fully communicates the shown/hidden state. COM2's SimVars stay subscribed even while its section is hidden (`visibleWhen` only gates rendering, not the subscription), so revealing it is never stale. Presets keep applying to COM1's standby field, matching the source widget's own existing behavior exactly. `working-widgets/` is a new top-level scratch folder for widgets not yet promoted into `garmin-widgets/` — user confirmed `garmin-widgets/` remains the current release set and the widget lineup will be reconsidered before release, so nothing here is wired into any installed catalog yet.

Passed both `StudioValidator.validate()` and the runtime `SecurityValidator.validateFDWSDefinition()` clean (0 errors, 0 warnings) before any live testing.

**Verification gap found and fixed along the way:** Widget Studio's own "Live Interactive Simulator Mode" (`StudioCanvas.js`'s `renderInteractiveSimComponents()`) turned out to have no `handleInteraction()` method on its mock widget host at all — `BaseComponent.js`'s tap/longpress handlers call `this.widget?.handleInteraction?.(...)`, optional-chained, so a missing method fails silently rather than throwing. Practically: **no interaction of any kind has ever done anything in Widget Studio's simulator** — not just this widget's toggle, any `interactions[]` entry on any widget, since the mock only ever implemented the primitives (`setLocalState`/`swapLocalState`/`dispatchSimEvent`) a real dispatcher would call, never the dispatcher itself. Separately, the mock's `setLocalState`/`swapLocalState` never notified any other component when a shared state var changed — no `visibleWhen` re-evaluation, no `compose.stateVar` re-render — so even a correctly-authored show/hide widget would appear inert in Studio while working correctly in the real PWA.

**Fix:** added a `handleInteraction()` to the mock host mirroring `CompositeWidget.js`'s real dispatcher for the locally-resolvable action types (`core.dispatchEvent`, `core.setLocalState`, `core.swapLocalState`, `core.toggleLocalState`, `core.applyPresetToField`'s already-configured-preset path, `core.ackIndicator`); the actions needing real host UI the lightweight canvas mock has no business reimplementing (`core.editPreset`, `core.openWidgetPopover`, `core.commitToHost`, `core.closePopover`, `core.openPopover`) log an explicit "test this in the actual PWA" message instead of silently doing nothing, so an author isn't left guessing whether their widget or the simulator is broken. Added a `rendererMap` (component id → renderer) and a `_notifyDependents()` helper replicating `CompositeWidget.js`'s real `setLocalState()` reactive-update loop — a changed var now re-renders every component whose `binding.stateVar`/`props.compose.stateVar`/`props.compose.relativeToStateVar` names it, and re-evaluates `visibleWhen` on every other component, exactly as the real runtime does.

**Verified live, end to end:** imported the widget into a real running flight-deck-pwa instance (not just Widget Studio) via `WidgetRegistry.installDefinition()` + `addNewWidgetToPage()`, placed it on a page, and drove it with real `PointerEvent('pointerdown'/'pointerup')` dispatch (matching `BaseComponent.attachInteractions()`'s actual listener pair — a plain synthetic `click()` on the inner `<button>` does *not* trigger it, since interactions are wired on `pointerdown`/`pointerup` on the component wrapper, not a click handler) against the widget's real Shadow DOM (`WidgetSandbox.js` renders each widget instance into its own shadow root — `document.querySelector` alone won't find component content; `element.shadowRoot.querySelector` does). Confirmed: default state shows COM1 + presets, COM2 hidden; tapping the toggle lights it, reveals the full COM2 section (tag/box/active display/swap/standby label/input), and hides the entire presets section — all in the same grid footprint; tapping again reverts cleanly; COM1 is untouched throughout. Re-verified the same toggle sequence inside Widget Studio's now-fixed Live Interactive Simulator Mode after the `StudioCanvas.js` fix, with matching results.

## Widget Studio — audit and fix of FDWS v1.3–v1.7 authoring gaps — 2026-08-24 (later same day)

User asked for a full audit of Widget Studio against every FDWS version from v1.3 onward — which spec features/properties were never wired into the authoring UI — plus a fast/normal toggle for the new `pollFrequencyHz` field. Audited by cross-referencing every runtime `binding.*`/`state[].*`/`props.*` field actually read by `flight-deck-pwa/js/widgets/` and `.../components/` against what `widget-studio/js/StudioInspector.js` and `StudioLayersPanel.js` exposed as editable UI.

**Findings:**
- v1.3 (Widget Popovers — `kind`, `core.openWidgetPopover`/`core.commitToHost`/`core.closePopover`, `$context`) — **already fully implemented**, including a real `popoverWidgetId` picker per the spec's own adoption-note recommendation. No gap.
- v1.4 (`revision`) — already handled (auto-incremented on save). No gap.
- v1.5 (`core.gauge.props.compose`) and v1.6 (`compose.relativeToStateVar`) — **zero editor UI anywhere in the codebase** (confirmed via repo-wide grep — not in the inspector, not in the validator). The Garmin Attitude Indicator widget, which is *built entirely around* `compose`, could never have been authored through Widget Studio at all — it was necessarily hand-edited as raw JSON outside the tool.
- v1.7 (`pollFrequencyHz`) — new field from earlier today, not yet wired anywhere in Studio (expected).
- Broader audit ("verify no other properties were omitted") surfaced more gaps predating v1.3: `binding.deadband`, `binding.transition`, `binding.unit`, `binding.ackEvent`, `binding.pushEvent`, and `binding.eventCategory` were all real, runtime-read fields with **no editor UI** — the binding editor only ever exposed `readSimVar`/`writeEvent`/`stateVar`. `core.gauge.props.pivot`/`axis`/`clamp` were similarly unexposed. The state-variable editor (`StudioLayersPanel.js`) only supported add/delete, never edit; had no `syncFrom` field at all (a state var could never actually be wired to live telemetry from the UI); and its `type` dropdown offered a non-standard `"list"` value instead of FDWS's actual `"array"` (Appendix A, v1.2 §3.2) — confirmed live: the built-in NAV 1 Radio template's own `presets` state var used `type:"list"` and immediately tripped a validator warning once the audit added one.

**Fix — all shipped in `widget-studio/js/`:**
- `StudioInspector.js`: `core.gauge`'s props editor rewritten to add `axis`, `clamp`, `pivot` (x/y), and a full "Composed Secondary Transform" section — a checkbox that reveals `transform`/`axis`/`stateVar`/`relativeToStateVar` (a `def.state`-driven picker)/`valueRange`/`outputRange`/`clamp`, backed by a small compose-scoped range-editor helper since the existing `renderRangeEditor()` only writes to top-level `props`. The "SIMVARS & BINDINGS" editor gained a Poll Rate select (**Normal (1Hz) / Fast (~100Hz)** — exactly the fast/normal choice requested, mapping to `pollFrequencyHz: 1` or `100`), Dead Band, Transition (duration + easing), Unit, and a collapsed "Advanced" sub-section for Ack Event / Push Event / Event Category — kept collapsed by default so new users aren't confronted with rarely-needed fields, while power users get full access one click away.
- `StudioLayersPanel.js`: state-variable "Add" modal replaced with a combined Add/Edit modal (new pencil-icon edit button per card, wired to the previously-unused `StudioState.updateStateVar()`) adding `syncFrom` (a Deck Event picker matching the binding editor's own UX pattern, with a custom/array-feed-name fallback), `persist` (auto-disabled for `type:"array"`, matching the runtime's own persist-disallow rule), `deadband`, and the same Fast/Normal `pollFrequencyHz` toggle — needed here specifically because a `core.gauge.props.compose.stateVar` reads from `state[]`, not a live component binding, so a fast-tier value feeding a compose transform (e.g. the attitude indicator's `attPitchDeg`) has nowhere else to declare its poll rate. Type dropdown's non-standard `"list"` replaced with the spec-correct `"array"`.
- `StudioValidator.js`: added cross-checks for `compose.stateVar`/`compose.relativeToStateVar` (undeclared-state-var warnings, same pattern as the existing `binding.stateVar` check), `pollFrequencyHz` type/positivity checks (component binding and state entries), and a warning for any surviving `type:"list"` state var nudging authors toward `"array"`.
- **Suite-wide `type:"list"` → `"array"` fix**, not just Widget Studio: the same non-conformant value was baked into 11 files across `flight-deck-pwa/`, `shared/`, `widget-studio/`, and `garmin-widgets/`'s own shipped default/sample widgets (`sampleWidgets.js` ×3, `StudioTemplates.js`, `com.flightdeck.comradios.json` ×3, and four `.fdwidget`/`.json` community-pack files). All corrected; `revision` bumped on the widget/definition files (not the `.js` template sources, which don't carry one). Verified live against a running Widget Studio session: before the fix, a fresh NAV 1 Radio template tripped the new validator warning on its own `presets` state var; after, it validates fully compliant with zero warnings.
- **Found, not fixed (flagged separately):** `pc-bridge/widgets/com_flightdeck_comradios.fdwidget` and `pc-bridge/widgets/com_flightdeck_garmin_navradios.fdwidget` — the "synced" copies of two garmin-widgets community widgets — have drifted from their `garmin-widgets/radios-atc/` source of truth; the navradios one is badly stale, still using pre-Deck-Events snake_case identifiers (`nav1_act`, `NAV1_SET`) the rest of the suite abandoned 2026-08-23. Pre-existing drift, unrelated to and not worsened by this change's `sed`-only edit to those files' `type` field. Spawned as a separate background task rather than folded into this change.

**Verified live** (Widget Studio running against `.claude/launch.json`'s `widget-studio` config): added a `core.gauge`, toggled Compose on, set `stateVar`/`relativeToStateVar` via the new pickers, confirmed the resulting JSON round-trips through `props.compose.{stateVar,relativeToStateVar}` correctly; set Poll Rate to Fast + Dead Band + Transition on a binding, confirmed `binding.pollFrequencyHz`/`deadband`/`transition` all persist; opened the state-var Edit modal, confirmed every field (including `syncFrom`) pre-fills from existing data, changed Poll Rate to Fast, confirmed `pollFrequencyHz` persists via `updateStateVar()`. Zero console errors throughout.

## FDWS v1.7 — fast-tier SimVar polling (`pollFrequencyHz`), fixes attitude indicator lag — 2026-08-24 (later same day)

User reported the Garmin Attitude Indicator (FD) still felt slow to react to actual attitude changes despite v1.5/v1.6's compose/transform fixes, and asked whether the app's data path should be split into an event-driven lane (buttons, discrete state) and a separately-throttled fast-polling lane (attitude/yoke-class widgets) to fix it.

**Root cause investigated first, before any architecture change:** every dynamic SimVar subscription was already being chunked into SimConnect data definitions of ≤20 fields (`MAX_FIELDS_PER_CHUNK`, unrelated to this bug — see the 2026-08-24 entry below it), but every chunk's periodic request was hardcoded to `SimConnectPeriod.SECOND` (1Hz) in `armDynamicVarRequest()`/`reapplyDynamicSimVars()`. The wire protocol already carried a per-var `pollFrequencyHz` on `SUBSCRIBE_SIMVAR` (`SimBridge.js`, default `20`) — but `pc-bridge/server.js` never read it. So every widget, fast or slow, was already sharing one universal 1Hz "poll everything" path; there was no existing fast lane to split off from. Client-side (`EventBus.ingestTelemetry()`'s RAF-batched flush + per-listener deadband filtering, `CompositeWidget`/`GaugeComponent`'s change-only re-renders) was already efficient and not the bottleneck. The Virtual Yoke page's motion pipeline is a fully separate, already-unthrottled write-only path (device sensors → `AXIS_*_SET`) and was never affected by this bug either way.

**Decision: fix `pollFrequencyHz` handling instead of building a bigger event-driven/polling split.** A full architectural split would have solved a problem this narrower fix already solves, at much higher risk (client pipeline rework, more surface area for the FDWS schema) for no additional benefit — see `docs/FlightDeck-Widget-Standard-v1.7.md` for the full spec.

**Fix, shipped as FDWS v1.7:**
- New optional `binding.pollFrequencyHz` / `state[].pollFrequencyHz` field (§1.1) — a coarse hint, not a literal target rate, since SimConnect's `SimConnectPeriod` enum only offers `NEVER`/`ONCE`/`VISUAL_FRAME`/`SIM_FRAME`/`SECOND` with no arbitrary-Hz option. `pc-bridge/server.js`'s dynamic-SimVar machinery (`subscribeDynamicSimVar()`, `armDynamicVarRequest()`, `reapplyDynamicSimVars()`, the `simObjectData` handler) was split into two fully independent, independently-chunked polling tiers — "normal" (`dynamicVarOrderNormal`, request IDs `NORMAL_VAR_BASE_ID` (1000)+, `SimConnectPeriod.SECOND`, the only tier that existed before this change) and "fast" (`dynamicVarOrderFast`, request IDs `FAST_VAR_BASE_ID` (5000)+, `SimConnectPeriod.SIM_FRAME` — SimConnect's fastest available period). A var's tier is decided once, by whichever subscriber reaches PC Bridge first, and isn't renegotiated afterward (documented known limitation).
- Client-side plumbing: `EventBus.subscribeSimVar()` now accepts and forwards `pollFrequencyHz` (tracked per subscription entry as the max across listeners, for accurate reconnect-resync manifests via `getActiveSchemaManifest()`); `SimBridge.subscribeSimVar()`'s previously-unused wire field now actually matters, and its silent-mismatch default was changed from `20` to `1` (matching the new real default — normal tier — instead of accidentally implying every var wanted a fast rate it was never going to get); `BaseWidget.registerDynamicBindings()` and `CompositeWidget.registerDynamicBindings()` (both the per-component `binding.readSimVar` path and the `state[].syncFrom` path) now read `pollFrequencyHz` off the widget JSON and pass it through.
- `SecurityValidator.js`'s `validateFDWSDefinition()` `fdws` version whitelist extended to include `'1.7'` across all three copies (`flight-deck-pwa/`, `shared/`, `widget-studio/`) plus `widget-studio/js/StudioValidator.js`'s independent check — same "every hardcoded allowlist must be updated" gate the v1.6 entry below already flagged as a recurring trap. Widget Studio's "current spec version" display labels (`StudioApp.js`'s badge and nav-help standard tag, `StudioSimBench.js`'s subtitle, `StudioMenuBar.js`'s export toast, `StudioStatusBar.js`'s validator button/modal title/compliance banner) bumped to v1.7; also caught and fixed `StudioStatusBar.js`'s compliance banner, which was still reading "v1.5" even after the v1.6 bump below (a gap in that pass, not introduced by this one).
- **Garmin Attitude Indicator (FD) is the reference adopter**, revision 11 → 12, `fdws`/`schemaVersion` 1.6 → 1.7 (synced to `pc-bridge/widgets/`): `attPitchDeg`/`attBankDeg`/`attFdPitchCmd`/`attFdBankCmd` now declare `pollFrequencyHz: 100` on their `state[]` entry and every direct `binding.readSimVar` reading them (`attitude_sphere`, `bank_pointer`, `fd_pitch_bar`, `fd_bank_pointer`). `attSlipSkid` and the AFCS mode-annunciator booleans are left at the normal 1Hz tier — slow-changing/discrete, no fast updates needed. **Smoothing:** those same four components' `binding.transition.durationMs` shortened from ~900-950ms to 100ms — the long duration was inadvertently acting as a low-pass filter bridging the old ~1s sample gaps; left in place against frame-rate updates it would have made the instrument feel *more* sluggish, not less. `garmin-widgets/README.md`'s "Update cadence / smoothing" section rewritten to match.

**Answering the user's specific concerns about a fast-poll lane, for the record (full reasoning in the FDWS v1.7 doc's adoption notes):** no FDWS breaking change (additive, same unknown-field degradation contract as every prior version); multiple widgets sharing the same fast SimVars cost the same as one (ref-counted subscription, cost scales with distinct fast-tier chunks, not widget count); SimConnect reads already-simulated state rather than adding simulation work, so the PC-performance cost is bounded WebSocket/JSON traffic on the bridge process, not added sim-engine load, and stays proportional since only explicitly fast-declared vars leave the 1Hz tier; other SimConnect-consuming addons run independent connections and are unaffected by Flight Deck's own chunk/period choices.

**Follow-up, same day: tier promotion, closing the "first subscriber wins" gap.** The initial v1.7 release above shipped with a documented limitation — a SimVar's polling tier was fixed by whichever widget subscribed first, for the life of the connection, with no way for a later fast-tier subscriber to speed up a SimVar an earlier normal-tier widget already claimed. User asked for the best fix rather than leaving it as a known gap.

**Fix:** `pc-bridge/server.js`'s `subscribeDynamicSimVar()` now supports **promotion**: normal → fast is allowed mid-session, fast → normal (demotion) is not needed since no var ever needs to get slower. True migration between tiers isn't possible — SimConnect data definitions can only grow, never drop a field, once added (the same constraint the pre-existing `UNREGISTER_SIMVAR` no-op already documents) — so promotion instead adds the var as a *second*, additional subscription in the fast tier's own chunk sequence (`addVarToTierChunk()`, extracted as a shared helper from the original single-subscribe path). The var's original normal-tier subscription keeps delivering too — redundant at 1Hz, but harmless, and both streams write the same real value to the same cache key, so a promoted var is fully transparent to every connected client. `varTier` now also gates via a return value (`subscribeDynamicSimVar()` returns whether it did meaningful work) so `SYNC_SCHEMA_MANIFEST`'s reconnect-resync handler can call through on every var (needed so a resync can itself trigger a promotion) without over-counting already-satisfied ones in its logged `syncCount`.

Client-side, `EventBus.subscribeSimVar()` had a matching gap: it only ever sent `SUBSCRIBE_SIMVAR` to the bridge on a var's *first* subscriber — a second widget mounting later with a higher `pollFrequencyHz` never re-notified the bridge at all, so the server-side promotion support above would never have been triggered from a real page. Fixed: a later subscriber now re-sends `SUBSCRIBE_SIMVAR` (with the new max `pollFrequencyHz`) whenever it asks for a faster rate than the shared subscription entry already has; a later subscriber asking for the same or a slower rate stays silent, matching PC Bridge's own no-demotion behavior.

**Verified live against the user's running MSFS 2024 session:** subscribed `attPitchDeg` at `pollFrequencyHz: 1` (normal tier) first, measured ~1.0Hz for 4s, then sent a second `SUBSCRIBE_SIMVAR` for the same var at `pollFrequencyHz: 100` (simulating a second, fast-tier widget mounting) — measured ~45.3Hz over the following 8s, with the bridge log confirming `Promoting "attPitchDeg" to fast tier (was normal-tier from an earlier subscriber)`. No reconnect or PC Bridge restart needed; promotion took effect within one polling cycle of the second subscription arriving.

`docs/FlightDeck-Widget-Standard-v1.7.md` §1.1 and its adoption notes updated to describe promotion instead of listing it as a known limitation.

## Garmin Attitude Indicator (FD) — FD pitch bar now rotates on FD-commanded bank, not actual bank — 2026-08-24 (later same day)

User request: make `fd_pitch_bar` rotate with the FD's *commanded* roll (`attFdBankCmd`) instead of the aircraft's actual roll, so it stays perpendicular to `fd_bank_pointer` (the existing FD roll-command arrow) — the same rigid-body relationship `attitude_sphere` and `bank_pointer` already have with each other via shared `attBankDeg`.

**Fix:** `fd_pitch_bar`'s primary `binding.readSimVar` changed from `attBankDeg` to `attFdBankCmd` — matching `fd_bank_pointer`'s own binding exactly, so both now rotate together as one FD command symbol. No other change: the pitch `compose` (still relative to `attPitchDeg` via `relativeToStateVar`, per the entries above) is unaffected, since `compose` applies in the pre-rotation frame and is simply carried around by whatever the primary `rotate` now is. `attFdBankCmd` was already a live subscription (used by `fd_bank_pointer`), so no new SimVar/chunking impact. Revision 9 → 10, synced to `pc-bridge/widgets/`.

**Follow-up, same day, revision 10 → 11:** rotation direction was inverted — user confirmed `fd_bank_pointer` (untouched, still correct) was the reference to match, so only `fd_pitch_bar` needed correcting. Fixed by swapping `fd_pitch_bar`'s own primary `outputRange` from `[-60, 60]` to `[60, -60]` — `fd_bank_pointer` deliberately left unchanged. Revision 11, synced to `pc-bridge/widgets/`.

## FDWS v1.6 — `compose.relativeToStateVar`, FD pitch bar now target-relative — 2026-08-24 (later same day)

Follow-up to the "no bug found" investigation directly below. User correctly identified the actual remaining gap: with `compose` using an absolute value (v1.5), the FD pitch bar only coincided with the fixed aircraft-reference symbol when its target happened to *equal* current pitch — any other target rendered offset by an amount unrelated to the true angular difference, because the fixed symbol already silently encodes "current pitch" via the ladder background's own motion (`attitude_sphere`'s own `compose`). Worked example: aircraft at 10°, FD commanding 0° (level) — the bar should render 10° of ladder-distance *below* the aircraft symbol, toward the current true horizon, not at the symbol itself.

**Fix, added as FDWS v1.6 (`docs/FlightDeck-Widget-Standard-v1.6.md`):** new optional `compose.relativeToStateVar` field — when present, the secondary transform's input becomes `stateVar - relativeToStateVar` instead of `stateVar` alone, run through the same `valueRange`/`outputRange` mapping. `GaugeComponent.js` computes the delta before calling the existing transform-resolution logic; `CompositeWidget.js`'s reactive-update dispatch (added earlier the same day for `compose.stateVar`) now also re-renders when the *reference* var changes, not just the target. `fd_pitch_bar` now declares `"relativeToStateVar": "attPitchDeg"`. Verified algebraically against the user's own worked example: `-3 × (0 - 10) = +30` → 30 units toward the ground/down direction → 10° below the aircraft symbol, matching the requested behavior exactly.

Synced `GaugeComponent.js` across all three copies (`flight-deck-pwa/`, `shared/`, `widget-studio/` — confirmed byte-identical before this change, per v1.5's own precedent); `CompositeWidget.js` exists only in `flight-deck-pwa/`. Widget bumped to `fdws: "1.6"`, `schemaVersion: "1.6.0"`, revision 7 → 8, synced to `pc-bridge/widgets/`. `garmin-widgets/README.md` updated.

**Follow-up, same day, revision 8 → 9:** user tested live and found the direction inverted — FD commanding down rendered as up. The `outputRange: [45, -45]` used in this entry's original fix and worked example was wrong; it copied `attitude_sphere`'s own `outputRange` verbatim, but a *relative* target compose needs the reference gauge's `outputRange` **mirrored**, not copied — the reference gauge shifts the *background* by `-k × current` to keep a fixed indicator aligned with an increasing reading, while a target indicator needs an increasing delta to move the opposite way, since it's the foreground element moving toward the target rather than the background compensating. Fixed by swapping `fd_pitch_bar`'s `outputRange` to `[-45, 45]`. `docs/FlightDeck-Widget-Standard-v1.6.md`'s example, worked-example prose, and `relativeToStateVar`'s own normative description corrected to match and to state the mirroring rule explicitly, so the next widget that uses this doesn't hit the same trap. Revision 8 → 9, synced to `pc-bridge/widgets/`.

**Also updated (user caught this — every hardcoded `fdws` version allowlist would otherwise have rejected the widget outright):** `SecurityValidator.js`'s `validateFDWSDefinition()` — the structural gate every import path in every app runs before accepting a widget definition at all — had `['1.0', '1.1', '1.2', '1.3', '1.4', '1.5']` hardcoded, exactly the failure mode its own comment warns about ("must accept every FDWS version any app in the suite actually supports"). Extended to include `'1.6'` across all three copies (`flight-deck-pwa/`, `shared/`, `widget-studio/` — confirmed identical before this change). `widget-studio/js/StudioValidator.js` had the identical independent check (not a mirrored file), fixed the same way. Also updated four Widget Studio UI strings that hardcoded "FDWS v1.5" as a display label (`StudioApp.js`'s spec-version badge, `StudioSimBench.js`'s subtitle, `StudioMenuBar.js`'s export-toast message, `StudioStatusBar.js`'s validator button/modal title) — cosmetic, but stale-labeled either way. Swept the rest of the repo for other hardcoded version-enum copies; none found (remaining "1.5" hits are either historical section references like "FDWS v1.2 §1.5" — an escape-hatch clause number, unrelated to the top-level spec version — or the v1.5 spec doc's own frozen historical enum listing, correctly left as-is per the project's delta-spec convention).

## Garmin Attitude Indicator (FD) — investigated apparent "FD chases aircraft pitch with AP engaged," found no bug — 2026-08-24 (later same day)

User reported: with AP engaged, sustained pull-back overrides caused the FD bar to appear to "chase" and eventually match the aircraft pitch symbol within ~10s, even though the sim's own FD gauge stayed several degrees separated. Investigated with temporary instrumentation added to `CompositeWidget.js`'s `setLocalState()` and `GaugeComponent.js`'s `update()` (console-logged every `attPitchDeg`/`attFdPitchCmd` change and the resulting transform), run live by the user via desktop DevTools during the exact override maneuver.

**Result: no bug found.** The captured log shows `attFdPitchCmd` stayed independently small (roughly -2.5° to +2.5°) for the *entire* test while `attPitchDeg` climbed to +23° — it never converged; `translateY` tracked the small target correctly the whole time (e.g. final frame: `attPitchDeg=23.34`, `attFdPitchCmd=1.35`, `translateY=-4.06px`). The AP's real computed FD target simply stayed near level throughout this particular test. Because a near-level target maps to a small on-screen offset regardless of scale, the FD bar naturally renders close to the always-fixed-at-center aircraft symbol whenever the real target is small — easy to misread as "the bar caught up to my pitch" when it's actually "the bar correctly shows a near-level target, which happens to sit near the same pixels the fixed aircraft symbol always occupies." Debug instrumentation removed after confirming; no code changes from this investigation.

## Garmin Attitude Indicator (FD) — reverted the pitch sign flip, it broke the "coincide when equal" case — 2026-08-24 (later same day)

Follow-up to the sign-flip fix directly below. User reported: flying straight and level on autopilot, with the sim's own instruments showing actual pitch and FD-commanded pitch as matching — the widget still showed the FD bar a few degrees above the aircraft symbol instead of coinciding with it.

**Root cause: the sign-flip fix from the previous entry was wrong.** Both `attitude_sphere` and `fd_pitch_bar` compose over a *symmetric* domain/range (`[-15,15]` → `[±45]`), which makes the transform pure linear scaling through zero — `attitude_sphere`'s reduces to `output = -3 × attPitchDeg`. Flipping `fd_pitch_bar`'s `outputRange` to `[-45, 45]` made its formula `output = +3 × attFdPitchCmd` — the *mirror image* of the horizon's own formula. So even when `attFdPitchCmd` exactly equals `attPitchDeg`, the two elements rendered at opposite offsets instead of coinciding — visible as a constant few-degree gap that scaled with however far off level the aircraft happened to be, not a fixed rendering error.

Before reverting, checked live whether `AUTOPILOT FLIGHT DIRECTOR PITCH` and `PLANE PITCH DEGREES` actually use the *same* sign convention (MSFS doesn't guarantee this across different SimVars, and getting it backwards here would just reintroduce the original inverted-direction bug) — logged both during stable, hands-off, AP-held level flight: both tracked together in the same positive range (+0.6° to +2.4°) the entire time, confirming matching conventions, not mirrored ones. Reverted `fd_pitch_bar`'s `compose.outputRange` back to `[45, -45]`, matching `attitude_sphere` exactly. Revision 6 → 7, synced to `pc-bridge/widgets/`.

## Garmin Attitude Indicator (FD) — FD pitch bar wasn't re-rendering on its own data + was inverted — 2026-08-24 (later same day)

User-reported: the flight director pitch command bar appeared to track the aircraft's *current* pitch instead of showing FD's actual commanded target — visually glued to the aircraft symbol regardless of what the FD wanted. A "found online" theory claimed `AUTOPILOT FLIGHT DIRECTOR PITCH` returns absolute world-space pitch that "cancels out" against a moving gauge — checked live against a running MSFS session rather than trusted: while the user hand-flew pitch from -9.49° to +4.51°, the raw SimVar stayed rock-solid at exactly -1.80° the entire time. That's the signature of a real, independent target, not a value mirroring current attitude — the online theory was wrong for this SimVar.

**Real root cause, `flight-deck-pwa/js/widgets/CompositeWidget.js`:** `setLocalState()`'s reactive-update loop only re-rendered a component when its *primary* binding (`comp.binding.stateVar`) matched the changed state name — it never checked a `core.gauge`'s secondary `props.compose.stateVar` (FDWS v1.5). `fd_pitch_bar`'s primary binding is `attBankDeg` (shared with `attitude_sphere`, for the rotate/bank half of the rigid body); its FD-target value only reaches it through `compose.stateVar: attFdPitchCmd`, synced via a separate `syncFrom` subscription. That subscription updated `localState` correctly but fell through to the visibility-only branch instead of triggering a re-render — so the gauge only ever redrew when `attBankDeg` happened to tick, using whatever `attFdPitchCmd` snapshot was sitting around at that moment. The chunking fix earlier the same day made this worse: `attFdPitchCmd` and `attBankDeg` can now land in different SimConnect chunks entirely, broadcasting on uncorrelated cadences. Fixed by also triggering `renderer.update()` when a changed state name matches any component's `props.compose.stateVar`.

**Second bug, same investigation:** once re-rendering correctly, the bar was exactly inverted — FD commanding pitch up rendered as pitch down. Same class of issue the widget's own README already documents for `attPitchDeg`/`attBankDeg` (MSFS doesn't guarantee a consistent sign convention across different pitch-related SimVars) — confirmed as a clean sign flip, not a scale or offset issue. Fixed by swapping `fd_pitch_bar`'s `compose.outputRange` from `[45, -45]` to `[-45, 45]`, mirroring `attitude_sphere`'s convention. Revision 5 → 6. Synced to `pc-bridge/widgets/` (PC Bridge loads widgets from disk at startup, not live-watched — requires a PC Bridge restart to pick up).

## PC Bridge — mutating an already-streaming chunk's data definition silently killed it — 2026-08-24 (later same day)

User-reported: PWA connected fine on the radios page (`com1ActFreq` etc. showing real live values), but installing and placing the attitude indicator widget mid-session broke *every* dynamic SimVar in the app, including the radios fields that had already been streaming correctly — no crash, no error dialog, everything just went stale/default.

**Root cause:** the chunking fix earlier the same day (see below) made `subscribeDynamicSimVar()` call `addToDataDefinition` immediately, synchronously, once per field — the *request* side was already debounced (`armDynamicVarRequest`, existing comment on this file already documents that a burst of raw `requestDataOnSimObject` calls kills a stream), but nothing guarded the *definition-mutation* side. Placing the attitude widget triggers `SYNC_SCHEMA_MANIFEST`, which loops over ~19 fields calling `subscribeDynamicSimVar()` in a tight synchronous burst — landing on chunk 0, the same chunk the radios page's fields were already actively streaming on. Reproduced directly against the live sim: a chunk streaming cleanly for 3+ seconds goes completely silent — zero exceptions, zero errors — the instant ~18 more `addToDataDefinition` calls land on it while its periodic request is still active, even with a re-request issued afterward. This is the same failure class as the request-burst issue already documented in this file, just triggered by mutating the definition instead of re-requesting it.

**Fix:** `server.js` now tracks which chunks have a live periodic request (`chunkPeriodicActive`). `subscribeDynamicSimVar()` pauses a chunk's request (`SimConnectPeriod.NEVER`) before adding a field to it if that chunk is already streaming; `armDynamicVarRequest`'s existing 250ms debounce re-arms it (`SimConnectPeriod.SECOND`) once the burst of additions settles, same as before. `reapplyDynamicSimVars` (fresh reconnect) resets and rebuilds the set from scratch, since a new SimConnect handle has nothing actively streaming on it yet.

Verified two ways against a running MSFS session: (1) a standalone repro isolating just the pause/mutate/resume sequence — without the fix, a 3-frame-old stream died permanently after the burst; with the fix, it resumed and delivered 8 more clean frames; (2) end-to-end through the actual running `server.js`, driven by a real WebSocket client sending the exact same `SUBSCRIBE_SIMVAR`/`SYNC_SCHEMA_MANIFEST` messages a real widget mount sends (a live `flight-deck-pwa` browser tab also auto-connected mid-test and independently re-subscribed to its own radios fields) — `com1ActFreq` kept updating cleanly straight through a 19-field manifest sync burst that would have killed it before this fix.

## PC Bridge — real default mapping for `apVnavModeState` (WT G1000 v2's `L:WTAP_VNav_State`) — 2026-08-24 (later same day)

Follow-up to the chunking/bad-default entry directly below: that fix left `apVnavModeState` deliberately unmapped rather than guessing another SimVar. Found the real mechanism by reading the default C172's actual avionics source directly out of a local MSFS 2024 install (`Content/Packages/workingtitle-instruments-g1000-v2/html_ui/.../Libraries/{garminsdk,msfssdk}.js`) — same "read the real source, don't guess" approach the AFCS annunciator bar entries below used for the Asobo AS1000 PFD script. WT's G1000 v2 avionics compute VNAV entirely themselves (MSFS's native autopilot core has no VNAV concept at all — confirmed against the SDK docs in the entry below) and publish the result via their own `exports.VNavVars.VNAVState = "L:WTAP_VNav_State"`, a 3-value enum (`exports.VNavState`: 0=Disabled, 1=Enabled_Inactive, 2=Enabled_Active) rather than the plain 0/1 bool every other AP mode Deck Event here uses.

**Fix:** `profileManager.js`'s `apVnavModeState` default now maps to `L:WTAP_VNav_State` (`unit: 'number'`). Since the enum's "active" value (2) doesn't match the widget suite's universal `apXModeState==1` convention (`com_flightdeck_garmin_attitudeindicator.fdwidget`'s `apVnavModeState==1` checks), added `server.js`'s `ENUM_TO_BOOL_ACTIVE_KEYS` — a small logicalName→activeValue map, read alongside the existing `BCD16_DECODE_KEYS` at the same point dynamic SimVar frames are decoded, collapsing raw 2→1 and 0/1→0. Same pattern already established for `xpndrCode`'s BCD16 decode, just for a different raw-value shape. Patched into `profileManager.js` (source of truth) and both persisted custom profiles in `profiles.json`/their `page_presets/` mirrors, same as the unmapped fix.

Verified live against a running MSFS session, end-to-end through the actual `profileManager`/chunking/transform code paths (not standalone diagnostic literals): active profile resolves `apVnavModeState` to `L:WTAP_VNav_State`, raw enum read back as `1` (VNAV armed via a loaded flight plan, not yet flying a path) correctly collapses to widget-facing `0`; full 24-field chunked subscription (including this field) reads clean across both chunks with zero exceptions.

## PC Bridge — dynamic SimVar chunking (20-field SimConnect ceiling) + `apVnavModeState` bad-default fix — 2026-08-24 (later same day)

**Root cause #1, `server.js`:** a single SimConnect data definition on this build silently breaks on its 21st field — every `addToDataDefinition` call still "succeeds" synchronously, but the moment the 21st field is added, the *next* `requestDataOnSimObject` throws a misleading `NAME_UNRECOGNIZED` exception (reproduced with every field individually valid, every casing/ordering permutation) and the whole frame becomes unreadable, not just the 21st field. Isolated via binary search. Fixed by spreading dynamic SimVar subscriptions across multiple chunked data definitions of at most `MAX_FIELDS_PER_CHUNK` (20) fields each, each with its own definition/request ID (`DYNAMIC_VAR_BASE_ID + chunkIndex`) — `subscribeDynamicSimVar`, `armDynamicVarRequest`, and `reapplyDynamicSimVars` all chunk-aware now, and `simObjectData` routes each frame to the right chunk's field slice by request ID.

**Root cause #2, `profileManager.js`:** the chunking fix's own verification run kept failing on `apGsArmedState`, always the same field, always at the same offset — looked like a chunking bug, but a false-positive-prone success counter in the diagnostic script was hiding what was actually happening. Rewrote the diagnostic to track *which* chunk indices ever succeed (not just a raw count) instead of trusting a "N successes seen" tally, which exposed the real story: chunk 1 failed on 100% of attempts, and the failure was actually about `apVnavModeState` (`AUTOPILOT VNAV ACTIVE`) — the *first* field in that chunk — not the field the exception pointed at. Isolated field-by-field: `AUTOPILOT VNAV ACTIVE` throws `NAME_UNRECOGNIZED` completely on its own, no chunking involved, confirmed against the official MSFS SDK SimVar reference (no dedicated VNAV-engagement variable exists there at all). Because a field that fails `addToDataDefinition` still shrinks that definition's real byte layout while SimConnect reports success, every field *after* it in the same chunk reads out of bounds — this bad default had been silently corrupting whichever data definition it landed in since it was introduced, just never diagnosed because until this fix there was only ever one definition to blame everything on.

**Fix:** `apVnavModeState` is a canonical Deck Event (`shared/deckEvents.js`), so it still needs a `DEFAULT_READ_TARGETS` entry, but now resolves as deliberately unmapped (`simVar: null`, `unmapped: true`) rather than pointing at a name that doesn't exist — same graceful-degradation treatment the custom AFCS armed-state events already get. Patched in `profileManager.js` (source of truth for new/`default_ga` profiles) and directly in the two persisted custom aircraft profiles in `profiles.json` plus their `page_presets/` mirrors, since only `default_ga` auto-refreshes from code on load. `garmin-widgets/README.md` corrected — no longer claims `apVnavModeState` is "almost certainly already mapped."

Verified live against a running MSFS session: before the fix, 23-field subscription reproducibly failed 12/12 attempts on chunk 1 (missing `apGsArmedState`, `NAME_UNRECOGNIZED` exception logged); after removing the bad default, all fields across both chunks read clean on the first attempt, no exceptions.

## Garmin Attitude Indicator (FD) — real AFCS logic from decompiled G1000 source, genuine overlap bug fixed — 2026-08-24 (later same day)

Revision 4 → 5. The user pushed back on the `L:AS1000_AP_NAV_ARM` guess from the previous entry ("can't this just read the same way the NAV button does?") and, better than that, pulled up MSFS's own Dev Mode Behaviors debug window showing the actual G1000 tooltip logic on their aircraft — enough of a lead to locate and read `AS1000_PFD.js` directly from their local MSFS install (`asobo-vcockpits-instruments-navsystems` package). This is Asobo's real, live G1000 PFD source, not documentation or a guess.

**What it revealed:** `AUTOPILOT NAV1 LOCK` / `AUTOPILOT APPROACH HOLD` / `AUTOPILOT BACKCOURSE HOLD` stay true for the *entire* armed-through-captured lifecycle — there is no separate "NAV armed" SimVar because the real PFD script doesn't need one. The FMA decides armed-vs-active purely from whether `AUTOPILOT HEADING LOCK` (or wing leveler) is still the mode actually flying:

```js
if (SimVar.GetSimVarValue("AUTOPILOT HEADING LOCK", "Bool") || SimVar.GetSimVarValue("AUTOPILOT WING LEVELER", "Bool")) {
  if (SimVar.GetSimVarValue("AUTOPILOT NAV1 LOCK", "Boolean")) { /* armed */ }
  // ...
}
```

**This caught a real bug, not just an unverified guess.** The widget's `lat_nav`/`lat_apr`/`lat_bc` *active* labels only checked their own mode flag — meaning NAV/APR/BC could show simultaneously with HDG for the entire time they were merely armed, the exact overlap the annunciator bar was built to prevent. Fixed by adding `apHdgModeState notEquals 1` to each active label's `visibleWhen`, and deriving `lat_nav_armed`/`lat_bc_armed`/`lat_apr_armed` as the mirror-image compound condition (`apHdgModeState==1 AND <mode>==1`) instead of a separate guessed SimVar. `apNavArmedState` is removed entirely — it never needed to exist. `apAprArmedState` is also removed for the same reason (the real script doesn't read a separate APR-armed flag for this row either, even though `AUTOPILOT APPROACH ARM` exists as a raw SimVar elsewhere in the AP system) — one fewer custom Deck Event to map than the previous revision, not more.

**Also corrected from the same source, higher-confidence than the SDK-docs-based guess in the prior entry:** `apGsModeState`'s suggested source is `AUTOPILOT GLIDESLOPE ACTIVE` specifically (not `...HOLD`) — confirmed as the exact SimVar the real script reads, not just "documented and presumably used."

Verified live: simulated HDG-active + NAV1-LOCK-true renders HDG green / NAV cyan-armed, never both green; clearing HDG flips NAV straight to active in the same frame, matching the real capture transition. Zero validator warnings, no orphaned/unused Deck Events left in `capabilities`/`state[]`.

## Garmin Attitude Indicator (FD) — `apNavArmedState` LVar guess — 2026-08-24 (later same day)

**Doc-only, no widget change.** Follow-up to the armed-state SimVar correction above: `garmin-widgets/README.md` now suggests `L:AS1000_AP_NAV_ARM` as a best-effort guess for `apNavArmedState` on G1000NXi-equipped aircraft, built from the confirmed `AS1000_` LVar/H:Event naming family WorkingTitle's G1000NXi uses (`AS1000_VNAV_TOGGLE` is a documented real H:Event in the same family) — but explicitly flagged as **unverified**, since no accessible source actually confirms this exact string. GitHub code search, Sourcegraph, and grep.app were all tried and either required auth or didn't render for a text-only fetch; the official MSFS SDK docs (source for the previous entry's four corrected SimVars) don't cover add-on-internal LVars at all. README points the user at MSFS's own Developer Mode SimVar Watch tool as the fastest way to confirm or correct the guess, and reiterates that leaving it unmapped is harmless.

## Garmin Attitude Indicator (FD) — corrected armed-mode SimVar guidance — 2026-08-24 (later same day)

**Doc-only correction to `garmin-widgets/README.md`, no widget change.** The previous entry's README flagged all five new armed-state Deck Events (`apNavArmedState`, `apAprArmedState`, `apAltArmedState`, `apGsModeState`, `apGsArmedState`) as likely needing aircraft-specific `L:`Vars rather than a stock SimVar — prompted by a user question ("can't these read the same way the NAV button does?"), checked against the official [MSFS SDK SimVar reference](https://docs.flightsimulator.com/msfs2024/html/6_Programming_APIs/SimVars/Aircraft_SimVars/Aircraft_AutopilotAssistant_Variables.htm) rather than memory, and the caveat turned out to be overbroad. Four of the five have official, documented, stock `A:`-namespace SimVars (`AUTOPILOT APPROACH ARM`, `AUTOPILOT ALTITUDE ARM`, `AUTOPILOT GLIDESLOPE ARM`, `AUTOPILOT GLIDESLOPE HOLD`/`ACTIVE`) — mechanically identical to mapping any other read in this widget, no different from `apNavModeState`/`AUTOPILOT NAV1 LOCK`. Only `apNavArmedState` genuinely lacks a stock equivalent (the base sim doesn't appear to expose a separate NAV-armed pre-capture flag) and keeps the "may need an aircraft-specific LVar" caveat. README table and prose corrected with the real SimVar names.

## Garmin Attitude Indicator (FD) — 2x pitch scale + AFCS mode annunciator bar — 2026-08-24 (later same day)

Two requested changes to `garmin-widgets/flight-instruments/com_flightdeck_garmin_attitudeindicator.fdwidget` (revision 3 → 4), both scoped to the widget file only — no FDWS/runtime changes needed, everything used was already available after v1.5.

**Pitch scale doubled.** Small pitch changes were hard to read at the widget's 7x7 mobile size because the ladder was too compressed. `attitude_sphere`/`fd_pitch_bar`'s `props.compose.valueRange` halved from `[-30,30]` to `[-15,15]` against the same `outputRange: [45,-45]`, doubling degrees-per-pixel sensitivity. The ladder SVG's tick *geometry* is untouched (same pixel positions as before) — only the printed numbers changed (10/20/30 → 5/10/15), since at the new 3px/degree scale the old "10°" tick position is now correctly the "5°" line.

**New AFCS mode annunciator bar**, modeled on the real G1000 AFCS status bar layout: a left AP/FD/YD box, a lateral (roll) mode column, and a vertical (pitch) mode column, each split into an ACTIVE row (green) and an ARMED row (cyan) beneath it. Required reshaping the widget's internal grid to make room: the dial shrank from 22x22 to 20x20 (still centered, still square) and moved down from row 3 to row 6, freeing rows 1-5 for the new bar; the slip/skid indicator moved from row 6 to row 9 to stay just below the bank pointer at the dial's new top edge.

**Overlap avoidance, by construction, not by luck.** Every candidate mode label in a lane (e.g. `lat_hdg`/`lat_nav`/`lat_apr`/`lat_bc`/`lat_rol` in the lateral-active lane) shares the identical `{col,row,w,h}` anchor and is `visibleWhen`-gated on its own mode flag — so multiple concurrently-active AP/FD modes (a very normal real-world state: AP+YD+HDG-active+NAV-armed+ALT-active all at once) can never visually collide, since each lane is one shared text slot whose content changes, never multiple stacked glyphs. AP/FD share a slot the same way, via a compound `visibleWhen` (`allOf`/`notEquals`) rather than independent flags: real G1000 hardware shows "AP" (not "AP"+"FD" both) once the autopilot servos engage, since AP implies FD is also considered on internally.

**Deck Events:** reuses 10 already-canonical ones (`apMasterState`, `apYdState`, `apHdgModeState`/`apNavModeState`/`apAprModeState`/`apBcModeState`, `apAltModeState`/`apVsModeState`/`apFlcModeState`/`apVnavModeState`) with zero new mapping needed for those. Adds 5 new custom ones for states with no canonical equivalent: `apNavArmedState`, `apAprArmedState`, `apAltArmedState` (the classic "ALTS" annunciation), `apGsModeState`, `apGsArmedState`. Flagged explicitly in `garmin-widgets/README.md` that these five are usually *internal AFCS logic* rather than a stock SimVar — default MSFS aircraft may have nothing to map them to; WorkingTitle G1000NXi/G3000 and most payware G1000 aircraft expose the underlying state via aircraft-specific `L:`Vars instead. Left unmapped, each just never lights up (same graceful degradation as every other Deck Event in this suite) — not a hard requirement to use the rest of the widget.

Verified via live component-tree/visibility inspection against the running PWA: 30 components (up from 10), zero validator warnings at `fdws: "1.5"`, and a simulated "AP+YD+HDG active+NAV armed+ALT active" state showed exactly the expected labels lit with everything else in those lanes correctly hidden.

## Flight Deck PWA — Keep Screen Awake — 2026-08-24 (later same day)

**New — `flight-deck-pwa/js/core/WakeLockManager.js`.** Uses the Screen Wake Lock API to stop the device display timing out while the app is open, on by default, toggleable from a new "Keep Screen Awake" row in the nav menu (`index.html`, next to the existing Night Cockpit theme toggle — same `.theme-toggle-row`/`.switch` markup, wired the same way in `app.js`). Preference persists to `localStorage` (`flightdeck_wakelock_enabled`).

Handles the one real subtlety in this API correctly: a wake lock is auto-released by the browser the instant the page goes hidden (tab switch, screen lock, app backgrounded — spec behavior, not something to prevent), so `WakeLockManager` re-requests it on every `visibilitychange` back to `visible`, as long as the user hasn't toggled it off. Feature-detected (`'wakeLock' in navigator`) — the toggle renders `disabled` with an explanatory tooltip rather than erroring on a browser/context without support (e.g. non-HTTPS origins, older Safari); `acquire()` also swallows a runtime `NotAllowedError` (e.g. the document isn't visible at request time) rather than throwing. No FDWS/widget/PC-Bridge involvement — pure PWA-shell UX, no wire-format or spec impact.

## FDWS v1.5 — Garmin Attitude Indicator (FD) widget + `core.gauge.props.compose` — 2026-08-24

New community widget (`garmin-widgets/flight-instruments/com_flightdeck_garmin_attitudeindicator.fdwidget`, min/default size 7x7) built and iterated live against a running MSFS 2024 session, which surfaced a real spec gap and two runtime bugs along the way.

**Adopted [FDWS v1.5](docs/FlightDeck-Widget-Standard-v1.5.md).** Every `core.gauge` through v1.4 could bind exactly one value to exactly one CSS transform — enough for a needle or a bar, but not a single rigid body driven by two independent quantities at once (bank *and* pitch on a rolling-and-pitching attitude horizon). v1.5 adds `props.compose`: an optional second transform, sourced from local widget state (`allState[compose.stateVar]`, already passed into every `update()` call — no new binding/subscription plumbing needed) and composed onto the primary transform in the same CSS `transform` string. Fully additive; a host that ignores the unknown `compose` key still renders the primary transform correctly. **Implemented** in `GaugeComponent.js` (`resolveTransformFn()` factored out of the old inline switch, called twice when `props.compose` is present), synced across `flight-deck-pwa/`, `shared/`, and `widget-studio/` (all three were byte-identical before and after). `fdws` version allowlist bumped to include `"1.5"` in all four validator copies (`shared/SecurityValidator.js` synced to `flight-deck-pwa`/`widget-studio`, plus Widget Studio's independent `StudioValidator.js`). Every "current FDWS version" pointer bumped v1.4 → v1.5: root `README.md`, each app's own README, and Widget Studio's in-app labels (`StudioApp.js` nav badge + "Standard: vX.X.X", `StudioStatusBar.js` brand badge/Validate button/report-modal titles, `StudioMenuBar.js` export toast, `StudioSimBench.js` subtitle, `StudioTemplates.js` `createdWith` metadata on all seven built-in templates).

**Two runtime bugs found and fixed via live debugging, not code review** — both were "the widget looked wrong" reports chased down against a real MSFS session with the widget's own author:

- **Choppy/stepped motion.** PC Bridge's dynamic-var SimConnect request only samples once per second (`SimConnectPeriod.SECOND`); the widget's gauges used 100-120ms `binding.transition` durations, so every second's new value snapped in almost instantly and then held — reading as discrete jumps rather than motion. Not a bug in PC Bridge or the transition mechanism, just a duration mismatched to the sample rate. Fixed widget-side only: transitions lengthened to ~900-950ms linear (matched to the ~1s cadence) on every pitch/bank/FD-cue gauge.
- **`visibleWhen` boolean mismatch.** The FD cue's `visibleWhen: { state: 'apFdState', equals: true }` never matched live telemetry, because `apFdState` arrives as the plain number `1`/`0` and `evaluateVisibilityExpr()`'s comparison is a strict string match (`String(stateVal) === String(expr.equals)` — `"1" !== "true"`). This is existing, correct v1.1 §7 behavior, not a bug in the runtime; the widget's own `visibleWhen` was just written wrong. Fixed to `equals: 1`. Worth remembering for any future widget gating on a telemetry-sourced boolean-ish Deck Event — declared `state[].type: "boolean"` is descriptive only and isn't coerced at runtime (`CompositeWidget.js`'s `syncFrom` handler stores the raw telemetry value as-is).

**Also found (server-side, documented not yet hardened):** `pc-bridge/server.js`'s `subscribeDynamicSimVar()` silently drops a logical name with no active-profile mapping (`console.warn` only, server-process-local — never surfaced to the PWA, and the `SUBSCRIBE_ACK` sent back doesn't reflect whether resolution actually succeeded), and a live session reproduced the exact "silently kills the periodic stream" failure mode `armDynamicVarRequest()`'s own comment already warned about — re-adding dynamic vars mid-session (e.g. installing a new custom widget) stopped *all* telemetry, including previously-working canonical vars, until a full PC Bridge restart. Confirmed via raw WebSocket inspection (`SUBSCRIBE_ACK` received, zero `simData` broadcasts for 20+ seconds even for vars that had been streaming fine minutes earlier) and PC Bridge's own `requestState` cache snapshot (canonical radio vars present and current; every newly-subscribed var absent). No code change made — flagging here since it's a real, reproducible gap, not addressed as part of this pass.

## Widget Studio UX overhaul + Community Deck Events Packs — 2026-08-23 (later same day)

A UX audit of Widget Studio (prompted by "it works but doesn't feel user-friendly") turned up a consistent pattern: wherever a widget property was structured rather than a flat string/number, the authoring UI dropped into either a raw JSON textarea (with parse failures silently discarded, only a `console.warn`) or a chain of native `prompt()`/`confirm()` dialogs (free-typed enum values, no autocomplete, no way to review or edit an entry without restarting the whole flow). Two runtime-supported capabilities — `visibleWhen` and the guard safety-cover overlay — had zero authoring UI at all. Validation only ever surfaced in an on-demand report modal with no link back to which component was actually wrong. This entry covers the full remediation plus a new cross-app feature (Community Deck Events Packs) that came out of the same pass. No FDWS spec change, no new component types or actions — Studio-authoring-surface and Flight Deck PWA-authoring-surface work only, plus one new `shared/` module.

**New shared UI infrastructure — `widget-studio/js/StudioModal.js`.** A generic `openModal()`/`confirmModal()`/`showToast()` helper, generalizing the one-off real-`<select>`-dialog pattern `StudioInspector.js`'s `pickPopoverWidgetId()` already used (its own comment explained why: "prompt() can't render a dropdown"). Every `prompt()`/`confirm()`/`alert()` call across `StudioInspector.js`, `StudioLayersPanel.js`, and `StudioMenuBar.js` was replaced — interaction-trigger authoring, Widget Popover context-map building, layer-group add/edit, state-variable add, new-widget/new-popover confirmation, and the import-validation-error and import-parse-failure dialogs. The old `pickPopoverWidgetId()` inline-modal implementation was deleted in favor of the shared helper; its logic is now inlined directly into the new interaction-builder modal (see below), since the popover picker is only ever needed as one field within that larger form.

**Interaction authoring is now a real form.** `StudioInspector.js`'s `openAddInteractionModal()` (replacing the old `promptAddInteraction()`) presents trigger type and action type as dropdowns, with action-specific fields swapping in below as the action type changes — including a proper deck-event picker for `core.dispatchEvent`'s event name, and a full add/remove row editor for `core.openWidgetPopover`'s context map (key, host `stateRef` path, writable checkbox, apply-timing select) in place of the old sequential `prompt()`/`confirm()` loop. Deleting an existing interaction now goes through a confirm dialog, matching every other delete action in the app (previously the only delete with no confirmation).

**Structured component properties got visual editors, replacing raw JSON textareas.** New reusable helpers in `StudioInspector.js`: `renderRangeEditor()` (a plain min/max number-input pair) for `core.gauge`'s `valueRange`/`outputRange`, and `renderRowListEditor()` (typed add/remove rows, with a deck-event-aware field type for write-event columns) for `core.slider`'s `detents`, `core.selector`'s `positions`, and `core.rocker`'s `zones`. `core.list`'s `itemTemplate` — a genuinely nested component tree, out of proportion for a bounded visual form — keeps its JSON textarea, but `updateCompJsonProp()` now surfaces a parse error inline next to the field instead of discarding the edit with only a console warning, and gained an "Insert example" button. The Palette's default-binding examples and the Rotary card's description were also fixed while in this area (see the template-binding-name fix below) and given a note that the runtime rotary component doesn't dispatch write events on its own.

**New "VISIBILITY & GUARD" Inspector panel** authors `visibleWhen` (a combinator select — ALL/ANY — over an add/remove list of `{state, operator, value}` conditions against the widget's declared state vars, falling back to a JSON textarea only for a hand-authored nested-compound expression too complex for the bounded visual form) and the guard overlay (`layout.guard`: enabled checkbox, closed/open asset pickers sourced from the widget's own asset list, auto-close timeout). Both were fully implemented in `BaseComponent.js`'s `applyVisibility()`/`setupGuard()` already — this only adds the missing authoring surface.

**Live validation**, replacing on-demand-only. `StudioValidator.js` gained `mapIssuesByComponent()`, grouping the flat error/warning string list by the component ID each message names (parsed from the existing consistent `Component "<id>" ...` message shape — no change to the validator's actual rules). `StudioCanvas.js` and `StudioLayersPanel.js` now badge invalid/warned components directly (a small ! or ? dot, canvas and layer-tree row respectively, both re-evaluated on every render); `StudioStatusBar.js`'s "Validate (§11)" button carries an always-visible error/warning count badge that updates live off the same state-change subscriptions the rest of the panel already uses; and every message in the full validation-report modal is now a clickable `<li>` that selects the referenced component and switches to Edit View, instead of being inert text.

**Component Palette gained search and category grouping** (Text & Display / Buttons & Inputs / Avionics Controls / Data & Composition) — previously a flat, unfiltered 15-item grid despite the Layers tab already having a search box.

**Canvas multi-select and align/distribute.** `StudioState.js` gained `multiSelectedIds` (shift-click toggles membership; the previous single-selection model becomes the "primary"/most-recently-touched member, so the Inspector still shows one component's detail) and `applyAlignment(mode)` — left/right/top/bottom/centerX/centerY/distributeH/distributeV, operating directly on grid `col`/`row`/`w`/`h` (already integer-quantized, so no pixel math or snapping needed), as one undo step for the whole batch. `StudioCanvas.js` shows a floating toolbar once 2+ components are selected.

**Layer group drag-to-reorder.** `StudioState.js` gained `reorderLayerGroups(orderedIds)`, reassigning every group's `z` to its new index × 100 (the same spacing convention every built-in template already used). `StudioLayersPanel.js` wires native HTML5 drag-and-drop on each group's header, replacing the only way to change stacking order before this (hand-editing each group's numeric Z-offset one at a time).

**Fixed — stale FDWS version labels this pass's audit turned up that earlier passes (see "Cleanup pass" and "FDWS v1.4" entries above) missed.** `StudioApp.js`'s two `console.log` lines still said `[Widget Studio v1.2]`; `StudioStatusBar.js`'s `brand-ver` badge and the validation-modal "compliant" banner text still said `v1.2` (both were explicitly flagged as "genuinely unclear, still the team's call" in the v1.4 adoption pass — resolved here in favor of matching every other now-v1.4 label, since letting one stale corner survive three separate bump passes was itself the more confusing outcome). All bumped to v1.4.

**Fixed — Widget Studio's built-in templates (`StudioTemplates.js`) had dead bindings.** Deliberately left unfixed in the v1.4 adoption pass ("the team's call") — resolved here now that the naming is settled. `NAV 1 Radio`, `Layered Taxi Light Switch`, `Autopilot Mode Controller`, `Heading & Altitude Target Controller`, and `COM Radios` all still referenced pre-Deck-Events-unification names (`nav1_act`, `taxi`, `ap_master`, `ap_hdg`, `com1_act`, and matching SCREAMING_SNAKE_CASE write-event names) that don't resolve against `shared/deckEvents.js`'s canonical list — a user loading any of these templates got a widget whose bindings silently no-op at runtime, exactly the failure mode `CHANGELOG.md`'s Garmin-widget-pack entries above describe happening in production. Renamed every binding, `state[].syncFrom`, and `capabilities` entry to its canonical Deck Event name; `Master Caution & Warning`'s `master_warning`/`master_caution`/`pitot_heat`/`anti_ice` were left as-is since they were never canonical names to begin with (legitimate custom/host-defined names, not a rename target). Also fixed the same class of stale name in `StudioLayersPanel.js`'s Palette default-bindings (`core.display`/`core.input`/`core.stepper`/`core.rotary` cards) and `StudioState.js`'s Sim Bench seed data — the latter rebuilt entirely, from a hardcoded 9-key stale-name object to a `DECK_EVENTS`-driven generator (`buildDefaultSimTelemetry()`) so it can't drift from the canonical list again. `StudioSimBench.js`'s "Global Avionics" panel was similarly rebuilt off `getDeckEventsByCategory()` instead of nine hardcoded `buildSimControl()` calls, gained category grouping and human labels, and picked up three scenario presets (Cold & Dark / Cruise / Approach). All `createdWith` template metadata bumped to `'Flight Deck Widget Studio v1.4'`.

---

### Community Deck Events Packs (new cross-app feature)

**Added `shared/deckEventPacks.js`** (synced to `flight-deck-pwa/js/core/deckEventPacks.js` and `widget-studio/core/deckEventPacks.js` via `scripts/sync-shared.mjs`, which gained a third synced-file target for both apps). A "pack" is a small importable/exportable JSON file of extra `{name, kind, category, label}` logical-name suggestions — same shape as `deckEvents.js`'s canonical `DECK_EVENTS` — that a binding picker's "Custom…" dropdown merges in alongside names already found in a user's own saved/installed widgets (previously the *only* source, meaning a fresh install had zero suggestions and no way for community authors to share a naming vocabulary).

**Why this needed no PC Bridge changes:** `pc-bridge/profileManager.js`'s `registerDiscoveredVars()` already auto-registers any logical name a widget actually uses as an unmapped placeholder the moment that widget is installed (FDWS v1.4 Appendix B item 3) — this was already fully implemented before this session, independent of whether any authoring tool "knew about" the name in advance. A pack is therefore purely an authoring-time convenience layered on top of an escape hatch (bare logical names, FDWS v1.4 §1.2) that already worked; it never touches the wire format, the validator's accepted grammar, or any host resolution code.

**Widget Studio**: new "COMMUNITY DECK EVENTS PACKS" section at the bottom of the Library tab (`StudioLayersPanel.js`) — Import Pack (file input, validated via `parsePackFile()`, stored in this browser's `localStorage`), Export My Custom Names (packages the same custom-name scan `extractCustomDeckEvents()` already does across saved widgets into a downloadable pack JSON), and a list of imported packs with a Remove button. `StudioInspector.js`'s SIMVARS & BINDINGS custom-event dropdowns now merge `getPackSuggestedEvents()` in alongside the existing saved-widget scan, tagged `(from pack: <name>)` vs. `(used by <widgetIds>)`.

**Flight Deck PWA**: equivalent new "Community Deck Events Packs" card in the Settings page (`js/ui/SettingsView.js`) — same Import/Export/Remove UX, sourced from `storageManager.getAllWidgetDefinitions()` (the PC-Bridge-synced installed-widget store) instead of Studio's saved-widget library. `js/ui/PropertyInspector.js`'s `refreshCustomDeckEvents()` now merges pack suggestions the same way Studio's Inspector does (and, as a side fix, no longer skips populating the custom dropdowns entirely when `storageManager` is unavailable — it now always shows at least the pack suggestions).

Each app's imported-pack list lives in that app's own `localStorage` — importing a pack in one app doesn't make it appear in the other. The pack JSON file itself is the sharing/portability unit, by design (matches how `.fdwidget`/`.json` widget export already works).

---

## FDWS v1.4 — 2026-08-23 (later same day, adopted suite-wide)

**Adopted [FDWS v1.4](docs/FlightDeck-Widget-Standard-v1.4.md)**, drafted earlier the same day (see the "Cleanup pass" and PWA↔PC Bridge sync-mechanism review below for the two gaps that motivated it). Fully additive over v1.3 — no existing widget needs any change to stay conformant.

**Implemented — the follow-up the draft called out.** `shared/SecurityValidator.js`'s `validateFDWSDefinition()`: bumped the `fdws` version allowlist to include `"1.4"`, and added a new check (§1.1) that warns — and coerces to `1`, so a bad value can't silently corrupt a downstream sync-diff comparison — when `revision` is present but not a positive integer. `revision` itself needed no new plumbing: PC Bridge/PWA's custom-widget sync (`userPresetManager.computeDiff()`, `StorageManager.reconcilePushUp()`) was already comparing it; this only closes the gap that the actual conformance gate never validated it. Synced to `flight-deck-pwa`/`widget-studio` via `scripts/sync-shared.mjs`. `widget-studio/js/StudioValidator.js` (a separate, non-synced implementation) already had the equivalent `revision` check — only its own `fdws` allowlist needed the same bump.

**Adopted suite-wide.** Every "current FDWS version" pointer bumped from v1.3 to v1.4: the root `README.md` and each app's own README (`flight-deck-pwa`, `pc-bridge`, `widget-studio`), and every generic in-app "current spec version" label in Widget Studio (the nav-bar badge and "Standard: vX.X.X" in `StudioApp.js`, the Validate button/report-modal titles in `StudioStatusBar.js`, `StudioValidator.js`'s own file header, the export toast in `StudioMenuBar.js`, the Sim Bench subtitle, the Templates panel header) — the same set fixed to v1.3 in the earlier cleanup pass below, now bumped again since that's exactly the class of label meant to track the current version. Also extended every `"still current under vX"` code comment covering the v1.2 §1.5 raw-namespace escape hatch (`shared/deckEvents.js`, `shared/widgetVarExtractor.js`, `pc-bridge/server.js`, `pc-bridge/README.md`, `docs/PC-Bridge-HEvent-Shim.md`) to v1.4, since neither v1.3 nor v1.4 touches that namespace. Left untouched, deliberately, same as last time: per-feature `"FDWS v1.2 §X"` citations (correct historical references, not compliance claims), the ambiguous `[Widget Studio v1.2]` app-version log lines, and every existing widget's own `fdws`/`revision` declaration in `garmin-widgets/`, `shared/widgets/definitions/`, and Widget Studio's templates — those correctly stay at whatever's the *minimum* version their actual features require (mostly `1.1`, the Garmin pack and one Studio popover template at `1.3`), not the host's new maximum; over-declaring would be as wrong as under-declaring.

---

## Cleanup pass — 2026-08-23 (later same day, ahead of drafting the FDWS v1.4 update)

Two confirmed-stale items from this same day's "Known gaps" list, cleaned up before starting the spec-update draft. Both are removals/relabeling only — no behavior change to anything a widget or user-facing flow depends on.

**Removed — `pc-bridge/server.js`'s legacy static `SIM_VARS`/`simStateCache` seed data.** The hardcoded autopilot/COM/NAV SimConnect data definition (`SIM_VARS` array, `DATA_DEFINITION_ID`/`DATA_REQUEST_ID`, and `simStateCache`'s hardcoded seed values) predates the Deck Events unification and was already confirmed dead by grep — the `"TRANSPONDER CODE:1"` entry it once also contained was removed earlier the same day as the fix for the duplicate-subscription squawk bug, and this pass removes the rest of that same system (COM/NAV frequencies, autopilot state), which had zero consumers anywhere in the repo outside `server.js` itself. `simStateCache` is retained as the live cache — it's still exported and still populated, now solely by the dynamic per-profile Deck Events subscription path (`subscribeDynamicSimVar()`), same as `xpndrCode` already was. The unconditional static SimConnect subscription this removes was also strictly extra SimConnect traffic for values nothing read.

**Fixed — stale `FDWS v1.2` compliance labels in Widget Studio.** `StudioValidator.js` already implements v1.3's `kind`/`popoverWidgetId`/`contextKey` rules (per `README.md`), but several user-facing and file-header labels still advertised `v1.2` as the currently-enforced/current spec version: the nav bar's `spec-version-badge` and "Standard: v1.2.0" (`StudioApp.js`), the Validate button title and validation-report modal title (`StudioStatusBar.js`), `StudioValidator.js`'s own file-header doc comment, the "Copied full FDWS v1.2 JSON" toast (`StudioMenuBar.js`), the Sim Bench subtitle (`StudioSimBench.js`), and the Templates panel header (`StudioLayersPanel.js`). All bumped to v1.3. Left untouched, deliberately: every in-code comment citing a specific spec section a feature originates from (e.g. "FDWS v1.2 §2.3: props.literalOverride...") — those are correct historical citations, not compliance-version claims, and v1.3 didn't change any of that v1.0–v1.2 behavior. Also left untouched: the ambiguous `[Widget Studio v1.2]` console-log lines and `StudioStatusBar.js`'s `brand-ver` badge — already flagged in this file's "Known gaps" section as genuinely unclear (app release version vs. spec-version shorthand) and still the team's call, not a grep-verifiable correction like the items above.

---

## Bug fixes — 2026-08-23 (later same day, following the documentation audit below)

Found while actually trying to import and fly with the Garmin widget pack — a chain of six issues, each surfaced by fixing the one before it and testing live, from "can't import a v1.3 widget at all" down to "a dev-mode data storage path bug." **User-confirmed working end-to-end** after the full chain (see the final entry, "Also fixed — dev-mode data...", for the last of these). Summary, in the order they were found and fixed:

1. **FDWS v1.3 widgets couldn't be imported into the PWA at all** — `SecurityValidator`'s structural gate didn't recognize `"fdws": "1.3"`.
2. **Every binding in the Garmin widget pack was dead** — built against a naming scheme that predates the Deck Events unification.
3. **A validator false-positive** (spurious "capability not referenced" warnings) — one from an incomplete rename, one a pre-existing gap in what the cross-check understood as "referenced."
4. **Squawk code display was garbled, then flashed to hex before self-correcting** — two widget types disagreed on whether "the raw value" was BCD16-packed or plain decimal; fixed with a single server-side decode point.
5. **Squawk code stopped updating from live sim changes** — a dead legacy code path was double-subscribing the same SimConnect variable.
6. **Importing the widget silently overwrote the real squawk code with `1200`** — an input field committed-and-dispatched on every blur, not just on an actual edit; found via a PC Bridge console log the user captured. Also fixed a related dev-mode data storage bug found in that same log (see below).

Details on each, below.

**Fixed — `shared/SecurityValidator.js`'s structural gate rejected every FDWS v1.3 widget.** `validateFDWSDefinition()`'s version check only accepted `["1.0", "1.1", "1.2"]`. Since this function runs before anything else on every import path — `WidgetRegistry.installDefinition()` (the PWA drawer's Import button), `StorageManager.importWidgetDefinitionJSON()`, `StorageManager`'s remote-sync apply path — any widget declaring `"fdws": "1.3"` (i.e. every widget in `garmin-widgets/`) was rejected outright with "Invalid FDWS Widget Definition: FDWS version must be...", regardless of whether it used any v1.3 feature. Widget Studio was unaffected (`StudioValidator.js` already had the right list) — only the PWA's import path used the stale one. Fixed the version list to `["1.0", "1.1", "1.2", "1.3"]` and added v1.3-aware validation the shared validator was missing entirely: `kind` (unknown values graceful-degrade to `"widget"`, per spec), and shape/injection sanitization for `core.openWidgetPopover`'s `popoverWidgetId` and `core.commitToHost`'s `contextKey` (malformed ones are stripped with a warning, mirroring how `readSimVar`/`writeEvent` are already handled). Synced to both apps via `scripts/sync-shared.mjs`. Verified live: imported the full `com.flightdeck.garmin.navradios.json` through the real `StorageManager.importWidgetDefinitionJSON()` path in a running PWA instance — succeeds, `kind` and both `core.openWidgetPopover` interactions survive intact.

**Fixed — every binding in the Garmin widget pack (`garmin-widgets/`) was a dead reference.** All `readSimVar`/`writeEvent`/`syncFrom`/interaction `event` values used an ad-hoc naming scheme (`nav1_act`, `xpndr`, `xpndr_mode`, and literal-looking SimConnect event names like `AP_MASTER`, `NAV1_SWAP`) that predates the v2.4 Deck Events unification below and doesn't match any name in `shared/deckEvents.js`. Since none of these are `A:`/`L:`/`H:`/`K:`-prefixed, PC Bridge's `dispatchSimEvent()`/`resolveSimVarSource()` treated them as logical Deck Event lookups, found nothing in the active profile, and silently no-op'd (a console warning, no error) — 93 bindings across 6 of the 7 widget files. The widgets imported and rendered fine; nothing on screen would ever update and nothing tapped would ever reach the sim. Renamed every binding to its canonical Deck Event name (a clean 1:1 mapping cross-referenced against `profileManager.js`'s `DEFAULT_WRITE_TARGETS`/`DEFAULT_READ_TARGETS` and verified programmatically against `DECK_EVENT_NAMES` afterward — zero unresolved). `garmin-widgets/README.md` updated to reflect this and to drop its now-incorrect claim that `panel_brightness`/`xpndr_mode` telemetry "isn't yet broadcast by PC Bridge" — under their correct canonical names (`panelBrightnessLevel`/`xpndrModeState`) both already are, in the default profile.

**Not a bug (corrected a stale caution instead):** the `TRANSPONDER CODE:1` BCD16 concern flagged in `server.js`/`profileManager.js`'s comments and the previous documentation-audit findings turned out to already be handled — `ValueFormatter.js`'s `"BCD_HEX"` format (used by the transponder widget's display/input, and paired with `profileManager.transformValue`'s `BCD_HEX` case on write) does a correct BCD16⇄decimal round-trip via `toString(16)`/`parseInt(...,16)`, for the standard 0–7-per-digit case real transponders are restricted to anyway. Comments corrected in both files so a future pass doesn't try to "fix" something that isn't broken.

### Follow-up, same day: two bugs the above fix exposed by actually being usable

Found by the user importing the (now-importable) Garmin transponder widget for real and hitting a warning dialog + a wrong squawk display.

**Fixed — the Garmin widget rename above missed `capabilities.readSimVars`/`writeEvents`.** The mechanical rename only matched the singular keys (`readSimVar`, `writeEvent`, `syncFrom`, `event`); the `capabilities` block uses the plural, array-valued `readSimVars`/`writeEvents` — a different JSON shape the rename script's regex never touched. Every widget's declared-capabilities manifest was still listing the old dead names, which `SecurityValidator`'s §11 Rule 5 cross-check correctly flagged as "declared but not referenced by any component" (5 warnings on the transponder widget, matching what the user saw). Renamed those arrays too, with the same mapping table.

**Fixed — `SecurityValidator`'s §11 Rule 5 cross-check only recognized two of four ways a widget can reference a capability.** After the capabilities-array fix, 3 spurious warnings remained across the pack. Root cause: the cross-check's `foundSimVars`/`foundWriteEvents` collection only scanned `comp.binding.readSimVar`/`writeEvent` — it didn't know about `state[].syncFrom` (FDWS v1.2 §3.2, used by essentially every widget in this pack for its live-telemetry state vars), `interactions[].action.event` on a `core.dispatchEvent` action (the standard way most buttons fire an event, per `CompositeWidget.js`), or `core.rocker`'s `props.zones[].writeEvent` (`RockerComponent.js` dispatches these directly, independent of `comp.binding` entirely). All three now feed the same tracking sets. While in there, also fixed `comp.binding.ackEvent`/`pushEvent` (alternate write-event fields `core.ackIndicator` and dynamic-binding pre-registration already treat as equivalent to `writeEvent`) never being sanitized or counted at all — currently unused by any widget in the repo, but a real gap for the next one that uses `core.ackIndicator`. All 7 Garmin widgets plus `shared/widgets/definitions/com.flightdeck.comradios.json` now validate with zero warnings.

**Fixed (in two passes) — squawk code display.** First pass: the write path doesn't go through a SimConnect "unit" string at all (`transmitClientEvent` just sends a raw value), but the read path does, and `TRANSPONDER CODE:1` was being requested with unit `"number"` when its actual native unit is `"Bco16"` (Binary Coded Octal) — changed to `"Bco16"` in both `server.js`'s static `SIM_VARS` entry and `profileManager.js`'s `DEFAULT_READ_TARGETS.xpndrCode`.

That fix was necessary but incomplete, and live-testing it (by the user, not from here — no live MSFS access in this environment) surfaced the real shape of the bug: **two different widget types disagreed about what "the raw squawk value" means, and the `"Bco16"` fix satisfied only one of them.** `RadioWidget.js` (the default, non-FDWS transponder widget on the built-in Radio Stack page) does `String(val).padStart(4,'0')` on the raw telemetry value with no decoding at all — it was always implicitly relying on SimConnect handing back an already-decoded plain decimal number. The Garmin widget's `core.input`, meanwhile, used `format: "BCD_HEX"`, which assumes the opposite: a raw BCD16-packed integer that it decodes itself via `toString(16)`. Before the `"Bco16"` unit fix, the raw value apparently came back already-decoded (matching `RadioWidget.js`'s assumption, breaking the Garmin widget's decode into garbage); after it, the raw value became the true packed BCD16 integer (fixing the Garmin widget, breaking `RadioWidget.js` into showing something like "4608" instead of "1200"). The Garmin widget's local-optimistic update (the value it shows immediately after the user types, before telemetry round-trips back ~1s later) hit the identical mismatch from the other direction — the freshly-typed plain-decimal string got run through the same BCD16-assuming decoder, producing a garbled flash that then corrected itself once real telemetry (now correctly BCD16-packed) arrived and re-decoded properly. Both user-reported symptoms — the default widget's garbled code, and the Garmin widget's flash-then-correct — were the same root cause from two different angles.

The actual fix: decode BCD16→decimal exactly once, server-side, right where the raw SimConnect value is read (`bcd16ToDecimal()` in `server.js`, applied via a `BCD16_DECODE_KEYS` set covering both the legacy static `TRANSPONDER_CODE_1` cache key and the `xpndrCode` Deck Event, at both of PC Bridge's SimVar read sites). Every widget downstream — `RadioWidget.js` included — now sees a plain decimal squawk value and never needs to know BCD16 was ever involved; no widget-side decode logic needed at all. Added `ValueFormatter.js`'s `"SQUAWK_CODE"` format (plain zero-pad, matching `RadioWidget.js`'s own `padStart(4,'0')`) and switched the Garmin transponder widget's `core.input` from `format: "BCD_HEX"` off onto it, since the value arriving is no longer BCD-packed and re-decoding an already-decoded value would reintroduce exactly this bug. `BCD_HEX` itself is left in `ValueFormatter.js` for any future case that's actually fed a genuine raw BCD16 integer. The write path (`profileManager.transformValue`'s `BCD_HEX` case, `parseInt(str, 16)`) needed no change — it was already correctly encoding a typed decimal string into the packed value SimConnect's `XPNDR_SET` expects. Verified with a Node-side simulation of the full write→SimConnect→read→decode→format round-trip and the local-echo path in isolation — all three now agree on `1200` for a `1200` input.

**User-confirmed working, then one more issue found live: squawk display froze after the first update** — a sim-side code change (not made through either widget) never propagated to either the default or Garmin transponder widget, even though the write path and the first read both worked. Root cause candidate found by code inspection (not directly reproducible here, no live sim access): `server.js` was subscribing to `"TRANSPONDER CODE:1"` **twice**, through two entirely separate SimConnect data definitions — once via the legacy static `SIM_VARS` list (unconditional, subscribed at every connection regardless of what any widget needs) and once via the dynamic Deck Events path (`xpndrCode`, only while some widget is actually bound to it). The static `SIM_VARS`/`simStateCache`-keyed-by-`SCREAMING_SNAKE_CASE` system turned out to be entirely dead code across the whole repo — confirmed by grep, zero client-side consumers of any of its keys, a leftover from before the Deck Events unification that (like the dead `pages/*.js` files documented earlier) was never cleaned up. Two overlapping data definitions requesting the identical variable with a non-trivial coded unit (`Bco16`) is a plausible source of exactly this "updates once, then never again" symptom. Removed the dead `TRANSPONDER_CODE_1` entry from `SIM_VARS`/`simStateCache` — the `xpndrCode` dynamic subscription is now the only place this variable is read. **The rest of the static `SIM_VARS` system (COM/NAV frequencies, autopilot state, all equally dead) was deliberately left alone** — real cleanup opportunity, but out of scope for this specific live-debugging session; flagging for a future pass.

**Found the actual smoking gun via a PC Bridge console log the user captured: `core.input` writes to the sim on every blur, whether or not the user edited anything.** `InputComponent.js`'s `blur` listener unconditionally called `validateAndCommit(inputEl.value)`, which dispatches `binding.writeEvent` with whatever the field currently displays — no check for whether the value actually changed, or whether the user touched the field at all. Combined with the mount-time behavior of showing a hardcoded default (`"1200"`) immediately, before the first live telemetry frame arrives to overwrite it: importing the Garmin widget triggered a full remount of the whole Radio Stack page (evidenced by the log's `Dynamic SimVar Unregistered`/`Subscribed` burst for every radio, not just the new one), both transponder widgets briefly showed the stale `"1200"` default, and *something* — a stray focus/blur from the import flow, no deliberate edit needed — caused `xpndrSet(1200)` to actually fire and get sent to SimConnect, confirmed by the log's `Triggering SimConnect Event: xpndrSet (1200)` line. That's a real write: it overwrote whatever squawk code was actually set in the sim, which is why the displayed code stayed wrong and why a live sim-side change afterward looked like it "wasn't updating" — the app kept re-asserting `1200` any time focus churned near that field. This was a pre-existing bug (not introduced this session), just never dangerous before now — re-committing an unedited frequency field on stray blur is a no-op in effect; re-committing an unedited squawk field while it's still showing a stale mount-time default is a real, silent overwrite of live cockpit state.

Fixed by tracking whether the user has actually typed since the field was last focused (`this.dirty`, set on the native `input` event, cleared on focus/after a commit) and gating `validateAndCommit()` on it in both the `blur` and `change` handlers — a blur or change with no edit now does nothing. This protects every `core.input` field across the whole widget system, not just the transponder. `RadioWidget.js`'s own frequency/squawk inputs were checked and found not to have this problem — they only listen for the native `change` event (no `blur` handler), and browsers only fire `change` when the value actually differs from what it was at focus time, so they were already effectively guarded.

Between this fix and the duplicate-subscription removal above, both reported symptoms — the incorrect `1200` on import, and squawk changes not propagating afterward — are now fixed.

**Also fixed — dev-mode data was being saved inside `node_modules/electron/dist/`, wipeable by any `npm install`.** Noticed because the user's console log showed a widget getting saved to `pc-bridge\node_modules\electron\dist\widgets\...` — a surprising, fragile location. `userPresetManager.js`'s `getBaseStorageDir()` tried to distinguish a packaged `.exe` from a dev run via `process.versions.electron && process.resourcesPath`, but Electron sets `resourcesPath` in dev mode too (`npm start`, running out of `node_modules/electron/dist/`) — the check couldn't actually tell the two apart, so dev runs always took the "packaged" branch and saved every custom widget/profile/preset next to the dev Electron binary instead of next to `pc-bridge/`. Fixed to use `app.isPackaged`, Electron's own correct signal for this. Getting `app` safely required more care than expected: a plain `import { app } from 'electron'` (as `main.js` already does, since it only ever runs inside the real Electron process) throws a hard `SyntaxError` at import time under plain `node server.js` — this file's own documented standalone-testing path — because `electron`'s package is CommonJS and Node's ESM interop won't destructure a named export from it unless the object shape supports it, which it doesn't when `electron`'s default export is just a path string (the case under plain Node). Verified both paths directly: under plain `node`, `import electronPkg from 'electron'` resolves to a string and the code now correctly falls back to `__dirname`; the packaged-Electron path still resolves to the real `app` object with `main.js` unaffected.

---

## Documentation audit — 2026-08-23 (later same day)

A follow-up pass over the whole suite's documentation, prompted by the v2.4 session below leaving several loose ends. No app behavior changed except two stale version-label strings (noted below); everything else is a documentation correction.

**Correction — FDWS v1.3 Widget Popovers are implemented, not "not yet implemented."** The v2.4 session below (see "Documentation accuracy pass" and "Known gaps") asserted, based on a grep of `shared/` only, that v1.3 Widget Popovers had zero implementation anywhere. That grep was scoped too narrowly: `flight-deck-pwa/js/widgets/components/WidgetPopoverModal.js` and `widget-studio/widgets/components/WidgetPopoverModal.js` both exist, are fully wired up (`CompositeWidget.js`/`WidgetRegistry.js`/`WidgetDrawer.js` in the PWA; `MockWidgetHost.js`/`StudioInspector.js`/`StudioState.js`/`StudioValidator.js`/`StudioLayersPanel.js`/`StudioDeviceView.js` in Studio), and are genuinely independent implementations rather than copies of a shared file — which is exactly what the v1.3 spec's own implementation note (§0/preamble) already said to expect, since a popover has to mount through each app's own widget-hosting machinery. Studio's `pickPopoverWidgetId()` even satisfies the spec's "Adoption notes" recommendation of a real widget picker over free text. `shared/widgets/components/` correctly has no `WidgetPopoverModal.js` — that's by design, not a gap — but the absence was misread as "unimplemented" instead of "implemented at the app level, as intended." Fixed in `README.md`, `pc-bridge/README.md` (was also missing the `#deck-events` anchor the root README links to), `flight-deck-pwa/README.md`, and `widget-studio/README.md` (also bumped its stale "current version v1.2" FDWS pointer to v1.3, and documented the Widget Popover authoring/preview support that had no README coverage at all).

**Fixed — stale `createdWith` version stamp.** `widget-studio/js/StudioTemplates.js`'s 7 built-in templates all stamped exported widgets with `createdWith: 'Flight Deck Widget Studio v1.1'`, one version behind every other in-app self-reference (`app.js`, `StudioApp.js`, `studio.css` all say `v1.2`). Bumped to `v1.2` to match — a plain drift fix, not a resolution of the open question below.

**Still unresolved — what "Flight Deck Widget Studio v1.2" in `app.js`/`StudioApp.js`/`studio.css` actually means.** Left exactly as the v2.4 session below found it: genuinely ambiguous whether this is Widget Studio's own application version (it has no `package.json`, unlike `pc-bridge`/`flight-deck-pwa`, both at app version `1.2.0`) or shorthand for "FDWS v1.2-compliant." New information from this pass: Studio now has real, working FDWS v1.3 support (Widget Popovers), which makes the "FDWS version shorthand" reading stale under either interpretation. Not changed here since it's still the team's call, not a grep-verifiable correction like the item above — but worth resolving soon, since it'll only get more misleading as Studio picks up further FDWS features.

---

## v2.4 — 2026-08-23

This release covers a single extended session: adding an H:Event transport for payware aircraft, unifying default variable/event naming across the whole suite into a shared "Deck Events" system, and a round of bug fixes surfaced by live-testing every change in a real browser/Electron session rather than trusting static review alone. Component versions bumped: `pc-bridge` 1.1.0 → **1.2.0**, `flight-deck-pwa` 1.1.0 → **1.2.0**, new `shared/` package **1.0.0**. **FDWS itself is unchanged** (still v1.3, adopted earlier the same day, before this session) — nothing in this changelog modifies the widget standard; all of it builds on top of FDWS v1.2 §1.5 (the `A:`/`L:`/`H:`/`K:` raw-namespace escape hatch), which v1.3 leaves untouched.

---

### 1. H:Event WASM shim (PC Bridge ↔ MSFS transport)

**Why:** SimConnect's client API can transmit K:Events directly, but **H:Events have no external transmit API** — only code running inside the sim process can fire one. Several payware aircraft (per FDWS v1.2 §1.5) expose cockpit functions only as H:Events, so without this, those functions were unreachable from PC Bridge.

**What was built:**
- [`pc-bridge/wasm-shim/`](pc-bridge/wasm-shim/) — a minimal WASM relay module (`Sources/Code/Module.cpp`) that watches a SimConnect Client Data Area (`FlightDeck.HEventChannel`) and calls `execute_calculator_code()` on whatever it receives. Project layout mirrors the MSFS SDK's own `Samples/DevmodeProjects/Misc/StandaloneModule/` reference project (`.vcxproj`/`.sln`, `PackageDefinitions/`, top-level `*Project.xml`) so it builds with the SDK's `MSFS2024` platform toolset with no guesswork.
- [`pc-bridge/simInstallLocator.js`](pc-bridge/simInstallLocator.js) — finds the user's actual Community folder by parsing `InstalledPackagesPath` out of `UserCfg.opt`, checking both Steam and Microsoft Store install locations (scans `%LOCALAPPDATA%\Packages\` for `Microsoft.Limitless*`/`Microsoft.FlightSimulator*` rather than hardcoding one package family name).
- [`pc-bridge/wasmShimManager.js`](pc-bridge/wasmShimManager.js) — install/uninstall/status for the shim package, driven from a new "H:Event WASM Shim" card in [`bridge-ui.html`](pc-bridge/bridge-ui.html) (3 new IPC handlers in `main.js`: `get-hevent-shim-status`, `install-hevent-shim`, `uninstall-hevent-shim`).
- `server.js`: `setUpHEventChannel()` / `dispatchHEvent()` — writes the calculator-code string to the Client Data Area; `dispatchSimEvent()` routes any event whose name starts with `H:` here instead of the K-event `transmitClientEvent` path.

**Verification status: fully built, packaged, installed, and confirmed working live** — not just built, actually fired an H:Event in a running sim. `H:GTN750_DirectToPush` (the GTN 750's direct-to button in the HH65) was triggered through the real `dispatchHEvent()` transport, and the direct-to page opened in-sim. Two independent signals confirmed the pipeline: (1) `SimConnect_CreateClientData` returned `ALREADY_CREATED` for the channel when a test script tried to create it — proof `module_init()` had already created it, i.e. the shim was loaded; (2) the aircraft actually responded. Full writeup: [`docs/PC-Bridge-HEvent-Shim.md`](docs/PC-Bridge-HEvent-Shim.md).

**Two real portability bugs caught during the build** (see `wasm-shim/README.md` for detail): `HANDLE`/`HWND` are plain integers on this WASM target, not pointer types (`nullptr` silently fails to convert — use `0`); and the callback couldn't be named `DispatchProc` because `SimConnect.h` already declares a typedef of that name (ambiguous-reference compile error) — renamed to `HEventDispatchProc`.

**Also fixed along the way:** the SDK Core installer's toolset repair must run **elevated** (non-elevated fails with Windows error 1625, "forbidden by system policy," since the SDK install is registered as admin-assigned) — documented in `wasm-shim/README.md` so the next person doesn't lose time on it.

---

### 2. "Deck Events" — unified default naming across PWA, PC Bridge, and Widget Studio

**Why:** Before this session, the same conceptual action had inconsistent names across the codebase — `SCREAMING_SNAKE_CASE` for writes (`COM1_SWAP`), `snake_case` for reads (`com1_act`), and `profileManager.js`'s `DEFAULT_PROFILE` even had two parallel naming schemes for the same autopilot actions (an old "logical alias" layer sitting alongside literal-K-event-named duplicates added later). None of it was shared between apps — each app hardcoded its own copy.

**What was built:**
- [`shared/deckEvents.js`](shared/deckEvents.js) — **single canonical source of truth**: 86 default Deck Events (48 write, 38 read), camelCase (`com1Swap`, `xpndrIdent`, `apHdgBugValue`, …), each with `{ name, kind, category, label }`. The old dual-scheme duplication in `profileManager.js` was collapsed to one canonical name per action.
  - `pc-bridge` imports it **directly** via a relative path (`../shared/deckEvents.js`) — no copy step, Node resolves it at runtime.
  - `flight-deck-pwa` and `widget-studio` get a **synced copy** via [`scripts/sync-shared.mjs`](scripts/sync-shared.mjs) (now also syncs `deckEvents.js` and the new `widgetVarExtractor.js` alongside the existing components/definitions/SecurityValidator.js targets).
- [`shared/widgetVarExtractor.js`](shared/widgetVarExtractor.js) — the widget-binding scanner, **moved out of `pc-bridge/widgetVarRegistry.js`** (which is now a two-line re-export) since it had no Node dependency and both PWA and Widget Studio needed the identical scan client-side. Added `extractCustomDeckEvents()` — scans a set of widget definitions and returns the deduplicated non-default Deck Events they reference, each tagged with which widget(s) use it.
- `pc-bridge/profileManager.js` — `DEFAULT_PROFILE` is now **generated** from `shared/deckEvents.js` at load time (`DEFAULT_WRITE_TARGETS`/`DEFAULT_READ_TARGETS` supply the real SimConnect event/variable each canonical name resolves to — that mapping stays PC-Bridge-only, per the design: PWA and Widget Studio only ever see Deck Event names, never real SimVars). A startup consistency check throws immediately if a name in `deckEvents.js` has no matching real-target entry, instead of silently producing an unmapped default.
- **Escape hatch** (`server.js`): `PREFIXED_VAR_RE` (`/^(A|L|H|K):/i`) lets a widget bind directly to a raw SimConnect/L:Var/H:Event identifier instead of a logical Deck Event name — bypasses the profile-mapping lookup entirely in both `dispatchSimEvent()` and the new shared `resolveSimVarSource()` helper (which also de-duplicated `subscribeDynamicSimVar()`/`reapplyDynamicSimVars()`, which had been independently reimplementing the same resolution logic).
- **PC Bridge config UI "Custom" tab** ([`config-ui.html`](pc-bridge/config-ui.html)): the old "Other / Custom" tab (empirically always empty for defaults) is now a real Custom tab — every non-default key, grouped into collapsible per-widget `<details>` sections using each entry's `discoveredFrom` metadata. Tab classification (`radio`/`ap`/`lights`) and labels are now sourced from `deckEventInfo` (piped through `main.js`'s `get-profiles-data` IPC handler from `DECK_EVENTS` itself) instead of regex-matching the name string — this was a **real regression fix**, since the old regexes (`/^AP_/`, `/^(COM|NAV|XPNDR)/`) were tuned to the old SCREAMING_SNAKE_CASE names and would have silently hidden every default Deck Event once the names went camelCase.
- **`PropertyInspector.js`** (PWA's long-press widget-config modal) and **`StudioInspector.js`** (Widget Studio's binding editor): both converted from plain free-text inputs (PWA) / datalist autocomplete with a hardcoded, PC-Bridge-unaware suggestion list (Studio) to a consistent pattern — a `<select>` of default Deck Events plus a "Custom…" option that reveals a second `<select>` (populated by scanning all other known widgets — `storageManager.getAllWidgetDefinitions()` in PWA, `state.loadSavedWidgets()` in Studio — via `extractCustomDeckEvents()`) plus a free-text field that still accepts anything, including a raw SimVar/H:/L:/K: escape-hatch value.
- Renamed every default reference across the suite to match: `shared/widgets/definitions/{sampleWidgets.js,com.flightdeck.comradios.json}`, `flight-deck-pwa/js/core/StorageManager.js` (the actual live source of the default dashboard's seeded widget instances), and `flight-deck-pwa/pages/{radios,autopilot,lights}.js` (renamed for consistency, but **these three files turned out to be dead code** — not imported anywhere in the app; flagging this clearly rather than implying they're load-bearing).

**Verification status: verified live in real browsers**, not synthetic tests alone — after a full IndexedDB/localStorage reseed:
- PWA: all three default pages (Radio Stack, Autopilot, Lighting Systems) confirmed rendering with the new names, by inspecting `activeWidgetInstances` directly.
- PC Bridge: `_test-escape-hatch.mjs`-style live WebSocket tests (temporary, deleted after use) confirmed prefixed names bypass profile lookup while bare names correctly hit it.
- Widget Studio: confirmed an unrecognized/stale binding value correctly falls into custom mode with the raw value preserved, a real default value selects cleanly, and the custom dropdown correctly picks up a binding from another saved widget.
- Final check: re-ran `extractCustomDeckEvents()` against the live, freshly-reseeded app — **zero stale entries anywhere**.

**Real bugs caught and fixed via this live testing** (not by static review):
1. **`SecurityValidator.sanitizeEventName()` was force-uppercasing every value** (`shared/SecurityValidator.js`) — would have silently corrupted every default dropdown selection (`com1Swap` → `COM1SWAP`, no longer matching anything) and broken the H:Event escape hatch outright (H:Events are case-sensitive on the sim side, confirmed by the GTN 750 test above). Fixed to preserve case; `EVENT_REGEX` widened to match.
2. **`RadioWidget.js`** had a stale `` `${this.radioType.toLowerCase()}_act` `` fallback pattern hardcoding the old naming convention — removed as dead weight now that nothing produces that shape of name.
3. **`lights.js`**'s "ALL EXT" button used the *renamed* state-key string to reconstruct a DOM id via `` `light-btn-${k}` `` — broke because the DOM ids themselves didn't change. Fixed by pairing DOM-id-suffix and Deck-Event-key explicitly instead of assuming they're the same string.
4. **`shared/` had no `package.json`** — `pc-bridge/profileManager.js` (ESM) importing `shared/deckEvents.js` via a relative path crashed at Electron launch with `SyntaxError: Named export 'DECK_EVENTS' not found... is a CommonJS module`, because Node determines a file's module type from *its own* nearest `package.json`, not the importer's. Fixed by adding [`shared/package.json`](shared/package.json) with `"type": "module"` — has no effect on `flight-deck-pwa`/`widget-studio`, which consume `shared/` via synced copies and browsers ignore `package.json` entirely.

---

### 3. Documentation accuracy pass

- Confirmed (by actually reading the full v1.3 spec and grepping `shared/` for v1.3 symbols) that **FDWS v1.3 is Widget Popovers only** and doesn't touch the variable/event namespace at all — added a "still current under v1.3" pointer everywhere `FDWS v1.2 §1.5` is cited (`docs/PC-Bridge-HEvent-Shim.md`, `pc-bridge/README.md`, `pc-bridge/server.js`, `pc-bridge/widgetVarRegistry.js`).
- Top-level `README.md`: bumped "current version" from v1.2 to v1.3, and flagged (with evidence — zero grep hits for any v1.3 symbol in `shared/`) that **v1.3's Widget Popovers are not yet implemented** in `shared/widgets/` — a real, pre-existing gap, unrelated to anything in this session, that doesn't affect any of the above since v1.3 never touches the namespace this session worked in.

---

### Known gaps / follow-ups for whoever picks this up next

- **FDWS v1.3 Widget Popovers are unimplemented** in `shared/widgets/` (`kind`, `$context`, `core.openWidgetPopover`/`commitToHost`/`closePopover`) — pre-existing, not touched this session.
- **`widget-studio/js/StudioApp.js`** logs `[Widget Studio v1.2]` — left alone. Ambiguous whether this is Widget Studio's own app version or shorthand for "FDWS v1.2 compliant"; given the instruction to leave FDWS references untouched and genuine uncertainty which this is, it wasn't bumped. Worth a team decision.
- **`widget-studio/README.md`** still says "current version v1.2" for FDWS compliance — same staleness as the top-level README had before this session's fix, not yet corrected here.
- **Two read Deck Events with no default mapping**: `data.ap_lvl`/`data.ap_toga` in `autopilot.js`'s `modeMappings` were never in `DEFAULT_PROFILE.simVars` even before this session (pre-existing gap, not introduced here) — left as dead reads with a comment rather than inventing a mapping.
- **`pc-bridge/wasm-shim/`**'s in-sim verification is scoped to one aircraft (HH65's GTN 750, one H:Event). Broader testing across other payware aircraft/H:Events would strengthen confidence but wasn't done.
- **The legacy flat-structure PWA files** at `C:\Users\pgzow\Flight Deck Project\Flight Deck\` (root-level `app.js`, `index.html`, `pages/`, etc. — a pre-reorganization snapshot with no `shared/`/`widget-studio/` split) were **not** merged or touched this session — only that location's `PC Bridge/` subfolder (+ a new `shared/` sibling) was synced to match the current repo, since that's what the reported error was about. If the legacy PWA copy also needs updating, that's a separate, larger task — the structural mismatch (no `shared/`, no component split) means it can't be a simple file copy.
