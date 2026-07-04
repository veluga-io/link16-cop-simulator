import { fighterRaidMixed50 } from "./generated/fighterRaidMixed50";
import type {
  AirshieldEntity,
  AirshieldEventLogEntry,
  CommandPost,
  DecisionRecord,
  DefenseAsset,
  EntityType,
  OntologyLink,
  OrchestratorTreeSnapshot,
  OsintSource,
  Side,
  SimulationPreset,
  TacticalEventType,
  TacticalMessage,
  TacticalProvenance,
  TrajectorySpec,
} from "./types";

export const commandPost: CommandPost = {
  lat: 37.76,
  lng: 128.92,
  label: "EAST SEA C2 NODE",
};

export const osintSources: OsintSource[] = [
  {
    sourceId: "osint-natural-earth",
    sourceName: "Natural Earth",
    url: "https://www.naturalearthdata.com/",
    retrievedAt: "2026-07-04",
    confidence: 92,
    usageNote: "해안선과 지역 맥락 출처",
  },
  {
    sourceId: "osint-ourairports",
    sourceName: "OurAirports",
    url: "https://ourairports.com/data/",
    retrievedAt: "2026-07-04",
    confidence: 88,
    usageNote: "공항/활주로와 민간 항공 맥락 출처",
  },
  {
    sourceId: "osint-osm-carto",
    sourceName: "OpenStreetMap / CARTO",
    url: "https://www.openstreetmap.org/",
    retrievedAt: "2026-07-04",
    confidence: 86,
    usageNote: "지도 타일과 지형 맥락 출처",
  },
  {
    sourceId: "osint-adsb-schema",
    sourceName: "Public ADS-B message pattern",
    url: "https://opensky-network.org/",
    retrievedAt: "2026-07-04",
    confidence: 74,
    usageNote: "항적 메시지 구조 참고",
  },
  {
    sourceId: "synthetic-rf-node",
    sourceName: "Synthetic RF node",
    url: "local://synthetic-rf-node",
    retrievedAt: "2026-07-04",
    confidence: 68,
    usageNote: "재밍과 링크 저하 시나리오 입력",
  },
];

export const baselineMessages: TacticalMessage[] = [
  {
    id: "MSG-001",
    sequence: 1,
    type: "PPLI",
    sourceId: "F-01",
    sourceLabel: "F-01 PPLI",
    receivedAtSec: 0,
    timestamp: "T+00:00",
    lat: 37.88,
    lng: 129.18,
    altitudeFt: 28000,
    speedKts: 430,
    headingDeg: 52,
    confidence: 95,
    linkQuality: 94,
    trackHint: "F-01",
    classification: "friendly",
    payload: "아군기 F-01 위치 갱신, 동해 감시 궤도 진입",
    provenance: ["osint-osm-carto"],
  },
  {
    id: "MSG-002",
    sequence: 2,
    type: "PPLI",
    sourceId: "F-02",
    sourceLabel: "F-02 PPLI",
    receivedAtSec: 4,
    timestamp: "T+00:04",
    lat: 37.66,
    lng: 129.08,
    altitudeFt: 27000,
    speedKts: 416,
    headingDeg: 48,
    confidence: 94,
    linkQuality: 93,
    trackHint: "F-02",
    classification: "friendly",
    payload: "아군기 F-02 위치 갱신, F-01 남측 감시 축 보강",
    provenance: ["osint-osm-carto"],
  },
  {
    id: "MSG-003",
    sequence: 3,
    type: "PPLI",
    sourceId: "UAV-03",
    sourceLabel: "UAV-03 PPLI",
    receivedAtSec: 8,
    timestamp: "T+00:08",
    lat: 38.04,
    lng: 129.42,
    altitudeFt: 18000,
    speedKts: 122,
    headingDeg: 66,
    confidence: 91,
    linkQuality: 89,
    trackHint: "UAV-03",
    classification: "friendly",
    payload: "UAV-03 감시 임무 상태 보고, 동해 북동 감시선 유지",
    provenance: ["osint-natural-earth", "osint-osm-carto"],
  },
  {
    id: "MSG-004",
    sequence: 4,
    type: "SURVEILLANCE_TRACK",
    sourceId: "UAV-03",
    sourceLabel: "UAV-03 sensor",
    receivedAtSec: 12,
    timestamp: "T+00:12",
    lat: 38.28,
    lng: 130.03,
    altitudeFt: 6200,
    speedKts: 214,
    headingDeg: 248,
    confidence: 82,
    linkQuality: 88,
    trackHint: "T-201",
    classification: "unknown",
    payload: "UAV-03이 미상 항적 T-201 탐지, 서진 접근 가능성",
    provenance: ["osint-natural-earth", "osint-adsb-schema"],
  },
  {
    id: "MSG-005",
    sequence: 5,
    type: "SURVEILLANCE_TRACK",
    sourceId: "RADAR-GND-12",
    sourceLabel: "Ground radar R-12",
    receivedAtSec: 16,
    timestamp: "T+00:16",
    lat: 38.31,
    lng: 129.98,
    altitudeFt: 6400,
    speedKts: 219,
    headingDeg: 244,
    confidence: 76,
    linkQuality: 83,
    trackHint: "T-877",
    classification: "unknown",
    payload: "지상 레이더 R-12가 미상 항적 T-877 탐지, T-201과 근접",
    provenance: ["osint-natural-earth"],
  },
  {
    id: "MSG-006",
    sequence: 6,
    type: "EW_STATUS",
    sourceId: "R-12",
    sourceLabel: "Threat radar R-12",
    receivedAtSec: 20,
    timestamp: "T+00:20",
    lat: 38.48,
    lng: 129.78,
    altitudeFt: 0,
    speedKts: 0,
    headingDeg: 0,
    confidence: 71,
    linkQuality: 78,
    trackHint: "R-12",
    classification: "suspect",
    payload: "위협 레이더 R-12 활성화, T-201/T-877 접근 축과 RF 패턴 중첩",
    provenance: ["synthetic-rf-node", "osint-natural-earth"],
  },
  {
    id: "MSG-007",
    sequence: 7,
    type: "EW_STATUS",
    sourceId: "LINK-MONITOR",
    sourceLabel: "Link quality monitor",
    receivedAtSec: 24,
    timestamp: "T+00:24",
    lat: 37.96,
    lng: 129.24,
    altitudeFt: 0,
    speedKts: 0,
    headingDeg: 0,
    confidence: 62,
    linkQuality: 57,
    trackHint: "LINK-LOSS",
    classification: "suspect",
    payload: "메시지 손실률 25% 발생, UAV-03과 R-12 사이 구간 지연 증가",
    provenance: ["synthetic-rf-node"],
  },
  {
    id: "MSG-008",
    sequence: 8,
    type: "PPLI",
    sourceId: "F-01",
    sourceLabel: "F-01 PPLI",
    receivedAtSec: 28,
    timestamp: "T+00:28",
    lat: 37.93,
    lng: 129.32,
    altitudeFt: 28100,
    speedKts: 428,
    headingDeg: 54,
    confidence: 93,
    linkQuality: 89,
    trackHint: "F-01",
    classification: "friendly",
    payload: "F-01 위치 갱신, T-201/T-877 식별 지원 가능 거리 진입",
    provenance: ["osint-osm-carto"],
  },
  {
    id: "MSG-009",
    sequence: 9,
    type: "SURVEILLANCE_TRACK",
    sourceId: "RADAR-GND-12",
    sourceLabel: "Ground radar R-12",
    receivedAtSec: 32,
    timestamp: "T+00:32",
    lat: 38.21,
    lng: 129.72,
    altitudeFt: 9200,
    speedKts: 245,
    headingDeg: 232,
    confidence: 88,
    linkQuality: 86,
    trackHint: "HOST-331",
    classification: "hostile",
    payload: "고위협 항적 HOST-331 하강 접근, 방어 구역 외곽 진입",
    provenance: ["osint-ourairports", "osint-natural-earth"],
  },
  {
    id: "MSG-010",
    sequence: 10,
    type: "ASSET_STATUS",
    sourceId: "SAM-L2-B",
    sourceLabel: "Asset telemetry",
    receivedAtSec: 36,
    timestamp: "T+00:36",
    lat: 37.78,
    lng: 128.96,
    altitudeFt: 0,
    speedKts: 0,
    headingDeg: 0,
    confidence: 91,
    linkQuality: 92,
    trackHint: "ASSET-L2-B",
    classification: "friendly",
    payload: "방공 Bravo 준비 완료, HOST-331 대응 가능",
    provenance: ["osint-osm-carto"],
  },
  {
    id: "MSG-011",
    sequence: 11,
    type: "ENGAGEMENT_RECOMMENDATION",
    sourceId: "COP-AI-L2",
    sourceLabel: "COP recommendation node",
    receivedAtSec: 40,
    timestamp: "T+00:40",
    lat: 38.21,
    lng: 129.72,
    altitudeFt: 9200,
    speedKts: 245,
    headingDeg: 232,
    confidence: 84,
    linkQuality: 86,
    trackHint: "HOST-331",
    classification: "hostile",
    payload: "대응 후보: HOST-331은 방공 Bravo로 추적 유지, 지휘관 결심 필요",
    provenance: ["osint-ourairports", "osint-natural-earth"],
  },
  {
    id: "MSG-012",
    sequence: 12,
    type: "SURVEILLANCE_TRACK",
    sourceId: "UAV-03",
    sourceLabel: "UAV-03 sensor",
    receivedAtSec: 44,
    timestamp: "T+00:44",
    lat: 38.16,
    lng: 129.58,
    altitudeFt: 6500,
    speedKts: 228,
    headingDeg: 236,
    confidence: 74,
    linkQuality: 61,
    trackHint: "T-201",
    classification: "unknown",
    payload: "UAV-03 추적 유지, 중복 트랙 병합 후 confidence 재산정 필요",
    provenance: ["osint-natural-earth", "osint-adsb-schema"],
  },
];

