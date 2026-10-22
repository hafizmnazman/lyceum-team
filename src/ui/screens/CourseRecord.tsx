// The course record on the Course step (depth plan Section 4.4): the parts a course file holds, in its order, each a
// panel. Every figure has its words beside it, the learning-time bar has a text legend, and the matrix carries its
// level in text in every cell, so nothing is said by colour alone.

import type { CourseDefinition, ProgrammeOutcome, Rubric, TeachingSession } from "../../types.ts";
import type { DeckSpec } from "../../lib/slides.ts";
import { Download } from "lucide-react";
import { downloadBytes, downloadText } from "../../lib/download.ts";
import { rubricRows } from "../../lib/items.ts";
import { DEMO_LINE } from "../../data/sample-course/index.ts";
import { DeckThumb } from "../primitives/DeckPreview.tsx";
import { assessmentOf, capitalise, learningTime, listText, tableOfSpecifications, topicHours, type LearningTime } from "../../lib/curriculum.ts";
import { Button, Disclosure, Tag } from "../primitives/index.tsx";
import { Meter } from "../primitives/loop.tsx";
import { plural } from "../../app/loop.ts";

/** A course whose definition carries the course file's parts gets the record; a thinner course keeps the outline cards. */
export function hasCourseRecord(def: CourseDefinition | null): def is CourseDefinition {
  return Boolean(def && (def.synopsis || def.assessment?.length || def.slt));
}

const KIND_LABEL: Record<string, string> = { lecture: "Lecture", lab: "Lab", mixed: "Lecture and lab", quiz: "Quiz", studio: "Studio", review: "Review" };

export function SynopsisPanel({ definition: d }: { definition: CourseDefinition }) {
  const time = learningTime(d);
  return <section className="workspace-panel" aria-labelledby="record-synopsis" data-demo-id="record-synopsis">
    <h2 id="record-synopsis">Synopsis</h2>
    <dl className="record-facts">
      <div><dt>Credits</dt><dd>{d.brief.credits ?? "Not recorded"}</dd></div>
      <div><dt>Teaching weeks</dt><dd>{d.brief.teachingWeeks ?? "Not recorded"}</dd></div>
      <div><dt>Level</dt><dd>{d.brief.level || "Not recorded"}</dd></div>
      <div><dt>Methods</dt><dd>{capitalise(listText(d.methods ?? [])) || "Not recorded"}</dd></div>
    </dl>
    {d.synopsis ? <p className="record-synopsis">{d.synopsis}</p> : <p className="muted">No synopsis recorded.</p>}
    {time ? <LearningTimeBar time={time} credits={d.brief.credits} /> : null}
  </section>;
}

/** Student learning time as one bar against the hours the credits carry, with every part named in text. */
export function LearningTimeBar({ time, credits }: { time: LearningTime; credits: number | null }) {
  const parts = [
    { key: "lecture", label: "Lecture", hours: time.lecture },
    { key: "lab", label: "Lab", hours: time.lab },
    { key: "unsplit", label: "Contact, not split", hours: time.unsplit },
    { key: "self", label: "Self-study", hours: time.selfStudy },
    { key: "assessment", label: "Assessment work", hours: time.assessment },
    { key: "exam", label: "Final examination", hours: time.exam },
    { key: "unallocated", label: "Unallocated", hours: time.unallocated },
  ].filter((p) => p.hours > 0);
  const whole = Math.max(time.capacity ?? 0, time.total);
  const summary = time.capacity !== null
    ? time.total + " of the " + time.capacity + " learning hours " + credits + " credits carry" + (time.unallocated ? ", " + time.unallocated + " unallocated" : "")
    : time.total + " learning hours; the credits are not recorded";
  return <figure className="slt" data-demo-id="slt-bar">
    <figcaption><strong>Student learning time.</strong> {summary}.</figcaption>
    <div className="slt-bar" role="img" aria-label={"Student learning time: " + parts.map((p) => p.label + " " + p.hours + " hours").join(", ") + "."}>
      {parts.map((p) => <span key={p.key} className={"slt-part slt-" + p.key} style={{ width: (p.hours / whole) * 100 + "%" }} />)}
    </div>
    <ul className="slt-legend">{parts.map((p) => <li key={p.key}><span className={"slt-swatch slt-" + p.key} aria-hidden />{p.label} <strong className="tabular">{p.hours} h</strong></li>)}</ul>
  </figure>;
}

