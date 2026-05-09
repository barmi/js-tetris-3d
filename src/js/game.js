// 게임 상태 머신. tryMove / tryRotate / hardDrop / start / pause / reset 만 노출하고,
// 변경은 emit(type) 으로 알린다. type 에 따라 main.js 가 SFX / 파티클 / 화면 흔들림을 재생.

import { pickRandomBlock } from './blocksets.js';
import { saveHighScore, loadStats, saveStats } from './storage.js';

const SPEED_BASE_MS = {
  antigravity: Infinity, // 자동 드롭 없음 — 사용자가 Space 로 직접 떨어뜨려야 함.
  slow: 3000,
  medium: 2000,
  fast: 1200,
};
const LAYER_BONUS = [0, 100, 250, 450, 700, 1000];
const LINES_PER_LEVEL = 5;
const MAX_LEVEL = 19;

// 회전 시 wall-kick offsets — 빈 공간이라면 거의 항상 회전할 수 있도록
// dy = -1..+3, dx/dz = -2..+2 의 124 offsets 을 가까운 거리 순으로 정렬.
const ROT_KICKS = (() => {
  const range = 2;
  const offs = [];
  for (let dy = -1; dy <= 3; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      for (let dz = -range; dz <= range; dz++) {
        if (dx === 0 && dy === 0 && dz === 0) continue;
        offs.push([dx, dy, dz]);
      }
    }
  }
  offs.sort((a, b) => {
    const da = Math.abs(a[0]) + Math.abs(a[1]) + Math.abs(a[2]);
    const db = Math.abs(b[0]) + Math.abs(b[1]) + Math.abs(b[2]);
    if (da !== db) return da - db;
    if (a[1] !== b[1]) return b[1] - a[1]; // +y 우선
    return 0;
  });
  return offs;
})();

