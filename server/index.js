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

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';
const port = process.env.PORT || 4000;

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, lowercase: true, trim: true, sparse: true },
    role: { type: String, enum: ['admin', 'distributor', 'retailer', 'staff', 'super_distributor'], required: true },
    active: { type: Boolean, default: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, unique: true, trim: true, sparse: true },
    address: { type: String },
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    superDistributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    permissions: [{ type: String }],
    createdByStaffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    currentBalance: { type: Number, default: 0 },
    profileEditedOnce: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema(
  {
    nameEnglish: { type: String, required: true, trim: true, unique: true },
    nameHindi: { type: String, required: true, trim: true },
    baseName: { type: String, trim: true },
    variantName: { type: String, trim: true },
    variantGroup: { type: String, trim: true },
    active: { type: Boolean, default: true },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
    price: { type: Number, default: 0 },
  },
  { timestamps: true }
);

productSchema.pre('save', function () {
  if (!this.nameHindi) this.nameHindi = this.nameEnglish;
});

productSchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate() || {};
  if (update.nameEnglish && !update.nameHindi) update.nameHindi = update.nameEnglish;
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
    history: [{ date: { type: Date, default: Date.now }, price: Number }]
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
    baseName: { type: String, trim: true },
    variantName: { type: String, trim: true },
    variantGroup: { type: String, trim: true },
    active: { type: Boolean, default: true },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
    price: { type: Number, default: 0 },
  },
  { timestamps: true }
);
distProductSchema.index({ distributorId: 1, nameEnglish: 1 }, { unique: true });
distProductSchema.pre('save', function () { if (!this.nameHindi) this.nameHindi = this.nameEnglish; });
distProductSchema.pre('findOneAndUpdate', function () { const u = this.getUpdate() || {}; if (u.nameEnglish && !u.nameHindi) u.nameHindi = u.nameEnglish; });
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
    dayKey: { type: String },
    type: { type: String, enum: ['IN', 'OUT'], required: true },
    quantity: { type: Number, required: true },
    price: { type: Number },
    note: { type: String },
  },
  { timestamps: true }
);
stockMoveSchema.index(
  { distributorId: 1, supplierId: 1, productId: 1, type: 1, dayKey: 1 },
  { unique: true, partialFilterExpression: { supplierId: { $exists: true }, dayKey: { $exists: true } } }
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
    type: { type: String, enum: ['order', 'payment_cash', 'payment_online', 'adjustment'], required: true },
    amount: { type: Number, required: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    note: { type: String },
  },
  { timestamps: true }
);
const Transaction = mongoose.model('Transaction', transactionSchema);

const distributorTransactionSchema = new mongoose.Schema(
  {
    superDistributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['stock_out', 'payment_cash', 'payment_online', 'adjustment'], required: true },
    amount: { type: Number, required: true },
    note: { type: String },
  },
  { timestamps: true }
);
const DistributorTransaction = mongoose.model('DistributorTransaction', distributorTransactionSchema);

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
    if (!token) {
        console.log('Auth failed: No token provided');
        return res.status(401).json({ error: 'unauthorized' });
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    const user = await User.findById(payload.sub);
    if (!user) {
        console.log('Auth failed: User not found for sub', payload.sub);
        return res.status(401).json({ error: 'unauthorized' });
    }
    req.user = user;
    next();
  } catch (e) {
    console.log('Auth failed: Exception', e.message, e.stack);
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
    if (req.user.role === 'super_distributor') return next();
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
  if (req.user.role === 'super_distributor') return { distributorId: req.user._id, staffId: null };
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
    const { name, phone, password, permissions } = req.body;
    if (!name || !phone || !password) return res.status(400).json({ error: 'Name, phone, password required' });
    const passwordHash = await bcrypt.hash(String(password), 10);
    const s = await User.create({
      name, phone, role: 'staff', active: true, passwordHash,
      distributorId: req.user._id,
      permissions: Array.isArray(permissions) ? permissions : []
    });
    res.status(201).json(s);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Phone already exists' });
    res.status(500).json({ error: 'Failed to create staff' });
  }
});

app.patch('/api/my/staff/:id', auth, requireDistributor, async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions, active, password, phone } = req.body;
    const s = await User.findOne({ _id: id, role: 'staff', distributorId: req.user._id });
    if (!s) return res.status(404).json({ error: 'Staff not found' });
    
    if (permissions !== undefined) s.permissions = Array.isArray(permissions) ? permissions : [];
    if (active !== undefined) s.active = active;
    if (phone) s.phone = phone;
    if (password) s.passwordHash = await bcrypt.hash(String(password), 10);
    
    await s.save();
    res.json(s);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Phone already exists' });
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
  if (!req.user || !['admin', 'distributor', 'super_distributor'].includes(req.user.role)) return res.status(403).json({ error: 'forbidden' });
  next();
}

function requireReadAccess(req, res, next) {
  // console.log('requireReadAccess', req.user ? req.user.role : 'no-user');
  if (!req.user || !['admin', 'distributor', 'staff', 'super_distributor'].includes(req.user.role)) return res.status(403).json({ error: 'forbidden' });
  next();
}

function requireRetailer(req, res, next) {
  if (!req.user || req.user.role !== 'retailer') return res.status(403).json({ error: 'forbidden' });
  next();
}

function requireSuperDistributor(req, res, next) {
  if (!req.user || req.user.role !== 'super_distributor') return res.status(403).json({ error: 'forbidden' });
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

app.get('/api/sd/distributors', auth, requireSuperDistributor, async (req, res) => {
  try {
    const items = await User.find({ role: 'distributor', superDistributorId: req.user._id }).sort({ sortOrder: 1, createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list distributors' });
  }
});

app.post('/api/sd/distributors', auth, requireSuperDistributor, async (req, res) => {
  try {
    const { name, email, phone, password, address } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password are required' });
    const exists = await User.findOne({ email: String(email).toLowerCase() });
    if (exists) return res.status(409).json({ error: 'email already exists' });
    const passwordHash = await bcrypt.hash(String(password), 10);
    const doc = await User.create({
      name,
      email: String(email).toLowerCase(),
      role: 'distributor',
      active: true,
      passwordHash,
      phone,
      address,
      superDistributorId: req.user._id,
    });
    res.status(201).json(doc);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'duplicate key' });
    res.status(500).json({ error: 'Failed to create distributor' });
  }
});

app.patch('/api/sd/distributors/:id', auth, requireSuperDistributor, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address, active, password, sortOrder } = req.body;
    const d = await User.findOne({ _id: id, role: 'distributor', superDistributorId: req.user._id });
    if (!d) return res.status(404).json({ error: 'distributor not found' });
    if (name !== undefined) d.name = name;
    if (phone !== undefined) d.phone = phone;
    if (address !== undefined) d.address = address;
    if (typeof active === 'boolean') d.active = active;
    if (sortOrder !== undefined) d.sortOrder = Number(sortOrder) || 0;
    if (password) d.passwordHash = await bcrypt.hash(String(password), 10);
    await d.save();
    res.json(d);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'duplicate key' });
    res.status(500).json({ error: 'Failed to update distributor' });
  }
});

app.delete('/api/sd/distributors/:id', auth, requireSuperDistributor, async (req, res) => {
  try {
    const { id } = req.params;
    const d = await User.findOne({ _id: id, role: 'distributor', superDistributorId: req.user._id });
    if (!d) return res.status(404).json({ error: 'distributor not found' });
    d.active = false;
    await d.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate distributor' });
  }
});

app.get('/api/sd/retailers', auth, requireSuperDistributor, async (req, res) => {
  try {
    const { distributorId } = req.query;
    const filter = { role: 'distributor', superDistributorId: req.user._id };
    if (distributorId) filter._id = distributorId;
    const distributors = await User.find(filter).select('_id');
    if (!distributors.length) return res.json([]);
    const ids = distributors.map(d => d._id);
    const retailers = await User.find({ role: 'retailer', distributorId: { $in: ids } }).sort({ sortOrder: 1, createdAt: -1 });
    res.json(retailers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list retailers' });
  }
});

app.patch('/api/sd/retailers/:id', auth, requireSuperDistributor, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address, active, sortOrder, password } = req.body;
    const r = await User.findOne({ _id: id, role: 'retailer' }).populate('distributorId');
    if (!r || !r.distributorId || String(r.distributorId.superDistributorId || '') !== String(req.user._id)) {
      return res.status(404).json({ error: 'retailer not found' });
    }
    if (name !== undefined) r.name = name;
    if (phone !== undefined) r.phone = phone;
    if (address !== undefined) r.address = address;
    if (typeof active === 'boolean') r.active = active;
    if (sortOrder !== undefined) r.sortOrder = Number(sortOrder) || 0;
    if (password) r.passwordHash = await bcrypt.hash(String(password), 10);
    await r.save();
    res.json(r);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'duplicate key' });
    res.status(500).json({ error: 'Failed to update retailer' });
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

