import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  CircleDashed,
  Gauge,
  History,
  Maximize2,
  Minimize2,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Siren,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";
import clsx from "clsx";
import { buildCopModel, SIMULATION_MAX_TICK, SIMULATION_STEP_SEC } from "./engine";
import { useCopStore } from "./store";
import type {
  CommandPost,
  DecisionState,
  DefenseAsset,
  EngagementRecommendation,
  FighterRaidSnapshot,
  FighterRaidSnapshotEntity,
  FighterRaidStreamLite,
  FusedTrack,
  PlaybackSpeed,
  SimulationPreset,
  SimulationSeverity,
  SituationBriefing,
  TacticalMessage,
  TrajectorySpec,
} from "./types";
import "./styles.css";

const playbackSpeeds: PlaybackSpeed[] = [0.5, 1, 2, 4];

const advisoryStatusLabel: Record<EngagementRecommendation["roeStatus"], string> = {
  auto: "감시 유지",
  "approval-required": "결심 필요",
  hold: "추가 확인",
};

const decisionLabel: Record<DecisionState, string> = {
  pending: "검토 대기",
  approved: "추천안 채택",
  held: "직접 판단",
};

const severityLabel: Record<SimulationSeverity, string> = {
  basic: "WATCH",
  normal: "GUARD",
  crisis: "WARNING",
  war: "CRITICAL",
};

type AuxiliaryLayerId = "assets";

const auxiliaryLayerControls: Array<{
  id: AuxiliaryLayerId;
  label: string;
  icon: React.ElementType;
}> = [
  { id: "assets", label: "자원 제약", icon: ShieldCheck },
];

const settingsCategories = [
  { id: "auxiliary", label: "보조 정보", status: "활성" },
  { id: "map", label: "지도 표시", status: "준비 중" },
  { id: "alerts", label: "알림", status: "준비 중" },
  { id: "briefing", label: "브리핑", status: "준비 중" },
] as const;

const defaultAuxiliaryLayers: Record<AuxiliaryLayerId, boolean> = {
  assets: false,
};

const effectLabel: Record<DefenseAsset["effect"], string> = {
  intercept: "고위협 표적 대응",
  "soft-kill": "전자전/비살상 억제",
  "track-custody": "추적 유지",
  relay: "감시·통신 보강",
};

const dmzBoundaryLines = [
  {
    id: "blue",
    label: "BLUE WATCH",
    lat: 38.72,
    color: "#38bdf8",
    rule: "탐지·식별",
  },
  {
    id: "orange",
    label: "ORANGE RESPONSE",
    lat: 38.34,
    color: "#f59e0b",
    rule: "대응 출격 준비",
  },
  {
    id: "red",
    label: "RED WAR",
    lat: 38.0,
    color: "#ef4444",
    rule: "월선 시 전시 전환",
  },
] as const;

const dmzOrangeResponseLat = 38.34;
const dmzRedWarLat = 38.0;
const seoulTarget = {
  lat: 37.5665,
  lng: 126.978,
  label: "SEOUL",
} as const;

const formatDisplayTime = (sec: number) => `T+00:${String(Math.round(sec)).padStart(2, "0")}`;

type ManualInterceptStatus = "idle" | "armed" | "resolved" | "missed";

type ManualInterceptState = {
  status: ManualInterceptStatus;
  assetId?: string;
  targetTrackId?: string;
  resolvedAtSec?: number;
  missedAtSec?: number;
};

const emptyManualIntercept: ManualInterceptState = { status: "idle" };

type FighterResponseState = {
  selectedFighterId?: string;
  acknowledgedAtSec?: number;
  acceptedAtSec?: number;
  missedAtSec?: number;
  autoApprovedByRedLine?: boolean;
};

const emptyFighterResponse: FighterResponseState = {};

const dmzReconMissedAfterSec = 28;
const dmzFighterResponseMissedAfterSec = 40;

const mapIconSize = {
  asset: 32,
  assetSelected: 38,
  track: 32,
  trackSelected: 38,
  formation: 12,
  formationSelected: 14,
  interceptor: 28,
  fighterRaidRed: 9,
  fighterRaidBlue: 11,
  fighterRaidBlueSelected: 15,
} as const;

const resourceToneLabel = (asset: DefenseAsset) => {
  if (asset.readiness < 58 || asset.ammo <= 2) return { label: "제약 높음", tone: "bad" as const };
  if (asset.readiness < 74 || asset.ammo <= 4) return { label: "주의", tone: "warn" as const };
  return { label: "가용", tone: "good" as const };
};

const isAttackDroneAsset = (asset?: DefenseAsset) => {
  if (!asset) return false;
  const assetText = `${asset.assetId} ${asset.name} ${asset.shortName} ${asset.assetClassId ?? ""}`.toUpperCase();
  return assetText.includes("ATTACK") || assetText.includes("DRONE") || assetText.includes("ATK-DRN");
};

const isReconDroneTrack = (track?: FusedTrack) => {
  if (!track) return false;
  return track.trackId.includes("KPA-REC") || (track.side === "RED" && track.entityType === "UAV");
};

const sustainmentLabel = (asset: DefenseAsset) => {
  if (asset.ammo <= 2) return "제한";
  if (asset.ammo <= 4) return "주의";
  return "충분";
};

const channelLabel = (asset: DefenseAsset) => {
  const channels = asset.channels ?? 1;
  if (channels >= 4) return "여유";
  if (channels >= 2) return "보통";
  return "제한";
};

type UnitSideTone = "blue" | "red" | "neutral";

type UnitIconKey =
  | "fighter"
  | "uav"
  | "missile"
  | "radar"
  | "strike"
  | "swarm"
  | "link"
  | "defense"
  | "sensor"
  | "ew"
  | "relay"
  | "unknown";

type UnitVisual = {
  sideTone: UnitSideTone;
  sideCode: "BLUE" | "RED" | "UNK";
  typeCode: string;
  iconKey: UnitIconKey;
};

const threatClassCode = (threatClassId?: string) => {
  if (!threatClassId) return "TGT";
  if (threatClassId.includes("BALLISTIC")) return "BM";
  if (threatClassId.includes("CRUISE")) return "CM";
  if (threatClassId.includes("UAV")) return "UAV";
  if (threatClassId.includes("FIGHTER")) return "FTR";
  if (threatClassId.includes("ATTACK_AIRCRAFT")) return "ATK";
  if (threatClassId.includes("RADAR") || threatClassId.includes("EW")) return "EW";
  if (threatClassId.includes("UNKNOWN")) return "UNK";
  return threatClassId.replace(/^RED_/, "").replaceAll("_", " ");
};

const threatIconKey = (threatClassId?: string): UnitIconKey => {
  if (!threatClassId) return "unknown";
  if (threatClassId.includes("BALLISTIC") || threatClassId.includes("CRUISE")) return "missile";
  if (threatClassId.includes("UAV")) return "swarm";
  if (threatClassId.includes("FIGHTER")) return "fighter";
  if (threatClassId.includes("ATTACK_AIRCRAFT")) return "strike";
  if (threatClassId.includes("RADAR") || threatClassId.includes("EW")) return "radar";
  return "unknown";
};

const trackUnitVisual = (track: FusedTrack): UnitVisual => {
  const sideTone: UnitSideTone =
    track.side === "RED" || track.classification === "hostile" || track.classification === "suspect"
      ? "red"
      : track.side === "BLUE" || track.classification === "friendly"
        ? "blue"
        : "neutral";
  const sideCode = sideTone === "red" ? "RED" : sideTone === "blue" ? "BLUE" : "UNK";

  const entityType = track.entityType;
  if (entityType === "FRIENDLY_AIR") return { sideCode, sideTone, typeCode: "FTR", iconKey: "fighter" };
  if (entityType === "UAV") return { sideCode, sideTone, typeCode: "UAV", iconKey: "uav" };
  if (entityType === "THREAT_RADAR") return { sideCode, sideTone, typeCode: "RADAR", iconKey: "radar" };
  if (entityType === "BALLISTIC_MISSILE") return { sideCode, sideTone, typeCode: "BM", iconKey: "missile" };
  if (entityType === "CRUISE_MISSILE") return { sideCode, sideTone, typeCode: "CM", iconKey: "missile" };
  if (entityType === "FIGHTER_RAID") return { sideCode, sideTone, typeCode: "FTR", iconKey: "fighter" };
  if (entityType === "ATTACK_AIRCRAFT") return { sideCode, sideTone, typeCode: "ATK", iconKey: "strike" };
  if (entityType === "UAV_SWARM") return { sideCode, sideTone, typeCode: "UAV", iconKey: "swarm" };
  if (entityType === "LINK_STATUS") return { sideCode, sideTone, typeCode: "LINK", iconKey: "link" };

  return { sideCode, sideTone, typeCode: threatClassCode(track.threatClassId), iconKey: threatIconKey(track.threatClassId) };
};

const assetUnitVisual = (asset: DefenseAsset): UnitVisual => {
  const classText = `${asset.assetClassId ?? ""} ${asset.name} ${asset.shortName}`.toUpperCase();
  if (classText.includes("DRONE") || classText.includes("UAV") || classText.includes("ATK-DRN")) {
    return { sideCode: "BLUE", sideTone: "blue", typeCode: "UAV", iconKey: "uav" };
  }
  if (classText.includes("FA50") || classText.includes("F15") || classText.includes("F35") || classText.includes("KF16")) {
    return { sideCode: "BLUE", sideTone: "blue", typeCode: "FTR", iconKey: "fighter" };
  }
  if (classText.includes("AEW") || asset.effect === "track-custody") {
    return { sideCode: "BLUE", sideTone: "blue", typeCode: "ISR", iconKey: "sensor" };
  }
  if (classText.includes("EW") || asset.effect === "soft-kill") {
    return { sideCode: "BLUE", sideTone: "blue", typeCode: "EW", iconKey: "ew" };
  }
  if (asset.effect === "relay") {
    return { sideCode: "BLUE", sideTone: "blue", typeCode: "RELAY", iconKey: "relay" };
  }
  return { sideCode: "BLUE", sideTone: "blue", typeCode: "SAM", iconKey: "defense" };
};

const advisoryThreatVisual = (recommendation: EngagementRecommendation): UnitVisual => ({
  sideTone: "red",
  sideCode: "RED",
  typeCode: threatClassCode(recommendation.threatClassId),
  iconKey: threatIconKey(recommendation.threatClassId),
});

const advisoryResourceVisual = (recommendation: EngagementRecommendation): UnitVisual => {
  if (recommendation.effect === "soft-kill") {
    return { sideCode: "BLUE", sideTone: "blue", typeCode: "EW", iconKey: "ew" };
  }
  if (recommendation.effect === "track-custody") {
    return { sideCode: "BLUE", sideTone: "blue", typeCode: "ISR", iconKey: "sensor" };
  }
  if (recommendation.effect === "relay") {
    return { sideCode: "BLUE", sideTone: "blue", typeCode: "RELAY", iconKey: "relay" };
  }
  return { sideCode: "BLUE", sideTone: "blue", typeCode: "SAM", iconKey: "defense" };
};

const unitVisualLabel = (unit: UnitVisual) => `${unit.sideCode}-${unit.typeCode}`;

const blueUavUnit: UnitVisual = { sideCode: "BLUE", sideTone: "blue", typeCode: "UAV", iconKey: "uav" };
const redUavUnit: UnitVisual = { sideCode: "RED", sideTone: "red", typeCode: "UAV", iconKey: "uav" };

