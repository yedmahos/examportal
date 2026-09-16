# Design Context Document
## Exam Management and Information Portal — UI/UX Specification

> Derived from analysis of two reference dashboard images (an "Enlight" education-platform UI). All colors, sizes, and spacing values are **approximate**, visually estimated from the screenshots, and labeled as such. Educational content, business logic, and feature set from the reference are **not** carried over — only visual/structural language is extracted and re-applied to the Exam Portal's actual features.

---

## A. Design Direction

**Style category:** Clean, professional "SaaS dashboard" aesthetic — soft, low-contrast, data-forward, calm.

Key attributes observed:
- **Airy, low-density layout** — generous whitespace between cards, not cramped despite showing a lot of data.
- **Soft/muted color palette** — near-white lavender-gray background, white surface cards, one confident accent (indigo/purple), pastel status colors.
- **Rounded, friendly geometry** — large border radii on cards, pill-shaped buttons/badges/tabs, circular avatars.
- **Subtle depth, not skeuomorphic** — very light shadows, thin/no borders; separation comes mostly from background contrast (white card on light-gray canvas) rather than heavy borders or drop shadows.
- **Content-first typography** — bold, large numerals for key metrics; smaller muted labels; clear hierarchy without decorative fonts.
- **Icon-led scanning** — every card, nav item, and list row has a small icon acting as a visual anchor.

Overall feeling to preserve: **trustworthy, institutional, uncluttered** — appropriate for an academic/exam context, not a consumer or gamified app.

---

## B. Layout Architecture

Three-column desktop shell:

```
┌───────────┬──────────────────────────────────────────────┬────────────┐
│           │  Header (welcome text · search · icons)       │            │
│  Sidebar  ├──────────────────────────────────────────────┤ Right rail │
│  (fixed)  │  Stat cards row (2–3 cards)                    │ (schedule/ │
│           │  Main analytical panel (chart)                 │  activity  │
│           │  Secondary table/list panel                    │  list)     │
│           │                                                │            │
└───────────┴──────────────────────────────────────────────┴────────────┘
```

- **Grid:** 12-column responsive grid. Sidebar is a fixed-width rail outside the grid; main content area splits roughly **70% main column / 30% right rail** on wide desktop (≥1280px).
- **Content max-width:** page content is comfortably padded, not full-bleed; ~24px outer page padding.
- **Vertical rhythm:** sections stack with consistent large gaps (~24px) between the header, stat-card row, chart panel, and table panel.
- **Density:** medium-low. Cards have generous internal padding (~20–24px). This is intentional for an exam/academic context — data should feel calm and legible, not crammed.

---

## C. Color System (approximate design tokens)

| Token | Approx. Value | Usage |
|---|---|---|
| `--color-primary` | `#6C5DD3` (indigo/purple) | Primary buttons, active nav state, chart primary line, key icons |
| `--color-primary-light` | `#EFEBFC` | Icon chip backgrounds, active nav pill background, chart area fill |
| `--color-secondary` | `#FF6B81` / `#F45B69` (soft coral-pink) | Secondary chart series (comparison line), accent highlights |
| `--color-bg` | `#F5F5FA` (very light lavender-gray) | App canvas / page background |
| `--color-surface` | `#FFFFFF` | Cards, sidebar, header, panels |
| `--color-surface-alt` | `#FAFAFC` | Table header row, subtle nested panels |
| `--color-text-primary` | `#1F2233` (near-black navy) | Headings, primary values |
| `--color-text-secondary` | `#6B7280` (medium gray) | Body text, descriptions |
| `--color-text-muted` | `#9CA3AF` (light gray) | Timestamps, placeholder text, helper captions |
| `--color-border` | `#EEF0F4` | Hairline dividers, input borders |
| `--color-success` | `#22C55E` text on `#DCFCE7` bg | Positive deltas, "Completed" badges |
| `--color-warning` | `#F59E0B` text on `#FEF3C7` bg | "Pending / On-Verification"-type badges |
| `--color-error` | `#EF4444` text on `#FEE2E2` bg | Negative deltas, overdue/error badges |
| `--color-info` | `#3B82F6` text on `#DBEAFE` bg | Neutral informational badges |

**Notes:**
- Status colors always appear as a **soft pill**: light tint background + saturated text, never solid-fill loud badges.
- Only one strong accent hue (primary indigo) is used for interactive/brand elements — everything else is neutral or a pastel status tone. Keep this discipline in the exam portal: don't introduce a second "loud" accent color.

