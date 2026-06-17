const SUFFIXES = [
  "",
  "K",
  "M",
  "B",
  "T",
  "Qa",
  "Qi",
  "Sx",
  "Sp",
  "Oc",
  "No",
  "Dc",
];

/**
 * Formate un nombre pour l'affichage.
 * @param scientific bascule en notation scientifique (clin d'œil « labo »).
 */
export function formatNumber(value: number, scientific = false): string {
  if (!Number.isFinite(value)) return "∞";
  if (value < 1000) {
    // Sous 1000 : au plus une décimale, sans zéro inutile.
    return value % 1 === 0 ? String(value) : value.toFixed(1);
  }

  if (scientific) {
    return value.toExponential(2).replace("e+", "e");
  }

  const tier = Math.floor(Math.log10(value) / 3);
  if (tier >= SUFFIXES.length) {
    return value.toExponential(2).replace("e+", "e");
  }
  const scaled = value / Math.pow(10, tier * 3);
  return `${scaled.toFixed(2)}${SUFFIXES[tier]}`;
}

/** Chrono compact (M:SS ou H:MM:SS) pour le temps de run. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Durée lisible en français (pour le bilan hors-ligne). */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} h`);
  if (m > 0) parts.push(`${m} min`);
  if (h === 0 && s > 0) parts.push(`${s} s`);
  return parts.join(" ") || "quelques instants";
}
