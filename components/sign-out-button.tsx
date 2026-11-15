"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      className="justify-start text-muted-foreground max-md:h-11"
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
