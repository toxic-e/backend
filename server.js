'use strict';
// server.js — Techofy Cloud Backend
require('dotenv').config();

const express     = require('express');
const mongoose    = require('mongoose');
const cors        = require('cors');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');
const multer      = require('multer');
const nodemailer  = require('nodemailer');
const crypto      = require('crypto');
const path        = require('path');
const fs          = require('fs');

const templates   = require('./emails');
const { createBot } = require('./bot');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── UPLOAD DIRECTORY ────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ─── SECURITY MIDDLEWARE ─────────────────────────────────────────────────────
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Frontend handles its own CSP
}));

app.use(cors({
  origin: (origin, cb) => {
    const allowed = [
      process.env.ALLOWED_ORIGIN,
      'http://localhost',
      'http://127.0.0.1',
      'null', // local file:// access for dev
    ].filter(Boolean);
    if (!origin || allowed.includes(origin)) return cb(null, true);
    cb(new Error('CORS blocked: ' + origin));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'x-request-token'],
  credentials: false,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── RATE LIMITERS ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyGenerator: (req) => req.body?.email || req.ip,
  message: { error: 'Too many OTP requests. Try again in 1 hour.' },
});

const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 10,
  message: { error: 'Too many order attempts. Please wait.' },
});

app.use(globalLimiter);

// ─── MONGOOSE MODELS ─────────────────────────────────────────────────────────

// User
const userSchema = new mongoose.Schema({
  firstName:     { type: String, required: true, trim: true, maxlength: 60 },
  lastName:      { type: String, required: true, trim: true, maxlength: 60 },
  email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
  emailVerified: { type: Boolean, default: false },
  createdAt:     { type: Date, default: Date.now },
});
const User = mongoose.model('User', userSchema);

