import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    query,
    orderBy,
    limit,
    getDocs,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Public Firebase config is expected in frontend apps. Protect data with strict Firestore rules.
const firebaseConfig = {
  apiKey: "AIzaSyBakBKouiEi2KaMUD1a_lB0SHPzUqNiMsw",
  authDomain: "ovexi-6ef38.firebaseapp.com",
  projectId: "ovexi-6ef38",
  storageBucket: "ovexi-6ef38.firebasestorage.app",
  messagingSenderId: "370083022451",
  appId: "1:370083022451:web:4e3ba562d07641fcef4c06",
  measurementId: "G-5CV4P809ZL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CONTACT_SUBMIT_COOLDOWN_MS = 2 * 60 * 1000;
const REVIEW_SUBMIT_COOLDOWN_MS = 60 * 1000;
const MIN_FORM_FILL_MS = 2500;

function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

window.addEventListener("scroll", () => {
    const navbar = document.getElementById("navbar");
    if (window.scrollY > 50) {
        navbar.classList.add("scrolled");
    } else {
        navbar.classList.remove("scrolled");
    }
});

(function() {
    const button = document.querySelector(".floating-consultation-button");
    const targetSection = document.getElementById("info-section");

    if (!button || !targetSection) {
        return;
    }

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    let ticking = false;

    function updateFloatingButtonState() {
        const sectionRect = targetSection.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const fadeRange = viewportHeight * 1.35;
        const visibility = clamp(sectionRect.top / fadeRange, 0, 1);
        const opacity = 0.08 + visibility * 0.92;
        const scale = 0.9 + visibility * 0.1;

        button.style.opacity = opacity.toFixed(3);
        button.style.setProperty("--consult-scale", scale.toFixed(3));
        button.classList.toggle("is-faded", opacity < 0.16);
        ticking = false;
    }

    function onScrollOrResize() {
        if (ticking) {
            return;
        }
        ticking = true;
        requestAnimationFrame(updateFloatingButtonState);
    }

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    updateFloatingButtonState();
})();

(function() {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
        return;
    }

    const revealMap = [
        { selector: ".section-header", variant: "reveal" },
        { selector: ".pricing-card", variant: "reveal reveal-zoom", stagger: 120 },
        { selector: ".why-choose-us h2", variant: "reveal" },
        { selector: ".slider-wrapper", variant: "reveal reveal-zoom" },
        { selector: ".contact-form .form-group", variant: "reveal reveal-right", stagger: 70 },
        { selector: ".contact-form .submit-button", variant: "reveal" },
        { selector: ".info-section .container > *", variant: "reveal", stagger: 90 }
    ];

    const revealElements = [];

    revealMap.forEach(({ selector, variant, stagger = 0 }) => {
        document.querySelectorAll(selector).forEach((element, index) => {
            element.classList.add(...variant.split(" "));
            if (stagger) {
                element.style.setProperty("--reveal-delay", `${index * stagger}ms`);
            }
            revealElements.push(element);
        });
    });

    if (!revealElements.length) {
        return;
    }

    const observer = new IntersectionObserver((entries, currentObserver) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) {
                return;
            }

            entry.target.classList.add("is-visible");
            currentObserver.unobserve(entry.target);
        });
    }, {
        threshold: 0.2,
        rootMargin: "0px 0px -8% 0px"
    });

    revealElements.forEach((element) => observer.observe(element));
})();

