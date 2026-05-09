// pit 와이어프레임 / 큐브 인스턴스 메쉬를 만드는 헬퍼.
// 게임 상태(점유 그리드, 현재 블록)를 받아 three.js 메쉬를 갱신한다.

import * as THREE from 'three';

const CELL = 1; // 한 셀의 월드 단위 크기.

export function createPitMesh(pit) {
  const group = new THREE.Group();
  group.name = 'pit';

  const w = pit.width * CELL;
  const d = pit.depth * CELL;
  const h = pit.height * CELL;

  // 와이어프레임 박스(천장은 열린 느낌을 위해 위쪽 모서리만 흐리게).
  const boxGeo = new THREE.BoxGeometry(w, h, d);
  const edges = new THREE.EdgesGeometry(boxGeo);
  const lines = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0x66aaff, transparent: true, opacity: 0.7 }),
  );
  lines.position.set(w / 2, h / 2, d / 2);
  group.add(lines);

  // 바닥 면.
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshStandardMaterial({ color: 0x111722, roughness: 0.95, metalness: 0.0 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(w / 2, 0, d / 2);
  group.add(floor);

  // 바닥 격자 (셀 단위).
  const gridGeo = new THREE.BufferGeometry();
  const verts = [];
  for (let i = 0; i <= pit.width; i++) {
    verts.push(i * CELL, 0.001, 0, i * CELL, 0.001, d);
  }
  for (let i = 0; i <= pit.depth; i++) {
    verts.push(0, 0.001, i * CELL, w, 0.001, i * CELL);
  }
  gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  const grid = new THREE.LineSegments(
    gridGeo,
    new THREE.LineBasicMaterial({ color: 0x223044, transparent: true, opacity: 0.8 }),
  );
  group.add(grid);

  return group;
}

// Phase 1 에서 점유 그리드를 따라 큐브를 그릴 인스턴스 메쉬 생성기.
// 지금은 stub. 호출 시 빈 메쉬를 돌려준다.
export function createCellsMesh(pit) {
  const geom = new THREE.BoxGeometry(CELL * 0.96, CELL * 0.96, CELL * 0.96);
  const mat = new THREE.MeshStandardMaterial({ color: 0x4488ff, roughness: 0.5 });
  const max = pit.width * pit.depth * pit.height;
  const mesh = new THREE.InstancedMesh(geom, mat, max);
  mesh.count = 0;
  return mesh;
}
