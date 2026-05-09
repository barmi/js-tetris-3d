// 진입점. 모듈 wiring + 메인 루프.

import { createSceneContext, fitToContainer } from './scene.js';
import { Pit } from './pit.js';
import { createPitMesh, createCellsMesh, updateCellsMesh } from './renderer.js';
import { createNextPreview } from './nextPreview.js';
import { Game } from './game.js';
import { bindUI, readOptions } from './ui.js';
import { bindKeyboard } from './controls.js';

const canvas = document.getElementById('game-canvas');
const stage = canvas.parentElement;
const nextCanvas = document.getElementById('next-canvas');

const ctx = createSceneContext(canvas);
const { scene, camera, renderer } = ctx;

let pit = new Pit(...parsePitDims(readOptions().pit));
let pitMesh = createPitMesh(pit);
let cellsMesh = createCellsMesh(pit);
scene.add(pitMesh);
scene.add(cellsMesh);
positionIsoCamera(camera, pit);

const nextPreview = createNextPreview(nextCanvas);

const game = new Game({ pit });

// 다음 블록이 바뀐 순간만 미리보기를 다시 그린다.
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
    scene.remove(pitMesh);
    scene.remove(cellsMesh);
    pit = new Pit(...dims);
    pitMesh = createPitMesh(pit);
    cellsMesh = createCellsMesh(pit);
    scene.add(pitMesh);
    scene.add(cellsMesh);
    positionIsoCamera(camera, pit);
    game.setPit(pit);
  },
});

bindKeyboard({ game });

const resizeObserver = new ResizeObserver(() => fitToContainer(renderer, camera, stage));
resizeObserver.observe(stage);
fitToContainer(renderer, camera, stage);

let lastT = performance.now();
function tick(now) {
  const dt = Math.min(50, now - lastT);
  lastT = now;
  game.update(dt);
  if (game.dirty) {
    updateCellsMesh(cellsMesh, pit, game.current);
    game.dirty = false;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// ----- helpers -----

function parsePitDims(s) {
  return s.split('x').map((n) => parseInt(n, 10));
}

function positionIsoCamera(camera, pit) {
  const cx = pit.width / 2;
  const cz = pit.depth / 2;
  const cy = pit.height / 2;
  const r = Math.max(pit.width, pit.depth, pit.height) * 1.6;
  camera.position.set(cx + r, cy + r * 0.9, cz + r);
  camera.lookAt(cx, cy * 0.6, cz);
}
