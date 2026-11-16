# Design

## Feel
Calm, warm and readable, like the Claude app. Notion-style layout: left sidebar navigation, page title with a short serif description, clean data tables. One playful element: the pixel progress bars.

## Layout
- Sidebar: Overview, Accounts, Activity, Recurring bills, Installments, Goals, Debts, Budget, Settings, light/dark toggle.
- Mobile (below 768px): the sidebar becomes a top bar with a hamburger that opens a drawer (page links with icons, theme toggle, Sign out); it closes on navigate. No bottom tab bar.
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
- Filters and badges: pills.

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
- Accounts show a generic lucide icon (wallet, landmark, smartphone, banknote) before the name in lists. No brand logos and no stored icon; the mapping is picked when built.
- Month picker: a button with the selected month ("November 2026") opens a year header with arrows, a 4×3 month grid, "This month", "Month to date" and "All dates". Months before the earliest entry or after the current one are dimmed; the current month is underlined. Single days and ranges sit under "Custom range".

## Overview page
Light on purpose. Two stat cards (net worth with "Across N accounts", budget left with "₱X spent of ₱Y"), then two compact lists: Upcoming bills and Recent activity, each with a "View all" link. Accounts, goals, debts, income and expenses live on their own pages.

## Copy
- Plain, sentence case, active verbs: "Record payment", "Add money", "Create goal".
- Empty states tell the user what to do next.
- Errors say what to fix.
