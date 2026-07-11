import { useCallback, useEffect, useRef } from 'react';
import type { Input3D } from '../three/gameState';
import { applyJoystickDeadzone } from './previewCamera';

const defaultInput = (): Input3D => ({
  x: 0,
  y: 0,
  jump: false,
  crouch: false,
  cameraYaw: Math.PI,
  jumpPressed: false,
});

export function usePreviewInput() {
  const inputRef = useRef<Input3D>(defaultInput());
  const joyRef = useRef({ x: 0, y: 0 });
  const keysRef = useRef({ x: 0, y: 0, crouch: false });

  const mergeInput = useCallback(() => {
    const joy = applyJoystickDeadzone(joyRef.current.x, joyRef.current.y);
    const keys = keysRef.current;
    const useJoy = Math.hypot(joy.x, joy.y) > 0.05;
    // Screen space: x = right, y = forward (fixed camera behind player)
    inputRef.current.x = useJoy ? joy.x : keys.x;
    inputRef.current.y = useJoy ? -joy.y : -keys.y;
    inputRef.current.crouch = useJoy ? joy.y > 0.55 : keys.crouch;
  }, []);

  const handleJoystick = useCallback((x: number, y: number) => {
    joyRef.current = { x, y };
    mergeInput();
  }, [mergeInput]);

  useEffect(() => {
    const pressed = new Set<string>();

    const updateKeys = () => {
      let x = 0;
      let y = 0;
      if (pressed.has('w') || pressed.has('arrowup')) y -= 1;
      if (pressed.has('s') || pressed.has('arrowdown')) y += 1;
      if (pressed.has('a') || pressed.has('arrowleft')) x -= 1;
      if (pressed.has('d') || pressed.has('arrowright')) x += 1;
      const mag = Math.hypot(x, y);
      if (mag > 1) {
        x /= mag;
        y /= mag;
      }
      keysRef.current = { x, y, crouch: pressed.has('shift') };
      mergeInput();
    };

    const onDown = (e: KeyboardEvent) => {
      pressed.add(e.key.toLowerCase());
      updateKeys();
    };
    const onUp = (e: KeyboardEvent) => {
      pressed.delete(e.key.toLowerCase());
      updateKeys();
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [mergeInput]);

  const resetInput = useCallback(() => {
    joyRef.current = { x: 0, y: 0 };
    keysRef.current = { x: 0, y: 0, crouch: false };
    inputRef.current = defaultInput();
  }, []);

  return { inputRef, handleJoystick, resetInput };
}