app.patch('/api/admin/users/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, active, phone, address, password, distributorId } = req.body;
    
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) {
       if (!['admin', 'distributor', 'retailer', 'staff', 'super_distributor'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
       user.role = role;
    }
    if (typeof active === 'boolean') user.active = active;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (password) user.passwordHash = await bcrypt.hash(String(password), 10);
    
    if (distributorId !== undefined) {
        if (!distributorId) {
            user.distributorId = undefined;
        } else {
             const d = await User.findOne({ _id: distributorId, role: 'distributor' });
             if (!d) return res.status(400).json({ error: 'Invalid distributor ID' });
             user.distributorId = distributorId;
        }
    }

    await user.save();
    res.json({ _id: user._id, name: user.name, email: user.email, role: user.role, active: user.active, phone: user.phone, address: user.address, distributorId: user.distributorId });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Failed to update user' });
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
    const input = String(email).trim();
    const isEmail = input.includes('@');
    let user = null;
    if (isEmail) {
      user = await User.findOne({ email: input.toLowerCase() });
    } else {
      user = await User.findOne({ phone: input });
    }
    if (!user) return res.status(401).json({ error: 'invalid credentials' });
    if (user.role === 'staff' && isEmail) return res.status(400).json({ error: 'Staff must login with mobile number' });
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
  res.json({ _id: u._id, name: u.name, email: u.email, role: u.role, active: u.active, profileEditedOnce: u.profileEditedOnce, phone: u.phone, address: u.address, permissions: u.permissions });
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

app.get('/api/sd/distributors/:id/accounts', auth, requireSuperDistributor, async (req, res) => {
  try {
    const { id } = req.params;
    const d = await User.findOne({ _id: id, role: 'distributor', superDistributorId: req.user._id });
    if (!d) return res.status(404).json({ error: 'distributor not found' });
    const tx = await DistributorTransaction.find({ superDistributorId: req.user._id, distributorId: d._id }).sort({ createdAt: -1 });
    const balance = tx.reduce((sum, t) => {
      if (t.type === 'stock_out' || t.type === 'adjustment') return sum + Number(t.amount || 0);
      return sum - Number(t.amount || 0);
    }, 0);
    res.json({ balance, transactions: tx });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load distributor account' });
  }
});

app.get('/api/sd/accounts/summary', auth, requireSuperDistributor, async (req, res) => {
  try {
    const dists = await User.find({ role: 'distributor', superDistributorId: req.user._id }).select('name email phone active');
    const ids = dists.map(d => d._id);
    const tx = await DistributorTransaction.find({ superDistributorId: req.user._id, distributorId: { $in: ids } });
    const map = {};
    tx.forEach(t => {
      const key = String(t.distributorId);
      if (!map[key]) map[key] = 0;
      if (t.type === 'stock_out' || t.type === 'adjustment') map[key] += Number(t.amount || 0);
      else map[key] -= Number(t.amount || 0);
    });
    const data = dists.map(d => ({
      distributorId: d._id,
      name: d.name,
      email: d.email,
      phone: d.phone || null,
      active: !!d.active,
      balance: map[String(d._id)] || 0,
    }));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load accounts summary' });
  }
});

app.post('/api/sd/distributors/:id/accounts/payments', auth, requireSuperDistributor, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, amount, note } = req.body;
    if (!['payment_cash', 'payment_online', 'adjustment', 'stock_out'].includes(type)) return res.status(400).json({ error: 'invalid type' });
    const value = Number(amount);
    if (!value || value <= 0) return res.status(400).json({ error: 'amount must be positive' });
    const d = await User.findOne({ _id: id, role: 'distributor', superDistributorId: req.user._id });
    if (!d) return res.status(404).json({ error: 'distributor not found' });
    const doc = await DistributorTransaction.create({
      superDistributorId: req.user._id,
      distributorId: d._id,
      type,
      amount: value,
      note,
    });
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

app.get('/api/admin/stats', auth, requireAdmin, async (_req, res) => {
  try {
    const total = await User.countDocuments({});
    const distributors = await User.countDocuments({ role: 'distributor' });
    const superDistributors = await User.countDocuments({ role: 'super_distributor' });
    const retailers = await User.countDocuments({ role: 'retailer' });
    const admins = await User.countDocuments({ role: 'admin' });
    const active = await User.countDocuments({ active: true });
    const inactive = await User.countDocuments({ active: false });
    const recent = await User.find({}).sort({ createdAt: -1 }).limit(10).select('name email role active createdAt');
    const products = await Product.countDocuments({});
    res.json({ total, distributors, superDistributors, retailers, admins, active, inactive, recent, products });
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

// Update user details (admin) - including distributor mapping
app.patch('/api/admin/users/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, phone, address, active, password, distributorId } = req.body;
    
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (active !== undefined) user.active = active;
    if (password) user.passwordHash = await bcrypt.hash(String(password), 10);
    
    if (distributorId !== undefined) {
      if (distributorId === '' || distributorId === null) {
        user.distributorId = undefined;
      } else {
        const dist = await User.findOne({ _id: distributorId, role: 'distributor' });
        if (!dist) return res.status(400).json({ error: 'Invalid distributor ID' });
        user.distributorId = dist._id;
      }
    }

    await user.save();
    res.json({ ok: true, user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Failed to update user' });
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
    const { nameEnglish, nameHindi, baseName, variantName, variantGroup, unit, price } = req.body;
    
    let finalName = nameEnglish;
    if (!finalName && baseName) {
       finalName = baseName;
       if (variantName) finalName += ' ' + variantName;
    }

    if (!finalName) return res.status(400).json({ error: 'nameEnglish is required' });
    let unitId;
    if (unit !== undefined && unit !== null && unit !== '') {
      try { unitId = new mongoose.Types.ObjectId(String(unit)); } catch { return res.status(400).json({ error: 'invalid unit id' }); }
    }
    
    const p = await Product.create({ 
        nameEnglish: finalName, 
        nameHindi: nameHindi || finalName, 
        baseName,
        variantName,
        variantGroup,
        active: true, 
        unit: unitId,
        price: Number(price)||0
    });
    
    try { await GlobalRate.updateOne({ productId: p._id }, { $set: { productId: p._id, price: Number(price)||100 } }, { upsert: true }); } catch {}
    res.status(201).json(p);
  } catch (err) {
    if (err && err.code === 11000) return res.status(409).json({ error: 'nameEnglish already exists' });
    res.status(500).json({ error: String(err && err.message ? err.message : 'Failed to create product') });
  }
});

app.put('/api/products/:id', auth, requireAdminOrDistributor, async (req, res) => {
  try {
    const { id } = req.params;
    const { nameEnglish, nameHindi, baseName, variantName, variantGroup, unit, price, active } = req.body;
    
    const update = {};
    if(nameEnglish) update.nameEnglish = nameEnglish;
    if(nameHindi) update.nameHindi = nameHindi;
    if(baseName !== undefined) update.baseName = baseName;
    if(variantName !== undefined) update.variantName = variantName;
    if(variantGroup !== undefined) update.variantGroup = variantGroup;
    if(unit !== undefined) {
         if(unit === '' || unit === null) update.unit = null;
         else update.unit = new mongoose.Types.ObjectId(String(unit));
    }
    if(price !== undefined) update.price = Number(price);
    if(active !== undefined) update.active = Boolean(active);

    const p = await Product.findByIdAndUpdate(id, update, { new: true });
    if(!p) return res.status(404).json({error: 'Product not found'});
    
    res.json(p);
  } catch(err) {
      if (err && err.code === 11000) return res.status(409).json({ error: 'nameEnglish already exists' });
      res.status(500).json({ error: 'Failed to update product' });
  }
});

app.get('/api/products/:id', auth, requireReadAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const pid = new mongoose.Types.ObjectId(String(id));
    let p = await Product.findById(pid).populate({ path: 'unit', populate: { path: 'firstUnit secondUnit' } });
    if (!p) {
        p = await DistProduct.findById(pid).populate({ path: 'unit', populate: { path: 'firstUnit secondUnit' } });
    }
    if (!p) return res.status(404).json({ error: 'product not found' });
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

app.patch('/api/products/:id', auth, requireAdminOrDistributor, async (req, res) => {
  try {
    const { id } = req.params;
    const { nameEnglish, active, unit, baseName, variantName, variantGroup, nameHindi } = req.body;
    
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
    if (active !== undefined) update.active = active;
    
    // Handle name updates
    if (nameEnglish !== undefined) {
         update.nameEnglish = nameEnglish;
    } else if (baseName !== undefined || variantName !== undefined) {
         // If base/variant changed but nameEnglish not provided, try to reconstruct
         const newBase = baseName !== undefined ? baseName : existing.baseName;
         const newVar = variantName !== undefined ? variantName : existing.variantName;
         if (newBase) {
            update.nameEnglish = newBase;
            if (newVar) update.nameEnglish += ' ' + newVar;
         }
    }

    if (nameHindi !== undefined) update.nameHindi = nameHindi;
    if (baseName !== undefined) update.baseName = baseName;
    if (variantName !== undefined) update.variantName = variantName;
    if (variantGroup !== undefined) update.variantGroup = variantGroup;
    
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

app.get('/api/sd/distributors/:id/rates', auth, requireSuperDistributor, async (req, res) => {
  try {
    const { id } = req.params;
    const d = await User.findOne({ _id: id, role: 'distributor', superDistributorId: req.user._id });
    if (!d) return res.status(404).json({ error: 'distributor not found' });
    const items = await Rate.find({ distributorId: d._id }).sort({ updatedAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list distributor rates' });
  }
});

app.post('/api/sd/distributors/:id/rates', auth, requireSuperDistributor, async (req, res) => {
  try {
    const { id } = req.params;
    const { productId, price } = req.body;
    if (!productId || typeof price !== 'number') return res.status(400).json({ error: 'productId and price required' });
    const d = await User.findOne({ _id: id, role: 'distributor', superDistributorId: req.user._id });
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

// Export all retailer-specific rates (Excel-compatible CSV)
app.get('/api/admin/export/retailer-rates.csv', auth, requireAdmin, async (req, res) => {
  try {
    const { distributorId } = req.query;
    const filter = {};
    if (distributorId) {
      try { filter.distributorId = new mongoose.Types.ObjectId(String(distributorId)); }
      catch { return res.status(400).send('invalid distributorId'); }
    }
    const items = await RetailerRate.find(filter)
      .sort({ updatedAt: -1 })
      .populate('productId', 'nameEnglish')
      .populate('distributorId', 'name email')
      .populate('retailerId', 'name email')
      .lean();
    const header = ['distributor_name','distributor_id','retailer_name','retailer_id','product_name','product_id','price','updated_at'];
    const lines = items.map(i => {
      const d = i.distributorId || {};
      const r = i.retailerId || {};
      const p = i.productId || {};
      const row = [d.name||'', String(d._id||''), r.name||'', String(r._id||''), p.nameEnglish||'', String(p._id||''), Number(i.price)||0, new Date(i.updatedAt||i.createdAt).toISOString()];
      return row.map(v => typeof v === 'string' ? '"' + String(v).replace(/"/g, '""') + '"' : String(v)).join(',');
    });
    const csv = header.join(',') + '\n' + lines.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="retailer-rates.csv"');
    return res.send(csv);
  } catch (err) {
    return res.status(500).send('failed to export retailer rates');
  }
});

// Export current distributor's retailer rates (Excel-compatible CSV)
app.get('/api/my/export/retailer-rates.csv', auth, requireDistributorOrStaff(null), async (req, res) => {
  try {
    const { distributorId } = getContext(req);
    const items = await RetailerRate.find({ distributorId })
      .sort({ updatedAt: -1 })
      .populate('productId', 'nameEnglish')
      .populate('retailerId', 'name email')
      .lean();
    const header = ['retailer_name','retailer_id','product_name','product_id','price','updated_at'];
    const lines = items.map(i => {
      const r = i.retailerId || {};
      const p = i.productId || {};
      const row = [r.name||'', String(r._id||''), p.nameEnglish||'', String(p._id||''), Number(i.price)||0, new Date(i.updatedAt||i.createdAt).toISOString()];
      return row.map(v => typeof v === 'string' ? '"' + String(v).replace(/"/g, '""') + '"' : String(v)).join(',');
    });
    const csv = header.join(',') + '\n' + lines.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="my-retailer-rates.csv"');
    return res.send(csv);
  } catch (err) {
    return res.status(500).send('failed to export retailer rates');
  }
});


app.get('/api/my/stats', auth, requireDistributorOrStaff(null), async (req, res) => {
  try {
    const { distributorId } = getContext(req);
    
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);

    const inventoryCount = await Inventory.countDocuments({ distributorId });
    const lowStockCount = await Inventory.countDocuments({ distributorId, quantity: { $lte: 10 } });
    const retailerCount = await User.countDocuments({ role: 'retailer', distributorId });
    const todayOrders = await Order.countDocuments({ distributorId, createdAt: { $gte: startOfToday } });
    
    res.json({ inventoryCount, lowStockCount, retailerCount, todayOrders });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
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

    const globalRates = await GlobalRate.find({});
    const grMap = {};
    globalRates.forEach(r => grMap[String(r.productId)] = r.price);

    const distRates = await Rate.find({ distributorId: req.user._id });
    const drMap = {};
    distRates.forEach(r => drMap[String(r.productId)] = r.price);

    const items = [
      ...globals.map((p) => ({ 
          _id: p._id, 
          nameEnglish: p.nameEnglish, 
          nameHindi: p.nameHindi, 
          active: p.active, 
          unit: p.unit, 
          price: drMap[String(p._id)] !== undefined ? drMap[String(p._id)] : (grMap[String(p._id)] || p.price || 0), 
          baseName: p.baseName, 
          variantName: p.variantName, 
          variantGroup: p.variantGroup, 
          source: 'global' 
      })),
      ...custom.map((p) => ({ _id: p._id, nameEnglish: p.nameEnglish, nameHindi: p.nameHindi, active: p.active, unit: p.unit, price: p.price || 0, baseName: p.baseName, variantName: p.variantName, variantGroup: p.variantGroup, source: 'custom' })),
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
    let { nameEnglish, unit, price, baseName, variantName, variantGroup } = req.body;
    if (!nameEnglish) {
       if(baseName) {
         nameEnglish = baseName;
         if(variantName) nameEnglish += ' ' + variantName;
       } else {
         return res.status(400).json({ error: 'nameEnglish is required' });
       }
    }
    let unitId;
    if (unit !== undefined && unit !== null && unit !== '') {
      try { unitId = new mongoose.Types.ObjectId(String(unit)); } catch { return res.status(400).json({ error: 'invalid unit id' }); }
    }
    const p = await DistProduct.create({ 
        distributorId: req.user._id, 
        nameEnglish, 
        nameHindi: nameEnglish, 
        active: true, 
        unit: unitId, 
        price: Number(price) || 0,
        baseName,
        variantName,
        variantGroup
    });
    res.status(201).json({ _id: p._id, nameEnglish: p.nameEnglish, nameHindi: p.nameHindi, active: p.active, unit: p.unit, price: p.price, baseName: p.baseName, variantName: p.variantName, variantGroup: p.variantGroup, source: 'custom' });
  } catch (err) {
    if (err && err.code === 11000) return res.status(409).json({ error: 'nameEnglish already exists' });
    res.status(500).json({ error: 'Failed to create my product' });
  }
});

app.patch('/api/my/products/:id', auth, requireDistributor, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`PATCH /api/my/products/${id} by ${req.user.name} (${req.user._id})`);
    let { unit, price, nameEnglish, baseName, variantName, variantGroup } = req.body;
    const pid = new mongoose.Types.ObjectId(String(id));
    const custom = await DistProduct.findOne({ _id: pid, distributorId: req.user._id });
    
    if (!custom) {
        // Check if it is a global product
        const globalProd = await Product.findById(pid);
        if (globalProd) {
            // It's a global product. Distributor can only update PRICE (stored in Rate)
            // or maybe active (hide/unhide - handled by other endpoint, but we can support it here too if needed, but stick to price for now)
            if (price !== undefined) {
                const newPrice = Number(price) || 0;
                await Rate.findOneAndUpdate(
                    { distributorId: req.user._id, productId: pid },
                    { $set: { price: newPrice } },
                    { upsert: true, new: true }
                );
                return res.json({ _id: globalProd._id, price: newPrice, source: 'global' });
            }
            // 400 instead of 404 to avoid frontend confusion, though 404 is technically correct if not found
            // But if it is global and price not sent, maybe they tried to edit something else?
            console.log(`Global product ${pid} found, but no price provided for update.`);
            return res.status(400).json({ error: 'For global products, only price can be updated via this endpoint' });
        }
        console.log(`Product ${pid} not found in DistProduct or Product`);
        return res.status(404).json({ error: 'product not found' });
    }
    
    // Restriction: Unit cannot be changed once set
    if (unit !== undefined && custom.unit) {
      const newUnitId = unit ? String(unit) : null;
      const oldUnitId = custom.unit ? String(custom.unit) : null;
      if (newUnitId !== oldUnitId) {
        console.log(`Unit change attempt blocked: ${oldUnitId} -> ${newUnitId}`);
        return res.status(400).json({ error: 'Unit cannot be changed once set' });
      }
    }

    const update = {};
    if (price !== undefined) update.price = Number(price) || 0;
    
    // Handle name updates
    if (nameEnglish !== undefined) {
         update.nameEnglish = nameEnglish;
         update.nameHindi = nameEnglish;
    } else if (baseName !== undefined || variantName !== undefined) {
         // If base/variant changed but nameEnglish not provided, try to reconstruct
         const newBase = baseName !== undefined ? baseName : custom.baseName;
         const newVar = variantName !== undefined ? variantName : custom.variantName;
         if (newBase) {
            update.nameEnglish = newBase;
            if (newVar) update.nameEnglish += ' ' + newVar;
            update.nameHindi = update.nameEnglish;
         }
    }

    if (baseName !== undefined) update.baseName = baseName;
    if (variantName !== undefined) update.variantName = variantName;
    if (variantGroup !== undefined) update.variantGroup = variantGroup;

    if (unit !== undefined) {
      if (unit === null || unit === '') {
        update.unit = null;
      } else {
        try { update.unit = new mongoose.Types.ObjectId(String(unit)); } catch { 
             console.log(`Invalid unit ID: ${unit}`);
             return res.status(400).json({ error: 'invalid unit id' }); 
        }
      }
    }
    const p = await DistProduct.findByIdAndUpdate(custom._id, update, { new: true });
    res.json({ _id: p._id, nameEnglish: p.nameEnglish, nameHindi: p.nameHindi, active: p.active, unit: p.unit, price: p.price, baseName: p.baseName, variantName: p.variantName, variantGroup: p.variantGroup, source: 'custom' });
  } catch (err) {
    console.error(`PATCH products failed:`, err);
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
        select: 'nameEnglish nameHindi unit price',
        populate: {
          path: 'unit',
          populate: { path: 'firstUnit secondUnit' }
        }
      })
      .populate('retailerId', 'name sortOrder');
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
      // if (qty > available) {
      //   return res.status(400).json({ error: `Insufficient stock for product ${pid}` });
      // }
      
      let pObj = await Product.findById(pid).populate('unit');
      if(!pObj) pObj = await DistProduct.findById(pid).populate('unit');
      
      const u = pObj ? pObj.unit : null;
      const isCompound = u && String(u.type) === 'Compound';
      const conv = isCompound ? Number(u.conversionFactor)||0 : 0;
      
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
      
      if(isCompound && conv > 0){
         total += (price / conv) * qty;
      } else {
         total += price * qty;
      }
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

app.get('/api/debug/fix-ledger', auth, requireDistributorOrStaff(null), async (req, res) => {
  try {
    const force = req.query.force === 'true'; // Add force param
    console.log('Fix Ledger called with force:', force, 'query:', req.query);
    const ctx = getContext(req);
    // Look back to Dec 28 to cover recent issues
    const startOfDay = new Date('2025-12-28T00:00:00Z');
    
    const moves = await StockMove.find({ 
        distributorId: ctx.distributorId, 
        type: 'OUT',
        createdAt: { $gte: startOfDay },
        retailerId: { $exists: true, $ne: null }
    }).sort({ createdAt: 1 });

    let fixedCount = 0;
    const details = [];

    // Group moves by retailer and time window (10s)
    const sessions = [];
    for (const move of moves) {
        let added = false;
        for (const session of sessions) {
            if (session.retailerId.toString() === move.retailerId.toString()) {
                 const timeDiff = Math.abs(new Date(session.createdAt) - new Date(move.createdAt));
                 if (timeDiff < 10000) { // 10 seconds window
                     session.moves.push(move);
                     added = true;
                     break;
                 }
            }
        }
        if (!added) {
            sessions.push({
                retailerId: move.retailerId,
                createdAt: move.createdAt,
                moves: [move]
            });
        }
    }
    
    for (const session of sessions) {
        // Calculate total amount and items for the session
        let sessionTotal = 0;
        const items = [];
        let note = '';
        let createdByStaffId = null;

        for (const move of session.moves) {
             const pid = move.productId;
             const rid = move.retailerId;
             const quantity = move.quantity;
             
             if (move.note && !note) note = move.note;
             if (move.createdByStaffId && !createdByStaffId) createdByStaffId = move.createdByStaffId;

            let pObj = await Product.findById(pid).populate('unit');
            if(!pObj) pObj = await DistProduct.findById(pid).populate('unit');
            
            let price = 0;
            const rr = await RetailerRate.findOne({ distributorId: ctx.distributorId, retailerId: rid, productId: pid });
            if (rr) price = rr.price;
            else {
              const dr = await Rate.findOne({ distributorId: ctx.distributorId, productId: pid });
              if (dr) price = dr.price;
              else {
                const gr = await GlobalRate.findOne({ productId: pid });
                if(gr) price = gr.price;
              }
            }

            const u = pObj ? pObj.unit : null;
            const isCompound = u && String(u.type) === 'Compound';
            const conv = isCompound ? Number(u.conversionFactor)||0 : 0;
            let itemTotal = 0;
            if(isCompound && conv > 0){
               itemTotal = (price / conv) * quantity;
            } else {
               itemTotal = price * quantity;
            }
            sessionTotal += itemTotal;
            items.push({ productId: pid, quantity, price });
        }
        
        if (!note) note = 'Stock Out';

        // Check if transaction exists near this time (within 10 seconds of session start)
        const timeStart = new Date(session.createdAt);
        timeStart.setSeconds(timeStart.getSeconds() - 10);
        const timeEnd = new Date(session.createdAt);
        timeEnd.setSeconds(timeEnd.getSeconds() + 10);
        
        const existingList = await Transaction.find({
            distributorId: ctx.distributorId,
            retailerId: session.retailerId,
            createdAt: { $gte: timeStart, $lte: timeEnd }
        }).sort({ createdAt: 1 });
        
        if (existingList.length === 0) {
             // Create new
            const order = await Order.create({
                retailerId: session.retailerId,
                distributorId: ctx.distributorId,
                items: items,
                totalAmount: sessionTotal,
                status: 'delivered',
                note: note,
                createdAt: session.createdAt
            });

            await User.findByIdAndUpdate(session.retailerId, { $inc: { currentBalance: sessionTotal } });
            await Transaction.create({
                distributorId: ctx.distributorId,
                retailerId: session.retailerId,
                type: 'order',
                amount: sessionTotal,
                referenceId: order._id,
                note: note,
                createdByStaffId: createdByStaffId,
                createdAt: session.createdAt
            });
            fixedCount++;
            details.push({ 
                sessionId: session.createdAt, 
                status: 'FIXED_NEW', 
                amount: sessionTotal,
                movesCount: session.moves.length
            });
        } else if (existingList.length > 1 || force) {
            // Consolidate or Force Update
            const primary = existingList[0];
            const others = existingList.slice(1);
            
            // Calculate sum of amounts of transactions being replaced/updated
            let oldTotal = primary.amount;
            for(const t of others) oldTotal += t.amount;
            
            // Difference
            const diff = sessionTotal - oldTotal;
            
            // Update Balance if difference is significant
            if (Math.abs(diff) > 0.01) {
                await User.findByIdAndUpdate(session.retailerId, { $inc: { currentBalance: diff } });
            }
            
            // Update Primary Transaction
            primary.amount = sessionTotal;
            // Use existing note if not generic, otherwise use new note
            if (primary.note === 'Auto-fixed Stock Out' || primary.note === 'Stock Out') {
                primary.note = note;
            }
            
            // Update Primary Order
            if (primary.referenceId) {
                await Order.updateOne({ _id: primary.referenceId }, { 
                    totalAmount: sessionTotal, 
                    note: primary.note,
                    items: items 
                });
            } else {
                 const order = await Order.create({
                    retailerId: session.retailerId,
                    distributorId: ctx.distributorId,
                    items: items,
                    totalAmount: sessionTotal,
                    status: 'delivered',
                    note: primary.note,
                    createdAt: session.createdAt
                });
                primary.referenceId = order._id;
            }
            await primary.save();

            // Delete others
            for(const t of others) {
                await Transaction.findByIdAndDelete(t._id);
                if(t.referenceId) await Order.findByIdAndDelete(t.referenceId);
            }

            fixedCount++;
            details.push({ 
                sessionId: session.createdAt, 
                status: 'CONSOLIDATED', 
                amount: sessionTotal, 
                oldTxCount: existingList.length 
            });
        } else {
            details.push({ 
                sessionId: session.createdAt, 
                status: 'SKIPPED_EXISTS', 
                txId: existingList[0]._id 
            });
        }
    }
    res.json({ ok: true, fixed: fixedCount, sessions: sessions.length, details });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    const items = await User.find({ role: 'retailer', distributorId }).sort({ sortOrder: 1, name: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list retailers' });
  }
});

app.put('/api/my/retailers/:id', auth, requireDistributorOrStaff('add_retailer'), async (req, res) => {
  try {
    const { distributorId } = getContext(req);
    const { id } = req.params;
    const { name, phone, address, sortOrder } = req.body;
    
    const retailer = await User.findOne({ _id: id, role: 'retailer', distributorId });
    if (!retailer) return res.status(404).json({ error: 'Retailer not found' });
    
    if (name !== undefined) retailer.name = name;
    if (phone !== undefined) retailer.phone = phone;
    if (address !== undefined) retailer.address = address;
    if (sortOrder !== undefined) retailer.sortOrder = Number(sortOrder);
    
    await retailer.save();
    res.json(retailer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update retailer' });
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

app.get('/api/my/product-stats', auth, requireDistributorOrStaff(null), async (req, res) => {
  try {
    const { distributorId } = getContext(req);
    const stats = await StockMove.aggregate([
      { $match: { distributorId: new mongoose.Types.ObjectId(distributorId) } },
      { $group: {
          _id: "$productId",
          totalIn: { $sum: { $cond: [{ $eq: ["$type", "IN"] }, "$quantity", 0] } },
          totalOut: { $sum: { $cond: [{ $eq: ["$type", "OUT"] }, "$quantity", 0] } },
          movement: { $sum: "$quantity" }
        }
      }
    ]);
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch product stats' });
  }
});

app.get('/api/my/stock-moves', auth, requireDistributorOrStaff(null), async (req, res) => {
  try {
    const ctx = getContext(req);
    const { productId, retailerId, type, from, to, staffId, distributorId } = req.query;
    const filter = {};
    if (ctx.isAdmin) {
      if (distributorId && mongoose.Types.ObjectId.isValid(distributorId)) filter.distributorId = distributorId;
    } else {
      filter.distributorId = ctx.distributorId;
    }
    console.log('GET /api/my/stock-moves', { role: req.user.role, query: req.query, filter });
    // Allow staff to see all records, not just their own
    if (staffId && mongoose.Types.ObjectId.isValid(staffId)) filter.createdByStaffId = staffId;
    
    if (productId && mongoose.Types.ObjectId.isValid(productId)) filter.productId = productId;
    if (retailerId && mongoose.Types.ObjectId.isValid(retailerId)) filter.retailerId = retailerId;
    const { supplierId } = req.query;
    if (supplierId && mongoose.Types.ObjectId.isValid(supplierId)) filter.supplierId = supplierId;

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
          if (String(to).length === 10) {
            d.setMinutes(d.getMinutes() - 330);
            d.setTime(d.getTime() + 86400000 - 1);
          }
          filter.createdAt.$lte = d;
        }
      }
    }
    const items = await StockMove.find(filter)
      .populate('createdByStaffId', 'name')
      .populate('supplierId', 'name')
      .populate('retailerId', 'name sortOrder')
      .sort({ createdAt: -1 })
      .lean();

    // Manually populate productId to handle both Product and DistProduct
    const pIds = [...new Set(items.map(i => i.productId && i.productId.toString()).filter(id => id))];
    
    if (pIds.length > 0) {
        const products = await Product.find({ _id: { $in: pIds } })
            .select('nameEnglish nameHindi baseName variantName variantGroup unit price')
            .populate({ path: 'unit', populate: { path: 'firstUnit secondUnit' } })
            .lean();
            
        const distProducts = await DistProduct.find({ _id: { $in: pIds }, distributorId: filter.distributorId || ctx.distributorId })
            .select('nameEnglish nameHindi unit price')
            .populate({ path: 'unit', populate: { path: 'firstUnit secondUnit' } })
            .lean();

        const pMap = {};
        products.forEach(p => pMap[p._id.toString()] = p);
        distProducts.forEach(p => pMap[p._id.toString()] = p);

        for (const item of items) {
            if (item.productId) {
                const pidStr = item.productId.toString();
                if (pMap[pidStr]) {
                    item.productId = pMap[pidStr];
                }
                // If not found in map, leave as ID (better than null)
            }
        }
    }

    console.log('Found stock moves:', items.length);
    res.json(items);
  } catch (err) {
    console.error('Error listing stock moves:', err);
    res.status(500).json({ error: 'Failed to list stock moves' });
  }
});

app.put('/api/my/stock-moves/:id', auth, requireDistributorOrStaff(null), async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, note } = req.body;
    const { distributorId } = getContext(req);

    const move = await StockMove.findById(id);
    if (!move) return res.status(404).json({ error: 'Move not found' });
    if (String(move.distributorId) !== String(distributorId)) return res.status(403).json({ error: 'Access denied' });

    if (req.user.role === 'staff') {
       const p = req.user.permissions || [];
       if (move.type === 'IN' && !p.includes('stock_in')) return res.status(403).json({ error: 'Permission denied' });
       if (move.type === 'OUT' && !p.includes('stock_out')) return res.status(403).json({ error: 'Permission denied' });
    }

    const newQty = Number(quantity);
    if (isNaN(newQty) || newQty <= 0) return res.status(400).json({ error: 'Invalid quantity' });

    const oldQty = move.quantity;
    const diff = newQty - oldQty;

    if (diff !== 0) {
      const inv = await Inventory.findOne({ distributorId, productId: move.productId });
      let change = move.type === 'IN' ? diff : -diff;
      if (!inv) {
         await Inventory.updateOne(
           { distributorId, productId: move.productId },
           { $inc: { quantity: change } },
           { upsert: true }
         );
      } else {
         inv.quantity += change;
         await inv.save();
      }
    }

    move.quantity = newQty;
    if (note !== undefined) move.note = note;
    await move.save();

    res.json(move);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update stock move' });
  }
});

app.delete('/api/my/stock-moves/:id', auth, requireDistributorOrStaff(null), async (req, res) => {
  try {
    const { id } = req.params;
    const { distributorId } = getContext(req);
    const move = await StockMove.findById(id);
    if (!move) return res.status(404).json({ error: 'Move not found' });
    if (String(move.distributorId) !== String(distributorId)) return res.status(403).json({ error: 'Access denied' });
    if (req.user.role === 'staff') {
      const p = req.user.permissions || [];
      if (move.type === 'IN' && !p.includes('stock_in')) return res.status(403).json({ error: 'Permission denied' });
      if (move.type === 'OUT' && !p.includes('stock_out')) return res.status(403).json({ error: 'Permission denied' });
    }
    const qty = Number(move.quantity)||0;
    const delta = move.type === 'IN' ? -qty : qty; // reverse effect
    await Inventory.updateOne(
      { distributorId, productId: move.productId },
      { $inc: { quantity: delta } },
      { upsert: true }
    );
    await StockMove.deleteOne({ _id: move._id });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete stock move' });
  }
});

// Retailer adjustment
app.post('/api/my/retailer-adjustment', auth, requireDistributorOrStaff('payment_cash'), async (req, res) => {
  try {
    const { distributorId, staffId } = getContext(req);
    const { retailerId, amount, note, date } = req.body;

    if (!retailerId) return res.status(400).json({ error: 'Retailer required' });
    const amt = Number(amount);
    if (isNaN(amt) || amt === 0) return res.status(400).json({ error: 'Valid amount required' });

    const retailer = await User.findOne({ _id: retailerId, distributorId, role: 'retailer' });
    if (!retailer) return res.status(404).json({ error: 'Retailer not found' });
    
    const adjDate = date ? new Date(date) : new Date();

    // Create transaction
    await Transaction.create({
      distributorId,
      retailerId,
      createdByStaffId: staffId,
      type: 'adjustment',
      amount: amt, // Store signed amount to indicate Debit (+) or Credit (-)
      note: note || 'Balance Adjustment',
      createdAt: adjDate
    });
    
    // Update retailer balance
    // If amt is positive, we add to balance (Debit). If negative, we subtract (Credit).
    await User.updateOne({ _id: retailerId }, { $inc: { currentBalance: amt } });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to record adjustment' });
  }
});

// Update Transaction (Adjustment, Cash, Online)
app.put('/api/my/transactions/:id', auth, requireDistributorOrStaff(null), async (req, res) => {
    try {
        const { distributorId } = getContext(req);
        const { amount, note, date } = req.body;
        
        const tx = await Transaction.findOne({ _id: req.params.id, distributorId });
        if(!tx) return res.status(404).json({ error: 'Transaction not found' });

        // Permission check for staff
        if (req.user.role === 'staff') {
             const p = req.user.permissions || [];
             if (tx.type === 'payment_cash' && !p.includes('payment_cash')) return res.status(403).json({ error: 'Permission denied' });
             if (tx.type === 'payment_online' && !p.includes('payment_online')) return res.status(403).json({ error: 'Permission denied' });
             // For adjustment, we might need a specific permission, or allow if they have payment permissions?
             // For now, let's assume if they can access the UI, they can edit adjustment if they created it?
             // Or maybe we don't restrict adjustment editing for staff yet beyond general access.
        }
        
        if(!['adjustment', 'payment_cash', 'payment_online'].includes(tx.type)) {
             return res.status(400).json({ error: 'Only adjustments and payments can be edited' });
        }
        
        const oldAmount = tx.amount;
        const newAmount = amount !== undefined ? Number(amount) : oldAmount;
        
        if(amount !== undefined){
            let diff = 0;
            if(tx.type === 'adjustment') {
                 diff = newAmount - oldAmount;
            } else {
                 // Payment: Balance = Balance + Old - New (Inverse effect)
                 diff = oldAmount - newAmount;
            }
            await User.updateOne({ _id: tx.retailerId }, { $inc: { currentBalance: diff } });
            tx.amount = newAmount;
        }
        
        if(note !== undefined) tx.note = note;
        if(date !== undefined) tx.createdAt = new Date(date);
        
        await tx.save();
        res.json({ ok: true });
    } catch(e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to update transaction' });
    }
});

// Delete Transaction (Adjustment, Cash, Online)
app.delete('/api/my/transactions/:id', auth, requireDistributorOrStaff(null), async (req, res) => {
    try {
        const { distributorId } = getContext(req);
        
        const tx = await Transaction.findOne({ _id: req.params.id, distributorId });
        if(!tx) return res.status(404).json({ error: 'Transaction not found' });
        
        // Permission check for staff
        if (req.user.role === 'staff') {
             const p = req.user.permissions || [];
             if (tx.type === 'payment_cash' && !p.includes('payment_cash')) return res.status(403).json({ error: 'Permission denied' });
             if (tx.type === 'payment_online' && !p.includes('payment_online')) return res.status(403).json({ error: 'Permission denied' });
        }

        if(!['adjustment', 'payment_cash', 'payment_online'].includes(tx.type)) {
             return res.status(400).json({ error: 'Only adjustments and payments can be deleted' });
        }
        
        let revertAmount = 0;
        if(tx.type === 'adjustment') {
             // Revert adjustment: -amount
             revertAmount = -tx.amount;
        } else {
             // Revert payment: +amount (since payment reduced balance)
             revertAmount = tx.amount;
        }
        await User.updateOne({ _id: tx.retailerId }, { $inc: { currentBalance: revertAmount } });
        
        await Transaction.deleteOne({ _id: tx._id });
        res.json({ ok: true });
    } catch(e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to delete transaction' });
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

    if (retailerId) {
       try { filter.retailerId = new mongoose.Types.ObjectId(String(retailerId)); } catch {}
    }
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
    
    let query = Transaction.find(filter)
      .populate('retailerId', 'name sortOrder')
      .populate('createdByStaffId', 'name')
      .sort({ createdAt: -1 });

    if (req.query.populateOrders === 'true') {
        query = query.populate('referenceId');
    }

    const items = await query;
    let results = items.map(i => i.toObject());

    if (req.query.populateOrders === 'true') {
      try {
        const pIds = new Set();
        results.forEach(tx => {
          if (tx.referenceId && Array.isArray(tx.referenceId.items)) {
            tx.referenceId.items.forEach(item => {
              if (item.productId) pIds.add(item.productId.toString());
            });
          }
        });

        if (pIds.size > 0) {
          const ids = Array.from(pIds);
          const [prods, dProds] = await Promise.all([
            Product.find({ _id: { $in: ids } }).select('nameEnglish nameHindi unit').lean(),
            DistProduct.find({ _id: { $in: ids } }).select('nameEnglish nameHindi unit').lean()
          ]);

          const pMap = {};
          prods.forEach(p => pMap[p._id.toString()] = p);
          dProds.forEach(p => pMap[p._id.toString()] = p);

          results.forEach(tx => {
            if (tx.referenceId && Array.isArray(tx.referenceId.items)) {
              tx.referenceId.items.forEach(item => {
                if (item.productId) {
                  item.productId = pMap[item.productId.toString()] || { nameEnglish: 'Unknown Product', _id: item.productId };
                }
              });
            }
          });
        }
      } catch (err) {
        console.error('Error populating orders:', err);
        // Continue without population rather than failing
      }
    }

    console.log('Found transactions:', results.length);
    res.json(results);
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

app.get('/api/retailer/transactions', auth, requireRetailer, async (req, res) => {
  try {
    const { type, from, to } = req.query;
    const filter = { retailerId: req.user._id };
    
    if (type) filter.type = type;
    if (from || to) {
      filter.createdAt = {};
      if (from) {
        const d = new Date(String(from));
        if (!isNaN(d.getTime())) {
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
      .populate('distributorId', 'name')
      .populate({
        path: 'referenceId',
        populate: {
          path: 'items.productId',
          select: 'nameEnglish nameHindi unit',
          populate: { path: 'unit', populate: { path: 'firstUnit secondUnit' } }
        }
      })
      .sort({ createdAt: -1 })
      .lean();
      
    const results = items.map(t => {
      if (t.type === 'order' && t.referenceId && t.referenceId.items) {
        t.items = t.referenceId.items;
        // clear referenceId to avoid circular/large payload if not needed, but keeping it is fine.
        // t.referenceId = t.referenceId._id; // optional
      }
      return t;
    });
    
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list transactions' });
  }
});

app.post('/api/my/stock-in', auth, requireDistributorOrStaff('stock_in'), async (req, res) => {
  try {
    const { distributorId, staffId } = getContext(req);
    const { productId, quantity, note, supplierId, createdAt } = req.body;
    
    console.log(`STOCK-IN: User ${req.user.name} (${req.user._id}) Dist ${distributorId} Prod ${productId} Qty ${quantity}`);

    if (!productId || typeof quantity !== 'number') return res.status(400).json({ error: 'productId and quantity required' });
    if (quantity <= 0) return res.status(400).json({ error: 'quantity must be > 0' });
    const pid = new mongoose.Types.ObjectId(String(productId));
    let prod = await Product.findById(pid);
    if (!prod) prod = await DistProduct.findOne({ _id: pid, distributorId });
    if (!prod) {
        console.log(`STOCK-IN ERROR: Product ${pid} not found in Product or DistProduct for dist ${distributorId}`);
        return res.status(404).json({ error: 'product not found' });
    }
    
    let sid = null;
    if (supplierId) {
       try { sid = new mongoose.Types.ObjectId(String(supplierId)); } catch {}
    }
    const date = createdAt ? new Date(String(createdAt)) : new Date();

    await Inventory.updateOne(
      { distributorId, productId: pid },
      { $inc: { quantity: quantity } },
      { upsert: true }
    );
    
    let price = 0;
    const dr = await Rate.findOne({ distributorId, productId: pid });
    if (dr) {
       price = dr.price;
       if(dr.history && dr.history.length > 0){
           const sorted = [...dr.history].sort((a,b) => new Date(b.date) - new Date(a.date));
           const match = sorted.find(h => new Date(h.date) <= date);
           if(match) price = match.price;
       }
    }
    else {
      const gr = await GlobalRate.findOne({ productId: pid });
      if(gr) price = gr.price;
    }

    if (price === 0 && prod.price) price = prod.price;

    await StockMove.create({
      distributorId,
      productId: pid,
      type: 'IN',
      quantity,
      price,
      note,
      supplierId: sid,
      createdByStaffId: staffId,
      createdAt: date
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
    let { items, retailerId, note, createdAt } = req.body;
    
    // Support legacy single item request
    if (!items && req.body.productId) {
       items = [{ productId: req.body.productId, quantity: req.body.quantity }];
    }
    
    if (!items || !items.length || !retailerId) return res.status(400).json({ error: 'items and retailerId required' });

    const rid = new mongoose.Types.ObjectId(String(retailerId));
    const ret = await User.findOne({ _id: rid, role: 'retailer', distributorId });
    if (!ret) return res.status(404).json({ error: 'retailer not found' });

    const date = createdAt ? new Date(createdAt) : new Date();
    const orderItems = [];
    let grandTotal = 0;
    const stockMoves = [];

    for (const item of items) {
        const pid = new mongoose.Types.ObjectId(String(item.productId));
        const qty = Number(item.quantity);
        if (qty <= 0) continue;

        // Calculate Price FIRST
        let pObj = await Product.findById(pid).populate('unit');
        if(!pObj) pObj = await DistProduct.findOne({ _id: pid, distributorId }).populate('unit');
        
        if (!pObj) continue;

        let price = 0;
        const rr = await RetailerRate.findOne({ distributorId, retailerId: rid, productId: pid });
        if (rr) price = rr.price;
        else {
          const dr = await Rate.findOne({ distributorId, productId: pid });
          if (dr) {
             price = dr.price;
             // Check history for date-effective price
             if(dr.history && dr.history.length > 0){
                 const sorted = [...dr.history].sort((a,b) => new Date(b.date) - new Date(a.date));
                 const match = sorted.find(h => new Date(h.date) <= date);
                 if(match) price = match.price;
             }
          }
          else {
            const gr = await GlobalRate.findOne({ productId: pid });
            if(gr) price = gr.price;
          }
        }
        
        if (price === 0 && pObj.price) price = pObj.price;

        // Inventory update (allow negative)
        await Inventory.updateOne(
          { distributorId, productId: pid },
          { $inc: { quantity: -qty } },
          { upsert: true }
        );

        // Create Stock Move
        const sm = await StockMove.create({
            distributorId,
            productId: pid,
            retailerId: rid,
            type: 'OUT',
            quantity: qty,
            price: price,
            note,
            createdByStaffId: staffId,
            createdAt: date
        });
        stockMoves.push(sm);

        const u = pObj ? pObj.unit : null;
        const isCompound = u && String(u.type) === 'Compound';
        const conv = isCompound ? Number(u.conversionFactor)||0 : 0;
        let itemTotal = 0;
        if(isCompound && conv > 0){
           itemTotal = (price / conv) * qty;
        } else {
           itemTotal = price * qty;
        }
        
        grandTotal += itemTotal;
        orderItems.push({ productId: pid, quantity: qty, price });
    }

    if (orderItems.length === 0) return res.status(400).json({ error: 'No valid items' });

    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);

    let order = await Order.findOne({ retailerId: rid, distributorId, createdAt: { $gte: start, $lte: end } }).sort({ createdAt: 1 });

    if (order) {
        order.items = (order.items || []).concat(orderItems);
        order.totalAmount = Number(order.totalAmount || 0) + grandTotal;
        if (note) order.note = note;
        await order.save();

        await User.findByIdAndUpdate(rid, { $inc: { currentBalance: grandTotal } });
        const tx = await Transaction.findOne({ distributorId, retailerId: rid, type: 'order', referenceId: order._id });
        if (tx) {
            tx.amount = Number(tx.amount || 0) + grandTotal;
            await tx.save();
        } else {
            await Transaction.create({ distributorId, retailerId: rid, type: 'order', amount: grandTotal, referenceId: order._id, note: note || 'Stock Out via Distributor App', createdByStaffId: staffId, createdAt: order.createdAt });
        }
    } else {
        order = await Order.create({ retailerId: rid, distributorId, items: orderItems, totalAmount: grandTotal, status: 'delivered', note: note || 'Stock Out via Distributor App', createdAt: date });
        await User.findByIdAndUpdate(rid, { $inc: { currentBalance: grandTotal } });
        await Transaction.create({ distributorId, retailerId: rid, type: 'order', amount: grandTotal, referenceId: order._id, note: note || 'Stock Out via Distributor App', createdByStaffId: staffId, createdAt: date });
    }

    res.json({ ok: true, moves: stockMoves.length, orderId: order._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to stock out' });
  }
});

// Record stock wastage (OUT without retailer/supplier, no financials)
    app.post('/api/my/stock-wastage', auth, requireDistributorOrStaff('stock_out'), async (req, res) => {
      try {
        const { distributorId, staffId } = getContext(req);
        const { items, note, createdAt } = req.body;
        if (!items || !items.length) return res.status(400).json({ error: 'items required' });
        const date = createdAt ? new Date(createdAt) : new Date();
        let created = 0;
        for (const item of items) {
          const pid = new mongoose.Types.ObjectId(String(item.productId));
          const qty = Number(item.quantity);
          if (!pid || !qty || qty <= 0) continue;
          
          // Check Product or DistProduct
          let exists = await Product.exists({ _id: pid });
          if (!exists) exists = await DistProduct.exists({ _id: pid, distributorId });
          
          if (!exists) {
              console.log(`WASTAGE ERROR: Product ${pid} not found for dist ${distributorId}`);
              continue;
          }

          await Inventory.updateOne(
        { distributorId, productId: pid },
        { $inc: { quantity: -qty } },
        { upsert: true }
      );
      await StockMove.create({
        distributorId,
        productId: pid,
        type: 'OUT',
        quantity: qty,
        note: note || 'WASTAGE',
        createdByStaffId: staffId,
        createdAt: date
      });
      created++;
    }
    if (created === 0) return res.status(400).json({ error: 'No valid items' });
    res.json({ ok: true, moves: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to record wastage' });
  }
});

// Record stock OUT to supplier (returns/supplies), no financials
app.post('/api/my/stock-out-supplier', auth, requireDistributorOrStaff('stock_in'), async (req, res) => {
  try {
    const { distributorId, staffId } = getContext(req);
    const { supplierId, items, note, createdAt } = req.body;
    if (!supplierId) return res.status(400).json({ error: 'supplierId required' });
    if (!items || !items.length) return res.status(400).json({ error: 'items required' });
    const sid = new mongoose.Types.ObjectId(String(supplierId));
    const sup = await Supplier.findOne({ _id: sid, distributorId });
    if (!sup) {
      // Diagnostic check
      const exists = await Supplier.findById(sid);
      if(exists) {
         return res.status(404).json({ error: `supplier found but distId mismatch (req: ${distributorId}, db: ${exists.distributorId})` });
      }
      return res.status(404).json({ error: `supplier not found (id: ${sid})` });
    }
    const rawCreatedAt = createdAt;
    const date = rawCreatedAt ? new Date(rawCreatedAt) : new Date();
    const dayKey =
      typeof rawCreatedAt === 'string' && rawCreatedAt.length >= 10
        ? rawCreatedAt.slice(0, 10)
        : date.toISOString().split('T')[0];

    let startOfDay;
    let endOfDay;
    if (typeof rawCreatedAt === 'string' && rawCreatedAt.length === 10) {
      const d = new Date(dayKey);
      d.setMinutes(d.getMinutes() - 330);
      startOfDay = d;
      endOfDay = new Date(d);
      endOfDay.setTime(d.getTime() + 86400000 - 1);
    } else {
      startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);
    }

    let created = 0;
    for (const item of items) {
      const pid = new mongoose.Types.ObjectId(String(item.productId));
      const qty = Number(item.quantity);
      if (!pid || isNaN(qty) || qty < 0) continue;

      // Validate Product Existence
      let exists = await Product.exists({ _id: pid });
      if (!exists) exists = await DistProduct.exists({ _id: pid, distributorId });
      
      if (!exists) {
          console.log(`STOCK-OUT-SUPPLIER ERROR: Product ${pid} not found for dist ${distributorId}`);
          continue;
      }

      const match = {
        distributorId,
        supplierId: sid,
        productId: pid,
        type: 'OUT',
        $or: [{ dayKey }, { createdAt: { $gte: startOfDay, $lte: endOfDay } }],
      };

      const existingMoves = await StockMove.find(match).select({ _id: 1, quantity: 1 });
      const oldTotal = existingMoves.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
      const diff = qty - oldTotal;

      if (diff !== 0) {
        await Inventory.updateOne(
          { distributorId, productId: pid },
          { $inc: { quantity: -diff } },
          { upsert: true }
        );
      }

      if (existingMoves.length > 0) {
        await StockMove.deleteMany({ _id: { $in: existingMoves.map((m) => m._id) } });
      }

      if (qty > 0) {
        await StockMove.create({
          distributorId,
          productId: pid,
          supplierId: sid,
          dayKey,
          type: 'OUT',
          quantity: qty,
          note: note || 'OUT TO SUPPLIER',
          createdByStaffId: staffId,
          createdAt: startOfDay,
        });
      }

      if (diff !== 0 || existingMoves.length > 0) created++;
    }
    // If we processed items (even clearings), return success
    if (created === 0 && items.length > 0) {
       // It's possible all items were "no change", so just return success
       return res.json({ ok: true, moves: 0, message: 'No changes detected' });
    }
    res.json({ ok: true, moves: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to stock out to supplier' });
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
    
    console.log('POST /api/my/transactions params:', { distributorId, retailerId, type, amount });

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
    console.error('POST /api/my/transactions error:', err);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

app.post('/api/my/recompute-order', auth, requireDistributorOrStaff(null), async (req, res) => {
  try {
    const { distributorId, staffId } = getContext(req);
    const { retailerId, date } = req.body;
    if (!retailerId || !date) return res.status(400).json({ error: 'retailerId and date required' });
    const rid = new mongoose.Types.ObjectId(String(retailerId));
    const ret = await User.findOne({ _id: rid, role: 'retailer', distributorId });
    if (!ret) return res.status(404).json({ error: 'retailer not found' });

    const d = new Date(String(date));
    const start = new Date(d); start.setUTCHours(0,0,0,0);
    const end = new Date(d); end.setUTCHours(23,59,59,999);

    const moves = await StockMove.find({ distributorId, retailerId: rid, type: 'OUT', createdAt: { $gte: start, $lte: end } });
    const byProd = new Map();
    for (const m of moves) {
      const pid = m.productId;
      if (!pid) continue;
      const pidStr = pid.toString();
      const qty = Number(m.quantity)||0;
      byProd.set(pidStr, (byProd.get(pidStr)||0) + qty);
    }
    const items = [];
    let grandTotal = 0;
    for (const [pidStr, qty] of byProd.entries()) {
      const pid = new mongoose.Types.ObjectId(pidStr);
      let pObj = await Product.findById(pid).populate('unit');
      if(!pObj) pObj = await DistProduct.findById(pid).populate('unit');
      const u = pObj ? pObj.unit : null;
      const isCompound = u && String(u.type) === 'Compound';
      const conv = isCompound ? Number(u.conversionFactor)||0 : 0;
      let price = 0;
      const rr = await RetailerRate.findOne({ distributorId, retailerId: rid, productId: pid });
      if (rr) price = rr.price; else {
        const dr = await Rate.findOne({ distributorId, productId: pid });
        if (dr) {
           price = dr.price;
           // Check history for date-effective price
           if(dr.history && dr.history.length > 0){
               const sorted = [...dr.history].sort((a,b) => new Date(b.date) - new Date(a.date));
               const match = sorted.find(h => new Date(h.date) <= d); // d is the date of recompute
               if(match) price = match.price;
           }
        } else {
          const gr = await GlobalRate.findOne({ productId: pid }); if(gr) price = gr.price;
        }
      }
      items.push({ productId: pid, quantity: qty, price });
      if(isCompound && conv > 0) grandTotal += (price / conv) * qty; else grandTotal += price * qty;
    }

    let order = await Order.findOne({ retailerId: rid, distributorId, createdAt: { $gte: start, $lte: end } }).sort({ createdAt: 1 });
    let delta = 0;
    if (order) {
      const prev = Number(order.totalAmount)||0;
      order.items = items;
      order.totalAmount = grandTotal;
      order.status = 'delivered';
      await order.save();
      const tx = await Transaction.findOne({ distributorId, retailerId: rid, type: 'order', referenceId: order._id });
      if (tx) {
        delta = grandTotal - Number(tx.amount||0);
        tx.amount = grandTotal;
        await tx.save();
      } else {
        delta = grandTotal;
        await Transaction.create({ distributorId, retailerId: rid, type: 'order', amount: grandTotal, referenceId: order._id, createdByStaffId: staffId, createdAt: order.createdAt });
      }
    } else {
      order = await Order.create({ retailerId: rid, distributorId, items, totalAmount: grandTotal, status: 'delivered', createdAt: start });
      await Transaction.create({ distributorId, retailerId: rid, type: 'order', amount: grandTotal, referenceId: order._id, createdByStaffId: staffId, createdAt: order.createdAt });
      delta = grandTotal;
    }

    if (delta !== 0) await User.findByIdAndUpdate(rid, { $inc: { currentBalance: delta } });
    res.json({ ok: true, itemsCount: items.length, grandTotal, delta, orderId: order._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to recompute order' });
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

app.get('/api/my/rates/history', auth, requireDistributorOrStaff(null), async (req, res) => {
  try {
    const { productId } = req.query;
    const { distributorId } = getContext(req);
    const filter = { distributorId };
    if (productId) filter.productId = productId;
    const rates = await Rate.find(filter).populate('productId', 'nameEnglish nameHindi');
    res.json(rates);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rate history' });
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
    const { productId, price, effectiveDate } = req.body;
    if (!productId || typeof price !== 'number') return res.status(400).json({ error: 'productId and price required' });
    const pid = new mongoose.Types.ObjectId(String(productId));
    const date = effectiveDate ? new Date(effectiveDate) : new Date();

    let existing = await Rate.findOne({ productId: pid, distributorId: req.user._id });
    if (existing) {
      existing.history.push({ date, price });
      existing.history.sort((a, b) => b.date - a.date);
      const now = new Date();
      const current = existing.history.find(h => h.date <= now) || existing.history[0];
      existing.price = current.price;
      await existing.save();
      return res.json(existing);
    }
    const created = await Rate.create({ 
      productId: pid, 
      distributorId: req.user._id, 
      price,
      history: [{ date, price }]
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to set rate' });
  }
});



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
