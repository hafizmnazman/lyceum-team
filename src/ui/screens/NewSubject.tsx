// New subject (spec 6.5): one focused form. The department scopes a proposed
// subject, hands it to a coordinator, and the cold start is explained plainly:
// the Analogy agent will ground the first test on a proxy cohort.

import { useState } from "react";
import { createSubject, navigate, useStore } from "../../app/store.ts";
import {
  Button,
  EmptyState,
  Field,
  Input,
  Page,
  PageHead,
  Select,
  Textarea,
} from "../primitives/index.tsx";

const CODE_RE = /^[A-Z]{2,4}\d{3}$/;

export function NewSubjectScreen() {
  const state = useStore();
  const academics = state.people.filter((p) => p.orgRole === "academic");

  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("1");
  const [semester, setSemester] = useState("1");
  const [coordinatorId, setCoordinatorId] = useState("");
  const [cloText, setCloText] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function clearError(key: string) {
    setErrors((e) => {
      if (!(key in e)) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    const c = code.trim();
    if (!c) errs.code = "A subject code is required.";
    else if (!CODE_RE.test(c)) errs.code = "Use two to four capital letters then three digits, like CS310.";
    else if (state.subjects.some((s) => s.id === c)) errs.code = "That code is already in use.";
    if (!title.trim()) errs.title = "A title is required.";
    if (!coordinatorId) errs.coordinator = "Choose a coordinator.";
    if (!cloText.trim()) errs.clo = "Write the first learning outcome.";
    return errs;
  }

  function submit() {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    createSubject({
      id: code.trim(),
      title: title.trim(),
      year: Number(year),
      semester: Number(semester),
      coordinatorId,
      cloText: cloText.trim(),
    });
    navigate("assignments");
  }

  if (academics.length === 0) {
    return (
      <Page>
        <PageHead title="New subject" context="Scope a proposed subject and hand it to a coordinator." />
        <EmptyState
          title="No academics to coordinate it"
          body="A new subject needs a coordinator. Add academic staff first, then scope the subject here."
        />
      </Page>
    );
  }

  return (
    <Page>
      <PageHead
        title="New subject"
        context="Scope a proposed subject and hand it to a coordinator. It enters the programme as proposed until its first change is tested and approved."
      />

      <div style={{ maxWidth: 480 }}>
        <Field label="Subject code" error={errors.code} hint="Like CS310: letters then three digits.">
          <Input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              clearError("code");
            }}
            placeholder="CS350"
            data-demo-id="new-subject-code"
          />
        </Field>

        <Field label="Title" error={errors.title}>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              clearError("title");
            }}
            placeholder="Natural Language Processing"
            data-demo-id="new-subject-title"
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Year">
            <Select value={year} onChange={(e) => setYear(e.target.value)}>
              {[1, 2, 3, 4].map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Semester">
            <Select value={semester} onChange={(e) => setSemester(e.target.value)}>
              {[1, 2].map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Coordinator" error={errors.coordinator}>
          <Select
            value={coordinatorId}
            onChange={(e) => {
              setCoordinatorId(e.target.value);
              clearError("coordinator");
            }}
            data-demo-id="new-subject-coordinator"
          >
            <option value="">Choose an academic</option>
            {academics.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="First learning outcome"
          error={errors.clo}
          hint="One sentence: what a graduate of this subject can do."
        >
          <Textarea
            value={cloText}
            onChange={(e) => {
              setCloText(e.target.value);
              clearError("clo");
            }}
            placeholder="Build and evaluate a language model on a real corpus."
            data-demo-id="new-subject-clo"
          />
        </Field>

        <Button variant="primary" data-demo-id="create-subject" onClick={submit}>
          Create and assign
        </Button>

        <div
          style={{
            marginTop: 20,
            background: "var(--surface-2)",
            borderRadius: "var(--radius-m)",
            padding: "12px 14px",
            fontSize: 12.5,
            color: "var(--ink-2)",
          }}
        >
          A new subject has no cohort history. When its first change is tested, the Analogy agent
          assembles a proxy cohort from courses with similar outcomes, so even a brand-new subject
          is tested on real ground.
        </div>
      </div>
    </Page>
  );
}
