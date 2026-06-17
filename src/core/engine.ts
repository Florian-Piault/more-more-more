import type { AchievementDef, GameState } from "@/core/types";
import { applyAutoClicks, gainRP, totalProduction } from "@/core/economy";
import { metaAutoClicksPerSec } from "@/core/meta";
import { evalCondition } from "@/core/state";
import { saveState } from "@/core/save";
import { ACHIEVEMENTS } from "@/data/achievements";

const TICK_MS = 50; // ~20 ticks/seconde pour une accumulation fluide
const AUTOSAVE_MS = 10_000;

export interface EngineCallbacks {
  /** Appelé à chaque tick logique (état muté en place). */
  onTick: (state: GameState) => void;
  /** Appelé une fois par accomplissement nouvellement débloqué. */
  onAchievement: (def: AchievementDef) => void;
}

/**
 * Pilote la simulation : accumulation passive à pas fixe, détection des
 * accomplissements et sauvegarde automatique. Indépendant du rendu.
 */
export class Engine {
  private rafId = 0;
  private lastTick = 0;
  private acc = 0;
  private sinceSave = 0;
  private running = false;

  constructor(
    private readonly state: GameState,
    private readonly cb: EngineCallbacks,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTick = performance.now();
    this.acc = 0;
    this.sinceSave = 0;
    this.checkAchievements(); // débloque ce qui est déjà mérité au chargement
    const frame = (t: number) => {
      if (!this.running) return;
      this.step(t);
      this.rafId = requestAnimationFrame(frame);
    };
    this.rafId = requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private step(now: number): void {
    let delta = now - this.lastTick;
    this.lastTick = now;
    // Garde-fou : un onglet en arrière-plan peut accumuler un énorme delta.
    if (delta > 5_000) delta = 5_000;
    this.acc += delta;

    while (this.acc >= TICK_MS) {
      this.tick(TICK_MS / 1000);
      this.acc -= TICK_MS;
    }

    this.sinceSave += delta;
    if (this.sinceSave >= AUTOSAVE_MS) {
      this.sinceSave = 0;
      saveState(this.state, Date.now());
    }

    this.cb.onTick(this.state);
  }

  private tick(dtSeconds: number): void {
    // Chrono de run + temps total joué (temps actif uniquement).
    this.state.runMs += dtSeconds * 1000;
    this.state.totalPlayMs += dtSeconds * 1000;
    // Décompte du boost temporaire « Eurêka ».
    if (this.state.boostSecondsLeft > 0) {
      this.state.boostSecondsLeft = Math.max(0, this.state.boostSecondsLeft - dtSeconds);
      if (this.state.boostSecondsLeft === 0) this.state.boostMult = 1;
    }
    const rps = totalProduction(this.state);
    if (rps > this.state.bestRps) this.state.bestRps = rps;
    gainRP(this.state, rps * dtSeconds);
    // Clics automatiques (méta) : valent un vrai clic, sans compter dans totalClicks.
    applyAutoClicks(this.state, metaAutoClicksPerSec(this.state) * dtSeconds);
    this.checkAchievements();
  }

  /** Débloque tout accomplissement dont la condition est désormais remplie. */
  checkAchievements(): void {
    for (const ach of ACHIEVEMENTS) {
      if (this.state.unlockedAchievements[ach.id]) continue;
      if (evalCondition(this.state, ach.condition)) {
        this.state.unlockedAchievements[ach.id] = true;
        this.cb.onAchievement(ach);
      }
    }
  }
}
