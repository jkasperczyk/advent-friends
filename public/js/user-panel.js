
// v20.2 — panel z działającymi zakładkami + adminowy test e-mail (AJAX)
(function UserPanelSwap(){
  console.log("[user-panel] init v20.2");

  const section = document.getElementById('user-panel-section');
  const openers = document.querySelectorAll('[data-open-user-panel]');
  const title = section ? section.querySelector('#panel-title') : null;

  let returnTarget = document.getElementById('calendar-view') ? '#calendar-view' :
                     (document.getElementById('fill-view') ? '#fill-view' : null);

  function computeStats() {
    const data = window.__ENTRIES_VAR__ || [];
    let t=0,i=0,s=0,v=0;
    data.forEach(e => { if (e.text && e.text.trim()) t++; if (e.imageUrl) i++; if (e.songLink) s++; if (e.videoUrl) v++; });
    const set = (id,val)=>{ const el=document.getElementById(id); if(el) el.textContent=val; };
    set('stat-texts', t); set('stat-images', i); set('stat-songs', s); set('stat-videos', v);
    const info = document.getElementById('stats-context-label');
    if (info && window.__CONTEXT_LABEL__) info.textContent = "Liczone na bazie danych dostępnych w tej zakładce ("+window.__CONTEXT_LABEL__+").";
  }

  function showView(id){
    if (!section) return;
    section.querySelectorAll('.panel-view').forEach(v => v.classList.add('hidden'));
    const v = section.querySelector('[data-view="'+id+'"]');
    if (v) v.classList.remove('hidden');
    const map = { pw:'Zmień hasło', notif:'Powiadomienia', stats:'Statystyki', history:'Historia zmian', export:'Pobierz zawartość', email:'Test e-mail (admin)' };
    if (title) title.textContent = 'Panel Użytkownika — ' + (map[id]||'');
  }

  function toggleHeader(isPanelOpen){
    const openBtn = document.getElementById('menu-open-panel');
    const calLink = document.getElementById('menu-calendar-link');
    if (isPanelOpen) {
      openBtn && openBtn.classList.add('hidden');
      calLink && calLink.classList.remove('hidden');
    } else {
      openBtn && openBtn.classList.remove('hidden');
      if (document.getElementById('calendar-view')) {
        calLink && calLink.classList.add('hidden');
      }
    }
  }

  function bindAdminEmail(){
    const form = section.querySelector('#email-test-form');
    if (!form) return;
    const status = section.querySelector('#email-status');
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const fd = new FormData(form);
      const payload = { username: fd.get('username'), custom: fd.get('custom') || '' };
      status.textContent = 'Wysyłanie...';
      try {
        const r = await fetch('/admin/api/send-email-test', {
          method: 'POST',
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify(payload)
        });
        const j = await r.json();
        if (j.ok) status.textContent = '✅ Wysłano (MessageId: ' + (j.messageId || '?') + ')';
        else status.textContent = '❌ Błąd: ' + (j.error || 'unknown');
      } catch (err) {
        status.textContent = '❌ Błąd sieci';
      }
    });
  }

  function openPanel(initial='stats'){
    if (!section) return;
    if (returnTarget) {
      const tgt = document.querySelector(returnTarget);
      if (tgt) tgt.classList.add('hidden');
    }
    section.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showView(initial);
    const on = localStorage.getItem('NOTIFICATIONS_ON') === 'true';
    const chk = document.getElementById('notif-toggle');
    if (chk) chk.checked = on;
    const st = document.getElementById('notif-status');
    if (st) st.textContent = 'Stan: ' + (on ? 'włączone' : 'wyłączone');
    computeStats();
    toggleHeader(true);
    bindAdminEmail();
  }

  function closePanel(){
    if (!section) return;
    section.classList.add('hidden');
    if (returnTarget) {
      const tgt = document.querySelector(returnTarget);
      if (tgt) tgt.classList.remove('hidden');
      tgt.scrollIntoView({ behavior:'smooth', block:'start' });
    }
    toggleHeader(false);
  }

  openers.forEach(btn => btn.addEventListener('click', () => openPanel('stats')));

  // Delegacja kliknięć zakładek
  if (section) {
    section.addEventListener('click', (e)=>{
      const tab = e.target.closest('.panel-tab');
      if (tab && section.contains(tab)) {
        e.preventDefault();
        showView(tab.dataset.panel);
        if (tab.dataset.panel === 'email') bindAdminEmail();
      }
    });
  }

  window.__openUserPanel = openPanel;
  window.__closeUserPanel = closePanel;
  toggleHeader(false);
})();