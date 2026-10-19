// The data room (spec 6.7): the spine made visible. Every source that feeds the
// cohort, grouped by subject, with term, freshness, record count, and the
// verified or self-entered state; then the prepared demand snapshots and the
// survey, each with its honesty line stated plainly.

import { ShieldCheck } from "lucide-react";
import type { DataSource } from "../../types.ts";
import { MARKET_SOURCES } from "../../data/market.ts";
import { nowIso, subjectById, useStore } from "../../app/store.ts";
import { EmptyState, Page, PageHead, Row, SectionLabel, Tag } from "../primitives/index.tsx";

const KIND_LABEL: Record<DataSource["kind"], string> = {
  "clo-survey": "CLO survey",
  ssrt: "SSRT",
  results: "results",
  syllabus: "syllabus",
  material: "material",
};

const KIND_TONE: Record<DataSource["kind"], "accent" | "ok" | "neutral"> = {
  "clo-survey": "accent",
  results: "ok",
  ssrt: "neutral",
  syllabus: "neutral",
  material: "neutral",
};

const MARKET_KIND_LABEL: Record<string, string> = {
  "job-platform": "job platform",
  "gov-labour": "government labour data",
  "industry-report": "industry report",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Freshness phrase: "today" for a same-day ingest, otherwise the date. */
function freshness(ingestedAt: string): string {
  return ingestedAt.slice(0, 10) === nowIso().slice(0, 10) ? "today" : fmtDate(ingestedAt);
}

export function DataRoomScreen() {
  const state = useStore();

  // Group the sources by subject, subjects sorted, newest ingest first inside.
  const groups = new Map<string, DataSource[]>();
  for (const ds of state.dataSources) {
    groups.set(ds.subjectId, [...(groups.get(ds.subjectId) ?? []), ds]);
  }
  const subjectIds = [...groups.keys()].sort();

  return (
    <Page>
      <PageHead
        title="Data room"
        context="Everything the advisory stands on: which data, from where, how fresh, and whether it came from a published document or was self-entered."
      />

      <SectionLabel>The ground</SectionLabel>
      {subjectIds.length === 0 ? (
        <EmptyState
          title="No data sources yet"
          body="Survey ingests, filed results, syllabi, and course material appear here as they arrive, each with its term, freshness, and verification state."
        />
      ) : (
        subjectIds.map((sid) => {
          const subject = subjectById(sid);
          const rows = [...(groups.get(sid) ?? [])].sort((a, b) =>
            a.ingestedAt < b.ingestedAt ? 1 : -1,
          );
          return (
            <div key={sid} style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                <span className="num" style={{ fontWeight: 600, fontSize: 14 }}>{sid}</span>
                {subject ? (
                  <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{subject.title}</span>
                ) : null}
              </div>
              {rows.map((ds, i) => (
                <Row key={`${sid}-${ds.kind}-${ds.term}-${i}`}>
                  <Tag tone={KIND_TONE[ds.kind]}>{KIND_LABEL[ds.kind]}</Tag>
                  <span className="num" style={{ width: 64, fontSize: 13 }}>{ds.term}</span>
                  <span className="num" style={{ width: 96, fontSize: 13 }}>
                    {ds.recordCount} records
                  </span>
                  <span style={{ width: 110, fontSize: 12.5, color: "var(--ink-2)" }}>
                    {freshness(ds.ingestedAt)}
                  </span>
                  {ds.verified ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 12.5,
                        color: "var(--ok)",
                      }}
                    >
                      <ShieldCheck size={15} /> verified
                    </span>
                  ) : (
                    <Tag tone="warn">self-entered</Tag>
                  )}
                  {ds.sourceFileName ? (
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 12,
                        color: "var(--ink-3)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: 220,
                      }}
                    >
                      {ds.sourceFileName}
                    </span>
                  ) : null}
                </Row>
              ))}
            </div>
          );
        })
      )}

      <SectionLabel style={{ marginTop: 36 }}>Synthetic market examples</SectionLabel>
      {MARKET_SOURCES.map((s) => (
        <Row key={s.id}>
          <span style={{ width: 240, fontSize: 13.5, fontWeight: 500 }}>{s.name}</span>
          <Tag>{MARKET_KIND_LABEL[s.kind] ?? s.kind}</Tag>
          <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
            {s.isSynthetic ? "synthetic fixture, example date" : "snapshot"}, {fmtDate(s.snapshotDate)}
          </span>
          <span className="num" style={{ marginLeft: "auto", fontSize: 13 }}>
            {s.recordCount.toLocaleString("en-GB")} {s.isSynthetic ? "illustrative records" : "records"}
          </span>
        </Row>
      ))}
      <p style={{ marginTop: 10, fontSize: 12.5, color: "var(--ink-3)", maxWidth: 560 }}>
        These counts and dates are fixture values, with no underlying retrieved records.
        Occupational reports must be analysed separately from job postings.
      </p>

      <SectionLabel style={{ marginTop: 36 }}>The survey</SectionLabel>
      <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-2)", maxWidth: 560 }}>
        <span className="num" style={{ fontWeight: 600, color: "var(--ink)" }}>
          {state.survey.length}
        </span>{" "}
        CLO mastery survey records on file across subjects.
      </p>
      <p style={{ marginTop: 6, fontSize: 12.5, color: "var(--ink-3)", maxWidth: 560 }}>
        Seed survey records are synthetic. Uploaded self-ratings describe perceived mastery;
        they are not measured ability or validation of the scenario model.
      </p>
    </Page>
  );
}
