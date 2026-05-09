// pit 외곽선 + 4 측벽 격자 + 쌓인 셀 InstancedMesh + 떨어지는 블럭 그룹(와이어프레임 + 벽 그림자) + ghost block.

import * as THREE from 'three';
import { PALETTE, layerColorHex } from './blocksets.js';

const CELL = 1;
const WIRE_COLOR = 0xffffff;            // 떨어지는 블럭 와이어프레임은 흰색 통일.
const SHADOW_OPACITY = 0.45;
const GAP_EPS = 0.002;
const SHADOW_EPS = 0.012;
const GHOST_COLOR = 0xfff366;           // hard-drop 위치를 표시하는 ghost 색.
const GHOST_OPACITY = 0.55;

export function createPitMesh(pit) {
  const group = new THREE.Group();
  group.name = 'pit';

  const w = pit.width * CELL;
  const d = pit.depth * CELL;
  const h = pit.height * CELL;

  // 외곽 와이어프레임.
  const boxGeo = new THREE.BoxGeometry(w, h, d);
  const edges = new THREE.EdgesGeometry(boxGeo);
  const lines = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0x66aaff, transparent: true, opacity: 0.95 }),
  );
  lines.position.set(w / 2, h / 2, d / 2);
  group.add(lines);

  // 바닥 면.
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshStandardMaterial({ color: 0x0c1220, roughness: 0.95, metalness: 0 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(w / 2, 0, d / 2);
  group.add(floor);

  group.add(buildPitGrid(pit));
  return group;
}

function buildPitGrid(pit) {
  const w = pit.width, d = pit.depth, h = pit.height;
  const e = GAP_EPS;
  const v = [];

  // 바닥
  for (let x = 0; x <= w; x++) v.push(x, e, 0,  x, e, d);
  for (let z = 0; z <= d; z++) v.push(0, e, z,  w, e, z);

  // 4 측벽
  for (let z = 0; z <= d; z++) v.push(e, 0, z,  e, h, z);
  for (let y = 0; y <= h; y++) v.push(e, y, 0,  e, y, d);
  for (let z = 0; z <= d; z++) v.push(w - e, 0, z,  w - e, h, z);
  for (let y = 0; y <= h; y++) v.push(w - e, y, 0,  w - e, y, d);
  for (let x = 0; x <= w; x++) v.push(x, 0, e,  x, h, e);
  for (let y = 0; y <= h; y++) v.push(0, y, e,  w, y, e);
  for (let x = 0; x <= w; x++) v.push(x, 0, d - e,  x, h, d - e);
  for (let y = 0; y <= h; y++) v.push(0, y, d - e,  w, y, d - e);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  return new THREE.LineSegments(
    geo,
    new THREE.LineBasicMaterial({ color: 0x2a3a55, transparent: true, opacity: 0.85 }),
  );
}

// 쌓인 셀만 그리는 InstancedMesh. 색은 Y(높이) 기반.
export function createCellsMesh(pit) {
  const geom = new THREE.BoxGeometry(0.92, 0.92, 0.92);
  const mat = new THREE.MeshStandardMaterial({
    roughness: 0.55,
    metalness: 0.05,
    flatShading: true,
  });
  const max = Math.max(1, pit.width * pit.depth * pit.height);
  const mesh = new THREE.InstancedMesh(geom, mat, max);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
  mesh.count = 0;
  return mesh;
}

const _m = new THREE.Matrix4();
const _c = new THREE.Color();

export function updateCellsMesh(mesh, pit) {
  const cap = mesh.instanceMatrix.count;
  let i = 0;
  for (let y = 0; y < pit.height; y++) {
    const hex = layerColorHex(y);
    for (let z = 0; z < pit.depth; z++) {
      for (let x = 0; x < pit.width; x++) {
        if (!pit.isOccupied(x, y, z) || i >= cap) continue;
        _m.makeTranslation(x + 0.5, y + 0.5, z + 0.5);
        mesh.setMatrixAt(i, _m);
        _c.setHex(hex);
        mesh.setColorAt(i, _c);
        i++;
      }
    }
  }
  mesh.count = i;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

// 떨어지는 블럭 그룹: (1) 흰 셀 와이어프레임, (2) X=0 / Z=0 두 벽면의 X-Z 단면 그림자.
export function createCurrentBlockGroup() {
  const group = new THREE.Group();
  group.name = 'current-block';
  return group;
}

const SHADOW_PLANE_GEOM = new THREE.PlaneGeometry(0.92, 0.92);

export function updateCurrentBlockGroup(group, block) {
  while (group.children.length > 0) {
    const c = group.children.pop();
    if (c.userData.disposeGeometry) c.geometry?.dispose?.();
    c.material?.dispose?.();
  }
  if (!block) return;

  const cells = block.absCells();
  const blockHex = PALETTE[block.colorIdx]?.hex ?? 0xffffff;

  // (1) 와이어프레임
  const verts = [];
  for (const [x, y, z] of cells) pushCubeEdges(verts, x, y, z);
  if (verts.length > 0) {
    const wireGeo = new THREE.BufferGeometry();
    wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    const wireMat = new THREE.LineBasicMaterial({ color: WIRE_COLOR });
    const wires = new THREE.LineSegments(wireGeo, wireMat);
    wires.userData.disposeGeometry = true;
    group.add(wires);
  }

  // (2) 두 벽면 그림자
  const xWallSeen = new Set();
  const zWallSeen = new Set();
  const shadowMat = new THREE.MeshBasicMaterial({
    color: blockHex,
    transparent: true,
    opacity: SHADOW_OPACITY,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  for (const [x, y, z] of cells) {
    const ky = `${y},${z}`;
    if (!xWallSeen.has(ky)) {
      xWallSeen.add(ky);
      const m = new THREE.Mesh(SHADOW_PLANE_GEOM, shadowMat);
      m.rotation.y = Math.PI / 2;
      m.position.set(SHADOW_EPS, y + 0.5, z + 0.5);
      group.add(m);
    }
    const kx = `${x},${y}`;
    if (!zWallSeen.has(kx)) {
      zWallSeen.add(kx);
      const m = new THREE.Mesh(SHADOW_PLANE_GEOM, shadowMat);
      m.position.set(x + 0.5, y + 0.5, SHADOW_EPS);
      group.add(m);
    }
  }
}

// ghost group: 현재 블럭이 hard-drop 시 멈출 위치를 노란 wireframe 으로 표시.
export function createGhostGroup() {
  const g = new THREE.Group();
  g.name = 'ghost';
  return g;
}

export function updateGhostGroup(group, block, pit) {
  while (group.children.length > 0) {
    const c = group.children.pop();
    c.geometry?.dispose?.();
    c.material?.dispose?.();
  }
  if (!block || !pit) return;

  // hard-drop 위치 시뮬레이션.
  const ghost = block.clone();
  while (true) {
    ghost.translate(0, -1, 0);
    if (!pit.canPlace(ghost.absCells())) {
      ghost.translate(0, 1, 0);
      break;
    }
  }
  // 이미 바닥 직전(현재 위치와 동일)이면 ghost 미표시.
  if (ghost.position[1] === block.position[1]) return;

  const verts = [];
  for (const [x, y, z] of ghost.absCells()) pushCubeEdges(verts, x, y, z);
  if (verts.length === 0) return;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  const mat = new THREE.LineBasicMaterial({
    color: GHOST_COLOR,
    transparent: true,
    opacity: GHOST_OPACITY,
    depthWrite: false,
  });
  group.add(new THREE.LineSegments(geo, mat));
}

// 셀 (x,y,z) 의 12 edge 좌표를 verts 에 push. 인접 셀과 z-fighting 회피용으로 살짝 안쪽 inset.
function pushCubeEdges(out, x, y, z) {
  const a = 0.04, b = 0.96;
  const X = [x + a, x + b], Y = [y + a, y + b], Z = [z + a, z + b];
  for (let yi = 0; yi < 2; yi++) for (let zi = 0; zi < 2; zi++) {
    out.push(X[0], Y[yi], Z[zi], X[1], Y[yi], Z[zi]);
  }
  for (let xi = 0; xi < 2; xi++) for (let zi = 0; zi < 2; zi++) {
    out.push(X[xi], Y[0], Z[zi], X[xi], Y[1], Z[zi]);
  }
  for (let xi = 0; xi < 2; xi++) for (let yi = 0; yi < 2; yi++) {
    out.push(X[xi], Y[yi], Z[0], X[xi], Y[yi], Z[1]);
  }
}
