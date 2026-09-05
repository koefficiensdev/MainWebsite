# Jóváhagyásos megkeresések – 2026-08-31

## Legfrissebb korrekció: régi lista, célzás és küldés

## Térképes előkeresés és személyes e-mail-címek – 2026-09-05

A `no_website` kutatás a támogatott helyi szakmáknál először nyilvános OpenStreetMap üzleti adatokból gyűjt olyan jelölteket, amelyeknél közzétett e-mail-cím van, de saját weboldal nincs feltüntetve. Az AI ezután a pontos cégnévre keresve ellenőrzi, hogy található-e önálló hivatalos honlap, megszűnt-e a vállalkozás, illetve egyértelmű-e az azonosság. A térképes adat önmagában nem bizonyítja a honlap hiányát; csak olcsó és célzott jelöltforrás. A felület minden ilyen rekordnál megjeleníti az OpenStreetMap-forrást és az előírt szerzői hivatkozást. A lekérdezés a nyilvánosan dokumentált Private.coffee és FOSSGIS Overpass-példányok között automatikusan átvált, mert az ingyenes példányok időnként túlterheltek lehetnek.

Egyéni vállalkozók és nyilvánosan közzétett Gmail/Freemail címek bekerülhetnek a jelöltlistába. A tényleges küldés védelme nem lazult: természetes személyhez köthető címre továbbra is csak dokumentált előzetes hozzájárulással enged a rendszer levelet küldeni. A jelölt megtalálása, a piszkozat elkészítése és a megkeresés jogalapja külön lépés.

A felhasználó által kifogásolt 12 cég a `leads` korábbi `researched_csv` importja volt; nem az új kutatás eredménye. Ezek változatlanul megmaradnak, de a Leadek nézetben összecsukott, nem küldhető régi listaként szerepelnek. A korábbi egyetlen gyenge AI-piszkozat szintén megmarad, az alapértelmezett küldhető nézetből kizárva. Új találatokat nem állítunk elő a régi adatok átnevezésével.

A kutatás alapértelmezése `no_website`: minden ismert saját honlap kizáró ok, még elavult honlap is. A `website_refresh` külön választás. Honlap nélküli jelöltnél az e-mail forrása nyilvános üzleti közösségi profil kell legyen; saját céges kontaktoldal nem elfogadható. A saját e-mail-domain HTTPS főoldalának sikeres lekérése konzervatív kizárást jelent; sikertelen lekérés nem bizonyít honlaphiányt. Két tényleges keresés és forrásidézet továbbra is kell. Közösségi oldalak elérhetőségi korlátai miatt hiteles jelöltek is kieshetnek; a forrásellenőrzést nem kerüljük meg.

Az új levél rövid, ellenőrzött magyar sablon, nem szabadon generált értékesítési szöveg. Feltételesen fogalmaz a honlap hiányáról, tartalmazza a 69 990 Ft-os egyszeri árat és a külön fizetendő fenntartást. Nem ígér garantált ügyfélszerzést vagy már működő foglalórendszert. A levél küldés előtt szerkeszthető.

Admin → Ügyfélszerzés → Küldés: minden új, minősített kártyán külön „Jóváhagyom és elküldöm ezt a levelet” gomb. Az ellenőrzött megkeresési alap, a bizonyítékleírás és a végső címzett-összefoglaló továbbra is kötelező. Kijelöléssel csoportosan is jóváhagyható legfeljebb 5 levél.

87 helyi automatikus teszt sikeres. Az új, honlap nélküli célzás élő próbája (`1542ccc1-a0f7-475d-90f7-e6b2dde74d61`) 0 találatot adott, küldés nem történt. Használható új leadlista és valódi küldés–válasz végponttól végpontig ellenőrzés még nincs igazolva. A felület ellenőrzése forrás-, teszt- és HTTP-alapú, nem vizuális böngészőteszt. A `researchOutreach`, `approveOutreach` és hosting frissítése sikeres: az öt érintett éles adminfájl HTTP 200 és helyi SHA-256 egyezés, a két callable névtelen hívása HTTP 403. Más funkció és pénzügyi kapcsoló nem változott.

## Célzási szigorítás (v2)

