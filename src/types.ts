export type MessageType =
  | "PPLI"
  | "SURVEILLANCE_TRACK"
  | "EW_STATUS"
  | "ASSET_STATUS"
  | "ENGAGEMENT_RECOMMENDATION"
  | "ROE_DECISION";

export type ScenarioKey = "messageLoss" | "ewJamming" | "sensorConflict" | "assetDegrade";

export type TrackStatus = "stable" | "degraded" | "ambiguous" | "priority";

export type RoeStatus = "auto" | "approval-required" | "hold";

export type DecisionState = "pending" | "approved" | "held";

export type PlaybackSpeed = 0.5 | 1 | 2 | 4;

export type SimulationSeverity = "basic" | "normal" | "crisis" | "war";

export type GeoPoint = {
  lat: number;
  lng: number;
};

export type SafetyBoundary = "SIMULATED_ONLY";

export type Side = "BLUE" | "RED" | "UNKNOWN";

export type EntityType =
  | "FRIENDLY_AIR"
  | "UAV"
  | "UNKNOWN_TRACK"
  | "THREAT_RADAR"
  | "BALLISTIC_MISSILE"
  | "CRUISE_MISSILE"
  | "FIGHTER_RAID"
  | "ATTACK_AIRCRAFT"
  | "UAV_SWARM"
  | "LINK_STATUS"
  | "DEFENSE_ASSET";

export type TacticalEventType =
  | "PPLI_UPDATED"
  | "TRACK_DETECTED"
  | "TRACK_UPDATED"
  | "EW_DETECTED"
  | "ASSET_UPDATED"
  | "RECOMMENDATION_CREATED"
  | "LINK_DEGRADED"
  | "ROE_DECISION_RECORDED";

export type TacticalProvenance = {
  sourceKind: "SYNTHETIC_LINK16_LIKE" | "SYNTHETIC_RF_NODE" | "PUBLIC_OSINT_REFERENCE";
  sourceIds: string[];
  catalogSourceIds: string[];
  usageNote: string;
};

export type CommandPost = GeoPoint & {
  label: string;
};

export type TacticalMessage = GeoPoint & {
  id: string;
  sequence: number;
  type: MessageType;
  sourceId: string;
  sourceLabel: string;
  receivedAtSec: number;
  timestamp: string;
  altitudeFt: number;
  speedKts: number;
  headingDeg: number;
  confidence: number;
  linkQuality: number;
  trackHint: string;
  classification: "friendly" | "unknown" | "suspect" | "hostile";
  payload: string;
  provenance: string[];
  geo?: GeoPoint;
  entityId?: string;
  entityType?: EntityType;
  side?: Side;
  threatClassId?: string;
  eventType?: TacticalEventType;
  evidenceIds?: string[];
  conceptIds?: string[];
  representedCount?: number;
  groupEntity?: boolean;
  provenanceDetail?: TacticalProvenance;
  noExecute?: true;
  requiresManualIntercept?: true;
  requiresManualInterceptMissed?: true;
  requiresFighterResponseMissed?: true;
};

export type OsintSource = {
  sourceId: string;
  sourceName: string;
  url: string;
  retrievedAt: string;
  confidence: number;
  usageNote: string;
};

export type FusedTrack = GeoPoint & {
  trackId: string;
  classification: TacticalMessage["classification"];
  altitudeFt: number;
  speedKts: number;
  headingDeg: number;
  sources: string[];
  sourceLabels: string[];
  confidence: number;
  threatScore: number;
  linkQuality: number;
  status: TrackStatus;
  evidence: string[];
  messageIds: string[];
  entityId?: string;
  entityType?: EntityType;
  side?: Side;
  threatClassId?: string;
  evidenceIds?: string[];
  conceptIds?: string[];
  representedCount?: number;
  ontologyLinkIds?: string[];
};

export type DefenseAsset = GeoPoint & {
  assetId: string;
  name: string;
  shortName: string;
  layer: "L1" | "L2" | "L3" | "EW";
  rangeKm: number;
  readiness: number;
  ammo: number;
  effect: "soft-kill" | "intercept" | "track-custody" | "relay";
  assignedTrackId?: string;
  assetClassId?: string;
  weaponClassIds?: string[];
  sensorClassIds?: string[];
  channels?: number;
  simulationProfile?: {
    realLocationUsed: false;
    realInventoryUsed: false;
    inventorySource: "scenario_notional";
    simInventory: number;
  };
};

export type AirshieldEntity = {
  entityId: string;
  entityType: EntityType;
  side: Side;
  label: string;
  classification: TacticalMessage["classification"];
  threatClassId?: string;
  latestMessageId: string;
  sourceMessageIds: string[];
  geo: GeoPoint;
  confidence: number;
  linkQuality: number;
  representedCount?: number;
  evidenceIds: string[];
  conceptIds: string[];
};

