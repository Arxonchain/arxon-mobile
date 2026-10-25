#!/usr/bin/env node
/**
 * Drive the live Arxon Capacitor WebView over Chrome DevTools.
 * Maestro cannot see WebView text on this phone (empty a11y tree).
 *
 *   node scripts/maestro-cdp.mjs dump
 *   node scripts/maestro-cdp.mjs buttons
 *   node scripts/maestro-cdp.mjs click Send
 *   node scripts/maestro-cdp.mjs back
 *   node scripts/maestro-cdp.mjs eval "document.title"
 *   node scripts/maestro-cdp.mjs shot path.png
 *   node scripts/maestro-cdp.mjs walk
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const SERIAL = process.env.ARXON_UDID || 'bq8hw8cyf6nfytpb';
const ADB = process.env.ADB || 'adb';
const PORT = Number(process.env.CDP_PORT || 9222);

function adb(...args) {
  return execFileSync(ADB, ['-s', SERIAL, ...args], { encoding: 'utf8' }).trim();
}

function forward() {
  const pid = adb('shell', 'pidof', 'xyz.arxonchain.app');
  if (!pid) throw new Error('Arxon is not running');
  adb('forward', `tcp:${PORT}`, `localabstract:webview_devtools_remote_${pid}`);
  return pid;
}

async function pages() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json`);
  if (!res.ok) throw new Error(`CDP list failed: ${res.status}`);
  return res.json();
}

function connect(url) {
  return new Promise((ok, err) => {
    const ws = new WebSocket(url);
    const pending = new Map();
    let seq = 0;
    ws.addEventListener('open', () => ok({
      ws,
      send(method, params = {}) {
        const id = ++seq;
        return new Promise((resolveId, rejectId) => {
          pending.set(id, { resolveId, rejectId });
          ws.send(JSON.stringify({ id, method, params }));
        });
      },
    }));
    ws.addEventListener('error', err);
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(String(ev.data));
      const slot = pending.get(msg.id);
      if (!slot) return;
      pending.delete(msg.id);
      if (msg.error) slot.rejectId(new Error(msg.error.message || JSON.stringify(msg.error)));
      else slot.resolveId(msg.result);
    });
  });
}

const INSPECT = `(() => {
  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  };
  const label = (el) => (el.getAttribute('aria-label') || el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim();
  const buttons = [...document.querySelectorAll('button, [role="tab"], [role="button"], a')].filter(visible).map((el) => {
    const r = el.getBoundingClientRect();
    return { text: label(el).slice(0, 80), aria: el.getAttribute('aria-label') || '', x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) };
  }).filter((b) => b.text);
  const status = document.querySelector('[role="status"]');
  const headings = [...document.querySelectorAll('p, h1, h2, span')].filter(visible).map(label).filter((t) => t.length > 1 && t.length < 60).slice(0, 30);
  return {
    title: document.title,
    href: location.href,
    path: location.pathname + location.search,
    mode: sessionStorage.getItem('arxon-app-mode'),
    toast: status ? label(status) : null,
    headings,
    buttons,
    body: (document.body.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 1200),
  };
})()`;

async function evalJson(session, expression) {
  const result = await session.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'CDP evaluate failed');
  }
  return result.result.value;
}

async function withSession(fn) {
  forward();
  const list = await pages();
  const page = list.find((p) => p.type === 'page' && p.url && !p.url.startsWith('about:')) || list.find((p) => p.type === 'page') || list[0];
  if (!page) throw new Error('No WebView page');
  const session = await connect(page.webSocketDebuggerUrl);
  try {
    await session.send('Runtime.enable');
    await session.send('Page.enable');
    return await fn(session);
  } finally {
    session.ws.close();
  }
}

const CLICK_JS = (text) => `(() => {
  const needle = ${JSON.stringify(text)}.toLowerCase();
  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  };
  const label = (el) => (el.getAttribute('aria-label') || el.innerText || '').replace(/\\s+/g, ' ').trim();
  const nodes = [...document.querySelectorAll('button, [role="tab"], [role="button"], a')].filter(visible);
  const exact = nodes.find((el) => label(el).toLowerCase() === needle);
  const start = nodes.find((el) => label(el).toLowerCase().startsWith(needle));
  const has = nodes.find((el) => label(el).toLowerCase().includes(needle));
  const el = exact || start || has;
  if (!el) return { ok: false, available: nodes.map(label).filter(Boolean).slice(0, 40) };
  el.click();
  return { ok: true, clicked: label(el) };
})()`;

function labelsOf(ui) {
  return (ui.buttons || []).map((b) => b.text);
}

function findBack(ui) {
  return (ui.buttons || []).find((b) => {
    const t = `${b.text} ${b.aria}`.toLowerCase();
    return t === 'back' || t === 'close' || /\bback\b/.test(t) || t === 'close';
  });
}

async function dump(session) {
  if (session) return evalJson(session, INSPECT);
  return withSession((s) => evalJson(s, INSPECT));
}

async function click(text, session) {
  if (session) return evalJson(session, CLICK_JS(text));
  return withSession((s) => evalJson(s, CLICK_JS(text)));
}

async function back(session) {
  const run = (s) => evalJson(s, `(() => { history.back(); return true; })()`);
  if (session) return run(session);
  return withSession(run);
}

function adbShot(file) {
  const path = resolve(file);
  mkdirSync(dirname(path), { recursive: true });
  adb('shell', 'screencap', '-p', '/sdcard/arxon-maestro.png');
  execFileSync(ADB, ['-s', SERIAL, 'pull', '/sdcard/arxon-maestro.png', path], { encoding: 'utf8' });
  return { ok: true, path };
}

async function shot(file) {
  return adbShot(file);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const LAYOUT_JS = `(() => {
  const issues = [];
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const label = (el) => (el.getAttribute('aria-label') || el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim();
  const nodes = [...document.querySelectorAll('button, [role="tab"], [role="button"], a')].filter(visible);
  for (const el of nodes) {
    const r = el.getBoundingClientRect();
    const text = label(el).slice(0, 80);
    if (r.width < 24 || r.height < 24) issues.push({ type: 'tiny-hit', text, w: Math.round(r.width), h: Math.round(r.height) });
    if (!text) issues.push({ type: 'unlabeled', tag: el.tagName, w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) });
    if (r.bottom > vh + 8 && r.top < vh) issues.push({ type: 'clipped-bottom', text, y: Math.round(r.bottom), vh });
    if (r.top < -8 && r.bottom > 0) issues.push({ type: 'clipped-top', text, y: Math.round(r.top) });
    if (r.right > vw + 8 && r.left < vw) issues.push({ type: 'clipped-right', text });
  }
  const chrome = [...document.querySelectorAll('span, p')].filter(visible).map(label);
  if (chrome.some((t) => t === '9:41')) issues.push({ type: 'os-chrome', text: '9:41 still visible' });
  const nav = document.querySelector('nav');
  if (nav && visible(nav)) {
    const r = nav.getBoundingClientRect();
    if (r.bottom > vh + 4) issues.push({ type: 'nav-cropped', bottom: Math.round(r.bottom), vh });
  }
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i].getBoundingClientRect();
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j].getBoundingClientRect();
      const overlap = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      const minArea = Math.min(a.width * a.height, b.width * b.height);
      if (minArea > 0 && overlap / minArea > 0.55) {
        const ta = label(nodes[i]).slice(0, 40);
        const tb = label(nodes[j]).slice(0, 40);
        if (ta && tb && ta !== tb) issues.push({ type: 'overlap', a: ta, b: tb });
      }
    }
  }
  const cards = [...document.querySelectorAll('button')].filter(visible);
  for (const el of cards) {
    const r = el.getBoundingClientRect();
    const text = label(el).slice(0, 60);
    if (r.width > 240 && r.height > 88 && r.height < 700) {
      issues.push({ type: 'stretched-card', text, w: Math.round(r.width), h: Math.round(r.height) });
    }
    if (r.width > vw + 12) issues.push({ type: 'wide-card', text, w: Math.round(r.width), vw });
  }
  return issues.slice(0, 40);
})()`;

const SKIP = new Set([
  'log out', 'logout', 'forgot password?', 'forgot password',
  'use fingerprint', 'use face id', 'enable fingerprint', 'enable face id',
  'waiting for fingerprint…', 'waiting for face id…',
  'show password', 'hide password',
  'mining', 'wallet',
]);

const TAB_LABELS = ['Home', 'Market', 'Explore', 'Testnet', 'Account'];

function skipLabel(text) {
  const t = String(text || '').toLowerCase().trim();
  if (!t) return true;
  if (SKIP.has(t)) return true;
  if (t.includes('waiting for')) return true;
  if (t.includes('mine arx') || t.includes('arxon mining')) return true;
  if (t === 'complete security check' || t.includes('retry verification')) return true;
  return false;
}

function isChromeTab(text) {
  return TAB_LABELS.includes(text) || text === 'Wallet' || text === 'Mining';
}

function screenKey(ui) {
  const head = (ui.headings || []).slice(0, 3).join('|');
  const btns = (ui.buttons || []).map((b) => b.text).slice(0, 12).join('|');
  return `${ui.path || ''}::${head}::${btns}`;
}

async function walk() {
  const dir = resolve('maestro/out');
  mkdirSync(dir, { recursive: true });
  const report = [];
  const bugs = [];
  const seen = new Set();

  adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP');
  adb('shell', 'cmd', 'statusbar', 'collapse');
  await sleep(800);

  return withSession(async (session) => {
    const step = async (name) => {
      await sleep(800);
      const ui = await dump(session);
      let layout = [];
      try {
        layout = await evalJson(session, LAYOUT_JS) || [];
      } catch {
        layout = [];
      }
      const png = resolve(dir, `${String(report.length).padStart(2, '0')}-${name.replace(/[^a-z0-9-]+/gi, '-').slice(0, 40)}.png`);
      if (layout.length || ui.toast || report.length === 0) {
        try { adbShot(png); } catch { /* shot optional */ }
      }
      const labels = labelsOf(ui);
      const entry = { name, toast: ui.toast, path: ui.path, mode: ui.mode, buttons: labels, headings: ui.headings, body: ui.body, layout, shot: png };
      report.push(entry);
      for (const issue of layout) bugs.push({ screen: name, ...issue });
      if (ui.toast) bugs.push({ screen: name, type: 'toast', text: ui.toast });
      return { ...ui, labels, layout };
    };

    const ensureWallet = async () => {
      const now = await dump(session);
      if (now.mode === 'mining' || (String(now.body || '').includes('Welcome Back') && (now.buttons || []).some((b) => b.text === 'Wallet'))) {
        const hasWallet = (now.buttons || []).some((b) => b.text === 'Wallet');
        if (hasWallet) await click('Wallet', session);
        await sleep(500);
      }
    };

    const goHome = async () => {
      await ensureWallet();
      const now = await dump(session);
      if ((now.headings || []).some((h) => /account 01|tokens/i.test(h)) && now.mode !== 'mining') return;
      const backBtn = findBack(now);
      if (backBtn) {
        await click(backBtn.aria || backBtn.text, session);
        await sleep(400);
      }
      const later = await dump(session);
      if (later.mode === 'mining') {
        await click('Wallet', session);
        await sleep(400);
      }
      const after = await dump(session);
      if (!(after.buttons || []).some((b) => b.text === 'Home')) return;
      await click('Home', session);
    };

    await step('start');

    const openInner = async (labels) => {
      for (const label of labels) {
        const now = await dump(session);
        const has = (now.buttons || []).some((b) => (b.text || '').toLowerCase().includes(String(label).toLowerCase()));
        if (!has) continue;
        const res = await click(label, session);
        const ui = await step(`tap-${String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 28)}`);
        report[report.length - 1].click = res;
        if (!res?.ok) bugs.push({ screen: ui.headings?.[0] || 'unknown', type: 'click-miss', text: label, available: res?.available?.slice?.(0, 12) });
        const key = screenKey(ui);
        if (!seen.has(key)) {
          seen.add(key);
          const inner = (ui.buttons || []).map((b) => b.text).filter((t) => !skipLabel(t) && !isChromeTab(t));
          for (const t of inner.slice(0, 10)) {
            if (seen.has(`btn:${t}`)) continue;
            const hit = await click(t, session);
            if (!hit?.ok) continue;
            seen.add(`btn:${t}`);
            await step(`inner-${String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}`);
            const backBtn = findBack(await dump(session));
            if (backBtn) await click(backBtn.aria || backBtn.text, session);
          }
        }
        seen.add(`btn:${label}`);
        await goHome();
      }
    };

    await ensureWallet();
    const seed = await dump(session);
    const homeTaps = (seed.buttons || []).map((b) => b.text).filter((t) => !skipLabel(t) && !isChromeTab(t));
    await openInner(homeTaps);

    for (const tab of TAB_LABELS) {
      await goHome();
      const res = await click(tab, session);
      const ui = await step(`tab-${tab.toLowerCase()}`);
      report[report.length - 1].click = res;
      if (tab === 'Account') {
        for (const row of ['Fingerprint, Face ID & password', 'Face ID & password', 'Help & support', 'Currency', 'Privacy', 'WalletConnect', 'Address book', 'Backup']) {
          const latest = await dump(session);
          const hit = (latest.buttons || []).find((b) => b.text.toLowerCase().includes(row.toLowerCase()));
          if (!hit) continue;
          await click(hit.text, session);
          await step(`account-${row.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}`);
          await goHome();
          await click('Account', session);
        }
      } else if (tab !== 'Home') {
        const inner = (ui.buttons || []).map((b) => b.text).filter((t) => !skipLabel(t) && !isChromeTab(t));
        for (const t of inner.slice(0, 8)) {
          if (seen.has(`tabbtn:${t}`)) continue;
          const hit = await click(t, session);
          if (!hit?.ok) continue;
          seen.add(`tabbtn:${t}`);
          await step(`tabinner-${String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}`);
          const backBtn = findBack(await dump(session));
          if (backBtn) await click(backBtn.aria || backBtn.text, session);
          await sleep(300);
          await click(tab, session);
        }
      }
    }

    await goHome();
    await step('wallet-home-end');

    writeFileSync(resolve(dir, 'report.json'), JSON.stringify({ bugs, report }, null, 2));
    return { steps: report.length, bugs: bugs.length, out: dir, bugTypes: [...new Set(bugs.map((b) => b.type))] };
  });
}

