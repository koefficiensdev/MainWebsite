import { STOREFRONT_CONFIG } from "./storefront-config.js?v=20260830-1";
import {safeStorage,cleanCart,normalizeWebUrl,submissionManager} from "./checkout-model.js?v=20260903-6";
import {
  PRODUCT_CATALOG,
  CATEGORY_LABELS,
  billingLabel,
  formatPrice,
  getProduct
} from "./catalog.js?v=20260903-6";

const firebaseConfig = {
  apiKey: "AIzaSyBakBKouiEi2KaMUD1a_lB0SHPzUqNiMsw",
  authDomain: "ovexi-6ef38.firebaseapp.com",
  projectId: "ovexi-6ef38",
  storageBucket: "ovexi-6ef38.firebasestorage.app",
  messagingSenderId: "370083022451",
  appId: "1:370083022451:web:4e3ba562d07641fcef4c06",
  measurementId: "G-5CV4P809ZL"
};

let appPromise,functionsSdkPromise,firestoreSdkPromise;
async function firebaseApp(){appPromise||=import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js").then(({initializeApp})=>initializeApp(firebaseConfig));return appPromise;}
async function functionsSdk(){functionsSdkPromise||=Promise.all([firebaseApp(),import("https://www.gstatic.com/firebasejs/10.12.5/firebase-functions.js")]);return functionsSdkPromise;}
async function firestoreSdk(){firestoreSdkPromise||=Promise.all([firebaseApp(),import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js")]);return firestoreSdkPromise;}
const CART_STORAGE_KEY = "ovexi_cart_v2";
const COOKIE_STORAGE_KEY = "ovexi_cookie_consent_v2";
const ORDER_COOLDOWN_KEY = "ovexi_last_order_at";
const ORDER_COOLDOWN_MS = 2 * 60 * 1000;
const local=safeStorage(()=>window.localStorage),session=safeStorage(()=>window.sessionStorage);
const submission=submissionManager(session);

const state = {
  category: ["website","marketing","maintenance","oneoff"].includes(new URLSearchParams(location.search).get("category")) ? new URLSearchParams(location.search).get("category") : "website",
  cart: submission.pending?.itemIds || readCart()
};

const productGrid = document.getElementById("productGrid");
const cartCount = document.getElementById("cartCount");
const cartDrawer = document.getElementById("cartDrawer");
const drawerBackdrop = document.getElementById("drawerBackdrop");
const cartItems = document.getElementById("cartItems");
const cartSummary = document.getElementById("cartSummary");
const startCheckoutButton = document.getElementById("startCheckoutButton");
const checkoutBackdrop = document.getElementById("checkoutBackdrop");
const checkoutForm = document.getElementById("checkoutForm");
const checkoutReview = document.getElementById("checkoutReview");
const checkoutStatus = document.getElementById("checkoutStatus");
const toast = document.getElementById("toast");
let toastTimer = null;
let formLoadedAt = Date.now();
let overlayReturnFocus=null,drawerCloseTimer=null;

function readCart() {
  try {
    return cleanCart(JSON.parse(local.get(CART_STORAGE_KEY) || "[]"));
  } catch {
    return [];
  }
}

function saveCart() {
  local.set(CART_STORAGE_KEY, JSON.stringify(state.cart));
}

function cartProducts() {
  return state.cart.map(getProduct).filter(Boolean);
}

function totals() {
  return cartProducts().reduce((result, product) => {
    if (product.billing === "monthly") result.monthly += product.price;
    else result.once += product.price;
    return result;
  }, { once: 0, monthly: 0 });
}

function canStartPayment() {
  const products = cartProducts();
  return products.length > 0 && products.every((product) => !["request_only", "retired"].includes(product.availability));
}

function updateCheckoutCopy() {
  const submitButton = checkoutForm?.querySelector("button[type='submit']");
  const note = document.getElementById("checkoutActionNote");
  const currentUrlField = checkoutForm?.elements.namedItem("currentUrl");
  const infrastructurePlanField = checkoutForm?.elements.namedItem("infrastructurePlan");
  const infrastructurePlanRow = document.getElementById("infrastructurePlanRow");
  const payment = canStartPayment();
  const hasWebsite = state.cart.some((id) => id.startsWith("website-"));
  if (currentUrlField) currentUrlField.required = state.cart.some((id) => id.startsWith("maintenance-") || ["quick-audit", "external-audit"].includes(id));
  if (infrastructurePlanRow) infrastructurePlanRow.hidden = !hasWebsite;
  if (infrastructurePlanField) {
    infrastructurePlanField.required = hasWebsite;
    if (!hasWebsite) infrastructurePlanField.value = "";
  }
  if (submitButton) submitButton.textContent = payment ? "Megrendelem és tovább a fizetéshez" : "Igény beküldése";
  if (note) note.textContent = payment
    ? "A beküldés után a Stripe biztonságos fizetési oldala nyílik meg. A kártyaadatokat az OVEXI nem látja és nem tárolja."
    : "Most nem történik fizetés és nem indul előfizetés. A részleteket e-mailben egyeztetjük.";
}

function renderCatalog() {
  const products = PRODUCT_CATALOG.filter((product) => product.category === state.category && product.availability !== "retired");
  productGrid.innerHTML = products.map((product) => `
    <article class="product-card${product.featured ? " is-featured" : ""}">
      <span class="product-badge">${escapeHtml(product.badge)}</span>
      <h3>${escapeHtml(product.name)}</h3>
      <p class="product-description">${escapeHtml(product.description)}</p>
      <div class="product-price"><strong>${formatPrice(product.price)}</strong><span>${billingLabel(product)}</span></div>
      <ul class="product-features">${product.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}</ul>
      ${product.availabilityNote ? `<p class="checkout-note">${escapeHtml(product.availabilityNote)}</p>` : ""}
      <button class="button ${product.featured ? "button-primary" : "button-ghost"} button-full" type="button" data-add-product="${product.id}">
        ${state.cart.includes(product.id) ? "A kosárban" : product.availability === "request_only" ? "Igényfelmérést kérek" : "Kosárba teszem"}
      </button>
    </article>
  `).join("");
}

function renderCart() {
  const products = cartProducts();
  const calculated = totals();
  cartCount.textContent = String(products.length);
  document.getElementById("openCartButton")?.setAttribute("aria-label",`Kosár, ${products.length} termék, megnyitás`);

  if (!products.length) {
    cartItems.innerHTML = `<div class="empty-cart"><div><h3>A kosarad még üres</h3><p>Válassz egy weboldal-, marketing- vagy karbantartási csomagot.</p></div></div>`;
  } else {
    cartItems.innerHTML = products.map((product) => `
      <article class="cart-item">
        <div><h3>${escapeHtml(product.name)}</h3><p>${CATEGORY_LABELS[product.category]} · ${billingLabel(product)}</p></div>
        <div class="cart-item-price">${formatPrice(product.price)}</div>
        <button class="remove-item" type="button" data-remove-product="${product.id}">Eltávolítás</button>
      </article>
    `).join("");
  }

  const hasWebsite = products.some((product) => product.category === "website");
  cartSummary.innerHTML = `
    ${calculated.once ? `<div class="summary-line"><span>Egyszeri díj</span><strong>${formatPrice(calculated.once)}</strong></div>` : ""}
    ${calculated.monthly ? `<div class="summary-line"><span>Havi díj</span><strong>${formatPrice(calculated.monthly)} / hó</strong></div>` : ""}
    ${hasWebsite ? `<p class="checkout-note">A weboldal egyszeri ára nem tartalmaz folyamatos tárhelyet, domainmegújítást vagy e-mail-szolgáltatást. Ezek díját a külső szolgáltatás elindítása előtt külön egyeztetjük.</p>` : ""}
    ${products.some((p) => p.availability === "request_only") ? `<p class="checkout-note">A kosárban egyeztetést igénylő csomag van. Erre fizetés nélküli igényfelmérést fogadunk.</p>` : ""}
  `;
  startCheckoutButton.disabled = products.length === 0;
  renderCatalog();
}

function addToCart(productId) {
  if(submission.pending){showToast("Előbb ellenőrizd a függőben lévő beküldést.");openCheckout();return;}
  const product = getProduct(productId);
  if (!product) return;
  if (state.cart.includes(productId)) {
    openCart();
    return;
  }

  if (["website", "marketing", "maintenance"].includes(product.category)) {
    const replaced = state.cart.find((id) => getProduct(id)?.category === product.category);
    state.cart = state.cart.filter((id) => getProduct(id)?.category !== product.category);
    if (replaced) showToast(`A korábbi ${CATEGORY_LABELS[product.category].toLowerCase()} csomagot lecseréltük.`);
  }

  state.cart.push(productId);
  saveCart();
  renderCart();
  showToast(`${product.name} a kosárba került.`);
}

function removeFromCart(productId) {
  if(submission.pending){showToast("A függőben lévő igény csomagjai nem módosíthatók.");return;}
  state.cart = state.cart.filter((id) => id !== productId);
  saveCart();
  renderCart();
}

function openCart() {
  window.clearTimeout(drawerCloseTimer);
  overlayReturnFocus=document.activeElement;
  drawerBackdrop.hidden = false;
  cartDrawer.inert = false;
  requestAnimationFrame(() => cartDrawer.classList.add("is-open"));
  document.body.classList.add("is-locked");
  document.getElementById("closeCartButton")?.focus();
}

function closeCart() {
  cartDrawer.classList.remove("is-open");
  cartDrawer.inert = true;
  drawerCloseTimer=window.setTimeout(() => { drawerBackdrop.hidden = true; }, 280);
  if(checkoutBackdrop.hidden)document.body.classList.remove("is-locked");
  overlayReturnFocus?.focus();
}

function openCheckout() {
  if (!state.cart.length) return;
  closeCart();
  overlayReturnFocus=document.getElementById('openCartButton');
  checkoutReview.innerHTML = orderSummaryMarkup();
  updateCheckoutCopy();
  checkoutBackdrop.hidden = false;
  document.body.classList.add("is-locked");
  formLoadedAt = Date.now();
  const pending=submission.pending;
  if(pending){for(const [key,value] of Object.entries(pending)){const field=checkoutForm.elements.namedItem(key);if(field){if(field.type==='checkbox')field.checked=value;else field.value=value;}}lockCheckout(true);checkoutForm.querySelector('[type="submit"]').disabled=false;setFormStatus('Egy korábbi beküldés eredménye még bizonytalan. Ugyanazokkal az adatokkal ellenőrizzük újra; nem indítunk új igényt.');}
  (pending?checkoutForm.querySelector('[type="submit"]'):checkoutForm.querySelector("input"))?.focus();
}

function closeCheckout() {
  if(submission.busy)return;
  checkoutBackdrop.hidden = true;
  document.body.classList.remove("is-locked");
  setFormStatus("");
  overlayReturnFocus?.focus();
}
function lockCheckout(locked){for(const element of checkoutForm.elements)element.disabled=locked;}
function renderReceipt(){const receipt=submission.receipt,box=document.getElementById('orderReceipt');if(!receipt||!box)return;box.hidden=false;box.innerHTML=`<div class="success-state"><p class="eyebrow">Szerver által visszaigazolt igény</p><h2>Megkaptuk az igényedet.</h2><p>Azonosító: <strong>${escapeHtml(receipt.orderNumber)}</strong></p><p>Ez a visszaigazolás nem fizetési vagy teljesítési igazolás. Az egyeztetéshez őrizd meg az azonosítót.</p><p>${receipt.emailQueued?'Az e-mailes visszaigazolás küldési sorba került; ez még nem kézbesítési igazolás.':'Ha nem érkezik e-mail, az azonosítóval az info@ovexi.hu címen érdeklődhetsz.'}</p><p>Az ügyféltérben az azonosítóddal és a megadott e-mail-címmel kérhetsz belépési linket, követheted a munkát és pontosíthatod az adatokat.</p><a class="button button-primary" href="/ugyfelter">Ügyféltér megnyitása</a> <a class="button button-ghost" href="mailto:info@ovexi.hu?subject=${encodeURIComponent('Igény egyeztetése: '+receipt.orderNumber)}">Kapcsolat az igényemről</a></div>`;}

function orderSummaryMarkup() {
  const calculated = totals();
  return `
    <div class="summary-line"><span>Kiválasztott csomagok</span><strong>${cartProducts().length} db</strong></div>
    ${cartProducts().map((product) => `<div class="summary-line"><span>${escapeHtml(product.name)}</span><span>${formatPrice(product.price)} ${product.billing === "monthly" ? "/ hó" : ""}</span></div>`).join("")}
    ${calculated.once ? `<div class="summary-line summary-total"><span>Egyszeri összesen</span><strong>${formatPrice(calculated.once)}</strong></div>` : ""}
    ${calculated.monthly ? `<div class="summary-line summary-total"><span>Havonta összesen</span><strong>${formatPrice(calculated.monthly)} / hó</strong></div>` : ""}
    <p class="checkout-note">${calculated.monthly ? "A havi összeg csak a kosárba tett havi modulokat tartalmazza. " : ""}A külső szolgáltatók üzemeltetési díjai ezen felül, külön egyeztetés szerint fizetendők.</p>
  `;
}

function setFormStatus(message, isError = false) {
  checkoutStatus.textContent = message;
  checkoutStatus.classList.toggle("is-error", isError);
}

function createOrderNumber() {
  const timePart = Date.now().toString(36).toUpperCase();
  const randomPart = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).slice(0, 4).toUpperCase();
  return `OVX-${timePart}-${randomPart}`;
}

async function submitOrder(event) {
  event.preventDefault();
  if(submission.busy)return;
  const submitButton=checkoutForm.querySelector("button[type='submit']");
  const formData=new FormData(checkoutForm);
  if(formData.get("website"))return;
  if(!STOREFRONT_CONFIG.orderApiEnabled){setFormStatus("Az online igényfogadás átmenetileg nem elérhető. Írj az info@ovexi.hu címre.",true);return;}
  if(!submission.pending){
    if(Date.now()-formLoadedAt<2500){setFormStatus("Ellenőrizd az adatokat, majd küldd be az igényt.",true);return;}
    if(Date.now()-Number(local.get(ORDER_COOLDOWN_KEY)||0)<ORDER_COOLDOWN_MS){setFormStatus("Egy igényt már elküldtél. Új igény előtt várj két percet.",true);return;}
  }
  const raw={...Object.fromEntries(formData),itemIds:[...state.cart],termsAccepted:formData.get("termsAccepted")==="on",operatingCostsAcknowledged:formData.get("operatingCostsAcknowledged")==="on",businessPurchaseConfirmed:formData.get("businessPurchaseConfirmed")==="on",hungarianBillingConfirmed:formData.get("hungarianBillingConfirmed")==="on",marketingConsent:formData.get("marketingConsent")==="on"};
  lockCheckout(true);setFormStatus("Az igény rögzítése folyamatban…");
  let accepted=null;
  try{
    const [app,{getFunctions,httpsCallable}]=await functionsSdk();
    const submit=httpsCallable(getFunctions(app,"europe-west1"),"submitOrder",{timeout:70000});
    const result=await submission.send(raw,async payload=>(await submit(payload)).data);
    accepted=result;
    local.set(ORDER_COOLDOWN_KEY,String(Date.now()));
    state.cart=[];saveCart();renderCart();renderReceipt();
    checkoutForm.reset();lockCheckout(false);submitButton.textContent='Igény beküldése';closeCheckout();
    const receiptBox=document.getElementById("orderReceipt");
    receiptBox.scrollIntoView({behavior:"smooth",block:"center"});receiptBox.focus();
    logAnalytics("order_submitted",result.orderNumber);
    if(result.checkoutUrl){
      let destination;
      try{destination=new URL(result.checkoutUrl);}catch{}
      if(destination?.protocol==="https:"&&destination.hostname==="checkout.stripe.com"&&!destination.username&&!destination.password){window.location.assign(destination.href);return;}
      showToast("Az igényt rögzítettük, de a fizetési linket ellenőrizni kell. Ne küldd be újra.");
    }else if(result.status==="checkout_failed")showToast("Az igényt rögzítettük. A fizetés indítása nem sikerült; ne küldd be újra.");
  }catch(error){
    if(accepted){setFormStatus("Az igényedet rögzítettük: "+accepted.orderNumber+". Ne küldd be újra.",false);return;}
    if(submission.pending){
      lockCheckout(true);submitButton.disabled=false;submitButton.textContent="Ugyanazon igény újraellenőrzése";
      setFormStatus("A beküldés eredménye bizonytalan. Az adataidat ehhez az igényhez megőriztük ebben a böngészőlapban. A gomb ugyanazt a kérést ellenőrzi újra; ne készíts új igényt.",true);
    }else{
      lockCheckout(false);updateCheckoutCopy();
      const validation=error.code==="functions/invalid-argument"||!error.code;
      setFormStatus(validation?String(error.message||"Ellenőrizd a kötelező mezőket.").slice(0,300):"Most nem fogadható új igény. Próbáld később, vagy írj az info@ovexi.hu címre.",true);
    }
  }
}

function normalize(value, maxLength) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[character]);
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3200);
}

