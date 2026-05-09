// next-canvas 에 다음 블록을 렌더하는 작은 three.js 씬.

import * as THREE from 'three';
import { paletteColor } from './blocksets.js';

// frustum half-size — 큰 polycube (size 4 까지) 도 여유롭게 들어가도록.
const FRUSTUM_HALF = 3.5;

export function createNextPreview(canvas) {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const w = canvas.clientWidth || canvas.width;
  const h = canvas.clientHeight || canvas.height;
  renderer.setSize(w, h, false);

  const aspect = w / h;
  const camera = new THREE.OrthographicCamera(
    -FRUSTUM_HALF * aspect,  FRUSTUM_HALF * aspect,
     FRUSTUM_HALF,           -FRUSTUM_HALF,
     0.1, 100,
  );
  camera.position.set(5, 5, 5);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(4, 6, 5);
  scene.add(dir);

  let group = null;
  let currentMat = null;

  function clear() {
    if (group) {
      scene.remove(group);
      group = null;
    }
    if (currentMat) {
      currentMat.dispose();
      currentMat = null;
    }
  }

  function setBlock(block) {
    clear();
    if (block) {
      const [sx, sy, sz] = block.size();
      const cx = sx / 2, cy = sy / 2, cz = sz / 2;
      const geom = new THREE.BoxGeometry(0.95, 0.95, 0.95);
      currentMat = new THREE.MeshStandardMaterial({
        color: paletteColor(block.colorIdx)?.hex ?? 0xffffff,
        roughness: 0.45, metalness: 0.05,
      });
      group = new THREE.Group();
      for (const [x, y, z] of block.cells) {
        const mesh = new THREE.Mesh(geom, currentMat);
        mesh.position.set(x + 0.5 - cx, y + 0.5 - cy, z + 0.5 - cz);
        group.add(mesh);
      }
      scene.add(group);
    }
    renderer.render(scene, camera);
  }

  function render() {
    renderer.render(scene, camera);
  }

  return { setBlock, render };
}
