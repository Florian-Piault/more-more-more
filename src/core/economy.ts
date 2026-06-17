import type { Effect, GameState, GeneratorDef } from "@/core/types";
import { GENERATORS, GENERATORS_BY_ID } from "@/data/generators";
import { UPGRADES_BY_ID } from "@/data/upgrades";
import { ACHIEVEMENTS_BY_ID } from "@/data/achievements";
import { generatorCount } from "@/core/state";
import { metaClickMult, metaClickShare, metaMilestoneBase, metaProdMult } from "@/core/meta";

/** Tous les N exemplaires d'un générateur, sa production est multipliée (palier). */
export const MILESTONE_STEP = 25;

/**
 * Multiplicateur de palier d'un générateur : ×base par tranche de MILESTONE_STEP.
 * `base` vaut 2 par défaut, 3 avec le nœud méta « Paliers renforcés ».
 */
export function milestoneMultiplier(owned: number, base = 2): number {
  return Math.pow(base, Math.floor(owned / MILESTONE_STEP));
}

/** Nombre d'exemplaires restants avant le prochain palier ×2. */
export function untilNextMilestone(owned: number): number {
  return MILESTONE_STEP - (owned % MILESTONE_STEP);
}

/** Tous les effets actifs : améliorations possédées + effets spéciaux d'accomplissements. */
function* activeEffects(state: GameState): Generator<Effect> {
  for (const id of Object.keys(state.ownedUpgrades)) {
    const up = UPGRADES_BY_ID.get(id);
    if (up) yield* up.effects;
  }
  for (const id of Object.keys(state.unlockedAchievements)) {
    const ach = ACHIEVEMENTS_BY_ID.get(id);
    if (ach?.specialEffect) yield ach.specialEffect;
  }
}

/** Bonus de prestige : chaque Percée ajoute +2% à la production globale. */
function prestigeMult(state: GameState): number {
  return 1 + state.breakthroughs * 0.02;
}

/** Bonus d'accomplissements « standards » (sans effet spécial) : +1% chacun. */
function achievementMult(state: GameState): number {
  let standard = 0;
  for (const id of Object.keys(state.unlockedAchievements)) {
    const ach = ACHIEVEMENTS_BY_ID.get(id);
    if (ach && !ach.specialEffect && !ach.cosmetic) standard++;
  }
  return 1 + standard * 0.01;
}

/** Multiplicateur global appliqué à toute la production. */
export function globalMultiplier(state: GameState): number {
  let mult = prestigeMult(state) * achievementMult(state) * metaProdMult(state);
  for (const eff of activeEffects(state)) {
    if (eff.kind === "globalMult") mult *= eff.factor;
  }
  return mult;
}

/** Multiplicateur spécifique à un générateur (améliorations ciblées). */
export function generatorMultiplier(state: GameState, generatorId: string): number {
  let mult = 1;
  for (const eff of activeEffects(state)) {
    if (eff.kind === "generatorMult" && eff.generatorId === generatorId) mult *= eff.factor;
  }
  return mult;
}

/** Réduction de coût cumulée pour un générateur (0 = aucune, 0.1 = -10%). */
function costReductionFactor(state: GameState, generatorId: string): number {
  let factor = 1;
  for (const eff of activeEffects(state)) {
    if (eff.kind === "costReduction" && eff.generatorId === generatorId) factor *= eff.factor;
  }
  return factor;
}

/** Coût du prochain exemplaire d'un générateur (géométrique). */
export function nextCost(state: GameState, def: GeneratorDef): number {
  const owned = generatorCount(state, def.id);
  const raw = def.baseCost * Math.pow(def.costGrowth, owned);
  return Math.ceil(raw * costReductionFactor(state, def.id));
}

/** Production passive d'un générateur (tous exemplaires confondus), RP/sec. */
export function generatorProduction(state: GameState, def: GeneratorDef): number {
  const owned = generatorCount(state, def.id);
  if (owned === 0) return 0;
  return (
    owned *
    def.baseProduction *
    milestoneMultiplier(owned, metaMilestoneBase(state)) *
    generatorMultiplier(state, def.id) *
    globalMultiplier(state)
  );
}

/** Production passive totale, RP/sec. */
export function totalProduction(state: GameState): number {
  let total = 0;
  for (const def of GENERATORS) total += generatorProduction(state, def);
  return total;
}

/** Valeur d'un clic manuel : base 1 + part de la prod/sec, le tout × multiplicateurs de clic. */
export function clickValue(state: GameState): number {
  let clickMult = metaClickMult(state);
  for (const eff of activeEffects(state)) {
    if (eff.kind === "clickMult") clickMult *= eff.factor;
  }
  const base = 1 + totalProduction(state) * metaClickShare(state);
  return base * clickMult;
}

/** Applique la production des clics automatiques (sans incrémenter totalClicks). */
export function applyAutoClicks(state: GameState, count: number): void {
  if (count <= 0) return;
  const gain = clickValue(state) * count;
  state.rp += gain;
  state.totalRP += gain;
}

/** Tente d'acheter un générateur. Retourne true si l'achat a réussi. */
export function buyGenerator(state: GameState, generatorId: string): boolean {
  const def = GENERATORS_BY_ID.get(generatorId);
  if (!def) return false;
  const cost = nextCost(state, def);
  if (state.rp < cost) return false;
  state.rp -= cost;
  state.generators[generatorId] = generatorCount(state, generatorId) + 1;
  return true;
}

/** Tente d'acheter une amélioration. Retourne true si l'achat a réussi. */
export function buyUpgrade(state: GameState, upgradeId: string): boolean {
  const up = UPGRADES_BY_ID.get(upgradeId);
  if (!up || state.ownedUpgrades[upgradeId]) return false;
  if (state.rp < up.cost) return false;
  state.rp -= up.cost;
  state.ownedUpgrades[upgradeId] = true;
  return true;
}

/** Applique un clic manuel à l'état. Retourne les RP gagnés. */
export function applyClick(state: GameState): number {
  const gain = clickValue(state);
  state.rp += gain;
  state.totalRP += gain;
  state.totalClicks += 1;
  return gain;
}
