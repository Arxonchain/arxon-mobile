import { Capacitor } from '@capacitor/core';
import { openSecret, sealSecret, type SecretBox } from './cryptoBox';

const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const FILE = 'arxon-wallet-backup.json';
const OAUTH_KEY = 'arxon.googleOauth';

export type DriveBackupFile = {
  v: 1;
  kind: 'arxon-wallet-backup';
  box: SecretBox;
};

type GisTokenClient = {
  requestAccessToken: (opts?: { prompt?: string }) => void;
};

type GisLib = {
  accounts: {
    oauth2: {
      initTokenClient: (cfg: {
        client_id: string;
        scope: string;
        callback: (resp: { access_token?: string; error?: string }) => void;
      }) => GisTokenClient;
    };
  };
};

let accessToken: string | null = null;

export function driveClientId() {
  return (typeof import.meta !== 'undefined' ? (import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID as string | undefined) : '')?.trim() || '';
}

export function driveRedirectUri() {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/oauth/google.html`;
}

export function driveConfigured() {
  return driveClientId().length > 0;
}

function rememberToken(token: string) {
  accessToken = token;
}

async function loadGis(): Promise<GisLib> {
  const existing = (window as unknown as { google?: GisLib }).google;
  if (existing?.accounts?.oauth2) return existing;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Google sign-in.'));
    document.head.appendChild(script);
  });
  const google = (window as unknown as { google?: GisLib }).google;
  if (!google?.accounts?.oauth2) throw new Error('Google sign-in did not load.');
  return google;
}

async function tokenViaGis(clientId: string): Promise<string> {
  const google = await loadGis();
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.access_token) {
          rememberToken(resp.access_token);
          resolve(resp.access_token);
          return;
        }
        reject(new Error(resp.error || 'Google Drive access was not granted.'));
      },
    });
    client.requestAccessToken({ prompt: '' });
  });
}

function authUrl(clientId: string, redirect: string) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: 'token',
    scope: SCOPE,
    include_granted_scopes: 'true',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function readStoredOauth() {
  try {
    const raw = localStorage.getItem(OAUTH_KEY);
    if (!raw) return null;
    localStorage.removeItem(OAUTH_KEY);
    return JSON.parse(raw) as { token?: string | null; err?: string | null };
  } catch {
    return null;
  }
}

async function tokenViaRedirect(clientId: string): Promise<string> {
  const stored = readStoredOauth();
  if (stored?.token) {
    rememberToken(stored.token);
    return stored.token;
  }
  if (stored?.err) throw new Error(stored.err);
  const redirect = driveRedirectUri();
  const url = authUrl(clientId, redirect);
  if (Capacitor.isNativePlatform()) {
    const { Browser } = await import('@capacitor/browser');
    const { App } = await import('@capacitor/app');
    return new Promise((resolve, reject) => {
      const finish = async (href: string) => {
        const hash = new URL(href).hash.replace(/^#/, '');
        const params = new URLSearchParams(hash);
        const token = params.get('access_token');
        const err = params.get('error');
        try {
          await Browser.close();
        } catch {
          /* already closed */
        }
        if (token) {
          rememberToken(token);
          resolve(token);
          return;
        }
        reject(new Error(err || 'Google Drive access was not granted.'));
      };
      const sub = App.addListener('appUrlOpen', (event) => {
        if (!event.url.includes('oauth')) return;
        void sub.then((handle) => handle.remove());
        void finish(event.url);
      });
      window.setTimeout(() => {
        void sub.then((handle) => handle.remove());
        reject(new Error('Google Drive sign-in timed out.'));
      }, 180_000);
      void Browser.open({ url });
    });
  }
  return new Promise((resolve, reject) => {
    const popup = window.open(url, 'arxon-google', 'width=480,height=720');
    const onMsg = (event: MessageEvent) => {
      const data = event.data as { type?: string; token?: string; err?: string };
      if (data?.type !== 'arxon-google-oauth') return;
      window.removeEventListener('message', onMsg);
      popup?.close();
      if (data.token) {
        rememberToken(data.token);
        resolve(data.token);
        return;
      }
      reject(new Error(data.err || 'Google Drive access was not granted.'));
    };
    window.addEventListener('message', onMsg);
    window.setTimeout(() => {
      window.removeEventListener('message', onMsg);
      reject(new Error('Google Drive sign-in timed out.'));
    }, 180_000);
  });
}

export async function connectGoogleDrive(): Promise<string> {
  if (accessToken) return accessToken;
  const clientId = driveClientId();
  if (!clientId) {
    throw new Error('Set VITE_GOOGLE_DRIVE_CLIENT_ID to a Google OAuth web client ID, then rebuild.');
  }
  try {
    return await tokenViaGis(clientId);
  } catch (gisErr) {
    try {
      return await tokenViaRedirect(clientId);
    } catch {
      throw gisErr instanceof Error ? gisErr : new Error('Google Drive sign-in failed.');
    }
  }
}

async function driveFetch(token: string, url: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text.slice(0, 180) || `Google Drive request failed (${res.status}).`);
  }
  return res;
}

async function findBackupId(token: string) {
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${encodeURIComponent(`name='${FILE}'`)}&fields=files(id,name)`;
  const res = await driveFetch(token, url);
  const body = (await res.json()) as { files?: { id: string; name: string }[] };
  return body.files?.[0]?.id ?? null;
}

export async function uploadDriveBackup(password: string, mnemonic: string) {
  const token = await connectGoogleDrive();
  const box = await sealSecret(password, mnemonic);
  const payload: DriveBackupFile = { v: 1, kind: 'arxon-wallet-backup', box };
  const meta = { name: FILE, parents: ['appDataFolder'] };
  const existing = await findBackupId(token);
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  if (existing) {
    await driveFetch(token, `https://www.googleapis.com/upload/drive/v3/files/${existing}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: blob,
    });
    return box;
  }
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
  form.append('file', blob);
  await driveFetch(token, 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    body: form,
  });
  return box;
}

export async function downloadDriveBackup(password: string): Promise<string> {
  const token = await connectGoogleDrive();
  const id = await findBackupId(token);
  if (!id) throw new Error('No Arxon backup was found in this Google Drive account.');
  const res = await driveFetch(token, `https://www.googleapis.com/drive/v3/files/${id}?alt=media`);
  const payload = (await res.json()) as DriveBackupFile;
  if (!payload?.box) throw new Error('The Drive backup is not a valid Arxon wallet file.');
  try {
    return await openSecret(password, payload.box);
  } catch {
    throw new Error('That password does not open the Google Drive backup.');
  }
}
