# FreshFold — Backend Setup Guide
# ===================================
# Step-by-step: local + PythonAnywhere deploy

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — INSTALL PYTHON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Go to: https://www.python.org/downloads/
2. Download Python 3.11 or Python 3.12 (click the big yellow button)
3. Run the installer
   ⚠️  IMPORTANT: Check "Add Python to PATH" before clicking Install
4. When done, open Command Prompt and type:
      python --version
   You should see: Python 3.11.x or Python 3.12.x


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — SET UP YOUR PROJECT FOLDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your final folder structure should look like this:

  my-project/
  ├── freshfold-backend/
  │   ├── app.py
  │   └── requirements.txt
  └── freshfold-v2/
      ├── index.html
      ├── css/
      ├── js/
      └── admin/

Make sure freshfold-backend and freshfold-v2
are SIDE BY SIDE (same parent folder).


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — INSTALL FLASK DEPENDENCIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Open Command Prompt. Navigate to the backend folder:

  cd path\to\my-project\freshfold-backend

Create and use a virtual environment:

  python -m venv .venv
  \.v.env\Scripts\Activate.ps1

Install all packages:

  python -m pip install -r requirements.txt

Wait for it to finish (takes 1-2 minutes).


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4 — SET UP EMAIL NOTIFICATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Open app.py and find these 3 lines near the top:

  EMAIL_SENDER   = 'your_gmail@gmail.com'
  EMAIL_PASSWORD = 'your_app_password_here'
  EMAIL_RECEIVER = 'your_gmail@gmail.com'

Replace them with your Gmail address.

To get your App Password (required — normal password won't work):
  1. Go to: https://myaccount.google.com/security
  2. Enable 2-Step Verification
  3. Go to: App Passwords
  4. Select "Mail" and "Windows Computer"
  5. Copy the 16-character password
  6. Paste it as EMAIL_PASSWORD


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5 — CHANGE ADMIN PASSWORD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

In app.py, find:

  if data.get('username') == 'admin' and data.get('password') == 'freshfold2025':

Change 'admin' and 'freshfold2025' to your own
username and password BEFORE deploying live.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 6 — RUN LOCALLY (TEST IT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

In Command Prompt or PowerShell (inside freshfold-backend folder):

  .\.venv\Scripts\python.exe app.py

You should see:
  ✅ FreshFold backend running at http://localhost:5000

Open your browser and go to:
  http://localhost:5000

Your full website should load!

Admin panel:
  http://localhost:5000/admin/login.html

Login with:
  Username: admin
  Password: freshfold2025


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 7 — CONNECT FRONTEND TO API
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Add this ONE line to EVERY .html file just
before the closing </body> tag:

  <script src="js/api.js"></script>

For admin pages, add:
  <script src="admin-api.js"></script>

Also update order.html — change the submit button
onclick from:
  onclick="submitOrder()"
to:
  onclick="submitOrderToAPI()"


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 8 — DEPLOY TO PYTHONANYWHERE (FREE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PythonAnywhere gives you a free live URL like:
  https://yourusername.pythonanywhere.com

A. Create account:
   Go to: https://www.pythonanywhere.com
   Sign up for FREE account
   Choose a username (this becomes your URL)

B. Upload your files:
   1. Click "Files" tab
   2. Upload the entire freshfold-backend/ folder
   3. Upload the entire freshfold-v2/ folder
   Both folders should be in /home/yourusername/

C. Install packages:
   1. Click "Consoles" tab → New Bash console
   2. Type:
      cd ~/freshfold-backend
      pip3 install --user -r requirements.txt

D. Create Web App:
   1. Click "Web" tab → Add new web app
   2. Choose "Manual configuration"
   3. Choose Python 3.11
   4. Set Source code:    /home/yourusername/freshfold-backend
   5. Set Working dir:    /home/yourusername/freshfold-backend

E. Configure WSGI file:
   Click the WSGI configuration file link. Delete everything and paste:

   import sys
   sys.path.insert(0, '/home/yourusername/freshfold-backend')
   from app import app as application

F. Click "Reload" (green button)

G. Visit your live site:
   https://yourusername.pythonanywhere.com


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 9 — UPDATE API URL FOR LIVE SITE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

In js/api.js and admin/admin-api.js, find:

  const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : '';

The '' (empty string) means it uses the same domain automatically.
This already works — no change needed for PythonAnywhere!

Also update the email in order_email_html() in app.py:
  Change: http://your-site.pythonanywhere.com/admin
  To:     https://yourusername.pythonanywhere.com/admin


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
API REFERENCE  (for your records)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PUBLIC ENDPOINTS (anyone can call):
  POST /api/orders              Place a new order
  GET  /api/orders/:id          Track an order by ID
  GET  /api/blog                Get all published posts
  GET  /api/blog/:post_id       Get a single post
  GET  /api/reviews             Get approved reviews
  POST /api/reviews             Submit a new review
  POST /api/promos/validate     Validate a promo code

ADMIN ENDPOINTS (login required):
  POST /api/admin/login         Login
  POST /api/admin/logout        Logout
  GET  /api/dashboard           Dashboard stats
  GET  /api/orders              All orders (admin)
  PUT  /api/orders/:id/status   Update order status
  POST /api/blog                Create blog post
  PUT  /api/blog/:id            Edit blog post
  DELETE /api/blog/:id          Delete blog post
  GET  /api/reviews/all         All reviews (admin)
  PUT  /api/reviews/:id/approve Approve/reject review
  GET  /api/promos              All promo codes
  POST /api/promos              Create promo code
  PUT  /api/promos/:id          Update/toggle promo
  DELETE /api/promos/:id        Delete promo code


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEFAULT LOGIN CREDENTIALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Username: admin
Password: freshfold2025

⚠️  Change these in app.py before going live!


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TROUBLESHOOTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Problem: "python is not recognized"
Fix:     Reinstall Python and check "Add to PATH"

Problem: "ModuleNotFoundError: flask"
Fix:     Run: python -m pip install -r requirements.txt

Problem: SQLAlchemy crashes on Python 3.13+
Fix:     Use the project's virtual environment and reinstall from requirements.txt
         so the newer SQLAlchemy version is installed:
         .\.venv\Scripts\python.exe -m pip install -r requirements.txt
         .\.venv\Scripts\python.exe app.py

Problem: Email not sending
Fix:     Make sure 2-Step Verification is ON
         and you used an App Password (not Gmail password)

Problem: PythonAnywhere shows error
Fix:     Check the error log in Web tab → Log files

Problem: Orders not saving
Fix:     Make sure freshfold.db was created in
         freshfold-backend/ folder (runs automatically)