---

## D. Typography System

Approximate sans-serif family (visually similar to **Inter / Poppins / Plus Jakarta Sans** — pick one geometric-humanist sans).

| Token | Size (approx.) | Weight | Usage |
|---|---|---|---|
| `--text-display` | 28–32px | 700 (Bold) | Page welcome/greeting heading |
| `--text-metric` | 26–30px | 700 (Bold) | Big stat-card numbers (e.g. "120/144") |
| `--text-h2` | 16–18px | 600 (Semibold) | Panel/card titles ("Grade Point Average", "Notifications") |
| `--text-body` | 14px | 400–500 | Table cells, list content, nav labels |
| `--text-caption` | 12–13px | 400 | Helper text under card titles, timestamps |
| `--text-label` | 11–12px | 500, uppercase or title-case | Sidebar section group labels |

Hierarchy principle: **one bold hero number per card**, everything else recedes to gray. Section labels in the sidebar are small and quiet so they don't compete with nav items.

---

## E. Spacing System

Approximate 4px-based scale:

| Token | Value | Usage |
|---|---|---|
| `--space-1` | 4px | icon-to-text gaps |
| `--space-2` | 8px | tight internal gaps |
| `--space-3` | 12px | list-item internal padding |
| `--space-4` | 16px | default component padding |
| `--space-5` | 20px | card internal padding |
| `--space-6` | 24px | gap between major sections/cards |
| `--space-8` | 32px | page outer padding, section separation |

**Border radius scale:**

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 8px | inputs, small chips |
| `--radius-md` | 12px | table row hover, nested boxes |
| `--radius-lg` | 16px | cards, panels, notification dropdown |
| `--radius-full` | 999px | buttons, avatars, badges, tabs, search bar |

**Shadow scale (all very soft, low-opacity):**

| Token | Approx. value | Usage |
|---|---|---|
| `--shadow-xs` | `0 1px 2px rgba(16,24,40,0.04)` | sidebar/header hairline separation |
| `--shadow-sm` | `0 2px 8px rgba(16,24,40,0.06)` | stat cards, list rows |
| `--shadow-md` | `0 8px 24px rgba(16,24,40,0.10)` | notification dropdown, modals, popovers |

Borders are largely **absent or 1px near-white** (`--color-border`) — separation is achieved via background-color contrast and shadow, not heavy strokes.

---

## F. Component System

Reusable React components to build (names only — no code yet):

**Layout / Chrome**
- `AppShell` (sidebar + header + content slot composition)
- `Sidebar`
- `SidebarSection` (collapsible group with label + chevron)
- `SidebarNavItem` (icon + label + active state)
- `Topbar` / `Header`
- `SearchBar`
- `IconButton` (used for message/bell/settings icon buttons)
- `Avatar`

**Data display**
- `StatCard` (icon chip, title, "..." menu, big value, delta pill)
- `SectionHeader` (title + subtitle + right-aligned action/dropdown)
- `ChartPanel` (wraps a line/area chart with legend + tooltip)
- `DataTable` (header row, sortable columns, row actions)
- `StatusBadge` (pill: success/warning/error/info variants)
- `ListCard` / `ScheduleItem` (avatar + title + time + expandable detail box)
- `EmptyState`

**Overlay / Feedback**
- `NotificationBell` (icon button + unread dot)
- `NotificationPanel` (dropdown container)
- `NotificationTabs`
- `NotificationItem` (avatar, name, action text, timestamp, optional attachment/detail sub-card)
- `Modal`
- `Dropdown` / `Select`
- `Tabs`
- `Pagination`

**Utility**
- `Divider`
- `Skeleton` (loading placeholders for cards/tables)
- `Tooltip`

---

## G. Sidebar Specification

- **Width:** ~260px expanded; collapses to an icon-only rail (~72px) via the top-left chevron toggle (observed in reference).
- **Structure (top → bottom):**
  1. Brand/logo row (icon + product name + collapse chevron button, right-aligned)
  2. Primary nav item(s) without a group label (e.g. "Dashboard") — rendered as a standalone item, active state = light-purple pill background + primary-colored icon/text
  3. Grouped sections with a small uppercase/title-case label and a chevron to expand/collapse (e.g. "Academic", "Documents", "Financial")
  4. Each group contains 3–5 nav items, each with a small line-icon + label
