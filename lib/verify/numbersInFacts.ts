/** Every number in model prose must appear in the facts JSON. Returns the numbers that do not. */
export function numbersNotInFacts(prose: string, facts: unknown): string[] {
  const norm = (s: string) => s.replace(/[,$\s]/g, "");
  const haystack = new Set<string>();
  const walk = (v: unknown) => {
    if (v === null || v === undefined) return;
    if (typeof v === "number" || typeof v === "bigint") haystack.add(norm(String(v)));
    else if (typeof v === "string") for (const m of v.match(/\d[\d,]*(\.\d+)?/g) ?? []) haystack.add(norm(m));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (typeof v === "object") Object.values(v as object).forEach(walk);
  };
  walk(facts);
  const bad: string[] = [];
  for (const m of prose.match(/\d[\d,]*(\.\d+)?/g) ?? []) {
    const n = norm(m);
    if (!haystack.has(n) && !haystack.has(n.replace(/\.0+$/, ""))) bad.push(m);
  }
  return bad;
}
