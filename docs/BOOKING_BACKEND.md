# Foglalási backend – helyi fejlesztői változat

> Frissítés – 2026-09-02: az új gyártás, marketing, foglalás, értesítések és mentés aktuális állapotát az [AUTONOMOUS_READINESS.md](AUTONOMOUS_READINESS.md) tartalmazza. Az alábbi korábbi tesztszámok és hiánylisták az akkori állapotra vonatkoznak.

Frissítés: a vendég- és tulajdonosi felület, valamint négy új háttérművelet elkészült fejlesztési változatban. A bemutató nem éles backend. Az alábbi eredeti leírás korábbi állapot; a friss állapot és további kapuk: [BOOKING_INTERFACE.md](BOOKING_INTERFACE.md).

2026-08-31. **Nincs telepítve vagy bekapcsolva. Nem kész ügyféltermék.** Stripe-, Billingo-, AI- és SMTP-hozzáférés nélkül tesztelhető.

## Elkészült

- Egy vállalkozás, egy közös naptár, szakmától független szolgáltatáslista. A hajvágás, műköröm és autódiagnosztika csak a tesztekben szereplő példák.
- Szerveroldali ár/időtartam; heti nyitvatartás több időablakkal, ebédszünet és dátum szerinti kivételek/szabadság.
- Europe/Budapest időzóna, előzetes foglalási idő és legfeljebb 180 napos időhorizont. UTC időpontok az adatátvitelben.
- Foglalás és napi foglaltság egyetlen Firestore-tranzakcióban. Minden szolgáltatás ugyanazt a napi dokumentumot módosítja, így a párhuzamos ütköző kérések újraértékelődnek.
- Ismételt beküldés azonos UUID-val nem hoz létre második foglalást. Eltérő tartalomhoz ugyanaz az UUID nem használható.
- Lemondás 32 bájtos titokkal; az adatbázis csak a SHA-256 lenyomatot tárolja. Lemondás és az időpont felszabadítása egy tranzakció. Lemondott kérés ismétlése nem támasztja fel a foglalást.
- Nyilvános elérhetőségi válaszban kizárólag kezdési és zárási időpontok. Vendégadatokat csak a naptár `ownerUid` tulajdonosa kérdezhet le.
- A callable végpontok alapértelmezetten zártak; App Check és Firebase Auth szükséges (vendégnél majd anonymous auth). Óránként közös korlát: 60 kérés/felhasználó, 300/vállalkozás, 1000/rendszer. A korlátozott kérések is járhatnak felhőköltséggel; ez nem számlázási plafon.

## Fájlok és tesztelés

- `functions/booking-domain.js`: bemenetek, konfiguráció, időpontszámítás.
- `functions/booking-service.js`: Firestore-tranzakciók, elkülönített olvasás, foglalás/lemondás.
- `functions/booking.js`: négy callable végpont, App Check, auth, kéréskorlát, hibaválaszok.
- `functions/test/booking.test.js`: időzóna-, foglalási-, adatvédelmi- és tranzakciós szimulációs tesztek.

```powershell
npm test
npm run check
npm --prefix functions run check
```

A tranzakciós tesztadatbázis olvasási verziókat és konfliktus utáni újrapróbálást szimulál. **Nem helyettesíti a valódi Firestore-emulátoros/integrációs párhuzamossági és jogosultságtesztet.** Helyi Java futtatókörnyezetet az ellenőrzés nem talált a PATH-on; emulátoros teszt ebben a munkafázisban nem futott.

## Konfiguráció (csak fejlesztői minta)

Nincs létrehozva éles vállalkozás vagy naptár. A `booking_tenants/{tenantId}` dokumentumot csak megbízható szerveroldali üzemeltető hozhatja létre. `ownerUid` nem fogadható el vendégkérésből. A meglévő Firestore-szabályok minden közvetlen kliensműveletet tiltanak ezeken a gyűjteményeken.

```json
{
  "enabled": false,
  "ownerUid": "VALODI_FIREBASE_AUTH_UID",
  "privacyVersion": "JOVAHAGYOTT_TAJEKOZTATO_VERZIOJA",
  "timeZone": "Europe/Budapest",
  "slotStepMinutes": 15,
  "minNoticeMinutes": 120,
  "horizonDays": 60,
  "services": [
    { "id": "consultation", "name": "Konzultáció", "durationMinutes": 30, "priceHuf": 6000, "active": true }
  ],
  "weeklyHours": {
    "1": [["09:00", "12:00"], ["13:00", "17:00"]],
    "2": [["09:00", "17:00"]]
  },
  "dateOverrides": { "2026-12-25": [] }
}
```

