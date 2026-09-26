import { MODULE_ID, SUPPORTED_SYSTEMS } from "./constants.js";
import { FEATURES } from "./features/index.js";
import { installRerollContext } from "./lib/reroll-context.js";
import { initSocket } from "./lib/socket.js";

const log = (...args) => console.log(`${MODULE_ID} |`, ...args);

function runPhase(phase) {
  for (const feature of FEATURES) {
    try {
      feature[phase]?.();
    } catch (err) {
      console.error(`${MODULE_ID} | feature "${feature.id}" failed during ${phase}`, err);
    }
  }
}

Hooks.once("init", () => {
  if (!SUPPORTED_SYSTEMS.includes(game.system.id)) {
    console.warn(`${MODULE_ID} | unsupported system "${game.system.id}", features disabled`);
    FEATURES.length = 0;
    return;
  }
  // Public API for macros: game.modules.get("outrider-hero-points").api
  game.modules.get(MODULE_ID).api = {};
  runPhase("init");
  log(`initialized ${FEATURES.length} feature(s): ${FEATURES.map((f) => f.id).join(", ")}`);
});

Hooks.once("ready", () => {
  if (!FEATURES.length) return;
  installRerollContext();
  initSocket();
  runPhase("ready");
});