export const baseAssets: DefenseAsset[] = [
  {
    assetId: "L1-MSAM-A",
    name: "Interceptor Alpha",
    shortName: "INT-A",
    layer: "L1",
    lat: 37.72,
    lng: 128.78,
    rangeKm: 86,
    readiness: 89,
    ammo: 9,
    effect: "intercept",
  },
  {
    assetId: "L2-SAM-B",
    name: "Area Defense Bravo",
    shortName: "ADF-B",
    layer: "L2",
    lat: 37.82,
    lng: 129.02,
    rangeKm: 54,
    readiness: 91,
    ammo: 7,
    effect: "intercept",
  },
  {
    assetId: "EW-JAM-C",
    name: "EW Support Charlie",
    shortName: "EW-C",
    layer: "EW",
    lat: 37.58,
    lng: 128.96,
    rangeKm: 62,
    readiness: 84,
    ammo: 4,
    effect: "soft-kill",
  },
  {
    assetId: "SENSOR-RELAY-D",
    name: "Sensor Relay Delta",
    shortName: "RLY-D",
    layer: "L3",
    lat: 38.04,
    lng: 129.22,
    rangeKm: 70,
    readiness: 87,
    ammo: 6,
    effect: "track-custody",
  },
];

const trainingCommandPost: CommandPost = {
  lat: 37.82,
  lng: 128.86,
  label: "TRAINING C2 NODE",
};

const westCommandPost: CommandPost = {
  lat: 37.68,
  lng: 126.33,
  label: "WEST SEA C2 NODE",
};

const emergencyCommandPost: CommandPost = {
  lat: 37.54,
  lng: 127.06,
  label: "JOINT AIR DEFENSE NODE",
};

const trainingAssets: DefenseAsset[] = [
  { ...baseAssets[0], lat: 37.68, lng: 128.72, readiness: 96, ammo: 10 },
  { ...baseAssets[1], lat: 37.84, lng: 128.98, readiness: 94, ammo: 8 },
  { ...baseAssets[2], lat: 37.52, lng: 128.88, readiness: 90, ammo: 5 },
  { ...baseAssets[3], lat: 38.0, lng: 129.14, readiness: 93, ammo: 6 },
];

const westAssets: DefenseAsset[] = [
  { ...baseAssets[0], lat: 37.56, lng: 126.12, readiness: 86, ammo: 8 },
  { ...baseAssets[1], lat: 37.78, lng: 126.42, readiness: 79, ammo: 5 },
  { ...baseAssets[2], lat: 37.42, lng: 126.28, readiness: 88, ammo: 4 },
  { ...baseAssets[3], lat: 37.9, lng: 126.58, readiness: 91, ammo: 6 },
];

const emergencyAssets: DefenseAsset[] = [
  { ...baseAssets[0], lat: 37.42, lng: 126.92, readiness: 82, ammo: 6 },
  { ...baseAssets[1], lat: 37.66, lng: 127.18, readiness: 58, ammo: 2 },
  { ...baseAssets[2], lat: 37.31, lng: 127.08, readiness: 76, ammo: 3 },
  { ...baseAssets[3], lat: 37.86, lng: 127.36, readiness: 69, ammo: 4 },
];

const dmzCommandPost: CommandPost = {
  lat: 37.58,
  lng: 127.03,
  label: "CAPITAL C2 NODE",
};

const dmzAssets: DefenseAsset[] = [
  {
    ...baseAssets[0],
    assetId: "BLUE-FTR-CAP-01",
    name: "ROK Fighter CAP",
    shortName: "FTR-CAP",
    lat: 37.44,
    lng: 126.95,
    readiness: 84,
    ammo: 150,
    rangeKm: 96,
  },
  {
    ...baseAssets[1],
    assetId: "BLUE-ATK-DRONE-01",
    name: "Attack Drone Falcon",
    shortName: "ATK-DRN",
    lat: 37.62,
    lng: 127.14,
    readiness: 92,
    ammo: 24,
    rangeKm: 42,
    effect: "intercept",
    assetClassId: "BLUE_ATTACK_DRONE_CLASS",
  },
  {
    ...baseAssets[2],
    assetId: "BLUE-EW-GUARD-01",
    name: "EW Guard Charlie",
    shortName: "EW-G",
    lat: 37.48,
    lng: 127.26,
    readiness: 78,
    ammo: 8,
    rangeKm: 68,
  },
  {
    ...baseAssets[3],
    assetId: "BLUE-SENSOR-NET-01",
    name: "Sensor Net Delta",
    shortName: "SEN-NET",
    lat: 37.82,
    lng: 127.38,
    readiness: 88,
    ammo: 10,
    rangeKm: 180,
  },
];

