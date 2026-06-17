import { Sparkles } from "lucide";
import { icon } from "@/ui/juice";

/** Récompense tirée quand le joueur attrape une fiole « Eurêka ». */
export type EurekaReward =
  /** Frénésie : production ×factor pendant `seconds`. */
  | { kind: "frenzy"; factor: number; seconds: number }
  /** Cagnotte : crédit instantané valant `seconds` de production. */
  | { kind: "windfall"; seconds: number };

const MIN_DELAY_MS = 70_000; // délai mini entre deux apparitions
const MAX_DELAY_MS = 140_000; // délai maxi entre deux apparitions
const LIFETIME_MS = 13_000; // temps pour l'attraper avant disparition

/** Tire une récompense au hasard (frénésie ou cagnotte). */
function rollReward(): EurekaReward {
  return Math.random() < 0.5
    ? { kind: "frenzy", factor: 7, seconds: 30 }
    : { kind: "windfall", seconds: 600 }; // 10 min de production
}

function randomDelay(): number {
  return MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
}

/**
 * Lance la boucle d'événements « Eurêka ». À intervalles aléatoires, une fiole
 * dorée flottante apparaît ; la cliquer déclenche `onCollect` avec une récompense.
 */
export function startEurekaEvents(onCollect: (reward: EurekaReward) => void): void {
  const spawn = () => {
    const el = document.createElement("button");
    el.className = "eureka";
    el.setAttribute("aria-label", "Eurêka ! Cliquez pour un bonus");
    el.appendChild(icon(Sparkles, 30));

    // Position aléatoire en évitant les bords.
    const margin = 80;
    const x = margin + Math.random() * (window.innerWidth - margin * 2);
    const y = margin + Math.random() * (window.innerHeight - margin * 2);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    let collected = false;
    const remove = () => {
      el.classList.add("eureka--leaving");
      el.addEventListener("animationend", () => el.remove(), { once: true });
    };
    const lifetimeTimer = window.setTimeout(remove, LIFETIME_MS);

    el.addEventListener("click", () => {
      if (collected) return;
      collected = true;
      window.clearTimeout(lifetimeTimer);
      onCollect(rollReward());
      remove();
    });

    document.body.appendChild(el);
    window.setTimeout(spawn, randomDelay());
  };

  window.setTimeout(spawn, randomDelay());
}
