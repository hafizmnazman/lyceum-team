// The problem at three levels, one comparison each (plan Section 2.4), shown on the
// landing page and reused by the deck. Every figure is in docs/claims.md with
// its source, the research note that checked it and the date; the proofs check
// that nothing here is missing there. Vendor surveys are labelled as such.

export interface PainSource { name: string; url: string }
export interface PainStat {
  claim: string; // the id of the row in docs/claims.md
  scope: "World" | "Asia" | "Malaysia";
  value: string;
  label: string;
  sources: PainSource[];
  vendor?: boolean; // a vendor survey, said so beside the figure
}

export const PAIN_STATS: PainStat[] = [
  { claim: "world-skills-and-approval", scope: "World", value: "39%",
    label: "of workers' existing skills, employers expect, will be transformed or become outdated between 2025 and 2030, while approving a new degree programme takes 12 to 18 months at the US universities cited",
    sources: [
      { name: "World Economic Forum, Future of Jobs Report 2025", url: "https://www3.weforum.org/docs/WEF_Future_of_Jobs_Report_2025.pdf" },
      { name: "Wayne State University, programme approval", url: "https://provost.wayne.edu/programs/approval-process" },
      { name: "Texas Tech University, new programme timelines", url: "https://www.depts.ttu.edu/provost/curriculum/new-programs/timelines.php" },
    ] },
  { claim: "asia-talent-shortage", scope: "Asia", value: "77%",
    label: "of 10,095 Asia Pacific employers could not find the skills they needed in 2025, up from 45% in 2014",
    sources: [{ name: "ManpowerGroup, Talent Shortage 2025", url: "https://www.manpowerthailand.com/apac-talent-shortage" }], vendor: true },
  { claim: "malaysia-underemployment", scope: "Malaysia", value: "32.2%",
    label: "of employed Malaysian graduates, 1.60 million people, worked below their qualification in 2024, while 3.2% of graduates in the labour force were unemployed",
    sources: [{ name: "DOSM, Graduates Statistics 2024", url: "https://www.dosm.gov.my/uploads/release-content/file_20260401145140.pdf" }] },
];
