import { BONUS_TERM_MARKER } from "../constants.js";

/** Flat or dice bonuses offered in the settings dropdowns. */
export const BONUS_CHOICES = {
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

/** Tier choices add "none", so a tier can scale the bonus away entirely. */
export const TIER_BONUS_CHOICES = { "0": "+0", ...BONUS_CHOICES };

/** [OperatorTerm("+"), Die | NumericTerm] for a bonus like "1d4" or "2". Null for "0". */
export function buildBonusTerms(bonus, flavor) {
  if (!bonus || bonus === "0") return null;
  const { OperatorTerm, NumericTerm, Die } = foundry.dice.terms;
  const options = { flavor, [BONUS_TERM_MARKER]: true };
  const dieMatch = /^(\d+)d(\d+)$/.exec(bonus);
  const term = dieMatch
    ? new Die({ number: Number(dieMatch[1]), faces: Number(dieMatch[2]), options })
    : new NumericTerm({ number: Number(bonus), options });
  return [new OperatorTerm({ operator: "+" }), term];
}

/** The bonus Die term(s) appended by the Reroll Bonus feature. */
export function findBonusDice(roll) {
  return roll.terms.filter(
    (t) => t instanceof foundry.dice.terms.Die && t.options?.[BONUS_TERM_MARKER],
  );
}
