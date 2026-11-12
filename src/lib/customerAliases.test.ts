import { describe, expect, it } from "vitest";
import { aliasLabel, assignAliases } from "@/lib/customerAliases";

describe("assignAliases", () => {
  it("continues numbering after the highest existing number", () => {
    expect(assignAliases({ a: 1, b: 4 }, ["B", "c"])).toEqual({ a: 1, b: 4, c: 5 });
  });

  it("returns the same object when nothing is new", () => {
    const aliases = { "dela cruz, juan": 1 };
    expect(assignAliases(aliases, [" DELA CRUZ, JUAN "])).toBe(aliases);
  });
});

describe("aliasLabel", () => {
  it("never falls back to the real name", () => {
    expect(aliasLabel({ "dela cruz, juan": 7 }, "Dela Cruz, Juan")).toBe("Customer 7");
    expect(aliasLabel({}, "SANTOS, MARIA")).toBe("Customer");
  });
});
