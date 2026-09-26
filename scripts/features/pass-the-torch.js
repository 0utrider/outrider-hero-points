import { MODULE_ID, I18N, HERO_POINT_SLUG } from "../constants.js";
import { featureSettings } from "../settings.js";
import { executeAsGM, registerGMHandler } from "../lib/socket.js";

/**
 * Pass the Torch: a player gives one of their Hero Points to an allied
 * character. The transfer runs on the active GM's client (players can't update
 * actors they don't own) and is announced in chat.
 *
 * Entry points: Token HUD button, and the macro API
 *   game.modules.get("outrider-hero-points").api.passTheTorch(actor?)
 */
export const id = "passTheTorch";
const I18N_KEY = "PassTheTorch";

const settings = featureSettings(id, I18N_KEY);
const t = (key) => `${I18N}.Features.${I18N_KEY}.${key}`;
const loc = (key, data) => (data ? game.i18n.format(t(key), data) : game.i18n.localize(t(key)));
const esc = (s) => foundry.utils.escapeHTML?.(String(s)) ?? String(s);

export function init() {
  settings.register("enabled", { type: Boolean, default: false });
  settings.register("hudButton", { type: Boolean, default: true });
  registerGMHandler("passTheTorch", gmTransfer);
  game.modules.get(MODULE_ID).api.passTheTorch = passTheTorch;
}

export function ready() {
  Hooks.on("renderTokenHUD", onRenderTokenHUD);
}

// @system-coupling: actor.getResource / updateResource and actor.isAllyOf are PF2e actor APIs.
const heroPoints = (actor) => actor?.getResource?.(HERO_POINT_SLUG) ?? null;

/** Characters allied with `giver` that can hold Hero Points (excluding giver). */
function eligibleRecipients(giver) {
  return game.actors
    .filter((a) => a.type === "character" && a.id !== giver.id && heroPoints(a) && giver.isAllyOf?.(a))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function defaultGiver() {
  const controlled = canvas?.tokens?.controlled?.map((tk) => tk.actor).find((a) => a?.isOwner);
  return controlled ?? game.user.character ?? null;
}

/** Player-side: pick a recipient, then ask the GM to move the point. */
export async function passTheTorch(giver = defaultGiver()) {
  if (!settings.get("enabled")) return ui.notifications.warn(loc("Disabled"));
  if (!giver?.isOwner) return ui.notifications.warn(loc("NoGiver"));

  const own = heroPoints(giver);
  if (!own || own.value < 1) return ui.notifications.warn(loc("NoPoints", { name: giver.name }));

  const allies = eligibleRecipients(giver);
  const canReceive = (a) => heroPoints(a).value < heroPoints(a).max;
  if (!allies.some(canReceive)) return ui.notifications.warn(loc("NoAllies"));

  const options = allies
    .map((a) => {
      const hp = heroPoints(a);
      const full = hp.value >= hp.max;
      return `<option value="${a.uuid}"${full ? " disabled" : ""}>${esc(a.name)} (${hp.value}/${hp.max})${full ? ` ${loc("Full")}` : ""}</option>`;
    })
    .join("");

  const recipientUuid = await foundry.applications.api.DialogV2.wait({
    window: { title: loc("DialogTitle"), icon: "fa-solid fa-fire-flame-curved" },
    content: `
      <p>${loc("DialogText", { name: esc(giver.name), value: own.value })}</p>
      <div class="form-group">
        <label>${loc("Recipient")}</label>
        <select name="recipient">${options}</select>
      </div>`,
    buttons: [
      {
        action: "give",
        label: loc("Give"),
        icon: "fa-solid fa-fire-flame-curved",
        default: true,
        callback: (_event, button) => button.form.elements.recipient.value,
      },
      { action: "cancel", label: loc("Cancel"), icon: "fa-solid fa-xmark" },
    ],
    rejectClose: false,
  });
  if (!recipientUuid || recipientUuid === "cancel") return;

  const sent = await executeAsGM("passTheTorch", { giverUuid: giver.uuid, recipientUuid });
  if (!sent) ui.notifications.warn(loc("NoGM"));
}

/** GM-side: validate and move one Hero Point, then announce. */
async function gmTransfer({ giverUuid, recipientUuid }, userId) {
  const user = game.users.get(userId);
  const giver = await fromUuid(giverUuid);
  const recipient = await fromUuid(recipientUuid);
  const fail = (key, data) =>
    ChatMessage.create({ content: loc(key, data), whisper: [userId], speaker: { alias: loc("Title") } });

  if (!settings.get("enabled")) return fail("Disabled");
  if (!giver || !recipient || giver.uuid === recipient.uuid) return fail("Invalid");
  if (!user || !giver.testUserPermission(user, "OWNER")) return fail("NotOwner", { name: giver.name });
  if (!giver.isAllyOf?.(recipient)) return fail("NotAllied", { name: recipient.name });

  const g = heroPoints(giver);
  const r = heroPoints(recipient);
  if (!g || g.value < 1) return fail("NoPoints", { name: giver.name });
  if (!r || r.value >= r.max) return fail("RecipientFull", { name: recipient.name });

  await giver.updateResource(HERO_POINT_SLUG, g.value - 1);
  await recipient.updateResource(HERO_POINT_SLUG, r.value + 1);

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: giver }),
    content: `<div class="ohp-torch">
        <i class="fa-solid fa-fire-flame-curved"></i>
        <span>${loc("Announce", { giver: `<strong>${esc(giver.name)}</strong>`, recipient: `<strong>${esc(recipient.name)}</strong>` })}</span>
      </div>`,
    flags: { [MODULE_ID]: { passTheTorch: { giverUuid, recipientUuid } } },
  });
}

/** Adds a torch button to the Token HUD for owned characters with Hero Points. */
function onRenderTokenHUD(hud, html) {
  if (!settings.get("enabled") || !settings.get("hudButton")) return;
  const actor = hud.document?.actor ?? hud.object?.actor;
  if (!actor?.isOwner || actor.type !== "character" || !heroPoints(actor)) return;

  const root = html instanceof HTMLElement ? html : html[0];
  const column = root?.querySelector(".col.right");
  if (!column || column.querySelector(".ohp-torch-hud")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "control-icon ohp-torch-hud";
  button.dataset.tooltip = loc("Title");
  button.innerHTML = `<i class="fa-solid fa-fire-flame-curved"></i>`;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    passTheTorch(actor);
  });
  column.append(button);
}
