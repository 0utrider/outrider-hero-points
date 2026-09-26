import { HOOK_PREFIX, HERO_POINT_SLUG } from "../constants.js";
import { featureSettings } from "../settings.js";

/**
 * Keep the Better: Hero Point rerolls keep the higher of the old and new totals
 * instead of always taking the new one (Core Rules default). The comparison uses
 * totals, so any Reroll Bonus is included.
 */
export const id = "keepBetter";
const settings = featureSettings(id, "KeepBetter");

export function init() {
  settings.register("enabled", { type: Boolean, default: false });
}

export function ready() {
  Hooks.on(`${HOOK_PREFIX}.preReroll`, onPreReroll);
}

// @system-coupling: 4th preReroll arg is a mutable { keep: "new" | "higher" | "lower" } the
// system reads after the hook to pick which roll to keep (verified PF2e 8.5.1 / SF2e 1.5.1).
function onPreReroll(_oldRoll, _newRoll, resource, keep) {
  if (resource?.slug !== HERO_POINT_SLUG) return;
  if (!settings.get("enabled") || !keep) return;
  keep.keep = "higher";
}
