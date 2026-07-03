/* ==========================================================================
   Nurael Abaya — Shared behaviour: cart, rendering helpers, UI interactions
   ========================================================================== */

const CART_KEY = "nurael_cart";
const SIZES = ["S","M","L","XL","XXL"];

/* ---------- Cart storage ---------- */
function getCart(){
  try{ return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch(e){ return []; }
}
function saveCart(cart){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}
function addToCart(productId, size, qty = 1, notes = ""){
  const cart = getCart();
  const existing = cart.find(i => i.id === productId && i.size === size && !notes);
  if (existing && !notes){ existing.qty += qty; }
  else { cart.push({ id: productId, size, qty, notes: notes || "" }); }
  saveCart(cart);
}
function removeFromCart(productId, size){
  saveCart(getCart().filter(i => !(i.id === productId && i.size === size)));
}
function setQty(productId, size, qty){
  const cart = getCart();
  const item = cart.find(i => i.id === productId && i.size === size);
  if (item){ item.qty = Math.max(1, qty); }
  saveCart(cart);
}
function cartCountTotal(){ return getCart().reduce((sum,i) => sum + i.qty, 0); }
function updateCartCount(){
  if (typeof renderCartDrawer === "function") renderCartDrawer();
  document.querySelectorAll("[data-cart-count]").forEach(el => { el.textContent = cartCountTotal(); });
}

/* ---------- Rendering helpers ---------- */
function starString(rating){
  const full = Math.round(rating);
  return "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full);
}

function mediaFrame(product, opts = {}){
  const toneClass = product.tone === "dark" ? "dark" : "";
  const tag = opts.tag || product.tag;
  const badge = opts.badge !== false && product.oldPrice
    ? `<span class="badge-corner sale">-${Math.round((1 - product.price/product.oldPrice)*100)}%</span>`
    : (opts.badge !== false && product.tag === "New" ? `<span class="badge-corner">New</span>` : "");
  const color = product.tone === "dark" ? product.colors[0] : "#122921";
  const media = product.image
    ? `<img src="${product.image}" alt="${product.name || ""}" loading="lazy">`
    : silhouette(product.silhouette);
  return `<div class="media-frame ${toneClass}" style="color:${color === '#faf7f2' ? '#122921' : color}">
      ${badge}
      ${media}
      ${tag ? `<span class="frame-tag">${tag}</span>` : ""}
    </div>`;
}

const CATEGORY_URL_PREFIX = { Abayas: "abaya", Kaftans: "kaftan", Hijabs: "hijab", Accessories: "accessory" };
function productUrl(product){
  const prefix = CATEGORY_URL_PREFIX[product.category] || "abaya";
  return `/${prefix}/${product.id}`;
}

function productCard(product){
  const discountPct = product.oldPrice ? Math.round((1 - product.price/product.oldPrice)*100) : 0;
  const priceHtml = product.oldPrice
    ? `<span class="now">$${product.price}</span><span class="old">$${product.oldPrice}</span><span class="price-tag-discount">-${discountPct}%</span>`
    : `<span class="now">$${product.price}</span>`;
  const outOfStock = product.stock != null && product.stock <= 0;
  const url = productUrl(product);
  return `
  <div class="product-card">
    <a href="${url}">
      ${mediaFrame(product)}
    </a>
    <span class="product-cat">${product.category}</span>
    <a href="${url}"><h3>${product.name}</h3></a>
    <div class="product-rating"><span class="stars">${starString(product.rating)}</span> ${product.rating.toFixed(1)} (${product.reviews})</div>
    <div class="price-row">${priceHtml}</div>
    <div class="quick-add">
      ${outOfStock
        ? `<button class="btn btn-full btn-sm" disabled style="opacity:.5;cursor:not-allowed">Out of Stock</button>`
        : `<button class="btn btn-full btn-sm" onclick="addToCart('${product.id}','M',1); showToast('${product.name.replace(/'/g,"")} added to cart');">Quick Add</button>`}
    </div>
  </div>`;
}

function renderGrid(container, products){
  if (!container) return;
  container.innerHTML = products.map(productCard).join("");
}

/* ---------- Toast ---------- */
function showToast(message){
  let toast = document.querySelector(".toast");
  if (!toast){
    toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<span class="dot"></span><span class="toast-msg"></span>`;
    document.body.appendChild(toast);
  }
  toast.querySelector(".toast-msg").textContent = message;
  toast.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

/* ---------- Mobile nav (full slide-in drawer) ---------- */
function initMobileNav(){
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".mobile-nav");
  const overlay = document.querySelector(".menu-overlay");
  const closeBtn = document.querySelector(".mobile-nav-close");
  if (!toggle || !nav) return;

  function openNav(){
    nav.classList.add("open");
    if (overlay) overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeNav(){
    nav.classList.remove("open");
    if (overlay) overlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    nav.classList.contains("open") ? closeNav() : openNav();
  });
  if (closeBtn) closeBtn.addEventListener("click", closeNav);
  if (overlay) overlay.addEventListener("click", closeNav);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeNav(); });
}

/* ---------- Cart drawer ---------- */
function renderCartDrawer(){
  const body = document.getElementById("cart-drawer-body");
  const foot = document.getElementById("cart-drawer-foot");
  if (!body || !foot) return;
  const cart = getCart();
  if (!cart.length){
    body.innerHTML = `
      <div class="cart-drawer-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" width="44" height="44"><path d="M6 6h15l-1.5 9h-12z"/><path d="M6 6L4 3H2"/></svg>
        <p style="margin:0 0 18px;font-size:15px;color:var(--black)">Your cart is empty</p>
        <a href="shop.html" class="btn" style="width:auto;padding:12px 26px">Continue Shopping</a>
        <p style="font-size:12px;color:var(--grey);margin-top:26px">Have an account? <a href="login.html" style="text-decoration:underline;color:var(--ink)">Log in</a> to check out faster.</p>
      </div>`;
    foot.innerHTML = "";
    return;
  }
  if (typeof PRODUCTS === "undefined" || !PRODUCTS.length){ return; }
  let subtotal = 0;
  body.innerHTML = cart.map(item => {
    const p = getProduct(item.id);
    if (!p) return "";
    subtotal += p.price * item.qty;
    return `
      <div class="cart-drawer-item">
        <div class="media-frame ${p.tone==='dark' ? 'dark' : ''}" style="color:${p.tone==='dark' ? '#d4b876' : '#122921'}">${silhouette(p.silhouette)}</div>
        <div class="cart-drawer-item-info">
          <h5>${p.name}</h5>
          <span>Size: ${item.size} &middot; Qty: ${item.qty}</span>
          <span>$${(p.price * item.qty).toFixed(2)}</span>
        </div>
      </div>`;
  }).join("");
  foot.innerHTML = `
    <div class="summary-row" style="display:flex;justify-content:space-between;font-weight:600;margin-bottom:14px"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
    <a href="cart.html" class="btn btn-full">View Cart &amp; Checkout</a>`;
}

function initCartDrawer(){
  const drawer = document.querySelector(".cart-drawer");
  const overlay = document.querySelector(".cart-drawer-overlay");
  const toggle = document.querySelector(".cart-btn");
  const closeBtn = document.querySelector(".cart-drawer-close");
  if (!drawer || !toggle) return;

  function openDrawer(){
    renderCartDrawer();
    drawer.classList.add("open");
    if (overlay) overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeDrawer(){
    drawer.classList.remove("open");
    if (overlay) overlay.classList.remove("open");
    document.body.style.overflow = "";
  }
  toggle.addEventListener("click", (e) => { e.preventDefault(); openDrawer(); });
  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
  if (overlay) overlay.addEventListener("click", closeDrawer);
}

/* ---------- Localization popup (country / language) ---------- */
const LOCALE_KEY = "nurael_locale_country";
function getSavedLocale(){
  try{ return JSON.parse(localStorage.getItem(LOCALE_KEY)) || null; }
  catch(e){ return null; }
}
function saveLocale(country){
  localStorage.setItem(LOCALE_KEY, JSON.stringify(country));
  const label = document.querySelector("[data-locale-label]");
  if (label) label.textContent = country.code;
}
function localeRateNote(code){
  if (typeof window.SHIPPING_RATES !== "undefined" && window.SHIPPING_RATES && window.SHIPPING_RATES.length){
    const row = window.SHIPPING_RATES.find(r => r.country_code === code);
    if (row) return `$${Number(row.rate).toFixed(2)} shipping`;
  }
  return "Calculated at checkout";
}
function renderLocaleList(filter = ""){
  const list = document.getElementById("locale-country-list");
  if (!list || typeof COUNTRIES === "undefined") return;
  const saved = getSavedLocale();
  const q = filter.trim().toLowerCase();
  const matches = COUNTRIES.filter(c => !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  if (!matches.length){
    list.innerHTML = `<div class="locale-empty">No countries match "${filter}"</div>`;
    return;
  }
  list.innerHTML = matches.map(c => `
    <button type="button" class="locale-item ${saved && saved.code === c.code ? "selected" : ""}" data-locale-code="${c.code}" data-locale-name="${c.name}">
      <span>${c.name}</span>
      <span class="rate-note">${localeRateNote(c.code)}</span>
    </button>`).join("");
}
function initLocaleModal(){
  const trigger = document.querySelector("[data-locale-trigger]");
  const overlay = document.querySelector(".locale-modal-overlay");
  const modal = document.querySelector(".locale-modal");
  const closeBtn = document.querySelector(".locale-modal-close");
  const searchInput = document.getElementById("locale-search-input");
  if (!trigger || !modal) return;

  const label = document.querySelector("[data-locale-label]");
  const saved = getSavedLocale();
  if (label && saved) label.textContent = saved.code;

  function open(){
    renderLocaleList(searchInput ? searchInput.value : "");
    modal.classList.add("open");
    if (overlay) overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function close(){
    modal.classList.remove("open");
    if (overlay) overlay.classList.remove("open");
    document.body.style.overflow = "";
  }
  trigger.addEventListener("click", (e) => { e.preventDefault(); open(); });
  if (closeBtn) closeBtn.addEventListener("click", close);
  if (overlay) overlay.addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  if (searchInput) searchInput.addEventListener("input", () => renderLocaleList(searchInput.value));

  const list = document.getElementById("locale-country-list");
  if (list){
    list.addEventListener("click", (e) => {
      const btn = e.target.closest(".locale-item");
      if (!btn) return;
      saveLocale({ code: btn.getAttribute("data-locale-code"), name: btn.getAttribute("data-locale-name") });
      showToast(`Shipping to ${btn.getAttribute("data-locale-name")}`);
      close();
    });
  }

  document.querySelectorAll(".locale-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".locale-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      document.querySelectorAll(".locale-tab-panel").forEach(p => p.style.display = "none");
      const panel = document.getElementById(tab.getAttribute("data-tab-target"));
      if (panel) panel.style.display = "";
    });
  });
}

/* ---------- Account modal (sign in / Google / Orders-Loyalty-Profile) ---------- */
function initAccountModal(){
  const trigger = document.querySelector("[data-account-trigger]");
  const overlay = document.querySelector(".account-modal-overlay");
  const modal = document.querySelector(".account-modal");
  const closeBtn = document.querySelector(".account-modal-close");
  const guestView = document.getElementById("account-modal-guest");
  const userView = document.getElementById("account-modal-user");
  const greeting = document.getElementById("account-modal-greeting");
  const googleBtn = document.getElementById("modal-google-btn");
  const signoutBtn = document.getElementById("modal-signout-btn");
  if (!trigger || !modal) return;

  function open(){
    modal.classList.add("open");
    if (overlay) overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function close(){
    modal.classList.remove("open");
    if (overlay) overlay.classList.remove("open");
    document.body.style.overflow = "";
  }
  trigger.addEventListener("click", (e) => { e.preventDefault(); open(); });
  if (closeBtn) closeBtn.addEventListener("click", close);
  if (overlay) overlay.addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  if (googleBtn){
    googleBtn.addEventListener("click", async () => {
      if (typeof sb === "undefined") return;
      await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.href } });
    });
  }
  if (signoutBtn){
    signoutBtn.addEventListener("click", async () => {
      if (typeof sb === "undefined") return;
      await sb.auth.signOut();
      window.location.reload();
    });
  }

  if (typeof sb !== "undefined"){
    sb.auth.getSession().then(({ data }) => {
      const session = data.session;
      if (session){
        if (guestView) guestView.style.display = "none";
        if (userView) userView.style.display = "";
        if (greeting){
          const user = session.user;
          const name = (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || user.email;
          greeting.textContent = `Signed in as ${name}`;
        }
      }
    });
  }
}

/* ---------- Header dropdowns (Categories / Collections) ---------- */
function initDropdowns(){
  const dropdowns = document.querySelectorAll(".dropdown");
  if (!dropdowns.length) return;
  dropdowns.forEach(dd => {
    const btn = dd.querySelector(".dropdown-btn");
    if (!btn) return;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = dd.classList.contains("open");
      dropdowns.forEach(d => d.classList.remove("open"));
      dd.classList.toggle("open", !isOpen);
    });
  });
  document.addEventListener("click", () => {
    dropdowns.forEach(d => d.classList.remove("open"));
  });
}

/* ---------- Header search ---------- */
function initHeaderSearch(){
  document.querySelectorAll(".subnav-search").forEach(form => {
    form.addEventListener("submit", e => {
      e.preventDefault();
      const input = form.querySelector("input");
      const q = input.value.trim();
      window.location.href = "shop.html" + (q ? `?q=${encodeURIComponent(q)}` : "");
    });
  });
}

/* ---------- Accordion ---------- */
function initAccordions(){
  document.querySelectorAll(".accordion-item").forEach(item => {
    const header = item.querySelector(".accordion-header");
    if (!header) return;
    header.addEventListener("click", () => {
      const wasOpen = item.classList.contains("open");
      if (item.closest(".accordion-exclusive")){
        item.parentElement.querySelectorAll(".accordion-item").forEach(i => i.classList.remove("open"));
      }
      item.classList.toggle("open", !wasOpen);
    });
  });
}

/* ---------- Newsletter / contact form (demo) ---------- */
function initDemoForms(){
  document.querySelectorAll("[data-demo-form]").forEach(form => {
    form.addEventListener("submit", e => {
      e.preventDefault();
      showToast(form.getAttribute("data-demo-form") || "Thank you!");
      form.reset();
    });
  });
}

/* ---------- Init on every page ---------- */
document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
  initMobileNav();
  initCartDrawer();
  initLocaleModal();
  initAccountModal();
  initDropdowns();
  initHeaderSearch();
  initAccordions();
  initDemoForms();
});
