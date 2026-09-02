# OVEXI – önállóan elvégzett munka és indulási feltételek

Állapot: 2026-09-02. Ez a dokumentum az ezen a napon korábban írt státuszlapoknál frissebb. A rendszer most ellenőrizhető ügyfélanyagokat készít; az üzleti aktiválások és az ügyfél jóváhagyása külön lépések.

Frissítés: az egyedi tervezésre, egyszerűbb adminra, foglalásra és SEO-ra vonatkozó aktuális állapotot a [BESPOKE_PRODUCTION.md](BESPOKE_PRODUCTION.md) tartalmazza. Az alábbi tesztszámok és kiadási bizonyítékok a korábbi kiadás történeti adatai.

## A kilenc munkaterület

| Terület | Megvalósult | A következő éles lépés feltétele |
| --- | --- | --- |
| 1. Weboldal-készítés | Briefből tényleges, szerkeszthető HTML; többoldalas alap; verziózott előnézet, letöltés, ügyfél-jóváhagyás és visszavonható előnézeti link. | Végleges ügyféltartalom, képek, domain/tárhely és jóváhagyás. Egyedi webshop vagy további funkció a specifikáció ismeretében készíthető. |
| 2. Marketing | Csomag szerinti AI-szövegek, posztok, blog- és hírlevéltervezetek; tartalomnaptár CSV; 1080×1080 és 1080×1350 SVG/PNG kreatívok; ZIP-export. AI-eredmény a szerveren visszakereshető. | Márkaanyagok, tényszerű ellenőrzés, csatornafiókok és közzétételi jóváhagyás. Hirdetésindítás és havi automatikus publikálás nincs bekapcsolva. |
| 3. Karbantartás | HTTPS/HTTP állapot, átirányítások, tanúsítvány lejárata; privát címek tiltása; mérési előzmény; állapotváltozási riasztás; javítási kérelmek az ügyféltérben. | Valódi ügyféloldalak és módosítási hozzáférés. Egy külső oldal hibáját URL alapján nem lehet automatikusan kijavítani. |
| 4. Levelezés | Tartós értesítési sor, ütköző dolgozók kizárása, korlátozott újrapróbálás, bizonytalan kézbesítés elkülönítése; adminnapló; foglalási és belső értesítések. SMTP hitelesítés és saját korábbi levél DKIM ellenőrizve. | Rackhost-belépés a hiányzó DMARC beállításához; éles levelek kézbesítésének megfigyelése. |
| 5. Ügyfélszerzés | Ellenőrzött forrásokhoz kötött kutatás és szerkeszthető megkeresés; jóváhagyási kapu; kizárási okok és üres eredmény naplózása; költségkeret. | A szigorú „nincs honlap” próbakutatás 0 minősített találatot adott. Más célzásról vagy konkrét cégekről döntés, küldéshez címzettenként jóváhagyás kell. |
| 6. Foglalás | Ütközésbiztos foglalás, lemondás, áthelyezés, tulajdonosi naptár; mentett függő műveletek; visszaigazolás helyreállítása; letölthető lemondási link; szolgáltatás/nyitvatartás adminisztráció; értesítési sor. | Vállalkozás és tulajdonos, szolgáltatások/árak/nyitvatartás, adatkezelés, App Check és vendéghitelesítés, ezek után aktiválás. |
| 7. Biztonság, mentés, költség | Titkosított Firestore-mentés; 173 dokumentum visszaállítása külön emulátorba és visszaolvasásos ellenőrzése; lejárt hozzáférések takarítása; jogosultságtesztek; titokellenőrzés; meglévő AI-keret betartása. | Géptől független mentési hely vagy fizetős felügyelt mentés és megőrzési idő kiválasztása. |
| 8. Pénzügyi előkészítés | Stripe/Billingo kód és eseménykezelés; duplikációvédelem; teszt-webhook mind a 8 szükséges eseménnyel; aktiválási állapotellenőrző eszköz. | Stripe élő fiók aktiválása, személyazonosítás/bankszámla; Billingo API-hozzáférés, számlatömb és számlázási adatok. |
| 9. Kiadás és dokumentáció | Egységes szintaktikai és titokellenőrzés, GitHub CI, privát fájlok kizárása, emulátoros ellenőrzés, telepítési és átadási leírás. | Helyi kiadási ág: `codex/automation-readiness-20260902`. Külső Git-publikálás nem történt; a kiadási állapot lent szerepel. |

