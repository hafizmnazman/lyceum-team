// A small well-formedness check for the XML the app writes (D7's Moodle XML and QTI, D3b's Word document), used by the
// proofs. It is not a validator: the declaration alone on line 1, one root, every tag closed in order, attributes quoted,
// entities known, comments and CDATA closed.

export const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';

/** Null when the text is well-formed, otherwise what is wrong, in words. */
export function wellFormed(text: string, declaration = XML_DECLARATION): string | null {
  const first = text.split("\n")[0];
  if (first !== declaration) return "the declaration is not alone on line 1";
  const s = text.slice(first.length), stack: string[] = [];
  let i = 0, roots = 0;
  const badEntity = (t: string) => /&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/i.test(t);
  while (i < s.length) {
    if (s.startsWith("<!--", i)) { const e = s.indexOf("-->", i + 4); if (e < 0) return "an unclosed comment"; if (s.slice(i + 4, e).includes("--")) return "a double hyphen inside a comment"; i = e + 3; continue; }
    if (s.startsWith("<![CDATA[", i)) { const e = s.indexOf("]]>", i); if (e < 0) return "unclosed CDATA"; if (!stack.length) return "CDATA outside the root"; i = e + 3; continue; }
    if (s[i] === "<") {
      const e = s.indexOf(">", i);
      if (e < 0) return "an unclosed tag";
      const tag = s.slice(i + 1, e);
      if (tag.startsWith("/")) { const name = tag.slice(1).trim(); const open = stack.pop(); if (open !== name) return "</" + name + "> closes <" + open + ">"; }
      else {
        const m = /^([A-Za-z_][\w.:-]*)((?:\s+[\w.:-]+="[^"<]*")*)\s*(\/?)$/.exec(tag);
        if (!m) return "a malformed tag <" + tag.slice(0, 50) + ">";
        if (badEntity(m[2])) return "a bare ampersand in an attribute";
        if (!stack.length && ++roots > 1) return "a second root";
        if (!m[3]) stack.push(m[1]);
      }
      i = e + 1; continue;
    }
    const next = s.indexOf("<", i), part = s.slice(i, next < 0 ? undefined : next);
    if (badEntity(part)) return "a bare ampersand in text";
    if (!stack.length && part.trim()) return "text outside the root";
    i = next < 0 ? s.length : next;
  }
  return stack.length ? "<" + stack.at(-1) + "> is not closed" : roots === 1 ? null : "no root";
}
