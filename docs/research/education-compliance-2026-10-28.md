# Research note: the education rules Lyceum must meet, Malaysia first, then elsewhere

Date: 28 October 2026. Compiled in a research session on 28 October 2026 from web searches; not legal advice. Key: **P** primary (a statute, regulator or institutional document); **S** secondary (a law firm, news report or commentary); **V** vendor. Where sources disagreed, the note says so; check the primary text before relying on a figure.

What Lyceum holds that these rules reach: lecturer accounts and profiles; course records (outlines, CLOs, attainment, surveys); job postings collected from boards; every model call, with its prompt and reply kept 30 days (`agent_calls`); every helper proposal and the lecturer's decision (`agent_proposals`); files in Cloudflare R2. The deciding question everywhere is whether **student personal data** (names, matric numbers, individual marks, survey answers) ever enters it.

## 1. Malaysia

### 1.1 Education regulation

- **Who regulates what.** MOHE governs public universities under the Universities and University Colleges Act 1971 and private institutions (UTP is private) under the Private Higher Educational Institutions Act 1996 (Act 555); MOHE ran compliance audits on 355 private institutions from 2019 to 2024. The MQA, under the MQA Act 2007, accredits programmes. None of these acts regulates software directly: they bind the institution, which passes its duties to vendors through procurement and its own policies. https://prophe.org/en/download/private-higher-educational-institutions-act-1996 **P**, https://www.thestar.com.my/news/nation/2024/11/11/more-than-100-ips-opened-against-private-higher-education-institutes-parliament-told **S**
- **COPPA, the Code of Practice for Programme Accreditation.** The current version is the 2nd edition (2017). MQA's 2024 "3C Rubric" (July 2024) regroups the existing standards for evaluation; it is not a 3rd edition. Area 2 covers assessment of student learning. COPPA (2017): https://office.iium.edu.my/kca/wp-content/uploads/2024/09/COPPA-2nd-Edition-Nov-2017.pdf **P**; Guidelines for Evaluation of Standard COPPA: https://ispkmedic.kk.usm.my/images/IEQA/BUKU%20PANDUAN/Guidelines%20for%20Evaluation%20%20of%20Standard%20COPPA.pdf **P**; UM QMAG 2/2024 on the rubric: https://ebook.um.edu.my/qmec/QMAG_Issue_2_2024/files/basic-html/page4.html **S**. The course file contents, MQA assessment plans and attainment KPIs are in `course-records-and-surveys-2026-10-22.md`.
- **Generative AI.** MQA Advisory Note 2/2023 asks institutions to write clear guidelines for staff and students and to keep reviewing them. MOHE's 2024 GenAI guidelines are a framework; each university writes its own guideline or SOP and handles misuse cases. No 2025 or 2026 national update was found. https://thesun.my/news/malaysia-news/people-issues/generative-ai-guidelines-help-universities-manage-technology-use/ **S**
- **A university guideline, read in full: UTM Academic Circular 3/2024 (from 27 March 2024).** https://cdex-apps.utm.my/files/guidelines/Guidelines-for-the-Use-of-Generative-Artificial-Intelligence-in-Teaching-and-Learning-UTM.pdf **P**
  - 2.2.3 "Academic staff should clearly communicate the use of GAI in course assessments to students."
  - 2.3.3 AI use "must be listed in assignments and works for T&L activities, including the developer information, tool name, tool version, access date, and URL link", in the form "Developer (Year). Tool Name (Version). Retrieved [Access Date] from [URL]".
  - 2.3.5 "Academic staff and students are responsible for ensuring the validity of the outcomes produced by GAI."
  - 2.3.7 "Any writing and works in teaching and learning activities that do not disclose the use of GAI (if applicable) can be categorised as plagiarism."
  - 2.4.6.2 and 2.4.6.3 count "data privacy management and protection systems" and "transparency in data, systems, and AI models" among the marks of a reliable tool.
  - UKM published its own guideline in 2025, cross-referencing UNESCO: https://www.ukm.my/spsfper/wp-content/uploads/2026/07/Lampiran-Garis-Panduan-GEN-AI-Universiti-Kebangsaan-Malaysia.pdf **P**. No UTP guideline is public.
