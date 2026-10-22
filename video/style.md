# Style

A flat, colourful cartoon explainer of the kind the big infographics channels make: bold shapes, a dark field, bright accents, everything gently moving, a narrator you can see, captions that belong to the picture. The Dataworks guide was the template; this is the same document rewritten for Lyceum's tokens (plan Section 16.1). Inspired by that look, never copied: no other channel's characters, music or sound.

Every colour below is a token in `src/theme/tokens.ts`, used by name; the film imports that file, so a value is never typed here or in the project.

## Frame

- 1920 by 1080 at 30 fps.
- Margins: 96 px left and right, 64 px top.
- **Caption band:** y 880 to 1040 belongs to the captions. Nothing important goes below y 860.
- **Speakers:** the host bottom left in a round badge on a `forest2` panel (x 96 to 380); the lecturer figure bottom right (x 1540 to 1824) when she asks. Captions sit between them, x 400 to 1520.
- **Chapter chip** top left from the first scene: a rounded pill in `forest2`, the step name in JetBrains Mono, the acting helper's 24 px mascot beside it. A scene from the saved sample says "sample" in the chip.

## Colour

Lime is the one thing to look at in any shot: a receipt, a count, a decision.

| Token | Use |
|:--|:--|
| `forest` to `forestDeep` | the field: a vertical gradient, `forest` at the top, `forestDeep` at the bottom, with a soft vignette; `forestDeep` never sits under text smaller than 24 px |
| `forest2` | panels, chips, the caption box (at 85%) |
| `forestBorder` | decorative edges on the dark field |
| `lime` | the one thing to look at; the host's caption bar; stressed words in captions |
| `ray2`, `ray3` | data on the dark field (bars, cells, the ring); `ray3` is the lecturer's caption bar |
| `white` | primary text on the field |
| `onForest` | secondary text on the field |
| `mint`, `dots` | light scenes (the app) sit on mint with the dot grid |
| `tint1`, `tint2` | the receipt slip, chips and badges on light surfaces |
| `emeraldText`, `emerald` | green text and data fills on light surfaces only |
| `warn` on `warnSoft` | only on a check that blocks, and for what is not built |
| `danger` on `dangerSoft` | only on a refusal: the paraphrase, a failed fetch |

The audit's rules hold in the film as in the app: lime only on forest surfaces, never as text on a light one; on forest, data uses `ray2`, `ray3` and `lime`, never `emerald` (2.96 to 1 on `forest`, under the 3 to 1 a graphic needs). That is why the lecturer's caption bar is `ray3`, not the `emerald` Section 16.1 first named.

## Type

- **Bricolage Grotesque** 800 at 120 to 180 px for the big numbers, 600 at 48 to 64 px for scene titles.
- **Plus Jakarta Sans** 600 at 36 to 48 px for labels, 700 at 48 px for captions.
- **JetBrains Mono** at 26 to 28 px for chips, dates and ids.
- The bundled files from `public/fonts`, loaded before the first frame; nothing is fetched at render time.
- No en or em dash on screen. Use commas, colons or "to" (`12 to 18 months`).

## Illustration

- Flat shapes, rounded corners, no outlines except the characters' forest ink.
- No blur anywhere: a shadow is a flat offset in `forestDeep`, because the browser rasterises a large blur a little differently on every render, and the film must render the same twice.
- Two-tone shading: light top left, dark bottom right.
- A soft glow only on the one thing that matters in the shot.
- Three depth layers moving at slightly different speeds when the camera moves.
- Drawn scenes for beats 1, 2, 4, 7 and 8 (the desk, the calendar against the churn, the loop, the doors, the ring closing); the real app, captured by script, inside a drawn frame for beats 3, 5 and 6.

## Characters

- **The host, Tualang**, presents: bottom left in its round badge, its mouth opening with the loudness of the voice, the lime leaf as its prop. The same drawing as the app (`src/ui/mascots/host.tsx`).
- **The lecturer figure**, Dr Aisyah, appears bottom right when she asks: faceless but for two dot eyes and a mouth that opens with her voice, a quarter turn towards the host. She is fictional, and the film says so once.
- **The seven helpers** pop in at their stations while their step runs and never narrate.
- Mascots are the cutest thing on screen and never read as data: no mascot sits on a chart, and none appears on a refusal or an error.

## Motion

- Nothing is ever completely still: idle objects float 3 to 5 px on a slow sine (about 3 s), the dots drift.
- Entrances pop with a spring (damping about 12); smooth moves glide (damping 200).
- Text appears word by word with a two-frame stagger.
- Numbers count up over 0.6 to 1.0 s and stop on the exact value in `docs/claims.md`.
- Bars draw in over 1 to 1.5 s; whiskers snap in after.
- Scene changes: a camera push through an object into the next scene, or a soft circle wipe, 12 to 18 frames.
- At most three things moving at once; every key number held for 2 s.

## Charts

- On a `forest2` panel with 32 px corners, no gridlines, one series, the count on each bar, the axis ending at the denominator, labels at the ends of lines instead of a legend.
- The same meaning has the same colour in every scene.

## Captions

Always on, burned in, and written to `captions.srt` beside each render.

- **Text and timing:** the script's words with the recording's timing, from `video/audio/transcripts/<line>.srt` once the voices are recorded; until then the timing is estimated from the script at 2.6 words a second, and the review copy says so.
- **Look:** Plus Jakarta Sans 700 at 48 px, `white`, centred between x 400 and 1520 in the band; a rounded box in `forest2` at 85% with an 18 px radius; a 6 px bar on the box's left edge in the speaker's colour (the host `lime`, the lecturer `ray3`, both when everyone speaks).
- **Stressed words** (bold in `script.md`) in `lime` at weight 800.
- **Size and pace:** at most two lines of 42 characters, 1 to 6 s on screen.
- **Motion:** each caption rises 8 px and fades in over 4 frames. No karaoke, no speaker names, no sound tags, no dashes.

## Sound

- **Voices:** the team's own, one file per line, two takes, a phone in a quiet room (the Shenzhen recording rules), in `video/audio/<cut>/`. Text to speech only as the documented fallback.
- **Music:** a bed only with a licence that allows YouTube use, saved beside the file; about 18 dB under the voices and up where nobody speaks. None is chosen yet, so the review renders are silent apart from the voices.
- **Mix:** near -14 LUFS integrated, true peak no higher than -1 dBTP.

## Numbers

Only from `docs/claims.md`, through `scripts/sync.mjs`; never typed or rounded in the project. Footage from the saved sample is labelled as the sample in its chip.

## Export

- Master: H.264, CRF 18, yuv420p, 1920 by 1080, 30 fps, AAC 48 kHz once there is a voice; a 1280 by 720 review copy.
- Captions and chapters written beside each render; renders are never committed.
- Reproducible: PNG frames from Remotion, encoded by the system ffmpeg, which gives the same file from the same frames; two renders of the same inputs give the same frames, apart from a level now and then in a background pixel where the browser's rasteriser rounds differently, which `scripts/determinism.mjs` measures.
