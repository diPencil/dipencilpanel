# diPencil Panel - Design System

> The single reference for how the panel looks, feels and behaves. If a screen
> disagrees with this document, the screen is wrong - or this document needs an
> explicit, reviewed update.

**Stack:** Tailwind CSS 4 · shadcn/ui (`new-york`) · Radix UI · lucide-react · Geist

**Conformance target:** WCAG 2.2 AA, light and dark, LTR and RTL, 360px and up.
**Binding status:** this document is law for every screen. It is enforced by
review and by [`scripts/check-ui-controls.py`](scripts/check-ui-controls.py).
**Related:** [`constitution.md`](constitution.md),
[`workflow.md`](workflow.md), [`architecture/modules.md`](architecture/modules.md).

> Current state (2026-11-25): the token, layout and component contracts below are
> already followed by the shared shell. Two areas are known debt and are tracked
> in the Risk Register in [`workflow.md`](workflow.md): 7 raw `<select>` elements,
> 24 native date/time inputs and 8 raw `<textarea>` elements, plus the absence of
> RTL routing. New and modified screens must follow the contract; the debt count
> goes down, never up.


---

## 1. Principles

1. **Calm, dense, operational.** This is a back-office tool. Information density
   beats decoration; whitespace separates groups, not everything.
2. **Neutral by default, colour for meaning.** Surfaces are greyscale. Colour is
   reserved for status (success / warning / destructive), primary actions and
   charts.
3. **One primary action per screen.** Secondary actions are `outline` or
   `ghost`. Destructive actions are never the visual default.
4. **Tokens, not hex.** Never write a raw colour in a component. Use the
   semantic classes exposed by `app/globals.css`.
5. **Accessible by construction.** Keyboard reachable, visible focus, labelled
   controls, WCAG 2.2 AA contrast in both themes.
6. **Responsive from 360px up.** Sidebar collapses, tables scroll, actions move
   to a bottom nav or overflow menu.

---

## 2. Colour tokens

All colours are defined as OKLCH custom properties in `app/globals.css` and
exposed to Tailwind through `@theme inline`. Use the **semantic class**, never
the raw variable, in components.

### Surfaces & text

| Token class              | Purpose                              |
| ------------------------ | ------------------------------------ |
| `bg-background`          | App canvas                           |
| `text-foreground`        | Primary text                         |
| `bg-card` / `text-card-foreground` | Cards, panels, header        |
| `bg-popover`             | Menus, popovers, dropdowns           |
| `text-muted-foreground`  | Secondary text, metadata, captions   |
| `bg-muted`               | Subtle fills, skeletons, empty states|
| `border-border`          | Default dividers and card outlines   |
| `bg-input` / `border-input` | Form control surfaces             |
| `ring-ring`              | Focus rings                          |

### Actions & status

| Token class                        | Purpose                                  |
| ---------------------------------- | ---------------------------------------- |
| `bg-primary` / `text-primary-foreground` | Primary button, active nav item    |
| `bg-secondary` / `text-secondary-foreground` | Secondary button, chips         |
| `bg-accent` / `text-accent-foreground` | Hover surface, selected menu item  |
| `bg-destructive` / `text-destructive` | Delete, failed, overdue              |
| `text-emerald-600` / `bg-emerald-100` | Paid, active, success (via Badge)     |
| `text-amber-600` / `bg-amber-100`     | Pending, expiring, warning (via Badge)|

### Sidebar tokens

The sidebar has its own token family so it can invert independently:
`--sidebar`, `--sidebar-foreground`, `--sidebar-primary`,
`--sidebar-accent`, `--sidebar-border`, `--sidebar-ring`.

### Charts

`--chart-1` … `--chart-5`. Use them in this order for categorical series.
Never assign a chart colour to a non-chart element.

### Dark mode

Dark mode is class-based (`@custom-variant dark (&:is(.dark *))`) and toggled by
`next-themes` through `components/theme-provider.tsx`. Both themes must be
checked for every UI change. Do not hard-code `dark:` colours that duplicate a
token - the token already flips.

---

## 3. Typography

| Role        | Class                         | Notes                                    |
| ----------- | ----------------------------- | ---------------------------------------- |
| Font family | `font-sans` → Geist           | Mono: `font-mono` → Geist Mono           |
| Page title  | `text-2xl font-bold tracking-tight` | One per page                       |
| Section     | `text-lg font-semibold`       | Card group headings                      |
| Card title  | `text-sm font-medium`         | With `text-muted-foreground` for labels  |
| KPI value   | `text-xl sm:text-2xl font-bold` | Numbers are the hero                  |
| Body        | `text-sm`                     | Default for tables, forms, descriptions  |
| Caption     | `text-xs text-muted-foreground` | Timestamps, helper text                |
| Overline    | `text-[10px] font-bold uppercase tracking-wider` | Badges, section eyebrows |

