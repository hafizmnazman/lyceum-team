# Research note: statistics for Lyceum

Date: 22 October 2026. The owner's question: can a survey of a few students stand for the whole cohort, and can the CLO survey and the marks together predict acceptance and expected mastery, quantitative and qualitative at once? This note names the standard method for each part, what it needs, and when Lyceum must say "unknown". References were checked in a research session on 22 October 2026 against publisher or DOI records; class-size figures are computed from the cited formulas.

## 1. Sample size to represent a finite population

- **Cochran with the finite population correction.** n0 = z²p(1 - p)/e², then n = n0 / (1 + (n0 - 1)/N). With p = 0.5, 95% confidence, ±5 points: n0 = 385. Krejcie and Morgan (1970) tabulate the same arithmetic. The rule bounds sampling error only; it needs random sampling, or a census with random non-response. Cochran, Sampling Techniques, 3rd ed., Wiley. Krejcie and Morgan, EPM 30(3), 607-610. https://doi.org/10.1177/001316447003000308
- **What a class needs at ±5 points, 95%:** N = 40 needs 36 or 37 responses (90% of the class); N = 120 needs 92 (77%); N = 300 needs 169 (56%). With 20 of 40 responding, the corrected margin on a proportion is about ±16 points; 60 of 120 gives ±9; 100 of 300 gives ±8.
- **A census beats a sample for small classes.** Israel (University of Florida IFAS) calls a census attractive below roughly 200. https://ask.ifas.ufl.edu/publication/PD006. Nulty (2008) says the same for course evaluations, with a liberal standard (80%, ±10) and a stringent one (95%, ±3). Assessment and Evaluation in Higher Education 33(3), 301-314. https://doi.org/10.1080/02602930701293231
- **Non-response bias (Groves).** Bias = non-response rate × (responders minus non-responders on the measured thing): a low rate only hurts when the two groups differ, and a high rate is no guarantee. Groves 2006, POQ 70(5). https://doi.org/10.1093/poq/nfl033. Groves and Peytcheva 2008, 59 studies, POQ 72(2). https://doi.org/10.1093/poq/nfn011. Practice: compare responders with the full class on marks and show the difference.

## 2. Interval estimates for small samples

- **Wilson score** for proportions. Centre (p̂ + z²/2n)/(1 + z²/n), half-width z/(1 + z²/n) × sqrt(p̂(1 - p̂)/n + z²/4n²). Wilson 1927, JASA 22(158). https://doi.org/10.1080/01621459.1927.10502953
- **Agresti-Coull.** Add two successes and two failures, then the plain interval. The American Statistician 52(2). https://doi.org/10.1080/00031305.1998.10480550
- **Which one.** Brown, Cai and DasGupta: never Wald; Wilson or Jeffreys (Beta(x + ½, n - x + ½) quantiles) for n ≤ 40, Agresti-Coull above. Statistical Science 16(2), 101-133. https://doi.org/10.1214/ss/1009213286. Keep Lyceum's Wilson, times sqrt((N - n)/(N - 1)) for a census with non-response.
- **t-interval for means** (1 to 10 ratings, SSRT): mean ± t(n - 1) × s/√n. Student 1908, Biometrika 6(1). https://www.jstor.org/stable/2331554
- **Bootstrap** (percentile or BCa) for medians and CLO-weighted marks: resample the n students, B ≥ 1,000; unreliable near n = 10. Efron 1979, Annals of Statistics 7(1). https://doi.org/10.1214/aos/1176344552

## 3. Borrowing strength for small cohorts

- **Multilevel model, partial pooling.** A cohort's per-CLO estimate is a precision-weighted blend of its own mean and the programme or past-cohort mean: θ̂_j ≈ (n_j ȳ_j/σ² + μ/τ²)/(n_j/σ² + 1/τ²). Needs several comparable groups (sections, past semesters) to estimate the between-group variance. Gelman and Hill 2007, ch. 12. http://www.stat.columbia.edu/~gelman/arm/. Empirical Bayes: Efron and Morris 1975, JASA 70(350). Small-area estimation adds covariates: Rao and Molina 2015, Wiley.
- **What it buys a 25-student cohort.** A raw CLO proportion at n = 25 has a Wilson half-width near ±19 points; pooled with three earlier cohorts it typically lands near ±10. Caveat: shrinkage hides a real break unless the redesign is a covariate, so always show raw beside pooled.