- **AI-drafted quiz and exam items.** No Malaysian or international policy found sets a rule for AI-drafted assessment items. The common pattern (Kent, Greenwich, Oxford's 2025 policy as summarised) leaves AI use to whoever sets the assessment and requires it to be declared; misuse falls under academic misconduct. Under UTM 2.2.3 and 2.3.7, a lecturer who uses an AI-drafted item without saying so is exposed. https://www.thesify.ai/blog/ai-policies-for-professors-and-phd-supervisors-2025 **S**, https://www.trinka.ai/university-ai-policy-repository/university-of-kent **V**
- **AI governance in general.** MOSTI's National Guidelines on AI Governance and Ethics (AIGE, 20 September 2024): seven principles, voluntary. The National AI Office released an AI Governance Bill for consultation on 10 July 2026: risk-based, across the AI lifecycle; not passed. https://www.eversheds-sutherland.com/en/united-states/insights/ai-governance-bill-malaysias-next-step-towards-the-first-ai-rulebook **S**, https://aipolicytracker.org/policies/malaysia-the-national-guidelines-on-ai-governance-ethics **S**

### 1.2 Copyright in course materials and AI output

- **The lecturer's slides and outlines.** Under section 26(2) of the Copyright Act 1987, a work made in the course of employment belongs to the employer unless an agreement says otherwise. Whether course content a lecturer uploads to an LMS belongs to the university is debated; no Malaysian case decides it. Universities claim ownership in practice (UTM's IP declaration). https://lh-ag.com/wp-content/uploads/2022/11/Competing-Rights-to-Copyright-in-the-Virtual-Environment-IP-TMT-Tax-Week-20200923-1.pdf **S**, https://www.wipo.int/wipolex/en/text/597931 **P**
- **AI output.** The Deputy Minister has said work generated entirely by AI without significant human input is not protected under current law; MyIPO says the degree of human intervention decides it. MyIPO's consultation paper of 3 July 2026 asks who owns AI-assisted works and whether training on copyrighted material needs permission. No case law. https://www.thevibes.com/articles/news/125816/ministry-reviews-copyright-laws-to-balance-ai-innovation-and-creator-protection **S**, https://www.asiaiplaw.com/sector/copyright/ai-in-malaysia-can-ai-generated-works-be-copyrighted **S**, https://www.thestar.com.my/news/nation/2026/10/06/who-owns-ai-generated-work-forum-examines-copyright-challenges **S**
- **For Lyceum:** the terms should say the institution or lecturer keeps their materials, Lyceum uses them only to provide the service, and nothing is used to train models. A lecturer's edit to a suggestion is the human input that makes the result theirs, which `agent_proposals` already records.

### 1.3 Personal data (PDPA 2010, amended 2024)

- In force in phases: from 1 April 2025, processors must meet the security principle themselves, the country whitelist for transfers abroad is replaced by an equivalent-protection test, and penalties rise (up to RM1 million and 3 years). From 1 June 2025, controllers must appoint a DPO, notify breaches, and honour data portability. https://insightplus.bakermckenzie.com/bm/data-technology/malaysia-personal-data-protection-amendment-act-2024-to-come-into-force **S**
- Breach notification guideline (25 February 2025): the Commissioner within 72 hours of discovery; affected people within 7 days of that notice; a breach register kept 2 years. Sources disagree on which breaches qualify ("significant harm", or more than 1,000 people). https://privacymatters.dlapiper.com/2025/03/malaysia-guidelines-issued-on-data-breach-notification-and-data-protection-officer-appointment/ **S**, https://cms.law/en/sgp/legal-updates/new-guidelines-on-mandatory-breach-notifications-under-malaysia-s-personal-data-protection-act-2010 **S**
- Cross-border transfer guideline (29 April 2025): conditions, standard contractual clauses, binding corporate rules, certification, records. Supabase, the model provider and R2 are all transfers abroad. https://www.dlapiperdataprotection.com/?c=MY&t=law **S**

### 1.4 Procurement

