/* ================================================
   FreshFold Admin — API Panel JS
   Powers all admin pages with real backend data
   ================================================ */

const API = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : '';

async function api(endpoint, options = {}) {
  const res = await fetch(API + endpoint, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data;
}


/* ================================================
   AUTH  — Login / Logout
   ================================================ */
async function adminLogin() {
  const username = document.getElementById('loginUser')?.value.trim();
  const password = document.getElementById('loginPass')?.value.trim();
  const errEl    = document.getElementById('loginErr');

  try {
    await api('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    window.location.href = 'index.html';
  } catch (err) {
    if (errEl) { errEl.textContent = '❌ ' + err.message; errEl.style.display = 'block'; }
  }
}

async function adminLogout() {
  await api('/api/admin/logout', { method: 'POST' });
  window.location.href = 'login.html';
}

async function checkAuth() {
  try {
    const r = await api('/api/admin/check');
    if (!r.logged_in && !window.location.pathname.includes('login')) {
      window.location.href = 'login.html';
    }
  } catch {
    if (!window.location.pathname.includes('login')) {
      window.location.href = 'login.html';
    }
  }
}


/* ================================================
   DASHBOARD  (index.html)
   ================================================ */
async function loadDashboard() {
  try {
    const s = await api('/api/dashboard');

    // Stat cards
    setText('statMonthOrders',   s.month_orders);
    setText('statPending',       s.pending);
    setText('statRevenue',       'Rs. ' + formatNum(s.month_revenue));
    setText('statRating',        s.avg_rating + '★');

    // Recent orders table
    const orders = await api('/api/orders?limit=8');
    renderOrdersTable(orders, 'recentOrdersTable');
  } catch (err) {
    console.error('Dashboard load failed:', err);
  }
}

function renderOrdersTable(orders, tableId) {
  const tbody = document.getElementById(tableId);
  if (!tbody) return;

  const STATUS_LABELS = {
    pending:           { label: 'Pending',      cls: 'sb-pending' },
    pickup_scheduled:  { label: 'Pickup Soon',  cls: 'sb-progress' },
    picked_up:         { label: 'Picked Up',    cls: 'sb-progress' },
    processing:        { label: 'Processing',   cls: 'sb-progress' },
    out_for_delivery:  { label: 'Delivering',   cls: 'sb-done' },
    delivered:         { label: 'Delivered',    cls: 'sb-delivered' },
  };

  tbody.innerHTML = orders.map(o => {
    const s = STATUS_LABELS[o.status] || { label: o.status, cls: 'sb-pending' };
    const items = Array.isArray(o.items)
      ? o.items.filter(i => i.count > 0).map(i => `${i.count}× ${i.label}`).join(', ')
      : o.items;

    return `<tr>
      <td><strong style="color:#fff">${o.order_id}</strong></td>
      <td>${o.name}</td>
      <td style="color:var(--muted);font-size:.8rem;max-width:160px;">${items}</td>
      <td><span class="badge badge-green" style="font-size:.68rem;">${o.service === 'wash' ? 'Wash+Iron' : 'Ironing'}</span></td>
      <td style="color:var(--green-light);font-weight:700;">Rs. ${o.total.toFixed(0)}</td>
      <td style="color:var(--muted);font-size:.8rem;">${o.created_at}</td>
      <td><span class="status-badge ${s.cls}">${s.label}</span></td>
      <td>
        <select onchange="updateStatus(${o.id}, this.value)"
          style="background:var(--dark2);border:1px solid var(--border);border-radius:6px;color:#fff;font-size:.72rem;padding:.3rem .5rem;cursor:pointer;font-family:var(--font);">
          <option value="pending"           ${o.status==='pending'?'selected':''}>Pending</option>
          <option value="pickup_scheduled"  ${o.status==='pickup_scheduled'?'selected':''}>Pickup Scheduled</option>
          <option value="picked_up"         ${o.status==='picked_up'?'selected':''}>Picked Up</option>
          <option value="processing"        ${o.status==='processing'?'selected':''}>Processing</option>
          <option value="out_for_delivery"  ${o.status==='out_for_delivery'?'selected':''}>Out for Delivery</option>
          <option value="delivered"         ${o.status==='delivered'?'selected':''}>Delivered</option>
        </select>
      </td>
    </tr>`;
  }).join('');
}

async function updateStatus(id, newStatus) {
  try {
    await api(`/api/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus }),
    });
    showToast('✅ Status updated');
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}


/* ================================================
   ORDERS PAGE  (orders.html)
   ================================================ */
let allOrders = [];

async function loadOrders(filterStatus = '') {
  try {
    const url  = '/api/orders' + (filterStatus ? `?status=${filterStatus}` : '');
    allOrders  = await api(url);
    renderOrdersTable(allOrders, 'ordersTbody');
    updateOrderStats(allOrders);
  } catch (err) {
    console.error('Orders load failed:', err);
  }
}

function updateOrderStats(orders) {
  const pending    = orders.filter(o => o.status === 'pending').length;
  const processing = orders.filter(o => ['pickup_scheduled','picked_up','processing'].includes(o.status)).length;
  const delivered  = orders.filter(o => o.status === 'delivered').length;

  setText('statAllOrders', orders.length);
  setText('statPendingOrders', pending);
  setText('statProcessingOrders', processing);
  setText('statDelivered', delivered);
}

function filterOrders() {
  const status = document.getElementById('filterStatus')?.value || '';
  loadOrders(status);
}


/* ================================================
   BLOG ADMIN  (blog-admin.html)
   ================================================ */
let editingPostId = null;

async function loadAdminPosts() {
  try {
    const posts = await api('/api/blog');
    const tbody = document.getElementById('adminPostsList');
    if (!tbody) return;

    tbody.innerHTML = posts.map(p => `
      <tr>
        <td><strong style="color:#fff">${p.title.substring(0,55)}${p.title.length>55?'...':''}</strong></td>
        <td><span class="badge badge-green">${p.category}</span></td>
        <td style="color:var(--muted)">${p.author}</td>
        <td style="color:var(--muted)">${p.date}</td>
        <td><span class="status-badge ${p.published ? 'sb-done' : 'sb-pending'}">${p.published ? 'Published' : 'Draft'}</span></td>
        <td>
          <button onclick="editPost(${p.id})"
            style="background:var(--green-faint);color:var(--green-light);border:1px solid var(--border);border-radius:6px;padding:.3rem .7rem;cursor:pointer;font-size:.73rem;margin-right:.4rem;font-family:var(--font);">
            Edit
          </button>
          <button onclick="deletePost(${p.id})"
            style="background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.2);border-radius:6px;padding:.3rem .7rem;cursor:pointer;font-size:.73rem;font-family:var(--font);">
            Delete
          </button>
        </td>
      </tr>`).join('');
  } catch (err) {
    console.error('Posts load failed:', err);
  }
}

async function savePost() {
  const title    = document.getElementById('postTitle')?.value.trim();
  const content  = document.getElementById('postContent2')?.value.trim();
  const excerpt  = document.getElementById('postExcerpt')?.value.trim();
  const category = document.getElementById('postCategory')?.value;
  const author   = document.getElementById('postAuthor')?.value;
  const emoji    = document.getElementById('postEmoji')?.value.trim() || '📝';
  const published= document.getElementById('postPublished')?.checked ?? true;

  if (!title || !content) { showToast('Title and content are required', 'error'); return; }

  const payload = { title, content, excerpt, category, author, emoji, published };

  try {
    if (editingPostId) {
      await api(`/api/blog/${editingPostId}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('✅ Post updated!');
    } else {
      await api('/api/blog', { method: 'POST', body: JSON.stringify(payload) });
      showToast('✅ Post published!');
    }
    clearPostForm();
    loadAdminPosts();
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}

async function editPost(id) {
  try {
    // Find post from already-loaded data
    const posts = await api('/api/blog');
    const post  = posts.find(p => p.id === id);
    if (!post) return;

    editingPostId = id;
    setValue('postTitle',     post.title);
    setValue('postExcerpt',   post.excerpt);
    setValue('postContent2',  post.content.replace(/<[^>]+>/g, ''));
    setValue('postCategory',  post.category);
    setValue('postAuthor',    post.author);
    setValue('postEmoji',     post.emoji);
    const pub = document.getElementById('postPublished');
    if (pub) pub.checked = post.published;
    const title = document.getElementById('postFormTitle');
    if (title) title.textContent = 'Editing: ' + post.title.substring(0, 40);
    document.getElementById('postForm')?.scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}

async function deletePost(id) {
  if (!confirm('Delete this post permanently?')) return;
  try {
    await api(`/api/blog/${id}`, { method: 'DELETE' });
    showToast('✅ Post deleted');
    loadAdminPosts();
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}

function clearPostForm() {
  editingPostId = null;
  ['postTitle','postExcerpt','postContent2','postEmoji'].forEach(id => setValue(id, ''));
  setValue('postCategory', 'Tips');
  setValue('postEmoji', '📝');
  const pub = document.getElementById('postPublished'); if (pub) pub.checked = true;
  const title = document.getElementById('postFormTitle'); if (title) title.textContent = 'Write New Post';
}


/* ================================================
   PROMO CODES  (promos.html)
   ================================================ */
async function loadPromos() {
  try {
    const promos = await api('/api/promos');
    const tbody  = document.getElementById('promosList');
    if (!tbody) return;

    tbody.innerHTML = promos.map(p => `
      <tr>
        <td><strong style="color:var(--green-light);font-family:monospace;font-size:.9rem;">${p.code}</strong></td>
        <td>${p.discount}${p.is_percent ? '%' : ' Rs.'}</td>
        <td style="color:var(--muted)">${p.label || '—'}</td>
        <td style="color:var(--muted)">${p.uses}${p.max_uses > 0 ? ' / ' + p.max_uses : ' / ∞'}</td>
        <td><span class="status-badge ${p.active ? 'sb-done' : 'sb-pending'}">${p.active ? 'Active' : 'Inactive'}</span></td>
        <td>
          <button onclick="togglePromo(${p.id}, ${!p.active})"
            style="background:var(--green-faint);color:var(--green-light);border:1px solid var(--border);border-radius:6px;padding:.3rem .6rem;cursor:pointer;font-size:.72rem;margin-right:.3rem;font-family:var(--font);">
            ${p.active ? 'Disable' : 'Enable'}
          </button>
          <button onclick="deletePromo(${p.id})"
            style="background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.2);border-radius:6px;padding:.3rem .6rem;cursor:pointer;font-size:.72rem;font-family:var(--font);">
            Delete
          </button>
        </td>
      </tr>`).join('');
  } catch (err) {
    console.error('Promos load failed:', err);
  }
}

async function createPromo() {
  const code       = document.getElementById('newCode')?.value.trim().toUpperCase();
  const discount   = parseFloat(document.getElementById('newDiscount')?.value);
  const is_percent = document.getElementById('newIsPercent')?.value === 'true';
  const label      = document.getElementById('newLabel')?.value.trim();
  const max_uses   = parseInt(document.getElementById('newMaxUses')?.value || '0');

  if (!code || isNaN(discount)) { showToast('Code and discount required', 'error'); return; }

  try {
    await api('/api/promos', { method: 'POST', body: JSON.stringify({ code, discount, is_percent, label, max_uses }) });
    showToast('✅ Promo code created!');
    loadPromos();
    ['newCode','newDiscount','newLabel'].forEach(id => setValue(id, ''));
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}

async function togglePromo(id, active) {
  try {
    await api(`/api/promos/${id}`, { method: 'PUT', body: JSON.stringify({ active }) });
    showToast(`✅ Promo ${active ? 'enabled' : 'disabled'}`);
    loadPromos();
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}

async function deletePromo(id) {
  if (!confirm('Delete this promo code?')) return;
  try {
    await api(`/api/promos/${id}`, { method: 'DELETE' });
    showToast('✅ Promo deleted');
    loadPromos();
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}


/* ================================================
   REVIEWS ADMIN  (reviews-admin.html)
   ================================================ */
async function loadAdminReviews() {
  try {
    const reviews = await api('/api/reviews/all');
    const container = document.getElementById('adminReviewsList');
    if (!container) return;

    if (reviews.length === 0) {
      container.innerHTML = '<p style="color:var(--muted);padding:1rem;">No reviews yet.</p>';
      return;
    }

    container.innerHTML = `<table class="admin-table">
      <thead><tr><th>Name</th><th>Stars</th><th>Review</th><th>Date</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>${reviews.map(r => `<tr>
        <td><strong style="color:#fff">${r.name}</strong></td>
        <td style="color:var(--gold)">${'★'.repeat(r.stars)}</td>
        <td style="color:var(--muted);max-width:280px;font-size:.82rem;">${r.text.substring(0, 100)}${r.text.length > 100 ? '...' : ''}</td>
        <td style="color:var(--muted);font-size:.8rem;">${r.date}</td>
        <td><span class="status-badge ${r.approved ? 'sb-done' : 'sb-pending'}">${r.approved ? 'Approved' : 'Pending'}</span></td>
        <td>
          ${!r.approved ? `<button onclick="approveReview(${r.id}, true)"
            style="background:var(--green-faint);color:var(--green-light);border:1px solid var(--border);border-radius:6px;padding:.3rem .6rem;cursor:pointer;font-size:.72rem;margin-right:.3rem;font-family:var(--font);">
            Approve</button>` : ''}
          <button onclick="deleteReview(${r.id})"
            style="background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.2);border-radius:6px;padding:.3rem .6rem;cursor:pointer;font-size:.72rem;font-family:var(--font);">
            Delete</button>
        </td>
      </tr>`).join('')}</tbody>
    </table>`;
  } catch (err) {
    console.error('Reviews load failed:', err);
  }
}

async function approveReview(id, approved) {
  try {
    await api(`/api/reviews/${id}/approve`, { method: 'PUT', body: JSON.stringify({ approved }) });
    showToast('✅ Review approved — now visible on website');
    loadAdminReviews();
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}

async function deleteReview(id) {
  if (!confirm('Delete this review?')) return;
  try {
    await api(`/api/reviews/${id}`, { method: 'DELETE' });
    showToast('✅ Review deleted');
    loadAdminReviews();
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}


/* ================================================
   UTILITY
   ================================================ */
function setText(id, val) {
  const el = document.getElementById(id); if (el) el.textContent = val;
}
function setValue(id, val) {
  const el = document.getElementById(id); if (el) el.value = val;
}
function formatNum(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toFixed(0);
}

function showToast(message, type = 'success') {
  const t = document.createElement('div');
  t.textContent = message;
  t.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    background:${type === 'error' ? '#ef4444' : 'var(--green)'};
    color:#fff;padding:.75rem 1.4rem;border-radius:10px;
    font-weight:700;font-size:.88rem;font-family:var(--font);
    box-shadow:0 8px 24px rgba(0,0,0,.3);
    animation:fadeUp .3s ease forwards;
  `;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// Auto-initialize based on which page we're on
document.addEventListener('DOMContentLoaded', () => {
  const page = window.location.pathname.split('/').pop();
  checkAuth();

  if (page === 'index.html' || page === '') loadDashboard();
  if (page === 'orders.html')               loadOrders();
  if (page === 'blog-admin.html')           loadAdminPosts();
  if (page === 'promos.html')               loadPromos();
  if (page === 'reviews-admin.html')        loadAdminReviews();
});
