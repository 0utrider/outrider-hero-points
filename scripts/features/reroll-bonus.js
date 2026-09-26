import { MODULE_ID, I18N, HOOK_PREFIX, HERO_POINT_SLUG } from "../constants.js";
import { featureSettings } from "../settings.js";
import { BONUS_CHOICES, TIER_BONUS_CHOICES, buildBonusTerms } from "../lib/bonus.js";
import { getRerollActor } from "../lib/reroll-context.js";
import { ScalingTiersMenu } from "../apps/scaling-tiers.js";

export const id = "rerollBonus";
const I18N_KEY = "RerollBonus";
const FLAG = `${MODULE_ID}.${id}`; // key stored on roll.options

export const DEFAULT_TIERS = [
  { level: 1, bonus: "1d4" },
  { level: 7, bonus: "1d6" },
  { level: 13, bonus: "1d8" },
];

export const settings = featureSettings(id, I18N_KEY);
const t = (key) => `${I18N}.Features.${I18N_KEY}.${key}`;

export function init() {
  settings.register("enabled", { type: Boolean, default: true });
  settings.register("bonus", { type: String, choices: BONUS_CHOICES, default: "1d4" });
  settings.register("label", { type: String, default: "" });
  settings.register("scaling", { type: Boolean, default: false });
  settings.register("tiers", { type: Array, default: DEFAULT_TIERS, config: false });
  settings.registerMenu("tiersMenu", { icon: "fa-solid fa-stairs", type: ScalingTiersMenu });
}

export function ready() {
  Hooks.on(`${HOOK_PREFIX}.preReroll`, onPreReroll);
  Hooks.on("renderChatMessageHTML", onRenderChatMessage);
  Hooks.on("renderSettingsConfig", moveTiersButton);
}

/**
 * Foundry always lists settings menus at the top of a module's section. Move the
 * "Edit Tiers" button next to the "Scale by Level" checkbox and drop the
 * now-empty menu row. The button keeps its core data-action, so it still opens.
 */
function moveTiersButton(_app, html) {
  const root = html instanceof HTMLElement ? html : html[0];
  const button = root?.querySelector(`button[data-key="${MODULE_ID}.${id}.tiersMenu"]`);
  const scaling = root?.querySelector(`[name="${MODULE_ID}.${id}.scaling"]`);
  const fields = scaling?.closest(".form-fields");
  if (!button || !fields || fields.contains(button)) return;

  const menuRow = button.closest(".form-group");
  button.classList.add("ohp-tiers-button");
  fields.append(button);
  menuRow?.remove();
}

/** Tiers sorted by level, invalid rows dropped. */
export function getTiers() {
  const raw = settings.get("tiers");
  return (Array.isArray(raw) ? raw : DEFAULT_TIERS)
    .map((r) => ({ level: Number(r?.level), bonus: String(r?.bonus) }))
    .filter((r) => Number.isInteger(r.level) && r.bonus in TIER_BONUS_CHOICES)
    .sort((a, b) => a.level - b.level);
}

/**
 * Pick the bonus for this reroll. Scaling uses the highest tier at or below the
 * actor's level; below the lowest tier = no bonus. If the actor can't be
 * resolved, fall back to the flat bonus.
 */
function resolveBonus(actor) {
  if (settings.get("scaling") && actor) {
    const level = Number(actor.level ?? 0);
    const tier = getTiers().filter((r) => r.level <= level).at(-1);
    return { bonus: tier?.bonus ?? "0", tierLevel: tier?.level ?? null };
  }
  return { bonus: settings.get("bonus"), tierLevel: null };
}

/**
 * `preReroll` hands us the *unevaluated* new roll before the system evaluates it
 * and computes degree of success, so appended terms flow through to the total,
 * DoS, Dice So Nice, and the chat card. DoS/nat-20 detection uses the first d20
 * term, so a +1d20 bonus can't hijack crits.
 */
// @system-coupling: hook signature (oldRoll, newRoll, resource, { keep }) and the
// guarantee that newRoll is unevaluated from Check.rerollFromMessage (PF2e 8.5.1 / SF2e 1.5.1).
function onPreReroll(_oldRoll, newRoll, resource, _keep) {
  if (resource?.slug !== HERO_POINT_SLUG) return;
  if (!settings.get("enabled")) return;

  const { bonus, tierLevel } = resolveBonus(getRerollActor());
  const label = settings.get("label").trim() || game.i18n.localize(t("LabelDefault"));
  const terms = buildBonusTerms(bonus, label);
  if (!terms) return;

  newRoll.terms.push(...terms);
  newRoll.resetFormula();
  newRoll.options[FLAG] = { bonus, label, tierLevel };
}

function onRenderChatMessage(message, html) {
  const data = message.rolls?.find((r) => r.options?.[FLAG])?.options[FLAG];
  if (!data) return;

  // @system-coupling: ".reroll-second" is the new-roll block in the system's reroll card markup.
  const anchor = html.querySelector(".reroll-second") ?? html.querySelector(".message-content");
  if (!anchor || anchor.querySelector(".ohp-badge")) return;

  const text = game.i18n.format(t("Badge"), {
    label: foundry.utils.escapeHTML?.(data.label) ?? data.label,
    bonus: TIER_BONUS_CHOICES[data.bonus] ?? data.bonus,
  });
  const tier = data.tierLevel != null ? ` ${game.i18n.format(t("BadgeTier"), { level: data.tierLevel })}` : "";

  const badge = document.createElement("div");
  badge.className = "ohp-badge";
  badge.innerHTML = `<i class="fa-solid fa-circle-h"></i> ${text}${tier}`;
  anchor.prepend(badge);
}
