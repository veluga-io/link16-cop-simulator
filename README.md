# AirShield Commander COP

`AirShield Commander COP`는 D4D Deploy for Defense APAC Seoul 해커톤을 위해 만든 React/Vite 기반 지휘관 COP 시뮬레이터 MVP입니다.

실제 Link-16 구현이 아니라, Link-16 개념에서 착안한 합성 전술 메시지와 공개 OSINT 맥락을 이용해 `메시지 수신 -> 지도 표시 -> 상황 브리핑 -> AI 전술 권고 -> 지휘관 승인/자동승인 -> AAR` 흐름을 한 화면에서 보여주는 데모입니다.

## 핵심 포지셔닝

- `OSINT-first 경량 COP 워크벤치`
- 실제 군사 데이터 없이 작전개념과 UI/UX를 빠르게 검증하는 MVP
- Palantir AIP 대체재가 아니라, AIP 도입 전 작전개념·데이터 모델·지휘관 결심 흐름을 검증하는 브라우저 기반 프로토타입

## 현재 구현된 시나리오

### DMZ 드론 침투 및 전투기 공세

1. 북측 정찰 드론이 남하하고, 확대된 센서 범위에 포착됩니다.
2. 파란 감시선, 주황 대응선, 빨간 전시선이 지도에 표시됩니다.
3. 정찰 드론이 주황선에 접근하면 아군 요격 드론이 자동 출동 가능한 상태가 됩니다.
4. 지휘관은 지도에서 아군 드론과 북측 드론을 클릭해 요격을 지정할 수 있습니다.
5. 이후 북측 전투기 100대가 파란선 근처에서 출발해 서울 방향으로 남하합니다.
6. 아군 전투기 50대는 시나리오 시작 전에는 투명한 대기 전력으로 보입니다.
7. 북측 전투기가 `BLUE WATCH` 선을 넘으면 아군 전투기 투명화가 해제되고 대응 가능 상태가 됩니다.
8. 북측 전투기가 `RED WAR` 선을 넘으면 긴급 상황으로 간주해 ROE가 자동 승인되고 아군 전투기가 출격합니다.

### 의사결정 흐름

- `BLUE WATCH`와 `RED WAR` 사이에서는 AI 전술 권고 팝업이 뜨고, 지휘관이 채택 또는 직접 판단을 선택할 수 있습니다.
- `RED WAR` 월선 이후에는 승인 대기 없이 자동 승인 처리됩니다.
- 자동 승인 시 UI에 `RED WAR 월선으로 자동 승인`된 맥락이 유지됩니다.
- 교전 결과와 판단 근거는 AAR 패널에 남습니다.

## 주요 기능

- 실시간처럼 흘러가는 합성 전술 메시지 피드
- COP 지도 위 항공기, 드론, 센서, 방어권, 경계선 표시
- `stream.snapshots[]` 기반 전투기 공세 재생
- 중복 트랙, 신뢰도, 메시지 손실, 위협 점수 표현
- AI 전술 권고 팝업과 지휘관 승인 흐름
- RED WAR 월선 자동 승인
- 시연자 콘솔의 한줄 모드 / 전체 모드 전환
- 설정 모달을 통한 보조 정보 표시 제어
- 지도 줌 레벨에 따른 아이콘 크기 조정
- 중요도가 낮은 선, 센서, 아군 대기 전력의 opacity 조정
- OSINT evidence, 자산 상태, 의사결정 로그, AAR 브리핑

## 안전 경계

이 프로젝트는 실제 Link-16, 실제 군사망, 실제 작전 데이터, 실제 ROE, 실제 무기 성능값을 구현하지 않습니다.

모든 전술 메시지, 병력 상태, 전투기 공세 데이터, 교전 효과, 의사결정 기록은 데모용 합성 데이터입니다. 공개 지도/출처 메타데이터와 합성 시나리오를 결합해 제품 개념을 보여주는 목적이며, 실제 작전 지원용으로 사용할 수 없습니다.

