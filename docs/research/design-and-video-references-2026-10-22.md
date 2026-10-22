# Research note: Remotion, mascots, honest gamification, dashboards, decks and diagrams

Date: 22 October 2026. References for the overhaul: how to build the demo video in Remotion, what Duolingo's character and motion rules actually say, what the evidence says about gamification for adults, mascot systems in grown-up products, calm dashboard references, deck craft, and how to use product logos in an architecture diagram legitimately. Compiled in a research session on 22 October 2026; dates are publication dates where the page showed one.

## 1. Remotion

- Version: remotion 4.0.537, published 19 October 2026. https://github.com/remotion-dev/remotion/releases
- Licence (v4): free, including commercial videos, for individuals, for-profit organisations with up to three employees, non-profits and evaluation. Educational institutions do not count as non-profits without written permission, so if the university owns Lyceum, check. Company licence otherwise: Creators $25 a seat a month, Automators $0.01 a render with a $100 monthly minimum. The 5.0 terms count the combined headcount of all involved parties; four or more needs a company licence. https://github.com/remotion-dev/remotion/blob/main/LICENSE.md and https://www.remotion.dev/docs/license/terms
- Official skills: "Remotion Agent Skills", `npx skills add remotion-dev/skills`, for Claude Code, Codex, Cursor and others; twelve skills including best-practices, create, captions, render, multimedia. Claude Code plugin: `claude plugin marketplace add remotion-dev/claude-code-plugin` then `claude plugin install remotion@remotion`. Any docs URL plus `.md` returns Markdown. https://www.remotion.dev/docs/ai/skills and https://www.remotion.dev/docs/ai/claude-code-plugin. Third-party rule from the house style: scan with SkillSpector before first use.
- Structure: `src/Root.tsx` registers `<Composition>`; every visual is a pure function of `useCurrentFrame()`; scenes via `<Sequence>` and `<Series>`; motion via `interpolate` and `spring`. https://www.remotion.dev/docs/the-fundamentals
- Rendering: `npx remotion render <entry> <compId> out/video.mp4`, H.264 default. On Windows, pass props as a file, not inline JSON. https://www.remotion.dev/docs/cli/render
- Real screens in: Playwright `recordVideo` on `browser.newContext` with `size` equal to the 1920 by 1080 viewport (the file is finalised on `context.close()`), or `page.screenshot`. https://playwright.dev/docs/videos. Put files in `public/` and load with `staticFile()` into `<OffthreadVideo>` or `<Img>`. https://www.remotion.dev/docs/staticfile. Scripted capture beats manual recording because it re-records when the UI changes.
- Captions and voice: `@remotion/captions` with converters from Whisper (`@remotion/install-whisper-cpp`) and ElevenLabs speech-to-text. https://www.remotion.dev/docs/captions. Text-to-speech templates exist (Azure, Google); ElevenLabs TTS has no official package, so generate one file per scene and size scenes with `calculateMetadata`.
- Pitfalls: frames render in parallel, so no CSS transitions, no wall clock, `random()` not `Math.random`; load fonts with `@remotion/fonts` and wait before measuring text; `<Img>` not `background-image`; `delayRender` for async data. https://www.remotion.dev/docs/flickering and https://www.remotion.dev/docs/fonts
- Templates: no official product-demo template; the Recorder template (screen and webcam, Whisper captions) is the closest. https://www.remotion.dev/docs/recorder

## 2. Duolingo design and the gamification evidence

