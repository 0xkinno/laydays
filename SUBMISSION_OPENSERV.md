# Submission, mirroring the live form

Form: https://openserv.typeform.com/submissions02 (fields read on 15 November 2026). Fields marked OWNER are personal and are filled in by 0xkinno.

| Field | Answer |
|---|---|
| What's your full name? | OWNER |
| What's your email address? | OWNER |
| Are you new to building with OpenServ? | OWNER |
| Which track are you submitting to? | **Open Track** |
| New project, or an existing project with new work? | New project, built during the event (2 to 15 November 2026) |
| What is your project called? | **Laydays** |
| Tell us about the project | See below |
| Project URL (demo, website or repository) | https://laydays.vercel.app and https://github.com/0xkinno/laydays |
| X post URL (with the demo video) | https://x.com/0xkiddok/status/2122010353496101129 |
| One additional project URL | https://laydays.vercel.app/judge (sixty-second walk) |
| Logo or icon | `docs/art/laydays-logo.png` |
| Is data collection enabled? | No. Laydays stores nothing a visitor types. The server keeps run logs on Vercel only |
| Team, experience, country, company, role, profile URL, SERV experience, quote permission, updates | OWNER |

## The project description

Laydays is a demurrage desk for the analyst who bills a charterer for a ship's waiting time. A tanker that waits at a port beyond its agreed laytime earns the owner money for every hour, but which hours count depends on a 41-line handwritten log read against three rulebooks that contradict each other on purpose: the charter party, the industry's laytime definitions, and the port's own rules. Then the claim must reach the charterer with every document the charter party lists inside a 90-day time bar, or it is worth nothing. English courts have thrown out real claims for one missing document.

**How it uses SERV Reasoning.** The Clause Reader rules every interval on three branches, one per rulebook, in a single SERV Multipath graph (`gpt-6-luna-serv-kronos-multipath`), with a Shadow Agent verification hint and strict structured output. A Senior Reader (`gpt-6.1-sol-serv-multipath`) re-reads intervals left ambiguous. Prompt Guard stands in front of the two untrusted texts, the log and the charterer's reply. The SHA-256 of the exact system prompt is the rulebook version and appears on every ruling, because Multipath compiles one graph per source prompt. Code keeps the clock and the money, decides precedence between the rulebooks, and rejects any clause or log line that does not exist. A person signs.

**What happens next.** The analyst presents the claim with her own wallet signature. A contract on Base Sepolia refuses a late claim and a claim with a required document missing, funds move only on the parties' own signatures, and the accepted part pays the same day the charterer answers.

**What is real.** The contract is deployed and verified, and six transactions and five refusals are recorded with Basescan links. The court replay of eight reported English judgments agreed on 4 of 8 and the misses are published on the Proof page. One x402 payment settled for a paid ruling route. All people, vessels and companies in the demo are fictional.

**Track.** Open Track. Built during the event.