const dmzDroneEscalationMessages: TacticalMessage[] = [
  {
    id: "DMZ-001",
    sequence: 1,
    type: "PPLI",
    sourceId: "CAP-ROK-01",
    sourceLabel: "ROK fighter CAP",
    receivedAtSec: 0,
    timestamp: "T+00:00",
    lat: 37.46,
    lng: 126.98,
    altitudeFt: 26000,
    speedKts: 410,
    headingDeg: 30,
    confidence: 96,
    linkQuality: 94,
    trackHint: "ROK-CAP-01",
    classification: "friendly",
    payload: "수도권 CAP 항공기 위치 갱신, 파란 감시선 이남 방어축 유지",
    provenance: ["osint-osm-carto"],
  },
  {
    id: "DMZ-002",
    sequence: 2,
    type: "ASSET_STATUS",
    sourceId: "BLUE-ATK-DRONE-01",
    sourceLabel: "Attack drone telemetry",
    receivedAtSec: 4,
    timestamp: "T+00:04",
    lat: 37.62,
    lng: 127.14,
    altitudeFt: 0,
    speedKts: 0,
    headingDeg: 0,
    confidence: 93,
    linkQuality: 91,
    trackHint: "BLUE-ATK-DRONE-01",
    classification: "friendly",
    payload: "공격형 드론 Falcon 대기. 지휘관이 드론 아이콘을 선택한 뒤 표적을 지정하면 출격 연결선이 생성됨",
    provenance: ["synthetic-rf-node"],
  },
  {
    id: "DMZ-003",
    sequence: 3,
    type: "SURVEILLANCE_TRACK",
    sourceId: "BLUE-SENSOR-NET-01",
    sourceLabel: "DMZ sensor net",
    receivedAtSec: 8,
    timestamp: "T+00:08",
    lat: 38.72,
    lng: 127.32,
    altitudeFt: 6200,
    speedKts: 94,
    headingDeg: 192,
    confidence: 82,
    linkQuality: 88,
    trackHint: "KPA-REC-01",
    classification: "suspect",
    payload: "파란 감시선 북측에서 북한 측 정찰 드론 KPA-REC-01 탐지",
    provenance: ["osint-natural-earth", "synthetic-rf-node"],
    entityType: "UAV",
    side: "RED",
    threatClassId: "RED_UAV_SWARM",
    representedCount: 1,
  },
  {
    id: "DMZ-004",
    sequence: 4,
    type: "SURVEILLANCE_TRACK",
    sourceId: "BLUE-SENSOR-NET-01",
    sourceLabel: "DMZ sensor net",
    receivedAtSec: 16,
    timestamp: "T+00:16",
    lat: 38.42,
    lng: 127.24,
    altitudeFt: 5900,
    speedKts: 105,
    headingDeg: 188,
    confidence: 78,
    linkQuality: 84,
    trackHint: "KPA-REC-01",
    classification: "hostile",
    payload: "정찰 드론이 주황 대응선으로 접근. 상황실은 공격형 드론 출격 지정을 준비",
    provenance: ["osint-natural-earth", "synthetic-rf-node"],
    entityType: "UAV",
    side: "RED",
    threatClassId: "RED_UAV_SWARM",
    representedCount: 1,
  },
  {
    id: "DMZ-005",
    sequence: 5,
    type: "EW_STATUS",
    sourceId: "DMZ-LINK-MONITOR",
    sourceLabel: "DMZ link monitor",
    receivedAtSec: 20,
    timestamp: "T+00:20",
    lat: 38.28,
    lng: 127.18,
    altitudeFt: 0,
    speedKts: 0,
    headingDeg: 0,
    confidence: 86,
    linkQuality: 78,
    trackHint: "LINK-LOSS",
    classification: "suspect",
    payload: "주황 대응선 인근 링크 손실률 18%, 표적 custody 유지 필요",
    provenance: ["synthetic-rf-node"],
  },
  {
    id: "DMZ-006",
    sequence: 6,
    type: "SURVEILLANCE_TRACK",
    sourceId: "BLUE-SENSOR-NET-01",
    sourceLabel: "DMZ sensor net",
    receivedAtSec: 24,
    timestamp: "T+00:24",
    lat: 38.24,
    lng: 127.16,
    altitudeFt: 5600,
    speedKts: 118,
    headingDeg: 184,
    confidence: 72,
    linkQuality: 76,
    trackHint: "KPA-REC-01",
    classification: "hostile",
    payload: "정찰 드론이 주황 대응선에 근접. 공격형 드론 Falcon 지정을 권장",
    provenance: ["osint-natural-earth", "synthetic-rf-node"],
    entityType: "UAV",
    side: "RED",
    threatClassId: "RED_UAV_SWARM",
    representedCount: 1,
  },
  {
    id: "DMZ-006A",
    sequence: 6.1,
    type: "SURVEILLANCE_TRACK",
    sourceId: "BLUE-SENSOR-NET-01",
    sourceLabel: "DMZ sensor net",
    receivedAtSec: 28,
    timestamp: "T+00:28",
    lat: 38.02,
    lng: 127.12,
    altitudeFt: 5400,
    speedKts: 124,
    headingDeg: 183,
    confidence: 67,
    linkQuality: 70,
    trackHint: "KPA-REC-01",
    classification: "hostile",
    payload: "대응 실패: KPA-REC-01이 빨간 전시선 직전까지 남하. 공격형 드론 지정 시간이 초과됨",
    provenance: ["osint-natural-earth", "synthetic-rf-node"],
    entityType: "UAV",
    side: "RED",
    threatClassId: "RED_UAV_SWARM",
    representedCount: 1,
    requiresManualInterceptMissed: true,
  },
  {
    id: "DMZ-006B",
    sequence: 6.2,
    type: "EW_STATUS",
    sourceId: "DMZ-LINK-MONITOR",
    sourceLabel: "DMZ link monitor",
    receivedAtSec: 32,
    timestamp: "T+00:32",
    lat: 37.9,
    lng: 127.1,
    altitudeFt: 0,
    speedKts: 0,
    headingDeg: 0,
    confidence: 74,
    linkQuality: 58,
    trackHint: "KPA-REC-01",
    classification: "hostile",
    payload: "미대응 결과: 정찰 드론이 ISR burst를 송신하고 북측 비행장 watch node가 전투기 출격 징후를 보고",
    provenance: ["synthetic-rf-node", "osint-ourairports"],
    entityType: "UAV",
    side: "RED",
    threatClassId: "RED_UAV_SWARM",
    representedCount: 1,
    requiresManualInterceptMissed: true,
  },
  {
    id: "DMZ-007",
    sequence: 7,
    type: "SURVEILLANCE_TRACK",
    sourceId: "NORTH-AIRFIELD-OSINT",
    sourceLabel: "Synthetic north airfield watch",
    receivedAtSec: 28,
    timestamp: "T+00:28",
    lat: 38.31,
    lng: 127.02,
    altitudeFt: 16000,
    speedKts: 430,
    headingDeg: 176,
    confidence: 81,
    linkQuality: 72,
    trackHint: "KPA-FTR-100",
    classification: "hostile",
    payload: "정찰 드론 대응 국면 이후 북측 전투기 100대 출격. 주황 대응선 남측으로 접근하며 RED WAR 월선 전 집단 항적 KPA-FTR-100 형성",
    provenance: ["osint-natural-earth", "osint-ourairports", "synthetic-rf-node"],
    entityType: "FIGHTER_RAID",
    side: "RED",
    threatClassId: "RED_FIGHTER_RAID",
    representedCount: 100,
    requiresManualIntercept: true,
  },
  {
    id: "DMZ-008",
    sequence: 8,
    type: "SURVEILLANCE_TRACK",
    sourceId: "NORTH-AIRFIELD-OSINT",
    sourceLabel: "Synthetic north airfield watch",
    receivedAtSec: 32,
    timestamp: "T+00:32",
    lat: 38.22,
    lng: 127.03,
    altitudeFt: 17000,
    speedKts: 438,
    headingDeg: 178,
    confidence: 82,
    linkQuality: 71,
    trackHint: "KPA-FTR-100",
    classification: "hostile",
    payload: "북측 전투기 wave 남하. 집단 편대가 주황 대응선을 지나 빨간 전시선으로 접근",
    provenance: ["osint-natural-earth", "osint-ourairports", "synthetic-rf-node"],
    entityType: "FIGHTER_RAID",
    side: "RED",
    threatClassId: "RED_FIGHTER_RAID",
    representedCount: 100,
    requiresManualIntercept: true,
  },
  {
    id: "DMZ-009",
    sequence: 9,
    type: "SURVEILLANCE_TRACK",
    sourceId: "NORTH-AIRFIELD-OSINT",
    sourceLabel: "Synthetic north airfield watch",
    receivedAtSec: 36,
    timestamp: "T+00:36",
    lat: 38.13,
    lng: 127.04,
    altitudeFt: 17800,
    speedKts: 446,
    headingDeg: 179,
    confidence: 83,
    linkQuality: 70,
    trackHint: "KPA-FTR-100",
    classification: "hostile",
    payload: "북측 전투기 wave RED WAR 북측 접근. 편대 폭이 확장됨",
    provenance: ["osint-natural-earth", "osint-ourairports", "synthetic-rf-node"],
    entityType: "FIGHTER_RAID",
    side: "RED",
    threatClassId: "RED_FIGHTER_RAID",
    representedCount: 100,
    requiresManualIntercept: true,
  },
  {
    id: "DMZ-010",
    sequence: 10,
    type: "SURVEILLANCE_TRACK",
    sourceId: "NORTH-AIRFIELD-OSINT",
    sourceLabel: "Synthetic north airfield watch",
    receivedAtSec: 40,
    timestamp: "T+00:40",
    lat: 38.05,
    lng: 127.05,
    altitudeFt: 18600,
    speedKts: 452,
    headingDeg: 180,
    confidence: 84,
    linkQuality: 69,
    trackHint: "KPA-FTR-100",
    classification: "hostile",
    payload: "북측 전투기 wave RED WAR 직전까지 남하. 자동 요격 승인 조건 임박",
    provenance: ["osint-natural-earth", "osint-ourairports", "synthetic-rf-node"],
    entityType: "FIGHTER_RAID",
    side: "RED",
    threatClassId: "RED_FIGHTER_RAID",
    representedCount: 100,
    requiresManualIntercept: true,
  },
  {
    id: "DMZ-011",
    sequence: 11,
    type: "SURVEILLANCE_TRACK",
    sourceId: "NORTH-AIRFIELD-OSINT",
    sourceLabel: "Synthetic north airfield watch",
    receivedAtSec: 48,
    timestamp: "T+00:48",
    lat: 37.99,
    lng: 127.06,
    altitudeFt: 19000,
    speedKts: 456,
    headingDeg: 181,
    confidence: 84,
    linkQuality: 68,
    trackHint: "KPA-FTR-100",
    classification: "hostile",
    payload: "북측 전투기 wave 선두 요소 RED WAR 월선. 사전 정의된 자동 요격 승인 조건 충족",
    provenance: ["osint-natural-earth", "osint-ourairports", "synthetic-rf-node"],
    entityType: "FIGHTER_RAID",
    side: "RED",
    threatClassId: "RED_FIGHTER_RAID",
    representedCount: 100,
    requiresManualIntercept: true,
  },
  {
    id: "DMZ-012",
    sequence: 12,
    type: "ENGAGEMENT_RECOMMENDATION",
    sourceId: "AIRSHIELD-RECOMMENDER",
    sourceLabel: "AirShield recommendation node",
    receivedAtSec: 48,
    timestamp: "T+00:48",
    lat: 37.99,
    lng: 127.02,
    altitudeFt: 18000,
    speedKts: 448,
    headingDeg: 178,
    confidence: 84,
    linkQuality: 70,
    trackHint: "KPA-FTR-100",
    classification: "hostile",
    payload: "긴급 대응 후보: 북측 전투기 100대가 RED WAR를 월선해 사전 정의된 자동 요격 승인 조건 충족. 남측 전투기 50대 자동 매칭과 공격 드론 잔여 자원, EW Guard 분산 운용 권고 필요",
    provenance: ["osint-natural-earth", "osint-ourairports", "synthetic-rf-node"],
    entityType: "FIGHTER_RAID",
    side: "RED",
    threatClassId: "RED_FIGHTER_RAID",
    representedCount: 100,
    requiresManualIntercept: true,
  },
  {
    id: "DMZ-013",
    sequence: 13,
    type: "SURVEILLANCE_TRACK",
    sourceId: "AIRSHIELD-RECOMMENDER",
    sourceLabel: "AirShield escalation monitor",
    receivedAtSec: 52,
    timestamp: "T+00:52",
    lat: 37.42,
    lng: 127.04,
    altitudeFt: 18800,
    speedKts: 462,
    headingDeg: 181,
    confidence: 78,
    linkQuality: 60,
    trackHint: "KPA-FTR-100",
    classification: "hostile",
    payload: "전투기 미대응: BLUE-FTR 대응기가 지정되지 않아 100대 집단 항적이 수도권 방공권 외곽까지 압박",
    provenance: ["osint-natural-earth", "osint-ourairports", "synthetic-rf-node"],
    entityType: "FIGHTER_RAID",
    side: "RED",
    threatClassId: "RED_FIGHTER_RAID",
    representedCount: 100,
    requiresFighterResponseMissed: true,
  },
  {
    id: "DMZ-014",
    sequence: 14,
    type: "ENGAGEMENT_RECOMMENDATION",
    sourceId: "AIRSHIELD-RECOMMENDER",
    sourceLabel: "AirShield escalation monitor",
    receivedAtSec: 56,
    timestamp: "T+00:56",
    lat: 37.24,
    lng: 127.06,
    altitudeFt: 19200,
    speedKts: 468,
    headingDeg: 182,
    confidence: 76,
    linkQuality: 54,
    trackHint: "KPA-FTR-100",
    classification: "hostile",
    payload: "미대응 결과: CAP 교전 창이 소진되고 방공망 포화 위험 상승. 남은 선택지는 자동 분산 방어와 EW 지연, AAR 실패 원인 기록",
    provenance: ["osint-natural-earth", "osint-ourairports", "synthetic-rf-node"],
    entityType: "FIGHTER_RAID",
    side: "RED",
    threatClassId: "RED_FIGHTER_RAID",
    representedCount: 100,
    requiresFighterResponseMissed: true,
  },
];

