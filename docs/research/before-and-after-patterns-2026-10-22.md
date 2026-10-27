# Research note: showing before and after

Date: 22 October 2026, evening. For the depth plan: how products show what changed between two versions of a document, a slide, a table or a result, how curriculum systems present proposed changes to committees, and which patterns are honest and accessible. Compiled in a research session on 22 October 2026; dates are page dates where shown.

## 1. Document and content diff UX

- **GitHub** renders prose diffs as source or rendered; rendered diffs highlight added and removed text and show invisible changes (a link target) in a tooltip; large diffs fall back to source. Images compare in 2-up, swipe (a slider) and onion skin (opacity). https://docs.github.com/en/repositories/working-with-files/using-files/working-with-non-code-files
- **Google Docs Compare** (11 June 2019) writes a third document in which every difference is a suggested edit attributed to a chosen name; the originals are untouched. https://workspaceupdates.googleblog.com/2019/06/compare-docs.html
- **Word legal blackline**: a third document with differences as tracked changes at word or character level; moves, formatting, case, white space and tables are all compared by default. https://support.microsoft.com/en-us/office/compare-document-differences-using-the-legal-blackline-option-dbfc7351-4022-43a2-a0c4-54d1898702a0
- **Notion snapshot diffs** (26 May 2026): choose two snapshots and it highlights additions, deletions and modifications across text, images, tables and database properties. https://www.createwith.com/tool/notion/updates/notion-adds-snapshot-diffs-to-version-history-for-easier-change-tracking
- **Figma branch review**: changed layers listed per page; side by side by default, or an overlay with an opacity toggle. https://help.figma.com/hc/en-us/articles/5691189138839
- **Confluence** (page modified 9 October 2026): tick two versions, compare; green added, red deleted, blue formatting; unchanged blocks collapse. https://confluence.atlassian.com/doc/page-history-and-page-comparison-views-139379.html
- **Slide tools**: PowerPoint Compare merges two decks into a Revisions pane split into slide changes and presentation changes, accepted by checkbox (https://edu.gcfglobal.org/en/powerpoint/reviewing-presentations/1); Pitch keeps per-slide history on a timeline and restores a slide as a new slide (https://pitch.com/whats-new/version-history-and-deleted-slide-recovery); Gamma restores whole versions and users complain it shows "that something changed, but not what" (https://ideas.gamma.app/ideas/p/improve-version-history). None diffs slide content structurally.

## 2. Visualising change in structured data

- **Slopegraph** (storytelling with data, 27 July 2020): two points per line, "the steeper the slope, the bigger the change"; unrelated categories become "piles of dried spaghetti"; use bars when exact values matter. https://www.storytellingwithdata.com/blog/2020/7/27/what-is-a-slopegraph
- **Arrow and range (dumbbell) plots** (Datawrapper, 22 September 2017): an arrow plot "to emphasize the change between values more than the values themselves"; a range plot when the gap matters. https://www.datawrapper.de/blog/new-arrow-and-range-plots
- **FT Visual Vocabulary**: slope is "good for showing changing data as long as the data can be simplified into 2 or 3 points"; paired columns "can become tricky to read with more than 2 series". https://github.com/Financial-Times/chart-doctor/blob/main/visual-vocabulary/README.md
- **Juxtaposition, superposition, explicit encoding** (Gleicher et al., Information Visualization, 2011): every comparison design is one of the three; juxtaposition relies on memory, superposition on the visual system, explicit encoding computes and shows the difference. https://doi.org/10.1177/1473871611416549
- **Animated transitions** (Heer and Robertson, 2007): animation "can significantly improve graphical perception"; staged beats unstaged; avoid rescaling axes mid-transition. https://idl.uw.edu/papers/animated-transitions. **Object constancy** (Bostock, 16 May 2012): key marks by identity so a bar can be tracked through the transition. https://bost.ocks.org/mike/constancy/
- **Accessibility**: WCAG 2.2.2 (Level A) requires pause, stop or hide for auto-playing motion over five seconds (https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html); 2.3.3 with techniques C39 and SCR40 for prefers-reduced-motion in CSS and JS; Chartability (2022) adds vestibular and cognitive heuristics for charts (https://diglib.eg.org/handle/10.1111/cgf14522).

## 3. Curriculum change presentation in universities

- **CourseLeaf CIM**: "Red strike-through text is used to indicate deletions and green text is used to indicate additions" (Penn State, https://cim.psu.edu/user-guides/course-management/edit-course/); additions are green with a double underline at Ohio State; approvers filter by user, "All changes" or "Hide changes", and print follows the filter (Montana State, June 2025, https://www.montana.edu/provost/curriculum-development/approving_new_course_or_program_using_cim.html).
- **Curriculog user tracking** (UMBC manual, 2021): "Show current", "Show original", "Show current with markup", per-user colour, who and when. https://gradschool.umbc.edu/wp-content/uploads/sites/155/2022/07/Curriculog-User-Manual-2021.pdf
- **Kuali CM**: the approver view shows "requested changes (yellow)" against "existing course information (blue)". https://www.csupueblo.edu/kuali-student-curriculum-management/_doc/course-training-power-point.pdf
- **Coursedog**: "View Changes" shows where new content replaces the original (https://support.stevens.edu/support/solutions/articles/19000138726); Arizona's form pairs "Current Requirements" on the left with "New Requirements" on the right (February 2026, https://curricularaffairs.arizona.edu/sites/default/files/2026-02/Guide-to-coursedog-substantial-change.pdf).
- **Committee forms**: "Current Curriculum" and "Proposed Curriculum" columns by semester (LSU Eunice Form F, https://www.lsue.edu/academic-affairs/cdmdocs/CCFormF2.pdf); Western University's minor-modification template (January 2025) puts existing text beside the change; ETSU pairs a current and a proposed narrative per change (https://www.etsu.edu/chairshandbook/documents/august_06_13_substantialcoursemodification.pdf).

## 4. Timeline and scrubber interfaces

- **Figma**: a checkpoint every 30 minutes, autosaves grouped and expandable, named versions carry a title and a description, restore is non-destructive. https://help.figma.com/hc/en-us/articles/360038006754
- **Webflow backups**: a restore point every 50th autosave; an eye icon previews a backup before restoring; a restore saves the current state first. https://help.webflow.com/hc/en-us/articles/33961244069395
- **GitHub blame**: per-line commit blocks and "View blame prior to this change" to step back one revision. https://docs.github.com/en/repositories/working-with-files/using-files/viewing-and-understanding-files
- **Perforce Time-lapse View**: a slider by date, changelist or revision, an "aging" shade where darker is more recent, action badges under the slider. https://www.perforce.com/manuals/p4v/Content/P4V/advanced_files.timelapse.html
- **Keynote**: "Browse All Versions" shows a tick-marked timeline with thumbnails of each saved version. https://support.apple.com/guide/keynote/tan7f1de6ec5/mac
- Legibility across all of them: name the stop you are on, show who and when on hover, keep unchanged content still.

## 5. Slide-level change

- **PowerPoint Compare**: the Revisions pane lists slide changes and presentation changes; selecting one highlights it on the slide. https://edu.gcfglobal.org/en/powerpoint/reviewing-presentations/1
- **Google Slides**: version history with a "Show changes" box that highlights edits in green, one colour per editor; up to 40 named versions. https://support.google.com/docs/answer/190843
- **Two versions as images**: pptx-glimpse renders PPTX to SVG or PNG in Node 22 or the browser (https://www.npmjs.com/package/pptx-glimpse); LibreOffice headless to PDF then pdftoppm; pixelmatch returns a diff image and a mismatch count (https://github.com/mapbox/pixelmatch). Since Lyceum generates packs from records, render the slide model to the DOM or SVG for both versions and diff the record, not the pixels.

## 6. "Wow" patterns for change

- **Before and after slider**: Knight Lab JuxtaposeJS, for "then and now" stories, with "your audience control over the slider". https://juxtapose.knightlab.com/
- **Slider accessibility**: drag-only sliders fail WCAG 2.5.7 Dragging Movements and 2.1.1; fix with arrow keys, click-to-position, an accessible name and value, or plain "Show before" and "Show after" buttons; alt text should describe the difference. https://dev.to/agentkit/before-and-after-image-sliders-the-drag-only-widget-that-fails-wcag-22-1759. Reuters Graphics ships a keyboard-accessible BeforeAfter component: https://cdn.jsdelivr.net/npm/@reuters-graphics/graphics-components@4.7.0/dist/llm-docs/components/BeforeAfter.md
- **Morphing**: the View Transitions API captures the old and new DOM and animates between them, "reducing users' cognitive load, helping them stay in context"; MDN warns about focus and live-region confusion. https://developer.mozilla.org/docs/Web/API/View_Transition_API. Keynote's Magic Move moves objects "from their positions on one slide to new positions on the next". https://support.apple.com/kb/ph16958
- **Why reveals land**: Duarte's sparkline alternates "what is" with "what could be" (https://tomtunguz.com/storytelling-duarte/); NN/g (12 January 2020): motion gets feedback and state changes noticed, irrelevant motion "can substantially degrade the user experience" (https://www.nngroup.com/articles/animation-purpose-ux/); NN/g on change blindness: users miss changes far from their focus (https://www.nngroup.com/articles/change-blindness-definition/).
- **Counters**: no independent evidence that count-up animations persuade; only vendor guidance (test it). https://documentation.unbounce.com/hc/en-us/articles/35430836874900--Tips-Scripts-Count-Up-Animation

## Ten patterns for Lyceum

1. **Word-level redline** for outcome wording and assessment item stems: red strikethrough and green insertion inside one paragraph, the curriculum-system convention, with a "hide changes" toggle for the clean proposed text. Never colour alone: keep the strikethrough and underline and add visually hidden "deleted" and "inserted" labels.
2. **Current versus proposed, two columns** for topics and hours and for assessment items: the committee convention, the changed cell highlighted, an explicit delta column such as "+2 h". A real table with column headers; the delta as text, not only an arrow.
3. **A dumbbell per topic** for hours: the before dot, the after dot, a connecting bar, sorted by the size of change; an arrow plot when direction is the story. Value labels on both dots and a data table beneath.
4. **A slopegraph for cohort results**: one line per outcome from last semester to this, the chosen line emphasised and the rest grey. Every line end labelled in text; grey lines at 3:1 contrast.
5. **Swipe and onion-skin slide compare**: both versions rendered to images, a divider the judge drags or an opacity fade, GitHub-style. Arrow keys, click-to-position and "Show before" and "Show after" buttons (WCAG 2.5.7).
6. **Structural slide diff**: because packs come from records, list what changed (title, bullet, image, table cell) as a Revisions-style list that highlights the region on the thumbnail; the list is the accessible description, so no one depends on pixels.
7. **A version scrubber with named stops** in History: grouped autosave ticks and labelled named versions, who and when on hover, the diff always against the previous stop. A slider role with keyboard steps and an announced stop name; no autoplay without a pause control.
8. **Object-constant animated transition** for hours and results: bars animate from before to after keyed by topic id, staged so values move while axes stay fixed; with reduced motion, jump to the end state with the delta in text.
9. **Change-summary counters**: a header such as "3 outcomes reworded, 4 h moved, 2 slides revised" computed from the diff, counting up once; final numbers rendered immediately for reduced-motion users and in a live region.
10. **The "what is, what could be" demo arc**: hold the old state for a few seconds, reveal the new with one pattern above, and leave the comparison on screen; the persisted comparison, not the motion, carries the information.
