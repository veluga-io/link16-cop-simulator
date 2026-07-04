import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const workspaceRoot = resolve(projectRoot, "../..");
const payloadPath = resolve(workspaceRoot, "data/link16-cop-simulator/link16-cop-simulation.v2.mock.json");

const payload = JSON.parse(await readFile(payloadPath, "utf8"));
const failures = [];

const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

assert(payload.metadata?.schemaVersion === "link16-cop-simulation.v2", "metadata.schemaVersion must be link16-cop-simulation.v2");
assert(payload.metadata?.safetyBoundary === "SIMULATED_ONLY", "metadata.safetyBoundary must be SIMULATED_ONLY");
assert(payload.catalogRefs?.publicMilitaryCatalogEndpoint, "catalogRefs.publicMilitaryCatalogEndpoint missing");
assert(Array.isArray(payload.simulationPresets) && payload.simulationPresets.length === 5, "expected 5 simulation presets");

payload.simulationPresets.forEach((preset) => {
  assert(preset.id, "preset.id missing");
  assert(Array.isArray(preset.messages) && preset.messages.length > 0, `${preset.id} messages missing`);
  assert(Array.isArray(preset.assets) && preset.assets.length > 0, `${preset.id} assets missing`);
  assert(Array.isArray(preset.entities) && preset.entities.length > 0, `${preset.id} entities missing`);
  assert(Array.isArray(preset.trajectorySpecs), `${preset.id} trajectorySpecs missing`);
  assert(Array.isArray(preset.eventLog) && preset.eventLog.length === preset.messages.length, `${preset.id} eventLog must mirror messages`);
  assert(Array.isArray(preset.decisionRecords), `${preset.id} decisionRecords missing`);
  assert(Array.isArray(preset.ontologyLinks), `${preset.id} ontologyLinks missing`);
  assert(preset.orchestratorSnapshot?.executionPolicy === "NO_EXECUTE_ADVISORY_ONLY", `${preset.id} orchestrator no-execute policy missing`);
  assert(preset.orchestratorSnapshot?.noExecute === true, `${preset.id} orchestrator noExecute must be true`);

  preset.messages.forEach((message) => {
    assert(message.entityId, `${preset.id}/${message.id} entityId missing`);
    assert(message.entityType, `${preset.id}/${message.id} entityType missing`);
    assert(message.side, `${preset.id}/${message.id} side missing`);
    assert(message.eventType, `${preset.id}/${message.id} eventType missing`);
    assert(Array.isArray(message.evidenceIds) && message.evidenceIds.length > 0, `${preset.id}/${message.id} evidenceIds missing`);
    assert(Array.isArray(message.conceptIds) && message.conceptIds.length > 0, `${preset.id}/${message.id} conceptIds missing`);
    assert(message.provenance && !Array.isArray(message.provenance), `${preset.id}/${message.id} provenance must be structured object`);
    assert(Array.isArray(message.provenance?.sourceIds), `${preset.id}/${message.id} provenance.sourceIds missing`);
    assert(message.noExecute === true, `${preset.id}/${message.id} noExecute must be true`);
  });

  preset.assets.forEach((asset) => {
    assert(asset.assetClassId, `${preset.id}/${asset.assetId} assetClassId missing`);
    assert(Array.isArray(asset.weaponClassIds) && asset.weaponClassIds.length > 0, `${preset.id}/${asset.assetId} weaponClassIds missing`);
    assert(Array.isArray(asset.sensorClassIds) && asset.sensorClassIds.length > 0, `${preset.id}/${asset.assetId} sensorClassIds missing`);
    assert(asset.channels > 0, `${preset.id}/${asset.assetId} channels missing`);
    assert(asset.simulationProfile?.realLocationUsed === false, `${preset.id}/${asset.assetId} realLocationUsed must be false`);
    assert(asset.simulationProfile?.realInventoryUsed === false, `${preset.id}/${asset.assetId} realInventoryUsed must be false`);
  });

  preset.decisionRecords.forEach((decision) => {
    assert(decision.mode === "SIMULATED_ADVISORY_ONLY", `${preset.id}/${decision.decisionId} mode must be simulated advisory`);
    assert(decision.noExecute === true, `${preset.id}/${decision.decisionId} noExecute must be true`);
    assert(decision.scoreBreakdown?.channelAvailable !== undefined, `${preset.id}/${decision.decisionId} scoreBreakdown incomplete`);
    assert(decision.constraintsChecked?.includes("SIMULATED_ONLY"), `${preset.id}/${decision.decisionId} SIMULATED_ONLY missing`);
    assert(decision.constraintsChecked?.includes("NO_REAL_COMMAND"), `${preset.id}/${decision.decisionId} NO_REAL_COMMAND missing`);
    assert(decision.constraintsChecked?.includes("NO_REAL_LOCATION"), `${preset.id}/${decision.decisionId} NO_REAL_LOCATION missing`);
    assert(Array.isArray(decision.evidenceIds) && decision.evidenceIds.length > 0, `${preset.id}/${decision.decisionId} evidenceIds missing`);
  });
});

