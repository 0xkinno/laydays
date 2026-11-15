# Design

An editorial magazine about one ship's wait, on warm ash paper, with a single signal-lemon accent and a line-drawn tanker. Calm, precise, expensive. Glass cards, a deep harbour band for contrast, motion that explains change.

## Tokens

| Token | Hex | Role |
|---|---|---|
| Paper | `#F2F1EA` | Page background |
| Paper Deep | `#E7E5DA` | Cards, wells |
| Ink | `#14160F` | Text and hairlines |
| Ink Soft | `#5B5E54` | Secondary text |
| Signal | `#D7F34A` | The one accent per view: primary actions, counted hours, observed chips |
| Harbour | `#0F3A34` | Deep teal for drawings, the dark chapter and footer |
| Flare | `#FF5A2C` | Only the last ten days of a time bar and onchain refusals |

Surfaces: `.glass` (frosted paper, 18px blur), `.edge` (a one pixel gradient border in Signal and Harbour), `.glass-dark` on Harbour, a paper grain at 4% and soft aurora washes.

## Type

Fraunces (opsz up to 144, SOFT 50) for headlines and big numerals, Geist for text, Geist Mono for hashes, clause ids, timestamps and money. Tracked small caps at 0.14em for section tags. Headline letter-spacing -0.02em.

## Motion

Used where it explains something, switched off under `prefers-reduced-motion`:

- Hero headline rises word by word, with the two key words shimmering.
- The tide strip draws itself interval by interval, counted hours filling with Signal, and the demurrage total counts up.
- The ship bobs, the dial turns slowly, and both drift with scroll.
- Four real rulings float beside the headline on large screens.
- The rulebook graph draws itself: three columns, curves converging on the Multipath node, which pulses, then the clock, then a signature line.
- Document ticks pop in, the refusal stamp lands, the verdict chip flips between states, and the process line fills as the page scrolls.
- Smooth scroll and a thin progress line.

## Ornament

Hairline rules, section numerals in Fraunces italic, a 90-tick dial whose last seven ticks are Flare, hatched fills for excepted hours.

## Navbar

A floating square capsule (14px radius, frosted paper, 56px tall, max 1120px). Wallet connect in Signal. Connected state shows the short address and role with a separate square power button.

## Art

`scripts/gen-art.mjs` writes `public/art/hero-tanker.svg`, `mark.svg`, `dial.svg`, `rulebooks.svg`, `receipt.svg`: hairline strokes, no raster, `vector-effect="non-scaling-stroke"`, hero under 20 KB.
