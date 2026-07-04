# Link-16 COP Mock Data

이 폴더는 React MVP 내부의 합성 전술 메시지 mock을 BE 전달용 JSON으로 분리한 것이다. 현재 기준 스키마는 `link16-cop-simulation.v2`이며, 기존 v1 재생 필드를 유지하면서 AirShield ontology, trajectory, event log, decision record, orchestrator advisory payload를 추가한다.

## 파일

- `link16-cop-simulation.v2.mock.json`: v2 전체 replay/handoff payload
- `link16-cop-mock-data.json`: 기존 경로 호환용 v2 단일 payload
- `simulation-presets.mock.json`: v2 시뮬레이션 프리셋 배열만 분리한 파일
- `osint-sources.mock.json`: OSINT 출처 메타데이터만 분리한 파일
- `simulation-index.mock.json`: 프리셋 목록 UI와 BE 라우팅에 필요한 요약 인덱스

## 데이터 범위

- 실제 Link-16 메시지가 아니다.
- 실제 군사 데이터, 실제 방공망, 실제 무기 성능값을 포함하지 않는다.
- 모든 좌표, 메시지, 위협, 자산 상태는 MVP 데모용 합성 데이터다.
- 모든 decision/orchestrator payload는 `noExecute: true` 또는 `NO_EXECUTE_ADVISORY_ONLY` 정책을 가진다.

## BE 고도화 기준

- `messages`는 프론트 재생용 `lat/lng`, `trackHint`, `payload`를 유지하되 `entityId`, `entityType`, `side`, `threatClassId`, `eventType`, `evidenceIds`, `conceptIds`, 구조화된 `provenance`를 포함한다.
- `assets`는 `assetClassId`, `weaponClassIds`, `sensorClassIds`, `channels`, `simulationProfile.realLocationUsed=false`, `simulationProfile.realInventoryUsed=false`를 포함한다.
- `trajectorySpecs`는 화면용 synthetic trajectory이며 실제 발사 경로나 실제 항로가 아니다.
- 대량 전투기 wave 지도 replay의 source of truth는 `fighterRaidStream.snapshots[]`다. FE는 매초 가장 가까운 snapshot 하나를 고르고, 이전 tactical marker/line/effect를 누적하지 않는다.
- FE는 `snapshot.entities[]`의 `lat/lng/altitudeFt`를 그대로 지도 marker에 사용한다. `position.x/y`, `headingDeg`, `speedKts`로 항공기 이동을 다시 계산하지 않는다.
- FE는 `snapshot.assignments[]`만 active engagement line으로 그리고, `snapshot.effects[]`는 `durationSec` 동안만 표시한다. 격추된 RED-FTR는 다음 snapshot의 `entities`에서 제거된다.
- `decisionRecords`는 simulated advisory decision만 표현한다. 실제 발사/요격/무장통제 명령으로 해석하지 않는다.
- `eventLog`는 탐지, 링크 저하, 추천 생성, 자산 상태 이벤트를 AAR/LLM 요약용으로 재생한다.
- `ontologyLinks`는 `candidate_for`, `detects`, `assigned_to`, `supports_fusion_for` 같은 class-level relation만 포함한다.
- `receivedAtSec`는 0, 4, 8 ...처럼 시뮬레이션 시간축 기준으로 유지하면 FE 재생 로직과 맞다.
- 자연스러운 이동은 메시지 좌표를 직접 순간 이동시키지 않고 `trajectorySpecs[].waypoints` 사이를 FE에서 보간한다.
- 같은 항적 중복 탐지를 표현하려면 서로 다른 `trackHint`를 가까운 좌표/유사 heading으로 넣으면 된다.
- 메시지 손실/지연은 `trackHint: "LINK-LOSS"`, 낮은 `linkQuality`, payload의 `손실률 NN%` 문구로 표현한다.
- 전쟁/대량 공습 preset은 `RED_BALLISTIC_MISSILE`, `RED_CRUISE_MISSILE`, `RED_UAV_SWARM`, `RED_FIGHTER_RAID`를 포함한다.
- 현재 DMZ fighter raid demo는 `KPA-FTR-100` trajectory와 BE `MIXED_50` stream을 연결한다. FE는 BE RED-FTR 100개와 BLUE-FTR 50개를 `snapshots[]` 기반 지도 아이콘으로 렌더링하고, RED WAR 월선 판정도 현재 snapshot의 RED entity `lat` 기준으로 처리한다.

## 주요 필드

- `SimulationPresetV2`: `id`, `title`, `severity`, `regionLabel`, `summary`, `operatorFocus`, `mapTitle`, `commandPost`, `messages`, `assets`, `entities`, `trajectorySpecs`, `fighterRaidStream`, `eventLog`, `decisionRecords`, `ontologyLinks`, `orchestratorSnapshot`, `highlights`
- `TacticalMessageV2`: `id`, `sequence`, `type`, `sourceId`, `receivedAtSec`, `lat`, `lng`, `confidence`, `linkQuality`, `trackHint`, `classification`, `payload`, `entityId`, `entityType`, `side`, `threatClassId`, `eventType`, `evidenceIds`, `conceptIds`, `provenance`
- `DefenseAssetV2`: `assetId`, `name`, `layer`, `lat`, `lng`, `rangeKm`, `readiness`, `ammo`, `effect`, `assetClassId`, `weaponClassIds`, `sensorClassIds`, `channels`, `simulationProfile`
- `OsintSource`: `sourceId`, `sourceName`, `url`, `retrievedAt`, `confidence`, `usageNote`

## 재생성

```bash
cd prototype/link16-cop-simulator
node scripts/export-mock-data.mjs
node scripts/verify-data-contract.mjs
```
