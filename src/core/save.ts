import type { GameState } from "@/core/types";
import { createInitialState } from "@/core/state";
import { totalProduction } from "@/core/economy";
import { metaOfflineCapHours, metaOfflineRate } from "@/core/meta";

const STORAGE_KEY = "more-more-more:save";
const SCHEMA_VERSION = 1;

interface SaveEnvelope {
  version: number;
  state: GameState;
}

/** Fusionne un état chargé avec un état frais (tolérant aux champs manquants/futurs). */
function migrate(loaded: Partial<GameState>): GameState {
  const fresh = createInitialState();
  return {
    ...fresh,
    ...loaded,
    generators: { ...loaded.generators },
    ownedUpgrades: { ...loaded.ownedUpgrades },
    unlockedAchievements: { ...loaded.unlockedAchievements },
    metaUpgrades: { ...loaded.metaUpgrades },
    settings: { ...fresh.settings, ...loaded.settings },
  };
}

export function saveState(state: GameState, now: number): void {
  state.lastSaved = now;
  const envelope: SaveEnvelope = { version: SCHEMA_VERSION, state };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    /* quota / mode privé : on ignore silencieusement */
  }
}

export function loadState(): GameState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const envelope = JSON.parse(raw) as SaveEnvelope;
    return migrate(envelope.state);
  } catch {
    return null;
  }
}

export interface OfflineReport {
  durationMs: number;
  gained: number;
}

/**
 * Crédite la production passive accumulée hors-ligne (plafonnée et à taux réduit).
 * Retourne un bilan si quelque chose a été gagné, sinon null.
 */
export function applyOfflineProgress(state: GameState, now: number): OfflineReport | null {
  if (!state.lastSaved) return null;
  // Plafond et taux dépendent de l'arbre méta (branche Automatisation).
  const capMs = metaOfflineCapHours(state) * 60 * 60 * 1000;
  const rate = metaOfflineRate(state);
  const elapsed = Math.min(now - state.lastSaved, capMs);
  if (elapsed <= 0) return null;
  const gained = totalProduction(state) * (elapsed / 1000) * rate;
  if (gained <= 0) return null;
  state.rp += gained;
  state.totalRP += gained;
  return { durationMs: elapsed, gained };
}

/** Sérialise l'état en chaîne base64 (export utilisateur). */
export function exportSave(state: GameState): string {
  const json = JSON.stringify({ version: SCHEMA_VERSION, state } satisfies SaveEnvelope);
  return btoa(encodeURIComponent(json));
}

/** Tente de restaurer un état depuis une chaîne base64. Retourne null si invalide. */
export function importSave(encoded: string): GameState | null {
  try {
    const json = decodeURIComponent(atob(encoded.trim()));
    const envelope = JSON.parse(json) as SaveEnvelope;
    if (!envelope.state) return null;
    return migrate(envelope.state);
  } catch {
    return null;
  }
}

export function clearSave(): void {
  localStorage.removeItem(STORAGE_KEY);
}
