// 진입점. 모듈 wiring 과 메인 루프만 담당한다.
// 게임 로직은 ./game.js, 렌더는 ./scene.js + ./renderer.js, 입력은 ./controls.js.

import { createSceneContext, fitToContainer } from './scene.js';
import { Pit } from './pit.js';
import { createPitMesh } from './renderer.js';
import { Game } from './game.js';
import { bindUI, readOptions } from './ui.js';
import { bindKeyboard } from './controls.js';
import { loadHighScore } from './storage.js';

const canvas = document.getElementById('game-canvas');
const stage = canvas.parentElement;

const ctx = createSceneContext(canvas);
const { scene, camera, renderer } = ctx;

// 옵션 패널의 현재 값을 읽어 초기 pit 생성.
const options = readOptions();
let pit = new Pit(...parsePitDims(options.pit));
let pitMesh = createPitMesh(pit);
scene.add(pitMesh);

// 카메라를 pit 중앙을 바라보도록 ISO 위치에 배치.
positionIsoCamera(camera, pit);

const game = new Game({ pit });

// HUD / 패널 / 키보드 바인딩.
bindUI({
  game,
  onOptionsChange: (opts) => {
    // Phase 0: 콘솔에만 emit. Phase 1 에서 game.applyOptions() 와 pit 재생성을 연결.
    console.log('[options]', opts);
    if (opts.pit !== options.pit) {
      const dims = parsePitDims(opts.pit);
      scene.remove(pitMesh);
      pit = new Pit(...dims);
      pitMesh = createPitMesh(pit);
      scene.add(pitMesh);
      positionIsoCamera(camera, pit);
      game.setPit(pit);
    }
    Object.assign(options, opts);
  },
});

bindKeyboard({ game });

// HUD 초기값 (하이스코어).
document.querySelector('[data-hud="high"]').textContent = String(loadHighScore());

// resize 처리.
const resizeObserver = new ResizeObserver(() => fitToContainer(renderer, camera, stage));
resizeObserver.observe(stage);
fitToContainer(renderer, camera, stage);

// 메인 루프.
let lastT = performance.now();
function tick(now) {
  const dt = Math.min(50, now - lastT); // 50ms 캡 (탭 전환 후 큰 dt 방지)
  lastT = now;
  game.update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// ----- helpers -----

function parsePitDims(s) {
  // "5x5x10" → [5, 5, 10]
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
