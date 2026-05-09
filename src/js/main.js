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
game.on(() => {
  if (game.next !== lastNextRef) {
    lastNextRef = game.next;
    nextPreview.setBlock(game.next);
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
});

bindKeyboard({
  game,
  camera,
  onView: (preset) => applyPreset(cameraState, pit, preset),
});

// 카메라 변경(드래그/휠/패닝)을 throttle 해서 저장.
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
