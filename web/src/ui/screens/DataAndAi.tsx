// Where a lecturer's data goes and which rules the helpers follow (docs/research/education-compliance-2026-10-28.md):
// the short notice onboarding shows before anything is uploaded, and the full page in Settings, with the country chosen
// at onboarding and editable here. A summary for the lecturer, not a privacy policy or terms of service.

import { useState } from "react";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { COUNTRIES, RULESETS, isCountry, type Country } from "../../../../shared/lib/compliance.ts";
import { saveOnboardingProfile, useStore } from "../../app/store.ts";
import { Button, Field, Tag } from "../primitives/index.tsx";
import { Dropdown } from "../primitives/Dropdown.tsx";

// ponytail: this deployment's services, written out; read them from the API's settings if the hosts ever vary per install.
const PROCESSORS = [
  { name: "Supabase", does: "Accounts, profiles, your workspace and the helpers' call record", where: "Singapore" },
  { name: "Cloudflare R2", does: "The files you upload (outlines, results, slides)", where: "Asia-Pacific" },
  { name: "Render", does: "The Lyceum API that runs the helpers", where: "Singapore" },
  { name: "Vercel", does: "Serves the web app; holds no records", where: "Global edge network" },
  { name: "The model provider set in Settings", does: "Reads each helper's prompt and writes its reply", where: "Depends on the provider" },
  { name: "The search provider set in Settings", does: "Runs Scout's web searches (the queries only)", where: "Depends on the provider" },
];

const BOX = "grid gap-1.5 rounded-xl border-2 border-dashed border-border bg-tint-1 px-3.5 py-3 text-[14px]";

/** Onboarding's notice: four lines, before the first upload. */
export function DataNotice() {
  return <aside className={BOX} aria-label="Where your data goes">
    <strong className="flex items-center gap-2"><ShieldCheck size={16} aria-hidden="true" /> Where your data goes</strong>
    <ul className="muted m-0 grid gap-1 pl-5">
      <li>Your workspace is stored in Supabase (Singapore) and your uploads in Cloudflare R2 (Asia-Pacific).</li>
      <li>The helpers send what they read to the AI model provider. Lyceum never uses your material to train a model.</li>
      <li>Do not upload student names, matric numbers or emails. Results files have those columns removed before any model reads them.</li>
      <li>Everything a helper drafts is yours to check, and carries an AI use citation for your students.</li>
    </ul>
  </aside>;
}

/** Settings' Data & AI section: the country, its rules with their sources, the services and how long each thing is kept. */
export function DataAndAiPanel() {
  const state = useStore();
  const user = state.account?.user ?? null;
  const [country, setCountry] = useState<string>(user?.country ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const shown: Country | null = isCountry(country) ? country : user ? null : "MY"; // a demo persona works at the demo's Malaysian campus
  const rules = shown ? RULESETS[shown] : null;

  async function save() {
    if (!user || !isCountry(country)) return;
    setBusy(true); setMessage("");
    const r = await saveOnboardingProfile({ name: user.name, institution: state.institution.name, programme: state.programme.title, country });
    setBusy(false);
    setMessage(r.ok ? "Saved. The helpers use " + RULESETS[country].label + "'s rules from the next request." : r.error);
  }

  return <section className="workspace-panel grid gap-3 [&_h3]:mt-3 [&_h3]:mb-0" aria-labelledby="settings-data">
    <div className="section-heading"><div><h2 id="settings-data">Data &amp; AI</h2>
      <p className="muted">A summary of where your data goes and which rules the helpers follow. It is not a privacy policy or terms of service, and not legal advice.</p></div></div>

    {user ? <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-60 flex-1"><Field label="Country you teach in" hint="Every helper's prompt carries this country's framework and data rules."><Dropdown value={country} onChange={setCountry} options={COUNTRIES.map((c) => ({ value: c, label: RULESETS[c].label }))} /></Field></div>
      <Button className="sm:mt-[30px]" variant="primary" loading={busy} disabled={!isCountry(country) || country === user.country} onClick={() => void save()}>Save country</Button>
    </div> : <p className="muted">The demo campus is in Malaysia, so the demo's helpers follow Malaysia's rules.</p>}
    {message ? <p role="status" className="save-status">{message}</p> : null}

    {rules ? <dl className="grid gap-3">
      <div><dt className="font-semibold">Accreditation framework</dt><dd className="m-0">{rules.framework ?? "No framework researched for this country yet; the helpers use general outcome terms."}</dd></div>
      <div><dt className="font-semibold">Data protection</dt><dd className="m-0">{rules.dataLaw}.</dd></div>
      <div><dt className="font-semibold">AI in teaching</dt><dd className="m-0">{rules.aiRule}.</dd></div>
      {rules.sources.length ? <div><dt className="font-semibold">Sources</dt><dd className="m-0"><ul className="m-0 grid gap-1 pl-5">{rules.sources.map((s) =>
        <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label} <ExternalLink size={12} aria-hidden="true" /></a> <Tag>{s.kind === "P" ? "Primary" : "Secondary"}</Tag></li>)}</ul></dd></div> : null}
    </dl> : <p className="muted">No country set yet: the helpers follow the general rules below until you choose one.</p>}

    <h3>What every helper is told</h3>
    <ul className="m-0 grid gap-1 pl-5">
      <li>Never include, ask for or infer any student's personal data; group-level figures only.</li>
      <li>Use only the material in the request, and say so when it does not cover something.</li>
      <li>What it writes is a draft for you to review and declare to your students.</li>
    </ul>

    <h3>Services that hold or read your data</h3>
    <div className="table-scroll"><table className="evidence-table">
      <thead><tr><th scope="col">Service</th><th scope="col">What for</th><th scope="col">Where</th></tr></thead>
      <tbody>{PROCESSORS.map((p) => <tr key={p.name}><td>{p.name}</td><td>{p.does}</td><td>{p.where}</td></tr>)}</tbody>
    </table></div>

    <h3>How long things are kept</h3>
    <ul className="m-0 grid gap-1 pl-5">
      <li>What was sent to the model and what came back: 30 days, then cleared. The call's date, helper, model and cost stay for the metrics.</li>
      <li>Your workspace and uploads: until you delete your account, which removes your files from storage and your records from the database.</li>
      <li>A sign-up never finished: deleted after a day.</li>
    </ul>

    <h3>Training, ownership and breaches</h3>
    <ul className="m-0 grid gap-1 pl-5">
      <li>Your outlines, slides and results stay yours or your institution's. Lyceum uses them only to run the helpers for you and never trains a model on them.</li>
      <li>The model provider applies its own data policy to what it receives; the operator should choose one that does not train on prompts.</li>
      <li>If a breach affects your data, the aim is to notify the regulator within 72 hours of finding it and you within 7 days after that, as Malaysia's PDPA breach guideline asks.</li>
    </ul>
  </section>;
}
