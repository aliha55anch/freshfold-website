"""
FreshFold Backend — Flask + SQLite
===================================
Run locally:  python app.py
Deploy:       PythonAnywhere (see SETUP.md)
"""

from flask import Flask, request, jsonify, render_template, redirect, url_for, session, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_compress import Compress
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from functools import wraps
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import json
import re

# ─────────────────────────────────────
#  APP SETUP
# ─────────────────────────────────────
app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)  # Allow frontend JS to call API
Compress(app)

app.config['SECRET_KEY']         = 'freshfold-secret-change-this-in-production'
app.config['SQLALCHEMY_DATABASE_URI']     = 'sqlite:///freshfold.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

ADMIN_USERNAME = os.getenv('FRESHFOLD_ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.getenv('FRESHFOLD_ADMIN_PASSWORD', 'freshfold2025')

# ── Email config (Gmail SMTP) ──
# Replace with your Gmail address and App Password
# To get App Password: Google Account → Security → 2-Step → App Passwords
EMAIL_SENDER   = 'your_gmail@gmail.com'
EMAIL_PASSWORD = 'your_app_password_here'
EMAIL_RECEIVER = 'your_gmail@gmail.com'   # Where you get order notifications

db = SQLAlchemy(app)

# ─────────────────────────────────────
#  DATABASE MODELS
# ─────────────────────────────────────

class Order(db.Model):
    id          = db.Column(db.Integer, primary_key=True)
    order_id    = db.Column(db.String(20), unique=True, nullable=False)
    user_id     = db.Column(db.Integer, db.ForeignKey('user.id'))  # Link to user if logged in
    name        = db.Column(db.String(100), nullable=False)
    phone       = db.Column(db.String(20),  nullable=False)
    address     = db.Column(db.Text, nullable=False)
    area        = db.Column(db.String(100))
    service     = db.Column(db.String(20), default='ironing')   # ironing / wash
    delivery    = db.Column(db.String(10), default='std')       # std / exp
    items       = db.Column(db.Text)   # JSON string of items
    subtotal    = db.Column(db.Float,   default=0)
    discount    = db.Column(db.Float,   default=0)
    promo_code  = db.Column(db.String(30))
    total       = db.Column(db.Float,   default=0)
    notes       = db.Column(db.Text)
    pickup_time = db.Column(db.String(50))
    status      = db.Column(db.String(30), default='pending')
    # pending → pickup_scheduled → picked_up → processing → out_for_delivery → delivered
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':          self.id,
            'order_id':    self.order_id,
            'name':        self.name,
            'phone':       self.phone,
            'address':     self.address,
            'area':        self.area,
            'service':     self.service,
            'delivery':    self.delivery,
            'items':       json.loads(self.items) if self.items else [],
            'subtotal':    self.subtotal,
            'discount':    self.discount,
            'promo_code':  self.promo_code,
            'total':       self.total,
            'notes':       self.notes,
            'pickup_time': self.pickup_time,
            'status':      self.status,
            'created_at':  self.created_at.strftime('%Y-%m-%d %H:%M'),
        }


class BlogPost(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    post_id    = db.Column(db.String(50), unique=True, nullable=False)
    title      = db.Column(db.String(200), nullable=False)
    excerpt    = db.Column(db.Text)
    content    = db.Column(db.Text, nullable=False)
    category   = db.Column(db.String(50), default='Tips')
    author     = db.Column(db.String(100))
    emoji      = db.Column(db.String(10), default='📝')
    read_time  = db.Column(db.String(20), default='3 min read')
    published  = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id':         self.id,
            'post_id':    self.post_id,
            'title':      self.title,
            'excerpt':    self.excerpt,
            'content':    self.content,
            'category':   self.category,
            'author':     self.author,
            'emoji':      self.emoji,
            'read_time':  self.read_time,
            'published':  self.published,
            'date':       self.created_at.strftime('%Y-%m-%d'),
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M'),
        }


class Review(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    name       = db.Column(db.String(100), nullable=False)
    stars      = db.Column(db.Integer, nullable=False)
    text       = db.Column(db.Text, nullable=False)
    approved   = db.Column(db.Boolean, default=False)  # Admin must approve
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':         self.id,
            'name':       self.name,
            'stars':      self.stars,
            'text':       self.text,
            'approved':   self.approved,
            'date':       self.created_at.strftime('%d %b %Y'),
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M'),
        }


