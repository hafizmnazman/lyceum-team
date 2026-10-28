import { useState } from "react";
import { createCourseWorkspace } from "../../app/store.ts";
import { Button, Field, Input } from "../primitives/index.tsx";
import { useUnsavedEditor } from "../useUnsavedEditor.ts";

export function CourseCreationPanel({ onCancel }: { onCancel: () => void }) {
  const [code,setCode] = useState(""), [title,setTitle] = useState(""), [programmeTitle,setProgramme] = useState("");
  const [year,setYear] = useState(1), [semester,setSemester] = useState(1), [error,setError] = useState("");
  useUnsavedEditor(Boolean(code || title || programmeTitle));
  return <form className="workspace-panel" aria-labelledby="new-course-title" onSubmit={e => {
    e.preventDefault();
    const result = createCourseWorkspace({ code,title,programmeTitle,year,semester });
    if (!result.ok) setError(result.error);
  }}>
    <h2 id="new-course-title">Create a personal course workspace</h2>
    <p>Start from your existing course. Add its outcomes and topic outline in the next step. This creates local preparation, not an official university course.</p>
    {error ? <p role="alert" className="form-error">{error}</p> : null}
    <div className="form-grid">
      <Field label="Course code"><Input required maxLength={40} data-demo-id="new-course-code" value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. BUS205" /></Field>
      <Field label="Course title"><Input required maxLength={200} data-demo-id="new-course-title" value={title} onChange={e => setTitle(e.target.value)} /></Field>
      <Field label="Programme (optional)"><Input value={programmeTitle} onChange={e => setProgramme(e.target.value)} /></Field>
      <Field label="Year"><Input type="number" min={1} max={12} value={year} onChange={e => setYear(Number(e.target.value))} /></Field>
      <Field label="Semester"><Input type="number" min={1} max={4} value={semester} onChange={e => setSemester(Number(e.target.value))} /></Field>
    </div>
    <div className="button-row"><Button type="submit" variant="primary" data-demo-id="new-course-create">Create course workspace</Button><Button type="button" onClick={() => {
      if (!(code || title || programmeTitle) || window.confirm("Discard this unsaved course form?")) onCancel();
    }}>Cancel</Button></div>
  </form>;
}
