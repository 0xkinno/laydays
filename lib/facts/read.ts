import facts from "@/docs/FACTS.json";

const F = facts as Record<string, unknown>;

/** The only way UI and docs read a headline number. Returns null when the number has not been measured. */
export function fact<T = string | number>(key: string): T | null {
  return key in F ? (F[key] as T) : null;
}
export const factOr = (key: string, fallback: string) => {
  const v = fact(key);
  return v === null ? fallback : String(v);
};
