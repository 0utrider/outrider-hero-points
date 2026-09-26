import { MODULE_ID } from "../constants.js";

/**
 * Minimal GM relay. Players can't update actors they don't own, so actions
 * like Pass the Torch run on the active GM's client. Requires "socket": true
 * in module.json. No socketlib dependency.
 */
const EVENT = `module.${MODULE_ID}`;
const handlers = new Map();

const isActiveGM = () => game.users.activeGM?.isSelf ?? false;

export function registerGMHandler(name, fn) {
  handlers.set(name, fn);
}

export function initSocket() {
  game.socket.on(EVENT, async (payload) => {
    if (!isActiveGM()) return;
    const fn = handlers.get(payload?.name);
    if (!fn) return;
    try {
      await fn(payload.data, payload.userId);
    } catch (err) {
      console.error(`${MODULE_ID} | GM handler "${payload.name}" failed`, err);
    }
  });
}

/**
 * Run a handler on the active GM's client (directly, if that's us).
 * Returns false if no GM is online.
 */
export async function executeAsGM(name, data) {
  if (isActiveGM()) {
    await handlers.get(name)?.(data, game.user.id);
    return true;
  }
  if (!game.users.activeGM) return false;
  // Note: userId is client-supplied. Fine for a trusted table; handlers still
  // validate ownership against it.
  game.socket.emit(EVENT, { name, data, userId: game.user.id });
  return true;
}
