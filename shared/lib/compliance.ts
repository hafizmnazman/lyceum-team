// The rules a lecturer's country brings (docs/research/education-compliance-2026-10-28.md, not legal advice): asked at
// onboarding, kept on the profile, and added to every helper's prompt so the model works in the country's terms and
// never asks for student data. Every rule here is from that note, with its source; a country the note did not research
// is "other" and gets the general rules only, so no unsourced rule ever reaches a prompt.

export const COUNTRIES = ["MY", "SG", "GB", "US", "EU", "AU", "IN", "OTHER"] as const;
export type Country = (typeof COUNTRIES)[number];
export const isCountry = (v: unknown): v is Country => (COUNTRIES as readonly unknown[]).includes(v);

export interface Source { label: string; url: string; kind: "P" | "S" } // P primary, S secondary, as in the note
export interface Ruleset {
  label: string;
  framework: string | null; // the accreditation or quality framework course outcomes are written for
  dataLaw: string; // the personal data law, with the duties that reach Lyceum
  aiRule: string; // what the country's rules say about AI in teaching and its disclosure
  sources: Source[];
}

const UTM = { label: "UTM Academic Circular 3/2024, GenAI in teaching and learning", url: "https://cdex-apps.utm.my/files/guidelines/Guidelines-for-the-Use-of-Generative-Artificial-Intelligence-in-Teaching-and-Learning-UTM.pdf", kind: "P" } as const;

export const RULESETS: Record<Country, Ruleset> = {
  MY: {
    label: "Malaysia",
    framework: "MQA's Code of Practice for Programme Accreditation (COPPA, 2nd edition, 2017): course learning outcomes (CLOs) at Bloom levels, mapped to programme learning outcomes (PLOs)",
    dataLaw: "Personal Data Protection Act 2010, amended 2024: a breach is notified to the Commissioner within 72 hours and to affected people within 7 days; data sent abroad needs equivalent protection",
    aiRule: "MOHE's 2024 GenAI guidelines leave each university its own rules. UTM Circular 3/2024 asks staff to tell students how GenAI is used in assessments (2.2.3), to list AI use with developer, tool, version, access date and URL (2.3.3), and counts undisclosed use as plagiarism (2.3.7)",
    sources: [
      { label: "MQA COPPA, 2nd edition (2017)", url: "https://office.iium.edu.my/kca/wp-content/uploads/2024/09/COPPA-2nd-Edition-Nov-2017.pdf", kind: "P" },
      UTM,
      { label: "PDPA amendments in force (Baker McKenzie)", url: "https://insightplus.bakermckenzie.com/bm/data-technology/malaysia-personal-data-protection-amendment-act-2024-to-come-into-force", kind: "S" },
      { label: "Breach notification guideline (DLA Piper)", url: "https://privacymatters.dlapiper.com/2025/03/malaysia-guidelines-issued-on-data-breach-notification-and-data-protection-officer-appointment/", kind: "S" },
    ],
  },
  SG: {
    label: "Singapore",
    framework: null,
    dataLaw: "Personal Data Protection Act 2012; the PDPC's Advisory Guidelines on personal data in generative AI (July 2026) ask that data use is explained at each stage",
    aiRule: "No education-specific AI rule was found",
    sources: [{ label: "PDPC GenAI guidelines (IAPP)", url: "https://iapp.org/news/a/singapore-launches-ai-training-data-guidelines-expands-pets-resources", kind: "S" }],
  },
  GB: {
    label: "United Kingdom",
    framework: "the UK Quality Code (QAA), which asks providers to engage employers at all stages of course design and review",
    dataLaw: "UK GDPR; the ICO treats a supplier that decides its own purposes as a controller",
    aiRule: "The DfE's Generative AI product safety standards (updated 19 January 2026), written for schools and used by buyers",
    sources: [
      { label: "QAA, External Expertise", url: "https://www.qaa.ac.uk/docs/qaa/quality-code/advice-and-guidance-external-expertise.pdf", kind: "P" },
      { label: "DfE GenAI product safety standards (Stone King)", url: "https://quickreads.stoneking.co.uk/post/102m2ic/the-dfe-updates-its-gen-ai-product-safety-standards", kind: "S" },
    ],
  },
  US: {
    label: "United States",
    framework: "ABET criteria for engineering and computing programmes, where they apply",
    dataLaw: "FERPA's school-official exception: student records are used only for the school's purpose, under its control, with no secondary use such as model training",
    aiRule: "No federal rule on AI in teaching was found; ADA Title II requires WCAG 2.1 AA for public institutions' digital content from April 2027 (large) or April 2028 (smaller)",
    sources: [
      { label: "FERPA and AI edtech (Promise Legal)", url: "https://blog.promise.legal/ferpa-ai-edtech-student-data-privacy/", kind: "S" },
      { label: "ADA Title II deadline", url: "https://www.alaska.edu/news/it/2026-ada-deadline-extension.php", kind: "P" },
    ],
  },
  EU: {
    label: "European Union",
    framework: "the European Standards and Guidelines (ESG 2015), which ask programmes to be monitored and reviewed against the needs of students and society",
    dataLaw: "GDPR",
    aiRule: "The AI Act: AI that evaluates learning outcomes is high-risk from 2 December 2027, and AI-generated content must be disclosed under Article 50 since 2 August 2026",
    sources: [
      { label: "ESG 2015", url: "https://www.enqa.eu/wp-content/uploads/2015/11/ESG_2015.pdf", kind: "P" },
      { label: "AI Act high-risk delay (Gibson Dunn)", url: "https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/", kind: "S" },
    ],
  },
  AU: {
    label: "Australia",
    framework: "the Higher Education Standards Framework 2021 (TEQSA)",
    dataLaw: "Privacy Act 1988",
    aiRule: "TEQSA asks each provider for a GenAI action plan, and the provider answers for data security, privacy and IP in its AI use",
    sources: [{ label: "TEQSA, GenAI strategies", url: "https://www.teqsa.gov.au/guides-resources/resources/corporate-publications/gen-ai-strategies-australian-higher-education-emerging-practice", kind: "P" }],
  },
  IN: {
    label: "India",
    framework: "NAAC accreditation, which asks for structured feedback on the syllabus from students, teachers, employers and alumni",
    dataLaw: "Digital Personal Data Protection Act and Rules 2025, main duties from 14 May 2027",
    aiRule: "No education-specific AI rule was found",
    sources: [{ label: "DPDP phased rollout (AZB)", url: "https://www.azbpartners.com/bank/indias-digital-personal-data-protection-act-phased-rollout-and-key-compliance-milestones/", kind: "S" }],
  },
  OTHER: {
    label: "Another country",
    framework: null,
    dataLaw: "Your country's data protection law; Lyceum has no researched rules for it yet",
    aiRule: "Your institution's own rules on AI in teaching",
    sources: [],
  },
};