(function() {
    const items = document.querySelectorAll("#featureSlider .feature-item");
    const dots = document.querySelectorAll(".slider-dots .dot");

    if (!items.length || !dots.length) {
        return;
    }

    let current = 0;
    let autoSlideInterval;
    let startX = 0;
    let isDragging = false;

    function updateSlider(index) {
        items.forEach((item, i) => {
            item.classList.remove("active", "prev", "next");
            if (i === index) {
                item.classList.add("active");
            } else if (i === (index - 1 + items.length) % items.length) {
                item.classList.add("prev");
            } else if (i === (index + 1) % items.length) {
                item.classList.add("next");
            }
        });

        dots.forEach((dot, i) => {
            dot.classList.toggle("active", i === index);
        });

        current = index;
    }

    function nextSlide() {
        updateSlider((current + 1) % items.length);
    }

    function prevSlide() {
        updateSlider((current - 1 + items.length) % items.length);
    }

    function resetAutoSlide() {
        clearInterval(autoSlideInterval);
        autoSlideInterval = setInterval(nextSlide, 10000);
    }

    dots.forEach((dot) => {
        dot.addEventListener("click", () => {
            updateSlider(parseInt(dot.dataset.index, 10));
            resetAutoSlide();
        });
    });

    items.forEach((item) => {
        item.addEventListener("click", () => {
            if (item.classList.contains("prev")) {
                prevSlide();
            } else if (item.classList.contains("next") || item.classList.contains("active")) {
                nextSlide();
            }
            resetAutoSlide();
        });
    });

    const slider = document.getElementById("featureSlider");
    if (!slider) {
        return;
    }

    slider.addEventListener("mousedown", (e) => {
        isDragging = true;
        startX = e.clientX;
        slider.style.cursor = "grabbing";
    });

    slider.addEventListener("mouseup", (e) => {
        if (!isDragging) {
            return;
        }

        isDragging = false;
        slider.style.cursor = "grab";
        const diff = e.clientX - startX;

        if (Math.abs(diff) > 50) {
            diff < 0 ? nextSlide() : prevSlide();
            resetAutoSlide();
        }
    });

    slider.addEventListener("mouseleave", () => {
        isDragging = false;
        slider.style.cursor = "grab";
    });

    slider.addEventListener("touchstart", (e) => {
        startX = e.touches[0].clientX;
    }, { passive: true });

    slider.addEventListener("touchend", (e) => {
        const diff = e.changedTouches[0].clientX - startX;
        if (Math.abs(diff) > 50) {
            diff < 0 ? nextSlide() : prevSlide();
            resetAutoSlide();
        }
    });

    updateSlider(0);
    autoSlideInterval = setInterval(nextSlide, 5000);
})();

function selectPackage(packageName) {
    const packageSelect = document.getElementById("package");
    if (!packageSelect) {
        return;
    }

    const options = packageSelect.options;

    for (let i = 0; i < options.length; i += 1) {
        if (options[i].value === packageName) {
            packageSelect.selectedIndex = i;
            break;
        }
    }

    const contactSection = document.getElementById("contact");
    if (contactSection) {
        contactSection.scrollIntoView({ behavior: "smooth" });
    }
}

window.selectPackage = selectPackage;

