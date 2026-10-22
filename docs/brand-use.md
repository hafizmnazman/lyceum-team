# Brand use: the marks Lyceum shows, and where each came from

Written 22 October 2026 (package A6), from plan Section 12, the design note `docs/research/design-and-video-references-2026-10-22.md` Section 6 and the data in the installed `simple-icons` package (16.35.0). Nothing here was fetched: this run sends nothing off the machine, so every brand page below is named with its link and marked as not read where that matters.

## The rule

Marks are used referentially, the way a tutorial or a product page uses them: to identify a product Lyceum reaches. A mark is shown unmodified, in one colour (the Simple Icons path filled with the forest token, the monochrome form the project provides), at one height, beside the product's name and its status (built, local and read-only, or planned). Every surface that shows a mark carries one line: "Product names and logos belong to their owners and identify integrations; no partnership or endorsement is implied." No third-party mark appears inside Lyceum's own lockup, a poster title or a booth banner headline. Where a brand's terms ask for a licence or a request, or where they have not been read, the product is named in text instead.

Simple Icons is CC0 as a project, but each icon keeps its brand's own licence and terms (its `DISCLAIMER.md`), so the package is where a path came from, not a permission.

## Marks shown

| Mark | Where it appears | Source of the path | Terms on record | Why it is shown |
|:--|:--|:--|:--|:--|
| Claude | The architecture diagram (the local door's tile), so also deck slide 9, the brief's page 3 and the poster | Simple Icons `claude`, source <https://claude.ai> | Simple Icons records no licence or guidelines; the design note records that Anthropic has a press kit but no public usage page | The local door is built and runs on this machine (`mcp/`, package A5); the mark identifies the assistant it serves. The owner checks the press kit before print. |
| Model Context Protocol | The same tile, beside Claude | Simple Icons `modelcontextprotocol`, source the logo in the protocol's documentation repository on GitHub | Simple Icons records no licence or guidelines | The door speaks MCP over stdio; the mark names the protocol, not a vendor. |
| Greenhouse | The diagram's sources band, beside the board Lyceum reads | Simple Icons `greenhouse`, source <https://brand.greenhouse.io/brand-portal/p/6> | Greenhouse publishes guidelines at <https://brand.greenhouse.io/brand-portal/p/5>; not read in this run | Lyceum reads Greenhouse job boards through their documented public API (the Stripe board in the demo); the mark identifies that source. |
| Lyceum | Every surface | Lyceum's own mark, from the host's silhouette (`public/brand/mark.svg`, package A3) | Ours | Never combined with a third-party mark. |

## Named in text, and why

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
- **The deck, the brief and the poster** (`deck/`, `scripts/gen-brief-pdf.mjs`, `scripts/gen-poster.mjs`): no marks of their own beyond the diagram's.
- **The landing page's doors strip** (`DOORS` in `src/ui/screens/Landing.tsx`): neutral icons and the door names, each labelled built or planned, until the owner answers item 1 of Needs the owner in `docs/run-log.md`.

## Before print or publication

The owner confirms each mark in the first table against its owner's current terms, applies for any licence the second table names if a mark is wanted there, and records the answer and its date in this file.
