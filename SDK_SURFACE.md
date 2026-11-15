# SDK surface and decisions

| Item | Version or value |
|---|---|
| Next.js | 16.4, App Router, Turbopack |
| React | 19 |
| Tailwind CSS | 4 |
| motion | 14 |
| viem | 2.57 |
| wagmi | 3.7 |
| zod | 4 |
| hardhat (Solidity tests) | 3.22 |
| OpenZeppelin Contracts | 5.6.1 |
| @x402/next, @x402/evm, @x402/core | 2.31.0 |
| solc | 0.8.28 |

## Models per role (decided from what ran)

| Role | Model | Why |
|---|---|---|
| Port Clerk | `gpt-6-luna` | Volume, cheap, strict schema, Prompt Guard |
| Clause Reader | `gpt-6-luna-serv-kronos-multipath` | Three rulebooks as branches, Kronos audit |
| Senior Reader | `gpt-6.1-sol-serv-multipath` | One stronger re-read of ambiguous intervals |
| Time-bar Clerk | `gpt-6-luna-serv-kronos` | One clause to a document list |
| Counter Reader, Statement Writer | `gpt-6-luna` | Untrusted reply, short note |

## Decisions

- Chat completions carry the Clause Reader. `/v1/responses` is wrapped by `servResponses()` but its behaviour with the Multipath suffix is a pending probe question (FINDINGS.md, question 9), so it is not relied on.
- `max_completion_tokens` is always sent, never `max_tokens`.
- Rulebook text and per-voyage clauses are separated: stable text in the system message, clauses as numbered data in the user message.
- The Solidity tests run on Hardhat 3 because Foundry's binary could not be downloaded in the build environment.
- State is onchain and in the URL. No database, no blob store.
