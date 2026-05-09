// OrbitControls 기반의 카메라 컨트롤. 뷰 프리셋 / 부드러운 보간 / 카메라 yaw 기준 이동 변환 / 카메라 흔들림.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const TWEEN_MS = 600;

// (azimuth, polar) — three.js Spherical 규약: polar 는 +Y 축에서 잰 각, azimuth 는 +Z 축에서 +X 쪽으로.
// distMul 은 모두 1.4 ~ 1.6 — 화면이 거의 꽉 차도록.
const PRESETS = {
  iso:   { az: Math.PI / 6,    polar: Math.PI * 0.30, distMul: 1.55 },
  top:   { az: Math.PI / 6,    polar: Math.PI * 0.20, distMul: 1.40 },
  front: { az: 0,              polar: Math.PI * 0.45, distMul: 1.60 },
  side:  { az: Math.PI / 2,    polar: Math.PI * 0.45, distMul: 1.60 },
};

export function createCameraControls(camera, dom, pit) {
  const controls = new OrbitControls(camera, dom);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.zoomSpeed = 0.7;
  controls.panSpeed = 0.7;
  controls.rotateSpeed = 0.85;
  controls.screenSpacePanning = false;
  controls.minPolarAngle = 0.05;
  controls.maxPolarAngle = Math.PI * 0.49;

  const state = {
    camera, controls,
    tween: null,
    shake: null,         // { mag, t0, dur }
    shakeOffset: null,   // 이번 frame 적용된 offset (다음 frame 에서 빼고 새로 적용)
  };
  configureForPit(state, pit);
  return state;
}

export function configureForPit(state, pit) {
  const { controls } = state;
  const span = Math.max(pit.width, pit.depth, pit.height);
  controls.minDistance = span * 0.9;
  controls.maxDistance = span * 5;
  controls.target.set(pit.width / 2, pit.height * 0.45, pit.depth / 2);
  controls.update();
}

export function applyPreset(state, pit, preset, instant = false) {
  const p = PRESETS[preset];
  if (!p) return;
  const span = Math.max(pit.width, pit.depth, pit.height);
  const r = span * p.distMul;
  const cx = pit.width / 2, cy = pit.height * 0.45, cz = pit.depth / 2;
  const sinP = Math.sin(p.polar), cosP = Math.cos(p.polar);
  const px = cx + r * sinP * Math.cos(p.az);
  const py = cy + r * cosP;
  const pz = cz + r * sinP * Math.sin(p.az);

  if (instant) {
    state.camera.position.set(px, py, pz);
    state.controls.target.set(cx, cy, cz);
    state.tween = null;
    state.controls.enabled = true;
    state.controls.update();
  } else {
    startTween(state, [px, py, pz], [cx, cy, cz]);
  }
}

function startTween(state, toPos, toTgt) {
  state.tween = {
    fromPos: state.camera.position.clone(),
    toPos: new THREE.Vector3(toPos[0], toPos[1], toPos[2]),
    fromTgt: state.controls.target.clone(),
    toTgt: new THREE.Vector3(toTgt[0], toTgt[1], toTgt[2]),
    t0: performance.now(),
    dur: TWEEN_MS,
  };
  state.controls.enabled = false;
}

export function startShake(state, magnitude = 0.15, durationMs = 220) {
  state.shake = { mag: magnitude, t0: performance.now(), dur: durationMs };
}

export function updateCameraControls(state, now) {
  // 1) 이전 frame 의 shake offset 제거 — 깨끗한 위치에서 controls.update() 가 동작하도록.
  if (state.shakeOffset) {
    state.camera.position.sub(state.shakeOffset);
    state.shakeOffset = null;
  }

  // 2) tween 또는 OrbitControls update.
  const tween = state.tween;
  if (tween) {
    const t = Math.min(1, (now - tween.t0) / tween.dur);
    const e = easeOutCubic(t);
    state.camera.position.lerpVectors(tween.fromPos, tween.toPos, e);
    state.controls.target.lerpVectors(tween.fromTgt, tween.toTgt, e);
    state.controls.update();
    if (t >= 1) {
      state.tween = null;
      state.controls.enabled = true;
    }
  } else {
    state.controls.update();
  }

  // 3) 이번 frame 의 shake offset 추가.
  if (state.shake) {
    const elapsed = now - state.shake.t0;
    if (elapsed >= state.shake.dur) {
      state.shake = null;
    } else {
      const t = elapsed / state.shake.dur;
      const decay = (1 - t) * (1 - t); // ease-out quad
      const m = state.shake.mag * decay;
      state.shakeOffset = new THREE.Vector3(
        (Math.random() - 0.5) * 2 * m,
        (Math.random() - 0.5) * 2 * m,
        (Math.random() - 0.5) * 2 * m,
      );
      state.camera.position.add(state.shakeOffset);
    }
  }
}

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _back = new THREE.Vector3();

export function screenArrowToPit(camera, code) {
  camera.matrixWorld.extractBasis(_right, _up, _back);
  const fX = -_back.x, fZ = -_back.z;
  const rX = _right.x, rZ = _right.z;
  let vx = 0, vz = 0;
  switch (code) {
    case 'ArrowLeft':  vx = -rX; vz = -rZ; break;
    case 'ArrowRight': vx =  rX; vz =  rZ; break;
    case 'ArrowUp':    vx =  fX; vz =  fZ; break;
    case 'ArrowDown':  vx = -fX; vz = -fZ; break;
    default: return [0, 0];
  }
  const ax = Math.abs(vx), az = Math.abs(vz);
  if (ax < 1e-4 && az < 1e-4) return [0, 0];
  if (ax >= az) return [Math.sign(vx) || 1, 0];
  return [0, Math.sign(vz) || 1];
}

export function readCameraView(state) {
  const c = state.camera;
  const t = state.controls.target;
  return {
    px: c.position.x, py: c.position.y, pz: c.position.z,
    tx: t.x, ty: t.y, tz: t.z,
  };
}

export function applyCameraView(state, view) {
  if (!view || typeof view !== 'object') return false;
  const ks = ['px', 'py', 'pz', 'tx', 'ty', 'tz'];
  for (const k of ks) {
    if (typeof view[k] !== 'number' || !Number.isFinite(view[k])) return false;
  }
  state.camera.position.set(view.px, view.py, view.pz);
  state.controls.target.set(view.tx, view.ty, view.tz);
  state.controls.update();
  return true;
}
