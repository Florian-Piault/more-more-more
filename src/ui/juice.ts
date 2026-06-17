import { createElement } from "lucide";
import type { LucideIcon } from "@/core/types";

/** Construit un élément SVG Lucide prêt à insérer dans le DOM. */
export function icon(node: LucideIcon, size = 20): SVGElement {
  const el = createElement(node);
  el.setAttribute("width", String(size));
  el.setAttribute("height", String(size));
  el.classList.add("icon");
  return el;
}

/** Affiche un texte « +X » flottant à la position d'un clic, puis l'efface. */
export function floatText(text: string, x: number, y: number): void {
  const el = document.createElement("div");
  el.className = "float-text";
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);
  el.addEventListener("animationend", () => el.remove(), { once: true });
}

/** Petit « pop » d'échelle sur un élément (retour tactile au clic / à l'achat). */
export function pop(el: HTMLElement): void {
  el.classList.remove("pop");
  // Force un reflow pour pouvoir rejouer l'animation immédiatement.
  void el.offsetWidth;
  el.classList.add("pop");
}

export type ToastKind = "achievement" | "offline" | "info";

/** Notification éphémère en bas de l'écran (accomplissement, bilan hors-ligne…). */
export function toast(opts: {
  title: string;
  body?: string;
  iconNode?: LucideIcon;
  kind?: ToastKind;
  duration?: number;
}): void {
  const container = ensureToastContainer();
  const el = document.createElement("div");
  el.className = `toast toast--${opts.kind ?? "info"}`;

  if (opts.iconNode) el.appendChild(icon(opts.iconNode, 24));

  const text = document.createElement("div");
  text.className = "toast__text";
  const title = document.createElement("strong");
  title.textContent = opts.title;
  text.appendChild(title);
  if (opts.body) {
    const body = document.createElement("span");
    body.textContent = opts.body;
    text.appendChild(body);
  }
  el.appendChild(text);

  const duration = opts.duration ?? 4000;
  // Liseré inférieur servant de minuteur (se vide pendant l'affichage).
  const timer = document.createElement("div");
  timer.className = "toast__timer";
  timer.style.animationDuration = `${duration}ms`;
  el.appendChild(timer);

  container.appendChild(el);

  window.setTimeout(() => {
    el.classList.add("toast--leaving");
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }, duration);
}

// ---- Tooltips --------------------------------------------------------------

let tooltipEl: HTMLElement | null = null;

function ensureTooltip(): HTMLElement {
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.className = "tooltip";
    document.body.appendChild(tooltipEl);
  }
  return tooltipEl;
}

function positionTooltip(el: HTMLElement, x: number, y: number): void {
  const margin = 14;
  const rect = el.getBoundingClientRect();
  let left = x + margin;
  let top = y + margin;
  if (left + rect.width > window.innerWidth) left = x - rect.width - margin;
  if (top + rect.height > window.innerHeight) top = y - rect.height - margin;
  el.style.left = `${Math.max(4, left)}px`;
  el.style.top = `${Math.max(4, top)}px`;
}

/**
 * Attache un tooltip à un élément. `content` peut être une chaîne ou une
 * fonction (recalculée à l'affichage, utile pour un contenu dynamique).
 */
export function attachTooltip(
  target: HTMLElement,
  content: { title: string; body?: string } | (() => { title: string; body?: string }),
): void {
  const show = (e: MouseEvent) => {
    const data = typeof content === "function" ? content() : content;
    const tip = ensureTooltip();
    tip.innerHTML = "";
    const t = document.createElement("strong");
    t.textContent = data.title;
    tip.appendChild(t);
    if (data.body) {
      const b = document.createElement("span");
      b.textContent = data.body;
      tip.appendChild(b);
    }
    tip.classList.add("is-visible");
    positionTooltip(tip, e.clientX, e.clientY);
  };
  target.addEventListener("mouseenter", show);
  target.addEventListener("mousemove", (e) => {
    if (tooltipEl?.classList.contains("is-visible")) positionTooltip(tooltipEl, e.clientX, e.clientY);
  });
  target.addEventListener("mouseleave", () => tooltipEl?.classList.remove("is-visible"));
}

function ensureToastContainer(): HTMLElement {
  let c = document.getElementById("toasts");
  if (!c) {
    c = document.createElement("div");
    c.id = "toasts";
    document.body.appendChild(c);
  }
  return c;
}
