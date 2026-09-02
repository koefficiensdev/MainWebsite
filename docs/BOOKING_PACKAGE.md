# Céges weboldal foglalással — ajánlat és megvalósítási keret

Állapot (2026-08-30): előkészített ajánlat, nem kész foglalórendszer. A felhasználó kérésére az ajánlat kifejezett „fejlesztés alatt” jelzéssel, kizárólag fizetés nélküli igényfelmérésként jelenhet meg. A szerver a csomag fizetését külön tiltja.

2026-08-31: elkészült a foglalási backend első, helyben tesztelt változata (szabad időpontok, tranzakciós foglalás/lemondás, tulajdonosi napi lekérdezés). Nincs telepítve; vendégfelület, kezelőfelület, foglalási e-mail és integrációs ellenőrzés még hiányzik. Részletek: [BOOKING_BACKEND.md](BOOKING_BACKEND.md). Ettől a csomag még nem értékesíthető kész foglalórendszerként.

## Felhasználó által kért ajánlat

- Céges weboldal: 69 990 Ft egyszeri díj.
- Az alapár része az online időpontfoglalás és a vállalkozó kezelőfelülete.
- Célközönség: időpontra dolgozó vállalkozások, szakmától függetlenül. A fodrász csak példa, nem termékkorlát; műkörmös, autószerelő, masszőr, oktató és más szolgáltató is célfelhasználó.
- Általános, konfigurálható szolgáltatáslista, árak és időtartamok szükségesek; a közös kezelőfelület ügyfeleket és foglalásokat kezel, nem szakmaspecifikus adatmodellt. Több erőforrás vagy speciális szakmai munkafolyamat nem válik automatikusan az egy naptáras alapcsomag részévé.
- A marketing és a karbantartás külön is megvásárolható marad; egyik sem feltétele az alap foglalófunkció megvásárlásának.

## Javasolt induló keret

Tervezési feltételezés, nem külön jóváhagyott korlát: egy szolgáltató, egy helyszín, egy naptár. Több munkatárs és helyszín igényét a további tervezéskor tisztázni kell.

- Legfeljebb 6 mobilbarát aloldal, szöveg és dizájn, technikai SEO, két módosítási kör.
- Beállítható szolgáltatások: név, ár, időtartam.
- Nyitvatartás, szünetek és szabadság alapján számított szabad időpontok.
- Vendégoldali szolgáltatás- és időpontválasztás, szükséges kapcsolati adatok bekérése.
- E-mailes foglalás-visszaigazolás és biztonságos lemondási lehetőség.
- Bejelentkezéshez kötött kezelőfelület: napi/heti naptár, vendéglista, időpontok, módosítás, lemondás, megjelent/nem jelent meg státusz.

Nem ígérünk korlátlan CRM-et, könyvelést vagy tényleges bevételi riportot. A foglalások szolgáltatására nem azonos a befolyt bevétellel. SMS, online előlegfizetés, több munkatárs, külső naptárszinkron és fizetős integráció külön tisztázandó bővítés.

## Költségek és értékesítési feltételek

A 69 990 Ft fejlesztési és átadási ár. Domain, tárhely, e-mail és esetleges külső szolgáltatói használat folyamatos költségeit külön, még vásárlás előtt kell közölni. Nem ígérhető korlátlan, örökké ingyenes üzemeltetés. Ezekhez új díj vagy fizetős előfizetés ebben a módosításban nem került beállításra.

## Publikálás előtti követelmények

- A foglalómotor, ügyféloldal és kezelőfelület tényleges megvalósítása; jelenleg nincsenek készen.
- Vállalkozásonként elkülönített adatok és szerveroldali jogosultságellenőrzés; a nyilvános szabadidőpont-lista nem fedhet fel vendégadatot.
- Szerveroldali, tranzakciós ütközésvédelem: párhuzamos kéréssel sem foglalható ugyanaz az időszak kétszer.
- Europe/Budapest időzóna, óraátállítás, eltérő szolgáltatási hosszok, szünetek, módosítás és lemondás tesztelése.
- Spamvédelem és kéréskorlát, biztonságos lemondási azonosítók, e-mailes hibakezelés és újrapróbálás.
- Adatkezelés, megőrzés, mentés/visszaállítás és üzemeltetési költségkeret rendezése.
- Több szakmával ellenőrzött demó (fodrász, műkörmös, autószerelő): eltérő szolgáltatások és időtartamok konfigurálhatók; két ügyfél azonos időpontot próbál foglalni, tulajdonos látja és módosítja a foglalást, lemondás felszabadítja az időpontot.
- A Stripe HUF egységkezelése javítva és tesztelve: 69 990 Ft = 6 999 000 API-egység. Ez nem helyettesíti a teljes Stripe/Billingo végponttól végpontig tesztet.
- Fizethető szolgáltatásként csak az ellenőrzött foglalórendszer és jóváhagyott üzemeltetési feltételek után indítható.
