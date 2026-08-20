import { describe, it, expect } from "vitest";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";

type Tree = { [key: string]: string | Tree };
const flatten = (node: Tree, prefix = ""): string[] =>
  Object.entries(node).flatMap(([key, value]) =>
    typeof value === "string" ? [`${prefix}${key}`] : flatten(value, `${prefix}${key}.`)
  );

describe("message catalogs", () => {
  it("ar covers exactly the keys en defines", () => {
    expect(flatten(ar as Tree).sort()).toEqual(flatten(en as Tree).sort());
  });
  it("en has no empty strings", () => {
    const empties = flatten(en as Tree).filter(
      (k) => k.split(".").reduce<unknown>((n, part) => (n as Tree)[part], en) === ""
    );
    expect(empties).toEqual([]);
  });
});
