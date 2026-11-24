import { Banknote, Briefcase, Bus, Gamepad2, GraduationCap, Gift, HeartPulse, House, PiggyBank, PawPrint, Plane, Shirt, ShoppingBag, Tag, Utensils, Wallet, Zap, type LucideIcon } from "lucide-react";

// The only icons a category can have (knowledge/decisions/2026-11-24-category-icons.md). The column stores a key from here, or null.
export const categoryIcons: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "food", label: "Food", icon: Utensils },
  { key: "transport", label: "Transport", icon: Bus },
  { key: "home", label: "Home", icon: House },
  { key: "bills", label: "Bills", icon: Zap },
  { key: "shopping", label: "Shopping", icon: ShoppingBag },
  { key: "health", label: "Health", icon: HeartPulse },
  { key: "education", label: "Education", icon: GraduationCap },
  { key: "fun", label: "Fun", icon: Gamepad2 },
  { key: "travel", label: "Travel", icon: Plane },
  { key: "gifts", label: "Gifts", icon: Gift },
  { key: "clothes", label: "Clothes", icon: Shirt },
  { key: "pets", label: "Pets", icon: PawPrint },
  { key: "wallet", label: "Wallet", icon: Wallet },
  { key: "work", label: "Work", icon: Briefcase },
  { key: "cash", label: "Cash", icon: Banknote },
  { key: "savings", label: "Savings", icon: PiggyBank },
];

/** Shown when a category has no icon. */
export const genericCategoryIcon: LucideIcon = Tag;

/** The value if it's on the list, else null, so the column never holds an arbitrary string. */
export function parseCategoryIcon(value: string | null | undefined): string | null {
  return categoryIcons.find((item) => item.key === value)?.key ?? null;
}

/** The lucide component by stored key; look up with `iconByKey[key ?? ""] ?? genericCategoryIcon`. */
export const iconByKey: Record<string, LucideIcon> = Object.fromEntries(categoryIcons.map((item) => [item.key, item.icon]));