- Building character (November 2020): Duo is geometric, big eyes, detached feet; the human cast shares his shapes; each character has its own correct-answer animation. https://blog.duolingo.com/building-character/
- Reshaping Duo (November 2013): silhouette first, details cannot rescue a weak shape; quarter-turn pose. https://blog.duolingo.com/reshaping-duo/
- Shape language (July 2020): few vector shapes, negative space, exaggeration to lower the fear of mistakes. https://blog.duolingo.com/shape-language-duolingos-art-style/
- World character visemes (November 2022): Rive state machines, 20 or more mouth shapes per character, tiny files. https://blog.duolingo.com/world-character-visemes
- Core tabs refresh (February 2026): character art in every header "felt forced"; ask "does it serve a purpose?"; whitespace over containers. https://blog.duolingo.com/core-tabs-redesign/
- Streak critique: El País (December 2024) on guilt notifications; Desirability Lab (October 2023) "Manipulative, yes. Also completely effective." https://desirabilitylab.com/backfill/backfill-2024-302-duolingo-streak-mechanics
- Evidence: Sailer and Homner 2020, Educational Psychology Review 32, 77-112: g = 0.49 cognitive, 0.36 motivational, 0.25 behavioural, only the cognitive effect robust in rigorous studies. https://link.springer.com/article/10.1007/s10648-019-09498-w. Hamari, Koivisto and Sarsa 2014: effects depend on context and users. Mekler et al 2017: points, levels and leaderboards raised output but not intrinsic motivation. https://doi.org/10.1016/j.chb.2015.08.048. Deci, Koestner and Ryan 1999: contingent rewards undermine intrinsic motivation, informational feedback supports it. https://doi.org/10.1037/0033-2909.125.6.627. These justify "quality feedback, no leaderboards, no streaks".
- Ethics: Kim and Werbach 2016, four tests (exploitation, manipulation, harm, character). https://doi.org/10.1007/s10676-016-9401-5. Deterding 2014, "Eudaimonic Design". https://mediarep.org/entities/bookpart/8a83c8bf-8ec2-48c2-bbde-0829488ad549/full

## 3. Mascots in grown-up products

- Mailchimp with COLLINS (September 2018): Freddie reduced to a single-colour silhouette; hand-drawn imperfection. https://www.wearecollins.com/work/mailchimp/
- Notion (Roman Muradov): ink curves, halftone shading, no skin colour, colour only for emphasis. https://designcompass.org/en/2025/01/20/notion/
- GitHub mascots: never as a logo, never for money, security or apologies; "less is more". https://brand.github.com/graphic-elements/mascots
- Slack (Alice Lee, 2017): organic imperfect shapes, darker tones to ground an enterprise brand, 40 or more modular spots. https://www.byalicelee.com/slack
- Headspace with Italic Studio (April 2024): the face gains stress and sadness, a more professional persona for care. https://www.itsnicethat.com/articles/italic-studio-headspace-graphic-design-project-250424
- Consistency rules: one perspective, fixed stroke weights, scale rules per size class. https://www.rmcad.edu/blog/building-an-illustration-system-shapes-strokes-and-scale-rules/. NN/g (April 2024): abstract illustrations are less memorable; keep one cohesive style. https://www.nngroup.com/articles/picture-superiority-effect/
- For the seven agents: one shape family like Duo plus cast, forest ink lines, lime as the single accent, moods through brows and posture rather than colour, and GitHub's rule of keeping mascots out of error, billing and security moments.

## 4. Calm but alive dashboards

- Mercury breakdown (October 2026): green primary, red and yellow reserved for errors, dense but strictly hierarchical. https://www.925studios.co/blog/mercury-design-breakdown
- Robinhood style reference: near-black with one electric lime. https://styles.refero.design/style/48ba2283-13b5-423a-8742-390ea4e53c36
- Linear design refresh (March 2026): "don't compete for attention you haven't earned", "structure should be felt not seen". https://linear.app/blog/behind-the-latest-design-refresh
- Google Material 3 Expressive research (I/O 2025): 46 studies, 18,000 or more participants, key elements spotted up to four times faster; "No amount of emotion can compensate for a lack of clarity." https://design.google/library/expressive-material-design-google-research
- Motion tokens: Atlassian 50 to 150 ms feedback, 150 to 400 ms transitions, reduced-motion support. https://atlassian.design/foundations/motion. Carbon productive against expressive, 70 to 700 ms. https://carbondesignsystem.com/elements/motion/overview/
- Empty states: Polaris, one primary call to action and action-led titles. https://polaris.shopify.com/components/empty-state. Carbon, positive title and next action. https://carbondesignsystem.com/patterns/empty-states-pattern/
- Dribbble, Behance and Mobbin surfaced no strong forest-plus-lime dashboard; Mercury, Linear and Robinhood are the better anchors; amanah-wallet's mascot system maps most closely to Headspace and Mailchimp.