export function OutcomesPanel({ definition: d, plos, sessions }: { definition: CourseDefinition; plos: ProgrammeOutcome[]; sessions: TeachingSession[] }) {
  return <section className="workspace-panel" aria-labelledby="record-outcomes" data-demo-id="record-outcomes">
    <h2 id="record-outcomes">Course learning outcomes</h2>
    <ul className="outline-cards record-outcomes">{d.outcomes.map((o) => {
      const assessed = assessmentOf(d, o.id);
      const linked = sessions.filter((s) => s.cloIds.includes(o.id) && !s.sample).length, sampled = sessions.filter((s) => s.cloIds.includes(o.id) && s.sample).length;
      const sessionText = linked && sampled ? plural(linked, "linked session", "linked sessions") + ", plus " + sampled + " sample"
        : sampled ? plural(sampled, "linked sample session", "linked sample sessions") : plural(linked, "linked session", "linked sessions");
      return <li key={o.id} className="outline-card" data-demo-id={"record-outcome-" + o.label}>
        <div className="outline-card-head"><strong>{o.label}</strong><Tag>{o.bloomLevel}</Tag></div>
        <p>{o.text}</p>
        {o.mqfCluster ? <p className="muted">MQF cluster: {o.mqfCluster}</p> : null}
        <p className="muted">{assessed.length ? "Assessed by " + listText(assessed.map((a) => a.title.toLowerCase() + " (" + a.marks + " marks)")) : o.assessmentEvidence || "Achievement evidence not recorded"} · {sessionText}</p>
      </li>;
    })}</ul>
    <PloMatrix definition={d} plos={plos} />
  </section>;
}

/** The CLO to PLO matrix as a heat table: H, M or L written in every linked cell, the shade only repeating it. */
export function PloMatrix({ definition: d, plos }: { definition: CourseDefinition; plos: ProgrammeOutcome[] }) {
  const columns = plos.filter((p) => d.outcomes.some((o) => o.ploIds.includes(p.id)));
  if (!columns.length) return <p className="muted">No programme outcome mapping is recorded.</p>;
  return <div className="plo-matrix" data-demo-id="plo-matrix">
    <table className="record-table plo-table">
      <caption>The CLO to PLO matrix. H, M and L are the strength of each link, not scores.</caption>
      <thead><tr><th scope="col">Outcome</th>{columns.map((p) => <th key={p.id} scope="col" title={p.text}>{p.id}</th>)}</tr></thead>
      <tbody>{d.outcomes.map((o) => <tr key={o.id}><th scope="row">{o.label}</th>{columns.map((p) => {
        const level = o.ploLinks?.find((l) => l.ploId === p.id)?.level;
        const mapped = o.ploIds.includes(p.id);
        return <td key={p.id} data-label={p.id} className={level ? "plo-" + level : mapped ? "plo-unset" : "plo-none"}>
          {level ?? (mapped ? "No level" : <span className="sr-only">not linked</span>)}
        </td>;
      })}</tr>)}</tbody>
    </table>
    <Disclosure summary={"The programme outcomes" + (d.sample ? ", demo and synthetic" : "")} count={columns.length}>
      <ul className="plo-list">{columns.map((p) => <li key={p.id}><strong>{p.id}</strong> · {p.cluster}<p>{p.text}</p></li>)}</ul>
    </Disclosure>
  </div>;
}

export function AssessmentPanel({ definition: d, rubrics }: { definition: CourseDefinition; rubrics: Rubric[] }) {
  const plan = d.assessment ?? [];
  const label = (id: string) => d.outcomes.find((o) => o.id === id)?.label ?? id;
  const exam = plan.filter((a) => a.kind === "exam").reduce((n, a) => n + a.weight, 0);
  const total = plan.reduce((n, a) => n + a.weight, 0);
  return <section className="workspace-panel" aria-labelledby="record-assessment" data-demo-id="record-assessment">
    <h2 id="record-assessment">Assessment plan</h2>
    {plan.length ? <>
      <p className="muted">Continuous assessment {total - exam}%, final examination {exam}%; {total}% in all.</p>
      <table className="record-table">
        <thead><tr><th scope="col">Component</th><th scope="col">Weight</th><th scope="col">When</th><th scope="col">Assesses</th></tr></thead>
        <tbody>{plan.map((a) => <tr key={a.id}>
          <th scope="row" data-label="Component">{a.title}{a.individual || /team/i.test(a.title) ? "" : <span className="muted"> · team</span>}</th>
          <td data-label="Weight" className="tabular">{a.weight}%</td>
          <td data-label="When">{a.week}</td>
          <td data-label="Assesses">{a.allocation.map((x) => label(x.cloId) + " " + x.bloomLevel.toLowerCase() + " " + x.marks).join(", ")}</td>
        </tr>)}</tbody>
      </table>
      <Disclosure summary="Table of specifications: marks by outcome and Bloom level" data-demo-id="record-tos">
        <table className="record-table">
          <thead><tr><th scope="col">Outcome</th><th scope="col">Bloom level</th><th scope="col">Marks</th><th scope="col">From</th></tr></thead>
          <tbody>{tableOfSpecifications(d).map((r) => <tr key={r.cloId + r.bloomLevel}><th scope="row" data-label="Outcome">{label(r.cloId)}</th><td data-label="Bloom level">{r.bloomLevel}</td><td data-label="Marks" className="tabular">{r.marks}</td><td data-label="From">{r.components.join("; ")}</td></tr>)}</tbody>
        </table>
        <p className="muted">Each component's marks are allocated by outcome and level, so this table is their sum.</p>
      </Disclosure>
      {plan.map((a) => <Disclosure key={a.id} summary={a.title + ": what students do"}>
        <p>{a.description}</p>
        {rubrics.filter((r) => r.id === a.rubricId).map((r) => <RubricTable key={r.id} rubric={r} label={label} demoLine={d.sample ? DEMO_LINE : null} />)}
      </Disclosure>)}
    </> : <p className="muted">No assessment plan recorded.</p>}
  </section>;
}

