# Stripe és Billingo – aktiválási ellenőrzés, 2026-09-02

A Stripe aktiválása 2026-09-02-án véglegesen beküldve. A hivatalos cím az EVNY nyilvános adataival egyezőre javítva. Az opcionális Stripe Tax és Climate egyaránt Off. A Stripe beállítási összesítője az e-mail-ellenőrzést és a fizetési aktiválást késznek jelzi. A korlátozott éles API-kulcs szándékosan nem jogosult a teljes fiók- és kifizetési állapot lekérésére.

A Stripe Managed Payments fiókszintű alapértéke nem használható ebben a folyamatban, mert az OVEXI marad a szolgáltató és a Billingo állítja ki a magyar bizonylatot. Minden Checkout Session ezért kifejezetten `managed_payments.enabled=false` beállítással készül; ezt éles, személyes adat és terhelés nélküli Session-létrehozás és azonnali lejáratás igazolta.

A vállalkozási forma Magyarország / egyéni vállalkozót is tartalmazó opció. Bankszámla megadva, kétlépcsős hitelesítés On. Az összesítőn Radar Standard bekapcsolva, feltüntetett díja 16 Ft / ellenőrzött tranzakció; ezt a felhasználó által beállított opciót nem módosítottuk.

## Megerősített kapcsolattartás

A tulajdonos 2026-09-02-án megerősítette: a Stripe +36 20 398 9011 száma a pénzügyi ügyfélszolgálaté, a honlap +36 70 572 3437 száma az általános megkereséseké. A két szám szándékosan különbözik; nem egységesítendő.

## Tisztázandó adatok

- A NAV ONYA belső nyilvántartása 2026-09-03-án igazolta: áfamentességi kód 2, „Alanyi adómentességet választok”, érvényesség kezdete 2026-04-20.

## Billingo

Az API + tömeges Basic havi csomag 2026-09-03-án aktiválva. A `OVEXI Firebase Production` V3 API-kulcs olvasási és írási jogosultsággal létrejött, Firebase Secret Managerbe került, és a Billingo API 200-as válasszal igazolta a 330792-es `Számlák` tömböt. A hivatalos cím, a 62198448 nyilvántartási szám, az AAM alapértelmezés és a bruttó egységár beállítása mentve.

A NAV Online Számla kapcsolat 2026-09-03-án elkészült külön Billingo technikai felhasználóval, számlakezelési és lekérdezési jogosultsággal. A Billingo futásidejű integráció engedélyezve. Az első éles próba költségének csökkentésére a közvetlen ügyfélfizetés kizárólag a ténylegesen teljesíthető, 990 Ft-os `quick-audit` csomagra nyílt meg; a teljes audit fizetés nélküli egyeztetés marad.

## Számlázási modell

Az előre fizetett egyszeri szolgáltatásokhoz a rendszer előlegszámlát készít a pénz beérkezésének napjával, majd az adminfelületen rögzített végleges átadáskor az előleghez kapcsolt végszámlát állít ki. A havi szolgáltatás külön normál számlát kap a Stripe által igazolt elszámolási időszakkal. Vegyes kosárnál az egyszeri és havi tételek külön bizonylatra kerülnek. Minden bizonylat saját stabil `vendor_id` értéket és külön tartós feldolgozási állapotot kap, ezért webhook-ismétlés és bizonytalan hálózati válasz nem indíthat vakon új számlát.

Külföldi ügyleteknél az egységes AAM nem alkalmazható automatikus feltételezésként; a közvetlen fizetés ezért csak magyar ügyfélre és külön engedélyezett termékekre nyitható meg. Minden más csomag fizetés nélküli igényként marad, amíg külön nem kerül a szerveroldali engedélyezési listára.

A `commerce-domain.js` TERMS_VERSION értéke a publikus ÁSZF 2026-09-03 dátumával egységesítve. A közvetlen fizetés üzleti vagy szakmai célú megrendeléshez kötött; ezt a kliens és a szerver is kötelező, verziózott nyilatkozatként ellenőrzi.

## Források

- Stripe Tax beállítás és adóregisztráció: https://docs.stripe.com/tax/set-up
- Billingo API és e-számla csomagfeltételek: https://developers.billingo.hu/faqs
- NAV aktuális alanyi adómentesség: https://nav.gov.hu/ado/afa/Emelkedik_az_alanyi_adomentesseg_ertekhatara

Ez műszaki és adatkonzisztencia-ellenőrzés, nem teljes körű jogi megfelelőségi tanúsítás. Az előleg/havi elszámolás, AAM és határon átnyúló ügyletek helyes adókezelését könyvelővel kell véglegesíteni.
