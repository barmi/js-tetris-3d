# js-tetris-3d

Three.js 기반 3D 테트리스(Blockout 스타일) 클론. 빌드 도구 없이 순수 HTML / CSS / ES Modules 로 구성하며, 정적 파일만으로 실행됩니다.

레퍼런스: [gamereality.se/blockout](https://gamereality.se/blockout/index.php) 의 룩앤필과 옵션을 우선 동일하게 구현하고, 그 이후 본 프로젝트만의 고유 기능(마우스 기반 자유 카메라 회전 등)을 확장합니다.

> Blockout 은 Kadon Enterprises, Inc. 의 상표입니다. 본 저장소는 학습 목적의 비영리 클론 프로젝트이며, 원작/상표권자와 어떠한 제휴 관계도 없습니다.

---

## 목표

1. **1단계 — Blockout 클론**: 레퍼런스 사이트와 동일한 UI / 옵션 / 게임 규칙을 재현한다.
2. **2단계 — 자유 카메라**: 마우스로 3D 뷰를 자유롭게 회전 / 줌 / 패닝하면서 떨어지는 블록의 위치를 직관적으로 파악할 수 있게 한다. (본 프로젝트의 핵심 차별점)
3. **3단계 — 추가 기능**: 사운드, 모바일 터치, 테마, 낙하 가이드(고스트 / 그림자), 통계, 리플레이 등.

자세한 단계별 작업 항목은 [doc/PLAN.md](./doc/PLAN.md) 참고.

---

## 기술 스택

- **HTML / CSS / Vanilla JS (ES Modules)**: 빌드 단계 없음
- **[three.js](https://threejs.org/)**: import map 으로 CDN 에서 직접 로드
- **localStorage**: 하이스코어 / 마지막 옵션 저장
- 백엔드 / 번들러 / 트랜스파일러 없음

---

## 실행 방법

ES Modules 와 import map 사용 때문에 `file://` 직접 열기로는 동작하지 않습니다. 정적 파일 서버를 띄워서 열어 주세요. 서버는 **`src/` 디렉토리를 루트로** 띄워야 합니다 (`index.html` 이 `./js/...`, `./css/...` 를 상대 경로로 참조).

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

---

## 폴더 구조

```
js-tetris-3d/
├── README.md               # 본 문서
├── .gitignore
├── doc/
│   └── PLAN.md             # 단계별 작업 계획 / 체크리스트
└── src/                    # 정적 서버의 루트가 되는 디렉토리
    ├── index.html          # 진입 HTML (import map, 캔버스, 우측 옵션 패널)
    ├── css/
    │   └── styles.css      # 전체 레이아웃 / 패널 / HUD 스타일
    ├── js/
    │   ├── main.js         # 진입점, 모듈 wiring, 메인 루프
    │   ├── game.js         # 게임 상태 머신, 점수, 레벨, 드롭 타이머
    │   ├── pit.js          # 3D 점유 그리드, 평면 검사 / 제거
    │   ├── block.js        # 블록 데이터 모델, 회전 (행렬 기반)
    │   ├── blocksets.js    # FLAT / BASIC / EXTENDED 블록 세트 정의
    │   ├── scene.js        # three.js 씬 / 카메라 / 조명 / 렌더러 셋업
    │   ├── renderer.js     # 큐브 메쉬, pit 와이어프레임, 가이드
    │   ├── controls.js     # 키보드 / 터치 입력 핸들러
    │   ├── ui.js           # 우측 패널, HUD 갱신, 옵션 바인딩
    │   └── storage.js      # localStorage (하이스코어, 마지막 옵션)
    └── assets/             # (예약) 사운드 / 텍스처 / 아이콘
```

각 모듈은 ES Module 단일 책임 원칙으로 작성되며, 서로의 의존은 `main.js` 에서 명시적으로 wiring 합니다.

---

## 좌표계 규약

- **X**: pit 의 가로 (좌 → 우)
- **Z**: pit 의 세로 (앞 → 뒤)
- **Y**: pit 의 깊이(높이). **블록은 Y 가 큰 위치에서 작은 위치로 떨어집니다.**
- pit 원점 `(0, 0, 0)` 은 바닥의 한쪽 모서리. 위쪽이 `+Y`.

three.js 의 기본 좌표계(Y-up) 와 자연스럽게 맞고, "한 층이 가득 차면 사라진다" 는 규칙은 "동일한 Y 인덱스의 모든 X·Z 가 점유" 로 표현됩니다.

---

## 옵션 (레퍼런스와 동일)

| 카테고리 | 값 |
| --- | --- |
| **Pit** | `3×3×10`, `5×5×10`, `5×5×12` (가로 × 세로 × 깊이) |
| **Block Set** | `FLAT` (평면 폴리오미노), `BASIC` (기본 3D), `EXTENDED` (확장 3D) |
| **Rotation** | `Q / W / E` 와 `A / S / D` 로 X·Y·Z 축 양방향 회전 |
| **Speed** | `Slow` / `Medium` / `Fast` |
| **Level** | `0` ~ `4` (시작 레벨) |

---

## 컨트롤 (기본값)

| 키 | 동작 |
| --- | --- |
| 화살표 키 | 블록 X / Z 방향 이동 |
| `Space` | 하드 드롭 |
| `Q / W / E` | X / Y / Z 축 시계 방향 회전 |
| `A / S / D` | X / Y / Z 축 반시계 방향 회전 |
| `B` | 게임 시작 |
| `P` | 일시정지 / 재개 |
| `Esc` | 게임 종료 |
| 마우스 드래그 (2단계 이후) | 카메라 자유 회전 |
| 마우스 휠 (2단계 이후) | 줌 |

---

## 진행 상황

현재 단계: **0 — 기반 셋업**. README / PLAN / 폴더 구조 / three.js 초기 씬까지 완료. 자세한 체크리스트는 [doc/PLAN.md](./doc/PLAN.md).

---

## 라이선스

추후 결정 (잠정 MIT). 본 저장소는 학습 / 개인 프로젝트 용도이며, 상업적 배포 전에 상표 / 저작권 이슈를 다시 점검합니다.
