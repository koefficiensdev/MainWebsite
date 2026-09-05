"use strict";
const { products } = require("./catalog");
const { PROMO_LABEL } = require("./promo-domain");
const { text } = require("./outreach-domain");

const ORDER_URL = "https://ovexi.hu/?category=website#csomagok";
const PROMO_CODE = "OVEXI1EV";

function safeProposal(company) {
  const description = String(company.companyDescription || "").toLowerCase();
  const supplied = company.proposal || {};
  const defaults = /aut[oó].*(szerviz|szerel)|gumiszerviz|karossz[eé]ria/.test(description) ? {
    customerRequest: "az érdeklődő megadhatja a jármű típusát, a tapasztalt hibát és a számára megfelelő időpontokat",
    businessControl: "a beérkező megkereséseket egy áttekinthető felületen kezelhetik, majd elfogadhatják, módosítást kérhetnek vagy másik időpontot javasolhatnak",
    workflowBenefit: "kevesebb adatot kell telefonon újra bekérni, és könnyebb követni, melyik ügyfél vár még válaszra"
  } : /fodr[aá]sz|kozmetik|sz[eé]ps[eé]g|massz[aá]zs|körmös|barber/.test(description) ? {
    customerRequest: "az érdeklődő kiválaszthatja a szolgáltatást, megadhatja a kívánt időpontot és a szükséges rövid információkat",
    businessControl: "a kéréseket egy helyen láthatják, és csak az Önök jóváhagyása után válik véglegessé az időpont",
    workflowBenefit: "kevesebb egyeztetés marad üzenetekben és telefonhívásokban, miközben átláthatóbbá válik a napi beosztás"
  } : {
    customerRequest: "az érdeklődő strukturáltan megadhatja, milyen szolgáltatásra van szüksége és hogyan lehet vele kapcsolatba lépni",
    businessControl: "a beérkező igényeket egy áttekinthető felületen kezelhetik, pontosíthatják, elfogadhatják vagy elutasíthatják",
    workflowBenefit: "kevesebb információt kell újra bekérni, és könnyebb követni a még válaszra váró megkereséseket"
  };
  const read = (key, max) => {
    try { return text(supplied[key], max, 20); } catch { return defaults[key]; }
  };
  return { customerRequest: read("customerRequest", 360), businessControl: read("businessControl", 420), workflowBenefit: read("workflowBenefit", 320) };
}

// Research proposes the sector-specific workflow. The application owns the
// price, scope, promotion, approval semantics and call to action.
function composeProspectDraft(company, qualification) {
  const name = text(company.companyName, 160);
  const price = new Intl.NumberFormat("hu-HU").format(products.find(product => product.id === "website-business").price);
  const refresh = qualification.websiteStatus === "outdated";
  const proposal = safeProposal(company);
  const observation = refresh
    ? `A ${name} jelenlegi weboldalának megújításával kapcsolatban keresem Önöket.`
    : `A ${name} elérhetőségét egy nyilvános üzleti adatlapon találtam meg, önálló weboldal viszont nem jelent meg az ellenőrző keresésekben. Ha van működő honlapjuk, kérem, tekintsék tárgytalannak a levelet.`;
  const body = `Jó napot kívánok!\n\n${observation}\n\nAz OVEXI olyan céges weboldalt és hozzá illő alap üzleti rendszert készít, amely nemcsak bemutatja a vállalkozást, hanem a megkeresések kezelésében is segít.\n\nAz Önök működéséhez készülő megoldásban:\n• ${proposal.customerRequest};\n• ${proposal.businessControl};\n• ${proposal.workflowBenefit}.\n\nAz automatikus üzenet kizárólag a megkeresés beérkezését igazolja. Időpont, ajánlat vagy munka csak az Önök jóváhagyása után válik véglegessé.\n\nA Céges weboldal csomag egyszeri díja ${price} Ft. Legfeljebb 6 aloldalt és egy, a brief alapján kiválasztott alap üzleti modult tartalmaz. Fizetés után egy rövid felmérésben egyeztetjük a jelenlegi munkafolyamatot, majd írásban rögzítjük a megvalósítandó funkciókat.\n\nAz ${PROMO_CODE} promókóddal ${PROMO_LABEL.charAt(0).toLowerCase()}${PROMO_LABEL.slice(1)} A promóció a fizetendő ${price} Ft-os fejlesztési díjat nem csökkenti.\n\nCsomag megtekintése és megrendelése:\n${ORDER_URL}`;
  return {
    subject: `${name} – rendezettebb ügyfélkezelés saját weboldallal`.slice(0, 160),
    offer: `Céges weboldal legfeljebb 6 aloldallal és 1 alap üzleti modullal: ${price} Ft egyszeri díj. ${PROMO_CODE}: ${PROMO_LABEL}`,
    body
  };
}

module.exports = { composeProspectDraft, safeProposal, ORDER_URL, PROMO_CODE };
