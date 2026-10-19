# Lyceum: Gemini asset brief

Grounding: [as-built report](../lyceum-v3-as-built-2026-10-09.md), README.md, src/app/runs.ts, BrandImage.tsx, Landing.tsx, src/demo/script.ts and [pitch pack](fellowship-pitch-pack.md). Use the as-built report for feature claims where older pitch or README passages disagree. These are prompts for the owner, not generated assets or app changes.

## 1. Shared visual style

Use quiet, flat editorial illustration with two chromatic colours, indigo #3B5BDB and muted teal #527D75, plus neutral ink #343A40, pale grey #F1F3F5 and white #FFFFFF. Keep indigo dominant, teal sparse, generous whitespace, simple rounded geometry and consistent line weight equivalent to 2 pixels at 520 pixels wide. Use white or genuinely transparent backgrounds, never a drawn checkerboard. No text inside images, letters, numbers, logos, watermarks, photorealism, realistic faces, gradients, glossy 3D or dramatic shadows. People must be abstract faceless figures. Match the app's light surfaces; add editable Inter labels and Newsreader headings outside images in the slide editor.

## 2. Image assets

All filenames below are relative to `public/brand/`. Only hero is wired today. Other placements are proposed for presentations or later UI integration; dropping those files into the folder alone will not display them. Each prompt is independently pasteable.

| File | Pixels | Where it appears | Complete Gemini prompt |
|---|---|---|---|
| hero.png | 1560x900 | Existing signed-out landing hero | Create a 1560x900 flat illustration: three cards left to right, employer posting with attached receipt, course outline with linked topic blocks, meeting brief with receipts. Small connecting arrows, generous margins. Colours #3B5BDB and #527D75, neutrals #343A40 #F1F3F5 #FFFFFF. White background, uniform strokes, quiet geometry. No text, numbers, logos, watermark, faces, gradients, 3D or invented charts. |
| role-folio.png | 512x512 | Proposed role card, deck | Create a 512x512 flat icon: open syllabus and loose document entering a tidy folder containing outcome and topic blocks, with locator tabs. Centre with 15% padding. Palette #3B5BDB #527D75 #343A40 #F1F3F5 #FFFFFF. White background, uniform strokes. No text, numbers, logos, watermark, people, gradients, 3D or official certification seal. |
| role-scout.png | 512x512 | Proposed role card, deck | Create a 512x512 flat icon: pointer beside a search lens over employer posting cards, with attached link and calendar symbols. Convey collection initiated by a person. Centre, 15% padding. Palette #3B5BDB #527D75 #343A40 #F1F3F5 #FFFFFF. White, uniform strokes. No text, numbers, logos, watermark, people, gradients, 3D, surveillance radar or autonomous robot. |
| role-atlas.png | 512x512 | Proposed role card, deck | Create a 512x512 flat icon: selected source fragment connected by a dotted line to two course outcome blocks, with a separate pointer awaiting confirmation. Centre, 15% padding. Palette #3B5BDB #527D75 #343A40 #F1F3F5 #FFFFFF. White, uniform strokes. No text, numbers, logos, watermark, people, gradients, 3D or automatic approval ticks. |
| role-quill.png | 512x512 | Proposed role card, deck | Create a 512x512 flat icon: pencil beside two outline sheets, topic blocks inside fixed boundary rails, one protected block with a small lock. Centre, 15% padding. Palette #3B5BDB #527D75 #343A40 #F1F3F5 #FFFFFF. White, uniform strokes. No text, numbers, logos, watermark, people, gradients, 3D or approval stamp. |
| role-prism.png | 512x512 | Proposed role card, deck | Create a 512x512 flat icon: saved session card and evidence receipt feeding a stack of editable slide frames with small speaker-note panels below. Centre, 15% padding. Palette #3B5BDB #527D75 #343A40 #F1F3F5 #FFFFFF. White, uniform strokes. No text, numbers, logos, watermark, people, gradients, 3D, magic wand or publishing symbol. |
| role-lens.png | 512x512 | Proposed role card, deck | Create a 512x512 flat icon: magnifier over a bounded group of reviewed document tiles, a highlighted subset and one abstract capped interval line. Symbolic, not a data chart. Centre, 15% padding. Palette #3B5BDB #527D75 #343A40 #F1F3F5 #FFFFFF. White, uniform strokes. No text, numbers, logos, watermark, people, gradients, 3D, scores, forecasts or rising trend. |
| role-steward.png | 512x512 | Proposed role card, deck | Create a 512x512 flat icon: meeting folder with attached source receipts placed before an empty review table, a decision card left open. Centre, 15% padding. Palette #3B5BDB #527D75 #343A40 #F1F3F5 #FFFFFF. White, uniform strokes. No text, numbers, logos, watermark, people, gradients, 3D, gavel or approval seal. |
| journey.png | 1800x600 | Proposed five-step section, deck | Create an 1800x600 flat horizontal journey: search lens, source receipt, bounded counting tray, linked outcome blocks, brief and teaching slides. Five evenly spaced stations with small arrows and generous margins. Palette #3B5BDB #527D75 #343A40 #F1F3F5 #FFFFFF. White, uniform strokes. No text, numbers, logos, watermark, faces, gradients, 3D or performance chart. |
| persona-lecturer.png | 720x720 | Proposed audience card, deck | Create a 720x720 flat illustration: abstract faceless lecturer seated at a desk arranging session cards beside a laptop and evidence folder. Calm posture, generous whitespace. Palette #3B5BDB #527D75 #343A40 #F1F3F5 #FFFFFF. White, uniform strokes. No text, numbers, logos, watermark, realistic face, photographic detail, gradients, 3D or fake app interface. |
| persona-coordinator.png | 720x720 | Proposed audience card, deck | Create a 720x720 flat illustration: abstract faceless coordinator at a round table reviewing an open brief with attached receipts and linked course cards. Calm composition, generous whitespace. Palette #3B5BDB #527D75 #343A40 #F1F3F5 #FFFFFF. White, uniform strokes. No text, numbers, logos, watermark, realistic faces, gradients, 3D or automatic approval imagery. |
| persona-quality.png | 720x720 | Proposed audience card, deck | Create a 720x720 flat illustration: abstract faceless quality reviewer comparing stacked outline versions, a decision record and source receipts on a desk. Calm composition, generous whitespace. Palette #3B5BDB #527D75 #343A40 #F1F3F5 #FFFFFF. White, uniform strokes. No text, numbers, logos, watermark, realistic faces, gradients, 3D, accreditation seal or certification claim. |
| pain-gap.png | 1440x720 | Proposed problem section, deck | Create a 1440x720 flat illustration: scattered browser-shaped cards at left, isolated course folder in centre, meeting table at right. Small gaps between groups convey disconnected evidence. Sparse, calm, not chaotic. Palette #3B5BDB #527D75 #343A40 #F1F3F5 #FFFFFF. White, uniform strokes. No text, numbers, logos, watermark, faces, gradients, 3D or statistical graphics. |

