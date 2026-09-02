# OVEXI működési rendszer

> Frissítés – 2026-09-02: az új gyártás, marketing, foglalás, értesítések és mentés aktuális állapotát az [AUTONOMOUS_READINESS.md](AUTONOMOUS_READINESS.md) tartalmazza. Az alábbi korábbi tesztszámok és hiánylisták az akkori állapotra vonatkoznak.

## Rendelési folyamat

1. A látogató kiválasztja a weboldal-, marketing-, karbantartási vagy egyszeri csomagot.
2. A kosár csak egy aktív weboldal-, marketing- és karbantartási szintet enged, az egyszeri csomagok kombinálhatók.
3. A briefet a `submitOrder` szerveroldali végpont ellenőrzi; az árakat saját katalógusból számolja, az ismételt beküldést összevonja, a kéréseket korlátozza. Közvetlen böngészős rendelésírás tiltott.
4. Alapállapotban `needs_review` igény keletkezik, fizetés nélkül. A `qualified` kézi státusz önmagában nem indít fizetést vagy e-mailt.
5. Csak az engedélyezett, elkészült csomagok és bekapcsolt fizetés esetén készül Stripe Checkout, amelyre a böngésző átirányít. A foglalós Céges weboldal külön szerveroldali fizetési tiltás alatt marad.
6. Aláírás- és összegellenőrzött Stripe esemény rögzíti a fizetést. A számla és az értesítés külön tartós feladatsorba kerül; sikertelen számlázás nem látszik sikeresnek.
7. Az AI teljesítési terv meglévő alapja csak `AI_PRODUCTION_ENABLED=true` mellett indulhat. Jelenleg tiltott; a terv nem elkészült weboldal és nem működő foglalórendszer.
8. A végleges tartalmak és weboldalak csak admin- és ügyféljóváhagyás után publikálhatók.

## Rendelésstátuszok

- `new`: új, még nem ellenőrzött rendelés
- `needs_review`: igény rögzítve, egyeztetés vagy elkészült szolgáltatás szükséges
- `qualified`: admin által ellenőrzött brief, automatikus mellékhatás nélkül
- `checkout_pending`: fizetési oldal előkészítése
- `awaiting_payment`: fizetésre vár
- `paid`: sikeresen fizetve
- `in_production`: készül
- `review`: ügyféljóváhagyásra vár
- `completed`: átadva
- `cancelled`: megszakítva

## Éles konfiguráció

Nem titkos Functions-környezet:

- `ADMIN_EMAIL`
- `EMAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `OPENAI_MODEL`
- `BILLINGO_BLOCK_ID`
- `BILLINGO_VAT` (például `AAM` vagy `27%`; csak ellenőrzött adózási adat alapján)
- `PAYMENTS_ENABLED`, `PAYMENT_MODE`, `LIVE_PAYMENTS_APPROVED`, `INSTANT_PRODUCT_IDS`
- `SMTP_ENABLED`, `BILLINGO_ENABLED`, `AI_PRODUCTION_ENABLED`

Alapállapot: a funkciókapcsolók tiltottak, `PAYMENT_MODE=test`, az azonnal értékesíthető terméklista üres. Éles fizetéshez az SMTP, Billingo és számlatömb konfigurációja is szükséges. Részletek: [AUTOMATION_STATUS.md](AUTOMATION_STATUS.md).

2026-08-30 frissítés: az éles környezetben `SMTP_ENABLED=true`, a többi kapcsoló továbbra is tiltott. A `functions/integration-config.js` SMTP titokkötése bekapcsolva; a saját címre küldött igény-visszaigazolást a levelezőszerver elfogadta. Postafiókbeli kézbesítés még megerősítendő.

Firebase Secret Manager:

- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SMTP_PASS`
- `BILLINGO_API_KEY` (V3-as, írási jogosultságú kulcs)

Titkot soha ne tegyél böngészőoldali JavaScriptbe vagy Gitbe.

## Költségvédelem

- Google Cloud/Firebase aktív célkeret: havi 25 USD, 50%, 80% és 100% riasztásokkal; ez az 50 EUR-os üzleti plafonnál szigorúbb.
- A költségkeret-riasztás önmagában nem garantál kemény felső korlátot; a számlázási adatok késhetnek.
- A Cloud Functions globális korlátja 2 példány, állandóan futó példány nélkül.
- Az alkalmazás OpenAI-kerete alapértelmezetten havi 10 USD. A keret elfogyásakor új AI-generálás nem indul.
- AI-hívásonként előzetes költségfoglalás és utólagos tokenalapú elszámolás készül a `cost_controls` gyűjteményben.
- A modellárak változásakor az `OPENAI_INPUT_USD_PER_MTOK` és `OPENAI_OUTPUT_USD_PER_MTOK` értékeket frissíteni kell.

## Billingo számlázás

- A vevő nevét, számlázási címét és opcionális adószámát a Stripe Checkout gyűjti be.
- `invoiceStatus: issued`: a Billingo-számla elkészült.
- `invoiceStatus: sent`: a Billingo a számla e-mailes kiküldését visszaigazolta; ez nem kézbesítési nyugta.
- Tesztfizetésnél `test_skipped`: valódi számla nem készül.
- A feladat `blocked` állapota hiányzó konfigurációt, `retry` újrapróbálást, `needs_review` kézi egyeztetést jelent. Az admin az Automatizálási feladatok panelen látja ezeket.
- A számlát stabil `vendor_id` azonosítóval visszakeressük. Bizonytalan létrehozási/küldési kimenetel után nem készül vakon új számla.
- A számla teljesítési és esedékességi dátumának, valamint az időszakos elszámolásnak a könyvelői ellenőrzése élesítés előtti feladat.
- Az integráció szándékosan nem számláz, amíg a `BILLINGO_VAT` nincs hiteles adat alapján beállítva.

## Admin hozzáférés

1. Engedélyezni kell a Firebase Authentication Email/Password szolgáltatót.
2. Létre kell hozni az admin felhasználót.
3. Google Application Default Credentials vagy service account használatával futtatni kell:
   `npm run set-admin -- admin@pelda.hu` a `functions` mappában.
4. Az admin ezután a `/admin` oldalon léphet be.

Az első, helyben tárolt kutatási lista az `ops/first-leads.csv`. Az `ops` mappa szándékosan nincs Gitben. Application Default Credentials beállítása után a `functions` mappából az `npm run import-leads` tölti be az új, még nem létező weboldalú leadeket a CRM-be.

## Kötelező indulás előtti adatok

- szolgáltató hivatalos neve és formája
- székhely
- adószám
- nyilvántartási vagy cégjegyzékszám
- AAM státusz változásának figyelése és szükség esetén az árkommunikáció frissítése
- számlázási szolgáltató
- fizetési szolgáltató éles fiókja
- Rackhost SMTP-fiók és hitelesített feladói cím
- adatfeldolgozók végleges listája

Ezek nélkül a fizetési funkció nem kapcsolható élesre.