const basicTrainingMessages: TacticalMessage[] = [
  {
    id: "BSC-001",
    sequence: 1,
    type: "PPLI",
    sourceId: "F-01",
    sourceLabel: "F-01 PPLI",
    receivedAtSec: 0,
    timestamp: "T+00:00",
    lat: 37.9,
    lng: 129.08,
    altitudeFt: 26000,
    speedKts: 390,
    headingDeg: 72,
    confidence: 97,
    linkQuality: 96,
    trackHint: "F-01",
    classification: "friendly",
    payload: "감시 절차 시작: F-01 위치 갱신, 동해 감시 공역 진입",
    provenance: ["osint-osm-carto"],
  },
  {
    id: "BSC-002",
    sequence: 2,
    type: "PPLI",
    sourceId: "UAV-03",
    sourceLabel: "UAV-03 PPLI",
    receivedAtSec: 4,
    timestamp: "T+00:04",
    lat: 38.04,
    lng: 129.22,
    altitudeFt: 16000,
    speedKts: 118,
    headingDeg: 62,
    confidence: 95,
    linkQuality: 94,
    trackHint: "UAV-03",
    classification: "friendly",
    payload: "UAV-03 감시 궤도 진입, 미상 표적 탐색 시작",
    provenance: ["osint-natural-earth", "osint-osm-carto"],
  },
  {
    id: "BSC-003",
    sequence: 3,
    type: "SURVEILLANCE_TRACK",
    sourceId: "UAV-03",
    sourceLabel: "UAV-03 sensor",
    receivedAtSec: 8,
    timestamp: "T+00:08",
    lat: 38.2,
    lng: 129.54,
    altitudeFt: 7000,
    speedKts: 180,
    headingDeg: 236,
    confidence: 84,
    linkQuality: 90,
    trackHint: "T-101",
    classification: "unknown",
    payload: "UAV-03이 미상 표적 T-101 탐지, 서진 중",
    provenance: ["osint-natural-earth", "osint-adsb-schema"],
  },
  {
    id: "BSC-004",
    sequence: 4,
    type: "SURVEILLANCE_TRACK",
    sourceId: "RADAR-TRN-01",
    sourceLabel: "Training radar",
    receivedAtSec: 12,
    timestamp: "T+00:12",
    lat: 38.23,
    lng: 129.5,
    altitudeFt: 7200,
    speedKts: 184,
    headingDeg: 232,
    confidence: 81,
    linkQuality: 88,
    trackHint: "T-332",
    classification: "unknown",
    payload: "보조 레이더가 T-332 탐지, T-101과 위치/방향 유사",
    provenance: ["osint-natural-earth"],
  },
  {
    id: "BSC-005",
    sequence: 5,
    type: "EW_STATUS",
    sourceId: "LINK-MONITOR",
    sourceLabel: "Link quality monitor",
    receivedAtSec: 16,
    timestamp: "T+00:16",
    lat: 38.02,
    lng: 129.18,
    altitudeFt: 0,
    speedKts: 0,
    headingDeg: 0,
    confidence: 86,
    linkQuality: 82,
    trackHint: "LINK-LOSS",
    classification: "suspect",
    payload: "링크 손실률 9%, 추적에는 제한적 영향",
    provenance: ["synthetic-rf-node"],
  },
  {
    id: "BSC-006",
    sequence: 6,
    type: "ENGAGEMENT_RECOMMENDATION",
    sourceId: "COP-AI-TRN",
    sourceLabel: "AI training recommender",
    receivedAtSec: 20,
    timestamp: "T+00:20",
    lat: 38.22,
    lng: 129.52,
    altitudeFt: 7100,
    speedKts: 182,
    headingDeg: 234,
    confidence: 83,
    linkQuality: 88,
    trackHint: "T-101",
    classification: "unknown",
    payload: "대응 후보: UAV-03 추적 유지, F-01 식별 지원 대기",
    provenance: ["osint-natural-earth", "osint-adsb-schema"],
  },
  {
    id: "BSC-007",
    sequence: 7,
    type: "PPLI",
    sourceId: "F-01",
    sourceLabel: "F-01 PPLI",
    receivedAtSec: 28,
    timestamp: "T+00:28",
    lat: 37.96,
    lng: 129.2,
    altitudeFt: 26100,
    speedKts: 392,
    headingDeg: 74,
    confidence: 96,
    linkQuality: 95,
    trackHint: "F-01",
    classification: "friendly",
    payload: "F-01 위치 갱신, 미상 표적 식별 지원 가능 거리 진입",
    provenance: ["osint-osm-carto"],
  },
  {
    id: "BSC-008",
    sequence: 8,
    type: "SURVEILLANCE_TRACK",
    sourceId: "UAV-03",
    sourceLabel: "UAV-03 sensor",
    receivedAtSec: 44,
    timestamp: "T+00:44",
    lat: 38.12,
    lng: 129.34,
    altitudeFt: 6900,
    speedKts: 178,
    headingDeg: 236,
    confidence: 88,
    linkQuality: 90,
    trackHint: "T-101",
    classification: "unknown",
    payload: "미상 표적 추적 안정, T-101/T-332 병합 결과 확인",
    provenance: ["osint-natural-earth", "osint-adsb-schema"],
  },
];

const westSeaCrisisMessages: TacticalMessage[] = [
  {
    id: "WS-001",
    sequence: 1,
    type: "PPLI",
    sourceId: "F-11",
    sourceLabel: "F-11 PPLI",
    receivedAtSec: 0,
    timestamp: "T+00:00",
    lat: 37.62,
    lng: 126.24,
    altitudeFt: 25000,
    speedKts: 405,
    headingDeg: 306,
    confidence: 94,
    linkQuality: 91,
    trackHint: "F-11",
    classification: "friendly",
    payload: "서해 감시 CAP F-11 위치 갱신, NLL 남측 회랑 진입",
    provenance: ["osint-osm-carto"],
  },
  {
    id: "WS-002",
    sequence: 2,
    type: "PPLI",
    sourceId: "UAV-21",
    sourceLabel: "UAV-21 PPLI",
    receivedAtSec: 4,
    timestamp: "T+00:04",
    lat: 37.84,
    lng: 126.52,
    altitudeFt: 17000,
    speedKts: 132,
    headingDeg: 292,
    confidence: 91,
    linkQuality: 86,
    trackHint: "UAV-21",
    classification: "friendly",
    payload: "UAV-21 해상 회랑 감시 시작, 민간 항적 밀집 구역 분리 필요",
    provenance: ["osint-natural-earth", "osint-ourairports"],
  },
  {
    id: "WS-003",
    sequence: 3,
    type: "SURVEILLANCE_TRACK",
    sourceId: "UAV-21",
    sourceLabel: "UAV-21 maritime sensor",
    receivedAtSec: 8,
    timestamp: "T+00:08",
    lat: 37.98,
    lng: 125.98,
    altitudeFt: 5200,
    speedKts: 208,
    headingDeg: 132,
    confidence: 78,
    linkQuality: 82,
    trackHint: "M-410",
    classification: "unknown",
    payload: "UAV-21이 해상 접근 항적 M-410 탐지, 남동진",
    provenance: ["osint-natural-earth", "osint-adsb-schema"],
  },
  {
    id: "WS-004",
    sequence: 4,
    type: "SURVEILLANCE_TRACK",
    sourceId: "COAST-RDR-7",
    sourceLabel: "Coastal radar 7",
    receivedAtSec: 12,
    timestamp: "T+00:12",
    lat: 37.94,
    lng: 126.04,
    altitudeFt: 5400,
    speedKts: 215,
    headingDeg: 136,
    confidence: 73,
    linkQuality: 75,
    trackHint: "M-912",
    classification: "unknown",
    payload: "해안 레이더가 M-912 탐지, M-410과 동일 표적 가능성",
    provenance: ["osint-natural-earth"],
  },
  {
    id: "WS-005",
    sequence: 5,
    type: "EW_STATUS",
    sourceId: "EW-MON-W",
    sourceLabel: "West sea RF monitor",
    receivedAtSec: 16,
    timestamp: "T+00:16",
    lat: 37.9,
    lng: 125.72,
    altitudeFt: 0,
    speedKts: 0,
    headingDeg: 0,
    confidence: 66,
    linkQuality: 48,
    trackHint: "LINK-LOSS",
    classification: "suspect",
    payload: "서해 RF 억제 징후, 메시지 손실률 38%와 UAV 지연 발생",
    provenance: ["synthetic-rf-node"],
  },
  {
    id: "WS-006",
    sequence: 6,
    type: "EW_STATUS",
    sourceId: "DECOY-SCREEN",
    sourceLabel: "Synthetic decoy screen",
    receivedAtSec: 20,
    timestamp: "T+00:20",
    lat: 38.06,
    lng: 125.82,
    altitudeFt: 0,
    speedKts: 0,
    headingDeg: 0,
    confidence: 54,
    linkQuality: 41,
    trackHint: "RF-77",
    classification: "suspect",
    payload: "기만 RF 스크린 RF-77 활성화, M-410/M-912 custody 혼선",
    provenance: ["synthetic-rf-node", "osint-natural-earth"],
  },
  {
    id: "WS-007",
    sequence: 7,
    type: "SURVEILLANCE_TRACK",
    sourceId: "COAST-RDR-7",
    sourceLabel: "Coastal radar 7",
    receivedAtSec: 28,
    timestamp: "T+00:28",
    lat: 37.78,
    lng: 126.16,
    altitudeFt: 7600,
    speedKts: 242,
    headingDeg: 134,
    confidence: 81,
    linkQuality: 67,
    trackHint: "HOST-620",
    classification: "hostile",
    payload: "HOST-620 고속 접근, 해상 회랑 남동측 방어권 접근",
    provenance: ["osint-natural-earth", "osint-ourairports"],
  },
  {
    id: "WS-008",
    sequence: 8,
    type: "ASSET_STATUS",
    sourceId: "SAM-L2-B",
    sourceLabel: "Asset telemetry",
    receivedAtSec: 32,
    timestamp: "T+00:32",
    lat: 37.78,
    lng: 126.42,
    altitudeFt: 0,
    speedKts: 0,
    headingDeg: 0,
    confidence: 79,
    linkQuality: 64,
    trackHint: "ASSET-L2-B",
    classification: "friendly",
    payload: "방공 Bravo 냉각 지연, readiness 저하 상태에서 HOST-620 대응 검토",
    provenance: ["osint-osm-carto"],
  },
  {
    id: "WS-009",
    sequence: 9,
    type: "ENGAGEMENT_RECOMMENDATION",
    sourceId: "COP-AI-W",
    sourceLabel: "AI west sea recommender",
    receivedAtSec: 40,
    timestamp: "T+00:40",
    lat: 37.78,
    lng: 126.16,
    altitudeFt: 7600,
    speedKts: 242,
    headingDeg: 134,
    confidence: 76,
    linkQuality: 65,
    trackHint: "HOST-620",
    classification: "hostile",
    payload: "대응 후보: HOST-620은 Sensor Relay 우선, 방공 Bravo는 지휘관 결심 후 대기",
    provenance: ["synthetic-rf-node", "osint-natural-earth"],
  },
  {
    id: "WS-010",
    sequence: 10,
    type: "SURVEILLANCE_TRACK",
    sourceId: "UAV-21",
    sourceLabel: "UAV-21 maritime sensor",
    receivedAtSec: 44,
    timestamp: "T+00:44",
    lat: 37.74,
    lng: 126.2,
    altitudeFt: 7200,
    speedKts: 230,
    headingDeg: 138,
    confidence: 68,
    linkQuality: 55,
    trackHint: "M-410",
    classification: "unknown",
    payload: "UAV-21 재획득, M-410/M-912 병합 신뢰도 재산정 필요",
    provenance: ["osint-natural-earth", "osint-adsb-schema"],
  },
];

