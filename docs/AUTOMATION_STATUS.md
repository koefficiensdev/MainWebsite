# Automatizálás – 2026-08-30

> Frissítés – 2026-09-02: az új gyártás, marketing, foglalás, értesítések és mentés aktuális állapotát az [AUTONOMOUS_READINESS.md](AUTONOMOUS_READINESS.md) tartalmazza. Az alábbi korábbi tesztszámok és hiánylisták az akkori állapotra vonatkoznak.

2026-09-02 frissítés: az igényfogadás, ügyféltér, adminfeldolgozás és verziózott előnézet–jóváhagyás–átadás új állapota: [WORKSPACE_FLOW.md](WORKSPACE_FLOW.md). Ez felülírja az ügyféltér hiányáról szóló korábbi megjegyzéseket.

## Aktuális prioritás: OVEXI fő rendelési folyamat – 2026-08-31

A foglalási bemutató a felhasználó kérésére háttérbe került, kiemelt adminlinkje eltávolítva. A kosár tárolási hibakezelése, ismétlődésmentes igénybeküldés és munkamenet-helyreállítás, megmaradó visszaigazolás, egyértelmű fizetés nélküli feliratok és cookie-beállítások javítva. Részletek: [MAIN_FLOW.md](MAIN_FLOW.md). A Stripe/Billingo aktiválás, tényleges teljesítés és teljes éles folyamatpróba továbbra is hátravan; nem állítjuk, hogy az egész rendszer hibátlan vagy kész.

## Legújabb fejlesztés: foglalási felület és napi naptár – 2026-08-31

Elkészült a vendégoldali időpontválasztó és a vállalkozói napi nézet, külön jelölt, kizárólag kitalált adatokkal működő bemutatóval: `/foglalas?demo=1`. Próbarögzítés, lemondás, áthelyezés, teljesítve/nem jelent meg, tervezett érték. Külön éles Firebase adapter készült, de zárt; éles foglalási backend továbbra sincs telepítve. Új szerveroldali nyilvános konfiguráció, tulajdonosi áthelyezés/státusz és idempotens műveletnapló készült helyben. Stripe, Billingo, hirdető levelek küldése és pénzügyi kapcsolók változatlanok. Nem kész éles foglalási termék: értesítések, tenantbeállítás, App Check, tartós kéréshelyreállítás és teljes integrációs teszt még kell. Részletek: [BOOKING_INTERFACE.md](BOOKING_INTERFACE.md).

## Legfrissebb korrekció – 2026-08-31

A 12 korábban importált lead elkülönítve a minősített kutatási eredményektől, megőrzött adatokkal. Alapértelmezett szigorú honlap nélküli célzás, külön honlapmegújítási mód, rövid ellenőrzött magyar levélsablon, egyedi jóváhagyás–küldés gomb. 87 helyi teszt sikeres. Az új próbakutatás 0 megfelelő jelöltet adott: új használható leadlista nincs igazolva. Levél nem ment ki. A korábbi 1 piszkozat minősítés nélküli, nem küldhető. A Stripe/Billingo/foglalás állapota változatlan. Részletes korlátok: [OUTREACH_APPROVAL.md](OUTREACH_APPROVAL.md).

## Legfrissebb: jóváhagyásos ügyfélszerzés telepítve – 2026-08-31

A korábbi admin-only naplót felváltotta a működő kutatás → szerkeszthető piszkozat → címzettenkénti ellenőrzés → adminjóváhagyás → SMTP folyamat. A kapcsolt válaszokat read-only Rackhost IMAP szinkron hozza be 15 percenként vagy kézi gombbal. Hat új outreach funkció, hosting és Firestore-szabályok telepítve. A Stripe/Billingo/foglalás éles kapui változatlanok. 75/75 teszt sikeres; éles admin fájlok hash-e egyezik; öt callable és három gyűjtemény névtelen elérése HTTP 403. Egy valós kutatás 1 piszkozatot készített 0,024137 USD becsült API-költséggel. Külső levél nem ment ki. Valódi jóváhagyás–küldés–válasz end-to-end próba és nagyobb volumen előtt DMARC/DKIM ellenőrzés még szükséges. Részletek és korlátok: [OUTREACH_APPROVAL.md](OUTREACH_APPROVAL.md).

## Helyi folytatás – 2026-08-31

### Adminfelület – külön közzétett frissítés

