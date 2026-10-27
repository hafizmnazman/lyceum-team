// The demo institution (depth plan Section 3.1): the team's own university, labelled demo on every surface.
// Every value is a setting a campus changes on the Guide page; the help lines say where each default comes
// from, so no setting reads as UTP's rule or a national method. Sources: docs/research/course-records-and-
// surveys-2026-10-22.md (Sections 2 and 3) and docs/research/slides-items-and-surveys-tech-2026-10-22.md
// (Sections 4 and 5).

import type { InstitutionProfile } from "../types.ts";

export const DEMO_INSTITUTION: InstitutionProfile = {
  name: "Universiti Teknologi PETRONAS (demo)",
  shortName: "UTP",
  showMark: true,
  mark: {
    svg: "/brand/partners/utp.svg",
    png: "/brand/partners/utp-1024.png",
    pngSmall: "/brand/partners/utp-256.png",
    wide: "/brand/partners/utp-wide.png",
    alt: "Universiti Teknologi PETRONAS mark, demo course",
  },
  kpi: { passMark: 55, studentShare: 0.5, method: "share-above-mark" },
  surveyScale: { min: 1, max: 5, target: 4 },
  surveyFloor: 5,
  surveyFloorShare: 0.25,
  releaseRule: "all-results-after-grades",
  lms: "Moodle (ULearn)",
  controller: "This prototype is run by the Lyceum team at UTP for a demonstration; a campus deployment names its own data controller.",
  privacyNoticeUrl: "https://www.utp.edu.my/sites/Publishing/PublishingContent/privacy-notice-general.pdf",
  termPattern: "2026/2027 semester 1",
  demo: true,
};

/** Where each default comes from, shown beside its setting. */
export const INSTITUTION_HELP = {
  kpi: "The default follows one Malaysian faculty's published practice, at least 50% of students at 55 marks or above in every outcome (UTHM FKEE, OBE Practices 2024). It is an example, not a national rule and not a UTP document. Other campuses use other conventions, such as 70% of students at 60 or above, so the threshold is a setting and every report prints the one it used.",
  method: "Share above the mark is the only method the filed results can compute: one mark per student per outcome. A per-tool method, such as the share of students at 70% of each assessment's maximum weighted by tool, needs per-tool scores, which a campus would configure once it files them.",
  scale: "1 to 5 from strongly disagree to strongly agree, with 4 or higher as the target, as in MQA's worked example (GGP: Assessment of Student Learning, 2023) and an end-of-course outcome survey on the same scale.",
  floor: "No aggregate is shown below either limit, and the stricter applies: five responses per section, as McLennan publishes, and a share of the class, as McGill's policy sets by class size (five for classes of 5 to 11, then 40, 35, 30 and 25%).",
  release: "No result for the term, aggregates and comments alike, reaches the lecturer before the coordinator records that grades are released, as McGill's and Rutgers' policies say.",
  lms: "Item exports are written for this LMS first. UTP runs two Moodle instances, ULearn and ULearnX (a vendor's case study).",
  controller: "Shown on the student survey page with the consent line. The linked notice is UTP's general privacy notice, as the demo's example; a deployment links its operator's own notice.",
} as const;
