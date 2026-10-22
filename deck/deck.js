// The deck's controls: one slide at a time, scaled to the window, moved by the
// keyboard or a clicker (arrows, space, Page Up and Page Down, Home, End), F for
// full screen, V for the film on slide 5, N for the speaker notes. The address
// keeps the slide (#3), so a reload stays put. With ?export in the address the
// stage is unscaled and still, for scripts/gen-deck.mjs.
(() => {
  const root = document.documentElement;
  const exporting = new URLSearchParams(location.search).has("export");
  if (exporting) root.classList.add("exporting");
  const stage = document.querySelector(".stage");
  const slides = [...document.querySelectorAll(".slide")];
  const notesPanel = document.querySelector(".deck-notes");
  const toast = document.querySelector(".deck-toast");
  let index = 0, toastTimer = 0;

  // The two graphics on slide 2 are drawn from their data attributes, so the
  // cells always match the figure printed beside them.
  for (const el of document.querySelectorAll(".calendar")) {
    const months = Number(el.dataset.months), certain = Number(el.dataset.certain);
    for (let m = 1; m <= months; m += 1) { const i = document.createElement("i"); if (m <= certain) i.className = "on"; el.append(i); }
  }
  for (const el of document.querySelectorAll(".waffle")) {
    const cells = Number(el.dataset.cells), on = Number(el.dataset.on);
    for (let c = 1; c <= cells; c += 1) { const i = document.createElement("i"); if (c <= on) i.className = "on"; el.append(i); }
  }
  slides.forEach((s, i) => { const n = s.querySelector(".slide-number"); if (n) n.textContent = (i + 1) + " / " + slides.length; });

  function fit() {
    if (exporting) return;
    const scale = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = "translate(-50%, -50%) scale(" + scale + ")";
  }
  function say(text) {
    toast.textContent = text; toast.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; }, 2600);
  }
  function film(on) {
    const layer = slides[index].querySelector(".film");
    for (const f of document.querySelectorAll(".film.is-on")) { if (f !== layer || !on) { f.classList.remove("is-on"); f.querySelector("video").pause(); } }
    if (!on || !layer) return;
    const video = layer.querySelector("video");
    layer.classList.add("is-on");
    video.play().catch(() => { layer.classList.remove("is-on"); say("The film is not in deck/media yet. It is rendered in video/ (package A7)."); });
  }
  function show(i) {
    film(false);
    index = Math.max(0, Math.min(slides.length - 1, i));
    slides.forEach((s, k) => { s.classList.toggle("is-current", k === index); s.setAttribute("aria-hidden", String(k !== index)); });
    document.title = "Lyceum, " + (index + 1) + " of " + slides.length + ": " + slides[index].dataset.title;
    if (!exporting && location.hash !== "#" + (index + 1)) history.replaceState(null, "", "#" + (index + 1));
    if (!notesPanel.hidden) notesPanel.textContent = slides[index].querySelector(".notes")?.textContent.trim() ?? "";
  }
  function fromHash() { const n = parseInt(location.hash.slice(1), 10); return Number.isFinite(n) ? n - 1 : 0; }

  addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const key = e.key;
    if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(key)) { e.preventDefault(); show(index + 1); }
    else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(key)) { e.preventDefault(); show(index - 1); }
    else if (key === "Home") show(0);
    else if (key === "End") show(slides.length - 1);
    else if (key === "f" || key === "F") { if (document.fullscreenElement) document.exitFullscreen(); else root.requestFullscreen().catch(() => say("Full screen is not available here.")); }
    else if (key === "v" || key === "V") film(!slides[index].querySelector(".film.is-on"));
    else if (key === "n" || key === "N") { notesPanel.hidden = !notesPanel.hidden; show(index); }
  });
  addEventListener("resize", fit);
  addEventListener("hashchange", () => show(fromHash()));
  fit();
  show(fromHash());
  window.deck = { show, count: slides.length };
})();
