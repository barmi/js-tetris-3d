// 게임 상태 머신 + 드롭 타이머 + 점수.
// Phase 0 에서는 인터페이스만 정의하고, Phase 1 에서 실제 게임 흐름을 채운다.

const SPEEDS = { slow: 1.0, medium: 0.65, fast: 0.4 }; // 1셀당 초 (level=0 기준, Phase 1 에서 보정)

export class Game {
  constructor({ pit }) {
    this.pit = pit;
    this.state = 'idle'; // 'idle' | 'running' | 'paused' | 'gameover'
    this.score = 0;
    this.cubes = 0;
    this.level = 0;
    this.speed = 'medium';
    this.blockset = 'basic';
    this.dropAcc = 0;
    this.current = null; // Block
    this.next = null;    // Block
    this.listeners = new Set();
  }

  setPit(pit) {
    this.pit = pit;
    this.reset();
  }

  applyOptions({ speed, level, blockset }) {
    if (speed) this.speed = speed;
    if (level != null) this.level = +level;
    if (blockset) this.blockset = blockset;
  }

  start() {
    if (this.state === 'running') return;
    if (this.state === 'gameover' || this.state === 'idle') this.reset();
    this.state = 'running';
    this.emit();
  }

  pause() {
    if (this.state === 'running') this.state = 'paused';
    else if (this.state === 'paused') this.state = 'running';
    this.emit();
  }

  reset() {
    this.score = 0;
    this.cubes = 0;
    this.dropAcc = 0;
    this.current = null;
    this.next = null;
    this.state = 'idle';
    // pit cells 초기화.
    if (this.pit?.cells) this.pit.cells.fill(0);
    this.emit();
  }

  // 한 프레임 갱신. dt 는 ms.
  update(dt) {
    if (this.state !== 'running') return;
    // Phase 1 에서 드롭 처리, 충돌, 라인 클리어 등을 채운다.
  }

  // 입력 처리 (Phase 1 에서 본격 구현).
  tryMove(dx, dy, dz) { /* TODO */ }
  tryRotate(axis, dir) { /* TODO */ }
  hardDrop() { /* TODO */ }

  // 옵저버.
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { for (const fn of this.listeners) fn(this); }
}

export function dropIntervalMs(speed, level) {
  const base = (SPEEDS[speed] ?? SPEEDS.medium) * 1000;
  const factor = Math.max(0.2, 1 - level * 0.15);
  return base * factor;
}