A kibővített `/admin` 2026-08-31-én telepítve: összefoglaló, rendelések, szolgáltatói hirdetőe-mail-napló, kézi kampány- és költségnyilvántartás, leadek, automatizálási/gyártási napló. A meglévő `info@ovexi.hu` adminfiók használható. 63/63 helyi teszt sikeres; az új védett gyűjtemények névtelen lekérdezése HTTP 403. Hosting és szabályok frissültek, a foglalási backend és az éles pénzügyi kapcsolók nem. Automatikus hirdetés-/levél-/költségszinkron továbbra sincs bekötve. Részletek: [ADMIN_DASHBOARD.md](ADMIN_DASHBOARD.md).

### Foglalómotor – továbbra is csak helyben

A tulajdonos az okmányos/szelfis ellenőrzést későbbre halasztotta. Ezért az éles Stripe/Billingo aktiválás helyett a foglalási backend fejlesztése folytatódott. Négy új, alapértelmezetten zárt callable végpont készült helyben: szabad időpontok, foglalás, lemondás és tulajdonosi napi lista. Szakmafüggetlen szolgáltatások, nyitvatartás/szabadság, Budapest időzóna, napon belüli tranzakciós ütközésvédelem, idempotencia és lemondási titok. Nincs cloud deploy vagy költést indító művelet; a korábbi éles állapot változatlan. A kliensfelületek és a foglalási levelek még nincsenek készen. Részletek: [BOOKING_BACKEND.md](BOOKING_BACKEND.md).

Ellenőrzés: 53/53 automatikus teszt sikeres, ebből 23 új foglalási teszt; frontend- és backend-szintaktikai ellenőrzés sikeres. Az ütközésvédelem tranzakciós tesztadatbázison ellenőrizve; valódi Firestore-emulátoros teszt még hátravan.

Fiókellenőrzés 2026-09-03-i frissítése: a Stripe aktiválása kész. A Billingo API Basic előfizetés aktív; a V3 írási kulcs Firebase Secret Managerbe került, és a 330792-es számlatömböt az API visszaigazolta. A külön NAV technikai felhasználó és az Online Számla összekötés elkészült. A NAV ONYA a 2026-04-20-tól érvényes alanyi adómentességet igazolta. A Billingo háttérintegráció engedélyezett; az ügyfélfizetés külön kapuja zárt. A tulajdonos az igény-visszaigazoló e-mail megérkezését visszaigazolta; a spam-besorolásról nincs külön ellenőrzési eredmény.

## Korábban telepített állapot

Az oldal jelenlegi üzemi módja fizetés nélküli igényfogadás. Nem teljesen automata szolgáltatás. A 69 990 Ft-os foglalós csomag fejlesztés alatt áll; az egyszeri ár nem tartalmaz örök ingyenes üzemeltetést. Domain, tárhely, e-mail és külső rendszerek költségeit fizetés előtt írásban kell rendezni.

## A hat munkaterület