## 기술 스택

- React
- Vite
- TypeScript
- Leaflet
- Zustand
- Recharts
- Framer Motion
- Lucide React
- Turf.js

## 실행 방법

```bash
pnpm install
pnpm run dev
```

Vite가 출력하는 로컬 주소를 브라우저에서 열면 됩니다.

## 같은 Wi-Fi에서 화면 공유

```bash
pnpm run dev -- --host 0.0.0.0
```

이후 같은 Wi-Fi에 연결된 기기에서 아래 형식으로 접속합니다.

```text
http://<내 Mac의 로컬 IP>:5173
```

Mac의 로컬 IP는 보통 `시스템 설정 -> Wi-Fi -> 세부사항`에서 확인할 수 있습니다.

## 데이터 원칙

전투기 공세 지도 재생은 `stream.snapshots[]`만 source of truth로 사용합니다.

- 매초 `snapshot.entities`만 지도에 그립니다.
- 이전 marker를 누적하지 않습니다.
- 위치는 `lat`, `lng`, `altitudeFt`를 그대로 사용합니다.
- 프론트엔드에서 항공기 이동 경로를 다시 계산하지 않습니다.
- `snapshot.assignments`는 승인 이후 교전 연결선으로 표시합니다.
- `snapshot.effects`는 `durationSec` 동안만 격추 효과로 표시합니다.

현재 포함된 MIXED_50 스트림:

- 합성 RED 전투기 100대
- 합성 BLUE 대응 전투기 50대
- 27개 replay snapshot
- assignment line과 일시적 kill effect

## Mock 데이터 내보내기

```bash
pnpm run export:mock-data
```

생성 파일 위치:

```text
data/export/
```

주요 파일:

- `link16-cop-simulation.v2.mock.json`
- `simulation-presets.mock.json`
- `simulation-index.mock.json`
- `osint-sources.mock.json`

## 사용 가능한 스크립트

```bash
pnpm run dev
pnpm run build
pnpm run preview
pnpm run export:mock-data
pnpm run verify:data-contract
```

## OSINT 확장 방향

현재 데모는 실시간 API 의존성을 줄이기 위해 로컬 합성 데이터와 출처 메타데이터를 우선합니다.

실질적으로 연동 가치가 있는 OSINT 후보는 OpenSky Network입니다. 추천 방향은 OpenSky를 실시간 전술 트랙처럼 섞는 것이 아니라, 민항기/중립 항적 레이어로 분리해 캐시 또는 snapshot 기반으로 보여주는 것입니다.

권장 구조:

- OpenSky 항적은 `civilian / neutral` 레이어로 별도 표시
- 합성 RED/BLUE 전술 트랙과 색상, 아이콘, 범례를 분리
- live API 실패에 대비해 최근 snapshot을 로컬 fallback으로 보관
- 발표 시에는 “실제 군사 데이터가 없어도 OSINT와 합성 전술 메시지로 작전개념을 검증한다”는 메시지를 유지

## Palantir AIP 대비 메시지

이 프로젝트는 Palantir AIP를 대체하려는 플랫폼이 아닙니다.

차별점은 무거운 조직 데이터 통합이나 Ontology 운영 플랫폼을 구축하기 전에, 공개/합성 데이터만으로 지휘관 COP UX와 결심 타이밍을 하루 안에 검증할 수 있다는 점입니다.

즉, 포지셔닝은 다음과 같습니다.

```text
AIP 대체재가 아니라,
AIP 도입 전 작전개념과 데이터 흐름을 검증하는 경량 COP 워크벤치
```

## 저장소 범위

이 저장소는 `prototype/link16-cop-simulator`에 독립적으로 위치한 프론트엔드 MVP입니다.

브라우저에서 실행 가능한 시뮬레이터와 합성 데이터, 발표용 데모 흐름에 필요한 코드만 포함합니다.
