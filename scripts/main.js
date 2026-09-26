import { MODULE_ID, SUPPORTED_SYSTEMS } from "./constants.js";
import { FEATURES } from "./features/index.js";

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
  runPhase("init");
  log(`initialized ${FEATURES.length} feature(s): ${FEATURES.map((f) => f.id).join(", ")}`);
});

Hooks.once("ready", () => runPhase("ready"));
