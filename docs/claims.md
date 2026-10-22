# Lyceum: claims register

Every figure shown on a Lyceum surface (the landing page, the deck, the brief, the poster, the film and the README) appears here once: the words it is shown in, its source and link, the research note or record that checked it, and the date. A figure that is not here does not ship. `src/prove-journey.ts` fails if a landing figure is missing from this file or a quoted clause is missing from its note; the deck, brief, poster and film generators fail on any number that is not a row here (the last section says which check covers which surface). The wording was checked row by row against the notes on 22 October 2026 (`docs/review/astra-claims-audit-2026-10-22.md`); each change it led to is in `docs/decisions.md`.

Keys, as in the research notes: **P** a primary document fetched and quoted; **S** a reputable secondary source; **V** vendor material, said so beside the figure; **M** measured by this project, with the record that holds the measurement.

## The landing page: the problem at three levels

One comparison per level (plan Section 2.4). The landing page calls them desk research until the lecturer interviews (R1) add a quotation per level.

| Claim | Figure | Shown as | Source | Checked in | Key | Checked on |
|:--|:--|:--|:--|:--|:--|:--|
| `world-skills-and-approval` | 39%; 12 to 18 months | 39% of workers' existing skills, employers expect, will be transformed or become outdated between 2025 and 2030, while approving a new degree programme takes 12 to 18 months at the US universities cited | World Economic Forum, Future of Jobs Report 2025 (<https://www3.weforum.org/docs/WEF_Future_of_Jobs_Report_2025.pdf>); Wayne State University, programme approval (<https://provost.wayne.edu/programs/approval-process>); Texas Tech University, new programme timelines (<https://www.depts.ttu.edu/provost/curriculum/new-programs/timelines.php>) | [curriculum-latency-global-2026-10-22.md](research/curriculum-latency-global-2026-10-22.md), Sections 1 and 2 | P | 22 October 2026 |
| `asia-talent-shortage` | 77% of 10,095; 45% in 2014 | 77% of 10,095 Asia Pacific employers could not find the skills they needed in 2025, up from 45% in 2014 (a vendor survey) | ManpowerGroup, Talent Shortage 2025 (<https://www.manpowerthailand.com/apac-talent-shortage>) | [pain-and-market-2026-10-11.md](research/pain-and-market-2026-10-11.md), Section 1.2 | V | 11 October 2026 |
| `malaysia-underemployment` | 32.2%; 1.60 million; 3.2% | 32.2% of employed Malaysian graduates, 1.60 million people, worked below their qualification in 2024, while 3.2% of graduates in the labour force were unemployed | DOSM, Graduates Statistics 2024 (<https://www.dosm.gov.my/uploads/release-content/file_20260401145140.pdf>) | [pain-and-market-2026-10-11.md](research/pain-and-market-2026-10-11.md), Section 1.1 | P | 11 October 2026 |

The 39% is the average that the employers in the Forum's survey expect for 2025 to 2030 ("workers can expect that two-fifths (39%) of their existing skill sets will be transformed or become outdated"): a forecast, not a measurement. The 12 to 18 months is Wayne State's internal review of a new degree programme, with further approvals possibly needed, and Texas Tech gives up to 18 months for full approval; the note found no global measure of approval time, and the two figures describe different populations, so no surface draws them as one chart.

"Of employed graduates" follows from the release: 1.60 million is 32.2% of the 4.97 million employed graduates (5.14 million in the labour force less 165,900 unemployed), so the rate is skill-related underemployment among the employed, not among all graduates. The 3.2% is over a different base, the graduates in the labour force, and the surfaces say so.

## The landing page: what is proven today

| Claim | Figure | Shown as | Record | Key | Checked on |
|:--|:--|:--|:--|:--|:--|
| `proof-checks` | 185 | 185 automated checks passed on 22 October 2026, plus four headless browser runs | `npm run prove:all` (seventeen suites, listed with their counts in `src/data/suites.ts` and on the Evaluation page) and the four smokes, the verification table of 22 October in [as-built.md](as-built.md), section 5 | M | 22 October 2026 |
| `proof-live-board` | 727 | 727 real postings fetched live from one employer's public board on request, 9 October 2026 | The Stripe board on Greenhouse through the local API: [the 9 October as-built report](history/lyceum-v3-as-built-2026-10-09.md) and the execution record in [lyceum-improvement-plan.md](lyceum-improvement-plan.md), Section 30 | M | 9 October 2026 |
| `proof-no-keys` | 0 | 0 AI keys needed; the core is deterministic, and file parsing and live collection use the local API | Every proof and smoke runs with no key set; the agents default to fixture mode (`src/agents/mode.ts`) | M | 22 October 2026 |
| `tour-length` | about 7 minutes | Watch the tour, about 7 minutes | `tourMinutes()` in `src/demo/script.ts`, computed from the tour's own pacing: 393 seconds at full speed after A6 set the term at the Course step and on the results file (382 after the A4 rewrite); a live fetch can add a little | M | 22 October 2026 |
| `proof-no-paraphrase` | 0 | 0 paraphrases accepted as evidence; a quotation must match its source text or it is rejected | `src/prove-evidence.ts`, `src/prove-research.ts` and the curriculum smoke's rejected misquote | M | 22 October 2026 |

## The deck, the brief and the poster

Package A6. The deck carries five figures in all (plan Section 14): the receipt's denominator, the two latency figures (`world-skills-and-approval` above), the readiness level and the check total (`proof-checks` above). `scripts/gen-deck.mjs` fails if a figure on a slide or in the notes is not in its row here, and reads the exported PDF back to check it again; the brief and the poster use the same rows.

| Claim | Figure | Shown as | Source | Checked in | Key | Checked on |
|:--|:--|:--|:--|:--|:--|:--|
| `deck-receipt` | 1 of 9 | 1 of 9 reviewed postings, beside one exact sentence from Stripe's Data Analyst, Intern posting (published 2026-10-01, retrieved 2026-10-09) | The tour's end state, `mcp/sample-workspace.json`: the saved sample of Stripe's public Greenhouse board, 10 postings kept for CS310, 1 a duplicate, 9 reviewed | `scripts/gen-deck.mjs` checks the sentence against its source text and its confirmed quotation, the employer, the title, both dates, the link, the fingerprint and the denominator | M | 22 October 2026 |
| `deck-trl` | TRL 6; TRL 7 next | Software TRL 6, "Prototype implementations of the software demonstrated on full-scale realistic problems", self-assessed, in a relevant environment of real postings from a real public board, a sample course outline and a lecturer persona; TRL 7 needs one department running it for a term inside its LMS | NASA ESTO, technology readiness levels, the software column (<https://esto.nasa.gov/trl/>) | [hackastone-and-competitors-2026-10-22.md](research/hackastone-and-competitors-2026-10-22.md), Section 2 | P | 22 October 2026 |

The relevant environment says a sample course outline, not a real syllabus: the outline in `public/demo` is generated by `scripts/gen-demo-files.mjs` (docs/decisions.md).

## The film

Package A7. The film shows the same four rows as the deck, and only those: `deck-receipt` (1 of 9, counting up beside the receipt in both cuts), `world-skills-and-approval` (12 to 18 months and 39%, Afternoon's second scene), `deck-trl` (TRL 6) and `proof-checks` (185, counting up), both in Afternoon's proof scene. `video/remotion/scripts/sync.mjs` reads them from this file, checks the receipt's sentence, posting and denominator against `mcp/sample-workspace.json`, and fails on any digit in a caption that these rows do not hold. The app footage shows the app's own numbers from the dated saved sample, and its chip says "saved sample".

## The landing page: clauses quoted beside the loop

Each quotation is word for word from the note named, which quotes the document at the link; NAAC 1.4.1 is shown as a paraphrase because the note gives no quotable wording. Five steps quote an accreditor's clause or a quality code's guidance (QAA's is guidance: providers "are encouraged"); Teach quotes Biggs's constructive alignment, a teaching principle rather than an accreditor's clause, and the landing page and the deck label it so. ESG 1.2 and AACSB Standard 5, which plan Section 4 also names, are not shown until a note checks their wording (docs/decisions.md).

| Step | Clause | Link | Checked in | Key |
|:--|:--|:--|:--|:--|
| Watch | AUN-QA Guide v4.0, 1.4 | <https://fet.iuh.edu.vn/upload/files/web_SAR_2023.pdf> | [curriculum-latency-global-2026-10-22.md](research/curriculum-latency-global-2026-10-22.md), Section 3 | S |
| Watch | UK QAA, External Expertise | <https://www.qaa.ac.uk/docs/qaa/quality-code/advice-and-guidance-external-expertise.pdf> | the same note, Section 3 | P |
| Report | MQA COPPA, 2nd edition, 6.1.6 | <https://office.iium.edu.my/kca/wp-content/uploads/2024/09/COPPA-2nd-Edition-Nov-2017.pdf> | [pain-and-market-2026-10-11.md](research/pain-and-market-2026-10-11.md), Section 1.1 | P |
| Report | NAAC 1.4.1 (paraphrase) | <https://old.ncet.co.in/iqac/important-criteria> | [curriculum-latency-global-2026-10-22.md](research/curriculum-latency-global-2026-10-22.md), Section 3 | S |
| Decide | ABET, Criterion 2 | <https://www.abet.org/accreditation/accreditation-criteria/criteria-for-accrediting-engineering-programs-2025-2026/> | the same note, Section 3 | P |
| Update | ESG 2015, 1.9 | <https://www.enqa.eu/wp-content/uploads/2015/11/ESG_2015.pdf> | the same note, Section 3 | P |
| Teach | Biggs, constructive alignment, a teaching principle | <https://www.biologie.uzh.ch/dam/jcr:94dbcc23-1c4d-4892-bab8-ba16abc4ef66/ConstructiveAlignment_Biggs.pdf> | [hackastone-and-competitors-2026-10-22.md](research/hackastone-and-competitors-2026-10-22.md), Section 6 | P (that note marks only vendor and secondary sources; this one is unmarked) |
| Learn | ABET, Criterion 4 | <https://www.abet.org/accreditation/accreditation-criteria/criteria-for-accrediting-engineering-programs-2025-2026/> | [curriculum-latency-global-2026-10-22.md](research/curriculum-latency-global-2026-10-22.md), Section 3 | P |

## Where each figure appears, and what checks it

| Claim | Landing page | Deck | Brief | Poster | Film | README | Checked by |
|:--|:--|:--|:--|:--|:--|:--|:--|
| `world-skills-and-approval` | yes | slide 2 | page 1 | yes | Afternoon, beat 2 | yes | `src/prove-journey.ts` (landing), `scripts/gen-deck.mjs` (slides and the PDF read back), `scripts/gen-brief-pdf.mjs`, `scripts/gen-poster.mjs`, `video/remotion/scripts/sync.mjs` (captions and the counting graphics) |
| `asia-talent-shortage` | yes | no | page 1 | no | no | no | `src/prove-journey.ts`, `scripts/gen-brief-pdf.mjs` |
| `malaysia-underemployment` | yes | no | page 1 | no | no | no | `src/prove-journey.ts`, `scripts/gen-brief-pdf.mjs` |
| `deck-receipt` | no | slide 1 | page 1 | yes | both cuts, beat 3 | no | `scripts/gen-deck.mjs` and `video/remotion/scripts/sync.mjs` check the sentence, its posting and the denominator against `mcp/sample-workspace.json` |
| `deck-trl` | no | slide 8 | page 2 | yes | Afternoon, beat 6 | no | `scripts/gen-deck.mjs`, `scripts/gen-brief-pdf.mjs`, `scripts/gen-poster.mjs`, `video/remotion/scripts/sync.mjs` |
| `proof-checks` | yes | slide 8 | page 2 | yes | Afternoon, beat 6 | yes | `src/prove-journey.ts` (the figure equals the suites' total), the generators above |
| `proof-live-board` | yes | no | no | no | no | no | `src/prove-journey.ts` |
| `proof-no-keys` | yes | no | no | no | no | no | `src/prove-journey.ts` |
| `proof-no-paraphrase` | yes | no | no | no | no | no | `src/prove-journey.ts` |
| `tour-length` | yes | no | no | no | no | yes | `src/prove-journey.ts` (the figure equals `tourMinutes()`) |

A digit on the deck, the brief or the poster that is not one of these figures sits in an element marked as a reference (a date, an id, a clause), and the generators fail on any other. The film's sync fails on any digit in a caption that the four film rows do not hold. Screenshots show the app's own numbers from the dated saved sample, labelled as the sample; they are records, not claims.
