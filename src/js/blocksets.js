// FLAT / BASIC / EXTENDED 블록 세트 정의.
//
// 현재는 골격만 두고, 정확한 블록 목록은 PLAN.md 의 "미해결 / 확인 필요" 항목으로 남겨
// Phase 1.2 에서 레퍼런스 사이트와 대조하며 채운다.
//
// 데이터 형식:
//   { id, color, cells: [[x, y, z], ...] }
// 모든 좌표는 0 이상의 정수, 원점은 (0,0,0).

import { Block } from './block.js';

// FLAT: 깊이가 1 인 폴리오미노. 클래식 2D 테트리스의 7종을 3D 좌표로 lift 한 형태.
const FLAT_DEFS = [
  { id: 'I', color: 1, cells: [[0,0,0],[1,0,0],[2,0,0],[3,0,0]] },
  { id: 'O', color: 2, cells: [[0,0,0],[1,0,0],[0,0,1],[1,0,1]] },
  { id: 'T', color: 3, cells: [[0,0,0],[1,0,0],[2,0,0],[1,0,1]] },
  { id: 'L', color: 4, cells: [[0,0,0],[0,0,1],[0,0,2],[1,0,0]] },
  { id: 'J', color: 5, cells: [[0,0,0],[0,0,1],[0,0,2],[1,0,2]] },
  { id: 'S', color: 6, cells: [[1,0,0],[2,0,0],[0,0,1],[1,0,1]] },
  { id: 'Z', color: 7, cells: [[0,0,0],[1,0,0],[1,0,1],[2,0,1]] },
];

// BASIC: 3D 결합. 직선/꺾임/모서리 조합.
const BASIC_DEFS = [
  { id: 'I3', color: 1, cells: [[0,0,0],[1,0,0],[2,0,0]] },
  { id: 'L3', color: 2, cells: [[0,0,0],[1,0,0],[0,1,0]] },
  { id: 'CORNER', color: 3, cells: [[0,0,0],[1,0,0],[0,0,1],[0,1,0]] }, // 직각 3축
  { id: 'BOX', color: 4, cells: [[0,0,0],[1,0,0],[0,0,1],[1,0,1],[0,1,0]] },
  { id: 'T3D', color: 5, cells: [[0,0,0],[1,0,0],[2,0,0],[1,1,0]] },
];

// EXTENDED: 5-cube 이상의 polycube.
const EXTENDED_DEFS = [
  ...BASIC_DEFS,
  { id: 'PLUS', color: 6, cells: [[1,0,0],[0,0,1],[1,0,1],[2,0,1],[1,0,2],[1,1,1]] },
  { id: 'CUBE2', color: 7, cells: [
    [0,0,0],[1,0,0],[0,0,1],[1,0,1],
    [0,1,0],[1,1,0],[0,1,1],[1,1,1],
  ] },
];

export const BLOCKSETS = {
  flat: FLAT_DEFS,
  basic: BASIC_DEFS,
  extended: EXTENDED_DEFS,
};

export function pickRandomBlock(setId) {
  const defs = BLOCKSETS[setId] ?? BLOCKSETS.basic;
  const def = defs[Math.floor(Math.random() * defs.length)];
  return new Block(def.cells, def.color, def.id);
}
