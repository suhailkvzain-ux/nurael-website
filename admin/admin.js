/* ==========================================================================
   Nurael Admin Panel (Supabase-backed)
   ========================================================================== */

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let PRODUCTS = [];
let SETTINGS = {};
let editingProductId = null;

/* ---------- DB row <-> app object mapping ---------- */
function mapProductRow(row){
  return {
    id: row.id, name: row.name, category: row.category, tag: row.tag || "",
    price: Number(row.price) || 0,
    oldPrice: row.old_price != null ? Number(row.old_price) : null,
    stock: row.stock != null ? Number(row.stock) : 0,
    rating: row.rating != null ? Number(row.rating) : 4.5,
    reviews: row.reviews != null ? Number(row.reviews) : 0,
    colors: row.colors || [], colorNames: row.color_names || [],
    silhouette: row.silhouette || "closed", tone: row.tone || "dark",
    image: row.image || null, gallery: row.gallery || [],
    featured: !!row.featured, description: row.description || "", details: row.details || []
  };
}
function toRow(payload){
  return {
    name: payload.name, category: payload.category, tag: payload.tag,
    price: payload.price, old_price: payload.oldPrice, stock: payload.stock,
    rating: payload.rating, reviews: payload.reviews,
    colors: payload.colors, color_names: payload.colorNames,
    silhouette: payload.silhouette, tone: payload.tone,
    image: payload.image, gallery: payload.gallery,
    featured: payload.featured, description: payload.description, details: payload.details
  };
}
function slugify(str){
  return String(str).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/* ---------- Auth ---------- */
async function checkAuth(){
  const { data: { session } } = await sb.auth.getSession();
  if (!session){
    window.location.href = 'login.html';
    return null;
  }
  document.getElementById('user-label').textContent = 'Signed in as ' + session.user.email;
  return session;
}

document.getElementById('logout-btn').addEventListener('click', async () => {
  await sb.auth.signOut();
  window.location.href = 'login.html';
});

/* ---------- Toast ---------- */
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window.__t);
  window.__t = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------- View routing ---------- */
function showView(name){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
  const link = document.querySelector(`.nav-link[data-view="${name}"]`);
  if (link) link.classList.add('active');
}

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    if (!link.dataset.view) return;
    e.preventDefault();
    if (link.dataset.view === 'product-form' && link.id === 'nav-add-product') resetProductForm();
    showView(link.dataset.view);
  });
});
document.getElementById('btn-add-product').addEventListener('click', () => {
  resetProductForm();
  showView('product-form');
});
document.getElementById('cancel-form-btn').addEventListener('click', () => showView('products'));

/* ---------- Data loading ---------- */
async function loadProducts(){
  const { data, error } = await sb.from('products').select('*').order('created_at', { ascending: true });
  if (error){ showToast('Failed to load products: ' + error.message); return; }
  PRODUCTS = (data || []).map(mapProductRow);
  renderDashboard();
  renderProductsTable();
}
async function loadSettings(){
  const { data, error } = await sb.from('settings').select('*').eq('id', 1).single();
  if (error){ showToast('Failed to load settings: ' + error.message); return; }
  SETTINGS = data || {};
  fillSettingsForm();
}

/* ---------- Dashboard ---------- */
function renderDashboard(){
  document.getElementById('stat-total').textContent = PRODUCTS.length;
  document.getElementById('stat-instock').textContent = PRODUCTS.filter(p => (p.stock||0) > 5).length;
  document.getElementById('stat-lowstock').textContent = PRODUCTS.filter(p => (p.stock||0) <= 5).length;
  document.getElementById('stat-featured').textContent = PRODUCTS.filter(p => p.featured).length;

  const recent = PRODUCTS.slice(-6).reverse();
  document.getElementById('dashboard-recent').innerHTML = recent.map(p => `
    <tr>
      <td class="prod-cell">${thumbHtml(p)}<div><strong>${escapeHtml(p.name)}</strong></div></td>
      <td>${escapeHtml(p.category)}</td>
      <td>$${Number(p.price).toFixed(2)}</td>
      <td>${stockBadge(p.stock)}</td>
    </tr>`).join('') || `<tr><td colspan="4" class="empty-state">No products yet.</td></tr>`;
}

