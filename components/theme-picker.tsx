"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "cn";

const tile = "flex size-16 flex-col items-center justify-center gap-1 rounded-xl bg-accent text-sm";

/** Two square tiles, Light and Dark. CSS lights the current one (the dark: variant), so server and client render the same markup. */
export function ThemePicker() {
  const { setTheme } = useTheme();
  return (
    <div className="flex gap-2">
      <button type="button" onClick={() => setTheme("light")} className={cn(tile, "ring-2 ring-primary dark:ring-0")}>
        <Sun className="size-5" />
        Light
      </button>
      <button type="button" onClick={() => setTheme("dark")} className={cn(tile, "dark:ring-2 dark:ring-primary")}>
        <Moon className="size-5" />
        Dark
      </button>
    </div>
  );
}
