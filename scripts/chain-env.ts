import { readFileSync } from "node:fs";
export function loadEnv() {
  for (const l of readFileSync(".env.local", "utf8").split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(l.trim());
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}
