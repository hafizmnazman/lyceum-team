// The loop as the working form of what reviewers already look for (plan
// Section 4), for the landing page and the deck: accreditors' clauses, a quality
// code's guidance and, for Teach, a teaching principle, each labelled for what it is. Each clause is quoted word for
// word from a dated research note, or marked as a paraphrase where the note
// gives no quotable wording; nothing is quoted from memory. Clauses the plan
// names but no note quotes (ESG 1.2, AACSB Standard 5) are left out until a
// note checks them (docs/decisions.md).

export interface Clause { body: string; quote: string; paraphrase?: boolean; url: string; note: string }
export interface StepClauses { step: string; what: string; clauses: Clause[] }

export const ACCREDITOR_MAPPING: StepClauses[] = [
  { step: "Watch", what: "the environmental and stakeholder scan", clauses: [
    { body: "AUN-QA Guide v4.0, 1.4", quote: "the requirements of the stakeholders, especially the external stakeholders, are gathered, and that these are reflected in the expected learning outcomes",
      url: "https://fet.iuh.edu.vn/upload/files/web_SAR_2023.pdf", note: "curriculum-latency-global-2026-10-22.md, Section 3 (S)" },
    { body: "UK QAA, External Expertise", quote: "Providers are encouraged to engage with employers and other external stakeholders at all stages of course design, approval and review",
      url: "https://www.qaa.ac.uk/docs/qaa/quality-code/advice-and-guidance-external-expertise.pdf", note: "curriculum-latency-global-2026-10-22.md, Section 3 (P)" },
  ] },
  { step: "Report", what: "the needs analysis, with evidence", clauses: [
    { body: "MQA COPPA, 2nd edition, 6.1.6", quote: "conduct internal and external consultations, market needs and graduate employability analyses",
      url: "https://office.iium.edu.my/kca/wp-content/uploads/2024/09/COPPA-2nd-Edition-Nov-2017.pdf", note: "pain-and-market-2026-10-11.md, Section 1.1 (P)" },
    { body: "NAAC, 1.4.1", quote: "structured feedback on the syllabus from students, teachers, employers and alumni", paraphrase: true,
      url: "https://old.ncet.co.in/iqac/important-criteria", note: "curriculum-latency-global-2026-10-22.md, Section 3 (S)" },
  ] },
  { step: "Decide", what: "the programme committee's documented decision", clauses: [
    { body: "ABET, Criterion 2", quote: "involving program constituencies, for the periodic review of these program educational objectives",
      url: "https://www.abet.org/accreditation/accreditation-criteria/criteria-for-accrediting-engineering-programs-2025-2026/", note: "curriculum-latency-global-2026-10-22.md, Section 3 (P)" },
  ] },
  { step: "Update", what: "the approved revision, with its history", clauses: [
    { body: "ESG 2015, 1.9", quote: "Institutions should monitor and periodically review their programmes to ensure that they achieve the objectives set for them and respond to the needs of students and society",
      url: "https://www.enqa.eu/wp-content/uploads/2015/11/ESG_2015.pdf", note: "curriculum-latency-global-2026-10-22.md, Section 3 (P)" },
  ] },
  { step: "Teach", what: "constructive alignment of outcomes, activities and assessment", clauses: [
    { body: "Biggs, constructive alignment, a teaching principle", quote: "all components in the teaching system, the curriculum and its intended outcomes, the teaching methods used, the assessment tasks, are aligned to each other",
      url: "https://www.biologie.uzh.ch/dam/jcr:94dbcc23-1c4d-4892-bab8-ba16abc4ef66/ConstructiveAlignment_Biggs.pdf", note: "hackastone-and-competitors-2026-10-22.md" },
  ] },
  { step: "Learn", what: "assurance of learning", clauses: [
    { body: "ABET, Criterion 4", quote: "The results of these evaluations must be systematically utilized as input for the program's continuous improvement actions.",
      url: "https://www.abet.org/accreditation/accreditation-criteria/criteria-for-accrediting-engineering-programs-2025-2026/", note: "curriculum-latency-global-2026-10-22.md, Section 3 (P)" },
  ] },
];
