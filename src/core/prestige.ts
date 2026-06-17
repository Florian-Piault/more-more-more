import type { GameState } from "@/core/types";
import { createInitialState } from "@/core/state";

/** Seuil de RP en dessous duquel le prestige ne rapporte rien. */
export const PRESTIGE_THRESHOLD = 10_000_000;

/**
 * Percées que rapporterait un prestige immédiat : √(totalRP / seuil), planché à 0.
 * Il faut donc ×100 de RP pour ×10 de Percées → ressenti logarithmique.
 */
export function pendingBreakthroughs(state: GameState): number {
  if (state.totalRP < PRESTIGE_THRESHOLD) return 0;
  return Math.floor(Math.sqrt(state.totalRP / PRESTIGE_THRESHOLD));
}

export function canPrestige(state: GameState): boolean {
  return pendingBreakthroughs(state) >= 1;
}

/**
 * Effectue le prestige : réinitialise la run en conservant les Percées,
 * les accomplissements et les réglages. Retourne le nombre de Percées gagnées.
 */
export function performPrestige(state: GameState): number {
  const gained = pendingBreakthroughs(state);
  if (gained < 1) return 0;

  const fresh = createInitialState();
  state.rp = fresh.rp;
  state.totalRP = fresh.totalRP;
  state.totalClicks = fresh.totalClicks;
  state.runMs = fresh.runMs; // nouvelle run → chrono remis à zéro
  state.generators = fresh.generators;
  state.ownedUpgrades = fresh.ownedUpgrades;
  // Conservés : accomplissements, réglages et l'arbre de méta-améliorations.
  // Les Percées gagnées alimentent à la fois le bonus passif (+2% chacune,
  // jamais perdu) et le solde dépensable dans l'arbre.
  state.breakthroughs += gained;
  state.breakthroughPoints += gained;
  state.prestigeCount += 1;
  return gained;
}
