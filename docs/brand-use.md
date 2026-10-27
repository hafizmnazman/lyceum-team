# Brand use: the marks Lyceum shows, and where each came from

Written 22 October 2026 (package A6), with the UTP mark added the same evening (Track C, package D0, from `docs/lyceum-depth-plan.md` Section 3.2), from plan Section 12, the design note `docs/research/design-and-video-references-2026-10-22.md` Section 6 and the data in the installed `simple-icons` package (16.35.0). Nothing in that first version was fetched, so each brand page was named with its link and marked as not read where that mattered. On 23 October 2026, with the owner's approval, the session read Microsoft's icon licence and downloaded the poster's official files from their owners' sites (the poster section below).

## The rule

Marks are used referentially, the way a tutorial or a product page uses them: to identify a product Lyceum reaches. A mark is shown unmodified, in one colour (the Simple Icons path filled with the forest token, the monochrome form the project provides), at one height, beside the product's name and its status (built, local and read-only, or planned). Every surface that shows a mark carries one line: "Product names and logos belong to their owners and identify integrations; no partnership or endorsement is implied." No third-party mark appears inside Lyceum's own lockup, a poster title or a booth banner headline. Where a brand's terms ask for a licence or a request, or where they have not been read, the product is named in text instead.

Simple Icons is CC0 as a project, but each icon keeps its brand's own licence and terms (its `DISCLAIMER.md`), so the package is where a path came from, not a permission.

## The partner mark: the team's own university

The UTP mark is not an integration mark and follows its own rule. It identifies the demo institution, Universiti Teknologi PETRONAS, the team's own university, on sample material. It keeps its owner's colours, the blue `#004A84` and the gold `#BC893A` of the owner's file, and is never recoloured, cropped, redrawn or inlined into a component; it is never combined with Lyceum's own lockup and never placed in a poster title or a booth banner headline. Every surface that shows it carries the demo line, `DEMO_LINE` in `src/data/sample-course/index.ts`: "A demo course at UTP, written for this prototype. CS310 is not a UTP course outline, and these marks, responses and slides are synthetic." The pack and the screens place a PNG with the alt text "Universiti Teknologi PETRONAS mark, demo course". The contrast check leaves `public/brand/partners/` alone by the one exception the owner approved on 22 October 2026 (CLAUDE.md); a hex anywhere else still fails. A campus that must not show a mark turns `showMark` off in the institution profile on the Guide page.

## The poster's marks: the owner's decision of 23 October 2026

On 23 October the owner chose every logo, planned ones too, for the A1 poster, and accepted the brand risk for print. The poster's sixth chapter shows the system with each integration's own mark in its owner's colours. Every mark sits on a neutral tile at one size, beside its full product name in body text and its status: built, local and read-only, or planned. The ownership line is in the footer. No mark is larger than Lyceum's name, in the title, in a corner or combined with Lyceum's lockup. The files live in `public/brand/partners/logos/`, the folder whose files keep their owners' colours. Its `manifest.json` gives each file's product, source, fingerprint and terms, and `node scripts/gen-partner-logos.mjs --check` fails when a file drifts from the package or from its downloaded fingerprint (docs/decisions.md).

