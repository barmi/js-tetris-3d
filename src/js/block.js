// 블록 모델. 정수 좌표로 셀을 보관하고, 회전은 정수 회전 행렬로 처리한다.
// Phase 1.1 에서 본격 구현. 현재는 데이터 구조와 인터페이스만 잡는다.

export class Block {
  /**
   * @param {Array<[number, number, number]>} cells 로컬 좌표 셀(정수). 원점 0,0,0 기준.
   * @param {number} colorIdx 1.. (0 은 빈칸 의미)
   * @param {string} [id] 블록 식별자(블록셋의 키).
   */
  constructor(cells, colorIdx, id = '') {
    this.cells = cells.map(([x, y, z]) => [x, y, z]);
    this.colorIdx = colorIdx;
    this.id = id;
    this.position = [0, 0, 0]; // pit 좌표계의 평행이동.
  }

  clone() {
    const b = new Block(this.cells, this.colorIdx, this.id);
    b.position = [...this.position];
    return b;
  }

  translate(dx, dy, dz) {
    this.position[0] += dx;
    this.position[1] += dy;
    this.position[2] += dz;
  }

  // 'x' | 'y' | 'z' 축 기준 dir(±1) 회전 후, 모든 좌표가 0 이상이 되도록 정규화한다.
  rotate(axis, dir = 1) {
    const r = ROT[axis][dir > 0 ? 'cw' : 'ccw'];
    this.cells = this.cells.map(([x, y, z]) => r(x, y, z));
    this.normalize();
  }

  // 셀 좌표를 0 이상으로 평행이동. 회전 후 음수 셀이 생길 때 호출.
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

  // pit 좌표계의 절대 셀 좌표.
  absCells() {
    const [px, py, pz] = this.position;
    return this.cells.map(([x, y, z]) => [x + px, y + py, z + pz]);
  }
}

// 90도 회전 행렬을 함수로 표현 (정수만 다룸).
const ROT = {
  x: {
    cw:  (x, y, z) => [x, -z, y],
    ccw: (x, y, z) => [x, z, -y],
  },
  y: {
    cw:  (x, y, z) => [z, y, -x],
    ccw: (x, y, z) => [-z, y, x],
  },
  z: {
    cw:  (x, y, z) => [-y, x, z],
    ccw: (x, y, z) => [y, -x, z],
  },
};
