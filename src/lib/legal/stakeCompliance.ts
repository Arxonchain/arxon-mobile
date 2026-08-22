/** localStorage key — once confirmed per device, skip age gate on future stakes */
export const AGE_GATE_STORAGE_KEY = 'arxon_age_confirmed_v1';

export const LEGAL_CONTACT_EMAIL = 'security@arxonchain.xyz';

export function hasConfirmedStakeCompliance(): boolean {
  try {
    return localStorage.getItem(AGE_GATE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function confirmStakeCompliance(): void {
  try {
    localStorage.setItem(AGE_GATE_STORAGE_KEY, '1');
  } catch {
    // ignore storage failures (private mode, etc.)
  }
}
