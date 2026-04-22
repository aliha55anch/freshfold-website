/* ================================================
   FreshFold — Authentication Helper
   Manages user login, registration, and session state
   ================================================ */

// Store current user in memory
let currentUser = null;

/**
 * Initialize authentication — check if user is logged in
 */
async function initAuth() {
  try {
    const response = await apiFetch('/api/auth/user');
    if (response.logged_in) {
      currentUser = response.user;
      updateAuthUI();
      return true;
    }
  } catch (err) {
    console.log('User not logged in');
  }
  return false;
}

/**
 * Update UI elements based on auth state
 */
function updateAuthUI() {
  const authBtnContainer = document.getElementById('authBtnContainer');
  const userMenuBtn = document.getElementById('userMenuBtn');
  const userMenu = document.getElementById('userMenu');

  if (!authBtnContainer) return; // Element doesn't exist on this page

  if (currentUser) {
    // Show logged-in UI
    authBtnContainer.innerHTML = `
      <div class="user-menu-wrapper">
        <button class="btn btn-green" id="userMenuBtn" onclick="toggleUserMenu()">
          ${currentUser.name.split(' ')[0]}
        </button>
        <div class="user-dropdown" id="userMenu" style="display: none;">
          <a href="profile.html" class="menu-item">My Profile</a>
          <a href="my-orders.html" class="menu-item">My Orders</a>
          <button onclick="handleLogout()" class="menu-item logout-btn">Logout</button>
        </div>
      </div>
    `;
  } else {
    // Show login/register UI
    authBtnContainer.innerHTML = `
      <a href="login.html" class="btn btn-outline">Sign In</a>
      <a href="register.html" class="btn btn-green">Sign Up</a>
    `;
  }
}

/**
 * Toggle user dropdown menu
 */
function toggleUserMenu() {
  const userMenu = document.getElementById('userMenu');
  if (userMenu) {
    userMenu.style.display = userMenu.style.display === 'none' ? 'block' : 'none';
  }
}

/**
 * Close user menu when clicking outside
 */
document.addEventListener('click', function (e) {
  const userMenuWrapper = document.querySelector('.user-menu-wrapper');
  if (userMenuWrapper && !userMenuWrapper.contains(e.target)) {
    const userMenu = document.getElementById('userMenu');
    if (userMenu) userMenu.style.display = 'none';
  }
});

/**
 * Handle user logout
 */
async function handleLogout() {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    currentUser = null;
    localStorage.removeItem('appliedPromo'); // Clear promo
    window.location.href = 'index.html';
  } catch (err) {
    alert('Logout failed: ' + err.message);
  }
}

/**
 * Require authentication for a page
 * Redirect to login if not logged in
 */
async function requireAuth() {
  const logged = await initAuth();
  if (!logged) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

/**
 * Get current user
 */
function getCurrentUser() {
  return currentUser;
}

/**
 * Check if user is logged in
 */
function isLoggedIn() {
  return currentUser !== null;
}

/**
 * Format user's name for display
 */
function getUserDisplayName() {
  if (!currentUser) return '';
  return currentUser.name;
}

/**
 * Prefill form with user data (for orders, etc.)
 */
function prefillUserData(form) {
  if (!currentUser) return;

  if (document.getElementById('custName')) {
    document.getElementById('custName').value = currentUser.name;
  }
  if (document.getElementById('custPhone')) {
    document.getElementById('custPhone').value = currentUser.phone || '';
  }
  if (document.getElementById('custAddr')) {
    document.getElementById('custAddr').value = currentUser.address || '';
  }
  if (document.getElementById('custEmail')) {
    document.getElementById('custEmail').value = currentUser.email;
  }
}

/**
 * Initialize auth UI on page load
 */
document.addEventListener('DOMContentLoaded', function () {
  initAuth().then(logged => {
    updateAuthUI();
  });
});

// CSS for dropdown menu
const authCSS = `
  .user-menu-wrapper {
    position: relative;
    display: inline-block;
  }

  .user-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    min-width: 200px;
    margin-top: 0.5rem;
    box-shadow: var(--shadow);
    z-index: 1000;
    overflow: hidden;
  }

  .menu-item {
    display: block;
    width: 100%;
    padding: 0.85rem 1rem;
    text-align: left;
    background: none;
    border: none;
    color: var(--text);
    cursor: pointer;
    font-family: var(--font);
    font-size: 0.95rem;
    transition: var(--transition);
    text-decoration: none;
  }

  .menu-item:hover {
    background: rgba(22, 163, 74, 0.1);
    color: var(--green);
  }

  .menu-item.logout-btn {
    border-top: 1px solid var(--border);
    color: #fca5a5;
  }

  .menu-item.logout-btn:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #fecaca;
  }

  #authBtnContainer {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  @media (max-width: 768px) {
    .user-dropdown {
      position: fixed;
      top: auto;
      right: 1rem;
      left: 1rem;
      bottom: auto;
      width: auto;
    }
  }
`;

// Inject styles if not already in document
if (!document.querySelector('style[data-auth-styles]')) {
  const styleEl = document.createElement('style');
  styleEl.setAttribute('data-auth-styles', 'true');
  styleEl.textContent = authCSS;
  document.head.appendChild(styleEl);
}
