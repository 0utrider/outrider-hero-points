import { MODULE_ID } from "../constants.js";

/**
 * `pf2e.preReroll` does not pass the actor, but features like Scaling need it.
 * We wrap Check.rerollFromMessage to remember which message is being rerolled;
 * the system fires preReroll synchronously before its first await, so the
 * message is available to hook handlers during that window.
 */
let current = null;

export const getRerollMessage = () => current;

/** Actor whose Hero Points are being spent, or null if unknown. */
export function getRerollActor() {
  const actor = current?.actor;
  if (!actor) return null;
  // @system-coupling: familiars spend their master's resources (mirrors Check.rerollFromMessage).
  return actor.isOfType?.("familiar") ? (actor.master ?? actor) : actor;
}

// @system-coupling: game.pf2e.Check.rerollFromMessage(message, options) exists and fires
// pf2e.preReroll before its first await (verified PF2e 8.5.1 / SF2e 1.5.1).
export function installRerollContext() {
  const Check = game.pf2e?.Check;
  if (typeof Check?.rerollFromMessage !== "function") {
    console.warn(`${MODULE_ID} | Check.rerollFromMessage not found, actor-aware features fall back to defaults`);
    return;
  }

  const wrapper = function (wrapped, message, ...args) {
    current = message;
    const result = wrapped(message, ...args);
    // Clear once the reroll settles, not synchronously: another module's wrapper
    // inside ours may await before the system code runs.
    Promise.resolve(result)
      .finally(() => {
        if (current === message) current = null;
      })
      .catch(() => {}); // callers handle the real rejection; don't leak an unhandled one
    return result;
  };

  if (game.modules.get("lib-wrapper")?.active) {
    libWrapper.register(MODULE_ID, "game.pf2e.Check.rerollFromMessage", wrapper, "WRAPPER");
  } else {
    const original = Check.rerollFromMessage;
    Check.rerollFromMessage = function (...args) {
      return wrapper((...a) => original.apply(this, a), ...args);
    };
  }
}
