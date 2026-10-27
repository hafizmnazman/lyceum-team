// The institution's settings on the Guide page (depth plan Section 3.1): every value that shapes a figure, with
// where its default comes from. A course coordinator edits them; everyone else reads them.
import { useState } from "react";
import { mayEditInstitution, saveInstitutionProfile, useStore } from "../../app/store.ts";
import { INSTITUTION_HELP } from "../../data/institution.ts";
import type { InstitutionProfile } from "../../types.ts";
import { Button, Disclosure, Field, Input, Textarea } from "../primitives/index.tsx";

const percent = (share: number) => Math.round(share * 1000) / 10;

export function InstitutionPanel() {
  const { institution } = useStore();
  const editable = mayEditInstitution();
  const [form, setForm] = useState(() => toForm(institution));
  const [message, setMessage] = useState("");
  const set = (key: keyof ReturnType<typeof toForm>) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });
  const scale = institution.surveyScale;
  return <section className="workspace-panel" aria-labelledby="institution-settings" data-demo-id="institution-panel">
    <h2 id="institution-settings">Institution</h2>
    <p>{institution.name}</p>
    <dl className="course-facts">
      <div><dt>Attainment KPI</dt><dd>{percent(institution.kpi.studentShare)}% of students at {institution.kpi.passMark} or above, per outcome</dd></div>
      <div><dt>Survey scale</dt><dd>{scale.min} to {scale.max}, target {scale.target} or higher</dd></div>
      <div><dt>Response floor</dt><dd>{institution.surveyFloor} responses and {percent(institution.surveyFloorShare)}% of the class, the stricter applied</dd></div>
      <div><dt>Survey results</dt><dd>Released after grades</dd></div>
      <div><dt>LMS</dt><dd>{institution.lms}</dd></div>
      <div><dt>Term pattern</dt><dd>{institution.termPattern}</dd></div>
    </dl>
    <Disclosure summary={editable ? "Change the settings" : "Where each setting comes from"} data-demo-id="institution-disclosure">
      <form className="institution-form" onSubmit={(e) => {
        e.preventDefault();
        const result = saveInstitutionProfile(fromForm(form, institution));
        setMessage(result.ok ? "Saved." : result.error);
      }}>
        <div className="form-grid">
          <Field label="Name"><Input value={form.name} onChange={set("name")} disabled={!editable} /></Field>
          <Field label="Short name"><Input value={form.shortName} onChange={set("shortName")} disabled={!editable} /></Field>
          <Field label="Term pattern"><Input value={form.termPattern} onChange={set("termPattern")} disabled={!editable} /></Field>
          <Field label="Pass mark (out of 100)"><Input type="number" min={1} max={100} value={form.passMark} onChange={set("passMark")} disabled={!editable} data-demo-id="institution-pass-mark" /></Field>
          <Field label="KPI share of students (%)"><Input type="number" min={1} max={100} value={form.studentShare} onChange={set("studentShare")} disabled={!editable} data-demo-id="institution-share" /></Field>
          <Field label="LMS"><Input value={form.lms} onChange={set("lms")} disabled={!editable} /></Field>
          <Field label="Response floor (responses)"><Input type="number" min={1} value={form.surveyFloor} onChange={set("surveyFloor")} disabled={!editable} data-demo-id="institution-floor" /></Field>
          <Field label="Response floor (% of the class)"><Input type="number" min={1} max={100} value={form.surveyFloorShare} onChange={set("surveyFloorShare")} disabled={!editable} data-demo-id="institution-floor-share" /></Field>
        </div>
        <label className="checkbox-line"><input type="checkbox" checked={form.showMark} disabled={!editable} data-demo-id="institution-show-mark"
          onChange={(e) => setForm({ ...form, showMark: e.target.checked })} />Show the institution's mark on sample material, always with the demo line</label>
        <Field label="Data controller line" hint={INSTITUTION_HELP.controller}><Textarea rows={2} value={form.controller} onChange={set("controller")} disabled={!editable} /></Field>
        <dl className="institution-help">
          <div><dt>The KPI</dt><dd>{INSTITUTION_HELP.kpi}</dd></div>
          <div><dt>The method</dt><dd>{INSTITUTION_HELP.method}</dd></div>
          <div><dt>The scale</dt><dd>{INSTITUTION_HELP.scale}</dd></div>
          <div><dt>The floor</dt><dd>{INSTITUTION_HELP.floor}</dd></div>
          <div><dt>The release</dt><dd>{INSTITUTION_HELP.release}</dd></div>
          <div><dt>The LMS</dt><dd>{INSTITUTION_HELP.lms}</dd></div>
        </dl>
        {editable
          ? <div className="button-row"><Button type="submit" variant="primary" data-demo-id="institution-save">Save the settings</Button></div>
          : <p className="muted">Only a course coordinator can change these settings.</p>}
        {message ? <p role="status" className="save-status">{message}</p> : null}
      </form>
    </Disclosure>
  </section>;
}

function toForm(p: InstitutionProfile) {
  return { name: p.name, shortName: p.shortName, termPattern: p.termPattern, lms: p.lms, controller: p.controller, showMark: p.showMark,
    passMark: String(p.kpi.passMark), studentShare: String(percent(p.kpi.studentShare)),
    surveyFloor: String(p.surveyFloor), surveyFloorShare: String(percent(p.surveyFloorShare)) };
}
function fromForm(f: ReturnType<typeof toForm>, base: InstitutionProfile): InstitutionProfile {
  return { ...base, name: f.name.trim(), shortName: f.shortName.trim(), termPattern: f.termPattern.trim(), lms: f.lms.trim(), controller: f.controller.trim(),
    showMark: f.showMark, kpi: { ...base.kpi, passMark: Number(f.passMark), studentShare: Number(f.studentShare) / 100 },
    surveyFloor: Number(f.surveyFloor), surveyFloorShare: Number(f.surveyFloorShare) / 100 };
}
