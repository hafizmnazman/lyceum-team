// Editors register unsaved work; tab switches preserve it, course/page exits ask.
const editors = new Set<symbol>();

export function registerUnsavedEditor(): () => void {
  const id = Symbol("unsaved editor");
  editors.add(id);
  return () => { editors.delete(id); };
}

/** The kiosk's idle return (depth plan Section 9.1, D6b): the visitor has walked away from the booth, so their unsaved
 *  edits in the sample workspace go without asking anyone. */
export function discardUnsavedEditors(): void {
  editors.clear();
}

export function confirmLeaveEditor(): boolean {
  if (!editors.size || typeof window === "undefined") return true;
  if (!window.confirm("You have unsaved teaching-plan edits. Leave this course or page and discard those edits?")) return false;
  editors.clear();
  return true;
}
