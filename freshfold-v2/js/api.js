/* ================================================
   FreshFold — API Connector
   Connects all frontend pages to the Flask backend
   ================================================ */

// Change this to your PythonAnywhere URL when deployed
// Local:  http://localhost:5000
// Live:   https://yourusername.pythonanywhere.com
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : '';   // Empty string = same domain (works on PythonAnywhere)


// ── Generic fetch helper with retry/backoff ──
async function apiFetch(endpoint, options = {}) {
  const maxRetries = options.retries ?? 2;
  let attempt = 0;
  const url = API_BASE + endpoint;
  while (true) {
    try {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        ...options,
      });
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = text; }
      if (!res.ok) {
        if (res.status >= 500 && attempt < maxRetries) {
          attempt++;
          await new Promise(r => setTimeout(r, 300 * Math.pow(2, attempt)));
          continue;
        }
        throw new Error((data && data.error) || res.statusText || 'Request failed');
      }
      return data;
    } catch (err) {
      if (attempt < maxRetries) {
        attempt++;
        await new Promise(r => setTimeout(r, 300 * Math.pow(2, attempt)));
        continue;
      }
      throw err;
    }
  }
}


/* ================================================
   ORDER FORM  (order.html)
   ================================================ */
async function submitOrderToAPI() {
  const name        = document.getElementById('custName')?.value.trim();
  const phone       = document.getElementById('custPhone')?.value.trim();
  const addr        = document.getElementById('custAddr')?.value.trim();
  const area        = document.getElementById('custArea')?.value;
  const pickupTime  = document.getElementById('pickupTime')?.value;
  const notes       = document.getElementById('orderNotes')?.value.trim();
  const promoCode   = document.getElementById('promoCode')?.value.trim();

  if (!name || !phone || !addr || !area) {
    showAlert('Please fill in your name, phone, address and area.', 'error');
    return;
  }

  // Build items array from counters (defined in order.js)
  const itemsPayload = ITEMS_META
    .filter(item => (counts[item.key] || 0) > 0)
    .map(item => ({
      key:   item.key,
      label: item.label.replace(/[^\w\s]/g, '').trim(),
      count: counts[item.key],
      price: PRICES[serviceMode][item.key][delivMode === 'std' ? 'std' : 'exp'],
    }));

  if (itemsPayload.length === 0) {
    showAlert('Please add at least one item.', 'error');
    return;
  }

  const btn = document.querySelector('.submit-btn');
  if (btn) { btn.textContent = '⏳ Placing order...'; btn.disabled = true; }

  try {
    const result = await apiFetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        name, phone, address: addr, area,
        service:     serviceMode,
        delivery:    delivMode,
        items:       itemsPayload,
        notes,
        pickup_time: pickupTime,
        promo_code:  promoCode,
      }),
    });

    // Show success
    const msg = document.getElementById('orderSuccess');
    if (msg) {
      msg.textContent = `✅ Order ${result.order_id} placed! Total: Rs. ${result.total.toFixed(0)}. We'll confirm via WhatsApp shortly.`;
      msg.style.display = 'block';
    }

    // Also open WhatsApp as backup
    const waText = `Hi FreshFold! My order ${result.order_id} is confirmed. Please verify pickup time. Name: ${name}, Phone: ${phone}`;
    window.open(`https://wa.me/923333333333?text=${encodeURIComponent(waText)}`, '_blank');

    localStorage.removeItem('appliedPromo');

  } catch (err) {
    showAlert('Failed to place order: ' + err.message, 'error');
  } finally {
    if (btn) { btn.textContent = '💬 Confirm Order via WhatsApp 📱'; btn.disabled = false; }
  }
}


/* ================================================
   ORDER TRACKER  (track.html)
   ================================================ */
const TRACK_STEPS = [
  'Order Placed',
  'Pickup Scheduled',
  'Picked Up',
  'Being Processed',
  'Out for Delivery',
  'Delivered',
];
const STATUS_INDEX = {
  'pending':            0,
  'pickup_scheduled':   1,
  'picked_up':          2,
  'processing':         3,
  'out_for_delivery':   4,
  'delivered':          5,
};

