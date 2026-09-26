/**
 * Feature registry. Each feature module exports:
 *   id        - settings namespace (camelCase)
 *   init()    - register settings, menus, API, GM socket handlers (runs on Foundry `init`)
 *   ready()   - optional; hooks / runtime setup (runs on `ready`)
 *
 * Add a feature: create features/<name>.js, import it here, append to FEATURES.
 * Order here = order in the settings menu AND hook registration order.
 * rerollBonus must precede heroDie (heroDie styles the die rerollBonus adds).
 */
import * as rerollBonus from "./reroll-bonus.js";
import * as heroDie from "./hero-die.js";
import * as keepBetter from "./keep-better.js";
import * as passTheTorch from "./pass-the-torch.js";

export const FEATURES = [rerollBonus, heroDie, keepBetter, passTheTorch];
