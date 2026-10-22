// The student's survey page (depth plan Section 7.2), a route of the built app that needs no sign-in. The form comes from
// the link: the whole form in the fragment, or a short link whose form the booth collector holds. The answers go to the
// collector on the laptop that showed the link, and a random id drawn on this device lets it answer once. On the paste
// way's link the page sends nothing: it gives the student a code to paste into the course page or an email, and says that
// the channel identifies them. Nothing on the page asks for, keeps or sends a name, an email or an address.

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle } from "lucide-react";
import { CANNOT_SAY, CONSENT_LINE, PASTE_CONSENT_LINE, PASTE_WARNING, SCALE_LABELS, STUDENT_COMMENT_WARNING, decodeForm, pasteCode, validForm, type StudentForm } from "../../lib/surveys.ts";
import type { SurveyAnswer } from "../../types.ts";
import { Button, Tag } from "../primitives/index.tsx";

const DEVICE = /^[A-Za-z0-9-]{8,64}$/;
function deviceId(token: string): string {
  try {
    const key = "lyceum-survey-device-" + token, kept = localStorage.getItem(key);
    if (kept && DEVICE.test(kept)) return kept;
    const id = crypto.randomUUID();
    localStorage.setItem(key, id);
    return id;
  } catch {
    return crypto.randomUUID(); // no storage: one id for this visit
  }
}
const sentBefore = (token: string) => { try { return localStorage.getItem("lyceum-survey-sent-" + token) === "1"; } catch { return false; } };
const markSent = (token: string) => { try { localStorage.setItem("lyceum-survey-sent-" + token, "1"); } catch { /* the collector still refuses a second answer */ } };

