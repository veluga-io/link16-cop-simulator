import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const inputPath =
  process.argv[2] ?? "/Users/ryu1872/Downloads/fighter-raid-handoff/MIXED_50.stream.json";
const outputPath = resolve(projectRoot, "src/generated/fighterRaidMixed50.ts");

const stream = JSON.parse(await readFile(inputPath, "utf8"));

const compactFighter = (fighter) => ({
  entityId: fighter.entityId,
  label: fighter.label,
  side: fighter.side,
  entityType: fighter.side === "BLUE" ? "FRIENDLY_AIR" : "FIGHTER_RAID",
  status: fighter.status,
  assetClassId: fighter.assetClassId,
  threatClassId: fighter.threatClassId,
  position: {
    x: fighter.position.x,
    y: fighter.position.y,
  },
  kinematics: {
    headingDeg: fighter.kinematics?.headingDeg ?? 0,
    speedKts: fighter.kinematics?.speedKts ?? 0,
    altitudeFt: fighter.kinematics?.altitudeFt ?? 0,
  },
  readiness: fighter.readiness,
  missiles: fighter.missiles ?? fighter.missilesRemaining,
  priorityScore: fighter.priorityScore,
});

const compactWorldStateFrame = (frame) => ({
  frameId: frame.frameId,
  frameType: frame.frameType,
  timelineSec: frame.timelineSec,
  roundIndex: frame.roundIndex,
  headline: frame.headline,
  redFighters: frame.payload.worldState.redFighters.map(compactFighter),
  blueFighters: frame.payload.worldState.blueFighters.map(compactFighter),
});

const compactSnapshotEntity = (entity) => ({
  entityId: entity.entityId,
  label: entity.label,
  side: entity.side,
  platformType: entity.platformType,
  entityType: entity.entityType,
  classId: entity.classId,
  status: entity.status,
  lat: entity.lat,
  lng: entity.lng,
  lon: entity.lon,
  altitudeFt: entity.altitudeFt,
  kinematics: {
    headingDeg: entity.kinematics?.headingDeg ?? 0,
    speedKts: entity.kinematics?.speedKts ?? 0,
    timeCompression: entity.kinematics?.timeCompression,
  },
  screen: entity.screen
    ? {
        frame: entity.screen.frame,
        x: entity.screen.x,
        y: entity.screen.y,
      }
    : undefined,
  detectedAtSec: entity.detectedAtSec,
  assignmentId: entity.assignmentId ?? null,
  health: entity.health,
  evidenceIds: entity.evidenceIds,
  conceptIds: entity.conceptIds,
  noExecute: true,
});

const compactSnapshotAssignment = (assignment) => ({
  assignmentId: assignment.assignmentId,
  roundIndex: assignment.roundIndex,
  status: assignment.status,
  startSec: assignment.startSec,
  resultSec: assignment.resultSec,
  blueEntityId: assignment.blueEntityId,
  redEntityId: assignment.redEntityId,
  assignmentScore: assignment.assignmentScore,
  pkEstimate: assignment.pkEstimate,
  line: {
    from: {
      lat: assignment.line.from.lat,
      lng: assignment.line.from.lng,
      lon: assignment.line.from.lon,
    },
    to: {
      lat: assignment.line.to.lat,
      lng: assignment.line.to.lng,
      lon: assignment.line.to.lon,
    },
  },
  rationale: assignment.rationale,
  noExecute: true,
});

const compactSnapshotEffect = (effect) => ({
  effectId: effect.effectId,
  type: effect.type,
  startSec: effect.startSec,
  durationSec: effect.durationSec,
  lat: effect.lat,
  lng: effect.lng,
  lon: effect.lon,
  altitudeFt: effect.altitudeFt,
  sourceEntityId: effect.sourceEntityId,
  targetEntityId: effect.targetEntityId,
  outcome: effect.outcome,
  displayHint: effect.displayHint,
  noExecute: true,
});

const compactSnapshot = (snapshot) => ({
  schemaVersion: snapshot.schemaVersion,
  scenarioId: snapshot.scenarioId,
  timelineSec: snapshot.timelineSec,
  mapFrameId: snapshot.mapFrameId,
  entities: snapshot.entities.map(compactSnapshotEntity),
  assignments: snapshot.assignments.map(compactSnapshotAssignment),
  effects: snapshot.effects.map(compactSnapshotEffect),
  events: snapshot.events,
  metrics: snapshot.metrics,
  noExecute: true,
});

const compact = {
  schemaVersion: stream.schemaVersion,
  scenarioId: stream.scenarioId,
  sourceFile: basename(inputPath),
  safetyBoundary: stream.safetyBoundary,
  blueForceOption: {
    optionId: stream.blueForceOption.optionId,
    label: stream.blueForceOption.label,
    redCount: stream.blueForceOption.redCount,
    totalBlueCount: stream.blueForceOption.totalBlueCount,
    targetRounds: stream.blueForceOption.targetRounds,
    composition: stream.blueForceOption.composition.map((item) => ({
      count: item.count,
      assetClassId: item.assetClassId,
      labelPrefix: item.labelPrefix,
      missiles: item.missiles,
      readinessBase: item.readinessBase,
      effectivenessModifier: item.effectivenessModifier,
    })),
  },
  timing: stream.timing,
  redFighters: stream.initialWorldState.redFighters.map(compactFighter),
  blueFighters: stream.initialWorldState.blueFighters.map(compactFighter),
  snapshots: stream.snapshots.map(compactSnapshot),
  frames: stream.frames.map((frame) => ({
    frameId: frame.frameId,
    frameType: frame.frameType,
    timelineSec: frame.timelineSec,
    roundIndex: frame.roundIndex,
    headline: frame.headline,
  })),
  worldStates: stream.frames.filter((frame) => frame.payload?.worldState).map(compactWorldStateFrame),
  rounds: stream.rounds.map((round) => ({
    roundIndex: round.roundIndex,
    timelineStartSec: round.timelineStartSec,
    timelineEndSec: round.timelineEndSec,
    assignments: round.assignmentBatch.assignments.map((assignment) => ({
      assignmentId: assignment.assignmentId,
      blueFighterId: assignment.blueFighterId,
      redFighterId: assignment.redFighterId,
      assignmentScore: assignment.assignmentScore,
      pkEstimate: assignment.pkEstimate,
      distanceBand: assignment.distanceBand,
    })),
    results: round.engagementRound.results.map((result) => ({
      resultId: result.resultId,
      assignmentId: result.assignmentId,
      blueFighterId: result.blueFighterId,
      redFighterId: result.redFighterId,
      outcome: result.outcome,
      blueStatusAfter: result.blueStatusAfter,
      redStatusAfter: result.redStatusAfter,
    })),
  })),
  metrics: stream.metrics,
  noExecute: true,
};

const moduleSource = `import type { FighterRaidStreamLite } from "../types";

export const fighterRaidMixed50 = ${JSON.stringify(compact, null, 2)} satisfies FighterRaidStreamLite;
`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, moduleSource, "utf8");

console.log(`Imported fighter raid stream to ${outputPath}`);
