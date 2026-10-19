// The pain, in numbers, with the source beside each. Shown on the landing page
// and in the pitch. Everything here traces to a published source and was
// checked on 11 October 2026; the research note in docs/research carries the
// fuller list, the comparators and the caveats. Three figures per scope, so a
// reader is not buried in numbers. Vendor surveys are labelled as such.

export interface PainStat { value: string; label: string; scope: "Malaysia" | "Asia" | "World"; source: string; url: string }

export const PAIN_STATS: PainStat[] = [
  { value: "32.2%", label: "of Malaysian graduates in 2024 worked below their qualification: 1.60 million people, skill-related underemployment", scope: "Malaysia",
    source: "DOSM, Graduates Statistics 2024", url: "https://www.dosm.gov.my/uploads/release-content/file_20260401145140.pdf" },
  { value: "3.2%", label: "graduate unemployment in the same year, among 5.98 million graduates. Jobs exist; the match is the problem", scope: "Malaysia",
    source: "DOSM, Graduates Statistics 2024", url: "https://www.dosm.gov.my/uploads/release-content/file_20260401145140.pdf" },
  { value: "66%", label: "of those underemployed graduates were under 25: the gap lands on the newest graduates first", scope: "Malaysia",
    source: "DOSM, Graduates Statistics 2024", url: "https://www.dosm.gov.my/uploads/release-content/file_20260401145140.pdf" },
  { value: "77%", label: "of 10,095 employers across Asia Pacific could not find the skills they needed in 2025, up from 45% in 2014 (employer survey)", scope: "Asia",
    source: "ManpowerGroup, Talent Shortage 2025", url: "https://www.manpowerthailand.com/apac-talent-shortage" },
  { value: "96% vs 33%", label: "of Indonesian training institutions called their graduates work-ready; 33% of food and beverage manufacturers agreed", scope: "Asia",
    source: "ADB, Industry 4.0 skills study 2021", url: "https://www.adb.org/news/skills-development-vital-enabling-transition-industry-4-0-southeast-asia-adb-study" },
  { value: "3 in 10", label: "new graduates in the Philippines were mismatched to their jobs, by the PIDS tracer study", scope: "Asia",
    source: "Philippine Institute for Development Studies", url: "https://pids.gov.ph/details/new-college-grads-mismatched-to-their-jobs" },
  { value: "39%", label: "of workers' skills expected to change or become outdated by 2030, according to more than 1,000 employers in 55 economies", scope: "World",
    source: "World Economic Forum, Future of Jobs Report 2025", url: "https://www.weforum.org/publications/the-future-of-jobs-report-2025/in-full/" },
  { value: "63%", label: "of those employers call the skills gap the biggest barrier to transforming their business", scope: "World",
    source: "World Economic Forum, Future of Jobs Report 2025", url: "https://www.weforum.org/publications/the-future-of-jobs-report-2025/in-full/" },
  { value: "52%", label: "of US bachelor's graduates were underemployed a year after graduating; 45% still were ten years on", scope: "World",
    source: "Burning Glass Institute and Strada, Talent Disrupted 2024", url: "https://www.burningglassinstitute.org/s/Talent-Disrupted-03052024.pdf" },
];
