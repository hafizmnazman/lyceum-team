// What the counters share (depth plan Sections 6.2 and 9.1): the reduced-motion preference, the easing, and a text with its
// numbers scaled toward their final values, which it reaches exactly at the end and never passes.

export const reducedMotion = () => typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

export const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/** The text with each number scaled by k from 0 to 1, keeping its thousands separators and decimal places; at 1 the text
 *  comes back unchanged. */
export function countedText(text: string, k: number): string {
  if (k >= 1) return text;
  const f = Math.max(0, k);
  return text.replace(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g, (m) => {
    const places = m.includes(".") ? m.length - m.indexOf(".") - 1 : 0;
    const n = Number(m.replace(/,/g, "")) * f;
    const fixed = n.toFixed(places);
    return m.includes(",") ? Number(fixed).toLocaleString("en-GB", { minimumFractionDigits: places, maximumFractionDigits: places }) : fixed;
  });
}
