import { describe, expect, it } from "vitest";
import { parseIcon, tileColors } from "./account-icons";

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
