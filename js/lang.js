(function () {
    const STORAGE_KEY = "ovexi_lang";

    const dictionary = {
        hu: {
            pageTitle: "OVEXI - Weboldal fejlesztes",
            navHome: "Fooldal",
            navPackages: "Csomagok",
            navContact: "Kapcsolat",
            navReview: "Velemeny",
            heroTitle: "Professzionalis Weboldal a Vallalkozasodnak",
            heroText: "Modern, SEO-optimalizalt weboldalak, amelyek eredmenyeket hoznak. Segitek a digitalis jelenletedben, hogy tobb ugyfelet erj el.",
            heroCta: "Csomagok megtekintese",
            whyTitle: "Miert valassz minket?",
            why1Title: "Professzionalis Tervezes",
            why1Text: "Modern es egyedi weboldalakat keszitunk, amelyek tukrozik a vallalkozasod egyediseget.",
            why2Title: "SEO Optimalizalas",
            why2Text: "Weboldalaink SEO-baratak, hogy elorebb kerulj a keresomotorok talalati listajan.",
            why3Title: "Gyors Betoltesi Ido",
            why3Text: "Optimalizalt kod es kepek biztositjak, hogy weboldalad gyorsan betoltodjon minden eszkozon.",
            why4Title: "Kivalo Ugyfelszolgalat",
            why4Text: "Mindig elerhetoek vagyunk, hogy segitsunk es valaszoljunk a kerdeseidre.",
            partnersTitle: "Partnereink",
            partnersText: "Olyan online projektek mellett dolgozunk, amelyek stabil jelenletet, jobb lathatosagot es erosebb bizalmat epitenek.",
            servicesTitle: "Valassz a Csomagok Kozul",
            servicesText: "Minden csomag tartalmazza a professzionalis tervezest es az On igenyeire szabott megoldasokat",
            pkgInfoBtn: "Reszletes informacio",
            pickBtn: "Valasztom",
            customTitle: "Sajat Csomag",
            customPeriod: "Testreszabott",
            customHint: "Nem tudsz donteni? Allitsd ossze magadnak!",
            customPlanBtn: "Tervezz Most",
            builderStep1Title: "Weboldalad Konfiguralasa",
            builderStep1Text: "Valaszd ki, hany oldalra van szukseged es az alapveto funkciok kozul.",
            pageCountLabel: "Oldalak szama:",
            featuresLabel: "Funkciok (valassz ki az szuksegeseket):",
            estPrice: "Becsult ar:",
            nextBtn: "Kovetkezo",
            builderStep2Title: "Elerhetoseged",
            builderStep2Text: "Add meg az adataidat, hogy felvehessek veled a kapcsolatot az ajanlattal.",
            backBtn: "Vissza",
            sendBtn: "Kuldes",
            contactTitle: "Vedd fel a Kapcsolatot",
            contactText: "Toltsd ki az urlapot es hamarosan felveszem veled a kapcsolatot",
            labelName: "Nev *",
            labelEmail: "Email cim *",
            labelPhone: "Telefonszam",
            labelPackage: "Valasztott csomag *",
            labelMessage: "Uzenet / Reszletek *",
            contactPlaceholder: "Irj par szot a projektedrol...",
            consultationTitle: "Ingyenes Konzultacio",
            consultationText: "Nem vagy biztos benne, melyik csomag illik hozzad? Semmi gond! Foglalj egy ingyenes, kotelezettsegmentes konzultaciot, es kozosen megtalaljuk a legjobb megoldast a vallalkozasodnak.",
            noteText: "Altalaban 24 oran belul valaszolok. Hetvegen is elerheto vagyok!",
            floatingConsult: "Ingyenes konzultacio",
            footerText: "© 2026 OVEXI. Minden jog fenntartva.",
            reviewTitle: "Irj velemenyt",
            reviewText: "Oszd meg a tapasztalatod. A jo velemenyed felhokent megjelenik a fooldalon.",
            reviewNameLabel: "Nev *",
            reviewRatingLabel: "Ertekeles *",
            reviewMessageLabel: "Velemeny *",
            reviewNamePlaceholder: "Pl. Kiss Anna",
            reviewMessagePlaceholder: "Mit ertekeltel a kozos munkaban?",
            reviewSubmitBtn: "Velemeny mentese",
            ratingChoose: "Valassz...",
            packageModalTitle: "Csomag reszletek"
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
            servicesTitle: "Choose from the Packages",
            servicesText: "Every package includes professional design and solutions tailored to your needs",
            pkgInfoBtn: "Detailed info",
            pickBtn: "Choose",
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
            contactTitle: "Get in Touch",
            contactText: "Fill out the form and I will contact you soon",
            labelName: "Name *",
            labelEmail: "Email *",
            labelPhone: "Phone",
            labelPackage: "Selected package *",
            labelMessage: "Message / Details *",
            contactPlaceholder: "Tell me a few words about your project...",
            consultationTitle: "Free Consultation",
            consultationText: "Not sure which package fits you? No problem. Book a free, no-obligation consultation and we will find the best solution for your business together.",
            noteText: "I usually reply within 24 hours. Available on weekends too!",
            floatingConsult: "Free consultation",
            footerText: "© 2026 OVEXI. All rights reserved.",
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

        setText("#services .section-header h2", t.servicesTitle);
        setText("#services .section-header p", t.servicesText);
        setAllText(".package-info-button", t.pkgInfoBtn);
        setAllText(".pricing-card .pricing-button:not(#openCustomPackageBuilder)", t.pickBtn);

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
        setText("#customBuilderBackBtn", t.backBtn);
        setText("#customBuilderStep2 button[type='submit']", t.sendBtn);

        setText("#contact .section-header h2", t.contactTitle);
        setText("#contact .section-header p", t.contactText);

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

        setText("#info-section h2", t.consultationTitle);
        setText("#info-section .info-subtitle", t.consultationText);
        setText("#info-section .info-note", t.noteText);
        setText(".floating-consultation-button", t.floatingConsult);
        setText("footer p", t.footerText);

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
                const current = localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "hu";
                const nextLang = current === "en" ? "hu" : "en";
                isSwitchingLanguage = true;
                localStorage.setItem(STORAGE_KEY, nextLang);
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

        const stored = localStorage.getItem(STORAGE_KEY);
        const initialLang = stored === "en" ? "en" : "hu";
        applyLanguage(initialLang);
    }

    document.addEventListener("DOMContentLoaded", initLanguageSwitcher);
})();
