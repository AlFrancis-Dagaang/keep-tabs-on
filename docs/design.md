# Design

## Feel
Calm, warm and readable, like the Claude app. Notion-style layout: left sidebar navigation, page title with a short serif description, clean data tables. One playful element: the pixel progress bars.

## Layout
- Sidebar: Overview, Accounts, Activity, Recurring bills, Installments, Goals, Debts, Budget, Set aside, Settings, light/dark toggle.
- Set aside page: one flat table (Kind, Item, Set aside, Out of, Status), biggest first, items with nothing set aside left out; the Total row sums Set aside only. Status is a clay pill ("Ready to pay"; "Full" for goals and for debts owed to you) once Set aside reaches Out of, else "₱X to go". Cards below md. Done goals are left out.
- Mobile (below 768px): the sidebar becomes a bottom tab bar: Overview, Accounts, Activity, Bills and More, icon over label, the current page's tab lit (Bills on `/bills/[id]` too). More opens a bottom sheet with Installments, Goals, Debts, Budget, Set aside and Settings; it closes when a page is chosen. There is no top bar. Sign out and the theme toggle sit on the Settings page below 768px.
- Mobile tables: each row is a card (title, labelled fields, amount top right, actions); Overview mini-tables are compact lists. From 768px up they are tables.
- Between 768px and their width, wide tables scroll sideways inside their panel; the page never scrolls sideways.
- Edit and pay forms open in a centered modal.

## Colors
Token | Light | Dark
---|---|---
Background | #FAF9F5 | #1F1F1E
Surface | #FFFFFF | #262624
Raised | #F0EEE6 | #30302E
Border | #E3E1D8 | #3A3A37
Text | #1F1E1C | #ECEAE3
Muted text | #6E6B63 | #A3A19A
Accent (clay) | #C96442, white text | #C96442, white text

Clay is used only for primary buttons, "Done / Ready / Under budget" badges, completed progress bars, and over-budget / overdue warnings.
Theme follows the system light/dark setting, with a manual toggle.

## Type
- Source Serif 4 (weight 500): page titles, section headings, big numbers, page descriptions.
- Instrument Sans (400–600): tables, buttons, labels, forms.
- Tabular numbers everywhere for money.

## Shapes
- Panels and stat cards: 1px border, 12px radius, no heavy shadows.
- Buttons: 8px radius. Primary = clay fill. Secondary = raised gray, like a neutral "Open" button.
- Filters and badges: pills. Status pills: Due soon, Upcoming, Today, Paid.

## Progress bars (signature element)
- 12 square pixel blocks, 11px each, 3px gaps, no rounding.
- Filled blocks: black in light mode, off-white in dark mode. Empty blocks: border color.
- Blocks drop in one by one when shown.
- Completed bars turn clay. Over-budget bars use clay diagonal stripes.
- When a bill cycle, debt or goal completes, the bar flashes briefly, like clearing a line.
- Respect reduced-motion settings.
- Loading: the same 12 blocks, centered, with a clay run moving across them (`LoadingBar`), instead of "Loading…" text.
- App icon: 5 blocks in a row, 3 white and 2 darker orange, on clay.
- Sign-in: a centered card with the icon, the serif name, the tagline and a clay Google button. Sign out sits at the bottom of the sidebar.

## Dates, icons and wording
- Dates are shown in words, "Jan 2, 2027" (`formatDate`); form date inputs stay native. Rows dated today carry a small "Today" tag. Activity and account history show the logged time as a muted second line.
- Icons are lucide, 16px, before the text (never instead of it), decorative. Sidebar pages and Add, Edit, Remove and Record payment buttons have one.
- Removing something says "Remove", never "Delete".
- Accounts show an icon before the name in lists: a bank logo from a fixed list (BPI, GCash, Maya, UnionBank, GSave, MariBank, files in `public/banks/`), or a colour tile (fixed palette, the first letter of the name), or a generic lucide icon (wallet, landmark, smartphone, banknote) when none is picked. One nullable `icon` text on accounts; no uploads.
- Month picker: a button with the selected month ("November 2026") opens a year header with arrows, a 4×3 month grid, "This month" and "All dates". Months before the earliest entry or after the current one are dimmed; the current month is underlined. Activity opens on today (the button reads "Today") and its picker also has a "Today" row; "All dates" there is `?all=1`. Other pages open on all dates. Old `from`/`to` links still filter.

## Overview page
Reference mock: the owner's image (T-19). Four stat cards: Net worth ("Across N accounts"), Income this month and Expenses this month (each with an arrow and % against last month, hidden when last month has no data), Bills due in 7 days (₱ total). Only Expenses has a pixel bar: this month's spending as a share of income (full and clay when over, hidden when income is 0). The cards are equal height. Below: Accounts (icon, name, balance), Upcoming bills (date, amount, "Due soon" within 3 days or "Upcoming" pill), Goals (open ones only: name, pixel bar, %), Debts (name, amount, pixel bar) and Recent activity (date with "Today" tag, description, amount), each with a "View all" link. Budget left no longer shows here; it lives on Budget.
- Desktop: four cards in a row, then a grid whose panels stretch to fill their row, so no column ends short: Accounts, Upcoming bills, Goals; then Debts and the wider Recent activity.
- Mobile: cards and lists stack in the same order; lists are compact, no labels.

## Copy
- Plain, sentence case, active verbs: "Record payment", "Add entry", "Create goal".
- Empty states tell the user what to do next.
- Errors say what to fix.
