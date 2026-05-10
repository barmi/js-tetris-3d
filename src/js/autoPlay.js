// 자동 플레이 — 현재 블럭에 대해 모든 회전 / X-Z 위치 조합을 평가하고
// 최적 placement 를 골라 단계별(회전 → X 이동 → Z 이동 → drop) 로 적용한다.
// 평가는 표준 Tetris AI 휴리스틱 — 라인 클리어 보상 + 구멍 / 거칠기 / 높이 페널티.

const ROT = {
  x: { cw: (x, y, z) => [x, -z, y], ccw: (x, y, z) => [x, z, -y] },
  y: { cw: (x, y, z) => [z, y, -x], ccw: (x, y, z) => [-z, y, x] },
  z: { cw: (x, y, z) => [-y, x, z], ccw: (x, y, z) => [y, -x, z] },
};

const ROT_MOVES = [
  ['x',  1], ['x', -1],
  ['y',  1], ['y', -1],
  ['z',  1], ['z', -1],
];

export class AutoPlay {
  constructor(game) {
    this.game = game;
    this.enabled = false;
    this.intervalMs = 600;
    this.lastT = 0;
    this.plan = null;
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.plan = null;
    } else if (this.game.state !== 'running') {
      this.game.start();
    }
    return this.enabled;
  }

  setIntervalMs(v) {
    this.intervalMs = Math.max(60, +v || 0);
  }

  // game spawn 이벤트에서 호출. 다음 step 에서 새 plan 을 계산하도록 표시.
  onSpawn() {
    this.plan = null;
  }

  update(now) {
    if (!this.enabled) return;
    if (this.game.state === 'gameover') {
      this.enabled = false;
      this.plan = null;
      return;
    }
    if (this.game.state !== 'running') return;
    if (now - this.lastT < this.intervalMs) return;
    this.lastT = now;
    this.step();
  }

  step() {
    const block = this.game.current;
    if (!block) return;

    if (!this.plan) {
      this.plan = computePlan(this.game.pit, block);
    }
    if (!this.plan) {
      this.game.hardDrop();
      return;
    }

    // 1) 회전 차이
    if (cellsKey(block.cells) !== this.plan.cellsKey) {
      const next = this.plan.rotations.shift();
      if (!next) {
        this.game.hardDrop();
        this.plan = null;
        return;
      }
      if (!this.game.tryRotate(next.axis, next.dir)) {
        this.game.hardDrop();
        this.plan = null;
      }
      return;
    }

    // 2) X 이동
    const dx = this.plan.position[0] - block.position[0];
    if (dx !== 0) {
      if (!this.game.tryMove(Math.sign(dx), 0, 0)) {
        this.game.hardDrop();
        this.plan = null;
      }
      return;
    }

    // 3) Z 이동
    const dz = this.plan.position[2] - block.position[2];
    if (dz !== 0) {
      if (!this.game.tryMove(0, 0, Math.sign(dz))) {
        this.game.hardDrop();
        this.plan = null;
      }
      return;
    }

    // 4) 정렬 완료 — hardDrop
    this.game.hardDrop();
    this.plan = null;
  }
}

function cellsKey(cells) {
  return cells.map(([x, y, z]) => `${x},${y},${z}`).sort().join('|');
}

function rotateCells(cells, axis, dir) {
  const r = ROT[axis][dir > 0 ? 'cw' : 'ccw'];
  let rotated = cells.map(([x, y, z]) => r(x, y, z));
  let mx = 0, my = 0, mz = 0;
  for (const [x, y, z] of rotated) {
    if (x < mx) mx = x;
    if (y < my) my = y;
    if (z < mz) mz = z;
  }
  if (mx || my || mz) {
    rotated = rotated.map(([x, y, z]) => [x - mx, y - my, z - mz]);
  }
  return rotated;
}

// BFS 로 모든 unique 회전 pose 열거. 각 pose 에 도달하는 최단 회전 시퀀스(path)도 함께.
function enumerateRotations(initialCells) {
  const seen = new Map(); // key -> { cells, path }
  const queue = [{ cells: initialCells, path: [] }];
  while (queue.length > 0) {
    const cur = queue.shift();
    const key = cellsKey(cur.cells);
    if (seen.has(key)) continue;
    seen.set(key, cur);
    for (const [axis, dir] of ROT_MOVES) {
      const newCells = rotateCells(cur.cells, axis, dir);
      if (!seen.has(cellsKey(newCells))) {
        queue.push({ cells: newCells, path: [...cur.path, { axis, dir }] });
      }
    }
  }
  return [...seen.values()];
}

function cellsExtents(cells) {
  let mxX = 0, mxY = 0, mxZ = 0;
  for (const [x, y, z] of cells) {
    if (x > mxX) mxX = x;
    if (y > mxY) mxY = y;
    if (z > mxZ) mxZ = z;
  }
  return [mxX + 1, mxY + 1, mxZ + 1];
}