async function trackOrderAPI() {
  const id     = document.getElementById('trackId')?.value.trim().toUpperCase();
  const result = document.getElementById('trackerResult');
  if (!id || !result) return;

  result.innerHTML = '<p style="text-align:center;color:var(--muted);padding:1rem;">🔍 Searching...</p>';
  result.classList.add('show');

  try {
    const order     = await apiFetch(`/api/orders/${id}`);
    const stepIndex = STATUS_INDEX[order.status] ?? 0;

    const stepsHTML = TRACK_STEPS.map((step, i) => {
      const cls  = i < stepIndex ? 'done' : i === stepIndex ? 'active' : '';
      const icon = i < stepIndex ? '✓' : i === stepIndex ? '●' : '';
      return `<div class="ts-item ${cls}">
        <div class="ts-indicator">
          <div class="ts-dot">${icon}</div>
          ${i < TRACK_STEPS.length - 1 ? '<div class="ts-line"></div>' : ''}
        </div>
        <div class="ts-content">
          <h4>${step}</h4>
          <p>${i === stepIndex ? 'In progress...' : i < stepIndex ? 'Completed' : 'Pending'}</p>
        </div>
      </div>`;
    }).join('');

    result.innerHTML = `
      <div class="track-order-info">
        <div class="toi-row"><span class="toi-label">Order ID</span><span class="toi-val">${order.order_id}</span></div>
        <div class="toi-row"><span class="toi-label">Customer</span><span class="toi-val">${order.name}</span></div>
        <div class="toi-row"><span class="toi-label">Service</span><span class="toi-val">${order.service === 'wash' ? 'Wash + Iron' : 'Ironing'} · ${order.delivery === 'exp' ? 'Express' : 'Standard'}</span></div>
        <div class="toi-row"><span class="toi-label">Total</span><span class="toi-val" style="color:var(--green-light)">Rs. ${order.total.toFixed(0)}</span></div>
        <div class="toi-row"><span class="toi-label">Placed</span><span class="toi-val">${order.created_at}</span></div>
      </div>
      <div class="track-steps">${stepsHTML}</div>`;
  } catch (err) {
    result.innerHTML = `<p style="color:#f87171;text-align:center;padding:1rem;">❌ Error: ${err.message}. Try: FF-1001</p>`;
  }
}


/* ================================================
   BLOG  (blog.html + blog-post.html)
   ================================================ */
async function loadBlogFromAPI() {
  const container = document.getElementById('blogGrid');
  if (!container) return;
  container.innerHTML = '<p style="text-align:center;color:var(--muted);padding:3rem;">Loading posts...</p>';

  try {
    const posts = await apiFetch('/api/blog');
    if (posts.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--muted);padding:3rem;">No posts yet.</p>';
      return;
    }
    container.innerHTML = posts.map(p => `
      <div class="blog-card anim" onclick="window.location='blog-post.html?id=${p.post_id}'">
        <div class="blog-thumb">${p.title ? p.title.charAt(0) : ''}</div>
        <div class="blog-body">
          <div class="blog-meta">
            <span class="blog-cat">${p.category}</span>
            <span class="blog-date">${p.date} · ${p.read_time}</span>
          </div>
          <h3 class="blog-title">${p.title}</h3>
          <p class="blog-excerpt">${p.excerpt}</p>
          <div style="margin-top:1rem;display:flex;align-items:center;gap:.6rem;">
            <div style="width:28px;height:28px;border-radius:50%;background:var(--green-faint);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:.75rem;">${p.author ? p.author.charAt(0) : 'F'}</div>
            <span style="color:var(--muted);font-size:.78rem;">${p.author}</span>
          </div>
        </div>
      </div>`).join('');

    document.querySelectorAll('.blog-card.anim').forEach(el => {
      const obs = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
      }, { threshold: 0.1 });
      obs.observe(el);
    });
  } catch (err) {
    container.innerHTML = `<p style="text-align:center;color:#f87171;padding:2rem;">Failed to load posts: ${err.message}</p>`;
  }
}

async function loadBlogPostFromAPI() {
  const id        = new URLSearchParams(window.location.search).get('id');
  const container = document.getElementById('postContent');
  if (!container || !id) return;

  try {
    const post = await apiFetch(`/api/blog/${id}`);
    document.title = post.title + ' — FreshFold Blog';
    container.innerHTML = `
      <div class="blog-post-header">
        <div style="font-size:4rem;margin-bottom:1rem;">${post.title ? post.title.charAt(0) : ''}</div>
        <div class="blog-post-meta">
          <span class="badge badge-green">${post.category}</span>
          <span style="color:var(--muted);font-size:.8rem;">${post.date}</span>
          <span style="color:var(--muted);font-size:.8rem;">· ${post.read_time}</span>
        </div>
        <h1>${post.title}</h1>
        <div style="display:flex;align-items:center;gap:.8rem;margin-top:1rem;">
          <div style="width:36px;height:36px;border-radius:50%;background:var(--green-faint);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;">${post.author ? post.author.charAt(0) : 'F'}</div>
          <div><strong style="color:#fff;font-size:.88rem;">${post.author}</strong><br><span style="color:var(--muted);font-size:.75rem;">FreshFold Team</span></div>
        </div>
      </div>
      <div class="blog-post-content">${post.content}</div>
      <div style="margin-top:3rem;padding-top:2rem;border-top:1px solid var(--border);">
        <a href="blog.html" style="color:var(--green-light);font-size:.88rem;">← Back to Blog</a>
      </div>`;
  } catch (err) {
    container.innerHTML = `<p style="color:#f87171;padding:2rem;">Post not found or unavailable.</p>`;
  }
}


