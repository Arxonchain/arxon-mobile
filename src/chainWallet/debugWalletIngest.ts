/** Debug-session ingest. Never pass seeds, keys, passwords, or rho. */

export function debugWalletLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
  runId = 'pre-fix',
) {
  // #region agent log
  fetch('http://127.0.0.1:7917/ingest/4b2605e0-db72-48bf-ac2c-ece76270245c', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'bfb2f0' },
    body: JSON.stringify({
      sessionId: 'bfb2f0',
      runId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

export function storageLeakFlags() {
  try {
    const plainMnemonic = localStorage.getItem('arxon.mnemonic');
    const plainSk = localStorage.getItem('arxon.shieldedSk');
    const notes = localStorage.getItem('arxon.notes');
    let noteCount = 0;
    let notesWithRho = 0;
    if (notes) {
      try {
        const parsed = JSON.parse(notes) as { rho?: string }[];
        if (Array.isArray(parsed)) {
          noteCount = parsed.length;
          notesWithRho = parsed.filter((n) => typeof n?.rho === 'string' && n.rho.length > 8).length;
        }
      } catch {
        /* ignore */
      }
    }
    return {
      plainMnemonicPresent: !!plainMnemonic,
      plainMnemonicLen: plainMnemonic?.length ?? 0,
      mnemonicBoxPresent: !!localStorage.getItem('arxon.mnemonicBox'),
      hasPassHash: !!localStorage.getItem('arxon.passHash'),
      plainShieldedSkPresent: !!plainSk,
      shieldedSkBoxPresent: !!localStorage.getItem('arxon.shieldedSkBox'),
      noteCount,
      notesWithRho,
      notesBoxPresent: !!localStorage.getItem('arxon.notesBox'),
      leafScanAtPresent: !!localStorage.getItem('arxon.leafScanAt'),
    };
  } catch {
    return {
      plainMnemonicPresent: false,
      plainMnemonicLen: 0,
      mnemonicBoxPresent: false,
      hasPassHash: false,
      plainShieldedSkPresent: false,
      shieldedSkBoxPresent: false,
      noteCount: 0,
      notesWithRho: 0,
      notesBoxPresent: false,
      leafScanAtPresent: false,
    };
  }
}
