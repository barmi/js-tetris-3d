# 작업 계획 (PLAN)

> 본 문서는 살아있는 문서입니다. 단계가 끝날 때마다 체크하고, 새로 발견한 작업은 해당 단계 아래에 추가합니다.

전체 흐름:

```
Phase 0 (기반)  →  Phase 1 (Blockout 클론)  →  Phase 2 (자유 카메라)  →  Phase 3 (확장)
```

---

## Phase 0 — 기반 셋업

목표: 정적 파일 서버에서 페이지를 열면 빈 pit 이 ISO 카메라로 그려진다. 우측 옵션 패널의 위젯이 보이고, 값 변경 시 콘솔에 반영된다.

- [x] 저장소 초기화 (`git init`, README 자리표시자)
- [x] 폴더 구조 생성: 문서는 `doc/`, 소스/자산은 `src/` (`src/css/`, `src/js/`, `src/assets/`)
- [x] `.gitignore` 작성: OS / 에디터 / 로그 / `node_modules` / 향후 빌드 산출물
- [x] `README.md` 작성 (한국어): 개요 / 실행법 / 컨트롤 / 옵션 / 폴더 구조
- [x] `doc/PLAN.md` 작성 (한국어): 단계별 체크리스트
- [x] `src/index.html` 작성: import map, 상단 HUD, 좌측 캔버스, 우측 옵션 패널 골격
- [x] `src/css/styles.css`: 다크 테마, 좌/우 2-column 레이아웃, 옵션 패널
- [x] `src/js/scene.js`: three.js 씬 / 카메라 / 조명 / 렌더러 부트스트랩
- [x] `src/js/pit.js`: 빈 pit 점유 그리드 + 와이어프레임 메쉬
- [x] `src/js/main.js`: 모듈 wiring, requestAnimationFrame 루프, resize 처리
- [x] `src/js/blocksets.js`, `block.js`, `game.js`, `controls.js`, `ui.js`, `storage.js` 골격
- [x] 우측 패널 위젯이 옵션 변경을 콘솔로 emit
- [x] 정적 서버 명령 안내: `python3 -m http.server 8080 --directory src` (기본) / `npx --yes http-server src -p 8080 -c-1` (대안)

---

## Phase 1 — Blockout 클론 (레퍼런스와 동등)

목표: 레퍼런스 사이트와 동일한 게임 흐름 — 시작 → 블록이 떨어짐 → 회전/이동/드롭 → 한 층이 채워지면 제거 → 점수 / 레벨 갱신 → 게임 오버.

### 1.1 데이터 모델

- [x] `Pit` 클래스
  - [x] `(width, depth, height)` 로 초기화
  - [x] `cells: Uint8Array(width * depth * height)` (0 = 비어있음, >0 = 색 인덱스)
  - [x] `index(x, y, z)`, `get`, `set`, `isOccupied`
  - [x] `isInside(x, y, z)`, `canPlace(absCells)`
  - [x] `mergeBlock(absCells, colorIdx)`
  - [x] `clearFullLayers(): number` — 가득 찬 Y 층 모두 제거하고 위 칸을 끌어내림
- [x] `Block` 클래스
  - [x] `cells: Array<[x, y, z]>` (블록 로컬 좌표, 정수)
  - [x] `position: [x, y, z]` (pit 좌표계의 원점)
  - [x] `rotate(axis: 'x'|'y'|'z', dir: +1|-1)` — 정수 회전 행렬 적용 후 정규화(음수 좌표 평행이동)
  - [x] `absCells()` — 위치를 더한 절대 좌표 반환
  - [x] `size()` — 정규화 후 [sizeX, sizeY, sizeZ] 반환
  - [x] `clone()` — 변경 후보를 만들고 충돌 검사할 때 사용

### 1.2 블록 세트 정의

- [x] `FLAT`: 평면(y=0) 폴리오미노 — 클래식 테트리스 7종(I/O/T/L/J/S/Z)
- [x] `BASIC`: FLAT + 작은 3D polycube (TRIPOD, L3D, SKEW)
- [x] `EXTENDED`: BASIC + 더 큰 polycube (CUBE2, PLUS3D, STAIR)
- [x] 각 블록에 색 인덱스 부여 + 8색 `PALETTE` 정의
- [x] `pickRandomBlock(setId, pit)` — 현재 pit 에 들어갈 수 있는 블록만 후보로
- [ ] (확인 필요) 레퍼런스 사이트의 정확한 블록 목록과 비교 / 정렬 — 미해결로 이관

### 1.3 게임 루프

