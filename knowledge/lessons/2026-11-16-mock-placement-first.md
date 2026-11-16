# Show a mock of the placement before building a new UI element
Date: 2026-11-16   Task: T-17

## What happened
T-17 step 4 added a "⋯" menu to the mobile cards. The plan said what the menu holds but not where it sits, so I put it at the right end of the bottom action row, next to Pay. The owner said "the three dots is not good placement". I asked only then, and the owner picked the top-right corner. That meant reworking RowMenu into two parts (RowActions and RowMenu) plus table CSS.

## Root cause
The plan named the contents of the menu and not its position. I took the nearest slot in the existing layout as the default and built it, without checking placement with the owner.

## Rule
When a task adds or moves a visible element (a menu, button, badge or icon) and the plan doesn't name its position, show a small ASCII or HTML mock of 2–3 placements and get the owner's pick before writing the code.

## Applies when
Adding or moving buttons, menus, badges or icons on cards, rows, page headers or dialogs. Especially mobile card layouts (components/ui/table.tsx and the list pages) where the plan lists behaviour but not position.
