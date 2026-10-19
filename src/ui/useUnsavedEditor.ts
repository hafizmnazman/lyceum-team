import { useEffect } from "react";
import { registerUnsavedEditor } from "../app/unsaved.ts";

export function useUnsavedEditor(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const unregister = registerUnsavedEditor();
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => { unregister(); window.removeEventListener("beforeunload", warn); };
  }, [dirty]);
}
