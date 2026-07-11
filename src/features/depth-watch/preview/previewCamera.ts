/** Fixed camera bearing for preview — joystick directions stay world-consistent. */
export const PREVIEW_CAMERA_YAW = Math.PI;

export function applyJoystickDeadzone(x: number, y: number, dead = 0.14): { x: number; y: number } {
  const mag = Math.hypot(x, y);
  if (mag < dead) return { x: 0, y: 0 };
  const scaled = Math.min(1, (mag - dead) / (1 - dead));
  return { x: (x / mag) * scaled, y: (y / mag) * scaled };
}