| Mark | Source | Terms on record | On the poster as |
|:--|:--|:--|:--|
| Microsoft PowerPoint, Word, Excel, Forms, Teams, Microsoft 365 | Microsoft's product icon set, `res-1.cdn.office.net/files/fabric-cdn-prod_20251008.001/assets/brand-icons/product/svg/`, downloaded 23 October 2026, committed byte for byte | The Microsoft Fabric Assets License (November 2019, <https://aka.ms/fluentui-assets-license>), read on 23 October. Icons may illustrate that an application integrates with Microsoft products. In a lineup that is not clickable, each icon is labelled with the full product name in body copy. Icons are full colour and unmodified, never more prominent than the application's name, never used as a logo or in a decorative corner, and imply no endorsement | Files in and out (built): results and rubrics in Excel, survey exports from Forms, the teaching pack in PowerPoint, the course file in Word. A planned door: Microsoft 365 Copilot and Teams. Copilot has no icon in the set, so it is named in text |
| Lever | The wordmark in the header of lever.co (`lever.co/images/lever-only-logo.png`), downloaded 23 October 2026 | No brand kit or usage page was found; the wordmark is used referentially and unmodified | A job board Lyceum reads through its public API (built) |
| Claude, Model Context Protocol, Greenhouse | Simple Icons 16.35.0, now in their brands' colours | As in the table below | The local door (local, read-only) and a job board (built) |
| Google Forms, Google Gemini | Simple Icons 16.35.0 | Simple Icons records no guidelines; Google's own terms apply, and Google asks for a brand request (the table below), which the owner accepted as a risk for print | Survey exports read (built); a planned remote door, Gemini Enterprise |
| Moodle, Canvas | Simple Icons 16.35.0 | Moodle's trademark page (<https://moodle.com/trademarks>); Instructure's media resources page (<https://www.instructure.com/about/brand-guide/media-resources>); neither read in this run | Moodle: Feedback exports read and quiz items written as Moodle XML, built and not yet tried on a Moodle site. Both: the LMS door, planned |
| TypeScript, React, Node.js | Simple Icons 16.35.0 | TypeScript's and Node.js's branding pages, named by Simple Icons; React's own terms | "Built with", inside the core |

OpenAI's brand page (<https://openai.com/brand/>) refused an automated read on 23 October, and the session did not work around it. So ChatGPT Edu, a planned door, is named in text and never drawn. If the owner downloads the mark by hand from that page, it can join the folder and the manifest.

## Marks shown

| Mark | Where it appears | Source of the path | Terms on record | Why it is shown |
|:--|:--|:--|:--|:--|
| Claude | The architecture diagram (the local door's tile), so also deck slide 9, the brief's page 3 and the poster | Simple Icons `claude`, source <https://claude.ai> | Simple Icons records no licence or guidelines; the design note records that Anthropic has a press kit but no public usage page | The local door is built and runs on this machine (`mcp/`, package A5); the mark identifies the assistant it serves. The owner checks the press kit before print. |
| Model Context Protocol | The same tile, beside Claude | Simple Icons `modelcontextprotocol`, source the logo in the protocol's documentation repository on GitHub | Simple Icons records no licence or guidelines | The door speaks MCP over stdio; the mark names the protocol, not a vendor. |
| Greenhouse | The diagram's sources band, beside the board Lyceum reads | Simple Icons `greenhouse`, source <https://brand.greenhouse.io/brand-portal/p/6> | Greenhouse publishes guidelines at <https://brand.greenhouse.io/brand-portal/p/5>; not read in this run | Lyceum reads Greenhouse job boards through their documented public API (the Stripe board in the demo); the mark identifies that source. |
| UTP (Universiti Teknologi PETRONAS) | Sample material, each time with the demo line: the course file's cover sheet (D1), the teaching pack's masters and their previews on screen (D2), and the term recap's header (D6a); the survey's student page and the OBE course report's header follow with D3 and D4; so also screenshots of those screens | The owner's `utp.svg`, supplied at the repository root on 22 October 2026, copied byte for byte to `public/brand/partners/utp.svg` and rasterised to `utp-1024.png`, `utp-256.png` and, cropped to the mark's own bounds for the pack's corners, `utp-wide.png` by `scripts/gen-partner-marks.mjs` | UTP publishes no brand kit (`docs/research/slides-items-and-surveys-tech-2026-10-22.md`, Section 6). The permission on file: on 22 October 2026 the team's advisor confirmed that the team represents the university and that an earlier student team used the mark the same way, and the owner approved its use in the app, the pack and the published surfaces, labelled demo | The demo institution is the team's own; the mark appears on sample material inside the app, in the pack and on published surfaces, labelled demo |
| Lyceum | Every surface | Lyceum's own mark, from the host's silhouette (`public/brand/mark.svg`, package A3) | Ours | Never combined with a third-party mark. |

## Named in text, and why

Everywhere but the poster, these stay in text. The poster section above says which of them the poster now draws, under the owner's decision of 23 October.

| Product | Why text and not a mark |
|:--|:--|
| Microsoft 365, Copilot, Copilot Studio, Teams, Word, Entra ID | Microsoft allows its names to be used referentially, but its logos and icons only under a licence (<https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general>, in the design note). |
| Google Docs, Slides, Gemini Enterprise | Google asks for a brand request first, answered in up to two weeks (<https://support.google.com/contact/brand_request_form>), which is later than the Grand Final. Simple Icons carries a Gemini path; Google's terms still apply. |
| ChatGPT Edu (OpenAI) | OpenAI publishes a brand page (<https://openai.com/brand/>) that this run did not read, and Simple Icons 16.35.0 carries no OpenAI path. |
| Moodle | References to the software are free; a logo that implies endorsement needs permission (<https://moodle.com/trademarks/>). |
| Canvas (Instructure) | The design note found no public brand page; Simple Icons points to Instructure's media resources page (<https://www.instructure.com/about/brand-guide/media-resources>), not read in this run. |
| Lever | Simple Icons 16.35.0 carries no Lever path. |
| Ashby, Workable, SmartRecruiters, USAJOBS, Adzuna, ESCO, O*NET, ISCO-08, CS2023, SFIA, NICE, CDIO, AACSB | Named as planned sources and as references; a name is enough. |
| Stripe | The employer of the postings in the demo, named as the source of a quotation, never shown as a mark. |

## Where each surface stands

- **The architecture diagram** (`scripts/gen-architecture.mjs`): the three marks above, the ownership line in its footer. The deck, the brief and the poster reuse it.
- **The deck and the brief** (`deck/`, `scripts/gen-brief-pdf.mjs`): no marks of their own beyond the diagram's.
- **The poster** (`scripts/gen-poster.mjs`, portrait since 23 October): its own marks in the system chapter, from `public/brand/partners/logos/` under the owner's decision of 23 October, with the ownership line, and the UTP mark only in the footer, beside the demo line.
- **The sample material** (the pack, the survey page, the course file, the OBE report, the term recap): the UTP mark with the demo line, as each Track C package builds the surface; `showMark` in the institution profile turns it off everywhere at once.
- **The landing page's doors strip** (`DOORS` in `src/ui/screens/Landing.tsx`): neutral icons and the door names, each labelled built or planned, until the owner answers item 1 of Needs the owner in `docs/run-log.md`.

## Before print or publication

The owner confirms each mark in the first table against its owner's current terms, applies for any licence the second table names if a mark is wanted there, and records the answer and its date in this file.
