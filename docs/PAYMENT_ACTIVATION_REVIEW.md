# Stripe és Billingo – aktiválási ellenőrzés, 2026-09-02

A Stripe aktiválása az ellenőrző összesítőig jutott. Az opcionális Stripe Tax és Climate hozzájárulás kihagyva; az összesítő szerint mindkettő Off. Végleges beküldés nem történt.

A vállalkozási forma Magyarország / egyéni vállalkozót is tartalmazó opció. Bankszámla megadva, kétlépcsős hitelesítés On. Az összesítőn Radar Standard bekapcsolva, feltüntetett díja 16 Ft / ellenőrzött tranzakció; ezt a felhasználó által beállított opciót nem módosítottuk.

## Tisztázandó adatok

- A Stripe ügyfélszolgálati telefonszáma eltér a honlap jogi dokumentumainak telefonszámától. A hivatalos ügyfélszolgálati számot a tulajdonos erősítse meg.
- A Billingo címe rövidebb a honlapon szereplő székhelynél. Nem biztos, hogy ugyanaz a hivatalos címformátum; a NAV/nyilvántartás adata alapján egységesítendő.
- A Billingóban a nyilvántartási szám mező üres; a honlapon van érték, de ennek hatósági ellenőrzése még szükséges.
- A honlap és a backend AAM státuszt használ. A Billingo SZJA szerinti átalányadózó jelölése nem igazolja önmagában az áfastátuszt. A jelenlegi AAM-státusz és a belföldi/külföldi ügyfélkör tisztázandó.

## Billingo

NAV-kapcsolat hiányzik, a technikai felhasználó négy mezője üres. A NAV Online Számla belépés DÁP/Ügyfélkapu+ azonosításig előkészítve. Személyes belépést a tulajdonos végzi.

API-előfizetés nincs. Az API + tömeges Basic havi csomag kosara előkészítve: 50 bizonylat/hó, nettó 2 390 Ft, a rendelési összesítő szerint bruttó 3 035 Ft/hó, bankkártyás automatikus levonással. Nem lett megvásárolva. A jelenlegi számlázó Free; a Billingo hivatalos GYIK szerint elektronikus számlához külön Basic/Standard/Pro számlázó előfizetés is kell. A két szükséges csomag teljes költségét vásárlás előtt együtt kell jóváhagyni.

## Kódban ellenőrzendő az éles fizetés előtt

A `billingo.js` jelenleg normál, kifizetett számlát készít, a `invoice-workflow.js` a fizetés rögzítésének napját adja át teljesítési és esedékességi dátumként. Ez nem igazolja előleg, későbbi teljesítés és időszakos elszámolás helyes kezelését; a szerződéses fizetési modellhez külön hozzá kell igazítani. Külföldi ügyleteknél az egységes AAM nem alkalmazható automatikus feltételezésként. Az éles fizetési/számlázási kapuk változatlanul zártak.

A `commerce-domain.js` TERMS_VERSION értéke 2026-08-30, a publikus ÁSZF dátuma 2026-09-01. A végleges jogi szöveg és az elfogadás verziójának egységesítése még szükséges.

## Források

- Stripe Tax beállítás és adóregisztráció: https://docs.stripe.com/tax/set-up
- Billingo API és e-számla csomagfeltételek: https://developers.billingo.hu/faqs
- NAV aktuális alanyi adómentesség: https://nav.gov.hu/ado/afa/Emelkedik_az_alanyi_adomentesseg_ertekhatara

Ez műszaki és adatkonzisztencia-ellenőrzés, nem teljes körű jogi megfelelőségi tanúsítás. Az előleg/havi elszámolás, AAM és határon átnyúló ügyletek helyes adókezelését könyvelővel kell véglegesíteni.