function thumbHtml(p){
  if (p.image) return `<div class="prod-thumb"><img src="${p.image}" alt=""></div>`;
  return `<div class="prod-thumb">🧵</div>`;
}
function stockBadge(stock){
  stock = Number(stock) || 0;
  if (stock <= 0) return `<span class="badge out">Out of stock</span>`;
  if (stock <= 5) return `<span class="badge low">${stock} left</span>`;
  return `<span class="badge in">${stock} in stock</span>`;
}
function escapeHtml(str){
  return String(str || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* ---------- Products table ---------- */
function renderProductsTable(){
  const tbody = document.getElementById('products-table');
  if (!PRODUCTS.length){
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No products yet. Click "Add Product" to create your first one.</td></tr>`;
    return;
  }
  tbody.innerHTML = PRODUCTS.map(p => `
    <tr>
      <td class="prod-cell">${thumbHtml(p)}<div><strong>${escapeHtml(p.name)}</strong><span>${escapeHtml(p.id)}</span></div></td>
      <td>${escapeHtml(p.category)}</td>
      <td>$${Number(p.price).toFixed(2)}${p.oldPrice ? ` <span style="color:var(--grey);text-decoration:line-through;font-size:11px">$${Number(p.oldPrice).toFixed(2)}</span>` : ''}</td>
      <td>${stockBadge(p.stock)}</td>
      <td>${p.featured ? '<span class="badge featured">Featured</span>' : '<span class="badge muted">—</span>'}</td>
      <td>
        <div class="row-actions">
          <button class="icon-link" onclick="editProduct('${p.id}')">Edit</button>
          <button class="icon-link danger" onclick="deleteProduct('${p.id}')">Delete</button>
        </div>
      </td>
    </tr>`).join('');
}

/* ---------- Product form: dynamic detail/color rows ---------- */
function addDetailRow(value){
  const row = document.createElement('div');
  row.className = 'detail-row';
  row.innerHTML = `<input type="text" value="${escapeHtml(value||'')}" placeholder="e.g. 100% brushed crepe"><button type="button" class="remove-x" onclick="this.parentElement.remove()">×</button>`;
  document.getElementById('details-list').appendChild(row);
}
document.getElementById('add-detail-row').addEventListener('click', () => addDetailRow(''));

function addColorRow(hex, name){
  const row = document.createElement('div');
  row.className = 'color-row';
  row.innerHTML = `<input type="color" value="${hex || '#122921'}"><input type="text" value="${escapeHtml(name||'')}" placeholder="Colour name e.g. Black"><button type="button" class="remove-x" onclick="this.parentElement.remove()">×</button>`;
  document.getElementById('color-list').appendChild(row);
}
document.getElementById('add-color-row').addEventListener('click', () => addColorRow('#122921',''));

/* ---------- Image uploads (Supabase Storage) ---------- */
let mainImageUrl = null;
let galleryUrls = [];

async function uploadImage(file){
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${Date.now()}-${Math.round(Math.random()*1e9)}.${ext}`;
  const { error } = await sb.storage.from('product-images').upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);
  const { data } = sb.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}

document.getElementById('main-image-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try{
    showToast('Uploading image...');
    mainImageUrl = await uploadImage(file);
    document.getElementById('main-image-preview').innerHTML = `<img src="${mainImageUrl}">`;
    showToast('Image uploaded');
  } catch(err){ showToast(err.message); }
});

document.getElementById('gallery-image-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try{
    showToast('Uploading image...');
    const url = await uploadImage(file);
    galleryUrls.push(url);
    renderGalleryPreview();
    showToast('Image added to gallery');
  } catch(err){ showToast(err.message); }
  e.target.value = '';
});

function renderGalleryPreview(){
  document.getElementById('gallery-preview').innerHTML = galleryUrls.map((url, i) => `
    <div class="gallery-item"><img src="${url}"><button type="button" onclick="removeGalleryImage(${i})">×</button></div>
  `).join('');
}
function removeGalleryImage(i){
  galleryUrls.splice(i, 1);
  renderGalleryPreview();
}

/* ---------- Product form: reset / populate / submit ---------- */
function resetProductForm(){
  editingProductId = null;
  document.getElementById('form-title').textContent = 'Add Product';
  document.getElementById('product-form').reset();
  document.getElementById('details-list').innerHTML = '';
  document.getElementById('color-list').innerHTML = '';
  addDetailRow(''); addDetailRow('');
  addColorRow('#122921', 'Black');
  mainImageUrl = null;
  galleryUrls = [];
  document.getElementById('main-image-preview').innerHTML = 'No image';
  renderGalleryPreview();
  document.getElementById('delete-product-btn').style.display = 'none';
  document.getElementById('f-oldPrice').value = '';
}

function editProduct(id){
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  editingProductId = id;
  document.getElementById('form-title').textContent = 'Edit — ' + p.name;
  document.getElementById('f-name').value = p.name || '';
  document.getElementById('f-category').value = p.category || 'Abayas';
  document.getElementById('f-tag').value = p.tag || 'Everyday';
  document.getElementById('f-silhouette').value = p.silhouette || 'closed';
  document.getElementById('f-price').value = p.price ?? '';
  document.getElementById('f-oldPrice').value = p.oldPrice ?? '';
  document.getElementById('f-stock').value = p.stock ?? 0;
  document.getElementById('f-tone').value = p.tone || 'dark';
  document.getElementById('f-rating').value = p.rating ?? 4.5;
  document.getElementById('f-reviews').value = p.reviews ?? 0;
  document.getElementById('f-featured').checked = !!p.featured;
  document.getElementById('f-description').value = p.description || '';

  document.getElementById('details-list').innerHTML = '';
  (p.details && p.details.length ? p.details : ['']).forEach(d => addDetailRow(d));

  document.getElementById('color-list').innerHTML = '';
  const colors = p.colors && p.colors.length ? p.colors : ['#122921'];
  const names = p.colorNames && p.colorNames.length ? p.colorNames : ['Black'];
  colors.forEach((c,i) => addColorRow(c, names[i] || ''));

  mainImageUrl = p.image || null;
  document.getElementById('main-image-preview').innerHTML = mainImageUrl ? `<img src="${mainImageUrl}">` : 'No image';
  galleryUrls = Array.isArray(p.gallery) ? [...p.gallery] : [];
  renderGalleryPreview();

  document.getElementById('delete-product-btn').style.display = 'inline-flex';
  showView('product-form');
}