- [x] `Game` 상태 머신: `idle` / `running` / `paused` / `gameover`
- [x] 드롭 타이머: 레벨·속도에 따른 `dropIntervalMs(speed, level)` (자체 공식)
- [x] 한 틱마다: `tryMove(0,-1,0)` 실패 시 `mergeBlock` → `clearFullLayers` → 점수·레벨 갱신 → `spawn`
- [x] 다음 블록(NEXT) 1개 미리보기
- [x] 게임 오버: 스폰 직후 충돌 시 `gameOver` (하이스코어 저장)

### 1.4 입력

- [x] 키 매핑: 화살표(이동), QWE/ASD(회전), Space(하드 드롭), B/P/Esc
- [x] 키 리피트(DAS 스타일): 화살표만 적용. 220 ms 지연 후 70 ms 간격 반복
- [x] OS 키 리피트(`ev.repeat`)는 무시하고 직접 관리 + `blur` 시 일괄 정리
- [x] 입력 → `Game.tryMove` / `tryRotate` / `hardDrop` / `start` / `pause` / `reset`

### 1.5 렌더링

- [x] 셀 단위 `InstancedMesh` (capacity = pit 부피 + 블록 여유분)
- [x] 색 팔레트 (`instanceColor` 사용)
- [x] pit 와이어프레임 + 바닥 + 셀 격자
- [x] 점유 셀 + 현재 블록을 한 메쉬로 합쳐 `dirty` 시점에만 갱신
- [x] 다음 블록 미리보기 — 별도 three.js 씬 + Orthographic 카메라

### 1.6 UI / HUD

- [x] 상단: `Cubes Played`, `High Score`, `Score`, `Level`
- [x] 우측 패널: Rotation / Speed / Level / Pit / Block Set 라디오 그룹
- [x] 옵션 변경: speed/level/blockset 은 `applyOptions`, pit 은 `onPitChange` 콜백으로 메쉬 재생성
- [x] `Start` / `Pause` / `Reset` 버튼
- [x] `localStorage` 로 마지막 옵션 / 하이스코어 저장
- [x] 중앙 오버레이: idle / paused / gameover 상태 메시지

### 1.7 점수 시스템 (자체 공식)

- [x] 큐브 배치 점수: 1점 / cube
- [x] 한 층 클리어 보너스: 100 (1) / 250 (2) / 450 (3) / 700 (4) / 1000 (5+)
- [x] 동시 다층 클리어: 위 보너스 표가 누진
- [x] 하드 드롭 보너스: 떨어진 거리 × 2
- [x] 레벨업: 누적 클리어 라인 5 마다 시작 레벨 + 1, 최대 19
- [ ] (확인 필요) 레퍼런스 사이트의 정확한 공식 — 미해결로 이관

### 1.8 시각 폴리시 (사용자 피드백 반영)

목표: 첫인상에서 게임 상태가 한눈에 들어오도록 정돈한다.

- [x] CSS: `.stage-overlay[hidden]` 가 실제로 숨겨지도록 수정 — `display: flex` 가 `[hidden]` 의 기본 `display: none` 을 덮던 문제
- [x] 라이팅 강화: `HemisphereLight` + key/fill `DirectionalLight`. 렌더러 `outputColorSpace = SRGBColorSpace` 명시
- [x] 셀 머터리얼 `flatShading: true` + 사이즈 0.92 — 면별 명도 차이로 경계가 또렷
- [x] pit 4 측벽(+ 바닥)에 셀 격자 라인 추가 — 측면에서도 떨어지는 블럭의 X·Z 위치 파악 가능
- [x] 쌓인 블럭 색을 Y(높이)에 따라 8색 순환 (`LAYER_COLORS`) — 누적 패턴이 한눈에 들어옴
- [x] 떨어지는 블럭은 흰색 와이어프레임으로 표시 — 쌓인 블럭과 명확히 구분
- [x] X=0 / Z=0 두 벽면에 떨어지는 블럭의 X-Z 단면 그림자 — 블럭 색 반투명, 같은 (y,z) / (x,y) 셀은 중복 제거

---

## Phase 2 — 마우스 자유 카메라 (본 프로젝트의 핵심 차별점)

목표: 떨어지는 블록의 X-Z 위치를 직관적으로 파악할 수 있도록, 사용자가 임의 각도에서 pit 을 관찰할 수 있다.

