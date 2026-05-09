// 진입점. 모듈 wiring + 메인 루프.

import { createSceneContext, fitToContainer } from './scene.js';
import { Pit } from './pit.js';
import {
  createPitMesh,
  createCellsMesh, updateCellsMesh,
  createCurrentBlockGroup, updateCurrentBlockGroup,
  createGhostGroup, updateGhostGroup,
} from './renderer.js';
import { createNextPreview } from './nextPreview.js';
import { Game } from './game.js';
import { bindUI, readOptions } from './ui.js';
import { bindKeyboard } from './controls.js';
import {
  createCameraControls, configureForPit, applyPreset,
  applyCameraView, readCameraView, updateCameraControls,
} from './cameraControls.js';
import { loadCameraView, saveCameraView } from './storage.js';
import { setColorPalette } from './blocksets.js';
import { sfx, setEnabled as setSfxEnabled, unlock as unlockAudio } from './audio.js';

const SCENE_BG = {
  dark:    0x05070b,
  light:   0xe8edf3,
  neon:    0x050008,
  minimal: 0x0c0c0c,
};

const canvas = document.getElementById('game-canvas');
const stage = canvas.parentElement;
const nextCanvas = document.getElementById('next-canvas');

const ctx = createSceneContext(canvas);
const { scene, camera, renderer } = ctx;

let pit = new Pit(...parsePitDims(readOptions().pit));
let pitMesh = createPitMesh(pit);
let cellsMesh = createCellsMesh(pit);
let currentGroup = createCurrentBlockGroup();
let ghostGroup = createGhostGroup();
scene.add(pitMesh, cellsMesh, currentGroup, ghostGroup);

const cameraState = createCameraControls(camera, canvas, pit);
if (!applyCameraView(cameraState, loadCameraView())) {
  applyPreset(cameraState, pit, 'iso', /* instant */ true);
}

const nextPreview = createNextPreview(nextCanvas);
const game = new Game({ pit });

let lastNextRef = null;
game.on((g, type) => {
  // 다음 블럭이 바뀐 순간만 미리보기를 다시 그린다.
  if (g.next !== lastNextRef) {
    lastNextRef = g.next;
    nextPreview.setBlock(g.next);
  }
  // SFX
  switch (type) {
    case 'move':     sfx.move(); break;
    case 'rotate':   sfx.rotate(); break;
    case 'drop':     sfx.drop(); break;
    case 'lock':     sfx.lock(); break;
    case 'clear':    sfx.clear(); break;
    case 'gameover': sfx.gameOver(); break;
  }
});

bindUI({
  game,
  onPitChange: (pitId) => {
    const dims = parsePitDims(pitId);
    scene.remove(pitMesh, cellsMesh, currentGroup, ghostGroup);
    pit = new Pit(...dims);
    pitMesh = createPitMesh(pit);
    cellsMesh = createCellsMesh(pit);
    currentGroup = createCurrentBlockGroup();
    ghostGroup = createGhostGroup();
    scene.add(pitMesh, cellsMesh, currentGroup, ghostGroup);
    configureForPit(cameraState, pit);
    applyPreset(cameraState, pit, 'iso');
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
});

bindKeyboard({
  game,
  camera,
  onView: (preset) => applyPreset(cameraState, pit, preset),
});

// 사용자 첫 입력 시 AudioContext 잠금 해제 — autoplay 정책 회피.
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
  if (game.dirty) {
    updateCellsMesh(cellsMesh, pit);
    updateCurrentBlockGroup(currentGroup, game.current);
    updateGhostGroup(ghostGroup, game.current, pit);
    game.dirty = false;
  }
  updateCameraControls(cameraState, now);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

function parsePitDims(s) {
  return s.split('x').map((n) => parseInt(n, 10));
}
