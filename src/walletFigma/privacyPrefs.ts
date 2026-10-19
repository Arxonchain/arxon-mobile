import { DEFAULT_FLAGS, type PrivacyFlags } from '@/chainWallet/privacy';

const FLAGS = 'arxon.defaultPrivacy';
const TOUCHED = 'arxon.defaultPrivacy.touched';

export function readDefaultPrivacy(): PrivacyFlags {
  try {
    const raw = localStorage.getItem(FLAGS);
    if (!raw) return { ...DEFAULT_FLAGS };
    const parsed = JSON.parse(raw) as Partial<PrivacyFlags>;
    return {
      hideSender: !!parsed.hideSender,
      hideReceiver: !!parsed.hideReceiver,
      hideAmount: !!parsed.hideAmount,
      hideBalance: !!parsed.hideBalance,
    };
  } catch {
    return { ...DEFAULT_FLAGS };
  }
}

export function writeDefaultPrivacy(flags: PrivacyFlags) {
  localStorage.setItem(FLAGS, JSON.stringify(flags));
  localStorage.setItem(TOUCHED, '1');
}

export function privacyDefaultsTouched() {
  try {
    return localStorage.getItem(TOUCHED) === '1';
  } catch {
    return false;
  }
}

export function hiddenCount(flags: PrivacyFlags) {
  return [flags.hideSender, flags.hideReceiver, flags.hideAmount, flags.hideBalance].filter(Boolean).length;
}

export function privacyPill(flags: PrivacyFlags) {
  return `Custom · ${hiddenCount(flags)} of 4 hidden`;
}