function RubricTable({ rubric, label, demoLine }: { rubric: Rubric; label: (id: string) => string; demoLine: string | null }) {
  // The grid as a spreadsheet through SheetJS, loaded on demand (depth plan Section 10).
  async function download() {
    const XLSX = await import("xlsx");
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rubricRows(rubric, label, demoLine)), "Rubric");
    downloadBytes(rubric.id + "-rubric.xlsx", new Uint8Array(XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  }
  return <><table className="record-table rubric-table">
    <caption>{rubric.title}: four levels in the grid shape of the VALUE rubrics, with descriptors written for this course. {rubric.criteria.reduce((n, c) => n + c.marks, 0)} marks.</caption>
    <thead><tr><th scope="col">Criterion</th><th scope="col">Capstone</th><th scope="col">Milestone 2</th><th scope="col">Milestone 1</th><th scope="col">Benchmark</th></tr></thead>
    <tbody>{rubric.criteria.map((c) => <tr key={c.name}>
      <th scope="row" data-label="Criterion">{c.name}<span className="muted"> · {c.marks} marks · {c.cloIds.map(label).join(", ")}</span></th>
      {c.levels.map((text, i) => <td key={i} data-label={["Capstone", "Milestone 2", "Milestone 1", "Benchmark"][i]}>{text}</td>)}
    </tr>)}</tbody>
  </table>
  <Button onClick={() => void download()} data-demo-id={"rubric-xlsx-" + rubric.id}><Download size={15} /> The rubric as a spreadsheet (.xlsx)</Button></>;
}

/** The sessions that teach a topic: the session saved against it, or failing that a session in its week. */
const sessionsFor = (sessions: TeachingSession[], topicId: string, week: number | null) =>
  sessions.filter((s) => s.topicId === topicId || (!s.topicId && s.week === week));

