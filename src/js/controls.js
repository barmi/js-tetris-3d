// 키보드 입력. Game 의 의도 메서드만 호출한다.
// 이동 키(화살표)에는 DAS 스타일 키 리피트를 적용. 회전 / 드롭에는 미적용.

const KEY_MAP = {
  ArrowLeft:  { kind: 'move', dx: -1, dz: 0,  repeat: true },
  ArrowRight: { kind: 'move', dx:  1, dz: 0,  repeat: true },
  ArrowUp:    { kind: 'move', dx:  0, dz: -1, repeat: true },
  ArrowDown:  { kind: 'move', dx:  0, dz:  1, repeat: true },
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
};

const REPEAT_DELAY_MS = 220;
const REPEAT_INTERVAL_MS = 70;

export function bindKeyboard({ game }) {
  const repeats = new Map(); // ev.code -> { kind: 'timeout' | 'interval', id }

  function clearRepeat(code) {
    const r = repeats.get(code);
    if (!r) return;
    if (r.kind === 'timeout') clearTimeout(r.id);
    else clearInterval(r.id);
    repeats.delete(code);
  }

  function clearAllRepeats() {
    for (const code of [...repeats.keys()]) clearRepeat(code);
  }

  function runAction(action) {
    switch (action.kind) {
      case 'move':  game.tryMove(action.dx, 0, action.dz); break;
      case 'drop':  game.hardDrop(); break;
      case 'rot':   game.tryRotate(action.axis, action.dir); break;
      case 'start': game.start(); break;
      case 'pause': game.pause(); break;
      case 'stop':  game.reset(); break;
    }
  }

  window.addEventListener('keydown', (ev) => {
    const action = KEY_MAP[ev.code];
    if (!action) return;
    if (ev.code.startsWith('Arrow') || ev.code === 'Space') ev.preventDefault();
    if (ev.repeat) return; // OS 키 리피트는 무시 (직접 관리)

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
