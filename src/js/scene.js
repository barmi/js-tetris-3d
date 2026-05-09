// three.js 씬 / 카메라 / 조명 / 렌더러 부트스트랩.
// 카메라 컨트롤(OrbitControls)은 Phase 2 에서 별도 모듈로 분리.

import * as THREE from 'three';

export function createSceneContext(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070b);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // 조명: 부드러운 환경광 + 한쪽에서 비추는 방향광. 그림자는 Phase 1.5 에서 추가.
  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  const dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(12, 20, 8);
  scene.add(ambient, dir);

  // 보조 그리드(원점 표시): pit 외곽에 살짝 어둑하게.
  const grid = new THREE.GridHelper(40, 40, 0x1a2030, 0x10141c);
  grid.position.y = 0;
  scene.add(grid);

  return { scene, camera, renderer };
}

export function fitToContainer(renderer, camera, container) {
  const w = container.clientWidth;
  const h = container.clientHeight;
  if (w === 0 || h === 0) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