function collectProductPayload(){
  const details = [...document.querySelectorAll('#details-list input')].map(i => i.value.trim()).filter(Boolean);
  const colorRows = [...document.querySelectorAll('#color-list .color-row')];
  const colors = colorRows.map(r => r.querySelector('input[type=color]').value);
  const colorNames = colorRows.map(r => r.querySelector('input[type=text]').value.trim());

  return {
    name: document.getElementById('f-name').value.trim(),
    category: document.getElementById('f-category').value,
    tag: document.getElementById('f-tag').value,
    silhouette: document.getElementById('f-silhouette').value,
    tone: document.getElementById('f-tone').value,
    price: parseFloat(document.getElementById('f-price').value) || 0,
    oldPrice: document.getElementById('f-oldPrice').value ? parseFloat(document.getElementById('f-oldPrice').value) : null,
    stock: parseInt(document.getElementById('f-stock').value, 10) || 0,
    rating: parseFloat(document.getElementById('f-rating').value) || 0,
    reviews: parseInt(document.getElementById('f-reviews').value, 10) || 0,
    featured: document.getElementById('f-featured').checked,
    description: document.getElementById('f-description').value.trim(),
    details, colors, colorNames,
    image: mainImageUrl,
    gallery: galleryUrls
  };
}

document.getElementById('product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = collectProductPayload();
  if (!payload.name){ showToast('Product name is required'); return; }
  try{
    if (editingProductId){
      const { error } = await sb.from('products').update(toRow(payload)).eq('id', editingProductId);
      if (error) throw new Error(error.message);
      showToast('Product updated');
    } else {
      const id = slugify(payload.name);
      const row = { id, ...toRow(payload) };
      const { error } = await sb.from('products').insert(row);
      if (error) throw new Error(error.message);
      showToast('Product created');
    }
    await loadProducts();
    showView('products');
  } catch(err){ showToast(err.message); }
});

document.getElementById('delete-product-btn').addEventListener('click', async () => {
  if (!editingProductId) return;
  if (!confirm('Delete this product? This cannot be undone.')) return;
  const { error } = await sb.from('products').delete().eq('id', editingProductId);
  if (!error){ showToast('Product deleted'); await loadProducts(); showView('products'); }
  else showToast('Delete failed: ' + error.message);
});

async function deleteProduct(id){
  if (!confirm('Delete this product? This cannot be undone.')) return;
  const { error } = await sb.from('products').delete().eq('id', id);
  if (!error){ showToast('Product deleted'); await loadProducts(); }
  else showToast('Delete failed: ' + error.message);
}

/* ---------- Settings ---------- */
function fillSettingsForm(){
  document.getElementById('s-heroEyebrow').value = SETTINGS.hero_eyebrow || '';
  document.getElementById('s-heroTitle').value = SETTINGS.hero_title || '';
  document.getElementById('s-heroSubtitle').value = SETTINGS.hero_subtitle || '';
  document.getElementById('s-announcementText').value = SETTINGS.announcement_text || '';
  document.getElementById('hero-image-preview').innerHTML = SETTINGS.hero_image ? `<img src="${SETTINGS.hero_image}">` : 'No image';
}

let heroImageUrl = null;
document.getElementById('hero-image-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try{
    showToast('Uploading cover image...');
    heroImageUrl = await uploadImage(file);
    document.getElementById('hero-image-preview').innerHTML = `<img src="${heroImageUrl}">`;
    showToast('Cover image uploaded');
  } catch(err){ showToast(err.message); }
});

document.getElementById('settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    hero_eyebrow: document.getElementById('s-heroEyebrow').value,
    hero_title: document.getElementById('s-heroTitle').value,
    hero_subtitle: document.getElementById('s-heroSubtitle').value,
    announcement_text: document.getElementById('s-announcementText').value
  };
  if (heroImageUrl) payload.hero_image = heroImageUrl;
  const { data, error } = await sb.from('settings').update(payload).eq('id', 1).select().single();
  if (!error){ showToast('Settings saved'); SETTINGS = data; }
  else showToast('Save failed: ' + error.message);
});

/* ---------- Account / change password ---------- */
document.getElementById('password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const newPassword = document.getElementById('pw-new').value;
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (!error){ showToast('Password updated'); document.getElementById('password-form').reset(); }
  else showToast(error.message);
});

/* ---------- Init ---------- */
(async function init(){
  const session = await checkAuth();
  if (!session) return;
  resetProductForm();
  await Promise.all([loadProducts(), loadSettings()]);
})();
