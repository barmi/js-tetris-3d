// pit 외곽선 + 4 측벽 격자 + 쌓인 셀 InstancedMesh + 떨어지는 블럭 그룹(와이어프레임 + 벽 그림자).

import * as THREE from 'three';
import { PALETTE, layerColorHex } from './blocksets.js';

const CELL = 1;
const WIRE_COLOR = 0xffffff;            // 떨어지는 블럭 와이어프레임은 흰색 통일.
const SHADOW_OPACITY = 0.45;            // 벽면 그림자 투명도.
const GAP_EPS = 0.002;                  // 격자가 박스와 z-fighting 안 나도록 안쪽으로 살짝.
const SHADOW_EPS = 0.012;               // 그림자가 격자보다 더 안쪽.

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

  // 바닥 + 4 측벽 격자.
  group.add(buildPitGrid(pit));

  return group;
}

// 바닥 / X=0 / X=w / Z=0 / Z=d 다섯 면에 셀 격자 라인을 그린다.
// 떨어지는 블럭의 위치를 측면에서도 직관적으로 파악할 수 있게 하기 위함.
function buildPitGrid(pit) {
  const w = pit.width, d = pit.depth, h = pit.height;
  const e = GAP_EPS;
  const v = [];

  // 바닥 (y = 0)
  for (let x = 0; x <= w; x++) v.push(x, e, 0,  x, e, d);
  for (let z = 0; z <= d; z++) v.push(0, e, z,  w, e, z);

  // X = 0 측벽
  for (let z = 0; z <= d; z++) v.push(e, 0, z,  e, h, z);
  for (let y = 0; y <= h; y++) v.push(e, y, 0,  e, y, d);

  // X = w 측벽
  for (let z = 0; z <= d; z++) v.push(w - e, 0, z,  w - e, h, z);
  for (let y = 0; y <= h; y++) v.push(w - e, y, 0,  w - e, y, d);

  // Z = 0 측벽
  for (let x = 0; x <= w; x++) v.push(x, 0, e,  x, h, e);
  for (let y = 0; y <= h; y++) v.push(0, y, e,  w, y, e);

  // Z = d 측벽
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

// 떨어지는 블럭 그룹: (1) 흰색 셀 와이어프레임, (2) X=0 / Z=0 두 벽면의 X-Z 단면 그림자.
// 셀 위치가 바뀔 때마다 자식들을 dispose 후 재구성한다.
export function createCurrentBlockGroup() {
  const group = new THREE.Group();
  group.name = 'current-block';
  return group;
}

// 한 번만 만들고 모든 그림자에서 공유. dispose 하지 않는다.
const SHADOW_PLANE_GEOM = new THREE.PlaneGeometry(0.92, 0.92);

export function updateCurrentBlockGroup(group, block) {
  // 기존 자식 정리. wire geometry 와 모든 material 은 매번 새로 만들었으므로 dispose 한다.
  // 공유 SHADOW_PLANE_GEOM 은 dispose 대상에서 제외.
  while (group.children.length > 0) {
    const c = group.children.pop();
    if (c.userData.disposeGeometry) c.geometry?.dispose?.();
    c.material?.dispose?.();
  }
  if (!block) return;

  const cells = block.absCells();
  const blockHex = PALETTE[block.colorIdx]?.hex ?? 0xffffff;

  // (1) 와이어프레임 — 모든 셀 외곽선.
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

  // (2) 벽면 그림자 — X=0 측면 (yz 평면) 과 Z=0 측면 (xy 평면).
  // 같은 (y,z) / (x,y) 쌍은 한 번만 그린다.
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
      m.rotation.y = Math.PI / 2;       // plane normal 을 +X 방향으로
      m.position.set(SHADOW_EPS, y + 0.5, z + 0.5);
      group.add(m);
    }
    const kx = `${x},${y}`;
    if (!zWallSeen.has(kx)) {
      zWallSeen.add(kx);
      const m = new THREE.Mesh(SHADOW_PLANE_GEOM, shadowMat);
      // 기본 plane 은 xy 평면(normal = +Z) — 회전 없이 그대로 사용
      m.position.set(x + 0.5, y + 0.5, SHADOW_EPS);
      group.add(m);
    }
  }
}

// 셀 (x,y,z) 의 12 edge 좌표를 verts 에 push. 인접 셀과의 z-fighting 회피용으로 살짝 안쪽 inset.
function pushCubeEdges(out, x, y, z) {
  const a = 0.04, b = 0.96;
  const X = [x + a, x + b], Y = [y + a, y + b], Z = [z + a, z + b];
  // X 방향 edges (각 yz 코너에서 X[0]→X[1])
  for (let yi = 0; yi < 2; yi++) for (let zi = 0; zi < 2; zi++) {
    out.push(X[0], Y[yi], Z[zi], X[1], Y[yi], Z[zi]);
  }
  // Y 방향 edges
  for (let xi = 0; xi < 2; xi++) for (let zi = 0; zi < 2; zi++) {
    out.push(X[xi], Y[0], Z[zi], X[xi], Y[1], Z[zi]);
  }
  // Z 방향 edges
  for (let xi = 0; xi < 2; xi++) for (let yi = 0; yi < 2; yi++) {
    out.push(X[xi], Y[yi], Z[0], X[xi], Y[yi], Z[1]);
  }
}
