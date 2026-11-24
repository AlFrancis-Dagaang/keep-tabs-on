import { genericCategoryIcon, iconByKey, parseCategoryIcon } from "@/lib/category-icons";

/** A category's icon in a rounded tile: 22px in lists, 42px on cards. Decorative; the name sits next to it. */
export function CategoryIcon({ icon, size = 22 }: { icon?: string | null; size?: 22 | 42 }) {
  const Icon = iconByKey[parseCategoryIcon(icon) ?? ""] ?? genericCategoryIcon;
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Icon style={{ width: size / 2, height: size / 2 }} />
    </span>
  );
}
