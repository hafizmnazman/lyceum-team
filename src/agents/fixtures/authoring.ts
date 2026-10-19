// Authoring agent fixture (spec Section 3, Section 10). The drafted revision of
// CS220 the agent proposes in the demo's hybrid mode, plus the critique it raises
// when reviewing a human draft.

import type { ChangeProposal } from "../../types.ts";

export const AUTHORING_DRAFT_FIXTURE: ChangeProposal["draft"] = {
  topics: [
    "Gradient descent and the logistic loss",
    "Regularisation (L1 / L2)",
    "Model evaluation: ROC, precision/recall",
    "Feature scaling and the role of linear algebra",
  ],
  cloChanges: [
    {
      cloId: "CLO4",
      op: "edit",
      text: "Build, train and evaluate a machine-learning model, and explain the linear-algebra foundations it relies on.",
      bloomLevel: "Analyse",
    },
  ],
  testDraft:
    "Q. Derive the gradient of the logistic loss with respect to the weight vector, and state the matrix form of one gradient-descent step.",
  labDraft:
    "Lab: implement logistic regression from scratch on a small dataset; compare against scikit-learn and discuss why feature scaling matters.",
};

export const AUTHORING_CRITIQUE_FIXTURE: string[] = [
  "CLO4 reaches the matrix form of gradient descent, which assumes linear algebra the cohort has not met yet; flag the MA201 prerequisite.",
  "The test draft is sound but add one item at the Apply level so the outcome is not assessed only at Analyse.",
  "The lab is well scoped; name the dataset so it is reproducible.",
];
