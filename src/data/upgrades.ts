import {
  Zap,
  TrendingUp,
  Sparkles,
  Gauge,
  MousePointerClick,
  Network,
  Share2,
  Building2,
} from "lucide";
import type { UpgradeDef } from "@/core/types";

/**
 * Améliorations ponctuelles (one-shot) qui multiplient la production.
 * Calées pour apparaître à un rythme régulier sur la première run (~40 min) :
 * chacune casse un « mur doux » au moment où la progression ralentit.
 */
export const UPGRADES: readonly UpgradeDef[] = [
  {
    id: "better-pipettes",
    name: "Pipettes de précision",
    description: "Les Stagiaires produisent ×2.",
    icon: TrendingUp,
    cost: 200,
    effects: [{ kind: "generatorMult", generatorId: "intern", factor: 2 }],
    unlock: { kind: "generatorCount", generatorId: "intern", count: 10 },
  },
  {
    id: "ergonomic-mouse",
    name: "Souris ergonomique",
    description: "La valeur du clic est doublée.",
    icon: MousePointerClick,
    cost: 1_000,
    effects: [{ kind: "clickMult", factor: 2 }],
    unlock: { kind: "totalClicks", amount: 50 },
  },
  {
    id: "peer-review",
    name: "Comité de lecture",
    description: "Les Doctorants produisent ×2.",
    icon: TrendingUp,
    cost: 2_500,
    effects: [{ kind: "generatorMult", generatorId: "phd", factor: 2 }],
    unlock: { kind: "generatorCount", generatorId: "phd", count: 10 },
  },
  {
    id: "grant-funding",
    name: "Subvention de recherche",
    description: "Toute la production est multipliée par 1,5.",
    icon: Sparkles,
    cost: 25_000,
    effects: [{ kind: "globalMult", factor: 1.5 }],
    unlock: { kind: "totalRP", amount: 15_000 },
  },
  {
    id: "automation-pipeline",
    name: "Pipeline automatisé",
    description: "Les Chercheurs produisent ×3.",
    icon: Gauge,
    cost: 120_000,
    effects: [{ kind: "generatorMult", generatorId: "researcher", factor: 3 }],
    unlock: { kind: "generatorCount", generatorId: "researcher", count: 10 },
  },
  {
    id: "cluster",
    name: "Mise en réseau",
    description: "Les Équipes produisent ×2.",
    icon: Network,
    cost: 400_000,
    effects: [{ kind: "generatorMult", generatorId: "team", factor: 2 }],
    unlock: { kind: "generatorCount", generatorId: "team", count: 10 },
  },
  {
    id: "open-science",
    name: "Science ouverte",
    description: "Toute la production est multipliée par 2.",
    icon: Share2,
    cost: 1_500_000,
    effects: [{ kind: "globalMult", factor: 2 }],
    unlock: { kind: "totalRP", amount: 1_000_000 },
  },
  {
    id: "lab-grant",
    name: "Dotation de laboratoire",
    description: "Les Laboratoires produisent ×2.",
    icon: Building2,
    cost: 3_000_000,
    effects: [{ kind: "generatorMult", generatorId: "lab", factor: 2 }],
    unlock: { kind: "generatorCount", generatorId: "lab", count: 5 },
  },
  {
    id: "overclock",
    name: "Overclocking",
    description: "Les Superordinateurs produisent ×3.",
    icon: Zap,
    cost: 50_000_000,
    effects: [{ kind: "generatorMult", generatorId: "supercomputer", factor: 3 }],
    unlock: { kind: "generatorCount", generatorId: "supercomputer", count: 5 },
  },
];

export const UPGRADES_BY_ID: ReadonlyMap<string, UpgradeDef> = new Map(
  UPGRADES.map((u) => [u.id, u]),
);
