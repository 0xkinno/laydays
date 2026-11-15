# Sponsor intel

Quotes below were found in the live pages on 15 November 2026.

## What SERV says about itself

- https://docs.openserv.ai/what-is-serv: "SERV is a reasoning engine that transforms unbounded model inference into structured, bounded, auditable reasoning."
- Same page, on Multipath: complex, contradicting rulebooks coexist in one reasoning graph, and "In banking, this is called compliance."
- Same page, on regulated settings: every reasoning step is traceable, with audit-grade decision trails.
- Hackathon page: "Real data, real decisions, auditable steps." Judging: creativity, user readiness, revenue potential.

## What Laydays takes from it

| SERV idea | Laydays use |
|---|---|
| Contradicting rulebooks in one graph | Charter party, laytime definitions and port rules as three branches of one Multipath graph. The line "In shipping, it is called laytime" mirrors the sponsor's own sentence |
| Auditable steps | Every ruling carries clause ids, log line ids, the rulebook version (SHA-256 of the system prompt) and the SERV request id, and has a trace page |
| Schema-forced output | Strict JSON Schema, validated again with `zod`, unknown keys refused |
| Prompt Guard | In front of the log and the charterer's reply, the two untrusted inputs |
| Shadow Agent with a hint | A checkable hint on the Clause Reader and the Statement Writer |
| Kronos | Audits the compiled reasoning prompt |
| Models seen in `GET /v1/models` on 15 Nov 2026 | `gpt-6-luna` (0.13 / 0.65 cents per million tokens), `gpt-6.1-sol`, `gpt-6-sol`, and the `-serv-multipath`, `-serv-kronos` suffixes |

## What we do not use

The Dolphin and Kite stacks are not used. Their primitives would be decoration in a laytime desk, so the Dolphin and Kite tracks are not entered. The Reppo evaluation loop is not built in this release, so the Reppo track is not entered either.