const emergencyWarMessages: TacticalMessage[] = [
  {
    id: "WAR-001",
    sequence: 1,
    type: "PPLI",
    sourceId: "F-31",
    sourceLabel: "F-31 PPLI",
    receivedAtSec: 0,
    timestamp: "T+00:00",
    lat: 37.46,
    lng: 127.2,
    altitudeFt: 30000,
    speedKts: 480,
    headingDeg: 18,
    confidence: 94,
    linkQuality: 88,
    trackHint: "F-31",
    classification: "friendly",
    payload: "긴급 방공 전환: F-31 수도권 북동 방어축 진입",
    provenance: ["osint-osm-carto"],
  },
  {
    id: "WAR-002",
    sequence: 2,
    type: "PPLI",
    sourceId: "F-32",
    sourceLabel: "F-32 PPLI",
    receivedAtSec: 4,
    timestamp: "T+00:04",
    lat: 37.36,
    lng: 126.96,
    altitudeFt: 29200,
    speedKts: 468,
    headingDeg: 24,
    confidence: 92,
    linkQuality: 86,
    trackHint: "F-32",
    classification: "friendly",
    payload: "F-32 남서 방어축 보강, ROE 승인 대기 상태",
    provenance: ["osint-osm-carto"],
  },
  {
    id: "WAR-003",
    sequence: 3,
    type: "EW_STATUS",
    sourceId: "LINK-MONITOR",
    sourceLabel: "Joint link monitor",
    receivedAtSec: 8,
    timestamp: "T+00:08",
    lat: 37.58,
    lng: 127.12,
    altitudeFt: 0,
    speedKts: 0,
    headingDeg: 0,
    confidence: 58,
    linkQuality: 42,
    trackHint: "LINK-LOSS",
    classification: "suspect",
    payload: "전구 링크 혼잡, 메시지 손실률 44%와 중복 트랙 폭증",
    provenance: ["synthetic-rf-node"],
  },
  {
    id: "WAR-004",
    sequence: 4,
    type: "SURVEILLANCE_TRACK",
    sourceId: "AEW-01",
    sourceLabel: "AEW synthetic track",
    receivedAtSec: 12,
    timestamp: "T+00:12",
    lat: 37.9,
    lng: 127.42,
    altitudeFt: 12000,
    speedKts: 510,
    headingDeg: 198,
    confidence: 79,
    linkQuality: 63,
    trackHint: "HOST-701",
    classification: "hostile",
    payload: "AEW가 HOST-701 고속 남하 탐지, 수도권 방어권 외곽 접근",
    provenance: ["osint-natural-earth", "osint-adsb-schema"],
  },
  {
    id: "WAR-005",
    sequence: 5,
    type: "SURVEILLANCE_TRACK",
    sourceId: "GND-RDR-N",
    sourceLabel: "North sector radar",
    receivedAtSec: 16,
    timestamp: "T+00:16",
    lat: 37.86,
    lng: 127.38,
    altitudeFt: 11800,
    speedKts: 504,
    headingDeg: 202,
    confidence: 74,
    linkQuality: 56,
    trackHint: "HOST-818",
    classification: "hostile",
    payload: "북부 레이더가 HOST-818 탐지, HOST-701과 동일 표적 가능성",
    provenance: ["osint-natural-earth"],
  },
  {
    id: "WAR-006",
    sequence: 6,
    type: "EW_STATUS",
    sourceId: "R-90",
    sourceLabel: "Threat radar R-90",
    receivedAtSec: 20,
    timestamp: "T+00:20",
    lat: 37.98,
    lng: 127.0,
    altitudeFt: 0,
    speedKts: 0,
    headingDeg: 0,
    confidence: 72,
    linkQuality: 52,
    trackHint: "R-90",
    classification: "hostile",
    payload: "위협 레이더 R-90 활성화, HOST-701 접근 축과 동조",
    provenance: ["synthetic-rf-node", "osint-natural-earth"],
  },
  {
    id: "WAR-007",
    sequence: 7,
    type: "SURVEILLANCE_TRACK",
    sourceId: "COAST-RDR-S",
    sourceLabel: "South sector radar",
    receivedAtSec: 24,
    timestamp: "T+00:24",
    lat: 37.7,
    lng: 126.72,
    altitudeFt: 9500,
    speedKts: 462,
    headingDeg: 76,
    confidence: 69,
    linkQuality: 51,
    trackHint: "HOST-702",
    classification: "hostile",
    payload: "HOST-702 서측 접근, 별도 위협 축 형성",
    provenance: ["osint-natural-earth", "osint-ourairports"],
  },
  {
    id: "WAR-008",
    sequence: 8,
    type: "SURVEILLANCE_TRACK",
    sourceId: "EAST-RDR-E",
    sourceLabel: "East sector radar",
    receivedAtSec: 28,
    timestamp: "T+00:28",
    lat: 37.82,
    lng: 127.86,
    altitudeFt: 10500,
    speedKts: 520,
    headingDeg: 244,
    confidence: 73,
    linkQuality: 50,
    trackHint: "HOST-703",
    classification: "hostile",
    payload: "HOST-703 동측 고속 접근, 별도 침투 축으로 수도권 방어권 압박",
    provenance: ["osint-natural-earth", "osint-adsb-schema"],
  },
  {
    id: "WAR-009",
    sequence: 9,
    type: "SURVEILLANCE_TRACK",
    sourceId: "WEST-SEA-RDR",
    sourceLabel: "West sea radar",
    receivedAtSec: 30,
    timestamp: "T+00:30",
    lat: 37.45,
    lng: 126.58,
    altitudeFt: 6400,
    speedKts: 455,
    headingDeg: 68,
    confidence: 70,
    linkQuality: 48,
    trackHint: "HOST-704",
    classification: "hostile",
    payload: "HOST-704 서해 저고도 접근, F-32 방어축 분산 필요",
    provenance: ["osint-natural-earth", "osint-ourairports"],
  },
  {
    id: "WAR-010",
    sequence: 10,
    type: "ASSET_STATUS",
    sourceId: "SAM-L2-B",
    sourceLabel: "Asset telemetry",
    receivedAtSec: 28,
    timestamp: "T+00:28",
    lat: 37.66,
    lng: 127.18,
    altitudeFt: 0,
    speedKts: 0,
    headingDeg: 0,
    confidence: 68,
    linkQuality: 54,
    trackHint: "ASSET-L2-B",
    classification: "friendly",
    payload: "방공 Bravo 탄약 2발, 동시 위협 대응에는 human 승인 필요",
    provenance: ["osint-osm-carto"],
  },
  {
    id: "WAR-011",
    sequence: 11,
    type: "SURVEILLANCE_TRACK",
    sourceId: "AEW-01",
    sourceLabel: "AEW synthetic track",
    receivedAtSec: 32,
    timestamp: "T+00:32",
    lat: 37.74,
    lng: 127.26,
    altitudeFt: 11200,
    speedKts: 496,
    headingDeg: 204,
    confidence: 83,
    linkQuality: 61,
    trackHint: "HOST-701",
    classification: "hostile",
    payload: "HOST-701 재획득, 방어권 내 진입 예상 시간이 급감",
    provenance: ["osint-natural-earth", "osint-adsb-schema"],
  },
  {
    id: "WAR-012",
    sequence: 12,
    type: "SURVEILLANCE_TRACK",
    sourceId: "AEW-02",
    sourceLabel: "AEW secondary track",
    receivedAtSec: 34,
    timestamp: "T+00:34",
    lat: 38.06,
    lng: 127.72,
    altitudeFt: 13300,
    speedKts: 535,
    headingDeg: 218,
    confidence: 76,
    linkQuality: 47,
    trackHint: "HOST-705",
    classification: "hostile",
    payload: "HOST-705 북동측 고고도 접근, HOST-701 축과 분리된 추가 위협",
    provenance: ["osint-natural-earth", "osint-adsb-schema"],
  },
  {
    id: "WAR-013",
    sequence: 13,
    type: "ENGAGEMENT_RECOMMENDATION",
    sourceId: "COP-AI-JAD",
    sourceLabel: "Joint AI recommender",
    receivedAtSec: 36,
    timestamp: "T+00:36",
    lat: 37.74,
    lng: 127.26,
    altitudeFt: 11200,
    speedKts: 496,
    headingDeg: 204,
    confidence: 78,
    linkQuality: 58,
    trackHint: "HOST-701",
    classification: "hostile",
    payload: "긴급 대응 후보: HOST-701 최우선, Interceptor Alpha와 Area Defense Bravo 분산 대응 및 즉시 결심 필요",
    provenance: ["osint-natural-earth", "synthetic-rf-node"],
  },
  {
    id: "WAR-014",
    sequence: 14,
    type: "ENGAGEMENT_RECOMMENDATION",
    sourceId: "COP-AI-JAD",
    sourceLabel: "Joint AI recommender",
    receivedAtSec: 40,
    timestamp: "T+00:40",
    lat: 37.7,
    lng: 126.72,
    altitudeFt: 9500,
    speedKts: 462,
    headingDeg: 76,
    confidence: 71,
    linkQuality: 53,
    trackHint: "HOST-702",
    classification: "hostile",
    payload: "긴급 대응 후보: HOST-702는 EW-C 억제 후 Sensor Relay custody 유지",
    provenance: ["osint-natural-earth", "synthetic-rf-node"],
  },
  {
    id: "WAR-015",
    sequence: 15,
    type: "ENGAGEMENT_RECOMMENDATION",
    sourceId: "COP-AI-JAD",
    sourceLabel: "Joint AI recommender",
    receivedAtSec: 42,
    timestamp: "T+00:42",
    lat: 37.82,
    lng: 127.86,
    altitudeFt: 10500,
    speedKts: 520,
    headingDeg: 244,
    confidence: 72,
    linkQuality: 49,
    trackHint: "HOST-703",
    classification: "hostile",
    payload: "긴급 대응 후보: HOST-703/HOST-704 동시 대응, Interceptor Alpha 분산과 EW 억제 우선순위 재계산",
    provenance: ["osint-natural-earth", "synthetic-rf-node"],
  },
  {
    id: "WAR-016",
    sequence: 16,
    type: "SURVEILLANCE_TRACK",
    sourceId: "GND-RDR-N",
    sourceLabel: "North sector radar",
    receivedAtSec: 44,
    timestamp: "T+00:44",
    lat: 37.68,
    lng: 127.2,
    altitudeFt: 10800,
    speedKts: 488,
    headingDeg: 206,
    confidence: 77,
    linkQuality: 49,
    trackHint: "HOST-818",
    classification: "hostile",
    payload: "HOST-701/HOST-818 병합 필요, 링크 품질 저하로 승인 근거 보강 필요",
    provenance: ["osint-natural-earth"],
  },
];

export const dataContractMetadata = {
  schemaVersion: "link16-cop-simulation.v2",
  safetyBoundary: "SIMULATED_ONLY",
  catalogVersion: "airshield-public-military-catalog/v1",
  orchestratorSchemaVersion: "airshield-orchestrator-tree/v1",
  note: "Synthetic advisory data only. No real Link-16, real military location, real inventory, real readiness, real ROE, or weapon-control command.",
} as const;

