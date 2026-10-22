// Real lecturer UI flow in an isolated browser. External requests are blocked.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { preview } from "vite";
import puppeteer from "puppeteer-core";
import JSZip from "jszip";
const executablePath=["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
assert.ok(executablePath,"Chrome or Edge is required.");
const output=mkdtempSync(join(tmpdir(),"lyceum-curriculum-"));
const origin="http://127.0.0.1:4213";
const server=await preview({ configFile:false,preview:{ host:"127.0.0.1",port:4213,strictPort:true } });
let browser;
try {
  browser=await puppeteer.launch({ executablePath,headless:true,timeout:15000 });
  const page=await browser.newPage(), errors=[];
  await page.setViewport({ width:1440,height:1000 });
  page.on("pageerror",e=>errors.push(String(e)));
  await page.setRequestInterception(true);
  page.on("request",r=>void(r.url().startsWith(origin+"/")||r.url().startsWith("data:")||r.url().startsWith("blob:")?r.continue():r.abort()));
  const cdp=await page.createCDPSession();
  await cdp.send("Browser.setDownloadBehavior",{ behavior:"allow",downloadPath:output });
  const selector=id=>'[data-demo-id="'+id+'"]';
  const click=async id=>{await page.waitForSelector(selector(id),{visible:true});await page.waitForFunction(sel=>!document.querySelector(sel)?.disabled,{},selector(id));await page.click(selector(id));};
  const text=async expected=>{const body=await page.evaluate(()=>document.body.innerText);if(!body.includes(expected)){writeFileSync(join(output,"page-text.txt"),body);await page.screenshot({path:join(output,"page.png"),fullPage:true});}assert.ok(body.includes(expected),"Missing visible text: "+expected+" (page text and screenshot in "+output+")");};
  const clickText=async expected=>{
    const handle=await page.evaluateHandle(label=>[...document.querySelectorAll("button")].find(e=>e.offsetParent!==null&&e.textContent.trim()===label),expected);
    assert.ok(await handle.asElement(),"No visible button: "+expected);await handle.asElement().click();await handle.dispose();
  };
  const fill=async(sel,value)=>{
    await page.waitForSelector(sel,{visible:true});await page.click(sel,{clickCount:3});
    await page.keyboard.down("Control");await page.keyboard.press("A");await page.keyboard.up("Control");
    await page.keyboard.press("Backspace");if(value!=="")await page.type(sel,String(value));
  };
  const fillLabel=async(label,value)=>{
    const id=await page.evaluate(label=>[...document.querySelectorAll("label")].find(e=>e.offsetParent!==null&&e.textContent.trim()===label)?.htmlFor,label);
    assert.ok(id,"Label not associated: "+label);await fill('[id="'+id+'"]',value);
  };
  // A disclosure opens from its summary (toggled through the DOM, as a keyboard user would, so a passing toast cannot take the click);
  // opening one that is already open leaves it open.
  const openDisclosure=async id=>{await page.waitForSelector(selector(id),{visible:true});await page.$eval(selector(id),d=>{if(!d.open)d.querySelector(":scope > summary").click();});await page.waitForFunction(sel=>document.querySelector(sel).open,{},selector(id));};
  const hash=()=>page.evaluate(()=>location.hash);
  const state=fn=>page.evaluate(fn);
  const waitDownload=async name=>{
    const path=join(output,name);
    for(let i=0;i<50&&!existsSync(path);i++)await new Promise(r=>setTimeout(r,100));
    assert.ok(existsSync(path),"Download missing: "+name);return path;
  };
  const noOverflow=async label=>{
    const sizes=await page.evaluate(()=>({ viewport:innerWidth,body:document.documentElement.scrollWidth,
      main:document.querySelector("main").clientWidth,content:document.querySelector("main").scrollWidth }));
    assert.ok(sizes.body<=sizes.viewport+1&&sizes.content<=sizes.main+1,label+" overflow "+JSON.stringify(sizes));
  };
  await page.goto(origin,{waitUntil:"networkidle0"});await click("login-P-SOBRI");await click("nav-courses");
  await click("course-create-open");await fill(selector("new-course-code"),"BUS205");await fill(selector("new-course-title"),"Financial Planning");
  await fillLabel("Programme (optional)","Business Studies");await click("new-course-create");
  await text("Outcomes & topics");await text("University syllabus approval continues");
  await fill(selector("curriculum-contact-budget"),"6");
  await fillLabel("Teaching weeks","12");await fillLabel("Programme outcome labels","PLO1, PLO2");
  assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll("label")].find(e=>e.textContent==="Programme outcome labels").nextElementSibling.value),"PLO1, PLO2");
  await click("curriculum-add-outcome");await fill(selector("curriculum-outcome-text-CLO1"),"Prepare and justify a cash-flow plan for a small business.");
  await fillLabel("CLO1 achievement evidence","Worked case with an explanation rubric.");
  await fillLabel("CLO1 programme mappings","PLO1, PLO2");
  await click("curriculum-add-topic");await fill(selector("curriculum-topic-title"),"Cash-flow foundations");await fill(selector("curriculum-topic-hours"),"7");
  await click("topic-outcome-CLO1");await fill(selector("curriculum-reason"),"Connect the course outline to a practical case and preserve foundational knowledge.");
  await fill(selector("curriculum-term"),"2026-S2");
  page.once("dialog",d=>void d.dismiss());await click("nav-inbox");
  assert.equal(await state(()=>window.__lyceum.getState().screen),"studio");
  await click("curriculum-save");await click("curriculum-check");await text("the budget is 6");
  assert.equal(await state(()=>window.__lyceum.getState().clos.filter(c=>c.subjectId==="BUS205").length),0);
  await fill(selector("curriculum-topic-hours"),"4");await click("curriculum-save");await click("curriculum-check");
  await text("Configured constraints checked");
  await click("curriculum-ack");await click("curriculum-adopt");
  await text("Current course outline");await text("Prepare and justify a cash-flow plan");
  const versionId=await state(()=>window.__lyceum.getState().subjects.find(s=>s.id==="BUS205").currentVersionId);
  assert.equal(await state(()=>window.__lyceum.getState().courseDefinitions.BUS205.brief.programmeOutcomes.join(",")),"PLO1,PLO2");
  await clickText("Export current outline");const outline=readFileSync(await waitDownload("BUS205-course-outline.md"),"utf8");
  assert.match(outline,/Contact-hour budget: 6/);assert.match(outline,/Worked case/);assert.match(outline,/does not attest institutional approval/);
  console.log("PASS create, edit, constraint failure, local decision and real outline export");

  // Watch: a pasted document is a receipt; it counts only after review in Report.
  await click("rail-watch");assert.equal(await hash(),"#/course/BUS205/watch");await text("Kept sources");
  await openDisclosure("paste-document");
  await fill(selector("evidence-title"),"Junior financial analyst");await fill(selector("evidence-organisation"),"Example Holdings");
  await fill(selector("evidence-date"),"2026-09-15");
  await fill(selector("evidence-text"),"Junior financial analyst. You will prepare cash-flow forecasts for small business clients and present scenario analysis to partners.");
  await click("evidence-add");await text("Unreviewed, not counted");
  // Report, Quote: an exact quotation is kept and a paraphrase is rejected.
  await click("rail-report");await click("subrail-quote");assert.equal(await hash(),"#/course/BUS205/report/quote");
  await fill(selector("mention-skill"),"Cash-flow forecasting");await fill(selector("mention-excerpt"),"prepare cash-flow forecasts for small business clients");
  await click("mention-add");await text("Verified in source");
  await fill(selector("mention-skill"),"Python");await fill(selector("mention-excerpt"),"experience with Python");await click("mention-add");
  await text("not found in the saved source text");
  assert.equal(await state(()=>window.__lyceum.getState().skillMentions.length),1);
  // Review: the denominator meter moves only when a person marks a posting reviewed.
  await click("subrail-review");assert.equal(await hash(),"#/course/BUS205/report/review");
  await text("0 of 1 kept postings reviewed");await click("source-reviewed");await text("1 of 1 kept postings reviewed");await text("Reviewed, counted");
  // Map: the coverage ladder, with the shortfall said in words.
  await click("subrail-map");await click("mapping-open");await click("mapping-outcome-CLO1");await page.select(selector("mapping-stage"),"practised");await page.select(selector("mapping-target"),"assessed");
  await fill(selector("mapping-evidence"),"Week 1 worked case.");await click("mapping-save");await text("Below target");
  // Quote again: the scan proposes, beside the source, and the lecturer confirms.
  await click("subrail-quote");await openDisclosure("lexicon");
  await fill(selector("lexicon-terms"),"cash-flow|cash flow, scenario analysis");await click("lexicon-save");await click("scan-run");await text("Proposed quotation");
  assert.ok(await page.$(".proposal-item .source-pane mark.source-mark"),"the matched words are highlighted in the source pane");
  await click("scan-confirm-all");
  assert.equal(await state(()=>window.__lyceum.getState().skillMentions.filter(m=>m.subjectId==="BUS205").length),3);
  // Count: the share with its denominator and interval, and the evidence report.
  await click("subrail-count");await text("What employers ask for, counted");
  assert.ok(await page.$('[data-demo-id^="skill-card-"]'),"skill cards");
  await clickText("Export evidence report");const evidence=readFileSync(await waitDownload("BUS205-evidence-report.md"),"utf8");
  assert.match(evidence,/1 of 1/);assert.match(evidence,/prepare cash-flow forecasts for small business clients/);assert.match(evidence,/convenience sample/);assert.match(evidence,/Below target/);
  // Brief: prepared with its receipts, downloaded as slides and sent to the programme owner.
  await click("subrail-brief");assert.equal(await hash(),"#/course/BUS205/report/brief");
  await page.select(selector("brief-recommendation"),"refresh");await fill(selector("brief-notes"),"Add a scenario analysis exercise in week 4.");await click("brief-prepare");await text("Read the full brief");
  await click("brief-slides");const briefDeck=await JSZip.loadAsync(readFileSync(await waitDownload("BUS205-meeting-brief.pptx")));
  assert.ok(Object.keys(briefDeck.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).length>=8,"brief deck slides");
  assert.match(await briefDeck.file("ppt/slides/slide2.xml").async("string"),/Decision requested/);
  await click("brief-recipient-P-RAHMAN");await click("brief-send");await text("Brief sent");
  assert.equal(await state(()=>window.__lyceum.getState().notifications.filter(n=>n.kind==="evidence-brief"&&n.toPersonId==="P-RAHMAN").length),1);
  for(const tab of ["quote","review","count","map","brief"]) {await click("subrail-"+tab);for(const width of [390,320]) {await page.setViewport({width,height:844});await noOverflow("Report "+tab+" "+width);}await page.setViewport({width:1440,height:1000});}
  console.log("PASS Watch and Report: pasted receipt, exact quotation, rejected misquote, reviewed denominator, coverage ladder, scan beside the source, count, brief sent and report export");

  // Decide: Dr Rahman records a decision with a reason on his Home; Dr Sobri sees it in Decide and Update.
  const briefId=await state(()=>window.__lyceum.getState().evidenceBriefs.find(b=>b.subjectId==="BUS205").id);
  await click("account-menu");await click("switch-P-RAHMAN");await click("nav-inbox");await click("inbox-open-top");
  await page.waitForSelector(selector("decide-note"),{visible:true});
  assert.equal(await page.$eval(selector("decide-retain"),b=>b.disabled),true,"no decision without a reason");
  await fill(selector("decide-note"),"Keep the course as it is this term; revisit after the next intake.");await click("decide-retain");
  const decisions=await state(()=>window.__lyceum.getState().briefDecisions);
  assert.equal(decisions.length,1);assert.equal(decisions[0].briefId,briefId);assert.equal(decisions[0].byPersonId,"P-RAHMAN");assert.equal(decisions[0].outcome,"retain");
  assert.equal(decisions[0].note,"Keep the course as it is this term; revisit after the next intake.");
  assert.equal(decisions[0].courseVersionId,versionId,"bound to the course version");
  assert.ok((await state(()=>window.__lyceum.getState().events.map(e=>e.kind))).includes("decision-recorded"));
  await text("Retain the course as it is, recorded by Dr Rahman");
  await click("account-menu");await click("switch-P-SOBRI");
  assert.ok(await state(()=>window.__lyceum.getState().notifications.some(n=>n.kind==="brief-decision"&&n.toPersonId==="P-SOBRI")),"the author is told");
  await click("nav-courses");await click("course-open-BUS205");await click("rail-decide");assert.equal(await hash(),"#/course/BUS205/decide");
  await text("Retain the course as it is, recorded by Dr Rahman");await text("Keep the course as it is this term");
  for(const width of [390,320]) {await page.setViewport({width,height:844});await noOverflow("Decide "+width);}
  await page.setViewport({width:1440,height:1000});
  await click("rail-update");await page.waitForSelector(selector("update-retained"),{visible:true});await text("No change this term");
  console.log("PASS Decide: a recipient's decision with its reason on Home, bound to the brief and the version, shown in Decide, and Update says no change this term");

  await page.reload({waitUntil:"networkidle0"});await click("rail-update");
  assert.equal(await state(()=>window.__lyceum.getState().subjects.find(s=>s.id==="BUS205").currentVersionId),versionId);
  await text("Cash-flow foundations");
  await click("rail-teach");await click("plan-add");await fill(selector("session-topic"),"Cash-flow foundations");
  const outcomeId=await state(()=>window.__lyceum.getState().subjects.find(s=>s.id==="BUS205").cloIds[0]);
  await click("session-clo-"+outcomeId);await fill(selector("session-activity"),"Build a cash-flow plan in pairs.");
  await fill(selector("session-check"),"Explain the assumptions in the worked case.");await page.select(selector("session-status"),"ready");await click("session-save");
  await clickText("Teaching pack (.pptx)");const packDeck=await JSZip.loadAsync(readFileSync(await waitDownload("BUS205-week-1-teaching-pack.pptx")));
  assert.equal(Object.keys(packDeck.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).length,6,"teaching pack slides");
  assert.match(await packDeck.file("ppt/slides/slide4.xml").async("string"),/Build a cash-flow plan in pairs/);
  await openDisclosure("teach-assessment");await click("assessment-start");await click("assessment-generate");
  const assessmentItems=await state(()=>JSON.stringify(window.__lyceum.getState().testDrafts.find(t=>t.subjectId==="BUS205").items));
  await click("rail-update");await click("curriculum-start");await fill(selector("curriculum-outcome-text-CLO1"),"Prepare a cash-flow plan and evaluate its sensitivity.");
  await fill(selector("curriculum-reason"),"Extend the outcome to include sensitivity analysis after reviewing the teaching activity.");await fill(selector("curriculum-term"),"2026-S2");
  await click("curriculum-save");await click("curriculum-check");await click("curriculum-ack");await click("curriculum-adopt");
  await page.waitForFunction(()=>window.__lyceum.getState().curriculumDrafts.filter(d=>d.subjectId==="BUS205").every(d=>d.status==="adopted"));
  await click("rail-teach");
  await text("Review course change");await text("The course changed.");
  assert.equal(await state(()=>window.__lyceum.getState().teachingPlans.find(p=>p.subjectId==="BUS205").sessions[0].activity),"Build a cash-flow plan in pairs.");
  await openDisclosure("teach-assessment");await text("Your questions are preserved");
  assert.equal(await state(()=>JSON.stringify(window.__lyceum.getState().testDrafts.find(t=>t.subjectId==="BUS205").items)),assessmentItems);
  assert.equal(await page.$(selector("assessment-submit")),null);
  await click("assessment-course-change-ack");await click("assessment-course-change-review");
  await page.waitForFunction(()=>window.__lyceum.getState().testDrafts.find(t=>t.subjectId==="BUS205").needsReview===false);
  await click("rail-history");await text("Versions and decisions");await text("Previous");await text("Revision decisions");await text("Retain the course as it is");
  // Before and after in History (depth plan Section 6.2): the new version against the one it replaced, as a redline, and no decision named,
  // because the decision on record was retain; the comparison reflows at 390 and 320 px.
  await page.waitForSelector('[data-demo-id^="history-compare-"][open]');await text("No decision on record for this change.");
  assert.ok(await page.evaluate(()=>Boolean(document.querySelector('[data-demo-id="outcome-redline"] ins'))&&Boolean(document.querySelector('[data-demo-id="outcome-redline"] del'))),"the reworded outcome as a redline");
  for(const width of [390,320]) {await page.setViewport({width,height:844});await noOverflow("History compare "+width);}
  await page.setViewport({width:1440,height:1000});
  console.log("PASS reload, linked teaching session, changed-outcome impact, explicit assessment review, version history, the before and after at 390 and 320 px, and the decision on record");
  await click("nav-guide");await click("backup-export");const backup=await waitDownload("lyceum-workspace-backup.json");
  const saved=JSON.parse(readFileSync(backup,"utf8"));assert.equal(saved.application,"Lyceum");assert.ok(saved.data.courseDefinitions.BUS205);
  assert.equal(saved.schemaVersion,6);assert.equal(saved.data.briefDecisions.length,1);
  await click("nav-courses");await click("course-create-open");await fill(selector("new-course-code"),"TEMP101");await fill(selector("new-course-title"),"Temporary recovery example");await click("new-course-create");
  await click("nav-guide");await (await page.$(selector("backup-file"))).uploadFile(backup);await page.waitForSelector(selector("backup-preview"),{visible:true});
  await click("backup-ack");await click("backup-restore");await text("Workspace restored");
  assert.equal(await state(()=>window.__lyceum.getState().subjects.some(s=>s.id==="TEMP101")),false);
  assert.equal(await state(()=>window.__lyceum.getState().teachingPlans.find(p=>p.subjectId==="BUS205").sessions.length),1);
  assert.equal(await state(()=>window.__lyceum.getState().briefDecisions.length),1,"the decision record survives a restore");
  await click("backup-recovery");const recovery=JSON.parse(readFileSync(await waitDownload("lyceum-pre-restore-recovery.json"),"utf8"));
  assert.ok(recovery.data.subjects.some(s=>s.id==="TEMP101"));
  console.log("PASS real JSON download, import preview, restore and pre-restore recovery download");
  await click("nav-courses");await click("course-open-BUS205");await click("rail-update");
  await page.waitForFunction(()=>window.__lyceum.getState().persistenceStatus!=="pending");
  mkdirSync("docs/screenshots",{recursive:true});
  await page.screenshot({path:"docs/screenshots/workspace-curriculum.png",fullPage:true});
  await click("curriculum-start");await page.waitForSelector(selector("curriculum-save"),{visible:true});
  for(const width of [390,320]) {await page.setViewport({width,height:844});await noOverflow("Curriculum "+width);}
  const unlabeled=await page.evaluate(()=>[...document.querySelectorAll("main input,main select,main textarea")].filter(e=>e.offsetParent!==null&&!e.labels?.length&&!e.getAttribute("aria-label")).map(e=>e.outerHTML.slice(0,200)));
  assert.deepEqual(unlabeled,[]);
  await page.$eval(selector("curriculum-add-outcome"),e=>e.scrollIntoView({block:"start"}));
  await page.screenshot({path:"docs/screenshots/workspace-curriculum-mobile.png",fullPage:true});
  await page.setViewport({width:1440,height:1000});
  // The Report sub-rail is a keyboard tab list, and the sub-step lives in the URL.
  page.once("dialog",d=>void d.accept());await click("rail-report");await click("subrail-quote");await page.focus(selector("subrail-quote"));await page.keyboard.press("ArrowRight");
  assert.equal(await page.$eval(selector("subrail-review"),e=>e.getAttribute("aria-selected")),"true");assert.equal(await hash(),"#/course/BUS205/report/review");
  await page.keyboard.press("End");assert.equal(await page.$eval(selector("subrail-brief"),e=>e.getAttribute("aria-selected")),"true");
  await page.keyboard.press("Home");assert.equal(await page.$eval(selector("subrail-quote"),e=>e.getAttribute("aria-selected")),"true");
  assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute("data-demo-id")),"subrail-quote");
  assert.deepEqual(errors,[]);
  console.log("PASS 390/320px reflow, labels and the keyboard sub-rail; zero page JavaScript errors");
  console.log("Artifacts: "+output);
} finally {if(browser)await browser.close();await server.close();}
