# The film

Two cuts from one Remotion project (plan Section 16): **Loop90**, the loop in about 90 seconds, for the pitch (slide 5 of the deck) and the landing page; and **Afternoon**, one afternoon in about three minutes, for the organiser's media and the booth fallback. The pipeline is the one the team ran for Dataworks and Shenzhen, re-themed to forest and lime.

```text
script  ->  capture  ->  voices  ->  transcribe  ->  sync  ->  render  ->  review
(done)      (done,       (the        (a laptop)      (each     (a         (the team,
            by script)   team)                       change)   laptop)    Section 16)
```

## What is here

| Path | What it is |
|:--|:--|
| [script.md](script.md) | the words for both cuts, two voices, the stressed words, the tour excerpts each app scene plays |
| [storyboard.md](storyboard.md) | what is on screen in every scene and the cue word each move waits for |
| [style.md](style.md) | the look in the tokens: frame, colour, type, characters, motion, captions, sound, export |
| `capture/capture.mjs` | records the real app once, the self-driving tour on the dated saved sample at 1920 by 1080, and the time of every tour caption |
| `remotion/` | the project: `scripts/sync.mjs` builds the timeline, `src/` draws the film, `scripts/render.mjs` renders, `scripts/determinism.mjs` renders twice and compares |
| `audio/` | the voices once recorded: `audio/<cut>/<scene>-<n>.wav`, one file per line of `script.md`, and `audio/transcripts/<cut>/<scene>-<n>.json` with the word timings |
| `out/` | renders, captions (`.srt`) and chapters; not committed |

## Run it

From the repository root, once: `npm run build`, then `node video/capture/capture.mjs` (about seven minutes; it plays the tour and records it). Then from `video/remotion/`:

```text
npm install                 Remotion 4.0.537, pinned, into video/remotion/node_modules
npm run studio              preview both cuts in the browser
npm run render:loop90       out/loop90.mp4, a 720p copy, captions and chapters
npm run render:afternoon    the same for the long cut
npm run check:determinism   render Loop90 twice and compare every frame
```

Rendering uses the Chrome or Edge already installed and the ffmpeg on the PATH: Remotion draws each frame once as a PNG, and ffmpeg encodes the master and the 720p copy from those frames. `npm run check:determinism` renders Loop90 twice and diffs the frames before encoding: it counts the identical ones, measures any that differ in pixels and levels, and fails on a missing frame or on any pixel more than 2 levels apart; then it encodes one set of frames twice to show the encoder adds nothing. The film has no blur, because the browser rasterises a large blur a little differently on every render. The temporary frames need about 1.2 MB each (3 GB for Loop90, 8 GB for Afternoon, twice that for the check) and are deleted after the encode. Copy `out/loop90.mp4` to `deck/media/loop90.mp4` and run `npm run deck` in the repository, and the film plays on slide 5 and rides in the PPTX.

## What needs a person

- **The voices.** Two speakers: the host (the builder's voice) and Dr Aisyah (the sceptic's voice). One WAV per line, named as above, two takes, a phone in a quiet room (the Shenzhen recording rules). Until they exist, every line is timed from its words at 2.6 a second, the mouths stay closed and the render is silent; `scripts/sync.mjs` says how many lines are recorded.
- **Transcription.** faster-whisper with word timings, written as `[{ "word", "start", "end" }]` per line; the captions keep the script's words and take the recording's timing.
- **The music bed**, only with a licence that allows YouTube use, saved beside the file. None is chosen.
- **The review** (Section 16): every number on screen against `docs/claims.md` and the voice, the sample labelled as the sample, no dash in a caption, it reads with the sound off, under its length, one watch on a phone.
- **Remotion's licence.** Remotion is free for individuals and for organisations of up to three people, and educational institutions are not covered by its free tier unless Remotion agrees in writing; who owns Lyceum, the team or the university, decides which applies (plan Section 16.1). Confirm before the film is published.

## Rules

- Numbers on screen only from `docs/claims.md`, through the sync, which fails on any other number in a caption.
- No en or em dashes on screen, in captions or in these files.
- No mention or credit of the tools that made the film.
- The footage is the real app on the saved sample, and its chip says so.
- Renders, footage and `node_modules` are never committed.
