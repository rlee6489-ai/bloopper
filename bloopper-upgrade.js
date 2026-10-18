// Bloopper upgrade v2: uses the app's own api() helper
(function () {
  const toast = m => { const t = document.createElement('div'); t.textContent = m;
    t.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#000c;color:#fff;padding:8px 14px;border-radius:20px;z-index:99999;font:14px sans-serif';
    document.body.appendChild(t); setTimeout(() => t.remove(), 2500); };
  const uid = () => { try { return UID; } catch (e) { return null; } };
  const me = () => { try { const u = U[UID]; return u.name || u.username || u.display_name || 'user'; } catch (e) { return 'user'; } };
  const call = (path, method, obj) => {
    if (typeof api !== 'function') throw new Error('api missing');
    if (!obj) return api(path, { method });
    const wraps = /JSON\.stringify/.test(String(api));
    return api(path, { method, body: wraps ? obj : JSON.stringify(obj) });
  };
  const enc = encodeURIComponent;
  const css = document.createElement('style');
  css.textContent = `
  .bp-ov{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:18px;pointer-events:none;z-index:5}
  .bp-pause{font-size:56px;color:#fff;text-shadow:0 2px 12px #000}
  .bp-mute{pointer-events:auto;font-size:26px;background:rgba(0,0,0,.55);color:#fff;border:0;border-radius:50%;width:52px;height:52px}
  .bp-side{position:absolute;right:10px;bottom:120px;display:flex;flex-direction:column;gap:14px;z-index:7}
  .bp-side button{background:rgba(0,0,0,.45);border:0;border-radius:50%;width:48px;height:48px;font-size:22px;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .bp-side small{font-size:10px}
  .bp-heart{font-size:90px;pointer-events:none;z-index:99998;animation:bph .8s ease-out forwards}
  @keyframes bph{0%{transform:scale(.3);opacity:1}60%{transform:scale(1.2);opacity:1}100%{transform:scale(1.4);opacity:0}}
  .bp-sheet{position:fixed;left:0;right:0;bottom:0;height:65vh;background:#fff;color:#111;border-radius:16px 16px 0 0;z-index:99997;display:flex;flex-direction:column;box-shadow:0 -4px 20px #0006}
  .bp-sheet .hd{padding:12px 16px;font-weight:700;display:flex;justify-content:space-between}
  .bp-sheet .ls{flex:1;overflow:auto;padding:0 16px}
  .bp-sheet .ls p{margin:8px 0}
  .bp-sheet form{display:flex;gap:8px;padding:10px}
  .bp-sheet input{flex:1;padding:10px;border:1px solid #ccc;border-radius:20px}
  .bp-sheet button{border:0;border-radius:20px;padding:0 16px;background:#7c3aed;color:#fff}`;
  document.head.appendChild(css);

  const idOf = v => ((v.closest('[data-id]') || {}).dataset || {}).id || v.currentSrc || v.src;
  const sync = (v, o) => o.querySelector('.bp-mute').textContent = v.muted ? '🔇' : '🔊';
  const overlay = v => {
    const p = v.parentElement;
    let o = p.querySelector('.bp-ov');
    if (!o) {
      if (getComputedStyle(p).position === 'static') p.style.position = 'relative';
      o = document.createElement('div'); o.className = 'bp-ov';
      o.innerHTML = '<button class="bp-mute"></button><div class="bp-pause">❚❚</div>';
      p.appendChild(o);
      o.querySelector('.bp-mute').onclick = e => { e.stopPropagation(); v.muted = !v.muted; sync(v, o); };
    }
    return o;
  };

  async function like(v, x, y) {
    const h = document.createElement('div'); h.className = 'bp-heart'; h.textContent = '❤️';
    h.style.cssText = 'position:fixed;left:' + (x - 45) + 'px;top:' + (y - 45) + 'px';
    document.body.appendChild(h); setTimeout(() => h.remove(), 800);
    const id = idOf(v), u = uid();
    if (!id || !u) return toast('Log in first');
    const q = '/rest/v1/bp_likes?video_id=eq.' + enc(id) + '&user_id=eq.' + u;
    try {
      const r = await call(q + '&select=id', 'GET');
      if (r && r.length) await call(q, 'DELETE');
      else await call('/rest/v1/bp_likes', 'POST', { video_id: id, user_id: u });
    } catch (e) { toast('Like failed'); }
  }

  let last = 0, timer = null;
  document.addEventListener('click', e => {
    if (e.target.closest('button,a,input,textarea,select,[onclick],.bp-sheet,.bp-side')) return;
    const v = document.elementsFromPoint(e.clientX, e.clientY).find(el => el.tagName === 'VIDEO');
    if (!v) return;
    const now = Date.now();
    if (now - last < 300) { clearTimeout(timer); last = 0; like(v, e.clientX, e.clientY); return; }
    last = now;
    timer = setTimeout(() => {
      const o = overlay(v);
      if (v.paused) { v.play(); o.style.display = 'none'; }
      else { v.pause(); sync(v, o); o.style.display = 'flex'; }
    }, 300);
  }, true);

  window.openComments = async function (videoId) {
    const s = document.createElement('div'); s.className = 'bp-sheet';
    s.innerHTML = '<div class="hd"><span>Comments</span><span id="x">✕</span></div><div class="ls"></div><form><input placeholder="Add a comment" maxlength="300"><button>Send</button></form>';
    document.body.appendChild(s);
    s.querySelector('#x').onclick = () => s.remove();
    const ls = s.querySelector('.ls');
    const load = async () => {
      let data = [];
      try { data = await call('/rest/v1/bp_comments?video_id=eq.' + enc(videoId) + '&order=created_at.desc', 'GET') || []; } catch (e) { toast('Could not load comments'); }
      ls.innerHTML = '';
      if (!data.length) { ls.innerHTML = '<p>No comments yet.</p>'; return; }
      data.forEach(c => { const p = document.createElement('p'), b = document.createElement('b'), t = document.createElement('span');
        b.textContent = (c.username || 'user') + ' '; t.textContent = c.body; p.append(b, t); ls.appendChild(p); });
    };
    s.querySelector('form').onsubmit = async e => {
      e.preventDefault();
      const i = s.querySelector('input'), u = uid();
      if (!i.value.trim()) return;
      if (!u) return toast('Log in first');
      try { await call('/rest/v1/bp_comments', 'POST', { video_id: videoId, user_id: u, username: me(), body: i.value.trim() }); }
      catch (err) { toast('Comment failed'); }
