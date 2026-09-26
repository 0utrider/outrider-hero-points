import { I18N } from "../constants.js";
import { TIER_BONUS_CHOICES } from "../lib/bonus.js";

const { ApplicationV2 } = foundry.applications.api;
const t = (key) => `${I18N}.Features.RerollBonus.Tiers.${key}`;

/**
 * GM editor for Reroll Bonus scaling tiers: "at level N and up, the bonus is X".
 * Tiers can scale down as well as up. Plain ApplicationV2, no template file.
 *
 * Circular import note: reroll-bonus.js imports this class; we import its
 * exports lazily inside methods so module evaluation order doesn't matter.
 */
export class ScalingTiersMenu extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "ohp-scaling-tiers",
    tag: "form",
    classes: ["ohp-tiers"],
    window: { title: "OHP.Features.RerollBonus.Tiers.Title", icon: "fa-solid fa-stairs", contentClasses: ["standard-form"] },
    position: { width: 420, height: "auto" },
    form: { handler: ScalingTiersMenu.#onSubmit, closeOnSubmit: true },
    actions: {
      addTier: ScalingTiersMenu.#onAdd,
      removeTier: ScalingTiersMenu.#onRemove,
      resetTiers: ScalingTiersMenu.#onReset,
    },
  };

  /** Working copy; null until first render. */
  #tiers = null;

  async #feature() {
    return import("../features/reroll-bonus.js");
  }

  async _prepareContext() {
    if (!this.#tiers) this.#tiers = (await this.#feature()).getTiers();
    return { tiers: this.#tiers };
  }

  async _renderHTML({ tiers }) {
    const loc = (k) => game.i18n.localize(t(k));
    const options = (selected) =>
      Object.entries(TIER_BONUS_CHOICES)
        .map(([v, l]) => `<option value="${v}"${v === selected ? " selected" : ""}>${l}</option>`)
        .join("");

    const rows = tiers
      .map(
        (tier, i) => `
        <div class="ohp-tier-row" data-index="${i}">
          <label>${loc("Level")} <input type="number" name="level" min="0" max="30" step="1" value="${tier.level}"></label>
          <label>${loc("Bonus")} <select name="bonus">${options(tier.bonus)}</select></label>
          <button type="button" class="icon" data-action="removeTier" data-tooltip="${loc("Remove")}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>`,
      )
      .join("");

    const el = document.createElement("div");
    el.innerHTML = `
      <p class="hint">${loc("Hint")}</p>
      <div class="ohp-tier-list">${rows || `<p class="hint">${loc("Empty")}</p>`}</div>
      <footer class="form-footer">
        <button type="button" data-action="addTier"><i class="fa-solid fa-plus"></i> ${loc("Add")}</button>
        <button type="button" data-action="resetTiers"><i class="fa-solid fa-rotate-left"></i> ${loc("Reset")}</button>
        <button type="submit"><i class="fa-solid fa-floppy-disk"></i> ${loc("Save")}</button>
      </footer>`;
    return el;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(...result.children);
  }

  /** Pull current input values back into #tiers before a re-render. */
  #readForm() {
    this.#tiers = [...this.element.querySelectorAll(".ohp-tier-row")].map((row) => ({
      level: Number(row.querySelector("[name=level]").value),
      bonus: row.querySelector("[name=bonus]").value,
    }));
  }

  static #onAdd() {
    this.#readForm();
    const last = this.#tiers.at(-1);
    this.#tiers.push({ level: last ? last.level + 1 : 1, bonus: last?.bonus ?? "1d4" });
    this.render();
  }

  static #onRemove(_event, target) {
    this.#readForm();
    this.#tiers.splice(Number(target.closest(".ohp-tier-row").dataset.index), 1);
    this.render();
  }

  static async #onReset() {
    this.#tiers = foundry.utils.deepClone((await this.#feature()).DEFAULT_TIERS);
    this.render();
  }

  static async #onSubmit() {
    this.#readForm();
    const clean = this.#tiers
      .filter((r) => Number.isInteger(r.level) && r.bonus in TIER_BONUS_CHOICES)
      .sort((a, b) => a.level - b.level);
    await (await this.#feature()).settings.set("tiers", clean);
  }
}
