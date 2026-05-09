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

- [ ] `Pit` 클래스
  - `(width, depth, height)` 로 초기화
  - `cells: Uint8Array(width * depth * height)` (0 = 비어있음, >0 = 색 인덱스)
  - `index(x, y, z)`, `get`, `set`, `isOccupied`
  - `isInside(x, y, z)`, `isCollision(blockCells, offset)`
  - `mergeBlock(blockCells, offset, colorIdx)`
  - `clearFullLayers(): number` — 가득 찬 Y 층 모두 제거하고 위 칸을 끌어내림
- [ ] `Block` 클래스
  - `cells: Array<[x, y, z]>` (블록 로컬 좌표, 정수)
  - `position: [x, y, z]` (pit 좌표계의 원점)
  - `rotateAroundAxis(axis: 'x'|'y'|'z', dir: +1|-1)` — 정수 회전 행렬 적용 후 정규화(음수 좌표를 0 이상으로 평행이동)
  - `cellsInPit(): Array<[x, y, z]>` — 위치를 더한 절대 좌표 반환

### 1.2 블록 세트 정의

- [ ] `FLAT`: 평면(z 값이 모두 동일) 폴리오미노 — 클래식 테트리스 7종 + 추가 변형
- [ ] `BASIC`: 3D 큐브 결합 — 직선/모서리/T/L 의 3D 변형
- [ ] `EXTENDED`: 5-cube 이상의 확장 polycube
- [ ] 각 블록에 색 인덱스 / 회전 대칭군 메타데이터 추가
- [ ] (확인 필요) 레퍼런스 사이트의 정확한 블록 목록과 비교 / 정렬

### 1.3 게임 루프

- [ ] `Game` 상태 머신: `idle` / `running` / `paused` / `gameover`
- [ ] 드롭 타이머: 레벨·속도에 따른 `dropIntervalMs`
- [ ] 한 틱마다: `tryStep(0, -1, 0)` 실패 시 `mergeBlock` → `clearFullLayers` → 점수·레벨 갱신 → 다음 블록 생성
- [ ] 다음 블록(NEXT) 큐: 1~3 개 미리 보기
- [ ] 게임 오버: 새 블록이 즉시 충돌

### 1.4 입력

- [ ] 키 매핑: 화살표(이동), QWE/ASD(회전), Space(하드 드롭), B/P/Esc
- [ ] 키 리피트: 같은 키를 누르고 있을 때 일정 간격으로 반복 이동
- [ ] 입력 → `Game` 의 의도 메서드 호출 (예: `game.tryMove(dx, dy, dz)`, `game.tryRotate(axis, dir)`)

### 1.5 렌더링

- [ ] 셀 단위 큐브 인스턴스 메쉬 (또는 `InstancedMesh`)
- [ ] 색 팔레트 (블록당 1색)
- [ ] pit 와이어프레임 + 바닥 격자
- [ ] 현재 블록 / 고정된 블록 / 다음 블록 미리보기 별 레이어

### 1.6 UI / HUD

- [ ] 상단: `Cubes Played`, `High Score`, `Score`, `Level`
- [ ] 우측 패널: Rotation / Speed / Level / Pit / Block Set 라디오 그룹
- [ ] 옵션 변경 → `Game.applyOptions()` (게임 진행 중에는 다음 게임에 적용)
- [ ] `Start` / `Pause` / `Reset` 버튼
- [ ] `localStorage` 로 마지막 옵션 / 하이스코어 저장

### 1.7 점수 시스템 (레퍼런스 추정치 기반, 확인 필요)

- [ ] 한 큐브 배치당 기본 점수
- [ ] 한 층 클리어 보너스
- [ ] 동시 다층 클리어 가산점
- [ ] 하드 드롭 보너스
- [ ] (확인 필요) 레퍼런스 사이트의 정확한 공식

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
