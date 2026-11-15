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

## Not yet run

- **Court replay.** Cases to be written and committed before any run, then split 10 for development and the rest held out. Seed list: Tricon v MTM [2020] EWHC 700 (Comm), Tankreederei v Marubeni [2019] EWHC 3402 (Comm), The Adventure [2015] EWHC 318 (Comm), Lukoil v Ocean Tankers [2018] EWHC 163 (Comm), The Eagle Valencia [2010] EWCA Civ 713, The Happy Day [2002] EWCA Civ 1068, The Johanna Oldendorff [1974] AC 479, The Kyzikos [1989] AC 1264, The Agamemnon [1998] 1 Lloyd's Rep 675. Each citation must be verified before it is used.
- **Ablation** of plain `gpt-6-luna`, Multipath, Kronos plus Multipath, and Shadow Agent added.
- **Both error directions**, **cost and latency over many runs**, **generated trap voyages with answers set by code**, **Wilson 95% intervals** on every accuracy figure.
- **SERV probe** (FINDINGS.md).
- **One settled x402 payment**, **one unattended time bar run**.

All of these need SERV credit or time and are listed in TASK.md.
