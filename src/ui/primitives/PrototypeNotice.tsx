/** Above every sandbox screen while the legacy fixtures remain: one line, the two facts that matter. */
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
      <strong>Illustrative.</strong> The figures and learners on this screen are synthetic, and no forecast here is validated.
    </aside>
  );
}
