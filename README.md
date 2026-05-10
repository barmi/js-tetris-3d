# js-tetris-3d

Three.js 기반 3D 테트리스(Blockout 스타일) 클론. 빌드 도구 없이 순수 HTML / CSS / ES Modules 로 구성하며, 정적 파일만으로 실행됩니다. PWA 로 설치하면 오프라인에서도 동작합니다.

레퍼런스: [gamereality.se/blockout](https://gamereality.se/blockout/index.php) 의 룩앤필과 옵션을 출발점으로 하고, 그 위에 본 프로젝트만의 차별점(마우스 자유 카메라, 자동 플레이 등)을 더합니다.

> Blockout 은 Kadon Enterprises, Inc. 의 상표입니다. 본 저장소는 학습 목적의 비영리 클론 프로젝트이며, 원작/상표권자와 어떠한 제휴 관계도 없습니다.

---

## 핵심 기능

- **3D 테트리스 게임 흐름**: 떨어지는 블럭 회전 / 이동 / 하드 드롭, 한 층이 가득 차면 사라지고 위가 한 칸 내려옴
- **마우스 자유 카메라**: OrbitControls 회전 / 줌 / Shift+드래그 패닝, 4종 시점 프리셋(Top / ISO / Front / Side) — 화살표 이동은 항상 화면 기준
- **자동 플레이 (AP)**: 패널의 `AP` 버튼으로 토글. AI 가 모든 회전 / 위치 후보를 평가해 최적 placement 를 선택하고 단계별로 실행. 화면 상단 슬라이더로 진행 속도 조절(100~2000 ms / step)
- **시각 폴리시**: 좌상단 좌표계 gizmo, 둥근 모서리 셀, 무게중심 회전 + 부드러운 보간, 라인 클리어 파티클 + 카메라 흔들림, 테마 4종(dark / light / neon / minimal), 색맹 친화 팔레트
- **사운드**: WebAudio 기반의 가벼운 SFX (외부 파일 없음, on/off 토글)
- **PWA / 오프라인**: manifest + service worker. 첫 로드 후 오프라인에서도 게임 가능

자세한 단계별 작업 항목 / 사용자 피드백 변경 이력은 [doc/PLAN.md](./doc/PLAN.md) 참고.

---

## 기술 스택

- HTML / CSS / Vanilla JS (ES Modules) — 빌드 단계 없음
- [three.js](https://threejs.org/) — import map 으로 CDN 에서 직접 로드 (`OrbitControls`, `RoundedBoxGeometry` 포함)
- WebAudio API — SFX 합성
- `localStorage` — 하이스코어 / 옵션 / 카메라 / 누적 통계
- service worker — 자체 자산 cache-first, CDN three.js stale-while-revalidate

---

## 실행 방법

ES Modules 와 import map 사용 때문에 `file://` 직접 열기로는 동작하지 않습니다. 정적 파일 서버를 띄워야 하며, 서버는 **`src/` 디렉토리를 루트로** 띄워 주세요.

### 권장: Python 3 (가벼움, 추가 설치 불필요)

```bash
python3 -m http.server 8080 --directory src
```

### 대안: Node.js (`npx`)

```bash
npx --yes http-server src -p 8080 -c-1
```

> `-c-1` 은 캐시 비활성화. 개발 중 변경 사항이 즉시 반영됩니다.

이후 브라우저에서 `http://localhost:8080` 접속.

### PWA 설치

페이지 로드 후 service worker 가 자동 등록됩니다. 모바일 Chrome / Safari 의 메뉴에서 "홈 화면에 추가" 를 누르면 standalone 앱처럼 실행되며 오프라인에서도 동작합니다.

### GitHub Pages 배포

저장소에 `.github/workflows/pages.yml` 이 포함되어 있어 `main` 브랜치 푸시 시 `src/` 디렉토리가 자동으로 GitHub Pages 에 배포됩니다.

1. 저장소 **Settings → Pages → Source** 를 `GitHub Actions` 로 변경
2. `main` 브랜치에 푸시 (또는 Actions 탭에서 워크플로우 수동 실행)
3. `https://<user>.github.io/<repo-name>/` 에서 확인

상대 경로(`./js/...`, `./sw.js`, `./manifest.json`) 와 import map 의 절대 URL CDN 만 사용하므로 서브디렉토리 prefix 가 자동으로 적용됩니다.

#### 재배포 시 캐시 갱신

자체 자산은 service worker 가 cache-first 로 응답합니다. 새 배포 후 사용자가 새 빌드를 받게 하려면 [src/sw.js](./src/sw.js) 의 `CACHE_NAME` (`js-tetris-3d-v1` → `v2` …) 을 올리세요. `activate` 시점에 옛 캐시가 자동 정리됩니다.

---

## 폴더 구조

```
js-tetris-3d/
├── README.md                   # 본 문서
├── .gitignore
├── doc/
│   └── PLAN.md                 # 단계별 작업 계획 / 사용자 피드백 이력
└── src/                        # 정적 서버의 루트가 되는 디렉토리
    ├── index.html              # 진입 HTML, import map, 패널 / HUD / AP 슬라이더
    ├── manifest.json           # PWA 메타데이터
    ├── icon.svg                # 앱 아이콘 (3D 큐브)
    ├── sw.js                   # service worker (cache-first + stale-while-revalidate)
    ├── css/
    │   └── styles.css          # 다크 / 라이트 / 네온 / 미니멀 테마 + 패널 / HUD 스타일
    ├── js/
    │   ├── main.js             # 진입점 — 모듈 wiring + 메인 루프
    │   ├── game.js             # 상태 머신, 점수, 레벨, 드롭 타이머
    │   ├── pit.js              # 3D 점유 그리드 + 평면 검사 / 제거
    │   ├── block.js            # 블럭 모델 — 정수 회전 + idealCentroid 추적
    │   ├── blocksets.js        # FLAT / BASIC / EXTENDED 정의 + 표준 / 색맹 팔레트
    │   ├── scene.js            # three.js 씬 / 카메라 / 라이팅 / 렌더러
    │   ├── renderer.js         # pit 와이어 / 격자 + 쌓인 셀 / 떨어지는 블럭 / 벽 그림자 / ghost
    │   ├── nextPreview.js      # NEXT 미리보기 별도 씬
    │   ├── axesGizmo.js        # 좌상단 X / Y / Z 좌표계 gizmo
    │   ├── effects.js          # 라인 클리어 파티클
    │   ├── audio.js            # WebAudio SFX (move / rotate / lock / clear / gameover)
    │   ├── controls.js         # 키보드 입력 + DAS 키 리피트
    │   ├── cameraControls.js   # OrbitControls + 프리셋 보간 + 화면 기준 이동 / 카메라 흔들림
    │   ├── autoPlay.js         # 자동 플레이 — 회전 BFS + 휴리스틱 평가
    │   ├── ui.js               # 우측 패널 / HUD / 오버레이 / AP 슬라이더 바인딩
    │   └── storage.js          # localStorage (하이스코어 / 옵션 / 카메라 / 통계)
    └── assets/                 # (예약) 사운드 / 텍스처 / 아이콘
```

---

## 좌표계 규약

- **X**: pit 의 가로 (좌 → 우)
- **Z**: pit 의 세로 (앞 → 뒤)
- **Y**: pit 의 깊이(높이). 블럭은 Y 가 큰 위치에서 작은 위치로 떨어집니다.
- pit 원점 `(0, 0, 0)` 은 바닥의 한쪽 모서리. 위쪽이 `+Y`.

화면 좌상단의 좌표계 gizmo 가 메인 카메라와 동기화되어 X / Y / Z 가 화면에서 어디를 가리키는지 보여줍니다.

---

## 옵션 (우측 패널)

| 카테고리 | 값 |
| --- | --- |
| **Speed** | `Antigravity` (자동 드롭 없음, **기본값**) / `Slow` 3000 ms / `Medium` 2000 ms / `Fast` 1200 ms — level 마다 ×0.10 가속, 최저 ×0.40 |
| **Start Level** | `0` ~ `4` (시작 레벨) |
| **Pit** | `3×3×10` / `5×5×10` / `5×5×12` (가로 × 세로 × 깊이) |
| **Block Set** | `Flat` (평면 9종) / `Basic` (FLAT + 단순 3D 3종) / `Extended` (BASIC + 큰 polycube 3종) |
| **Theme** | `Dark` / `Light` / `Neon` / `Minimal` |
| **Rotation animation** | 체크박스 — 회전 시 무게중심 기준 부드러운 보간 (default ON) |
| **Colorblind palette** | 체크박스 — Okabe-Ito 8색 |
| **Sound effects** | 체크박스 — WebAudio SFX 토글 (default ON) |

---

## 컨트롤

### 키보드

| 키 | 동작 |
| --- | --- |
| 화살표 키 | 블럭 X / Z 방향 이동 (카메라 yaw 기준) |
| `Space` | 하드 드롭 |
| `Q / W / E` | X / Y / Z 축 시계 방향 회전 |
| `A / S / D` | X / Y / Z 축 반시계 방향 회전 |
| `B` | 게임 시작 |
| `P` | 일시정지 / 재개 |
| `Esc` | 게임 종료 |
| `1 / 2 / 3 / 4` | Top / ISO / Front / Side 시점 프리셋 |

### 마우스 / 터치 (카메라)

| 동작 | 결과 |
| --- | --- |
| 드래그 | 시점 회전 |
| 휠 | 줌 |
| Shift + 드래그 | 패닝 |

### 자동 플레이 (AP)

- 우측 패널의 `AP` 버튼으로 토글. 활성화되면 게임이 자동 시작되고 AI 가 매 step 마다 회전 / X 이동 / Z 이동 / drop 중 하나를 수행합니다.
- 활성 중에는 화살표 / 회전 / 드롭 키 입력이 무시됩니다 (시점 / 일시정지 / 시작-정지 제외).
- 게임 화면 상단 슬라이더로 step 간격을 100 ms ~ 2000 ms 사이에서 조절 가능. 게임오버 시 자동으로 비활성화됩니다.
- AI 가 평가하는 항목: 라인 클리어 보상, 누적 / 최대 높이 페널티, 구멍 페널티, 표면 거칠기 페널티.

### 모바일 가상 키보드

가로 폭 720 px 이하(주로 폰)일 때 게임 화면 아래에 가상 키보드가 자동으로 나타납니다. 그 아래에 옵션 패널이 이어집니다 — 화면 전체가 세로로 스크롤되는 한 페이지 레이아웃.

| 영역 | 버튼 | 매핑 |
| --- | --- | --- |
| D-pad (좌측) | `↑ ← → ↓` | 화살표 키와 동일 (카메라 yaw 기준 한 칸 이동) |
| 회전 (우측, 3 × 2) | `X+ Y+ Z+ / X− Y− Z−` | `Q W E / A S D` 와 동일 |
| 하단 풀 폭 | `DROP` | Space (하드 드롭) |

자동 플레이 활성 시 가상 키보드 입력도 무시됩니다 (키보드와 동일한 정책).

---

## 자동 플레이 알고리즘

1. 새 블럭이 spawn 되면 BFS 로 모든 unique 회전 pose 를 열거 (cells 정규화 후 키 비교로 중복 제거)
2. 각 pose × 모든 X-Z 위치에 대해 hard-drop 시뮬레이션
3. 가상의 grid 에서 라인 클리어 시뮬레이션 후, 다음 휴리스틱으로 점수 계산:

   ```
   score = cleared·1000
         + cleared²·500
         − holes·80
         − bumpiness·5
         − aggHeight·0.5
         − maxHeight·3
   ```

4. 최고 점수 placement 의 회전 시퀀스 + 최종 위치를 기억
5. step 마다 한 가지 동작만 수행: 회전 한 번 → X 한 칸 → Z 한 칸 → 정렬 완료 시 hard drop
6. 회전 / 이동이 막히면 즉시 hard drop 후 다음 블럭에서 재계산

---

## 점수 시스템

- 큐브 배치: 1 점 / cube
- 한 번에 N 층 클리어: `[0, 100, 250, 450, 700, 1000]` 의 N 번째 항
- 하드 드롭: 떨어진 거리 × 2
- 레벨업: 누적 클리어 라인 5 마다 시작 레벨 +1, 최대 19

게임오버 시 누적 통계 (`games / totalCubes / totalLines / bestScore / bestCombo`) 가 `localStorage` 에 저장되고 화면에 표시됩니다.

---

## 진행 상황

- **Phase 0** (기반 셋업) — 완료
- **Phase 1** (Blockout 클론) — 완료
- **Phase 1.8** (시각 폴리시) — 완료
- **Phase 2** (마우스 자유 카메라 + 사용자 피드백 1~2차) — 완료
- **Phase 3** (사운드 / 테마 / 통계 / 색맹 팔레트 / 파티클 + 흔들림 / PWA / 자동 플레이) — 거의 완료
- 보류: 모바일 가상 D-pad, 리플레이, 레벨별 음악

자세한 체크리스트는 [doc/PLAN.md](./doc/PLAN.md).

---

## 라이선스

추후 결정 (잠정 MIT). 본 저장소는 학습 / 개인 프로젝트 용도이며, 상업적 배포 전에 상표 / 저작권 이슈를 다시 점검합니다.