## 5. Deck and poster craft

- Kawasaki 10/20/30. https://guykawasaki.com/the-102030-rule-of-powerpoint/
- Duarte, slide:ology (2008): ideas before slides, diagrams, data, arrangement, movement. https://www.oreilly.com/library/view/slideology/9780596522346/
- Reynolds, Presentation Zen (2008): the Takahashi method, one huge word or number per slide.
- Picture superiority: Shepard 1967 (96.7% against 88.4% recognition); Standing 1973. https://doi.org/10.1080/14640747308400340. NN/g caveats: literal, familiar, cohesive, shown long enough, icons still need labels.
- Mayer, Multimedia Learning: words plus pictures beat words alone in retention and transfer. https://www.cambridge.org/core/books/abs/multimedia-learning/multimedia-principle/C5CE697EE4411F0D8DC0D7B6D6F94EE3

## 6. Architecture diagrams

- C4 notation: title with type and scope, a legend, every line labelled with direction and purpose (never "uses"), technology on lines, consistent colour, legible in black and white. https://c4model.com/diagrams/notation
- Logo sources: Simple Icons is CC0 as a project but each icon keeps its brand licence; read the per-icon guidelines. https://github.com/simple-icons/simple-icons/blob/develop/DISCLAIMER.md. svgl is MIT for the code, logos remain the owners' property. https://github.com/pheralb/svgl
- Brand rules: Microsoft, names referentially fine, logos and icons never without a licence. https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general. Google, request form, up to two weeks. https://support.google.com/contact/brand_request_form. Slack media kit. https://slack.com/media-kit. GitHub. https://github.com/logos. Moodle: references to the software are free, logos implying endorsement need permission. https://moodle.com/trademarks/. OpenAI brand page. https://openai.com/brand/. Anthropic has a press kit but no public usage page. Instructure has no public brand page. Safe pattern for a poster: monochrome marks or text labels, "integrates with", no endorsement implied.
- Tools: Excalidraw (MIT), D2 (MPL-2.0, TALA engine for architecture) https://d2lang.com, Mermaid `architecture-beta` with icon packs (layout can overlap) https://mermaid.js.org/syntax/architecture.html, Figma for the print-grade final.

## Recommended Remotion pipeline

1. Install the Remotion agent skills after a SkillSpector scan; pin remotion 4.0.537 across all `@remotion/*`.
2. Write the script as scene JSON (title, agent, on-screen action, line of narration).
3. Drive the real app with Playwright at 1920 by 1080 in demo mode, `recordVideo` per scene plus 2x stills for hero frames, into `public/scenes/`.
4. Convert WebM to MP4 with `npx remotion ffmpeg`, trim, name by scene id.
5. Build `Root.tsx` with one composition per cut; a `<Series>` of scenes, each a `<Sequence>` with `OffthreadVideo` plus a forest and lime overlay layer driven by `spring` and `interpolate`.
6. Load Bricolage Grotesque, Plus Jakarta Sans and JetBrains Mono via `@remotion/fonts` from `public/fonts`, one shared loader awaited before any text measurement.
7. Narration: team voices recorded per line (the dataworks method), text-to-speech only as a fallback; `calculateMetadata` sets scene length from the audio.
8. Captions from the transcript with the script's spelling and stress marks, rendered in the caption band with the speaker's colour bar.
9. Mascot moments: SVG keyframes synced to the frame, one per scene at most, never over an error state.
10. Render locally with a props file (Windows), check determinism by rendering twice, Lambda only if the team grows past the free tier.

## Do not do (the AI-slop tells)

1. No gradient blobs, glassmorphism or glowing lime on everything; lime is one accent per screen.
2. No generic isometric 3D cities or stock "people at laptops" illustrations; one flat ink style, seven characters, the same stroke.
3. No AI-generated text inside graphics, no fake data in screenshots, no mock dashboards; capture the real demo mode and say so.
4. No ragged mixed-logo wall: monochrome marks, equal height, labelled, with a legend.
5. No rapid pop-ins and confetti on every transition; Carbon-style durations and a purpose per motion.
6. No streak counters, leaderboards, badges for volume or guilt notifications anywhere in the UI or the video copy.
