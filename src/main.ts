import "@/styles/style.css";
import type { GameState } from "@/core/types";
import { createInitialState } from "@/core/state";
import { Engine } from "@/core/engine";
import { applyClick, buyGenerator, buyUpgrade } from "@/core/economy";
import { performPrestige, pendingBreakthroughs } from "@/core/prestige";
import { buyMetaUpgrade } from "@/core/meta";
import {
  applyOfflineProgress,
  clearSave,
  exportSave,
  importSave,
  loadState,
  saveState,
} from "@/core/save";
import { formatNumber, formatDuration } from "@/ui/format";
import { floatText, toast } from "@/ui/juice";
import { Renderer } from "@/ui/render";
import {
  initAudio,
  unlockAudio,
  sndClick,
  sndBuy,
  sndUpgrade,
  sndAchievement,
  sndPrestige,
} from "@/ui/audio";
import { Lightbulb, Clock } from "lucide";

const appEl = document.getElementById("app");
if (!appEl) throw new Error("Élément #app introuvable");

// --- Chargement de l'état + progression hors-ligne --------------------------
const state: GameState = loadState() ?? createInitialState();
const offline = applyOfflineProgress(state, Date.now());

// L'audio lit en continu le réglage muet courant.
initAudio(() => state.settings.muted);

// --- Rendu ------------------------------------------------------------------
const renderer = new Renderer(appEl, {
  onClick: (x, y) => {
    const gain = applyClick(state);
    floatText(`+${formatNumber(gain, state.settings.scientificNotation)}`, x, y);
    sndClick();
  },
  onBuyGenerator: (id) => {
    if (buyGenerator(state, id)) sndBuy();
  },
  onBuyUpgrade: (id) => {
    if (buyUpgrade(state, id)) sndUpgrade();
  },
  onPrestige: () => {
    const pending = pendingBreakthroughs(state);
    if (pending < 1) return;
    if (!confirm(`Publier vos travaux et recommencer pour +${pending} percée(s) ?`)) return;
    const gained = performPrestige(state);
    engine.checkAchievements();
    sndPrestige();
    toast({
      title: "Travaux publiés",
      body: `+${formatNumber(gained)} percée(s). Production boostée en permanence.`,
      iconNode: Lightbulb,
      kind: "achievement",
      duration: 5000,
    });
  },
  onToggleMute: () => {
    state.settings.muted = !state.settings.muted;
    renderer.syncSettings(state);
    if (!state.settings.muted) {
      unlockAudio(); // réveille le contexte audio sur ce geste, puis confirme par un son
      sndBuy();
    }
  },
  onToggleNotation: () => {
    state.settings.scientificNotation = !state.settings.scientificNotation;
    renderer.syncSettings(state);
  },
  onExport: () => {
    const code = exportSave(state);
    navigator.clipboard?.writeText(code).then(
      () => toast({ title: "Sauvegarde copiée", body: "Code copié dans le presse-papiers." }),
      () => prompt("Copiez votre sauvegarde :", code),
    );
  },
  onImport: () => {
    const code = prompt("Collez votre code de sauvegarde :");
    if (!code) return;
    const imported = importSave(code);
    if (!imported) {
      toast({ title: "Import échoué", body: "Code de sauvegarde invalide." });
      return;
    }
    Object.assign(state, imported);
    renderer.build(state);
    renderer.syncSettings(state);
    toast({ title: "Sauvegarde importée" });
  },
  onBuyMeta: (id) => {
    if (buyMetaUpgrade(state, id)) {
      engine.checkAchievements();
      sndUpgrade();
    }
  },
  onReset: () => {
    const ok = confirm(
      "Effacer définitivement votre partie et tout recommencer de zéro ?\n" +
        "Cette action est irréversible (générateurs, améliorations, percées et accomplissements seront perdus).",
    );
    if (!ok) return;
    clearSave();
    Object.assign(state, createInitialState());
    renderer.build(state);
    renderer.syncSettings(state);
    engine.checkAchievements();
    toast({ title: "Nouvelle partie", body: "Tout a été réinitialisé. Bon laboratoire !" });
  },
});

renderer.build(state);
renderer.syncSettings(state);

// --- Moteur -----------------------------------------------------------------
const engine = new Engine(state, {
  onTick: (s) => renderer.update(s),
  onAchievement: (def) => {
    sndAchievement();
    toast({
      title: "Accomplissement débloqué",
      body: `${def.name} — ${def.description}`,
      iconNode: def.icon,
      kind: "achievement",
    });
  },
});
engine.start();

// --- Bilan hors-ligne -------------------------------------------------------
if (offline) {
  toast({
    title: "De retour au laboratoire",
    body: `Absence de ${formatDuration(offline.durationMs)} : +${formatNumber(offline.gained)} RP (50 %).`,
    iconNode: Clock,
    kind: "offline",
    duration: 6000,
  });
}

// --- Sauvegarde à la fermeture ---------------------------------------------
window.addEventListener("beforeunload", () => saveState(state, Date.now()));
