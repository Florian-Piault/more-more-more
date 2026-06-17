import {
  FlaskConical,
  Volume2,
  VolumeX,
  Sigma,
  Download,
  Upload,
  Lightbulb,
  Trash2,
  Network,
  X,
} from "lucide";
import type { GameState, MetaBranch } from "@/core/types";
import { GENERATORS } from "@/data/generators";
import { UPGRADES } from "@/data/upgrades";
import { RESEARCH } from "@/data/research";
import { ACHIEVEMENTS } from "@/data/achievements";
import { META_UPGRADES } from "@/data/metaUpgrades";
import {
  bulkCost,
  clickValue,
  generatorProduction,
  maxAffordable,
  MILESTONE_STEP,
  milestoneMultiplier,
  researchCost,
  totalProduction,
  untilNextMilestone,
} from "@/core/economy";
import { generatorCount, evalCondition, metaLevel } from "@/core/state";
import { metaCost, metaUnlocked, canBuyMeta, metaMilestoneBase } from "@/core/meta";
import { canPrestige, pendingBreakthroughs, PRESTIGE_THRESHOLD } from "@/core/prestige";
import { formatNumber, formatClock, formatDuration } from "@/ui/format";
import { icon, pop, attachTooltip } from "@/ui/juice";

export interface RenderCallbacks {
  onClick: (clientX: number, clientY: number) => void;
  onBuyGenerator: (id: string, qty: number | "max") => void;
  onBuyUpgrade: (id: string) => void;
  onBuyResearch: (id: string) => void;
  onPrestige: () => void;
  onToggleMute: () => void;
  onToggleNotation: () => void;
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
  onBuyMeta: (id: string) => void;
}

/** Références aux nœuds dynamiques d'une ligne de générateur. */
interface GenRow {
  root: HTMLElement;
  count: HTMLElement;
  cost: HTMLElement;
  prod: HTMLElement;
  milestone: HTMLElement;
  barFill: HTMLElement;
  revealed: boolean;
}

/** Mode d'achat groupé des générateurs. */
type BuyMode = 1 | 10 | "max";

export class Renderer {
  private rpEl!: HTMLElement;
  private rpsEl!: HTMLElement;
  private runTimeEl!: HTMLElement;
  private boostEl!: HTMLElement;
  private clickHintEl!: HTMLElement;
  private muteBtn!: HTMLButtonElement;
  private notationBtn!: HTMLButtonElement;
  private clickBtn!: HTMLButtonElement;

  private genRows = new Map<string, GenRow>();
  private buyMode: BuyMode = 1;
  private buyModeBtns = new Map<BuyMode, HTMLButtonElement>();
  private upgradeList!: HTMLElement;
  private upgradeNodes = new Map<string, HTMLElement>();
  private ownedUpgradeList!: HTMLElement;
  private ownedUpgradeLabel!: HTMLElement;
  private ownedUpgradeNodes = new Map<string, HTMLElement>();
  private prestigePanel!: HTMLElement;
  private prestigeInfo!: HTMLElement;
  private prestigeBtn!: HTMLButtonElement;
  private achievementGrid!: HTMLElement;
  private achievementNodes = new Map<string, HTMLElement>();

  // Arbre de méta-améliorations (modale).
  private metaOpenBtn!: HTMLButtonElement;
  private metaModal!: HTMLElement;
  private metaPointsLabel!: HTMLElement;
  private metaNodes = new Map<string, { root: HTMLElement; level: HTMLElement; cost: HTMLElement }>();
  private metaOpen = false;
  private researchPanel!: HTMLElement;
  private researchList!: HTMLElement;
  private researchNodes = new Map<
    string,
    { root: HTMLButtonElement; desc: HTMLElement; cost: HTMLElement }
  >();
  private statValues = new Map<string, HTMLElement>();

  /** Valeur de RP affichée (tweenée vers la valeur réelle pour la fluidité). */
  private displayedRP = 0;

  constructor(
    private readonly root: HTMLElement,
    private readonly cb: RenderCallbacks,
  ) {}