const inventoryUnitVisual = (side: "RED" | "BLUE" | "UNKNOWN", kind: string): UnitVisual => {
  const kindText = kind.toUpperCase();
  const sideTone: UnitSideTone = side === "RED" ? "red" : side === "BLUE" ? "blue" : "neutral";
  const sideCode = side === "RED" ? "RED" : side === "BLUE" ? "BLUE" : "UNK";
  if (kindText.includes("전투기") || kindText.includes("FIGHTER")) {
    return { sideCode, sideTone, typeCode: "FTR", iconKey: "fighter" };
  }
  if (kindText.includes("드론") || kindText.includes("DRONE") || kindText.includes("UAV")) {
    return { sideCode, sideTone, typeCode: "UAV", iconKey: kindText.includes("정찰") ? "uav" : "swarm" };
  }
  if (kindText.includes("미사일") || kindText.includes("MISSILE")) {
    return { sideCode, sideTone, typeCode: "MSL", iconKey: "missile" };
  }
  if (kindText.includes("방공") || kindText.includes("AIR-DEFENSE")) {
    return { sideCode, sideTone, typeCode: "SAM", iconKey: "defense" };
  }
  return { sideCode, sideTone, typeCode: "UNIT", iconKey: "unknown" };
};

const pathMessageTypes = new Set<TacticalMessage["type"]>(["PPLI", "SURVEILLANCE_TRACK", "EW_STATUS"]);

const smoothProgress = (value: number) => {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
};

const interpolateNumber = (from: number, to: number, progress: number) => from + (to - from) * progress;

const dmzReconIngressPosition = (
  track: FusedTrack,
  simulationTimeSec: number,
): Pick<FusedTrack, "lat" | "lng" | "altitudeFt" | "speedKts" | "headingDeg"> | undefined => {
  if (!track.trackId.includes("KPA-REC-01")) return undefined;

  const startSec = 8;
  const endSec = 32;
  const progress = Math.max(0, Math.min(1, (simulationTimeSec - startSec) / (endSec - startSec)));
  const attackRun = smoothProgress(progress);

  return {
    lat: interpolateNumber(38.72, 37.78, attackRun),
    lng: interpolateNumber(127.32, 127.08, attackRun) + Math.sin(simulationTimeSec * 0.48) * 0.012,
    altitudeFt: Math.round(interpolateNumber(6200, 5000, attackRun)),
    speedKts: Math.round(interpolateNumber(94, 132, attackRun)),
    headingDeg: Math.round(interpolateNumber(192, 184, attackRun)),
  };
};

const trackMotionSeed = (trackId: string) =>
  Array.from(trackId).reduce((seed, char, index) => seed + char.charCodeAt(0) * (index + 3), 0) * 0.017;

const organicTrackMotion = (
  track: FusedTrack,
  position: Pick<FusedTrack, "lat" | "lng" | "altitudeFt" | "speedKts" | "headingDeg">,
  simulationTimeSec: number,
): Pick<FusedTrack, "lat" | "lng" | "altitudeFt" | "speedKts" | "headingDeg"> => {
  const isDrone =
    track.entityType === "UAV" || track.entityType === "UAV_SWARM" || track.threatClassId?.includes("UAV") || track.trackId.includes("REC");
  const isFighter =
    track.entityType === "FRIENDLY_AIR" ||
    track.entityType === "FIGHTER_RAID" ||
    track.threatClassId?.includes("FIGHTER") ||
    track.trackId.includes("FTR") ||
    track.trackId.includes("CAP");

  if (!isDrone && !isFighter) return position;

  const seed = trackMotionSeed(track.trackId);
  const isReconIngressDrone = track.trackId.includes("KPA-REC-01");
  const lateralKm = isReconIngressDrone ? 0.9 : isDrone ? 2.2 : track.entityType === "FIGHTER_RAID" ? 1.15 : 0.85;
  const longitudinalKm = isReconIngressDrone ? 0.25 : isDrone ? 0.65 : 0.35;
  const frequency = isDrone ? 0.96 : 0.42;
  const headingRad = ((position.headingDeg ?? track.headingDeg ?? 0) * Math.PI) / 180;
  const phase = simulationTimeSec * frequency + seed;
  const lateral = Math.sin(phase) * lateralKm;
  const longitudinal = Math.cos(phase * 0.7 + seed) * longitudinalKm;
  const northKm = Math.cos(headingRad) * longitudinal + Math.cos(headingRad + Math.PI / 2) * lateral;
  const eastKm = Math.sin(headingRad) * longitudinal + Math.sin(headingRad + Math.PI / 2) * lateral;
  const lngScale = Math.max(0.32, Math.cos((position.lat * Math.PI) / 180));

  return {
    ...position,
    lat: position.lat + northKm / 111,
    lng: position.lng + eastKm / (111 * lngScale),
    altitudeFt: Math.round(position.altitudeFt + Math.sin(phase * 1.7) * (isDrone ? 120 : 55)),
    headingDeg: Math.round(position.headingDeg + Math.sin(phase) * (isDrone ? 8 : 3)),
  };
};

const animatedTrackPosition = (
  track: FusedTrack,
  messages: TacticalMessage[],
  simulationTimeSec: number,
  trajectorySpecs?: TrajectorySpec[],
): Pick<FusedTrack, "lat" | "lng" | "altitudeFt" | "speedKts" | "headingDeg"> => {
  const dmzIngressPosition = dmzReconIngressPosition(track, simulationTimeSec);
  if (dmzIngressPosition) return dmzIngressPosition;

  const trajectory = trajectorySpecs?.find((spec) => spec.entityId === track.entityId || spec.entityId.endsWith(track.trackId));
  if (trajectory?.waypoints?.length) {
    const sortedWaypoints = [...trajectory.waypoints].sort((a, b) => a.timeSec - b.timeSec);
    const previous = [...sortedWaypoints].reverse().find((waypoint) => waypoint.timeSec <= simulationTimeSec) ?? sortedWaypoints[0];
    const next = sortedWaypoints.find((waypoint) => waypoint.timeSec > simulationTimeSec);

    if (!next || next.timeSec === previous.timeSec) {
      return {
        lat: previous.lat,
        lng: previous.lng,
        altitudeFt: previous.altitudeFt ?? track.altitudeFt,
        speedKts: previous.speedKts ?? track.speedKts,
        headingDeg: previous.headingDeg ?? track.headingDeg,
      };
    }

    const progress = smoothProgress((simulationTimeSec - previous.timeSec) / (next.timeSec - previous.timeSec));

    return {
      lat: interpolateNumber(previous.lat, next.lat, progress),
      lng: interpolateNumber(previous.lng, next.lng, progress),
      altitudeFt: Math.round(interpolateNumber(previous.altitudeFt ?? track.altitudeFt, next.altitudeFt ?? track.altitudeFt, progress)),
      speedKts: Math.round(interpolateNumber(previous.speedKts ?? track.speedKts, next.speedKts ?? track.speedKts, progress)),
      headingDeg: Math.round(interpolateNumber(previous.headingDeg ?? track.headingDeg, next.headingDeg ?? track.headingDeg, progress)),
    };
  }

  const trackKeys = new Set(track.trackId.split(" / "));
  const path = messages
    .filter((message) => trackKeys.has(message.trackHint) && pathMessageTypes.has(message.type))
    .sort((a, b) => a.receivedAtSec - b.receivedAtSec || a.sequence - b.sequence);

  if (path.length === 0) {
    return {
      lat: track.lat,
      lng: track.lng,
      altitudeFt: track.altitudeFt,
      speedKts: track.speedKts,
      headingDeg: track.headingDeg,
    };
  }

  const previous = [...path].reverse().find((message) => message.receivedAtSec <= simulationTimeSec) ?? path[0];
  const next = path.find((message) => message.receivedAtSec > simulationTimeSec);

  if (!next || next.receivedAtSec === previous.receivedAtSec) {
    return {
      lat: previous.lat,
      lng: previous.lng,
      altitudeFt: previous.altitudeFt,
      speedKts: previous.speedKts,
      headingDeg: previous.headingDeg,
    };
  }

  const progress = smoothProgress((simulationTimeSec - previous.receivedAtSec) / (next.receivedAtSec - previous.receivedAtSec));

  return {
    lat: interpolateNumber(previous.lat, next.lat, progress),
    lng: interpolateNumber(previous.lng, next.lng, progress),
    altitudeFt: Math.round(interpolateNumber(previous.altitudeFt, next.altitudeFt, progress)),
    speedKts: Math.round(interpolateNumber(previous.speedKts, next.speedKts, progress)),
    headingDeg: Math.round(interpolateNumber(previous.headingDeg, next.headingDeg, progress)),
  };
};

const animateTracks = (tracks: FusedTrack[], messages: TacticalMessage[], simulationTimeSec: number, trajectorySpecs?: TrajectorySpec[]): FusedTrack[] =>
  tracks.map((track) => {
    const position = animatedTrackPosition(track, messages, simulationTimeSec, trajectorySpecs);
    return {
      ...track,
      ...organicTrackMotion(track, position, simulationTimeSec),
    };
  });

const isFighterFormationTrack = (track: FusedTrack) =>
  track.entityType === "FIGHTER_RAID" && track.side === "RED" && (track.representedCount ?? 0) >= 100;

const fighterFormationPoints = (track: FusedTrack, trajectorySpec?: TrajectorySpec) => {
  const formation = trajectorySpec?.formation;
  const count = Math.min(trajectorySpec?.visibleCount ?? track.representedCount ?? 0, 100);
  const columns = formation?.columns ?? 25;
  const latSpacing = formation?.rowSpacingLat ?? 0.026;
  const lngSpacing = formation?.columnSpacingLng ?? 0.035;
  const staggerLng = formation?.staggerLng ?? lngSpacing / 2;
  const fanoutLatFactor = formation?.fanoutLatFactor ?? 0.0012;

  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    const centerDelta = Math.abs(col - (columns - 1) / 2);
    const rowOffset = row * latSpacing + centerDelta * fanoutLatFactor;
    const colOffset = (col - (columns - 1) / 2) * lngSpacing + (row % 2 === 0 ? 0 : staggerLng);
    const jitterLat = ((index * 17) % 7) * 0.00045;
    const jitterLng = (((index * 29) % 9) - 4) * 0.0005;

    return {
      id: `${track.trackId}-${index + 1}`,
      lat: track.lat + rowOffset + jitterLat,
      lng: track.lng + colOffset + jitterLng,
      index,
    };
  });
};

const trackTrailPoints = (track: FusedTrack, trajectorySpecs: TrajectorySpec[] | undefined, simulationTimeSec: number) => {
  const trajectory = trajectorySpecs?.find((spec) => spec.entityId === track.entityId || spec.entityId.endsWith(track.trackId));
  if (!trajectory?.waypoints?.length) return [];

  const points = trajectory.waypoints
    .filter((waypoint) => waypoint.timeSec <= simulationTimeSec)
    .sort((a, b) => a.timeSec - b.timeSec)
    .map((waypoint) => [waypoint.lat, waypoint.lng] as [number, number]);

  const latest = points.at(-1);
  if (!latest || latest[0] !== track.lat || latest[1] !== track.lng) {
    points.push([track.lat, track.lng]);
  }

  return points;
};

