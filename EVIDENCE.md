# Evidence index

| Item | Where |
|---|---|
| Ledger contract, source verified | https://sepolia.basescan.org/address/0x73a25bd619a7ebdaa1d5773866a13e127358a1a4#code |
| Deploy transaction | https://sepolia.basescan.org/tx/0xcbf404ae8c4ad412edfdd0850f82471271e5c08220771e93fd509cd536095ab3 |
| Deployment record | `contracts/deployments/base-sepolia.json` |
| Onchain proof run | `proof/runs/onchain-2026-11-15.json` |
| Recorded SERV run of the demo voyage, with request ids | `data/demo/recorded-run.json` |
| Statement digest signed onchain | `0x929d5de381a7b77cddec10d47e9134dfbb3fc6e231f9f6e3cb85a8bcd6efe10a` |
| Documents root signed onchain | `0x06bb7e80e3ce0e6838e7994d12b11b217e12f0370d7226a74b006f8514ff45d9` |
| Rulebook version (SHA-256 of the Clause Reader system prompt) | `a3319b726b19b416e30b8c5eb0e828ac2bed29df1067685db40c67399a18ac22` |
| Pre-registered findings questions | commit `adf10bd`, `FINDINGS.md` |

## SERV request ids, recorded run of 15 November 2026

| Step | Model | Request id |
|---|---|---|
| Port Clerk | `gpt-6-luna` | `5bbdbd1d-4ebb-4ae8-8e39-3af539d8fcc6` |
| Clause Reader, batch 1 | `gpt-6-luna-serv-kronos-multipath` | `10ce55eb-73b8-454c-86f2-c0b84c6fa605` |
| Clause Reader, batch 2 | same | `3c7365f2-9fad-4116-83b5-0a912e89bade` |
| Clause Reader, batch 3 | same | `fae14bfe-e368-47f1-b343-4dab213b278a` |
| Clause Reader, batch 4 | same | `e31e3694-fa00-43ec-bf5b-9b20f1672eb4` |
| Senior Reader | `gpt-6.1-sol-serv-multipath` | `c62abdf8-f303-43e9-ab6c-e1feac86e736` |

## More evidence

| Item | Where |
|---|---|
| Settled x402 payment | https://sepolia.basescan.org/tx/0xc3c29c24a23b59384659f1017891710c386b03fa1c67fd1c6e4636a2895a26a0 |
| Court replay cases, committed before any run | commit `3e93ac5196057bb709bbed40c4ca9e275dde49be`, `proof/court-replay/cases/` |
| Replay and ablation results | `proof/runs/replay-a.json` to `replay-d.json`, `replay.facts.json` |
| Rulebook loop | `proof/runs/loop-v1-dev.json`, `loop-reppo.json`, `loop-draft.json`, `loop-approval.json`, `loop-compare.json` |
| Reppo evaluations | `proof/runs/reppo-eval.json`, `proof/runs/loop-reppo.json` |
| SERV probe | `proof/runs/serv-probe.json` |
| Browser test | `proof/runs/e2e-flow.json` |
| Lighthouse | `proof/runs/lighthouse.json` |
| Responsive and accessibility sweep | `proof/runs/responsive-axe.json` |
| Tour recording (base of the demo video) | `docs/video/tour.webm` |
