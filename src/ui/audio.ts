/**
 * Sons synthétisés en Web Audio API — aucun fichier asset.
 * Tons doux et « propres » cohérents avec le thème laboratoire.
 * Respecte le réglage muet (lu via un getter fourni à l'init).
 */

type OscType = "sine" | "triangle" | "square" | "sawtooth";

interface Note {
  freq: number;
  /** Début relatif (s) depuis le déclenchement. */
  at: number;
  /** Durée (s). */
  dur: number;
  type?: OscType;
  /** Gain crête (0–1) avant le gain maître. */
  gain?: number;
}

const MASTER_GAIN = 0.22;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let isMuted = () => true;

/** Initialise le module avec la source de vérité du réglage muet. */
export function initAudio(mutedGetter: () => boolean): void {
  isMuted = mutedGetter;
}

/** Crée (paresseusement) et réveille le contexte audio. À appeler sur un geste utilisateur. */
function ensureContext(): AudioContext | null {
  if (isMuted()) return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Réveille le contexte suite à un geste utilisateur (politique d'autoplay). */
export function unlockAudio(): void {
  ensureContext();
}

function playNote(c: AudioContext, out: GainNode, note: Note): void {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = note.type ?? "sine";
  osc.frequency.value = note.freq;

  const start = c.currentTime + note.at;
  const peak = note.gain ?? 0.6;
  // Enveloppe ADSR simplifiée (attaque rapide, déclin exponentiel).
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, start + note.dur);

  osc.connect(g);
  g.connect(out);
  osc.start(start);
  osc.stop(start + note.dur + 0.02);
}

function play(notes: Note[]): void {
  const c = ensureContext();
  if (!c || !master) return;
  for (const n of notes) playNote(c, master, n);
}

// ---- Voix de jeu -----------------------------------------------------------

/** Clic d'expérience : blip court et clair. */
export function sndClick(): void {
  play([{ freq: 620, at: 0, dur: 0.09, type: "triangle", gain: 0.45 }]);
}

/** Achat d'un générateur : deux notes ascendantes. */
export function sndBuy(): void {
  play([
    { freq: 440, at: 0, dur: 0.1, type: "sine", gain: 0.5 },
    { freq: 660, at: 0.06, dur: 0.12, type: "sine", gain: 0.5 },
  ]);
}

/** Achat d'une amélioration : tierce brillante. */
export function sndUpgrade(): void {
  play([
    { freq: 523.25, at: 0, dur: 0.14, type: "triangle", gain: 0.5 },
    { freq: 659.25, at: 0.04, dur: 0.16, type: "triangle", gain: 0.45 },
    { freq: 783.99, at: 0.08, dur: 0.18, type: "sine", gain: 0.4 },
  ]);
}

/** Accomplissement débloqué : petit arpège satisfaisant. */
export function sndAchievement(): void {
  play([
    { freq: 523.25, at: 0, dur: 0.16, type: "sine", gain: 0.5 },
    { freq: 659.25, at: 0.09, dur: 0.16, type: "sine", gain: 0.5 },
    { freq: 783.99, at: 0.18, dur: 0.22, type: "sine", gain: 0.5 },
  ]);
}

/** Prestige : accord scintillant et long (le seul moment « célébratoire »). */
export function sndPrestige(): void {
  play([
    { freq: 392.0, at: 0, dur: 0.7, type: "sine", gain: 0.4 },
    { freq: 523.25, at: 0.05, dur: 0.7, type: "sine", gain: 0.4 },
    { freq: 659.25, at: 0.1, dur: 0.7, type: "triangle", gain: 0.35 },
    { freq: 1046.5, at: 0.2, dur: 0.6, type: "sine", gain: 0.3 },
  ]);
}
