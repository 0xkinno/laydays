# FINDINGS: what we measured about SERV, including what went against us

This file was written in two steps. The questions below were committed first (see the commit that introduces this file), then `scripts/probe-serv.ts` ran them and the answers were filled in underneath. One disclosure up front: before this file existed we made development calls to SERV to learn the API shape (a plain call and a Multipath call on a one-line prompt). Those are not used as findings.

## Pre-registered questions

1. What are the latency and cost of the first Multipath call for a system prompt, against repeat calls with the identical system prompt?
2. Does a one-character change in the system prompt cause a new compile (a latency jump)?
3. Accuracy on the court replay: clauses in the system prompt against clauses in the user message, Multipath on against off, Kronos on against off. (Answered in `PROOF.md`, not here.)
4. Shadow Agent: how long may the verification hint be before the API refuses it? Is the number of iterations used reported?
5. Prompt Guard: what is the refusal shape (finish reason, tokens billed, message) on an injected log remark, and how many of 20 clean log chunks does it refuse?
6. Structured outputs: which JSON Schema keywords does the API refuse (`minimum`, `maximum`, `pattern`, `format`, `minItems`)?
7. Is a system message required?
8. Content filter: does the default filter refuse any clean log chunk, and is `serv_disable_content_filter` accepted?
9. Does `/v1/responses` accept a Multipath model suffix, and does it return a reasoning summary?

## Answers

_Filled in by `scripts/probe-serv.ts`. Raw results with every request id are in `proof/runs/serv-probe.json`._

(pending the probe run)