(function() {
    const packageInfoButtons = document.querySelectorAll("[data-package-info]");
    const packageModal = document.getElementById("packageModal");
    const closePackageModalBtn = document.getElementById("closePackageModalBtn");
    const packageModalTitle = document.getElementById("packageModalTitle");
    const packageModalPrice = document.getElementById("packageModalPrice");
    const packageModalDescription = document.getElementById("packageModalDescription");
    const packageModalFeatures = document.getElementById("packageModalFeatures");

    if (!packageInfoButtons.length || !packageModal || !closePackageModalBtn || !packageModalTitle || !packageModalPrice || !packageModalDescription || !packageModalFeatures) {
        return;
    }

    const packageDetails = {
        "Alapcsomag": {
            price: "100,000 Ft - egyszeri díj",
            description: "Gyors induláshoz optimalizált csomag, tiszta struktúrával és üzleti alapfunkciókkal.",
            features: [
                { icon: "devices", title: "Reszponzív kialakítás", detail: "Mobilon, tableten és asztali nézetben is stabil, jól olvasható megjelenés." },
                { icon: "layers", title: "5 stratégiai aloldal", detail: "Bemutatkozás, szolgáltatások, kapcsolat és további kulcsoldalak üzleti fókuszban." },
                { icon: "search", title: "Alap SEO csomag", detail: "Oldalcímek, meta leírások, heading-hierarchia és indexelési alapok beállítása." },
                { icon: "speed", title: "Gyors teljesítmény", detail: "Képek és kódrészletek optimalizálása a jobb betöltés és felhasználói élmény érdekében." },
                { icon: "mail", title: "Kapcsolati űrlap", detail: "Egyszerű érdeklődőgyűjtés, hogy a látogatók gyorsan elérjenek." },
                { icon: "shield", title: "Biztonsági alapok", detail: "SSL és alapvető biztonsági javaslatok implementálása." }
            ]
        },
        "Prémium Csomag": {
            price: "150,000 Ft + 15,000 Ft/hó karbantartás",
            description: "Növekedésre tervezett prémium csomag folyamatos frissítéssel és jobb kereső láthatósággal.",
            features: [
                { icon: "palette", title: "Egyedi dizájnrendszer", detail: "A márkádhoz illesztett vizuális stílus, tipográfia és komponensek." },
                { icon: "expand", title: "Korlátlan bővíthetőség", detail: "Új aloldalak és tartalmi blokkok gyors hozzáadása üzleti növekedéshez." },
                { icon: "search", title: "Haladó SEO finomhangolás", detail: "Kulcsszófókusz, technikai struktúra és tartalmi jelzések optimalizálása." },
                { icon: "shield", title: "Havi karbantartás", detail: "Folyamatos rendszerfrissítések, hibajavítások és biztonsági felügyelet." },
                { icon: "edit", title: "Tartalomfrissítés", detail: "Aktuális akciók, új szolgáltatások vagy referenciák gyors publikálása." },
                { icon: "chart", title: "Havi riportok", detail: "Teljesítmény, látogatói viselkedés és konverziós trendek összefoglalása." }
            ]
        },
        "Üzleti Csomag": {
            price: "300,000 Ft + 50,000 Ft/hó kezelés",
            description: "Komplex online jelenlét: weboldal + közösségi média + marketing támogatás egyben.",
            features: [
                { icon: "building", title: "Teljes vállalati webplatform", detail: "Komplex struktúra üzleti célokhoz igazított ügyfélutakkal." },
                { icon: "social", title: "Social media rendszer", detail: "Facebook és Instagram felületek stratégiai felépítése és egységesítése." },
                { icon: "calendar", title: "Heti tartalomgyártás", detail: "Ütemezett posztolási rendszer kampányokkal és tématervvel." },
                { icon: "megaphone", title: "Hirdetéskezelés", detail: "Célzott kampányok, kreatív optimalizálás és költségkeret-kontroll." },
                { icon: "brand", title: "Márkaépítés", detail: "Hangnem, vizuális irány és kommunikációs alapelvek egységesítése." },
                { icon: "chart", title: "Teljes analitika", detail: "Web, social és kampány adatok közös értelmezése döntéstámogató módon." }
            ]
        }
    };

    function getFeatureIcon(icon) {
        const icons = {
            devices: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="14" height="10" rx="2"/><rect x="8" y="15" width="14" height="7" rx="2"/></svg>',
            layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/></svg>',
            search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
            speed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20a8 8 0 1 1 8-8"/><path d="m12 12 4-4"/><path d="M6 18h.01"/></svg>',
            mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
            shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 7 4v6c0 5-3.5 7.5-7 8-3.5-.5-7-3-7-8V7l7-4Z"/><path d="m9.5 12 1.8 1.8L15 10"/></svg>',
            palette: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><path d="M12 22a10 10 0 1 1 10-10c0 1.7-1.3 3-3 3h-2.2a2.3 2.3 0 0 0 0 4.6H18"/></svg>',
            expand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H3v5"/><path d="m3 3 6 6"/><path d="M16 21h5v-5"/><path d="m21 21-6-6"/><path d="M21 8V3h-5"/><path d="m15 9 6-6"/><path d="M3 16v5h5"/><path d="m3 21 6-6"/></svg>',
            edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="m16.5 3.5 4 4L8 20l-5 1 1-5L16.5 3.5Z"/></svg>',
            chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m7 15 3-3 3 2 4-5"/></svg>',
            building: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h8"/></svg>',
            social: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="m8 12 8-6"/><path d="m8 12 8 6"/></svg>',
            calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
            megaphone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v2l12 4V7L3 11Z"/><path d="M15 9a6 6 0 0 1 0 6"/><path d="M7 14v4a2 2 0 0 0 2 2h1"/></svg>',
            brand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 7v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V7l-8-5Z"/><path d="M9 12h6"/></svg>'
        };

        return icons[icon] || icons.chart;
    }

    function openPackageModal(packageName) {
        const details = packageDetails[packageName];
        if (!details) {
            return;
        }

        packageModalTitle.textContent = packageName;
        packageModalPrice.textContent = details.price;
        packageModalDescription.textContent = details.description;
        packageModalFeatures.innerHTML = "";

        details.features.forEach((feature) => {
            const item = document.createElement("li");
            item.innerHTML = `
                <span class="package-feature-icon" aria-hidden="true">${getFeatureIcon(feature.icon)}</span>
                <div>
                    <p class="package-feature-title">${feature.title}</p>
                    <p class="package-feature-detail">${feature.detail}</p>
                </div>
            `;
            packageModalFeatures.appendChild(item);
        });

        packageModal.classList.add("is-open");
        packageModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    }

    function closePackageModal() {
        packageModal.classList.remove("is-open");
        packageModal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }

    packageInfoButtons.forEach((button) => {
        button.addEventListener("click", () => {
            openPackageModal(button.dataset.packageInfo || "");
        });
    });

    closePackageModalBtn.addEventListener("click", closePackageModal);

    packageModal.addEventListener("click", (event) => {
        if (event.target === packageModal) {
            closePackageModal();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && packageModal.classList.contains("is-open")) {
            closePackageModal();
        }
    });
})();

