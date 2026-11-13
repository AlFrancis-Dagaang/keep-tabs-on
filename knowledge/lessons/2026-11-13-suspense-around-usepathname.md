# Wrap usePathname() in a layout in Suspense under cacheComponents
Date: 2026-11-13   Task: T-05

## What happened
T-05 added /debts/[id], the first route with an unknown param. `pnpm build` then failed in the sidebar,
which called usePathname() in the shared layout. Apply stopped to ask the owner, and the links moved into a
component wrapped in <Suspense> with the same links, unlit, as the fallback (components/app-sidebar.tsx).

## Root cause
With cacheComponents on, usePathname() on a route with unknown params is request data, so it suspends.
Outside a Suspense boundary that fails the prerender. Static routes never hit it, so the sidebar worked
until the first dynamic route, and the plan didn't foresee it.

## Rule
Any client component in a layout that reads usePathname(), useSearchParams() or useParams() sits inside
<Suspense> with a fallback that renders the same UI without the request data.

## Applies when
Adding the first dynamic segment ([id]) under a layout, or adding a navigation-aware client component
(active links, breadcrumbs, tabs) to a layout, while cacheComponents is on in next.config.ts.
