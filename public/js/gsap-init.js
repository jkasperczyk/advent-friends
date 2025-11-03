// animacje wejścia kart formularza
document.addEventListener("DOMContentLoaded", () => {
  function run() {
    if (!window.gsap) return;
    const cards = document.querySelectorAll(".xmas-card");
    window.gsap.from(cards, {
      duration: 0.5,
      y: 12,
      opacity: 0,
      stagger: 0.08,
      ease: "power1.out"
    });
  }

  if (!window.gsap) {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js";
    s.onload = run;
    document.head.appendChild(s);
  } else {
    run();
  }
});