export const catalogRefs = {
  publicMilitaryCatalogEndpoint: "/api/public-military-catalog",
  ontologyReviewEndpoint: "/api/ontology/review-pack",
} as const;

export const publicMilitaryCatalog = {
  schemaVersion: "airshield-public-military-catalog/v1",
  safetyBoundary: "SIMULATED_ONLY",
  publicReferenceSources: [
    ...osintSources.map((source) => ({
      sourceId: source.sourceId,
      sourceName: source.sourceName,
      url: source.url,
      usageNote: source.usageNote,
    })),
    {
      sourceId: "src_iiss_dprk_air_inventory_2021",
      sourceName: "IISS public DPRK air inventory references",
      url: "local://public-reference-placeholder/iiss-dprk-air",
      usageNote: "공개 군사 카탈로그 연결용 placeholder. 현재 재고나 위치로 해석하지 않는다.",
    },
    {
      sourceId: "src_csis_dprk_conventional_air",
      sourceName: "CSIS public conventional threat context",
      url: "local://public-reference-placeholder/csis-conventional-air",
      usageNote: "공개 threat class 맥락 연결용 placeholder. 실제 작전 정보가 아니다.",
    },
  ],
  threatClasses: [
    "RED_BALLISTIC_MISSILE",
    "RED_QUASI_BALLISTIC",
    "RED_CRUISE_MISSILE",
    "RED_FIGHTER_RAID",
    "RED_ATTACK_AIRCRAFT",
    "RED_UAV_SWARM",
    "RED_ROCKET_ARTILLERY",
    "RED_EW_RADAR",
    "UNKNOWN_AIR_TRACK",
  ],
  weaponClasses: [
    "BLUE_PATRIOT_PAC3_CLASS",
    "BLUE_MSAM_CLASS",
    "BLUE_EW_SOFT_KILL_CLASS",
    "BLUE_LSAM_TRANSITION_CLASS",
    "BLUE_BVR_AAM_CLASS",
    "BLUE_SHORT_RANGE_AAM_CLASS",
    "BLUE_FIGHTER_GUN_CLASS",
  ],
  assetClasses: [
    "BLUE_FA50_LIKE",
    "BLUE_F15K_LIKE",
    "BLUE_F35A_LIKE",
    "BLUE_KF16_F16_LIKE",
    "BLUE_AEW_PEACE_EYE_LIKE",
    "BLUE_MSAM_SITE_ABSTRACT",
    "BLUE_PATRIOT_SITE_ABSTRACT",
    "BLUE_EW_SUPPORT_ABSTRACT",
  ],
  sensorClasses: [
    "BLUE_MSAM_MFR_SENSOR_ABSTRACT",
    "BLUE_PATRIOT_RADAR_ABSTRACT",
    "BLUE_EW_SENSOR_ABSTRACT",
    "BLUE_SENSOR_RELAY_ABSTRACT",
    "SYNTHETIC_LINK_MONITOR",
  ],
};

const canonicalTrackHints: Record<string, string> = {
  "T-877": "T-201",
  "T-332": "T-101",
  "M-912": "M-410",
  "HOST-818": "HOST-701",
};

const catalogSourceIdsByOsintSource: Record<string, string[]> = {
  "osint-natural-earth": ["osint-natural-earth"],
  "osint-ourairports": ["osint-ourairports"],
  "osint-osm-carto": ["osint-osm-carto"],
  "osint-adsb-schema": ["osint-adsb-schema"],
  "synthetic-rf-node": ["synthetic-rf-node"],
};

const conceptIdByThreatClass: Record<string, string> = {
  RED_BALLISTIC_MISSILE: "concept/red-ballistic-missile",
  RED_QUASI_BALLISTIC: "concept/red-quasi-ballistic",
  RED_CRUISE_MISSILE: "concept/red-cruise-missile",
  RED_FIGHTER_RAID: "concept/red-fighter-raid",
  RED_ATTACK_AIRCRAFT: "concept/red-attack-aircraft",
  RED_UAV_SWARM: "concept/red-uav-swarm",
  RED_ROCKET_ARTILLERY: "concept/red-rocket-artillery",
  RED_EW_RADAR: "concept/red-ew-radar",
  UNKNOWN_AIR_TRACK: "concept/unknown-air-track",
};

function sanitizeForId(value: string) {
  return value.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toUpperCase();
}

function canonicalHint(trackHint: string) {
  return canonicalTrackHints[trackHint] ?? trackHint;
}

function sideForMessage(message: TacticalMessage): Side {
  if (message.classification === "friendly") return "BLUE";
  if (message.classification === "hostile") return "RED";
  return "UNKNOWN";
}

function inferThreatClassId(message: TacticalMessage, presetId: string) {
  if (message.classification === "friendly" || message.type === "ASSET_STATUS" || message.trackHint === "LINK-LOSS") return undefined;
  if (message.trackHint.startsWith("R-") || message.trackHint.startsWith("RF-")) return "RED_EW_RADAR";
  if (presetId === "dmz-drone-escalation") {
    if (message.trackHint === "KPA-REC-01") return "RED_UAV_SWARM";
    if (message.trackHint.startsWith("KPA-FTR-")) return "RED_FIGHTER_RAID";
  }
  if (presetId === "joint-war-emergency") {
    if (message.trackHint === "HOST-701" || message.trackHint === "HOST-818") return "RED_BALLISTIC_MISSILE";
    if (message.trackHint === "HOST-702") return "RED_CRUISE_MISSILE";
    if (message.trackHint === "HOST-705") return "RED_UAV_SWARM";
    if (message.trackHint === "HOST-703" || message.trackHint === "HOST-704") return "RED_FIGHTER_RAID";
  }
  if (message.trackHint.startsWith("HOST-")) {
    if (presetId === "west-sea-ew-crisis") return "RED_CRUISE_MISSILE";
    return "RED_ATTACK_AIRCRAFT";
  }
  if (message.trackHint.startsWith("M-")) return "RED_CRUISE_MISSILE";
  if (message.trackHint.startsWith("T-")) return "UNKNOWN_AIR_TRACK";
  return "UNKNOWN_AIR_TRACK";
}

function entityTypeForMessage(message: TacticalMessage, threatClassId?: string): EntityType {
  if (message.trackHint === "LINK-LOSS") return "LINK_STATUS";
  if (message.type === "ASSET_STATUS") return "DEFENSE_ASSET";
  if (message.classification === "friendly" && message.trackHint.includes("UAV")) return "UAV";
  if (message.classification === "friendly") return "FRIENDLY_AIR";
  if (threatClassId === "RED_BALLISTIC_MISSILE" || threatClassId === "RED_QUASI_BALLISTIC") return "BALLISTIC_MISSILE";
  if (threatClassId === "RED_CRUISE_MISSILE") return "CRUISE_MISSILE";
  if (threatClassId === "RED_FIGHTER_RAID") return "FIGHTER_RAID";
  if (threatClassId === "RED_ATTACK_AIRCRAFT") return "ATTACK_AIRCRAFT";
  if (threatClassId === "RED_UAV_SWARM") return "UAV_SWARM";
  if (threatClassId === "RED_EW_RADAR") return "THREAT_RADAR";
  return "UNKNOWN_TRACK";
}

function eventTypeForMessage(message: TacticalMessage): TacticalEventType {
  if (message.trackHint === "LINK-LOSS") return "LINK_DEGRADED";
  if (message.type === "PPLI") return "PPLI_UPDATED";
  if (message.type === "SURVEILLANCE_TRACK") return message.sequence <= 4 ? "TRACK_DETECTED" : "TRACK_UPDATED";
  if (message.type === "EW_STATUS") return "EW_DETECTED";
  if (message.type === "ASSET_STATUS") return "ASSET_UPDATED";
  if (message.type === "ENGAGEMENT_RECOMMENDATION") return "RECOMMENDATION_CREATED";
  return "ROE_DECISION_RECORDED";
}

function entityIdForMessage(message: TacticalMessage, presetId: string) {
  if (message.type === "ASSET_STATUS") return `AST-${sanitizeForId(message.trackHint.replace(/^ASSET-/, ""))}`;
  if (message.trackHint === "LINK-LOSS") return `NET-${sanitizeForId(presetId)}-LINK`;
  const canonical = sanitizeForId(canonicalHint(message.trackHint));
  if (message.classification === "friendly") return `TRK-BLUE-${canonical}`;
  if (message.classification === "hostile") return `TRK-RED-${canonical}`;
  return `TRK-UNK-${canonical}`;
}

function representedCountForMessage(message: TacticalMessage, threatClassId?: string) {
  if (message.representedCount) return message.representedCount;
  if (threatClassId === "RED_UAV_SWARM") return 12;
  if (threatClassId === "RED_FIGHTER_RAID") return message.trackHint === "HOST-703" || message.trackHint === "HOST-704" ? 4 : 2;
  return undefined;
}

function provenanceDetailForMessage(message: TacticalMessage): TacticalProvenance {
  const sourceIds = [...new Set(message.provenance)];
  const catalogSourceIds = [...new Set(sourceIds.flatMap((sourceId) => catalogSourceIdsByOsintSource[sourceId] ?? [sourceId]))];
  return {
    sourceKind: sourceIds.includes("synthetic-rf-node")
      ? "SYNTHETIC_RF_NODE"
      : message.type === "PPLI"
        ? "PUBLIC_OSINT_REFERENCE"
        : "SYNTHETIC_LINK16_LIKE",
    sourceIds,
    catalogSourceIds,
    usageNote: "FE replay uses sanitized source IDs. No raw provider payload, secret, real Link-16 message, or real operational feed is included.",
  };
}

function enrichMessage(message: TacticalMessage, presetId: string): TacticalMessage {
  const threatClassId = inferThreatClassId(message, presetId);
  const entityType = entityTypeForMessage(message, threatClassId);
  const eventType = eventTypeForMessage(message);
  const evidenceIds = [message.id];
  const conceptIds = threatClassId ? [conceptIdByThreatClass[threatClassId] ?? `concept/${threatClassId.toLowerCase()}`] : [`concept/${eventType.toLowerCase()}`];
  const representedCount = representedCountForMessage(message, threatClassId);
  return {
    ...message,
    geo: { lat: message.lat, lng: message.lng },
    entityId: entityIdForMessage(message, presetId),
    entityType,
    side: sideForMessage(message),
    threatClassId,
    eventType,
    evidenceIds,
    conceptIds,
    representedCount,
    groupEntity: Boolean(representedCount && representedCount > 1),
    provenanceDetail: provenanceDetailForMessage(message),
    noExecute: true,
  };
}