- **Active item treatment:** rounded pill (`--radius-md`), light-purple background (`--color-primary-light`), primary-colored icon and bold/semibold text. Inactive items are plain gray-800 text on transparent background with a neutral icon.
- **Icon placement:** leading icon, fixed-width column, consistent 8–12px gap to label text.
- **Background:** white, full-height, subtle right-edge shadow/hairline separating it from the canvas.
- **Scrolling:** sidebar content scrolls independently if it exceeds viewport height; logo/header row stays pinned.

**Adapted for Exam Portal — no section grouping needed** (nav is short), flat list is sufficient:
- Student: Dashboard · Exams · Results · Notifications · Profile
- Admin: Dashboard · Students · Exams · Results · Announcements · Profile

---

## H. Header Specification

- **Left:** contextual page heading, e.g. "Welcome Back, {Name}" on dashboard, or a plain page title ("Exams", "Results") on inner pages.
- **Right, in order:** Search bar → icon-button cluster (message/inbox icon, bell/notification icon with unread indicator, avatar).
- **Search bar:** pill-shaped, light-gray fill, leading magnifying-glass icon, muted placeholder text ("Search Here"). Fixed width (~240–280px) on desktop, collapses to icon-only on smaller viewports.
- **Icon buttons:** circular, subtle background on hover, grouped with small gaps; bell icon carries a small colored dot/badge when there are unread notifications.
- **Profile area:** circular avatar image only in the header (name/role shown in a dropdown on click, not inline in the header bar).
- **Height:** ~72–80px, white background, sits flush above the content area with a hairline/shadow separating it from scrollable content below (sticky on scroll).

---

## I. Dashboard Specification (general composition pattern)

Top → bottom, left → right:

1. **Header row** — greeting + search/profile cluster.
2. **Stat card row** — 2–3 equally-sized cards side by side. Each: leading icon chip (colored, rounded-square), overflow "..." menu top-right, title label, large bold current value with a muted "/target" or "/total" suffix where relevant, and a small comparison caption with a colored delta pill (e.g. "+24" green, "-0.25" red).
3. **Main analytical panel** — spans the main column width (not the right rail). Title + subtitle on the left, a filter dropdown (e.g. time-range) on the right, then a line/area chart below with an interactive tooltip and a small legend.
4. **Secondary panel (table or list)** — below the chart, full main-column width. Section header with title + "View All" link, then a data table with column headers, row data, and a status badge column.
5. **Right rail** — a single vertically-scrolling card stack, one persistent "today/upcoming" style list (e.g. schedule), where each list item is itself a small expandable card: avatar + title + time range at a glance, with a secondary detail box (key-value rows) beneath it.

This top-summary → chart → table → side-list composition is the pattern to reuse, with content swapped per role (below).

---

## J. Notification Panel Specification

(Based on the opened-panel reference image.)

- **Trigger:** bell icon in header; panel opens as a floating dropdown anchored to the bell, overlapping the content below it (not pushing layout).
- **Position:** top-right of viewport, right-aligned to the bell icon, slight downward offset (~8–12px gap from header).
- **Dimensions (approx.):** ~360–400px wide, max-height ~480–520px with internal scroll; taller than wide.
- **Elevation:** `--shadow-md`, `--radius-lg`, white surface, sits above a semi-transparent/invisible click-catcher overlay that closes it on outside click.
- **Header row:** "Notifications" title (bold), a secondary text-button ("Mark as Unread"/"Mark all as read"), and a small settings/gear icon button, all on one row.
- **Tabs:** horizontal tab row directly under the header (e.g. "All Updates / Assignment / Resources" in the reference → for the Exam Portal: **"All / Exams / Results / Announcements"**). Active tab has a filled pill or underline treatment.
- **Notification item structure (repeating):**
  - Circular avatar (left) — for system/role-based notices without a person, use a colored icon-avatar instead of a photo.
  - Bold sender/subject name + regular-weight action text on the same line (e.g. "**Registrar** shared **Exam Schedule Update**").
  - Muted timestamp line below ("On Wednesday, 4 July 2025").
  - Optional **attachment/detail sub-card**, indented slightly under the text: small icon, file/item name, meta text (size/type), trailing action icon (download/open).
  - A hairline divider separates each notification item.
