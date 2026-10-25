/* Dedicated worker so Halo2 prove calls do not block the wallet WebView.
   Same wasm functions and JSON as the page prover. */
let boot = null;
let chain = Promise.resolve();

function load(jsUrl, wasmUrl) {
  if (!boot) {
    boot = (async () => {
      importScripts(jsUrl);
      const bind = self.wasm_bindgen;
      if (!bind) throw new Error('wasm_bindgen missing');
      await bind(wasmUrl);
      return bind;
    })();
  }
  return boot;
}

self.onmessage = (event) => {
  const data = event.data || {};
  chain = chain.then(async () => {
    let api;
    try {
      api = await load(data.jsUrl, data.wasmUrl);
    } catch (e) {
      boot = null;
      const message = e && e.message ? e.message : String(e);
      self.postMessage({ id: data.id, ok: false, error: message, boot: true });
      return;
    }
    try {
      if (data.method !== 'keys') api.warm();
      const result = JSON.parse(api[data.method](JSON.stringify(data.body)));
      self.postMessage({ id: data.id, ok: true, result });
    } catch (e) {
      const message = e && e.message ? e.message : String(e);
      self.postMessage({ id: data.id, ok: false, error: message, boot: false });
    }
  }).catch(() => {
    /* chain stays alive for the next proof */
  });
};