export type TrajectorySpec = {
  trajectoryId: string;
  entityId: string;
  threatClassId?: string;
  spawnAtSec: number;
  durationSec: number;
  updateIntervalSec: number;
  start: GeoPoint;
  end: GeoPoint;
  displaySpeedKts: number;
  altitudeProfile: "LOW" | "LOW_MEDIUM" | "MEDIUM" | "HIGH_TO_TERMINAL" | "HIGH_TO_TERMINAL_MANEUVERING";
  headingMode: "compute_from_start_end";
  jitter: { lat: number; lng: number };
  representedCount?: number;
  visibleCount?: number;
  waypoints?: Array<GeoPoint & {
    timeSec: number;
    altitudeFt?: number;
    speedKts?: number;
    headingDeg?: number;
    messageId?: string;
  }>;
  formation?: {
    mode: "FIGHTER_RAID_WAVE" | "UAV_SWARM";
    source: "BE_GENERATED_TRAJECTORY_SPEC";
    columns: number;
    rowSpacingLat: number;
    columnSpacingLng: number;
    staggerLng: number;
    fanoutLatFactor: number;
    iconScale: number;
  };
  safetyNote: string;
};

export type AirshieldEventLogEntry = {
  eventId: string;
  eventType: TacticalEventType;
  timeSec: number;
  entityId: string;
  sourceMessageId: string;
  summary: string;
  evidenceIds: string[];
  conceptIds: string[];
  noExecute: true;
};

export type DecisionRecord = {
  decisionId: string;
  createdAtSec: number;
  mode: "SIMULATED_ADVISORY_ONLY";
  threatEntityId: string;
  threatClassId?: string;
  recommendedAssetId: string;
  recommendedWeaponClassId?: string;
  score: number;
  scoreBreakdown: {
    targetFit: number;
    readiness: number;
    inventory: number;
    channelAvailable: boolean;
    costPenalty: number;
    scarcityPenalty: number;
    timeToImpactSec: number;
  };
  reason: string;
  constraintsChecked: string[];
  evidenceIds: string[];
  ontologyLinkIds: string[];
  noExecute: true;
};

export type OntologyLink = {
  linkId: string;
  sourceId: string;
  relation: "candidate_for" | "detects" | "threatens" | "assigned_to" | "resolved_by" | "supports_fusion_for";
  targetId: string;
  evidenceIds: string[];
  safetyNote: string;
};

export type OrchestratorTreeSnapshot = {
  schemaVersion: "airshield-orchestrator-tree/v1";
  mode: "SIMULATION_ADVISORY_ORCHESTRATION";
  executionPolicy: "NO_EXECUTE_ADVISORY_ONLY";
  snapshotRef: {
    scenarioId: string;
    simTick: number;
    sourceSchemaVersion: "link16-cop-simulation.v2";
  };
  sharedBlackboard: {
    counts: Record<string, number>;
    topThreats: string[];
    inventoryPressure: string[];
    recentDecisionIds: string[];
  };
  responseContract: {
    allowedTopLevelKeys: string[];
    noExecuteMustBeTrue: true;
  };
  noExecute: true;
};

export type FighterRaidParticipant = {
  entityId: string;
  label: string;
  side: "RED" | "BLUE";
  entityType?: EntityType;
  status: string;
  assetClassId?: string;
  threatClassId?: string;
  position: {
    x: number;
    y: number;
  };
  kinematics: {
    headingDeg: number;
    speedKts: number;
    altitudeFt: number;
  };
  readiness?: number;
  missiles?: number;
  priorityScore?: number;
};

export type FighterRaidWorldStateFrame = {
  frameId: string;
  frameType: string;
  timelineSec: number;
  roundIndex: number;
  headline: string;
  redFighters: FighterRaidParticipant[];
  blueFighters: FighterRaidParticipant[];
};

export type FighterRaidSnapshotEntity = {
  entityId: string;
  label: string;
  side: "RED" | "BLUE";
  platformType: string;
  entityType?: EntityType;
  classId?: string;
  status: string;
  lat: number;
  lng: number;
  lon?: number;
  altitudeFt: number;
  kinematics: {
    headingDeg: number;
    speedKts: number;
    timeCompression?: number;
  };
  screen?: {
    frame?: string;
    x: number;
    y: number;
  };
  detectedAtSec?: number;
  assignmentId?: string | null;
  health?: number;
  evidenceIds?: string[];
  conceptIds?: string[];
  noExecute?: true;
};

export type FighterRaidSnapshotAssignment = {
  assignmentId: string;
  roundIndex?: number;
  status: string;
  startSec?: number;
  resultSec?: number;
  blueEntityId: string;
  redEntityId: string;
  assignmentScore?: number;
  pkEstimate: number;
  line: {
    from: GeoPoint & { lon?: number };
    to: GeoPoint & { lon?: number };
  };
  rationale?: string[];
  noExecute?: true;
};

