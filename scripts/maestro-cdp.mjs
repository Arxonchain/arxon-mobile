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
  const page = list.find((p) => p.type === 'page') || list[0];
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

async function walk() {
  const dir = resolve('maestro/out');
  mkdirSync(dir, { recursive: true });
  const report = [];

  adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP');
  adb('shell', 'cmd', 'statusbar', 'collapse');
  adb('shell', 'am', 'start', '-n', 'xyz.arxonchain.app/.MainActivity');
  await sleep(2000);

  return withSession(async (session) => {
    const step = async (name) => {
      await sleep(700);
      const ui = await dump(session);
      const png = resolve(dir, `${String(report.length).padStart(2, '0')}-${name}.png`);
      adbShot(png);
      const labels = labelsOf(ui);
      report.push({ name, toast: ui.toast, path: ui.path, mode: ui.mode, buttons: labels, body: ui.body, shot: png });
      return { ...ui, labels };
    };

    const home = await step('home');

    for (const [name, label] of [['send', 'Send'], ['receive', 'Receive'], ['swap', 'Swap'], ['more', 'More']]) {
      const res = await click(label, session);
      const ui = await step(name);
      report[report.length - 1].click = res;
      if (name === 'more' && ui.labels.includes('Buy')) {
        await click('Buy', session);
        await step('buy');
      }
      const now = await dump(session);
      const backBtn = findBack(now);
      if (backBtn) await click(backBtn.aria || backBtn.text, session);
      else await click('Home', session);
      await step(`after-${name}`);
    }

    for (const tab of ['Explore', 'History', 'Account', 'Testnet', 'Home']) {
      const res = await click(tab, session);
      await step(`tab-${tab.toLowerCase()}`);
      report[report.length - 1].click = res;
    }

    if (home.labels.includes('Mining')) {
      await click('Mining', session);
      await step('mining');
      await click('Wallet', session);
      await step('wallet-again');
    }

    writeFileSync(resolve(dir, 'report.json'), JSON.stringify(report, null, 2));
    return { steps: report.length, out: dir };
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
  else {
    console.error('dump | buttons | click <text> | back | eval <js> | shot <file> | walk');
    process.exit(2);
  }
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
