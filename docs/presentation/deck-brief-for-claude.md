# Deck brief: Lyceum travel fellowship pitch

Build an 8-slide, 16:9 PowerPoint for a 5-minute spoken pitch to a competition organizer deciding a travel fellowship. The presenter is Hafiz Azman. The product is Lyceum, a lecturer's course workspace. Every fact below is verified; do not add, round, or invent any fact, number, logo, quote or customer. Where a value is in [brackets], leave the bracket for the presenter to fill.

## Design direction

- Look: confident, academic, modern. Think a well-designed university research poster, not a startup template.
- Palette: deep navy `#14213D` for dark backgrounds and headings, warm off-white `#FBFBF8` for light backgrounds, one green accent `#1F6F3F`, one amber accent `#8A5A00` for warnings or "not built" items. Body text `#4A5568` on light, `#BFD8D5` on dark.
- Type: a serif display face for titles (Libre Baskerville or similar), a clean sans for everything else (Public Sans, Inter or similar). Four sizes only: title, statement, body, caption. Nothing under 20 pt.
- One message per slide, titles as full sentences, at most four lines of text per slide, big numbers where there are numbers, screenshots large with a thin border, generous margins.
- Slides 1 and 8 on dark navy; the rest on off-white. Slide 4 is mostly a screenshot.
- Speaker notes go in the PowerPoint notes field exactly as written under each slide.
- No em dashes or en dashes anywhere in the text; use commas, periods or colons.
- Footer on each content slide, small and quiet: the five-V tag given for that slide (Value, Visualize, Validate, Verify, Venture) and the source where one is named.

## Attached images

- `architecture.png`: the system diagram for slide 6. Show it large, keep its aspect ratio.
- `shot-evidence-table.png`: the real Evidence table from the app, for slide 4.
- `shot-inbox-brief.png`: the brief as it arrives on a colleague's Home page, for slide 3 or 8 if space allows.
- `shot-meeting-brief.png`: the meeting brief panel, optional for slide 5.

## Slide 1 (dark). Title

Title: Lyceum
Subtitle: Research the lecturer runs: from employer demand to a course decision, with receipts.
Small line: Hafiz Azman, [university], 9 October 2026. Travel fellowship pitch.

Notes: Good morning. Lyceum is a course workspace for lecturers. In five minutes I will show you a real research run, from a real employer's job board to a brief a lecturer can take to a meeting, and I will tell you exactly what is built and what is not.

## Slide 2 (light). Value

Title: A course change has to be defended with evidence nobody keeps
Visual: three boxes in a row with arrows, "Employer demand", "Course coverage", "The meeting".
Line under it: Today that evidence lives in browser tabs, inboxes and memory.
Three big numbers: 5.98 million (graduates in Malaysia, 2024), 3.2% (unemployed), 32.2% (underemployed, in jobs below their qualification; use the amber accent).
Footer: Value. Source: DOSM graduates statistics 2024. MOHE reviews courses for relevance.

Notes: A lecturer who wants to refresh a course has three jobs: find out what employers actually ask for, work out what the course already covers, and defend the change to colleagues and the quality committee. Today that evidence lives in browser tabs, inboxes and memory, and the decision is hard to explain later. In Malaysia, DOSM counted 5.98 million graduates in 2024 with unemployment at 3.2 percent but underemployment at 32.2 percent, and MOHE reviews courses for relevance. The lecturer sits between those two facts with no tool built for them.

## Slide 3 (light). What Lyceum does

Title: Five steps a lecturer controls
Five numbered cards in a row:
1. Search. Fetch postings from a permitted employer board, only when you ask.
2. Read. Confirm each requirement as an exact quotation. A paraphrase is rejected.
3. See the trend. Counts out of reviewed postings with a 95% interval. Never a score.
4. Decide. Map a skill to an outcome. Keep, refresh or revise.
5. Brief. A document with every receipt, as Markdown or editable slides, to download or send to a colleague.
Statement under the cards: Nothing runs by itself. Nothing changes the course without the lecturer.
Footer: Visualize. Success is a lecturer finishing this in minutes and defending every number.

Notes: Lyceum is not a set of agents that run by themselves. It is what a careful lecturer would do anyway, faster and with receipts. Five steps. Search: fetch postings from a permitted employer board when you ask. Read: name the skills you care about, and confirm each quotation in the posting's exact words; a paraphrase is rejected. See the trend: counts with the denominator in view and a confidence interval, never a score. Decide: map a skill to a course outcome and choose keep, refresh or revise. Brief: a document with every receipt, to download or to send to a colleague inside Lyceum. Nothing runs by itself and nothing changes the course without the lecturer.

## Slide 4 (light). Live demo

Title: Live: one employer's public job board, right now
Left, short: Fetch, keep, confirm, review, map, brief. Ninety seconds.
Left, four short lines: Publication dates and links to the real postings. Every requirement is an exact quotation. Counts out of reviewed postings, with an interval. A brief with every receipt.
Right: `shot-evidence-table.png`, large.
Footer: If the network fails: a saved sample of real postings from the same board, retrieved 9 October 2026, labelled as such.

