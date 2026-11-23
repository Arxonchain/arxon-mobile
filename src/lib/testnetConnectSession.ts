const KEY = 'arxon.testnetConnect';

type ConnectSession = {
  pending: boolean;
  handedOff: boolean;
  returnTo: string;
};

function read(): ConnectSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConnectSession;
    if (!parsed?.pending) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function startTestnetConnect(returnTo = '/mine') {
  if (read()?.pending) return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({
      pending: true,
      handedOff: false,
      returnTo: returnTo || '/mine',
    } satisfies ConnectSession));
  } catch {
    /* ignore */
  }
}

export function consumeTestnetConnectHandoff() {
  const cur = read();
  if (!cur || cur.handedOff) return false;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...cur, handedOff: true } satisfies ConnectSession));
  } catch {
    /* ignore */
  }
  return true;
}

export function takeTestnetConnectReturn() {
  return read()?.returnTo || '/mine';
}

export function clearTestnetConnect() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
