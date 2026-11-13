"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";

// The pay dialog and the bar sit in different places; this event tells the bar its bill cycle, debt or goal just completed.
const completedEvent = "progress-completed";

export function announceCompleted(id: string) {
  window.dispatchEvent(new CustomEvent(completedEvent, { detail: id }));
}

/** True for about a second after announceCompleted(id), so the bar can flash. */
export function useCompletedFlash(id: string) {
  const [flashing, setFlashing] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onCompleted = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) return;
      setFlashing(true);
      timer = setTimeout(() => setFlashing(false), 1000);
    };
    window.addEventListener(completedEvent, onCompleted);
    return () => {
      window.removeEventListener(completedEvent, onCompleted);
      clearTimeout(timer);
    };
  }, [id]);
  return flashing;
}

/** docs/design.md's signature bar: 12 square blocks that drop in, turn clay when complete, and flash on completion. Over budget, they're clay stripes. */
export function PixelBar({ blocks, label, flash = false, over = false }: { blocks: number; label: string; flash?: boolean; over?: boolean }) {
  const complete = blocks === 12;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={12}
      aria-valuenow={blocks}
      className={cn("flex gap-[3px]", flash && "motion-safe:animate-flash")}
    >
      {Array.from({ length: 12 }, (_, i) => (
        <span
          key={i}
          className={cn("size-[11px]", i >= blocks ? "bg-border" : over ? "bg-[repeating-linear-gradient(45deg,var(--clay)_0_2px,transparent_2px_4px)] motion-safe:animate-drop" : complete ? "bg-primary motion-safe:animate-drop" : "bg-foreground motion-safe:animate-drop")}
          style={i < blocks ? { animationDelay: `${i * 40}ms` } : undefined}
        />
      ))}
    </div>
  );
}
