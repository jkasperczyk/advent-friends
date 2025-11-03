
// v20.5 — prosty JS: test e-mail + kasowanie
(function(){
  function bindEmail(){
    const form = document.getElementById('email-test-form');
    if (!form) return;
    const status = document.getElementById('email-status');
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      status.textContent = 'Wysyłanie...';
      const fd = new FormData(form);
      const payload = { username: fd.get('username'), custom: fd.get('custom') || '' };
      try {
        const r = await fetch('/admin/api/send-email-test', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        const j = await r.json();
        status.textContent = j.ok ? ('✅ OK ('+(j.messageId||'?')+')') : ('❌ '+(j.error||'błąd'));
      } catch { status.textContent = '❌ błąd sieci'; }
    });
  }
  function bindDeleteDay(){
    const form = document.getElementById('del-day-form');
    if (!form) return;
    const status = document.getElementById('del-day-status');
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      status.textContent = 'Usuwam...';
      const fd = new FormData(form);
      const payload = { username: fd.get('username'), day: Number(fd.get('day')) };
      try {
        const r = await fetch('/admin/api/delete-day', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        const j = await r.json();
        status.textContent = j.ok ? ('✅ Usunięto: '+(j.removed||0)) : ('❌ '+(j.error||'błąd'));
      } catch { status.textContent = '❌ błąd sieci'; }
    });
  }
  function bindDeleteAll(){
    const form = document.getElementById('del-all-form');
    if (!form) return;
    const status = document.getElementById('del-all-status');
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      if (!confirm('Na pewno usunąć WSZYSTKIE wpisy wybranego użytkownika?')) return;
      status.textContent = 'Usuwam wszystko...';
      const fd = new FormData(form);
      const payload = { username: fd.get('username') };
      try {
        const r = await fetch('/admin/api/delete-all', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        const j = await r.json();
        status.textContent = j.ok ? ('✅ Usunięto: '+(j.removed||0)) : ('❌ '+(j.error||'błąd'));
      } catch { status.textContent = '❌ błąd sieci'; }
    });
  }
  bindEmail(); bindDeleteDay(); bindDeleteAll();
})();