Hétköznapok: 0 vasárnap, 1 hétfő, …, 6 szombat. Nem megadott nap: zárva. Dátumkivétel teljesen helyettesíti az adott napi heti nyitvatartást. Éjszakába átnyúló nyitvatartást két napra kell bontani; egy foglalás nem nyúlhat át másik naptári napra. Szolgáltatás 5–480 perc, ötperces egységekben. Szünetekhez külön nyitvatartási ablakok használhatók.

Óraátállítás: a nem létező és kétszer előforduló helyi időpontok, valamint az ezeken áthaladó foglalások az első változatban nem foglalhatók. Nem választunk a két azonos helyi idő közül találomra.

## API-szerződés a későbbi felülethez

Mindegyik hívás csak `BOOKING_ENABLED=true` után működhet; a kapcsolót **most nem állítottuk be**. Bekapcsolása önmagában sem teszi kiadásra alkalmassá a modult.

- `bookingAvailability`: `{tenantId, serviceId, date}` → `{timeZone, slots: [{start, end}]}`. Dátum `YYYY-MM-DD`, időpontok teljes UTC ISO-formátumban.
- `bookingCreate`: az előző mezők és `{start, requestId, cancellationToken, name, email, privacyAccepted: true}`. A kliens `crypto.randomUUID()` kérésazonosítót és `crypto.getRandomValues(new Uint8Array(32))` titkot készít, utóbbit 64 kisbetűs hex karakterré alakítva. Azonos próbálkozásnál **mindkettőt** meg kell őrizni, bizonytalan hálózati válasz után is. Ár és időtartam a szerver konfigurációjából származik.
- `bookingCancel`: `{tenantId, bookingId, cancellationToken}` → `{bookingId, status: "cancelled"}`. Megkezdett foglalás már nem mondható le így. A lemondás működhet kikapcsolt vállalkozásnál is, de a globális kapcsolónak és a hitelesítésnek aktívnak kell lennie.
- `bookingOwnerDay`: `{tenantId, date}`; kizárólag a bejelentkezett naptártulajdonosnak. Legfeljebb 500 napi rekord, efölött nem teljes listát színlel, hanem hibát jelez. Lapozás még szükséges nagy terheléshez.

A lemondási titkot nem szabad naplózni, analitikába, lekérdezési paraméterbe vagy harmadik félnek küldeni. A későbbi kliensben URL-fragmentum és explicit megerősítő POST/callable művelet használható, nem automatikus GET-alapú lemondás. A foglalásoknál a `notificationStatus: "not_implemented"` azt jelzi, hogy **még nincs foglalási e-mail**. A visszaadott `confirmed` a naptárban rögzített időpontot jelenti, nem levélkézbesítést vagy fizetést.

## Még szükséges kiadás előtt

1. Vendégoldali szolgáltatás/időpontválasztó és tulajdonosi naptár; App Check + vendéghitelesítés bekötése. Valódi tenant-provisionálás és jogosultságtesztek.
2. E-mail-kimeneti sor, biztonságos lemondási link kézbesítése, hibák/újrapróbálás és tulajdonosi riasztás. A rendszer nem ígérhet levélküldést addig.
3. Foglalás áthelyezése egy tranzakcióban; megjelent/nem jelent meg státusz, nyitvatartás-módosítás és a már meglévő foglalások kezelése.
4. Firestore-emulátoros versenyhelyzetek, App Check/auth és közvetlen kliens-hozzáférés tesztje; mobilos végponttól végpontig próba.
5. Adatkezelési tájékoztató és megőrzési szabályok, mentés/visszaállítás; a `booking_limits.expiresAt` mezőhöz később TTL-szabály (jelenleg nincs telepítve).
6. Terhelés/költségmérés, ügyféllel elfogadott üzemeltetési díjak. Több munkatárs/helyszín és fizetési integráció külön bővítés.

A weboldalon a „fejlesztés alatt” jelzés és a 69 990 Ft-os csomag fizetési tiltása változatlan. Nem történt cloud deploy, Stripe-módosítás, e-mail-küldés vagy számlakibocsátás.
