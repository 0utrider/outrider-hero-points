import { I18N, HOOK_PREFIX, HERO_POINT_SLUG } from "../constants.js";
import { featureSettings } from "../settings.js";
import { findBonusDice } from "../lib/bonus.js";

/**
 * Hero Die: gives the Reroll Bonus die a bright, polished metal look in Dice So Nice
 * (gold, silver, or a custom color) and tints the chat badge to match.
 *
 * We register our own Dice So Nice colorsets (no texture; chrome for the gold and
 * silver presets, plain plastic for Custom) and
 * point the die at them via term.options.colorset. That REPLACES the roller's
 * colorset instead of merging over it, so textured colorsets can't bleed
 * through. appearance.system = "standard" forces the plain dice model even if
 * the roller uses a custom dice system.
 *
 * Only affects dice bonuses; flat +1/+2/+3 have no die to paint.
 * Harmless without Dice So Nice.
 */
export const id = "heroDie";
const I18N_KEY = "HeroDie";

const settings = featureSettings(id, I18N_KEY);
const t = (key) => `${I18N}.Features.${I18N_KEY}.${key}`;

const COLORSET_PREFIX = "ohp-hero-";
const CATEGORY = "Outrider's Hero Points";

// Tuned against the "chrome" material, which reads much brighter than "metal".
// Chrome washes out number color on its own, so each preset pairs the number
// color with an outline to get an enamel-inlay look.
const PRESETS = {
  gold: { background: "#ffd700", foreground: "#ffffff", outline: "#ffffff", edge: "#ffd700" }, // white numbers, white outline
  silver: { background: "#f4f6fa", foreground: "#0066ff", outline: "#ffffff", edge: "#f4f6fa" }, // bright blue, white halo
};
const PRESET_MATERIAL = "chrome";
// Custom starts from Dice So Nice's Standard + White look (plain, not metallic):
// white die, white numbers, black outline. Every color is GM-adjustable.
const CUSTOM_MATERIAL = "plastic";
const CUSTOM_DEFAULTS = { die: "#ffffff", number: "#ffffff", outline: "#000000" };
// Chat badge tint; the die colors are too pale to read as a tint on light chat cards.
const BADGE = { gold: "#d4af37", silver: "#9aa0a8" };

export function init() {
  settings.register("enabled", { type: Boolean, default: true });
  settings.register("color", {
    type: String,
    default: "gold",
    choices: { gold: t("Color.Gold"), silver: t("Color.Silver"), custom: t("Color.Custom") },
  });
  const colorSetting = (key, initial) =>
    settings.register(key, {
      type: new foundry.data.fields.ColorField({ nullable: false, initial }),
      default: initial,
      onChange: () => registerColorsets(game.dice3d),
    });
  colorSetting("customColor", CUSTOM_DEFAULTS.die);
  colorSetting("customNumberColor", CUSTOM_DEFAULTS.number);
  colorSetting("customOutlineColor", CUSTOM_DEFAULTS.outline);

  Hooks.once("diceSoNiceReady", registerColorsets);
}

export function ready() {
  // Covers the case where Dice So Nice was ready before our hook was attached.
  registerColorsets(game.dice3d);
  Hooks.on(`${HOOK_PREFIX}.preReroll`, onPreReroll);
  Hooks.on("renderChatMessageHTML", onRenderChatMessage);
}

/** Custom: GM-picked die, number, and outline colors. */
function customColors() {
  const bg = String(settings.get("customColor") || CUSTOM_DEFAULTS.die);
  const fg = String(settings.get("customNumberColor") || CUSTOM_DEFAULTS.number);
  const outline = String(settings.get("customOutlineColor") || CUSTOM_DEFAULTS.outline);
  return { background: bg, foreground: fg, outline, edge: bg };
}

/** Die color for the chat badge tint, or the outline color if the die is too pale to read. */
function customBadgeColor() {
  const { background, outline } = customColors();
  const n = parseInt(background.replace("#", ""), 16) || 0;
  const luma = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return luma > 0.85 ? outline : background;
}

/** Register (or refresh) our colorsets. Safe to call repeatedly. */
async function registerColorsets(dice3d) {
  if (!dice3d?.addColorset) return;
  const defs = { ...PRESETS, custom: customColors() };
  for (const [key, colors] of Object.entries(defs)) {
    const material = key === "custom" ? CUSTOM_MATERIAL : PRESET_MATERIAL;
    await dice3d.addColorset(
      {
        name: `${COLORSET_PREFIX}${key}`,
        description: game.i18n.format(t("ColorsetName"), { color: game.i18n.localize(t(`Color.${key[0].toUpperCase()}${key.slice(1)}`)) }),
        category: CATEGORY,
        ...colors,
        texture: "none",
        material,
      },
      "default",
    );
  }
}

function currentChoice() {
  const choice = settings.get("color");
  return choice in PRESETS || choice === "custom" ? choice : "gold";
}

function onPreReroll(_oldRoll, newRoll, resource) {
  if (resource?.slug !== HERO_POINT_SLUG) return;
  if (!settings.get("enabled")) return;

  const dice = findBonusDice(newRoll);
  if (!dice.length) return;

  const choice = currentChoice();
  const badgeColor = choice === "custom" ? customBadgeColor() : BADGE[choice];
  for (const die of dice) {
    die.options.colorset = `${COLORSET_PREFIX}${choice}`;
    die.options.appearance = { system: "standard" };
    die.options.ohpHeroColor = badgeColor;
  }
}

/** Tint the Reroll Bonus badge to match the die. */
function onRenderChatMessage(message, html) {
  const badge = html.querySelector(".ohp-badge");
  if (!badge) return;
  const color = message.rolls
    ?.flatMap((r) => findBonusDice(r))
    .map((d) => d.options?.ohpHeroColor ?? d.options?.appearance?.background) // appearance: v1.4.0 messages
    .find(Boolean);
  if (color) badge.style.setProperty("--ohp-accent", color);
}
