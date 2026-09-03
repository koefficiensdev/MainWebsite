"use strict";

const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[character]);
// Matches js/catalog.js formatPrice: group every thousand so 5 990 and 69 990 read alike.
const formatHuf = (amount) => `${String(Math.round(Number(amount) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} Ft`;
const INFRASTRUCTURE_LABELS = { existing:"Van domain és tárhely", domain_only:"Van domain, tárhely szükséges", new:"Új domain és tárhely szükséges", guidance:"Segítséget kér a választáshoz" };

const THEME = { bg:"#07111f", card:"#0c192b", panel:"#101f33", line:"#26364a", text:"#c5d1df", soft:"#93a5bb", white:"#ffffff", cyan:"#37e2c2", ink:"#04130f" };

function content(type) {
  if (type === "payment_received") return {
    subject: "Sikeres fizetés", title: "Köszönjük, a fizetés megérkezett",
    lead: "A Stripe visszaigazolta a fizetést, így a megrendelésed feldolgozása elindult.",
    steps: ["A számlát a Billingo külön e-mailben küldi meg erre a címre.", "Egy munkanapon belül jelentkezünk a pontos indulással és a szükséges anyagok listájával.", "A munka állapotát az ügyféltérben bármikor követheted."],
    ctaLabel: "Ügyféltér megnyitása"
  };
  if (type === "payment_failed") return {
    subject: "Sikertelen előfizetési fizetés", title: "Az előfizetési díjat nem sikerült rendezni",
    lead: "A Stripe nem tudta terhelni a megadott fizetési módot, ezért az aktuális időszak díja nyitva maradt.",
    steps: ["Ellenőrizd a kártya fedezetét és lejáratát.", "Új fizetési mód beállításához válaszolj erre a levélre — kártyaadatot e-mailben soha ne küldj.", "A szolgáltatás a rendezésig szünetelhet; erről külön értesítünk."],
    ctaLabel: "Ügyféltér megnyitása"
  };
  if (type === "subscription_cancelled") return {
    subject: "Előfizetés lemondva", title: "Rögzítettük a lemondást",
    lead: "Az előfizetés a már kifizetett szolgáltatási időszak végéig aktív marad, utána nem újul meg.",
    steps: ["További díj nem kerül levonásra.", "Az addig elkészült és átadott anyagok a megállapodás szerint nálad maradnak.", "Ha később újraindítanád, elég egy válaszlevél."],
    ctaLabel: "Ügyféltér megnyitása"
  };
  return {
    subject: "Megérkezett a rendelésed", title: "Megkaptuk a megrendelésedet",
    lead: "Rögzítettük a kiválasztott szolgáltatást és a briefet. Ez a levél a beérkezés visszaigazolása.",
    steps: ["Közvetlenül fizethető csomagnál a teljesítés a sikeres Stripe-fizetés után indul.", "Egyeztetést igénylő csomagnál külön jelentkezünk a vállalt tartalommal és határidővel.", "Az azonosítóddal és e-mail-címeddel az ügyféltérben követheted a folyamatot."],
    ctaLabel: "Ügyféltér megnyitása"
  };
}

function lineItems(order) {
  const products = Array.isArray(order.products) ? order.products : [];
  return products.map((product) => ({ name: String(product.name || "Szolgáltatás"), price: Number(product.price || 0), monthly: product.billing === "monthly" }));
}

