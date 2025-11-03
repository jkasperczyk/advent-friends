
(function Snow() {
  try {
    const canvas = document.createElement('canvas');
    canvas.id = 'snow-canvas';
    canvas.style.position = 'fixed';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '2';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let w, h, flakes = [];
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      w = canvas.width; h = canvas.height;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);
    const COUNT = Math.min(80, Math.floor(window.innerWidth / 8));
    for (let i = 0; i < COUNT; i++) {
      flakes.push({ x: Math.random() * w, y: Math.random() * h, r: Math.random()*1.6+0.6, s: Math.random()*0.5+0.3 });
    }
    function tick() {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (const f of flakes) {
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI*2);
        ctx.fill();
        f.y += f.s * 1.2;
        f.x += Math.sin(f.y * 0.01) * 0.3;
        if (f.y > h + 10) { f.y = -10; f.x = Math.random() * w; }
      }
      requestAnimationFrame(tick);
    }
    tick();
  } catch(e) { console.warn('snow error', e); }
})();