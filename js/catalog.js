export const PRODUCT_CATALOG = Object.freeze([
  {
    id: "website-onepage",
    category: "website",
    name: "Egylapos weboldal",
    shortName: "Egylapos",
    price: 39990,
    billing: "once",
    badge: "Gyors indulás",
    description: "Konverzióra épített bemutatkozó oldal induló vállalkozásoknak.",
    features: ["Egyedi, mobilbarát megjelenés", "Kapcsolati űrlap", "Alap SEO és analitika", "1 kör módosítás"]
  },
  {
    id: "website-business",
    category: "website",
    name: "Céges weboldal",
    shortName: "Céges",
    price: 69990,
    billing: "once",
    featured: true,
    badge: "Üzleti funkcióval",
    description: "Többoldalas céges weboldal egy, a vállalkozás működéséhez illő alap üzleti modullal.",
    features: ["Legfeljebb 6 aloldal, egyedi szöveg és dizájn", "1 alap üzleti modul a brief alapján", "Például időpontkérés, ajánlatkérés vagy igényfelvétel", "A modulhoz illő adatok és státuszok kezelése", "Szükség esetén e-mailes visszaigazolás", "Technikai SEO és 2 kör módosítás"]
  },
  {
    id: "website-pro",
    category: "website",
    name: "Haladó weboldal",
    shortName: "Haladó",
    price: 149990,
    billing: "once",
    badge: "Növekedéshez",
    description: "Összetett oldal integrációkkal, többnyelvű lehetőséggel és haladó funkciókkal.",
    features: ["Legfeljebb 12 aloldal", "Bővített foglalás vagy külső integráció", "Haladó SEO", "3 kör módosítás"]
  },
  {
    id: "website-shop",
    category: "website",
    name: "Webshop",
    shortName: "Webshop",
    price: 199990,
    billing: "once",
    badge: "Online értékesítés",
    description: "Indulásra kész, fizetési és rendelési folyamattal felépített webáruház.",
    features: ["Legfeljebb 30 induló termék", "Fizetési integráció", "Rendelési e-mailek", "Betanítás és átadás"]
  },
  {
    id: "marketing-mini",
    category: "marketing",
    name: "Marketing Mini",
    shortName: "Mini",
    price: 4990,
    billing: "monthly",
    badge: "Belépő",
    description: "Rendszeres tartalom egyetlen közösségi felülethez.",
    features: ["8 posztszöveg havonta", "8 egyedi kreatív", "1 platform", "2 újragenerálás"]
  },
  {
    id: "marketing-start",
    category: "marketing",
    name: "Marketing Start",
    shortName: "Start",
    price: 9990,
    billing: "monthly",
    featured: true,
    badge: "Legnépszerűbb",
    description: "Egy teljes havi tartalomterv két közösségi csatornára.",
    features: ["12 poszt és kreatív", "2 platform", "Tartalomnaptár", "Jóváhagyási felület"]
  },
  {
    id: "marketing-pro",
    category: "marketing",
    name: "Marketing Pro",
    shortName: "Pro",
    price: 19990,
    billing: "monthly",
    badge: "Automatizált",
    description: "Folyamatos kommunikáció cikkekkel és kampányanyagokkal.",
    features: ["20 poszt és kreatív", "2 blogcikk", "Hirdetésszövegek", "Közzétételre előkészítve"]
  },
  {
    id: "marketing-max",
    category: "marketing",
    name: "Marketing Max",
    shortName: "Max",
    price: 34990,
    billing: "monthly",
    badge: "Többcsatornás",
    description: "Komplex havi jelenlét több csatornára és rendszeres riporttal.",
    features: ["30 poszt és kreatív", "4 blogcikk", "Hírlevélcsomag", "Havi teljesítményriport"]
  },
  {
    id: "maintenance-monitor",
    category: "maintenance",
    name: "Monitor",
    shortName: "Monitor",
    price: 2990,
    billing: "monthly",
    badge: "Alapvédelem",
    description: "Napi automatikus elérhetőség- és SSL-ellenőrzés, naplózott eredményekkel.",
    features: ["Napi elérhetőség-ellenőrzés", "Ismétlődő hibák jelzése", "SSL-figyelés", "30 méréses előzmény"]
  },
  {
    id: "maintenance-basic",
    category: "maintenance",
    name: "Karbantartás Basic",
    shortName: "Basic",
    price: 5990,
    billing: "monthly",
    featured: true,
    badge: "Legnépszerűbb",
    description: "A legfontosabb frissítések és mentések kisvállalati oldalakhoz.",
    features: ["Monitor csomag", "Biztonsági mentés", "Rendszerfrissítések", "Biztonsági ellenőrzés"]
  },
  {
    id: "maintenance-plus",
    category: "maintenance",
    name: "Karbantartás Plus",
    shortName: "Plus",
    price: 9990,
    billing: "monthly",
    badge: "Tartalommal",
    description: "Technikai gondoskodás rendszeres kisebb tartalmi módosításokkal.",
    features: ["Basic csomag", "Havi 2 kisebb módosítás", "Sebességellenőrzés", "Prioritásos hibajegy"]
  },
  {
    id: "maintenance-pro",
    category: "maintenance",
    name: "Karbantartás Pro",
    shortName: "Pro",
    price: 19990,
    billing: "monthly",
    badge: "Teljes felügyelet",
    description: "Folyamatos technikai és SEO-felügyelet üzletileg fontos oldalakhoz.",
    features: ["Plus csomag", "Technikai SEO", "Prioritásos javítás", "Részletes havi riport"]
  },
  {
    id: "marketing-launch",
    category: "oneoff",
    name: "Induló marketingcsomag",
    shortName: "Induló pack",
    price: 14990,
    billing: "once",
    badge: "Egyszeri",
    description: "Márkaüzenetek és induló tartalmak egy új vállalkozás bevezetéséhez.",
    features: ["Célcsoport és hangnem", "10 induló poszt", "Kreatívok", "30 napos terv"]
  },
  {
    id: "marketing-month",
    category: "oneoff",
    name: "30 napos tartalomcsomag",
    shortName: "30 napos pack",
    price: 19990,
    billing: "once",
    badge: "Egyszeri",
    description: "Egy teljes hónap előre elkészített kommunikációja előfizetés nélkül.",
    features: ["16 poszt és kép", "Tartalomnaptár", "2 platform formátum", "Letölthető csomag"]
  },
  {
    id: "marketing-campaign",
    category: "oneoff",
    name: "Kampánycsomag",
    shortName: "Kampány pack",
    price: 39990,
    billing: "once",
    badge: "Egyszeri",
    description: "Komplett ajánlat- és kampányanyag egy konkrét értékesítési célhoz.",
    features: ["Kampánykoncepció", "Landing oldal szöveg", "12 kreatív", "Hirdetés- és e-mail szövegek"]
  },
  {
    id: "quick-audit",
    category: "oneoff",
    name: "Gyors weboldal-ellenőrzés",
    shortName: "Gyors ellenőrzés",
    price: 990,
    billing: "once",
    availability: "retired",
    badge: "Kipróbáláshoz",
    availabilityNote: "Közvetlenül fizethető · egy nyilvános magyar vállalkozói weboldalhoz.",
    description: "Rövid, egyedi technikai átnézés egy megadott nyilvános webcímről.",
    features: ["Mobilnézet és HTTPS", "Betöltési alapellenőrzés", "Fő technikai hibák", "3 konkrét javítási javaslat", "Átadás 3 munkanapon belül"]
  },
  {
    id: "external-audit",
    category: "oneoff",
    name: "Külső weboldal audit",
    shortName: "Weboldal audit",
    price: 9990,
    billing: "once",
    badge: "Karbantartás előtt",
    description: "Más által készített weboldal technikai állapotának felmérése.",
    features: ["Biztonsági ellenőrzés", "Sebességmérés", "Frissítési kockázatok", "Javítási terv"]
  }
]);

export const CATEGORY_LABELS = Object.freeze({
  website: "Weboldalak",
  marketing: "Marketing",
  maintenance: "Karbantartás",
  oneoff: "Egyszeri csomagok"
});

export function getProduct(productId) {
  return PRODUCT_CATALOG.find((product) => product.id === productId) || null;
}

// hu-HU leaves four-digit numbers ungrouped ("5990"), which reads inconsistently
// next to the grouped prices on the page. Group every thousand, non-breaking.
export function formatPrice(amount) {
  return String(Math.round(Number(amount) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " Ft";
}

export function billingLabel(product) {
  return product.billing === "monthly" ? "havidíj" : "egyszeri díj";
}
