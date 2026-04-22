// ── MOBILE MENU ──
function toggleMenu() {
  const m = document.getElementById('mobileMenu');
  m.style.display = m.style.display === 'flex' ? 'none' : 'flex';
}
document.querySelectorAll('.mobile-menu a').forEach(a =>
  a.addEventListener('click', () => document.getElementById('mobileMenu').style.display = 'none')
);

// ── SCROLL ANIMATIONS ──
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.anim').forEach(el => observer.observe(el));

// ── PROMO CODES ──
const PROMO_CODES = {
  'FRESH20':  { discount: 20, label: '20% off your order!' },
  'STUDENT10': { discount: 10, label: '10% student discount!' },
  'FIRST50':  { discount: 50, label: 'Rs. 50 off first order!' },
  'BULK15':   { discount: 15, label: '15% bulk discount!' },
};

function applyPromo() {
  const code = document.getElementById('promoCode')?.value.trim().toUpperCase();
  const result = document.getElementById('promoResult');
  if (!result) return;
  if (!code) { result.textContent = 'Please enter a code.'; result.className = 'promo-result error'; return; }
  const promo = PROMO_CODES[code];
  if (promo) {
    result.textContent = `Code applied! ${promo.label}`;
    result.className = 'promo-result success';
    localStorage.setItem('appliedPromo', JSON.stringify({ code, ...promo }));
  } else {
    result.textContent = 'Invalid promo code. Try: FRESH20, STUDENT10, FIRST50';
    result.className = 'promo-result error';
  }
}

function useCode(code) {
  document.getElementById('promoCode').value = code;
  navigator.clipboard?.writeText(code).catch(()=>{});
  const r = document.getElementById('promoResult');
  r.textContent = code + ' ready — click Apply to use it';
  r.style.color = 'var(--green-light)';
  document.querySelector('.promo-split').scrollIntoView({behavior:'smooth',block:'center'});
}

// ── ORDER TRACKER ──
const SAMPLE_ORDERS = {
  'FF-1001': { name: 'Ali Hassan', items: '3 shirts, 2 pants', status: 2, placed: '9:00 AM', pickup: '11:00 AM', eta: '10:00 AM tomorrow' },
  'FF-1002': { name: 'Sara Ahmed', items: '1 full outfit', status: 3, placed: '8:00 AM', pickup: '10:00 AM', eta: '5:00 PM today' },
  'FF-1003': { name: 'Umar Khan', items: '4 shirts', status: 4, placed: 'Yesterday', pickup: 'Yesterday', eta: 'Delivered ✅' },
};
const TRACK_STEPS = ['Order Placed', 'Pickup Scheduled', 'Picked Up', 'Being Processed', 'Out for Delivery', 'Delivered'];

function trackOrder() {
  const id = document.getElementById('trackId')?.value.trim().toUpperCase();
  const result = document.getElementById('trackerResult');
  if (!result) return;
  if (!id) return;
  const order = SAMPLE_ORDERS[id];
  if (!order) {
    result.innerHTML = `<p style="color:#f87171;text-align:center;padding:1rem;">Order ID not found. Try: FF-1001, FF-1002, or FF-1003</p>`;
    result.classList.add('show');
    return;
  }
  const stepsHTML = TRACK_STEPS.map((step, i) => {
    const cls = i < order.status ? 'done' : i === order.status ? 'active' : '';
    const icon = i < order.status ? '✓' : i === order.status ? '●' : '';
    return `<div class="ts-item ${cls}">
      <div class="ts-indicator"><div class="ts-dot">${icon}</div>${i < TRACK_STEPS.length-1 ? '<div class="ts-line"></div>' : ''}</div>
      <div class="ts-content"><h4>${step}</h4><p>${i === order.status ? 'In progress...' : i < order.status ? 'Completed' : 'Pending'}</p></div>
    </div>`;
  }).join('');
  result.innerHTML = `
    <div class="track-order-info">
      <div class="toi-row"><span class="toi-label">Order ID</span><span class="toi-val">${id}</span></div>
      <div class="toi-row"><span class="toi-label">Customer</span><span class="toi-val">${order.name}</span></div>
      <div class="toi-row"><span class="toi-label">Items</span><span class="toi-val">${order.items}</span></div>
      <div class="toi-row"><span class="toi-label">Estimated Return</span><span class="toi-val" style="color:var(--green-light)">${order.eta}</span></div>
    </div>
    <div class="track-steps">${stepsHTML}</div>`;
  result.classList.add('show');
}

// ── STAR RATING ──
function initStars() {
  const stars = document.querySelectorAll('.star-select span');
  stars.forEach((star, i) => {
    star.addEventListener('mouseenter', () => stars.forEach((s, j) => s.classList.toggle('lit', j <= i)));
    star.addEventListener('click', () => { stars.forEach((s, j) => s.dataset.selected = j <= i); stars.forEach((s, j) => s.classList.toggle('selected', j <= i)); });
  });
  const container = document.querySelector('.star-select');
  if (container) container.addEventListener('mouseleave', () => {
    stars.forEach(s => { if (!s.dataset.selected) s.classList.remove('lit'); else s.classList.add('lit'); });
  });
}

// ── SUBMIT REVIEW ──
function submitReview() {
  const name = document.getElementById('reviewName')?.value.trim();
  const text = document.getElementById('reviewText')?.value.trim();
  const stars = document.querySelectorAll('.star-select span.lit').length;
  if (!name || !text || stars === 0) { alert('Please fill in all fields and select a rating.'); return; }
  const reviews = JSON.parse(localStorage.getItem('ff_reviews') || '[]');
  reviews.unshift({ name, text, stars, date: new Date().toLocaleDateString('en-PK') });
  localStorage.setItem('ff_reviews', JSON.stringify(reviews));
  document.getElementById('reviewName').value = '';
  document.getElementById('reviewText').value = '';
  document.querySelectorAll('.star-select span').forEach(s => { s.classList.remove('lit'); delete s.dataset.selected; });
  alert('Thank you for your review!');
  if (typeof loadReviewsFromAPI === 'function') {
  loadReviewsFromAPI();
} else {
  loadDynamicReviews(); // fallback to localStorage
}
}

function loadDynamicReviews() {
  const container = document.getElementById('dynamicReviews');
  if (!container) return;
  const reviews = JSON.parse(localStorage.getItem('ff_reviews') || '[]');
  if (reviews.length === 0) return;
  container.innerHTML = reviews.slice(0, 3).map(r => `
    <div class="review-card anim">
      <div class="rc-stars">${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}</div>
      <p class="rc-text">"${r.text}"</p>
      <div class="rc-author">
        <div class="rc-avatar">${r.name ? r.name.charAt(0) : 'U'}</div>
        <div class="rc-name"><strong>${r.name}</strong><span>${r.date}</span></div>
      </div>
    </div>`).join('');
  container.querySelectorAll('.anim').forEach(el => observer.observe(el));
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  initStars();
  if (typeof loadReviewsFromAPI === 'function') {
    loadReviewsFromAPI();
  } else {
    loadDynamicReviews();
  }
});

// Register service worker for caching (optional)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
   navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
