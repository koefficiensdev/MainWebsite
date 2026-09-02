# Foglalási felület és vállalkozói naptár – 2026-08-31

> Frissítés – 2026-09-02: az új gyártás, marketing, foglalás, értesítések és mentés aktuális állapotát az [AUTONOMOUS_READINESS.md](AUTONOMOUS_READINESS.md) tartalmazza. Az alábbi korábbi tesztszámok és hiánylisták az akkori állapotra vonatkoznak.

## Elkészült fejlesztési egység

- `/foglalas?demo=1`: kifejezetten jelölt, kizárólag kitalált próbaadatokat kezelő bemutató. Szolgáltatás, nap és szabad kezdés választása, összefoglaló, próbafoglalás, lemondás, napi lista, áthelyezés, teljesítve/nem jelent meg státusz.
- A bemutatóban név és e-mail csak előre megadott próbaadat lehet; nincs szervermentés, levél, fizetés, Analytics vagy AI-hívás. Újratöltéskor új bemutató indul. A két nézet egy lapon ugyanazt az ideiglenes mintaállapotot használja. Nem ügyféladatbázis.
- Az admin oldalsávjából elérhető a bemutató. A főoldal fejlesztés alatt álló csomagja és fizetési tiltása nem változik.
- Külön éles Firebase adapter készült, de `BOOKING_CONFIG.liveEnabled=false` és az App Check nyilvános kulcsa nincs beállítva. A `/foglalas` nem próbál éles backendhez fordulni. Nincs automatikus visszaesés bemutatóadatokra sikertelen éles betöltés esetén.
- Az éles adapter a foglalómotor callable műveleteihez kapcsolódik. A tulajdonosi adatokat a szerver `ownerUid` ellenőrzése védi; a kliens nézetváltása nem jogosultság.
- Bizonytalan foglalási válasznál ugyanaz a kérésazonosító és lemondási titok marad a memóriában az újrapróbáláshoz. Lapelhagyási figyelmeztetés van. Tartós helyreállítás és a lemondási link e-mailes átadása még szükséges az éles megnyitás előtt.
- A lemondási link feldolgozása csak URL-fragmentumból, annak azonnali eltávolításával történik; a lap megnyitása nem mond le semmit. Explicit gomb indítja a műveletet.

## Új háttérműveletek – továbbra is helyben, zárt kapu mögött

- `bookingPublicConfig`: csak nyilvános szolgáltatásadatokat, időkorlátokat, cégnevet és HTTPS adatkezelési linket ad vissza. Nincs tulajdonosazonosító vagy vendégadat.
- `bookingOwnerMoveSlots`: a saját, még jövőbeli foglalás eredeti időtartamával keres új helyet, saját foglalást nem számol idegen ütközésnek.
- `bookingOwnerMove`: egy tranzakcióban foglal új helyet, szabadít régit és frissít foglalást. Ütközés esetén a régi hely megmarad. Eredeti ár/időtartam megőrzése; a régi lemondási titok továbbra is használható.
- `bookingOwnerStatus`: jövőbeli lemondás, kezdés utáni nem jelent meg, befejezés utáni teljesítve. Ezek nem fizetési státuszok. A tervezett érték nem könyvelt bevétel.
- Tulajdonosi módosításnál kérésazonosító, tárolt eredmény és `expectedRevision` akadályozza meg az ismételt végrehajtást és régi adatok felülírását. Közvetlen kliensírás továbbra is tiltott.

## Még hátravan

Ellenőrzés és publikálás: 98/98 helyi automatikus teszt sikeres, frontend/backend szintaktikai ellenőrzés sikeres. A bemutató és az adminlink hostingra feltöltve; a hét ellenőrzött éles oldal/modulfájl HTTP 200 választ és helyi SHA-256 egyezést adott. Csak hosting telepítés történt; a foglalási háttérműveletek továbbra is helyben vannak. Éles foglalás, küldés és fizetés nem történt.

1. Éles vállalkozói naptár létrehozása, tulajdonos-hozzárendelés, szolgáltatás-/nyitvatartás-beállító felület és a meglévő foglalásokkal ütköző változtatások kezelése.
2. App Check regisztráció és vendéghitelesítés konfigurálása, valódi Firebase jogosultság- és párhuzamossági teszt, teljes mobilos böngészőteszt.
3. Foglalási, módosítási, lemondási és emlékeztető levelek, újrapróbálás és hibariasztás; biztonságos lemondási link kézbesítése.
4. Frissítés/crash után helyreállítható foglalási kérés és visszaigazolás. Ezt a mostani memóriabeli újrapróbálás nem helyettesíti.
5. Ügyfél által jóváhagyott adatkezelés, megőrzési szabályok, mentés/visszaállítás és költségmérés. A műveletnapló takarítása még nincs automatizálva.
6. Backend telepítése, konfiguráció és éles kapcsoló csak az előző ellenőrzések után. A kapcsoló puszta átállítása nem elég.

A bemutató frontendjének és a szervernek külön időpontszámítása van. A bemutató hétvégén is 9–17 óra közötti mintanyitvatartást használ; nem igazolja az éles szerver teljes helyességét. A szerver időzóna-, nyitvatartás- és tranzakciótesztjei külön futnak. Böngészős vizuális ellenőrzés nem történt; forrás-, egység- és HTTP-ellenőrzés készült.
