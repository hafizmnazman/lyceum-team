// The judge's guided walk (depth plan Section 9.1 item 2): stops over the real app on the restored sample workspace, the
// tour's end state, in loop order. At each stop the runner's guided mode spotlights one element and shows the app's own
// caption, at most twenty words, with the honesty label where one applies. Tualang speaks only at a walk's first stop and
// its last (Section 0.2 rule 7); the explaining is the captions', never the host's. The tour in script.ts is untouched:
// this is a separate script.

export interface WalkStop {
  id: string;     // a short name, for the smoke and the proof
  route: string;  // the hash the stop opens
  target: string; // the data-demo-id to spotlight; a trailing * matches by prefix, the first match in the page
  screen: string; // the file that renders the target, which the proof reads
  caption: string;
  label?: string; // the honesty label: real, prototype, sample, synthetic or planned
  open?: boolean; // open the target's disclosure before spotlighting it
  host?: string;  // Tualang's line, at the first and the last stop only
}

export const WALK_PERSON = "P-SOBRI";
export const SAMPLE_WORKSPACE_URL = "/demo/sample-workspace.json";

/** The loop in ten stops. */
export const WALK: WalkStop[] = [
  { id: "course", route: "#/course/CS310", target: "course-sample-line", screen: "src/ui/screens/CourseWorkspace.tsx",
    caption: "Course: CS310's record in the shape of a course file, outcomes to references, for a labelled demo at UTP.", label: "Sample, synthetic",
    host: "Ten stops over the real app. Next when you are ready." },
  { id: "watch", route: "#/course/CS310/watch", target: "evidence-source", screen: "src/ui/screens/EvidenceWorkspace.tsx",
    caption: "Watch: a real posting kept as a receipt, with its link, its publication date and a fingerprint.", label: "Real" },
  { id: "quote", route: "#/course/CS310/report/quote", target: "confirmed-quotations", screen: "src/ui/screens/EvidenceWorkspace.tsx",
    caption: "Report: each quotation is exact, beside its source; a paraphrase is refused before anything is stored.", label: "Real" },
  { id: "count", route: "#/course/CS310/report/count", target: "skill-card-*", screen: "src/ui/primitives/loop.tsx",
    caption: "Count: a skill over the postings the lecturer reviewed, with its interval, never a bare percentage.", label: "Real" },
  { id: "decide", route: "#/course/CS310/decide", target: "decide-panel", screen: "src/ui/screens/Decide.tsx",
    caption: "Decide: the decision is a record: adopt, the reason, the brief, the course version and the term.", label: "Prototype" },
  { id: "update", route: "#/course/CS310/update", target: "update-last-change", screen: "src/ui/screens/CurriculumWorkspace.tsx",
    caption: "Update: the change in use, word by word, and the hours topic by topic, against the version before.", label: "Sample, synthetic" },
  { id: "teach", route: "#/course/CS310/teach", target: "session-preview-*", open: true, screen: "src/ui/screens/CourseWorkspace.tsx",
    caption: "Teach: a preview of the week 6 pack, built from the session, the course record and the evidence.", label: "Sample, synthetic" },
  { id: "learn", route: "#/course/CS310/learn", target: "learn-attainment", screen: "src/ui/screens/Learn.tsx",
    caption: "Learn: the term's results against the stated pass mark, with n of N, and the OBE report beside them.", label: "Synthetic marks" },
  { id: "history", route: "#/course/CS310/history", target: "history-decision-link-*", screen: "src/ui/screens/CurriculumWorkspace.tsx",
    caption: "History: each version names the decision that authorised it, and opens it.", label: "Prototype" },
  { id: "home", route: "#/inbox", target: "journey-card", screen: "src/ui/screens/Inbox.tsx",
    caption: "Home: the ring closes when every step has its record for the term.",
    host: "That is the loop. Every term adds a ring." },
];

/** "Before and after" on the judge's page: the one change, three ways. */
export const BEFORE_AFTER: WalkStop[] = [
  { id: "update", route: "#/course/CS310/update", target: "update-last-change", screen: "src/ui/screens/CurriculumWorkspace.tsx",
    caption: "The outline before and after: CLO5's words as a redline, and each topic's hours with the change in words.", label: "Sample, synthetic",
    host: "Three stops on one change. Next when you are ready." },
  { id: "teach", route: "#/course/CS310/teach", target: "session-changes-*", open: true, screen: "src/ui/screens/CourseWorkspace.tsx",
    caption: "The week 6 pack under each version: only the slide with CLO5 changes, outlined and listed.", label: "Sample, synthetic" },
  { id: "history", route: "#/course/CS310/history", target: "history-decision-link-*", screen: "src/ui/screens/CurriculumWorkspace.tsx",
    caption: "The reason on record: the version names the decision that authorised it, and opens it.", label: "Prototype",
    host: "That is the change and its reason. Thank you for walking." },
];

/** A caption's length in words, as the proof counts it. */
export const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