## 4. Measuring mastery

- **Rasch (1PL) and 2PL IRT.** P(correct) = logistic(θ - b) or logistic(a(θ - b)). Minimum calibration samples (Linacre 1994, Rasch Measurement Transactions 7(4), 328, https://www.rasch.org/rmt/rmt74m.htm): 30 persons for item difficulty within ±1 logit at 95%; 100 for ±0.5 logit; 250 or more for high-stakes use; polytomous items need 10 observations per category. 2PL needs 150 to 750 depending on test length (Şahin and Anil 2017, https://open.metu.edu.tr/handle/11511/65131); 3PL needs thousands. A 40-student semester cannot calibrate items: the Rasch spine stays illustrative until items are pooled across cohorts.
- **Bayesian Knowledge Tracing.** A hidden Markov model per skill; needs attempt sequences per student per skill, not end-of-semester marks. Corbett and Anderson 1995. https://doi.org/10.1007/BF01099821
- **Mastery learning (Bloom 1968).** Over 90% of students can reach mastery when time and feedback vary; practice uses 80 to 90% on a criterion-referenced test. https://eric.ed.gov/?id=ED053419
- **Standard setting.** Angoff: each judge estimates the probability that a minimally competent student answers each item; the sum is the cut score. Bookmark: items ordered by difficulty, judges mark where a borderline student's chance drops below about 0.67. Cizek and Bunch 2007, SAGE. Panel size 10 to 15 judges, from Hurtz and Hertz 1999, EPM 59(6). https://doi.org/10.1177/00131649921970233
- **Umbrella standard.** AERA, APA and NCME, Standards for Educational and Psychological Testing (2014): validity, reliability and fairness for a stated use. https://www.testingstandards.net/

## 5. Self-reported mastery against assessed attainment

- Sitzmann, Ely, Brown and Bauer 2010 (meta-analysis): self-assessed knowledge tracks motivation and satisfaction more than measured learning; the learning link is only moderate. AMLE 9(2). https://doi.org/10.5465/AMLE.2010.51428542
- Kruger and Dunning 1999: bottom-quartile performers overrate themselves. https://doi.org/10.1037/0022-3514.77.6.1121. Gignac and Zajenkowski 2020: much of that pattern is regression to the mean. https://doi.org/10.1016/j.intell.2020.101449
- Uttl, White and Gonzalez 2017: no meaningful correlation between student ratings of teaching and learning once small-study bias is removed. https://doi.org/10.1016/j.stueduc.2016.08.007
- Practice: report perception (self-rating, SSRT) and attainment (CLO-mapped marks) as separate series with intervals and show the gap; never average them into one mastery number.

## 6. Predicting the effect of a course change

- **Naive baseline.** Next cohort = last cohort; simple methods "serve as benchmarks rather than the method of choice". Hyndman and Athanasopoulos, FPP3, ch. 5. https://otexts.com/fpp3/simple-methods.html
- **Difference-in-differences.** (changed course after minus before) minus (comparison course after minus before); needs an unchanged comparison course and a cohort each side; assumes parallel trends. Card and Krueger 1994. https://www.jstor.org/stable/2118030
- **Interrupted time series.** Segmented regression over a run of cohorts; needs several cohorts on each side. Bernal, Cummins and Gasparrini 2017. https://doi.org/10.1093/ije/dyw098
- **Pre-registration.** Freeze the predicted numbers, metric and analysis before the semester's data arrive. Nosek et al 2018, PNAS. https://doi.org/10.1073/pnas.1708274114
- **Calibration.** Brier score (1/N) Σ (f - o)²; reliability diagram (Murphy and Winkler 1977, https://doi.org/10.2307/2346866); maximise sharpness subject to calibration (Gneiting, Balabdaoui and Raftery 2007, https://doi.org/10.1111/j.1467-9868.2007.00587.x).
- **"Acceptance" as a construct.** Technology Acceptance Model: perceived usefulness and perceived ease of use, two validated six-item scales (Davis 1989, MIS Quarterly 13(3), https://doi.org/10.2307/249008). Kirkpatrick's levels separate Reaction from Learning; Alliger et al 1997: reactions are only weakly related to learning. https://doi.org/10.1111/j.1744-6570.1997.tb00911.x

## 7. Combining qualitative and quantitative

- **Thematic analysis**, six phases. Braun and Clarke 2006. https://doi.org/10.1191/1478088706qp063oa
- **Inter-rater reliability.** Cohen's κ. https://doi.org/10.1177/001316446002000104. Landis and Koch bands are convention, not evidence. Protocol (double-code a subset, report κ, reconcile the codebook): O'Connor and Joffe 2020. https://doi.org/10.1177/1609406919899220
- **Integration.** Convergent mixed-methods design (Creswell and Plano Clark 2017); triangulation protocol with a convergence matrix per theme (O'Cathain, Murphy and Nicholl 2010, BMJ 341:c4587, https://doi.org/10.1136/bmj.c4587).
- **LLM coding of open comments.** Pangakis, Wolken and Fasching 2023: performance is "highly contingent" on the task, so every run must be validated against human labels. https://arxiv.org/abs/2306.00176. Törnberg 2024 gives the protocol: codebook, structured prompts, stability checks, validation. https://doi.org/10.6092/issn.1971-8853/19461. A 2025 study: only a fine-tuned model reached macro-F1 0.87, and models mishandle "don't know" codes. https://arxiv.org/abs/2506.14634. Lyceum protocol: a human gold set of 100 to 200 comments, κ shown in the UI, human sign-off, re-validation on any prompt or model change.

## 8. Standards and ethics

- JISC Code of Practice for Learning Analytics: responsibility, transparency and consent, privacy, validity, access, minimising adverse impacts, stewardship. https://www.jisc.ac.uk/guides/code-of-practice-for-learning-analytics
- DELICATE checklist, Drachsler and Greller 2016. https://doi.org/10.1145/2883851.2883893. Prinsloo and Slade 2017, Handbook of Learning Analytics ch. 4. https://doi.org/10.18608/hla17.004
- GDPR Article 22: a right not to be subject to a decision based solely on automated processing with significant effects. https://gdpr-info.eu/art-22-gdpr/. A per-student predicted mastery that triggers an intervention needs meaningful human review; cohort-level predictions do not engage it.
- Malaysia PDPA 2010 (Act 709), seven principles; the 2024 amendment adds a data protection officer duty, breach notification and portability, with no Article 22-style right found. https://www.pdp.gov.my/. Treat per-student predictions as profiling anyway.

## Recommended stack for Lyceum

| cohort | survey | per-CLO estimate | mastery calibration | prediction | label unknown when |
|:--|:--|:--|:--|:--|:--|
| under 60 | census; show n of N; FPC-adjusted Wilson and t | partial pooling with past cohorts, raw beside pooled | none; the Rasch spine stays "illustrative" | naive baseline only | responses below the Krejcie-Morgan figure; fewer than 2 prior cohorts |
| 60 to 200 | census target; Nulty stringent standard | same, pooled across sections | Rasch at 100+ responses per item, stable at 150+; no 2PL | difference-in-differences with an unchanged comparison course | no comparison course; fewer than 3 cohorts |
| over 200, or semesters pooled | Agresti-Coull is fine | hierarchical over cohort × CLO | 2PL at 500+ with unchanged items; Angoff or Bookmark cut score, 10 to 15 judges | interrupted time series over 6+ cohorts, pre-registered, Brier-scored | under about 30 resolved predictions |

Always: perception and attainment shown separately with the gap; predictions frozen before data and scored against carry-forward; comments coded against a human gold set with κ shown; no solely automated per-student decisions; JISC and DELICATE as written policy.
