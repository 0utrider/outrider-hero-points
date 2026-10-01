# Outrider's Hero Points

<div align="center">

[![Part of Outrider's Pathfinder Tools](https://img.shields.io/badge/Part%20of-Outrider%27s%20Pathfinder%20Tools-7000d6?style=for-the-badge)](https://github.com/0utrider/pathfinder)
[![Available on Foundry Package Browser](https://img.shields.io/badge/Foundry-Package%20Page-7000d6?style=for-the-badge)](https://foundryvtt.com/packages/outrider-hero-points)

</div>

Hero Point enhancements for **Pathfinder 2e** and **Starfinder 2e** on Foundry VTT (v13 to v14). SF2e shares PF2e's API (`game.pf2e`, `pf2e.*` hooks), so one codebase serves both. Each feature is independently toggled in **Configure Settings → Outrider's Hero Points**.

## Features

All toggles live in **Configure Settings → Outrider's Hero Points**.

| Feature | Default | What it does |
|---|---|---|
| Reroll Bonus | on, `+1d4` | Adds `+1`/`+2`/`+3` or a die (`+1d2`…`+5d2`, `+1d4`…`+3d4`, `+1d6`…`+1d20`) to Hero Point rerolls. |
| Reroll Bonus: Scale by Level | off | Bonus comes from GM-editable level tiers instead (default 1d4 @ 1, 1d6 @ 7, 1d8 @ 13). Tiers can scale down, and `+0` is allowed. |
| Hero Die | on, gold | Gives the bonus die a polished-metal Dice So Nice look: gold with white numbers, chrome silver with blue numbers, or a plain custom die (white die, white numbers, black outline by default; all three colors adjustable). Tints the chat badge to match. Needs Dice So Nice for the 3D dice. |
| Keep the Better | off | Hero Point rerolls keep the higher total instead of always the new roll. |
| Pass the Torch | off | A player gives one Hero Point to an allied character (Token HUD button or macro). Runs on the GM's client, announced in chat. Needs a GM online. |

Mythic Point rerolls are untouched by all features.

### Macro

```js
game.modules.get("outrider-hero-points").api.passTheTorch();        // selected token or assigned character
game.modules.get("outrider-hero-points").api.passTheTorch(actor);   // explicit giver
```

## System coupling

SF2e currently shares PF2e's codebase and API (`game.pf2e`, `pf2e.*` hooks, resource slugs), so one module serves both.
Every spot that depends on that shared surface is tagged. If the systems diverge, start here:

```bash
grep -rn "@system-coupling" scripts/
```

## Layout

```
scripts/
  main.js              # boot: runs init/ready for every registered feature
  constants.js         # MODULE_ID, SUPPORTED_SYSTEMS, HOOK_PREFIX, slugs
  settings.js          # featureSettings(): namespaced "<feature>.<key>" settings + menus
  lib/
    bonus.js           # bonus choices, term builder, bonus-die marker
    reroll-context.js  # wraps Check.rerollFromMessage so preReroll handlers know the actor
    socket.js          # GM relay (module socket, no socketlib dependency)
  apps/
    scaling-tiers.js   # ApplicationV2 tier editor
  features/
    index.js           # FEATURES registry, add new features here (order matters)
    reroll-bonus.js
    hero-die.js
    keep-better.js
    pass-the-torch.js
lang/en.json           # OHP.Features.<Feature>.*
styles/main.css
```

## Adding a feature
1. Create `scripts/features/<name>.js` exporting `id`, `init()`, and optionally `ready()`. Anything needing GM authority: `registerGMHandler()` in `init()`, `executeAsGM()` at runtime.
2. Use `featureSettings(id, "<I18nKey>")` for settings; strings go under `OHP.Features.<I18nKey>`.
3. Import it and append it to `FEATURES` in `features/index.js`.

## License

GPL-3.0-or-later. See `LICENSE`.