function initCookieConsent() {
  const banner = document.getElementById("cookieBanner");
  document.getElementById('openCookieSettings')?.addEventListener('click',()=>{banner.hidden=false;document.getElementById('cookieReject')?.focus();});
  if (!local.get(COOKIE_STORAGE_KEY)) banner.hidden = false;
  document.getElementById("cookieReject")?.addEventListener("click", () => {
    local.set(COOKIE_STORAGE_KEY, JSON.stringify({ analytics: false, updatedAt: Date.now() }));
    banner.hidden = true;
  });
  document.getElementById("cookieAccept")?.addEventListener("click", () => {
    local.set(COOKIE_STORAGE_KEY, JSON.stringify({ analytics: true, updatedAt: Date.now() }));
    banner.hidden = true;
    logAnalytics("consent_accepted", "analytics");
  });
}

async function logAnalytics(eventType, value = "") {
  try {
    const consent = JSON.parse(local.get(COOKIE_STORAGE_KEY) || "{}");
    if (!consent.analytics) return;
    const [app,{addDoc,collection,getFirestore,serverTimestamp}]=await firestoreSdk(),db=getFirestore(app);
    await addDoc(collection(db, "analytics_events"), {
      sessionId: getSessionId(),
      eventType: normalize(eventType, 40),
      pagePath: location.pathname.slice(0, 200),
      pageUrl: (location.origin+location.pathname).slice(0, 500),
      referrer: document.referrer ? new URL(document.referrer).origin.slice(0,500) : "",
      source: new URLSearchParams(location.search).get("utm_source")?.slice(0, 120) || "direct",
      lang: document.documentElement.lang,
      screenW: window.screen.width,
      screenH: window.screen.height,
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
      userAgent: navigator.userAgent.slice(0, 320),
      target: "storefront",
      value: normalize(value, 320),
      consentAnalytics: true,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.debug("Analytics skipped", error);
  }
}

function getSessionId() {
  const key = "ovexi_session_v2";
  let id = session.get(key);
  if (!id) {
    id = crypto.randomUUID();
    session.set(key, id);
  }
  return id;
}

document.querySelectorAll(".catalog-tab").forEach((button) => {
  button.addEventListener("click", () => {
    state.category = button.dataset.category;
    document.querySelectorAll(".catalog-tab").forEach((tab) => {
      const active = tab === button;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    renderCatalog();
  });
});

document.querySelectorAll("[data-open-category]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(`.catalog-tab[data-category="${button.dataset.openCategory}"]`)?.click();
    document.getElementById("csomagok")?.scrollIntoView({ behavior: "smooth" });
  });
});

productGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add-product]");
  if (button) addToCart(button.dataset.addProduct);
});
cartItems.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-product]");
  if (button) removeFromCart(button.dataset.removeProduct);
});