const cinematicPhaseForState = ({
  hasReconTrack,
  hasFighterRaid,
  manualStatus,
  fighterResponse,
}: {
  hasReconTrack: boolean;
  hasFighterRaid: boolean;
  manualStatus: ManualInterceptStatus;
  fighterResponse: FighterResponseState;
}) => {
  if (hasFighterRaid && fighterResponse.missedAtSec) return { code: "PHASE 05", label: "NO RESPONSE", tone: "critical" as const };
  if (hasFighterRaid && fighterResponse.selectedFighterId) return { code: "PHASE 04", label: "COUNTER-AIR", tone: "active" as const };
  if (hasFighterRaid) return { code: "PHASE 03", label: "FIGHTER RAID", tone: "critical" as const };
  if (manualStatus === "missed") return { code: "PHASE 02", label: "ISR BREACH", tone: "critical" as const };
  if (manualStatus === "resolved") return { code: "PHASE 02", label: "UAV INTERCEPT", tone: "active" as const };
  if (hasReconTrack) return { code: "PHASE 01", label: "SENSOR CONTACT", tone: "warning" as const };
  return { code: "PHASE 00", label: "WATCH", tone: "watch" as const };
};

const fighterPostEngagementDurationSec = 18;

const clampNumber = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const mapIconScaleForZoom = (zoom: number) => clampNumber(Math.pow(1.22, zoom - 8), 0.34, 1.24);

const scaledMapIconSize = (baseSize: number, scale: number, minSize = 6) => Math.max(minSize, Math.round(baseSize * scale));

const fighterRaidSpawnSec = (track?: FusedTrack, trajectorySpecs?: TrajectorySpec[]) =>
  trajectorySpecs?.find((spec) => spec.entityId === track?.entityId)?.spawnAtSec ?? 28;

const nearestFighterRaidSnapshot = (stream: FighterRaidStreamLite, timelineSec: number) =>
  stream.snapshots.reduce((nearest, snapshot) =>
    Math.abs(snapshot.timelineSec - timelineSec) < Math.abs(nearest.timelineSec - timelineSec) ? snapshot : nearest,
  );

const fighterRaidSnapshotAt = (
  stream: FighterRaidStreamLite,
  simulationTimeSec: number,
  spawnSec: number,
): FighterRaidSnapshot => {
  const firstSec = stream.snapshots[0]?.timelineSec ?? 0;
  const lastSec = stream.snapshots.at(-1)?.timelineSec ?? firstSec;
  const timelineSec = clampNumber(Math.round(simulationTimeSec - spawnSec), firstSec, lastSec);
  return nearestFighterRaidSnapshot(stream, timelineSec);
};

const firstSnapshotRedBreach = (snapshot?: FighterRaidSnapshot) =>
  snapshot?.entities.find((entity) => entity.side === "RED" && entity.lat <= dmzRedWarLat);

const snapshotEntityUnitLabel = (entity: FighterRaidSnapshotEntity) => `${entity.side}-${entity.platformType === "FIGHTER" ? "FTR" : entity.platformType}`;

const firstSnapshotBlueFighterId = (snapshot?: FighterRaidSnapshot) =>
  snapshot?.assignments[0]?.blueEntityId ?? snapshot?.entities.find((entity) => entity.side === "BLUE")?.entityId;

function UnitBadge({ unit, className }: { unit: UnitVisual; className?: string }) {
  return (
    <span
      className={clsx("unit-badge", `unit-badge--${unit.sideTone}`, `unit-badge--${unit.iconKey}`, className)}
      title={unitVisualLabel(unit)}
      aria-label={unitVisualLabel(unit)}
      role="img"
    >
      <i />
    </span>
  );
}

type AlertMode = "watch" | "elevated" | "critical";

type CrisisAlertModel = {
  mode: AlertMode;
  label: string;
  headline: string;
  detail: string;
};

const alertModeLabel: Record<AlertMode, string> = {
  watch: "WATCH",
  elevated: "WARNING",
  critical: "CRITICAL",
};

function percentTone(value: number) {
  if (value >= 78) return "good";
  if (value >= 58) return "warn";
  return "bad";
}

function trackColor(track: FusedTrack) {
  if (track.classification === "friendly") return "#22c55e";
  if (track.classification === "hostile") return "#ef4444";
  if (track.classification === "suspect") return "#f59e0b";
  return "#38bdf8";
}

function assetColor(asset: DefenseAsset) {
  if (asset.layer === "L1") return "#60a5fa";
  if (asset.layer === "L2") return "#a78bfa";
  if (asset.layer === "EW") return "#2dd4bf";
  return "#facc15";
}

function buildCrisisAlert({
  severity,
  title,
  topTrack,
  lossRate,
  adviceReviewCount,
}: {
  severity: SimulationSeverity;
  title: string;
  topTrack?: FusedTrack;
  lossRate: number;
  adviceReviewCount: number;
}): CrisisAlertModel {
  const topThreat = topTrack?.threatScore ?? 0;
  const hasOperationalTrigger = topThreat > 0 || lossRate >= 18 || adviceReviewCount > 0;
  const mode: AlertMode =
    topThreat >= 90 || lossRate >= 40 || adviceReviewCount > 0
      ? "critical"
      : hasOperationalTrigger && (severity === "war" || severity === "crisis" || topThreat >= 72 || lossRate >= 25)
        ? "elevated"
        : "watch";
  const topTrackText = topTrack ? `${topTrack.trackId} 위협도 ${topTrack.threatScore}%` : "비협조 항적 없음";
  const actionText =
    mode === "critical"
      ? "긴급 대응 추천이 생성되면 팝업에서 지휘관 결심이 필요합니다."
      : mode === "elevated"
        ? "상관 품질, 민항 혼재, 자원 제약을 우선 확인해야 합니다."
        : "정상 감시 중입니다. 긴급 추천은 조건 충족 시에만 표시됩니다.";

  return {
    mode,
    label: alertModeLabel[mode],
    headline: `${title} · ${topTrackText}`,
    detail: actionText,
  };
}

function MetricCard({
  label,
  value,
  suffix,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  icon: React.ElementType;
  tone?: "good" | "warn" | "bad";
}) {
  return (
    <section className={clsx("metric-card", tone && `metric-card--${tone}`)}>
      <span className="metric-card__icon">
        <Icon size={18} />
      </span>
      <div>
        <p>{label}</p>
        <strong>
          {value}
          {suffix}
        </strong>
      </div>
    </section>
  );
}

function CrisisAlert({ alert }: { alert: CrisisAlertModel }) {
  const Icon = alert.mode === "critical" ? Siren : AlertTriangle;

  return (
    <section className={clsx("crisis-alert", `crisis-alert--${alert.mode}`)} aria-label="crisis warning">
      <div className="crisis-alert__main">
        <span className="crisis-alert__icon">
          <Icon size={20} />
        </span>
        <div>
          <p>{alert.label} ALERT</p>
          <h2>{alert.headline}</h2>
          <span>{alert.detail}</span>
        </div>
      </div>
    </section>
  );
}

function BoundaryRulesPanel() {
  return (
    <section className="boundary-rules" aria-label="DMZ boundary rules">
      {dmzBoundaryLines.map((line) => (
        <article
          key={line.id}
          className={`boundary-rule boundary-rule--${line.id}`}
          style={{ "--boundary-color": line.color } as React.CSSProperties}
          title={line.label}
          aria-label={line.label}
        >
          <span className="boundary-rule__line">
            <i />
          </span>
          <span className="boundary-rule__signal" />
        </article>
      ))}
    </section>
  );
}

function ForceInventoryPanel({ inventory }: { inventory?: SimulationPreset["forceInventory"] }) {
  if (!inventory?.length) return null;

  return (
    <section className="force-inventory" aria-label="notional force inventory">
      {inventory.map((group) => (
        <article key={group.label} className={clsx("force-inventory__group", group.side === "RED" ? "force-inventory__group--red" : "force-inventory__group--blue")}>
          <header title={group.label} aria-label={group.label}>
            <span>{group.side === "RED" ? "RED" : group.side === "BLUE" ? "BLUE" : "UNK"}</span>
          </header>
          <div>
            {group.items.map((item) => {
              const unit = inventoryUnitVisual(group.side, item.kind);
              return (
                <section key={item.kind} title={`${unitVisualLabel(unit)} ${item.count}`} aria-label={`${unitVisualLabel(unit)} ${item.count}`}>
                  <UnitBadge unit={unit} />
                  <strong>{item.count}</strong>
                </section>
              );
            })}
          </div>
        </article>
      ))}
    </section>
  );
}

function ManualInterceptPanel({
  state,
}: {
  state: ManualInterceptState;
}) {
  const statusCode = state.status === "resolved" ? "DONE" : state.status === "missed" ? "MISSED" : state.status === "armed" ? "ARMED" : "READY";

  return (
    <section className={clsx("manual-intercept", `manual-intercept--${state.status}`)} aria-label="auto drone intercept state" title="BLUE-UAV -> RED-UAV">
      <header>
        <span>Auto Intercept</span>
        <strong>{statusCode}</strong>
      </header>
      <div className="manual-intercept__route" aria-hidden="true">
        <UnitBadge unit={blueUavUnit} />
        <i />
        <UnitBadge unit={redUavUnit} />
      </div>
    </section>
  );
}