// OTP (auto-deleted by MongoDB TTL index)
const otpSchema = new mongoose.Schema({
  email:     { type: String, required: true, index: true },
  otp:       { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  used:      { type: Boolean, default: false },
});
const OTP = mongoose.model('OTP', otpSchema);

// VerifyToken — short-lived proof that OTP was verified (avoids re-verification on submit)
const vtSchema = new mongoose.Schema({
  email:     { type: String, required: true },
  token:     { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  used:      { type: Boolean, default: false },
});
const VerifyToken = mongoose.model('VerifyToken', vtSchema);

// Order
const orderSchema = new mongoose.Schema({
  orderId:   { type: String, unique: true, required: true },
  userEmail: { type: String, required: true, index: true },
  firstName: String,
  lastName:  String,
  planType:  { type: String, enum: ['RDP', 'VPS'], required: true },
  planName:  { type: String, required: true },
  planPrice: { type: String, default: 'Free' },
  planRam:   String,
  isFree:    { type: Boolean, default: false },
  screenshotPath: String,
  status: {
    type: String,
    enum: ['pending', 'processing', 'active', 'cancelled'],
    default: 'pending',
  },
  statusHistory: [{
    status:    String,
    note:      String,
    updatedAt: { type: Date, default: Date.now },
  }],
  credentials: {
    ip:       String,
    username: String,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
const Order = mongoose.model('Order', orderSchema);

// Visitor (lightweight tracking)
const visitorSchema = new mongoose.Schema({
  ip:        String,
  userAgent: String,
  visitedAt: { type: Date, default: Date.now },
});
const Visitor = mongoose.model('Visitor', visitorSchema);

// ─── MULTER — FILE UPLOAD ─────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `ss_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only image files are allowed (JPG, PNG, WEBP, GIF).'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
});

// ─── NODEMAILER TRANSPORTER ───────────────────────────────────────────────────
const mailer = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  pool:           true,
  maxConnections: 5,
  rateDelta:      1000,
  rateLimit:      10,
});

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function genOrderId() {
  const ts   = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TC-${ts}-${rand}`;
}

function genOTP() {
  return String(crypto.randomInt(100000, 999999));
}

function sanitize(str) {
  return String(str || '').replace(/[<>"'&]/g, '').trim().slice(0, 200);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').toLowerCase());
}

// ─── VISITOR TRACKING (non-blocking) ─────────────────────────────────────────
app.use((req, _res, next) => {
  if (req.path === '/' || req.path === '/index.html') {
    Visitor.create({
      ip:        req.ip,
      userAgent: req.get('User-Agent') || '',
    }).catch(() => {}); // Silent fail
  }
  next();
});

// ─── ROUTES ───────────────────────────────────────────────────────────────────

// Health check
app.get('/api/ping', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// ── POST /api/otp/send ────────────────────────────────────────────────────────
app.post('/api/otp/send', otpLimiter, async (req, res) => {
  try {
    const firstName = sanitize(req.body.firstName);
    const lastName  = sanitize(req.body.lastName);
    const email     = (req.body.email || '').toLowerCase().trim();

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'First name, last name, and email are required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    // Upsert user (create if new, update name if exists)
    await User.findOneAndUpdate(
      { email },
      { $set: { firstName, lastName }, $setOnInsert: { emailVerified: false } },
      { upsert: true, new: true }
    );

    // Invalidate old OTPs for this email
    await OTP.deleteMany({ email });

    const otp = genOTP();
    const expiresMin = parseInt(process.env.OTP_EXPIRES_MIN || '10');
    await OTP.create({
      email,
      otp,
      expiresAt: new Date(Date.now() + expiresMin * 60 * 1000),
    });

    // Send OTP email
    await mailer.sendMail({
      from:    process.env.FROM_EMAIL,
      to:      email,
      subject: `${otp} — Your Techofy Cloud Verification Code`,
      html:    templates.otpEmail({ firstName, otp, expiresMin }),
    });

    res.json({ ok: true, message: `OTP sent to ${email}` });
  } catch (err) {
    console.error('/api/otp/send error:', err);
    res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
});

// ── POST /api/otp/verify ──────────────────────────────────────────────────────
app.post('/api/otp/verify', async (req, res) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    const otp   = String(req.body.otp || '').trim();

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required.' });
    }

    const record = await OTP.findOne({ email, used: false });
    if (!record) {
      return res.status(400).json({ error: 'OTP not found or already used. Please request a new one.' });
    }
    if (new Date() > record.expiresAt) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }
    if (record.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP. Please check and try again.' });
    }

    // Mark OTP as used
    await OTP.findByIdAndUpdate(record._id, { used: true });

    // Mark user as verified
    await User.findOneAndUpdate({ email }, { emailVerified: true });

    // Issue a short-lived verify token (valid 30 min)
    const token = crypto.randomBytes(32).toString('hex');
    await VerifyToken.create({
      email,
      token,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    res.json({ ok: true, verifyToken: token });
  } catch (err) {
    console.error('/api/otp/verify error:', err);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// ── POST /api/orders (multipart — handles screenshot upload) ──────────────────
app.post('/api/orders', orderLimiter, upload.single('screenshot'), async (req, res) => {
  let uploadedFilePath = req.file?.path || null;
  try {
    const email      = (req.body.email || '').toLowerCase().trim();
    const verifyToken = (req.body.verifyToken || '').trim();
    const planType   = (req.body.planType || '').toUpperCase().trim(); // 'RDP' or 'VPS'
    const planName   = sanitize(req.body.planName);
    const planPrice  = sanitize(req.body.planPrice);
    const planRam    = sanitize(req.body.planRam);
    const isFree     = req.body.isFree === 'true' || req.body.isFree === true;

    // ── Free plan: ek email sirf ek baar use ho sakti hai ──
    if (isFree) {
      const alreadyOrdered = await Order.findOne({ userEmail: email, isFree: true });
      if (alreadyOrdered) {
        if (uploadedFilePath) fs.unlink(uploadedFilePath, () => {});
        return res.status(400).json({
          error: 'This email has already claimed a free server. Each email can only get one free plan. For more servers, choose a paid plan.',
        });
      }
    }

    // Validate required fields
    if (!email || !verifyToken || !planType || !planName) {
      if (uploadedFilePath) fs.unlink(uploadedFilePath, () => {});
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    if (!['RDP', 'VPS'].includes(planType)) {
      if (uploadedFilePath) fs.unlink(uploadedFilePath, () => {});
      return res.status(400).json({ error: 'Invalid plan type.' });
    }

    // Validate verify token
    const vtRecord = await VerifyToken.findOne({ token: verifyToken, used: false });
    if (!vtRecord || vtRecord.email !== email || new Date() > vtRecord.expiresAt) {
      if (uploadedFilePath) fs.unlink(uploadedFilePath, () => {});
      return res.status(400).json({ error: 'Session expired or invalid. Please verify your email again.' });
    }

    // For free plans, screenshot is required
    if (isFree && !uploadedFilePath) {
      return res.status(400).json({ error: 'Screenshot proof is required for the free plan.' });
    }

    // Mark verify token as used
    await VerifyToken.findByIdAndUpdate(vtRecord._id, { used: true });

    const user = await User.findOne({ email });
    if (!user) {
      if (uploadedFilePath) fs.unlink(uploadedFilePath, () => {});
      return res.status(400).json({ error: 'User not found.' });
    }

    // Create order
    const orderId = genOrderId();
    const order = await Order.create({
      orderId,
      userEmail:  email,
      firstName:  user.firstName,
      lastName:   user.lastName,
      planType,
      planName,
      planPrice:  isFree ? 'Free' : planPrice,
      planRam,
      isFree,
      screenshotPath: uploadedFilePath || null,
      statusHistory: [{ status: 'pending', note: 'Order placed by user' }],
    });

    // Send confirmation email
    const emailData = {
      firstName: user.firstName,
      lastName:  user.lastName,
      orderId,
      planType,
      planName,
      planPrice,
      planRam,
      email,
    };
    const html = isFree
      ? templates.freeOrderEmail(emailData)
      : templates.paidOrderEmail(emailData);

    await mailer.sendMail({
      from:    process.env.FROM_EMAIL,
      to:      email,
      subject: `Order Confirmed — ${orderId} | Techofy Cloud`,
      html,
    });

    // Notify Telegram (non-blocking)
    if (bot) {
      bot.notifyNewOrder(order, uploadedFilePath).catch(console.error);
    }

    res.json({ ok: true, orderId });
  } catch (err) {
    console.error('/api/orders error:', err);
    if (uploadedFilePath) fs.unlink(uploadedFilePath, () => {});
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Duplicate order. Please try again.' });
    }
    res.status(500).json({ error: 'Failed to place order. Please try again.' });
  }
});

// ── GET /api/orders/track/:orderId ────────────────────────────────────────────
app.get('/api/orders/track/:orderId', async (req, res) => {
  try {
    const orderId = sanitize(req.params.orderId).toUpperCase();
    if (!orderId || orderId.length < 5) {
      return res.status(400).json({ error: 'Invalid order ID.' });
    }

    const order = await Order.findOne({ orderId: new RegExp(`^${orderId}$`, 'i') })
      .select('-screenshotPath -credentials -__v'); // Hide sensitive fields

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    res.json({
      ok: true,
      order: {
        orderId:        order.orderId,
        planType:       order.planType,
        planName:       order.planName,
        planPrice:      order.planPrice,
        planRam:        order.planRam,
        isFree:         order.isFree,
        status:         order.status,
        statusHistory:  order.statusHistory,
        createdAt:      order.createdAt,
        updatedAt:      order.updatedAt,
        // Redact email to first 2 chars + @domain for privacy
        userEmail: order.userEmail.replace(/^(.{2}).*(@.*)$/, '$1****$2'),
      },
    });
  } catch (err) {
    console.error('/api/orders/track error:', err);
    res.status(500).json({ error: 'Failed to fetch order.' });
  }
});

// ── GET /api/stats (internal — Telegram bot uses this if needed) ──────────────
app.get('/api/stats', async (req, res) => {
  // Simple token auth for internal use
  const secret = req.headers['x-admin-secret'];
  if (secret !== process.env.VERIFY_TOKEN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const [totalVisitors, totalUsers, verifiedUsers,
           totalOrders, rdpOrders, vpsOrders, pendingOrders, activeOrders] = await Promise.all([
      Visitor.countDocuments(),
      User.countDocuments(),
      User.countDocuments({ emailVerified: true }),
      Order.countDocuments(),
      Order.countDocuments({ planType: 'RDP' }),
      Order.countDocuments({ planType: 'VPS' }),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'active' }),
    ]);
    res.json({ ok: true, totalVisitors, totalUsers, verifiedUsers, totalOrders, rdpOrders, vpsOrders, pendingOrders, activeOrders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SERVE STATIC FILES ───────────────────────────────────────────────────────
// Uncomment if you serve the frontend from the same process:
// app.use(express.static(path.join(__dirname, '../public')));

// ─── 404 HANDLER ─────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }));

// ─── ERROR HANDLER ────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Max 8 MB allowed.' });
  }
  res.status(500).json({ error: err.message || 'Internal server error.' });
});

// ─── START SERVER ─────────────────────────────────────────────────────────────
let bot = null;

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 10000,
}).then(async () => {
  console.log('✅ MongoDB connected.');

  // Verify email transport
  mailer.verify().then(() => console.log('✅ SMTP ready.')).catch(e => console.warn('⚠️ SMTP:', e.message));

  // Start Telegram bot
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID) {
    bot = createBot({
      token:        process.env.TELEGRAM_BOT_TOKEN,
      adminChatId:  process.env.TELEGRAM_ADMIN_CHAT_ID,
      mailer,
      templates,
      models:       { User, Order, Visitor },
      fromEmail:    process.env.FROM_EMAIL,
    });
  } else {
    console.warn('⚠️ Telegram bot not configured (TELEGRAM_BOT_TOKEN missing).');
  }

  app.listen(PORT, () => {
    console.log(`✅ Techofy Cloud backend running on port ${PORT}`);
  });
}).catch(err => {
  console.error('❌ MongoDB connection failed:', err.message);
  process.exit(1);
});

// ─── GRACEFUL SHUTDOWN ────────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server...');
  mongoose.connection.close(() => process.exit(0));
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
