import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { houseStyleViolations } from "../lib/verify/houseStyle";

// House style: no emoji, no em or en dash, no hype words in anything a person reads.
const roots = ["app", "components", "README.md", ...readdirSync(".").filter((f) => /^[A-Z_]+\.md$/.test(f) && f !== "README.md")];
const files: string[] = [];
const walk = (p: string) => {
  const s = statSync(p);
  if (s.isDirectory()) for (const f of readdirSync(p)) walk(path.join(p, f));
  else if (/\.(tsx?|md|css)$/.test(p)) files.push(p);
};
roots.forEach(walk);
let bad = 0;
for (const f of files) {
  readFileSync(f, "utf8").split("\n").forEach((line, i) => {
    const v = houseStyleViolations(line);
    if (v.length) { bad++; console.log(`${f}:${i + 1}: ${v.join(", ")}  | ${line.trim().slice(0, 90)}`); }
  });
}
console.log(bad ? `${bad} violations` : "copy check passed");
process.exit(bad ? 1 : 0);
