/* ==========================================================================
   Nurael Admin Panel (Supabase-backed)
   ========================================================================== */

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let PRODUCTS = [];
let SETTINGS = {};
let editingProductId = null;
let TESTIMONIALS_ADMIN = [];
let FAQS_ADMIN = {};

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
    featured: !!row.featured, description: row.description || "", details: row.details || [],
    fabricNote: row.fabric_note || "", designNote: row.design_note || "", cutNote: row.cut_note || ""
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
    featured: payload.featured, description: payload.description, details: payload.details,
    fabric_note: payload.fabricNote, design_note: payload.designNote, cut_note: payload.cutNote
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
  const freeShipInput = document.getElementById('s-freeShippingThreshold');
  if (freeShipInput) freeShipInput.value = SETTINGS.free_shipping_threshold ?? 150;
  fillContentForm();
}

/* ---------- Shipping rates + collection points ---------- */
async function loadShipping(){
  const [{ data: rates, error: rErr }, { data: points, error: pErr }] = await Promise.all([
    sb.from('shipping_rates').select('*').order('country_name', { ascending: true }),
    sb.from('collection_points').select('*').order('sort_order', { ascending: true })
  ]);
  if (rErr) showToast('Failed to load shipping rates: ' + rErr.message);
  if (pErr) showToast('Failed to load collection points: ' + pErr.message);
  renderRatesTable(rates || []);
  renderPointsTable(points || []);
}

