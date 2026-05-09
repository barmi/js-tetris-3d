// 블록 모델. 정수 좌표 셀 + 정수 회전 행렬.
// 회전은 무게중심(centroid) 기준이지만, 짝수 폭 블럭은 90° 회전 후 centroid 가 0.5 단위로 어긋나
// `Math.round(0.5 → 1, -0.5 → 0)` 의 비대칭이 누적되면 z 축 연속 회전 시 블럭이 한쪽으로 떠오른다.
// 이를 막기 위해 생성 시점의 절대 무게중심을 floating-point 로 보존(`idealCentroid`)하고,
// 매 회전이 이 ideal 기준의 차이를 round 한다 — 회전 4번 후 원래 cells/position 으로 복귀.
// `translate` / `setPosition` 만 idealCentroid 를 함께 이동.

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
    this.idealCentroid = this.absCentroid();
  }

  clone() {
    const b = Object.create(Block.prototype);
    b.cells = this.cells.map(([x, y, z]) => [x, y, z]);
    b.colorIdx = this.colorIdx;
    b.id = this.id;
    b.position = [...this.position];
    b.idealCentroid = [...this.idealCentroid];
    return b;
  }

  // position 직접 설정 (예: spawn). idealCentroid 도 새 위치 기준으로 재계산.
  setPosition(x, y, z) {
    this.position[0] = x;
    this.position[1] = y;
    this.position[2] = z;
    this.idealCentroid = this.absCentroid();
  }

  translate(dx, dy, dz) {
    this.position[0] += dx;
    this.position[1] += dy;
    this.position[2] += dz;
    this.idealCentroid[0] += dx;
    this.idealCentroid[1] += dy;
    this.idealCentroid[2] += dz;
  }

  // 무게중심 회전 — idealCentroid 와 회전 후 absCentroid 의 차이 만큼 position 보정.
  // idealCentroid 자체는 회전에서 변하지 않으므로 round 오차가 누적되지 않는다.
  rotate(axis, dir = 1) {
    const r = ROT[axis][dir > 0 ? 'cw' : 'ccw'];
    this.cells = this.cells.map(([x, y, z]) => r(x, y, z));
    this.normalize();
    const after = this.absCentroid();
    this.position[0] += Math.round(this.idealCentroid[0] - after[0]);
    this.position[1] += Math.round(this.idealCentroid[1] - after[1]);
    this.position[2] += Math.round(this.idealCentroid[2] - after[2]);
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
