import { describe, expect, it } from "vitest";
import { buildTimeline, parseSof } from "@/lib/laytime/intervals";
import { DEMO } from "@/lib/serv/rulebooks.generated";

const mk = (line: string, at: string, kind: string, cause = "none") => ({ line_id: line, at, kind, cause }) as never;

describe("timeline", () => {
  it("an early ops_completed does not leave a gap in the clock", () => {
    const lines = parseSof(DEMO.sof);
    const ev = [
      mk("L05", "2026-08-17T10:30-05:00", "nor_tendered"), mk("L04", "2026-08-17T09:40-05:00", "free_pratique"),
      mk("L14", "2026-08-18T08:30-05:00", "ops_commenced"), mk("L30", "2026-08-21T18:00-05:00", "ops_completed"),
      mk("L31", "2026-08-22T06:00-05:00", "inspection"), mk("L35", "2026-08-22T14:10-05:00", "ops_completed"),
    ];
    const tl = buildTimeline(ev, lines, 360);
    const last = tl.intervals[tl.intervals.length - 1];
    expect(last.to).toBe(tl.completedAt);
    for (let i = 1; i < tl.intervals.length; i++) expect(tl.intervals[i].from).toBe(tl.intervals[i - 1].to);
    expect(tl.norValid).toBe(true);
  });
  it("flags a notice tendered before free pratique", () => {
    const lines = parseSof(DEMO.sof);
    const tl = buildTimeline([mk("L04", "2026-08-17T11:00-05:00", "free_pratique"), mk("L05", "2026-08-17T10:30-05:00", "nor_tendered"), mk("L35", "2026-08-22T14:10-05:00", "ops_completed")], lines, 360);
    expect(tl.norValid).toBe(false);
  });
});
