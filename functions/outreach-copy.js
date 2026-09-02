"use strict";
const { products } = require("./catalog");
const { text } = require("./outreach-domain");
// Reviewed Hungarian baseline. Research supplies facts, not unreviewed sales claims.
function composeProspectDraft(company, qualification) {
  const name = text(company.companyName,160);
  const price = new Intl.NumberFormat("hu-HU").format(products.find(p=>p.id==="website-business").price);
  const refresh = qualification.websiteStatus === "outdated";
  const intro = refresh
    ? "Weboldaluk megújításával kapcsolatban keresem Önöket."
    : "A vállalkozásuk nyilvános profilján találtam meg az elérhetőségüket. Saját weboldalt nem találtam hozzá; ha van, elnézést a téves megkeresésért.";
  return {
    subject: `${refresh ? "Weboldal megújítása" : "Saját weboldal"} – ${name}`.slice(0,160),
    offer: `${refresh ? "Céges weboldal megújítása" : "Saját céges weboldal"}: ${price} Ft egyszeri díj. Szolgáltatások, árak és elérhetőségek áttekinthető bemutatása. A fenntartás külön díjas; a részletek előzetes egyeztetéssel.`,
    body: `Jó napot kívánok!\n\nTurai Sándor Attila vagyok, az OVEXI-től. ${intro}\n\nOlyan egyszerű, átlátható oldalt készítenék, ahol egy helyen bemutathatják a szolgáltatásaikat, áraikat és elérhetőségüket. A céges oldal egyszeri díja ${price} Ft, a fenntartás külön fizetendő.\n\nÉrdekelné Önöket egy rövid, a vállalkozásukra szabott javaslat?`
  };
}
module.exports = { composeProspectDraft };
