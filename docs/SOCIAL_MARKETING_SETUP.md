# OVEXI videópublikálási központ

## Megvalósított folyamat

Admin → Marketing → Új videó. MP4 előnézet, cím, leírás, hashtagek, célfiókok, külön YouTube- és TikTok-beállítások. Feltöltés tervezetként vagy feltöltés és közzététel. A felhasználó a küldés előtt jóváhagyja a tartalmat és a célhelyeket. A platformok egyetlen szolgáltatói kérésben kapják meg a videót, saját visszaigazolt státusszal.

Zernio integráció, hivatalos dokumentáció alapján, ellenőrizve 2026-09-10. A szolgáltató korábban Late néven működött. Kulcs: szerveroldali `social_private/provider` dokumentum; ezt sem a publikus látogató, sem közvetlenül az adminböngésző nem olvashatja. A kapcsolatok OAuth-engedélyezése a szolgáltató felületén történik. Saját Google/TikTok API-app auditját nem állítjuk teljesítettnek.

### Még nincs éles kapcsolat

A kód elkészült, de a fiókok és a szolgáltatói hozzáférés létrehozása, tényleges engedélyezése, majd egy felhasználó által jóváhagyott poszt éles ellenőrzése szükséges. Az automatikus közzététel és statisztika ezek nélkül nem működik. A fejlesztés során nem történt külső videóközzététel.

## Új OVEXI-fiókok

- Kapcsolattartó e-mail: info@ovexi.hu.
- Megjelenített márkanév: OVEXI.
- Tervezett felhasználónév: ovexi.hu; ha foglalt, ovexiweb. A foglaltság nincs ellenőrizve.
- Rövid bemutatkozás: „Weboldalak és egyedi üzleti megoldások kisvállalkozásoknak. Nézd meg a működő bemutatókat: ovexi.hu”
- TikTok rövid bio: „Weboldalak és üzleti megoldások kisvállalkozásoknak. ↓ ovexi.hu”
- YouTube leírás: „Az OVEXI kisvállalkozásoknak készít weboldalakat és a napi munkához illő üzleti megoldásokat. Ezen a csatornán kipróbálható mintákon mutatjuk meg az ügyfélkezelést, az ajánlatok jóváhagyását és az átlátható munkaszervezést. A bemutatók fiktív vállalkozásokhoz készülnek, nem ügyfélreferenciák. Saját terv és részletek: https://ovexi.hu/”
- Profilkép: a meglévő OVEXI logó (`assets/images/logo-256.png`).
- Instagram: új professzionális OVEXI-fiók.
- Facebook: új OVEXI-oldal, valódi személy kezelői fiókjával. Fiktív személyes fiók nem készül.
- YouTube: új OVEXI-csatorna. Google-fiók meglévő info@ovexi.hu címmel is regisztrálható; a felhasználó valódi személyes ellenőrzési adatai szükségesek.
- TikTok: új OVEXI-fiók a valódi kezelő szükséges ellenőrzésével.

Jelszót, születési dátumot, telefonszámot nem találtunk ki és nem mentettünk a projektbe. Az e-mailes/SMS-es ellenőrzés vagy CAPTCHA elvégzése a kezelő feladata, ha a platform kéri.

## Bekötés

1. Zernio-fiók az OVEXI e-maillel, OVEXI profil, API-kulcs. A felhasználó havi 12 USD keretet jóváhagyott (a 2026-09-10-én látott ár: 2 ingyenes fiók, további 2 × 6 USD). A checkout tényleges ára ellenőrizendő, előfizetés még nem történt.
2. Admin → Marketing → Fiókok → szolgáltató csatlakoztatása: kulcs és OVEXI profilazonosító mentése. A backend ellenőrzi, hogy a profil a kulcshoz tartozik.
3. A négy „Fiók csatlakoztatása” gombbal engedélyezni a megfelelő új márkafiókokat. Kizárólag az OVEXI-profilhoz tartozó fiókok használhatók.
4. A TikTok a tényleges alkotói adatok alapján adja a láthatóságot, maximális hosszt és interakciókat. Nincs előre kiválasztott láthatóság. OVEXI promóvideó: saját márka promóciója.
5. Egy előnézetben ellenőrzött videó és végleges felirat felhasználói jóváhagyása után éles próba. Mind a négy oldalon ellenőrizni a megjelent posztot, linket, láthatóságot és a szöveget.

## Korlátok és állapotok

- A helyi tervezet 6 napig publikálható; ezután új videófeltöltés szükséges a szolgáltató 7 napos ideiglenes médiatárolása miatt.

- Közös bemenet: 9:16 MP4, 3–180 mp, legfeljebb 500 MB. A szolgáltatói dokumentáció szerint Facebook Reels maximum 60 mp; Instagram Reels maximum 90 mp / 300 MB. A backend a kiválasztott platformokra külön ellenőrzi a korlátokat, nem vágja meg automatikusan a videót.
- A videó közvetlenül a szolgáltató presigned tárhelyére töltődik; a szerver ellenőrzi a visszaigazolt fájlméretet és típust. A videó technikai időtartamát és méretarányát a böngésző olvassa; az adminadatok nem helyettesítik a platform végső médiavizsgálatát.
- Sikeres feltöltés nem jelent sikeres közzétételt. A `pending`, `publishing`, `partial`, `failed` állapotok külön jelennek meg.
- A helyi állapotváltás tranzakciós; a platformküldés egyszer indul. A szolgáltatói x-request-id csak korlátozott ideig véd. Bizonytalan válasz esetén `needs_review` állapot lesz, nincs automatikus újraküldés. A kezelő egyeztesse a szolgáltató naplójával.
- A statisztikák és ismert posztállapotok az első 30 napban óránként frissülnek a legutóbbi 60 tételnél; külön kézi frissítés is van. A szolgáltató és a platform késése, API-jogosultságai korlátozhatják az adatokat. Hiányzó érték: null / „—”.
- A felület nem indít fizetett hirdetési kampányt.

## Hivatalos források

- https://developers.tiktok.com/docs/en/content-sharing-guidelines
- https://developers.google.com/youtube/v3/docs/videos
- https://zernio.com/pricing
- https://docs.zernio.com/guides/media-uploads
- https://docs.zernio.com/guides/idempotency
- https://docs.zernio.com/posts/create-post
- https://docs.zernio.com/accounts/get-tiktok-creator-info
- https://docs.zernio.com/analytics/get-analytics
- https://docs.zernio.com/platforms/facebook
- https://docs.zernio.com/platforms/instagram
- https://docs.zernio.com/platforms/tiktok
- https://docs.zernio.com/platforms/youtube
