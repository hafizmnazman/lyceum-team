// The public Relevance Index (spec 6.8): the product's wedge. One surface,
// two contexts. Logged out it renders bare with its own minimal chrome (the
// pitch: the rating exists whether a university joins or not); logged in it
// renders inside the shell as the same continuous surface.

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { RelevanceBand, RelevanceRating, Subject } from "../../types.ts";
import { navigate, ratingFor, selectSubject, useStore } from "../../app/store.ts";
import { hasSourceDisagreement, sourceById } from "../../data/market.ts";
import { Button, EmptyState, Page, PageHead, Row, SectionLabel, Tag } from "../primitives/index.tsx";
import { PrototypeNotice } from "../primitives/PrototypeNotice.tsx";

const BAND_ORDER: Record<RelevanceBand, number> = {
  misaligned: 0,
  drifting: 1,
  aligned: 2,
  unrated: 3,
};

const BAND_TONE: Record<RelevanceBand, "danger" | "warn" | "ok" | "neutral"> = {
  misaligned: "danger",
  drifting: "warn",
  aligned: "ok",
  unrated: "neutral",
};

function deltaColor(delta: number): string {
  return delta < 0 ? "var(--danger)" : "var(--emerald)";
}

function formatDelta(delta: number): string {
  return `${delta < 0 ? "" : "+"}${delta.toFixed(2)}`;
}

/** Thin horizontal score bar for a per-CLO score (0..1). */
function ScoreBar(props: { score: number }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 120,
        height: 4,
        borderRadius: 2,
        background: "var(--tint-1)",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          display: "block",
          width: `${Math.round(props.score * 100)}%`,
          height: "100%",
          background: "var(--emerald)",
        }}
      />
    </span>
  );
}

/** The receipts inside an expanded row: per-CLO movement, then the evidence
 *  grouped by source, then the claim (or the way into the Studio). */
