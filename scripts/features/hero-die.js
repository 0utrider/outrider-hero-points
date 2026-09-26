import { I18N, HOOK_PREFIX, HERO_POINT_SLUG } from "../constants.js";
import { featureSettings } from "../settings.js";
import { findBonusDice } from "../lib/bonus.js";

/**
 * Hero Die: gives the Reroll Bonus die its own Dice So Nice look (gold, silver,
 * or a custom color) and tints the chat badge to match. Only affects dice
 * bonuses; flat +1/+2/+3 have no die to paint. Harmless without Dice So Nice.
 */
export const id = "heroDie";
const I18N_KEY = "HeroDie";

const settings = featureSettings(id, I18N_KEY);
const t = (key) => `${I18N}.Features.${I18N_KEY}.${key}`;

const PRESETS = {
  gold: { background: "#d4af37", foreground: "#2b1d00", outline: "#5c4400", edge: "#b8860b" },
  silver: { background: "#c0c0c0", foreground: "#1b1b1b", outline: "#4a4a4a", edge: "#8f8f8f" },
};

export function init() {
  settings.register("enabled", { type: Boolean, default: true });
  settings.register("color", {
    type: String,
    default: "gold",
    choices: { gold: t("Color.Gold"), silver: t("Color.Silver"), custom: t("Color.Custom") },
  });
  settings.register("customColor", {
    type: new foundry.data.fields.ColorField({ nullable: false, initial: "#7b2cbf" }),
    default: "#7b2cbf",
  });
}

export function ready() {
  Hooks.on(`${HOOK_PREFIX}.preReroll`, onPreReroll);
  Hooks.on("renderChatMessageHTML", onRenderChatMessage);
}

/** "#rrggbb" -> [r, g, b] in 0..255. */
const toRGB = (hex) => {
  const n = parseInt(String(hex).replace("#", "").padEnd(6, "0").slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (rgb) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;

/** Black or white text, whichever reads better on `hex`. */
function contrastText(hex) {
  const [r, g, b] = toRGB(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? "#111111" : "#f5f5f5";
}

const darken = (hex, f = 0.55) => toHex(toRGB(hex).map((c) => c * f));

function currentAppearance() {
  const choice = settings.get("color");
  const base =
    choice === "custom"
      ? (() => {
          const bg = String(settings.get("customColor") || "#7b2cbf");
          const dark = darken(bg);
          return { background: bg, foreground: contrastText(bg), outline: dark, edge: dark };
        })()
      : (PRESETS[choice] ?? PRESETS.gold);
  // Dice So Nice merges term.options.appearance over the roller's colorset.
  return { ...base, material: "metal", texture: "none" };
}

// @system-coupling: same preReroll hook as Reroll Bonus; must run after it (see features/index.js).
function onPreReroll(_oldRoll, newRoll, resource) {
  if (resource?.slug !== HERO_POINT_SLUG) return;
  if (!settings.get("enabled")) return;

  const dice = findBonusDice(newRoll);
  if (!dice.length) return;
  const appearance = currentAppearance();
  for (const die of dice) die.options.appearance = appearance;
}

/** Tint the Reroll Bonus badge to match the die. */
function onRenderChatMessage(message, html) {
  const badge = html.querySelector(".ohp-badge");
  if (!badge) return;
  const die = message.rolls?.flatMap((r) => findBonusDice(r)).find((d) => d.options?.appearance);
  const color = die?.options.appearance.background;
  if (color) badge.style.setProperty("--ohp-accent", color);
}
