# The script

Two cuts from one project (plan Section 16): **Loop90**, the loop in about 90 seconds (beats 1, 3, 4, 5 and 8), which plays inside the pitch and on the landing page; and **Afternoon**, one afternoon in about three minutes (all eight beats), for the organiser's media and the booth fallback. Two voices, as in the Shenzhen cut: the **host**, Tualang, speaks for Lyceum (the builder's voice), and the **lecturer**, Dr Aisyah, a fictional lecturer, asks what a judge would ask (the sceptic's voice).

How to read this file:

- Each scene starts with `## <id>: <title>`, then its settings: `Visual` (the drawing or the app capture), `Chapter` (the chip, none for the cold open and the close), `Helpers` (the mascots at their stations), `Clips` (excerpts of the recorded tour, each named by the tour caption it starts at and given a length in seconds; `video/capture/capture.mjs` records the tour and the time of every caption) and `Hold` (the seconds the picture stays after the last line).
- Each line starts with `Host:` or `Lecturer:` and is one recording, one take, one file (`video/audio/<cut>/<scene>-<n>.wav`, numbered from 1 in each scene).
- **Bold** words are stressed: said with weight, and shown in lime in the captions.
- Numbers are written as the captions show them and come from `docs/claims.md`: say "39%" as "thirty-nine percent", "TRL 6" as "T R L six".
- Until the voices are recorded, `scripts/sync.mjs` times each line from its words at 2.6 a second.

The transition rule holds throughout: each scene ends on the question the next one answers, joined by "but" or "so", never "and then".

# Loop90

## l90-desk: One afternoon
Visual: desk
Chapter: none
Hold: 0.6

Lecturer: After class, my coordinator asks what this course should change before the review. I can **suggest** a change. I cannot **show** why.

## l90-receipt: The receipt
Visual: receipt
Chapter: The receipt
Hold: 1.2

Host: So start with a **receipt**: one exact sentence from a real Stripe posting, with its date and its link.
Host: It is one of **nine** postings you reviewed. Nothing invented, nothing pasted.

## l90-loop: The loop
Visual: loop
Chapter: The loop
Helpers: folio, scout, atlas, lens, steward, quill, prism
Hold: 0.8

Lecturer: But one receipt is not a **decision**.
Host: So the course runs one loop, every semester: Watch, Report, Decide, Update, Teach, Learn. Seven helpers do the work. **People** decide.

## l90-watch-report: Watch and Report
Visual: app
Chapter: Watch, Report
Helpers: scout, atlas, lens
Clips: "Fetch. Watch the log" 3, "Exact sentences, the matched words" 4, "Rejected:" 4, "Count: numerator" 4
Hold: 0.6

Host: Watch fetches an employer's public board, on request. Report proposes each sentence beside its source.
Lecturer: What if I **paraphrase**?
Host: It is **refused**. Only exact sentences count, over the postings you reviewed.

## l90-decide-update: Decide and Update
Visual: app
Chapter: Decide, Update
Helpers: quill
Clips: "He reads it with the receipts" 3, "Adopt. Recorded as data" 4, "Checked. Unknown budgets" 3, "A new version, with the previous" 4
Hold: 0.6

Lecturer: But who **decides**?
Host: People. The programme owner records adopt, with a reason, bound to the brief and the **term**. So the revision is checked against the hours, then adopted.

## l90-teach-learn: Teach and Learn
Visual: app
Chapter: Teach, Learn
Helpers: prism, lens
Clips: "Saved. One click more" 3, "Outcomes, the employer evidence" 4, "Matched to the course version" 3, "Attainment per outcome" 4
Hold: 0.6

Host: The class gets an editable pack, built from the records. Synthetic sample results come back, matched to the version taught.
Lecturer: But did it **work**?
Host: We claim no gain until the benchmark has run. So next semester, the loop runs again.

## l90-close: Every semester
Visual: ring
Chapter: none
Hold: 2.0

Host: **Receipts**. People decide. The tools lecturers already use. Every semester adds a **ring**.

# Afternoon

## aft-desk: One afternoon
Visual: desk
Chapter: none
Hold: 0.6

Lecturer: After class, my coordinator asks what this course should change before the next review. I have the outline, a row of tabs and a survey export. I can **suggest** a change. I cannot **show** why.

## aft-latency: Why now
Visual: latency
Chapter: Why now
Hold: 1.0

Host: At the US universities we checked, approving a new degree programme takes **12 to 18 months**.
Host: And employers expect **39%** of workers' skills to be transformed or outdated between 2025 and 2030.
Lecturer: So the course is always **behind**?
Host: Often behind, and short of the evidence the accreditors already ask for. The two figures describe different people, so they never share a chart.

## aft-receipt: The receipt
Visual: receipt
Chapter: The receipt
Hold: 1.2

Host: So here is the evidence, one sentence at a time: a **receipt**. An exact sentence from a real Stripe posting, with its date, its link and its fingerprint, one of **nine** postings reviewed.

## aft-loop: The loop
Visual: loop
Chapter: The loop
Helpers: folio, scout, atlas, lens, steward, quill, prism
Hold: 0.8

Lecturer: But one receipt is not a **decision**.
Host: So Lyceum runs one loop, with the same six names everywhere: Watch, Report, Decide, Update, Teach, Learn. Seven helpers do the work. At Decide, **people** decide.

## aft-watch: Watch
Visual: app
Chapter: Watch
Helpers: scout
Clips: "Watch: research" 3, "Fetch. Watch the log" 4, "Postings published recently" 5, "Kept as sources" 3
Hold: 0.4

Host: Watch is research you run, not a feed that runs itself. Scout fetches an employer's public board on request, and keeps each posting with its link and its date.
Lecturer: But postings are not **evidence** yet.

## aft-report: Report
Visual: app
Chapter: Report
Helpers: atlas, lens, steward
Clips: "Exact sentences, the matched words" 5, "Rejected:" 5, "Count: numerator" 5, "Brief: the evidence" 4
Hold: 0.4

Host: So Report proposes each sentence beside its source. A **paraphrase** is refused before it is stored. Lens counts only the postings you reviewed, with an interval, and Steward prepares the brief.
Lecturer: But a count is not a **decision**.

## aft-decide: Decide
Visual: app
Chapter: Decide
Clips: "The brief is waiting" 3, "He reads it with the receipts" 4, "The reason comes first" 3, "Adopt. Recorded as data" 5
Hold: 0.4

Host: So the brief goes to the programme owner, who records **adopt**, with a reason. The record names the brief, the term and the course version, and it never changes.
Lecturer: And if I decide on my own brief?
Host: Then it says **self-recorded**, and stays open until a second person confirms.

## aft-update: Update
Visual: app
Chapter: Update
Helpers: quill
Clips: "He sharpens the outcome" 4, "Checked. Unknown budgets" 4, "A new version, with the previous" 5
Hold: 0.4

Host: Quill checks the revision against the hours and the protected topics. The adopted version keeps its reason, and the old one is kept too.
Lecturer: But a course is not a **class**.

## aft-teach: Teach
Visual: app
Chapter: Teach
Helpers: prism
Clips: "A new session" 3, "Saved. One click more" 3, "Outcomes, the employer evidence" 5
Hold: 0.4

Host: So Prism builds an editable teaching pack from the saved session and the evidence behind its outcomes. Every word in it comes from the records.
Lecturer: But a class is not **proof**.

## aft-learn: Learn
Visual: app
Chapter: Learn
Helpers: lens
Clips: "The sample results file" 4, "Matched to the course version" 3, "Attainment per outcome" 5
Hold: 0.6

Host: So the term's results come back, here a synthetic sample, matched to the version taught, with n of N for each outcome. We claim no learning gain until the benchmark has run.

## aft-proof: What is real
Visual: proof
Chapter: What is real
Hold: 1.0

Host: By our own assessment the software sits at **TRL 6**, demonstrated on real postings from a real public board, a sample course outline and a lecturer persona. **259** automated checks pass. What is not built is shown in amber.
Lecturer: And the next step?
Host: One department, one term, inside its LMS.

## aft-doors: The doors
Visual: doors
Chapter: The doors
Hold: 1.0

Host: Lyceum is one core with many doors: the web workspace today, and a local, read-only door an assistant reads the evidence through. The remote doors, the LMS and the office suite are planned.
Lecturer: So I do not open another platform?
Host: No. You keep the tools you already use.

## aft-close: Every semester
Visual: ring
Chapter: none
Hold: 2.0

Host: We ask for one department, for one term. **Receipts**. People decide. The tools you already use. Every semester adds a **ring**.
