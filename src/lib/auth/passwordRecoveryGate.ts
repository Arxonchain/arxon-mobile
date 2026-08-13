/** Session flag: recovery link opened — block full app until password is updated. */
const KEY = "arxon_password_recovery";

export function markPasswordRecovery(): void {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    // ignore
  }
}

export function clearPasswordRecovery(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function isPasswordRecoveryPending(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
