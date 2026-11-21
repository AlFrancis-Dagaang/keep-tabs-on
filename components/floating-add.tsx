"use client";

import { usePathname } from "next/navigation";
import { Suspense, type ComponentProps } from "react";
import { EntryForm } from "@/app/(app)/activity/entry-form";

// The same Suspense dance as MobileNav: usePathname suspends on routes with unknown params, and the button simply waits.
export function FloatingAdd(props: ComponentProps<typeof EntryForm>) {
  return (
    <Suspense>
      <OffActivity {...props} />
    </Suspense>
  );
}

// Activity has its own Add entry button in its header.
function OffActivity(props: ComponentProps<typeof EntryForm>) {
  const pathname = usePathname();
  if (pathname === "/activity" || pathname?.startsWith("/activity/")) return null;
  return <EntryForm {...props} floating />;
}
