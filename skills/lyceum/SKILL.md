---
name: lyceum
description: Use when a lecturer, course coordinator or programme owner asks what employers ask for in one of their courses, wants the evidence behind a course decision with its receipts, or asks for a course outline, a meeting brief draft or a teaching pack, and the lyceum MCP server is connected. Answers come from an exported Lyceum workspace, read-only, with every count given over its denominator and every quotation tied to its source.
license: Proprietary. Part of the Lyceum prototype; see the repository README.
compatibility: Needs the lyceum MCP server from this repository (node mcp/server.ts) with LYCEUM_WORKSPACE pointing at a workspace backup exported from Lyceum. Local and read-only; remote access and OAuth are planned.
metadata:
  version: "0.1.0"
  door: local
  status: prototype
---

# Lyceum: the course loop, with receipts

Lyceum is a lecturer's course workspace. A course runs through one loop every semester, and each step produces a record a person can open:

1. **Course** (setup): what the course promises today, its outcomes and topics.
2. **Watch**: postings collected on request from a permitted employer board or a dated saved sample, each kept with its link, publication date, retrieval time and fingerprint.
3. **Report**: exact quotations confirmed by a person, the reviewed denominator, each skill's share with its 95% Wilson interval, the coverage of each skill against a target, and a meeting brief.
4. **Decide**: a person records adopt, retain, defer or return, with the reason, on the brief.
5. **Update**: the approved change, checked against the hours and the rules, adopted as a new course version.
6. **Teach**: sessions linked to outcomes, each with an editable teaching pack.
7. **Learn**: the results filed for the term, matched to the version taught, shown as filed with n of N.

History keeps the versions and the decisions on one timeline.

## What you may say, and how

- Give every share with its numerator, its denominator and its interval: "dashboards: 5 of 9 reviewed postings, 55.6%, 95% interval 26.7% to 81.1%". Never call a share a score, a ranking or employability.
- Quote a requirement only word for word from the evidence report, and name its source: the employer, the posting title, the date and the link.
- Say where the postings came from (the board, or the dated saved sample) and that the sample is a convenience sample of what was collected, not the labour market.
- Say when the workspace was exported. Every tool reply starts with that time; if the user may have worked since, ask them to export again.
- Keep the labels: real, prototype, illustrative, planned. Synthetic data is synthetic. Anything from the illustrative sandbox (forecasts, the mock cohort, the relevance index) is illustrative and is never evidence.
- No learning gain is claimed; the benchmark has not been run. Do not infer one from the Learn figures.
- Quote attainment with its pass mark, its n of N and the KPI, and keep the survey's share beside the marks' share: they are different measures and are never averaged. A seeded example is never counted, and a report not saved says so.

## What you must not do

The door is read-only. Confirming a quotation, marking postings reviewed, recording a decision, adopting a revision and sending a brief are human actions in the Lyceum workspace. Do not claim any of them happened because of a conversation, and do not present a brief draft as a brief on record. If the user asks for one of these, say where in the workspace it is done.

## When to call each tool

| Tool | Call it when | It returns |
|:--|:--|:--|
| `lyceum_courses` | The user has not named a course, or asks which courses exist or how far each loop is this term | Each course with its outcomes, its kept and reviewed sources and its loop summary |
| `lyceum_sources` | The user asks where the evidence came from, or for the postings behind a claim | Each kept source with its link, dates, review state and fingerprint; `reviewedOnly` gives the denominator |
| `lyceum_evidence_report` | The user asks what employers ask for, how often, or what the course does about it | The counts with denominators and intervals, coverage against targets, and every quotation with its source |
| `lyceum_course_outline` | The user asks what the course teaches today | The current version's outcomes, topics, hours and reason |
| `lyceum_course_record` | The user asks for the course file, its matrix, its assessment plan, or what the course file holds and lacks | The course information in the course file's order and the manifest marking each item present, sample, not yet built or not included |
| `lyceum_attainment` | The user asks how students did on an outcome, whether a KPI was met, or for the OBE report | Per outcome, the students at or above the pass mark over n with N, the KPI and an interval only below N, the survey's share beside it, the PLO listing and the CQI note; say whether the report was saved |
| `lyceum_brief_draft` | The user wants a brief for a meeting | A draft brief with the evidence and a recommendation; the user prepares and sends the real one in the workspace |
| `lyceum_teaching_pack` | The user wants the slides for a saved session | Writes the editable PPTX to a new absolute path the user names; it never overwrites a file |

Start with `lyceum_courses` if the course is unclear. For any claim about employers, call `lyceum_evidence_report` and quote from it; do not answer from memory.