function CommanderSettings({
  isOpen,
  onOpen,
  onClose,
  visibleLayers,
  onToggleLayer,
}: {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  visibleLayers: Record<AuxiliaryLayerId, boolean>;
  onToggleLayer: (layerId: AuxiliaryLayerId) => void;
}) {
  return (
    <>
      <section className={clsx("map-settings map-overlay", isOpen && "map-settings--open")} aria-label="commander map settings">
        <button className="map-settings__trigger" onClick={onOpen} aria-expanded={isOpen} aria-label="COP 설정 열기" title="COP 설정">
          <Settings2 size={19} />
        </button>
      </section>
      {isOpen ? (
        <div className="settings-modal-backdrop" onClick={onClose}>
          <section className="settings-modal" role="dialog" aria-modal="true" aria-label="COP 설정" onClick={(event) => event.stopPropagation()}>
            <header className="settings-modal__header">
              <div>
                <p className="section-kicker">Settings</p>
                <h2>COP 설정</h2>
              </div>
              <button className="settings-modal__close" onClick={onClose} aria-label="COP 설정 닫기">
                <X size={17} />
              </button>
            </header>

            <div className="settings-modal__body">
              <nav className="settings-modal__nav" aria-label="settings categories">
                {settingsCategories.map((category) => (
                  <button
                    key={category.id}
                    className={clsx("settings-nav-item", category.id === "auxiliary" && "settings-nav-item--active")}
                    disabled={category.id !== "auxiliary"}
                    aria-current={category.id === "auxiliary" ? "page" : undefined}
                  >
                    <span>{category.label}</span>
                    <small>{category.status}</small>
                  </button>
                ))}
              </nav>

              <section className="settings-section settings-section--modal" aria-label="auxiliary information settings">
                <div className="settings-section__heading">
                  <span>보조 정보</span>
                  <strong>시연 중 필요한 근거 패널만 표시</strong>
                </div>
                <div className="settings-section__actions">
                  {auxiliaryLayerControls.map((item) => {
                    const Icon = item.icon;
                    const active = visibleLayers[item.id];
                    const ToggleIcon = active ? ToggleRight : ToggleLeft;
                    return (
                      <button
                        key={item.id}
                        className={clsx("layer-toggle", "settings-toggle", active && "layer-toggle--active")}
                        onClick={() => onToggleLayer(item.id)}
                        aria-pressed={active}
                        title={`${item.label} ${active ? "숨기기" : "표시"}`}
                      >
                        <Icon size={15} />
                        <span>{item.label}</span>
                        <ToggleIcon className="settings-toggle__switch" size={21} />
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function CopMap({
  tracks,
  assets,
  commandPost,
  mapTitle,
  selectedTrackId,
  selectedAssetId,
  manualEngagement,
  fighterRaidStream,
  fighterResponse,
  simulationTimeSec,
  trajectorySpecs,
  onSelectTrack,
  onSelectAsset,
  onSelectResponseFighter,
}: {
  tracks: FusedTrack[];
  assets: DefenseAsset[];
  commandPost: CommandPost;
  mapTitle: string;
  selectedTrackId: string;
  selectedAssetId?: string;
  manualEngagement: ManualInterceptState;
  fighterRaidStream?: FighterRaidStreamLite;
  fighterResponse: FighterResponseState;
  simulationTimeSec: number;
  trajectorySpecs?: TrajectorySpec[];
  onSelectTrack: (trackId: string) => void;
  onSelectAsset: (assetId: string) => void;
  onSelectResponseFighter: (fighterId: string) => void;
}) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [mapZoom, setMapZoom] = useState(8);
  const mapIconScale = mapIconScaleForZoom(mapZoom);
  const cinematicPhase = cinematicPhaseForState({
    hasReconTrack: tracks.some(isReconDroneTrack),
    hasFighterRaid: tracks.some(isFighterFormationTrack),
    manualStatus: manualEngagement.status,
    fighterResponse,
  });
  const cinematicProgress = Math.round(Math.min(100, Math.max(8, (simulationTimeSec / (SIMULATION_MAX_TICK * SIMULATION_STEP_SEC)) * 100)));

  useEffect(() => {
    if (!nodeRef.current || mapRef.current) return;

    const map = L.map(nodeRef.current, {
      zoomControl: false,
      attributionControl: false,
      preferCanvas: false,
    }).setView([commandPost.lat, commandPost.lng], 8);
    mapRef.current = map;

    const handleZoom = () => setMapZoom(map.getZoom());
    map.on("zoomend", handleZoom);
    setMapZoom(map.getZoom());

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 18,
      subdomains: "abcd",
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);

    setTimeout(() => mapRef.current?.invalidateSize(), 120);

    return () => {
      map.off("zoomend", handleZoom);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    mapRef.current?.setView([commandPost.lat, commandPost.lng], 8, { animate: true });
  }, [commandPost.lat, commandPost.lng]);

  useEffect(() => {
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;

    layer.clearLayers();

    const scaleSize = (baseSize: number, minSize = 6) => scaledMapIconSize(baseSize, mapIconScale, minSize);
    const scalePair = (width: number, height: number, minWidth = 6, minHeight = 6): [number, number] => [
      scaleSize(width, minWidth),
      scaleSize(height, minHeight),
    ];
    const scaleRadius = (baseRadius: number, minRadius = 4) => Math.max(minRadius, Math.round(baseRadius * mapIconScale));
    const centerAnchor = ([width, height]: [number, number]): [number, number] => [width / 2, height / 2];

    dmzBoundaryLines.forEach((boundary) => {
      const boundarySize = scalePair(42, 18, 18, 8);
      L.polyline(
        [
          [boundary.lat, 124.7],
          [boundary.lat, 130.9],
        ],
        {
          color: boundary.color,
          weight: boundary.id === "red" ? 4 : 3,
          opacity: 0.9,
          dashArray: boundary.id === "red" ? "12,8" : "8,10",
        },
      )
        .bindTooltip(boundary.label, { className: "cop-tip cop-tip--compact", direction: "top" })
        .addTo(layer);

      L.marker([boundary.lat, 124.82], {
        icon: L.divIcon({
          className: "",
          html: `<div class="boundary-label boundary-label--${boundary.id}" style="--boundary-color:${boundary.color};width:${boundarySize[0]}px;height:${boundarySize[1]}px" title="${boundary.label}"><i></i></div>`,
          iconSize: boundarySize,
          iconAnchor: [0, boundarySize[1] / 2],
        }),
        interactive: false,
      }).addTo(layer);
    });

    L.circle([commandPost.lat, commandPost.lng], {
      radius: 2500,
      color: "#f8fafc",
      weight: 2,
      fillOpacity: 0.08,
      fillColor: "#f8fafc",
    }).addTo(layer);

    const commandPostSize = scaleSize(18, 7);
    L.marker([commandPost.lat, commandPost.lng], {
      icon: L.divIcon({
        className: "",
        html: `<div class="map-node map-node--cp" style="width:${commandPostSize}px;height:${commandPostSize}px"></div>`,
        iconSize: [commandPostSize, commandPostSize],
        iconAnchor: [commandPostSize / 2, commandPostSize / 2],
      }),
    })
      .bindTooltip(commandPost.label, { className: "cop-tip", direction: "top" })
      .addTo(layer);

    L.circle([seoulTarget.lat, seoulTarget.lng], {
      radius: 15500,
      color: "#ef4444",
      weight: 2,
      dashArray: "6,8",
      fillColor: "#ef4444",
      fillOpacity: 0.08,
      className: "seoul-target-ring",
    })
      .bindTooltip("북측 목표: SEOUL", { className: "cop-tip cop-tip--compact", direction: "top" })
      .addTo(layer);

    const seoulMarkerSize = scalePair(82, 28, 46, 16);
    L.marker([seoulTarget.lat, seoulTarget.lng], {
      icon: L.divIcon({
        className: "",
        html: `<div class="seoul-target-marker" style="width:${seoulMarkerSize[0]}px;height:${seoulMarkerSize[1]}px" title="NORTH TARGET SEOUL"><i></i><span>${seoulTarget.label}</span></div>`,
        iconSize: seoulMarkerSize,
        iconAnchor: centerAnchor(seoulMarkerSize),
      }),
      interactive: false,
      zIndexOffset: 1180,
    }).addTo(layer);

    const fighterRaidTrack = tracks.find(isFighterFormationTrack);
    const fighterRaidSpawnAtSec = fighterRaidSpawnSec(fighterRaidTrack, trajectorySpecs);
    const reconTrack = tracks.find(isReconDroneTrack);
    const sensorAsset = assets.find((asset) => asset.assetId === "BLUE-SENSOR-NET-01") ?? assets.find((asset) => asset.effect === "track-custody");
    const attackDroneAsset = assets.find(isAttackDroneAsset);
    const reconBoundaryStatus = reconTrack?.lat && reconTrack.lat <= dmzRedWarLat ? "RED WAR BREACH" : reconTrack?.lat && reconTrack.lat <= dmzOrangeResponseLat ? "AUTO INTERCEPT" : "SENSOR HIT";

    if (sensorAsset && simulationTimeSec >= 6) {
      const sensorCoverageKm = Math.max(sensorAsset.rangeKm, 180);
      L.circle([sensorAsset.lat, sensorAsset.lng], {
        radius: sensorCoverageKm * 1000,
        color: "#22d3ee",
        weight: 2,
        opacity: reconTrack ? 0.58 : 0.34,
        fillColor: "#22d3ee",
        fillOpacity: reconTrack ? 0.055 : 0.028,
        dashArray: "14,10",
        className: "sensor-coverage-ring",
      })
        .bindTooltip(`SENSOR COVERAGE ${sensorCoverageKm}km`, { className: "cop-tip cop-tip--compact", direction: "top" })
        .addTo(layer);

      const sensorSweepSize = scaleSize(260, 88);
      L.marker([sensorAsset.lat, sensorAsset.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div class="cinematic-sensor-sweep ${reconTrack ? "cinematic-sensor-sweep--active" : ""}"></div>`,
          iconSize: [sensorSweepSize, sensorSweepSize],
          iconAnchor: [sensorSweepSize / 2, sensorSweepSize / 2],
        }),
        interactive: false,
        zIndexOffset: 320,
      }).addTo(layer);
    }

    if (reconTrack) {
      const trailPoints = trackTrailPoints(reconTrack, trajectorySpecs, simulationTimeSec);
      if (trailPoints.length >= 2) {
        L.polyline(trailPoints, {
          color: "#ef4444",
          weight: 3,
          opacity: 0.72,
          dashArray: "2,8",
          className: "cinematic-trail cinematic-trail--hostile",
        }).addTo(layer);
      }

      if (sensorAsset) {
        L.polyline(
          [
            [sensorAsset.lat, sensorAsset.lng],
            [reconTrack.lat, reconTrack.lng],
          ],
          {
            color: "#22d3ee",
            weight: 2,
            opacity: 0.86,
            dashArray: "5,8",
            className: "cinematic-link cinematic-link--sensor",
          },
        )
          .bindTooltip("SENSOR LOCK", { className: "cop-tip cop-tip--compact", direction: "top" })
          .addTo(layer);

        L.circleMarker([reconTrack.lat, reconTrack.lng], {
          radius: scaleRadius(reconTrack.lat <= dmzOrangeResponseLat ? 22 : 16, 7),
          color: "#22d3ee",
          weight: 2,
          opacity: 0.92,
          fillColor: "#22d3ee",
          fillOpacity: 0.12,
          className: "sensor-capture-ring",
        })
          .bindTooltip(`SENSOR HIT | ${reconBoundaryStatus}`, {
            className: "cop-tip cop-tip--compact",
            direction: "top",
          })
          .addTo(layer);
      }

      const contactPingSize = scaleSize(76, 26);
      L.marker([reconTrack.lat, reconTrack.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div class="cinematic-contact-ping ${manualEngagement.status === "missed" ? "cinematic-contact-ping--missed" : ""}"></div>`,
          iconSize: [contactPingSize, contactPingSize],
          iconAnchor: [contactPingSize / 2, contactPingSize / 2],
        }),
        interactive: false,
        zIndexOffset: 900,
      }).addTo(layer);

      if (attackDroneAsset && manualEngagement.status !== "resolved" && manualEngagement.status !== "missed") {
        L.polyline(
          [
            [attackDroneAsset.lat, attackDroneAsset.lng],
            [reconTrack.lat, reconTrack.lng],
          ],
          {
            color: "#f59e0b",
            weight: manualEngagement.status === "armed" ? 4 : 2,
            opacity: manualEngagement.status === "armed" ? 0.94 : 0.54,
            dashArray: manualEngagement.status === "armed" ? "10,5" : "3,9",
            className: "cinematic-link cinematic-link--response",
          },
        )
          .bindTooltip("UAV RESPONSE VECTOR", { className: "cop-tip cop-tip--compact", direction: "top" })
          .addTo(layer);

        const responseAuraSize = scaleSize(84, 28);
        L.marker([attackDroneAsset.lat, attackDroneAsset.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div class="cinematic-response-aura ${manualEngagement.status === "armed" ? "cinematic-response-aura--armed" : ""}"></div>`,
            iconSize: [responseAuraSize, responseAuraSize],
            iconAnchor: [responseAuraSize / 2, responseAuraSize / 2],
          }),
          interactive: false,
          zIndexOffset: 930,
        }).addTo(layer);
      }
    }

    assets.forEach((asset) => {
      const color = assetColor(asset);
      const unit = assetUnitVisual(asset);
      const selected = asset.assetId === selectedAssetId || asset.assetId === manualEngagement.assetId;
      const launchReady = isAttackDroneAsset(asset) && manualEngagement.status === "idle";
      const assetSize = scaleSize(selected ? mapIconSize.assetSelected : mapIconSize.asset, 12);
      L.circle([asset.lat, asset.lng], {
        radius: asset.rangeKm * 1000,
        color,
        weight: 1,
        dashArray: "4,8",
        fillOpacity: 0.025,
        fillColor: color,
      }).addTo(layer);

      L.marker([asset.lat, asset.lng], {
        icon: L.divIcon({
          className: "",
          html: `<button class="unit-marker unit-marker--asset unit-marker--${unit.sideTone} unit-marker--${unit.iconKey} ${selected ? "unit-marker--armed" : ""} ${launchReady ? "unit-marker--launch-ready" : ""}" style="--unit-color:${color};width:${assetSize}px;height:${assetSize}px" title="${unitVisualLabel(unit)}"><i></i></button>`,
          iconSize: [assetSize, assetSize],
          iconAnchor: [assetSize / 2, assetSize / 2],
        }),
        zIndexOffset: selected ? 1100 : 450,
      })
        .on("click", () => onSelectAsset(asset.assetId))
        .bindTooltip(`${unitVisualLabel(unit)} | ${asset.shortName} | ${asset.readiness}%`, {
          className: "cop-tip",
          direction: "top",
        })
        .addTo(layer);
    });

    tracks.forEach((track) => {
      const color = trackColor(track);
      const unit = trackUnitVisual(track);
      const selected = track.trackId === selectedTrackId;
      const interceptTargeted = manualEngagement.status === "resolved" && manualEngagement.targetTrackId === track.trackId;
      const interceptProgress =
        interceptTargeted && manualEngagement.resolvedAtSec !== undefined
          ? smoothProgress(Math.min(1, Math.max(0, simulationTimeSec - manualEngagement.resolvedAtSec) / 6))
          : 0;
      const neutralizedByUav = interceptTargeted && interceptProgress >= 0.88;
      const addTrackLink = () => {
        L.polyline(
          [
            [commandPost.lat, commandPost.lng],
            [track.lat, track.lng],
          ],
          {
            color,
            weight: selected ? 2 : 1,
            opacity: selected ? 0.72 : 0.22,
            dashArray: selected ? "6,5" : "3,7",
          },
        ).addTo(layer);
      };

      if (isFighterFormationTrack(track)) {
        if (fighterRaidStream) {
          addTrackLink();
          return;
        }

        const trajectorySpec = trajectorySpecs?.find((spec) => spec.entityId === track.entityId);
        fighterFormationPoints(track, trajectorySpec).forEach((point) => {
          const baseSize = selected ? mapIconSize.formationSelected : mapIconSize.formation;
          const size = scaleSize(baseSize * (trajectorySpec?.formation?.iconScale ?? 1), 4);
          const marker = L.marker([point.lat, point.lng], {
            icon: L.divIcon({
              className: "",
              html: `<button class="unit-marker unit-marker--track unit-marker--formation unit-marker--${unit.sideTone} unit-marker--${unit.iconKey} ${selected ? "unit-marker--selected" : ""}" style="--unit-color:${color};width:${size}px;height:${size}px" title="${unitVisualLabel(unit)} #${point.index + 1}"><i></i></button>`,
              iconSize: [size, size],
              iconAnchor: [size / 2, size / 2],
            }),
            zIndexOffset: selected ? 960 : 610,
          });

          marker.on("click", () => onSelectTrack(track.trackId));
          if (point.index % 15 === 0 || selected) {
            marker.bindTooltip(`${unitVisualLabel(unit)} #${point.index + 1} | ${track.trackId}`, {
              className: "cop-tip",
              direction: "top",
            });
          }
          marker.addTo(layer);
        });

        addTrackLink();
        return;
      }

      const size = scaleSize(selected ? mapIconSize.trackSelected : mapIconSize.track, 12);
      const marker = L.marker([track.lat, track.lng], {
        icon: L.divIcon({
          className: "",
          html: `<button class="unit-marker unit-marker--track unit-marker--${unit.sideTone} unit-marker--${unit.iconKey} ${selected ? "unit-marker--selected" : ""} ${interceptTargeted ? "unit-marker--intercept-target" : ""} ${neutralizedByUav ? "unit-marker--neutralized" : ""}" style="--unit-color:${color};width:${size}px;height:${size}px" title="${unitVisualLabel(unit)}"><i></i></button>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        }),
        zIndexOffset: selected ? 1000 : 500,
      });

      marker.on("click", () => onSelectTrack(track.trackId));
      marker
        .bindTooltip(
          `${unitVisualLabel(unit)} | ${track.trackId} | C${track.confidence}% | T${track.threatScore}`,
          { className: "cop-tip", direction: "top" },
        )
        .addTo(layer);

      addTrackLink();
    });

    if (fighterRaidStream && fighterRaidTrack) {
      const snapshot = fighterRaidSnapshotAt(fighterRaidStream, simulationTimeSec, fighterRaidSpawnAtSec);
      const snapshotEntities = snapshot.entities;
      const redEntities = snapshotEntities.filter((entity) => entity.side === "RED");
      const blueEntities = snapshotEntities.filter((entity) => entity.side === "BLUE");
      const assignmentByBlue = new Map(snapshot.assignments.map((assignment) => [assignment.blueEntityId, assignment]));
      const assignmentByRed = new Map(snapshot.assignments.map((assignment) => [assignment.redEntityId, assignment]));
      const raidAnchor =
        redEntities.length > 0
          ? {
              lat: redEntities.reduce((sum, entity) => sum + entity.lat, 0) / redEntities.length,
              lng: redEntities.reduce((sum, entity) => sum + entity.lng, 0) / redEntities.length,
            }
          : { lat: fighterRaidTrack.lat, lng: fighterRaidTrack.lng };

      L.polyline(
        [
          [raidAnchor.lat, raidAnchor.lng],
          [seoulTarget.lat, seoulTarget.lng],
        ],
        {
          color: "#ef4444",
          weight: fighterResponse.autoApprovedByRedLine ? 2.6 : 1.6,
          opacity: fighterResponse.autoApprovedByRedLine ? 0.88 : 0.38,
          dashArray: fighterResponse.autoApprovedByRedLine ? "4,7" : "10,10",
          className: "seoul-target-line",
        },
      )
        .bindTooltip("NORTH TARGET VECTOR: SEOUL", { className: "cop-tip cop-tip--compact", direction: "top" })
        .addTo(layer);

      if (fighterResponse.autoApprovedByRedLine) {
        const autoApprovalSize = scalePair(146, 42, 76, 22);
        L.marker([dmzRedWarLat, seoulTarget.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div class="auto-approval-marker" style="width:${autoApprovalSize[0]}px;height:${autoApprovalSize[1]}px"><strong>AUTO APPROVED</strong><span>RED WAR BREACH</span></div>`,
            iconSize: autoApprovalSize,
            iconAnchor: centerAnchor(autoApprovalSize),
          }),
          interactive: false,
          zIndexOffset: 1280,
        }).addTo(layer);
      }

      const raidFrontSize = scaleSize(124, 42);
      L.marker([raidAnchor.lat, raidAnchor.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div class="cinematic-war-front ${fighterResponse.missedAtSec ? "cinematic-war-front--missed" : ""}"></div>`,
          iconSize: [raidFrontSize, raidFrontSize],
          iconAnchor: [raidFrontSize / 2, raidFrontSize / 2],
        }),
        interactive: false,
        zIndexOffset: 880,
      }).addTo(layer);

      snapshot.assignments.forEach((assignment) => {
        L.polyline(
          [
            [assignment.line.from.lat, assignment.line.from.lng],
            [assignment.line.to.lat, assignment.line.to.lng],
          ],
          {
            color: "#38bdf8",
            weight: 2.2,
            opacity: 0.82,
            dashArray: "2,7",
            className: "fighter-attack-line",
          },
        )
          .bindTooltip(`BLUE-FTR -> RED-FTR | Pk ${Math.round(assignment.pkEstimate * 100)}%`, {
            className: "cop-tip cop-tip--compact",
            direction: "top",
          })
          .addTo(layer);
      });

      [...redEntities, ...blueEntities].forEach((entity) => {
        const isRed = entity.side === "RED";
        const assignment = isRed ? assignmentByRed.get(entity.entityId) : assignmentByBlue.get(entity.entityId);
        const selected = !isRed && (fighterResponse.selectedFighterId === entity.entityId || Boolean(assignment));
        const responseReady = !isRed && !fighterResponse.selectedFighterId && fighterResponse.acceptedAtSec === undefined && !fighterResponse.missedAtSec;
        const size = scaleSize(isRed ? mapIconSize.fighterRaidRed : selected ? mapIconSize.fighterRaidBlueSelected : mapIconSize.fighterRaidBlue, isRed ? 5 : 6);
        const marker = L.marker([entity.lat, entity.lng], {
          icon: L.divIcon({
            className: "",
            html: `<button class="unit-marker unit-marker--track unit-marker--formation unit-marker--fighter-raid-${isRed ? "red" : "blue"} unit-marker--${isRed ? "red" : "blue"} unit-marker--fighter ${assignment ? "unit-marker--targeted unit-marker--attacking" : ""} ${selected ? "unit-marker--response-selected" : ""} ${responseReady ? "unit-marker--response-ready" : ""} ${entity.status === "OUT_OF_MISSILES" || entity.status === "REPAIR_REQUIRED" ? "unit-marker--response-missed" : ""}" style="--unit-color:${isRed ? "#ef4444" : "#38bdf8"};width:${size}px;height:${size}px" title="${entity.entityId}"><i></i></button>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          }),
          zIndexOffset: isRed ? 690 : selected ? 1360 : 760,
        });

        marker
          .on("click", () => (isRed ? onSelectTrack(fighterRaidTrack.trackId) : onSelectResponseFighter(entity.entityId)))
          .bindTooltip(
            `${snapshotEntityUnitLabel(entity)} | ${entity.entityId} | ${Math.round(entity.kinematics.speedKts)}kt | H${Math.round(entity.kinematics.headingDeg)} | ${entity.status} | S+${snapshot.timelineSec}`,
            {
              className: "cop-tip cop-tip--compact",
              direction: "top",
            },
          )
          .addTo(layer);
      });

      snapshot.effects
        .filter((effect) => snapshot.timelineSec >= effect.startSec && snapshot.timelineSec < effect.startSec + effect.durationSec)
        .forEach((effect) => {
          const effectSize = scaleSize(70, 24);
          L.marker([effect.lat, effect.lng], {
            icon: L.divIcon({
              className: "",
              html: `<div class="uav-impact-burst fighter-impact-burst"></div>`,
              iconSize: [effectSize, effectSize],
              iconAnchor: [effectSize / 2, effectSize / 2],
            }),
            interactive: false,
            zIndexOffset: 1420,
          }).addTo(layer);

          L.circleMarker([effect.lat, effect.lng], {
            radius: scaleRadius(20, 7),
            color: "#38bdf8",
            weight: 2,
            opacity: 0.92,
            fillColor: "#ef4444",
            fillOpacity: 0.16,
            className: "fighter-impact-ring",
          })
            .bindTooltip(`${effect.type} | ${effect.targetEntityId ?? "RED-FTR"} | ${effect.durationSec}s`, {
              className: "cop-tip cop-tip--compact",
              direction: "top",
            })
            .addTo(layer);
        });
    }

    if (manualEngagement.status === "resolved" && manualEngagement.assetId && manualEngagement.targetTrackId) {
      const engagedAsset = assets.find((asset) => asset.assetId === manualEngagement.assetId);
      const targetTrack = tracks.find((track) => track.trackId === manualEngagement.targetTrackId);
      if (engagedAsset && targetTrack) {
        const interceptProgress = smoothProgress(Math.min(1, Math.max(0, simulationTimeSec - (manualEngagement.resolvedAtSec ?? simulationTimeSec)) / 6));
        const interceptLat = interpolateNumber(engagedAsset.lat, targetTrack.lat, interceptProgress);
        const interceptLng = interpolateNumber(engagedAsset.lng, targetTrack.lng, interceptProgress);

        L.polyline(
          [
            [engagedAsset.lat, engagedAsset.lng],
            [interceptLat, interceptLng],
            [targetTrack.lat, targetTrack.lng],
          ],
          {
            color: "#38bdf8",
            weight: 4,
            opacity: 0.92,
            dashArray: "10,6",
            className: "uav-collision-line",
          },
        )
          .bindTooltip("BLUE-UAV COLLISION INTERCEPT", { className: "cop-tip cop-tip--compact", direction: "top" })
          .addTo(layer);

        const interceptorSize = scaleSize(mapIconSize.interceptor, 11);
        L.marker([interceptLat, interceptLng], {
          icon: L.divIcon({
            className: "",
            html: `<button class="unit-marker unit-marker--interceptor unit-marker--blue unit-marker--uav unit-marker--armed" style="--unit-color:#38bdf8;width:${interceptorSize}px;height:${interceptorSize}px" title="BLUE-UAV"><i></i></button>`,
            iconSize: [interceptorSize, interceptorSize],
            iconAnchor: [interceptorSize / 2, interceptorSize / 2],
          }),
          interactive: false,
          zIndexOffset: 1300,
        }).addTo(layer);

        if (interceptProgress >= 0.88) {
          const uavImpactSize = scaleSize(70, 24);
          L.marker([targetTrack.lat, targetTrack.lng], {
            icon: L.divIcon({
              className: "",
              html: `<div class="uav-impact-burst"></div>`,
              iconSize: [uavImpactSize, uavImpactSize],
              iconAnchor: [uavImpactSize / 2, uavImpactSize / 2],
            }),
            interactive: false,
            zIndexOffset: 1420,
          }).addTo(layer);

          L.circleMarker([targetTrack.lat, targetTrack.lng], {
            radius: scaleRadius(18, 7),
            color: "#38bdf8",
            weight: 2,
            fillColor: "#38bdf8",
            fillOpacity: 0.12,
            className: "uav-impact-ring",
          }).addTo(layer);
        }
      }
    }
  }, [
    assets,
    commandPost,
    fighterRaidStream,
    fighterResponse,
    mapIconScale,
    manualEngagement,
    onSelectAsset,
    onSelectResponseFighter,
    onSelectTrack,
    selectedAssetId,
    selectedTrackId,
    simulationTimeSec,
    tracks,
    trajectorySpecs,
  ]);

  return (
    <section className="map-panel map-panel--base" aria-label={mapTitle}>
      <div className="map-panel__label">
        <div>
          <p className="section-kicker">COP Map</p>
          <h2>{mapTitle}</h2>
        </div>
        <span>색상·아이콘 식별</span>
      </div>
      <div
        className={clsx("cinematic-phase", `cinematic-phase--${cinematicPhase.tone}`)}
        style={{ "--phase-progress": `${cinematicProgress}%` } as React.CSSProperties}
        aria-label="current cinematic scenario phase"
      >
        <div>
          <span>{cinematicPhase.code}</span>
          <strong>{cinematicPhase.label}</strong>
        </div>
        <i />
      </div>
      <div ref={nodeRef} className="cop-map" />
    </section>
  );
}

