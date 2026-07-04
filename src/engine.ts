import { distance, point } from "@turf/turf";
import { defaultSimulationId, osintSources, simulationPresets } from "./data";
import type {
  AarSummary,
  CommandPost,
  DecisionState,
  DefenseAsset,
  EngagementRecommendation,
  FusedTrack,
  OsintSource,
  ScenarioKey,
  SimulationPreset,
  SituationBriefing,
  TacticalMessage,
} from "./types";

export type ScenarioFlags = Record<ScenarioKey, boolean>;

export const SIMULATION_STEP_SEC = 4;
export const SIMULATION_MAX_TICK = 15;

export type CopModel = {
  messages: TacticalMessage[];
  tracks: FusedTrack[];
  assets: DefenseAsset[];
  recommendations: EngagementRecommendation[];
  aar: AarSummary;
  briefing: SituationBriefing;
  activeSources: OsintSource[];
  simulation: SimulationPreset;
  commandPost: CommandPost;
  simulationTimeSec: number;
  latestMessage?: TacticalMessage;
};

export type ScenarioRuntime = {
  manualInterceptResolved?: boolean;
  manualInterceptMissed?: boolean;
  fighterResponseAcknowledged?: boolean;
  fighterResponseMissed?: boolean;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const avg = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

const geoDistanceKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
  distance(point([a.lng, a.lat]), point([b.lng, b.lat]), { units: "kilometers" });

function formatTime(sec: number) {
  return `T+00:${String(Math.round(sec)).padStart(2, "0")}`;
}

function formatOperationalPayload(payload: string) {
  return payload
    .replace(/^AI 추천:/, "대응 후보:")
    .replaceAll("시뮬레이션", "합성 COP")
    .replaceAll("전술 조언", "대응 추천");
}

export function getSimulationPreset(simulationId: string): SimulationPreset {
  return simulationPresets.find((preset) => preset.id === simulationId) ?? simulationPresets[0];
}

function applyScenarioToMessages(
  flags: ScenarioFlags,
  simulationTimeSec: number,
  simulation: SimulationPreset,
  runtime: ScenarioRuntime = {},
): TacticalMessage[] {
  const droneGateOpen = Boolean(runtime.manualInterceptResolved || runtime.manualInterceptMissed);
  const fighterResponseMissed = droneGateOpen && Boolean(runtime.fighterResponseMissed || (!runtime.fighterResponseAcknowledged && simulationTimeSec >= 40));
  const messages = simulation.messages
    .filter((message) => message.receivedAtSec <= simulationTimeSec)
    .filter((message) => {
      if (message.requiresManualInterceptMissed) return Boolean(runtime.manualInterceptMissed);
      if (message.requiresFighterResponseMissed) return fighterResponseMissed;
      if (message.requiresManualIntercept) return droneGateOpen;
      return true;
    })
    .map((message) => ({ ...message, provenance: [...message.provenance] }));

  if (flags.messageLoss) {
    messages.forEach((message, index) => {
      if (message.type !== "PPLI" && index % 3 === 1) {
        message.confidence = clamp(message.confidence - 22, 8, 100);
        message.linkQuality = clamp(message.linkQuality - 31, 8, 100);
        message.payload = `${message.payload} | delayed packet`;
      }
    });
  }

  if (flags.ewJamming) {
    messages.forEach((message) => {
      if (message.trackHint === "SUS-877" || message.sourceId.includes("EW")) {
        message.confidence = clamp(message.confidence - 12, 8, 100);
        message.linkQuality = clamp(message.linkQuality - 36, 5, 100);
        if (!message.provenance.includes("synthetic-rf-node")) message.provenance.push("synthetic-rf-node");
      }
    });
  }

  if (flags.sensorConflict) {
    const conflictLat = simulation.commandPost.lat + 0.36;
    const conflictLng = simulation.commandPost.lng + 0.46;
    messages.push({
      id: "MSG-CONFLICT",
      sequence: 99,
      type: "SURVEILLANCE_TRACK",
      sourceId: "EOIR-COAST-02",
      sourceLabel: "EO/IR conflicting read",
      receivedAtSec: simulationTimeSec,
      timestamp: formatTime(simulationTimeSec),
      lat: conflictLat,
      lng: conflictLng,
      altitudeFt: 12600,
      speedKts: 192,
      headingDeg: 213,
      confidence: 48,
      linkQuality: 81,
      trackHint: "SENSOR-CONFLICT",
      classification: "suspect",
      payload: "센서 불일치: EO/IR heading이 radar custody와 다름",
      provenance: ["osint-natural-earth"],
    });
  }

  return messages.sort((a, b) => a.sequence - b.sequence);
}

function applyScenarioToAssets(flags: ScenarioFlags, assets: DefenseAsset[]): DefenseAsset[] {
  return assets.map((asset) => {
    const next = { ...asset };
    if (flags.assetDegrade && asset.assetId === "L2-SAM-B") {
      next.readiness = 48;
      next.ammo = 2;
    }
    if (flags.ewJamming && asset.layer === "EW") {
      next.readiness = clamp(next.readiness + 7, 0, 100);
    }
    if (flags.messageLoss && asset.effect === "track-custody") {
      next.readiness = clamp(next.readiness + 5, 0, 100);
    }
    return next;
  });
}

function classificationRisk(classification: TacticalMessage["classification"]) {
  if (classification === "hostile") return 38;
  if (classification === "suspect") return 24;
  if (classification === "unknown") return 14;
  return -18;
}

function fuseTrack(trackKey: string, group: TacticalMessage[], flags: ScenarioFlags, commandPost: CommandPost): FusedTrack {
  const latest = [...group].sort((a, b) => a.receivedAtSec - b.receivedAtSec || a.sequence - b.sequence).at(-1) ?? group[0];
  const lat = latest.lat;
  const lng = latest.lng;
  const confidenceBase = avg(group.map((message) => message.confidence));
  const linkBase = avg(group.map((message) => message.linkQuality));
  const conflictPenalty =
    flags.sensorConflict && group.some((message) => message.id.includes("CONFLICT")) ? 19 : 0;
  const dedupeBonus = group.length > 1 ? 7 : 0;
  const confidence = clamp(Math.round(confidenceBase + dedupeBonus - conflictPenalty), 0, 99);
  const linkQuality = clamp(Math.round(linkBase - (flags.messageLoss ? 8 : 0) - (flags.ewJamming ? 6 : 0)), 0, 99);
  const classification = group.some((message) => message.classification === "hostile")
    ? "hostile"
    : group.some((message) => message.classification === "suspect")
      ? "suspect"
      : group.some((message) => message.classification === "unknown")
        ? "unknown"
        : "friendly";
  const distToCp = geoDistanceKm({ lat, lng }, commandPost);
  const inboundRisk = clamp(80 - distToCp * 0.6, 0, 80);
  const threatScore = clamp(
    Math.round(inboundRisk + classificationRisk(classification) + (100 - confidence) * 0.18 + (100 - linkQuality) * 0.12),
    0,
    99,
  );
  const status =
    confidence < 55 || flags.sensorConflict
      ? "ambiguous"
      : linkQuality < 58 || flags.messageLoss || flags.ewJamming
        ? "degraded"
        : threatScore >= 72
          ? "priority"
          : "stable";

  return {
    trackId: trackKey,
    classification,
    lat,
    lng,
    altitudeFt: Math.round(latest.altitudeFt),
    speedKts: Math.round(latest.speedKts),
    headingDeg: Math.round(latest.headingDeg),
    sources: [...new Set(group.map((message) => message.sourceId))],
    sourceLabels: [...new Set(group.map((message) => message.sourceLabel))],
    confidence,
    threatScore,
    linkQuality,
    status,
    evidence: [...new Set(group.flatMap((message) => message.provenance))],
    messageIds: group.map((message) => message.id),
    entityId: latest.entityId ?? group.find((message) => message.entityId)?.entityId,
    entityType: latest.entityType ?? group.find((message) => message.entityType)?.entityType,
    side: latest.side ?? group.find((message) => message.side)?.side,
    threatClassId: latest.threatClassId ?? group.find((message) => message.threatClassId)?.threatClassId,
    evidenceIds: [...new Set(group.flatMap((message) => message.evidenceIds ?? [message.id]))],
    conceptIds: [...new Set(group.flatMap((message) => message.conceptIds ?? []))],
    representedCount: latest.representedCount ?? group.find((message) => message.representedCount)?.representedCount,
    ontologyLinkIds: group
      .filter((message) => message.threatClassId)
      .map((message) => `${message.sourceId}:detects:${message.entityId ?? message.trackHint}`),
  };
}

export function fuseTracks(messages: TacticalMessage[], flags: ScenarioFlags, commandPost: CommandPost): FusedTrack[] {
  const tactical = messages.filter(
    (message) =>
      message.type !== "ASSET_STATUS" &&
      message.type !== "ENGAGEMENT_RECOMMENDATION" &&
      message.type !== "ROE_DECISION" &&
      message.trackHint !== "LINK-LOSS",
  );
  const groups: TacticalMessage[][] = [];

  tactical.forEach((message) => {
    const existing = groups.find((group) => {
      const lead = group[0];
      if (lead.trackHint === message.trackHint) return true;
      if (lead.classification === "friendly" || message.classification === "friendly") return false;
      const groupPoint = {
        lat: avg(group.map((item) => item.lat)),
        lng: avg(group.map((item) => item.lng)),
      };
      const headingDelta = Math.abs(((avg(group.map((item) => item.headingDeg)) - message.headingDeg + 540) % 360) - 180);
      return geoDistanceKm(groupPoint, message) < 9 && headingDelta < 34;
    });

    if (existing) {
      existing.push(message);
      return;
    }

    groups.push([message]);
  });

  return groups
    .map((group) => {
      const trackHints = [...new Set(group.map((message) => message.trackHint))];
      const trackKey = trackHints.length > 1 ? trackHints.join(" / ") : trackHints[0];
      return fuseTrack(trackKey, group, flags, commandPost);
    })
    .sort((a, b) => b.threatScore - a.threatScore);
}

function pickAsset(track: FusedTrack, assets: DefenseAsset[]) {
  const preferredFighterCap =
    track.threatClassId === "RED_FIGHTER_RAID"
      ? assets.find((asset) => {
          const assetText = `${asset.assetId} ${asset.name} ${asset.shortName} ${asset.assetClassId ?? ""}`.toUpperCase();
          return asset.effect === "intercept" && (assetText.includes("FTR") || assetText.includes("FIGHTER") || assetText.includes("CAP"));
        })
      : undefined;
  if (preferredFighterCap) {
    return {
      asset: preferredFighterCap,
      score: preferredFighterCap.readiness + preferredFighterCap.ammo * 3,
      distKm: geoDistanceKm(track, preferredFighterCap),
    };
  }

  const preferredAttackDrone =
    track.threatClassId === "RED_UAV_SWARM"
      ? assets.find((asset) => {
          const assetText = `${asset.assetId} ${asset.name} ${asset.shortName} ${asset.assetClassId ?? ""}`.toUpperCase();
          return asset.effect === "intercept" && (assetText.includes("DRONE") || assetText.includes("ATK-DRN") || assetText.includes("ATTACK"));
        })
      : undefined;
  if (preferredAttackDrone) {
    return {
      asset: preferredAttackDrone,
      score: preferredAttackDrone.readiness + preferredAttackDrone.ammo * 3,
      distKm: geoDistanceKm(track, preferredAttackDrone),
    };
  }

  const preferredSoftKill = track.threatClassId === "RED_UAV_SWARM" ? assets.find((asset) => asset.effect === "soft-kill") : undefined;
  if (preferredSoftKill) {
    return {
      asset: preferredSoftKill,
      score: preferredSoftKill.readiness + preferredSoftKill.ammo * 3,
      distKm: geoDistanceKm(track, preferredSoftKill),
    };
  }

  return assets
    .map((asset) => {
      const distKm = geoDistanceKm(track, asset);
      const rangeFit = distKm <= asset.rangeKm ? 30 : -18;
      const ammoFit = asset.ammo > 0 ? 20 : -40;
      let roleFit = 8;
      if (track.threatClassId === "RED_UAV_SWARM" && asset.effect === "soft-kill") roleFit = 42;
      else if (track.threatClassId === "RED_EW_RADAR" && asset.effect === "track-custody") roleFit = 32;
      else if (track.threatClassId === "RED_CRUISE_MISSILE" && asset.effect === "intercept") roleFit = 28;
      else if (track.status === "ambiguous" && asset.effect === "track-custody") roleFit = 26;
      else if (track.linkQuality < 60 && asset.effect === "soft-kill") roleFit = 24;
      else if (track.classification === "hostile" && asset.effect === "intercept") roleFit = 22;
      return {
        asset,
        score: asset.readiness * 0.45 + rangeFit + ammoFit + roleFit - distKm * 0.16,
        distKm,
      };
    })
    .sort((a, b) => b.score - a.score)[0];
}

export function buildRecommendations(tracks: FusedTrack[], assets: DefenseAsset[]): EngagementRecommendation[] {
  return tracks
    .filter((track) => track.classification !== "friendly")
    .slice(0, 6)
    .map((track, index) => {
      const selected = pickAsset(track, assets);
      const lowConfidence = track.confidence < 58 || track.status === "ambiguous";
      const degradedAsset = selected.asset.readiness < 55 || selected.asset.ammo <= 1;
      const droneInterceptApproval = track.threatClassId === "RED_UAV_SWARM" && selected.asset.effect === "intercept";
      const roeStatus = droneInterceptApproval ? "approval-required" : lowConfidence || degradedAsset ? "hold" : track.threatScore >= 68 ? "approval-required" : "auto";
      const confidence = clamp(
        Math.round(track.confidence * 0.52 + selected.asset.readiness * 0.3 + track.linkQuality * 0.18 - (degradedAsset ? 18 : 0)),
        0,
        99,
      );
      const reasons = [
        `${track.trackId} threat ${track.threatScore}, confidence ${track.confidence}`,
        `${selected.asset.shortName} readiness ${selected.asset.readiness}, range ${selected.asset.rangeKm}km`,
        track.threatClassId && selected.asset.weaponClassIds?.[0]
          ? `${track.threatClassId} -> ${selected.asset.weaponClassIds[0]} simulated candidate`
          : "class mapping unavailable; use custody confirmation",
        roeStatus === "hold"
          ? "ROE: confidence 또는 asset readiness 기준 미달"
          : droneInterceptApproval
            ? "ROE: 요격 드론 출격 전 지휘관 승인 보류"
          : roeStatus === "approval-required"
            ? "ROE: 고위협 트랙은 human-on-the-loop 승인 필요"
            : "ROE: track custody/soft-kill 자동 수행 가능",
        "NO_EXECUTE advisory only",
      ];
      const recommendedWeaponClassId = selected.asset.weaponClassIds?.[0];
      const decisionRecordId = `DEC-RUNTIME-${index + 1}-${track.entityId ?? track.trackId}`;

      return {
        id: `REC-${index + 1}-${track.trackId}`,
        priority: index + 1,
        trackId: track.trackId,
        assetId: selected.asset.assetId,
        assetName: selected.asset.name,
        effect: selected.asset.effect,
        confidence,
        roeStatus,
        etaSec: clamp(Math.round(selected.distKm * 1.8 + (100 - selected.asset.readiness) * 0.4), 18, 180),
        reasons,
        osintSourceIds: track.evidence,
        decisionRecordId,
        threatClassId: track.threatClassId,
        recommendedWeaponClassId,
        scoreBreakdown: {
          targetFit: Math.round((track.confidence / 100) * 100) / 100,
          readiness: Math.round((selected.asset.readiness / 100) * 100) / 100,
          inventory: selected.asset.ammo,
          channelAvailable: Boolean((selected.asset.channels ?? 0) > 0 && selected.asset.ammo > 0),
          costPenalty: selected.asset.layer === "L2" ? 0.18 : selected.asset.layer === "L1" ? 0.12 : 0.05,
          scarcityPenalty: selected.asset.ammo <= 2 ? 0.24 : selected.asset.ammo <= 4 ? 0.14 : 0.06,
          timeToImpactSec: clamp(Math.round(selected.distKm * 1.8), 24, 180),
        },
        constraintsChecked: ["SIMULATED_ONLY", "NO_REAL_COMMAND", "NO_REAL_INVENTORY", "NO_REAL_LOCATION", "NO_DUPLICATE_ASSIGNMENT"],
        evidenceIds: track.evidenceIds,
        ontologyLinkIds:
          recommendedWeaponClassId && track.threatClassId
            ? [`${recommendedWeaponClassId}:candidate_for:${track.threatClassId}`, ...(track.ontologyLinkIds ?? [])]
            : track.ontologyLinkIds,
        noExecute: true,
      };
    });
}

export function buildAar(
  messages: TacticalMessage[],
  tracks: FusedTrack[],
  recommendations: EngagementRecommendation[],
  decisions: Record<string, DecisionState>,
): AarSummary {
  const approvedCount = Object.values(decisions).filter((decision) => decision === "approved").length;
  const heldCount = Object.values(decisions).filter((decision) => decision === "held").length;
  const degradedMessages = messages.filter((message) => message.confidence < 60 || message.linkQuality < 60).length;
  const sourceIds = [...new Set([...tracks.flatMap((track) => track.evidence), ...recommendations.flatMap((item) => item.osintSourceIds)])];
  const avgConfidence = tracks.length > 0 ? Math.round(avg(tracks.map((track) => track.confidence))) : 0;
  const avgRisk = tracks.length > 0 ? Math.round(avg(tracks.map((track) => track.threatScore))) : 0;

  return {
    processedMessages: messages.length,
    fusedTracks: tracks.length,
    dedupedMessages: messages.length - tracks.length,
    degradedMessages,
    approvedCount,
    heldCount,
    osintSourcesUsed: sourceIds,
    nextActions: [
      heldCount > 0 ? "보류 트랙은 추가 센서 확인 후 재추천" : "승인 트랙은 AAR에 근거와 함께 기록",
      degradedMessages > 0 ? "메시지 손실 구간은 relay 또는 EW 지원 우선 검토" : "데이터링크 상태는 정상 범위 유지",
      "OSINT 근거와 합성 전술 메시지는 발표에서 명확히 분리 설명",
    ],
    timeline: [
      { label: "Raw feed", confidence: clamp(avgConfidence - degradedMessages * 3, 0, 99), risk: clamp(avgRisk + degradedMessages * 2, 0, 99) },
      { label: "Fused COP", confidence: avgConfidence, risk: avgRisk },
      {
        label: "ROE decision",
        confidence: clamp(avgConfidence + approvedCount * 3 - heldCount * 6, 0, 99),
        risk: clamp(avgRisk - approvedCount * 4 + heldCount * 3, 0, 99),
      },
    ],
  };
}

function buildBriefing(
  messages: TacticalMessage[],
  tracks: FusedTrack[],
  recommendations: EngagementRecommendation[],
  simulationTimeSec: number,
  simulation: SimulationPreset,
): SituationBriefing {
  const friendlyTracks = tracks.filter((track) => track.classification === "friendly");
  const uavCount = friendlyTracks.filter((track) => track.trackId.includes("UAV")).length;
  const aircraftCount = friendlyTracks.filter((track) => track.trackId.startsWith("F-")).length;
  const nonFriendly = tracks.filter((track) => track.classification !== "friendly");
  const topTrack = nonFriendly[0];
  const mergedTrack =
    tracks.find((track) => track.trackId.includes(" / ")) ??
    tracks.find((track) => track.messageIds.length > 1 && track.sources.length > 1);
  const lossMessage = messages.find((message) => message.trackHint === "LINK-LOSS");
  const parsedLossRate = lossMessage?.payload.match(/손실률\s*(\d+)%/)?.[1];
  const lossRate = parsedLossRate ? Number(parsedLossRate) : lossMessage ? 25 : 6;
  const latestMessage = messages[messages.length - 1];
  const leadingRecommendation = recommendations[0];

  const lines = [
    `현재 ${simulation.regionLabel}에 아군 항공기 ${aircraftCount}대와 UAV ${uavCount}대가 작전 중입니다.`,
    topTrack
      ? `${topTrack.trackId} 항적이 접근 중이며 confidence ${topTrack.confidence}%, threat ${topTrack.threatScore}%로 평가됩니다.`
      : "아직 비협조 항적은 탐지되지 않았습니다.",
    mergedTrack
      ? `중복 탐지 ${mergedTrack.messageIds.join(", ")}는 ${mergedTrack.trackId} fused track으로 병합되었습니다.`
      : "복수 센서가 같은 항적을 탐지하면 자동으로 fused track 후보를 만듭니다.",
    `최근 메시지 손실률은 ${lossRate}%이며, 링크 품질 저하가 있는 트랙은 confidence와 ROE 상태에 즉시 반영됩니다.`,
  ];

  return {
    generatedAt: formatTime(simulationTimeSec),
    headline: latestMessage ? `최근 COP 수신: ${formatOperationalPayload(latestMessage.payload)}` : "실시간 전술 메시지 대기 중",
    lines,
    recommendedAction: leadingRecommendation
      ? `${leadingRecommendation.trackId} 우선 확인. 긴급 조건에서는 ${leadingRecommendation.assetName} 대응 후보가 지휘관 결심 팝업으로 표시됩니다.`
      : "UAV-03 추적 유지와 F-01/F-02 식별 지원 대기.",
    lossRate,
    latestMessageId: latestMessage?.id,
  };
}

export function buildCopModel(
  flags: ScenarioFlags,
  decisions: Record<string, DecisionState>,
  simulationTick = SIMULATION_MAX_TICK,
  simulationId = defaultSimulationId,
  runtime: ScenarioRuntime = {},
): CopModel {
  const simulation = getSimulationPreset(simulationId);
  const simulationTimeSec = simulationTick * SIMULATION_STEP_SEC;
  const messages = applyScenarioToMessages(flags, simulationTimeSec, simulation, runtime);
  const assets = applyScenarioToAssets(flags, simulation.assets);
  const tracks = fuseTracks(messages, flags, simulation.commandPost);
  const recommendations = buildRecommendations(tracks, assets);
  const assignedAssets = assets.map((asset) => {
    const assigned = recommendations.find((recommendation) => recommendation.assetId === asset.assetId);
    return assigned ? { ...asset, assignedTrackId: assigned.trackId } : asset;
  });
  const aar = buildAar(messages, tracks, recommendations, decisions);
  const briefing = buildBriefing(messages, tracks, recommendations, simulationTimeSec, simulation);
  const activeSources = osintSources.filter((source) => aar.osintSourcesUsed.includes(source.sourceId));
  const latestMessage = messages[messages.length - 1];

  return {
    messages,
    tracks,
    assets: assignedAssets,
    recommendations,
    aar,
    briefing,
    activeSources,
    simulation,
    commandPost: simulation.commandPost,
    simulationTimeSec,
    latestMessage,
  };
}