function renderRatesTable(rates){
  const tbody = document.getElementById('rates-table');
  if (!rates.length){
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No countries added yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = rates.map(r => `
    <tr>
      <td>${escapeHtml(r.country_code)}</td>
      <td>${escapeHtml(r.country_name)}</td>
      <td>$${Number(r.rate).toFixed(2)}</td>
      <td><button class="icon-link danger" onclick="deleteRate('${r.id}')">Delete</button></td>
    </tr>`).join('');
}

function renderPointsTable(points){
  const tbody = document.getElementById('points-table');
  if (!points.length){
    tbody.innerHTML = `<tr><td colspan="3" class="empty-state">No collection points yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = points.map(p => `
    <tr>
      <td>${escapeHtml(p.name)}</td>
      <td><span class="badge ${p.active ? 'in' : 'muted'}">${p.active ? 'Active' : 'Hidden'}</span></td>
      <td>
        <div class="row-actions">
          <button class="icon-link" onclick="togglePoint('${p.id}', ${!p.active})">${p.active ? 'Hide' : 'Show'}</button>
          <button class="icon-link danger" onclick="deletePoint('${p.id}')">Delete</button>
        </div>
      </td>
    </tr>`).join('');
}

document.getElementById('add-rate-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const country_code = document.getElementById('rate-country-code').value.trim().toUpperCase();
  const country_name = document.getElementById('rate-country-name').value.trim();
  const rate = parseFloat(document.getElementById('rate-amount').value) || 0;
  if (!country_code || !country_name){ showToast('Country code and name are required'); return; }
  const { error } = await sb.from('shipping_rates').upsert({ country_code, country_name, rate }, { onConflict: 'country_code' });
  if (error){ showToast('Save failed: ' + error.message); return; }
  document.getElementById('add-rate-form').reset();
  showToast('Shipping rate saved');
  await loadShipping();
});

async function deleteRate(id){
  if (!confirm('Remove this country\'s shipping rate?')) return;
  const { error } = await sb.from('shipping_rates').delete().eq('id', id);
  if (!error){ showToast('Rate removed'); await loadShipping(); }
  else showToast('Delete failed: ' + error.message);
}

document.getElementById('add-point-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('point-name').value.trim();
  if (!name){ return; }
  const { error } = await sb.from('collection_points').insert({ name });
  if (error){ showToast('Save failed: ' + error.message); return; }
  document.getElementById('add-point-form').reset();
  showToast('Collection point added');
  await loadShipping();
});

async function togglePoint(id, nextActive){
  const { error } = await sb.from('collection_points').update({ active: nextActive }).eq('id', id);
  if (!error){ await loadShipping(); }
  else showToast('Update failed: ' + error.message);
}

async function deletePoint(id){
  if (!confirm('Delete this collection point?')) return;
  const { error } = await sb.from('collection_points').delete().eq('id', id);
  if (!error){ showToast('Collection point deleted'); await loadShipping(); }
  else showToast('Delete failed: ' + error.message);
}

document.getElementById('free-shipping-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const free_shipping_threshold = parseFloat(document.getElementById('s-freeShippingThreshold').value) || 0;
  const { data, error } = await sb.from('settings').update({ free_shipping_threshold }).eq('id', 1).select().single();
  if (!error){ showToast('Threshold saved'); SETTINGS = data; }
  else showToast('Save failed: ' + error.message);
});

/* ---------- Content (footer/social, contact, testimonials, FAQs, About page) ---------- */
function fillContentForm(){
  document.getElementById('c-footerTagline').value = SETTINGS.footer_tagline || 'Premium abayas and modest wear, designed in fine fabrics and finished by hand. Modest fashion, made modern.';
  document.getElementById('c-instagram').value = SETTINGS.social_instagram || '';
  document.getElementById('c-pinterest').value = SETTINGS.social_pinterest || '';
  document.getElementById('c-tiktok').value = SETTINGS.social_tiktok || '';

  document.getElementById('c-email').value = SETTINGS.contact_email || 'support@nuraelabaya.com';
  document.getElementById('c-phone').value = SETTINGS.contact_phone || '+971 4 555 0148';
  document.getElementById('c-address').value = SETTINGS.contact_address || 'Al Quoz Industrial Area, Dubai, UAE';
  document.getElementById('c-hours').value = SETTINGS.contact_hours || 'Sun – Thu, 9am – 6pm GST';

  TESTIMONIALS_ADMIN = (SETTINGS.testimonials && SETTINGS.testimonials.length)
    ? SETTINGS.testimonials
    : (typeof TESTIMONIALS !== 'undefined' ? TESTIMONIALS.map(t => ({ name: t.name, role: t.role, quote: t.quote })) : []);
  renderTestimonialsTable();

  FAQS_ADMIN = (SETTINGS.faqs && Object.keys(SETTINGS.faqs).length)
    ? SETTINGS.faqs
    : (typeof FAQS !== 'undefined' ? JSON.parse(JSON.stringify(FAQS)) : {});
  renderFaqsTable();

  const about = (SETTINGS.about_content && Object.keys(SETTINGS.about_content).length)
    ? SETTINGS.about_content
    : (typeof DEFAULT_ABOUT_CONTENT !== 'undefined' ? DEFAULT_ABOUT_CONTENT : {});
  fillAboutForm(about);
}

document.getElementById('footer-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    footer_tagline: document.getElementById('c-footerTagline').value,
    social_instagram: document.getElementById('c-instagram').value.trim(),
    social_pinterest: document.getElementById('c-pinterest').value.trim(),
    social_tiktok: document.getElementById('c-tiktok').value.trim()
  };
  const { data, error } = await sb.from('settings').update(payload).eq('id', 1).select().single();
  if (!error){ showToast('Footer & social links saved'); SETTINGS = data; }
  else showToast('Save failed: ' + error.message);
});

document.getElementById('contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    contact_email: document.getElementById('c-email').value.trim(),
    contact_phone: document.getElementById('c-phone').value.trim(),
    contact_address: document.getElementById('c-address').value.trim(),
    contact_hours: document.getElementById('c-hours').value.trim()
  };
  const { data, error } = await sb.from('settings').update(payload).eq('id', 1).select().single();
  if (!error){ showToast('Contact info saved'); SETTINGS = data; }
  else showToast('Save failed: ' + error.message);
});

/* ---- Testimonials ---- */
function renderTestimonialsTable(){
  const tbody = document.getElementById('testimonials-table');
  if (!TESTIMONIALS_ADMIN.length){
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No testimonials yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = TESTIMONIALS_ADMIN.map((t, i) => `
    <tr>
      <td>${escapeHtml(t.name)}</td>
      <td>${escapeHtml(t.role || '')}</td>
      <td style="max-width:340px">${escapeHtml(t.quote)}</td>
      <td>
        <div class="row-actions">
          <button class="icon-link" onclick="editTestimonial(${i})">Edit</button>
          <button class="icon-link danger" onclick="deleteTestimonialRow(${i})">Delete</button>
        </div>
      </td>
    </tr>`).join('');
}

async function saveTestimonials(){
  const { data, error } = await sb.from('settings').update({ testimonials: TESTIMONIALS_ADMIN }).eq('id', 1).select().single();
  if (error){ showToast('Save failed: ' + error.message); return; }
  SETTINGS = data;
}

document.getElementById('add-testimonial-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('t-name').value.trim();
  const role = document.getElementById('t-role').value.trim();
  const quote = document.getElementById('t-quote').value.trim();
  if (!name || !quote) return;
  const editIndex = document.getElementById('testimonial-edit-index').value;
  if (editIndex !== ''){
    TESTIMONIALS_ADMIN[Number(editIndex)] = { name, role, quote };
  } else {
    TESTIMONIALS_ADMIN.push({ name, role, quote });
  }
  await saveTestimonials();
  document.getElementById('add-testimonial-form').reset();
  document.getElementById('testimonial-edit-index').value = '';
  document.getElementById('testimonial-submit-btn').textContent = '+ Add';
  renderTestimonialsTable();
  showToast('Testimonial saved');
});

function editTestimonial(i){
  const t = TESTIMONIALS_ADMIN[i];
  document.getElementById('t-name').value = t.name;
  document.getElementById('t-role').value = t.role || '';
  document.getElementById('t-quote').value = t.quote;
  document.getElementById('testimonial-edit-index').value = i;
  document.getElementById('testimonial-submit-btn').textContent = 'Update';
  document.getElementById('view-content').scrollIntoView({ behavior: 'smooth' });
}

async function deleteTestimonialRow(i){
  if (!confirm('Delete this testimonial?')) return;
  TESTIMONIALS_ADMIN.splice(i, 1);
  await saveTestimonials();
  renderTestimonialsTable();
  showToast('Testimonial deleted');
}

/* ---- FAQs ---- */
function renderFaqsTable(){
  const tbody = document.getElementById('faqs-table');
  const rows = [];
  Object.keys(FAQS_ADMIN).forEach(cat => {
    (FAQS_ADMIN[cat] || []).forEach((item, i) => rows.push({ cat, i, item }));
  });
  if (!rows.length){
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No FAQs yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${escapeHtml(r.cat)}</td>
      <td style="max-width:260px">${escapeHtml(r.item.q)}</td>
      <td style="max-width:340px">${escapeHtml(r.item.a)}</td>
      <td>
        <div class="row-actions">
          <button class="icon-link" onclick="editFaq('${escapeHtml(r.cat)}', ${r.i})">Edit</button>
          <button class="icon-link danger" onclick="deleteFaqRow('${escapeHtml(r.cat)}', ${r.i})">Delete</button>
        </div>
      </td>
    </tr>`).join('');
}

async function saveFaqs(){
  const { data, error } = await sb.from('settings').update({ faqs: FAQS_ADMIN }).eq('id', 1).select().single();
  if (error){ showToast('Save failed: ' + error.message); return; }
  SETTINGS = data;
}

document.getElementById('add-faq-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const category = document.getElementById('faqf-category').value.trim();
  const q = document.getElementById('faqf-question').value.trim();
  const a = document.getElementById('faqf-answer').value.trim();
  if (!category || !q || !a) return;

  const editCategory = document.getElementById('faq-edit-category').value;
  const editIndex = document.getElementById('faq-edit-index').value;
  if (editCategory !== '' && editIndex !== ''){
    FAQS_ADMIN[editCategory].splice(Number(editIndex), 1);
    if (!FAQS_ADMIN[editCategory].length) delete FAQS_ADMIN[editCategory];
  }
  if (!FAQS_ADMIN[category]) FAQS_ADMIN[category] = [];
  FAQS_ADMIN[category].push({ q, a });

  await saveFaqs();
  document.getElementById('add-faq-form').reset();
  document.getElementById('faq-edit-category').value = '';
  document.getElementById('faq-edit-index').value = '';
  document.getElementById('faq-submit-btn').textContent = '+ Add';
  renderFaqsTable();
  showToast('FAQ saved');
});

