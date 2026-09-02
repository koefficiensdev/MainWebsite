# Egyedi tervezés és az indulás előtti kiegészítések

Állapot: 2026-09-02. Ez a kiegészítés felülírja az AUTONOMOUS_READINESS.md korábbi generálási és JSON-szerkesztési leírását.

## Rögzített ügyféligény

Minden ügyfél weboldala és marketinganyaga önálló tervezési feladat. Saját oldalszerkezet, tipográfia, vizuális irány és kreatívkompozíció készül a vállalkozás tényleges adataiból. A nagyobb tokenhasználat elfogadott. Előre rögzített oldal- vagy kreatívsablon újraszínezése nem elfogadható. Közös jogosultságkezelés, biztonság, export és technikai keret használható; ez nem jelent közös megjelenést.

## Megvalósítás

- A kézi és a később aktiválható automatikus gyártás a `functions/bespoke-production.js` modult használja. A modell a teljes HTML-t, CSS-t és SVG-kompozíciókat megírja. Mentett koncepció és tervezési döntések tartoznak minden munkához. A közelmúltban mentett azonos CSS elutasításra kerül; ez nem helyettesíti a vizuális egyediség ellenőrzését.
- Hiányos vagy megszakadt generálás nem kap sablonos helyettesítést. A kérésazonosító tartósan naplózott; az ismétlés nem indít második modellhívást. A folyamatban lévő kérés és a bizonytalanul megszakadt munka külön állapot.
- A modell válasza streamelve érkezik; a kézi végpont legfeljebb 15 percig futhat. A meglévő havi 10 USD AI-keret megmaradt. Tervezésenként 2 USD előzetes foglalás történik, majd a visszaigazolt tokenhasználat alapján elszámolás. A bizonytalan hálózati hibák foglalása ellenőrzésig megmarad.
- A generált kód tisztításon megy át: nincs script, külső erőforrás, adatküldő űrlap vagy tetszőleges külső hivatkozás. Az előnézet nem indexelhető, és a hozzáférése visszavonható.
- A régi determinisztikus generátor csak korábbi formátumok és tesztek miatt maradt meg; az aktív gyártási belépési pontok és a mintakészítő már egyedi generálást használnak.

## Egyszerűbb kezelés

Az adminban szolgáltatások, posztok, blogok, hírlevelek, heti nyitvatartás és eltérő napok címkézett mezőkkel szerkeszthetők. A rekordazonosítók megmaradnak. Rendelésváltás kiüríti a másik ügyfél szerkesztett tartalmát. A naptártulajdonos meglévő felhasználó e-mail-címével választható; új fiók nem keletkezik automatikusan.

A foglalás mentett visszaigazolása a szerver aktuális állapotára frissíthető. Az áthelyezés és a lemondás megerősítő párbeszédablakot kapott. A lemondási link megnyitásakor az aktuális időpont és állapot látszik; már lemondott időpont nem mondható le ismét. A titokkal védett állapotlekérdezés nem ad vissza nevet vagy e-mail-címet.

## SEO

Két külön megírt útmutató készült: `/weboldal-keszites-arak` és `/weboldal-karbantartas-mit-tartalmaz`. Saját cím, leírás, canonical, belső hivatkozások és sitemap-bejegyzés tartozik hozzájuk. A szolgáltatásoldalak főcíme és szövege is pontosabb lett. A változás nem jelent azonnali Google-indexelést vagy helyezést.

## Ellenőrzés és korlátok

- 140/140 automatizált teszt sikeres, 94 JavaScript-fájl szintaktikailag rendben.
- 18/18 meglévő Firestore-emulátoros teszt sikeres; 173 dokumentum helyi visszaállítása és visszaolvasása ellenőrizve. Az új egyedi generálás négy tesztje memóriabeli tesztadatbázist használ.
- Két kitalált márkához valódi modellhívással külön HTML/CSS és SVG-kreatív készült. Asztali és mobilos szemrevételezés megtörtént; a hangstúdió kontrasztját új tervezéssel, a papírműhely mobilos túllógását célzott CSS-javítással korrigáltuk. Nem jött létre éles ügyfélrendelés, fizetés vagy kiküldött levél.
- A három befejezett mintagenerálás becsült összköltsége 0,126784 USD. Két korábbi bizonytalan kapcsolatmegszakadás miatt további összesen 4 USD foglalás ellenőrzésig megmaradt; ez nem igazolt tényleges költés. A 10 USD havi plafon nem változott.
- Böngészőben a posztmezők, naptárszerkesztés, foglalás áthelyezése, aktuális állapotának frissítése és lemondása kitalált helyi adatokkal ellenőrizve.

A generálás ellenőrizhető statikus tervezetet készít. A tényállítások, a teljes szöveghűség, a kontraszt és az elrendezés munkánkénti ellenőrzést igényelnek. A minta is mutatott a briefnél konkrétabb, ellenőrizendő megfogalmazást. Webshop, foglalási integráció és ügyfélspecifikus működés külön megvalósítás. A végleges publikálás az ügyfél-jóváhagyás után következik.

A Stripe, Billingo, automatikus rendelésgyártás és publikus foglalás aktiválási kapcsolói változatlanok. Új titok, bankszámla vagy ügyfél-hozzáférés nem került a kódba.

Privát bizonyítékok: `ops/test-results-bespoke.txt`, `ops/emulator-bespoke.txt`, `ops/bespoke-1/`, `ops/bespoke-2/`, `ops/deploy-bespoke-backend.txt`, `ops/deploy-bespoke-hosting.txt`, `ops/live-check.json`. Az `ops/` nincs Gitben vagy a nyilvános tárhelyen.

## Éles kiadás

2026-09-02: öt érintett háttérfunkció és a Firebase Hosting telepítése sikeres. 20 éles oldal/modul HTTP 200 és pontos SHA-256 egyezés; jogosulatlan adminhívások 403, App Check nélküli foglalási hívások 401; érvénytelen előnézet és ellenőrzött privát útvonalak 404.
