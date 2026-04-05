(function () {
    const STORAGE_KEY = "ovexi_lang";

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
            servicesTitle: "Fedezd fel a hozzád illő csomagot",
            servicesText: "Minden csomag tartalmazza a professzionális tervezést és az Ön igényeire szabott megoldásokat. Vagy rakd össze magadnak a saját csomagod a testreszabott opcióban!",
            pkgInfoBtn: "Részletes információ",
            pickBtn: "Választom",
            customTitle: "Saját Csomag",
            customPeriod: "Testreszabott",
            customHint: "Nem tudsz dönteni? Állítsd össze magadnak!",
            customPlanBtn: "Tervezz Most",
            builderStep1Title: "Weboldalad Konfigurálása",
            builderStep1Text: "Válaszd ki, hány oldalra van szükséged és az alapvető funkciók közül.",
            pageCountLabel: "Oldalak száma:",
            featuresLabel: "Funkciók (válassz ki az szükségeseket):",
            estPrice: "Becsült ár:",
            nextBtn: "Következő",
            builderStep2Title: "Elérhetőséged",
            builderStep2Text: "Add meg az adataidat, hogy felvehessek veled a kapcsolatot az ajánlattal.",
            backBtn: "Vissza",
            sendBtn: "Küldés",
            contactTitle: "Lépj velünk kapcsolatba",
            contactText: "Töltsd ki az űrlapot és hamarosan felveszem veled a kapcsolatot",
            labelName: "Név *",
            labelEmail: "Email cím *",
            labelPhone: "Telefonszám",
            labelPackage: "Választott csomag",
            labelMessage: "Üzenet / Részletek *",
            contactPlaceholder: "Írj pár szót a projektedről...",
            consultationTitle: "Ingyenes Konzultáció",
            consultationText: "Nem vagy biztos benne, melyik csomag illik hozzád? Semmi gond! Foglalj egy ingyenes, kötelezettségmentes konzultációt, és közösen megtaláljuk a legjobb megoldást a vállalkozásodnak.",
            noteText: "Általában 24 órán belül válaszolunk. Hétvégén is elérhetőek vagyunk!",
            floatingConsult: "Ingyenes konzultáció",
            footerText: "© 2026 OVEXI. Minden jog fenntartva.",
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
