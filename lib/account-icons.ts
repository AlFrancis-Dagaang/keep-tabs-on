// The only icons an account can have (docs/decisions/2026-11-16-account-icons.md). The column stores a key from here, or null.

/** Bank and e-wallet logos; each file is in public/banks/. An entry is added once its file is accepted. */
export const logos: { key: string; label: string; file: string }[] = [];

/** Tile colours, dark enough for a white letter. */
export const tileColors = {
  clay: "#C96442",
  red: "#C4202B",
  orange: "#C2570C",
  green: "#0F7A47",
  blue: "#1A5FD0",
  purple: "#6A4FC2",
  pink: "#C42D74",
  grey: "#6E6B63",
} as const;

export type TileColor = keyof typeof tileColors;

/** Cash has no logo: it shows a banknote. */
export const cashKey = "cash";

/** The value if it's on a list, else null, so the column never holds an arbitrary string. */
export function parseIcon(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value === cashKey || logos.some((logo) => logo.key === value)) return value;
  return value.startsWith("tile:") && Object.hasOwn(tileColors, value.slice(5)) ? value : null;
}
