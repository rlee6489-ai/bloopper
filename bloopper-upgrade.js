// Bloopper upgrade: tap controls, likes, comments, channels.
(function () {
  let _c=null;
  const sb = () => {
    if (_c) return _c;
    const names=['sb','supabaseClient','_supabase','db','client','supa','supabaseClient1','supabase'];
    for (const n of names) {
      try { const c = window[n] || new Function('return typeof '+n+'!=="undefined"?'+n+':null')();
        if (c && c.auth && typeof c.from==='function') return _c=c; } catch(e){}
    }
    return null;
  };
  const css = document.createElement('style');
  css.textContent = `
  .bp-ov{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:18px;pointer-events:none;z-index:5}
  .bp-pause{font-size:56px;color:#fff;text-shadow:0 2px 12px #000}
  .bp-mute{pointer-events:auto;font-size:26px;background:rgba(0,0,0,.55);color:#fff;border:0;border-radius:50%;width:52px;height:52px}
  .bp-side{position:absolute;right:10px;bottom:120px;display:flex;flex-direction:column;gap:14px;z-index:7}
  .bp-side button{background:rgba(0,0,0,.45);border:0;border-radius:50%;width:48px;height:48px;font-size:22px;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .bp-side small{font-size:10px}
  .bp-heart{position:absolute;font-size:90px;pointer-events:none;z-index:6;animation:bph .8s ease-out forwards}
  @keyframes bph{0%{transform:scale(.3);opacity:1}60%{transform:scale(1.2);opacity:1}100%{transform:scale(1.4);opacity:0}}
  .bp-sheet{position:fixed;left:0;right:0;bottom:0;height:65vh;background:#fff;color:#111;border-radius:16px 16px 0 0;z-index:9999;display:flex;flex-direction:column;box-shadow:0 -4px 20px #0006}
  .bp-sheet .hd{padding:12px 16px;font-weight:700;display:flex;justify-content:space-between}
  .bp-sheet .ls{flex:1;overflow:auto;padding:0 16px}
  .bp-sheet .ls p{margin:8px 0}
  .bp-sheet form{display:flex;gap:8px;padding:10px}
  .bp-sheet input{flex:1;padding:10px;border:1px solid #ccc;border-radius:20px}
  .bp-sheet button{border:0;border-radius:20px;padding:0 16px;background:#7c3aed;color:#fff}`;
  document.head.appendChild(css);

  const idOf = v => ((v.closest('[data-id]') || {}).dataset || {}).id || v.currentSrc || v.src;
  const overlay = v => {
    const p = v.parentElement;
    let o = p.querySelector('.bp-ov');
    if (!o) {
      if (getComputedStyle(p).position === 'static') p.style.position = 'relative';
      o = document.createElement('div');
      o.className = 'bp-ov';
      o.innerHTML = '<button class="bp-mute"></button><div class="bp-pause">❚❚</div>';
      p.appendChild(o);
      o.querySelector('.bp-mute').onclick = e => { e.stopPropagation(); v.muted = !v.muted; sync(v, o); };
    }
    return o;
  };
  const sync = (v, o) => o.querySelector('.bp-mute').textContent = v.muted ? '🔇' : '🔊';

  async function like(v, x, y) {
    const h = document.createElement('div');
    h.className = 'bp-heart'; h.textContent = '❤️';
    h.style.left = (x - 45) + 'px'; h.style.top = (y - 45) + 'px';
    h.style.position = 'fixed'; document.body.appendChild(h);
    setTimeout(() => h.remove(), 800);
    const id = idOf(v); if (!id || !sb()) return;
    const { error } = await sb().from('bp_likes').insert({ video_id: id });
    if (error && error.code === '23505') await sb().from('bp_likes').delete().eq('video_id', id).eq('user_id', (await sb().auth.getUser()).data.user.id);
  }

  let last = 0, timer = null;
  document.addEventListener('click', e => {
    const v = e.target.closest('video'); if (!v) return;
    const now = Date.now();
    if (now - last < 300) { clearTimeout(timer); last = 0; like(v, e.clientX, e.clientY); return; }
    last = now;
    timer = setTimeout(() => {
      const o = overlay(v);
      if (v.paused) { v.play(); o.style.display = 'none'; }
      else { v.pause(); sync(v, o); o.style.display = 'flex'; }
    }, 300);
  });

  window.openComments = async function (videoId) {
    const s = document.createElement('div'); s.className = 'bp-sheet';
    s.innerHTML = '<div class="hd"><span>Comments</span><span id="x">✕</span></div><div class="ls"></div><form><input placeholder="Add a comment" maxlength="300"><button>Send</button></form>';
    document.body.appendChild(s);
    s.querySelector('#x').onclick = () => s.remove();
    const ls = s.querySelector('.ls');
    const load = async () => {
      const { data } = await sb().from('bp_comments').select('*').eq('video_id', videoId).order('created_at', { ascending: false });
      ls.innerHTML = (data || []).map(c => `<p><b></b> <span></span></p>`).join('');
      [...ls.children].forEach((p, i) => { p.children[0].textContent = data[i].username || 'user'; p.children[1].textContent = data[i].body; });
      if (!data || !data.length) ls.innerHTML = '<p>No comments yet.</p>';
    };
    s.querySelector('form').onsubmit = async e => {
      e.preventDefault();
      const i = s.querySelector('input'); if (!i.value.trim()) return;
      const u = (await sb().auth.getUser()).data.user;
      await sb().from('bp_comments').insert({ video_id: videoId, body: i.value.trim(), username: (u.user_metadata && u.user_metadata.name) || u.email.split('@')[0] });
      i.value = ''; load();
    };
    load();
  };

  setInterval(() => {
    document.querySelectorAll('video').forEach(v => {
      const p = v.parentElement; if (!p || p.querySelector('.bp-side')) return;
      if (getComputedStyle(p).position === 'static') p.style.position = 'relative';
      const d = document.createElement('div'); d.className = 'bp-side';
      d.innerHTML = '<button class="l">❤️<small></small></button><button class="c">💬</button>';
      p.appendChild(d);
      const sm = d.querySelector('small');
      const refresh = async () => { try { sm.textContent = await window.likeCount(idOf(v)) || ''; } catch(e){} };
      d.querySelector('.l').onclick = async e => { e.stopPropagation(); const r = v.getBoundingClientRect(); await like(v, r.right - 40, r.bottom - 160); refresh(); };
      d.querySelector('.c').onclic