Role boundaries: Folio reads course documents, produces a located course record, cannot establish official status. Scout reads permitted boards on request, retains posting provenance, cannot act unasked or change courses. Atlas reads kept postings and named skills, proposes quotations and mappings, cannot confirm them. Quill reads the brief, constraints and confirmed evidence, supports checked revisions, cannot approve them. Prism reads saved sessions and linked evidence, produces editable packs with notes, cannot publish or write model text. Lens reads reviewed postings and confirmed quotations, reports denominators, intervals and coverage, cannot predict learning or score employability. Steward reads the brief, sources and context, prepares and routes receipts, cannot decide.

## 3. Slide prompts, 1920x1080

**Seven-role pipeline.** Paste: Create a 1920x1080 flat conceptual workflow diagram. Two input tiles, document folder and requested board search, merge into mapping tiles, then branch to evidence analysis and constrained outline revision; revision leads to teaching slides; both branches end at a meeting brief. Seven stations total. Leave blank label space under each and top quarter empty. Use #3B5BDB #527D75 #343A40 #F1F3F5 #FFFFFF, white background, uniform strokes. No text, numbers, logos, watermark, faces, gradients, 3D, cloud services or autonomous robots.

Add labels manually: Folio, Scout, Atlas, Lens, Quill, Prism, Steward. Caption: "Conceptual roles, lecturer-controlled steps." This is not an autonomous execution architecture. Add a footer: "Browser-local workspace and deterministic core; local API for requested collection and parsing."

**Lecturer's afternoon.** Paste: Create a 1920x1080 flat journey background with five stations across the lower two thirds: course folder, requested search and receipts, outcome mapping, session and slides, meeting brief. Thin connectors, faceless lecturer silhouette at the start, generous blank caption space. Palette #3B5BDB #527D75 #343A40 #F1F3F5 #FFFFFF, white, uniform strokes. No text, numbers, logos, watermark, realistic faces, gradients, 3D or elapsed-time claims.

Add editable step labels; describe an illustrative afternoon, not measured time savings.

