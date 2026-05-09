// 블록 모델. 정수 좌표로 셀을 보관하고, 회전은 정수 회전 행렬로 처리한다.
// 회전은 블럭의 무게중심(centroid) 을 기준으로 — 회전 후 absCentroid 가 같은 곳에 있도록 position 을 조정.
// 정수 grid 위에서 짝수 폭 블럭은 round 차이 ≤ 0.5 만큼 어긋날 수 있다.

export class Block {
  /**
   * @param {Array<[number, number, number]>} cells 로컬 좌표 셀(정수).
   * @param {number} colorIdx 1.. (0 은 빈칸 의미)
   * @param {string} [id] 블록 식별자(블록셋의 키).
   */
  constructor(cells, colorIdx, id = '') {
    this.cells = cells.map(([x, y, z]) => [x, y, z]);
    this.colorIdx = colorIdx;
    this.id = id;
    this.position = [0, 0, 0];
    this.normalize();
  }

  clone() {
    const b = Object.create(Block.prototype);
    b.cells = this.cells.map(([x, y, z]) => [x, y, z]);
    b.colorIdx = this.colorIdx;
    b.id = this.id;
    b.position = [...this.position];
    return b;
  }

  translate(dx, dy, dz) {
    this.position[0] += dx;
    this.position[1] += dy;
    this.position[2] += dz;
  }

  // 무게중심 회전 — 회전 전후의 absCentroid 를 일치시키는 방향으로 position 을 조정.
  rotate(axis, dir = 1) {
    const r = ROT[axis][dir > 0 ? 'cw' : 'ccw'];

    const before = this.absCentroid();

    this.cells = this.cells.map(([x, y, z]) => r(x, y, z));
    this.normalize();

    const after = this.absCentroid();

    // 정수 grid 유지를 위해 round. 짝수 길이 블럭은 round 차이 ≤ 0.5.
    this.position[0] += Math.round(before[0] - after[0]);
    this.position[1] += Math.round(before[1] - after[1]);
    this.position[2] += Math.round(before[2] - after[2]);
  }

  // 셀 좌표를 0 이상으로 평행이동.
  normalize() {
    let mx = 0, my = 0, mz = 0;
    for (const [x, y, z] of this.cells) {
      if (x < mx) mx = x;
      if (y < my) my = y;
      if (z < mz) mz = z;
    }
    if (mx || my || mz) {
      this.cells = this.cells.map(([x, y, z]) => [x - mx, y - my, z - mz]);
    }
  }

  // 정규화 후 [sizeX, sizeY, sizeZ].
  size() {
    let mx = 0, my = 0, mz = 0;
    for (const [x, y, z] of this.cells) {
      if (x > mx) mx = x;
      if (y > my) my = y;
      if (z > mz) mz = z;
    }
    return [mx + 1, my + 1, mz + 1];
  }

  absCells() {
    const [px, py, pz] = this.position;
    return this.cells.map(([x, y, z]) => [x + px, y + py, z + pz]);
  }

  // 절대 좌표의 무게중심 (셀 중심 기준).
  absCentroid() {
    const n = this.cells.length;
    let cx = 0, cy = 0, cz = 0;
    for (const [x, y, z] of this.cells) {
      cx += x + 0.5;
      cy += y + 0.5;
      cz += z + 0.5;
    }
    return [
      cx / n + this.position[0],
      cy / n + this.position[1],
      cz / n + this.position[2],
    ];
  }
}

const ROT = {
  x: { cw: (x, y, z) => [x, -z, y], ccw: (x, y, z) => [x, z, -y] },
  y: { cw: (x, y, z) => [z, y, -x], ccw: (x, y, z) => [-z, y, x] },
  z: { cw: (x, y, z) => [-y, x, z], ccw: (x, y, z) => [y, -x, z] },
};
