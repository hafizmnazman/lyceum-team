import { useRef, useState } from "react";
import { exportWorkspaceBackup, getRecoveryBackup, previewWorkspaceBackup, restoreWorkspaceBackup } from "../../app/store.ts";
import { MAX_BACKUP_BYTES } from "../../lib/workspaceBackup.ts";
import { downloadText } from "../../lib/download.ts";
import { Button, Field, Input } from "../primitives/index.tsx";

type Preview = Extract<ReturnType<typeof previewWorkspaceBackup>, { ok: true }>;
export function WorkspaceBackupPanel() {
  const [raw,setRaw] = useState(""), [preview,setPreview] = useState<Preview | null>(null);
  const [acknowledgement,setAcknowledgement] = useState(false), [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false), [hasRecovery,setHasRecovery] = useState(() => !!getRecoveryBackup());
  const inputRef = useRef<HTMLInputElement>(null), readSequence = useRef(0);
  function readPreview(content: string) {
    const result = previewWorkspaceBackup(content);
    setAcknowledgement(false);
    if (result.ok) { setRaw(content); setPreview(result); setMessage("Backup checked. Review its contents before replacing this workspace."); }
    else { setRaw(""); setPreview(null); setMessage(result.error); }
  }
  return <section className="workspace-panel" aria-labelledby="workspace-backups">
    <h2 id="workspace-backups">Workspace backup & recovery</h2>
    <p>A JSON backup includes courses, revisions, teaching sessions and uploaded records. It can restore saved data in this browser. Original uploaded files and unsaved edits are excluded. A Markdown plan is a document, not a backup.</p>
    <div className="button-row"><Button data-demo-id="backup-export" onClick={() => {
      downloadText("lyceum-workspace-backup.json",exportWorkspaceBackup(),"application/json"); setMessage("Workspace backup downloaded.");
    }}>Download workspace backup</Button>
      {hasRecovery ? <Button data-demo-id="backup-recovery" onClick={() => {
        const recovery = getRecoveryBackup(); if (recovery) downloadText("lyceum-pre-restore-recovery.json",recovery,"application/json");
      }}>Download pre-restore recovery</Button> : null}</div>
    <Field label="Choose a Lyceum JSON backup" hint="Up to 20 MB. Preview is read-only; restore replaces this browser workspace.">
      <Input ref={inputRef} type="file" accept=".json,application/json" disabled={busy} data-demo-id="backup-file" onChange={async e => {
        const file = e.target.files?.[0], sequence = ++readSequence.current;
        setRaw(""); setPreview(null); setAcknowledgement(false); setMessage("");
        if (!file) return;
        if (file.size > MAX_BACKUP_BYTES) { setMessage("This file exceeds the 20 MB backup limit."); return; }
        setBusy(true);
        try { const content = await file.text(); if (sequence === readSequence.current) readPreview(content); }
        catch { if (sequence === readSequence.current) setMessage("This file could not be read."); }
        finally { if (sequence === readSequence.current) setBusy(false); }
      }} />
    </Field>
    {message ? <p role="status" className="save-status" data-demo-id="backup-message">{message}</p> : null}
    {preview ? <div data-demo-id="backup-preview">
      <h3>Backup contents</h3><p className="muted">Exported {preview.exportedAt}</p>
      <dl className="course-facts">{Object.entries(preview.summary).map(([key,value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
      <p>Restore keeps a pre-import recovery copy. If storage cannot keep both copies, the current workspace is preserved.</p>
      <label className="checkbox-line"><input type="checkbox" data-demo-id="backup-ack" checked={acknowledgement} onChange={e => setAcknowledgement(e.target.checked)} />Replace the courses and saved records in this browser with this checked backup.</label>
      <div className="button-row"><Button variant="primary" disabled={!acknowledgement} data-demo-id="backup-restore" onClick={() => {
        const result = restoreWorkspaceBackup(raw,preview.fingerprint,acknowledgement);
        if (result.ok) { setRaw(""); setPreview(null); setAcknowledgement(false); setHasRecovery(true); if (inputRef.current) inputRef.current.value = ""; setMessage("Workspace restored. Download the recovery copy if needed."); }
        else { setMessage(result.error); setAcknowledgement(false); }
      }}>Restore checked backup</Button><Button onClick={() => readPreview(raw)}>Refresh preview</Button><Button onClick={() => {
        setRaw(""); setPreview(null); setAcknowledgement(false); setMessage("Import cancelled. Your workspace is unchanged."); if (inputRef.current) inputRef.current.value = "";
      }}>Cancel import</Button></div>
    </div> : null}
    <p className="muted">Backups may contain your course material and uploaded learner records. Keep them in your own storage. Real accounts and shared institutional storage remain in development.</p>
  </section>;
}
