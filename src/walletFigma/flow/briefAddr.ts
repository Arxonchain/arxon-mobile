/** Payment screens show 0x2e35.......2a2Ee. Receive and the private receipt keep the full value. */
export function briefAddr(value: string) {
  const text = value.trim();
  if (!/^0x[0-9a-fA-F]{16,}$/.test(text)) return text;
  return `${text.slice(0, 6)}.......${text.slice(-5)}`;
}