function buildCommerceEmail(type, order) {
  const message = content(type);
  const name = String(order.contactName || "").trim() || "Ügyfelünk";
  const number = String(order.orderNumber || "").trim();
  const items = lineItems(order);
  const once = Number(order.onceTotal || 0);
  const monthly = Number(order.monthlyTotal || 0);
  const infrastructure = INFRASTRUCTURE_LABELS[order.infrastructurePlan] || "";
  const promotion = order.promotion?.id === "first-year-domain-hosting" ? order.promotion : null;
  const subject = `${message.subject} – ${number}`;

  const itemLines = items.length
    ? items.map((item) => `  • ${item.name} — ${formatHuf(item.price)}${item.monthly ? " / hó" : ""}`).join("\n")
    : "  • A kiválasztott OVEXI szolgáltatás";
  const totalLines = [once > 0 ? `Egyszeri díj: ${formatHuf(once)}` : null, monthly > 0 ? `Havi díj: ${formatHuf(monthly)} / hó` : null, infrastructure ? `Domain és tárhely: ${infrastructure}` : null, promotion ? `Promókód: ${promotion.code}\nPromóció: ${promotion.label}` : null].filter(Boolean).join("\n");
  const text = `Szia ${name}!\n\n${message.lead}\n\nRendelési azonosító: ${number}\n\nSzolgáltatások:\n${itemLines}\n\n${totalLines}\n\nAmi most következik:\n${message.steps.map((step, index) => `  ${index + 1}. ${step}`).join("\n")}\n\nÜgyféltér: https://ovexi.hu/ugyfelter\nKapcsolat: info@ovexi.hu\n\nOVEXI · Turai Sándor Attila egyéni vállalkozó\nAlanyi adómentes szolgáltatás, az árak fizetendő végösszegek.`;

  const itemRows = (items.length ? items : [{ name: "A kiválasztott OVEXI szolgáltatás", price: 0, monthly: false }]).map((item) => `<tr><td style="padding:10px 0;border-bottom:1px solid ${THEME.line};color:${THEME.text};font-size:15px">${escapeHtml(item.name)}</td><td style="padding:10px 0;border-bottom:1px solid ${THEME.line};color:${THEME.white};font-size:15px;font-weight:700;text-align:right;white-space:nowrap">${escapeHtml(formatHuf(item.price))}${item.monthly ? ' <span style="color:' + THEME.soft + ';font-weight:400">/ hó</span>' : ""}</td></tr>`).join("");
  const totalRows = [
    once > 0 ? `<tr><td style="padding:10px 0 0;color:${THEME.soft};font-size:14px">Egyszeri díj összesen</td><td style="padding:10px 0 0;color:${THEME.white};font-size:17px;font-weight:800;text-align:right;white-space:nowrap">${escapeHtml(formatHuf(once))}</td></tr>` : "",
    monthly > 0 ? `<tr><td style="padding:6px 0 0;color:${THEME.soft};font-size:14px">Havi díj összesen</td><td style="padding:6px 0 0;color:${THEME.white};font-size:17px;font-weight:800;text-align:right;white-space:nowrap">${escapeHtml(formatHuf(monthly))} <span style="color:${THEME.soft};font-weight:400;font-size:14px">/ hó</span></td></tr>` : "",
    infrastructure ? `<tr><td style="padding:10px 0 0;color:${THEME.soft};font-size:14px">Domain és tárhely</td><td style="padding:10px 0 0;color:${THEME.text};font-size:14px;font-weight:600;text-align:right">${escapeHtml(infrastructure)}</td></tr>` : "",
    promotion ? `<tr><td style="padding:10px 0 0;color:${THEME.soft};font-size:14px">Promókód</td><td style="padding:10px 0 0;color:${THEME.cyan};font-size:14px;font-weight:800;text-align:right">${escapeHtml(promotion.code)}</td></tr><tr><td colspan="2" style="padding:8px 0 0;color:${THEME.text};font-size:13px;line-height:1.5">${escapeHtml(promotion.label)}</td></tr>` : ""
  ].join("");
  const stepRows = message.steps.map((step, index) => `<tr><td width="30" valign="top" style="padding:6px 10px 6px 0;color:${THEME.cyan};font-weight:800;font-size:14px">${index + 1}.</td><td valign="top" style="padding:6px 0;color:${THEME.text};font-size:15px;line-height:1.6">${escapeHtml(step)}</td></tr>`).join("");

  const html = `<!doctype html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>` +
`<body style="margin:0;padding:0;background:${THEME.bg};color:${THEME.text};font-family:'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">` +
`<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(message.lead)}</div>` +
`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${THEME.bg}"><tr><td align="center" style="padding:28px 12px">` +
`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:${THEME.card};border:1px solid ${THEME.line};border-radius:18px;overflow:hidden">` +
`<tr><td style="padding:24px 28px;border-bottom:1px solid ${THEME.line}"><span style="font-size:21px;font-weight:800;letter-spacing:5px;color:${THEME.cyan}">OVEXI</span><div style="margin-top:4px;font-size:12px;color:${THEME.soft};letter-spacing:.5px">Weboldal · Marketing · Karbantartás</div></td></tr>` +
`<tr><td style="padding:32px 28px 8px"><div style="font-size:12px;font-weight:700;color:${THEME.cyan};text-transform:uppercase;letter-spacing:1.5px">${escapeHtml(message.subject)}</div>` +
`<h1 style="margin:10px 0 14px;color:${THEME.white};font-size:26px;line-height:1.25;font-weight:800">${escapeHtml(message.title)}</h1>` +
`<p style="margin:0 0 6px;font-size:15px;line-height:1.65;color:${THEME.text}">Szia ${escapeHtml(name)}!</p>` +
`<p style="margin:0;font-size:15px;line-height:1.65;color:${THEME.text}">${escapeHtml(message.lead)}</p></td></tr>` +
`<tr><td style="padding:22px 28px 0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${THEME.panel};border-radius:14px"><tr><td style="padding:18px 20px">` +
`<div style="font-size:12px;color:${THEME.soft};text-transform:uppercase;letter-spacing:1.2px">Rendelési azonosító</div>` +
`<div style="margin-top:3px;color:${THEME.white};font-size:19px;font-weight:800;letter-spacing:1px">${escapeHtml(number)}</div>` +
`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:14px">${itemRows}${totalRows}</table>` +
`</td></tr></table></td></tr>` +
`<tr><td style="padding:26px 28px 0"><div style="font-size:12px;font-weight:700;color:${THEME.cyan};text-transform:uppercase;letter-spacing:1.5px">Ami most következik</div>` +
`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:10px">${stepRows}</table></td></tr>` +
`<tr><td style="padding:26px 28px 32px"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="border-radius:10px;background:${THEME.cyan}">` +
`<a href="https://ovexi.hu/ugyfelter" style="display:inline-block;padding:14px 26px;color:${THEME.ink};text-decoration:none;font-weight:800;font-size:15px">${escapeHtml(message.ctaLabel)}</a>` +
`</td></tr></table></td></tr>` +
`<tr><td style="padding:20px 28px;border-top:1px solid ${THEME.line};color:${THEME.soft};font-size:12px;line-height:1.7">` +
`Kérdésed van? Válaszolj erre a levélre, vagy írj az <a href="mailto:info@ovexi.hu" style="color:${THEME.cyan};text-decoration:none">info@ovexi.hu</a> címre.<br>` +
`<strong style="color:${THEME.text};font-weight:600">OVEXI</strong> · Turai Sándor Attila egyéni vállalkozó · Alanyi adómentes szolgáltatás, az árak fizetendő végösszegek.` +
`</td></tr></table></td></tr></table></body></html>`;

  return { subject, text, html };
}

module.exports = { buildCommerceEmail };
