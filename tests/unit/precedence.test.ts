import { describe, expect, it } from "vitest";
import { resolve, type Branch } from "@/lib/laytime/precedence";

const b = (rulebook: Branch["rulebook"], finding: Branch["finding"], clause_id = "x"): Branch => ({ rulebook, finding, clause_id });

describe("precedence", () => {
  it("charter party overrides the definitions", () => {
    const r = resolve([b("charter_party", "excepted"), b("laytime_definitions", "counts"), b("port_rules", "silent")]);
    expect(r).toMatchObject({ effect: "excepted", decidedBy: "charter_party", conflict: true });
  });
  it("port rules decide when the charter party is silent", () => {
    const r = resolve([b("charter_party", "silent"), b("laytime_definitions", "counts"), b("port_rules", "excepted")]);
    expect(r).toMatchObject({ effect: "excepted", decidedBy: "port_rules" });
  });
  it("a real conflict between charter party and port rules goes to a person", () => {
    const r = resolve([b("charter_party", "counts"), b("laytime_definitions", "counts"), b("port_rules", "excepted")]);
    expect(r).toMatchObject({ effect: "ambiguous", decidedBy: null, conflict: true });
  });
  it("definitions fill the gap when both others are silent", () => {
    expect(resolve([b("charter_party", "silent"), b("laytime_definitions", "half"), b("port_rules", "silent")]).effect).toBe("half");
  });
  it("all silent is ambiguous", () => {
    expect(resolve([b("charter_party", "silent"), b("laytime_definitions", "silent"), b("port_rules", "silent")]).effect).toBe("ambiguous");
  });
});
