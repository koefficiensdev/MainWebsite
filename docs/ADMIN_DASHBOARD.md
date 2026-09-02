# OVEXI működési központ

> Frissítés – 2026-09-02: az új gyártás, marketing, foglalás, értesítések és mentés aktuális állapotát az [AUTONOMOUS_READINESS.md](AUTONOMOUS_READINESS.md) tartalmazza. Az alábbi korábbi tesztszámok és hiánylisták az akkori állapotra vonatkoznak.

Frissítés: a Hirdető e-mailek nézetben már működő céges kutatás, szerkeszthető piszkozat, címzettenként dokumentált jóváhagyásos küldés és kapcsolt IMAP-válaszlista van. Ez felülírja az alábbi eredeti admin-kiadás „nincs megkeresésküldő” megjegyzéseit. Lásd [OUTREACH_APPROVAL.md](OUTREACH_APPROVAL.md).

2026-08-31. Útvonal: `/admin`. A meglévő Firebase Auth + Firestore rendszer marad; nincs tárhelyváltás, új fizetős szolgáltató vagy Sites-migráció. Az `info@ovexi.hu` meglévő Firebase-fiók aktív, `admin: true`, jelszavas belépéssel; ezt csak olvasással ellenőriztük, jelszót nem kezeltünk és jogosultságot nem módosítottunk.

## Hét munkanézet

- Összefoglaló: beérkezett rendelések, aktív munkák, igazolt hirdető e-mailek, ellenőrizendő feladatok, leadfolyamat, utolsó rendelések és adatforrások.
- Rendelések: teljes brief, csomagok, egyszeri/havi díj, kapcsolat, fizetés/számlaállapot, munkastátusz kezelése. A fizetést nem lehet kézzel igazolni.
- Hirdető e-mailek: címzett, cég, tárgy, tartalom, kampány, szolgáltatói azonosító, küldés/kézbesítés/válasz/hiba és CSV-export. Egyelőre nincs megkeresésküldő bekötve; az üres napló nem mutat fiktív kiküldést.
- Hirdetések: kézzel rögzíthető és szerkeszthető csatorna, céloldal, kreatív szöveg, havi tervezett keret és nyilvántartott állapot. Ez nem indít vagy szüneteltet valódi hirdetést.
- Pénzügyek: ténylegesen felmerült költségek kézi rögzítése/javítása, kampányhoz rendelése, HUF/EUR/USD külön összesítése; fizetési napló. Költségkeret nem költés, rendelési igény nem bevétel. A visszaigazolt éles fizetések összege a tárolt fizetési terméksorokból származik, visszatérítések levonása nélkül.
- Leadek: relevancia és kapcsolat, kézi státusz, tiltólista, AI-tervezet készítése külön megerősítéssel. A tervezetkészítés API-költséggel járhat, és nem küldi el a levelet.
- Automatizálás: fizetési, számlázási és e-mail-feladatok, hibák, újrapróbálás; AI-gyártási tervek. Újrapróbálás előtt a kapcsolódó rendelést be kell tölteni, és a felhasználó megerősíti a tényleges küldési/számlázási műveletet. A fiktív című tesztfeladatnak nincs újrapróbálási gombja.

## Az összesítések határai

Minden forrás az első 200, `createdAt` szerint legújabb dokumentummal indul. A 201. dokumentum jelzi, ha van további oldal; a listák alján régebbi rekordok tölthetők be. A kijelzett összesítések **csak a betöltött adatokra** vonatkoznak, ezt a felület minden nézetben kiírja. `createdAt` nélküli régi rekordok Firestore-rendezésnél kimaradnak; ilyen adatot migrálni kell.

Az időszak a rendelések/leadek/fizetések/feladatok létrehozására, a levelek küldésére (ennek hiányában létrehozására), költségeknél a felmerülés napjára vonatkozik. Budapest időzóna, mindkét dátumhatár beleszámít. A kampánylista minden betöltött kampányt mutat, a kapcsolt költéseket a szűrt időszakra összesíti. A figyelmet igénylő feladatok az összes betöltött időszakból szerepelnek. A szöveges keresés csak a részletes listákat szűri, nem a KPI-ket.

