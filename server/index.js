const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, _res, next) => { console.log(req.method, req.path); next(); });
app.use('/ui', express.static(path.join(__dirname, 'static')));

app.get('/', (req, res) => {
  res.redirect('/ui/');
});

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/amul_dist_app';
const port = process.env.PORT || 4000;

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, enum: ['admin', 'distributor', 'retailer', 'staff'], required: true },
    active: { type: Boolean, default: true },
    passwordHash: { type: String, required: true },
    phone: { type: String },
    address: { type: String },
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    permissions: [{ type: String }],
    createdByStaffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    currentBalance: { type: Number, default: 0 },
    profileEditedOnce: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema(
  {
    nameEnglish: { type: String, required: true, trim: true, unique: true },
    nameHindi: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
  },
  { timestamps: true }
);

productSchema.pre('save', function () {
  this.nameHindi = this.nameEnglish;
});

productSchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate() || {};
  if (update.nameEnglish) update.nameHindi = update.nameEnglish;
});

const Product = mongoose.model('Product', productSchema);

const unitSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Simple', 'Compound'], required: true },
    symbol: { type: String, required: true },
    formalName: { type: String },
    decimalPlaces: { type: Number, default: 0 },
    firstUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
    secondUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
    conversionFactor: { type: Number },
  },
  { timestamps: true }
);

const Unit = mongoose.model('Unit', unitSchema);

const rateSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    price: { type: Number, required: true },
  },
  { timestamps: true }
);

const Rate = mongoose.model('Rate', rateSchema);

const globalRateSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
    price: { type: Number, required: true },
  },
  { timestamps: true }
);
const GlobalRate = mongoose.model('GlobalRate', globalRateSchema);

const retailerRateSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    price: { type: Number, required: true },
  },
  { timestamps: true }
);
retailerRateSchema.index({ productId: 1, distributorId: 1, retailerId: 1 }, { unique: true });
const RetailerRate = mongoose.model('RetailerRate', retailerRateSchema);

const distProductSchema = new mongoose.Schema(
  {
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    nameEnglish: { type: String, required: true, trim: true },
    nameHindi: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
  },
  { timestamps: true }
);
distProductSchema.index({ distributorId: 1, nameEnglish: 1 }, { unique: true });
distProductSchema.pre('save', function () { this.nameHindi = this.nameEnglish; });
distProductSchema.pre('findOneAndUpdate', function () { const u = this.getUpdate() || {}; if (u.nameEnglish) u.nameHindi = u.nameEnglish; });
const DistProduct = mongoose.model('DistProduct', distProductSchema);

const distProductHideSchema = new mongoose.Schema(
  {
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  },
  { timestamps: true }
);
distProductHideSchema.index({ distributorId: 1, productId: 1 }, { unique: true });
const DistProductHide = mongoose.model('DistProductHide', distProductHideSchema);

const inventorySchema = new mongoose.Schema(
  {
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);
inventorySchema.index({ distributorId: 1, productId: 1 }, { unique: true });
const Inventory = mongoose.model('Inventory', inventorySchema);

const stockMoveSchema = new mongoose.Schema(
  {
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    createdByStaffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['IN', 'OUT'], required: true },
    quantity: { type: Number, required: true },
    note: { type: String },
  },
  { timestamps: true }
);
const StockMove = mongoose.model('StockMove', stockMoveSchema);

const supplierSchema = new mongoose.Schema(
  {
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    active: { type: Boolean, default: true },
    currentBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);
supplierSchema.index({ distributorId: 1, name: 1 }, { unique: true });
const Supplier = mongoose.model('Supplier', supplierSchema);

const orderSchema = new mongoose.Schema(
  {
    retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true }
    }],
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected', 'delivered'], default: 'pending' },
    note: { type: String }
  },
  { timestamps: true }
);
const Order = mongoose.model('Order', orderSchema);

const supplierTransactionSchema = new mongoose.Schema(
  {
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    createdByStaffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['bill', 'payment_cash', 'payment_online'], required: true },
    amount: { type: Number, required: true },
    note: { type: String },
  },
  { timestamps: true }
);
const SupplierTransaction = mongoose.model('SupplierTransaction', supplierTransactionSchema);

const transactionSchema = new mongoose.Schema(
  {
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdByStaffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['order', 'payment_cash', 'payment_online'], required: true },
    amount: { type: Number, required: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId },
    note: { type: String },
  },
  { timestamps: true }
);
const Transaction = mongoose.model('Transaction', transactionSchema);

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});
app.get('/api/units-test', (_req, res) => {
  res.json({ ok: true });
});

function signToken(user) {
  const payload = { 
    sub: user._id.toString(), 
    role: user.role,
    distributorId: user.distributorId ? user.distributorId.toString() : null,
    permissions: user.permissions || []
  };
  return jwt.sign(payload, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
}

async function auth(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'unauthorized' });
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'unauthorized' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'unauthorized' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  next();
}

function requireDistributor(req, res, next) {
  if (!req.user || req.user.role !== 'distributor') return res.status(403).json({ error: 'forbidden' });
  next();
}

function requireDistributorOrStaff(permission) {
  return function(req, res, next) {
    if (!req.user) return res.status(403).json({ error: 'forbidden' });
    if (req.user.role === 'admin') return next();
    if (req.user.role === 'distributor') return next();
    if (req.user.role === 'staff') {
      if (permission && !req.user.permissions.includes(permission)) {
        return res.status(403).json({ error: 'forbidden: missing permission ' + permission });
      }
      return next();
    }
    return res.status(403).json({ error: 'forbidden' });
  };
}

function getContext(req) {
  if (req.user.role === 'admin') return { distributorId: null, staffId: null, isAdmin: true };
  if (req.user.role === 'distributor') return { distributorId: req.user._id, staffId: null };
  if (req.user.role === 'staff') return { distributorId: req.user.distributorId, staffId: req.user._id };
  return { distributorId: null, staffId: null };
}

app.get('/api/my/staff', auth, requireDistributor, async (req, res) => {
  try {
    const staff = await User.find({ role: 'staff', distributorId: req.user._id }).sort({ createdAt: -1 });
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list staff' });
  }
});

app.post('/api/my/staff', auth, requireDistributor, async (req, res) => {
  try {
    const { name, email, password, permissions } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, password required' });
    const passwordHash = await bcrypt.hash(String(password), 10);
    const s = await User.create({
      name, email, role: 'staff', active: true, passwordHash,
      distributorId: req.user._id,
      permissions: Array.isArray(permissions) ? permissions : []
    });
    res.status(201).json(s);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Failed to create staff' });
  }
});

app.patch('/api/my/staff/:id', auth, requireDistributor, async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions, active, password } = req.body;
    const s = await User.findOne({ _id: id, role: 'staff', distributorId: req.user._id });
    if (!s) return res.status(404).json({ error: 'Staff not found' });
    
    if (permissions !== undefined) s.permissions = Array.isArray(permissions) ? permissions : [];
    if (active !== undefined) s.active = active;
    if (password) s.passwordHash = await bcrypt.hash(String(password), 10);
    
    await s.save();
    res.json(s);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update staff' });
  }
});

