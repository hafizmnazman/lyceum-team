// The film's theme: the app's tokens, imported, never copied (video/style.md).
import { color, font, withAlpha } from "../../../src/theme/tokens.ts";

export const C = color;
export const F = font;
export const alpha = withAlpha;

/** The speakers' caption bars: the host lime, the lecturer ray3 (emerald fails 3:1 on the dark field). */
export const SPEAKER_BAR = { host: color.lime, lecturer: color.ray3 } as const;
