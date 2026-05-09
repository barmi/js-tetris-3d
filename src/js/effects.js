// 라인 클리어 시 파티클 폭발. 작은 큐브 인스턴스로 사방으로 흩어지며 사라진다.

import * as THREE from 'three';
import { layerColorHex } from './blocksets.js';

const PARTICLE_CAPACITY = 400;
const PARTICLE_LIFE_MS = 700;
const GRAVITY = 8.0;        // 단위/s² (월드 단위 = pit 셀)
const PARTICLES_PER_CELL = 4;

export function createEffects() {
  const geom = new THREE.BoxGeometry(0.18, 0.18, 0.18);
  const mat = new THREE.MeshStandardMaterial({
    roughness: 0.5, metalness: 0,
  });
  const mesh = new THREE.InstancedMesh(geom, mat, PARTICLE_CAPACITY);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(PARTICLE_CAPACITY * 3), 3);
  mesh.count = 0;
  return { mesh, particles: [] };
}

export function spawnLayerParticles(state, pit, clearedYs) {
  if (!clearedYs?.length) return;
  const now = performance.now();
  for (const y of clearedYs) {
    const colorHex = layerColorHex(y);
    for (let z = 0; z < pit.depth; z++) {
      for (let x = 0; x < pit.width; x++) {
        for (let k = 0; k < PARTICLES_PER_CELL; k++) {
          state.particles.push({
            x: x + 0.5,
            y: y + 0.5,
            z: z + 0.5,
            vx: (Math.random() - 0.5) * 5,
            vy: 1.5 + Math.random() * 3,
            vz: (Math.random() - 0.5) * 5,
            colorHex,
            born: now,
          });
        }
      }
    }
  }
  // capacity 캡 — 가장 오래된 것을 잘라낸다.
  if (state.particles.length > PARTICLE_CAPACITY) {
    state.particles.splice(0, state.particles.length - PARTICLE_CAPACITY);
  }
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

export function updateEffects(state, now) {
  const { mesh, particles } = state;
  const cap = mesh.instanceMatrix.count;
  let alive = 0;
  let drawn = 0;
  for (const p of particles) {
    const ageMs = now - p.born;
    if (ageMs > PARTICLE_LIFE_MS) continue;
    const t = ageMs / 1000;
    const x = p.x + p.vx * t;
    const y = p.y + p.vy * t - 0.5 * GRAVITY * t * t;
    const z = p.z + p.vz * t;
    if (drawn < cap) {
      const lifeT = ageMs / PARTICLE_LIFE_MS;
      const scale = Math.max(0.02, 1 - lifeT);
      _v.set(x, y, z);
      _q.identity();
      _s.set(scale, scale, scale);
      _m.compose(_v, _q, _s);
      mesh.setMatrixAt(drawn, _m);
      _c.setHex(p.colorHex);
      mesh.setColorAt(drawn, _c);
      drawn++;
    }
    particles[alive++] = p;
  }
  particles.length = alive;
  mesh.count = drawn;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}