function assetClassForAsset(asset: DefenseAsset) {
  if (asset.layer === "EW") return "BLUE_EW_SUPPORT_ABSTRACT";
  if (asset.layer === "L1") return "BLUE_MSAM_SITE_ABSTRACT";
  if (asset.layer === "L2") return "BLUE_PATRIOT_SITE_ABSTRACT";
  return "BLUE_AEW_PEACE_EYE_LIKE";
}

function weaponClassIdsForAsset(asset: DefenseAsset) {
  if (asset.layer === "EW") return ["BLUE_EW_SOFT_KILL_CLASS"];
  if (asset.layer === "L1") return ["BLUE_MSAM_CLASS"];
  if (asset.layer === "L2") return ["BLUE_PATRIOT_PAC3_CLASS"];
  return ["BLUE_BVR_AAM_CLASS"];
}

function sensorClassIdsForAsset(asset: DefenseAsset) {
  if (asset.layer === "EW") return ["BLUE_EW_SENSOR_ABSTRACT"];
  if (asset.layer === "L1") return ["BLUE_MSAM_MFR_SENSOR_ABSTRACT"];
  if (asset.layer === "L2") return ["BLUE_PATRIOT_RADAR_ABSTRACT"];
  return ["BLUE_SENSOR_RELAY_ABSTRACT"];
}

function channelsForAsset(asset: DefenseAsset) {
  if (asset.layer === "L1") return 4;
  if (asset.layer === "L2") return 2;
  if (asset.layer === "EW") return 3;
  return 4;
}

function enrichAsset(asset: DefenseAsset): DefenseAsset {
  return {
    ...asset,
    assetClassId: assetClassForAsset(asset),
    weaponClassIds: weaponClassIdsForAsset(asset),
    sensorClassIds: sensorClassIdsForAsset(asset),
    channels: channelsForAsset(asset),
    simulationProfile: {
      realLocationUsed: false,
      realInventoryUsed: false,
      inventorySource: "scenario_notional",
      simInventory: asset.ammo,
    },
  };
}

function buildEntities(messages: TacticalMessage[]): AirshieldEntity[] {
  const groups = new Map<string, TacticalMessage[]>();
  messages.forEach((message) => {
    if (!message.entityId) return;
    groups.set(message.entityId, [...(groups.get(message.entityId) ?? []), message]);
  });

  return [...groups.entries()].map(([entityId, group]) => {
    const latest = [...group].sort((a, b) => b.receivedAtSec - a.receivedAtSec || b.sequence - a.sequence)[0];
    return {
      entityId,
      entityType: latest.entityType ?? "UNKNOWN_TRACK",
      side: latest.side ?? "UNKNOWN",
      label: latest.trackHint,
      classification: latest.classification,
      threatClassId: latest.threatClassId,
      latestMessageId: latest.id,
      sourceMessageIds: group.map((message) => message.id),
      geo: { lat: latest.lat, lng: latest.lng },
      confidence: latest.confidence,
      linkQuality: latest.linkQuality,
      representedCount: latest.representedCount,
      evidenceIds: [...new Set(group.flatMap((message) => message.evidenceIds ?? [message.id]))],
      conceptIds: [...new Set(group.flatMap((message) => message.conceptIds ?? []))],
    };
  });
}

function displaySpeedForThreat(threatClassId?: string, fallbackSpeedKts = 300) {
  if (threatClassId === "RED_BALLISTIC_MISSILE") return 3200;
  if (threatClassId === "RED_QUASI_BALLISTIC") return 2800;
  if (threatClassId === "RED_CRUISE_MISSILE") return 540;
  if (threatClassId === "RED_UAV_SWARM") return 120;
  if (threatClassId === "RED_FIGHTER_RAID") return 620;
  if (threatClassId === "RED_ATTACK_AIRCRAFT") return 460;
  return fallbackSpeedKts;
}

function altitudeProfileForThreat(threatClassId?: string): TrajectorySpec["altitudeProfile"] {
  if (threatClassId === "RED_BALLISTIC_MISSILE") return "HIGH_TO_TERMINAL";
  if (threatClassId === "RED_QUASI_BALLISTIC") return "HIGH_TO_TERMINAL_MANEUVERING";
  if (threatClassId === "RED_CRUISE_MISSILE" || threatClassId === "RED_UAV_SWARM") return "LOW";
  if (threatClassId === "RED_ATTACK_AIRCRAFT") return "LOW_MEDIUM";
  return "MEDIUM";
}

function buildTrajectorySpecs(messages: TacticalMessage[]): TrajectorySpec[] {
  const groups = new Map<string, TacticalMessage[]>();
  messages
    .filter(
      (message) =>
        message.classification !== "friendly" &&
        message.entityId &&
        message.trackHint !== "LINK-LOSS" &&
        (message.type === "SURVEILLANCE_TRACK" || message.type === "PPLI"),
    )
    .forEach((message) => {
      groups.set(message.entityId!, [...(groups.get(message.entityId!) ?? []), message]);
    });

  return [...groups.entries()].map(([entityId, group]) => {
    const sorted = [...group].sort((a, b) => a.receivedAtSec - b.receivedAtSec || a.sequence - b.sequence);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const durationSec = Math.max(last.receivedAtSec - first.receivedAtSec, 24);
    const representedCount = Math.max(...sorted.map((message) => message.representedCount ?? 1));
    const formation =
      first.threatClassId === "RED_FIGHTER_RAID" && representedCount >= 100
        ? ({
            mode: "FIGHTER_RAID_WAVE",
            source: "BE_GENERATED_TRAJECTORY_SPEC",
            columns: 25,
            rowSpacingLat: 0.026,
            columnSpacingLng: 0.035,
            staggerLng: 0.0175,
            fanoutLatFactor: 0.0012,
            iconScale: 0.68,
          } satisfies TrajectorySpec["formation"])
        : first.threatClassId === "RED_UAV_SWARM" && representedCount > 1
          ? ({
              mode: "UAV_SWARM",
              source: "BE_GENERATED_TRAJECTORY_SPEC",
              columns: 4,
              rowSpacingLat: 0.014,
              columnSpacingLng: 0.018,
              staggerLng: 0.009,
              fanoutLatFactor: 0.0006,
              iconScale: 0.74,
            } satisfies TrajectorySpec["formation"])
          : undefined;

    return {
      trajectoryId: `TRJ-${sanitizeForId(entityId)}`,
      entityId,
      threatClassId: first.threatClassId,
      spawnAtSec: first.receivedAtSec,
      durationSec,
      updateIntervalSec: durationSec <= 16 ? 2 : 4,
      start: { lat: first.lat, lng: first.lng },
      end: { lat: last.lat, lng: last.lng },
      displaySpeedKts: displaySpeedForThreat(first.threatClassId, first.speedKts),
      altitudeProfile: altitudeProfileForThreat(first.threatClassId),
      headingMode: "compute_from_start_end",
      jitter: { lat: 0.04, lng: 0.04 },
      representedCount,
      visibleCount: formation ? representedCount : undefined,
      waypoints: sorted.map((message) => ({
        timeSec: message.receivedAtSec,
        lat: message.lat,
        lng: message.lng,
        altitudeFt: message.altitudeFt,
        speedKts: message.speedKts,
        headingDeg: message.headingDeg,
        messageId: message.id,
      })),
      formation,
      safetyNote: "Synthetic display trajectory, not a real launch route.",
    };
  });
}

function pickAssetForThreat(threatClassId: string | undefined, assets: DefenseAsset[]) {
  if (threatClassId === "RED_UAV_SWARM") return assets.find((asset) => asset.layer === "EW") ?? assets[0];
  if (threatClassId === "RED_BALLISTIC_MISSILE" || threatClassId === "RED_QUASI_BALLISTIC") {
    return assets.find((asset) => asset.layer === "L1") ?? assets[0];
  }
  if (threatClassId === "RED_CRUISE_MISSILE") return assets.find((asset) => asset.layer === "L2") ?? assets[0];
  if (threatClassId === "RED_EW_RADAR") return assets.find((asset) => asset.effect === "track-custody") ?? assets[0];
  return assets.find((asset) => asset.effect === "intercept") ?? assets[0];
}

function buildDecisionRecords(presetId: string, messages: TacticalMessage[], assets: DefenseAsset[]): DecisionRecord[] {
  return messages
    .filter((message) => message.type === "ENGAGEMENT_RECOMMENDATION" && message.entityId)
    .map((message, index) => {
      const asset = pickAssetForThreat(message.threatClassId, assets);
      const weaponClassId = asset.weaponClassIds?.[0];
      const score = Math.round((message.confidence * 0.45 + asset.readiness * 0.35 + message.linkQuality * 0.2) / 100 * 100) / 100;
      const ontologyLinkIds = weaponClassId && message.threatClassId ? [`${weaponClassId}:candidate_for:${message.threatClassId}`] : [];
      return {
        decisionId: `DEC-${sanitizeForId(presetId)}-${String(index + 1).padStart(3, "0")}`,
        createdAtSec: message.receivedAtSec,
        mode: "SIMULATED_ADVISORY_ONLY",
        threatEntityId: message.entityId!,
        threatClassId: message.threatClassId,
        recommendedAssetId: asset.assetId,
        recommendedWeaponClassId: weaponClassId,
        score,
        scoreBreakdown: {
          targetFit: Math.round((message.confidence / 100) * 100) / 100,
          readiness: Math.round((asset.readiness / 100) * 100) / 100,
          inventory: asset.ammo,
          channelAvailable: Boolean((asset.channels ?? 0) > 0 && asset.ammo > 0),
          costPenalty: asset.layer === "L2" ? 0.18 : asset.layer === "L1" ? 0.12 : 0.05,
          scarcityPenalty: asset.ammo <= 2 ? 0.24 : asset.ammo <= 4 ? 0.14 : 0.06,
          timeToImpactSec: Math.max(42, 140 - message.receivedAtSec),
        },
        reason: `${message.trackHint} ${message.threatClassId ?? "UNKNOWN_AIR_TRACK"} class에 ${asset.shortName} simulated advisory pairing.`,
        constraintsChecked: ["SIMULATED_ONLY", "NO_REAL_COMMAND", "NO_REAL_INVENTORY", "NO_REAL_LOCATION", "NO_DUPLICATE_ASSIGNMENT"],
        evidenceIds: [...(message.evidenceIds ?? [message.id]), asset.assetId, ...(weaponClassId ? [weaponClassId] : [])],
        ontologyLinkIds,
        noExecute: true,
      };
    });
}

