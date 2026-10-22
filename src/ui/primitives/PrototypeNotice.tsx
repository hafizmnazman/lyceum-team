/** Visible on public and signed-in surfaces while the legacy fixtures remain. */
export function PrototypeNotice() {
  return (
    <aside
      aria-label="Prototype data limitations"
      style={{
        padding: "10px 20px",
        background: "var(--tint-1)",
        color: "var(--ink-2)",
        borderBottom: "1px solid var(--border)",
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      <strong>Prototype data.</strong> Seeded market figures and learner examples are synthetic.
      Uploaded files are user-provided; learning forecasts have not been validated.
    </aside>
  );
}
