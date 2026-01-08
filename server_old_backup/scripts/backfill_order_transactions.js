const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/amul_dist_app';

const orderSchema = new mongoose.Schema({
  retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [{ productId: { type: mongoose.Schema.Types.ObjectId }, quantity: Number, price: Number }],
  totalAmount: Number,
  status: String,
  note: String
}, { timestamps: true });

const transactionSchema = new mongoose.Schema({
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: String,
  amount: Number,
  referenceId: { type: mongoose.Schema.Types.ObjectId },
  note: String,
  createdByStaffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

async function main() {
  const arg = process.argv[2];
  if (!arg || !/^\d{4}-\d{2}-\d{2}$/.test(arg)) {
    console.log('Usage: node backfill_order_transactions.js YYYY-MM-DD');
    process.exit(1);
  }
  await mongoose.connect(mongoUri);
  const from = new Date(arg);
  from.setMinutes(from.getMinutes() - 330);
  const to = new Date(arg);
  to.setUTCHours(23, 59, 59, 999);
  const orders = await Order.find({ createdAt: { $gte: from, $lte: to } }).sort({ createdAt: 1 });
  let created = 0;
  let skipped = 0;
  for (const o of orders) {
    const exists = await Transaction.findOne({ referenceId: o._id, type: 'order' });
    if (exists) { skipped++; continue; }
    await Transaction.create({
      distributorId: o.distributorId,
      retailerId: o.retailerId,
      type: 'order',
      amount: Number(o.totalAmount) || 0,
      referenceId: o._id,
      note: o.note || 'Order Backfill',
      createdByStaffId: undefined,
      createdAt: o.createdAt
    });
    created++;
  }
  console.log(JSON.stringify({ date: arg, orders: orders.length, created, skipped }));
  await mongoose.disconnect();
}

main().catch(async (e) => { console.error(e); try { await mongoose.disconnect(); } catch {} process.exit(1); });

