# X thread draft (0xkinno posts it; tag @openservai)

1/
A shipowner lost a demurrage claim in the English High Court because the bills of lading were not attached by day 90.

I built Laydays for the analyst who has to avoid that. Every hour of a ship's wait ruled, every claim presented before the bar. Live, no login: https://laydays.vercel.app

2/
The hard part is not the arithmetic. It is reading a 41-line handwritten port log against three rulebooks that disagree: the charter party, the industry definitions, the port rules.

SERV describes Multipath as contradicting rulebooks in one reasoning graph. In banking that is compliance. In shipping it is laytime.

3/
Models read and rule. Code keeps the clock and the money. Meera, the analyst, signs with her own wallet.

A contract on Base Sepolia refuses a late claim (TimeBarred) and a claim with a document missing (MissingSupportingDocuments). Both refusals are mined and linked: https://laydays.vercel.app/proof

4/
Measured against eight reported English judgments: Laydays agreed with the court on 4, abstained on 3, and wrongly passed 1. Small sample, wide interval, misses published. Plain model against Multipath is within noise at n=8, and I say so.

5/
The paid route takes a real x402 payment: 0.02 USDC for one ruling, 0.0004 USD of model cost. Contract verified, repo public: https://github.com/0xkinno/laydays

Built for the @openservai SERV Hackathon 02, Open Track. Fictional people and vessels, real cases.
