# Research note: the doors, the skill taxonomies, the boards and the standards

Date: 22 October 2026. For the "one core, many doors" architecture: what the assistants universities run can connect to today, what the open Agent Skills standard makes possible, which skill taxonomies are free, which job boards have a documented public API, and which professional curriculum standards can stand as supply-side references. Facts were fetched from official pages in a research session on 22 October 2026 unless marked unverified.

## 1. MCP support in the assistants universities run

- **Copilot Studio.** MCP generally available since 29 May 2025 (Add a tool, search MCP server; generative orchestration required; Streamable HTTP, SSE deprecated). https://www.microsoft.com/en-us/microsoft-copilot/blog/copilot-studio/model-context-protocol-mcp-is-now-generally-available-in-microsoft-copilot-studio/. MCP tools in agent workflows generally available 15 July 2026. Licensing: needs the standalone Copilot Studio subscription with Copilot Credits; the Teams plan bundled in Microsoft 365 has no generative orchestration, so no MCP. https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-licensing-subscriptions
- **Microsoft 365 Copilot declarative agents.** MCP plugins are custom actions inside declarative agents; tools discovered at runtime; packaged with the Microsoft 365 Agents Toolkit. https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/overview-plugins. Agents go through submission and approval in the admin centre Agent Registry. https://learn.microsoft.com/en-us/microsoft-365/admin/manage/manage-copilot-agents-integrated-apps. The Copilot add-on is sold on Microsoft 365 A1, A3 and A5 for faculty, staff and students aged 13 and over. https://learn.microsoft.com/en-us/microsoft-365/copilot/copilot-license-options
- **ChatGPT.** Apps SDK announced 6 October 2025, built on MCP; launch apps included Coursera and Canva; preview for Business, Enterprise and Edu from 13 November 2025. https://openai.com/index/introducing-apps-in-chatgpt/. Admin turns on Developer mode, only owners and admins publish; Enterprise and Edu add role-based access. https://help.openai.com/en/articles/12584461-build-with-the-apps-sdk. Public directory: verified developer identity, OAuth or no-auth only, no API-key flow. https://developers.openai.com/apps-sdk/deploy/submission
- **Claude.** Custom connectors (remote MCP) on Free, Pro, Max, Team and Enterprise; on Team and Enterprise the Owner adds it under Organization settings, then each member authenticates. https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp. Claude for Education (2 April 2025) added a Canvas LTI and pre-built MCP connectors for Panopto and Wiley on 9 July 2025. https://www.anthropic.com/news/advancing-claude-for-education
- **Google.** Gemini Enterprise supports a "custom MCP server" data store; the admin must override the policy that blocks custom MCP stores, allow-list domains and register an OAuth client; Streamable HTTP only, public-CA TLS. https://docs.cloud.google.com/gemini/enterprise/docs/connectors/custom-mcp-server/set-up-custom-mcp-server. Consumer and Workspace Gemini app custom MCP: not confirmed. Gemini CLI extensions bundle MCP servers from any GitHub repo.

## 2. Agent Skills and comparable formats

- Claude Skills launched 16 October 2025 (Pro, Max, Team, Enterprise; Claude Code; API); 18 December 2025 added organisation-wide management and a partner skills directory. https://claude.com/blog/skills
- Open standard: SKILL.md with YAML front matter (name and description required; license, compatibility, metadata, allowed-tools optional) plus scripts, references and assets folders. https://agentskills.io/specification. Repository Apache-2.0 code, CC-BY-4.0 docs. https://github.com/agentskills/agentskills
- Client showcase lists 46 products: Claude, Claude Code, ChatGPT and Codex, GitHub Copilot, VS Code, Gemini CLI, Cursor, OpenCode, OpenHands, Goose, Kiro, Databricks, Snowflake, JetBrains Junie, Tabnine, Qodo, Roo Code, Mistral Vibe and others. https://agentskills.io/clients
- OpenAI: ChatGPT and Codex skills "build on the open agent skills standard"; distribution is a plugin (skills plus MCP plus optional UI) in the ChatGPT directory. https://learn.chatgpt.com/docs/build-skills
- Microsoft: Copilot Studio agents accept uploaded skill files or packages (9 September 2026). https://learn.microsoft.com/en-us/microsoft-copilot-studio/agents-experience/skills-overview. GitHub Copilot reads .github/skills, .claude/skills and .agents/skills. https://docs.github.com/en/copilot/concepts/agents/about-agent-skills
- Google: Gemini CLI supports the standard (`gemini skills install`). https://geminicli.com/docs/cli/skills/
- Verdict: a product can ship its workflow as one skill folder and it loads unchanged in Claude, ChatGPT and Codex, Copilot Studio, GitHub Copilot and Gemini CLI.