Rules:

- Maximum two weights per view (regular + semibold/bold).
- Do not use font sizes below `text-xs` for anything a user must read.
- Numbers in tables use `tabular-nums` when columns align.

---

## 4. Spacing, radius, elevation

- **Spacing scale:** Tailwind's 4px base. Common rhythm: `gap-2` inside
  controls, `gap-4` between fields, `gap-6` between cards/sections,
  `p-4 sm:p-6` inside cards.
- **Radius:** `--radius: 0.625rem` (10px). Derived: `rounded-sm/md/lg/xl`.
  - Buttons and inputs: `rounded-md`
  - Cards and KPI tiles: `rounded-xl`
  - Menus and popovers: `rounded-2xl`
  - Avatars and icon buttons: `rounded-full`
- **Elevation:**
  - Base card: `border border-border` (no shadow)
  - Hover: `hover:shadow-md`
  - Sticky header: `shadow-sm` + `bg-card/95 backdrop-blur-md`
  - Never stack more than one shadow on a surface.

---

## 5. Layout

```text
┌──────────────┬────────────────────────────────────────────┐
│              │ Header (sticky, h-16, breadcrumbs, actions)│
│  Sidebar     ├────────────────────────────────────────────┤
│  (collapsible│                                            │
│   / foldable)│  Page content: max-w, px-4 sm:px-6, py-6   │
│              │                                            │
└──────────────┴────────────────────────────────────────────┘
        Mobile: sidebar becomes a Sheet; primary nav moves to bottom bar.
```

- **Sidebar** (`components/layout/sidebar.tsx`): grouped navigation, collapsible
  sub-menus, folded icon-only mode on desktop.
- **Header** (`components/layout/header.tsx`): breadcrumbs left; search
  (`⌘K` / `Ctrl+K`), notifications, theme toggle and user menu right.
- **Mobile bottom nav** (`components/layout/mobile-bottom-nav.tsx`): max 5
  destinations.
- **Page shell:** every dashboard page starts with a title row
  (title + description on the left, primary action on the right) followed by
  content sections.
- **Content width:** forms use a constrained column (`max-w-2xl`–`max-w-4xl`);
  tables and dashboards go full width.

### 5.1 Responsive and direction rules

- Breakpoints in use: 360 (small phone), 768 (tablet), 1024 (small laptop),
  1440 (desktop). Test 360, 768 and 1440 at minimum.
- Tables scroll horizontally inside a bordered container; never hide a column
  without an alternative way to reach the data.
