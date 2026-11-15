# Risk and money

## Who can move money

| Actor | Can | Cannot |
|---|---|---|
| Owner (Meera) | Sign the terms, a presentation, a settlement | Move funds alone; the money sits in the ledger |
| Charterer (Dan) | Sign the terms, a USDC authorization, an answer, a settlement | Pull funds back before the reclaim window except by a signed settlement |
| Relayer (server key, testnet only) | Pay gas for the six public ledger functions | Forge a signature, change an amount, call any other function. It refuses to start off Base Sepolia |
| Anyone | Call `reclaim` after 30 days of silence, which returns held funds to the charterer | Send funds anywhere else |

## Maximum loss

The funded amount of one claim, in test USDC. On this deployment that is under 5 USDC.

## What the contract cannot do

- It cannot judge whether a ruling is correct. It checks the calendar and the document mask.
- It cannot verify a document's content. It records a Merkle root of the document hashes the owner signed.
- It cannot pay the owner more than the charterer funded, and cannot accept more than the claim.

## Rounding

Demurrage cents = rate in cents per day times minutes divided by 1,440, rounded half up to the cent, once, on the total. Half-rate time is counted in half minutes, so there is no per-interval rounding.

## Known limits

- Foundry could not be installed in the build environment, so the contract tests run on Hardhat 3 and there is no Foundry invariant test yet. The conservation property is covered by a fuzz test.
- The public relay cap is an in-memory counter per server instance, so it is a best-effort cap.
- Live SERV rulings are limited by a daily dollar budget and a kill switch (`LAYDAYS_LIVE=0`).
- The relayer key and the e2e keys are testnet keys and are to be disposed after the event.
