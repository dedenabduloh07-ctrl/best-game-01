// Keyboard and mouse, read as one input. The paddle answers both: arrow keys
// or A/D, and the mouse moving across the canvas. Space, Enter or a click
// confirms (start, launch, restart) and fires the laser; P or Escape pauses;
// M mutes.
import { VIEW_H, VIEW_W } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let pointerX = null;
  let pointerFresh = 0;

  function toLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / VIEW_W, rect.height / VIEW_H);
    const ox = (rect.width - VIEW_W * scale) / 2;
    const oy = (rect.height - VIEW_H * scale) / 2;
    return { x: (clientX - rect.left - ox) / scale, y: (clientY - rect.top - oy) / scale };
  }

  function keyDown(event) {
    if (['ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') actions |= ACTION_CONFIRM;
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'KeyM') actions |= ACTION_MUTE;
  }

  function keyUp(event) {
    keys.delete(event.code);
  }

  function mouseMove(event) {
    pointerX = toLogical(event.clientX, event.clientY).x;
    pointerFresh = performance.now();
  }

  function mouseDown(event) {
    pointerX = toLogical(event.clientX, event.clientY).x;
    pointerFresh = performance.now();
    if (event.button === 0) actions |= ACTION_CONFIRM;
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  canvas.addEventListener('mousemove', mouseMove);
  canvas.addEventListener('mousedown', mouseDown);

  return {
    /** -1, 0 or 1 from the keys held down. */
    direction() {
      const left = keys.has('ArrowLeft') || keys.has('KeyA');
      const right = keys.has('ArrowRight') || keys.has('KeyD');
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    /** The mouse's logical x, or null when the mouse has not moved lately. */
    pointer() {
      return pointerFresh && performance.now() - pointerFresh < 4000 ? pointerX : null;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
