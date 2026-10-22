// Upload (spec 6.3): real file intake, the product's trust moment. The flow is
// drop, parse, interpret, preview and confirm, then a filed receipt. Nothing
// files until the human has seen what was read (left) beside what the agent
// made of it (right); the confirm step is the trust boundary. The same intake
// panel files results and surveys on the Learn step, where the person filing
// also confirms the course version the results are for.

import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { CheckCircle, UploadCloud } from "lucide-react";
import type { IntakeInterpretation, ParsedDoc } from "../../types.ts";
import {
  beginAgentRun,
  clearPendingIntake,
  confirmPendingIntake,
  finishAgentRun,
  getState,
  navigate,
  openStep,
  personById,
  stagePendingIntake,
  trackRequest,
  useStore,
} from "../../app/store.ts";
import { courseVersionIds, taughtVersionId } from "../../app/loop.ts";
import { interpretDoc, parseFile } from "../../agents/client.ts";
import { AgentStrip } from "../shell/AgentStrip.tsx";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Page,
  PageHead,
  Row,
  SectionLabel,
  Select,
  Spinner,
  Tag,
} from "../primitives/index.tsx";

const NUMERIC = /^-?\d+(\.\d+)?%?$/;

function cellClass(value: string): string | undefined {
  return NUMERIC.test(value.trim()) ? "num" : undefined;
}

/** A compact preview table: hairline borders, bold header row, tabular numbers. */
function PreviewTable(props: { name: string; rows: string[][] }) {
  const rows = props.rows.slice(0, 6);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{props.name}</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", fontSize: 13, width: "100%" }}>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td
                    key={j}
                    className={cellClass(c)}
                    style={{
                      border: "1px solid var(--border)",
                      padding: "3px 8px",
                      fontWeight: i === 0 ? 600 : 400,
                      color: i === 0 ? "var(--ink)" : "var(--ink-2)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuietWell(props: { text: string }) {
  return (
    <div
      style={{
        background: "var(--tint-1)",
        borderRadius: "var(--radius-chip)",
        padding: "8px 10px",
        fontSize: 13,
        color: "var(--ink-2)",
        marginBottom: 12,
        whiteSpace: "pre-wrap",
      }}
    >
      {props.text}
    </div>
  );
}

const ALL_SAMPLES: Array<[string, string]> = [
  ["results.xlsx", "sample-results"],
  ["clo-survey.csv", "sample-survey"],
  ["syllabus.pdf", "sample-syllabus"],
  ["lecture-slides.pptx", "sample-slides"],
];

export function UploadScreen() {
  const state = useStore();
  return (
    <Page>
      <PageHead
        title="Upload"
        context="Results, surveys, syllabi and slides become ground here. The agent reads the file; you confirm what it read before anything files."
      />
      <AgentStrip agent="intake" />
      <IntakePanel samples={ALL_SAMPLES} />
      {!state.pendingIntake ? <><SectionLabel style={{ marginTop: 32 }}>Recent uploads</SectionLabel><RecentUploads /></> : null}
    </Page>
  );
}

/** Drop or pick a file, see what was read beside what it was taken to mean, then confirm and file. */
export function IntakePanel({ samples, prompt }: { samples: Array<[string, string]>; prompt?: string }) {
  const state = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsingName, setParsingName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [lastVia, setLastVia] = useState<"live" | "fallback" | null>(null);

  const pending = state.pendingIntake;
  const receipt = !pending ? state.flashUpload : null;

  async function handleFile(file: File, sample = false) {
    setParseError(null);
    setParsingName(file.name);
    const runId = beginAgentRun("intake", `Reading ${file.name}`, "upload");
    const parsed = await trackRequest("parse", state.selectedSubjectId, () => parseFile(file));
    if (parsed.doc === null) {
      finishAgentRun(runId, "failed");
      setParseError(parsed.error ?? "Could not read this file.");
      setParsingName(null);
      return;
    }
    const s = getState();
    const { interp, via } = await interpretDoc(parsed.doc, s.subjects, s.clos);
    finishAgentRun(runId, via === "live" ? "done" : "fallback", {
      label: `Read ${file.name}: ${interp.docType}, ${Math.round(interp.confidence * 100)}% confident`,
    });
    setLastVia(via);
    stagePendingIntake(sample ? { ...parsed.doc, sample: true } : parsed.doc, interp);
    setParsingName(null);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = "";
  }

  return (
    <div className="intake-panel">
      {pending ? (
        <ReviewPanels pending={pending} lastVia={lastVia} onDone={() => setLastVia(null)} />
      ) : (
        <>
          {/* the dropzone (idle and parsing states) */}
          <div
            data-demo-id="upload-drop"
            onClick={() => {
              if (!parsingName) inputRef.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && !parsingName) inputRef.current?.click();
            }}
            style={{
              border: `1px dashed ${dragOver ? "var(--emerald)" : "var(--border)"}`,
              borderRadius: "var(--radius-card)",
              background: dragOver ? "var(--tint-2)" : "var(--white)",
              padding: "48px 32px",
              textAlign: "center",
              cursor: parsingName ? "default" : "pointer",
              transition: "background 150ms ease-out, border-color 150ms ease-out",
            }}
          >
            {parsingName ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <Spinner />
                <span style={{ fontSize: 14, color: "var(--ink-2)" }}>Reading {parsingName}</span>
              </div>
            ) : (
              <>
                <UploadCloud size={28} color="var(--ink-2)" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  {prompt ?? "Drop the term's results, a survey export, a syllabus pdf, or lecture slides."}
                </div>
                <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 4 }}>
                  xlsx, csv, pdf, pptx, docx
                </div>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.pdf,.pptx,.docx"
              onChange={onPick}
              style={{ display: "none" }}
            />
          </div>

          {parseError ? (
            <div style={{ fontSize: 13, color: "var(--danger)", marginTop: 10 }}>{parseError}</div>
          ) : null}

          {/* One-click samples: fetched from public/demo and pushed through the
              exact same parse-interpret-confirm pipeline as a dropped file. */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "var(--ink-2)" }}>Or try a sample:</span>
            {samples.map(([name, demoId]) => (
              <Button
                key={name}
                variant="outline"
                data-demo-id={demoId}
                disabled={Boolean(parsingName)}
                style={{ height: 28, fontSize: 13, padding: "0 10px" }}
                onClick={() => {
                  void (async () => {
                    try {
                      setParseError(null);
                      const res = await fetch(`/demo/${name}`);
                      if (!res.ok) throw new Error(String(res.status));
                      const blob = await res.blob();
                      await handleFile(new File([blob], name), true);
                    } catch {
                      setParseError(`Could not load the sample ${name}.`);
                    }
                  })();
                }}
              >
                {name}
              </Button>
            ))}
          </div>

          {/* the filed receipt, above the recent list */}
          {receipt ? (
            <Card focal style={{ marginTop: 24 }} data-demo-id="upload-receipt">
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <CheckCircle size={20} color="var(--emerald-text)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    Filed to <span className="num">{receipt.subjectId}</span>, {receipt.term}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 2 }}>
                    <span className="num">{receipt.rows.length}</span> row
                    {receipt.rows.length === 1 ? "" : "s"}
                    {receipt.sourceFileName ? ` from ${receipt.sourceFileName}` : ""}{receipt.sample ? ", a sample file with synthetic marks" : ""}.
                  </div>
                  <div style={{ fontSize: 13, marginTop: 8 }}>
                    {receipt.courseVersionId ? <>For course version <span className="num">{receipt.courseVersionId}</span>. </> : null}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        openStep(receipt.subjectId, "learn");
                      }}
                    >
                      Read it in Learn
                    </a>
                    {" or "}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate("dataroom");
                      }}
                    >
                      see it in the data room
                    </a>
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

        </>
      )}
    </div>
  );
}