function editFaq(cat, i){
  const item = FAQS_ADMIN[cat][i];
  document.getElementById('faqf-category').value = cat;
  document.getElementById('faqf-question').value = item.q;
  document.getElementById('faqf-answer').value = item.a;
  document.getElementById('faq-edit-category').value = cat;
  document.getElementById('faq-edit-index').value = i;
  document.getElementById('faq-submit-btn').textContent = 'Update';
  document.getElementById('view-content').scrollIntoView({ behavior: 'smooth' });
}

async function deleteFaqRow(cat, i){
  if (!confirm('Delete this FAQ?')) return;
  FAQS_ADMIN[cat].splice(i, 1);
  if (!FAQS_ADMIN[cat].length) delete FAQS_ADMIN[cat];
  await saveFaqs();
  renderFaqsTable();
  showToast('FAQ deleted');
}

/* ---- About page ---- */
function aboutValueRowHtml(title, text){
  return `<div class="form-grid value-row" style="align-items:flex-start">
    <div class="field"><label>Card title</label><input type="text" class="v-title" value="${escapeHtml(title || '')}"></div>
    <div class="field full"><label>Card text</label><textarea class="v-text">${escapeHtml(text || '')}</textarea></div>
    <button type="button" class="icon-link danger" onclick="this.closest('.value-row').remove()" style="align-self:center">Remove</button>
  </div>`;
}
function aboutTimelineRowHtml(year, text){
  return `<div class="form-grid timeline-row" style="align-items:flex-start">
    <div class="field"><label>Year</label><input type="text" class="tl-year" value="${escapeHtml(year || '')}" style="max-width:120px"></div>
    <div class="field full"><label>Milestone text</label><input type="text" class="tl-text" value="${escapeHtml(text || '')}"></div>
    <button type="button" class="icon-link danger" onclick="this.closest('.timeline-row').remove()" style="align-self:center">Remove</button>
  </div>`;
}