document.getElementById("openCartButton")?.addEventListener("click", openCart);
document.getElementById("closeCartButton")?.addEventListener("click", closeCart);
drawerBackdrop.addEventListener("click", closeCart);
startCheckoutButton.addEventListener("click", openCheckout);
document.getElementById("closeCheckoutButton")?.addEventListener("click", closeCheckout);
checkoutBackdrop.addEventListener("click", (event) => { if (event.target === checkoutBackdrop) closeCheckout(); });
checkoutForm.addEventListener("submit", submitOrder);
checkoutForm.elements.namedItem("currentUrl")?.addEventListener("blur",(event)=>{try{event.target.value=normalizeWebUrl(event.target.value);}catch{}});

document.getElementById("navToggle")?.addEventListener("click", (event) => {
  const nav = document.getElementById("mainNav");
  const open = nav.classList.toggle("is-open");
  event.currentTarget.setAttribute("aria-expanded", String(open));
});
document.querySelectorAll("#mainNav a").forEach((link) => link.addEventListener("click", () => {
  document.getElementById("mainNav")?.classList.remove("is-open");
  document.getElementById("navToggle")?.setAttribute("aria-expanded", "false");
}));

document.addEventListener("keydown", (event) => {
  if(event.key==='Tab'){
    const overlay=!checkoutBackdrop.hidden?checkoutBackdrop:cartDrawer.classList.contains('is-open')?cartDrawer:null;
    if(overlay){const focusable=[...overlay.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')].filter(el=>el.tabIndex>=0&&!el.closest('.bot-trap'));
      const first=focusable[0],last=focusable.at(-1);if(first&&(event.shiftKey&&document.activeElement===first||!event.shiftKey&&document.activeElement===last)){event.preventDefault();(event.shiftKey?last:first).focus();}}
  }
  if (event.key !== "Escape") return;
  if (!checkoutBackdrop.hidden) closeCheckout();
  else if (cartDrawer.classList.contains("is-open")) closeCart();
});

document.querySelectorAll(".catalog-tab").forEach(tab=>{const active=tab.dataset.category===state.category;tab.classList.toggle("is-active",active);tab.setAttribute("aria-selected",String(active));});
renderCatalog();
renderCart();
renderReceipt();
if(submission.pending)openCheckout();
window.addEventListener('beforeunload',event=>{if(submission.pending){event.preventDefault();event.returnValue='';}});
initCookieConsent();
logAnalytics("page_view", "storefront");

const paymentState = new URLSearchParams(location.search).get("payment");
if (["success", "returned"].includes(paymentState)) showToast("Visszaérkeztél a fizetési oldalról. A fizetés állapotát a szolgáltató visszajelzése alapján ellenőrizzük.");
if (paymentState === "cancelled") showToast("A fizetés megszakadt, a rendelésed nem veszett el.");
