import type { GameState, MetaUpgradeDef } from "@/core/types";
import { META_UPGRADES, META_BY_ID } from "@/data/metaUpgrades";
import { metaLevel } from "@/core/state";

// Valeurs par défaut (sans aucun nœud acheté).
export const DEFAULT_CLICK_SHARE = 0.04;
export const DEFAULT_MILESTONE_BASE = 2;
export const DEFAULT_OFFLINE_CAP_HOURS = 8;
export const DEFAULT_OFFLINE_RATE = 0.5;

/** Coût du prochain niveau d'un nœud (en Percées). */
export function metaCost(state: GameState, def: MetaUpgradeDef): number {
  return def.baseCost + metaLevel(state, def.id) * def.costStep;
}

/** Le prérequis du nœud est-il satisfait ? */
export function metaUnlocked(state: GameState, def: MetaUpgradeDef): boolean {
  if (!def.requires) return true;
  return metaLevel(state, def.requires.id) >= def.requires.level;
}

/** Peut-on acheter le prochain niveau ? */
export function canBuyMeta(state: GameState, def: MetaUpgradeDef): boolean {
  return (
    metaUnlocked(state, def) &&
    metaLevel(state, def.id) < def.maxLevel &&
    state.breakthroughPoints >= metaCost(state, def)
  );
}

/** Achète un niveau de nœud. Retourne true si l'achat a réussi. */
export function buyMetaUpgrade(state: GameState, id: string): boolean {
  const def = META_BY_ID.get(id);
  if (!def || !canBuyMeta(state, def)) return false;
  const cost = metaCost(state, def);
  state.breakthroughPoints -= cost;
  state.metaPointsSpent += cost;
  state.metaUpgrades[id] = metaLevel(state, id) + 1;
  return true;
}

// ---- Agrégation des effets -------------------------------------------------

/** Multiplicateur de production globale issu de l'arbre. */
export function metaProdMult(state: GameState): number {
  let mult = 1;
  for (const def of META_UPGRADES) {
    const lvl = metaLevel(state, def.id);
    if (lvl === 0) continue;
    for (const eff of def.effects) {
      if (eff.kind === "prodMult") mult *= eff.factor;
      else if (eff.kind === "prodMultPerLevel") mult *= Math.pow(eff.factor, lvl);
    }
  }
  return mult;
}

/** Multiplicateur de valeur du clic issu de l'arbre. */
export function metaClickMult(state: GameState): number {
  let mult = 1;
  for (const def of META_UPGRADES) {
    const lvl = metaLevel(state, def.id);
    if (lvl === 0) continue;
    for (const eff of def.effects) {
      if (eff.kind === "clickMult") mult *= eff.factor;
      else if (eff.kind === "clickMultPerLevel") mult *= Math.pow(eff.factor, lvl);
    }
  }
  return mult;
}

function maxEffectValue(
  state: GameState,
  pick: (eff: import("@/core/types").MetaEffect) => number | null,
  fallback: number,
): number {
  let best = fallback;
  for (const def of META_UPGRADES) {
    if (metaLevel(state, def.id) === 0) continue;
    for (const eff of def.effects) {
      const v = pick(eff);
      if (v !== null && v > best) best = v;
    }
  }
  return best;
}

export function metaClickShare(state: GameState): number {
  return maxEffectValue(state, (e) => (e.kind === "clickShare" ? e.value : null), DEFAULT_CLICK_SHARE);
}

export function metaMilestoneBase(state: GameState): number {
  return maxEffectValue(state, (e) => (e.kind === "milestoneBase" ? e.value : null), DEFAULT_MILESTONE_BASE);
}

export function metaOfflineCapHours(state: GameState): number {
  return maxEffectValue(state, (e) => (e.kind === "offlineCapHours" ? e.hours : null), DEFAULT_OFFLINE_CAP_HOURS);
}

export function metaOfflineRate(state: GameState): number {
  return maxEffectValue(state, (e) => (e.kind === "offlineRate" ? e.rate : null), DEFAULT_OFFLINE_RATE);
}

/** Clics automatiques par seconde (somme cumulative des nœuds possédés). */
export function metaAutoClicksPerSec(state: GameState): number {
  let total = 0;
  for (const def of META_UPGRADES) {
    if (metaLevel(state, def.id) === 0) continue;
    for (const eff of def.effects) {
      if (eff.kind === "autoClick") total += eff.perSec;
    }
  }
  return total;
}