/** The preview-and-confirm step: what was read beside what the agent made of
 *  it. The user can correct the subject and term guesses before filing. */
function ReviewPanels(props: {
  pending: { doc: ParsedDoc; interp: IntakeInterpretation };
  lastVia: "live" | "fallback" | null;
  onDone: () => void;
}) {
  const state = useStore();
  const { doc, interp } = props.pending;
  const needsSubject =
    (interp.docType === "results" || interp.docType === "syllabus" || interp.docType === "slides") &&
    !interp.subjectGuess;

  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
      {/* left: what was read */}
      <Card style={{ flex: "1 1 380px", minWidth: 320 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>What was read</div>
        {doc.tables.map((t) => (
          <PreviewTable key={t.name} name={t.name} rows={t.rows} />
        ))}
        {doc.pages.slice(0, 2).map((p) => (
          <QuietWell
            key={p.index}
            text={p.text.length > 300 ? `${p.text.slice(0, 300)}...` : p.text}
          />
        ))}
        {doc.tables.length === 0 && doc.pages.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--ink-2)" }}>
            Nothing readable was found in {doc.fileName}.
          </div>
        ) : null}
      </Card>

      {/* right: what the agent made of it */}
      <Card style={{ flex: "1 1 380px", minWidth: 320 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ fontWeight: 600, flex: 1 }}>What the agent made of it</div>
          <Tag tone="accent">{interp.docType}</Tag>
          {props.lastVia === "fallback" ? (
            <span title="The LLM was unreachable; this is the deterministic local read.">
              <Tag tone="warn">offline read</Tag>
            </span>
          ) : null}
        </div>

        <Field label="Subject" hint={needsSubject ? "Choose a subject before filing." : undefined}>
          <Select
            data-demo-id="upload-subject"
            value={interp.subjectGuess ?? ""}
            onChange={(e) =>
              stagePendingIntake(doc, { ...interp, subjectGuess: e.target.value || undefined })
            }
          >
            <option value="">Choose a subject</option>
            {state.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id}, {s.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Term">
          <Input
            data-demo-id="upload-term"
            value={interp.termGuess ?? ""}
            placeholder="e.g. 2025-S1"
            onChange={(e) => stagePendingIntake(doc, { ...interp, termGuess: e.target.value })}
          />
        </Field>
        {interp.docType === "results" && interp.subjectGuess ? (
          <Field label="Course version taught" hint="The results are matched to this version. It defaults to the version this term's sessions were saved on.">
            <Select
              data-demo-id="upload-version"
              value={interp.courseVersionId ?? taughtVersionId(state, interp.subjectGuess) ?? ""}
              onChange={(e) => stagePendingIntake(doc, { ...interp, courseVersionId: e.target.value })}
            >
              {[...courseVersionIds(state, interp.subjectGuess)].map((id) => (
                <option key={id} value={id}>
                  {id}{id === state.subjects.find((s) => s.id === interp.subjectGuess)?.currentVersionId ? " (current)" : ""}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        {interp.mappedRows && interp.mappedRows.length > 0 ? (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Mapped rows</div>
            <table style={{ borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["CLO", "mean", "sd", "n"].map((h) => (
                    <th
                      key={h}
                      style={{
                        border: "1px solid var(--border)",
                        padding: "3px 10px",
                        fontWeight: 600,
                        textAlign: "left",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {interp.mappedRows.map((r) => (
                  <tr key={r.cloId}>
                    <td className="num" style={{ border: "1px solid var(--border)", padding: "3px 10px" }}>
                      {r.cloId}
                    </td>
                    <td className="num" style={{ border: "1px solid var(--border)", padding: "3px 10px" }}>
                      {r.meanScore.toFixed(2)}
                    </td>
                    <td className="num" style={{ border: "1px solid var(--border)", padding: "3px 10px" }}>
                      {r.sd.toFixed(2)}
                    </td>
                    <td className="num" style={{ border: "1px solid var(--border)", padding: "3px 10px" }}>
                      {r.n}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {interp.surveyRecords && interp.surveyRecords.length > 0 ? (
          <div style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 12 }}>
            <span className="num">{interp.surveyRecords.length}</span> per-student survey rows
          </div>
        ) : null}

        {interp.contentSummary ? <QuietWell text={interp.contentSummary} /> : null}

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: "var(--ink-2)" }}>Confidence</span>
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 120,
              height: 4,
              borderRadius: 2,
              background: "var(--tint-1)",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                display: "block",
                width: `${Math.round(interp.confidence * 100)}%`,
                height: "100%",
                background: "var(--emerald)",
              }}
            />
          </span>
          <span className="num" style={{ fontSize: 13 }}>
            {Math.round(interp.confidence * 100)}%
          </span>
        </div>

        {interp.notes.length > 0 ? (
          <ul
            style={{
              margin: "0 0 14px",
              paddingLeft: 18,
              fontSize: 13,
              color: "var(--ink-2)",
            }}
          >
            {interp.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        ) : null}

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Button
            variant="primary"
            data-demo-id="upload-confirm"
            disabled={needsSubject}
            onClick={() => {
              confirmPendingIntake();
              props.onDone();
            }}
          >
            Confirm and file
          </Button>
          <Button
            variant="quiet"
            onClick={() => {
              clearPendingIntake();
              props.onDone();
            }}
          >
            Discard
          </Button>
        </div>
      </Card>
    </div>
  );
}

function RecentUploads() {
  const state = useStore();
  const uploads = [...state.resultUploads].sort((a, b) =>
    a.filedAt === b.filedAt ? 0 : a.filedAt < b.filedAt ? 1 : -1,
  );

  if (uploads.length === 0) {
    return (
      <EmptyState
        title="No uploads yet"
        body="Filed results land here with their subject, term and source file. Drop the term's results above to file the first one."
      />
    );
  }

  return (
    <div>
      {uploads.map((u) => (
        <Row key={u.id}>
          <span className="num" style={{ width: 64, fontWeight: 600, fontSize: 13 }}>
            {u.subjectId}
          </span>
          <span className="num" style={{ width: 72, fontSize: 13, color: "var(--ink-2)" }}>
            {u.term}
          </span>
          <span className="num" style={{ width: 64, fontSize: 13, color: "var(--ink-2)" }}>
            {u.rows.length} row{u.rows.length === 1 ? "" : "s"}
          </span>
          <span className="num" style={{ width: 92, fontSize: 13, color: "var(--ink-2)" }}>
            {u.filedAt.slice(0, 10)}
          </span>
          <span
            style={{
              flex: 1,
              fontSize: 13,
              color: "var(--ink-2)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {u.sourceFileName ?? ""}
          </span>
          <span style={{ fontSize: 13, color: "var(--ink-2)" }}>
            {personById(u.uploadedBy)?.name ?? u.uploadedBy}
          </span>
        </Row>
      ))}
    </div>
  );
}
