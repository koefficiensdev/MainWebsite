# Stripe és Billingo – aktiválási ellenőrzés, 2026-09-02

A Stripe aktiválása 2026-09-02-án véglegesen beküldve. A hivatalos cím az EVNY nyilvános adataival egyezőre javítva. Az opcionális Stripe Tax és Climate egyaránt Off. A Stripe API szerint a terhelések és kifizetések engedélyezettek, további adat vagy ellenőrzés nincs függőben.

A vállalkozási forma Magyarország / egyéni vállalkozót is tartalmazó opció. Bankszámla megadva, kétlépcsős hitelesítés On. Az összesítőn Radar Standard bekapcsolva, feltüntetett díja 16 Ft / ellenőrzött tranzakció; ezt a felhasználó által beállított opciót nem módosítottuk.

## Megerősített kapcsolattartás

A tulajdonos 2026-09-02-án megerősítette: a Stripe +36 20 398 9011 száma a pénzügyi ügyfélszolgálaté, a honlap +36 70 572 3437 száma az általános megkereséseké. A két szám szándékosan különbözik; nem egységesítendő.

## Tisztázandó adatok

- A Billingo címe rövidebb az EVNY-ben ellenőrzött hivatalos székhelynél; később egységesítendő.
- A Billingóban a nyilvántartási szám mező üres; az EVNY-ben ellenőrzött érték: 62198448.
- A honlap és a backend AAM státuszt használ. A Billingo SZJA szerinti átalányadózó jelölése nem igazolja önmagában az áfastátuszt. A jelenlegi AAM-státusz és a belföldi/külföldi ügyfélkör tisztázandó.

## Billingo

A tulajdonos kérésére a Billingo munkái szünetelnek. Az alábbiak korábbi megfigyelések, nem újonnan elvégzett beállítások. A későbbi adózási egyeztetés alapja: [2026-os adózási előkészítés](TAX_PROFILE_2026.md).

NAV-kapcsolat hiányzik, a technikai felhasználó négy mezője üres. A NAV Online Számla belépés DÁP/Ügyfélkapu+ azonosításig előkészítve. Személyes belépést a tulajdonos végzi.

API-előfizetés nincs. Az API + tömeges Basic havi csomag kosara előkészítve: 50 bizonylat/hó, nettó 2 390 Ft, a rendelési összesítő szerint bruttó 3 035 Ft/hó, bankkártyás automatikus levonással. Nem lett megvásárolva. A jelenlegi számlázó Free; a Billingo hivatalos GYIK szerint elektronikus számlához külön Basic/Standard/Pro számlázó előfizetés is kell. A két szükséges csomag teljes költségét vásárlás előtt együtt kell jóváhagyni.

## Kódban ellenőrzendő az éles fizetés előtt

A `billingo.js` jelenleg normál, kifizetett számlát készít, a `invoice-workflow.js` a fizetés rögzítésének napját adja át teljesítési és esedékességi dátumként. Ez nem igazolja előleg, későbbi teljesítés és időszakos elszámolás helyes kezelését; a szerződéses fizetési modellhez külön hozzá kell igazítani. Külföldi ügyleteknél az egységes AAM nem alkalmazható automatikus feltételezésként. Az éles fizetési/számlázási kapuk változatlanul zártak.

A `commerce-domain.js` TERMS_VERSION értéke a publikus ÁSZF 2026-09-01 dátumával egységesítve. Az éles fizetés továbbra is zárt, amíg a számlázási folyamat és az AAM-státusz nincs véglegesítve.

## Források

- Stripe Tax beállítás és adóregisztráció: https://docs.stripe.com/tax/set-up
- Billingo API és e-számla csomagfeltételek: https://developers.billingo.hu/faqs
- NAV aktuális alanyi adómentesség: https://nav.gov.hu/ado/afa/Emelkedik_az_alanyi_adomentesseg_ertekhatara

Ez műszaki és adatkonzisztencia-ellenőrzés, nem teljes körű jogi megfelelőségi tanúsítás. Az előleg/havi elszámolás, AAM és határon átnyúló ügyletek helyes adókezelését könyvelővel kell véglegesíteni.
