// 게임 상태 머신. 입력은 tryMove / tryRotate / hardDrop / start / pause / reset 만 노출하고,
// 렌더는 listeners(on) 로 알린다. dirty 플래그가 true 면 메인 루프가 메쉬를 갱신.

import { pickRandomBlock } from './blocksets.js';
import { saveHighScore } from './storage.js';

// 드롭 간격 — 사용자 피드백을 반영하여 보수적으로(이전 1500/1000/600 → 3000/2000/1200).
const SPEED_BASE_MS = { slow: 3000, medium: 2000, fast: 1200 };
const LAYER_BONUS = [0, 100, 250, 450, 700, 1000];
const LINES_PER_LEVEL = 5;
const MAX_LEVEL = 19;

// 회전 시 wall-kick 시도 순서. 가까운 거리부터, 축 → 대각선 → 더 먼 거리.
const ROT_KICKS = [
  [ 1, 0, 0], [-1, 0, 0],
  [ 0, 0, 1], [ 0, 0,-1],
  [ 0, 1, 0], [ 0,-1, 0],
  [ 1, 0, 1], [ 1, 0,-1], [-1, 0, 1], [-1, 0,-1],
  [ 2, 0, 0], [-2, 0, 0],
  [ 0, 0, 2], [ 0, 0,-2],
  [ 0, 2, 0], [ 0,-2, 0],
];

export function dropIntervalMs(speed, level) {
  const base = SPEED_BASE_MS[speed] ?? SPEED_BASE_MS.medium;
  // level=4 에서도 base 의 60% 까지만. 너무 빨라지지 않게.
  const factor = Math.max(0.40, 1 - level * 0.10);
  return base * factor;
}

export class Game {
  constructor({ pit }) {
    this.pit = pit;
    this.state = 'idle';
    this.score = 0;
    this.cubes = 0;
    this.layers = 0;
    this.startLevel = 0;
    this.level = 0;
    this.speed = 'medium';
    this.blockset = 'basic';
    this.dropAcc = 0;
    this.current = null;
    this.next = null;
    this.dirty = true;
    this.listeners = new Set();
  }

  setPit(pit) {
    this.pit = pit;
    this.reset();
  }

  applyOptions({ speed, level, blockset }) {
    if (speed) this.speed = speed;
    if (level != null) {
      this.startLevel = +level;
      if (this.state === 'idle' || this.state === 'gameover') {
        this.level = this.startLevel;
      }
    }
    if (blockset) this.blockset = blockset;
    this.emit();
  }

  start() {
    if (this.state === 'running') return;
    if (this.state === 'gameover') this.reset();
    if (this.state === 'idle') {
      this.level = this.startLevel;
      this.next = pickRandomBlock(this.blockset, this.pit);
      this.spawn();
      if (this.state === 'gameover') return;
      this.state = 'running';
    } else if (this.state === 'paused') {
      this.state = 'running';
    }
    this.dropAcc = 0;
    this.dirty = true;
    this.emit();
  }

  pause() {
    if (this.state === 'running') this.state = 'paused';
    else if (this.state === 'paused') this.state = 'running';
    else return;
    this.emit();
  }

  reset() {
    this.score = 0;
    this.cubes = 0;
    this.layers = 0;
    this.level = this.startLevel;
    this.dropAcc = 0;
    this.current = null;
    this.next = null;
    this.state = 'idle';
    if (this.pit?.cells) this.pit.cells.fill(0);
    this.dirty = true;
    this.emit();
  }

  update(dt) {
    if (this.state !== 'running') return;
    const interval = dropIntervalMs(this.speed, this.level);
    this.dropAcc += dt;
    let safety = 200;
    while (this.dropAcc >= interval && safety-- > 0) {
      this.dropAcc -= interval;
      this.stepDown();
      if (this.state !== 'running') break;
    }
  }

  spawn() {
    const incoming = this.next ?? pickRandomBlock(this.blockset, this.pit);
    this.next = pickRandomBlock(this.blockset, this.pit);
    this.current = incoming;
    this.placeAtSpawn(this.current);
    if (!this.pit.canPlace(this.current.absCells())) {
      this.gameOver();
      return;
    }
    this.dirty = true;
    this.emit();
  }

  placeAtSpawn(block) {
    const [sx, sy, sz] = block.size();
    const px = Math.floor((this.pit.width - sx) / 2);
    const pz = Math.floor((this.pit.depth - sz) / 2);
    const py = this.pit.height - sy;
    block.position = [px, py, pz];
  }

  tryMove(dx, dy, dz) {
    if (this.state !== 'running' || !this.current) return false;
    const c = this.current.clone();
    c.translate(dx, dy, dz);
    if (this.pit.canPlace(c.absCells())) {
      this.current = c;
      this.dirty = true;
      this.emit();
      return true;
    }
    return false;
  }

  tryRotate(axis, dir) {
    if (this.state !== 'running' || !this.current) return false;
    const c = this.current.clone();
    c.rotate(axis, dir);
    if (this.pit.canPlace(c.absCells())) {
      this.current = c;
      this.dirty = true;
      this.emit();
      return true;
    }
    // wall-kick: 가까운 순으로 다양한 평행이동을 시도. 모서리 / 벽에서도 회전이 가능하도록.
    for (const [dx, dy, dz] of ROT_KICKS) {
      c.translate(dx, dy, dz);
      if (this.pit.canPlace(c.absCells())) {
        this.current = c;
        this.dirty = true;
        this.emit();
        return true;
      }
      c.translate(-dx, -dy, -dz);
    }
    return false;
  }

  hardDrop() {
    if (this.state !== 'running' || !this.current) return;
    let dropped = 0;
    while (this.tryMove(0, -1, 0)) dropped++;
    this.score += dropped * 2;
    this.lockAndSpawn();
  }

  stepDown() {
    if (!this.tryMove(0, -1, 0)) this.lockAndSpawn();
  }

  lockAndSpawn() {
    if (!this.current) return;
    const cells = this.current.absCells();
    this.pit.mergeBlock(cells, this.current.colorIdx);
    this.cubes += cells.length;
    this.score += cells.length;

    const cleared = this.pit.clearFullLayers();
    if (cleared > 0) {
      this.layers += cleared;
      this.score += LAYER_BONUS[Math.min(cleared, LAYER_BONUS.length - 1)];
      const target = this.startLevel + Math.floor(this.layers / LINES_PER_LEVEL);
      if (target > this.level) this.level = Math.min(target, MAX_LEVEL);
    }
    this.spawn();
  }

  gameOver() {
    this.state = 'gameover';
    saveHighScore(this.score);
    this.dirty = true;
    this.emit();
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { for (const fn of this.listeners) fn(this); }
}
