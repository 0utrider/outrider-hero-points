import { MODULE_ID, I18N, HOOK_PREFIX, HERO_POINT_SLUG } from "../constants.js";
import { featureSettings } from "../settings.js";

export const id = "rerollBonus";
const I18N_KEY = "RerollBonus";
const FLAG = `${MODULE_ID}.${id}`; // key stored on roll.options

const BONUS_CHOICES = {
  "1": "+1",
  "2": "+2",
  "3": "+3",
  "1d4": "+1d4",
  "1d6": "+1d6",
  "1d8": "+1d8",
  "1d10": "+1d10",
  "1d12": "+1d12",
  "1d20": "+1d20",
};

const settings = featureSettings(id, I18N_KEY);
const t = (key) => `${I18N}.Features.${I18N_KEY}.${key}`;

export function init() {
  settings.register("enabled", { type: Boolean, default: true });
  settings.register("bonus", { type: String, choices: BONUS_CHOICES, default: "1d4" });
  settings.register("label", { type: String, default: "" });
}

export function ready() {
  Hooks.on(`${HOOK_PREFIX}.preReroll`, onPreReroll);
  Hooks.on("renderChatMessageHTML", onRenderChatMessage);
}

/** [OperatorTerm("+"), Die | NumericTerm] for a bonus like "1d4" or "2". */
function buildBonusTerms(bonus, flavor) {
  const { OperatorTerm, NumericTerm, Die } = foundry.dice.terms;
  const dieMatch = /^(\d+)d(\d+)$/.exec(bonus);
  const term = dieMatch
    ? new Die({ number: Number(dieMatch[1]), faces: Number(dieMatch[2]), options: { flavor } })
    : new NumericTerm({ number: Number(bonus), options: { flavor } });
  return [new OperatorTerm({ operator: "+" }), term];
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

  const bonus = settings.get("bonus");
  if (!(bonus in BONUS_CHOICES)) return;

  const label = settings.get("label").trim() || game.i18n.localize(t("LabelDefault"));
  newRoll.terms.push(...buildBonusTerms(bonus, label));
  newRoll.resetFormula();
  newRoll.options[FLAG] = { bonus, label };
}

function onRenderChatMessage(message, html) {
  const data = message.rolls?.find((r) => r.options?.[FLAG])?.options[FLAG];
  if (!data) return;

  // @system-coupling: ".reroll-second" is the new-roll block in the system's reroll card markup.
  const anchor = html.querySelector(".reroll-second") ?? html.querySelector(".message-content");
  if (!anchor || anchor.querySelector(".ohp-badge")) return;

  const badge = document.createElement("div");
  badge.className = "ohp-badge";
  badge.innerHTML = `<i class="fa-solid fa-circle-h"></i> ${game.i18n.format(t("Badge"), {
    label: foundry.utils.escapeHTML?.(data.label) ?? data.label,
    bonus: BONUS_CHOICES[data.bonus] ?? data.bonus,
  })}`;
  anchor.prepend(badge);
}
