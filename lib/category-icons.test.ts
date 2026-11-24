import { describe, expect, it } from "vitest";
import { categoryIcons, iconByKey, parseCategoryIcon } from "./category-icons";

describe("parseCategoryIcon", () => {
  it("keeps every key on the list and null", () => {
    for (const { key } of categoryIcons) expect(parseCategoryIcon(key)).toBe(key);
    expect(parseCategoryIcon(null)).toBeNull();
    expect(parseCategoryIcon("")).toBeNull();
  });

  it("drops anything not on the list", () => {
    for (const bad of ["tag", "Food", "tile:red", "../etc/passwd", "<script>", "toString", "__proto__"]) expect(parseCategoryIcon(bad)).toBeNull();
  });
});

describe("iconByKey", () => {
  it("has an icon for every key and none for the generic fallback", () => {
    for (const { key } of categoryIcons) expect(iconByKey[key]).toBeDefined();
    expect(iconByKey[""]).toBeUndefined();
  });
});
