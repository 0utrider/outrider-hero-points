import { MODULE_ID, I18N } from "./constants.js";

/**
 * Feature-scoped settings helper. Keys are namespaced `<featureId>.<key>` and
 * i18n resolves to OHP.Features.<Feature>.Settings.<Key>.{Name,Hint}.
 */
export function featureSettings(featureId, i18nKey) {
  const fullKey = (key) => `${featureId}.${key}`;
  const i18n = (key) => `${I18N}.Features.${i18nKey}.Settings.${key[0].toUpperCase()}${key.slice(1)}`;

  return {
    register(key, data) {
      game.settings.register(MODULE_ID, fullKey(key), {
        name: `${i18n(key)}.Name`,
        hint: `${i18n(key)}.Hint`,
        scope: "world",
        config: true,
        ...data,
      });
    },
    get: (key) => game.settings.get(MODULE_ID, fullKey(key)),
    set: (key, value) => game.settings.set(MODULE_ID, fullKey(key), value),
  };
}
