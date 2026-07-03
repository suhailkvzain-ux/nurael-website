/* ==========================================================================
   Nurael Abaya — Shared illustration & static content data
   Product data now lives in the database and is loaded via products-loader.js
   ========================================================================== */

/* ---------- Illustrated silhouette artwork (used as image fallback) ---------- */
const SILHOUETTES = {
  open: `<svg viewBox="0 0 200 260" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="100" cy="34" rx="26" ry="30" stroke="currentColor" stroke-width="2"/>
    <path d="M74 46C60 56 55 70 55 92V240" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M126 46C140 56 145 70 145 92V240" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M80 58C58 78 46 108 44 150C42 185 44 215 50 240" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M120 58C142 78 154 108 156 150C158 185 156 215 150 240" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M100 62V236" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2 5"/>
    <path d="M70 96C80 108 120 108 130 96" stroke="currentColor" stroke-width="1.4"/>
    <path d="M60 150C82 158 118 158 140 150" stroke="currentColor" stroke-width="1.2" opacity=".6"/>
    <path d="M55 190C80 198 120 198 145 190" stroke="currentColor" stroke-width="1.2" opacity=".6"/>
  </svg>`,
  closed: `<svg viewBox="0 0 200 260" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="100" cy="34" rx="25" ry="29" stroke="currentColor" stroke-width="2"/>
    <path d="M76 44C64 52 58 64 58 82L48 240" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M124 44C136 52 142 64 142 82L152 240" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M78 50C64 92 62 160 66 240" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M122 50C136 92 138 160 134 240" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M100 58V240" stroke="currentColor" stroke-width="1.2" stroke-dasharray="1 6" opacity=".7"/>
    <path d="M84 110H116" stroke="currentColor" stroke-width="1.2" opacity=".5"/>
    <path d="M78 150H122" stroke="currentColor" stroke-width="1.2" opacity=".5"/>
  </svg>`,
  belted: `<svg viewBox="0 0 200 260" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="100" cy="34" rx="25" ry="29" stroke="currentColor" stroke-width="2"/>
    <path d="M76 44C62 54 55 68 54 88V240" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M124 44C138 54 145 68 146 88V240" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M82 56C64 84 56 112 58 150C60 185 56 214 52 240" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M118 56C136 84 144 112 142 150C140 185 144 214 148 240" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <rect x="72" y="128" width="56" height="14" rx="3" stroke="currentColor" stroke-width="1.6"/>
    <path d="M100 142V240" stroke="currentColor" stroke-width="1.2" stroke-dasharray="1 6" opacity=".6"/>
  </svg>`,
  kaftan: `<svg viewBox="0 0 200 260" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="100" cy="34" rx="25" ry="29" stroke="currentColor" stroke-width="2"/>
    <path d="M70 46C48 54 38 64 34 78C46 88 60 84 70 74" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M130 46C152 54 162 64 166 78C154 88 140 84 130 74" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M78 52C58 90 50 150 54 240" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M122 52C142 90 150 150 146 240" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M62 100C82 112 118 112 138 100" stroke="currentColor" stroke-width="1.2" opacity=".6"/>
    <path d="M58 170C82 180 118 180 142 170" stroke="currentColor" stroke-width="1.2" opacity=".6"/>
  </svg>`,
  hijab: `<svg viewBox="0 0 200 260" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M100 26C82 26 70 40 70 58C70 62 71 66 72 70C56 78 46 96 44 120C60 128 76 122 82 108" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M100 26C118 26 130 40 130 58C130 62 129 66 128 70C144 78 154 96 156 120C140 128 124 122 118 108" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="100" cy="70" rx="22" ry="26" stroke="currentColor" stroke-width="2"/>
    <path d="M60 130C56 170 58 210 66 240" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M140 130C144 170 142 210 134 240" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M70 240C82 244 118 244 130 240" stroke="currentColor" stroke-width="1.6"/>
  </svg>`,
  bag: `<svg viewBox="0 0 200 260" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M64 100C64 74 80 58 100 58C120 58 136 74 136 100" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <rect x="46" y="100" width="108" height="120" rx="8" stroke="currentColor" stroke-width="2"/>
    <path d="M46 140H154" stroke="currentColor" stroke-width="1.2" opacity=".5"/>
    <circle cx="100" cy="164" r="8" stroke="currentColor" stroke-width="1.6"/>
  </svg>`,
  pin: `<svg viewBox="0 0 200 260" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="90" r="34" stroke="currentColor" stroke-width="2"/>
    <circle cx="100" cy="90" r="14" stroke="currentColor" stroke-width="1.6"/>
    <path d="M100 124V210" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M84 200L100 220L116 200" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
};

function silhouette(variant){ return SILHOUETTES[variant] || SILHOUETTES.closed; }

/* ---------- Countries for the localization / shipping-country picker ---------- */
const COUNTRIES = [
  { code: "US", name: "United States" }, { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" }, { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" }, { code: "KW", name: "Kuwait" },
  { code: "QA", name: "Qatar" }, { code: "BH", name: "Bahrain" },
  { code: "OM", name: "Oman" }, { code: "EG", name: "Egypt" },
  { code: "JO", name: "Jordan" }, { code: "LB", name: "Lebanon" },
  { code: "IQ", name: "Iraq" }, { code: "MA", name: "Morocco" },
  { code: "TN", name: "Tunisia" }, { code: "DZ", name: "Algeria" },
  { code: "TR", name: "Turkey" }, { code: "PK", name: "Pakistan" },
  { code: "IN", name: "India" }, { code: "BD", name: "Bangladesh" },
  { code: "MY", name: "Malaysia" }, { code: "ID", name: "Indonesia" },
  { code: "SG", name: "Singapore" }, { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" }, { code: "FR", name: "France" },
  { code: "DE", name: "Germany" }, { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" }, { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" }, { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" }, { code: "DK", name: "Denmark" },
  { code: "IE", name: "Ireland" }, { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" }, { code: "PT", name: "Portugal" },
  { code: "PL", name: "Poland" }, { code: "GR", name: "Greece" },
  { code: "ZA", name: "South Africa" }, { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" }, { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" }, { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" }, { code: "CN", name: "China" },
  { code: "HK", name: "Hong Kong" }
];

/* ---------- Reviews (product detail page) ---------- */
const REVIEWS = [
  { name: "Amina R.", initial: "A", date: "18 Jun 2026", rating: 5, quote: "Nurael's dedication to fine fabric and quiet detail resonates strongly — this abaya moves beautifully and the fit is exactly true to size. It's become the piece I reach for most." },
  { name: "Yasmin T.", initial: "Y", date: "9 Jun 2026", rating: 5, quote: "Ordered a size up as recommended and it was exactly right. The fabric has real weight to it without feeling heavy — you can tell this isn't fast fashion." },
  { name: "Dina H.", initial: "D", date: "27 May 2026", rating: 4, quote: "Beautiful piece, arrived quickly and beautifully packaged. Only reason it's not five stars is I wish there were a couple more colourways to choose from." }
];

/* ---------- Testimonials ---------- */
const TESTIMONIALS = [
  { name: "Amina R.", role: "Verified Buyer", initial: "A", quote: "The tailoring is unlike anything I've bought before. Nurael understands drape, weight, and how an abaya should actually move." },
  { name: "Sofia K.", role: "Verified Buyer", initial: "S", quote: "I get compliments every time I wear the Noor abaya. The embroidery detail feels genuinely luxury, not costume-like." },
  { name: "Hana M.", role: "Verified Buyer", initial: "H", quote: "Finally a brand that treats modest fashion as fashion. Fast shipping, beautiful packaging, true-to-size fit." }
];

/* ---------- FAQs ---------- */
const FAQS = {
  Orders: [
    { q: "How do I know which size to order?", a: "Each product page includes a detailed size guide with body measurements. If you're between sizes, we generally recommend sizing up for a more relaxed drape." },
    { q: "Can I change or cancel my order?", a: "Orders can be changed or cancelled within 2 hours of purchase. Contact our support team as soon as possible and we'll do our best to accommodate." },
    { q: "Do you offer gift wrapping?", a: "Yes — every order can be gift wrapped in our signature ivory and gold packaging at checkout, free of charge." }
  ],
  Shipping: [
    { q: "How long does delivery take?", a: "Standard delivery takes 3–5 working days domestically and 7–12 working days internationally. Express options are available at checkout." },
    { q: "Do you ship internationally?", a: "Yes, we ship to over 40 countries. Duties and taxes are calculated at checkout so there are no surprises on delivery." },
    { q: "How can I track my order?", a: "A tracking link is emailed as soon as your order ships. You can also check order status any time from your account." }
  ],
  Returns: [
    { q: "What is your return policy?", a: "We accept returns within 14 days of delivery for unworn items with tags attached. Occasion pieces marked 'Final Sale' are not eligible." },
    { q: "How do I start a return?", a: "Visit the Returns Portal linked in your confirmation email, or contact support with your order number and we'll guide you through it." },
    { q: "Do you offer exchanges?", a: "Yes, size and colour exchanges are free within 14 days, subject to stock availability." }
  ],
  Product: [
    { q: "What fabrics do you use?", a: "We work primarily with nida, crepe, linen-blends, chiffon and mulberry silk — each chosen for how it drapes and breathes for everyday, year-round wear." },
    { q: "How should I care for my abaya?", a: "Care instructions are listed on every product page and garment label. Most pieces are dry clean recommended; some everyday styles are machine washable on cold." },
    { q: "Are your pieces true to size?", a: "Our pieces are cut for a relaxed, flattering fit. Refer to the size guide on each product page for exact measurements." }
  ]
};
