// 색 팔레트 + FLAT / BASIC / EXTENDED 블록 세트 정의.
// 정확한 레퍼런스 블록 목록은 doc/PLAN.md "미해결 / 확인 필요" 항목 참고.

import { Block } from './block.js';

// 색 인덱스 → 색. 0 은 비어있음.
export const PALETTE = [
  null,
  { hex: 0xe74c3c }, // 1: red
  { hex: 0xf1c40f }, // 2: yellow
  { hex: 0x9b59b6 }, // 3: purple
  { hex: 0xe67e22 }, // 4: orange
  { hex: 0x3498db }, // 5: blue
  { hex: 0x2ecc71 }, // 6: green
  { hex: 0x1abc9c }, // 7: teal
  { hex: 0xff5d8f }, // 8: pink
];

// FLAT: 평면 폴리오미노. 모든 셀의 y=0. 클래식 테트리스 7종.
const FLAT_DEFS = [
  { id: 'I', color: 1, cells: [[0,0,0],[1,0,0],[2,0,0],[3,0,0]] },
  { id: 'O', color: 2, cells: [[0,0,0],[1,0,0],[0,0,1],[1,0,1]] },
  { id: 'T', color: 3, cells: [[0,0,0],[1,0,0],[2,0,0],[1,0,1]] },
  { id: 'L', color: 4, cells: [[0,0,0],[0,0,1],[0,0,2],[1,0,2]] },
  { id: 'J', color: 5, cells: [[1,0,0],[1,0,1],[1,0,2],[0,0,2]] },
  { id: 'S', color: 6, cells: [[1,0,0],[2,0,0],[0,0,1],[1,0,1]] },
  { id: 'Z', color: 7, cells: [[0,0,0],[1,0,0],[1,0,1],[2,0,1]] },
];

// BASIC: FLAT + 작은 3D polycube.
const BASIC_DEFS = [
  ...FLAT_DEFS,
  { id: 'TRIPOD', color: 8, cells: [[0,0,0],[1,0,0],[0,0,1],[0,1,0]] },
  { id: 'L3D',    color: 1, cells: [[0,0,0],[1,0,0],[1,0,1],[1,1,1]] },
  { id: 'SKEW',   color: 6, cells: [[0,0,0],[1,0,0],[1,1,0],[1,1,1]] },
];

// EXTENDED: BASIC + 더 큰 / 다양한 polycube.
const EXTENDED_DEFS = [
  ...BASIC_DEFS,
  { id: 'CUBE2', color: 2, cells: [
    [0,0,0],[1,0,0],[0,0,1],[1,0,1],
    [0,1,0],[1,1,0],[0,1,1],[1,1,1],
  ] },
  { id: 'PLUS3D', color: 3, cells: [[1,0,0],[0,0,1],[1,0,1],[2,0,1],[1,0,2],[1,1,1]] },
  { id: 'STAIR',  color: 4, cells: [[0,0,0],[1,0,0],[1,1,0],[1,1,1],[2,1,1]] },
];

export const BLOCKSETS = {
  flat: FLAT_DEFS,
  basic: BASIC_DEFS,
  extended: EXTENDED_DEFS,
};

// 블록의 정규화 후 크기를 계산.
function defExtents(cells) {
  let mx = 0, my = 0, mz = 0;
  for (const [x, y, z] of cells) {
    if (x > mx) mx = x;
    if (y > my) my = y;
    if (z > mz) mz = z;
  }
  return [mx + 1, my + 1, mz + 1];
}

function fitsInPit(cells, pit) {
  const [sx, sy, sz] = defExtents(cells);
  return sx <= pit.width && sy <= pit.height && sz <= pit.depth;
}

// pit 이 주어지면 그 pit 에 들어갈 수 있는 블록만 후보로 한다.
// 들어가는 블록이 하나도 없으면(이론상 없는 상황) 원본 목록에서 그대로 뽑는다.
export function pickRandomBlock(setId, pit) {
  let defs = BLOCKSETS[setId] ?? BLOCKSETS.basic;
  if (pit) {
    const filtered = defs.filter((d) => fitsInPit(d.cells, pit));
    if (filtered.length > 0) defs = filtered;
  }
  const def = defs[Math.floor(Math.random() * defs.length)];
  return new Block(def.cells, def.color, def.id);
}
