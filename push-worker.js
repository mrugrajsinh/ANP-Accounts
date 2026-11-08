// ANP Accounts – push sender (Cloudflare Worker)
// Sends task alerts to phones even when the app is closed or the phone is locked.
// Setup: paste this whole file into a Cloudflare Worker, then add a Secret named
// SERVICE_ACCOUNT whose value is the full Firebase service-account JSON file.

const PROJECT = 'anp-accounts';
const API_KEY = 'AIzaSyAt-mRGnyqGGf3Pw1jp7budKYxv4KXw_xY';   // public web key (same as in the app)
const OWNER = 'mrugraj321@gmail.com';
const APP_URL = 'https://mrugrajsinh.github.io/ANP-Accounts/';
const ORIGINS = ['https://mrugrajsinh.github.io'];

const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
let cached = null;

const b64url = bytes => { let s = ''; bytes.forEach(b => { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };

async function accessToken(sa) {
  if (cached && cached.exp > Date.now() + 60000) return cached.token;
  const now = Math.floor(Date.now() / 1000), te = new TextEncoder();
  const enc = o => b64url(te.encode(JSON.stringify(o)));
  const unsigned = enc({alg: 'RS256', typ: 'JWT'}) + '.' + enc({
    iss: sa.client_email, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/datastore'});
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, {name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256'}, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, te.encode(unsigned)));
  const r = await fetch('https://oauth2.googleapis.com/token', {method: 'POST', headers: {'content-type': 'application/x-www-form-urlencoded'},
    body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + unsigned + '.' + b64url(sig)});
  const j = await r.json();
  if (!j.access_token) throw new Error('Google login failed: ' + JSON.stringify(j));
  cached = {token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000};
  return cached.token;
}

const str = f => (f && f.stringValue) || '';
function person(doc) {
  const f = doc.fields || {};
  return {uid: doc.name.split('/').pop(), email: str(f.email).toLowerCase(), status: str(f.status), role: str(f.role),
    tokens: ((f.pushTokens && f.pushTokens.arrayValue && f.pushTokens.arrayValue.values) || []).map(v => v.stringValue).filter(Boolean)};
}

async function handle(body, env) {
  const {idToken, to, title, body: text, url, tag, delay} = body;
  if (!idToken || !title) return [400, {error: 'missing data'}];

  // 1. who is asking? (must be a signed-in, approved user of the app)
  const lk = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + API_KEY,
    {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({idToken})}).then(r => r.json());
  const caller = lk.users && lk.users[0];
  if (!caller) return [401, {error: 'not signed in'}];

  const sa = JSON.parse(env.SERVICE_ACCOUNT);
  const tok = await accessToken(sa), H = {authorization: 'Bearer ' + tok};

  // 2. everyone in the app (small list)
  const list = await fetch(FS + '/users?pageSize=300', {headers: H}).then(r => r.json());
  const people = (list.documents || []).map(person);
  const me = people.find(p => p.uid === caller.localId);
  const callerOk = (caller.email || '').toLowerCase() === OWNER || (me && me.status === 'approved');
  if (!callerOk) return [403, {error: 'not approved'}];

  const isAdmin = p => p.email === OWNER || (p.role === 'admin' && p.status === 'approved');
  let targets = to === 'me' ? people.filter(p => p.uid === caller.localId)
    : to === 'admins' ? people.filter(isAdmin)
    : to === 'all' ? people.filter(p => p.status === 'approved' || p.email === OWNER)
    : people.filter(p => (Array.isArray(to) ? to : [to]).includes(p.uid) && (p.status === 'approved' || p.email === OWNER));
  targets = targets.filter(p => (to === 'me' || p.uid !== caller.localId) && p.tokens.length);
  if (delay) await new Promise(r => setTimeout(r, Math.min(15, Number(delay) || 0) * 1000));   // test alert: time to lock the phone

  // 3. send
  const link = new URL(url || './?go=tasks', APP_URL).href;
  let sent = 0;
  for (const p of targets) {
    const bad = [];
    for (const token of p.tokens) {
      const r = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT}/messages:send`, {method: 'POST', headers: {...H, 'content-type': 'application/json'},
        body: JSON.stringify({message: {token,
          data: {title: String(title), body: String(text || ''), url: link, tag: String(tag || '')},
          webpush: {headers: {Urgency: 'high', TTL: '86400'},
            notification: {title: String(title), body: String(text || ''), icon: APP_URL + 'icon-192.png', badge: APP_URL + 'icon-192.png', ...(tag ? {tag: String(tag)} : {})},
            fcm_options: {link}}}})});
      if (r.ok) sent++;
      else if (r.status === 404 || r.status === 400) bad.push(token);   // phone uninstalled / token expired
    }
    if (bad.length) {
      const keep = p.tokens.filter(t => !bad.includes(t));
      await fetch(`${FS}/users/${p.uid}?updateMask.fieldPaths=pushTokens`, {method: 'PATCH', headers: {...H, 'content-type': 'application/json'},
        body: JSON.stringify({fields: {pushTokens: {arrayValue: {values: keep.map(t => ({stringValue: t}))}}}})});
    }
  }
  return [200, {ok: true, people: targets.length, sent}];
}

export default {
  async fetch(req, env, ctx) {
    const origin = req.headers.get('origin') || '';
    const cors = {'access-control-allow-origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
      'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type'};
    if (req.method === 'OPTIONS') return new Response(null, {headers: cors});
    if (req.method !== 'POST') return new Response(env.SERVICE_ACCOUNT ? 'ANP push sender is ready ✓' : 'Almost ready: add the SERVICE_ACCOUNT secret', {headers: {...cors, 'content-type': 'text/plain; charset=utf-8'}});
    try {
      const body = JSON.parse(await req.text() || '{}');
      if (body.delay) { ctx.waitUntil(handle(body, env).catch(() => {})); return new Response(JSON.stringify({ok: true, queued: true}), {headers: {...cors, 'content-type': 'application/json'}}); }
      const [status, out] = await handle(body, env);
      return new Response(JSON.stringify(out), {status, headers: {...cors, 'content-type': 'application/json'}});
    } catch (e) {
      return new Response(JSON.stringify({error: String(e && e.message || e)}), {status: 500, headers: {...cors, 'content-type': 'application/json'}});
    }
  }
};