1. **Rendelés:** szerveroldali validáció, rögzített katalógusárak, ismételt beküldés elleni védelem és óránkénti kéréskorlát elkészült. A publikált oldal ehhez kapcsolódik. Próba: `OVX-MTG4GWQ2-21C261`, „OVEXI technikai teszt – nem ügyfél”; ismételt beküldés ugyanazt az azonosítót adta, pénzmozgás és e-mail nélkül.
2. **Fizetés:** Checkout-előkészítés, HUF egységkezelés, összeg/mód/aláírás-ellenőrzés és ismételt Stripe-események kezelése megírva. A fizetés tiltott; éles fiók és teljes tesztkártyás próba még kell. A teszt webhookon a kódban szereplő nyolc eseményt mind engedélyezni kell; a korábbi beállítás csak `checkout.session.completed` eseményt tartalmazott.
3. **Számlázás:** Billingo-partner és számla létrehozása, külön küldése, visszakeresése és bizonytalan válasz utáni védelem megírva és izoláltan tesztelve. A `BILLINGO_API_KEY`, a 330792-es számlatömb és a NAV Online Számla kapcsolat beállítva; könyvelői dátumellenőrzés és ellenőrzött próbaszámla kell. Valódi Billingo-számla még nem készült.
4. **E-mailek:** `SMTP_PASS` beállítva, SMTP-hitelesítés sikeres, `SMTP_ENABLED=true` telepítve. Az éles igénybeküldési folyamat saját címre küldött próbája: `OVX-MTG572QZ-3C0755`, címzett `info@ovexi.hu`; az e-mail-feladat első próbálkozásra `done`, a levelezőszerver elfogadta a küldést. A postafiókbeli megérkezést és spam-besorolást a tulajdonosnak még ellenőriznie kell. SPF rekord létezik; DKIM ellenőrzése és a hiányzó DMARC rendezése hátravan. A fizetéshez kapcsolódó levélágak a fizetés tiltása miatt még nem voltak végponttól végpontig tesztelve. Az admin e-mailes hibariasztása még nincs kész; hibák jelenleg az admin felületen láthatók.
5. **Havi modulok:** a vegyes kosár egyszeri tétele csak az első számlán szerepel; megújulás, fizetési hiba és lemondás eseménykezelése megírva. Ügyfélportál admin végpont előkészítve; Stripe-portál beállítás és ügyfél számára biztonságos hozzáférés még kell. Csomagváltás/proráció külön kézi ellenőrzést igényel.
6. **Biztonság, ellenőrzés, üzem:** pénzügyi mezők kliensoldali írása tiltva; hibák és újrapróbálások admin listája elkészült. 29 automatikus teszt sikeres. Érvénytelen igény és aláíratlan webhook a telepített végponton HTTP 400. Mobilos kosár/brief megnyitása és rejtett sütisáv javítva. Teljes fizetés→számla→e-mail próba, jogosultsági integrációs tesztek, mentés/visszaállítás és riasztási próba még szükséges.

## Biztonságos indulási sorrend

- Titkok csak Firebase Secret Managerbe: `tools/configure-secrets.ps1`; ne chatbe, böngészőoldali kódba vagy Gitbe kerüljenek.
- SMTP hitelesítés és saját címre küldött kézbesítési próba. Billingo jogosultság, számlatömb és számlázási dátumszabályok ellenőrzése.
- A titkok telepítési kötését a `functions/integration-config.js` rögzíti, nem a futásidejű környezeti kapcsolók. SMTP titokkötés bekapcsolva. Billingo-kulcs létrehozása után a `billingoSecretConfigured` beállítást is engedélyezni és a megfelelő függvényeket újratelepíteni kell.
- Stripe tesztkörnyezetben először egy valóban teljesíthető termék engedélyezése. Egyszeri, havi és vegyes kosár; megismételt webhook; sikertelen megújulás; lemondás; jogosulatlan kérés tesztje.
- Billingo tesztfizetésből soha nem készít valódi számlát. Külön, jóváhagyott számlázási próba és pénzügyi egyeztetés szükséges.
- Élesítés csak a szolgáltatás tényleges elkészülte, átadás/lemondás feltételei, adatkezelés és fizetési szolgáltató aktiválása után.
- A foglalómotor és a vevői kezelőfelület megvalósítása külön hátralévő fejlesztés: `BOOKING_PACKAGE.md`.

## Költségek

Nulla állandó példány; legfeljebb két példány függvényenként. Újrapróbálás 30 percenként, kis adagokban, legfeljebb öt automatikus próbával. A Cloud Run buildképek hét nap után automatikusan törlődnek a költségcsökkentő szabály szerint; ez nem törli az ügyféladatokat vagy a helyi forráskódot.

A korábbi 25 USD felhőriasztás és 10 USD AI-keret nem közös, garantált 50 EUR költési plafon. Az árfolyam, külső szolgáltatók, levélküldés és számlázó díja is számít. A Billingo API Basic havi csomag bruttó 3 035 Ft-ért aktív. Az ügyfélfizetés és automatikus AI-gyártás továbbra is tiltva marad.

## SMTP-bekötés ellenőrzése

- 30 automatikus teszt sikeres, beleértve a titokkötések telepítéskori ellenőrzését.
- `tools/check-smtp.cjs`: helyi, küldés nélküli hitelesítési próba; jelszót kizárólag memóriában kezel.
- `tools/check-order-email.cjs`: egy ismert kérés rendelési és levélfeladat-állapotának olvasása, ügyféladatok kiírása nélkül.
- A korábbi `OVX-MTG4GWQ2-21C261` technikai próba fiktív címére nem küldünk levelet: feladata `blocked`, ok `synthetic_test_no_delivery`; a rendelés megmaradt.