function BriefingPanel({ briefing }: { briefing: SituationBriefing }) {
  return (
    <section className="panel briefing-panel">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">Situation Brief</p>
          <h2>실시간 상황 보고</h2>
        </div>
        <Activity size={18} />
      </div>
      <div className="briefing-headline">
        <span>{briefing.generatedAt}</span>
        <strong>{briefing.headline}</strong>
      </div>
      <ol className="briefing-lines">
        {briefing.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ol>
      <p className="briefing-action">{briefing.recommendedAction}</p>
    </section>
  );
}

function CommanderActionPanel({
  urgentRecommendation,
  recommendations,
  decisions,
  alertMode,
}: {
  urgentRecommendation?: EngagementRecommendation;
  recommendations: EngagementRecommendation[];
  decisions: Record<string, DecisionState>;
  alertMode: AlertMode;
}) {
  const approvedCount = recommendations.filter((recommendation) => decisions[recommendation.id] === "approved").length;
  const heldCount = recommendations.filter((recommendation) => decisions[recommendation.id] === "held").length;
  const pendingCount = recommendations.filter((recommendation) => (decisions[recommendation.id] ?? "pending") === "pending").length;
  const threatUnit = urgentRecommendation ? advisoryThreatVisual(urgentRecommendation) : undefined;
  const resourceUnit = urgentRecommendation ? advisoryResourceVisual(urgentRecommendation) : undefined;

  return (
    <section className="panel commander-action-panel">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">Commander Decision</p>
          <h2>지휘관 결심 상태</h2>
        </div>
        <ShieldCheck size={18} />
      </div>

      <div className="commander-action-stack">
        {urgentRecommendation && threatUnit && resourceUnit ? (
          <article className="commander-action-card commander-action-card--urgent">
            <header>
              <span className="decision-chip decision-chip--pending">팝업 결심 대기</span>
              <strong>{advisoryStatusLabel[urgentRecommendation.roeStatus]}</strong>
            </header>
            <div className="commander-action-card__route">
              <div className="unit-visual-row">
                <UnitBadge unit={threatUnit} />
                <strong>{urgentRecommendation.trackId}</strong>
              </div>
              <div className="unit-visual-row">
                <UnitBadge unit={resourceUnit} />
                <strong>{urgentRecommendation.assetName}</strong>
              </div>
            </div>
            <p>긴급 결심 대기 상태입니다. 표적·자원 후보와 근거를 확인하고 결심을 선택하십시오.</p>
          </article>
        ) : (
          <article className={clsx("commander-action-card", alertMode === "watch" ? "commander-action-card--idle" : "commander-action-card--monitor")}>
            <header>
              <span className={clsx("decision-chip", alertMode === "watch" ? "decision-chip--approved" : "decision-chip--pending")}>
                {alertMode === "watch" ? "정상 감시" : "주의 감시"}
              </span>
              <strong>긴급 추천 없음</strong>
            </header>
            <p>결심 임계값 미충족. 현재는 감시, 링크 품질 확인, 추가 메시지 수신을 유지합니다.</p>
          </article>
        )}

        <div className="decision-status-grid" aria-label="commander decision counters">
          <section>
            <span>대기</span>
            <strong>{pendingCount}</strong>
          </section>
          <section>
            <span>채택</span>
            <strong>{approvedCount}</strong>
          </section>
          <section>
            <span>직접</span>
            <strong>{heldCount}</strong>
          </section>
        </div>
      </div>
    </section>
  );
}

function TacticalAdvicePopup({
  recommendation,
  onDecision,
}: {
  recommendation?: EngagementRecommendation;
  onDecision: (id: string, decision: DecisionState) => void;
}) {
  if (!recommendation) return null;
  const popupReasons = [recommendation.reasons[0], recommendation.reasons[3] ?? recommendation.reasons[2]].filter(Boolean);
  const threatUnit = advisoryThreatVisual(recommendation);
  const resourceUnit = advisoryResourceVisual(recommendation);

  return (
    <motion.aside
      key={recommendation.id}
      className="tactical-advice-popup"
      role="alertdialog"
      aria-live="assertive"
      aria-label={`urgent commander recommendation for ${recommendation.trackId}`}
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="tactical-advice-popup__alert">
        <span>
          <Brain size={18} />
        </span>
        <div>
          <p>긴급 대응 추천</p>
          <strong className="visual-title">
            <UnitBadge unit={threatUnit} />
            <span>{recommendation.trackId}</span>
          </strong>
        </div>
      </div>
      <p className="tactical-advice-popup__summary">
        임계 상황이 감지되어 {recommendation.assetName} 기반 {effectLabel[recommendation.effect]} 후보안을 지휘관에게 올립니다.
      </p>
      <dl className="tactical-advice-popup__facts">
        <div>
          <dt>Priority</dt>
          <dd>{recommendation.priority}</dd>
        </div>
        <div>
          <dt>Target</dt>
          <dd className="fact-visual">
            <UnitBadge unit={threatUnit} />
            <span>{recommendation.trackId}</span>
          </dd>
        </div>
        <div>
          <dt>Friendly</dt>
          <dd className="fact-visual">
            <UnitBadge unit={resourceUnit} />
            <span>{recommendation.assetName}</span>
          </dd>
        </div>
      </dl>
      <ul className="tactical-advice-popup__reasons">
        {popupReasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <div className="tactical-advice-popup__actions">
        <button className="tactical-advice-popup__use" onClick={() => onDecision(recommendation.id, "approved")}>
          <CheckCircle2 size={17} />
          추천안 채택
        </button>
        <button className="tactical-advice-popup__manual" onClick={() => onDecision(recommendation.id, "held")}>
          <CircleDashed size={17} />
          직접 판단
        </button>
      </div>
    </motion.aside>
  );
}

function ResourceConstraintPanel({ assets }: { assets: DefenseAsset[] }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">Resource Constraints</p>
          <h2>가용 자원 제약</h2>
        </div>
        <ShieldCheck size={18} />
      </div>
      <div className="asset-grid">
        {assets.map((asset) => {
          const constraint = resourceToneLabel(asset);
          const unit = assetUnitVisual(asset);
          return (
            <article key={asset.assetId} className={clsx("asset-card", `asset-card--${constraint.tone}`)}>
              <header>
                <span className="asset-identity">
                  <UnitBadge unit={unit} />
                  <strong>{asset.shortName}</strong>
                </span>
                <em className={clsx("constraint-pill", `constraint-pill--${constraint.tone}`)}>{constraint.label}</em>
              </header>
              <p>
                {asset.shortName} · {effectLabel[asset.effect]} 역할의 합성 운용 자원. 실제 위치·실재고는 사용하지 않음.
              </p>
              <div className="bar-row">
                <span>가용도</span>
                <div className="bar">
                  <i style={{ width: `${asset.readiness}%`, background: assetColor(asset) }} />
                </div>
                <b>{constraint.label}</b>
              </div>
              <footer>
                <span
                  className={clsx("layer-mark", `layer-mark--${asset.layer.toLowerCase()}`)}
                  title={`방어 레이어 ${asset.layer}`}
                  aria-label={`방어 레이어 ${asset.layer}`}
                >
                  <i />
                </span>
                <span>지속 여력 {sustainmentLabel(asset)}</span>
                <span>동시 처리 {channelLabel(asset)}</span>
              </footer>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function App() {
  const [isPresenterExpanded, setPresenterExpanded] = useState(true);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [visibleAuxiliaryLayers, setVisibleAuxiliaryLayers] = useState(() => ({ ...defaultAuxiliaryLayers }));
  const [manualIntercept, setManualIntercept] = useState<ManualInterceptState>(emptyManualIntercept);
  const [fighterResponse, setFighterResponse] = useState<FighterResponseState>(emptyFighterResponse);
  const [visualTimeSec, setVisualTimeSec] = useState(0);
  const visualFrameRef = useRef<number | null>(null);
  const visualLastFrameRef = useRef<number | null>(null);
  const visualCommitAtRef = useRef(0);
  const visualDeltaRef = useRef(0);
  const activeSimulationId = useCopStore((state) => state.activeSimulationId);
  const scenarios = useCopStore((state) => state.scenarios);
  const decisions = useCopStore((state) => state.decisions);
  const selectedTrackId = useCopStore((state) => state.selectedTrackId);
  const simulationTick = useCopStore((state) => state.simulationTick);
  const isLive = useCopStore((state) => state.isLive);
  const playbackSpeed = useCopStore((state) => state.playbackSpeed);
  const setSelectedTrackId = useCopStore((state) => state.setSelectedTrackId);
  const setDecision = useCopStore((state) => state.setDecision);
  const resetDecisions = useCopStore((state) => state.resetDecisions);
  const advanceSimulation = useCopStore((state) => state.advanceSimulation);
  const resetSimulation = useCopStore((state) => state.resetSimulation);
  const toggleLive = useCopStore((state) => state.toggleLive);
  const setPlaybackSpeed = useCopStore((state) => state.setPlaybackSpeed);

  useEffect(() => {
    setManualIntercept(emptyManualIntercept);
    setFighterResponse(emptyFighterResponse);
    setVisualTimeSec(0);
  }, [activeSimulationId]);

  useEffect(() => {
    if (!isLive) return undefined;
    const timer = window.setInterval(advanceSimulation, 250 / playbackSpeed);
    return () => window.clearInterval(timer);
  }, [advanceSimulation, isLive, playbackSpeed]);

  useEffect(() => {
    if (isLive || fighterResponse.acceptedAtSec !== undefined) return;
    setVisualTimeSec(simulationTick * SIMULATION_STEP_SEC);
  }, [fighterResponse.acceptedAtSec, isLive, simulationTick]);

  const shouldRunVisualClock =
    isLive ||
    (fighterResponse.acceptedAtSec !== undefined &&
      visualTimeSec < fighterResponse.acceptedAtSec + fighterPostEngagementDurationSec);
  useEffect(() => {
    if (!shouldRunVisualClock) {
      if (visualFrameRef.current !== null) {
        window.cancelAnimationFrame(visualFrameRef.current);
        visualFrameRef.current = null;
      }
      visualLastFrameRef.current = null;
      visualDeltaRef.current = 0;
      return undefined;
    }

    const maxTimeSec = Math.max(
      SIMULATION_MAX_TICK * SIMULATION_STEP_SEC,
      fighterResponse.acceptedAtSec !== undefined
        ? fighterResponse.acceptedAtSec + fighterPostEngagementDurationSec
        : 0,
    );
    visualLastFrameRef.current = window.performance.now();
    visualCommitAtRef.current = visualLastFrameRef.current;
    visualDeltaRef.current = 0;
    const visualSpeed = isLive ? playbackSpeed : 1;

    const step = (timestamp: number) => {
      const previous = visualLastFrameRef.current ?? timestamp;
      const deltaSec = Math.min(Math.max(0, (timestamp - previous) / 1000), 0.08);
      visualLastFrameRef.current = timestamp;
      visualDeltaRef.current += deltaSec * visualSpeed;

      if (timestamp - visualCommitAtRef.current >= 33) {
        const advanceBy = visualDeltaRef.current;
        visualDeltaRef.current = 0;
        visualCommitAtRef.current = timestamp;
        setVisualTimeSec((current) => Math.min(maxTimeSec, current + advanceBy));
      }

      visualFrameRef.current = window.requestAnimationFrame(step);
    };

    visualFrameRef.current = window.requestAnimationFrame(step);
    return () => {
      if (visualFrameRef.current !== null) {
        window.cancelAnimationFrame(visualFrameRef.current);
        visualFrameRef.current = null;
      }
      visualLastFrameRef.current = null;
      visualDeltaRef.current = 0;
    };
  }, [fighterResponse.acceptedAtSec, isLive, playbackSpeed, shouldRunVisualClock]);

  useEffect(() => {
    if (!isSettingsOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSettingsOpen]);

  const model = useMemo(
    () =>
      buildCopModel(scenarios, decisions, simulationTick, activeSimulationId, {
        manualInterceptResolved: manualIntercept.status === "resolved",
        manualInterceptMissed: manualIntercept.status === "missed",
        fighterResponseAcknowledged: Boolean(fighterResponse.selectedFighterId),
        fighterResponseMissed: Boolean(fighterResponse.missedAtSec),
      }),
    [activeSimulationId, decisions, fighterResponse.missedAtSec, fighterResponse.selectedFighterId, manualIntercept.status, scenarios, simulationTick],
  );
  const selectedTrack = model.tracks.find((track) => track.trackId === selectedTrackId) ?? model.tracks[0];
  const hasScenarioEnded = simulationTick >= SIMULATION_MAX_TICK && !isLive;
  const postEngagementAnimating =
    !isLive &&
    fighterResponse.acceptedAtSec !== undefined &&
    visualTimeSec < fighterResponse.acceptedAtSec + fighterPostEngagementDurationSec;
  const liveStatusLabel = fighterResponse.autoApprovedByRedLine
    ? "AUTO ENGAGE"
    : postEngagementAnimating
      ? "ENGAGE"
      : hasScenarioEnded
        ? "COMPLETE"
        : isLive
          ? "LIVE"
          : "READY";
  const trackQuality = Math.round(
    model.recommendations.length > 0
      ? model.recommendations.reduce((sum, recommendation) => sum + recommendation.confidence, 0) / model.recommendations.length
      : model.tracks.reduce((sum, track) => sum + track.confidence, 0) / Math.max(model.tracks.length, 1),
  );
  const pendingAdviceRecommendations = model.recommendations.filter((item) => (decisions[item.id] ?? "pending") === "pending");
  const nonFriendlyTracks = model.tracks.filter((track) => track.classification !== "friendly");
  const topThreatTrack = nonFriendlyTracks[0];
  const topThreatScore = topThreatTrack?.threatScore ?? 0;
  const isDmzEscalation = activeSimulationId === "dmz-drone-escalation";
  const fighterRaidDecisionTrack = model.tracks.find(isFighterFormationTrack);
  const displayTimeSec = isLive || postEngagementAnimating ? visualTimeSec : model.simulationTimeSec;
  const displayTimeLabel = formatDisplayTime(displayTimeSec);
  const displayTracks = useMemo(
    () => animateTracks(model.tracks, model.simulation.messages, displayTimeSec, model.simulation.trajectorySpecs),
    [displayTimeSec, model.simulation.messages, model.simulation.trajectorySpecs, model.tracks],
  );
  const fighterRaidVisualSpawnSec = fighterRaidSpawnSec(fighterRaidDecisionTrack, model.simulation.trajectorySpecs);
  const fighterRaidDecisionSnapshot =
    fighterRaidDecisionTrack && model.simulation.fighterRaidStream
      ? fighterRaidSnapshotAt(model.simulation.fighterRaidStream, displayTimeSec, fighterRaidVisualSpawnSec)
      : undefined;
  const fighterRaidRedLineBreachEntity =
    isDmzEscalation && fighterRaidDecisionTrack && model.simulation.fighterRaidStream
      ? firstSnapshotRedBreach(fighterRaidDecisionSnapshot)
      : undefined;
  const fighterRaidRedLineBreached = Boolean(fighterRaidRedLineBreachEntity);
  useEffect(() => {
    if (!isDmzEscalation) return;
    if (manualIntercept.status === "resolved" || manualIntercept.status === "missed") return;
    if (model.simulationTimeSec < dmzReconMissedAfterSec) return;
    setManualIntercept({ status: "missed", missedAtSec: model.simulationTimeSec });
  }, [isDmzEscalation, manualIntercept.status, model.simulationTimeSec]);
  useEffect(() => {
    if (!isDmzEscalation) return;
    if (model.simulation.fighterRaidStream) return;
    if (manualIntercept.status !== "resolved" && manualIntercept.status !== "missed") return;
    if (fighterResponse.selectedFighterId || fighterResponse.acceptedAtSec !== undefined || fighterResponse.missedAtSec) return;
    if (model.simulationTimeSec < dmzFighterResponseMissedAfterSec) return;
    setFighterResponse({ missedAtSec: model.simulationTimeSec });
  }, [
    fighterResponse.acceptedAtSec,
    fighterResponse.missedAtSec,
    fighterResponse.selectedFighterId,
    isDmzEscalation,
    manualIntercept.status,
    model.simulation.fighterRaidStream,
    model.simulationTimeSec,
  ]);
  const urgentPendingRecommendations = pendingAdviceRecommendations.filter((recommendation) => {
    const track = model.tracks.find((item) => item.trackId === recommendation.trackId);
    const trackThreatScore = track?.threatScore ?? 0;
    if (isDmzEscalation) {
      return (
        (manualIntercept.status === "resolved" || manualIntercept.status === "missed") &&
        (fighterRaidRedLineBreached || fighterResponse.autoApprovedByRedLine) &&
        (track?.threatClassId === "RED_FIGHTER_RAID" || recommendation.threatClassId === "RED_FIGHTER_RAID" || (track?.representedCount ?? 0) >= 100)
      );
    }
    return (
      model.simulation.severity === "war" ||
      model.simulation.severity === "crisis" ||
      recommendation.roeStatus === "approval-required" ||
      recommendation.roeStatus === "hold" ||
      trackThreatScore >= 72 ||
      model.briefing.lossRate >= 25
    );
  });
  const urgentPendingAdvice = urgentPendingRecommendations[0];
  const urgentRecommendationCount = urgentPendingRecommendations.length;
  const fighterRaidRecommendation = model.recommendations.find(
    (recommendation) =>
      recommendation.threatClassId === "RED_FIGHTER_RAID" ||
      model.tracks.some((track) => track.trackId === recommendation.trackId && track.threatClassId === "RED_FIGHTER_RAID"),
  );
  useEffect(() => {
    if (!fighterRaidRedLineBreached || !model.simulation.fighterRaidStream) return;
    if (fighterResponse.acceptedAtSec !== undefined || fighterResponse.missedAtSec) return;

    setFighterResponse({
      selectedFighterId: firstSnapshotBlueFighterId(fighterRaidDecisionSnapshot),
      acknowledgedAtSec: displayTimeSec,
      acceptedAtSec: displayTimeSec,
      autoApprovedByRedLine: true,
    });
  }, [
    displayTimeSec,
    fighterRaidDecisionSnapshot,
    fighterRaidRedLineBreachEntity,
    fighterRaidRedLineBreached,
    fighterResponse.acceptedAtSec,
    fighterResponse.missedAtSec,
    model.simulation.fighterRaidStream,
  ]);
  useEffect(() => {
    if (!fighterResponse.autoApprovedByRedLine || !fighterRaidRecommendation) return;
    if ((decisions[fighterRaidRecommendation.id] ?? "pending") === "approved") return;
    setDecision(fighterRaidRecommendation.id, "approved");
  }, [decisions, fighterRaidRecommendation, fighterResponse.autoApprovedByRedLine, setDecision]);
  const isReconDroneVisible = displayTracks.some((track) => isReconDroneTrack(track));
  const displayAssets = useMemo(
    () => (isDmzEscalation && !isReconDroneVisible ? model.assets.filter((asset) => !isAttackDroneAsset(asset)) : model.assets),
    [isDmzEscalation, isReconDroneVisible, model.assets],
  );
  useEffect(() => {
    if (!isDmzEscalation) return;
    if (manualIntercept.status !== "idle" && manualIntercept.status !== "armed") return;

    const reconTrack = displayTracks.find(isReconDroneTrack);
    const attackDroneAsset = model.assets.find(isAttackDroneAsset);
    if (!reconTrack || !attackDroneAsset) return;
    if (reconTrack.lat > dmzOrangeResponseLat && displayTimeSec < 18) return;
    if (model.simulationTimeSec >= dmzReconMissedAfterSec) return;

    setManualIntercept({
      status: "resolved",
      assetId: manualIntercept.assetId ?? attackDroneAsset.assetId,
      targetTrackId: reconTrack.trackId,
      resolvedAtSec: displayTimeSec,
    });
  }, [displayTimeSec, displayTracks, isDmzEscalation, manualIntercept.assetId, manualIntercept.status, model.assets, model.simulationTimeSec]);
  const constraintViolationCount = model.recommendations.filter(
    (item) => !item.noExecute || !(item.constraintsChecked ?? []).includes("NO_REAL_COMMAND"),
  ).length;
  const constraintStatus = constraintViolationCount === 0 ? "없음" : `${constraintViolationCount}건`;
  const crisisAlert = buildCrisisAlert({
    severity: model.simulation.severity,
    title: model.simulation.title,
    topTrack: topThreatTrack,
    lossRate: model.briefing.lossRate,
    adviceReviewCount: urgentRecommendationCount,
  });
  const toggleAuxiliaryLayer = (layerId: AuxiliaryLayerId) => {
    setVisibleAuxiliaryLayers((current) => ({
      ...current,
      [layerId]: !current[layerId],
    }));
  };
  const handleSelectAsset = (assetId: string) => {
    const asset = model.assets.find((item) => item.assetId === assetId);
    if (isAttackDroneAsset(asset) && manualIntercept.status !== "missed") {
      setManualIntercept({ status: "armed", assetId });
    }
  };
  const handleSelectTrack = (trackId: string) => {
    setSelectedTrackId(trackId);
    const track = model.tracks.find((item) => item.trackId === trackId);
    if (manualIntercept.status === "armed" && manualIntercept.assetId && isReconDroneTrack(track) && model.simulationTimeSec < dmzReconMissedAfterSec) {
      setManualIntercept({
        status: "resolved",
        assetId: manualIntercept.assetId,
        targetTrackId: trackId,
        resolvedAtSec: model.simulationTimeSec,
      });
    }
  };
  const handleSelectResponseFighter = (fighterId: string) => {
    if (fighterResponse.missedAtSec) return;
    setFighterResponse({
      selectedFighterId: fighterId,
      acknowledgedAtSec: model.simulationTimeSec,
    });
  };
  const handleResetSimulation = () => {
    resetSimulation();
    setManualIntercept(emptyManualIntercept);
    setFighterResponse(emptyFighterResponse);
    setVisualTimeSec(0);
  };
  const handleResetDecisions = () => {
    resetDecisions();
    setManualIntercept(emptyManualIntercept);
    setFighterResponse(emptyFighterResponse);
  };
  const handleAdviceDecision = (recommendationId: string, decision: DecisionState) => {
    setDecision(recommendationId, decision);

    if (decision !== "approved") return;
    const recommendation = model.recommendations.find((item) => item.id === recommendationId);
    const isFighterRaidRecommendation =
      recommendation?.threatClassId === "RED_FIGHTER_RAID" ||
      model.tracks.some((track) => track.trackId === recommendation?.trackId && track.threatClassId === "RED_FIGHTER_RAID");
    if (!isFighterRaidRecommendation || !model.simulation.fighterRaidStream) return;

    const snapshot = fighterRaidSnapshotAt(model.simulation.fighterRaidStream, displayTimeSec, fighterRaidVisualSpawnSec);
    setFighterResponse({
      selectedFighterId: firstSnapshotBlueFighterId(snapshot),
      acknowledgedAtSec: model.simulationTimeSec,
      acceptedAtSec: displayTimeSec,
    });
  };
  const handleToggleLive = () => {
    if (!isLive && simulationTick >= SIMULATION_MAX_TICK) {
      setManualIntercept(emptyManualIntercept);
      setFighterResponse(emptyFighterResponse);
      setVisualTimeSec(0);
    } else if (!isLive) {
      setVisualTimeSec(model.simulationTimeSec);
    }
    toggleLive();
  };
  const togglePresenterMode = () => {
    setPresenterExpanded((current) => !current);
  };
  const openSettings = () => setSettingsOpen(true);
  const closeSettings = () => setSettingsOpen(false);
  const showSupportDock = visibleAuxiliaryLayers.assets;
  return (
    <main className={clsx("app-shell", `app-shell--${crisisAlert.mode}`)}>
      <section className={clsx("presenter-console", isPresenterExpanded ? "presenter-console--full" : "presenter-console--compact")} aria-label="separated presenter operation controls">
        <header className="command-header">
          {isPresenterExpanded ? (
            <>
              <div className="command-header__context">
                <p className="section-kicker">Operational Link-16 COP</p>
                <h1>AirShield Commander COP</h1>
                <p>
                  합성 전술 메시지와 OSINT 맥락으로 실시간 COP를 구성하고, 긴급 조건에서만 AI가 지휘관에게 대응 추천 팝업을 올린다.
                  평상시 화면은 작전상황 인지와 결심 대기 상태에 집중한다.
                </p>
                <div className="active-simulation">
                  <span className={clsx("active-simulation__severity", `active-simulation__severity--${model.simulation.severity}`)}>
                    {severityLabel[model.simulation.severity]}
                  </span>
                  <strong>{model.simulation.title}</strong>
                  <span>{model.simulation.regionLabel}</span>
                </div>
              </div>
              <div className="command-header__console" aria-label="presenter operation controls">
                <div className="command-header__console-heading">
                  <div>
                    <p className="section-kicker">Operations Console</p>
                    <strong>
                      시연자 콘솔 <span>(상황 진행 제어)</span>
                    </strong>
                  </div>
                  <button className="console-mode-toggle" onClick={togglePresenterMode} aria-pressed={!isPresenterExpanded}>
                    <Minimize2 size={17} />
                    한줄 모드
                  </button>
                </div>
                <div className="command-header__actions">
                  <span className="scenario-fixed-chip">작전상황 로드됨</span>
                  <span className={clsx("live-chip", isLive && "live-chip--on")}>
                    <i />
                    {liveStatusLabel} {displayTimeLabel} · {playbackSpeed}x
                  </span>
                  <div className="speed-control" role="group" aria-label="operational playback speed">
                    <span>배속</span>
                    {playbackSpeeds.map((speed) => (
                      <button
                        key={speed}
                        className={clsx(speed === playbackSpeed && "speed-control__button--active")}
                        onClick={() => setPlaybackSpeed(speed)}
                        aria-pressed={speed === playbackSpeed}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                  <button onClick={handleToggleLive}>
                    {isLive ? <PauseCircle size={17} /> : <PlayCircle size={17} />}
                    {isLive ? "정지" : "시작"}
                  </button>
                  <button onClick={handleResetSimulation}>
                    <RotateCcw size={17} />
                    처음으로
                  </button>
                  <button onClick={handleResetDecisions}>
                    <History size={17} />
                    결심 기록 초기화
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="presenter-compact-bar" aria-label="compact operation controls">
              <div className="presenter-compact__identity">
                <span className={clsx("active-simulation__severity", `active-simulation__severity--${model.simulation.severity}`)}>
                  {severityLabel[model.simulation.severity]}
                </span>
                <strong>{model.simulation.title}</strong>
                <span>{model.simulation.regionLabel}</span>
              </div>
              <div className="presenter-compact__controls">
                <span className={clsx("live-chip", isLive && "live-chip--on")}>
                  <i />
                  {liveStatusLabel} {displayTimeLabel} · {playbackSpeed}x
                </span>
                <div className="speed-control" role="group" aria-label="operational playback speed compact">
                  <span>배속</span>
                  {playbackSpeeds.map((speed) => (
                    <button
                      key={speed}
                      className={clsx(speed === playbackSpeed && "speed-control__button--active")}
                      onClick={() => setPlaybackSpeed(speed)}
                      aria-pressed={speed === playbackSpeed}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
                <button onClick={handleToggleLive}>
                  {isLive ? <PauseCircle size={17} /> : <PlayCircle size={17} />}
                  {isLive ? "정지" : "시작"}
                </button>
                <button onClick={handleResetSimulation}>
                  <RotateCcw size={17} />
                  처음으로
                </button>
                <button className="console-mode-toggle" onClick={togglePresenterMode} aria-pressed={!isPresenterExpanded}>
                  <Maximize2 size={17} />
                  전체 콘솔
                </button>
              </div>
            </div>
          )}
        </header>

      </section>

      <section className="commander-view map-workspace" aria-label="map-first commander operational picture">
        <CopMap
          tracks={displayTracks}
          assets={displayAssets}
          commandPost={model.commandPost}
          mapTitle={model.simulation.mapTitle}
          selectedTrackId={selectedTrack?.trackId ?? ""}
          selectedAssetId={manualIntercept.assetId}
          manualEngagement={manualIntercept}
          fighterRaidStream={model.simulation.fighterRaidStream}
          fighterResponse={fighterResponse}
          simulationTimeSec={displayTimeSec}
          trajectorySpecs={model.simulation.trajectorySpecs}
          onSelectTrack={handleSelectTrack}
          onSelectAsset={handleSelectAsset}
          onSelectResponseFighter={handleSelectResponseFighter}
        />

        <CommanderSettings
          isOpen={isSettingsOpen}
          onOpen={openSettings}
          onClose={closeSettings}
          visibleLayers={visibleAuxiliaryLayers}
          onToggleLayer={toggleAuxiliaryLayer}
        />

        <div className="commander-status map-overlay map-overlay--status" aria-label="commander status summary">
          <div className="commander-view__heading">
            <div>
              <p className="section-kicker">Commander COP</p>
              <h2>합동 작전상황판</h2>
            </div>
            <span>경보 · 브리핑 · 결심</span>
          </div>
          <CrisisAlert alert={crisisAlert} />

          <section className="metrics-row metrics-row--ai" aria-label="operational status summary">
            <MetricCard label="Track quality" value={trackQuality} suffix="%" icon={Gauge} tone={percentTone(trackQuality)} />
            <MetricCard label="Top threat" value={topThreatScore} icon={Siren} tone={topThreatScore >= 80 ? "bad" : topThreatScore >= 60 ? "warn" : "good"} />
            <MetricCard label="Civil air" value="OpenSky 대기" icon={Activity} tone="warn" />
            <MetricCard label="Urgent rec" value={urgentRecommendationCount} icon={Brain} tone={urgentRecommendationCount > 0 ? "bad" : "good"} />
            <MetricCard label="Constraint" value={constraintStatus} icon={ShieldCheck} tone={constraintViolationCount === 0 ? "good" : "bad"} />
          </section>
          <BoundaryRulesPanel />
          <ForceInventoryPanel inventory={model.simulation.forceInventory} />
          <ManualInterceptPanel state={manualIntercept} />
        </div>

        <TacticalAdvicePopup recommendation={urgentPendingAdvice} onDecision={handleAdviceDecision} />

        <aside className="decision-rail map-overlay map-overlay--decision" aria-label="briefing and commander decision panels">
          <BriefingPanel briefing={model.briefing} />
          <CommanderActionPanel
            urgentRecommendation={urgentPendingAdvice}
            recommendations={model.recommendations}
            decisions={decisions}
            alertMode={crisisAlert.mode}
          />
        </aside>

        {showSupportDock ? (
          <section className="support-grid optional-dock optional-dock--support map-overlay" aria-label="optional operational asset panel">
            <ResourceConstraintPanel assets={model.assets} />
          </section>
        ) : null}
      </section>
    </main>
  );
}

const rootElement = document.getElementById("root") as HTMLElement & { __link16Root?: ReturnType<typeof createRoot> };
const root = rootElement.__link16Root ?? createRoot(rootElement);
rootElement.__link16Root = root;

root.render(
  <React.StrictMode>
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
      <App />
    </motion.div>
  </React.StrictMode>,
);
