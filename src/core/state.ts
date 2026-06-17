import type { Condition, GameState, MetaBranch } from "@/core/types";
import { GENERATORS } from "@/data/generators";
import { META_UPGRADES } from "@/data/metaUpgrades";

export function createInitialState(): GameState {
  return {
    rp: 0,
    totalRP: 0,
    totalClicks: 0,
    runMs: 0,
    boostMult: 1,
    boostSecondsLeft: 0,
    generators: {},
    ownedUpgrades: {},
    research: {},
    unlockedAchievements: {},
    breakthroughs: 0,
    breakthroughPoints: 0,
    metaUpgrades: {},
    metaPointsSpent: 0,
    prestigeCount: 0,
    lifetimeRP: 0,
    lifetimeClicks: 0,
    totalPlayMs: 0,
    bestRps: 0,
    lastSaved: 0,
    settings: {
      muted: true, // mute activé par défaut
      scientificNotation: false,
    },
  };
}

export function generatorCount(state: GameState, id: string): number {
  return state.generators[id] ?? 0;
}

export function metaLevel(state: GameState, id: string): number {
  return state.metaUpgrades[id] ?? 0;
}

/** Vrai si tous les nœuds d'une branche sont au niveau max. */
export function isBranchComplete(state: GameState, branch: MetaBranch): boolean {
  return META_UPGRADES.filter((m) => m.branch === branch).every(
    (m) => metaLevel(state, m.id) >= m.maxLevel,
  );
}

/** Évalue une condition de déblocage / d'obtention contre l'état courant. */
export function evalCondition(state: GameState, cond: Condition): boolean {
  switch (cond.kind) {
    case "totalRP":
      return state.totalRP >= cond.amount;
    case "totalClicks":
      return state.totalClicks >= cond.amount;
    case "prestigeCount":
      return state.prestigeCount >= cond.amount;
    case "generatorCount":
      return generatorCount(state, cond.generatorId) >= cond.count;
    case "ownAllGenerators":
      return GENERATORS.every((g) => generatorCount(state, g.id) > 0);
    case "metaPointsSpent":
      return state.metaPointsSpent >= cond.amount;
    case "metaBranchComplete":
      return isBranchComplete(state, cond.branch);
    case "runUnder":
      return state.totalRP >= cond.rp && state.runMs <= cond.ms;
  }
}
