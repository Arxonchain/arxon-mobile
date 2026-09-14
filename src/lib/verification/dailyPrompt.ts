const PREFIX = 'arxon_verification_prompt';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function getVerificationPromptDismissedDate(userId: string): string | null {
  try {
    return localStorage.getItem(`${PREFIX}:${userId}`);
  } catch {
    return null;
  }
}

export function dismissVerificationPromptForToday(userId: string) {
  try {
    localStorage.setItem(`${PREFIX}:${userId}`, todayKey());
  } catch {
    /* ignore */
  }
}

export function shouldShowVerificationPrompt(userId: string, isComplete: boolean): boolean {
  if (isComplete) return false;
  const dismissed = getVerificationPromptDismissedDate(userId);
  return dismissed !== todayKey();
}