class PromoCode(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    code       = db.Column(db.String(30), unique=True, nullable=False)
    discount   = db.Column(db.Float, nullable=False)   # % or flat Rs amount
    is_percent = db.Column(db.Boolean, default=True)   # True=percent, False=flat
    label      = db.Column(db.String(100))
    active     = db.Column(db.Boolean, default=True)
    uses       = db.Column(db.Integer, default=0)
    max_uses   = db.Column(db.Integer, default=0)      # 0 = unlimited
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':         self.id,
            'code':       self.code,
            'discount':   self.discount,
            'is_percent': self.is_percent,
            'label':      self.label,
            'active':     self.active,
            'uses':       self.uses,
            'max_uses':   self.max_uses,
        }


class AdminUser(db.Model):
    id           = db.Column(db.Integer, primary_key=True)
    username     = db.Column(db.String(50), unique=True, nullable=False)
    password_hash= db.Column(db.String(200), nullable=False)


class User(db.Model):
    """Regular customer user account for login/register"""
    id            = db.Column(db.Integer, primary_key=True)
    email         = db.Column(db.String(120), unique=True, nullable=False)
    name          = db.Column(db.String(100), nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    phone         = db.Column(db.String(20))
    address       = db.Column(db.Text)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        """Hash and store password"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Verify password against stored hash"""
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        """Return user info (without password)"""
        return {
            'id':         self.id,
            'email':      self.email,
            'name':       self.name,
            'phone':      self.phone,
            'address':    self.address,
            'created_at': self.created_at.strftime('%Y-%m-%d'),
        }


# ─────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────

def generate_order_id():
    """Generate unique order ID like FF-1042"""
    last = Order.query.order_by(Order.id.desc()).first()
    num  = (last.id + 1001) if last else 1001
    return f'FF-{num}'


def send_email(subject, html_body):
    """Send email notification via Gmail SMTP"""
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From']    = EMAIL_SENDER
        msg['To']      = EMAIL_RECEIVER
        msg.attach(MIMEText(html_body, 'html'))

        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(EMAIL_SENDER, EMAIL_PASSWORD)
            server.sendmail(EMAIL_SENDER, EMAIL_RECEIVER, msg.as_string())
        return True
    except Exception as e:
        print(f'Email error: {e}')
        return False


def order_email_html(order):
    """Build HTML email for new order notification"""
    items_html = ''
    try:
        items = json.loads(order.items) if order.items else []
        for item in items:
            if item.get('count', 0) > 0:
                items_html += f"<tr><td style='padding:6px 12px;border-bottom:1px solid #e5e7eb;'>{item['label']}</td><td style='padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:center;'>{item['count']}</td><td style='padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#16a34a;font-weight:700;'>Rs. {item['price'] * item['count']}</td></tr>"
    except:
        items_html = '<tr><td colspan="3" style="padding:8px 12px;">See order details</td></tr>'

    return f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px;">
      <div style="background:#16a34a;color:white;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="margin:0;font-size:24px;">🧺 New FreshFold Order!</h1>
        <p style="margin:8px 0 0;opacity:.85;">Order ID: <strong>{order.order_id}</strong></p>
      </div>
      <div style="background:white;padding:24px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <h2 style="color:#111;font-size:16px;margin-bottom:16px;">Customer Details</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr><td style="padding:6px 0;color:#6b7280;width:40%;">Name</td><td style="padding:6px 0;font-weight:600;">{order.name}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Phone</td><td style="padding:6px 0;font-weight:600;">{order.phone}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Address</td><td style="padding:6px 0;">{order.address}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Area</td><td style="padding:6px 0;">{order.area}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Pickup Time</td><td style="padding:6px 0;">{order.pickup_time or 'Flexible'}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Service</td><td style="padding:6px 0;">{order.service.replace('_',' ').title()} — {'Express 12hr' if order.delivery=='exp' else 'Standard 24hr'}</td></tr>
        </table>
        <h2 style="color:#111;font-size:16px;margin-bottom:12px;">Items Ordered</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          <thead><tr style="background:#f3f4f6;">
            <th style="padding:8px 12px;text-align:left;font-size:13px;color:#6b7280;">Item</th>
            <th style="padding:8px 12px;text-align:center;font-size:13px;color:#6b7280;">Qty</th>
            <th style="padding:8px 12px;text-align:right;font-size:13px;color:#6b7280;">Price</th>
          </tr></thead>
          <tbody>{items_html}</tbody>
        </table>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="color:#6b7280;">Subtotal</span><span>Rs. {order.subtotal:.0f}</span></div>
          {"<div style='display:flex;justify-content:space-between;margin-bottom:6px;'><span style='color:#6b7280;'>Discount</span><span style='color:#ef4444;'>-Rs. "+str(int(order.discount))+"</span></div>" if order.discount > 0 else ""}
          <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid #bbf7d0;margin-top:6px;"><strong>Total</strong><strong style="color:#16a34a;font-size:18px;">Rs. {order.total:.0f}</strong></div>
        </div>
        {"<p style='margin-top:12px;color:#6b7280;font-size:14px;'><strong>Notes:</strong> "+order.notes+"</p>" if order.notes else ""}
        <div style="margin-top:24px;padding:16px;background:#f9fafb;border-radius:8px;text-align:center;">
          <p style="margin:0;color:#6b7280;font-size:13px;">Login to admin panel to update order status</p>
          <a href="http://your-site.pythonanywhere.com/admin" style="display:inline-block;margin-top:8px;background:#16a34a;color:white;padding:8px 20px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">Open Admin Panel →</a>
        </div>
      </div>
    </div>
    """


def login_required(f):
    """Decorator to protect admin routes"""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('admin_logged_in'):
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated


def user_login_required(f):
    """Decorator to protect user routes"""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('user_id'):
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated


# ─────────────────────────────────────
#  SERVE FRONTEND PAGES
# ─────────────────────────────────────

@app.route('/')
def index():
    return send_from_directory('../freshfold-v2', 'index.html')

FRONTEND_ALIASES = {
    'order': 'admin/order.html',
    'order.html': 'admin/order.html',
}

PUBLIC_ADMIN_FILES = {'login.html', 'admin-api.js'}


@app.route('/admin')
@app.route('/admin/')
def serve_admin_root():
    if session.get('admin_logged_in'):
        return send_from_directory('../freshfold-v2/admin', 'index.html')
    return redirect('/admin/login.html')


@app.route('/admin/<path:filename>')
def serve_admin_file(filename):
    if filename not in PUBLIC_ADMIN_FILES and not session.get('admin_logged_in'):
        return redirect('/admin/login.html')
    return send_from_directory('../freshfold-v2/admin', filename)

@app.route('/<path:filename>')
def serve_frontend(filename):
    filename = FRONTEND_ALIASES.get(filename, filename)
    return send_from_directory('../freshfold-v2', filename)


@app.after_request
def add_cache_headers(response):
    """Add sensible Cache-Control headers for static assets."""
    try:
        path = request.path or ''
        if path.startswith('/static/') or path.endswith(('.css', '.js', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico', '.woff', '.woff2', '.ttf')):
            response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
        elif path.endswith('.html') or path == '/':
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    except Exception:
        pass
    return response


# ─────────────────────────────────────
#  API — ORDERS
# ─────────────────────────────────────

@app.route('/api/orders', methods=['POST'])
def create_order():
    """Customer places a new order"""
    data = request.get_json()

    # Validate required fields
    required = ['name', 'phone', 'address', 'area']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400

    # Calculate total from items
    items     = data.get('items', [])
    subtotal  = sum(i.get('price', 0) * i.get('count', 0) for i in items)
    item_count= sum(i.get('count', 0) for i in items)

    # Bulk discount
    discount = 0
    if item_count >= 20:
        discount = subtotal * 0.15
    elif item_count >= 10:
        discount = subtotal * 0.10

    # Promo code discount
    promo_code = data.get('promo_code', '').upper()
    if promo_code:
        promo = PromoCode.query.filter_by(code=promo_code, active=True).first()
        if promo:
            if promo.max_uses == 0 or promo.uses < promo.max_uses:
                if promo.is_percent:
                    discount += subtotal * (promo.discount / 100)
                else:
                    discount += promo.discount
                promo.uses += 1
                db.session.commit()

    total = max(0, subtotal - discount)

    order = Order(
        order_id    = generate_order_id(),
        user_id     = session.get('user_id'),  # Link to logged-in user if available
        name        = data['name'],
        phone       = data['phone'],
        address     = data['address'],
        area        = data.get('area', ''),
        service     = data.get('service', 'ironing'),
        delivery    = data.get('delivery', 'std'),
        items       = json.dumps(items),
        subtotal    = subtotal,
        discount    = discount,
        promo_code  = promo_code or None,
        total       = total,
        notes       = data.get('notes', ''),
        pickup_time = data.get('pickup_time', ''),
        status      = 'pending',
    )
    db.session.add(order)
    db.session.commit()

    # Send email notification (non-blocking)
    try:
        send_email(
            subject   = f'🧺 New Order {order.order_id} — {order.name} — Rs. {total:.0f}',
            html_body = order_email_html(order)
        )
    except Exception as e:
        print(f'Email failed: {e}')  # Don't fail the order if email fails

    return jsonify({
        'success':  True,
        'order_id': order.order_id,
        'total':    total,
        'message':  'Order placed successfully!'
    }), 201


@app.route('/api/orders/<order_id>', methods=['GET'])
def track_order(order_id):
    """Customer tracks their order"""
    order = Order.query.filter_by(order_id=order_id.upper()).first()
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    return jsonify(order.to_dict())


@app.route('/api/orders', methods=['GET'])
@login_required
def get_all_orders():
    """Admin: get all orders with optional status filter"""
    status = request.args.get('status')
    query  = Order.query.order_by(Order.created_at.desc())
    if status:
        query = query.filter_by(status=status)
    orders = query.all()
    return jsonify([o.to_dict() for o in orders])


@app.route('/api/orders/<int:order_id>/status', methods=['PUT'])
@login_required
def update_order_status(order_id):
    """Admin: update order status"""
    order = Order.query.get_or_404(order_id)
    data  = request.get_json()
    valid = ['pending','pickup_scheduled','picked_up','processing','out_for_delivery','delivered']
    if data.get('status') not in valid:
        return jsonify({'error': 'Invalid status'}), 400
    order.status = data['status']
    db.session.commit()
    return jsonify({'success': True, 'status': order.status})


# ─────────────────────────────────────
#  API — BLOG POSTS
# ─────────────────────────────────────

@app.route('/api/blog', methods=['GET'])
def get_posts():
    """Public: get all published posts"""
    posts = BlogPost.query.filter_by(published=True).order_by(BlogPost.created_at.desc()).all()
    return jsonify([p.to_dict() for p in posts])


@app.route('/api/blog/<post_id>', methods=['GET'])
def get_post(post_id):
    """Public: get single post by post_id"""
    post = BlogPost.query.filter_by(post_id=post_id).first()
    if not post or not post.published:
        return jsonify({'error': 'Post not found'}), 404
    return jsonify(post.to_dict())


@app.route('/api/blog', methods=['POST'])
@login_required
def create_post():
    """Admin: create new blog post"""
    data = request.get_json()
    if not data.get('title') or not data.get('content'):
        return jsonify({'error': 'title and content required'}), 400

    # Generate word-count-based read time
    word_count = len(data['content'].split())
    read_time  = f"{max(1, word_count // 200)} min read"

    post = BlogPost(
        post_id   = f"post-{int(datetime.utcnow().timestamp())}",
        title     = data['title'],
        excerpt   = data.get('excerpt', data['title'][:120] + '...'),
        content   = data['content'],
        category  = data.get('category', 'Tips'),
        author    = data.get('author', 'FreshFold Team'),
        emoji     = data.get('emoji', '📝'),
        read_time = read_time,
        published = data.get('published', True),
    )
    db.session.add(post)
    db.session.commit()
    return jsonify({'success': True, 'post': post.to_dict()}), 201


@app.route('/api/blog/<int:post_id>', methods=['PUT'])
@login_required
def update_post(post_id):
    """Admin: edit existing post"""
    post = BlogPost.query.get_or_404(post_id)
    data = request.get_json()
    for field in ['title','excerpt','content','category','author','emoji','published']:
        if field in data:
            setattr(post, field, data[field])
    post.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'success': True, 'post': post.to_dict()})


@app.route('/api/blog/<int:post_id>', methods=['DELETE'])
@login_required
def delete_post(post_id):
    """Admin: delete post"""
    post = BlogPost.query.get_or_404(post_id)
    db.session.delete(post)
    db.session.commit()
    return jsonify({'success': True})


# ─────────────────────────────────────
#  API — REVIEWS
# ─────────────────────────────────────

@app.route('/api/reviews', methods=['GET'])
def get_reviews():
    """Public: get approved reviews only"""
    reviews = Review.query.filter_by(approved=True).order_by(Review.created_at.desc()).all()
    return jsonify([r.to_dict() for r in reviews])


@app.route('/api/reviews', methods=['POST'])
def submit_review():
    """Public: customer submits a review"""
    data = request.get_json()
    if not data.get('name') or not data.get('text') or not data.get('stars'):
        return jsonify({'error': 'name, stars, and text required'}), 400
    if not (1 <= int(data['stars']) <= 5):
        return jsonify({'error': 'Stars must be 1-5'}), 400

    review = Review(
        name     = data['name'],
        stars    = int(data['stars']),
        text     = data['text'],
        approved = False,  # Admin must approve before it shows
    )
    db.session.add(review)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Review submitted for approval!'}), 201


@app.route('/api/reviews/<int:review_id>/approve', methods=['PUT'])
@login_required
def approve_review(review_id):
    """Admin: approve or reject a review"""
    review = Review.query.get_or_404(review_id)
    data   = request.get_json()
    review.approved = data.get('approved', True)
    db.session.commit()
    return jsonify({'success': True})


@app.route('/api/reviews/<int:review_id>', methods=['DELETE'])
@login_required
def delete_review(review_id):
    """Admin: delete a review"""
    review = Review.query.get_or_404(review_id)
    db.session.delete(review)
    db.session.commit()
    return jsonify({'success': True})


@app.route('/api/reviews/all', methods=['GET'])
@login_required
def get_all_reviews():
    """Admin: get all reviews including pending"""
    reviews = Review.query.order_by(Review.created_at.desc()).all()
    return jsonify([r.to_dict() for r in reviews])


# ─────────────────────────────────────
#  API — PROMO CODES
# ─────────────────────────────────────

@app.route('/api/promos/validate', methods=['POST'])
def validate_promo():
    """Public: validate a promo code"""
    data = request.get_json()
    code = data.get('code', '').upper()
    if not code:
        return jsonify({'valid': False, 'message': 'Enter a promo code'}), 400

    promo = PromoCode.query.filter_by(code=code, active=True).first()
    if not promo:
        return jsonify({'valid': False, 'message': 'Invalid or expired code'}), 400
    if promo.max_uses > 0 and promo.uses >= promo.max_uses:
        return jsonify({'valid': False, 'message': 'This code has reached its usage limit'}), 400

    return jsonify({
        'valid':      True,
        'code':       promo.code,
        'discount':   promo.discount,
        'is_percent': promo.is_percent,
        'label':      promo.label,
        'message':    promo.label or f'{"%.0f%%" % promo.discount if promo.is_percent else "Rs. %.0f" % promo.discount} off applied!',
    })


@app.route('/api/promos', methods=['GET'])
@login_required
def get_promos():
    """Admin: get all promo codes"""
    promos = PromoCode.query.order_by(PromoCode.created_at.desc()).all()
    return jsonify([p.to_dict() for p in promos])


@app.route('/api/promos', methods=['POST'])
@login_required
def create_promo():
    """Admin: create a new promo code"""
    data = request.get_json()
    if not data.get('code') or data.get('discount') is None:
        return jsonify({'error': 'code and discount required'}), 400
    if PromoCode.query.filter_by(code=data['code'].upper()).first():
        return jsonify({'error': 'Code already exists'}), 409

    promo = PromoCode(
        code       = data['code'].upper(),
        discount   = float(data['discount']),
        is_percent = data.get('is_percent', True),
        label      = data.get('label', ''),
        active     = data.get('active', True),
        max_uses   = int(data.get('max_uses', 0)),
    )
    db.session.add(promo)
    db.session.commit()
    return jsonify({'success': True, 'promo': promo.to_dict()}), 201


@app.route('/api/promos/<int:promo_id>', methods=['PUT'])
@login_required
def update_promo(promo_id):
    """Admin: toggle active / update promo"""
    promo = PromoCode.query.get_or_404(promo_id)
    data  = request.get_json()
    for field in ['discount','is_percent','label','active','max_uses']:
        if field in data:
            setattr(promo, field, data[field])
    db.session.commit()
    return jsonify({'success': True, 'promo': promo.to_dict()})


@app.route('/api/promos/<int:promo_id>', methods=['DELETE'])
@login_required
def delete_promo(promo_id):
    """Admin: delete promo"""
    promo = PromoCode.query.get_or_404(promo_id)
    db.session.delete(promo)
    db.session.commit()
    return jsonify({'success': True})


# ─────────────────────────────────────
#  API — USER AUTHENTICATION
# ─────────────────────────────────────

@app.route('/api/auth/register', methods=['POST'])
def register():
    """User registration — create new account"""
    data = request.get_json()

    # Validate input
    email    = data.get('email', '').strip().lower()
    name     = data.get('name', '').strip()
    password = data.get('password', '')
    confirm  = data.get('confirm_password', '')

    if not email or not name or not password:
        return jsonify({'error': 'Email, name, and password required'}), 400

    # Validate email format
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_regex, email):
        return jsonify({'error': 'Invalid email format'}), 400

    # Validate password strength
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    if password != confirm:
        return jsonify({'error': 'Passwords do not match'}), 400

    # Check if user already exists
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409

    # Create new user
    user = User(email=email, name=name)
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    # Auto-login after registration
    session['user_id']    = user.id
    session['user_email'] = user.email
    session.permanent     = True
    app.permanent_session_lifetime = timedelta(days=30)

    # Claim any guest orders placed with the same phone number
    if user.phone:
        Order.query.filter_by(phone=user.phone, user_id=None).update({'user_id': user.id})
        db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Account created successfully!',
        'user':    user.to_dict()
    }), 201


@app.route('/api/auth/login', methods=['POST'])
def user_login():
    """User login"""
    data = request.get_json()

    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401

    # Set session
    session['user_id']    = user.id
    session['user_email'] = user.email
    session.permanent     = True
    app.permanent_session_lifetime = timedelta(days=30)

    # Claim any guest orders placed with the same phone number
    if user.phone:
        Order.query.filter_by(phone=user.phone, user_id=None).update({'user_id': user.id})
        db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Logged in successfully!',
        'user':    user.to_dict()
    })


@app.route('/api/auth/logout', methods=['POST'])
def user_logout():
    """User logout"""
    session.pop('user_id', None)
    session.pop('user_email', None)
    return jsonify({'success': True, 'message': 'Logged out'})


@app.route('/api/auth/user', methods=['GET'])
def get_current_user():
    """Get current logged-in user info"""
    user_id = session.get('user_id')

    if not user_id:
        return jsonify({'logged_in': False}), 200

    user = User.query.get(user_id)
    if not user:
        session.pop('user_id', None)
        return jsonify({'logged_in': False}), 200

    return jsonify({
        'logged_in': True,
        'user':      user.to_dict()
    })


@app.route('/api/auth/profile', methods=['PUT'])
@user_login_required
def update_profile():
    """User update their profile"""
    user = User.query.get(session['user_id'])
    data = request.get_json()

    # Update allowed fields
    if 'name' in data:
        user.name = data['name'].strip()
    if 'phone' in data:
        user.phone = data['phone'].strip()
    if 'address' in data:
        user.address = data['address'].strip()

    # Password change
    if data.get('current_password') and data.get('new_password'):
        if not user.check_password(data['current_password']):
            return jsonify({'error': 'Current password is incorrect'}), 401
        if len(data['new_password']) < 6:
            return jsonify({'error': 'New password must be at least 6 characters'}), 400
        user.set_password(data['new_password'])

    db.session.commit()
    return jsonify({
        'success': True,
        'message': 'Profile updated',
        'user':    user.to_dict()
    })


@app.route('/api/user/orders', methods=['GET'])
@user_login_required
def get_user_orders():
    """User: get their own orders"""
    user_id = session.get('user_id')
    orders  = Order.query.filter_by(user_id=user_id).order_by(Order.created_at.desc()).all()
    return jsonify([o.to_dict() for o in orders])


# ─────────────────────────────────────
#  API — DASHBOARD STATS
# ─────────────────────────────────────

@app.route('/api/dashboard', methods=['GET'])
@login_required
def dashboard_stats():
    """Admin: real-time dashboard numbers"""
    now         = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0)

    all_orders      = Order.query.all()
    month_orders    = Order.query.filter(Order.created_at >= month_start).all()
    pending         = Order.query.filter_by(status='pending').count()
    processing      = Order.query.filter(Order.status.in_(['pickup_scheduled','picked_up','processing'])).count()
    delivered       = Order.query.filter_by(status='delivered').count()
    month_revenue   = sum(o.total for o in month_orders)
    total_revenue   = sum(o.total for o in all_orders)
    pending_reviews = Review.query.filter_by(approved=False).count()

    # Average rating from approved reviews
    approved   = Review.query.filter_by(approved=True).all()
    avg_rating = round(sum(r.stars for r in approved) / len(approved), 1) if approved else 0

    # Orders by status counts
    status_counts = {}
    for o in all_orders:
        status_counts[o.status] = status_counts.get(o.status, 0) + 1

    return jsonify({
        'total_orders':    len(all_orders),
        'month_orders':    len(month_orders),
        'pending':         pending,
        'processing':      processing,
        'delivered':       delivered,
        'month_revenue':   month_revenue,
        'total_revenue':   total_revenue,
        'pending_reviews': pending_reviews,
        'avg_rating':      avg_rating,
        'total_reviews':   len(approved),
        'status_counts':   status_counts,
    })


# ─────────────────────────────────────
#  ADMIN AUTH
# ─────────────────────────────────────

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    """Admin login — simple username/password"""
    data = request.get_json()
    if data.get('username') == ADMIN_USERNAME and data.get('password') == ADMIN_PASSWORD:
        session['admin_logged_in'] = True
        session.permanent = True
        app.permanent_session_lifetime = timedelta(hours=8)
        return jsonify({'success': True, 'message': 'Logged in'})
    return jsonify({'error': 'Invalid credentials'}), 401


@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    session.pop('admin_logged_in', None)
    return jsonify({'success': True})


@app.route('/api/admin/check', methods=['GET'])
def admin_check():
    return jsonify({'logged_in': bool(session.get('admin_logged_in'))})


# ─────────────────────────────────────
#  DB INIT + SEED DATA
# ─────────────────────────────────────

def seed_database():
    """Insert default promo codes and sample blog post on first run"""

    # Default promo codes
    if not PromoCode.query.first():
        promos = [
            PromoCode(code='FRESH20',   discount=20,  is_percent=True,  label='20% off your order!',     active=True),
            PromoCode(code='STUDENT10', discount=10,  is_percent=True,  label='10% student discount!',   active=True),
            PromoCode(code='FIRST50',   discount=50,  is_percent=False, label='Rs. 50 off first order!', active=True),
            PromoCode(code='BULK15',    discount=15,  is_percent=True,  label='15% bulk discount!',      active=True),
        ]
        db.session.add_all(promos)

    # Sample blog post
    if not BlogPost.query.first():
        post = BlogPost(
            post_id  = 'post-welcome',
            title    = '5 Reasons Why Your Clothes Look Unprofessional',
            excerpt  = 'First impressions matter. Wrinkled clothes can cost you opportunities before you even speak.',
            content  = '<h2>The Problem</h2><p>Whether heading to university or a job interview, appearance signals effort. Wrinkled clothes communicate carelessness.</p><h2>How FreshFold Helps</h2><p>We handle the ironing professionally so you can focus on what matters. Schedule a pickup today.</p>',
            category = 'Tips',
            author   = 'M. Ali Hassan',
            emoji    = '👔',
        )
        db.session.add(post)

    db.session.commit()


# ─────────────────────────────────────
#  ENTRY POINT
# ─────────────────────────────────────

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        seed_database()
    print('FreshFold backend running at http://localhost:5000')
    app.run(debug=True, host='0.0.0.0', port=5000)