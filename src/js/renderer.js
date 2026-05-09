// pit 와이어프레임 / 격자, 점유 셀 + 현재 블록을 위한 InstancedMesh 와 갱신 함수.

import * as THREE from 'three';
import { PALETTE } from './blocksets.js';

const CELL = 1;

export function createPitMesh(pit) {
  const group = new THREE.Group();
  group.name = 'pit';

  const w = pit.width * CELL;
  const d = pit.depth * CELL;
  const h = pit.height * CELL;

  const boxGeo = new THREE.BoxGeometry(w, h, d);
  const edges = new THREE.EdgesGeometry(boxGeo);
  const lines = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0x66aaff, transparent: true, opacity: 0.7 }),
  );
  lines.position.set(w / 2, h / 2, d / 2);
  group.add(lines);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshStandardMaterial({ color: 0x0e1420, roughness: 0.95, metalness: 0 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(w / 2, 0, d / 2);
  group.add(floor);

  const verts = [];
  for (let i = 0; i <= pit.width; i++) verts.push(i * CELL, 0.001, 0, i * CELL, 0.001, d);
  for (let i = 0; i <= pit.depth; i++) verts.push(0, 0.001, i * CELL, w, 0.001, i * CELL);
  const grid = new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)),
    new THREE.LineBasicMaterial({ color: 0x223044, transparent: true, opacity: 0.85 }),
  );
  group.add(grid);

  return group;
}

// 점유 셀 + 현재 블록을 단일 InstancedMesh 로 그린다. capacity 는 pit 부피 + 여유분.
export function createCellsMesh(pit, blockReserve = 16) {
  const geom = new THREE.BoxGeometry(CELL * 0.95, CELL * 0.95, CELL * 0.95);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.05 });
  const max = pit.width * pit.depth * pit.height + blockReserve;
  const mesh = new THREE.InstancedMesh(geom, mat, max);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
  mesh.count = 0;
  return mesh;
}

const _m = new THREE.Matrix4();
const _c = new THREE.Color();

export function updateCellsMesh(mesh, pit, currentBlock) {
  const capacity = mesh.instanceMatrix.count;
  let i = 0;

  for (let y = 0; y < pit.height; y++) {
    for (let z = 0; z < pit.depth; z++) {
      for (let x = 0; x < pit.width; x++) {
        const v = pit.get(x, y, z);
        if (!v || i >= capacity) continue;
        _m.makeTranslation(x + 0.5, y + 0.5, z + 0.5);
        mesh.setMatrixAt(i, _m);
        _c.setHex(PALETTE[v]?.hex ?? 0xffffff);
        mesh.setColorAt(i, _c);
        i++;
      }
    }
  }

  if (currentBlock) {
    const colorHex = PALETTE[currentBlock.colorIdx]?.hex ?? 0xffffff;
    for (const [x, y, z] of currentBlock.absCells()) {
      // 천장 위 부분은 그리지 않는다(스폰 시 일시적으로 발생할 수 있음).
      if (y >= pit.height || y < 0 || i >= capacity) continue;
      _m.makeTranslation(x + 0.5, y + 0.5, z + 0.5);
      mesh.setMatrixAt(i, _m);
      _c.setHex(colorHex);
      mesh.setColorAt(i, _c);
      i++;
    }
  }

  mesh.count = i;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}
