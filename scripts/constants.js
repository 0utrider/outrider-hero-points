export const MODULE_ID = "outrider-hero-points";

/** i18n root key, every string lives under OHP.* */
export const I18N = "OHP";

/**
 * SF2e is built on the PF2e codebase and keeps its API surface: `game.pf2e`,
 * `pf2e.*` hooks, and the same resource slugs. So the hook prefix is "pf2e"
 * under both systems. Do NOT derive it from game.system.id ("sf2e").
 */
export const SUPPORTED_SYSTEMS = ["pf2e", "sf2e"];
// @system-coupling: SF2e reuses the "pf2e" hook namespace (verified SF2e 1.5.1).
export const HOOK_PREFIX = "pf2e";
// @system-coupling: resource slug shared by both systems via actor.getResource().
export const HERO_POINT_SLUG = "hero-points";

/** Marker set on the bonus die/number term's options so other features can find it. */
export const BONUS_TERM_MARKER = "ohpBonus";
