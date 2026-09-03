"use strict";

const crypto = require("node:crypto");
const { email, text, publicUrl } = require("./outreach-domain");

const ORDER_LABELS = { new:"Új", needs_review:"Egyeztetésre vár", checkout_pending:"Fizetés előkészítése", awaiting_payment:"Fizetésre vár", paid:"Fizetve", in_production:"Készül", review:"Jóváhagyásra vár", completed:"Lezárt", cancelled:"Lemondva" };
const REQUEST_KINDS = { question:"Kérdés", content:"Tartalom / adat", change:"Módosítási kérés", maintenance:"Karbantartási kérés" };
const WORKFLOW_STAGES = ["intake","waiting_customer","ready","preparation","production","review","completed","paused"];
const stageLabels = { intake:"Feldolgozás alatt", waiting_customer:"Ügyféladatokra vár", ready:"Egyeztetve", preparation:"Előkészítés", production:"Készül", review:"Előnézet jóváhagyásra vár", completed:"Átadva", paused:"Szüneteltetve" };
const hash = value => crypto.createHash("sha256").update(String(value)).digest("hex");
const token = () => crypto.randomBytes(32).toString("base64url");

function accessInput(raw) {
  const orderNumber = text(String(raw?.orderNumber || "").toUpperCase(), 60, 8);
  if (!/^OVX-[A-Z0-9-]{8,54}$/.test(orderNumber)) throw new Error("INVALID_ORDER_NUMBER");
  return { orderNumber, email: email(raw?.email) };
}
function requestInput(raw) {
  const kind = String(raw?.kind || "");
  if (!Object.hasOwn(REQUEST_KINDS, kind)) throw new Error("INVALID_KIND");
  const requestId = String(raw?.requestId || "");
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) throw new Error("INVALID_REQUEST_ID");
  return { kind, message: text(raw?.message, 1500, 5), requestId };
}
function workflowFor(order) {
  const ids = Array.isArray(order.itemIds) ? order.itemIds : [];
  const website = ids.some(id => id.startsWith("website-"));
  const marketing = ids.some(id => id.startsWith("marketing-"));
  const maintenance = ids.some(id => id.startsWith("maintenance-") || ["quick-audit", "external-audit"].includes(id));
  const steps = [{ id:"intake", label:"Igény rögzítve", note:"Az igény beérkezett; ez nem fizetés és nem az üzleti tartalom jóváhagyása.", done:true }];
  if (website) steps.push({ id:"site-plan", label:"Oldalstruktúra és tartalom", note:"A szükséges oldalak, szövegek és funkciók előkészítése.", done:false },{ id:"site-build", label:"Weboldal elkészítése", note:"Mobilnézet, funkciók és mérés beállítása.", done:false });
  if (marketing) steps.push({ id:"marketing-plan", label:"Marketinganyagok előkészítése", note:"Tartalom- és kampányterv az elfogadott briefből.", done:false });
  if (maintenance) steps.push({ id:"maintenance-baseline", label:"Karbantartási alapállapot", note:"Hozzáférések és ellenőrzési pontok rögzítése.", done:false });
  steps.push({ id:"customer-review", label:"Ügyfél-jóváhagyás", note:"Publikálás előtt minden ügyfélanyag ellenőrizhető.", done:false },{ id:"delivery", label:"Átadás és indulás", note:"Átadás, dokumentálás és az aktív modulok indítása.", done:false });
  const missing = [];
  if (!String(order.businessDescription || "").trim()) missing.push("vállalkozás bemutatása");
  if (!String(order.targetAudience || "").trim()) missing.push("célközönség");
  if (website && !["existing","domain_only","new","guidance"].includes(String(order.infrastructurePlan || ""))) missing.push("domain- és tárhelyhelyzet");
  if (maintenance && !String(order.currentUrl || "").trim()) missing.push("karbantartandó webcím");
  return {
    version:1, stage:missing.length ? "waiting_customer" : "intake", stageLabel:stageLabels[missing.length ? "waiting_customer" : "intake"],
    steps, missing, nextAction:missing.length ? `Pontosítás szükséges: ${missing.join(", ")}.` : "Az OVEXI ellenőrzi a briefet és jelzi a következő lépést.",
    website, marketing, maintenance, revision:1
  };
}
function maintenanceInput(raw) {
  const label = text(raw?.label, 120, 2);
  const url = publicUrl(raw?.url).href;
  const orderId = String(raw?.orderId || "");
  if (orderId && !/^[a-f0-9]{64}$/.test(orderId)) throw new Error("INVALID_ORDER");
  return { label, url, orderId };
}
function notificationInput(raw) {
  const type = String(raw?.type || "");
  if (!["information_needed","preview_ready","work_completed","maintenance_update"].includes(type)) throw new Error("INVALID_NOTIFICATION");
  const orderId = String(raw?.orderId || "");
  if (!/^[a-f0-9]{64}$/.test(orderId)) throw new Error("INVALID_ORDER");
  return { orderId, type, note: raw?.note ? text(raw.note, 1000, 1) : "" };
}
function mutationInput(raw) {
  if (!/^[a-f0-9]{64}$/.test(raw?.orderId || "") || !/^[a-f0-9-]{36}$/i.test(raw?.requestId || "")) throw new Error("INVALID_MUTATION");
  return { orderId:raw.orderId, requestId:raw.requestId };
}
function revisionInput(raw) {
  if (!Number.isSafeInteger(raw?.revision) || raw.revision < 1) throw new Error("INVALID_REVISION");
  return raw.revision;
}
function previewInput(raw) {
  return { title:text(raw?.title,120,3), url:publicUrl(raw?.url).href, note:raw?.note ? text(raw.note,2000,1) : "" };
}
function deliveryInput(raw) {
  if (!Array.isArray(raw?.files) || raw.files.length < 1 || raw.files.length > 8) throw new Error("INVALID_FILES");
  return { instructions:text(raw?.instructions,4000,10), files:raw.files.map(file=>({label:text(file?.label,120,2),url:publicUrl(file?.url).href})) };
}
function briefInput(raw) {
  const result = {};
  for (const [key,min,max] of [["businessDescription",10,1200],["targetAudience",0,300],["currentUrl",0,300],["notes",0,1600]]) {
    if (typeof raw?.[key] !== "string") throw new Error("INVALID_BRIEF");
    result[key] = raw[key].trim();
    if (result[key].length < min || result[key].length > max) throw new Error("INVALID_BRIEF");
  }
  if (result.currentUrl) result.currentUrl = publicUrl(result.currentUrl).href;
  return result;
}
module.exports = { ORDER_LABELS, REQUEST_KINDS, WORKFLOW_STAGES, stageLabels, hash, token, accessInput, requestInput, workflowFor, maintenanceInput, notificationInput, mutationInput, revisionInput, previewInput, deliveryInput, briefInput };