## 3. LMS integration standards

- LTI 1.3 Core plus LTI Advantage: Deep Linking 2.0, Names and Role Provisioning 2.0, Assignment and Grade Services 2.0, on OAuth 2.0, OIDC and JWT. https://standards.1edtech.org/lti/specifications/guides/implementation_guide/implementation-guide
- QTI 3.0 final 11 May 2022. https://www.1edtech.org/standards/qti/versions. Moodle XML quiz format. https://docs.moodle.org/en/Moodle_XML_format
- Canvas: LTI 1.3 configuration through Developer Keys; Dynamic Registration lets an admin paste one URL. https://developerdocs.instructure.com/services/canvas/external-tools/lti/file.lti_dev_key_config. Moodle: Site administration, Plugins, External tool, Manage tools, paste the registration URL. https://help.feedbackfruits.com/hc/en-us/articles/23527115832082-How-to-configure-LTI-1-3-for-Moodle
- 1EdTech certification is bundled with paid Alliance membership; prices not published. https://www.1edtech.org/certification/lti
- Teams for Education: Graph education APIs (rostering, assignments, submissions) with admin consent. https://learn.microsoft.com/graph/education-concept-overview. Google Classroom add-ons: Workspace Marketplace, Teaching and Learning or Plus licences, domain allow-list. https://developers.google.com/classroom/add-ons

## 4. Open skill taxonomies and APIs

- **ESCO (EU).** 3,039 occupations, 13,939 skills, 28 languages; v1.2.1 (10 December 2025); free download in CSV, JSON-LD, RDF and XML; hosted web API and a local API (EUPL 1.2). Reuse under CC BY 4.0 with attribution. https://esco.ec.europa.eu/en/use-esco/download and https://esco.ec.europa.eu/en/use-esco/use-esco-services-api
- **O*NET (US).** Database 31.0 under CC BY 4.0; Web Services free with registration and attribution; paid applications need written permission. https://www.onetcenter.org/database.html and https://services.onetcenter.org/help/license_data
- **Lightcast Open Skills.** 33,000 or more skills; the free tier is for non-profit and public-good work only (50 extractions a month, by approval); "A commercial license is required for for-profit or production use cases." https://docs.lightcast.io/lightcast-api/docs/api-access
- **Singapore.** Sector Skills Frameworks on skillsfuture.gov.sg; course datasets on data.gov.sg under the Open Data Licence; the SSG developer portal listed no APIs when fetched. https://www.skillsfuture.gov.sg/skills-framework/ict
- **UK.** Skills England dashboards under OGL v3.0; the DfE and IfATE Standard Skills Classification is a project, not a published dataset. https://www.gov.uk/government/collections/job-and-skills-data
- **Australia.** The Australian Skills Classification was decommissioned (removed January 2025); the National Skills Taxonomy is in consultation. https://www.jobsandskills.gov.au/work/australian-skills-classification
- **Malaysia.** MyMahir (TalentCorp) lists 800 or more skills and links to the Critical Occupations List; no API or licence stated. https://mymahir.my/
- **Nesta.** ojd_daps_skills maps advert text to ESCO or Lightcast, MIT licence; data releases stopped in 2022. https://github.com/nestauk/ojd_daps_skills
- **ILO ISCO-08.** Four-level occupation classification, free to use without prior authorisation.

## 5. Legitimate job-posting sources

- **Ashby.** GET api.ashbyhq.com/posting-api/job-board/{board}, no credentials shown, full descriptions. https://developers.ashbyhq.com/docs/public-job-posting-api
- **Workable.** Public endpoint api/accounts/:subdomain returns an account's public jobs. https://workable.readme.io/
- **SmartRecruiters.** Posting API for customer career sites; per-company postings reported keyless where the customer enables it (unverified). https://developers.smartrecruiters.com/docs/posting-api
- **Workday.** No documented public API; treat as unavailable.
- **Adzuna.** REST API with app id and key by registration; quotas in the registration terms. https://developer.adzuna.com/overview
- **USAJOBS.** Free key; public data may be copied, analysed and redistributed, attribution encouraged. https://developer.usajobs.gov/guides/terms-of-service
- **EURES.** No documented public API found; do not rely on it.
- **Indeed.** Publisher API retired 2023; terms forbid scraping. https://www.indeed.com/legal. **LinkedIn.** User Agreement 8.2 bans scraping and bots. https://www.linkedin.com/legal/user-agreement
- **schema.org JobPosting.** Google requires datePosted, description, hiringOrganization, jobLocation and title on single-job pages; employer career pages that publish it are a legitimate structured source. https://developers.google.com/search/docs/appearance/structured-data/job-posting