export function SchedulePanel({ definition: d, sessions = [], deckFor, markSrc }: { definition: CourseDefinition; sessions?: TeachingSession[]; deckFor?: (s: TeachingSession) => DeckSpec; markSrc?: string }) {
  const label = (id: string) => d.outcomes.find((o) => o.id === id)?.label ?? id;
  const contact = d.topics.reduce((n, t) => n + t.contactHours, 0), budget = d.brief.contactHours;
  const topics = [...d.topics].sort((a, b) => (a.week ?? 99) - (b.week ?? 99));
  return <section className="workspace-panel" aria-labelledby="record-schedule" data-demo-id="record-schedule">
    <h2 id="record-schedule">Schedule</h2>
    {budget !== null ? <Meter value={contact} max={budget} over={contact > budget} label={<><strong className="tabular">{contact}</strong> of <span className="tabular">{budget}</span> contact hours outlined{contact < budget ? ", " + (budget - contact) + " unallocated" : ""}</>} note={contact > budget ? "Over the contact-hour budget: Update blocks a version like this." : undefined} />
      : <p className="muted">{contact} contact hours outlined; the contact-hour budget is not recorded.</p>}
    <table className="record-table schedule-table">
      <thead><tr><th scope="col">Week</th><th scope="col">Topic</th><th scope="col">Hours</th><th scope="col">Outcomes</th><th scope="col">Material</th></tr></thead>
      <tbody>{topics.map((t) => <tr key={t.id} data-demo-id={"schedule-" + t.id}>
        <td data-label="Week" className="tabular">{t.week ?? "Not set"}</td>
        <th scope="row" data-label="Topic">{t.title}{t.kind && t.kind !== "mixed" ? <span className="muted"> · {KIND_LABEL[t.kind] ?? t.kind}</span> : null}{t.protected ? <> <Tag>Protected</Tag></> : null}</th>
        <td data-label="Hours" className="record-hours">{topicHours(t)}</td>
        <td data-label="Outcomes">{t.cloIds.map(label).join(", ") || "None linked"}</td>
        <td data-label="Material">{(() => {
          const here = sessionsFor(sessions, t.id, t.week), first = here[0];
          if (!first) return <span className="muted">No session</span>;
          return <div className="schedule-material">
            {deckFor ? <div className="schedule-thumb"><DeckThumb spec={deckFor(first)} markSrc={markSrc} /></div> : null}
            <span>{first.slides?.length ? "Full slides" : first.sample ? "Outline pack" : "Pack"}{here.some((s) => s.labSheet) ? " · lab sheet" : ""}{here.some((s) => s.projectBrief) ? " · project brief" : ""}</span>
          </div>;
        })()}</td>
      </tr>)}</tbody>
    </table>
    <Disclosure summary="Activities, readings and misconceptions, week by week">
      <ol className="schedule-detail">{topics.filter((t) => t.activities || t.readings || t.misconceptions?.length).map((t) => <li key={t.id}>
        <strong>Week {t.week ?? "not set"}: {t.title}</strong>
        {t.activities ? <p>{t.activities}</p> : null}
        {t.readings ? <p className="muted">Reading: {t.readings}</p> : null}
        {t.misconceptions?.length ? <p className="muted">Misconceptions to address: {t.misconceptions.join(" ")}</p> : null}
      </li>)}</ol>
    </Disclosure>
  </section>;
}

/** The teaching material the record holds (depth plan Sections 4.4 and 5): the packs by kind, the lab sheets and the project brief. */
export function MaterialsPanel({ courseId, sessions, onTeach }: { courseId: string; sessions: TeachingSession[]; onTeach: () => void }) {
  const samples = sessions.filter((s) => s.sample), own = sessions.filter((s) => !s.sample);
  const full = samples.filter((s) => s.slides?.length).length;
  const file = (s: TeachingSession, suffix: string) => courseId + "-week-" + s.week + "-" + suffix + ".md";
  return <section className="workspace-panel" aria-labelledby="record-materials" data-demo-id="record-materials">
    <h2 id="record-materials">Materials</h2>
    <dl className="record-facts">
      <div><dt>Sample packs</dt><dd>{samples.length ? samples.length + " (" + full + " with full slides, " + (samples.length - full) + " outline)" : "None"}</dd></div>
      <div><dt>Your packs</dt><dd>{own.length}</dd></div>
      <div><dt>Lab sheets</dt><dd>{sessions.filter((s) => s.labSheet).length}</dd></div>
      <div><dt>Project brief</dt><dd>{sessions.some((s) => s.projectBrief) ? "Week " + sessions.filter((s) => s.projectBrief).map((s) => s.week).join(", ") : "None"}</dd></div>
    </dl>
    <div className="button-row">
      {sessions.filter((s) => s.labSheet).map((s) => <Button key={s.id} onClick={() => downloadText(file(s, "lab-sheet"), s.labSheet!)}>Lab sheet, week {s.week} (.md)</Button>)}
      {sessions.filter((s) => s.projectBrief).map((s) => <Button key={s.id} onClick={() => downloadText(file(s, "project-brief"), s.projectBrief!)}>Project brief (.md)</Button>)}
      <Button variant="quiet" onClick={onTeach}>Every pack, with its preview, in Teach</Button>
    </div>
    {samples.length ? <p className="muted">The sample material is written for this prototype and labelled synthetic; the outline packs say the lecturer's slides are not written yet.</p> : null}
  </section>;
}

export function ReferencesPanel({ definition: d }: { definition: CourseDefinition }) {
  return <section className="workspace-panel" aria-labelledby="record-references" data-demo-id="record-references">
    <h2 id="record-references">References</h2>
    {(d.references ?? []).length ? <ul className="reference-list">{d.references!.map((r) => <li key={r.citation}>{r.citation}</li>)}</ul> : <p className="muted">No references recorded.</p>}
    {d.referencesGap ? <p className="limitation">{d.referencesGap} The record asks for at least two references under five years old.</p> : null}
    {d.source ? <p className="muted">{d.source}</p> : null}
  </section>;
}