Notes: Switch to the app now and run the 90-second path. Say: this is a real employer's public job board, fetched now, with published dates, a link to each posting and the retrieval time kept separately. He keeps the ones worth reading; they do not count yet. The scan proposes the sentence that names each skill; he confirms exact quotations, and a paraphrase would be rejected. Now the denominator is his: reviewed postings only, counts not scores, with an interval. The course decision, with the course evidence cited. A brief for the meeting with every receipt, sent to the programme owner. The decision stays with people.

## Slide 5 (light). Validate

Title: What is real in the build you just saw
Four cards in a 2 by 2 grid:
- 152 automated checks, four headless browser runs and the self-driving demo pass on the current code.
- 727 and 313 postings fetched live this week from the Stripe board on Greenhouse and the Palantir site on Lever.
- No AI key required. The core is deterministic: quotations verified against the source, duplicate fingerprints, intervals, coverage stages, the brief.
- Editable slide packs: a teaching pack for any session and the brief as slides, generated from the receipts with no AI text.
- Not built yet (amber): page collectors for sites without an API, shared accounts, Teams and Slack surfaces, model-drafted slide content. Earlier synthetic screens are labelled illustrative.
Footer: Validate. Verified 9 October 2026 on the shipped build.

Notes: What you saw is the shipped build. 152 automated checks, four headless browser runs and the self-driving demo pass on the current code. The live collectors were verified this week against the Stripe board on Greenhouse, 727 postings, and the Palantir site on Lever, 313 postings. No AI key is needed for any of it. Any saved session downloads as an editable slide pack and the brief downloads as slides, generated from the receipts with no AI text. What is not built: page collectors for employer sites that have no API, shared accounts, the Teams and Slack surfaces, and model-drafted slide content. The earlier screens that use synthetic market figures are labelled as illustrative and were not in the demo.

## Slide 6 (light). Verify

Title: A small architecture with a clear next step
Visual: `architecture.png`, as large as the slide allows.
Footer: Verify. Solid boxes are built and verified; dashed boxes are planned.

Notes: The architecture is deliberately small. A browser workspace with a local store and validated JSON backups. A thin local API that only reaches two documented public job-board hosts, with a cache, rate limits and size limits. The core is deterministic: citation validator, duplicate fingerprints, Wilson intervals, coverage stages, the brief. The next step is a shared API and identity, and that is also the door into Teams, Slack and the LMS, so a university does not have to adopt another platform.

## Slide 7 (light). Venture

Title: The market is the lecturer's desk, not another platform
Left, a small table:
| Layer | Figure | Source |
| World institutions | over 22,000 accredited | UNESCO |
| World tertiary teachers | over 14 million | UNESCO IESALC |
| Malaysia lecturers | about 45,000 | MOHE, 2023 |
| Malaysia institutions | 20 public, about 355 private | MOHE, MIDA |
| Pilot target | 3 to 5 institutions, 50 to 200 lecturers | our target, not a forecast |
Right, three lines: Incumbents sell to institutions from above: Lightcast Skillabi, Chmura JobsEQ, curriculum suites. Lyceum sits at the lecturer's desk, with receipts and a brief, and will be reachable from Teams, Slack and the LMS. Pilot first, licence later: task completion, citation fidelity, time to a brief, repeat use.
Footer: Venture. Labelled estimates from public sources checked 9 October 2026, never forecasts.

Notes: The numbers are labelled estimates. Malaysia has roughly 45,000 lecturers across about 400 institutions; the world has over 22,000 accredited institutions. Lightcast and Chmura sell alignment to institutions from above, with global datasets and scores. Lyceum sits at the lecturer's desk and inside the tools they already use. The plan is a pilot with three to five lecturers measuring task completion, citation fidelity, time to a brief and repeat use, before any licence.

## Slide 8 (dark). The ask

Title: Fund the trip. We bring back a pilot.
Statement: Travel support to present Lyceum at [event] and recruit pilot lecturers. Results come back as measured task completion, citation fidelity and time to a brief.
Two lines: You have seen a working prototype with honest labels. The lecturer keeps authority; Lyceum supplies the receipts.
Small line: Hafiz Azman, [email], [repository].

Notes: I am asking for the travel fellowship to present Lyceum at the event, to recruit pilot lecturers there, and to bring back measured results. You have seen a working, honest prototype. The lecturer keeps authority; Lyceum supplies the receipts. Thank you.

## Sources, if the deck needs a final slide or footnotes

DOSM graduates statistics 2024; MOHE higher education statistics (2023 staff figures); MIDA education services (February 2026 institution counts); UNESCO global roadmap for higher education; UNESCO IESALC SDG brief on higher education staff; Lightcast Skillabi press release June 2025; Chmura JobsEQ; AWS Machine Learning Blog, "Beyond pilots", 24 October 2025, for the five-V structure.
