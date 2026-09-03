# OVEXI – adózási előkészítés, 2026-09-02

## Kiinduló adatok

A tulajdonos közlése: egyéni vállalkozó, SZJA szerinti átalányadózó, heti 40 órás főállással, jelenleg nulla vállalkozói bevétellel és csak magyar ügyfélkörrel. A NAV EVNY 2026-09-02-i nyilvános lekérdezése szerint a vállalkozás 2026. április 20. óta működő, nem szünetel; főtevékenysége 621002 Egyedi szoftverfejlesztés. A székhely és a 12 további tevékenység is ellenőrizve. A NAV ONYA belső nyilvántartása 2026-09-03-án igazolta az áfamentességi kód 2 szerinti alanyi adómentességet, 2026-04-20-i kezdettel.

## Alkalmazandó szabályok

- Legalább heti 36 órás munkaviszony mellett nincs vállalkozói minimum járulékalap. Az adómentes átalányjövedelem fölött a göngyölítéssel számított alapra 18,5% tb és 13% szocho vonatkozik. Nullás fizetendő összeg mellett is szükséges lehet az 58-as bevallás; a NAV útmutatója negyedéves, a következő hónap 12-éig teljesítendő kötelezettséget ír elő. A költséghányadot a tényleges bevételt hozó tevékenység határozza meg. [NAV: átalányadózás, 6. fejezet](https://nav.gov.hu/pfile/file?path=/ugyfeliranytu/nezzen-utana/inf_fuz/2026/100.-Az-egyeni-vallalkozok-atalanyadozasanak-alapveto-szabalyai-2026.-02.-20)
- Az általános költséghányad 2026-ban 45%; az éves adómentes átalányjövedelem 1 936 800 Ft, ami ennél a hányadnál 3 521 455 Ft bevételnek felel meg. A honlap alapján webfejlesztésre és marketingre ez a hányad valószínűsíthető, a tényleges szolgáltatáslista még ellenőrizendő. [NAV: 2026-os változások](https://nav.gov.hu/print/sajtoszoba/hirek/Kedvezoen_valtoztak_az_atalanyadozas_szabalyai)
- A 25 év alattiak SZJA-kedvezménye az adóköteles átalányjövedelemre is alkalmazható. A 2026-os keret jogosultsági hónaponként 715 765 Ft jövedelem, közösen a munkabérrel és más jogosító jövedelmekkel. A személyes keretmaradvány még nincs kiszámítva; a kedvezmény önmagában nem jelent tb- vagy szochomentességet. [NAV: 25 év alattiak kedvezménye](https://nav.gov.hu/print/ado/szja/25-ev-alatti-fiatalok-kedvezmenye)
- A 2026-os AAM éves értékhatára 20 millió Ft. Az AAM külön választott áfastátusz, nem következik az átalányadóból vagy a főállásból. Év közben induló vállalkozásnál az áfakeret időarányos; a külföldi ügyletek külön vizsgálandók. [NAV: AAM értékhatár](https://nav.gov.hu/ado/afa/Emelkedik_az_alanyi_adomentesseg_ertekhatara), [NAV: induló vállalkozások](https://nav.gov.hu/sajtoszoba/hirek/Jo_hir_a_kkv-knak_tovabb_emelkedik_az_alanyi_adomentesseg_hatara)

## Stripe és későbbi Billingo

A Stripe hivatalos címe az EVNY-adatokkal egyezőre javítva, majd az aktiválás 2026-09-02-án véglegesen beküldve. A Stripe beállítási összesítője az aktiválást késznek jelzi. Tax Off, Climate Off; a pénzügyi ügyfélszolgálati szám helyes. A kikapcsolt Tax nem AAM-igazolás. A Stripe Tax az értékesítések forgalmi adóját kezeli; a magyar személyes adókat és kedvezményeket a nyilvántartásban/bevallásban kell kezelni. [Stripe Tax](https://docs.stripe.com/tax/set-up)

A Billingo API Basic előfizetés 2026-09-03-án aktiválva, a V3 API-kulcs biztonságosan bekötve és a 330792-es számlatömb API-n ellenőrizve. A Billingo alapértelmezett áfakulcsa AAM, az egységár bruttó. A külön NAV technikai felhasználó és az Online Számla kapcsolat elkészült; a Billingo háttérintegráció engedélyezve. Az ügyfélfizetés külön kapuja zárva marad.

## A személyre szabott számításhoz még szükséges

A főállás és a vállalkozás 2026-os esetleges változásai; a később befolyó vállalkozói bevétel; a bérből/más jövedelemből ténylegesen felhasznált SZJA-kedvezmény; a külföldi ügyfélkör indulása. A NAV Ügyfélportál 2026-09-03-i lekérdezése szerint hiányzik a 2026. II. negyedévi `2658` járulékbevallás (eredeti esedékesség: 2026-07-13); ezt pótolni kell. A béradatokat és személyes igazolásokat nem kell a Git-repozitóriumba menteni.
