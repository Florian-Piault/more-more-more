import type { IconNode } from "lucide";

/** Identifiant Lucide (clé d'icône importée). */
export type LucideIcon = IconNode;

/**
 * Définition déclarative d'un générateur passif.
 * Le contenu vit dans `src/data/generators.ts` — le moteur ne connaît que cette forme.
 */
export interface GeneratorDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: LucideIcon;
  /** Coût du 1er exemplaire, en RP. */
  readonly baseCost: number;
  /** Facteur de coût géométrique (≈1.15). Les générateurs tardifs peuvent être plus pentus. */
  readonly costGrowth: number;
  /** RP/seconde produits par exemplaire (avant multiplicateurs). */
  readonly baseProduction: number;
}

/** Effet appliqué par une amélioration ou un accomplissement. */
export type Effect =
  | { readonly kind: "globalMult"; readonly factor: number }
  | { readonly kind: "generatorMult"; readonly generatorId: string; readonly factor: number }
  | { readonly kind: "clickMult"; readonly factor: number }
  | { readonly kind: "costReduction"; readonly generatorId: string; readonly factor: number };

/** Condition de déblocage / d'obtention, évaluée contre l'état. */
export type Condition =
  | { readonly kind: "totalRP"; readonly amount: number }
  | { readonly kind: "generatorCount"; readonly generatorId: string; readonly count: number }
  | { readonly kind: "totalClicks"; readonly amount: number }
  | { readonly kind: "prestigeCount"; readonly amount: number }
  | { readonly kind: "ownAllGenerators" }
  | { readonly kind: "metaPointsSpent"; readonly amount: number }
  | { readonly kind: "metaBranchComplete"; readonly branch: MetaBranch }
  /** Atteindre `rp` RP cumulés en moins de `ms` de temps de run actif. */
  | { readonly kind: "runUnder"; readonly rp: number; readonly ms: number };

export interface UpgradeDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: LucideIcon;
  readonly cost: number;
  readonly effects: readonly Effect[];
  /** L'amélioration apparaît quand cette condition est vraie. */
  readonly unlock: Condition;
}

export interface AchievementDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: LucideIcon;
  readonly condition: Condition;
  /** Effet unique optionnel ; sinon bonus global standard (+1% prod) appliqué par le moteur. */
  readonly specialEffect?: Effect;
  /** Si vrai : accomplissement purement cosmétique (aucun bonus, ni standard ni spécial). */
  readonly cosmetic?: boolean;
}

// ---- Méta-améliorations (arbre post-prestige) ------------------------------

export type MetaBranch = "production" | "click" | "automation";

/** Effet d'un nœud de l'arbre de prestige (agrégé par `core/meta.ts`). */
export type MetaEffect =
  /** Production globale ×factor^niveau (nœud répétable). */
  | { readonly kind: "prodMultPerLevel"; readonly factor: number }
  /** Production globale ×factor (nœud unique). */
  | { readonly kind: "prodMult"; readonly factor: number }
  /** Valeur du clic ×factor (unique). */
  | { readonly kind: "clickMult"; readonly factor: number }
  /** Valeur du clic ×factor^niveau (répétable). */
  | { readonly kind: "clickMultPerLevel"; readonly factor: number }
  /** Fixe la part de prod/s reversée au clic (on garde le max). */
  | { readonly kind: "clickShare"; readonly value: number }
  /** Fixe la base de doublement des paliers (on garde le max ; défaut 2). */
  | { readonly kind: "milestoneBase"; readonly value: number }
  /** Ajoute des clics automatiques par seconde (cumulatif). */
  | { readonly kind: "autoClick"; readonly perSec: number }
  /** Plafond de progression hors-ligne en heures (on garde le max). */
  | { readonly kind: "offlineCapHours"; readonly hours: number }
  /** Taux de progression hors-ligne 0–1 (on garde le max). */
  | { readonly kind: "offlineRate"; readonly rate: number };

export interface MetaUpgradeDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: LucideIcon;
  readonly branch: MetaBranch;
  /** Profondeur dans la branche (0 = racine), pour le placement en lignes. */
  readonly tier: number;
  /** Nœud parent à posséder (niveau ≥ requis) pour débloquer celui-ci. */
  readonly requires?: { readonly id: string; readonly level: number };
  /** Niveau max (1 = nœud unique). */
  readonly maxLevel: number;
  /** Coût du 1er niveau (en Percées). */
  readonly baseCost: number;
  /** Surcoût par niveau déjà acheté (pour les nœuds répétables). */
  readonly costStep: number;
  readonly effects: readonly MetaEffect[];
}

/** État sérialisable du jeu (ce qui part dans le localStorage / l'export base64). */
export interface GameState {
  rp: number;
  totalRP: number;
  totalClicks: number;
  /** Temps de run actif écoulé (ms), accumulé par le moteur, remis à 0 au prestige. */
  runMs: number;
  /** Quantité possédée par générateur (id → count). */
  generators: Record<string, number>;
  ownedUpgrades: Record<string, true>;
  unlockedAchievements: Record<string, true>;
  /** Cumul de Percées GAGNÉES (jamais perdu) — pilote le +2% passif. */
  breakthroughs: number;
  /** Solde de Percées À DÉPENSER dans l'arbre de méta-améliorations. */
  breakthroughPoints: number;
  /** Niveaux achetés par nœud de l'arbre (id → niveau). */
  metaUpgrades: Record<string, number>;
  /** Cumul de Percées dépensées (pour conditions d'accomplissement). */
  metaPointsSpent: number;
  prestigeCount: number;
  lastSaved: number;
  settings: Settings;
}

export interface Settings {
  muted: boolean;
  scientificNotation: boolean;
}