const GROUNDING = [
  "Never include, ask for or infer any student's personal data (names, IDs, emails, individual marks); work with group-level figures only.",
  "Use only the material in this request. When it does not say something, say so; never invent a source, a figure or a quotation.",
  "What you write is a draft: the lecturer reviews it and declares its AI use to students.",
];

/** The block added to every helper's system prompt (api/record.ts). country null: not set yet, the general rules only. */
export function promptContext(country: Country | null, helper: string): string {
  const r = country ? RULESETS[country] : null;
  const place = r && country !== "OTHER" ? r.label : null;
  const lines = ["Context from Lyceum:"];
  if (place) lines.push("- The lecturer teaches in " + place + "." + (r!.framework ? " Course outcomes follow " + r!.framework + "; use its terms." : ""));
  if (place && helper === "scout") lines.push("- Prefer vacancies located in " + place + " unless the brief names another place.");
  if (place) lines.push("- Data protection: " + r!.dataLaw + ".");
  lines.push(...GROUNDING.map((g) => "- " + g));
  return lines.join("\n");
}

/** One AI use citation, in the form UTM Circular 3/2024 2.3.3 asks for: Developer (Year). Tool (Version). Retrieved
 *  [date] from [URL]. The developer is the model id's owner (before the slash), else the provider. */
export function aiCitation(model: { provider: string; model: string; baseUrl: string }, at: Date): string {
  const [owner, name] = model.model.includes("/") ? model.model.split("/", 2) : [model.provider, model.model];
  const date = at.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return owner + " (" + at.getUTCFullYear() + "). " + name + " (" + model.model + "). Retrieved " + date + " from " + model.baseUrl + ", through Lyceum.";
}

/** The statement an export ends with: each citation once, or nothing when no AI draft was used. */
export function aiUseStatement(citations: Array<string | undefined>): string[] {
  const list = [...new Set(citations.filter((c): c is string => Boolean(c)))];
  return list.length ? ["## AI use statement", "", "Parts of this document were drafted with generative AI and reviewed by the lecturer:", "", ...list.map((c) => "- " + c), ""] : [];
}

// ---------- student data, before any model reads a file ----------
const IDENTITY = /(name|nama|matric|matrik|student\s*(id|no|number)|^\s*id\s*$|e-?mail|\bic\b|nric|passport|phone|telefon)/i;
const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
/** A parsed file with the columns that identify students taken out (by their header: name, matric or student ID, email,
 *  IC, phone) and each such row numbered Student 1, 2, ... instead, and any email address in the text blanked. Marks are
 *  all Intake needs; who earned them is not. removed lists the headers taken out, for the upload screen to say. */
export function withoutStudentIdentity<D extends { pages: Array<{ index: number; text: string }>; tables: Array<{ name: string; rows: string[][] }> }>(doc: D): { doc: D; removed: string[] } {
  const removed = new Set<string>();
  const tables = doc.tables.map((t) => {
    const header = t.rows[0] ?? [];
    const drop = new Set(header.flatMap((h, i) => (IDENTITY.test(String(h)) ? [i] : [])));
    if (!drop.size) return t;
    drop.forEach((i) => removed.add(String(header[i]).trim()));
    const keep = (row: string[]) => row.filter((_, i) => !drop.has(i));
    return { ...t, rows: [["Student", ...keep(header)], ...t.rows.slice(1).map((r, n) => ["Student " + (n + 1), ...keep(r)])] };
  });
  const pages = doc.pages.map((p) => ({ ...p, text: p.text.replace(EMAIL, "[email removed]") }));
  return { doc: { ...doc, tables, pages }, removed: [...removed] };
}