export type FighterRaidSnapshotEffect = {
  effectId: string;
  type: string;
  startSec: number;
  durationSec: number;
  lat: number;
  lng: number;
  lon?: number;
  altitudeFt?: number;
  sourceEntityId?: string;
  targetEntityId?: string;
  outcome?: string;
  displayHint?: string;
  noExecute?: true;
};

export type FighterRaidSnapshot = {
  schemaVersion: "airshield-fighter-raid-snapshot/v1";
  scenarioId?: string;
  timelineSec: number;
  mapFrameId?: string;
  entities: FighterRaidSnapshotEntity[];
  assignments: FighterRaidSnapshotAssignment[];
  effects: FighterRaidSnapshotEffect[];
  events?: Array<Record<string, unknown>>;
  metrics: {
    visibleRedCount: number;
    visibleBlueCount: number;
    activeAssignmentCount: number;
    activeEffectCount: number;
    detectedRedCount: number;
    killedRedCount: number;
  };
  noExecute?: true;
};

export type FighterRaidStreamLite = {
  schemaVersion: "airshield-fighter-raid-stream/v1";
  scenarioId: string;
  sourceFile: string;
  safetyBoundary: string;
  blueForceOption: {
    optionId: string;
    label: string;
    redCount: number;
    totalBlueCount: number;
    targetRounds: number;
    composition: Array<{
      count: number;
      assetClassId: string;
      labelPrefix: string;
      missiles: number;
      readinessBase: number;
      effectivenessModifier: number;
    }>;
  };
  timing: {
    roundDurationSec: number;
    targetRoundCount: number;
    actualRoundCount: number;
    totalDurationSec: number;
    maxScenarioDurationSec: number;
  };
  redFighters: FighterRaidParticipant[];
  blueFighters: FighterRaidParticipant[];
  snapshots: FighterRaidSnapshot[];
  frames: Array<{
    frameId: string;
    frameType: string;
    timelineSec: number;
    roundIndex: number;
    headline: string;
  }>;
  worldStates?: FighterRaidWorldStateFrame[];
  rounds: Array<{
    roundIndex: number;
    timelineStartSec: number;
    timelineEndSec: number;
    assignments: Array<{
      assignmentId: string;
      blueFighterId: string;
      redFighterId: string;
      assignmentScore: number;
      pkEstimate: number;
      distanceBand: string;
    }>;
    results: Array<{
      resultId: string;
      assignmentId: string;
      blueFighterId: string;
      redFighterId: string;
      outcome: string;
      blueStatusAfter: string;
      redStatusAfter: string;
    }>;
  }>;
  metrics: {
    redInitialCount: number;
    blueInitialCount: number;
    redRemainingCount: number;
    redKilledCount: number;
    blueAvailableCount: number;
    blueOutCount: number;
    totalAssignments: number;
    totalKillCount: number;
    totalMissCount: number;
  };
  noExecute: true;
};

export type SimulationPreset = {
  id: string;
  title: string;
  shortTitle: string;
  severity: SimulationSeverity;
  regionLabel: string;
  summary: string;
  operatorFocus: string;
  mapTitle: string;
  commandPost: CommandPost;
  messages: TacticalMessage[];
  assets: DefenseAsset[];
  entities?: AirshieldEntity[];
  trajectorySpecs?: TrajectorySpec[];
  eventLog?: AirshieldEventLogEntry[];
  decisionRecords?: DecisionRecord[];
  ontologyLinks?: OntologyLink[];
  orchestratorSnapshot?: OrchestratorTreeSnapshot;
  fighterRaidStream?: FighterRaidStreamLite;
  highlights: string[];
  forceInventory?: Array<{
    side: Side;
    label: string;
    items: Array<{
      kind: string;
      count: number;
      note?: string;
    }>;
  }>;
};

export type EngagementRecommendation = {
  id: string;
  priority: number;
  trackId: string;
  assetId: string;
  assetName: string;
  effect: DefenseAsset["effect"];
  confidence: number;
  roeStatus: RoeStatus;
  etaSec: number;
  reasons: string[];
  osintSourceIds: string[];
  decisionRecordId?: string;
  threatClassId?: string;
  recommendedWeaponClassId?: string;
  scoreBreakdown?: DecisionRecord["scoreBreakdown"];
  constraintsChecked?: string[];
  evidenceIds?: string[];
  ontologyLinkIds?: string[];
  noExecute?: true;
};

export type AarSummary = {
  processedMessages: number;
  fusedTracks: number;
  dedupedMessages: number;
  degradedMessages: number;
  approvedCount: number;
  heldCount: number;
  osintSourcesUsed: string[];
  nextActions: string[];
  timeline: Array<{
    label: string;
    confidence: number;
    risk: number;
  }>;
};

export type SituationBriefing = {
  generatedAt: string;
  headline: string;
  lines: string[];
  recommendedAction: string;
  lossRate: number;
  latestMessageId?: string;
};
