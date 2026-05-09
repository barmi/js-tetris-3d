// Pit: 3D 점유 그리드. 좌표는 정수.
// 좌표 규약: x = 가로(0..width-1), z = 세로(0..depth-1), y = 깊이/높이(0..height-1, 위쪽이 큼).

export class Pit {
  constructor(width, depth, height) {
    this.width = width;
    this.depth = depth;
    this.height = height;
    // 0 = 비어있음, 1.. = 색 인덱스(추후 정의).
    this.cells = new Uint8Array(width * depth * height);
  }

  index(x, y, z) {
    return x + this.width * (z + this.depth * y);
  }

  isInside(x, y, z) {
    return (
      x >= 0 && x < this.width &&
      z >= 0 && z < this.depth &&
      y >= 0 && y < this.height
    );
  }

  get(x, y, z) {
    if (!this.isInside(x, y, z)) return 0;
    return this.cells[this.index(x, y, z)];
  }

  set(x, y, z, v) {
    if (!this.isInside(x, y, z)) return;
    this.cells[this.index(x, y, z)] = v;
  }

  isOccupied(x, y, z) {
    return this.get(x, y, z) !== 0;
  }

  // 블록의 절대 좌표 셀이 모두 빈칸이고 pit 내부인지 (단, y < 0 은 바닥 아래로의 충돌).
  canPlace(absCells) {
    for (const [x, y, z] of absCells) {
      if (y < 0) return false;
      if (x < 0 || x >= this.width) return false;
      if (z < 0 || z >= this.depth) return false;
      if (y >= this.height) continue; // 천장 위는 일단 허용(스폰 직후의 일시 상태)
      if (this.isOccupied(x, y, z)) return false;
    }
    return true;
  }

  mergeBlock(absCells, colorIdx) {
    for (const [x, y, z] of absCells) {
      if (this.isInside(x, y, z)) this.set(x, y, z, colorIdx);
    }
  }

  // 가득 찬 Y 층을 모두 제거하고 위 칸을 한 칸씩 끌어내린다.
  // 제거된 Y 인덱스 배열을 반환 — 파티클 효과가 어느 층에서 발생할지 알 수 있도록.
  // collapse 후 같은 y 가 또 가득 차 있으면 두 번 push 될 수 있다 (중복 허용).
  clearFullLayers() {
    const clearedYs = [];
    let y = 0;
    while (y < this.height) {
      if (this.isLayerFull(y)) {
        clearedYs.push(y);
        this.collapseLayer(y);
      } else {
        y++;
      }
    }
    return clearedYs;
  }

  isLayerFull(y) {
    for (let z = 0; z < this.depth; z++) {
      for (let x = 0; x < this.width; x++) {
        if (!this.isOccupied(x, y, z)) return false;
      }
    }
    return true;
  }

  // y 층을 지우고, y+1 이상의 모든 층을 한 칸 아래로 끌어내림.
  collapseLayer(y) {
    for (let yy = y; yy < this.height - 1; yy++) {
      for (let z = 0; z < this.depth; z++) {
        for (let x = 0; x < this.width; x++) {
          this.cells[this.index(x, yy, z)] = this.cells[this.index(x, yy + 1, z)];
        }
      }
    }
    // 최상위 층은 비움.
    const top = this.height - 1;
    for (let z = 0; z < this.depth; z++) {
      for (let x = 0; x < this.width; x++) {
        this.cells[this.index(x, top, z)] = 0;
      }
    }
  }
}