  build(state: GameState): void {
    this.displayedRP = state.rp;
    // Réinitialise les références (DOM reconstruit, ex. après import/reset).
    this.genRows.clear();
    this.upgradeNodes.clear();
    this.ownedUpgradeNodes.clear();
    this.achievementNodes.clear();
    this.metaNodes.clear();
    this.researchNodes.clear();
    this.statValues.clear();
    this.metaOpen = false;
    this.root.innerHTML = "";
    this.root.className = "layout";
    this.root.appendChild(this.buildHeader(state));
    this.root.appendChild(this.buildClickColumn());
    this.root.appendChild(this.buildGeneratorsColumn());
    this.root.appendChild(this.buildRightColumn());
    this.root.appendChild(this.buildMetaModal());
  }

  // ---- En-tête -------------------------------------------------------------

  private buildHeader(state: GameState): HTMLElement {
    const header = document.createElement("header");
    header.className = "topbar";

    const title = document.createElement("h1");
    title.className = "topbar__title";
    title.appendChild(icon(FlaskConical, 22));
    const titleText = document.createElement("span");
    titleText.textContent = "More More More";
    title.appendChild(titleText);
    header.appendChild(title);

    const actions = document.createElement("div");
    actions.className = "topbar__actions";

    this.muteBtn = iconButton(state.settings.muted ? VolumeX : Volume2, "Son");
    this.muteBtn.addEventListener("click", () => this.cb.onToggleMute());

    this.notationBtn = iconButton(Sigma, "Notation scientifique");
    this.notationBtn.classList.toggle("is-active", state.settings.scientificNotation);
    this.notationBtn.addEventListener("click", () => this.cb.onToggleNotation());

    const exportBtn = iconButton(Download, "Exporter la sauvegarde");
    exportBtn.addEventListener("click", () => this.cb.onExport());

    const importBtn = iconButton(Upload, "Importer une sauvegarde");
    importBtn.addEventListener("click", () => this.cb.onImport());

    const resetBtn = iconButton(Trash2, "Effacer et recommencer");
    resetBtn.classList.add("icon-btn--danger");
    resetBtn.addEventListener("click", () => this.cb.onReset());

    actions.append(this.muteBtn, this.notationBtn, exportBtn, importBtn, resetBtn);
    header.appendChild(actions);
    return header;
  }

  // ---- Colonne de clic -----------------------------------------------------

  private buildClickColumn(): HTMLElement {
    const col = document.createElement("section");
    col.className = "col col--click panel";

    const stats = document.createElement("div");
    stats.className = "stats";
    this.rpEl = document.createElement("div");
    this.rpEl.className = "stats__rp";
    const rpLabel = document.createElement("div");
    rpLabel.className = "stats__label";
    rpLabel.textContent = "Points de Recherche";
    this.rpsEl = document.createElement("div");
    this.rpsEl.className = "stats__rps";
    this.runTimeEl = document.createElement("div");
    this.runTimeEl.className = "stats__runtime";
    attachTooltip(this.runTimeEl, {
      title: "Temps de run",
      body: "Temps de jeu actif depuis le dernier prestige (le hors-ligne ne compte pas).",
    });
    this.boostEl = document.createElement("div");
    this.boostEl.className = "stats__boost";
    stats.append(rpLabel, this.rpEl, this.rpsEl, this.runTimeEl, this.boostEl);

    this.clickBtn = document.createElement("button");
    this.clickBtn.className = "flask-btn";
    this.clickBtn.setAttribute("aria-label", "Mener une expérience");
    this.clickBtn.appendChild(icon(FlaskConical, 96));
    this.clickBtn.addEventListener("click", (e) => {
      pop(this.clickBtn);
      this.cb.onClick(e.clientX, e.clientY);
    });

    this.clickHintEl = document.createElement("div");
    this.clickHintEl.className = "click-hint";

    col.append(stats, this.clickBtn, this.clickHintEl);
    return col;
  }

  // ---- Colonne générateurs -------------------------------------------------

