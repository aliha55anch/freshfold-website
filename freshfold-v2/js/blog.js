// ── BLOG ENGINE ──
const DEFAULT_POSTS = [
  {
    id: 'post-1',
    title: '5 Reasons Why Your Clothes Look Unprofessional (And How to Fix It)',
    excerpt: 'First impressions matter. Wrinkled clothes can cost you opportunities before you even speak. Here\'s what\'s going wrong and how FreshFold fixes it.',
    content: `<h2>The Problem With Wrinkled Clothes</h2><p>Whether you're heading to a university presentation or a job interview, your appearance signals effort and attention to detail. Wrinkled clothes unconsciously communicate carelessness — even if you're the most prepared person in the room.</p><h2>1. You're Washing at the Wrong Temperature</h2><p>Different fabrics respond to heat differently. Cotton can handle higher temperatures, while synthetics warp easily. Always read the label — or better yet, let professionals handle it.</p><h2>2. You're Leaving Clothes in the Dryer Too Long</h2><p>Leaving clothes to sit after a wash cycle is one of the most common causes of deep-set wrinkles. Remove them immediately and hang or fold while still warm.</p><h2>3. You Don't Have Time</h2><p>For most students and working professionals, this is the real answer. You simply don't have 45 minutes to stand at an ironing board every morning. That's exactly why FreshFold exists — we handle it so you don't have to.</p><h2>4. Wrong Ironing Technique</h2><p>Ironing in circles pushes wrinkles around rather than removing them. The right technique is straight strokes along the grain of the fabric, with the correct steam level for each material.</p><h2>5. Storage Issues</h2><p>Tightly packed wardrobes crush freshly ironed clothes. Invest in proper hangers and give garments room to breathe — or collect them from us and hang immediately.</p>`,
    category: 'Tips',
    emoji: '👔',
    author: 'M. Ali Hassan',
    date: '2025-01-10',
    readTime: '4 min read'
  },
  {
    id: 'post-2',
    title: 'How We Serve University Hostels: Our Pickup Workflow Explained',
    excerpt: 'Curious how we actually collect from your hostel room and get clothes back to you in 24 hours? We walk through the full day.',
    content: `<h2>Designed Around Student Life</h2><p>When we built FreshFold's operations, we started with one question: what does a university student actually need? The answer wasn't just clean clothes — it was convenience at zero inconvenience.</p><h2>Step 1: You Message Us</h2><p>A quick WhatsApp message is all it takes. Tell us your hostel name, room number, approximate number of items, and a preferred time. That's it. No app downloads, no account creation.</p><h2>Step 2: We Confirm Immediately</h2><p>Our team confirms your slot within minutes during working hours (8 AM – 8 PM). You'll receive a message with your order ID, which you can use to track your order online.</p><h2>Step 3: Rider Arrives</h2><p>Our rider arrives at the hostel entrance or your room — whatever is easier for you. We use a branded bag system so everything stays identified and organized.</p><h2>Step 4: We Process</h2><p>Back at our workspace, each item is tagged with your order ID, inspected for special care requirements, and ironed using professional steam equipment.</p><h2>Step 5: Packed and Delivered</h2><p>Clothes are folded or hung, packed in clean bags with your name, and delivered back to you within 24 hours of pickup.</p>`,
    category: 'Operations',
    emoji: '🚴',
    author: 'Abdullah Zeeshan',
    date: '2025-01-05',
    readTime: '5 min read'
  },
  {
    id: 'post-3',
    title: 'The True Cost of Doing Your Own Laundry as a Student',
    excerpt: 'It feels free, but when you calculate the time, electricity, and effort, outsourcing laundry to FreshFold actually saves you money.',
    content: `<h2>Is DIY Laundry Really Free?</h2><p>Most students assume doing laundry themselves is the cheap option. But when you do the math, the picture changes significantly.</p><h2>Time Cost</h2><p>A typical laundry + ironing cycle takes 90–120 minutes when you account for washing, drying, and ironing. At a conservative estimate of Rs. 150/hour for your time (even as a student), that's Rs. 225–300 per session — easily more than our pricing.</p><h2>Electricity Cost</h2><p>Running a washing machine and iron for a full session can add Rs. 40–80 to your electricity bill depending on your rates and machine efficiency.</p><h2>Equipment Cost</h2><p>A decent iron costs Rs. 2,000–5,000. A good ironing board adds another Rs. 1,500–3,000. Spread over a year, that's a meaningful monthly cost.</p><h2>The Real Calculation</h2><p>When you add it all up, FreshFold's per-item pricing is genuinely competitive — and you get your time back. Time you can spend studying, resting, or doing literally anything else.</p><h2>For Office Workers</h2><p>The math is even more favorable for working professionals. Your hourly rate is higher, your time is scarcer, and a wrinkled shirt can have real professional consequences.</p>`,
    category: 'Savings',
    emoji: '💸',
    author: 'M. Zain Ul Abideen',
    date: '2024-12-28',
    readTime: '6 min read'
  }
];

function getPosts() {
  const stored = localStorage.getItem('ff_blog_posts');
  return stored ? JSON.parse(stored) : DEFAULT_POSTS;
}

function savePosts(posts) {
  localStorage.setItem('ff_blog_posts', JSON.stringify(posts));
}

