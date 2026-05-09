// 색 팔레트(표준 / 색맹 친화) + FLAT / BASIC / EXTENDED 블록 세트 정의.

import { Block } from './block.js';

// 기본 (다채로운).
const PALETTE_STD = [
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
const LAYER_COLORS_STD = [
  0xe74c3c, 0xe67e22, 0xf1c40f, 0x2ecc71,
  0x1abc9c, 0x3498db, 0x9b59b6, 0xff5d8f,
];

// 색맹 친화 — Okabe-Ito 8색 (https://jfly.uni-koeln.de/color/).
const PALETTE_CB = [
  null,
  { hex: 0xe69f00 }, // 1: orange
  { hex: 0x56b4e9 }, // 2: sky blue
  { hex: 0x009e73 }, // 3: bluish green
  { hex: 0xf0e442 }, // 4: yellow
  { hex: 0x0072b2 }, // 5: blue
  { hex: 0xd55e00 }, // 6: vermillion
  { hex: 0xcc79a7 }, // 7: reddish purple
  { hex: 0x999999 }, // 8: gray
];
const LAYER_COLORS_CB = [
  0xe69f00, 0x56b4e9, 0x009e73, 0xf0e442,
  0x0072b2, 0xd55e00, 0xcc79a7, 0x999999,
];

let activePalette = 'standard';

export function setColorPalette(name) {
  activePalette = (name === 'colorblind') ? 'colorblind' : 'standard';
}
export function getColorPalette() {
  return activePalette;
}

export function paletteColor(idx) {
  const p = activePalette === 'colorblind' ? PALETTE_CB : PALETTE_STD;
  return p[idx];
}

export function layerColorHex(y) {
  const arr = activePalette === 'colorblind' ? LAYER_COLORS_CB : LAYER_COLORS_STD;
  const n = arr.length;
  return arr[((y % n) + n) % n];
}

// FLAT: 평면 폴리오미노 — 클래식 7종.
const FLAT_DEFS = [
  { id: 'I', color: 1, cells: [[0,0,0],[1,0,0],[2,0,0],[3,0,0]] },
  { id: 'O', color: 2, cells: [[0,0,0],[1,0,0],[0,0,1],[1,0,1]] },
  { id: 'T', color: 3, cells: [[0,0,0],[1,0,0],[2,0,0],[1,0,1]] },
  { id: 'L', color: 4, cells: [[0,0,0],[0,0,1],[0,0,2],[1,0,2]] },
  { id: 'J', color: 5, cells: [[1,0,0],[1,0,1],[1,0,2],[0,0,2]] },
  { id: 'S', color: 6, cells: [[1,0,0],[2,0,0],[0,0,1],[1,0,1]] },
  { id: 'Z', color: 7, cells: [[0,0,0],[1,0,0],[1,0,1],[2,0,1]] },
];

// BASIC: FLAT + 직관적인 단순 3D 블럭 3 종.
const BASIC_DEFS = [
  ...FLAT_DEFS,
  { id: 'TRIPOD', color: 8, cells: [[0,0,0],[1,0,0],[0,0,1],[0,1,0]] },
  { id: 'L3D',    color: 1, cells: [[0,0,0],[1,0,0],[2,0,0],[2,1,0]] },
  { id: 'T3D',    color: 6, cells: [[0,0,0],[1,0,0],[2,0,0],[1,1,0]] },
];

// EXTENDED: BASIC + 큰 polycube.
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

export function pickRandomBlock(setId, pit) {
  let defs = BLOCKSETS[setId] ?? BLOCKSETS.basic;
  if (pit) {
    const filtered = defs.filter((d) => fitsInPit(d.cells, pit));
    if (filtered.length > 0) defs = filtered;
  }
  const def = defs[Math.floor(Math.random() * defs.length)];
  return new Block(def.cells, def.color, def.id);
}