async function walkExplore() {
  const dir = resolve('maestro/out/explore');
  mkdirSync(dir, { recursive: true });
  const report = [];
  const bugs = [];

  adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP');
  adb('shell', 'cmd', 'statusbar', 'collapse');
  await sleep(600);

  return withSession(async (session) => {
    const step = async (name) => {
      await sleep(700);
      const ui = await dump(session);
      let layout = [];
      try {
        layout = await evalJson(session, LAYOUT_JS) || [];
      } catch {
        layout = [];
      }
      const png = resolve(dir, `${String(report.length).padStart(2, '0')}-${name.replace(/[^a-z0-9-]+/gi, '-').slice(0, 40)}.png`);
      try { adbShot(png); } catch { /* shot optional */ }
      const labels = labelsOf(ui);
      report.push({ name, toast: ui.toast, path: ui.path, mode: ui.mode, buttons: labels, headings: ui.headings, body: ui.body, layout, shot: png });
      for (const issue of layout) bugs.push({ screen: name, ...issue });
      if (ui.toast) bugs.push({ screen: name, type: 'toast', text: ui.toast });
      return { ...ui, labels, layout };
    };

    const tap = async (label) => {
      const res = await click(label, session);
      if (!res?.ok) bugs.push({ screen: report.at(-1)?.name || 'unknown', type: 'click-miss', text: label, available: res?.available?.slice?.(0, 16) });
      return res;
    };

    const backHere = async () => {
      const now = await dump(session);
      const backBtn = findBack(now);
      if (backBtn) {
        await click(backBtn.aria || backBtn.text, session);
        await sleep(400);
        return;
      }
      await tap('Explore');
    };

    const now = await dump(session);
    if (now.mode === 'mining') {
      await tap('Wallet');
      await sleep(400);
    }
    if ((now.body || '').toLowerCase().includes('enter your password') || (now.buttons || []).some((b) => b.text === 'Unlock')) {
      writeFileSync(resolve(dir, 'report.json'), JSON.stringify({ bugs: [{ screen: 'unlock', type: 'locked', text: 'Wallet is locked; unlock to audit Explore.' }], report: [{ name: 'locked', ...now }] }, null, 2));
      return { steps: 1, bugs: 1, out: dir, bugTypes: ['locked'] };
    }
    await tap('Explore');
    await step('explore-start');

    for (const chip of ['All', 'Browser', 'dApps', 'Tools']) {
      await tap(chip);
      await step(`explore-chip-${chip.toLowerCase()}`);
      try {
        const cards = await evalJson(session, `(() => {
          const issues = [];
          const vw = window.innerWidth;
          for (const el of document.querySelectorAll('button')) {
            const r = el.getBoundingClientRect();
            const text = (el.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 48);
            if (r.width > 240 && r.height > 88 && r.height < 700) issues.push({ type: 'stretched-card', text, h: Math.round(r.height), w: Math.round(r.width) });
            if (r.width > vw + 12) issues.push({ type: 'wide-card', text, w: Math.round(r.width), vw });
          }
          const native = !!window.ArxonInAppBrowser;
          return { native, issues };
        })()`);
        report[report.length - 1].cards = cards;
        for (const issue of cards?.issues || []) bugs.push({ screen: `explore-chip-${chip.toLowerCase()}`, ...issue });
      } catch { /* ignore */ }
    }

    await tap('All');
    await sleep(300);
    await tap('See all');
    await step('explore-dapps-list');
    await backHere();
    await tap('Explore');
    await sleep(300);

    await tap('Tools');
    await sleep(300);
    await tap('Buy crypto');
    await step('explore-buy');
    await backHere();
    await tap('Explore');
    await tap('Tools');
    await tap('Connected apps');
    await step('explore-connected');
    await backHere();

    await tap('Explore');
    await tap('Refresh');
    await step('explore-refresh');

    for (const tab of TAB_LABELS) {
      await tap(tab);
      await step(`wallet-tab-${tab.toLowerCase()}`);
    }

    await tap('Explore');
    await step('explore-end');

    writeFileSync(resolve(dir, 'report.json'), JSON.stringify({ bugs, report }, null, 2));
    return { steps: report.length, bugs: bugs.length, out: dir, bugTypes: [...new Set(bugs.map((b) => b.type))] };
  });
}

const [cmd, ...rest] = process.argv.slice(2);
const arg = rest.join(' ');

try {
  let result;
  if (cmd === 'dump') result = await dump();
  else if (cmd === 'buttons') result = (await dump()).buttons;
  else if (cmd === 'click') result = await click(arg);
  else if (cmd === 'back') result = await back();
  else if (cmd === 'eval') result = await withSession((s) => evalJson(s, arg));
  else if (cmd === 'shot') result = await shot(arg || 'maestro/out/shot.png');
  else if (cmd === 'walk') result = await walk();
  else if (cmd === 'explore') result = await walkExplore();
  else {
    console.error('dump | buttons | click <text> | back | eval <js> | shot <file> | walk | explore');
    process.exit(2);
  }
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
