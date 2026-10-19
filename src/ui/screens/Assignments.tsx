// Assignments (spec 6.5): the hat table. One row per (person x subject x hat),
// with the person's verified state visible, and a quiet inline form to assign
// another hat.

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { assignHat, personById, useStore } from "../../app/store.ts";
import type { Hat } from "../../types.ts";
import {
  Button,
  EmptyState,
  Page,
  PageHead,
  Row,
  SectionLabel,
  Select,
  Tag,
} from "../primitives/index.tsx";

export function AssignmentsScreen() {
  const state = useStore();
  const academics = state.people.filter((p) => p.orgRole === "academic");

  const [personId, setPersonId] = useState(academics[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState(state.subjects[0]?.id ?? "");
  const [hat, setHat] = useState<Hat>("coordinator");

  return (
    <Page>
      <PageHead
        title="Assignments"
        context="Who holds which hat on which subject. A person can wear both hats on one subject."
      />

      {state.assignments.length === 0 ? (
        <EmptyState
          title="No hats assigned yet"
          body="Coordinator and lecturer hats per subject appear here. Assign the first one below."
        />
      ) : (
        state.assignments.map((a) => {
          const person = personById(a.personId);
          return (
            <Row key={`${a.personId}-${a.subjectId}-${a.hat}`}>
              <span style={{ width: 140, fontWeight: 500 }}>{person?.name ?? a.personId}</span>
              <span className="num" style={{ width: 64, fontSize: 13, color: "var(--ink-2)" }}>
                {a.subjectId}
              </span>
              <Tag tone={a.hat === "coordinator" ? "accent" : "neutral"}>{a.hat}</Tag>
              <span style={{ flex: 1 }} />
              {person?.verified ? (
                <ShieldCheck size={15} color="var(--ok)" aria-label="Verified" />
              ) : (
                <Tag tone="warn">unverified</Tag>
              )}
            </Row>
          );
        })
      )}

      <SectionLabel>Assign a hat</SectionLabel>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <Select
          value={personId}
          onChange={(e) => setPersonId(e.target.value)}
          style={{ width: 180 }}
          aria-label="Person"
          data-demo-id="assign-person"
        >
          {academics.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          style={{ width: 160 }}
          aria-label="Subject"
          data-demo-id="assign-subject"
        >
          {state.subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.id} {s.title}
            </option>
          ))}
        </Select>
        <Select
          value={hat}
          onChange={(e) => setHat(e.target.value as Hat)}
          style={{ width: 140 }}
          aria-label="Hat"
          data-demo-id="assign-hat"
        >
          <option value="coordinator">Coordinator</option>
          <option value="lecturer">Lecturer</option>
        </Select>
        <Button
          variant="primary"
          disabled={!personId || !subjectId}
          data-demo-id="assign-submit"
          onClick={() => assignHat(personId, subjectId, hat)}
        >
          Assign
        </Button>
      </div>
    </Page>
  );
}