app.delete('/api/my/staff/:id', auth, requireDistributor, async (req, res) => {
  try {
    const { id } = req.params;
    await User.deleteOne({ _id: id, role: 'staff', distributorId: req.user._id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete staff' });
  }
});

function requireAdminOrDistributor(req, res, next) {
  if (!req.user || !['admin', 'distributor'].includes(req.user.role)) return res.status(403).json({ error: 'forbidden' });
  next();
}

function requireReadAccess(req, res, next) {
  // console.log('requireReadAccess', req.user ? req.user.role : 'no-user');
  if (!req.user || !['admin', 'distributor', 'staff'].includes(req.user.role)) return res.status(403).json({ error: 'forbidden' });
  next();
}

function requireRetailer(req, res, next) {
  if (!req.user || req.user.role !== 'retailer') return res.status(403).json({ error: 'forbidden' });
  next();
}

app.get('/api/users', auth, requireAdmin, async (req, res) => {
  try {
    const { role, active } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (active === 'true') filter.active = true;
    if (active === 'false') filter.active = false;
    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list users' });
  }
});

app.post('/api/users', auth, requireAdmin, async (req, res) => {
  try {
    const { name, email, role, password } = req.body;
    if (!name || !email || !role || !password) return res.status(400).json({ error: 'name, email, role, password are required' });
    if (!['distributor', 'retailer'].includes(role)) return res.status(400).json({ error: 'role must be distributor or retailer' });
    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await User.create({ name, email, role, active: true, passwordHash });
    res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role, active: user.active });
  } catch (err) {
    if (err && err.code === 11000) return res.status(409).json({ error: 'email already exists' });
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.post('/api/users/bulk-retailers', auth, requireAdmin, async (req, res) => {
  try {
    const input = Array.isArray(req.body) ? req.body : (Array.isArray(req.body.retailers) ? req.body.retailers : null);
    if (!input) return res.status(400).json({ error: 'retailers array required' });
    let distributor = await User.findOne({ role: 'distributor', name: 'demo distributor' });
    if (!distributor) distributor = await User.findOne({ role: 'distributor', email: 'demo.distributor@local' });
    if (!distributor) {
      let demoEmail = 'demo.distributor@local';
      const exists = await User.findOne({ email: demoEmail });
      if (exists) demoEmail = `demo.distributor.${Date.now()}@local`;
      const demoPasswordHash = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);
      distributor = await User.create({ name: 'demo distributor', email: demoEmail, role: 'distributor', active: true, passwordHash: demoPasswordHash });
    }
    function slugify(s) {
      return String(s || 'retailer').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').replace(/\.+/g, '.');
    }
    function digits(s) {
      return String(s || '').replace(/\D+/g, '');
    }
    const created = [];
    const errors = [];
    for (let i = 0; i < input.length; i++) {
      const r = input[i] || {};
      const name = r.name || r.storeName || r.retailerName;
      if (!name) { errors.push({ index: i, error: 'name missing' }); continue; }
      const address = r.address || r.location || '';
      const phone = r.phoneNumber || r.phone || '';
      const balanceRaw = r.currentBalance !== undefined ? r.currentBalance : r.balance;
      const currentBalance = Number(balanceRaw) || 0;
      let base = slugify(name);
      let suffix = digits(phone).slice(-4);
      if (!suffix) suffix = Math.random().toString(36).slice(2, 6);
      let email = `${base}.${suffix}@retailer.local`;
      const exists = await User.findOne({ email });
      if (exists) email = `${base}.${Date.now()}@retailer.local`;
      const passwordHash = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);
      try {
        const u = await User.create({ name, email, role: 'retailer', active: true, passwordHash, phone, address, distributorId: distributor._id, currentBalance });
        created.push({ _id: u._id, name: u.name, email: u.email });
      } catch (e) {
        errors.push({ index: i, error: 'create failed' });
      }
    }
    res.status(201).json({ distributorId: distributor._id, createdCount: created.length, errorCount: errors.length, created, errors });
  } catch (err) {
    res.status(500).json({ error: 'Failed to import retailers' });
  }
});

function requireDevSecret(req, res, next) {
  const s = req.headers['x-dev-secret'];
  const secret = process.env.JWT_SECRET || 'devsecret';
  if (!s || s !== secret) return res.status(403).json({ error: 'forbidden' });
  next();
}

app.post('/api/dev/bulk-retailers', requireDevSecret, async (req, res) => {
  try {
    const input = Array.isArray(req.body) ? req.body : (Array.isArray(req.body.retailers) ? req.body.retailers : null);
    if (!input) return res.status(400).json({ error: 'retailers array required' });
    let distributor = await User.findOne({ role: 'distributor', name: 'demo distributor' });
    if (!distributor) distributor = await User.findOne({ role: 'distributor', email: 'demo.distributor@local' });
    if (!distributor) {
      let demoEmail = 'demo.distributor@local';
      const exists = await User.findOne({ email: demoEmail });
      if (exists) demoEmail = `demo.distributor.${Date.now()}@local`;
      const demoPasswordHash = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);
      distributor = await User.create({ name: 'demo distributor', email: demoEmail, role: 'distributor', active: true, passwordHash: demoPasswordHash });
    }
    function slugify(s) {
      return String(s || 'retailer').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').replace(/\.+/g, '.');
    }
    function digits(s) {
      return String(s || '').replace(/\D+/g, '');
    }
    const created = [];
    const errors = [];
    for (let i = 0; i < input.length; i++) {
      const r = input[i] || {};
      const name = r.name || r.storeName || r.retailerName;
      if (!name) { errors.push({ index: i, error: 'name missing' }); continue; }
      const address = r.address || r.location || '';
      const phone = r.phoneNumber || r.phone || '';
      const balanceRaw = r.currentBalance !== undefined ? r.currentBalance : r.balance;
      const currentBalance = Number(balanceRaw) || 0;
      let base = slugify(name);
      let suffix = digits(phone).slice(-4);
      if (!suffix) suffix = Math.random().toString(36).slice(2, 6);
      let email = `${base}.${suffix}@retailer.local`;
      const exists = await User.findOne({ email });
      if (exists) email = `${base}.${Date.now()}@retailer.local`;
      const passwordHash = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);
      try {
        const u = await User.create({ name, email, role: 'retailer', active: true, passwordHash, phone, address, distributorId: distributor._id, currentBalance });
        created.push({ _id: u._id, name: u.name, email: u.email });
      } catch (e) {
        errors.push({ index: i, error: 'create failed' });
      }
    }
    res.status(201).json({ distributorId: distributor._id, createdCount: created.length, errorCount: errors.length, created, errors });
  } catch (err) {
    res.status(500).json({ error: 'Failed to import retailers' });
  }
});

