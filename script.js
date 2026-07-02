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
function addToCart(productId, size, qty = 1){
  const cart = getCart();
  const existing = cart.find(i => i.id === productId && i.size === size);
  if (existing){ existing.qty += qty; }
  else { cart.push({ id: productId, size, qty }); }
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

function productCard(product){
  const discountPct = product.oldPrice ? Math.round((1 - product.price/product.oldPrice)*100) : 0;
  const priceHtml = product.oldPrice
    ? `<span class="now">$${product.price}</span><span class="old">$${product.oldPrice}</span><span class="price-tag-discount">-${discountPct}%</span>`
    : `<span class="now">$${product.price}</span>`;
  const outOfStock = product.stock != null && product.stock <= 0;
  return `
  <div class="product-card">
    <a href="product.html?id=${product.id}">
      ${mediaFrame(product)}
    </a>
    <span class="product-cat">${product.category}</span>
    <a href="product.html?id=${product.id}"><h3>${product.name}</h3></a>
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

/* ---------- Mobile nav ---------- */
function initMobileNav(){
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".mobile-nav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    nav.classList.toggle("open");
  });
  document.addEventListener("click", (e) => {
    if (!nav.contains(e.target) && e.target !== toggle) nav.classList.remove("open");
  });
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
  initDropdowns();
  initHeaderSearch();
  initAccordions();
  initDemoForms();
});
