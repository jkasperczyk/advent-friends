
(function FillPage() {
  console.log("[fill] init");
  const ENTRIES = window.__ENTRIES_VAR__ || [];
  const daySelect = document.getElementById("day-select");
  const hiddenDay = document.getElementById("hidden-day");
  const textArea = document.getElementById("text-day");
  const songInput = document.getElementById("song-day");
  const info = document.getElementById("day-info");
  const prevImgBox = document.getElementById("preview-image");
  const prevImgTag = document.getElementById("preview-image-tag");
  const prevSongBox = document.getElementById("preview-song");
  const prevSongLink = document.getElementById("preview-song-link");
  const prevVideoBox = document.getElementById("preview-video");
  const prevVideoTag = document.getElementById("preview-video-tag");

  function loadDay(dayNum) {
    const d = parseInt(dayNum, 10);
    if (hiddenDay) hiddenDay.value = d;
    const entry = ENTRIES.find(e => e.day === d);
    if (entry) {
      if (textArea) textArea.value = entry.text || "";
      if (songInput) songInput.value = entry.songLink || "";
      const parts = [];
      if (entry.text) parts.push("tekst");
      if (entry.imageUrl) parts.push("obrazek");
      if (entry.songLink) parts.push("piosenka");
      if (entry.videoUrl) parts.push("wideo");
      if (info) info.textContent = "Masz już zapisane: " + parts.join(", ") + ". Zapis nadpisze wpis dla tego dnia.";
      if (entry.imageUrl) { if (prevImgTag) prevImgTag.src = entry.imageUrl; if (prevImgBox) prevImgBox.classList.remove("hidden"); }
      else { if (prevImgBox) prevImgBox.classList.add("hidden"); }
      if (entry.songLink) { if (prevSongLink) prevSongLink.href = entry.songLink; if (prevSongBox) prevSongBox.classList.remove("hidden"); }
      else { if (prevSongBox) prevSongBox.classList.add("hidden"); }
      if (entry.videoUrl) { if (prevVideoTag) prevVideoTag.src = entry.videoUrl; if (prevVideoBox) prevVideoBox.classList.remove("hidden"); }
      else { if (prevVideoBox) prevVideoBox.classList.add("hidden"); }
    } else {
      if (textArea) textArea.value = "";
      if (songInput) songInput.value = "";
      if (info) info.textContent = "Brak wpisu dla tego dnia – możesz dodać 🎄";
      if (prevImgBox) prevImgBox.classList.add("hidden");
      if (prevSongBox) prevSongBox.classList.add("hidden");
      if (prevVideoBox) prevVideoBox.classList.add("hidden");
    }
  }
  if (daySelect) {
    loadDay(daySelect.value);
    daySelect.addEventListener("change", (e) => loadDay(e.target.value));
  }

  document.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const section = btn.dataset.delete;
      const day = daySelect.value;
      if (!confirm("Usunąć tę część wpisu dla dnia " + day + "?")) return;
      const res = await fetch("/fill/delete-section", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ day, section })
      });
      const json = await res.json();
      if (json.ok) {
        const d = parseInt(day, 10);
        const idx = ENTRIES.findIndex(e => e.day === d);
        if (idx !== -1) {
          if (section === "text") ENTRIES[idx].text = null;
          if (section === "image") ENTRIES[idx].imageUrl = null;
          if (section === "song") ENTRIES[idx].songLink = null;
          if (section === "video") ENTRIES[idx].videoUrl = null;
        }
        loadDay(day);
      } else { alert("Nie udało się usunąć sekcji."); }
    });
  });
})();