export function SurveyPage({ reference }: { reference: string }) {
  const short = reference.startsWith("t/") ? reference.slice(2) : null;
  const fromLink = useMemo(() => (short ? null : decodeForm(reference)), [reference, short]);
  const [fetched, setFetched] = useState<StudentForm | null>(null);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    if (!short) return;
    if (!/^[A-Za-z0-9_-]{22}$/.test(short)) { setLoadError("This link is not complete. Ask for it again."); return; }
    let live = true;
    fetch("/api/survey/" + short + "/form")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((b: { form?: unknown }) => { if (!live) return; const f = validForm(b.form); if (f) setFetched(f); else setLoadError("The form behind this link could not be read."); })
      .catch(() => { if (live) setLoadError("The survey could not be loaded from the laptop that showed this link. Check you are on its network, or ask for the long link."); });
    return () => { live = false; };
  }, [short]);
  const form = fromLink ?? fetched;
  const [answers, setAnswers] = useState<Record<string, SurveyAnswer>>({});
  const [phase, setPhase] = useState<"idle" | "sending" | "sent" | "already" | "error">("idle");
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const paste = form?.m === "paste";
  useEffect(() => { if (form && form.m !== "paste" && sentBefore(form.f)) setPhase("sent"); }, [form]);

  if (!form) return <main className="survey-page" data-demo-id="survey-page">
    {short && !loadError ? <p role="status">Loading the survey.</p>
      : <><h1>This survey link does not open a form</h1><p>{loadError || "The link is not complete. Ask your lecturer for it again."}</p></>}
  </main>;

  async function submit(event: FormEvent) {
    event.preventDefault();
    // The paste way sends nothing: the code is made here, from the answers and this device's random id.
    if (paste) { setCode(pasteCode(form!, deviceId(form!.f), answers)); setPhase("sent"); return; }
    setPhase("sending"); setError("");
    try {
      const res = await fetch("/api/survey/" + form!.f, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientId: deviceId(form!.f), answers }) });
      if (res.status === 409) { markSent(form!.f); setPhase("already"); return; }
      if (!res.ok) { const body = await res.json().catch(() => ({})) as { error?: string }; throw new Error(body.error || "the collector answered " + res.status); }
      markSent(form!.f);
      setPhase("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }
  const points = Array.from({ length: form.s[1] - form.s[0] + 1 }, (_, i) => form.s[0] + i);
  const labelOf = (v: number) => (form.s[0] === 1 && form.s[1] === 5 ? SCALE_LABELS[v - 1] : null);
  const setAnswer = (id: string, value: SurveyAnswer | null) => setAnswers((a) => { const next = { ...a }; if (value === null) delete next[id]; else next[id] = value; return next; });

  return <main className="survey-page" data-demo-id="survey-page">
    <header className="survey-head">
      {form.mark ? <img className="survey-mark" src={form.mark} alt={form.alt ?? ""} /> : null}
      <div><p className="eyebrow">{form.inst}</p><h1>{form.t}</h1><p className="muted">{form.c} · {form.term}</p></div>
    </header>
    {form.demo ? <p className="sample-line"><Tag tone="warn">Sample, synthetic</Tag> {form.demo}</p> : null}
    {form.note ? <p className="limitation">{form.note}</p> : null}
    <p>{paste ? PASTE_CONSENT_LINE : CONSENT_LINE}</p>
    {paste ? <p className="paste-warning" data-demo-id="survey-paste-warning"><AlertTriangle size={16} aria-hidden="true" /><strong>{PASTE_WARNING}</strong></p> : null}
    <p className="muted">{form.ctl} <a href={form.priv} target="_blank" rel="noreferrer">The university's general privacy notice</a>, linked as this demo's example.</p>
    {phase === "sent" && paste ? <section className="survey-done" role="status" data-demo-id="survey-done">
      <h2>Your code</h2>
      <p>Copy it and paste it where your lecturer asked, on the course page or in an email.</p>
      <p className="paste-warning"><AlertTriangle size={16} aria-hidden="true" /><span><strong>{PASTE_WARNING}</strong> The code holds only your answers and a random id from this device.</span></p>
      <textarea className="paste-code" readOnly value={code} aria-label="Your code" onFocus={(e) => e.currentTarget.select()} data-demo-id="survey-code" />
      <div className="button-row"><Button onClick={() => void navigator.clipboard?.writeText(code)}>Copy the code</Button><Button variant="quiet" onClick={() => setPhase("idle")}>Change my answers</Button></div>
    </section>
      : phase === "sent" || phase === "already" ? <section className="survey-done" role="status" data-demo-id="survey-done">
      <h2>Thank you</h2>
      <p>{phase === "sent" ? "Your answers were sent. Nothing you submitted identifies you." : "This device has already answered this survey."} A device answers once.</p>
    </section>
      : <form onSubmit={submit} noValidate>
        {form.q.map(([id, text, kind]) => kind === "scale"
          ? <fieldset className="survey-q" key={id}>
            <legend>{text}</legend>
            <div className="survey-scale">
              {points.map((v) => <label key={v}><input type="radio" name={id} checked={answers[id] === v} onChange={() => setAnswer(id, v)} data-demo-id={"survey-" + id + "-" + v} />
                <span><strong className="tabular">{v}</strong>{labelOf(v) ? " " + labelOf(v) : ""}</span></label>)}
              <label><input type="radio" name={id} checked={answers[id] === "cannot-say"} onChange={() => setAnswer(id, "cannot-say")} /><span>{CANNOT_SAY}</span></label>
            </div>
          </fieldset>
          : <div className="survey-q" key={id}>
            <label htmlFor={"survey-" + id}>{text}</label>
            <p className="muted" id={"survey-warning-" + id}>{STUDENT_COMMENT_WARNING}</p>
            <textarea id={"survey-" + id} aria-describedby={"survey-warning-" + id} maxLength={2000} value={typeof answers[id] === "string" ? answers[id] as string : ""}
              onChange={(e) => setAnswer(id, e.target.value.trim() ? e.target.value : null)} />
          </div>)}
        {phase === "error" ? <p role="alert" className="form-error">The answers could not be sent: {error}. They are still here; try again.</p> : null}
        <Button type="submit" variant="primary" disabled={phase === "sending"} data-demo-id="survey-submit">{paste ? "Make my code" : phase === "sending" ? "Sending" : "Send my answers"}</Button>
      </form>}
  </main>;
}