- Actions collapse into an overflow menu or the mobile bottom nav below `md`.
- Use logical spacing and alignment utilities so the same markup works in LTR
  and RTL. See the direction rules in
  [the form controls contract](#direction-ltr-and-rtl).

---

## 6. Component conventions

All primitives live in `components/ui/`. Compose them; do not fork them.

### Button (`components/ui/button.tsx`)

| Variant       | Use for                                        |
| ------------- | ---------------------------------------------- |
| `default`     | The single primary action on a screen          |
| `secondary`   | Neutral actions with equal weight              |
| `outline`     | Secondary actions beside a primary button      |
| `ghost`       | Toolbar icons, menu triggers, low-emphasis     |
| `destructive` | Delete / irreversible actions (usually in a confirm dialog) |
| `link`        | Inline navigation inside prose                 |

Sizes: `sm` (tables/toolbars), `default` (forms), `lg` (marketing/empty states),
`icon`, `icon-sm`, `icon-lg`. Icon-only buttons **must** have `aria-label`.

### Badge (`components/ui/badge.tsx`)

Status mapping - keep it consistent across every feature:

| Domain status                         | Badge variant |
| ------------------------------------- | ------------- |
| `active`, `paid`, `completed`, `live` | `success`     |
| `pending`, `expiring`, `development`   | `warning`     |
| `overdue`, `failed`, `suspended`, `expired` | `destructive` |
| `inactive`, `draft`, neutral metadata  | `outline` / `secondary` |

### Form controls contract

This contract is binding for every input in the product. The browser default is
never the design.

**Core rule:** a new or modified screen may not contain a raw `<select>`,
`<input type="date">`, `<input type="time">`, `<input type="datetime-local">`,
`<input type="color">` or an unstyled `<textarea>`. Use the design-system
control. Existing native controls are tracked debt (R-06 in
[`workflow.md`](workflow.md)); converting one while touching its screen is
expected.

#### Control map

| Need | Use | Rules |
| ---- | --- | ----- |
| Single-line text | `components/ui/input.tsx` | `type` must be explicit; `autoComplete` set for identity fields |
| Long text | `components/ui/textarea.tsx` | starts at 3 rows, grows no wider than its column |
| Short choice list (<= 8) | `components/ui/select.tsx` | Radix select, keyboard type-ahead, portal inside the dialog |
| Long or searchable choice | `Popover` + `Command` | search field at the top, empty state, `aria-activedescendant` preserved |
| Multi-select | `Popover` + `Command` with checkbox items | selected values shown as removable chips |
| Date | `Popover` + `Calendar` | never `input type="date"`; typed entry allowed through a masked `Input` |
| Time | `Popover` with hour and minute `Select` | 24-hour storage, locale display; no dedicated primitive exists yet, compose one in `components/ui/` |
| Date and time | `Popover` + `Calendar` + time selects | one popover, not two |
| Boolean | `Switch` for immediate settings, `Checkbox` inside forms | label is part of the control, click target includes it |
| Money | `Input` with `inputMode="decimal"` | parse and round in `lib/billing/*`, never sum in the component |
| File or image | `Input type="file"` styled through the input contract | show the selected file name and a remove action |
| Search | `Input` with a leading icon | `aria-label="Search"`, `Esc` clears |

#### Anatomy

Every field renders, in this order:

1. `<Label>` connected with `htmlFor`, visible at all times.
2. Optional help text in `text-xs text-muted-foreground` with `aria-describedby`.
3. The control.
4. The error message in `text-destructive text-xs`, connected with
   `aria-describedby`, and `aria-invalid` on the control.

Placeholders are examples only. A placeholder never replaces a label. Required
fields carry a visible `*` and `aria-required`.

#### States

| State | Treatment |
| ----- | --------- |
| Default | `border-input bg-background` |
| Hover | `hover:border-ring/60` |
| Focus | `focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring` |
| Invalid | `aria-invalid:border-destructive aria-invalid:ring-destructive/20` |
| Disabled | `disabled:opacity-50 disabled:cursor-not-allowed`, never remove the label |
| Read-only | `readOnly`, normal contrast, no focus ring change beyond the default |
| Pending | control disabled plus `Spinner` inside the triggering button |

Sizes: `h-9` default, `h-8` compact (table toolbars), `h-10` comfortable
(login and empty states). Radius is `rounded-md`.

#### Behaviour

- `Enter` submits the form; `Esc` closes the open popover or dialog without
  submitting.
- Arrow keys move inside a select, calendar or command list; `Home`/`End` jump to
  the ends; type-ahead works in selects.
- A dialog traps focus, restores it to the trigger, and never nests a second
  modal inside itself.
- The submit button is disabled while pending and shows a spinner.
- Validation appears after the first submit or on blur, never on every
  keystroke.
- Touch targets are at least 24x24 px (WCAG 2.2, 2.5.8); primary controls are
  36 px tall.

#### Direction (LTR and RTL)

The document sets `lang` and `dir` on `<html>`. Components must not assume
left-to-right.

- Use logical utilities: `ps-*`/`pe-*`, `ms-*`/`me-*`, `start-*`/`end-*`,
  `text-start`/`text-end`. Never `pl-*`, `pr-*`, `ml-*`, `mr-*`, `left-*`,
  `right-*` for layout.
- Directional icons (chevrons, arrows, back) flip with
  `rtl:rotate-180` or the equivalent transform.
- Numbers, currency and dates are formatted by `Intl` with the active locale,
  not concatenated.
- The sidebar and mobile navigation mirror; the reading order follows the DOM.
- Test both directions at 360 px. RTL is not a CSS afterthought.

The app currently renders LTR only (`app/layout.tsx` sets `lang="en"`); RTL
support is tracked as R-08 in [`workflow.md`](workflow.md). The rules above still
apply to every new component so the eventual switch does not require a rewrite.

### Tables

- Use `components/ui/table.tsx`; wrap in a container with
  `overflow-x-auto rounded-xl border`.
- Header: `text-xs font-medium text-muted-foreground`, sticky when long.
- Row hover: `hover:bg-muted/50`. Clicking a row navigates to the detail page.
- Actions: icon buttons in the last column; destructive actions go through
  `ConfirmDeleteDialog`.
- Empty state: `EmptyState` component with icon, one-line explanation and a
  primary action.
- Loading: skeleton rows, not a full-page spinner.

### Dialogs & confirmations

- `Dialog` for create/edit forms that are small; full pages for complex forms.
- Every destructive action uses `components/shared/confirm-delete-dialog.tsx`.
- Dialog titles describe the action ("Delete client?"), the body names the
  object, the confirm button repeats the verb.
- `Esc` closes; focus returns to the trigger.

### Feedback

- Success: `sonner` toast (`toast.success`).
- Error: `toast.error` with an actionable message.
- Inline async state: `Spinner` inside the triggering control.
- Never use `alert()` or `confirm()`.

### Icons

- `lucide-react` only, `size-4` inside buttons/inputs, `size-5` in nav.
- Icons never replace a text label unless the meaning is universal
  (search, close, theme toggle) - and then an `aria-label` is mandatory.

---

## 7. Data visualisation

- Use `components/ui/chart.tsx` (Recharts wrapper) and the `--chart-*` tokens.
- One chart answers one question; the title states the question.
- Always show units and a date range.
- Provide a tooltip with the exact value; never rely on bar height alone.
- Currency values use `lib/billing/currency-utils.ts` /
  `lib/core/formatting.ts` - never
  hand-format money.

---

## 8. Motion

- Duration: `150ms` for micro-interactions, `200–300ms` for overlays.
- Easing: Tailwind defaults (`ease-out` for entrances).
- Animate `opacity` and `transform` only; avoid layout-thrashing properties.
- Respect `prefers-reduced-motion` for anything beyond a fade.
- No decorative looping animation except explicit loading spinners.

---

## 9. Accessibility checklist (WCAG 2.2 AA)

- [ ] All interactive elements reachable by `Tab` in visual order.
- [ ] Visible `focus-visible:ring-[3px] ring-ring/50` on every control.
- [ ] Icon-only buttons have `aria-label`.
- [ ] Form controls have a `<label>` (or `aria-label`) and error association.
- [ ] Colour is never the only carrier of meaning (pair with text/icon).
- [ ] Text contrast ≥ 4.5:1 (≥ 3:1 for large text) in both themes.
- [ ] Dialogs trap focus, close on `Esc`, and restore focus.
- [ ] Tables have `<th scope>`; charts have a text summary.
- [ ] Images have `alt` (decorative → `alt=""`).

WCAG 2.2 additions:

- [ ] **2.4.11 Focus not obscured:** a focused control is never hidden by the
      sticky header, a toast or an overlay; scroll it into view.
- [ ] **2.5.7 Dragging movements:** every drag interaction has a
      single-pointer alternative (buttons or a menu).
- [ ] **2.5.8 Target size:** every pointer target is at least 24x24 px.
- [ ] **3.2.6 Consistent help:** the help entry point sits in the same place on
      every screen.
- [ ] **3.3.7 Redundant entry:** information already supplied is never asked for
      twice in the same flow.
- [ ] **3.3.8 Accessible authentication:** no cognitive test for login; paste and
      password managers work.
- [ ] Status messages are announced through a live region, not colour alone.

---

## 10. Print & documents

Invoices are printed from `#invoice-content`. The `@media print` block in
`app/globals.css` hides everything else and sets A4 portrait with tight margins.
Rules:

- Never print interactive chrome.
- Keep invoice typography in `pt`/`px` consistent with the existing template.
- Test print output in Chrome and via `lib/billing/export-invoice-pdf.ts`.

---

## 11. Do / Don't

| ✅ Do                                             | ❌ Don't                                      |
| ------------------------------------------------ | -------------------------------------------- |
| Use semantic tokens                               | Use `#hex`, `rgb()`, or arbitrary palette colours |
| Reuse `components/ui/*`                           | Copy a primitive into a feature folder        |
| One primary button per view                       | Three filled buttons side by side             |
| Show status with `Badge` variants                 | Colour entire rows red/green                  |
| Use `text-muted-foreground` for secondary text    | Use `opacity-50` to de-emphasise text         |
| Keep tables scannable with aligned numerics       | Center-align long text columns                |
| Test light **and** dark mode                      | Ship a screen only checked in light mode      |

---

## 12. Adding a new screen - checklist

1. Create the route under `app/dashboard/<feature>/page.tsx`.
2. Start with the page header pattern (title, description, primary action).
3. Compose from `components/ui/*`; add feature components under
   `components/<feature>/`.
4. Use `Card` for grouped content and `Table` for lists.
5. Handle the four states: loading (skeleton), empty, error, populated.
6. Verify keyboard navigation, focus rings and both themes.
7. Verify at 360px, 768px and 1440px widths.
8. Run `pnpm build` and `pnpm lint`.
9. Run `python docs/scripts/check-ui-controls.py` and resolve every new finding.

---

## 13. Enforcement

| Rule | Enforced by |
| ---- | ----------- |
| No em dash in copy | `pnpm check:no-ai-dash` |
| No raw hex in TSX | `python docs/scripts/check-ui-controls.py` |
| No native select, date, time or colour input | `python docs/scripts/check-ui-controls.py` |
| Governance links and English docs | `python docs/scripts/verify-project.py` |
| Tokens and primitive reuse | Code review, with this document as the reference |

The UI control script is advisory by default so the existing debt does not block
every build. Run it with `--strict` on a file or directory you are changing; a
new finding in a changed file is a review blocker.