- **Unread vs read state:** unread items get a subtle background tint (very light purple) and/or a small dot indicator; read items are plain white background, slightly muted text.
- **Footer:** centered "View More Notifications" text-link with a chevron, at the bottom of the visible list (not sticky — part of scroll content or a fixed footer bar, either is acceptable).
- **Overlay behavior:** clicking outside, pressing Escape, or clicking the bell again closes the panel. Panel animates in with a quick fade + slight downward slide.

---

## K. Student Dashboard Adaptation

Applying the composition pattern from section I to the **Student** role, using only real Exam Portal data (no exam-taking UI):

1. **Header:** "Welcome Back, {Student Name}" + search + notification bell + avatar.
2. **Stat card row (3 cards):**
   - **Upcoming Exams** — count of scheduled exams, icon: calendar.
   - **Next Exam** — countdown/date-forward card (title, date, days-remaining caption), icon: clock.
   - **Recent Results** — latest published result summary (e.g. last exam grade/status), icon: document/award.
3. **Main analytical panel:** **Performance Summary** — a line/area chart of result trend across exams/semesters (analogous to the GPA chart pattern), with a time-range filter dropdown.
4. **Secondary panel (table):** **Recent Results** table — columns: Exam Title · Subject · Date · Status (badge: Published / Pending) · action icon to view detail.
5. **Right rail:** **Academic Activity** feed — a scrollable list combining **Recent Announcements** and **Upcoming Exams** as compact cards (title, date/time, venue, small "view" icon) — mirroring the reference's "Daily Class Schedule" list pattern but populated with exam schedule + announcement items.
6. **Notifications panel:** tabs = All / Exams / Results / Announcements, using the structure from section J (no attachments needed unless an announcement includes a document, in which case reuse the attachment sub-card pattern).

---

## L. Admin Dashboard Adaptation

1. **Header:** "Welcome Back, {Admin Name}" + search + notification bell + avatar.
2. **Stat card row (3–4 cards, wrap to 2 rows of 3 if 6 metrics on smaller widths):**
   - **Total Students** — icon: users.
   - **Total Exams** — icon: document/list.
   - **Upcoming Exams** — icon: calendar.
   - **Completed Exams** — icon: check-circle.
   - **Results Published** — icon: award/chart.
   (Each with the same value + delta-caption pattern as the reference, e.g. "+12 this term".)
3. **Main analytical panel:** a trend chart appropriate to admin oversight — e.g. exams scheduled vs. completed over time, or results-published trend — same visual chart pattern (dual-line/area with legend + filter dropdown).
4. **Secondary panel (table):** **Recent Activity** — a log table: Action · Performed By · Related Entity (Exam/Student/Result) · Timestamp · Status badge.
5. **Right rail:** compact upcoming-exams schedule list (title, department/program, date/time, venue) using the same expandable list-card pattern as the reference's schedule panel.
6. **Notifications panel:** tabs = All / Exams / Results / Announcements / System, same structural pattern as student, but sender avatars may represent admin/staff roles or system events (use icon-avatars for system-generated notices).

---

## M. Responsive Behavior

**Desktop (≥1280px):** Full 3-column layout as described in section B — sidebar expanded, main column + right rail both visible.

**Tablet (768–1279px):**
- Sidebar collapses to icon-only rail by default (toggleable), reclaiming width.
- Right rail either narrows or moves **below** the main column (stacked), rather than side-by-side, once main+rail can't comfortably fit ≥ ~600px each.
- Stat card row wraps from 3-across to 2-across, third card wraps to a new row.
- Table panels become horizontally scrollable within their card rather than compressing columns.

**Mobile (<768px):**
- Sidebar becomes an off-canvas drawer, triggered by a hamburger icon in the header; overlay + slide-in animation.
- Header search bar collapses to a search icon button that expands/opens a full-width search overlay on tap.
- Stat cards stack fully vertically (1-across).
- Chart panel: simplify chart interactions to tap-to-reveal tooltip; legend moves below the chart.
- Right-rail list content moves to the bottom of the page, below the table, as its own stacked section (not a sidebar).
- Notification panel becomes a full-screen (or near-full-screen) sheet instead of a small anchored dropdown, sliding up from the bottom or covering the viewport, with the same header/tabs/list structure.

---

## N. UX Principles

