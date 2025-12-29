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

const mongoUri = 'mongodb+srv://mukesh:12345678%401@cluster0.0cyzopy.mongodb.net/amul_dist_app?appName=Cluster0';
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
    retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    price: { type: Number, required: true },
  },
  { timestamps: true }
);
const RetailerRate = mongoose.model('RetailerRate', retailerRateSchema);

const orderSchema = new mongoose.Schema(
  {
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    date: { type: Date, default: Date.now },
    totalAmount: { type: Number, required: true },
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);

const paymentSchema = new mongoose.Schema(
  {
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number, required: true },
    mode: { type: String, enum: ['Cash', 'UPI', 'Cheque', 'Bank Transfer'], required: true },
    date: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { timestamps: true }
);

const Payment = mongoose.model('Payment', paymentSchema);

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.active) return res.status(403).json({ error: 'User is inactive' });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user._id, name: user.name, role: user.role, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, email, role, password, phone, address, distributorId, permissions, createdByStaffId } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({ name, email, role, passwordHash, phone, address, distributorId, permissions, createdByStaffId });
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const { role, distributorId } = req.query;
    const query = {};
    if (role) query.role = role;
    if (distributorId) query.distributorId = distributorId;
    const users = await User.find(query);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { name, email, role, active, phone, address, permissions, password } = req.body;
    const updateData = { name, email, role, active, phone, address, permissions };
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { nameEnglish, nameHindi, unit } = req.body;
    const product = new Product({ nameEnglish, nameHindi, unit });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().populate('unit');
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { nameEnglish, nameHindi, active, unit } = req.body;
    const product = await Product.findByIdAndUpdate(req.params.id, { nameEnglish, nameHindi, active, unit }, { new: true });
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/units', async (req, res) => {
  try {
    const { type, symbol, formalName, decimalPlaces, firstUnit, secondUnit, conversionFactor } = req.body;
    const unit = new Unit({ type, symbol, formalName, decimalPlaces, firstUnit, secondUnit, conversionFactor });
    await unit.save();
    res.status(201).json(unit);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/units', async (req, res) => {
  try {
    const units = await Unit.find().populate('firstUnit secondUnit');
    res.json(units);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/units/:id', async (req, res) => {
  try {
    const { type, symbol, formalName, decimalPlaces, firstUnit, secondUnit, conversionFactor } = req.body;
    const unit = await Unit.findByIdAndUpdate(req.params.id, { type, symbol, formalName, decimalPlaces, firstUnit, secondUnit, conversionFactor }, { new: true });
    res.json(unit);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/units/:id', async (req, res) => {
  try {
    await Unit.findByIdAndDelete(req.params.id);
    res.json({ message: 'Unit deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rates', async (req, res) => {
  try {
    const { productId, distributorId, price } = req.body;
    const rate = await Rate.findOneAndUpdate(
      { productId, distributorId },
      { price },
      { new: true, upsert: true }
    );
    res.json(rate);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/rates', async (req, res) => {
  try {
    const { distributorId } = req.query;
    const query = {};
    if (distributorId) query.distributorId = distributorId;
    const rates = await Rate.find(query).populate('productId');
    res.json(rates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/global-rates', async (req, res) => {
  try {
    const { productId, price } = req.body;
    const globalRate = await GlobalRate.findOneAndUpdate(
      { productId },
      { price },
      { new: true, upsert: true }
    );
    res.json(globalRate);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/global-rates', async (req, res) => {
  try {
    const globalRates = await GlobalRate.find().populate('productId');
    res.json(globalRates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/retailer-rates', async (req, res) => {
  try {
    const { productId, retailerId, price } = req.body;
    const retailerRate = await RetailerRate.findOneAndUpdate(
      { productId, retailerId },
      { price },
      { new: true, upsert: true }
    );
    res.json(retailerRate);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/retailer-rates', async (req, res) => {
  try {
    const { retailerId } = req.query;
    const query = {};
    if (retailerId) query.retailerId = retailerId;
    const retailerRates = await RetailerRate.find(query).populate('productId');
    res.json(retailerRates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { distributorId, retailerId, staffId, items, totalAmount } = req.body;
    const order = new Order({ distributorId, retailerId, staffId, items, totalAmount });
    await order.save();
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const { distributorId, retailerId, staffId, startDate, endDate } = req.query;
    const query = {};
    if (distributorId) query.distributorId = distributorId;
    if (retailerId) query.retailerId = retailerId;
    if (staffId) query.staffId = staffId;
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    const orders = await Order.find(query)
      .populate('retailerId', 'name')
      .populate('staffId', 'name')
      .populate('items.productId', 'nameEnglish nameHindi unit')
      .sort({ date: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/payments', async (req, res) => {
  try {
    const { distributorId, retailerId, staffId, amount, mode, notes } = req.body;
    const payment = new Payment({ distributorId, retailerId, staffId, amount, mode, notes });
    await payment.save();

    await User.findByIdAndUpdate(retailerId, { $inc: { currentBalance: -amount } });

    res.status(201).json(payment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/payments', async (req, res) => {
  try {
    const { distributorId, retailerId, staffId, startDate, endDate } = req.query;
    const query = {};
    if (distributorId) query.distributorId = distributorId;
    if (retailerId) query.retailerId = retailerId;
    if (staffId) query.staffId = staffId;
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    const payments = await Payment.find(query)
      .populate('retailerId', 'name')
      .populate('staffId', 'name')
      .sort({ date: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/ledger', async (req, res) => {
  try {
    const { retailerId, startDate, endDate } = req.query;
    const start = new Date(startDate || 0);
    const end = new Date(endDate || Date.now());

    const orders = await Order.find({ retailerId, date: { $gte: start, $lte: end } });
    const payments = await Payment.find({ retailerId, date: { $gte: start, $lte: end } });

    const ledger = [
      ...orders.map(o => ({ date: o.date, type: 'Order', amount: o.totalAmount, details: o })),
      ...payments.map(p => ({ date: p.date, type: 'Payment', amount: p.amount, details: p }))
    ].sort((a, b) => a.date - b.date);

    res.json(ledger);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(port, () => console.log(`Server running on port ${port}`));
  })
  .catch((err) => console.error('MongoDB connection error:', err));
