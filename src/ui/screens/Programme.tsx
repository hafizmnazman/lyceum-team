// Programme (spec 6.5): the degree by year, flags first. The focal section is
// "Needs attention": subjects whose relevance band has slipped or that the
// Curriculum agent has annotated. The full degree sits behind a quiet toggle.

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { runCurriculum } from "../../agents/curriculum.ts";
import { runSignal } from "../../agents/signal.ts";
import {
  navigate,
  personWithHat,
  ratingFor,
  selectSubject,
  useStore,
} from "../../app/store.ts";
import type { RelevanceBand, Subject } from "../../types.ts";
import {
  Button,
  EmptyState,
  Page,
  PageHead,
  Row,
  SectionLabel,
  Tag,
} from "../primitives/index.tsx";

const BAND_TONE: Record<RelevanceBand, "ok" | "warn" | "danger" | "neutral"> = {
  aligned: "ok",
  drifting: "warn",
  misaligned: "danger",
  unrated: "neutral",
};

function bandTag(band: RelevanceBand | undefined) {
  if (!band || band === "unrated") return null;
  return <Tag tone={BAND_TONE[band]}>{band}</Tag>;
}

export function ProgrammeScreen() {
  const state = useStore();
  const [showAll, setShowAll] = useState(false);

  const annotations = runCurriculum(state.programme.id, runSignal(state.programme.id));
  const annBySubject = new Map(annotations.map((a) => [a.subjectId, a]));

  const bandOf = (s: Subject): RelevanceBand | undefined => ratingFor(s.id)?.band;
  const severity = (band?: RelevanceBand) =>
    band === "misaligned" ? 0 : band === "drifting" ? 1 : 2;

  const needs = state.subjects
    .filter((s) => {
      const band = bandOf(s);
      const ann = annBySubject.get(s.id);
      return (
        band === "misaligned" || band === "drifting" || (ann !== undefined && ann.annotation !== "fine")
      );
    })
    .sort((a, b) => severity(bandOf(a)) - severity(bandOf(b)));

  const years = [...new Set(state.subjects.map((s) => s.year))].sort((a, b) => a - b);

  function open(s: Subject) {
    selectSubject(s.id);
    navigate("studio");
  }

  return (
    <Page>
      <PageHead
        title="Programme"
        context={`${state.programme.title}, rated against triangulated market demand.`}
        actions={
          <Button
            variant="primary"
            data-demo-id="programme-new-subject"
            onClick={() => navigate("new-subject")}
          >
            Scope a new subject
          </Button>
        }
      />

      <SectionLabel style={{ marginTop: 0 }}>Needs attention</SectionLabel>
      {needs.length === 0 ? (
        <EmptyState
          title="Nothing needs attention"
          body="Subjects flagged as drifting or misaligned by the Signal and Curriculum agents appear here, with the reason attached."
        />
      ) : (
        needs.map((s) => {
          const ann = annBySubject.get(s.id);
          const rating = ratingFor(s.id);
          const detail =
            ann && ann.annotation !== "fine"
              ? ann.detail
              : rating
                ? `Relevance has slipped to ${rating.score.toFixed(2)}; the outcomes are worth a look.`
                : "";
          return (
            <Row
              key={s.id}
              onClick={() => open(s)}
              style={{ alignItems: "flex-start" }}
              data-demo-id={`programme-${s.id}`}
            >
              <span className="num" style={{ width: 56, fontWeight: 600, fontSize: 13 }}>
                {s.id}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 500 }}>{s.title}</span>
                  {bandTag(bandOf(s))}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 2 }}>{detail}</div>
              </div>
              <ChevronRight size={15} color="var(--ink-3)" />
            </Row>
          );
        })
      )}

      <button
        onClick={() => setShowAll((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          border: "none",
          background: "none",
          color: "var(--ink-2)",
          fontSize: 13,
          cursor: "pointer",
          padding: 0,
          margin: "24px 0 4px",
        }}
        data-demo-id="programme-full-toggle"
      >
        {showAll ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        {showAll ? "Hide the full degree" : "Show the full degree"}
      </button>

      {showAll
        ? years.map((year) => (
            <div key={year}>
              <SectionLabel>Year {year}</SectionLabel>
              {state.subjects
                .filter((s) => s.year === year)
                .sort((a, b) => a.semester - b.semester || a.id.localeCompare(b.id))
                .map((s) => {
                  const coordinator = personWithHat(s.id, "coordinator");
                  return (
                    <Row key={s.id}>
                      <span className="num" style={{ width: 56, fontWeight: 600, fontSize: 13 }}>
                        {s.id}
                      </span>
                      <span style={{ flex: 1, minWidth: 0, fontWeight: 500 }}>{s.title}</span>
                      <span className="num" style={{ fontSize: 12, color: "var(--ink-3)" }}>
                        Semester {s.semester}
                      </span>
                      {s.status === "proposed" ? <Tag tone="neutral">proposed</Tag> : null}
                      {bandTag(bandOf(s))}
                      <span
                        style={{
                          width: 110,
                          textAlign: "right",
                          fontSize: 12.5,
                          color: coordinator ? "var(--ink-2)" : "var(--ink-3)",
                        }}
                      >
                        {coordinator?.name ?? "unassigned"}
                      </span>
                    </Row>
                  );
                })}
            </div>
          ))
        : null}
    </Page>
  );
}