1. **Calm data density** — favor whitespace and one hero metric per card over cramming multiple numbers into one component.
2. **Consistent iconography as a scanning aid** — every nav item, card, and list row leads with a small icon; keep icon set and stroke-width consistent app-wide (recommend a single icon library, e.g. Lucide/Heroicons).
3. **Status communicated by color + text together** — never rely on color alone for badges (accessibility); always pair the pill color with a text label ("Published", "Pending", "Cancelled").
4. **Progressive disclosure in lists** — summary line first (title + time/date), supporting details in a nested, slightly-indented sub-block — as seen in the schedule and notification items.
5. **Non-blocking overlays** — notifications, dropdowns, and quick actions should be dropdown/panel-based rather than full-page navigations, keeping the user's dashboard context intact.
6. **Predictable, role-based navigation** — Student and Admin get distinct but structurally similar shells (same shell components, different nav items and dashboard content), so the codebase can share the `AppShell`, `Sidebar`, `StatCard`, etc. across roles.
7. **Informational, not transactional, exam data** — since exams are scheduled/informational entities only, dashboard and list UIs should emphasize **when/where/what** (date, time, venue, subject) rather than action-oriented CTAs like "Start" or "Attempt" — reserve primary-colored buttons for genuinely available actions (e.g. "View Details", "Download Result", "View Schedule").
8. **Accessible contrast and target size** — despite the soft palette, ensure text-on-tint combinations (badges, deltas) meet at least WCAG AA contrast; keep tap targets ≥40px on mobile nav and icon buttons.

---

## O. Recommended React Component Hierarchy

```
<App>
 ├─ <AuthProvider>
 └─ <AppShell>
     ├─ <Sidebar>
     │   ├─ <SidebarBrand />
     │   └─ <SidebarNavItem /> × N   (flat list per role: Student / Admin nav)
     │
     ├─ <Topbar>
     │   ├─ <PageHeading />           (dynamic per route)
     │   ├─ <SearchBar />
     │   ├─ <IconButton icon="message" />
     │   ├─ <NotificationBell>
     │   │    └─ <NotificationPanel>          (conditionally rendered dropdown/sheet)
     │   │         ├─ <NotificationTabs />
     │   │         └─ <NotificationItem /> × N
     │   └─ <Avatar />  → <ProfileDropdown />
     │
     └─ <PageContent>                          (route-driven)
         │
         ├─ <StudentDashboardPage>
         │   ├─ <StatCard /> × 3   (Upcoming Exams, Next Exam, Recent Results)
         │   ├─ <ChartPanel title="Performance Summary">
         │   ├─ <SectionHeader title="Recent Results" action="View All" />
         │   │   └─ <DataTable>
         │   │        └─ <StatusBadge />
         │   └─ <RightRail>
         │        └─ <ListCard title="Academic Activity">
         │             └─ <ScheduleItem /> × N   (announcements + upcoming exams)
         │
         ├─ <AdminDashboardPage>
         │   ├─ <StatCard /> × 5–6  (Total Students, Total Exams, Upcoming, Completed, Results Published)
         │   ├─ <ChartPanel title="Exams / Results Trend">
         │   ├─ <SectionHeader title="Recent Activity" />
         │   │   └─ <DataTable>
         │   │        └─ <StatusBadge />
         │   └─ <RightRail>
         │        └─ <ListCard title="Upcoming Exams Schedule">
         │             └─ <ScheduleItem /> × N
         │
         ├─ <ExamsPage>           (list/detail of exam entities — title, subject, dept, program, semester, year, date, time, venue, duration, instructions, status)
         ├─ <ResultsPage>
         ├─ <AnnouncementsPage>   (admin only)
         ├─ <StudentsPage>        (admin only)
         ├─ <NotificationsPage>   (full-page version of the panel content)
         └─ <ProfilePage>
```

**Shared/global components** (used across both roles and multiple pages): `StatCard`, `SectionHeader`, `DataTable`, `StatusBadge`, `Avatar`, `EmptyState`, `Modal`, `Dropdown`, `Tabs`, `Pagination`, `ChartPanel`.

---

### Summary of What Was Deliberately Excluded

Per the product constraint, this spec contains **no**: available-exams-to-attempt UI, question banks/MCQ interfaces, exam-attempt or answer-submission flows, attempt timers/auto-submit, or anti-cheating features. All "Exams" UI in this spec is **informational/scheduling only** (title, subject, department, program, semester, academic year, date, start/end time, venue, duration, instructions, status).