Nincs folyamatos lekérdezés/polling: betöltéskor és kifejezett frissítéskor olvasunk. Egy forrás hibája a többi listát nem blokkolja; a forráshibát és a hiányos összesítést külön jelezzük. Kijelentkezéskor az ügyféloldali adatok és szerkesztőűrlapok törlődnek; korábban indult lekérések nem tölthetik vissza őket.

## Adatok és hozzáférés

Meglévő források: `orders`, `leads`, `commerce_tasks`, `payments`, `production_jobs`.

Új gyűjtemények:

- `campaigns`: `name`, `platform`, `destination`, `creative`, `budgetMinor`, `currency: HUF`, `budgetPeriod: monthly`, `status`, `source: manual`, `createdAt`, `updatedAt`, `createdBy`.
- `expenses`: `label`, `amountMinor`, `currency`, `incurredOn`, `category`, `campaignId`, `source: manual`, `createdAt`, `updatedAt`, `createdBy`.
- `outreach_messages`: csak szerver írhatja. A későbbi küldőrendszer szerződése: `companyName`, `recipient`, `subject`, `body`, `campaignId`, `status`, `source: provider`, `provider`, `providerMessageId`, `createdAt`, `sentAt`, opcionális `deliveredAt`, `repliedAt`, `errorCode`. Egy dokumentum egy küldemény aktuális állapota, stabil szolgáltatói azonosítóval; webhook-ismétlés nem hozhat létre második küldeményt.

A „kiküldött” mérőszámhoz kötelező: `source: provider`, `providerMessageId`, `sentAt`, valamint sent/delivered/replied/bounced státusz. A bounced levél küldési kísérletként számít, nem kézbesítésként. A szolgáltatótól származó válaszadat bekötése még külön feladat. A lead „contacted” kézi állapota sosem növeli a hitelesített küldési számot.

A kampány és költség csak adminnak olvasható/írható, mező-, típus-, érték- és forrásellenőrzéssel. A kampányok/költségek törlése tiltott; a hibás kézi tételek javíthatók. A pénzértékek századrész-egészben tárolódnak (`amountMinor`, `budgetMinor`), pénznemek között nincs hallgatólagos átváltás. A küldési bizonyítékok kliensoldali írása adminnak is tiltott. Az adminoldal HTML-je nyilvános belépőhéj, de az üzleti adatokhoz Firebase-adminjog kell.

## Ellenőrzés és hátralévő integráció

63 helyi automatikus teszt sikeres, köztük 10 új adminmodell/szerkezet/hozzáférési szabály szerkezeti teszt. Szintaktikai ellenőrzés sikeres. Böngészős interakciós/mobilos QA és valódi Firestore jogosultsági teszt ebben a munkában nem futott; a szabályok éles feltöltésekor a Firebase fordító ellenőrzése szükséges.

Még bekötendő: megkeresésküldő és szolgáltatói események/válaszok; Meta/Google Ads riport és költésszinkron; Firebase/OpenAI/Billingo tényleges költségimport; pénzügyi visszatérítések egyeztetése. Egyelőre a kézi költségnyilvántartás működik. Az 50 EUR/hó célkeret nem garantált, minden szolgáltatóra közös kemény plafon.

A frissítéshez csak Hosting és Firestore-szabály telepíthető. A Functions telepítése nem része ennek a változásnak, így az előző munkában létrehozott, kikapcsolt foglalási végpontok sem kerülnek ki véletlenül.

## Közzététel eredménye

A Hosting és Firestore-szabály telepítése 2026-08-31-én sikeres. A szabályfájl a Firebase fordítóján hibamentesen átment. Az `https://ovexi.hu/admin`, az admin JavaScript, a számítási modul és a stíluslap HTTP 200 válaszú, SHA-256 alapján pontosan megegyezik a validált helyi változattal. Névtelen REST-lekérdezés az `orders`, `campaigns`, `expenses`, `outreach_messages` gyűjteményekre egyaránt HTTP 403; üzleti adat nem olvasható bejelentkezés nélkül. Bejelentkezett böngészős használati próba még a tulajdonos belépése után szükséges. Nem történt kampányindítás, hirdető e-mail-küldés, új előfizetés vagy Functions-deploy.
