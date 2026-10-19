# Five minutes with Lyceum (for judges)

Lyceum is a lecturer's course workspace. The part worth judging is the research
run: fetch permitted employer postings on request, keep the ones worth reading,
confirm requirements as exact quotations, count with the denominator in view,
map skills to course outcomes, and take a brief with every receipt to a meeting.
Nothing changes the course without the lecturer. No model key or external
account is needed. Live collection needs the local API and a network connection;
a dated saved sample of real postings works without them.

```bash
npm install
npm run dev         # web UI + local API (document parsing, live board collection); open the printed URL
```

`npm run build` then `npm run preview` serves the UI alone. The saved sample
still works there; live boards and PDF, PPTX and DOCX parsing need the API.
On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

## Find your way in

On the sign-in screen, **See how Lyceum works** opens the public landing page
at `#/index` while signed out. It shows pain figures with source links, the
steps **Search**, **Read**, **See the counts**, **Decide**, **Brief and teach**,
and what is proven and not built. **Try it as a lecturer** returns to sign-in.
The public page is no longer the illustrative Relevance Index.

Once signed in, the sidebar puts the main work screens first. **UNDERSTAND**
contains **How it works**, **Evaluation** and **Guide & progress**.
**RESEARCH SANDBOX**, labelled **illustrative**, contains **Trends**,
**Acceptance test**, **Closed loop**, **Data room** and **Relevance Index**.

## Option A: hands off

Click **Play demo** on the sign-in screen, or **Watch the tour** on the public
landing page. A simulated cursor plays over the real app with captions.
[README.md](README.md) estimates about five and a half minutes after the intro
cards; live collection can vary.

1. Dr Sobri opens CS310, revises its outcome wording and topics, checks the
   constraints, adopts the local version and opens its history.
2. In **Evidence**, he tries Greenhouse's `stripe` board with `data analyst`.
   If collection fails, the dated saved sample stands in and the log says so.
   He selects postings and imports their receipts.
3. He names skills, scans and confirms exact sentences. A typed paraphrase is
   rejected. He marks the postings reviewed before they enter the denominator.
4. He maps a skill to CLO5 with a documented stage, target and course evidence,
   saves a dashboard lab and downloads its editable teaching pack.
5. He generates template assessment items, prepares a meeting brief, downloads
   its slides (now with a chart of the counts) and sends it to Dr Rahman.
6. **How it works** shows the record of the afternoon, step by step, by role.
   **Guide & progress** shows the guides and backup controls. Dr Rahman then
   reads the brief from **Home**, receipts attached.

Press Escape to take over. Playing resets the local workspace; the app warns
first if it detects saved work. Open How it works and Evaluation afterwards to
inspect the records and checks.

## Option B: hands on (the same work, your clicks)

Sign in as **Dr Sobri**. Follow the **Start here** card on **Home** and the
journey bar in **Course Studio**. Completion comes from workspace state, not
visiting a screen. Existing results may already tick a step.

1. **Open a course.** Open **Courses**, then **CS310**, or create a personal
   workspace. Use CS310 for the CLO5 example below.
2. **Confirm the outline.** In **Outcomes & topics**, start a revision, edit
   the outline, save and check it, then explicitly choose **Use as my course
   version**. The journey recognises only an adopted revision; seeded topics do not count.
3. **Collect evidence.** In **Evidence**, keep the saved sample for a repeatable
   run, search `analyst`, fetch, select and import postings. Alternatively choose
   Greenhouse with `stripe` and the local API running. Read the source policy.
   Fetching alone does not finish the step; sources must be saved.
4. **Confirm quotations.** Enter `SQL, Python, dashboards|dashboard,
   stakeholders|stakeholder`, save the terms and scan. Confirm or dismiss the
   proposals. Tick the extraction acknowledgement and mark the postings reviewed.
   The step needs a reviewed, nonduplicate posting that carries a confirmed quotation. Inspect
   the numerator, denominator and interval in the observed requirements table.
5. **Map to outcomes.** Map a quoted skill, such as dashboards, to CLO5.
   Save its documented coverage stage, target stage and cited course evidence.
   This is your reviewed judgement.
6. **Plan a class.** In **Teaching plan**, save a session linked to CLO5 with
   an activity and learning check. Download **Teaching pack (.pptx)** for its
   outcomes, linked evidence and teaching content, with speaker notes. The
   journey checks for a saved session linked to an outcome, not a download.
7. **Brief the meeting.** Back in **Evidence**, choose a recommendation, write
   a note and **Prepare brief**. Read it, download Markdown or slides, and send
   it to **Dr Rahman**. Preparing the brief completes the step; sending is optional.

Then open **How it works** under **UNDERSTAND**. Expand the role cards for
**Reads**, **Produces** and **Cannot**. Select CS310 and inspect **The record on
CS310, step by step**: its timeline comes from saved workspace records, including
the work you just did, and says so. **Open** takes you back to the relevant course tab.

Next open **Evaluation**. Live checks re-examine quotations, duplicates, reviewed
postings and backup validity in this browser. The **Requirement scan benchmark**
shows detection metrics and disagreements on a small hand-labelled set, with its
limits stated. The automated suites table reports verification separately from
these live checks. The **Student-agent benchmark: the protocol** is labelled
**Not yet run**; its synthetic backtest is not real-world accuracy.

## Things worth poking

- Paste a permitted job description under **Sources and receipts**. Quote its
  exact words, then try a paraphrase. Record it again and inspect duplicate handling.
- In **Outcomes & topics**, remove protected content or exceed a declared hour
  budget and watch the check refuse it. Adopt a valid change and inspect affected
  teaching sessions flagged for review.
- Switch to **Dr Rahman** from the account menu. On **Home**, **Read brief**
  opens the sent brief with its receipts.
- In **Guide & progress**, download a JSON workspace backup, change something,
  restore with its preview and acknowledgement, then download the recovery copy.
- **Reset workspace** in the account menu restores the seed for a clean slate.

For reproducible checks, run `npm run prove:all`. The
[as-built report](docs/lyceum-v3-as-built-2026-10-09.md), section 12 (the
11 October addendum), records 160 passing checks across fourteen suites. After `npm run build`, `npm run smoke:integrity`
checks the public landing page's limits and absence of a prototype-data notice,
notice placement on the visited signed-in screens, the Index's source-disagreement
warning, Data room's illustrative label, the timeline and benchmark headings,
and absence of page errors. These are software checks, not learning validation.

## What is real and what is not

- Real: requested board collection, exact-quotation validation, counts, revisions,
  plans, briefs, editable decks and backups. The saved sample is real Stripe
  postings retrieved 9 October 2026, truncated and labelled as a saved sample.
- Prototype: personas, seeded courses and browser-local role switching. Sending
  a brief is an in-app local workflow, not an external message or shared service.
- Illustrative: sandbox market figures and learner records. The sidebar labels
  the sandbox; its screens and **Approvals** carry the prototype-data notice.
  That notice is not a blanket banner on work screens or the public landing page.
  Evaluation separately labels its synthetic backtest and unrun protocol.
- Not built: shared accounts, server permissions and sync, collectors for sites
  without an API, scheduled refresh, comparable time-window trends, Teams or
  Slack surfaces, model-drafted slide text, and complete assessment marks and
  rubrics. Briefs export as Markdown or slides, not DOCX or PDF.
- Never claimed: representative labour-market counts, employability scores,
  proven learning gains or accreditation. No lecturer pilot has run. Formal
  syllabus approval stays in the university's process.
