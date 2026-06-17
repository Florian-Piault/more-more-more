import { Banknote, BrainCircuit, FlaskRound } from "lucide";
import type { ResearchDef } from "@/core/types";

/**
 * Recherches continues : répétables, sans plafond, à coût croissant rapide.
 * Elles absorbent le surplus de fin de run et lissent le mur une fois les
 * améliorations uniques épuisées.
 */
export const RESEARCH: readonly ResearchDef[] = [
  {
    id: "r_grants",
    name: "Subventions perpétuelles",
    description: "+5 % de production globale par niveau (composé).",
    icon: Banknote,
    baseCost: 2_000_000,
    costGrowth: 1.8,
    effect: { kind: "globalMult", factor: 1.05 },
    unlock: { kind: "totalRP", amount: 2_000_000 },
  },
  {
    id: "r_neural",
    name: "Réseau neuronal",
    description: "+12 % à la valeur du clic par niveau (composé).",
    icon: BrainCircuit,
    baseCost: 1_000_000,
    costGrowth: 1.7,
    effect: { kind: "clickMult", factor: 1.12 },
    unlock: { kind: "totalClicks", amount: 200 },
  },
  {
    id: "r_method",
    name: "Méthodologie avancée",
    description: "+8 % de production globale par niveau (composé).",
    icon: FlaskRound,
    baseCost: 100_000_000,
    costGrowth: 2.0,
    effect: { kind: "globalMult", factor: 1.08 },
    unlock: { kind: "prestigeCount", amount: 1 },
  },
];

export const RESEARCH_BY_ID: ReadonlyMap<string, ResearchDef> = new Map(
  RESEARCH.map((r) => [r.id, r]),
);
