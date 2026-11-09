import { briefAddr } from './briefAddr';

export type ReceiptMode = 'short' | 'full';

type Inspect = {
  rows: [string, string][];
  fullRows?: [string, string][];
  status: string;
  fullTo?: string;
  fullFrom?: string;
  accountLabel?: string;
};

export function receiptStatus(value: string) {
  const text = value.trim().toLowerCase();
  if (!text) return 'Pending';
  if (text.includes('success') || text === 'included' || text === 'confirmed' || text === 'sent' || text === 'submitted') return 'Successful';
  if (text.includes('fail') || text.includes('revert') || text.includes('not applied') || text.includes('not sent') || text.includes('not moved')) return 'Failed';
  if (text.includes('pend') || text.includes('going')) return 'Pending';
  return value;
}

function clipValue(value: string) {
  const hex = value.match(/0x[0-9a-fA-F]{16,}/);
  if (!hex) return value;
  return value.replace(hex[0], briefAddr(hex[0]));
}

/** On-screen receipt is truncated. History and the share image use every field in full. */
export function receiptRows(inspect: Inspect | null, mode: ReceiptMode): [string, string][] {
  if (!inspect) return [['Status', 'Loading…']];
  const source = mode === 'full' && inspect.fullRows?.length ? inspect.fullRows : inspect.rows;
  const seen = new Set<string>();
  const rows: [string, string][] = [];
  for (const [label, value] of source) {
    if (seen.has(label)) continue;
    seen.add(label);
    if (label === 'Status') {
      rows.push([label, receiptStatus(value || inspect.status)]);
      continue;
    }
    if (label === 'From' && inspect.fullFrom) {
      const addr = mode === 'full' ? inspect.fullFrom : briefAddr(inspect.fullFrom);
      rows.push([label, inspect.accountLabel ? `${inspect.accountLabel} · ${addr}` : addr]);
      continue;
    }
    if (label === 'To' && inspect.fullTo) {
      rows.push([label, mode === 'full' ? inspect.fullTo : briefAddr(inspect.fullTo)]);
      continue;
    }
    rows.push([label, mode === 'full' ? value : clipValue(value)]);
  }
  if (!seen.has('Status')) rows.push(['Status', receiptStatus(inspect.status)]);
  return rows;
}

export async function drawReceiptPng(opts: {
  title: string;
  amount: string;
  rows: [string, string][];
}): Promise<Blob> {
  const width = 720;
  const pad = 36;
  const cardPad = 28;
  const labelW = 168;
  const valueW = width - pad * 2 - cardPad * 2 - labelW - 16;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not draw this receipt.');

  const wrap = (text: string, max: number, font: string) => {
    ctx.font = font;
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = '';
    const pushChars = (chunk: string) => {
      if (ctx.measureText(chunk).width <= max) {
        lines.push(chunk);
        return;
      }
      let piece = '';
      for (const ch of chunk) {
        const next = piece + ch;
        if (ctx.measureText(next).width > max && piece) {
          lines.push(piece);
          piece = ch;
        } else piece = next;
      }
      if (piece) lines.push(piece);
    };
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= max) {
        line = next;
        continue;
      }
      if (line) lines.push(line);
      line = '';
      if (ctx.measureText(word).width <= max) line = word;
      else pushChars(word);
    }
    if (line) lines.push(line);
    return lines.length ? lines : [text];
  };

  const valueFont = '600 22px sans-serif';
  const wrapped = opts.rows.map(([label, value]) => ({
    label,
    lines: wrap(value, valueW, valueFont),
  }));
  const cardInner = wrapped.reduce((sum, row) => sum + Math.max(28, row.lines.length * 26) + 14, 20);
  const height = 72 + 86 + 18 + cardInner + 72;
  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 40px sans-serif';
  ctx.fillText(opts.title, pad, 64);
  ctx.fillStyle = '#accafe';
  ctx.font = '700 32px sans-serif';
  ctx.fillText(opts.amount || 'Private receipt', pad, 112);

  const cardX = pad;
  const cardY = 136;
  const cardW = width - pad * 2;
  const cardH = cardInner + 16;
  roundRect(ctx, cardX, cardY, cardW, cardH, 24);
  const wash = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  wash.addColorStop(0, '#ffffff');
  wash.addColorStop(0.45, '#eef3ff');
  wash.addColorStop(1, '#dbe6ff');
  ctx.fillStyle = wash;
  ctx.fill();
  ctx.strokeStyle = 'rgba(61,109,255,0.32)';
  ctx.lineWidth = 2;
  ctx.stroke();

  let y = cardY + 36;
  for (const row of wrapped) {
    ctx.fillStyle = '#5c6578';
    ctx.font = '600 20px sans-serif';
    ctx.fillText(row.label, cardX + cardPad, y);
    ctx.fillStyle = '#0c1018';
    ctx.font = valueFont;
    row.lines.forEach((line, index) => {
      ctx.fillText(line, cardX + cardPad + labelW, y + index * 26);
    });
    y += Math.max(28, row.lines.length * 26) + 14;
  }

  ctx.fillStyle = '#8b9097';
  ctx.font = '500 18px sans-serif';
  ctx.fillText('Arxon · private receipt', pad, height - 28);

  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not make the receipt image.'))), 'image/png');
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