function renderBlogGrid() {
  const container = document.getElementById('blogGrid');
  if (!container) return;
  const posts = getPosts();
  container.innerHTML = posts.map(p => `
    <div class="blog-card anim" onclick="openPost('${p.id}')">
      <div class="blog-thumb">${p.emoji}</div>
      <div class="blog-body">
        <div class="blog-meta">
          <span class="blog-cat">${p.category}</span>
          <span class="blog-date">${formatDate(p.date)} · ${p.readTime}</span>
        </div>
        <h3 class="blog-title">${p.title}</h3>
        <p class="blog-excerpt">${p.excerpt}</p>
        <div style="margin-top:1rem;display:flex;align-items:center;gap:.6rem;">
          <div style="width:28px;height:28px;border-radius:50%;background:var(--green-faint);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:.75rem;">👤</div>
          <span style="color:var(--muted);font-size:.78rem;">${p.author}</span>
        </div>
      </div>
    </div>`).join('');
  document.querySelectorAll('.blog-card.anim').forEach(el => {
    const obs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }), { threshold: 0.1 });
    obs.observe(el);
  });
}

function openPost(id) {
  window.location.href = `blog-post.html?id=${id}`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
}

function renderBlogPost() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const posts = getPosts();
  const post = posts.find(p => p.id === id);
  if (!post) { document.getElementById('postContent')?.innerHTML = '<p>Post not found.</p>'; return; }
  document.title = post.title + ' — FreshFold Blog';
  const container = document.getElementById('postContent');
  if (!container) return;
  container.innerHTML = `
    <div class="blog-post-header">
      <div style="font-size:4rem;margin-bottom:1rem;">${post.emoji}</div>
      <div class="blog-post-meta">
        <span class="badge badge-green">${post.category}</span>
        <span style="color:var(--muted);font-size:.8rem;">${formatDate(post.date)}</span>
        <span style="color:var(--muted);font-size:.8rem;">· ${post.readTime}</span>
      </div>
      <h1>${post.title}</h1>
      <div style="display:flex;align-items:center;gap:.8rem;margin-top:1rem;">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--green-faint);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;">👤</div>
        <div><strong style="color:#fff;font-size:.88rem;">${post.author}</strong><br><span style="color:var(--muted);font-size:.75rem;">FreshFold Team</span></div>
      </div>
    </div>
    <div class="blog-post-content">${post.content}</div>
    <div style="margin-top:3rem;padding-top:2rem;border-top:1px solid var(--border);">
      <a href="blog.html" style="color:var(--green-light);font-size:.88rem;">← Back to Blog</a>
    </div>`;
}

// Admin blog functions
function renderAdminPosts() {
  const tbody = document.getElementById('adminPostsList');
  if (!tbody) return;
  const posts = getPosts();
  tbody.innerHTML = posts.map(p => `
    <tr>
      <td><strong style="color:#fff">${p.title.substring(0, 50)}...</strong></td>
      <td><span class="badge badge-green">${p.category}</span></td>
      <td style="color:var(--muted)">${p.author}</td>
      <td style="color:var(--muted)">${formatDate(p.date)}</td>
      <td>
        <button onclick="editPost('${p.id}')" style="background:var(--green-faint);color:var(--green-light);border:1px solid var(--border);border-radius:6px;padding:.3rem .7rem;cursor:pointer;font-size:.75rem;margin-right:.4rem;">Edit</button>
        <button onclick="deletePost('${p.id}')" style="background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.2);border-radius:6px;padding:.3rem .7rem;cursor:pointer;font-size:.75rem;">Delete</button>
      </td>
    </tr>`).join('');
}

function savePost() {
  const id       = document.getElementById('editPostId')?.value || 'post-' + Date.now();
  const title    = document.getElementById('postTitle')?.value.trim();
  const excerpt  = document.getElementById('postExcerpt')?.value.trim();
  const content  = document.getElementById('postContent2')?.value.trim();
  const category = document.getElementById('postCategory')?.value;
  const author   = document.getElementById('postAuthor')?.value.trim();
  const emoji    = document.getElementById('postEmoji')?.value.trim() || '📝';

  if (!title || !content) { alert('Title and content are required.'); return; }

  const posts = getPosts();
  const existing = posts.findIndex(p => p.id === id);
  const post = { id, title, excerpt: excerpt || title.substring(0,120) + '...', content, category, author, emoji, date: new Date().toISOString().split('T')[0], readTime: Math.ceil(content.split(' ').length / 200) + ' min read' };

  if (existing >= 0) posts[existing] = post;
  else posts.unshift(post);

  savePosts(posts);
  alert('✅ Post saved!');
  renderAdminPosts();
  clearPostForm();
}

function editPost(id) {
  const posts = getPosts();
  const post = posts.find(p => p.id === id);
  if (!post) return;
  document.getElementById('editPostId').value  = post.id;
  document.getElementById('postTitle').value   = post.title;
  document.getElementById('postExcerpt').value = post.excerpt;
  document.getElementById('postContent2').value = post.content.replace(/<[^>]*>/g, '');
  document.getElementById('postCategory').value = post.category;
  document.getElementById('postAuthor').value  = post.author;
  document.getElementById('postEmoji').value   = post.emoji;
  document.getElementById('postFormTitle').textContent = 'Edit Post';
  document.getElementById('postForm')?.scrollIntoView({ behavior: 'smooth' });
}

function deletePost(id) {
  if (!confirm('Delete this post?')) return;
  const posts = getPosts().filter(p => p.id !== id);
  savePosts(posts);
  renderAdminPosts();
}

function clearPostForm() {
  ['editPostId','postTitle','postExcerpt','postContent2','postAuthor'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const cat = document.getElementById('postCategory'); if (cat) cat.value = 'Tips';
  const em  = document.getElementById('postEmoji'); if (em) em.value = '📝';
  const title = document.getElementById('postFormTitle'); if (title) title.textContent = 'Write New Post';
}

document.addEventListener('DOMContentLoaded', () => {
  renderBlogGrid();
  renderBlogPost();
  renderAdminPosts();
});
