/* ==========================================================================
   Nurael Abaya — Loads live product & settings data from Supabase
   ========================================================================== */

window.PRODUCTS = [];
window.SITE_SETTINGS = {};

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function getProduct(id){ return PRODUCTS.find(p => p.id === id); }
function relatedProducts(product, count = 4){
  return PRODUCTS.filter(p => p.id !== product.id && p.category === product.category)
    .concat(PRODUCTS.filter(p => p.id !== product.id && p.category !== product.category))
    .slice(0, count);
}

function mapProductRow(row){
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    tag: row.tag || "",
    price: Number(row.price) || 0,
    oldPrice: row.old_price != null ? Number(row.old_price) : null,
    stock: row.stock != null ? Number(row.stock) : 0,
    rating: row.rating != null ? Number(row.rating) : 4.5,
    reviews: row.reviews != null ? Number(row.reviews) : 0,
    colors: row.colors || [],
    colorNames: row.color_names || [],
    silhouette: row.silhouette || "closed",
    tone: row.tone || "dark",
    image: row.image || null,
    gallery: row.gallery || [],
    featured: !!row.featured,
    description: row.description || "",
    details: row.details || []
  };
}

function mapSettingsRow(row){
  if (!row) return {};
  return {
    heroImage: row.hero_image || null,
    heroEyebrow: row.hero_eyebrow || "",
    heroTitle: row.hero_title || "",
    heroSubtitle: row.hero_subtitle || "",
    announcementText: row.announcement_text || ""
  };
}

function applySettingsToPage(){
  const s = window.SITE_SETTINGS || {};

  const announceEl = document.querySelector(".announce");
  if (announceEl && s.announcementText){
    const parts = s.announcementText.split("·").map(p => p.trim()).filter(Boolean);
    if (parts.length > 1){
      announceEl.innerHTML = parts[0] + " &nbsp;·&nbsp; <span>" + parts.slice(1).join(" · ") + "</span>";
    } else {
      announceEl.textContent = s.announcementText;
    }
  }

  const heroEyebrow = document.getElementById("hero-eyebrow");
  const heroTitle = document.getElementById("hero-title");
  const heroSubtitle = document.getElementById("hero-subtitle");
  if (heroEyebrow && s.heroEyebrow) heroEyebrow.textContent = s.heroEyebrow;
  if (heroTitle && s.heroTitle) heroTitle.textContent = s.heroTitle;
  if (heroSubtitle && s.heroSubtitle) heroSubtitle.textContent = s.heroSubtitle;

  const heroMedia = document.querySelector(".hero-media .media-frame");
  if (heroMedia && s.heroImage){
    heroMedia.innerHTML = `<img src="${s.heroImage}" alt="Nurael Abaya" style="width:100%;height:100%;object-fit:cover">`;
  }
}

async function loadSiteData(){
  try{
    const [{ data: productRows, error: pErr }, { data: settingsRow, error: sErr }] = await Promise.all([
      sb.from("products").select("*").order("created_at", { ascending: true }),
      sb.from("settings").select("*").eq("id", 1).single()
    ]);
    if (pErr) console.error("Failed to load products", pErr);
    if (sErr) console.error("Failed to load settings", sErr);
    window.PRODUCTS = (productRows || []).map(mapProductRow);
    window.SITE_SETTINGS = mapSettingsRow(settingsRow);
  } catch(err){
    console.error("Failed to load site data", err);
    window.PRODUCTS = [];
    window.SITE_SETTINGS = {};
  }
  applySettingsToPage();
  return { products: window.PRODUCTS, settings: window.SITE_SETTINGS };
}
