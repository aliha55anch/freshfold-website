// ── PRICING ENGINE ──
const PRICES = {
  ironing: {
    shirt:      { std: 80,  exp: 130 },
    pants:      { std: 110, exp: 160 },
    fullOutfit: { std: 250, exp: 350 },
    shalwar:    { std: 150, exp: 220 },
    dupatta:    { std: 60,  exp: 100 },
    suit:       { std: 280, exp: 400 },
  },
  wash: {
    shirt:      { std: 150, exp: 220 },
    pants:      { std: 180, exp: 250 },
    fullOutfit: { std: 400, exp: 550 },
    shalwar:    { std: 250, exp: 350 },
    dupatta:    { std: 100, exp: 150 },
    suit:       { std: 500, exp: 700 },
  }
};

const ITEMS_META = [
  { key: 'shirt',      label: '👔 Shirt (Formal / Casual)',  emoji: '👔' },
  { key: 'pants',      label: '👖 Pants / Trousers',          emoji: '👖' },
  { key: 'shalwar',    label: '👗 Shalwar Kameez (Set)',      emoji: '👗' },
  { key: 'suit',       label: '🧥 Suit / Sherwani',           emoji: '🧥' },
  { key: 'fullOutfit', label: '👔 Full Outfit (Shirt+Pants)',  emoji: '🎽' },
  { key: 'dupatta',    label: '🧣 Dupatta / Scarf',            emoji: '🧣' },
];

let serviceMode = 'ironing'; // 'ironing' or 'wash'
let delivMode   = 'std';     // 'std' or 'exp'
let counts = {};
ITEMS_META.forEach(i => counts[i.key] = 0);

function buildItemRows() {
  const container = document.getElementById('itemRows');
  if (!container) return;
  container.innerHTML = ITEMS_META.map((item, idx) => {
    const p = PRICES[serviceMode][item.key];
    const price = delivMode === 'std' ? p.std : p.exp;
    return `<div class="item-row" id="row-${item.key}">
      <div class="item-info">
        <div class="item-name">${item.label}</div>
        <div class="item-price">Rs. ${price} / item</div>
      </div>
      <div class="counter-wrap">
        <button class="c-btn" onclick="changeCount('${item.key}',-1)">−</button>
        <span class="c-val" id="cnt-${item.key}">0</span>
        <button class="c-btn" onclick="changeCount('${item.key}',1)">+</button>
      </div>
    </div>`;
  }).join('');
}

function changeCount(key, delta) {
  counts[key] = Math.max(0, (counts[key] || 0) + delta);
  document.getElementById(`cnt-${key}`).textContent = counts[key];
  updateSummary();
}

function setService(mode) {
  serviceMode = mode;
  document.querySelectorAll('.st-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  buildItemRows();
  updateSummary();
}

function setDeliv(mode) {
  delivMode = mode;
  document.querySelectorAll('.dt-btn').forEach(b => b.classList.toggle('active', b.dataset.deliv === mode));
  buildItemRows();
  updateSummary();
}

function updateSummary() {
  let subtotal = 0;
  let itemCount = 0;
  ITEMS_META.forEach(item => {
    const c = counts[item.key] || 0;
    if (c > 0) {
      const p = PRICES[serviceMode][item.key];
      subtotal += c * (delivMode === 'std' ? p.std : p.exp);
      itemCount += c;
    }
  });

  // Bulk discount
  let discount = 0;
  if (itemCount >= 20) discount = Math.round(subtotal * 0.15);
  else if (itemCount >= 10) discount = Math.round(subtotal * 0.10);

  // Promo code discount
  let promoDiscount = 0;
  const applied = JSON.parse(localStorage.getItem('appliedPromo') || 'null');
  if (applied) {
    if (applied.discount <= 100) promoDiscount = Math.round(subtotal * applied.discount / 100);
    else promoDiscount = applied.discount;
  }

  const total = Math.max(0, subtotal - discount - promoDiscount);
  const eta = delivMode === 'std' ? '24 hours' : '12 hours (Express)';

  document.getElementById('sumItems').textContent  = itemCount + ' item(s)';
  document.getElementById('sumSubtotal').textContent = 'Rs. ' + subtotal;
  document.getElementById('sumDiscount').textContent = discount > 0 ? '−Rs. ' + discount : '—';
  document.getElementById('sumPromo').textContent    = promoDiscount > 0 ? '−Rs. ' + promoDiscount : '—';
  document.getElementById('sumTotal').textContent   = 'Rs. ' + total;
  document.getElementById('sumEta').textContent     = eta;
}

function submitOrder() {
  const name   = document.getElementById('custName')?.value.trim();
  const phone  = document.getElementById('custPhone')?.value.trim();
  const addr   = document.getElementById('custAddr')?.value.trim();
  const area   = document.getElementById('custArea')?.value;
  const time   = document.getElementById('pickupTime')?.value;
  const notes  = document.getElementById('orderNotes')?.value.trim();

  if (!name || !phone || !addr || !area) {
    alert('Please fill in your name, phone, address and area.'); return;
  }

  const itemLines = ITEMS_META.filter(i => counts[i.key] > 0)
    .map(i => `  • ${i.label.replace(/[^\w\s]/g,'').trim()}: ${counts[i.key]}x`).join('\n');

  if (!itemLines) { alert('Please add at least one item.'); return; }

  const totalEl = document.getElementById('sumTotal')?.textContent || '';
  const svc = serviceMode === 'wash' ? 'Wash + Iron' : 'Ironing Only';
  const dlv = delivMode === 'exp' ? 'Express (12hr)' : 'Standard (24hr)';
  const applied = JSON.parse(localStorage.getItem('appliedPromo') || 'null');

  const msg = `Hello FreshFold! 🧺 New Order:\n\n👤 Name: ${name}\n📱 Phone: ${phone}\n📍 Address: ${addr}\n🗺️ Area: ${area}\n🕐 Pickup: ${time || 'Flexible'}\n\n🧺 Items:\n${itemLines}\n\n🔧 Service: ${svc}\n⚡ Delivery: ${dlv}${applied ? `\n🎟️ Promo: ${applied.code}` : ''}\n💰 Total: ${totalEl}${notes ? `\n📝 Notes: ${notes}` : ''}\n\nPlease confirm. Thank you!`;

  window.open(`https://wa.me/923333333333?text=${encodeURIComponent(msg)}`, '_blank');
  document.getElementById('orderSuccess').style.display = 'block';
  localStorage.removeItem('appliedPromo');
}

document.addEventListener('DOMContentLoaded', () => {
  buildItemRows();
  updateSummary();
});