document.getElementById('add-value-row').addEventListener('click', () => {
  document.getElementById('about-values-rows').insertAdjacentHTML('beforeend', aboutValueRowHtml('', ''));
});
document.getElementById('add-timeline-row').addEventListener('click', () => {
  document.getElementById('about-timeline-rows').insertAdjacentHTML('beforeend', aboutTimelineRowHtml('', ''));
});

function fillAboutForm(c){
  document.getElementById('a-heroEyebrow').value = c.heroEyebrow || '';
  document.getElementById('a-heroTitle').value = c.heroTitle || '';
  document.getElementById('a-heroSubtitle').value = c.heroSubtitle || '';

  document.getElementById('a-storyEyebrow').value = c.storyEyebrow || '';
  document.getElementById('a-storyTitle').value = c.storyTitle || '';
  document.getElementById('a-storyText').value = c.storyText || '';

  document.getElementById('a-statYears').value = c.statYears || '';
  document.getElementById('a-statYearsLabel').value = c.statYearsLabel || '';
  document.getElementById('a-statCountries').value = c.statCountries || '';
  document.getElementById('a-statCountriesLabel').value = c.statCountriesLabel || '';
  document.getElementById('a-statCustomers').value = c.statCustomers || '';
  document.getElementById('a-statCustomersLabel').value = c.statCustomersLabel || '';

  document.getElementById('a-valuesEyebrow').value = c.valuesEyebrow || '';
  document.getElementById('a-valuesTitle').value = c.valuesTitle || '';
  document.getElementById('about-values-rows').innerHTML = (c.values || []).map(v => aboutValueRowHtml(v.title, v.text)).join('');

  document.getElementById('a-promiseEyebrow').value = c.promiseEyebrow || '';
  document.getElementById('a-promiseTitle').value = c.promiseTitle || '';
  document.getElementById('a-promiseText').value = c.promiseText || '';

  document.getElementById('a-timelineEyebrow').value = c.timelineEyebrow || '';
  document.getElementById('a-timelineTitle').value = c.timelineTitle || '';
  document.getElementById('about-timeline-rows').innerHTML = (c.timeline || []).map(t => aboutTimelineRowHtml(t.year, t.text)).join('');
}

