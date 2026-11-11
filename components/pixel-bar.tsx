import { cn } from "cn";

/** docs/design.md's signature bar: 12 square blocks that drop in, turn clay when complete, and flash on completion. */
export function PixelBar({ blocks, label, flash = false }: { blocks: number; label: string; flash?: boolean }) {
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
          className={cn("size-[11px]", i >= blocks ? "bg-border" : complete ? "bg-primary motion-safe:animate-drop" : "bg-foreground motion-safe:animate-drop")}
          style={i < blocks ? { animationDelay: `${i * 40}ms` } : undefined}
        />
      ))}
    </div>
  );
}
