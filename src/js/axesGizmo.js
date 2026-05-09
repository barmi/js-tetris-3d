// 좌상단의 작은 좌표계 gizmo. 메인 카메라 방향과 동기화하여 X/Y/Z 가 화면에서 어디를 가리키는지 보여준다.

import * as THREE from 'three';

const SIZE = 1.0;        // 화살표 길이
const HEAD_LEN = 0.22;
const HEAD_WIDTH = 0.13;
const FRUSTUM_HALF = 1.7;

const COLOR_X = 0xff5566;
const COLOR_Y = 0x66dd66;
const COLOR_Z = 0x5599ff;

const _dir = new THREE.Vector3();
const _origin = new THREE.Vector3(0, 0, 0);

export function createAxesGizmo(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const w = canvas.clientWidth || canvas.width || 100;
  const h = canvas.clientHeight || canvas.height || 100;
  renderer.setSize(w, h, false);

  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 1.0));

  const camera = new THREE.OrthographicCamera(
    -FRUSTUM_HALF, FRUSTUM_HALF, FRUSTUM_HALF, -FRUSTUM_HALF, 0.1, 100,
  );

  // X / Y / Z 축 화살표.
  const axes = new THREE.Group();
  axes.add(new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), _origin, SIZE, COLOR_X, HEAD_LEN, HEAD_WIDTH));
  axes.add(new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), _origin, SIZE, COLOR_Y, HEAD_LEN, HEAD_WIDTH));
  axes.add(new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), _origin, SIZE, COLOR_Z, HEAD_LEN, HEAD_WIDTH));

  // 라벨 sprites.
  axes.add(makeLabel('X', '#ff5566', SIZE + 0.28, 0, 0));
  axes.add(makeLabel('Y', '#66dd66', 0, SIZE + 0.28, 0));
  axes.add(makeLabel('Z', '#5599ff', 0, 0, SIZE + 0.28));

  scene.add(axes);

  // 메인 카메라가 pit 을 보는 방향과 같은 각도에서 axes 를 본다.
  function update(mainCamera, mainTarget) {
    _dir.subVectors(mainCamera.position, mainTarget).normalize().multiplyScalar(3);
    camera.position.copy(_dir);
    camera.up.copy(mainCamera.up);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }

  function resize() {
    const ww = canvas.clientWidth || canvas.width;
    const hh = canvas.clientHeight || canvas.height;
    renderer.setSize(ww, hh, false);
  }

  return { update, resize };
}

function makeLabel(text, color, x, y, z) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.font = 'bold 48px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 32, 36);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.scale.set(0.5, 0.5, 1);
  sprite.position.set(x, y, z);
  return sprite;
}