## Használat

Admin → Automatizálás → Weboldal és marketinganyag készítése. Válassz rendelést, szükség szerint készíts AI-szövegeket, majd ellenőrizd a tartalmat és készítsd el az anyagokat. A tartalom címkézett mezőkkel szerkeszthető; JSON-szerkesztés nem szükséges. Az AI-naplóban a korábban elkészült szöveg új hívás nélkül betölthető. A csomag a weboldalt, kreatívokat és tartalomnaptárt egy ZIP-ben adja át.

Az elkészült változatból külön küldhető weboldal- vagy marketingelőnézet ügyfél-jóváhagyásra. A meglévő munkafolyamat megőrzi a brief és az előnézet verzióját. A végső átadás meglévő fizetési és jóváhagyási feltételei megmaradnak. A generálás önmagában nem jelent fizetést vagy teljesítést.

Ugyanitt a Foglalási naptár beállítása alatt naptár készíthető és módosítható. A mintanyitvatartást és szolgáltatást a tényleges adatokkal kell kitölteni. Már létező felhasználó e-mail-címével választható tulajdonos; üresen az új naptár saját fiókhoz tartozik, meglévő naptár tulajdonosa megmarad. A mentés nem kapcsolja be a publikus foglalórendszert. A régi foglalások ára, időtartama és időpontja beállításmódosításkor megmarad; egy bezárt nap meglévő vendégeit külön kell egyeztetni.

## Ellenőrzött bizonyítékok

- 136/136 automatizált teszt, kihagyás nélkül; 89 JavaScript-fájl szintaktikailag rendben.
- 18/18 Firestore-emulátoros teszt, beleértve versengő foglalást, jogosultságot, értesítési sort és ügyféltér-hozzáférést.
- Titkosított mentés: 173 dokumentum, 10 gyűjteménynév; mind a 173 dokumentum visszaállítva és visszaolvasva külön helyi tesztadatbázisban.
- Böngészőben elkészült tényleges HTML/marketingcsomag; ZIP letöltés: 21 sértetlen bejegyzés, köztük 8 megfelelő méretű PNG. Asztali weboldal és marketingelőnézet vizuálisan ellenőrizve. A generált oldal 360 képpont széles tartalomterületen is ellenőrizve, vízszintes túlcsordulás nélkül.
- Helyi foglalás létrejött és megjelent a tulajdonosi naptárban; újratöltéskor megmaradt a visszaigazolás. Áthelyezési szabadidőpont-lista ellenőrizve. A teljes mobilos és valódi vállalkozói próba az aktiválás része.
- Egy valódi, kitalált vállalkozási adatokkal futtatott AI-minta: 8 poszt, 16 SVG, becsült modellköltség 0,009306 USD. Nem készült belőle éles ügyfélrendelés és nem történt közzététel.
- SMTP-belépés sikeres, új tesztlevél nélkül. Egy korábbi saját tesztlevél DKIM-aláírása és ellenőrzése sikeres; a tényleges DNS-szelektor közzétett.
- SPF létezik; DMARC nem található. A `default` DKIM-szelektor hiánya nem jelent DKIM-hibát: más szelektor használatos.
- A Stripe teszt-webhookja engedélyezett, nincs hiányzó szükséges esemény. Élő pénzmozgás nem történt.
- Leadkutatás: 0 minősített találat, 0 kiküldött megkeresés. A régi listából nem készült új találat.

## Műszaki korlátok

Az AI szövege tervezet: a mintában is volt további tényszerű ellenőrzést igénylő megfogalmazás. A darabszám-ellenőrzés nem igazolja az állítások helyességét. Az aktuális egyedi generátor a csomaghoz hiányzó anyagokat a manifestben felsorolja. Saját fotózás, hirdetési fiókok bekötése és működő egyedi webshop külön feladat.

Az előnézeti link birtokosa láthatja a tervezetet. A link visszavonható, automatikus lejárata nincs; keresőindexelés és gyorsítótárazás tiltott. Lezárás után az admin vonja vissza a szükségtelen előnézeteket.

Az értesítési sor „szolgáltató átvette” állapota nem postaládába érkezési igazolás. SMTP-időtúllépés vagy megszakadt munkafolyamat bizonytalan eredményét nem küldi újra automatikusan. A foglalási lemondási titok a böngészőben és a letölthető linkben van; az értesítő levél jelenleg a szolgáltató elérhetőségét adja meg, nem a titkos lemondási linket. Időzített foglalási emlékeztető még nincs; igényét és időzítését a szolgáltatóval kell rögzíteni.