app.patch('/api/users/:id/status', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;
    if (typeof active !== 'boolean') return res.status(400).json({ error: 'active must be boolean' });
    const user = await User.findByIdAndUpdate(id, { active }, { new: true });
    if (!user) return res.status(404).json({ error: 'user not found' });
    res.json({ _id: user._id, name: user.name, email: user.email, role: user.role, active: user.active });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ error: 'name, email, password, role are required' });
    if (!['distributor', 'retailer'].includes(role)) return res.status(400).json({ error: 'role must be distributor or retailer' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'email already exists' });
    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await User.create({ name, email, role, active: true, passwordHash });
    const token = signToken(user);
    res.status(201).json({ token, user: { _id: user._id, name: user.name, email: user.email, role: user.role, active: user.active, profileEditedOnce: user.profileEditedOnce, phone: user.phone, address: user.address } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to signup' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email/phone and password are required' });
    
    // Allow login by email or phone
    const user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { phone: email }
      ]
    });

    if (!user) return res.status(401).json({ error: 'invalid credentials' });
    if (!user.active) return res.status(403).json({ error: 'user inactive' });
    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    const token = signToken(user);
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email, role: user.role, active: user.active, profileEditedOnce: user.profileEditedOnce, phone: user.phone, address: user.address } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to login' });
  }
});

app.get('/api/me', auth, async (req, res) => {
  const u = req.user;
  res.json({ _id: u._id, name: u.name, email: u.email, role: u.role, active: u.active, profileEditedOnce: u.profileEditedOnce, phone: u.phone, address: u.address });
});

