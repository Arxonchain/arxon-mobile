export interface GroundedDrawOpts {
  facingRight: boolean;
  moving: boolean;
  running: boolean;
  hiding: boolean;
  elapsed: number;
  alpha?: number;
  scale?: number;
  inShadow?: boolean;
}

const FEET_ANCHOR = 0.92;

export function drawGroundedCharacter(
  ctx: CanvasRenderingContext2D,
  sprite: CanvasImageSource | null,
  feetX: number,
  feetY: number,
  opts: GroundedDrawOpts,
): void {
  const scale = opts.scale ?? 1;
  const charH = 76 * scale;
  const charW = 52 * scale;
  const bobRate = opts.running ? 14 : 9;
  const bobAmp = opts.running ? 3.5 : 2.2;
  const bob = opts.moving ? Math.sin(opts.elapsed * bobRate) * bobAmp : 0;
  const lean = opts.moving ? (opts.running ? 0.1 : 0.05) : 0;
  const squash = opts.moving && Math.sin(opts.elapsed * bobRate * 2) > 0 ? 1.02 : 0.98;

  const shadowW = (opts.running ? 26 : opts.moving ? 22 : 18) * scale;
  const shadowH = (opts.running ? 7 : 9) * scale;
  ctx.fillStyle = opts.inShadow || opts.hiding
    ? 'rgba(0,0,0,0.18)'
    : 'rgba(0,0,0,0.38)';
  ctx.beginPath();
  ctx.ellipse(feetX, feetY + 3, shadowW, shadowH, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(feetX, feetY + bob);

  if (opts.hiding) {
    ctx.scale(0.84, 0.9);
    ctx.translate(opts.facingRight ? -10 : 10, 2);
  }

  ctx.scale(opts.facingRight ? 1 : -1, 1);
  ctx.transform(1, 0, lean, 1, 0, 0);
  ctx.scale(1, squash);

  if (opts.alpha != null) ctx.globalAlpha = opts.alpha;

  const drawX = -charW / 2;
  const drawY = -charH * FEET_ANCHOR;

  if (sprite) {
    ctx.drawImage(sprite, drawX, drawY, charW, charH);
  } else {
    ctx.fillStyle = '#7FE7C4';
    ctx.beginPath();
    ctx.ellipse(0, -charH * 0.45, charW * 0.35, charH * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawGroundedAgent(
  ctx: CanvasRenderingContext2D,
  sprite: CanvasImageSource | null,
  feetX: number,
  feetY: number,
  facingRight: boolean,
  elapsed: number,
  fallbackColor: string,
  label?: string,
): void {
  drawGroundedCharacter(ctx, sprite, feetX, feetY, {
    facingRight,
    moving: false,
    running: false,
    hiding: false,
    elapsed,
    scale: 0.95,
  });

  if (!sprite && label) {
    ctx.fillStyle = fallbackColor;
    ctx.font = 'bold 9px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, feetX, feetY - 40);
  }
}