  private buildGeneratorsColumn(): HTMLElement {
    const col = document.createElement("section");
    col.className = "col col--generators panel";
    const head = document.createElement("div");
    head.className = "panel__head";
    const h = document.createElement("h2");
    h.className = "panel__title";
    h.textContent = "Générateurs";
    head.appendChild(h);
    head.appendChild(this.buildBuyModeSelector());
    col.appendChild(head);

    for (const def of GENERATORS) {
      const row = document.createElement("button");
      row.className = "gen";
      row.appendChild(icon(def.icon, 28));

      const info = document.createElement("div");
      info.className = "gen__info";
      const name = document.createElement("div");
      name.className = "gen__name";
      name.textContent = def.name;
      const prod = document.createElement("div");
      prod.className = "gen__prod";
      const milestone = document.createElement("div");
      milestone.className = "gen__milestone";
      const bar = document.createElement("div");
      bar.className = "gen__bar";
      const barFill = document.createElement("div");
      barFill.className = "gen__bar-fill";
      bar.appendChild(barFill);
      info.append(name, prod, milestone, bar);

      const right = document.createElement("div");
      right.className = "gen__right";
      const count = document.createElement("div");
      count.className = "gen__count";
      const cost = document.createElement("div");
      cost.className = "gen__cost";
      right.append(count, cost);

      row.append(info, right);
      row.addEventListener("click", () => {
        this.cb.onBuyGenerator(def.id, this.buyMode);
        pop(row);
      });

      col.appendChild(row);
      this.genRows.set(def.id, { root: row, count, cost, prod, milestone, barFill, revealed: false });
    }
    return col;
  }