app.post('/api/auth/logout', auth, async (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/bootstrap-admin', async (req, res) => {
  try {
    const count = await User.countDocuments({ role: 'admin' });
    if (count > 0) return res.status(409).json({ error: 'admin already exists' });
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
    const passwordHash = await bcrypt.hash(String(password), 10);
    const admin = await User.create({ name, email, role: 'admin', active: true, passwordHash });
    const token = signToken(admin);
    res.status(201).json({ token, user: { _id: admin._id, name: admin.name, email: admin.email, role: admin.role, active: admin.active } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to bootstrap admin' });
  }
});

app.post('/api/dev/reset-admin', async (req, res) => {
  try {
    const headerSecret = req.headers['x-dev-secret'];
    const querySecret = (req.query && req.query.secret) ? String(req.query.secret) : null;
    const secret = headerSecret || querySecret;
    if (!secret || secret !== (process.env.JWT_SECRET || 'devsecret')) return res.status(403).json({ error: 'forbidden' });
    const { email: bodyEmail, password: bodyPassword } = req.body || {};
    const email = bodyEmail || (req.query && req.query.email);
    const password = bodyPassword || (req.query && req.query.password);
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) return res.status(404).json({ error: 'admin not found' });
    const nextEmail = email && String(email).trim() ? String(email).trim().toLowerCase() : admin.email;
    const nextPasswordHash = await bcrypt.hash(String(password || 'admin123'), 10);
    const updated = await User.findByIdAndUpdate(admin._id, { email: nextEmail, passwordHash: nextPasswordHash, active: true }, { new: true });
    res.json({ _id: updated._id, email: updated.email });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset admin' });
  }
});

app.patch('/api/me/profile', auth, async (req, res) => {
  try {
    const u = req.user;
    if (u.profileEditedOnce) return res.status(403).json({ error: 'profile already edited once' });
    const { name, phone, address } = req.body;
    const update = {};
    if (name) update.name = name;
    if (phone) update.phone = phone;
    if (address) update.address = address;
    update.profileEditedOnce = true;
    const updated = await User.findByIdAndUpdate(u._id, update, { new: true });
    res.json({ _id: updated._id, name: updated.name, email: updated.email, role: updated.role, active: updated.active, profileEditedOnce: updated.profileEditedOnce, phone: updated.phone, address: updated.address });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.patch('/api/users/:id/profile', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address, active, role } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (phone !== undefined) update.phone = phone;
    if (address !== undefined) update.address = address;
    if (active !== undefined) update.active = active;
    if (role !== undefined) update.role = role;
    const updated = await User.findByIdAndUpdate(id, update, { new: true });
    if (!updated) return res.status(404).json({ error: 'user not found' });
    res.json({ _id: updated._id, name: updated.name, email: updated.email, role: updated.role, active: updated.active, profileEditedOnce: updated.profileEditedOnce, phone: updated.phone, address: updated.address });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.delete('/api/users/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'user not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.get('/api/admin/stats', auth, requireAdmin, async (_req, res) => {
  try {
    const total = await User.countDocuments({});
    const distributors = await User.countDocuments({ role: 'distributor' });
    const retailers = await User.countDocuments({ role: 'retailer' });
    const admins = await User.countDocuments({ role: 'admin' });
    const active = await User.countDocuments({ active: true });
    const inactive = await User.countDocuments({ active: false });
    const recent = await User.find({}).sort({ createdAt: -1 }).limit(10).select('name email role active createdAt');
    const products = await Product.countDocuments({});
    res.json({ total, distributors, retailers, admins, active, inactive, recent, products });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// Retailer ↔ Distributor mapping (admin)
app.get('/api/admin/retailer-mapping', auth, requireAdmin, async (_req, res) => {
  try {
    const retailers = await User.find({ role: 'retailer' })
      .select('name email distributorId')
      .populate('distributorId', 'name email');
    const map = retailers.map(r => ({
      retailerId: r._id,
      retailerName: r.name,
      retailerEmail: r.email,
      distributorId: r.distributorId ? r.distributorId._id : null,
      distributorName: r.distributorId ? r.distributorId.name : null,
      distributorEmail: r.distributorId ? r.distributorId.email : null,
    }));
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load retailer mapping' });
  }
});

// Distributor logins (admin)
app.get('/api/admin/distributor-logins', auth, requireAdmin, async (req, res) => {
  try {
    const { reset, defaultPassword } = req.query;
    const items = await User.find({ role: 'distributor' }).select('name email active');
    const result = [];
    const doReset = String(reset) === 'true';
    for (const u of items) {
      const entry = { _id: u._id, name: u.name, email: u.email, active: u.active };
      if (doReset) {
        const pwd = defaultPassword ? String(defaultPassword) : Math.random().toString(36).slice(-10);
        const hash = await bcrypt.hash(pwd, 10);
        await User.updateOne({ _id: u._id }, { $set: { passwordHash: hash, active: true } });
        entry.tempPassword = pwd;
      }
      result.push(entry);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list distributor logins' });
  }
});

const unitsRouter = express.Router();
unitsRouter.get('/', auth, requireReadAccess, async (req, res) => {
  try {
    const { type, symbol, firstUnit, secondUnit } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (symbol) filter.symbol = new RegExp(String(symbol), 'i');
    if (firstUnit) filter.firstUnit = firstUnit;
    if (secondUnit) filter.secondUnit = secondUnit;
    const items = await Unit.find(filter).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list units' });
  }
});
unitsRouter.post('/', auth, requireAdminOrDistributor, async (req, res) => {
  try {
    const { type, symbol, formalName, decimalPlaces, firstUnit, secondUnit, conversionFactor } = req.body;
    if (!type || !symbol) return res.status(400).json({ error: 'type and symbol are required' });
    const doc = await Unit.create({ type, symbol, formalName, decimalPlaces, firstUnit, secondUnit, conversionFactor });
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create unit' });
  }
});
unitsRouter.delete('/:id', auth, requireAdminOrDistributor, async (req, res) => {
  try {
    const { id } = req.params;
    const del = await Unit.findByIdAndDelete(id);
    if (!del) return res.status(404).json({ error: 'unit not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete unit' });
  }
});
app.use('/api/units', unitsRouter);

app.get('/api/products', auth, requireReadAccess, async (req, res) => {
  try {
    const { active } = req.query;
    const filter = {};
    if (active === 'true') filter.active = true;
    if (active === 'false') filter.active = false;
    const items = await Product.find(filter).sort({ createdAt: -1 })
      .populate({
         path: 'unit',
         populate: { path: 'firstUnit secondUnit' }
      });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list products' });
  }
});

app.post('/api/products', auth, requireAdminOrDistributor, async (req, res) => {
  try {
    const { nameEnglish, unit } = req.body;
    if (!nameEnglish) return res.status(400).json({ error: 'nameEnglish is required' });
    let unitId;
    if (unit !== undefined && unit !== null && unit !== '') {
      try { unitId = new mongoose.Types.ObjectId(String(unit)); } catch { return res.status(400).json({ error: 'invalid unit id' }); }
    }
    const p = await Product.create({ nameEnglish, nameHindi: nameEnglish, active: true, unit: unitId });
    try { await GlobalRate.updateOne({ productId: p._id }, { $set: { productId: p._id, price: 100 } }, { upsert: true }); } catch {}
    res.status(201).json(p);
  } catch (err) {
    if (err && err.code === 11000) return res.status(409).json({ error: 'nameEnglish already exists' });
    res.status(500).json({ error: String(err && err.message ? err.message : 'Failed to create product') });
  }
});

app.patch('/api/products/:id', auth, requireAdminOrDistributor, async (req, res) => {
  try {
    const { id } = req.params;
    const { nameEnglish, active, unit } = req.body;
    
    const existing = await Product.findById(id);
    if (!existing) return res.status(404).json({ error: 'product not found' });

    // Restriction: Non-admins cannot change unit if it's already set
    if (unit !== undefined && req.user.role !== 'admin' && existing.unit) {
      // Check if trying to change to a different unit
      const newUnitId = unit ? String(unit) : null;
      const oldUnitId = existing.unit ? String(existing.unit) : null;
      if (newUnitId !== oldUnitId) {
        return res.status(403).json({ error: 'Unit cannot be changed once set (contact admin)' });
      }
    }

    const update = {};
    // Only admin can change name or active status of global products usually, 
    // but existing logic allowed it? Let's keep existing broad permission but restrict unit.
    if (nameEnglish !== undefined) update.nameEnglish = nameEnglish;
    if (active !== undefined) update.active = active;
    
    if (unit !== undefined) {
      if (unit === null || unit === '') {
        // Only admin can unset a unit if it was set? 
        // User said "once saved... cannot be changed". So unsetting is also a change.
        if (req.user.role !== 'admin' && existing.unit) {
           return res.status(403).json({ error: 'Unit cannot be removed once set' });
        }
        update.unit = null;
      } else {
        try { update.unit = new mongoose.Types.ObjectId(String(unit)); } catch { return res.status(400).json({ error: 'invalid unit id' }); }
      }
    }
    
    const p = await Product.findByIdAndUpdate(id, update, { new: true });
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/products/:id', auth, requireAdminOrDistributor, async (req, res) => {
  try {
    const { id } = req.params;
    const del = await Product.findByIdAndDelete(id);
    if (!del) return res.status(404).json({ error: 'product not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

app.get('/api/admin/rates', auth, requireAdmin, async (req, res) => {
  try {
    const items = await GlobalRate.find({}).sort({ updatedAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list default rates' });
  }
});

app.post('/api/admin/rates', auth, requireAdmin, async (req, res) => {
  try {
    const { productId, price } = req.body;
    if (!productId || typeof price !== 'number') return res.status(400).json({ error: 'productId and price required' });
    const pid = new mongoose.Types.ObjectId(String(productId));
    const existing = await GlobalRate.findOne({ productId: pid });
    if (existing) {
      existing.price = price;
      await existing.save();
      return res.json(existing);
    }
    const created = await GlobalRate.create({ productId: pid, price });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to set default rate' });
  }
});

app.post('/api/admin/rates/init-defaults', auth, requireAdmin, async (_req, res) => {
  try {
    const products = await Product.find({}).select('_id');
    const ops = products.map((p) => ({
      updateOne: { filter: { productId: p._id }, update: { $set: { productId: p._id, price: 100 } }, upsert: true },
    }));
    if (ops.length) await GlobalRate.bulkWrite(ops);
    const count = await GlobalRate.countDocuments({});
    res.json({ ok: true, count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to initialize default rates' });
  }
});
app.get('/api/admin/rates/init-defaults', auth, requireAdmin, async (_req, res) => {
  try {
    const products = await Product.find({}).select('_id');
    const ops = products.map((p) => ({
      updateOne: { filter: { productId: p._id }, update: { $set: { productId: p._id, price: 100 } }, upsert: true },
    }));
    if (ops.length) await GlobalRate.bulkWrite(ops);
    const count = await GlobalRate.countDocuments({});
    res.json({ ok: true, count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to initialize default rates' });
  }
});

app.get('/api/rates/defaults', auth, requireReadAccess, async (req, res) => {
  try {
    const items = await GlobalRate.find({}).sort({ updatedAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list default rates' });
  }
});

app.get('/api/admin/distributors/:id/rates', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const d = await User.findOne({ _id: id, role: 'distributor' });
    if (!d) return res.status(404).json({ error: 'distributor not found' });
    const items = await Rate.find({ distributorId: d._id }).sort({ updatedAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list distributor rates' });
  }
});

app.post('/api/admin/distributors/:id/rates', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { productId, price } = req.body;
    if (!productId || typeof price !== 'number') return res.status(400).json({ error: 'productId and price required' });
    const d = await User.findOne({ _id: id, role: 'distributor' });
    if (!d) return res.status(404).json({ error: 'distributor not found' });
    const pid = new mongoose.Types.ObjectId(String(productId));
    const existing = await Rate.findOne({ productId: pid, distributorId: d._id });
    if (existing) {
      existing.price = price;
      await existing.save();
      return res.json(existing);
    }
    const created = await Rate.create({ productId: pid, distributorId: d._id, price });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to set distributor rate' });
  }
});


app.get('/api/my/products', auth, requireDistributorOrStaff(null), async (req, res) => {
  try {
    const { distributorId } = getContext(req);
    const hides = await DistProductHide.find({ distributorId }).select('productId');
    const hiddenIds = hides.map((h) => h.productId);
    const globals = await Product.find({ _id: { $nin: hiddenIds } }).sort({ createdAt: -1 })
      .populate({
         path: 'unit',
         populate: { path: 'firstUnit secondUnit' }
      });
    const custom = await DistProduct.find({ distributorId }).sort({ createdAt: -1 })
      .populate({
         path: 'unit',
         populate: { path: 'firstUnit secondUnit' }
      });
    const items = [
      ...globals.map((p) => ({ _id: p._id, nameEnglish: p.nameEnglish, nameHindi: p.nameHindi, active: p.active, unit: p.unit, source: 'global' })),
      ...custom.map((p) => ({ _id: p._id, nameEnglish: p.nameEnglish, nameHindi: p.nameHindi, active: p.active, unit: p.unit, source: 'custom' })),
    ];
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list my products' });
  }
});

app.get('/api/my/products/hidden', auth, requireDistributorOrStaff(null), async (req, res) => {
  try {
    const { distributorId } = getContext(req);
    const hides = await DistProductHide.find({ distributorId }).select('productId');
    const ids = hides.map((h) => h.productId);
    const items = await Product.find({ _id: { $in: ids } }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list hidden products' });
  }
});

// ... create/update products remain distributor only ...

app.get('/api/my/inventory', auth, requireDistributorOrStaff(null), async (req, res) => {
  try {
    const { distributorId } = getContext(req);
    const items = await Inventory.find({ distributorId }).sort({ updatedAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list inventory' });
  }
});

app.post('/api/my/products', auth, requireDistributor, async (req, res) => {
  try {
    const { nameEnglish, unit } = req.body;
    if (!nameEnglish) return res.status(400).json({ error: 'nameEnglish is required' });
    let unitId;
    if (unit !== undefined && unit !== null && unit !== '') {
      try { unitId = new mongoose.Types.ObjectId(String(unit)); } catch { return res.status(400).json({ error: 'invalid unit id' }); }
    }
    const p = await DistProduct.create({ distributorId: req.user._id, nameEnglish, nameHindi: nameEnglish, active: true, unit: unitId });
    res.status(201).json({ _id: p._id, nameEnglish: p.nameEnglish, nameHindi: p.nameHindi, active: p.active, unit: p.unit, source: 'custom' });
  } catch (err) {
    if (err && err.code === 11000) return res.status(409).json({ error: 'nameEnglish already exists' });
    res.status(500).json({ error: 'Failed to create my product' });
  }
});

app.patch('/api/my/products/:id', auth, requireDistributor, async (req, res) => {
  try {
    const { id } = req.params;
    const { unit } = req.body;
    const pid = new mongoose.Types.ObjectId(String(id));
    const custom = await DistProduct.findOne({ _id: pid, distributorId: req.user._id });
    if (!custom) return res.status(404).json({ error: 'product not found' });
    
    // Restriction: Unit cannot be changed once set
    if (unit !== undefined && custom.unit) {
      const newUnitId = unit ? String(unit) : null;
      const oldUnitId = custom.unit ? String(custom.unit) : null;
      if (newUnitId !== oldUnitId) {
        return res.status(403).json({ error: 'Unit cannot be changed once set' });
      }
    }

    const update = {};
    if (unit !== undefined) {
      if (unit === null || unit === '') {
        update.unit = null;
      } else {
        try { update.unit = new mongoose.Types.ObjectId(String(unit)); } catch { return res.status(400).json({ error: 'invalid unit id' }); }
      }
    }
    const p = await DistProduct.findByIdAndUpdate(custom._id, update, { new: true });
    res.json({ _id: p._id, nameEnglish: p.nameEnglish, nameHindi: p.nameHindi, active: p.active, unit: p.unit, source: 'custom' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update my product' });
  }
});

app.delete('/api/my/products/:id', auth, requireDistributor, async (req, res) => {
  try {
    const { id } = req.params;
    const pid = new mongoose.Types.ObjectId(String(id));
    const custom = await DistProduct.findOne({ _id: pid, distributorId: req.user._id });
    if (custom) {
      await DistProduct.deleteOne({ _id: custom._id });
      return res.json({ ok: true, deleted: 'custom' });
    }
    const global = await Product.findById(pid);
    if (!global) return res.status(404).json({ error: 'product not found' });
    const existingHide = await DistProductHide.findOne({ distributorId: req.user._id, productId: pid });
    if (!existingHide) await DistProductHide.create({ distributorId: req.user._id, productId: pid });
    return res.json({ ok: true, hidden: 'global' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete/hide product' });
  }
});

app.post('/api/my/products/:id/hide', auth, requireDistributor, async (req, res) => {
  try {
    const { id } = req.params;
    const pid = new mongoose.Types.ObjectId(String(id));
    const global = await Product.findById(pid);
    if (!global) return res.status(404).json({ error: 'product not found' });
    const existingHide = await DistProductHide.findOne({ distributorId: req.user._id, productId: pid });
    if (!existingHide) await DistProductHide.create({ distributorId: req.user._id, productId: pid });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to hide product' });
  }
});

app.delete('/api/my/products/:id/hide', auth, requireDistributor, async (req, res) => {
  try {
    const { id } = req.params;
    const pid = new mongoose.Types.ObjectId(String(id));
    await DistProductHide.deleteOne({ distributorId: req.user._id, productId: pid });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unhide product' });
  }
});
app.get('/api/retailer/products', auth, requireRetailer, async (req, res) => {
  try {
    const distId = req.user.distributorId;
    if (!distId) return res.status(400).json({ error: 'no distributor linked' });
    
    const hides = await DistProductHide.find({ distributorId: distId }).select('productId');
    const hiddenIds = hides.map(h => h.productId);
    
    const globals = await Product.find({ _id: { $nin: hiddenIds }, active: true }).lean();
    const customs = await DistProduct.find({ distributorId: distId, active: true }).lean();
    
    const inventory = await Inventory.find({ distributorId: distId }).lean();
    const stockMap = {};
    inventory.forEach(i => stockMap[String(i.productId)] = i.quantity);
    
    const retailerRates = await RetailerRate.find({ distributorId: distId, retailerId: req.user._id }).lean();
    const distRates = await Rate.find({ distributorId: distId }).lean();
    
    const rRateMap = {}; retailerRates.forEach(r => rRateMap[String(r.productId)] = r.price);
    const dRateMap = {}; distRates.forEach(r => dRateMap[String(r.productId)] = r.price);
    
    const products = [];
    const build = (p, source) => {
      const sid = String(p._id);
      const stock = stockMap[sid] || 0;
      let price = rRateMap[sid];
      if (price === undefined) price = dRateMap[sid];
      if (price === undefined) price = 0;
      return {
        _id: p._id,
        nameEnglish: p.nameEnglish,
        nameHindi: p.nameHindi,
        unit: p.unit,
        source,
        stock,
        price
      };
    };
    
    globals.forEach(p => products.push(build(p, 'global')));
    customs.forEach(p => products.push(build(p, 'custom')));
    
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load products' });
  }
});

app.get('/api/orders/:id', auth, requireDistributorOrStaff(null), async (req, res) => {
  try {
    const { id } = req.params;
    const { distributorId } = getContext(req);
    const query = { _id: id };
    if (distributorId) query.distributorId = distributorId;
    const order = await Order.findOne(query)
      .populate({
        path: 'items.productId',
        select: 'nameEnglish nameHindi unit',
        populate: {
          path: 'unit',
          populate: { path: 'firstUnit secondUnit' }
        }
      })
      .populate('retailerId', 'name');
    if (!order) return res.status(404).json({ error: 'order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

app.post('/api/retailer/orders', auth, requireRetailer, async (req, res) => {
  try {
    const distId = req.user.distributorId;
    if (!distId) return res.status(400).json({ error: 'no distributor linked' });
    
    const { items } = req.body;
    if (!items || !items.length) return res.status(400).json({ error: 'empty order' });
    
    const orderItems = [];
    let total = 0;
    
    for (const item of items) {
      const pid = item.productId;
      const qty = Number(item.quantity);
      if (qty <= 0) continue;
      
      const inv = await Inventory.findOne({ distributorId: distId, productId: pid });
      const available = inv ? inv.quantity : 0;
      if (qty > available) {
        return res.status(400).json({ error: `Insufficient stock for product ${pid}` });
      }
      
      let price = 0;
      const rr = await RetailerRate.findOne({ distributorId: distId, retailerId: req.user._id, productId: pid });
      if (rr) price = rr.price;
      else {
        const dr = await Rate.findOne({ distributorId: distId, productId: pid });
        if (dr) price = dr.price;
        else {
          const gr = await GlobalRate.findOne({ productId: pid });
          if(gr) price = gr.price;
        }
      }
      
      orderItems.push({ productId: pid, quantity: qty, price });
      total += price * qty;
    }
    
    if (orderItems.length === 0) return res.status(400).json({ error: 'no valid items' });
    
    // Deduct stock immediately to reserve it
    for (const item of orderItems) {
      await Inventory.findOneAndUpdate(
        { distributorId: distId, productId: item.productId }, 
        { $inc: { quantity: -item.quantity } }
      );
    }

    const order = await Order.create({
      retailerId: req.user._id,
      distributorId: distId,
      items: orderItems,
      totalAmount: total,
      status: 'pending'
    });
    
    // Deduct balance and create transaction
    await User.findByIdAndUpdate(req.user._id, { $inc: { currentBalance: -total } });
    await Transaction.create({
      distributorId: distId,
      retailerId: req.user._id,
      type: 'order',
      amount: total,
      referenceId: order._id,
      note: 'Order placed via app'
    });
    
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to place order' });
  }
});

app.get('/api/retailer/orders', auth, requireRetailer, async (req, res) => {
  try {
    const orders = await Order.find({ retailerId: req.user._id })
      .populate({
        path: 'items.productId',
        select: 'nameEnglish nameHindi unit',
        populate: {
          path: 'unit',
          populate: { path: 'firstUnit secondUnit' }
        }
      })
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list orders' });
  }
});

async function start() {
  try {
    await mongoose.connect(mongoUri);
    try {
      const routes = (app._router && app._router.stack ? app._router.stack : [])
        .filter((r) => r.route && r.route.path)
        .map((r) => String(r.route.path));
      console.log('routes', routes);
    } catch {}
    try {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount === 0) {
        const name = process.env.ADMIN_NAME || 'Admin';
        const email = process.env.ADMIN_EMAIL || 'admin@local';
        const password = process.env.ADMIN_PASSWORD || 'admin123';
        const passwordHash = await bcrypt.hash(String(password), 10);
        const admin = await User.create({ name, email, role: 'admin', active: true, passwordHash });
        console.log('bootstrapped default admin', admin.email);
      }
    } catch {}
    app.listen(port, '::', () => {
      console.log(`api listening on http://[::]:${port}`);
    });
  } catch (err) {
    console.error('failed to start server', err);
    process.exit(1);
  }
}

 
app.get('/api/my/retailers', auth, requireDistributorOrStaff(null), async (req, res) => {
  try {
    const { distributorId } = getContext(req);
    const items = await User.find({ role: 'retailer', distributorId }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list retailers' });
  }
});

app.get('/api/my/suppliers', auth, requireDistributorOrStaff(null), async (req, res) => {
  try {
    const { distributorId } = getContext(req);
    const items = await Supplier.find({ distributorId }).sort({ name: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list suppliers' });
  }
});

app.post('/api/my/suppliers', auth, requireDistributorOrStaff('stock_in'), async (req, res) => {
  try {
    const { distributorId } = getContext(req);
    const { name, phone } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const s = await Supplier.create({ distributorId, name, phone });
    res.status(201).json(s);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Supplier already exists' });
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

app.get('/api/my/stock-moves', auth, requireDistributorOrStaff(null), async (req, res) => {
  try {
    const ctx = getContext(req);
    const { productId, retailerId, type, from, to, staffId, distributorId } = req.query;
    const filter = {};
    if (ctx.isAdmin) {
      if (distributorId) filter.distributorId = distributorId;
    } else {
      filter.distributorId = ctx.distributorId;
    }
    console.log('GET /api/my/stock-moves', { role: req.user.role, query: req.query, filter });
    // Allow staff to see all records, not just their own
    if (staffId) filter.createdByStaffId = staffId;
    
    if (productId) filter.productId = productId;
    if (retailerId) filter.retailerId = retailerId;
    if (type && ['IN', 'OUT'].includes(String(type))) filter.type = type;
    if (from || to) {
      filter.createdAt = {};
      if (from) {
        const d = new Date(String(from));
        if (!isNaN(d.getTime())) {
            // Adjust for IST start of day (subtract 5.5 hours) if just date provided
            if (String(from).length === 10) d.setMinutes(d.getMinutes() - 330);
            filter.createdAt.$gte = d;
        }
      }
      if (to) {
        const d = new Date(String(to));
        if (!isNaN(d.getTime())) {
          if (String(to).length === 10) d.setUTCHours(23, 59, 59, 999);
          filter.createdAt.$lte = d;
        }
      }
    }
    const items = await StockMove.find(filter)
      .populate('createdByStaffId', 'name')
      .populate({
        path: 'productId',
        select: 'nameEnglish nameHindi unit',
        populate: {
          path: 'unit',
          populate: { path: 'firstUnit secondUnit' }
        }
      })
      .sort({ createdAt: -1 });
    console.log('Found transactions:', items.length);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list stock moves' });
  }
});

app.get('/api/my/transactions', auth, requireDistributorOrStaff(null), async (req, res) => {
  try {
    const ctx = getContext(req);
    const { retailerId, type, from, to, staffId, distributorId } = req.query;
    const filter = {};
    if (ctx.isAdmin) {
      if (distributorId) filter.distributorId = distributorId;
    } else {
      filter.distributorId = ctx.distributorId;
    }
    console.log('GET /api/my/transactions', { role: req.user.role, query: req.query, filter });
    // Allow staff to see all records, not just their own
    if (staffId) filter.createdByStaffId = staffId;

    if (retailerId) filter.retailerId = retailerId;
    if (type) filter.type = type;
    if (from || to) {
      filter.createdAt = {};
      if (from) {
        const d = new Date(String(from));
        if (!isNaN(d.getTime())) {
            // Adjust for IST start of day (subtract 5.5 hours) if just date provided
            if (String(from).length === 10) d.setMinutes(d.getMinutes() - 330);
            filter.createdAt.$gte = d;
        }
      }
      if (to) {
        const d = new Date(String(to));
        if (!isNaN(d.getTime())) {
          if (String(to).length === 10) d.setUTCHours(23, 59, 59, 999);
          filter.createdAt.$lte = d;
        }
      }
    }
    const items = await Transaction.find(filter)
      .populate('retailerId', 'name')
      .populate('createdByStaffId', 'name')
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list transactions' });
  }
});

app.get('/api/my/supplier-transactions', auth, requireDistributorOrStaff(null), async (req, res) => {
  try {
    const ctx = getContext(req);
    const { supplierId, type, from, to, staffId, distributorId } = req.query;
    const filter = {};
    if (ctx.isAdmin) {
      if (distributorId) filter.distributorId = distributorId;
    } else {
      filter.distributorId = ctx.distributorId;
    }
    if (supplierId) filter.supplierId = supplierId;
    if (type) filter.type = type;
    if (from || to) {
      filter.createdAt = {};
      if (from) {
        const d = new Date(String(from));
        if (!isNaN(d.getTime())) {
            // Adjust for IST start of day (subtract 5.5 hours) if just date provided
            if (String(from).length === 10) d.setMinutes(d.getMinutes() - 330);
            filter.createdAt.$gte = d;
        }
      }
      if (to) {
        const d = new Date(String(to));
        if (!isNaN(d.getTime())) {
          if (String(to).length === 10) d.setUTCHours(23, 59, 59, 999);
          filter.createdAt.$lte = d;
        }
      }
    }
    if (staffId) filter.createdByStaffId = staffId;
    const items = await SupplierTransaction.find(filter)
      .populate('supplierId', 'name')
      .populate('createdByStaffId', 'name')
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list supplier transactions' });
  }
});

app.post('/api/my/stock-in', auth, requireDistributorOrStaff('stock_in'), async (req, res) => {
  try {
    const { distributorId, staffId } = getContext(req);
    const { productId, quantity, note, supplierId } = req.body;
    if (!productId || typeof quantity !== 'number') return res.status(400).json({ error: 'productId and quantity required' });
    if (quantity <= 0) return res.status(400).json({ error: 'quantity must be > 0' });
    const pid = new mongoose.Types.ObjectId(String(productId));
    const prod = await Product.findById(pid);
    if (!prod) return res.status(404).json({ error: 'product not found' });
    
    let sid = null;
    if (supplierId) {
       try { sid = new mongoose.Types.ObjectId(String(supplierId)); } catch {}
    }

    await Inventory.updateOne(
      { distributorId, productId: pid },
      { $inc: { quantity: quantity } },
      { upsert: true }
    );
    await StockMove.create({
      distributorId,
      productId: pid,
      type: 'IN',
      quantity,
      note,
      supplierId: sid,
      createdByStaffId: staffId
    });
    const current = await Inventory.findOne({ distributorId, productId: pid });
    res.json(current);
  } catch (err) {
    res.status(500).json({ error: 'Failed to stock in' });
  }
});

app.post('/api/my/suppliers/:id/payments', auth, requireDistributorOrStaff('stock_in'), async (req, res) => {
  try {
    const { distributorId, staffId } = getContext(req);
    const { id } = req.params;
    const { cashAmount, onlineAmount, note } = req.body;
    const sid = new mongoose.Types.ObjectId(String(id));
    const sup = await Supplier.findOne({ _id: sid, distributorId });
    if (!sup) return res.status(404).json({ error: 'supplier not found' });
    const created = [];
    const cash = Number(cashAmount) || 0;
    const online = Number(onlineAmount) || 0;
    if (cash > 0) {
      const t = await SupplierTransaction.create({ distributorId, supplierId: sid, createdByStaffId: staffId, type: 'payment_cash', amount: cash, note });
      created.push(t);
    }
    if (online > 0) {
      const t = await SupplierTransaction.create({ distributorId, supplierId: sid, createdByStaffId: staffId, type: 'payment_online', amount: online, note });
      created.push(t);
    }
    const delta = cash + online;
    if (delta > 0) {
      sup.currentBalance = Number(sup.currentBalance || 0) - delta;
      await sup.save();
    }
    res.json({ ok: true, count: created.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record supplier payments' });
  }
});

app.post('/api/my/suppliers/:id/bills', auth, requireDistributorOrStaff('stock_in'), async (req, res) => {
  try {
    const { distributorId, staffId } = getContext(req);
    const { id } = req.params;
    const { amount, note } = req.body;
    const bill = Number(amount) || 0;
    if (bill <= 0) return res.status(400).json({ error: 'amount must be > 0' });
    const sid = new mongoose.Types.ObjectId(String(id));
    const sup = await Supplier.findOne({ _id: sid, distributorId });
    if (!sup) return res.status(404).json({ error: 'supplier not found' });
    await SupplierTransaction.create({ distributorId, supplierId: sid, createdByStaffId: staffId, type: 'bill', amount: bill, note });
    sup.currentBalance = Number(sup.currentBalance || 0) + bill;
    await sup.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record supplier bill' });
  }
});

app.post('/api/my/stock-out', auth, requireDistributorOrStaff(null), async (req, res) => {
  try {
    const { distributorId, staffId } = getContext(req);
    const { productId, quantity, retailerId, note } = req.body;
    if (!productId || typeof quantity !== 'number' || !retailerId) return res.status(400).json({ error: 'productId, quantity, retailerId required' });
    if (quantity <= 0) return res.status(400).json({ error: 'quantity must be > 0' });
    const pid = new mongoose.Types.ObjectId(String(productId));
    const rid = new mongoose.Types.ObjectId(String(retailerId));
    const prod = await Product.findById(pid);
    if (!prod) return res.status(404).json({ error: 'product not found' });
    const ret = await User.findOne({ _id: rid, role: 'retailer', distributorId });
    if (!ret) return res.status(404).json({ error: 'retailer not found' });
    const inv = await Inventory.findOne({ distributorId, productId: pid });
    const available = inv ? Number(inv.quantity) : 0;
    if (available < quantity) return res.status(400).json({ error: 'insufficient stock' });
    await Inventory.updateOne(
      { distributorId, productId: pid },
      { $inc: { quantity: -quantity } },
      { upsert: true }
    );
    await StockMove.create({ distributorId, productId: pid, retailerId: rid, type: 'OUT', quantity, note, createdByStaffId: staffId });
    const current = await Inventory.findOne({ distributorId, productId: pid });
    res.json(current);
  } catch (err) {
    res.status(500).json({ error: 'Failed to stock out' });
  }
});

app.post('/api/my/retailers', auth, requireDistributorOrStaff('add_retailer'), async (req, res) => {
  try {
    const { distributorId, staffId } = getContext(req);
    const { name, phone, address, currentBalance } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const base = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').replace(/\.+/g, '.');
    const suffix = (String(phone || '').replace(/\D+/g, '').slice(-4)) || Math.random().toString(36).slice(2, 6);
    let email = `${base}.${suffix}@retailer.local`;
    const exists = await User.findOne({ email });
    if (exists) email = `${base}.${Date.now()}@retailer.local`;
    const passwordHash = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);
    const u = await User.create({ name, email, role: 'retailer', active: true, passwordHash, phone, address, distributorId, createdByStaffId: staffId, currentBalance: Number(currentBalance) || 0 });
    res.status(201).json(u);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create retailer' });
  }
});

app.post('/api/my/transactions', auth, requireDistributorOrStaff(null), async (req, res) => {
  try {
    const { distributorId, staffId } = getContext(req);
    const { retailerId, type, amount, note } = req.body;
    
    if (!retailerId || !type || typeof amount !== 'number') {
      return res.status(400).json({ error: 'retailerId, type, amount required' });
    }

    if (amount <= 0) return res.status(400).json({ error: 'amount must be > 0' });

    const rid = new mongoose.Types.ObjectId(String(retailerId));
    const ret = await User.findOne({ _id: rid, role: 'retailer', distributorId });
    if (!ret) return res.status(404).json({ error: 'retailer not found' });

    await Transaction.create({
      distributorId,
      retailerId: rid,
      type,
      amount,
      note,
      createdByStaffId: staffId
    });
    
    if (type === 'order') {
      ret.currentBalance += amount;
      await ret.save();
    } else if (['payment_cash', 'payment_online'].includes(type)) {
      ret.currentBalance -= amount;
      await ret.save();
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

app.patch('/api/my/retailers/:id/status', auth, requireDistributor, async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;
    if (typeof active !== 'boolean') return res.status(400).json({ error: 'active must be boolean' });
    const r = await User.findOne({ _id: id, role: 'retailer', distributorId: req.user._id });
    if (!r) return res.status(404).json({ error: 'retailer not found' });
    r.active = active;
    await r.save();
    res.json({ _id: r._id, name: r.name, email: r.email, role: r.role, active: r.active });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

app.delete('/api/my/retailers/:id', auth, requireDistributor, async (req, res) => {
  try {
    const { id } = req.params;
    const r = await User.findOne({ _id: id, role: 'retailer', distributorId: req.user._id });
    if (!r) return res.status(404).json({ error: 'retailer not found' });
    await User.deleteOne({ _id: r._id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete retailer' });
  }
});

app.get('/api/my/retailers/:id/rates', auth, requireDistributorOrStaff(null), async (req, res) => {
  try {
    const { id } = req.params;
    const { distributorId } = getContext(req);
    const r = await User.findOne({ _id: id, role: 'retailer', distributorId });
    if (!r) return res.status(404).json({ error: 'retailer not found' });
    const items = await RetailerRate.find({ distributorId, retailerId: r._id }).sort({ updatedAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list retailer rates' });
  }
});

app.post('/api/my/retailers/:id/rates', auth, requireDistributor, async (req, res) => {
  try {
    const { id } = req.params;
    const { productId, price } = req.body;
    if (!productId || typeof price !== 'number') return res.status(400).json({ error: 'productId and price required' });
    const r = await User.findOne({ _id: id, role: 'retailer', distributorId: req.user._id });
    if (!r) return res.status(404).json({ error: 'retailer not found' });
    const pid = new mongoose.Types.ObjectId(String(productId));
    const existing = await RetailerRate.findOne({ productId: pid, distributorId: req.user._id, retailerId: r._id });
    if (existing) {
      existing.price = price;
      await existing.save();
      return res.json(existing);
    }
    const created = await RetailerRate.create({ productId: pid, distributorId: req.user._id, retailerId: r._id, price });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to set retailer rate' });
  }
});

app.get('/api/my/rates', auth, requireDistributorOrStaff(null), async (req, res) => {
  try {
    const { distributorId } = getContext(req);
    const items = await Rate.find({ distributorId }).sort({ updatedAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list rates' });
  }
});

app.post('/api/my/rates', auth, requireDistributor, async (req, res) => {
  try {
    const { productId, price } = req.body;
    if (!productId || typeof price !== 'number') return res.status(400).json({ error: 'productId and price required' });
    const pid = new mongoose.Types.ObjectId(String(productId));
    const existing = await Rate.findOne({ productId: pid, distributorId: req.user._id });
    if (existing) {
      existing.price = price;
      await existing.save();
      return res.json(existing);
    }
    const created = await Rate.create({ productId: pid, distributorId: req.user._id, price });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to set rate' });
  }
});

app.all('/', (_req, res) => { res.redirect('/ui/index.html'); });
app.all('/admin.html', (_req, res) => { res.redirect('/ui/admin.html'); });
app.all('/distributor.html', (_req, res) => { res.redirect('/ui/distributor.html'); });
// Final 404 handler must be LAST
app.use((req, res) => {
  try {
    const path = String(req.path || '');
    const accept = String(req.headers['accept'] || '');
    if (req.method === 'GET' && !path.startsWith('/api')) {
      return res.redirect('/ui/index.html');
    }
    const wantsHtml = accept.includes('text/html') || path.endsWith('.html');
    if (wantsHtml && req.method === 'GET') {
      return res.redirect('/ui/index.html');
    }
  } catch {}
  res.status(404).json({ error: 'not found' });
});
start();
// Admin reports: stock moves
app.get('/api/admin/stock-moves', auth, requireAdmin, async (req, res) => {
  try {
    const { distributorId, productId, retailerId, type, from, to, staffId } = req.query;
    const filter = {};
    if (distributorId) filter.distributorId = distributorId;
    if (productId) filter.productId = productId;
    if (retailerId) filter.retailerId = retailerId;
    if (type && ['IN', 'OUT'].includes(String(type))) filter.type = type;
    if (from || to) {
      filter.createdAt = {};
      if (from) { const d = new Date(String(from)); if (!isNaN(d.getTime())) filter.createdAt.$gte = d; }
      if (to) { const d = new Date(String(to)); if (!isNaN(d.getTime())) filter.createdAt.$lte = d; }
    }
    if (staffId) filter.createdByStaffId = staffId;
    const items = await StockMove.find(filter)
      .populate('createdByStaffId', 'name')
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list stock moves (admin)' });
  }
});

// Admin reports: retailer transactions
app.get('/api/admin/transactions', auth, requireAdmin, async (req, res) => {
  try {
    const { distributorId, retailerId, type, from, to, staffId } = req.query;
    const filter = {};
    if (distributorId) filter.distributorId = distributorId;
    if (retailerId) filter.retailerId = retailerId;
    if (type) filter.type = type;
    if (from || to) {
      filter.createdAt = {};
      if (from) { const d = new Date(String(from)); if (!isNaN(d.getTime())) filter.createdAt.$gte = d; }
      if (to) { const d = new Date(String(to)); if (!isNaN(d.getTime())) filter.createdAt.$lte = d; }
    }
    if (staffId) filter.createdByStaffId = staffId;
    const items = await Transaction.find(filter)
      .populate('retailerId', 'name')
      .populate('createdByStaffId', 'name')
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list transactions (admin)' });
  }
});

// Admin reports: supplier transactions
app.get('/api/admin/supplier-transactions', auth, requireAdmin, async (req, res) => {
  try {
    const { distributorId, supplierId, type, from, to, staffId } = req.query;
    const filter = {};
    if (distributorId) filter.distributorId = distributorId;
    if (supplierId) filter.supplierId = supplierId;
    if (type) filter.type = type;
    if (from || to) {
      filter.createdAt = {};
      if (from) { const d = new Date(String(from)); if (!isNaN(d.getTime())) filter.createdAt.$gte = d; }
      if (to) { const d = new Date(String(to)); if (!isNaN(d.getTime())) filter.createdAt.$lte = d; }
    }
    if (staffId) filter.createdByStaffId = staffId;
    const items = await SupplierTransaction.find(filter)
      .populate('supplierId', 'name')
      .populate('createdByStaffId', 'name')
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list supplier transactions (admin)' });
  }
});

// Admin: suppliers list (optional filter by distributor)
app.get('/api/admin/suppliers', auth, requireAdmin, async (req, res) => {
  try {
    const { distributorId } = req.query;
    const filter = {};
    if (distributorId) filter.distributorId = distributorId;
    const items = await Supplier.find(filter).sort({ name: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list suppliers (admin)' });
  }
});

start();
