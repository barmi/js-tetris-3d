// three.js 씬 / 카메라 / 조명 / 렌더러 부트스트랩.
// OrbitControls 도입은 Phase 2 에서.

import * as THREE from 'three';

export function createSceneContext(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070b);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;

  // 라이팅: 차가운 sky / 따뜻한 ground hemisphere + key directional + 약한 fill.
  // flatShading 큐브에서 면별 명도가 또렷하게 갈리도록 한다.
  const hemi = new THREE.HemisphereLight(0xeaf3ff, 0x0a0e16, 0.55);
  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(12, 22, 8);
  const fill = new THREE.DirectionalLight(0x99b8ff, 0.25);
  fill.position.set(-10, 8, -6);
  scene.add(hemi, key, fill);

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
