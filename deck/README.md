# The pitch deck

Eleven slides at 1920 by 1080 for the eight-minute pitch (plan Section 14), in the order of the story spine (Section 4.1). One presenter speaks; a second person drives the app on slide 5.

```text
deck/
  index.html            the slides and their speaker notes
  deck.css              the layout, on the tokens only
  deck.js               the keys, the scaling, the film
  theme.generated.css   written by scripts/gen-deck.mjs from src/theme/tokens.ts and the bundled fonts
  media/loop90.mp4      the 90-second film, rendered in video/ (package A7); not committed
  export/               the PDF, the PPTX and the slide images; not committed
```

**Present.** Open `deck/index.html` in Chrome or Edge, then press F for full screen. Arrows, space, Page Up and Page Down (a clicker) move between slides; Home and End jump to the first and the last; N shows the speaker notes; V plays the film on slide 5 when the room is not the place for a live demo. The address keeps the slide, so a reload stays put.

**Export.** `npm run deck` checks the deck and writes `deck/export/lyceum-deck.pdf` and `deck/export/lyceum-deck.pptx`: one 2x image per slide, the notes as speaker notes, and the film as a media object on slide 5 once `deck/media/loop90.mp4` exists. On Windows with PowerPoint installed it then opens the PPTX in PowerPoint and reads the slides, the notes and the media back. Hand the organiser both files; test the PPTX and its film on the presenting laptop.

**Edit.** Change `index.html` and run `npm run deck` again. Every figure sits in an element marked `data-claim` with its id in `docs/claims.md`, and every other number (a date, an id, a clause) in one marked `data-ref`; the generator fails on a digit that is neither, on a figure missing from its row, on a receipt that is not in its source, on a clause that is not word for word, on text that runs into a footer and on any en or em dash. The screenshots come from `npm run shots` and the teaching pack from `npm run gen:sample-decks`.
