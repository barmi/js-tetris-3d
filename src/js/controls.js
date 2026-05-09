// 키보드 입력. Game 의 의도 메서드와 카메라 프리셋 콜백을 호출한다.
// 화살표 이동은 카메라 yaw 에 따라 화면 기준 방향으로 매핑된다 (Phase 2).

import { screenArrowToPit } from './cameraControls.js';

const KEY_MAP = {
  ArrowLeft:  { kind: 'move', code: 'ArrowLeft',  repeat: true },
  ArrowRight: { kind: 'move', code: 'ArrowRight', repeat: true },
  ArrowUp:    { kind: 'move', code: 'ArrowUp',    repeat: true },
  ArrowDown:  { kind: 'move', code: 'ArrowDown',  repeat: true },
  Space:      { kind: 'drop' },
  KeyQ:       { kind: 'rot', axis: 'x', dir:  1 },
  KeyA:       { kind: 'rot', axis: 'x', dir: -1 },
  KeyW:       { kind: 'rot', axis: 'y', dir:  1 },
  KeyS:       { kind: 'rot', axis: 'y', dir: -1 },
  KeyE:       { kind: 'rot', axis: 'z', dir:  1 },
  KeyD:       { kind: 'rot', axis: 'z', dir: -1 },
  KeyB:       { kind: 'start' },
  KeyP:       { kind: 'pause' },
  Escape:     { kind: 'stop' },
  Digit1:     { kind: 'view', preset: 'top' },
  Digit2:     { kind: 'view', preset: 'iso' },
  Digit3:     { kind: 'view', preset: 'front' },
  Digit4:     { kind: 'view', preset: 'side' },
};

const REPEAT_DELAY_MS = 220;
const REPEAT_INTERVAL_MS = 70;

export function bindKeyboard({ game, camera, onView }) {
  const repeats = new Map();

  function clearRepeat(code) {
    const r = repeats.get(code);
    if (!r) return;
    if (r.kind === 'timeout') clearTimeout(r.id);
    else clearInterval(r.id);
    repeats.delete(code);
  }
  function clearAllRepeats() { for (const code of [...repeats.keys()]) clearRepeat(code); }

  function runAction(action) {
    switch (action.kind) {
      case 'move': {
        const [dx, dz] = camera ? screenArrowToPit(camera, action.code) : [0, 0];
        if (dx || dz) game.tryMove(dx, 0, dz);
        break;
      }
      case 'drop':  game.hardDrop(); break;
      case 'rot':   game.tryRotate(action.axis, action.dir); break;
      case 'start': game.start(); break;
      case 'pause': game.pause(); break;
      case 'stop':  game.reset(); break;
      case 'view':  onView?.(action.preset); break;
    }
  }

  window.addEventListener('keydown', (ev) => {
    const action = KEY_MAP[ev.code];
    if (!action) return;
    if (ev.code.startsWith('Arrow') || ev.code === 'Space') ev.preventDefault();
    if (ev.repeat) return;

    runAction(action);

    if (action.repeat && !repeats.has(ev.code)) {
      const t1 = setTimeout(() => {
        const t2 = setInterval(() => runAction(action), REPEAT_INTERVAL_MS);
        repeats.set(ev.code, { kind: 'interval', id: t2 });
      }, REPEAT_DELAY_MS);
      repeats.set(ev.code, { kind: 'timeout', id: t1 });
    }
  });

  window.addEventListener('keyup', (ev) => clearRepeat(ev.code));
  window.addEventListener('blur', clearAllRepeats);
}
