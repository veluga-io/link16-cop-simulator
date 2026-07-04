import { create } from "zustand";
import { getSimulationPreset, SIMULATION_MAX_TICK } from "./engine";
import { defaultSimulationId } from "./data";
import type { DecisionState, PlaybackSpeed, ScenarioKey } from "./types";

export const scenarioLabels: Record<ScenarioKey, string> = {
  messageLoss: "메시지 손실",
  ewJamming: "EW 재밍",
  sensorConflict: "센서 불일치",
  assetDegrade: "자산 저하",
};

type CopStore = {
  activeSimulationId: string;
  scenarios: Record<ScenarioKey, boolean>;
  decisions: Record<string, DecisionState>;
  selectedTrackId: string;
  simulationTick: number;
  isLive: boolean;
  playbackSpeed: PlaybackSpeed;
  toggleScenario: (key: ScenarioKey) => void;
  resetScenarios: () => void;
  setDecision: (id: string, decision: DecisionState) => void;
  resetDecisions: () => void;
  setSelectedTrackId: (trackId: string) => void;
  selectSimulation: (simulationId: string) => void;
  advanceSimulation: () => void;
  resetSimulation: () => void;
  toggleLive: () => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
};

const emptyScenarios: Record<ScenarioKey, boolean> = {
  messageLoss: false,
  ewJamming: false,
  sensorConflict: false,
  assetDegrade: false,
};

const initialTrackIdForSimulation = (simulationId: string) => getSimulationPreset(simulationId).messages[0]?.trackHint ?? "F-01";
const simulationTickIncrement = 0.0625;

export const useCopStore = create<CopStore>((set) => ({
  activeSimulationId: defaultSimulationId,
  scenarios: emptyScenarios,
  decisions: {},
  selectedTrackId: initialTrackIdForSimulation(defaultSimulationId),
  simulationTick: 0,
  isLive: false,
  playbackSpeed: 1,
  toggleScenario: (key) =>
    set((state) => ({
      scenarios: {
        ...state.scenarios,
        [key]: !state.scenarios[key],
      },
      decisions: {},
    })),
  resetScenarios: () =>
    set((state) => ({
      scenarios: emptyScenarios,
      decisions: {},
      selectedTrackId: initialTrackIdForSimulation(state.activeSimulationId),
    })),
  setDecision: (id, decision) =>
    set((state) => ({
      decisions: {
        ...state.decisions,
        [id]: decision,
      },
    })),
  resetDecisions: () => set({ decisions: {} }),
  setSelectedTrackId: (trackId) => set({ selectedTrackId: trackId }),
  selectSimulation: (simulationId) =>
    set({
      activeSimulationId: simulationId,
      scenarios: emptyScenarios,
      decisions: {},
      selectedTrackId: initialTrackIdForSimulation(simulationId),
      simulationTick: 0,
      isLive: false,
    }),
  advanceSimulation: () =>
    set((state) => {
      if (state.simulationTick >= SIMULATION_MAX_TICK) {
        return { isLive: false };
      }

      const nextTick = Math.min(SIMULATION_MAX_TICK, state.simulationTick + simulationTickIncrement);
      return {
        simulationTick: nextTick,
        isLive: nextTick < SIMULATION_MAX_TICK,
      };
    }),
  resetSimulation: () =>
    set((state) => ({
      simulationTick: 0,
      decisions: {},
      selectedTrackId: initialTrackIdForSimulation(state.activeSimulationId),
      isLive: false,
    })),
  toggleLive: () =>
    set((state) => {
      if (state.isLive) return { isLive: false };
      if (state.simulationTick >= SIMULATION_MAX_TICK) {
        return {
          simulationTick: 0,
          decisions: {},
          selectedTrackId: initialTrackIdForSimulation(state.activeSimulationId),
          isLive: true,
        };
      }
      return { isLive: true };
    }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
}));
