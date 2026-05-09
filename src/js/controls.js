// 키보드 입력. 게임 상태를 직접 만지지 않고 Game 의 의도 메서드를 호출한다.
// 모바일 터치는 Phase 3 에서 추가.

const KEY_MAP = {
  ArrowLeft:  { kind: 'move', dx: -1, dz: 0 },
  ArrowRight: { kind: 'move', dx:  1, dz: 0 },
  ArrowUp:    { kind: 'move', dx: 0,  dz: -1 },
  ArrowDown:  { kind: 'move', dx: 0,  dz: 1 },
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

export function bindKeyboard({ game }) {
  window.addEventListener('keydown', (ev) => {
    const action = KEY_MAP[ev.code];
    if (!action) return;

    // 게임 입력 키는 페이지 스크롤을 막는다.
    if (ev.code.startsWith('Arrow') || ev.code === 'Space') ev.preventDefault();

    switch (action.kind) {
      case 'move':  game.tryMove(action.dx, 0, action.dz); break;
      case 'drop':  game.hardDrop(); break;
      case 'rot':   game.tryRotate(action.axis, action.dir); break;
      case 'start': game.start(); break;
      case 'pause': game.pause(); break;
      case 'stop':  game.reset(); break;
    }
  });
}