  /** Boutons ×1 / ×10 / Max pilotant la quantité d'achat des générateurs. */
  private buildBuyModeSelector(): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "buy-mode";
    this.buyModeBtns.clear();
    const modes: { mode: BuyMode; label: string }[] = [
      { mode: 1, label: "×1" },
      { mode: 10, label: "×10" },
      { mode: "max", label: "Max" },
    ];
    for (const { mode, label } of modes) {
      const btn = document.createElement("button");
      btn.className = "buy-mode__btn";
      btn.textContent = label;
      btn.classList.toggle("is-active", mode === this.buyMode);
      btn.addEventListener("click", () => {
        this.buyMode = mode;
        for (const [m, b] of this.buyModeBtns) b.classList.toggle("is-active", m === mode);
      });
      this.buyModeBtns.set(mode, btn);
      wrap.appendChild(btn);
    }
    return wrap;
  }

  // ---- Colonne droite : améliorations + prestige + accomplissements --------

  private buildRightColumn(): HTMLElement {
    const col = document.createElement("section");
    col.className = "col col--right";

    // Prestige
    this.prestigePanel = document.createElement("div");
    this.prestigePanel.className = "panel prestige";
    const pTitle = document.createElement("h2");
    pTitle.className = "panel__title";
    pTitle.appendChild(icon(Lightbulb, 18));
    const pTitleText = document.createElement("span");
    pTitleText.textContent = "Percées";
    pTitle.appendChild(pTitleText);
    this.prestigeInfo = document.createElement("p");
    this.prestigeInfo.className = "prestige__info";
    this.prestigeBtn = document.createElement("button");
    this.prestigeBtn.className = "prestige__btn";
    this.prestigeBtn.textContent = "Publier (prestige)";
    this.prestigeBtn.addEventListener("click", () => this.cb.onPrestige());

    this.metaOpenBtn = document.createElement("button");
    this.metaOpenBtn.className = "prestige__tree-btn";
    this.metaOpenBtn.appendChild(icon(Network, 16));
    const treeLabel = document.createElement("span");
    treeLabel.textContent = "Arbre de recherche";
    this.metaOpenBtn.appendChild(treeLabel);
    this.metaOpenBtn.addEventListener("click", () => this.openMeta());

    this.prestigePanel.append(pTitle, this.prestigeInfo, this.prestigeBtn, this.metaOpenBtn);
    col.appendChild(this.prestigePanel);

    // Améliorations
    const upPanel = document.createElement("div");
    upPanel.className = "panel";
    const upTitle = document.createElement("h2");
    upTitle.className = "panel__title";
    upTitle.textContent = "Améliorations";
    this.upgradeList = document.createElement("div");
    this.upgradeList.className = "upgrades";

    // Sous-bloc des améliorations déjà acquises (badges compacts).
    this.ownedUpgradeLabel = document.createElement("div");
    this.ownedUpgradeLabel.className = "upgrades__owned-label";
    this.ownedUpgradeLabel.textContent = "Acquises";
    this.ownedUpgradeLabel.classList.add("is-hidden");
    this.ownedUpgradeList = document.createElement("div");
    this.ownedUpgradeList.className = "upgrades-owned";

    upPanel.append(upTitle, this.upgradeList, this.ownedUpgradeLabel, this.ownedUpgradeList);
    col.appendChild(upPanel);

    // Recherche continue (répétable). Masquée tant qu'aucune n'est débloquée.
    this.researchPanel = document.createElement("div");
    this.researchPanel.className = "panel is-hidden";
    const rTitle = document.createElement("h2");
    rTitle.className = "panel__title";
    rTitle.textContent = "Recherche continue";
    this.researchList = document.createElement("div");
    this.researchList.className = "upgrades";
    this.researchPanel.append(rTitle, this.researchList);
    col.appendChild(this.researchPanel);

    // Accomplissements
    const achPanel = document.createElement("div");
    achPanel.className = "panel";
    const achTitle = document.createElement("h2");
    achTitle.className = "panel__title";
    achTitle.textContent = "Accomplissements";
    this.achievementGrid = document.createElement("div");
    this.achievementGrid.className = "achievements";
    for (const ach of ACHIEVEMENTS) {
      const cell = document.createElement("div");
      cell.className = "ach is-locked";
      cell.appendChild(icon(ach.icon, 20));
      // Tooltip : titre + description, avec mention « verrouillé » tant qu'il ne l'est pas.
      attachTooltip(cell, () => ({
        title: ach.name,
        body: this.achievementNodes.get(ach.id)?.classList.contains("is-locked")
          ? `${ach.description} (verrouillé)`
          : ach.description,
      }));
      this.achievementGrid.appendChild(cell);
      this.achievementNodes.set(ach.id, cell);
    }
    achPanel.append(achTitle, this.achievementGrid);
    col.appendChild(achPanel);

    // Statistiques
    col.appendChild(this.buildStatsPanel());

    return col;
  }

  /** Panneau récapitulatif des statistiques (valeurs mises à jour par updateStats). */
  private buildStatsPanel(): HTMLElement {
    const panel = document.createElement("div");
    panel.className = "panel";
    const title = document.createElement("h2");
    title.className = "panel__title";
    title.textContent = "Statistiques";
    const grid = document.createElement("div");
    grid.className = "stats-grid";
    const rows = [
      "Production/s",
      "Record prod/s",
      "RP cette run",
      "RP cumulés (à vie)",
      "Clics (à vie)",
      "Percées gagnées",
      "Prestiges",
      "Temps de run",
      "Temps de jeu total",
    ];
    for (const label of rows) {
      const row = document.createElement("div");
      row.className = "stats-grid__row";
      const k = document.createElement("span");
      k.className = "stats-grid__key";
      k.textContent = label;
      const v = document.createElement("span");
      v.className = "stats-grid__val";
      row.append(k, v);
      grid.appendChild(row);
      this.statValues.set(label, v);
    }
    panel.append(title, grid);
    return panel;
  }

  // ---- Modale : arbre de méta-améliorations --------------------------------

  private buildMetaModal(): HTMLElement {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay is-hidden";
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.closeMeta();
    });

    const modal = document.createElement("div");
    modal.className = "modal";

    const header = document.createElement("div");
    header.className = "modal__header";
    const h = document.createElement("h2");
    h.className = "modal__title";
    h.appendChild(icon(Network, 20));
    const hText = document.createElement("span");
    hText.textContent = "Arbre de recherche";
    h.appendChild(hText);
    this.metaPointsLabel = document.createElement("div");
    this.metaPointsLabel.className = "modal__points";
    const closeBtn = document.createElement("button");
    closeBtn.className = "icon-btn";
    closeBtn.setAttribute("aria-label", "Fermer");
    closeBtn.appendChild(icon(X, 18));
    closeBtn.addEventListener("click", () => this.closeMeta());
    header.append(h, this.metaPointsLabel, closeBtn);

    const branches = document.createElement("div");
    branches.className = "meta-branches";
    const branchDefs: { key: MetaBranch; label: string }[] = [
      { key: "production", label: "Production" },
      { key: "click", label: "Clic" },
      { key: "automation", label: "Automatisation" },
    ];
    for (const b of branchDefs) {
      const colEl = document.createElement("div");
      colEl.className = "meta-branch";
      const title = document.createElement("div");
      title.className = "meta-branch__title";
      title.textContent = b.label;
      colEl.appendChild(title);
      for (const def of META_UPGRADES.filter((m) => m.branch === b.key).sort((a, c) => a.tier - c.tier)) {
        const node = document.createElement("button");
        node.className = "meta-node";
        node.appendChild(icon(def.icon, 22));
        const info = document.createElement("div");
        info.className = "meta-node__info";
        const name = document.createElement("div");
        name.className = "meta-node__name";
        name.textContent = def.name;
        const level = document.createElement("div");
        level.className = "meta-node__level";
        const cost = document.createElement("div");
        cost.className = "meta-node__cost";
        info.append(name, level, cost);
        node.appendChild(info);
        attachTooltip(node, { title: def.name, body: def.description });
        node.addEventListener("click", () => this.cb.onBuyMeta(def.id));
        colEl.appendChild(node);
        this.metaNodes.set(def.id, { root: node, level, cost });
      }
      branches.appendChild(colEl);
    }

    modal.append(header, branches);
    overlay.appendChild(modal);
    this.metaModal = overlay;
    return overlay;
  }

  private openMeta(): void {
    this.metaOpen = true;
    this.metaModal.classList.remove("is-hidden");
  }

  private closeMeta(): void {
    this.metaOpen = false;
    this.metaModal.classList.add("is-hidden");
  }

  private updateMeta(state: GameState, sci: boolean): void {
    if (!this.metaOpen) return;
    this.metaPointsLabel.textContent = `${formatNumber(state.breakthroughPoints, sci)} Percées`;
    for (const def of META_UPGRADES) {
      const refs = this.metaNodes.get(def.id);
      if (!refs) continue;
      const lvl = metaLevel(state, def.id);
      const maxed = lvl >= def.maxLevel;
      const unlocked = metaUnlocked(state, def);

      refs.level.textContent =
        def.maxLevel > 1 ? `Niveau ${lvl} / ${def.maxLevel}` : lvl > 0 ? "Acquis" : "";
      refs.cost.textContent = maxed
        ? "—"
        : !unlocked
          ? "verrouillé"
          : `${formatNumber(metaCost(state, def), sci)} Percées`;

      refs.root.classList.toggle("is-locked", !unlocked);
      refs.root.classList.toggle("is-owned", lvl > 0);
      refs.root.classList.toggle("is-maxed", maxed);
      refs.root.classList.toggle("is-affordable", canBuyMeta(state, def));
      refs.root.toggleAttribute("disabled", !canBuyMeta(state, def));
    }
  }

  /** Resynchronise les boutons de réglages (icône son, état notation). */
  syncSettings(state: GameState): void {
    this.muteBtn.replaceChildren(icon(state.settings.muted ? VolumeX : Volume2, 18));
    this.notationBtn.classList.toggle("is-active", state.settings.scientificNotation);
  }

  // ---- Mise à jour par tick ------------------------------------------------

  update(state: GameState): void {
    const sci = state.settings.scientificNotation;

    // Tween de l'affichage RP (approche douce vers la valeur réelle).
    this.displayedRP += (state.rp - this.displayedRP) * 0.25;
    if (Math.abs(state.rp - this.displayedRP) < 0.5) this.displayedRP = state.rp;
    this.rpEl.textContent = formatNumber(this.displayedRP, sci);
    this.rpsEl.textContent = `${formatNumber(totalProduction(state), sci)} / s`;
    this.clickHintEl.textContent = `+${formatNumber(clickValue(state), sci)} par expérience`;
    this.runTimeEl.textContent = formatClock(state.runMs);
    // Indicateur de boost « Eurêka » actif.
    if (state.boostSecondsLeft > 0) {
      this.boostEl.textContent = `Frénésie ×${formatNumber(state.boostMult, sci)} · ${Math.ceil(state.boostSecondsLeft)} s`;
      this.boostEl.classList.add("is-active");
    } else {
      this.boostEl.textContent = "";
      this.boostEl.classList.remove("is-active");
    }

    this.updateGenerators(state, sci);
    this.updateUpgrades(state, sci);
    this.updateResearch(state, sci);
    this.updatePrestige(state, sci);
    this.updateAchievements(state);
    this.updateMeta(state, sci);
    this.updateStats(state, sci);
  }

  private updateStats(state: GameState, sci: boolean): void {
    const set = (k: string, v: string) => {
      const el = this.statValues.get(k);
      if (el) el.textContent = v;
    };
    set("Production/s", `${formatNumber(totalProduction(state), sci)} / s`);
    set("Record prod/s", `${formatNumber(state.bestRps, sci)} / s`);
    set("RP cette run", formatNumber(state.totalRP, sci));
    set("RP cumulés (à vie)", formatNumber(state.lifetimeRP, sci));
    set("Clics (à vie)", formatNumber(state.lifetimeClicks, sci));
    set("Percées gagnées", formatNumber(state.breakthroughs, sci));
    set("Prestiges", formatNumber(state.prestigeCount, sci));
    set("Temps de run", formatClock(state.runMs));
    set("Temps de jeu total", formatDuration(state.totalPlayMs) || "—");
  }

  private updateGenerators(state: GameState, sci: boolean): void {
    let prevUnlocked = true;
    for (const def of GENERATORS) {
      const row = this.genRows.get(def.id)!;
      const owned = generatorCount(state, def.id);
      // Quantité visée selon le mode (Max ≥ 1 pour pouvoir afficher un coût).
      const maxQty = maxAffordable(state, def);
      const qty = this.buyMode === "max" ? Math.max(1, maxQty) : this.buyMode;
      const cost = bulkCost(state, def, qty);
      // Révélation progressive : visible si déjà possédé, ou si le précédent est
      // débloqué et qu'on atteint ≥ 40 % du coût d'un exemplaire.
      const unitCost = bulkCost(state, def, 1);
      const reachable = prevUnlocked && (owned > 0 || state.totalRP >= unitCost * 0.4);
      if (reachable && !row.revealed) {
        row.revealed = true;
        row.root.classList.add("is-revealed");
      }
      row.root.classList.toggle("is-hidden", !row.revealed);

      row.count.textContent = String(owned);
      const qtyLabel = this.buyMode === 1 ? "" : `${qty}× · `;
      row.cost.textContent = `${qtyLabel}${formatNumber(cost, sci)}`;
      row.prod.textContent = `${formatNumber(generatorProduction(state, def), sci)} / s`;

      // Palier : multiplicateur actuel + compte à rebours + barre de progression.
      if (owned > 0) {
        const base = metaMilestoneBase(state);
        const mult = milestoneMultiplier(owned, base);
        const left = untilNextMilestone(owned);
        const multLabel = mult > 1 ? `Palier ×${formatNumber(mult, sci)} · ` : "";
        row.milestone.textContent = `${multLabel}×${base} dans ${left}`;
        row.barFill.style.width = `${((MILESTONE_STEP - left) / MILESTONE_STEP) * 100}%`;
      } else {
        row.milestone.textContent = "";
        row.barFill.style.width = "0%";
      }
      // En mode Max non abordable, qty=1 mais maxQty=0 → on désactive.
      const affordable = this.buyMode === "max" ? maxQty >= 1 : state.rp >= cost;
      row.root.toggleAttribute("disabled", !affordable);
      row.root.classList.toggle("is-affordable", affordable && row.revealed);

      prevUnlocked = owned > 0;
    }
  }

  private updateUpgrades(state: GameState, sci: boolean): void {
    for (const up of UPGRADES) {
      if (state.ownedUpgrades[up.id]) {
        // Retire la carte achetable et crée (une fois) le badge « acquise ».
        this.upgradeNodes.get(up.id)?.remove();
        this.upgradeNodes.delete(up.id);
        if (!this.ownedUpgradeNodes.has(up.id)) {
          const badge = document.createElement("div");
          badge.className = "owned-badge";
          badge.appendChild(icon(up.icon, 18));
          attachTooltip(badge, { title: up.name, body: up.description });
          this.ownedUpgradeList.appendChild(badge);
          this.ownedUpgradeNodes.set(up.id, badge);
          this.ownedUpgradeLabel.classList.remove("is-hidden");
        }
        continue;
      }
      if (!evalCondition(state, up.unlock)) continue;

      let node = this.upgradeNodes.get(up.id);
      if (!node) {
        node = document.createElement("button");
        node.className = "upgrade is-revealed";
        node.appendChild(icon(up.icon, 22));
        const text = document.createElement("div");
        text.className = "upgrade__text";
        const name = document.createElement("div");
        name.className = "upgrade__name";
        name.textContent = up.name;
        const desc = document.createElement("div");
        desc.className = "upgrade__desc";
        desc.textContent = up.description;
        const cost = document.createElement("div");
        cost.className = "upgrade__cost";
        cost.textContent = formatNumber(up.cost, sci);
        text.append(name, desc, cost);
        node.appendChild(text);
        node.addEventListener("click", () => this.cb.onBuyUpgrade(up.id));
        this.upgradeList.appendChild(node);
        this.upgradeNodes.set(up.id, node);
      }
      node.toggleAttribute("disabled", state.rp < up.cost);
      node.classList.toggle("is-affordable", state.rp >= up.cost);
    }
  }

  private updateResearch(state: GameState, sci: boolean): void {
    let anyVisible = false;
    for (const def of RESEARCH) {
      const lvl = state.research[def.id] ?? 0;
      // Apparaît au déblocage, puis reste visible (même au niveau 0 acheté).
      if (lvl === 0 && !evalCondition(state, def.unlock) && !this.researchNodes.has(def.id)) {
        continue;
      }
      anyVisible = true;
      const cost = researchCost(state, def);

      let node = this.researchNodes.get(def.id);
      if (!node) {
        const root = document.createElement("button");
        root.className = "upgrade is-revealed";
        root.appendChild(icon(def.icon, 22));
        const text = document.createElement("div");
        text.className = "upgrade__text";
        const name = document.createElement("div");
        name.className = "upgrade__name";
        name.textContent = def.name;
        const desc = document.createElement("div");
        desc.className = "upgrade__desc";
        desc.textContent = def.description;
        const costEl = document.createElement("div");
        costEl.className = "upgrade__cost";
        text.append(name, desc, costEl);
        root.appendChild(text);
        root.addEventListener("click", () => this.cb.onBuyResearch(def.id));
        this.researchList.appendChild(root);
        node = { root, desc, cost: costEl };
        this.researchNodes.set(def.id, node);
      }

      node.desc.textContent = `${def.description} — Niv. ${formatNumber(lvl, sci)}`;
      node.cost.textContent = formatNumber(cost, sci);
      node.root.toggleAttribute("disabled", state.rp < cost);
      node.root.classList.toggle("is-affordable", state.rp >= cost);
    }
    this.researchPanel.classList.toggle("is-hidden", !anyVisible);
  }

  private updatePrestige(state: GameState, sci: boolean): void {
    const unlocked = state.prestigeCount > 0 || state.totalRP >= PRESTIGE_THRESHOLD * 0.5;
    this.prestigePanel.classList.toggle("is-hidden", !unlocked);
    if (!unlocked) return;

    const pending = pendingBreakthroughs(state);
    this.prestigeInfo.innerHTML =
      `Bonus passif : <strong>+${(state.breakthroughs * 2).toFixed(0)} %</strong> ` +
      `(${formatNumber(state.breakthroughs, sci)} Percées gagnées)<br>` +
      `À dépenser : <strong>${formatNumber(state.breakthroughPoints, sci)}</strong> Percées<br>` +
      `Publier maintenant : <strong>+${formatNumber(pending, sci)}</strong> percée(s)`;
    this.prestigeBtn.toggleAttribute("disabled", !canPrestige(state));
    // Le bouton de l'arbre n'apparaît qu'une fois au moins un prestige effectué.
    this.metaOpenBtn.classList.toggle("is-hidden", state.prestigeCount < 1);
  }

  private updateAchievements(state: GameState): void {
    for (const ach of ACHIEVEMENTS) {
      if (state.unlockedAchievements[ach.id]) {
        this.achievementNodes.get(ach.id)?.classList.remove("is-locked");
      }
    }
  }
}

function iconButton(node: Parameters<typeof icon>[0], label: string): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = "icon-btn";
  btn.setAttribute("aria-label", label);
  btn.title = label;
  btn.appendChild(icon(node, 18));
  return btn;
}
