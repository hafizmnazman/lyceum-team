# Colour scheme audit: WCAG 2.2 and best practice

Date: 22 October 2026. The poster `colour-scheme-2026-10-22.png` came from a teammate; this audit checks every pairing it implies against WCAG 2.2 (1.4.3 text contrast, 1.4.11 non-text contrast, 1.4.1 use of colour, 2.4.11 and 2.4.13 focus appearance, 2.5.8 target size, 1.4.10 reflow, 2.3.3 motion) and against the usual design practice for a professional product. Ratios were computed with the WCAG relative-luminance formula on 22 October. The verdict: the palette stands; nine rules and one added token make it compliant in use. The tokens in `docs/lyceum-upgrade-plan.md` Section 6 carry the result.

## 1. What passes as the poster gives it

| Pair | Ratio | Verdict |
|:--|:--|:--|
| Forest `#0F2A20` text on mint `#E9EFE7`, on white | 13.1, 15.3 | AAA |
| Forest text on lime `#B8F23A` (the lime button) and lime text on forest | 11.5 | AAA |
| Lime labels on the inner box `#173A2C` | 9.4 | AAA |
| White text on forest; on-forest body `#B9CDBF` on forest and on `#173A2C` | 15.3, 9.1, 7.5 | AAA |
| Body `#4E6258` on white, mint, `#EEF6EF`, `#DDEFE1`, `#CDE8D3` | 6.5, 5.6, 5.9, 5.5, 5.0 | AA on every light surface |
| Small muted `#2F4A3D` on the same five | 9.7 to 7.4 | AAA |
| White text on emerald `#1C7C54` (the primary button) | 5.2 | AA |
| Emerald text on white | 5.2 | AA |
| Warn `#8A5A00` on `#FCF0E0`, white, mint; white on warn | 5.3, 5.9, 5.1, 5.9 | AA (these two semantics are additions outside the poster, needed because it has no amber or red) |
| Danger `#A33A2A` on `#FBE9E6`, white, mint; white on danger | 5.6, 6.6, 5.6, 6.6 | AA |
| Emerald bars on white and on the `#DDEFE1` meter track | 5.2, 4.3 | pass the 3:1 non-text rule |
| Prism rays `#4FA36F` and `#8BC34A` on forest and on `#173A2C` | 5.0, 7.3, 4.1, 6.0 | pass as data on dark cards |
| Emerald focus ring on white, mint, `#DDEFE1`, `#CDE8D3` | 5.2, 4.4, 4.3, 4.0 | pass the 3:1 focus rule |
| Lime focus ring on forest and on `#173A2C` | 11.5, 9.4 | pass |

## 2. What fails, and the rule that fixes it

| Finding | Ratio | Rule |
|:--|:--|:--|
| Lime on white or on mint | 1.33, 1.14 | Lime never carries text, a bar, a line or a chip on a light surface. The loop line, the active step and the highlights are lime on forest only; on mint and white they are forest (13.1) or emerald (4.4). |
| Emerald text on mint, on `#DDEFE1`, on `#CDE8D3` | 4.4, 4.3, 4.0 | Emerald `#1C7C54` stays the fill, bar and button colour. Text and links in green on light surfaces use the added token `--emerald-text #176B4A` (6.5 on white, 5.6 on mint, 5.4 on `#DDEFE1`, 5.0 on `#CDE8D3`: AA everywhere, AAA on white). |
| Emerald on forest | 2.96 | Below the 3:1 non-text rule. On dark cards, data and rings use `#4FA36F`, `#8BC34A` and lime, never emerald; the focus ring on forest surfaces is lime. |
| The dark-card border `#2E5A46` on forest | 1.9 | Decorative only. An input on a dark card is bounded by `#B9CDBF` (9.1) and focused in lime. |
| The light card border `#D3E0D6` on white | 1.4 | Decorative only. Inputs and controls are bounded by `--control-border #4E6258` (6.5 on white, 5.5 on `#DDEFE1`). |
| The "coming next" dashed border `#8FB59E` on white and on mint | 2.3, 1.9 | Decorative only. A planned item always carries the word "Planned" in a tag; the dash never stands alone. |
| Large-text allowance misread as 18 px | | The 3:1 allowance applies at 24 px regular or 19 px bold and above, never at 18 px regular. |
| Uppercase mono labels at 11 px | | Minimum 12 px for JetBrains Mono labels, with 0.12 em tracking and `#4E6258` or `#2F4A3D`; eyebrow labels in green use `--emerald-text`. |
| Status by colour (rising and falling, done and next, pass and fail) | | Never colour alone: every state carries a word and an icon. The palette is one green hue by luminance, which helps deuteranopia, but the red danger against green still needs the icon and the word. |

## 3. Best practice beyond the ratios

- One accent per screen: lime marks the one thing to look at, never two.
- Links inside body text are underlined, not coloured alone.
- Hover, active and pressed states are state layers on the same surface, not new colours; disabled controls sit at 38% opacity with the disabled attribute.
- Focus is a 2 px solid ring offset 2 px with a gap in the surface colour, emerald on light surfaces and lime on forest, on every interactive element (2.4.11, 2.4.13).
- Targets are 44 px on touch and never under 24 px (2.5.8); 8 px between adjacent targets.
- Reflow to 320 px with no horizontal scroll (1.4.10); text spacing overrides must not clip (1.4.12); 200% zoom keeps every control reachable.
- Motion respects `prefers-reduced-motion`; nothing moves in the workspace without a real request or a saved record.
- Charts: one series, the count on each bar, the interval printed beside the percentage, gridlines `#DCE7DF` at low contrast, a table alternative in a disclosure, emerald on light cards and the rays on dark cards.
- The dot grid is decorative and is masked away under dense tables so it never competes with data.
- Working screens are white and mint with forest text; forest cards, lime and big numbers belong to the landing page, the header, the tools strip and the deck.

## 4. The one token added

`--emerald-text #176B4A`, used for green text and links on light surfaces. Everything else on the poster is kept as given, and the rules above govern where each colour may appear. The contrast check script (`scripts/contrast-check.mjs`, package A1) asserts every ratio in this audit on every build.
