# Proof

## Method

Evidence is written by scripts into `proof/runs/` and read into `docs/FACTS.json` by `scripts/facts.ts`. The UI and README read numbers only from there or from the recorded run. Unit tests are quality assurance and are not shown as evidence.

## Onchain record (done)

`scripts/record-onchain.ts`, run 15 November 2026 against the verified ledger. Full table with gas, signers and transaction links: [`proof/runs/onchain-2026-11-15.json`](proof/runs/onchain-2026-11-15.json) and the Proof page.

- 6 transactions: open, present, fund, answer, settle, and a second claim opened.
- 5 refusals: missing bills of lading (reverted onchain, `MissingSupportingDocuments(4)`), late on day 148 (reverted onchain, `TimeBarred`), wrong signer, tampered digest, replayed signature (refused in simulation).
- Money: claim 4,175,000 units; 3,812,500 accepted and paid at once; 362,500 disputed; settled with 181,250 to the owner and 181,250 back to the charterer. Owner received 3,993,750 in total. The contract ended at zero.

## Counterfactual on the demo voyage (done)

Spreadsheet way, every hour counted: $61,250.00. Ruled by Laydays with the analyst ruling the one open interval herself: $41,750.00. Overclaim avoided: $19,500.00. The spreadsheet also presents with six of seven documents, which the contract refuses.

## Adversarial checks (done, tests of our checks)

Four scripted bad models run through the real checks on `/break`: count everything (5 of 5 intervals with an excepting cause sent to review), invent a clause (22 of 22 refused), obey a planted remark (refused by the strict parser), invent a number (refused by the numbers-in-facts check).

## Court replay (done)

Eight reported English judgments, opened on caselaw.nationalarchives.gov.uk on 15 November 2026. The first five were committed before any run in [`3e93ac5`](proof/court-replay); two more found by search in [`9155e73`](proof/court-replay) and one more in [`75ee22f`](proof/court-replay), each before it was run. Files in [`proof/court-replay/cases`](proof/court-replay/cases), results in `proof/runs/replay-*.json`, summary in `proof/runs/replay.facts.json`.

| Case | Court | Laydays (Kronos plus Multipath) |
|---|---|---|
| Tricon v MTM [2020] EWHC 700 (Comm) | barred | **miss**: passed the document list, did not infer the bills of lading were required |
| Tankreederei v Marubeni (Amalie Essberger) [2019] EWHC 3402 (Comm) | not barred | agreed |
| Kassiopi v Fal Shipping (The Adventure) [2015] EWHC 318 (Comm) | barred | abstained: the clause names no documents |
| Lukoil v Ocean Tankers (Ocean Neptune) [2018] EWHC 163 (Comm) | barred | agreed |
| AET v Arcadia (Eagle Valencia) [2010] EWCA Civ 713 | notice invalid, laytime does not run | abstained |
| Waterfront v Trafigura [2007] EWHC 2482 (Comm) | barred | agreed |
| National Shipping of Saudi Arabia v BP (The Abqaiq) [2011] EWCA Civ 1127 | not barred | abstained: the clause names no documents |
| Trans Trade RK v Sebat [2026] EWHC 950 (Comm) | invalid notice, no waiver: laytime does not start | agreed |

4 of 8 agreed, interval 22% to 78%. Both error directions: documents wrongly passed 1, wrongly flagged 0, abstained 3. Eight cases is a small sample and the interval says so. The seed list had ten cases; five could not be opened and confirmed and were dropped, and three searches of the National Archives site added three (about 30 judgments screened). Other judgments were screened and left out because their holding was about something else or too entangled to encode honestly. No prompt was tuned on any case.

## Ablation (done, same eight cases)

Plain `gpt-6-luna` (three runs per case, majority) 3 of 8; Multipath 2 of 8; Kronos plus Multipath 4 of 8; plus Shadow Agent 4 of 8. A difference of one or two cases out of eight is noise. Median latency 2.6 to 3.0 s on every arm, token cost between $0.001 and $0.004 per arm.

## Rulebook loop (done, generated voyages, answers set by code)

`lib/laytime/generator.ts` builds seeded voyages whose correct answers come from the charter party table before any model sees them. Version 1 on 12 development seeds: 58 of 96 agreed, 38 sent to a person, none wrong. Reppo evaluated four failing rulings, de-identified (scores 71 to 96, all routed `review`). SERV drafted five corrective rules and the owner approved them ([`proof/runs/loop-approval.json`](proof/runs/loop-approval.json)). On 12 new seeds: version 1 62 of 96 (interval 55% to 73%), version 2 65 of 96 (58% to 76%). The gain is within noise. The two kinds the rules targeted stayed at 0 of 12. Fog closures went from 7 to 12 of 12. In 24 of the version 1 abstentions the model's effect was already right and our cause-clause check held it for a person.

## Reppo before and after (done)

`scripts/reppo-compare.ts` and `scripts/reppo-compare-finish.ts`, results in `proof/runs/reppo-compare.json`. For each of the 8 trap kinds the lowest-numbered new seed was taken, and the ruling that version 1 gave and the one version 2 gave for that interval were both evaluated by Reppo, de-identified and unlabelled: 16 evaluations, 7,040 credits. Mean score 97.6 for version 1 and 100 for version 2; version 2 higher on 1 interval, 7 ties, version 1 higher on none. The scores sit at the ceiling, so Reppo cannot separate the versions here. The one interval that moved was a clean wait: version 1 scored 81 and `review`, version 2 scored 100 and `ship`.

## SERV probe (done)

[FINDINGS.md](FINDINGS.md), nine questions, request ids in `proof/runs/serv-probe.json`.

## Revenue, end to end, performance (done)

One x402 payment settled for a paid ruling (`proof/runs/x402-paid-call.json`). Two-wallet browser test passes on the live site, 8 steps (`proof/runs/e2e-flow.json`). Lighthouse desktop 99, 100, 100, 100 (`proof/runs/lighthouse.json`). Responsive, console and accessibility sweep on eight viewports (`proof/runs/responsive-axe.json`).

## Not yet run

- Cost and latency percentiles over many full-voyage runs (one full run is recorded).
- A court set larger than eight.
- The first scheduled time bar watch record (scheduled, read from runtime logs when it has run).