Alapértelmezett előszűrés: friss vállalkozás előnyben (legfeljebb 365 napos, forrásidézetben szereplő alapítás/nyitás), de minden jelöltnél külön weboldaligény kell. Saját honlap nem található legalább két tényleges keresés után, vagy konkrét, forrással alátámasztott hiányosság (fejlesztés alatt, elavult aktuális információ, kivezetett technológia). A friss alapítás önmagában, régi copyright, szubjektív dizájn vagy szakmai besorolás nem elég. Megfelelő honlapú, központi honlappal rendelkező lánc/franchise és megszűnt vállalkozás kizárandó. Nincs végzett mobil-/teljesítmény-/űrlaptesztet színlelő állítás.

A szerver ellenőrzi az előszűrés típusát, a tényleges keresőhívásokból származó két keresést, a hivatkozott forrást és az idézet tényleges jelenlétét, valamint a friss alapítás dátumát. Az indoklás üzleti értelmezése továbbra is AI-előszűrés, emberi ellenőrzést igényel; sem a honlap hiánya, sem a vásárlási szándék nem bizonyított pusztán a keresésből. A felületen külön „Miért lehet potenciális vevő?” rész, források és keresési ellenőrzések; az új vállalkozások elöl. A régi, előszűrés nélküli AI-piszkozatok megmaradnak, de nem küldhetők. Egyéni vállalkozó nyilvános üzleti profilja kutatható, a korábbi hozzájárulási küldési feltétel változatlan.

82 teszt sikeres. A szigorított élő próbakutatás 0 megfelelő céget adott, és nem helyettesítette a hiányzó találatot gyenge jelölttel. Küldés nem történt.

Meglévő Firebase/Rackhost architektúra, nem új tárhely vagy fizetős e-mail-platform.

## Használat

Admin → Hirdető e-mailek → feltételek és 1–20 cég → Kutatás. A kutatás kizárólag piszkozatokat készít. A kutatási napló mutatja az eredményt és a becsült API-költséget. Kevesebb hiteles találat is elfogadható.

Minden kártyán cégleírás, ajánlat, ellenőrzött nyilvános kapcsolati forrás és teljes szerkeszthető levél. A forrást és az AI állításait ember ellenőrzi. Kijelölés előtt vagy után címzettenként megkeresési alap és bizonyítékleírás szükséges. Természetes személy / EV esetén a belső adminjóváhagyás nem helyettesíti a címzett előzetes hozzájárulását.

Jóváhagyás és elküldés → a megerősítés felsorolja a címzetteket és tárgyakat → szerveroldali ellenőrzés → SMTP. Egy körben maximum 5 levél. A szolgáltató átvétele nem kézbesítési vagy olvasási igazolás. Jóváhagyáskor rögzül az admin UID, időpont, teljes tartalom hash-e és a megkeresési alap.

Válaszok: 15 perces IMAP szinkron és kézi gomb. Csak az INBOX, csak az eredeti címzettről érkező és In-Reply-To / References alapján kapcsolható levelek törzse kerül az adminba; a többi levél tartalmát nem olvassuk át, és semmilyen választ nem küldünk AI-nak. Új tárgyú, azonosító nélküli vagy más címről érkező válasz, levélszemét mappa és visszapattanási jelentés egyelőre kézzel ellenőrizendő a webmailben. Automatikus válaszadás nincs.

## Korlátok és biztonság