export function dropIntervalMs(speed, level) {
  const base = SPEED_BASE_MS[speed] ?? SPEED_BASE_MS.medium;
  if (!Number.isFinite(base)) return Infinity;
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
    this.bestComboThisGame = 0;
    this.lastClearedYs = [];
    // 회전 anim 정보 — main.js 가 mesh.quaternion / mesh.position 보간에 사용.
    this.lastRotation = null;
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
    this.emit('options');
  }

  start() {
    if (this.state === 'running') return;
    if (this.state === 'gameover') this.reset();
    if (this.state === 'idle') {
      this.level = this.startLevel;
      this.bestComboThisGame = 0;
      this.next = pickRandomBlock(this.blockset, this.pit);
      this.spawn();
      if (this.state === 'gameover') return;
      this.state = 'running';
    } else if (this.state === 'paused') {
      this.state = 'running';
    }
    this.dropAcc = 0;
    this.dirty = true;
    this.emit('state');
  }

  pause() {
    if (this.state === 'running') this.state = 'paused';
    else if (this.state === 'paused') this.state = 'running';
    else return;
    this.emit('state');
  }

  reset() {
    this.score = 0;
    this.cubes = 0;
    this.layers = 0;
    this.level = this.startLevel;
    this.dropAcc = 0;
    this.current = null;
    this.next = null;
    this.bestComboThisGame = 0;
    this.lastClearedYs = [];
    this.state = 'idle';
    if (this.pit?.cells) this.pit.cells.fill(0);
    this.dirty = true;
    this.emit('state');
  }

  update(dt) {
    if (this.state !== 'running') return;
    const interval = dropIntervalMs(this.speed, this.level);
    if (!Number.isFinite(interval)) return; // antigravity
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
    this.emit('spawn');
  }

  placeAtSpawn(block) {
    const [sx, sy, sz] = block.size();
    const px = Math.floor((this.pit.width - sx) / 2);
    const pz = Math.floor((this.pit.depth - sz) / 2);
    const py = this.pit.height - sy;
    // setPosition 으로 idealCentroid 도 같이 새 위치에 동기화 (회전 누적 버그 회피).
    block.setPosition(px, py, pz);
  }

  tryMove(dx, dy, dz) {
    if (this.state !== 'running' || !this.current) return false;
    const c = this.current.clone();
    c.translate(dx, dy, dz);
    if (this.pit.canPlace(c.absCells())) {
      this.current = c;
      this.dirty = true;
      this.emit('move');
      return true;
    }
    return false;
  }

  tryRotate(axis, dir) {
    if (this.state !== 'running' || !this.current) return false;
    const fromAbs = this.current.absCentroid();
    const c = this.current.clone();
    c.rotate(axis, dir);
    fitInsidePit(c, this.pit);
    const commit = () => {
      this.current = c;
      this.lastRotation = { axis, dir, fromAbsCentroid: fromAbs, toAbsCentroid: c.absCentroid() };
      this.dirty = true;
      this.emit('rotate');
    };
    if (this.pit.canPlace(c.absCells())) {
      commit();
      return true;
    }
    for (const [dx, dy, dz] of ROT_KICKS) {
      c.translate(dx, dy, dz);
      if (this.pit.canPlace(c.absCells())) {
        commit();
        return true;
      }
      c.translate(-dx, -dy, -dz);
    }
    return false;
  }

  hardDrop() {
    if (this.state !== 'running' || !this.current) return;
    let dropped = 0;
    const c = this.current.clone();
    while (true) {
      c.translate(0, -1, 0);
      if (!this.pit.canPlace(c.absCells())) {
        c.translate(0, 1, 0);
        break;
      }
      dropped++;
    }
    if (dropped > 0) {
      this.current = c;
      this.score += dropped * 2;
    }
    this.dirty = true;
    this.emit('drop');
    this.lockAndSpawn();
  }

  // 자동 드롭 한 칸. 'fall' 이벤트는 sfx 로 재생하지 않음.
  stepDown() {
    if (!this.current) return;
    const c = this.current.clone();
    c.translate(0, -1, 0);
    if (this.pit.canPlace(c.absCells())) {
      this.current = c;
      this.dirty = true;
      this.emit('fall');
    } else {
      this.lockAndSpawn();
    }
  }

  lockAndSpawn() {
    if (!this.current) return;
    const cells = this.current.absCells();
    this.pit.mergeBlock(cells, this.current.colorIdx);
    this.cubes += cells.length;
    this.score += cells.length;
    this.dirty = true;
    this.emit('lock');

    const clearedYs = this.pit.clearFullLayers();
    const cleared = clearedYs.length;
    if (cleared > 0) {
      this.lastClearedYs = clearedYs;
      this.layers += cleared;
      if (cleared > this.bestComboThisGame) this.bestComboThisGame = cleared;
      this.score += LAYER_BONUS[Math.min(cleared, LAYER_BONUS.length - 1)];
      const target = this.startLevel + Math.floor(this.layers / LINES_PER_LEVEL);
      if (target > this.level) this.level = Math.min(target, MAX_LEVEL);
      this.emit('clear');
    }
    this.spawn();
  }

  gameOver() {
    this.state = 'gameover';
    saveHighScore(this.score);
    const s = loadStats();
    s.games = (s.games || 0) + 1;
    s.totalCubes = (s.totalCubes || 0) + this.cubes;
    s.totalLines = (s.totalLines || 0) + this.layers;
    if (this.score > (s.bestScore || 0)) s.bestScore = this.score;
    if (this.bestComboThisGame > (s.bestCombo || 0)) s.bestCombo = this.bestComboThisGame;
    saveStats(s);
    this.dirty = true;
    this.emit('gameover');
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(type) { for (const fn of this.listeners) fn(this, type); }
}

// 회전 후 셀 BBox 가 pit X / Z 외부로 나갔거나 음의 Y 면 안쪽으로 자동 평행이동.
function fitInsidePit(block, pit) {
  let mnX = Infinity, mnY = Infinity, mnZ = Infinity;
  let mxX = -Infinity, mxZ = -Infinity;
  for (const [x, y, z] of block.absCells()) {
    if (x < mnX) mnX = x;
    if (y < mnY) mnY = y;
    if (z < mnZ) mnZ = z;
    if (x > mxX) mxX = x;
    if (z > mxZ) mxZ = z;
  }
  let dx = 0, dy = 0, dz = 0;
  if (mnX < 0) dx = -mnX;
  else if (mxX >= pit.width) dx = pit.width - 1 - mxX;
  if (mnZ < 0) dz = -mnZ;
  else if (mxZ >= pit.depth) dz = pit.depth - 1 - mxZ;
  if (mnY < 0) dy = -mnY;
  if (dx || dy || dz) block.translate(dx, dy, dz);
}