function computePlan(pit, block) {
  const poses = enumerateRotations(block.cells);
  let best = null;
  for (const pose of poses) {
    const [sx, sy, sz] = cellsExtents(pose.cells);
    if (sx > pit.width || sy > pit.height || sz > pit.depth) continue;

    for (let x = 0; x <= pit.width - sx; x++) {
      for (let z = 0; z <= pit.depth - sz; z++) {
        const dropY = simulateDropY(pose.cells, pit, x, z);
        if (dropY < 0) continue;
        const absCells = pose.cells.map(([cx, cy, cz]) => [cx + x, cy + dropY, cz + z]);
        const score = evaluatePlacement(pit, absCells);
        if (!best || score > best.score) {
          best = {
            score,
            cells: pose.cells,
            cellsKey: cellsKey(pose.cells),
            position: [x, dropY, z],
            rotations: [...pose.path],
          };
        }
      }
    }
  }
  return best;
}

function simulateDropY(cells, pit, x, z) {
  const [, sy] = cellsExtents(cells);
  let y = pit.height - sy;
  if (y < 0) return -1;
  if (!canPlace(cells, pit, x, y, z)) return -1;
  while (y > 0) {
    if (!canPlace(cells, pit, x, y - 1, z)) break;
    y--;
  }
  return y;
}

function canPlace(cells, pit, ox, oy, oz) {
  for (const [cx, cy, cz] of cells) {
    const x = cx + ox, y = cy + oy, z = cz + oz;
    if (y < 0 || x < 0 || x >= pit.width || z < 0 || z >= pit.depth) return false;
    if (y >= pit.height) continue;
    if (pit.isOccupied(x, y, z)) return false;
  }
  return true;
}

// 휴리스틱 평가 — 라인 클리어 시뮬레이션 후 누적/최대 높이, 구멍, 표면 거칠기 합산.
function evaluatePlacement(pit, absCells) {
  const w = pit.width, d = pit.depth, h = pit.height;
  const grid = new Uint8Array(pit.cells);
  const idx = (x, y, z) => x + w * (z + d * y);

  for (const [x, y, z] of absCells) {
    if (x >= 0 && x < w && y >= 0 && y < h && z >= 0 && z < d) {
      grid[idx(x, y, z)] = 1;
    }
  }

  // 라인 클리어 시뮬레이션 — 가득 찬 y 층 제거 + 위 칸 한 칸 내림.
  let cleared = 0;
  let y = 0;
  while (y < h) {
    let full = true;
    for (let z = 0; z < d && full; z++) {
      for (let x = 0; x < w && full; x++) {
        if (grid[idx(x, y, z)] === 0) full = false;
      }
    }
    if (full) {
      for (let yy = y; yy < h - 1; yy++) {
        for (let z = 0; z < d; z++) {
          for (let x = 0; x < w; x++) {
            grid[idx(x, yy, z)] = grid[idx(x, yy + 1, z)];
          }
        }
      }
      for (let z = 0; z < d; z++) {
        for (let x = 0; x < w; x++) {
          grid[idx(x, h - 1, z)] = 0;
        }
      }
      cleared++;
    } else {
      y++;
    }
  }

  // 컬럼 높이
  const heights = new Array(w * d).fill(0);
  let aggHeight = 0, maxHeight = 0;
  for (let z = 0; z < d; z++) {
    for (let x = 0; x < w; x++) {
      let topY = 0;
      for (let yy = h - 1; yy >= 0; yy--) {
        if (grid[idx(x, yy, z)] !== 0) {
          topY = yy + 1;
          break;
        }
      }
      heights[x + z * w] = topY;
      aggHeight += topY;
      if (topY > maxHeight) maxHeight = topY;
    }
  }

  // 구멍 — 점유된 셀 아래의 빈 셀
  let holes = 0;
  for (let z = 0; z < d; z++) {
    for (let x = 0; x < w; x++) {
      const top = heights[x + z * w];
      for (let yy = 0; yy < top - 1; yy++) {
        if (grid[idx(x, yy, z)] === 0) holes++;
      }
    }
  }

  // 표면 거칠기 — 인접 컬럼 높이 차이의 합 (4-방향)
  let bumpiness = 0;
  for (let z = 0; z < d; z++) {
    for (let x = 0; x < w - 1; x++) {
      bumpiness += Math.abs(heights[x + z * w] - heights[(x + 1) + z * w]);
    }
  }
  for (let z = 0; z < d - 1; z++) {
    for (let x = 0; x < w; x++) {
      bumpiness += Math.abs(heights[x + z * w] - heights[x + (z + 1) * w]);
    }
  }

  return (
    cleared * 1000 +
    cleared * cleared * 500 +
    -holes * 80 +
    -bumpiness * 5 +
    -aggHeight * 0.5 +
    -maxHeight * 3
  );
}
