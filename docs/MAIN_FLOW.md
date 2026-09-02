# OVEXI fő folyamat – elsőbbség a bemutató helyett

> Frissítés – 2026-09-02: az új gyártás, marketing, foglalás, értesítések és mentés aktuális állapotát az [AUTONOMOUS_READINESS.md](AUTONOMOUS_READINESS.md) tartalmazza. Az alábbi korábbi tesztszámok és hiánylisták az akkori állapotra vonatkoznak.

2026-09-02 frissítés: az igényfogadás, ügyféltér, adminfeldolgozás és verziózott előnézet–jóváhagyás–átadás új állapota: [WORKSPACE_FLOW.md](WORKSPACE_FLOW.md). Ez felülírja az ügyféltér hiányáról szóló korábbi megjegyzéseket.

2026-08-31. A felhasználó kérésére a foglalási bemutató fejlesztése háttérbe került. A kiemelt adminlink megszűnt, a már meglévő bemutató és háttérkód megmarad. A fő feladat az OVEXI saját csomagválasztási, igénybeküldési, visszaigazolási és feldolgozási útjának megbízhatósága.

## Javított hibák

- A localStorage elérése vagy írása nem szakítja meg a kosár használatát, és nem jelenti sikertelennek a már szerver által visszaigazolt igényt.
- A kosár helyreállítása kizárja az ismeretlen és ismételt tételeket; kategóriánként egy havi/website csomag, külön egyszeri kiegészítők. A marketing és karbantartás önállóan is kérhető.
- A beküldési adatok kizárólag a szerver által várt mezőket tartalmazzák. Nincs közvetlen Firestore order-írásra visszaesés, kliensoldali ár vagy kitalált rendelési azonosító használata.
- Bizonytalan beküldésnél ugyanaz az azonosító és változatlan adatcsomag marad a sessionStorage-ban. Frissítéskor ez tölti vissza a lezárt űrlapot. A gomb nem új igényt készít. Párhuzamos kattintás kizárt.
- Siker után a függő adatcsomag törlődik; az oldalon és a munkamenetben csak az igényazonosító és e-mail-küldési sor jelzése marad. Szerver-visszaigazolás az elsődleges, tárolási hiba nem változtatja azt sikertelenséggé.
- Az igény visszaigazolása nem állít fizetést, teljesítést vagy kézbesítést. A szerver által adott azonosító szerepel a kapcsolati levél tárgyában és az analitikában.
- A beküldési gomb egyértelműen fizetés nélküli igényt jelez. A csomagleírás mellett és a folyamatnál is szerepel az előzetes egyeztetés. Nincs kész ügyfél-státuszportált színlelő szöveg.
- A kosár hátterének késleltetett bezárása nem rejti el az újranyitott kosár hátterét. Modális nézetben billentyűzetes fókuszkorlátozás és visszaadás.
- A cookie-választás újranyitható a láblécből; a műszaki tájékoztató a tényleges tárolást írja le. Az analitika nem küld teljes query/fragment URL-t, és a banner nem nevezi anonimnak az azonosítóval gyűjtött eseményeket.

## Korlátok

Ellenőrzés: 107 helyi automatikus teszt sikeres, szintaktikai ellenőrzés sikeres. Hosting közzétéve. A főoldal, fő script, új beküldési modul, stíluslap, adminoldal és cookie-tájékoztató HTTP 200 választ és helyi SHA-256 egyezést adott. Backend, fizetési kapcsolók és ügyféladatbázis nem módosultak ebben a javításban.

Nem teljes fizetés–számla–átadás rendszer. A Stripe/Billingo kapui és a szolgáltatások teljesíthetőségi feltételei változatlanok. Valódi igényt, e-mailt, számlát vagy fizetést ez a javítás nem indít tesztként. A tesztek a kliens állapotgépét és a szerver validációs szerződését ellenőrzik; nem helyettesítik az éles végponttól végpontig és a mobilos böngészőtesztet.

A sessionStorage lehet letiltva vagy törölhető, ezért az automatikus helyreállítás nem garantált minden böngészőben. Ilyenkor ugyanazon lap memóriájában lehet újrapróbálni; lapelhagyási figyelmeztetés van. A tartós rendelési rekord továbbra is Firestore-ban él, nem a böngészőben. Tárolás törlése után bizonytalan igényt előbb az üzemeltetővel kell ellenőrizni. Régi, még nyitott böngészőlapok a frissítés előtt továbbra is a korábbi kódot használhatják.

A cookie-tájékoztató technikai pontosítása nem jogi megfelelőségi tanúsítás. A végleges jogi és számlázási ellenőrzés továbbra is külön teendő.