function buildEventLog(messages: TacticalMessage[]): AirshieldEventLogEntry[] {
  return messages.map((message) => ({
    eventId: `EVT-${message.id}`,
    eventType: message.eventType ?? "TRACK_UPDATED",
    timeSec: message.receivedAtSec,
    entityId: message.entityId ?? message.trackHint,
    sourceMessageId: message.id,
    summary: message.payload,
    evidenceIds: message.evidenceIds ?? [message.id],
    conceptIds: message.conceptIds ?? [],
    noExecute: true,
  }));
}

function buildOntologyLinks(messages: TacticalMessage[], decisions: DecisionRecord[]): OntologyLink[] {
  const detectLinks = messages
    .filter((message) => message.entityId && message.sourceId && message.eventType !== "RECOMMENDATION_CREATED")
    .map((message) => ({
      linkId: `${message.sourceId}:detects:${message.entityId}`,
      sourceId: message.sourceId,
      relation: "detects" as const,
      targetId: message.entityId!,
      evidenceIds: message.evidenceIds ?? [message.id],
      safetyNote: "Class-level synthetic detection relation only.",
    }));

  const decisionLinks = decisions.flatMap((decision) => [
    ...(decision.recommendedWeaponClassId && decision.threatClassId
      ? [
          {
            linkId: `${decision.recommendedWeaponClassId}:candidate_for:${decision.threatClassId}`,
            sourceId: decision.recommendedWeaponClassId,
            relation: "candidate_for" as const,
            targetId: decision.threatClassId,
            evidenceIds: decision.evidenceIds,
            safetyNote: "Class-level simulated candidate relation; no real firing authority.",
          },
        ]
      : []),
    {
      linkId: `${decision.recommendedAssetId}:assigned_to:${decision.threatEntityId}`,
      sourceId: decision.recommendedAssetId,
      relation: "assigned_to" as const,
      targetId: decision.threatEntityId,
      evidenceIds: decision.evidenceIds,
      safetyNote: "Synthetic advisory assignment for COP training only.",
    },
  ]);

  const fusionLinks = [...new Map(messages.map((message) => [message.entityId, messages.filter((item) => item.entityId === message.entityId)])).entries()]
    .filter(([entityId, group]) => Boolean(entityId) && new Set(group.map((message) => message.trackHint)).size > 1)
    .map(([entityId, group]) => ({
      linkId: `${group.map((message) => message.trackHint).join("+")}:supports_fusion_for:${entityId}`,
      sourceId: group[0].trackHint,
      relation: "supports_fusion_for" as const,
      targetId: entityId!,
      evidenceIds: group.map((message) => message.id),
      safetyNote: "Synthetic track-correlation relation for AAR review.",
    }));

  const unique = new Map<string, OntologyLink>();
  [...detectLinks, ...decisionLinks, ...fusionLinks].forEach((link) => unique.set(link.linkId, link));
  return [...unique.values()];
}

function buildOrchestratorSnapshot(presetId: string, entities: AirshieldEntity[], assets: DefenseAsset[], decisions: DecisionRecord[]): OrchestratorTreeSnapshot {
  const threatEntities = entities.filter((entity) => entity.side !== "BLUE" && entity.entityType !== "LINK_STATUS");
  return {
    schemaVersion: "airshield-orchestrator-tree/v1",
    mode: "SIMULATION_ADVISORY_ORCHESTRATION",
    executionPolicy: "NO_EXECUTE_ADVISORY_ONLY",
    snapshotRef: {
      scenarioId: presetId,
      simTick: 72,
      sourceSchemaVersion: "link16-cop-simulation.v2",
    },
    sharedBlackboard: {
      counts: {
        entities: entities.length,
        threats: threatEntities.length,
        assets: assets.length,
        decisions: decisions.length,
      },
      topThreats: threatEntities.slice(0, 5).map((entity) => entity.entityId),
      inventoryPressure: assets.filter((asset) => asset.ammo <= 3 || asset.readiness < 65).map((asset) => asset.assetId),
      recentDecisionIds: decisions.slice(-5).map((decision) => decision.decisionId),
    },
    responseContract: {
      allowedTopLevelKeys: ["assessment", "recommendedFocus", "candidateActions", "risks", "constraintsChecked", "noExecute"],
      noExecuteMustBeTrue: true,
    },
    noExecute: true,
  };
}

function enhanceSimulationPreset(preset: SimulationPreset): SimulationPreset {
  const messages = preset.messages.map((message) => enrichMessage(message, preset.id));
  const assets = preset.assets.map(enrichAsset);
  const entities = buildEntities(messages);
  const trajectorySpecs = buildTrajectorySpecs(messages);
  const decisionRecords = buildDecisionRecords(preset.id, messages, assets);
  const eventLog = buildEventLog(messages);
  const ontologyLinks = buildOntologyLinks(messages, decisionRecords);
  const orchestratorSnapshot = buildOrchestratorSnapshot(preset.id, entities, assets, decisionRecords);

  return {
    ...preset,
    messages,
    assets,
    entities,
    trajectorySpecs,
    eventLog,
    decisionRecords,
    ontologyLinks,
    orchestratorSnapshot,
  };
}

export const defaultSimulationId = "dmz-drone-escalation";

const rawSimulationPresets: SimulationPreset[] = [
  {
    id: "dmz-drone-escalation",
    title: "DMZ 드론 침투 긴급상황",
    shortTitle: "DMZ 긴급",
    severity: "war",
    regionLabel: "삼팔선 인근 수도권 방공",
    summary: "북측 정찰 드론이 파란 감시선에서 탐지되어 주황 대응선으로 접근하고, 대응 성공 또는 실패 이후 북측 전투기 100대와 남측 전투기 50대 대응으로 확대되는 mock 시나리오입니다.",
    operatorFocus: "색상 경계선, 공격형 드론 수동 지정 또는 미대응 실패, 정찰 드론 이후 전투기 100대 wave, BLUE-FTR 대응 미지정 실패 분기 확인",
    mapTitle: "DMZ 경계선 기반 합동 COP",
    commandPost: dmzCommandPost,
    messages: dmzDroneEscalationMessages,
    assets: dmzAssets,
    fighterRaidStream: fighterRaidMixed50,
    highlights: ["파란 감시선 탐지", "드론 미대응 분기", "전투기 100대 출격", "BLUE-FTR 미대응 분기"],
    forceInventory: [
      {
        side: "RED",
        label: "북측 mock 전력",
        items: [
          { kind: "전투기", count: 100, note: "BE MIXED_50 stream 원본" },
          { kind: "정찰 드론", count: 36, note: "초기 침투 1대" },
          { kind: "미사일", count: 64, note: "후속 확장 예정" },
        ],
      },
      {
        side: "BLUE",
        label: "남측 mock 전력",
        items: [
          { kind: "전투기", count: 50, note: "BE stream response fighters" },
          { kind: "공격 드론", count: 24, note: "수동 지정 출격" },
          { kind: "방공 자산", count: 32, note: "다층 방어" },
        ],
      },
    ],
  },
  {
    id: "basic-training",
    title: "기초 감시 절차",
    shortTitle: "기초",
    severity: "basic",
    regionLabel: "동해 감시 공역",
    summary: "아군기와 UAV가 미상 표적을 탐지하고, 두 센서의 중복 트랙을 병합하는 가장 단순한 흐름입니다.",
    operatorFocus: "raw feed가 fused track과 자동 브리핑으로 바뀌는 기본 흐름 확인",
    mapTitle: "동해 기초 감시 COP",
    commandPost: trainingCommandPost,
    messages: basicTrainingMessages,
    assets: trainingAssets,
    highlights: ["단순 PPLI", "중복 트랙 병합", "낮은 메시지 손실", "비살상 추적 권고"],
  },
  {
    id: "east-sea-normal",
    title: "동해 해상 접근 감시",
    shortTitle: "표준",
    severity: "normal",
    regionLabel: "동해 해상 접근로",
    summary: "UAV와 지상 레이더가 같은 항적을 별도 탐지하고, 메시지 손실 후 지휘관 결심 후보까지 이어집니다.",
    operatorFocus: "T-201/T-877 상관, HOST-331 우선순위, ROE 승인 구조 확인",
    mapTitle: "동해 APAC 합성 상황도",
    commandPost,
    messages: baselineMessages,
    assets: baseAssets,
    highlights: ["동해 접근 항적", "메시지 손실 25%", "HOST-331", "ROE 승인"],
  },
  {
    id: "west-sea-ew-crisis",
    title: "서해 NLL 전자전 압박",
    shortTitle: "위기",
    severity: "crisis",
    regionLabel: "서해 NLL 인근",
    summary: "RF 억제와 기만 스크린 때문에 해상 접근 항적의 custody가 흔들리는 중간 난이도 상황입니다.",
    operatorFocus: "재밍, sensor custody 혼선, readiness 저하 상태에서 relay 우선순위 판단",
    mapTitle: "서해 전자전 압박 상황도",
    commandPost: westCommandPost,
    messages: westSeaCrisisMessages,
    assets: westAssets,
    highlights: ["RF 억제", "메시지 손실 38%", "기만 스크린", "자산 readiness 저하"],
  },
  {
    id: "joint-war-emergency",
    title: "합동 방공 긴급상황",
    shortTitle: "긴급",
    severity: "war",
    regionLabel: "수도권 합동 방공",
    summary: "다중 적성 항적과 위협 레이더가 동시에 나타나는 최고경보 상황입니다. 링크 혼잡과 자산 제약 속에서 지휘관 결심이 필요합니다.",
    operatorFocus: "동시 다중 hostile track 상관, 제한 탄약, 긴급 추천 팝업과 결심 근거 확인",
    mapTitle: "수도권 합동 방공 COP",
    commandPost: emergencyCommandPost,
    messages: emergencyWarMessages,
    assets: emergencyAssets,
    highlights: ["다중 적성 항적", "링크 손실 44%", "탄약 제약", "긴급 ROE 승인"],
  },
];

export const simulationPresets: SimulationPreset[] = rawSimulationPresets.map(enhanceSimulationPreset);

export const frontendHandoffPayload = {
  metadata: dataContractMetadata,
  defaultSimulationId,
  osintSources,
  catalogRefs,
  publicMilitaryCatalog,
  simulationPresets,
};