## 6. Supply-side curriculum standards

- CS2023 (ACM, IEEE-CS, AAAI), January 2024. https://csed.acm.org/
- ACM Computing Competencies for Undergraduate Data Science Curricula, 2021; a successor is being presented in 2026. https://dstf.acm.org/
- SFIA 9, 30 October 2024; free for internal and personal use, a fee-bearing Partner Licence to sell products that use SFIA. https://sfia-online.org/en/about-sfia/licensing-sfia
- NICE Cybersecurity Workforce Framework, NIST SP 800-181r1 plus components in JSON. https://www.nist.gov/itl/applied-cybersecurity/nice/nice-framework-resource-center/nice-framework-current-versions
- CDIO Syllabus 3.0 and Standards 3.0. https://research.chalmers.se/en/publication/534193
- IEA Graduate Attributes and Professional Competencies v4 (Washington Accord). https://www.internationalengineeringalliance.org/accords/washington-accord
- AACSB 2026 Global Standards (Standards 4, 5 and 6). https://www.aacsb.edu/educators/accreditation/business-accreditation/aacsb-business-accreditation-standards. EQUIS Standards. https://www.efmdglobal.org/accreditations/business-schools/equis/

## 7. The doors are real: examples, 2024 to 2026

- Coursera shipped as an app inside ChatGPT at the Apps SDK launch, 6 October 2025.
- Claude for Education: Canvas LTI plus Panopto and Wiley MCP connectors, 9 July 2025.
- University of Hong Kong: a first-year undergraduate Copilot built in Copilot Studio (Microsoft customer story, 27 January 2025). https://www.microsoft.com/en/customers/story/21598-the-university-of-hong-kong-microsoft-365-copilot
- Florida State University faculty course assistants in Copilot Studio (29 August 2024). https://its.fsu.edu/node/15491. Teesside University staff guide to module agents (July 2025). https://eatsupport.tees.ac.uk/staff/knowledgebase/building-ai-agents-with-microsoft-copilot/
- EduBase (assessment platform) ships a remote MCP server for claude.ai (2026). https://www.edubase.net/news/feed/51/Connect-EduBase-with-Claude-in-Under-a-Minute-The-Complete-MCP-Integration-Guide-2026-Update
- Canvas and Moodle MCP servers exist as community projects on personal API tokens; no official MCP repository under instructure, moodle or openedx on 22 October 2026.

## What this means for Lyceum's architecture

1. One remote MCP server (Streamable HTTP, HTTPS with a public CA, OAuth 2.0, or no-auth for read-only tools) is the single door into Claude, ChatGPT, Copilot Studio, Microsoft 365 Copilot declarative agents and Gemini Enterprise.
2. Do not build SSE; Copilot Studio and Gemini Enterprise have dropped it, and ChatGPT's directory has no API-key path.
3. Ship a Lyceum skill folder (SKILL.md plus scripts) under the open standard; the same files load in Claude, Codex and ChatGPT plugins, Copilot Studio, GitHub Copilot and Gemini CLI.
4. Package the same core as a ChatGPT plugin and as a Microsoft 365 declarative agent, and publish per-vendor admin steps, because every door is admin-gated.
5. The LMS door is LTI 1.3 with Deep Linking (push packs into Canvas and Moodle) plus QTI 3.0 and Moodle XML exports for quizzes; 1EdTech certification waits for revenue.
6. Key quotations to ESCO (CC BY 4.0, 28 languages) with an O*NET crosswalk and ISCO-08 codes; keep Lightcast optional because commercial use needs a licence.
7. Sources stay Greenhouse, Lever, Ashby, Workable, SmartRecruiters, USAJOBS and Adzuna, plus schema.org JobPosting from employer career pages; never LinkedIn, Indeed or Workday feeds.
8. Supply-side references (CS2023, SFIA 9, NICE, CDIO, Washington Accord, AACSB 2026) give the lecturer a legitimate baseline for what a course should contain.
9. Put licences on the diagram: Copilot Studio needs its own subscription; Lightcast and SFIA commercial use need licences; ESCO, O*NET and USAJOBS are free with attribution.
10. The proof for judges that the doors are real: Coursera inside ChatGPT, Wiley and Panopto inside Claude for Education, HKU's agent inside Copilot Studio.