- The federal Cloud First policy (2022) and MyGovCloud's Cloud Framework Agreement bind government agencies; whether a public university must buy through them, or under its own rules, was not established. UM's own off-the-shelf software procurement policy (2019) is an example of university rules. UTP, as a private university, follows its own. Ask each university's ICT or procurement unit. https://it.um.edu.my/doc/Policy/54%20Software%20(Off%20the%20shelf)%20Procurement%20Policy%20Ver%201.1.pdf **P**, https://lh-ag.com/?p=11549 **S**

## 2. Other countries

| Where | Education rule | Also applies | For Lyceum |
|:--|:--|:--|:--|
| US | FERPA "school official" exception: records used only for the school's purpose, under its direct control; no secondary use such as model training | ADA Title II, WCAG 2.1 AA, vendor content included: April 2027 for large public entities, April 2028 for smaller | Contract terms that flow down to the model provider; accessibility |
| EU | AI Act Annex III: AI that evaluates learning outcomes is high-risk, from 2 December 2027 (Omnibus 2026/1744) | GDPR; Article 50 transparency since 2 August 2026 | Keep attainment computed, not AI-judged; label AI drafts |
| UK | DfE Generative AI product safety standards (13, updated 19 January 2026), written for schools but used by buyers | UK GDPR; ICO: a supplier deciding its own purposes becomes a controller | Checklist for UK sales |
| Australia | TEQSA requires each provider to have a GenAI action plan; HESF 2021 makes the provider answer for data security, privacy and IP in its AI use | Privacy Act 1988 | Expect questions on how the tool fits the plan |
| India | DPDP Rules 2025: institutions partly exempt from parental consent for children's data | DPDP Act; main duties from 14 May 2027 | Little, while users are lecturers |
| Singapore | No education-specific rule found | PDPC Advisory Guidelines on personal data in GenAI (July 2026) | Explain data use at each stage |

Sources: FERPA https://blog.promise.legal/ferpa-ai-edtech-student-data-privacy/ **S**; ADA extension https://www.alaska.edu/news/it/2026-ada-deadline-extension.php **P**; EU https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/ **S**, https://www.joneswalker.com/en/insights/blogs/ai-law-blog/yes-august-2-still-matters-the-eu-approved-a-high-risk-ai-delay-but-most-trans.html **S**; UK https://quickreads.stoneking.co.uk/post/102m2ic/the-dfe-updates-its-gen-ai-product-safety-standards **S**, https://committees.parliament.uk/writtenevidence/163183/html/ **S**; Australia https://www.teqsa.gov.au/guides-resources/resources/corporate-publications/gen-ai-strategies-australian-higher-education-emerging-practice **P**; India https://www.azbpartners.com/bank/indias-digital-personal-data-protection-act-phased-rollout-and-key-compliance-milestones/ **S**; Singapore https://iapp.org/news/a/singapore-launches-ai-training-data-guidelines-expands-pets-resources **S**.

## 3. What this asks of Lyceum, in order

1. **An AI use statement per course.** UTM 2.3.3 wants developer, tool, version, access date and URL for AI-assisted T&L work, and 2.3.7 calls undisclosed use plagiarism. `agent_calls` already records provider, model and time, and `agent_proposals` what the lecturer accepted or edited: print a citation in UTM's format beside every accepted slide suggestion and quiz item, and in the course file export.
2. **Keep the lecturer in charge, and show it.** Nothing reaches students without acceptance (UTM 2.3.5; the EU high-risk line; university assessment-setting rules).
3. **Keep student personal data out where possible.** Group-level attainment instead of named marks avoids FERPA, most PDPA duties and the 30-day prompt retention holding student data. If raw marks are uploaded, strip names and IDs before a model call.
4. **Terms that answer copyright:** the institution or lecturer owns materials and outputs, use is only to provide the service, no training, on our side or the model provider's.
5. **A data protection pack for procurement:** privacy notice, DPA template, the list of subprocessors and where each stores data (for the cross-border rule), a breach plan that meets 72 hours and 7 days.
6. **Thresholds configurable per institution**, printed beside every attainment figure (already in the 22 October note).
7. **WCAG 2.1 AA** for any market beyond Malaysia.

## Gaps

- COPPA Area 2's wording on assessment moderation (the 2017 text itself, not read here).
- UTP's own GenAI guideline and IP policy: not public; ask the university.
- Whether public universities must buy cloud software through MyGovCloud.
- The breach notification threshold, from the guideline itself.