const contactRequestsCollection = collection(db, "contact_requests");
const contactLocalKey = "webpro_last_contact_submit_at";
const contactFormLoadedAt = Date.now();

const contactForm = document.getElementById("contactForm");
if (contactForm) {
    contactForm.addEventListener("submit", async function(e) {
        e.preventDefault();

        const submitButton = this.querySelector(".submit-button");
        if (!submitButton) {
            return;
        }

        const originalText = submitButton.textContent;
        submitButton.textContent = "Kuldes...";
        submitButton.disabled = true;

        const formData = {
            name: normalizeText(document.getElementById("name")?.value),
            email: normalizeText(document.getElementById("email")?.value).toLowerCase(),
            phone: normalizeText(document.getElementById("phone")?.value),
            package: normalizeText(document.getElementById("package")?.value),
            message: normalizeText(document.getElementById("message")?.value)
        };

        const websiteTrap = normalizeText(document.getElementById("website")?.value);
        if (websiteTrap) {
            submitButton.textContent = originalText;
            submitButton.disabled = false;
            return;
        }

        if (Date.now() - contactFormLoadedAt < MIN_FORM_FILL_MS) {
            alert("Tul gyors kuldes. Kerlek ellenorizd az adatokat es probald ujra.");
            submitButton.textContent = originalText;
            submitButton.disabled = false;
            return;
        }

        const lastContactSubmit = Number(localStorage.getItem(contactLocalKey) || 0);
        if (Date.now() - lastContactSubmit < CONTACT_SUBMIT_COOLDOWN_MS) {
            alert("Kerlek varj legalabb 2 percet a kovetkezo kuldesig.");
            submitButton.textContent = originalText;
            submitButton.disabled = false;
            return;
        }

        if (!formData.name || !formData.email || !formData.package || !formData.message) {
            alert("Kerlek toltsd ki a kotelezo mezoket.");
            submitButton.textContent = originalText;
            submitButton.disabled = false;
            return;
        }

        if (!isValidEmail(formData.email)) {
            alert("Ervenytelen email cim.");
            submitButton.textContent = originalText;
            submitButton.disabled = false;
            return;
        }

        if (formData.name.length < 2 || formData.name.length > 80 ||
            formData.package.length < 3 || formData.package.length > 80 ||
            formData.message.length < 10 || formData.message.length > 1200 ||
            formData.phone.length > 32) {
            alert("A megadott adatok formaja nem megfelelo.");
            submitButton.textContent = originalText;
            submitButton.disabled = false;
            return;
        }

        try {
            await addDoc(contactRequestsCollection, {
                ...formData,
                createdAt: serverTimestamp(),
                source: "website_contact_form",
                status: "new"
            });

            localStorage.setItem(contactLocalKey, String(Date.now()));

            alert("Uzenet sikeresen elmentve! Hamarosan felveszem veled a kapcsolatot.");
            contactForm.reset();
        } catch (error) {
            alert("Hiba tortent az uzenet mentesekor. Kerlek probald ujra kesobb.");
            console.error("Contact form save error:", error);
        } finally {
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    });
}

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function(e) {
        const href = this.getAttribute("href");
        if (!href || href === "#") {
            return;
        }

        const target = document.querySelector(href);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });
});