- [x] `OrbitControls` (`three/addons/controls/OrbitControls.js`) 도입 + damping 0.08
- [x] 회전 / 줌 / 패닝의 합리적 limits — `minDistance ≈ 0.9·span`, `maxDistance ≈ 5·span`, polar `0.05~0.49π` (바닥 아래 차단)
- [x] 뷰 프리셋 단축키 1=Top / 2=ISO / 3=Front / 4=Side + 우측 패널 버튼
- [x] 프리셋 전환 시 ease-out-cubic 보간 (600 ms, 보간 중 사용자 입력 비활성). 페이지 첫 진입은 `instant=true` 로 즉시 배치
- [x] 카메라 yaw 기준 화살표 이동 — 카메라 right / forward 벡터를 XZ 로 투영 후 가까운 축으로 snap (`screenArrowToPit`)
- [x] **낙하 가이드**: hard-drop 시 멈출 위치를 노란색 wireframe ghost block 으로 표시
- [-] (생략) 수직 가이드 점선 — ghost block 이 동등한 정보를 더 깔끔하게 전달하므로 보류
- [x] 카메라 상태(`{px,py,pz,tx,ty,tz}`) `localStorage` 에 저장 — `controls.change` 이벤트를 500 ms throttle
- [x] 사용자 피드백 1차 — 드롭 속도 완화: base 1500 / 1000 / 600 ms, factor `max(0.30, 1 − 0.10·level)`
- [x] 사용자 피드백 2차 — Phase 2 직후 추가 보강:
  - 드롭 속도 추가 완화: base **3000 / 2000 / 1200 ms**, factor `max(0.40, 1 − 0.10·level)`
  - 카메라 프리셋 distMul 줄임 (이전 2.4 ~ 2.6 → **1.40 ~ 1.60**) — 화면을 거의 꽉 채움
  - Top 프리셋 polar **0.05 → 0.20π** — 4 측벽이 충분히 보여 깊이감 유지 (왜곡 허용)
  - ISO 프리셋 azimuth **45° → 30°** (`π/6`) — +X / +Z 방향이 또렷하게 갈려 화살표 이동 직관화
  - 셀 메쉬 `RoundedBoxGeometry(0.99, .., 0.12)` + `flatShading: false` — 갭 거의 없는 둥근 모서리 큐브 (떨어지는 블럭 wireframe 은 그대로 직선 edges)
  - 회전 wall-kick 확장 — 6 방향 → 16 방향 (±1 / ±2 / 대각 4) 으로, 모서리 / 벽에서도 회전 가능
  - BASIC 블럭셋을 직관적인 단순 3D 블럭(TRIPOD / L3D / T3D) 으로 정리

---

## Phase 3 — 확장

목표: 사용성 / 즐거움 / 재플레이 향상.

- [x] **사운드** — `src/js/audio.js` 신규. WebAudio API 의 `OscillatorNode` 로 합성한 가벼운 SFX (외부 파일 없음): 이동 / 회전 / 드롭 / 락 / 클리어 / 게임오버. on/off 토글, 첫 사용자 입력 시 `AudioContext` unlock
- [x] **테마** — `dark` / `light` / `neon` / `minimal` 4종. `data-theme` 속성 + CSS 변수 토글, `scene.background` 도 동기화
- [x] **통계** — `games / totalCubes / totalLines / bestScore / bestCombo` (한 게임 중 한 번에 클리어한 최대 라인). `localStorage`(`js-tetris-3d:stats`) 에 누적, Game Over 화면에 표시
- [x] **색맹 친화 팔레트** — Okabe-Ito 8색. `setColorPalette('standard'|'colorblind')` 런타임 스위치, 즉시 갱신
- [ ] **모바일 터치** — `OrbitControls` 와 single-touch 가 충돌해 별도 디자인 필요(가상 D-pad / 영역 분할). 다음 라운드
- [ ] **리플레이** — 입력 시퀀스 기록 / 재생. 다음 라운드
- [x] **화면 흔들림 / 파티클** — 라인 클리어 시 셀당 4개 파티클 폭발(중력 적용, 700 ms 수명) + 카메라 흔들림(라인 수에 비례, 240 ms ease-out²). 게임오버 시 더 강한 흔들림(0.4 / 480 ms)
- [x] **PWA / 오프라인** — `src/manifest.json` + `src/sw.js` + `src/icon.svg` 추가. 자체 자산은 `cache-first`, CDN three.js (`unpkg.com`) 는 `stale-while-revalidate` 로 첫 fetch 후 캐시. 첫 로드 후 오프라인에서도 게임 가능. `file://` 에서는 SW 등록을 건너뛰어 정적 서버 / HTTPS 환경에서만 동작
- [ ] **레벨별 음악** — 선택 사항, 보류

### 사용자 피드백 6차

- [x] **z 축 연속 회전 시 블럭이 위/아래로 누적 이동하는 버그 수정** — 원인은 `Math.round` 의 비대칭(`0.5 → 1`, `-0.5 → 0`). 매 회전이 `before = absCentroid()` 를 새로 계산하니 이전 round 오차가 다음 회전의 기준값에 누적되어 한쪽으로 쏠림.
  - 해결: `Block.idealCentroid` 추가 — 생성 시점의 절대 무게중심을 floating-point 로 보존. 회전은 항상 이 ideal 기준의 차이를 round 하므로 round 오차가 누적되지 않고, 회전 4번이면 원래 cells/position 으로 복귀.
  - `translate` / `setPosition` 만 idealC 를 함께 이동. `clone()` 도 idealC 를 카피.
  - `Game.placeAtSpawn` 이 `block.position = …` → `block.setPosition(...)` 으로 변경되어 spawn 후에도 idealC 가 새 위치에 동기화됨.