- Admin custom claim minden callable-nél. Firestore kliens nem írhat kutatásokat, megkereséseket vagy válasznaplót.
- Napi legfeljebb 10 küldési kísérlet Budapest időzónában. Címzettenként és céges e-mail-domainenként egyszeri hideg megkeresés; nincs automatikus follow-up.
- Stabil címzettazonosító, tranzakciós küldési foglalás és determinisztikus Message-ID. Timeout / bizonytalan SMTP / process crash után nincs automatikus újraküldés. `sending` vagy `send_unknown` állapotot szolgáltatói bizonyíték alapján kell kivizsgálni, nem piszkozatként újramenteni.
- Levélmódosítás érvényteleníti a régi jóváhagyási hash-t. Ellenőrzött forrás legfeljebb 30 napos. Lejárt rekordot új forrásellenőrzés nélkül nem küld a szerver (újraellenőrző adminművelet még nincs).
- Források: HTTPS, nyilvános DNS-címek, sockethez rögzített IP, újraellenőrzött átirányítás, méret- és időkorlát. Az e-mailnek ténylegesen szerepelnie kell a hivatkozott oldalon. Ez nem igazolja önmagában a cégazonosságot vagy a megkeresés jogszerűségét.
- Leiratkozás: szabványos HTTPS egykattintásos leiratkozás és mailto fejléc, manuális tiltás gomb, vagy explicit LEIRATKOZAS / unsubscribe válasz. Az egykattintásos tokenből csak SHA-256 hash kerül az adatbázisba. Bármilyen emberi válasz további hideg megkeresés ellen tiltást tesz, amíg ember egyeztet. Más megfogalmazású törlési / tiltási kéréseket kézzel kell kezelni. A tiltási rekord hash-alapú.
- IMAP: read-only, nem állít Seen flaget, nem töröl. UIDVALIDITY + UID kurzor és deduplikáció; körönként 50 fejléc, kapcsolt levélnél maximum 256 kB forrás és 16000 karakter eltárolt szöveg. Nincs HTML-végrehajtás vagy csatolmány-megjelenítés.
- AI: fix gpt-5-mini, max 8 keresőhívás / 12000 output token, nincs SDK-újrapróbálás. Kutatásonként 1 USD előzetes keretfoglalás a közös 10 USD havi keretből; sikeres API-hívásnál usage + keresődíj becslés alapján elszámolás. Bizonytalan API-kimenet esetén a foglalás megmarad az adott hónapban. Ez nem szolgáltatói számla és nem minden szolgáltatásra érvényes 50 EUR-s kemény limit.
- Nincs automatikus kutatási időzítés vagy automatikus jóváhagyás. Stripe személyazonosítástól független folyamat.

## Üzemeltetés

Leállítás: `OUTREACH_SEND_ENABLED=false`, `OUTREACH_INBOX_ENABLED=false`, majd csak az érintett outreach funkciók újratelepítése. A kapcsolók nem módosítják a rendelési visszaigazoló e-maileket vagy fizetési kapukat.

Új funkciók: researchOutreach, saveOutreachDraft, approveOutreach, suppressOutreach, syncOutreachReplies, pollOutreachReplies. Titkok kizárólag Secret Managerből: OPENAI_API_KEY és SMTP_PASS. Forrás- és levéladatok megőrzését / törlési kérelmeket az üzemeltetőnek felül kell vizsgálnia; automatikus adatmegőrzési takarítás jelenleg nincs. Hozzájárulás visszavonásakor a tiltáson túl az érintett marketingadatok törlését külön el kell végezni.

## Ellenőrzés

- SMTP hitelesítés sikeres, e-mail küldése nélkül.
- IMAP hitelesítés + read-only INBOX sikeres; élő szinkronban nincs kapcsolt válasz.
- SPF rekord megvan. A Rackhost DKIM-aláírás és a publikált `mx0820260425` selector ellenőrzése sikeres. A DMARC 2026-09-05-én megfigyelő módban beállítva (`p=none`, összesítő jelentések: `info@ovexi.hu`), és a Google, valamint a Cloudflare nyilvános DNS-feloldóján ellenőrizve. A napi 10 technikai maximum nem kézbesítési ígéret.
- Egy élő, 1 céges kutatás: 1 ellenőrzött piszkozat; becsült API-költség 0,024137 USD; kiküldött levél 0.
- Unit tesztek: versengő jóváhagyás, stale hash, természetes személy hozzájárulás, tiltás, domain-duplikáció, SMTP timeout, SSRF, fejlécinjektálás, szintetikus válaszimport és deduplikáció, jogosultság, admin DOM ID-k.
- Tranzakciós tesztek optimista memóriamodellt használnak, nem Firestore emulátort. Valódi címzett jóváhagyásos küldése és valódi válasz end-to-end tesztje még nem történt meg.

## Hivatkozások

- [OpenAI web search](https://developers.openai.com/api/docs/guides/tools-web-search)
- [OpenAI díjszabás](https://developers.openai.com/api/docs/pricing)
- [Rackhost IMAP beállítás](https://www.rackhost.hu/tudasbazis/email/e-mail-kliens-beallitasa-android-rendszeru-mobiltelefonokon/)
- [Grt. 6. §](https://njt.jog.gov.hu/jogszabaly/2008-48-00-00)