(function() {
    const reviewModal = document.getElementById("reviewModal");
    const openReviewModalBtn = document.getElementById("openReviewModalBtn");
    const closeReviewModalBtn = document.getElementById("closeReviewModalBtn");
    const reviewForm = document.getElementById("reviewForm");
    const reviewFeedback = document.getElementById("reviewFeedback");
    const submitReviewBtn = document.getElementById("submitReviewBtn");
    const reviewBubbles = document.getElementById("reviewBubbles");

    if (!reviewModal || !openReviewModalBtn || !closeReviewModalBtn || !reviewForm || !reviewBubbles) {
        return;
    }

    const reviewsCollection = collection(db, "reviews");
    const localKey = "webpro_last_review_submit_at";
    const activeBubbles = new Set();
    const bubbleLayouts = new Map();
    const activeReviewIds = new Set();
    const reviewCooldownUntil = new Map();

    const MAX_VISIBLE_BUBBLES = 2;
    const REVIEW_COOLDOWN_MS = 10000;
    const BUBBLE_VISIBLE_MS = 6200;
    const BUBBLE_TICK_MS = 2200;

    let reviewsCache = [];
    let bubbleIntervalId = null;
    let nextReviewCursor = 0;

    function setFeedback(message, isError = false) {
        if (!reviewFeedback) {
            return;
        }

        reviewFeedback.textContent = message;
        reviewFeedback.classList.toggle("is-error", isError);
    }

    function openModal() {
        reviewModal.classList.add("is-open");
        reviewModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        const firstInput = document.getElementById("reviewName");
        if (firstInput) {
            firstInput.focus();
        }
    }

    function closeModal() {
        reviewModal.classList.remove("is-open");
        reviewModal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }

    function randomInRange(min, max) {
        return min + Math.random() * (max - min);
    }

    function getNavbarBlockedTopPercent(containerHeight) {
        const navbar = document.getElementById("navbar");
        const heroSection = document.getElementById("hero");

        if (!navbar || !heroSection || !containerHeight) {
            return 0;
        }

        const navRect = navbar.getBoundingClientRect();
        const heroRect = heroSection.getBoundingClientRect();

        // Keep bubbles below the portion of hero that is visually covered by the fixed navbar.
        const blockedPx = navRect.bottom - heroRect.top + 8;
        if (blockedPx <= 0) {
            return 0;
        }

        return Math.min(100, (blockedPx / containerHeight) * 100);
    }

    function computeBlockedZone() {
        const heroSection = document.getElementById("hero");
        const heroContent = document.querySelector(".hero-content");

        if (!heroSection || !heroContent) {
            return {
                left: 26,
                right: 74,
                top: 22,
                bottom: 78
            };
        }

        const heroRect = heroSection.getBoundingClientRect();
        const contentRect = heroContent.getBoundingClientRect();

        if (!heroRect.width || !heroRect.height) {
            return {
                left: 26,
                right: 74,
                top: 22,
                bottom: 78
            };
        }

        const padX = 4;
        const padY = 6;
        const left = ((contentRect.left - heroRect.left) / heroRect.width) * 100 - padX;
        const right = ((contentRect.right - heroRect.left) / heroRect.width) * 100 + padX;
        const top = ((contentRect.top - heroRect.top) / heroRect.height) * 100 - padY;
        const bottom = ((contentRect.bottom - heroRect.top) / heroRect.height) * 100 + padY;

        return {
            left: Math.max(0, left),
            right: Math.min(100, right),
            top: Math.max(0, top),
            bottom: Math.min(100, bottom)
        };
    }

    function isBlockedPosition(leftPct, topPct, blockedZone) {
        return leftPct >= blockedZone.left &&
            leftPct <= blockedZone.right &&
            topPct >= blockedZone.top &&
            topPct <= blockedZone.bottom;
    }

    function buildBubbleContent(review) {
        const stars = "★".repeat(Math.max(1, Math.min(5, Number(review.rating) || 5)));
        const message = String(review.message || "").slice(0, 95);
        const author = String(review.name || "Vendeg").slice(0, 30);

        return {
            stars,
            message,
            author
        };
    }

    function estimateBubbleSize(review) {
        const content = buildBubbleContent(review);
        const tempBubble = document.createElement("article");
        tempBubble.className = "review-bubble";
        tempBubble.style.visibility = "hidden";
        tempBubble.style.opacity = "0";
        tempBubble.style.left = "0";
        tempBubble.style.top = "0";

        const starsEl = document.createElement("div");
        starsEl.className = "review-bubble-stars";
        starsEl.textContent = content.stars;

        const textEl = document.createElement("span");
        textEl.className = "review-bubble-text";
        textEl.textContent = `"${content.message}${content.message.length >= 95 ? "..." : ""}"`;

        const authorEl = document.createElement("span");
        authorEl.className = "review-bubble-author";
        authorEl.textContent = `- ${content.author}`;

        tempBubble.append(starsEl, textEl, authorEl);
        reviewBubbles.appendChild(tempBubble);

        const width = tempBubble.offsetWidth || 240;
        const height = tempBubble.offsetHeight || 100;

        tempBubble.remove();

        return { width, height, content };
    }

    function toRect(leftPx, topPx, widthPx, heightPx) {
        return {
            left: leftPx,
            top: topPx,
            right: leftPx + widthPx,
            bottom: topPx + heightPx,
            width: widthPx,
            height: heightPx
        };
    }

    function overlapArea(rectA, rectB) {
        const overlapWidth = Math.max(0, Math.min(rectA.right, rectB.right) - Math.max(rectA.left, rectB.left));
        const overlapHeight = Math.max(0, Math.min(rectA.bottom, rectB.bottom) - Math.max(rectA.top, rectB.top));
        return overlapWidth * overlapHeight;
    }

    function hasHeavyOverlap(candidateRect) {
        for (const existingRect of bubbleLayouts.values()) {
            const area = overlapArea(candidateRect, existingRect);
            if (!area) {
                continue;
            }

            const smallerArea = Math.max(1, Math.min(
                candidateRect.width * candidateRect.height,
                existingRect.width * existingRect.height
            ));

            if (area / smallerArea > 0.28) {
                return true;
            }
        }

        return false;
    }

    function getSafeBubblePosition(review) {
        const measured = estimateBubbleSize(review);
        const bubbleWidth = measured.width;
        const bubbleHeight = measured.height;
        const content = measured.content;
        const containerWidth = reviewBubbles.clientWidth || window.innerWidth;
        const containerHeight = reviewBubbles.clientHeight || window.innerHeight;
        const heroSection = document.getElementById("hero");

        const widthPct = (bubbleWidth / containerWidth) * 100;
        const heightPct = (bubbleHeight / containerHeight) * 100;
        const blockedZone = computeBlockedZone();
        const navbarBlockedTopPct = getNavbarBlockedTopPercent(containerHeight);

        const safeMarginX = 2;
        const safeMarginY = 2;
        const minLeftPct = safeMarginX;
        const minTopPct = Math.max(safeMarginY, navbarBlockedTopPct);
        const maxLeftPct = Math.max(minLeftPct, 100 - widthPct - safeMarginX);

        // Limit bubbles to the currently visible portion of the hero to avoid too-low placement.
        let visibleBottomPct = 100;
        if (heroSection) {
            const heroRect = heroSection.getBoundingClientRect();
            const visibleBottomPx = Math.min(containerHeight, Math.max(0, window.innerHeight - heroRect.top - 10));
            if (visibleBottomPx > 0) {
                visibleBottomPct = (visibleBottomPx / containerHeight) * 100;
            }
        }

        const maxTopByContainerPct = 100 - heightPct - safeMarginY;
        const maxTopByVisiblePct = visibleBottomPct - heightPct - safeMarginY;
        const maxTopPct = Math.max(minTopPct, Math.min(maxTopByContainerPct, maxTopByVisiblePct));

        const zones = window.innerWidth < 768
            ? [
                { xMin: 6, xMax: 84, yMin: 6, yMax: 18 },
                { xMin: 8, xMax: 82, yMin: 56, yMax: 68 }
            ]
            : [
                { xMin: 2, xMax: 18, yMin: 16, yMax: 68 },
                { xMin: 82, xMax: 96, yMin: 16, yMax: 68 },
                { xMin: 20, xMax: 74, yMin: 3, yMax: 15 }
            ];

        for (let attempt = 0; attempt < 28; attempt += 1) {
            const zone = zones[Math.floor(Math.random() * zones.length)];
            const left = Math.min(maxLeftPct, Math.max(minLeftPct, randomInRange(zone.xMin, zone.xMax)));
            const top = Math.min(maxTopPct, Math.max(minTopPct, randomInRange(zone.yMin, zone.yMax)));

            const inBlockedZone = isBlockedPosition(left + widthPct / 2, top + heightPct / 2, blockedZone);
            if (inBlockedZone) {
                continue;
            }

            const candidateRect = toRect(
                (left / 100) * containerWidth,
                (top / 100) * containerHeight,
                bubbleWidth,
                bubbleHeight
            );

            if (!hasHeavyOverlap(candidateRect)) {
                return { left, top, rect: candidateRect, content };
            }
        }

        const fallbackLeft = minLeftPct;
        const fallbackTop = minTopPct;
        return {
            left: fallbackLeft,
            top: fallbackTop,
            rect: toRect(
                (fallbackLeft / 100) * containerWidth,
                (fallbackTop / 100) * containerHeight,
                bubbleWidth,
                bubbleHeight
            ),
            content
        };
    }

    function getNextEligibleReview() {
        if (!reviewsCache.length) {
            return null;
        }

        const now = Date.now();

        for (let i = 0; i < reviewsCache.length; i += 1) {
            const index = (nextReviewCursor + i) % reviewsCache.length;
            const review = reviewsCache[index];
            const cooldownEndsAt = reviewCooldownUntil.get(review.id) || 0;

            if (activeReviewIds.has(review.id)) {
                continue;
            }

            if (cooldownEndsAt > now) {
                continue;
            }

            nextReviewCursor = (index + 1) % reviewsCache.length;
            return review;
        }

        return null;
    }

    function createReviewBubble(review) {
        if (!review) {
            return;
        }

        if (!review.id) {
            return;
        }

        if (activeBubbles.size >= MAX_VISIBLE_BUBBLES) {
            return;
        }

        if (activeReviewIds.has(review.id)) {
            return;
        }

        const cooldownEndsAt = reviewCooldownUntil.get(review.id) || 0;
        if (cooldownEndsAt > Date.now()) {
            return;
        }

        const position = getSafeBubblePosition(review);

        const bubble = document.createElement("article");
        bubble.className = "review-bubble";
        bubble.style.left = `${position.left}%`;
        bubble.style.top = `${position.top}%`;
        bubble.style.setProperty("--bubble-float-duration", `${randomInRange(8.5, 13.5).toFixed(2)}s`);

        const starsEl = document.createElement("div");
        starsEl.className = "review-bubble-stars";
        starsEl.textContent = position.content.stars;

        const textEl = document.createElement("span");
        textEl.className = "review-bubble-text";
        textEl.textContent = `"${position.content.message}${position.content.message.length >= 95 ? "..." : ""}"`;

        const authorEl = document.createElement("span");
        authorEl.className = "review-bubble-author";
        authorEl.textContent = `- ${position.content.author}`;

        bubble.append(starsEl, textEl, authorEl);
        reviewBubbles.appendChild(bubble);
        activeBubbles.add(bubble);
        bubbleLayouts.set(bubble, position.rect);
        activeReviewIds.add(review.id);

        requestAnimationFrame(() => {
            bubble.classList.add("is-visible");
        });

        window.setTimeout(() => {
            bubble.classList.remove("is-visible");
            window.setTimeout(() => {
                bubble.remove();
                activeBubbles.delete(bubble);
                bubbleLayouts.delete(bubble);
                activeReviewIds.delete(review.id);
                reviewCooldownUntil.set(review.id, Date.now() + REVIEW_COOLDOWN_MS);
            }, 550);
        }, BUBBLE_VISIBLE_MS);
    }

    function spawnNextBubble() {
        if (activeBubbles.size >= MAX_VISIBLE_BUBBLES) {
            return;
        }

        const review = getNextEligibleReview();
        if (!review) {
            return;
        }

        createReviewBubble(review);
    }

    function startBubbleLoop() {
        if (bubbleIntervalId) {
            clearInterval(bubbleIntervalId);
        }
        /*
        if (!reviewsCache.length) {
            const fallback = {
                id: "fallback-review",
                name: "WebPro Ugyfel",
                rating: 5,
                message: "Ird meg az elso velemenyt, es maris megjelenik itt!"
            };
            createReviewBubble(fallback);
            return;
        }
         */
        nextReviewCursor = 0;
        spawnNextBubble();

        bubbleIntervalId = window.setInterval(() => {
            spawnNextBubble();
        }, BUBBLE_TICK_MS);
    }

    async function loadReviews() {
        try {
            const reviewsQuery = query(reviewsCollection, orderBy("createdAt", "desc"), limit(16));
            const snapshot = await getDocs(reviewsQuery);
            reviewsCache = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Failed to load reviews:", error);
            reviewsCache = [];
        }

        startBubbleLoop();
    }

    openReviewModalBtn.addEventListener("click", openModal);
    closeReviewModalBtn.addEventListener("click", closeModal);

    reviewModal.addEventListener("click", (event) => {
        if (event.target === reviewModal) {
            closeModal();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && reviewModal.classList.contains("is-open")) {
            closeModal();
        }
    });

    const reviewFormLoadedAt = Date.now();

    reviewForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = normalizeText(document.getElementById("reviewName")?.value);
        const ratingValue = normalizeText(document.getElementById("reviewRating")?.value);
        const message = normalizeText(document.getElementById("reviewMessage")?.value);
        const rating = Number(ratingValue);
        const reviewWebsiteTrap = normalizeText(document.getElementById("reviewWebsite")?.value);

        if (reviewWebsiteTrap) {
            return;
        }

        if (Date.now() - reviewFormLoadedAt < MIN_FORM_FILL_MS) {
            setFeedback("Tul gyors kuldes. Ellenorizd az adatokat.", true);
            return;
        }

        if (!name || !message || !ratingValue) {
            setFeedback("Kerek minden kotelezo mezot kitolteni.", true);
            return;
        }

        if (message.length < 10) {
            setFeedback("A velemeny legalabb 10 karakter legyen.", true);
            return;
        }

        if (Number.isNaN(rating) || rating < 1 || rating > 5) {
            setFeedback("Ervenytelen ertekeles.", true);
            return;
        }

        const now = Date.now();
        const lastSubmit = Number(localStorage.getItem(localKey) || 0);
        if (now - lastSubmit < REVIEW_SUBMIT_COOLDOWN_MS) {
            setFeedback("Varj egy percet, mielott ujra kuldesz.", true);
            return;
        }

        if (submitReviewBtn) {
            submitReviewBtn.disabled = true;
            submitReviewBtn.textContent = "Mentjuk...";
        }

        setFeedback("", false);

        try {
            const reviewRecord = {
                name: name.slice(0, 60),
                message: message.slice(0, 320),
                rating,
                createdAt: serverTimestamp()
            };

            const docRef = await addDoc(reviewsCollection, reviewRecord);
            localStorage.setItem(localKey, String(now));

            setFeedback("Koszonjuk! A velemenyed elmentve.");
            reviewForm.reset();
            closeModal();
            createReviewBubble({
                id: docRef.id,
                name: reviewRecord.name,
                message: reviewRecord.message,
                rating: reviewRecord.rating
            });
            await loadReviews();
        } catch (error) {
            console.error("Failed to submit review:", error);
            setFeedback("Mentesi hiba tortent. Ellenorizd a Firebase szabalyokat.", true);
        } finally {
            if (submitReviewBtn) {
                submitReviewBtn.disabled = false;
                submitReviewBtn.textContent = "Vélemény mentése";
            }
        }
    });

    loadReviews();
})();
