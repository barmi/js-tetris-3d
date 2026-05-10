// 진입점. 모듈 wiring + 메인 루프.

import * as THREE from 'three';
import { createSceneContext, fitToContainer } from './scene.js';
import { Pit } from './pit.js';
import {
  createPitMesh,
  createCellsMesh, updateCellsMesh,
  createFallingBlockMesh, updateFallingBlockMesh,
  createWallShadowGroup, updateWallShadowGroup,
  createGhostGroup, updateGhostGroup,
} from './renderer.js';
import { createEffects, spawnLayerParticles, updateEffects } from './effects.js';
import { createNextPreview } from './nextPreview.js';
import { createAxesGizmo } from './axesGizmo.js';
import { Game } from './game.js';
import { bindUI, readOptions } from './ui.js';
import { bindKeyboard } from './controls.js';
import {
  createCameraControls, configureForPit, applyPreset,
  applyCameraView, readCameraView, updateCameraControls,
  startShake,
} from './cameraControls.js';
import { loadCameraView, saveCameraView } from './storage.js';
import { setColorPalette } from './blocksets.js';
import { sfx, setEnabled as setSfxEnabled, unlock as unlockAudio } from './audio.js';
import { AutoPlay } from './autoPlay.js';

const SCENE_BG = {
  dark:    0x05070b,
  light:   0xe8edf3,
  neon:    0x050008,
  minimal: 0x0c0c0c,
};

const ROT_ANIM_MS = 150;

const canvas = document.getElementById('game-canvas');
const stage = canvas.parentElement;
const nextCanvas = document.getElementById('next-canvas');
const axesCanvas = document.getElementById('axes-canvas');

const ctx = createSceneContext(canvas);
const { scene, camera, renderer } = ctx;

let pit = new Pit(...parsePitDims(readOptions().pit));
let pitMesh = createPitMesh(pit);
let cellsMesh = createCellsMesh(pit);
let fallingBlockMesh = createFallingBlockMesh();
let wallShadowGroup = createWallShadowGroup();
let ghostGroup = createGhostGroup();
const effects = createEffects();
scene.add(pitMesh, cellsMesh, fallingBlockMesh, wallShadowGroup, ghostGroup, effects.mesh);

const cameraState = createCameraControls(camera, canvas, pit);
if (!applyCameraView(cameraState, loadCameraView())) {
  applyPreset(cameraState, pit, 'iso', /* instant */ true);
}

const axesGizmo = createAxesGizmo(axesCanvas);
const nextPreview = createNextPreview(nextCanvas);
const game = new Game({ pit });
const autoPlay = new AutoPlay(game);

function setApUiActive(enabled) {
  const apBar = document.querySelector('[data-ap-bar]');
  if (apBar) apBar.hidden = !enabled;
  document.querySelector('[data-action="auto"]')?.classList.toggle('btn-active', enabled);
}

// 회전 애니메이션 상태.
let rotationAnim = null;       // { fromQuat, fromPos, toPos, t0, dur }
let rotationAnimEnabled = true;
const _identityQ = new THREE.Quaternion();
const _animQ = new THREE.Quaternion();
const _xAxis = new THREE.Vector3(1, 0, 0);
const _yAxis = new THREE.Vector3(0, 1, 0);
const _zAxis = new THREE.Vector3(0, 0, 1);

function rotationQuat(axis, dir) {
  const angle = (Math.PI / 2) * dir;
  const q = new THREE.Quaternion();
  if (axis === 'x') q.setFromAxisAngle(_xAxis, angle);
  else if (axis === 'y') q.setFromAxisAngle(_yAxis, angle);
  else q.setFromAxisAngle(_zAxis, angle);
  return q;
}

let lastNextRef = null;
game.on((g, type) => {
  if (g.next !== lastNextRef) {
    lastNextRef = g.next;
    nextPreview.setBlock(g.next);
  }
  if (type === 'spawn') autoPlay.onSpawn();
  if (type === 'gameover' && autoPlay.enabled) {
    autoPlay.enabled = false;
    setApUiActive(false);
  }
  switch (type) {
    case 'move':     sfx.move(); break;
    case 'rotate':
      sfx.rotate();
      if (rotationAnimEnabled && g.lastRotation) {
        // mesh 는 회전 후 상태에 있으므로, "회전 전 상태" 로 되돌리는 quaternion(=-dir 회전) 에서 시작해 identity 로.
        rotationAnim = {
          fromQuat: rotationQuat(g.lastRotation.axis, -g.lastRotation.dir),
          fromPos:  new THREE.Vector3(...g.lastRotation.fromAbsCentroid),
          toPos:    new THREE.Vector3(...g.lastRotation.toAbsCentroid),
          t0: performance.now(),
          dur: ROT_ANIM_MS,
        };
      } else {
        rotationAnim = null;
        fallingBlockMesh.quaternion.identity();
      }
      break;
    case 'drop':     sfx.drop(); break;
    case 'lock':     sfx.lock(); break;
    case 'clear':
      sfx.clear();
      spawnLayerParticles(effects, pit, g.lastClearedYs);
      startShake(cameraState, Math.min(0.35, 0.12 * (g.lastClearedYs?.length || 1)), 240);
      break;
    case 'gameover':
      sfx.gameOver();
      startShake(cameraState, 0.4, 480);
      break;
  }
});

