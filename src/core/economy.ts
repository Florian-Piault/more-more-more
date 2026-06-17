import type { Effect, GameState, GeneratorDef, ResearchDef } from "@/core/types";
import { GENERATORS, GENERATORS_BY_ID } from "@/data/generators";
import { UPGRADES_BY_ID } from "@/data/upgrades";
import { ACHIEVEMENTS_BY_ID } from "@/data/achievements";
import { RESEARCH, RESEARCH_BY_ID } from "@/data/research";
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

/** Multiplicateur cumulé des recherches continues d'un type donné (factor^niveau). */
function researchMult(state: GameState, kind: "globalMult" | "clickMult"): number {
  let m = 1;
  for (const r of RESEARCH) {
    if (r.effect.kind !== kind) continue;
    const lvl = state.research[r.id] ?? 0;
    if (lvl > 0) m *= Math.pow(r.effect.factor, lvl);
  }
  return m;
}

/** Multiplicateur du boost temporaire « Eurêka » (1 si inactif). */
function boostMultiplier(state: GameState): number {
  return state.boostSecondsLeft > 0 ? state.boostMult : 1;
}

/** Multiplicateur global appliqué à toute la production. */
export function globalMultiplier(state: GameState): number {
  let mult =
    prestigeMult(state) *
    achievementMult(state) *
    metaProdMult(state) *
    boostMultiplier(state) *
    researchMult(state, "globalMult");
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

/**
 * Coût cumulé pour acheter `qty` exemplaires d'un coup (somme géométrique).
 * La réduction de coût est appliquée à la somme entière.
 */
export function bulkCost(state: GameState, def: GeneratorDef, qty: number): number {
  if (qty <= 0) return 0;
  const owned = generatorCount(state, def.id);
  const g = def.costGrowth;
  const unit = def.baseCost * Math.pow(g, owned);
  const sum = (unit * (Math.pow(g, qty) - 1)) / (g - 1);
  return Math.ceil(sum * costReductionFactor(state, def.id));
}

/** Nombre maximal d'exemplaires achetables avec les RP courants (≥ 0). */
export function maxAffordable(state: GameState, def: GeneratorDef): number {
  const owned = generatorCount(state, def.id);
  const g = def.costGrowth;
  const unit = def.baseCost * Math.pow(g, owned) * costReductionFactor(state, def.id);
  const budget = state.rp;
  if (budget < Math.ceil(unit)) return 0;
  // Inversion de la somme géométrique : n ≤ log(1 + B·(g-1)/unit) / log(g).
  let qty = Math.max(0, Math.floor(Math.log(1 + (budget * (g - 1)) / unit) / Math.log(g)));
  // Ajustement des arrondis (la somme est arrondie au-dessus dans bulkCost).
  while (qty > 0 && bulkCost(state, def, qty) > budget) qty--;
  while (bulkCost(state, def, qty + 1) <= budget) qty++;
  return qty;
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
  let clickMult = metaClickMult(state) * researchMult(state, "clickMult");
  for (const eff of activeEffects(state)) {
    if (eff.kind === "clickMult") clickMult *= eff.factor;
  }
  const base = 1 + totalProduction(state) * metaClickShare(state);
  return base * clickMult;
}

/**
 * Crédite des RP partout : solde courant, cumul de la run et cumul à vie.
 * Point de passage unique pour tout gain (clic, passif, auto, hors-ligne, événement).
 */
export function gainRP(state: GameState, amount: number): void {
  if (amount <= 0) return;
  state.rp += amount;
  state.totalRP += amount;
  state.lifetimeRP += amount;
}

/** Applique la production des clics automatiques (sans incrémenter totalClicks). */
export function applyAutoClicks(state: GameState, count: number): void {
  if (count <= 0) return;
  gainRP(state, clickValue(state) * count);
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

/**
 * Achat groupé. `qty` est un nombre fixe (1, 10…) ou "max" pour acheter
 * autant que possible. Retourne le nombre réellement acheté.
 */
export function buyGeneratorBulk(
  state: GameState,
  generatorId: string,
  qty: number | "max",
): number {
  const def = GENERATORS_BY_ID.get(generatorId);
  if (!def) return 0;
  const n = qty === "max" ? maxAffordable(state, def) : Math.min(qty, maxAffordable(state, def));
  if (n <= 0) return 0;
  const cost = bulkCost(state, def, n);
  if (state.rp < cost) return 0;
  state.rp -= cost;
  state.generators[generatorId] = generatorCount(state, generatorId) + n;
  return n;
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

/** Coût du prochain niveau d'une recherche continue. */
export function researchCost(state: GameState, def: ResearchDef): number {
  const lvl = state.research[def.id] ?? 0;
  return Math.ceil(def.baseCost * Math.pow(def.costGrowth, lvl));
}

/** Tente d'acheter un niveau de recherche continue. Retourne true si réussi. */
export function buyResearch(state: GameState, researchId: string): boolean {
  const def = RESEARCH_BY_ID.get(researchId);
  if (!def) return false;
  const cost = researchCost(state, def);
  if (state.rp < cost) return false;
  state.rp -= cost;
  state.research[researchId] = (state.research[researchId] ?? 0) + 1;
  return true;
}

/** Applique un clic manuel à l'état. Retourne les RP gagnés. */
export function applyClick(state: GameState): number {
  const gain = clickValue(state);
  gainRP(state, gain);
  state.totalClicks += 1;
  state.lifetimeClicks += 1;
  return gain;
}