### 사용자 피드백 5차

- [x] **좌상단 좌표계 gizmo** — `src/js/axesGizmo.js` 신규. 별도 `WebGLRenderer` + `OrthographicCamera` 가 메인 카메라의 `position - target` 방향에서 X(빨강) / Y(초록) / Z(파랑) ArrowHelper + Sprite 라벨을 같은 각도로 매 프레임 그림
- [x] **블럭 무게중심 회전** — `Block.absCentroid()` 신규. `rotate(axis, dir)` 가 회전 전후의 절대 centroid 가 같도록 `position` 을 `Math.round(before − after)` 로 보정. 짝수 폭(예: I 4-cube) 은 round 차이 ≤ 0.5
- [x] **회전 애니메이션 옵션 (default ON)** — 우측 패널에 `Rotation animation` 체크박스. ON 일 때 `tryRotate` 성공 시 `Game.lastRotation = { axis, dir, fromAbsCentroid, toAbsCentroid }` 저장. main 이 이를 받아 mesh.quaternion 을 `rotationQuat(axis, -dir)` 에서 identity 로, position 을 fromPos→toPos 로 150ms ease-out³ 보간
- [x] **FLAT 블럭셋 재정의** — 거울쌍(S↔Z, L↔J)은 한 종류만 유지(S, L). 1-cube(I1) / 2-cube(I2) / 3-cube(I3, L3) 추가. 결과 9종 (이전 7종)
- [x] **떨어지는 블럭을 채워진 반투명 큐브로** — `createFallingBlockMesh()` 신규(`InstancedMesh` + `RoundedBoxGeometry`, opacity 0.45, depthWrite false). 이전 흰색 wireframe 제거. 인스턴스를 centroid 기준 로컬 좌표에 두고 `mesh.position` 을 절대 centroid 로 → `mesh.quaternion` 으로 무게중심 회전 가능
- [x] **wallShadow / falling 분리** — 회전 애니메이션이 mesh 에만 적용되고 그림자엔 영향 없도록 `createWallShadowGroup` / `updateWallShadowGroup` 별도 그룹

### 사용자 피드백 4차 — 우측 패널 정리

- [x] **콤보박스(`<select>`) 화** — Speed / Start Level / Pit / Block Set / Theme 다섯 옵션을 라디오 그룹에서 컴팩트한 한 줄짜리 콤보박스로
- [x] **체크박스 단순화** — 2지선다인 Color Palette / Sound 를 체크박스 한 칸으로 (`Colorblind palette` / `Sound effects`)
- [x] **NEXT 캔버스 확장** — 120×120 → 200×200 (모바일 160×160). `OrthographicCamera` frustum 도 ±3 → ±3.5 로 키워 큰 polycube 도 들어가게
- [x] **순서 재배치** — Action 버튼 → View 버튼 → NEXT → 게임 옵션 → 시각 옵션 → Controls(접힘) 순. 가장 자주 쓰는 컨트롤이 위에 위치
- [x] **Controls 안내 접힘** — `<details>` 로 기본 닫힘. 키 / 마우스 안내가 패널 높이 차지하지 않음

### 사용자 피드백 3차 (Phase 3 동시 반영)

- [x] **Speed 에 Antigravity 추가** — `dropIntervalMs(antigravity, _) = Infinity`. `update` 가 자동 드롭을 건너뛰고, 사용자가 Space (hard drop) 으로 직접 떨어뜨려야 함. Slow 보다 더 쉬운 모드
- [x] **회전 강화** — 회전 후 pit boundary 밖 셀이 있으면 자동 평행이동(`fitInsidePit`) 후 충돌 검사 → 이후 ±1 / ±2 / +y 등 124 wall-kick offsets 시도. 빈 공간이라면 거의 무조건 회전 가능, 쌓인 블럭과의 충돌만 남았을 때만 실패

---

## 미해결 / 확인 필요

레퍼런스 사이트에서 명시적으로 추출하지 못한 항목 — 실제 플레이로 검증한 뒤 본 문서를 갱신.

- [ ] FLAT / BASIC / EXTENDED 의 정확한 블록 목록과 색 매핑
- [ ] Speed × Level 조합별 정확한 드롭 간격(ms) 공식
- [ ] 점수 공식 (큐브당 / 층 클리어 / 하드 드롭 / 레벨 보너스)
- [ ] 게임 오버 판정의 정확한 시점 (스폰 충돌 vs. 한 칸 못 내려감)
- [ ] 회전 시 벽 / 바닥과 부딪히는 경우 wall-kick 여부
