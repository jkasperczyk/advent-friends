
(function CalendarPage() {
  console.log("[calendar] init");
  const grid = document.getElementById("calendar-grid");
  if (!grid) return;
  const username = grid.dataset.username;
  const isJacek = username === "jacek";
  const now = new Date(); const month = now.getMonth(); const day = now.getDate();
  const inDecember = month === 11; const currentDecDay = inDecember ? day : 0;

  document.querySelectorAll(".day-btn").forEach((btn) => {
    const d = parseInt(btn.dataset.day, 10);
    if (!isJacek) {
      if (!inDecember || d > currentDecDay) {
        btn.classList.add("pointer-events-none", "opacity-0");
        const lock = btn.parentElement.querySelector(".day-lock");
        if (lock) lock.classList.remove("hidden");
      }
    }
  });

  (function initCountdown() {
    const cdText = document.getElementById("cd-text");
    const cdHint = document.getElementById("cd-hint");
    if (!cdText || !cdHint) return;
    function update() {
      const now = new Date(); let year = now.getFullYear();
      let target = new Date(year, 11, 24, 0, 0, 0);
      if (now > target) { year += 1; target = new Date(year, 11, 24, 0, 0, 0); }
      const diff = target - now;
      const d = Math.floor(diff / (1000*60*60*24));
      const h = Math.floor((diff / (1000*60*60)) % 24);
      const m = Math.floor((diff / (1000*60)) % 60);
      cdText.textContent = d + " dni " + h.toString().padStart(2,"0") + ":" + m.toString().padStart(2,"0");
      if (!inDecember && !isJacek) cdHint.textContent = "Jeszcze chwila! Okienka od 1 grudnia 🎁";
      else if (isJacek) cdHint.textContent = "Tryb testera – możesz otwierać wszystko ✅";
      else cdHint.textContent = "Możesz otwierać do dzisiejszego dnia ⭐";
    }
    update(); setInterval(update, 60000);
  })();
})();