/* ================================================
   REVIEWS  (reviews.html)
   ================================================ */
async function loadReviewsFromAPI() {
  const container = document.getElementById('dynamicReviews');
  if (!container) return;

  try {
    const reviews = await apiFetch('/api/reviews');
    if (reviews.length === 0) return;
    container.innerHTML = reviews.map(r => `
      <div class="review-card anim">
        <div class="rc-stars">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</div>
        <p class="rc-text">"${r.text}"</p>
        <div class="rc-author">
          <div class="rc-avatar">${r.name ? r.name.charAt(0) : 'U'}</div>
          <div class="rc-name"><strong>${r.name}</strong><span>${r.date}</span></div>
        </div>
      </div>`).join('');

    container.querySelectorAll('.anim').forEach(el => {
      const obs = new IntersectionObserver(e => e.forEach(ev => { if (ev.isIntersecting) ev.target.classList.add('visible'); }), { threshold: 0.1 });
      obs.observe(el);
    });
  } catch (err) {
    console.error('Reviews load failed:', err);
  }
}

async function submitReviewToAPI() {
  const name  = document.getElementById('reviewName')?.value.trim();
  const text  = document.getElementById('reviewText')?.value.trim();
  const stars = document.querySelectorAll('.star-select span.lit').length;

  if (!name || !text || stars === 0) {
    showAlert('Please fill in all fields and select a star rating.', 'error');
    return;
  }

  try {
    await apiFetch('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ name, text, stars }),
    });
    showAlert('Thanks! Your review is pending approval.', 'success');
    document.getElementById('reviewName').value = '';
    document.getElementById('reviewText').value = '';
    document.querySelectorAll('.star-select span').forEach(s => {
      s.classList.remove('lit');
      delete s.dataset.selected;
    });
  } catch (err) {
    showAlert('Failed to submit review: ' + err.message, 'error');
  }
}


/* ================================================
   PROMO CODE VALIDATION  (index.html + order.html)
   ================================================ */
async function applyPromoFromAPI() {
  const input  = document.getElementById('promoCode');
  const result = document.getElementById('promoResult');
  if (!input || !result) return;

  const code = input.value.trim().toUpperCase();
  if (!code) {
    result.textContent = 'Please enter a code.';
    result.className   = 'promo-result error';
    return;
  }

  try {
    const data = await apiFetch('/api/promos/validate', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    result.textContent = data.message;
    result.className   = 'promo-result success';
    localStorage.setItem('appliedPromo', JSON.stringify(data));
    if (typeof updateSummary === 'function') updateSummary();
  } catch (err) {
    result.textContent = 'Error: ' + err.message;
    result.className   = 'promo-result error';
    localStorage.removeItem('appliedPromo');
  }
}


/* ================================================
   UTILITY
   ================================================ */
function showAlert(message, type = 'success') {
  const existing = document.querySelector('.ff-alert');
  if (existing) existing.remove();

  const div = document.createElement('div');
  div.className = 'ff-alert';
  div.textContent = message;
  div.style.cssText = `
    position:fixed;top:80px;left:50%;transform:translateX(-50%);
    background:${type === 'error' ? '#ef4444' : 'var(--green)'};
    color:#fff;padding:.8rem 1.6rem;border-radius:10px;
    font-weight:600;font-size:.9rem;z-index:9999;
    box-shadow:0 8px 24px rgba(0,0,0,.3);
    animation:fadeUp .3s ease forwards;
  `;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}

// Override old localStorage functions with API versions
window.applyPromo   = applyPromoFromAPI;
window.submitReview = submitReviewToAPI;
window.trackOrder   = trackOrderAPI;

// Auto-init on page load
document.addEventListener('DOMContentLoaded', () => {
  loadBlogFromAPI();
  loadBlogPostFromAPI();
  loadReviewsFromAPI();
});
