(function () {
    const STORAGE_KEY = "ovexi_lang";
    const CONSENT_STORAGE_KEY = "ovexi_cookie_consent_v1";

    function canUsePreferenceStorage() {
        const manager = window.OVEXI_COOKIE_CONSENT;
        if (!manager || typeof manager.canUse !== "function") {
            try {
                const rawConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
                if (!rawConsent) return false;
                const parsedConsent = JSON.parse(rawConsent);
                return Boolean(parsedConsent && parsedConsent.preferences);
            } catch {
                return false;
            }
        }
        return manager.canUse("preferences");
    }

    function getStoredLanguage() {
        if (!canUsePreferenceStorage()) {
            return null;
        }
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch {
            return null;
        }
    }

    function setStoredLanguage(lang) {
        if (!canUsePreferenceStorage()) {
            return;
        }
        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch {
            // Ignore storage failures.
        }
    }

    const dictionary = {
        hu: {
            pageTitle: "OVEXI - Weboldal fejlesztés",
            navHome: "Főoldal",
            navPackages: "Csomagok",
            navContact: "Kapcsolat",
            navReview: "Vélemény",
            heroTitle: "Professzionális Weboldal a vállalkozásodnak",
            heroText: "Modern, SEO-optimalizált weboldalak, amelyek eredményeket hoznak. Segítünk a digitális jelenlétedben, hogy több ügyfelet érj el.",
            heroCta: "Csomagok megtekintése",
            whyTitle: "Miért válassz minket?",
            why1Title: "Professzionális Tervezés",
            why1Text: "Modern és egyedi weboldalakat készítünk, amelyek tükrözik a vállalkozásod egyediségét.",
            why2Title: "SEO Optimalizálás",
            why2Text: "Weboldalaink SEO-barátak, hogy előrébb kerülj a keresőmotorok találati listáján.",
            why3Title: "Gyors Betöltési Idő",
            why3Text: "Optimalizált kód és képek biztosítják, hogy weboldalad gyorsan betöltődjön minden eszközön.",
            why4Title: "Kiváló Ügyfélszolgálat",
            why4Text: "Mindig elérhetőek vagyunk, hogy segítsünk és válaszoljunk a kérdéseidre.",
            partnersTitle: "Partnereink",
            partnersText: "",
            partnerTag1: "Weboldal helyi éttermek kereséséhez",
            partnerTag2: "Marketinglehetőség éttermeknek és extra jövedelem lakáskiadóknak",
            partnerTag3: "Turisztikai és információs portál",
            partnerTag4: "Légy te a következő!",
            servicesTitle: "Fedezd fel a hozzád illő csomagot",
            servicesText: "Minden csomag tartalmazza a professzionális tervezést és az igényeidre szabott megoldásokat. Vagy állítsd össze a saját csomagodat a testreszabott opcióban!",
            pkgInfoBtn: "Részletes információ",
            pickBtn: "Választom",
            packageBadgePopular: "Népszerű",
            packageTitleBasic: "Alapcsomag",
            packageTitlePremium: "Prémium Csomag",
            packageTitleBusiness: "Üzleti Csomag",
            packageFeaturesBasic: [
                "Reszponzív weboldal",
                "Gyors betöltési idő",
                "Mobilbarát dizájn",
                "SEO optimalizálás",
                "Kapcsolati űrlap",
                "SSL tanúsítvány",
                "1-5 aloldal",
                "Alap dizájn",
                "Domain 1 évre",
                "1 GB e-mail tárhely (akár 5 e-mail cím) 1 évre",
                "1 GB webtárhely 1 évre",
                "Karbantartás és social media menedzsment opcionális"
            ],
            packageFeaturesPremium: [
                "Reszponzív weboldal",
                "Haladó SEO optimalizálás",
                "1-10 aloldal",
                "Gyors betöltési idő",
                "Eseménynaptár integráció",
                "Mobilbarát dizájn",
                "Kapcsolati űrlap",
                "Vélemény modul",
                "SSL tanúsítvány",
                "Többnyelvűség",
                "Komplex dizájn",
                "1 GB e-mail tárhely (akár 5 e-mail cím) 1 évre",
                "1 GB webtárhely 1 évre",
                "Domain 1 évre",
                "Karbantartás és social media menedzsment opcionális"
            ],
            packageFeaturesBusiness: [
                "Reszponzív weboldal",
                "Haladó SEO optimalizálás",
                "Korlátlan aloldal",
                "Gyors betöltési idő",
                "Eseménynaptár integráció",
                "Mobilbarát dizájn",
                "Kapcsolati űrlap",
                "Vélemény modul",
                "SSL tanúsítvány",
                "Többnyelvűség",
                "Prémium dizájn",
                "Teljes adminfelület",
                "Chatbot",
                "5 GB e-mail tárhely (akár 10 e-mail cím) 1 évre",
                "5 GB webtárhely 1 évre",
                "Domain 1 évre",
                "Karbantartás és social media menedzsment opcionális"
            ],
            customTitle: "Saját Csomag",
            customPeriod: "Testreszabott",
            customHint: "Nem tudsz dönteni? Állítsd össze magadnak!",
            customPlanBtn: "Tervezz most",
            builderStep1Title: "Weboldalad Konfigurálása",
            builderStep1Text: "Válaszd ki, hány oldalra van szükséged és az alapvető funkciók közül.",
            pageCountLabel: "Oldalak száma:",
            featuresLabel: "Funkciók (válaszd ki a szükségeseket):",
            estPrice: "Becsült ár:",
            nextBtn: "Következő",
            builderStep2Title: "Elérhetőséged",
            builderStep2Text: "Add meg az adataidat, hogy felvehessek veled a kapcsolatot az ajánlattal.",
            backBtn: "Vissza",
            sendBtn: "Küldés",
            customDetailsLabel: "Projekt leírása",
            rangeLabel1: "1-5",
            rangeLabel2: "1-10",
            rangeLabel3: "Korlátlan",
            seoGroupTitle: "SEO (egyet válassz):",
            seoNone: "SEO - nincs (+0 Ft)",
            seoBasic: "SEO - Alap (+20,000 Ft)",
            seoAdvanced: "SEO - Haladó (+40,000 Ft)",
            designGroupTitle: "Dizájn (egyet válassz):",
            designNone: "Dizájn - nincs (+0 Ft)",
            designBasic: "Dizájn - Alap (+30,000 Ft)",
            designComplex: "Dizájn - Komplex (+50,000 Ft)",
            designPremium: "Dizájn - Prémium (+85,000 Ft)",
            featureMultilang: "Többnyelvűség (+40,000 Ft / nyelv)",
            featureEcommerce: "E-commerce / online fizetési rendszer (+180,000 Ft)",
            featureCalendar: "Naptárkezelés (+25,000 Ft)",
            featureAdmin: "Adminoldal (+40,000 Ft)",
            featureUsers: "Felhasználói rendszer (+70,000 Ft)",
            featureChatbot: "Chatbot / live chat (+20,000 Ft)",
            featureDomain: "Domain 1 évre (+5,000 Ft)",
            hostingGroupTitle: "Tárhely (egyet válassz):",
            hostingNone: "Tárhely - nincs (+0 Ft)",
            hosting1gb: "Tárhely 1 évre - 1 GB (+16,000 Ft)",
            hosting5gb: "Tárhely 1 évre - 5 GB (+25,000 Ft)",
            maintenanceGroupTitle: "Karbantartás (egyet válassz):",
            maintenanceNone: "Karbantartás - nincs (+0 Ft / hó)",
            maintenanceBasic: "Karbantartás - Alap (+20,000 Ft / hó)",
            maintenanceFull: "Karbantartás - Átfogó (+30,000 Ft / hó)",
            maintenanceComplex: "Karbantartás - Komplex (+50,000 Ft / hó)",
            socialGroupTitle: "Social media kezelés (egyet válassz):",
            socialNone: "Social media kezelés - nincs (+0 Ft / hó)",
            socialManagement: "Social media kezelés (Instagram, Facebook, TikTok) (+55,000 Ft / hó)",
            contactTitle: "Lépj velünk kapcsolatba",
            contactText: "Töltsd ki az űrlapot és hamarosan felveszem veled a kapcsolatot",
            phoneHint: "A gyorsabb ügyintézés érdekében add meg a telefonszámod",
            labelName: "Név *",
            labelEmail: "E-mail cím *",
            labelPhone: "Telefonszám",
            labelPackage: "Választott csomag *",
            labelMessage: "Üzenet / Részletek *",
            contactPlaceholder: "Írj pár szót a projektedről...",
            packageChoose: "Válassz csomagot...",
            packageOptionBasic: "Alapcsomag - 70,000 Ft",
            packageOptionPremium: "Prémium Csomag - 150,000 Ft",
            packageOptionBusiness: "Üzleti Csomag - 330,000 Ft",
            contactSubmitBtn: "Üzenet küldése",
            consultationTitle: "Ingyenes Konzultáció",
            consultationText: "Nem vagy biztos benne, melyik csomag illik hozzád? Semmi gond! Foglalj egy ingyenes, kötelezettségmentes konzultációt, és közösen megtaláljuk a legjobb megoldást a vállalkozásodnak.",
            noteText: "Általában 24 órán belül válaszolok. Hétvégén is elérhető vagyok!",
            floatingConsult: "Ingyenes konzultáció",
            backToTopAria: "Vissza az oldal tetejére",
            backToTopTitle: "Vissza fel",
            footerText: "© 2026 OVEXI. Minden jog fenntartva.",
            cookiePolicyLink: "Cookie tájékoztató",
            cookieRegionAria: "Cookie hozzájárulás",
            cookieTitle: "Cookie beállítások",
            cookieText: "A weboldal működéséhez szükséges cookie-kat és tárolást mindig használunk. A kényelmi cookie-k (pl. nyelvi beállítás) csak hozzájárulás után aktívak.",
            cookieReject: "Csak szükséges",
            cookieSettings: "Beállítások",
            cookieAccept: "Összes elfogadása",
            cookieFab: "Cookie beállítások",
            cookieFabAria: "Cookie beállítások megnyitása",
            cookieModalTitle: "Cookie beállítások",
            cookieModalIntro: "Az alábbi kategóriák között választhatsz. A szükséges cookie-k nélkül az oldal nem működik megfelelően.",
            cookieNecessaryTitle: "Szükséges",
            cookieNecessaryHelp: "Biztonsági, űrlap-küldési védelmi és működési funkciók.",
            cookieNecessaryLabel: "Szükséges",
            cookiePrefTitle: "Kényelmi",
            cookiePrefHelp: "Nyelvi beállítás és használati preferenciák megjegyzése.",
            cookiePrefLabel: "Engedélyezve",
            cookieAnalyticsTitle: "Analitikai",
            cookieAnalyticsHelp: "Forgalmi és használati statisztikák gyűjtése (pl. gombkattintások, forrás, oldalmegtekintések).",
            cookieAnalyticsLabel: "Engedélyezve",
            cookieDetailsPrefix: "Részletek:",
            cookieSave: "Beállítások mentése",
            reviewTitle: "Írj véleményt",
            reviewText: "Oszd meg a tapasztalatod. A jó véleményed felhőként megjelenik a fő­oldalon.",
            reviewNameLabel: "Név *",
            reviewRatingLabel: "Értékelés *",
            reviewMessageLabel: "Vélemény *",
            reviewNamePlaceholder: "Pl. Kiss Anna",
            reviewMessagePlaceholder: "Mit értékeltél a közös munkában?",
            reviewSubmitBtn: "Vélemény mentése",
            ratingChoose: "Válassz...",
            packageModalTitle: "Csomag részletek"
        },
        en: {
            pageTitle: "OVEXI - Website development",
            navHome: "Home",
            navPackages: "Packages",
            navContact: "Contact",
            navReview: "Review",
            heroTitle: "Professional Website for Your Business",
            heroText: "Modern, SEO-optimized websites that deliver results. I help build your digital presence so you can reach more clients.",
            heroCta: "View Packages",
            whyTitle: "Why Choose Us?",
            why1Title: "Professional Design",
            why1Text: "We build modern and unique websites that reflect your brand identity.",
            why2Title: "SEO Optimization",
            why2Text: "Our websites are SEO-friendly so you can rank higher in search engines.",
            why3Title: "Fast Loading Speed",
            why3Text: "Optimized code and images ensure your site loads quickly on every device.",
            why4Title: "Excellent Support",
            why4Text: "We are always available to help and answer your questions.",
            partnersTitle: "Our Partners",
            partnersText: "We work alongside online projects that build stable presence, stronger visibility, and trust.",
            partnerTag1: "Website for finding local restaurants",
            partnerTag2: "Marketing opportunities for restaurants and extra income for property hosts",
            partnerTag3: "Tourism and information portal",
            partnerTag4: "Be the next one!",
            servicesTitle: "Choose from the Packages",
            servicesText: "Every package includes professional design and solutions tailored to your needs",
            pkgInfoBtn: "Detailed info",
            pickBtn: "Choose",
            packageBadgePopular: "Popular",
            packageTitleBasic: "Starter Package",
            packageTitlePremium: "Premium Package",
            packageTitleBusiness: "Business Package",
            packageFeaturesBasic: [
                "Responsive website",
                "Fast loading speed",
                "Mobile-friendly design",
                "SEO optimization",
                "Contact form",
                "SSL certificate",
                "1-5 pages",
                "Basic design",
                "Domain for 1 year",
                "1 GB email hosting (up to 5 email accounts) for 1 year",
                "1 GB web hosting for 1 year",
                "Maintenance and social media management optional"
            ],
            packageFeaturesPremium: [
                "Responsive website",
                "Advanced SEO optimization",
                "1-10 pages",
                "Fast loading speed",
                "Event calendar integration",
                "Mobile-friendly design",
                "Contact form",
                "Review module",
                "SSL certificate",
                "Multilingual support",
                "Complex design",
                "1 GB email hosting (up to 5 email accounts) for 1 year",
                "1 GB web hosting for 1 year",
                "Domain for 1 year",
                "Maintenance and social media management optional"
            ],
            packageFeaturesBusiness: [
                "Responsive website",
                "Advanced SEO optimization",
                "Unlimited pages",
                "Fast loading speed",
                "Event calendar integration",
                "Mobile-friendly design",
                "Contact form",
                "Review module",
                "SSL certificate",
                "Multilingual support",
                "Premium design",
                "Full admin panel",
                "Chatbot",
                "5 GB email hosting (up to 10 email accounts) for 1 year",
                "5 GB web hosting for 1 year",
                "Domain for 1 year",
                "Maintenance and social media management optional"
            ],
            customTitle: "Custom Package",
            customPeriod: "Tailor-made",
            customHint: "Not sure yet? Build your own package!",
            customPlanBtn: "Build Now",
            builderStep1Title: "Configure Your Website",
            builderStep1Text: "Choose how many pages you need and select the core features.",
            pageCountLabel: "Number of pages:",
            featuresLabel: "Features (select what you need):",
            estPrice: "Estimated price:",
            nextBtn: "Next",
            builderStep2Title: "Your Contact Details",
            builderStep2Text: "Enter your details so I can contact you with a tailored offer.",
            backBtn: "Back",
            sendBtn: "Send",
            customDetailsLabel: "Project description",
            rangeLabel1: "1-5",
            rangeLabel2: "1-10",
            rangeLabel3: "Unlimited",
            seoGroupTitle: "SEO (choose one):",
            seoNone: "SEO - none (+0 HUF)",
            seoBasic: "SEO - Basic (+20,000 HUF)",
            seoAdvanced: "SEO - Advanced (+40,000 HUF)",
            designGroupTitle: "Design (choose one):",
            designNone: "Design - none (+0 HUF)",
            designBasic: "Design - Basic (+30,000 HUF)",
            designComplex: "Design - Complex (+50,000 HUF)",
            designPremium: "Design - Premium (+85,000 HUF)",
            featureMultilang: "Multilingual support (+40,000 HUF / language)",
            featureEcommerce: "E-commerce / online payment system (+180,000 HUF)",
            featureCalendar: "Calendar management (+25,000 HUF)",
            featureAdmin: "Admin page (+40,000 HUF)",
            featureUsers: "User system (+70,000 HUF)",
            featureChatbot: "Chatbot / live chat (+20,000 HUF)",
            featureDomain: "Domain for 1 year (+5,000 HUF)",
            hostingGroupTitle: "Hosting (choose one):",
            hostingNone: "Hosting - none (+0 HUF)",
            hosting1gb: "Hosting for 1 year - 1 GB (+16,000 HUF)",
            hosting5gb: "Hosting for 1 year - 5 GB (+25,000 HUF)",
            maintenanceGroupTitle: "Maintenance (choose one):",
            maintenanceNone: "Maintenance - none (+0 HUF / month)",
            maintenanceBasic: "Maintenance - Basic (+20,000 HUF / month)",
            maintenanceFull: "Maintenance - Full (+30,000 HUF / month)",
            maintenanceComplex: "Maintenance - Complex (+50,000 HUF / month)",
            socialGroupTitle: "Social media management (choose one):",
            socialNone: "Social media management - none (+0 HUF / month)",
            socialManagement: "Social media management (Instagram, Facebook, TikTok) (+55,000 HUF / month)",
            contactTitle: "Get in Touch",
            contactText: "Fill out the form and I will contact you soon",
            phoneHint: "For faster response, please add your phone number",
            labelName: "Name *",
            labelEmail: "Email *",
            labelPhone: "Phone",
            labelPackage: "Selected package *",
            labelMessage: "Message / Details *",
            contactPlaceholder: "Tell me a few words about your project...",
            packageChoose: "Choose a package...",
            packageOptionBasic: "Starter Package - 70,000 HUF",
            packageOptionPremium: "Premium Package - 150,000 HUF",
            packageOptionBusiness: "Business Package - 330,000 HUF",
            contactSubmitBtn: "Send message",
            consultationTitle: "Free Consultation",
            consultationText: "Not sure which package fits you? No problem. Book a free, no-obligation consultation and we will find the best solution for your business together.",
            noteText: "I usually reply within 24 hours. Available on weekends too!",
            floatingConsult: "Free consultation",
            backToTopAria: "Back to top",
            backToTopTitle: "Go up",
            footerText: "© 2026 OVEXI. All rights reserved.",
            cookiePolicyLink: "Cookie policy",
            cookieRegionAria: "Cookie consent",
            cookieTitle: "Cookie settings",
            cookieText: "We always use cookies and storage required for the website to function. Preference cookies (e.g. language setting) are only active after consent.",
            cookieReject: "Necessary only",
            cookieSettings: "Settings",
            cookieAccept: "Accept all",
            cookieFab: "Cookie settings",
            cookieFabAria: "Open cookie settings",
            cookieModalTitle: "Cookie settings",
            cookieModalIntro: "You can choose from the categories below. Without necessary cookies, the website cannot function properly.",
            cookieNecessaryTitle: "Necessary",
            cookieNecessaryHelp: "Security, form-submission protection, and essential functionality.",
            cookieNecessaryLabel: "Necessary",
            cookiePrefTitle: "Preferences",
            cookiePrefHelp: "Remembering language and usage preferences.",
            cookiePrefLabel: "Enabled",
            cookieAnalyticsTitle: "Analytics",
            cookieAnalyticsHelp: "Collect traffic and usage statistics (e.g. button clicks, sources, page views).",
            cookieAnalyticsLabel: "Enabled",
            cookieDetailsPrefix: "Details:",
            cookieSave: "Save settings",
            reviewTitle: "Write a review",
            reviewText: "Share your experience. Your positive review appears as a cloud on the homepage.",
            reviewNameLabel: "Name *",
            reviewRatingLabel: "Rating *",
            reviewMessageLabel: "Review *",
            reviewNamePlaceholder: "E.g. Anna Kiss",
            reviewMessagePlaceholder: "What did you value most in our collaboration?",
            reviewSubmitBtn: "Save review",
            ratingChoose: "Choose...",
            packageModalTitle: "Package details"
        }
    };

    function setText(sel, val) {
        const node = document.querySelector(sel);
        if (node && val) node.textContent = val;
    }

    function setAllText(sel, val) {
        if (!val) return;
        document.querySelectorAll(sel).forEach((node) => {
            node.textContent = val;
        });
    }

    function applyLanguage(lang) {
        const t = dictionary[lang] || dictionary.hu;
        document.documentElement.setAttribute("lang", lang);
        document.title = t.pageTitle;

        setText(".nav-links li:nth-child(1) a", t.navHome);
        setText(".nav-links li:nth-child(2) a", t.navPackages);
        setText(".nav-links li:nth-child(3) a", t.navContact);
        setText("#openReviewModalBtn", t.navReview);

        setText(".hero-content h1", t.heroTitle);
        setText(".hero-content p", t.heroText);
        setText(".hero-content .cta-button", t.heroCta);

        setText(".why-choose-us h2", t.whyTitle);
        setText("#featureSlider .feature-item[data-index='0'] h3", t.why1Title);
        setText("#featureSlider .feature-item[data-index='0'] p", t.why1Text);
        setText("#featureSlider .feature-item[data-index='1'] h3", t.why2Title);
        setText("#featureSlider .feature-item[data-index='1'] p", t.why2Text);
        setText("#featureSlider .feature-item[data-index='2'] h3", t.why3Title);
        setText("#featureSlider .feature-item[data-index='2'] p", t.why3Text);
        setText("#featureSlider .feature-item[data-index='3'] h3", t.why4Title);
        setText("#featureSlider .feature-item[data-index='3'] p", t.why4Text);

        setText("#partners .section-header h2", t.partnersTitle);
        setText("#partners .section-header p", t.partnersText);
        const partnerTags = document.querySelectorAll(".partner-tag");
        if (partnerTags.length >= 4) {
            partnerTags[0].textContent = t.partnerTag1;
            partnerTags[1].textContent = t.partnerTag2;
            partnerTags[2].textContent = t.partnerTag3;
            partnerTags[3].textContent = t.partnerTag4;
        }

        setText("#services .section-header h2", t.servicesTitle);
        setText("#services .section-header p", t.servicesText);
        setAllText(".package-info-button", t.pkgInfoBtn);
        setAllText(".pricing-card .pricing-button:not(#openCustomPackageBuilder)", t.pickBtn);

        const pricingBadge = document.querySelector(".pricing-badge");
        if (pricingBadge) pricingBadge.textContent = t.packageBadgePopular;

        const pricingHeaders = document.querySelectorAll(".pricing-grid .pricing-card:not(.custom-package-card) .pricing-header h3");
        if (pricingHeaders.length >= 3) {
            pricingHeaders[0].textContent = t.packageTitleBasic;
            pricingHeaders[1].textContent = t.packageTitlePremium;
            pricingHeaders[2].textContent = t.packageTitleBusiness;
        }

        const pricingFeatureLists = document.querySelectorAll(".pricing-grid .pricing-card:not(.custom-package-card) .pricing-features");
        const featureSets = [t.packageFeaturesBasic, t.packageFeaturesPremium, t.packageFeaturesBusiness];
        pricingFeatureLists.forEach((list, index) => {
            const texts = featureSets[index] || [];
            const items = list.querySelectorAll("li");
            items.forEach((item, itemIndex) => {
                if (texts[itemIndex]) {
                    item.textContent = texts[itemIndex];
                }
            });
        });

        setText(".custom-package-card .pricing-header h3", t.customTitle);
        setText(".custom-package-card .price-period", t.customPeriod);
        setText(".custom-package-card p", t.customHint);
        setText("#openCustomPackageBuilder", t.customPlanBtn);

        setText("#customBuilderStep1 h2", t.builderStep1Title);
        setText("#customBuilderStep1 .custom-builder-subtitle", t.builderStep1Text);

        const pageLabelNode = document.querySelector("#customBuilderStep1 .custom-builder-label");
        if (pageLabelNode) {
            const valueNode = pageLabelNode.querySelector("#pageCountDisplay");
            pageLabelNode.textContent = `${t.pageCountLabel} `;
            if (valueNode) {
                pageLabelNode.appendChild(valueNode);
            }
        }

        setText("#customBuilderStep1 .custom-builder-section:nth-of-type(2) .custom-builder-label", t.featuresLabel);

        const pricePreviewP = document.querySelector(".custom-builder-price-preview p");
        if (pricePreviewP) {
            const strong = pricePreviewP.querySelector("strong");
            pricePreviewP.textContent = `${t.estPrice} `;
            if (strong) {
                pricePreviewP.appendChild(strong);
            }
        }

        setText("#customBuilderNextBtn", t.nextBtn);
        setText("#customBuilderStep2 h2", t.builderStep2Title);
        setText("#customBuilderStep2 .custom-builder-subtitle", t.builderStep2Text);
        setText("label[for='customDetails']", t.customDetailsLabel);
        setText("#customBuilderBackBtn", t.backBtn);
        setText("#customBuilderStep2 button[type='submit']", t.sendBtn);

        const rangeLabels = document.querySelectorAll(".custom-range-labels span");
        if (rangeLabels.length >= 3) {
            rangeLabels[0].textContent = t.rangeLabel1;
            rangeLabels[1].textContent = t.rangeLabel2;
            rangeLabels[2].textContent = t.rangeLabel3;
        }

        const customFeatureGroupTitles = document.querySelectorAll(".custom-feature-group-title");
        if (customFeatureGroupTitles.length >= 5) {
            customFeatureGroupTitles[0].textContent = t.seoGroupTitle;
            customFeatureGroupTitles[1].textContent = t.designGroupTitle;
            customFeatureGroupTitles[2].textContent = t.hostingGroupTitle;
            customFeatureGroupTitles[3].textContent = t.maintenanceGroupTitle;
            customFeatureGroupTitles[4].textContent = t.socialGroupTitle;
        }

        const customFeatureChoices = document.querySelectorAll(".custom-feature-checkbox");
        const customFeatureTexts = [
            t.seoNone,
            t.seoBasic,
            t.seoAdvanced,
            t.designNone,
            t.designBasic,
            t.designComplex,
            t.designPremium,
            t.featureMultilang,
            t.featureEcommerce,
            t.featureCalendar,
            t.featureAdmin,
            t.featureUsers,
            t.featureChatbot,
            t.featureDomain,
            t.hostingNone,
            t.hosting1gb,
            t.hosting5gb,
            t.maintenanceNone,
            t.maintenanceBasic,
            t.maintenanceFull,
            t.maintenanceComplex,
            t.socialNone,
            t.socialManagement
        ];
        customFeatureChoices.forEach((label, index) => {
            const nextText = customFeatureTexts[index];
            if (!nextText) return;
            const textNode = Array.from(label.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim().length);
            if (textNode) {
                textNode.nodeValue = ` ${nextText}`;
            } else {
                label.append(` ${nextText}`);
            }
        });

        setText("#contact .section-header h2", t.contactTitle);
        setText("#contact .section-header p", t.contactText);
        setText("#contact .phoneNum", t.phoneHint);

        const labels = document.querySelectorAll("#contact .form-group label");
        if (labels.length >= 5) {
            labels[0].textContent = t.labelName;
            labels[1].textContent = t.labelEmail;
            labels[2].textContent = t.labelPhone;
            labels[3].textContent = t.labelPackage;
            labels[4].textContent = t.labelMessage;
        }

        const messageInput = document.getElementById("message");
        if (messageInput) {
            messageInput.placeholder = t.contactPlaceholder;
        }

        const packageSelect = document.getElementById("package");
        if (packageSelect && packageSelect.options.length >= 4) {
            packageSelect.options[0].textContent = t.packageChoose;
            packageSelect.options[1].textContent = t.packageOptionBasic;
            packageSelect.options[2].textContent = t.packageOptionPremium;
            packageSelect.options[3].textContent = t.packageOptionBusiness;
        }

        setText("#contactForm .submit-button", t.contactSubmitBtn);

        setText("#info-section h2", t.consultationTitle);
        setText("#info-section .info-subtitle", t.consultationText);
        setText("#info-section .info-note", t.noteText);
        setText(".floating-consultation-button", t.floatingConsult);
        const backToTopBtn = document.getElementById("backToTopBtn");
        if (backToTopBtn) {
            backToTopBtn.setAttribute("aria-label", t.backToTopAria);
            backToTopBtn.setAttribute("title", t.backToTopTitle);
        }
        setText("footer p", t.footerText);
        setText(".footer-legal-links a", t.cookiePolicyLink);

        const cookieConsent = document.getElementById("cookieConsent");
        if (cookieConsent) cookieConsent.setAttribute("aria-label", t.cookieRegionAria);
        setText(".cookie-consent-title", t.cookieTitle);
        setText(".cookie-consent-text", t.cookieText);
        setText("#cookieRejectBtn", t.cookieReject);
        setText("#cookieOpenSettingsBtn", t.cookieSettings);
        setText("#cookieAcceptBtn", t.cookieAccept);
        setText("#cookieSettingsFab", t.cookieFab);

        const cookieFab = document.getElementById("cookieSettingsFab");
        if (cookieFab) cookieFab.setAttribute("aria-label", t.cookieFabAria);
        setText("#cookieSettingsTitle", t.cookieModalTitle);
        setText(".cookie-settings-intro", t.cookieModalIntro);
        const cookieSettingTitles = document.querySelectorAll(".cookie-setting-title");
        if (cookieSettingTitles.length >= 3) {
            cookieSettingTitles[0].textContent = t.cookieNecessaryTitle;
            cookieSettingTitles[1].textContent = t.cookiePrefTitle;
            cookieSettingTitles[2].textContent = t.cookieAnalyticsTitle;
        }
        const cookieSettingHelp = document.querySelectorAll(".cookie-setting-help");
        if (cookieSettingHelp.length >= 3) {
            cookieSettingHelp[0].textContent = t.cookieNecessaryHelp;
            cookieSettingHelp[1].textContent = t.cookiePrefHelp;
            cookieSettingHelp[2].textContent = t.cookieAnalyticsHelp;
        }
        const cookieSwitchLabels = document.querySelectorAll(".cookie-switch span");
        if (cookieSwitchLabels.length >= 3) {
            cookieSwitchLabels[0].textContent = t.cookieNecessaryLabel;
            cookieSwitchLabels[1].textContent = t.cookiePrefLabel;
            cookieSwitchLabels[2].textContent = t.cookieAnalyticsLabel;
        }
        const cookieDetailsLink = document.querySelector(".cookie-settings-links a");
        if (cookieDetailsLink) {
            cookieDetailsLink.textContent = t.cookiePolicyLink;
            const parent = cookieDetailsLink.parentNode;
            if (parent && parent.firstChild) {
                parent.firstChild.nodeValue = `${t.cookieDetailsPrefix} `;
            }
        }
        setText("#cookieSettingsRejectBtn", t.cookieReject);
        setText("#cookieSettingsSaveBtn", t.cookieSave);

        setText("#reviewModalTitle", t.reviewTitle);
        setText("#reviewModal .review-modal p", t.reviewText);

        const reviewLabels = document.querySelectorAll("#reviewForm .review-form-group label");
        if (reviewLabels.length >= 3) {
            reviewLabels[0].textContent = t.reviewNameLabel;
            reviewLabels[1].textContent = t.reviewRatingLabel;
            reviewLabels[2].textContent = t.reviewMessageLabel;
        }

        const reviewName = document.getElementById("reviewName");
        if (reviewName) {
            reviewName.placeholder = t.reviewNamePlaceholder;
        }

        const reviewMessage = document.getElementById("reviewMessage");
        if (reviewMessage) {
            reviewMessage.placeholder = t.reviewMessagePlaceholder;
        }

        const reviewSubmit = document.getElementById("submitReviewBtn");
        if (reviewSubmit) {
            reviewSubmit.textContent = t.reviewSubmitBtn;
        }

        const reviewSelect = document.getElementById("reviewRating");
        if (reviewSelect && reviewSelect.options.length >= 6) {
            reviewSelect.options[0].textContent = t.ratingChoose;
            if (lang === "en") {
                reviewSelect.options[1].textContent = "5 - Excellent";
                reviewSelect.options[2].textContent = "4 - Very good";
                reviewSelect.options[3].textContent = "3 - Good";
                reviewSelect.options[4].textContent = "2 - Fair";
                reviewSelect.options[5].textContent = "1 - Needs improvement";
            } else {
                reviewSelect.options[1].textContent = "5 - Kivalo";
                reviewSelect.options[2].textContent = "4 - Nagyon jo";
                reviewSelect.options[3].textContent = "3 - Jo";
                reviewSelect.options[4].textContent = "2 - Kozepes";
                reviewSelect.options[5].textContent = "1 - Fejlesztendo";
            }
        }

        setText("#packageModalTitle", t.packageModalTitle);

        const langButtons = document.querySelectorAll(".lang-pill");
        langButtons.forEach((button) => {
            const isActive = button.dataset.lang === lang;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", isActive ? "true" : "false");
        });

        const switcher = document.getElementById("langSwitcher");
        if (switcher) {
            switcher.dataset.active = lang;
        }
    }

    function initLanguageSwitcher() {
        const buttons = document.querySelectorAll(".lang-pill");
        if (!buttons.length) return;

        const FADE_OUT_MS = 430;
        let isSwitchingLanguage = false;

        function waitForNextPaint() {
            return new Promise((resolve) => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(resolve);
                });
            });
        }

        function waitForVisualReadiness() {
            const fontReadyPromise = document.fonts && document.fonts.ready
                ? document.fonts.ready.catch(() => undefined)
                : Promise.resolve();

            return Promise.all([fontReadyPromise, waitForNextPaint()]);
        }

        buttons.forEach((button) => {
            button.addEventListener("click", async () => {
                if (isSwitchingLanguage) {
                    return;
                }

                // Always toggle: clicking either pill switches to the opposite language
                const current = document.documentElement.getAttribute("lang") === "en" ? "en" : "hu";
                const nextLang = current === "en" ? "hu" : "en";
                isSwitchingLanguage = true;
                setStoredLanguage(nextLang);
                document.body.classList.add("lang-switching");

                await new Promise((resolve) => {
                    setTimeout(resolve, FADE_OUT_MS);
                });

                applyLanguage(nextLang);
                await waitForVisualReadiness();
                document.body.classList.remove("lang-switching");
                isSwitchingLanguage = false;
            });
        });

        const stored = getStoredLanguage();
        const initialLang = stored === "en" ? "en" : "hu";
        applyLanguage(initialLang);

        window.addEventListener("ovexi-consent-updated", (event) => {
            const state = event?.detail;
            if (!state || typeof state !== "object") {
                return;
            }

            if (state.preferences) {
                const currentLang = document.documentElement.getAttribute("lang") === "en" ? "en" : "hu";
                setStoredLanguage(currentLang);
            } else {
                try {
                    localStorage.removeItem(STORAGE_KEY);
                } catch {
                    // Ignore storage failures.
                }
            }
        });
    }

    document.addEventListener("DOMContentLoaded", initLanguageSwitcher);
})();
