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

- [ ] `OrbitControls` (`three/addons/controls/OrbitControls.js`) 도입
- [ ] 회전 / 줌 / 패닝의 합리적 limits (pit 안쪽으로 들어가지 못하도록)
- [ ] 뷰 프리셋 단축키: 1=Top, 2=ISO, 3=Front, 4=Side
- [ ] 더블 클릭 시 프리셋으로 부드러운 보간(애니메이션)
- [ ] 카메라 회전 중에도 게임 입력은 정상 동작 (좌/우/앞/뒤 이동은 카메라 yaw 기준)
- [ ] **낙하 가이드**: 현재 블록의 X-Z 단면을 바닥에 투영하는 그림자 / 고스트
- [ ] **수직 가이드 라인**: 블록 셀에서 바닥까지 떨어지는 점선
- [ ] 카메라 상태 / 가이드 표시 여부를 `localStorage` 에 저장

---

## Phase 3 — 확장

목표: 사용성 / 즐거움 / 재플레이 향상.

- [ ] 사운드: 이동 / 회전 / 클리어 / 게임오버 효과음
- [ ] 모바일 터치: 스와이프 = 이동, 더블탭 = 드롭, 두 손가락 = 회전
- [ ] 테마: 라이트 / 다크 / 네온 / 미니멀
- [ ] 통계: 평균 클리어 / 최장 콤보 / 최다 큐브
- [ ] 리플레이: 입력 시퀀스 기록 / 재생
- [ ] 색맹 친화 팔레트 옵션
- [ ] 화면 흔들림 / 파티클 등 폴리시
- [ ] PWA / 오프라인 지원
- [ ] (선택) 레벨별 음악

---

## 미해결 / 확인 필요

레퍼런스 사이트에서 명시적으로 추출하지 못한 항목 — 실제 플레이로 검증한 뒤 본 문서를 갱신.

- [ ] FLAT / BASIC / EXTENDED 의 정확한 블록 목록과 색 매핑
- [ ] Speed × Level 조합별 정확한 드롭 간격(ms) 공식
- [ ] 점수 공식 (큐브당 / 층 클리어 / 하드 드롭 / 레벨 보너스)
- [ ] 게임 오버 판정의 정확한 시점 (스폰 충돌 vs. 한 칸 못 내려감)
- [ ] 회전 시 벽 / 바닥과 부딪히는 경우 wall-kick 여부
