import {
  GraduationCap,
  Microscope,
  FlaskRound,
  Users,
  Building2,
  Landmark,
  Cpu,
  BrainCircuit,
} from "lucide";
import type { GeneratorDef } from "@/core/types";

/**
 * Les 8 générateurs, du plus modeste au plus puissant.
 * Coût géométrique ×1.15 de base ; les derniers paliers sont légèrement plus pentus
 * pour creuser le ressenti logarithmique en fin de partie.
 */
export const GENERATORS: readonly GeneratorDef[] = [
  {
    id: "intern",
    name: "Stagiaire",
    description: "Mène des manipulations basiques à la paillasse.",
    icon: GraduationCap,
    baseCost: 10,
    costGrowth: 1.12,
    baseProduction: 0.3,
  },
  {
    id: "phd",
    name: "Doctorant",
    description: "Conduit des expériences ciblées et rédige.",
    icon: Microscope,
    baseCost: 100,
    costGrowth: 1.12,
    baseProduction: 2.4,
  },
  {
    id: "researcher",
    name: "Chercheur",
    description: "Pilote des protocoles complets de recherche.",
    icon: FlaskRound,
    baseCost: 1_000,
    costGrowth: 1.12,
    baseProduction: 19,
  },
  {
    id: "team",
    name: "Équipe",
    description: "Une équipe pluridisciplinaire qui parallélise le travail.",
    icon: Users,
    baseCost: 10_000,
    costGrowth: 1.12,
    baseProduction: 150,
  },
  {
    id: "lab",
    name: "Laboratoire",
    description: "Une unité de recherche dédiée et équipée.",
    icon: Building2,
    baseCost: 100_000,
    costGrowth: 1.12,
    baseProduction: 1_200,
  },
  {
    id: "institute",
    name: "Institut",
    description: "Un institut coordonnant plusieurs laboratoires.",
    icon: Landmark,
    baseCost: 1_000_000,
    costGrowth: 1.13,
    baseProduction: 9_500,
  },
  {
    id: "supercomputer",
    name: "Superordinateur",
    description: "Simule et analyse à une échelle inhumaine.",
    icon: Cpu,
    baseCost: 10_000_000,
    costGrowth: 1.13,
    baseProduction: 76_000,
  },
  {
    id: "ai",
    name: "IA de Recherche",
    description: "Génère des hypothèses et des découvertes en continu.",
    icon: BrainCircuit,
    baseCost: 100_000_000,
    costGrowth: 1.14,
    baseProduction: 600_000,
  },
];

export const GENERATORS_BY_ID: ReadonlyMap<string, GeneratorDef> = new Map(
  GENERATORS.map((g) => [g.id, g]),
);
