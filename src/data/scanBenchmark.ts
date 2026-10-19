// A small labelled benchmark for the requirement scan: sentences in the style
// of job postings, the skills a careful reader would tag from a fixed lexicon,
// and how strongly the sentence asks for them. Hand-labelled on 11 October 2026.
// It measures the deterministic scan, not a model.

import type { MentionRequirement } from "../types.ts";

export interface BenchmarkSentence { text: string; skills: string[]; level: MentionRequirement }

export const BENCHMARK_LEXICON = ["SQL", "Python", "dashboards|dashboard", "stakeholders|stakeholder", "statistics|statistical", "Excel", "Tableau", "machine learning|ML", "communication|communicate", "R"];

export const SCAN_BENCHMARK: BenchmarkSentence[] = [
  { text: "You must be fluent in SQL and comfortable writing complex joins.", skills: ["SQL"], level: "required" },
  { text: "Experience with Python for data pipelines is required.", skills: ["Python"], level: "required" },
  { text: "Familiarity with Tableau or similar dashboards is a plus.", skills: ["Tableau", "dashboards"], level: "preferred" },
  { text: "You will present findings to senior stakeholders every week.", skills: ["stakeholders"], level: "unclear" },
  { text: "A strong statistical foundation, including regression, is essential.", skills: ["statistics"], level: "required" },
  { text: "Advanced Excel modelling is preferred but not mandatory.", skills: ["Excel"], level: "preferred" },
  { text: "We ideally want someone who has shipped a machine learning model to production.", skills: ["machine learning"], level: "preferred" },
  { text: "Clear written communication matters as much as analysis.", skills: ["communication"], level: "unclear" },
  { text: "Knowledge of R is a bonus; most of our work is in Python.", skills: ["R", "Python"], level: "preferred" },
  { text: "Build and maintain dashboards that leaders use daily.", skills: ["dashboards"], level: "unclear" },
  { text: "The role needs daily SQL against our warehouse.", skills: ["SQL"], level: "required" },
  { text: "Minimum two years working with statistical software.", skills: ["statistics"], level: "required" },
  { text: "You will communicate results to non-technical partners.", skills: ["communication"], level: "unclear" },
  { text: "Experience with Excel pivot tables is desirable.", skills: ["Excel"], level: "preferred" },
  { text: "Expected: Python, SQL and a habit of documenting your work.", skills: ["Python", "SQL"], level: "required" },
  { text: "Our team owns the executive dashboard and its data quality.", skills: ["dashboards"], level: "unclear" },
  { text: "An ML background is nice to have for this analyst role.", skills: ["machine learning"], level: "preferred" },
  { text: "You will work with stakeholders across finance and risk.", skills: ["stakeholders"], level: "unclear" },
  { text: "Mandatory: a degree in statistics, mathematics or a related field.", skills: ["statistics"], level: "required" },
  { text: "Competitive salary and hybrid working arrangements.", skills: [], level: "unclear" },
  { text: "We value curiosity, rigour and respect for data privacy.", skills: [], level: "unclear" },
  { text: "Prior exposure to Tableau is helpful but we will train you.", skills: ["Tableau"], level: "unclear" },
  { text: "Python is required for this role.", skills: ["Python"], level: "required" },
  { text: "R is welcome but not expected.", skills: ["R"], level: "preferred" },
  { text: "Statistical thinking is a plus for this coordinator position.", skills: ["statistics"], level: "preferred" },
  // Harder cases: indirect mentions, negations, job titles and inflections. A
  // whole-word scan is expected to miss some of these; the misses are the point,
  // and they are why the lecturer confirms every proposal.
  { text: "You will write complex queries against our Postgres warehouse every day.", skills: ["SQL"], level: "required" },
  { text: "Build and evaluate models with scikit-learn and PyTorch.", skills: ["machine learning", "Python"], level: "required" },
  { text: "No SQL is needed; the data arrives pre-aggregated.", skills: [], level: "unclear" },
  { text: "Present findings to the leadership team and defend your recommendations.", skills: ["communication"], level: "required" },
  { text: "Familiarity with R Markdown for reproducible reports.", skills: ["R"], level: "unclear" },
  { text: "Strong Excel skills, including pivot tables, are a must.", skills: ["Excel"], level: "required" },
  { text: "We use Python 3.11; prior experience is not required as we will train you.", skills: ["Python"], level: "unclear" },
  { text: "Dashboarding tools such as Power BI or Looker are part of the daily work.", skills: ["dashboards"], level: "required" },
  { text: "Experience communicating statistical results to non-specialists is essential.", skills: ["communication", "statistics"], level: "required" },
  { text: "Tableau Certified Data Analyst credential preferred.", skills: ["Tableau"], level: "preferred" },
  { text: "Machine Learning Engineer, Platform team (contract).", skills: [], level: "unclear" },
  { text: "Mentor junior analysts in SQL best practices.", skills: ["SQL"], level: "required" },
];