A helyi mentés lapozott élő olvasás, nem atomi időpont-pillanatkép. AES-256-GCM titkosítást és az aktuális Windows-profilhoz kötött DPAPI-kulcsvédelmet használ. Ugyanennek a gépnek/profilnak az elvesztése ellen nem teljes megoldás. Ütemezett távoli mentés nincs aktiválva. Üzleti dokumentumot, számlát és hozzájárulást nem töröl a napi takarítás; a végleges megőrzési rend üzleti döntés.

## Konkrét közreműködés tőled

1. **Stripe:** a fiók által kért személyes/céges ellenőrzés és bankszámla; az élő fizetés jóváhagyása. A most elérhető API-kulcs tesztkulcs.
2. **Billingo:** API-t tartalmazó fiók, céges/számlázási beállítások, API-kulcs és számlatömb. Titkot Secret Managerbe kell tenni, nem Gitbe vagy nyilvános fájlba.
3. **Rackhost:** bejelentkezés. Előkészített DNS-javaslat: `_dmarc` TXT, `v=DMARC1; p=none; rua=mailto:info@ovexi.hu`. Ez megfigyelő mód; szigorúbb elutasítás csak kézbesítési adatok után indokolt.
4. **Első valódi szolgáltatás/ügyfél:** név, publikus elérhetőség, szolgáltatások, vállalt tartalom, árak/nyitvatartás, jogszerűen használható képek/logó, domain és hozzáférések; végleges tartalom/jogi tájékoztatók jóváhagyása.
5. **Marketing és kutatás:** kívánt célcsoport, megengedett célzás, csatornafiókok, hirdetési keret és címzettenként küldési jóváhagyás.
6. **Mentés:** független mentési hely és megőrzési idő, illetve új fizetős szolgáltatás költségének eldöntése.

Ezek után a szükséges bekötéseket és a valódi teljes folyamat próbáját lehet folytatni. Nem a programozást kell átvenned: a fiókokhoz, üzleti vállalásokhoz és engedélyekhez szükséges adatokat kell megadnod.

## Parancsok és privát bizonyítékok

`npm run check`, `npm test`, `npm run check:release`, `npm run readiness`.

Mentés: `npm run backup -- create`; ellenőrzés: `npm run backup -- verify ops/backups/<fajl>.ovxb`. Visszaállítás kizárólag helyi emulátorba engedélyezett: `npm run backup -- restore-emulator ops/backups/<fajl>.ovxb`, beállított `FIRESTORE_EMULATOR_HOST=127.0.0.1:8189` mellett.

A `tools/firebase-client.cjs` a már bejelentkezett Firebase CLI-t használja; kulcsot nem ír a naplóba. A `readiness` csak olvas. A `configure-stripe-test.cjs --apply` kizárólag a megadott projekt meglévő teszt-webhookját egészíti ki. A mentések és eredménynaplók az ignorált `ops/` alatt vannak; Firebase Hostingra sem kerülnek.

Kiadási bizonyítékok: `ops/test-results.txt`, `ops/emulator-results.txt`, `ops/deploy-backend-20260902.txt`, `ops/readiness.json`. Telepítés utáni ellenőrzés eredménye a kiadási kiegészítésben szerepel.

## Kiadási kiegészítés – 2026-09-02 13:00 (Budapest)

A Firestore-szabályok, indexek, az összes exportált háttérfunkció és a Firebase Hosting telepítése sikeres az `ovexi-6ef38` projekten. Tíz éles oldal/modul HTTP 200 és pontos helyi SHA-256 egyezés. Öt új adminművelet névtelen hívása 403; a publikus foglalás App Check nélküli hívása 401; érvénytelen előnézet 404. Az ellenőrzött privát `ops`, `functions`, `tools` útvonalak 404-et adnak. Részletek: `ops/live-check.json`, újraellenőrzés: `node tools/check-live.cjs`.

A Stripe/Billingo fizetés, az automatikus rendelésből indított AI-gyártás és a publikus foglalás aktiválása továbbra is kikapcsolva. Az admin által indított tartalomkészítés a meglévő AI-költségkeretben használható. Az éles pénzmozgás és az ügyféloldalak publikálása az üzleti feltételek után következhet.