const war = payload.simulationPresets.find((preset) => preset.id === "joint-war-emergency");
const warThreatClasses = new Set(war?.messages.map((message) => message.threatClassId).filter(Boolean));
["RED_BALLISTIC_MISSILE", "RED_CRUISE_MISSILE", "RED_UAV_SWARM", "RED_FIGHTER_RAID"].forEach((classId) => {
  assert(warThreatClasses.has(classId), `joint-war-emergency must include ${classId}`);
});

const dmz = payload.simulationPresets.find((preset) => preset.id === "dmz-drone-escalation");
assert(dmz, "dmz-drone-escalation preset missing");
assert(Array.isArray(dmz?.forceInventory) && dmz.forceInventory.length === 2, "dmz-drone-escalation forceInventory missing");
assert(
  dmz?.messages.some((message) => message.trackHint === "KPA-REC-01" && message.threatClassId === "RED_UAV_SWARM"),
  "dmz-drone-escalation must include KPA reconnaissance drone",
);
assert(
  dmz?.messages.some((message) => message.trackHint === "KPA-FTR-150" && message.representedCount === 150 && message.requiresManualIntercept === true),
  "dmz-drone-escalation must include gated KPA fighter wave",
);
assert(
  dmz?.messages.some((message) => message.requiresManualInterceptMissed === true),
  "dmz-drone-escalation must include drone non-response branch",
);
assert(
  dmz?.messages.some((message) => message.requiresFighterResponseMissed === true),
  "dmz-drone-escalation must include fighter non-response branch",
);
assert(dmz?.fighterRaidStream?.blueForceOption?.optionId === "MIXED_50", "dmz-drone-escalation must include MIXED_50 fighter raid stream");
assert(dmz?.fighterRaidStream?.redFighters?.length === 100, "dmz fighter raid stream must include 100 red fighters");
assert(dmz?.fighterRaidStream?.blueFighters?.length === 50, "dmz fighter raid stream must include 50 blue fighters");
assert((dmz?.fighterRaidStream?.rounds?.[0]?.assignments?.length ?? 0) > 0, "dmz fighter raid stream assignments missing");
const dmzFighterTrajectory = dmz?.trajectorySpecs?.find((trajectory) => trajectory.threatClassId === "RED_FIGHTER_RAID");
assert(dmzFighterTrajectory, "dmz-drone-escalation must include RED_FIGHTER_RAID trajectory");
assert(dmzFighterTrajectory?.representedCount === 150, "dmz fighter trajectory representedCount must be 150");
assert(dmzFighterTrajectory?.visibleCount === 150, "dmz fighter trajectory visibleCount must be 150");
assert(dmzFighterTrajectory?.formation?.mode === "FIGHTER_RAID_WAVE", "dmz fighter trajectory formation mode missing");
assert(dmzFighterTrajectory?.formation?.source === "BE_GENERATED_TRAJECTORY_SPEC", "dmz fighter trajectory formation source missing");
assert(Array.isArray(dmzFighterTrajectory?.waypoints) && dmzFighterTrajectory.waypoints.length >= 4, "dmz fighter trajectory waypoints missing");

const serialized = JSON.stringify(payload);
const secretPatterns = [
  /sk-[A-Za-z0-9_-]{20,}/,
  /BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY/,
  /AKIA[0-9A-Z]{16}/,
  /ghp_[A-Za-z0-9_]{20,}/,
];
secretPatterns.forEach((pattern) => {
  assert(!pattern.test(serialized), `payload contains secret-like pattern ${pattern}`);
});

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, payloadPath, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, payloadPath, presetCount: payload.simulationPresets.length }, null, 2));
