"use client";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { voyageIdOf } from "./chain/eip712";

/** A fresh claim has its own onchain id and a demo clock: completion of discharge is set 83 days before the claim is opened,
 *  so the walkthrough stays on day 83 whenever a judge opens it. The statement itself keeps the real log dates. */
export function useClaimKey(slug: string, realCompletionTs: number) {
  const qs = useSearchParams();
  const c = qs.get("c");
  const t = qs.get("t");
  return useMemo(() => {
    const fresh = !!c && !!t && /^\d+$/.test(c) && /^\d+$/.test(t);
    const key = fresh ? `${slug}-${c}` : slug;
    return { fresh, key, voyageId: voyageIdOf(key), completionTs: fresh ? Number(t) : realCompletionTs, query: fresh ? `c=${c}&t=${t}` : "" };
  }, [slug, c, t, realCompletionTs]);
}

export function newClaimQuery() {
  const now = Math.floor(Date.now() / 1000);
  return `c=${now}&t=${now - 83 * 86400}`;
}
