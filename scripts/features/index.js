/**
 * Feature registry. Each feature module exports:
 *   id        - settings namespace (camelCase)
 *   init()    - register settings (runs on Foundry `init`)
 *   ready()   - optional; hooks / runtime setup (runs on `ready`)
 *
 * Add a feature: create features/<name>.js, import it here, append to FEATURES.
 * Order here = order in the settings menu.
 */
import * as rerollBonus from "./reroll-bonus.js";

export const FEATURES = [rerollBonus];