function Receipts(props: { rating: RelevanceRating; loggedIn: boolean; subject: Subject }) {
  const { rating, loggedIn, subject } = props;
  const sourceIds: string[] = [];
  for (const e of rating.evidence) {
    if (!sourceIds.includes(e.sourceId)) sourceIds.push(e.sourceId);
  }

  return (
    <div
      className="fade-in"
      style={{
        padding: "4px 12px 20px 12px",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {rating.band === "unrated" ? (
        <div style={{ fontSize: 13, color: "var(--ink-2)", padding: "8px 0" }}>
          This subject has no assessed outcomes in the public record yet, so it carries no
          rating. A rating appears once its published syllabus lands on a tracked skill.
        </div>
      ) : (
        <>
          <SectionLabel style={{ marginTop: 12 }}>Per outcome</SectionLabel>
          {rating.perCLO.map((c) => (
            <div
              key={c.cloId}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "5px 0" }}
            >
              <span className="num" style={{ width: 52, fontSize: 13, color: "var(--ink-2)" }}>
                {c.cloId}
              </span>
              <ScoreBar score={c.score} />
              <span className="num" style={{ width: 32, fontSize: 13 }}>
                {Math.round(c.score * 100)}
              </span>
              <span style={{ fontSize: 13, color: "var(--ink-2)" }}>
                {c.movedBy.length > 0 ? `moved by ${c.movedBy.join(", ")}` : "no moving skills"}
              </span>
            </div>
          ))}

          <SectionLabel>Illustrative source figures</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {sourceIds.map((sid) => {
              const source = sourceById(sid);
              const rows = rating.evidence.filter((e) => e.sourceId === sid);
              return (
                <div
                  key={sid}
                  style={{
                    flex: "1 1 220px",
                    minWidth: 200,
                    background: "var(--tint-1)",
                    borderRadius: "var(--radius-chip)",
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{source?.name ?? sid}</div>
                  <div style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 6 }}>
                    synthetic fixture, example date {source?.snapshotDate ?? "undated"}
                  </div>
                  {rows.map((e) => (
                    <div
                      key={`${sid}-${e.skill}`}
                      style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, padding: "2px 0" }}
                    >
                      <span style={{ flex: 1, color: "var(--ink-2)" }}>{e.skill}</span>
                      <span className="num">{e.demandScore.toFixed(2)}</span>
                      <span className="num" style={{ color: deltaColor(e.delta12m), width: 44, textAlign: "right" }}>
                        {formatDelta(e.delta12m)}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {hasSourceDisagreement(rating.evidence) ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
              <Tag tone="warn">sources disagree</Tag>
              <span style={{ fontSize: 13, color: "var(--ink-2)" }}>
                The source directions differ for at least one skill. Agreement is not evidence quality.
              </span>
            </div>
          ) : null}
        </>
      )}

      <div style={{ marginTop: 16 }}>
        {loggedIn ? (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              selectSubject(subject.id);
              navigate("studio");
            }}
            style={{ fontSize: 13, fontWeight: 500 }}
          >
            Open in Studio
          </a>
        ) : (
          <Button
            variant="primary"
            data-demo-id="claim-programme"
            onClick={() => navigate("login")}
          >
            Claim this programme
          </Button>
        )}
      </div>
    </div>
  );
}

export function IndexScreen() {
  const state = useStore();
  const loggedIn = state.currentPersonId !== null;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = [...state.subjects].sort((a, b) => {
    const ra = ratingFor(a.id);
    const rb = ratingFor(b.id);
    const bandA = BAND_ORDER[ra?.band ?? "unrated"];
    const bandB = BAND_ORDER[rb?.band ?? "unrated"];
    if (bandA !== bandB) return bandA - bandB;
    return (ra?.score ?? 1) - (rb?.score ?? 1);
  });

  const content = (
    <>
      <PageHead
        title="The Relevance Index"
        context={`An illustrative course-rating view for ${state.programme.title}. Scores use fixed demonstration inputs; no underlying job postings have been retrieved or verified.`}
      />

      {sorted.length === 0 ? (
        <EmptyState
          title="No subjects to rate yet"
          body="Subjects appear here as soon as a programme's published record is on file, each rated against triangulated market demand."
        />
      ) : (
        <div>
          {sorted.map((subject) => {
            const rating = ratingFor(subject.id);
            const band = rating?.band ?? "unrated";
            const expanded = expandedId === subject.id;
            return (
              <div key={subject.id}>
                <Row
                  data-demo-id={`index-${subject.id}`}
                  onClick={() => setExpandedId(expanded ? null : subject.id)}
                >
                  <span className="num" style={{ width: 64, fontWeight: 600, fontSize: 13 }}>
                    {subject.id}
                  </span>
                  <span style={{ flex: 1, fontSize: 14 }}>{subject.title}</span>
                  <Tag tone={BAND_TONE[band]}>{band}</Tag>
                  <span className="num" style={{ width: 36, textAlign: "right", fontWeight: 600 }}>
                    {rating && band !== "unrated" ? Math.round(rating.score * 100) : ""}
                  </span>
                  {expanded ? (
                    <ChevronDown size={16} color="var(--ink-2)" />
                  ) : (
                    <ChevronRight size={16} color="var(--ink-2)" />
                  )}
                </Row>
                {expanded && rating ? (
                  <Receipts rating={rating} loggedIn={loggedIn} subject={subject} />
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 28, fontSize: 13, color: "var(--ink-2)", maxWidth: 640 }}>
        Demand derived from job-ad frequency is a proxy and is labelled as such. The advisory
        scores its own recommendations against next-term results; see the closed loop.
      </div>
    </>
  );

  if (loggedIn) {
    return <Page>{content}</Page>;
  }

  // Logged out: the app renders this screen bare, so it carries its own
  // minimal public chrome.
  return (
    <div style={{ minHeight: "100%" }}>
      <div
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          borderBottom: "1px solid var(--border)",
          background: "var(--white)",
        }}
      >
        <span className="page-title" style={{ fontSize: 22 }}>
          Lyceum
        </span>
        <Button variant="quiet" data-demo-id="index-signin" onClick={() => navigate("login")}>
          Sign in
        </Button>
      </div>
      <PrototypeNotice />
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 32px 64px" }}>{content}</div>
    </div>
  );
}
