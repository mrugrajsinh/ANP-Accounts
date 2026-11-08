// ANP → Blinkit cart filler. Runs on blinkit.com as a bookmark ("ANP Fill").
// It reads the list that the ANP app put in the address (#anp=...), searches each item
// with Blinkit's own search box and taps ADD / + exactly like a person would.
(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  if (!/blinkit\.com$/.test(location.hostname)) { alert('Open blinkit.com first (from the ANP checklist), then tap this bookmark.'); return; }
  // the list comes from the address (#anp=...) or from what the ANP app copied (ANPLIST:...)
  let raw = (location.hash.match(/anp=([^&]+)/) || [])[1];
  if (!raw) { let t = ''; try { t = await navigator.clipboard.readText(); } catch (e) {}
    if (!/ANPLIST:/.test(t)) t = prompt('Paste the list copied from the ANP app (long-press → Paste):') || '';
    raw = (t.match(/ANPLIST:([A-Za-z0-9_-]+)/) || [])[1]; }
  if (!raw) { alert('No ANP list found. In the ANP app open the checklist and tap "Fill Blinkit cart" first.'); return; }
  let data;
  try { data = JSON.parse(decodeURIComponent(escape(atob(raw.replace(/-/g, '+').replace(/_/g, '/'))))); } catch (e) { alert('Could not read the ANP list.'); return; }
  const items = data.items || [], back = data.back || '';

  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:8px;right:8px;top:8px;z-index:2147483647;background:#3b2a1e;color:#fff;font:15px/1.45 system-ui,sans-serif;padding:12px 14px;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.35);max-height:70vh;overflow:auto';
  document.body.appendChild(box);
  const log = [];
  const show = (head) => { box.innerHTML = `<b>🛒 ANP → Blinkit</b> · ${head}<div style="margin-top:6px">${log.map(l => `<div>${l}</div>`).join('')}</div>`; };

  const input = () => document.querySelector('input[type="text"], input:not([type]), input[type="search"]');
  const words = s => s.toLowerCase().replace(/(\d)\s+(kg|gm|g|ml|ltr|l|pcs|pc)\b/g, '$1$2').replace(/[^a-z0-9ऀ-࿿ ]/g, ' ').split(/\s+/).filter(w => w.length > 1);
  const cards = () => [...document.querySelectorAll('div[id]')].filter(d => /^\d+$/.test(d.id) && /ADD|\d/.test(d.innerText || '') && d.querySelector('[role="button"]'));
  const nameOf = c => (c.innerText || '').split('\n').map(s => s.trim()).find(s => s && !/^\d+\s*mins?$/i.test(s) && !/% ?off/i.test(s) && !/^₹/.test(s) && s !== 'ADD' && !/^ad$/i.test(s)) || '';

  async function search(q) {
    if (!input()) {   // e.g. on the home page: move to the search page without reloading
      history.pushState({}, '', '/s/?q=' + encodeURIComponent(q)); window.dispatchEvent(new PopStateEvent('popstate', {state: {}}));
      for (let t = 0; t < 30 && !input(); t++) await sleep(250);
    }
    const inp = input(); if (!inp) return false;
    if (decodeURIComponent(location.search).toLowerCase().replace(/\+/g, ' ').includes('q=' + q.toLowerCase()) && cards().length) { await sleep(500); return true; }
    const before = cards().map(c => c.id).join(',');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(inp, q);
    inp.dispatchEvent(new Event('input', {bubbles: true}));
    for (let t = 0; t < 40; t++) { await sleep(250); const now = cards().map(c => c.id).join(','); if (now && now !== before && decodeURIComponent(location.search).toLowerCase().includes(q.toLowerCase().slice(0, 20))) { await sleep(600); return true; } }
    return cards().length > 0;
  }
  function pick(q, pid) {
    const cs = cards();
    if (pid) { const exact = cs.find(c => c.id === String(pid)); if (exact) return exact; }
    const qw = words(q); let best = null, bestScore = 0;
    for (const c of cs) {
      const t = (c.innerText || '');
      if (/out of stock|sold out|notify me/i.test(t)) continue;
      const nw = words(nameOf(c) + ' ' + t.split('\n').slice(0, 4).join(' '));
      const hit = w => nw.some(x => x.startsWith(w) || w.startsWith(x));
      if (qw.length && !hit(qw[0])) continue;            // the first word (usually the brand) must match
      const score = qw.filter(hit).length / (qw.length || 1);
      if (score > bestScore) { best = c; bestScore = score; }
    }
    return bestScore >= 0.6 ? best : null;
  }
  const addBtn = c => [...c.querySelectorAll('[role="button"]')].find(b => (b.innerText || '').trim() === 'ADD');
  const plusBtn = c => { const bs = c.querySelectorAll('button'); return bs.length >= 2 ? bs[bs.length - 1] : null; };
  const countIn = c => { const n = [...c.querySelectorAll('[role="button"] div')].map(d => d.childElementCount === 0 ? (d.innerText || '').trim() : '').find(s => /^\d+$/.test(s)); return n ? +n : 0; };

  const results = [];
  for (let k = 0; k < items.length; k++) {
    const it = items[k];
    show(`${k + 1}/${items.length}: searching “${it.q}”…`);
    const ok = await search(it.q);
    const c = ok ? pick(it.q, it.pid) : null;
    if (!c) { log.push(`❌ ${it.n} – not found`); results.push([it.i, 'na']); continue; }
    const name = nameOf(c);
    let have = countIn(c);
    if (!have) { const a = addBtn(c); if (!a) { log.push(`❌ ${it.n} – not available`); results.push([it.i, 'na']); continue; } a.click(); await sleep(900); have = countIn(c) || 1; }
    for (let g = have; g < (it.c || 1); g++) { const p = plusBtn(c); if (!p) break; p.click(); await sleep(700); }
    log.push(`✅ ${it.n} → ${name}${(it.c || 1) > 1 ? ' × ' + (it.c) : ''}`); results.push([it.i, 'got', c.id]);
  }
  const enc = btoa(unescape(encodeURIComponent(JSON.stringify({l: data.list, r: results})))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  show(`done – check the cart, then pay`);
  box.insertAdjacentHTML('beforeend', `<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
    <button id="anpCopy" style="background:#f8cb46;color:#1b5e20;border:0;padding:9px 12px;border-radius:10px;font-weight:800">📋 Copy result for ANP</button>
    <a href="${back}?go=lists&fill=${enc}" style="background:#fff;color:#3b2a1e;padding:9px 12px;border-radius:10px;font-weight:700;text-decoration:none">↩ Open ANP here</a>
    <button id="anpX" style="background:transparent;color:#fff;border:1px solid #fff;padding:9px 12px;border-radius:10px;font-weight:700">Close</button></div>
    <div style="opacity:.8;margin-top:6px;font-size:13px">Tap the cart button on Blinkit to review quantities and pay.</div>`);
  document.getElementById('anpX').onclick = () => box.remove();
  document.getElementById('anpCopy').onclick = async () => { const t = 'ANPFILL:' + enc;
    try { await navigator.clipboard.writeText(t); } catch (e) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    document.getElementById('anpCopy').textContent = '✓ Copied – go back to the ANP app'; };
})();
