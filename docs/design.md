# Design

## Feel
Calm, warm and readable, like the Claude app. Notion-style layout: left sidebar navigation, page title with a short serif description, clean data tables. One playful element: the pixel progress bars.

## Layout
- Sidebar: Overview, Accounts, Activity, Recurring bills, Installments, Goals, Debts, Budget, Settings, light/dark toggle.
- Mobile: the sidebar becomes a horizontal scrolling top bar.
- Wide tables scroll sideways inside their panel; the page never scrolls sideways.
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

## Overview page
Four stat cards (net worth, income this month, expenses this month, bills due in 7 days), then mini tables for accounts, upcoming bills, goals, debts and recent activity.

## Copy
- Plain, sentence case, active verbs: "Record payment", "Add money", "Create goal".
- Empty states tell the user what to do next.
- Errors say what to fix.
