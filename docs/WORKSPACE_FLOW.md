# Igényfogadás, ügyféltér és átadás – 2026-09-02

Az igény és a munkafolyamat egy Firestore-tranzakcióban jön létre. Az igény visszaigazolásából közvetlenül elérhető az ügyféltér. A Stripe/Billingo kapcsolói nem változnak.

## Használat

1. Admin → Ügyfélmunkák: következő lépés és ellenőrzőlista mentése. Az **Előkészítés** fizetés nélkül is használható; a **Készül** szakasz igazolt fizetést igényel.
2. Ügyfél: rendelési azonosító és e-mail alapján kért 24 órás linkkel lép be. Pontosíthatja a bemutatkozást, célközönséget, webcímet és megjegyzést; a kapcsolattartói és pénzügyi mezőket nem írhatja.
3. Admin: Előnézet és ügyféljóváhagyás → cím, HTTPS hivatkozás, ellenőrzési szempontok. Minden közzététel új verzió, új jóváhagyással. A fájl/oldal tényleges feltöltése a választott tárhelyen történik; itt ellenőrzött hivatkozás kerül az ügyféltérbe, nincs beépített fájlfeltöltő.
4. Ügyfél: aktuális verzió jóváhagyása vagy indokolt módosításkérés. A döntés nem indít fizetést és nem jelent végleges átadást. Briefmódosítás után új előnézet szükséges. A korábbi verziók/döntések szerveroldali előzményben maradnak.
5. Admin: a beküldött kérésre ügyfélnek látható válasz menthető; csak ezután záródik le a kérés. Az új döntés/brief figyelmeztetése a munkafolyamat feldolgozásakor törölhető; nyitott kérés figyelmeztetése megmarad.
6. Végleges átadás: aktuális jóváhagyás, lezárt ellenőrzőpontok, megválaszolt kérések és igazolt fizetés szükséges. Legfeljebb nyolc HTTPS fájl-/oldalhivatkozás és átadási útmutató. A végleges anyagok mentése és az igény lezárása egy tranzakció.
7. E-mail külön, a meglévő megerősítő gombokkal küldhető. Előnézet-/átadási értesítéshez a megfelelő anyagnak már léteznie kell. Az adminválasz önmagában az ügyféltérben jelenik meg.

## Megbízhatóság és hozzáférés

- A kérésazonosító és a befagyasztott tartalom bizonytalan mentésnél megmarad. Szerveroldali műveleti nyugta akadályozza meg a duplikációt. Új tartalom nem használhat régi azonosítót.
- A munkafolyamat verziószáma megakadályozza az elavult adminűrlap felülírását. Több ellenőrzőpont egy mentéssel módosítható; ügyféljóváhagyás és átadás nem pipálható be kézzel.
- Adminműveletekhez admin claim kell. Ügyfélműveletnél a szerver a belépési munkamenet rendelését használja, nem a kliens által küldött rendelésazonosítót. Lejárt link tiltott.
- Átmeneti hálózati hiba nem törli a belépést. Letiltott sessionStorage mellett az aktuális lap memóriája használható; a böngészőadatok törlése utáni helyreállítás nem garantált.
- A belépési link 24 órán belül újra használható. Kijelentkezés a helyi munkamenetet törli; nem vonja vissza a korábban kézbesített linket.
- Ügyféloldalon a legutóbbi 20 kérés látható; a korábbiak az adatbázisban megmaradnak. Régi igények munkafolyamata 100-as lapokban pótolható.
- Az előnézet-hivatkozás mögötti anyagot az adminnak kell megfelelő hozzáféréssel, változatonként elkülönítve tárolnia. Egy külső hivatkozás változatlanságát a rendszer nem tudja garantálni.

## Ellenőrzés

- 127 helyi teszt, frontend/backend szintaktikai ellenőrzés.
- Firestore-emulátor: párhuzamos verzióütközés, ismételt kérés, előnézet-jóváhagyás, fizetési átadási kapu, másik rendelés kiválasztásának tiltása, lejárt munkamenet és névtelen adatelérés.
- Böngésző: tényleges frontend és munkafolyamat-szolgáltatás, kizárólag helyi kitalált adatokkal; előkészítés → előnézet → módosításkérés → adminválasz, briefmódosítás, valamint kitalált fizetett rendelés jóváhagyása és átadása. Mobil ügyféltér és asztali admin ellenőrizve.
- Helyi felületpróba: `node tools/preview-workflow.cjs`. Kizárólag loopback, nincs felhő-, SMTP- vagy fizetési kapcsolat. Ez nem éles szolgáltatói végponttól végpontig próba.
- Emulátoros ellenőrzés: Java 21+ és `firebase emulators:exec --only firestore --project demo-ovexi-workflow --config .workflow-emulator.json "node --test functions/test/workflow-service.test.js functions/test/workspace-access.test.js"`.

Telepítési állapot: 2026-09-02-án 12 érintett háttérfunkció, a Firestore-szabályok/indexek és a hosting sikeresen telepítve. Tíz éles oldal/modul/stíluslap HTTP 200 és helyi SHA-256 egyezést adott. Négy adminvégpont névtelenül HTTP 403, három ügyfélvégpont érvénytelen linkkel HTTP 401. A helyi próbaszerver és a háttérforrás nyilvános URL-je HTTP 404. Stripe/Billingo kapcsolók változatlanok; külső címzettnek levél, fizetés vagy számla nem készült a tesztekben. Éles, ügyfélként belépett teljes folyamatpróba nem történt.
