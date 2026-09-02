# OVEXI indulási ellenőrzőlista

> Frissítés – 2026-09-02: az új gyártás, marketing, foglalás, értesítések és mentés aktuális állapotát az [AUTONOMOUS_READINESS.md](AUTONOMOUS_READINESS.md) tartalmazza. Az alábbi korábbi tesztszámok és hiánylisták az akkori állapotra vonatkoznak.

2026-08-30: a friss oldal és nyolc Cloud Function telepítve. Az aktuális részletes állapot az [AUTOMATION_STATUS.md](AUTOMATION_STATUS.md) fájlban van. Az igényfogadás és e-mailes visszaigazolás bekapcsolva; éles fizetés és számlázás még tiltott.

2026-08-31: a foglalási backend első változata helyben elkészült; nincs telepítve. 53/53 automatikus teszt sikeres. A foglalási modul kiadási feltételei és a hátralévő felületi/e-mailes munkák: [BOOKING_BACKEND.md](BOOKING_BACKEND.md).

## Jogi és üzleti

- [x] Hivatalos szolgáltatói adatok megadva
- [x] Áraknál egyértelműen jelölve a fizetendő végösszeg és az AAM státusz
- [ ] ÁSZF jogásszal vagy szakértővel ellenőrizve
- [ ] Adatkezelési tájékoztatóban minden adatfeldolgozó szerepel
- [ ] Elállási és fogyasztóvédelmi folyamat véglegesítve
- [ ] Számlázási integráció kiválasztva és tesztelve

## Technikai

- [ ] Firebase Auth Email/Password bekapcsolva
- [ ] Admin felhasználó és admin claim beállítva
- [x] Szerveroldali rendelési végpont és szigorított Firestore szabályok telepítve
- [x] SMTP titok és feladói cím beállítva; saját címre küldött visszaigazolást a levelezőszerver elfogadta
- [ ] A tesztlevél postafiókbeli megérkezése és spam-besorolása ellenőrizve
- [ ] SPF, DKIM és DMARC ellenőrizve
- [ ] Stripe tesztkulcs és webhook beállítva
- [ ] Teljes tesztrendelés végigfuttatva
- [x] Fizetés nélküli igénybeküldés és ismételt beküldés ellenőrizve az éles végponton
- [x] 29 automatikus teszt sikeres (árak, fizetési ellenőrzés, számlázási hibakezelés)
- [ ] OpenAI-kulcs és költségkorlát beállítva
- [ ] Mentési és incidenskezelési folyamat dokumentálva

## Értékesítés

- [ ] Első két célcsoport kiválasztva
- [ ] Legalább 50 kézzel ellenőrzött lead
- [ ] Megkeresési sablonok jóváhagyva
- [ ] Tiltólista működik
- [ ] Napi és heti mérőszámok rögzítve
- [ ] Első három referenciaajánlat vagy auditminta elkészült
