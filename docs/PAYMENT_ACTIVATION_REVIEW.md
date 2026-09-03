# Stripe és Billingo – aktiválási ellenőrzés, 2026-09-02

A Stripe aktiválása 2026-09-02-án véglegesen beküldve. A hivatalos cím az EVNY nyilvános adataival egyezőre javítva. Az opcionális Stripe Tax és Climate egyaránt Off. A Stripe beállítási összesítője az e-mail-ellenőrzést és a fizetési aktiválást késznek jelzi. A korlátozott éles API-kulcs szándékosan nem jogosult a teljes fiók- és kifizetési állapot lekérésére.

A vállalkozási forma Magyarország / egyéni vállalkozót is tartalmazó opció. Bankszámla megadva, kétlépcsős hitelesítés On. Az összesítőn Radar Standard bekapcsolva, feltüntetett díja 16 Ft / ellenőrzött tranzakció; ezt a felhasználó által beállított opciót nem módosítottuk.

## Megerősített kapcsolattartás

A tulajdonos 2026-09-02-án megerősítette: a Stripe +36 20 398 9011 száma a pénzügyi ügyfélszolgálaté, a honlap +36 70 572 3437 száma az általános megkereséseké. A két szám szándékosan különbözik; nem egységesítendő.

## Tisztázandó adatok

- A honlap és a backend AAM státuszt használ. A Billingo SZJA szerinti átalányadózó jelölése nem igazolja önmagában az áfastátuszt. A jelenlegi AAM-státuszt a NAV belső törzsadatával még igazolni kell.

## Billingo

Az API + tömeges Basic havi csomag 2026-09-03-án aktiválva. A `OVEXI Firebase Production` V3 API-kulcs olvasási és írási jogosultsággal létrejött, Firebase Secret Managerbe került, és a Billingo API 200-as válasszal igazolta a 330792-es `Számlák` tömböt. A hivatalos cím, a 62198448 nyilvántartási szám, az AAM alapértelmezés és a bruttó egységár beállítása mentve.

A NAV Online Számla kapcsolat még hiányzik; a technikai felhasználó, jelszó, XML aláírókulcs és XML cserekulcs megadása szükséges. Emiatt a Billingo és az ügyfélfizetés futásidejű kapuja zárva marad.

## Kódban ellenőrzendő az éles fizetés előtt

A `billingo.js` jelenleg normál, kifizetett számlát készít, a `invoice-workflow.js` a fizetés rögzítésének napját adja át teljesítési és esedékességi dátumként. Ez nem igazolja előleg, későbbi teljesítés és időszakos elszámolás helyes kezelését; a szerződéses fizetési modellhez külön hozzá kell igazítani. Külföldi ügyleteknél az egységes AAM nem alkalmazható automatikus feltételezésként. Az éles fizetési/számlázási kapuk változatlanul zártak.

A `commerce-domain.js` TERMS_VERSION értéke a publikus ÁSZF 2026-09-01 dátumával egységesítve. Az éles fizetés továbbra is zárt, amíg a számlázási folyamat és az AAM-státusz nincs véglegesítve.

## Források

- Stripe Tax beállítás és adóregisztráció: https://docs.stripe.com/tax/set-up
- Billingo API és e-számla csomagfeltételek: https://developers.billingo.hu/faqs
- NAV aktuális alanyi adómentesség: https://nav.gov.hu/ado/afa/Emelkedik_az_alanyi_adomentesseg_ertekhatara

Ez műszaki és adatkonzisztencia-ellenőrzés, nem teljes körű jogi megfelelőségi tanúsítás. Az előleg/havi elszámolás, AAM és határon átnyúló ügyletek helyes adókezelését könyvelővel kell véglegesíteni.
