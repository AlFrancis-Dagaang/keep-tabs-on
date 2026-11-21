import { describe, expect, it } from "vitest";
import { cardColor, parseIcon, tileColors } from "./account-icons";

describe("parseIcon", () => {
  it("keeps a tile, cash and null", () => {
    expect(parseIcon("tile:red")).toBe("tile:red");
    expect(parseIcon("cash")).toBe("cash");
    expect(parseIcon(null)).toBeNull();
    expect(parseIcon("")).toBeNull();
  });

  it("drops anything not on a list", () => {
    for (const bad of ["tile:magenta", "tile:", "tile", "../etc/passwd", "<script>", "bpi.svg", "toString", "tile:toString"]) expect(parseIcon(bad)).toBeNull();
  });

  it("has a colour behind every tile", () => {
    for (const hex of Object.values(tileColors)) expect(hex).toMatch(/^#[0-9A-F]{6}$/);
  });
});

describe("cardColor", () => {
  it("is the tile's colour", () => {
    for (const [name, hex] of Object.entries(tileColors)) expect(cardColor(`tile:${name}`)).toBe(hex);
  });

  it("is grey for cash, no icon, a logo key or a bad value", () => {
    for (const icon of ["cash", null, undefined, "", "bpi", "tile:magenta", "tile:toString"]) expect(cardColor(icon)).toBe(tileColors.grey);
  });
});