bindUI({
  game,
  onPitChange: (pitId) => {
    const dims = parsePitDims(pitId);
    scene.remove(pitMesh, cellsMesh, fallingBlockMesh, wallShadowGroup, ghostGroup);
    pit = new Pit(...dims);
    pitMesh = createPitMesh(pit);
    cellsMesh = createCellsMesh(pit);
    fallingBlockMesh = createFallingBlockMesh();
    wallShadowGroup = createWallShadowGroup();
    ghostGroup = createGhostGroup();
    scene.add(pitMesh, cellsMesh, fallingBlockMesh, wallShadowGroup, ghostGroup);
    configureForPit(cameraState, pit);
    applyPreset(cameraState, pit, 'iso');
    rotationAnim = null;
    game.setPit(pit);
  },
  onView: (preset) => applyPreset(cameraState, pit, preset),
  onTheme: (name) => {
    scene.background.setHex(SCENE_BG[name] ?? SCENE_BG.dark);
  },
  onPalette: (name) => {
    setColorPalette(name);
    game.dirty = true;
    if (game.next) nextPreview.setBlock(game.next);
  },
  onSound: (v) => {
    setSfxEnabled(v === 'on');
    if (v === 'on') unlockAudio();
  },
  onRotateAnim: (v) => {
    rotationAnimEnabled = (v === 'on');
    if (!rotationAnimEnabled) {
      rotationAnim = null;
      fallingBlockMesh.quaternion.identity();
    }
  },
  onAuto: () => {
    const enabled = autoPlay.toggle();
    setApUiActive(enabled);
  },
  onAutoSpeed: (v) => autoPlay.setIntervalMs(v),
});

bindKeyboard({
  game,
  camera,
  autoPlay,
  onView: (preset) => applyPreset(cameraState, pit, preset),
});

const unlockOnce = () => {
  unlockAudio();
  window.removeEventListener('keydown', unlockOnce, true);
  window.removeEventListener('pointerdown', unlockOnce, true);
};
window.addEventListener('keydown', unlockOnce, true);
window.addEventListener('pointerdown', unlockOnce, true);

let lastSaveT = 0;
cameraState.controls.addEventListener('change', () => {
  const t = performance.now();
  if (t - lastSaveT > 500) {
    lastSaveT = t;
    saveCameraView(readCameraView(cameraState));
  }
});

const resizeObserver = new ResizeObserver(() => fitToContainer(renderer, camera, stage));
resizeObserver.observe(stage);
fitToContainer(renderer, camera, stage);

let lastT = performance.now();
function tick(now) {
  const dt = Math.min(50, now - lastT);
  lastT = now;
  game.update(dt);
  autoPlay.update(now);
  if (game.dirty) {
    updateCellsMesh(cellsMesh, pit);
    updateFallingBlockMesh(fallingBlockMesh, game.current);
    updateWallShadowGroup(wallShadowGroup, game.current);
    updateGhostGroup(ghostGroup, game.current, pit);
    game.dirty = false;
  }

  // 회전 anim — 매 frame quaternion / position 보간.
  if (rotationAnim) {
    const t = (now - rotationAnim.t0) / rotationAnim.dur;
    if (t >= 1) {
      // anim 종료 — 최종 상태로 스냅.
      fallingBlockMesh.quaternion.identity();
      fallingBlockMesh.position.copy(rotationAnim.toPos);
      rotationAnim = null;
    } else {
      const e = 1 - Math.pow(1 - t, 3);
      _animQ.copy(rotationAnim.fromQuat).slerp(_identityQ, e);
      fallingBlockMesh.quaternion.copy(_animQ);
      fallingBlockMesh.position.lerpVectors(rotationAnim.fromPos, rotationAnim.toPos, e);
    }
  }

  updateEffects(effects, now);
  updateCameraControls(cameraState, now);
  axesGizmo.update(camera, cameraState.controls.target);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// PWA — service worker 등록. file:// 에서는 등록 안 함 (정적 서버에서만 동작).
if ('serviceWorker' in navigator
    && (location.protocol === 'http:' || location.protocol === 'https:')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => {
      console.warn('SW register failed:', e);
    });
  });
}

function parsePitDims(s) {
  return s.split('x').map((n) => parseInt(n, 10));
}