document.getElementById('about-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const values = Array.from(document.querySelectorAll('#about-values-rows .value-row')).map(row => ({
    title: row.querySelector('.v-title').value.trim(),
    text: row.querySelector('.v-text').value.trim()
  })).filter(v => v.title || v.text);

  const timeline = Array.from(document.querySelectorAll('#about-timeline-rows .timeline-row')).map(row => ({
    year: row.querySelector('.tl-year').value.trim(),
    text: row.querySelector('.tl-text').value.trim()
  })).filter(t => t.year || t.text);

  const about_content = {
    heroEyebrow: document.getElementById('a-heroEyebrow').value.trim(),
    heroTitle: document.getElementById('a-heroTitle').value.trim(),
    heroSubtitle: document.getElementById('a-heroSubtitle').value.trim(),
    storyEyebrow: document.getElementById('a-storyEyebrow').value.trim(),
    storyTitle: document.getElementById('a-storyTitle').value.trim(),
    storyText: document.getElementById('a-storyText').value,
    statYears: document.getElementById('a-statYears').value.trim(),
    statYearsLabel: document.getElementById('a-statYearsLabel').value.trim(),
    statCountries: document.getElementById('a-statCountries').value.trim(),
    statCountriesLabel: document.getElementById('a-statCountriesLabel').value.trim(),
    statCustomers: document.getElementById('a-statCustomers').value.trim(),
    statCustomersLabel: document.getElementById('a-statCustomersLabel').value.trim(),
    valuesEyebrow: document.getElementById('a-valuesEyebrow').value.trim(),
    valuesTitle: document.getElementById('a-valuesTitle').value.trim(),
    values,
    promiseEyebrow: document.getElementById('a-promiseEyebrow').value.trim(),
    promiseTitle: document.getElementById('a-promiseTitle').value.trim(),
    promiseText: document.getElementById('a-promiseText').value,
    timelineEyebrow: document.getElementById('a-timelineEyebrow').value.trim(),
    timelineTitle: document.getElementById('a-timelineTitle').value.trim(),
    timeline
  };

  const { data, error } = await sb.from('settings').update({ about_content }).eq('id', 1).select().single();
  if (!error){ showToast('About page saved'); SETTINGS = data; }
  else showToast('Save failed: ' + error.message);
});

/* ---------- Influencers ---------- */
async function loadInfluencers(){
  const [{ data: influencers, error: iErr }, { data: orders, error: oErr }] = await Promise.all([
    sb.from('influencers').select('*').order('created_at', { ascending: false }),
    sb.from('orders').select('ref_code, subtotal, commission_amount, status')
  ]);
  if (iErr) showToast('Failed to load influencers: ' + iErr.message);
  if (oErr) showToast('Failed to load orders: ' + oErr.message);
  renderInfluencersTable(influencers || [], orders || []);
}

