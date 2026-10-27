// The programme wall on Courses (depth plan Section 9.1, D6b): the same records at another zoom. Each course of the
// programme as a mini ring with its term, closed or open, and the programme's CLO to PLO heat table, a course a row and a
// PLO a column, read from the recorded outlines only (lib/programme.ts). The whole programme shows to those with a
// programme view (a coordinator, the programme owner, management); a lecturer sees the courses they hold and is told how
// many others there are.

import { ArrowRight } from "lucide-react";
import { loopState, RING_STEPS, stepDef } from "../../app/loop.ts";
import { can, subjectsForPerson } from "../../app/roles.ts";
import { navigate, selectSubject, type AppState } from "../../app/store.ts";
import { heatCellText, LEVEL_WORD, programmeHeat } from "../../lib/programme.ts";
import type { Person } from "../../types.ts";
import { Ring } from "../primitives/loop.tsx";
import { Tag } from "../primitives/index.tsx";

export function ProgrammeWall({ state, person }: { state: AppState; person: Person }) {
  const programme = state.programme;
  const plos = programme.plos ?? [];
  const wide = can(person, "see-trends", { assignments: state.assignments });
  const own = new Set(subjectsForPerson(person.id, state.assignments));
  const ids = programme.subjectIds.filter((id) => wide || own.has(id));
  if (!ids.length) return null;
  const hidden = programme.subjectIds.length - ids.length;
  const rows = programmeHeat(plos, ids, state.subjects, state.courseDefinitions);
  const open = (id: string) => { selectSubject(id); navigate("studio"); };
  return <section className="workspace-panel programme-wall" aria-labelledby="programme-wall-title" data-demo-id="programme-wall">
    <div className="section-heading"><div>
      <p className="eyebrow">The programme wall</p>
      <h2 id="programme-wall-title">{programme.title}, course by course</h2>
      <p className="muted">Each course's loop this term, from its own records: a segment fills only when its record exists. {wide ? "Every course in the programme." : "The courses you hold; the programme's other " + hidden + " show to its coordinators and its owner."}</p>
    </div></div>
    <ol className="wall-rings" data-demo-id="wall-rings">{ids.map((id) => {
      const loop = loopState(state, id);
      const done = loop.steps.filter((s) => RING_STEPS.includes(s.id) && s.done).length;
      const subject = state.subjects.find((s) => s.id === id);
      return <li key={id} className={"wall-ring" + (loop.closed ? " is-closed" : "")} data-demo-id={"wall-ring-" + id}>
        <Ring loop={loop} size={76} compact />
        <div className="wall-ring-text">
          <strong className="tabular">{id}</strong>
          <span className="wall-ring-title">{subject?.title ?? id}</span>
          <span className="muted">{loop.window.term || "Term not set"}</span>
          {loop.closed ? <Tag tone="ok">Closed</Tag> : <span className="wall-ring-open">Open, {done} of {RING_STEPS.length}{loop.next ? "; next, " + stepDef(loop.next).label : ""}</span>}
          {own.has(id) ? <button type="button" className="link-button" onClick={() => open(id)}>Open {id} <ArrowRight size={13} /></button> : null}
        </div>
      </li>;
    })}</ol>

    <h3 id="programme-heat-title">The CLO to PLO matrix across the programme</h3>
    <p className="muted">Each course's strongest link to each programme outcome, from its recorded outline: H high, M medium, L low; the small number is how many of its outcomes link there. A course without a recorded outline says so, and nothing is inferred from its CLOs.</p>
    <div className="table-scroll">
      <table className="record-table plo-table heat-table" data-demo-id="programme-heat" aria-labelledby="programme-heat-title">
        <thead><tr><th scope="col">Course</th>{plos.map((p) => <th scope="col" key={p.id} title={p.cluster + ": " + p.text}>{p.id}</th>)}</tr></thead>
        <tbody>{rows.map((r) => <tr key={r.subjectId}>
          <th scope="row"><span className="tabular">{r.subjectId}</span> <span className="heat-course">{r.title}</span></th>
          {r.cells && !r.note ? r.cells.map((c) => <td key={c.ploId} className={"heat-cell" + (c.level ? " is-" + c.level.toLowerCase() : c.linked.length ? " is-linked" : "")} title={heatCellText(c)}>
            {c.linked.length ? <><span aria-hidden="true">{c.level ?? "Linked"}<sub className="heat-n">{c.linked.length}</sub></span><span className="sr-only">{c.level ? LEVEL_WORD[c.level] + ". " : ""}{heatCellText(c)}</span></>
              : <span className="sr-only">no outcome linked</span>}
          </td>) : <td colSpan={Math.max(1, plos.length)} className="heat-none">{r.note}</td>}
        </tr>)}</tbody>
      </table>
    </div>
    {!plos.length ? <p className="muted">The programme has no PLOs recorded, so the matrix has no columns.</p> : null}
  </section>;
}
