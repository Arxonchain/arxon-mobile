/** Word Forge gated until tested — set VITE_WORD_FORGE_ENABLED=true in .env.word-forge */
export const WORD_FORGE_ENABLED =
  import.meta.env.VITE_WORD_FORGE_ENABLED === 'true';