**Outline before and after.** Paste: Create a 1920x1080 flat comparison diagram: equal-size outline sheets left and right, matching neutral foundation blocks, one indigo revised outcome and one teal topic block on the right, attached receipt and version tab. Preserve fixed boundary rails on both. Blank heading and caption areas. Palette #3B5BDB #527D75 #343A40 #F1F3F5 #FFFFFF, white, uniform strokes. No text, numbers, logos, watermark, faces, gradients, 3D, scores or approval seal.

Add "Before", "Lecturer's revision" and "Baseline preserved, constraints checked" in the deck editor.

## 4. Product video, 84 seconds

Record real app footage with `npm run dev`, including the local API. Use the tour as a capture guide, trimming pauses in editing. Current script attempts live collection and falls back to a dated sample; inspect the collection log. Never label sample footage as a live fetch. Preserve source dates and sample labels. Use only actual displayed counts. Avoid synthetic analytics screens. Narration below is the complete voice-over, read calmly with pauses.

| Time | Screen and source | Voice-over |
|---|---|---|
| 0 to 6 s | Generated b-roll A: disconnected desk materials | A course refresh starts with a question. What evidence should change what we teach? |
| 6 to 12 s | Real capture: landing, open course workspace | Lyceum keeps the course, the evidence and the decision together. |
| 12 to 24 s | Real capture: source selector, Fetch action, log, imported posting | On request, Lyceum collects from Greenhouse and Lever employer boards through its local API. Each kept posting retains its source and retrieval details. |
| 24 to 35 s | Real capture: proposed quotation, confirmation, rejected paraphrase | Name the skills you want to investigate. Confirm exact quotations from retained source text. A paraphrase is rejected. |
| 35 to 45 s | Real capture: review action, numerator, denominator, interval | Only reviewed postings enter the denominator. Counts include a ninety-five percent Wilson interval. This is your sample, not the whole labour market. |
| 45 to 57 s | Real capture: mapping, outline comparison, checks, explicit adoption, history | Map the evidence to outcomes. Revise within course constraints. Choose the local version yourself, with the baseline and decision history preserved. |
| 57 to 68 s | Real capture: saved session, pack download, actual PPTX opened in PowerPoint | Saved sessions become editable PowerPoint teaching packs with speaker notes and linked evidence. The text comes from saved data, without model writing. |
| 68 to 78 s | Real capture: prepared brief, slide download, receipt slide | Take an editable brief deck with receipts to the meeting. The core workflow needs no AI keys. Work stays in this browser. |
| 78 to 84 s | Generated b-roll B, then real landing end frame | The lecturer keeps authority. Formal approval stays with the university. Lyceum supplies the receipts. |

If collection uses the sample, replace that shot's narration with: "Lyceum supports requested collection from Greenhouse and Lever boards. Here we are using the dated saved sample, with its source details visible."

**Veo A prompt:** Generate 6 seconds, 16:9, target 1920x1080. Flat editorial animation of disconnected blank document cards, a course folder and an empty meeting table on white. Gentle camera drift, objects remain separated. Colours #3B5BDB #527D75 #343A40 #F1F3F5 #FFFFFF, uniform strokes. No text, numbers, logos, watermark, people, realistic faces, gradients, 3D, fake UI, charts, speech or music. Leave opening and closing holds for editing.

**Veo B prompt:** Generate 6 seconds, 16:9, target 1920x1080. Flat editorial animation, abstract faceless lecturer's hand places a brief with attached receipts on a meeting table, then rests. Quiet locked camera, white background. Colours #3B5BDB #527D75 #343A40 #F1F3F5 #FFFFFF, uniform strokes. No text, numbers, logos, watermark, realistic faces, gradients, 3D, fake UI, approval stamp, speech or music. Leave closing hold; editor trims to fit the real landing end frame.

## 5. Owner checklist

- Generate each image separately. Download the original image, not a screenshot of the Gemini conversation. Export or convert to genuine PNG, inspect dimensions and resize to the table target if needed. Renaming another format does not convert it. White backgrounds are acceptable if transparency fails.
- Save with the exact lowercase filename under `public/brand/`. Create that folder if absent. Keep slide backgrounds and downloaded video clips with your presentation media; export the edited video as MP4.
- Reload the signed-out landing page. `hero.png` should replace the inline illustration. Inspect desktop and narrow layouts for cropping, thin strokes or unreadable detail. Other filenames need future UI wiring or manual insertion into slides.
- If hero previously failed to load, do a full reload after adding it, because BrandImage remembers failure until remount. If stale artwork persists, hard reload.
- If an image looks wrong, delete that PNG and reload. For a wired BrandImage slot, the inline fallback returns. Unwired presentation assets have no app fallback to test.
- Review all media for invented text, logos, realistic faces and unsupported product claims. Keep headings and captions editable outside generated images.
