"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      className={cn("justify-start text-muted-foreground max-md:h-11", className)}
      aria-label="Sign out"
      onClick={async () => {
        await authClient.signOut();
        router.replace("/auth/sign-in");
        router.refresh(); // drops cached signed-in pages
      }}
    >
      <LogOut />
      Sign out
    </Button>
  );
}
