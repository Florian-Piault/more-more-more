import {
  Award,
  Trophy,
  Medal,
  Star,
  Rocket,
  Layers,
  Gem,
  Flame,
  MousePointerClick,
  Infinity as InfinityIcon,
  Crown,
  Bot,
  Beaker,
  Target,
  TrendingUp,
  Timer,
} from "lucide";
import type { AchievementDef } from "@/core/types";

/**
 * Accomplissements.
 * - Par défaut : +1% production globale (appliqué par le moteur).
 * - `specialEffect` : remplace le bonus standard par un effet unique.
 * - `cosmetic: true` : aucun bonus (vitrine / défi).
 */
export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    id: "first-clicks",
    name: "Premiers pas",
    description: "Mener 100 expériences à la main.",
    icon: Award,
    condition: { kind: "totalClicks", amount: 100 },
  },
  {
    id: "first-thousand",
    name: "Millier",
    description: "Accumuler 1 000 RP au total.",
    icon: Medal,
    condition: { kind: "totalRP", amount: 1_000 },
  },
  {
    id: "first-million",
    name: "Million",
    description: "Accumuler 1 000 000 RP au total.",
    icon: Star,
    condition: { kind: "totalRP", amount: 1_000_000 },
  },
  {
    id: "first-milestone",
    name: "Premier palier",
    description: "Posséder 25 Stagiaires (production doublée).",
    icon: Layers,
    condition: { kind: "generatorCount", generatorId: "intern", count: 25 },
  },
  {
    id: "full-team",
    name: "Effectif complet",
    description: "Posséder 10 Chercheurs.",
    icon: Trophy,
    condition: { kind: "generatorCount", generatorId: "researcher", count: 10 },
  },
  {
    id: "ten-million",
    name: "Dix millions",
    description: "Accumuler 10 000 000 RP au total.",
    icon: Gem,
    condition: { kind: "totalRP", amount: 10_000_000 },
  },
  {
    id: "first-prestige",
    name: "Percée majeure",
    description: "Effectuer son premier prestige.",
    icon: Rocket,
    condition: { kind: "prestigeCount", amount: 1 },
    // Effet unique savoureux : +25% de production globale.
    specialEffect: { kind: "globalMult", factor: 1.25 },
  },

  // ---- Paliers de générateurs (avec bonus +1%) -----------------------------
  {
    id: "intern-army",
    name: "Armée de stagiaires",
    description: "Posséder 50 Stagiaires.",
    icon: Layers,
    condition: { kind: "generatorCount", generatorId: "intern", count: 50 },
  },
  {
    id: "phd-milestone",
    name: "Promotion de docteurs",
    description: "Posséder 25 Doctorants.",
    icon: Layers,
    condition: { kind: "generatorCount", generatorId: "phd", count: 25 },
  },
  {
    id: "full-roster",
    name: "Roster complet",
    description: "Posséder au moins un exemplaire de chaque générateur.",
    icon: Beaker,
    condition: { kind: "ownAllGenerators" },
    cosmetic: true,
  },

  // ---- Clic & cumul --------------------------------------------------------
  {
    id: "clicks-1k",
    name: "Pouce d'acier",
    description: "Mener 1 000 expériences à la main.",
    icon: MousePointerClick,
    condition: { kind: "totalClicks", amount: 1_000 },
  },
  {
    id: "clicks-10k",
    name: "Tendinite assumée",
    description: "Mener 10 000 expériences à la main.",
    icon: Flame,
    condition: { kind: "totalClicks", amount: 10_000 },
  },
  {
    id: "billion",
    name: "Milliard",
    description: "Accumuler 1 000 000 000 RP au total.",
    icon: TrendingUp,
    condition: { kind: "totalRP", amount: 1_000_000_000 },
  },

  // ---- Prestige & méta (avec bonus) ----------------------------------------
  {
    id: "prestige-5",
    name: "Habitué des percées",
    description: "Effectuer 5 prestiges.",
    icon: Star,
    condition: { kind: "prestigeCount", amount: 5 },
  },
  {
    id: "prestige-10",
    name: "Vétéran",
    description: "Effectuer 10 prestiges.",
    icon: Crown,
    condition: { kind: "prestigeCount", amount: 10 },
  },
  {
    id: "meta-invest",
    name: "Investisseur",
    description: "Dépenser 10 Percées dans l'arbre.",
    icon: Gem,
    condition: { kind: "metaPointsSpent", amount: 10 },
  },
  {
    id: "branch-production",
    name: "Maître de production",
    description: "Compléter la branche Production de l'arbre.",
    icon: Trophy,
    condition: { kind: "metaBranchComplete", branch: "production" },
    // Effet unique : +50% production globale.
    specialEffect: { kind: "globalMult", factor: 1.5 },
  },

  // ---- Défi chronométré (avec bonus) ---------------------------------------
  {
    id: "speedrun",
    name: "Course contre la montre",
    description: "Atteindre 10 000 000 RP en moins de 20 minutes de run.",
    icon: Timer,
    // 20 min de temps de run actif (hors-ligne non compté). Hors de portée
    // d'une première run : récompense les runs optimisées avec l'arbre méta.
    condition: { kind: "runUnder", rp: 10_000_000, ms: 20 * 60 * 1000 },
    // Récompense le jeu actif : valeur du clic ×2.
    specialEffect: { kind: "clickMult", factor: 2 },
  },

  // ---- Défis & cosmétiques (sans bonus) ------------------------------------
  {
    id: "reach-ai",
    name: "Singularité",
    description: "Mettre en service la première IA de Recherche.",
    icon: Bot,
    condition: { kind: "generatorCount", generatorId: "ai", count: 1 },
    cosmetic: true,
  },
  {
    id: "branch-automation",
    name: "Tout automatique",
    description: "Compléter la branche Automatisation de l'arbre.",
    icon: Bot,
    condition: { kind: "metaBranchComplete", branch: "automation" },
    cosmetic: true,
  },
  {
    id: "meta-master",
    name: "Érudition totale",
    description: "Dépenser 50 Percées dans l'arbre.",
    icon: InfinityIcon,
    condition: { kind: "metaPointsSpent", amount: 50 },
    cosmetic: true,
  },
  {
    id: "click-branch",
    name: "Doigté parfait",
    description: "Compléter la branche Clic de l'arbre.",
    icon: Target,
    condition: { kind: "metaBranchComplete", branch: "click" },
    cosmetic: true,
  },
];

export const ACHIEVEMENTS_BY_ID: ReadonlyMap<string, AchievementDef> = new Map(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);