function renderInfluencersTable(influencers, orders){
  const tbody = document.getElementById('influencers-table');
  if (!influencers.length){
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state">No influencers added yet.</td></tr>`;
    return;
  }
  const link = (code) => `${window.location.origin}/shop.html?ref=${encodeURIComponent(code)}`;
  tbody.innerHTML = influencers.map(inf => {
    const theirOrders = orders.filter(o => (o.ref_code || '').toUpperCase() === (inf.code || '').toUpperCase());
    const orderCount = theirOrders.length;
    const totalSales = theirOrders.reduce((s, o) => s + (Number(o.subtotal) || 0), 0);
    const commissionOwed = theirOrders.reduce((s, o) => s + (Number(o.commission_amount) || 0), 0);
    const commissionLabel = inf.commission_type === 'flat'
      ? `AED ${Number(inf.commission_value).toFixed(2)} / order`
      : `${Number(inf.commission_value)}%`;
    return `
    <tr>
      <td><strong>${escapeHtml(inf.name)}</strong><br><span style="color:var(--grey);font-size:12px">${escapeHtml(inf.code)}</span></td>
      <td>
        <div class="row-actions">
          <input type="text" readonly value="${link(inf.code)}" style="width:200px;font-size:11px;padding:6px 8px;border:1px solid var(--line);border-radius:6px" onclick="this.select()">
          <button class="icon-link" onclick="copyInfluencerLink('${escapeHtml(inf.code)}')">Copy</button>
        </div>
      </td>
      <td>${commissionLabel}</td>
      <td>${orderCount}</td>
      <td>AED ${totalSales.toFixed(2)}</td>
      <td><strong>AED ${commissionOwed.toFixed(2)}</strong></td>
      <td><span class="badge ${inf.active ? 'in' : 'muted'}">${inf.active ? 'Active' : 'Paused'}</span></td>
      <td>
        <div class="row-actions">
          <button class="icon-link" onclick="toggleInfluencer('${inf.id}', ${!inf.active})">${inf.active ? 'Pause' : 'Activate'}</button>
          <button class="icon-link danger" onclick="deleteInfluencer('${inf.id}')">Delete</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function copyInfluencerLink(code){
  const link = `${window.location.origin}/shop.html?ref=${encodeURIComponent(code)}`;
  navigator.clipboard.writeText(link).then(
    () => showToast('Referral link copied'),
    () => showToast('Could not copy — select and copy the link manually')
  );
}

document.getElementById('add-influencer-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('inf-name').value.trim();
  const code = document.getElementById('inf-code').value.trim().toUpperCase();
  const commission_type = document.getElementById('inf-type').value;
  const commission_value = parseFloat(document.getElementById('inf-value').value) || 0;
  if (!name || !code){ showToast('Name and referral code are required'); return; }
  const { error } = await sb.from('influencers').upsert({ name, code, commission_type, commission_value, active: true }, { onConflict: 'code' });
  if (error){ showToast('Save failed: ' + error.message); return; }
  document.getElementById('add-influencer-form').reset();
  showToast('Influencer added');
  await loadInfluencers();
});

async function toggleInfluencer(id, nextActive){
  const { error } = await sb.from('influencers').update({ active: nextActive }).eq('id', id);
  if (!error){ await loadInfluencers(); }
  else showToast('Update failed: ' + error.message);
}

async function deleteInfluencer(id){
  if (!confirm('Delete this influencer? Their past orders will stay on record, but the referral link will stop working.')) return;
  const { error } = await sb.from('influencers').delete().eq('id', id);
  if (!error){ showToast('Influencer deleted'); await loadInfluencers(); }
  else showToast('Delete failed: ' + error.message);
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
  document.getElementById('f-fabricNote').value = '';
  document.getElementById('f-designNote').value = '';
  document.getElementById('f-cutNote').value = '';
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
  document.getElementById('f-fabricNote').value = p.fabricNote || '';
  document.getElementById('f-designNote').value = p.designNote || '';
  document.getElementById('f-cutNote').value = p.cutNote || '';

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
    fabricNote: document.getElementById('f-fabricNote').value.trim(),
    designNote: document.getElementById('f-designNote').value.trim(),
    cutNote: document.getElementById('f-cutNote').value.trim(),
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
  document.getElementById('logo-image-preview').innerHTML = SETTINGS.logo_image ? `<img src="${SETTINGS.logo_image}">` : 'No image';
}

let logoImageUrl = null;
document.getElementById('logo-image-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try{
    showToast('Uploading logo...');
    logoImageUrl = await uploadImage(file);
    document.getElementById('logo-image-preview').innerHTML = `<img src="${logoImageUrl}">`;
    showToast('Logo uploaded');
  } catch(err){ showToast(err.message); }
});

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
  if (logoImageUrl) payload.logo_image = logoImageUrl;
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
  await Promise.all([loadProducts(), loadSettings(), loadShipping(), loadInfluencers()]);
})();
