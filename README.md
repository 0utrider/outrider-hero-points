# Outrider's Hero Points

Hero Point enhancements for **Pathfinder 2e** and **Starfinder 2e** on Foundry VTT (v13 to v14). SF2e shares PF2e's API (`game.pf2e`, `pf2e.*` hooks), so one codebase serves both. Each feature is independently toggled in **Configure Settings → Outrider's Hero Points**.

## Features

### Reroll Bonus
Adds a bonus to Hero Point rerolls: `+1`, `+2`, `+3`, `+1d4` (default), `+1d6`, `+1d8`, `+1d10`, `+1d12`, `+1d20`.
Hooks `pf2e.preReroll`, so the total, degree of success, Dice So Nice, and the chat card all reflect it. Mythic Point rerolls are untouched.

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
  settings.js          # featureSettings(): namespaced "<feature>.<key>" settings
  features/
    index.js           # FEATURES registry, add new features here
    reroll-bonus.js
lang/en.json           # OHP.Features.<Feature>.*
styles/main.css
```

## Adding a feature
1. Create `scripts/features/<name>.js` exporting `id`, `init()`, and optionally `ready()`.
2. Use `featureSettings(id, "<I18nKey>")` for settings; strings go under `OHP.Features.<I18nKey>`.
3. Import it and append it to `FEATURES` in `features/index.js`.

## License

GPL-3.0-or-later. See `LICENSE`.
