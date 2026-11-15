const BANNED = ["revolutionary", "seamless", "seamlessly", "cutting-edge", "world-class", "paradigm", "game-changing", "game changing", "unleash", "supercharge"];
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}\u{FE0F}]/u;

export function houseStyleViolations(text: string): string[] {
  const out: string[] = [];
  if (/[—–]/.test(text)) out.push("dash");
  if (EMOJI.test(text)) out.push("emoji");
  const lower = text.toLowerCase();
  for (const w of BANNED) if (lower.includes(w)) out.push(`banned word: ${w}`);
  return out;
}

/** Applied to model text before a person reads it. */
export function applyHouseStyle(text: string): string {
  let t = text.replace(/\s*[—–]\s*/g, ", ").replace(EMOJI, "");
  for (const w of BANNED) t = t.replace(new RegExp(w, "gi"), "");
  return t.replace(/\s{2,}/g, " ").trim();
}
