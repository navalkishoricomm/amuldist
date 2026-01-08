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

function dayRange(dateStr){
  const from = new Date(dateStr);
  from.setMinutes(from.getMinutes() - 330);
  const to = new Date(dateStr);
  to.setUTCHours(23, 59, 59, 999);
  return { from, to };
}

async function main(){
  const arg = process.argv[2];
  if (!arg || !/^\d{4}-\d{2}-\d{2}$/.test(arg)) {
    console.log('Usage: node merge_orders_by_day.js YYYY-MM-DD');
    process.exit(1);
  }
  await mongoose.connect(mongoUri);
  const { from, to } = dayRange(arg);
  const orders = await Order.find({ createdAt: { $gte: from, $lte: to } }).sort({ retailerId: 1, createdAt: 1 });
  const byRetailer = new Map();
  for(const o of orders){
    const k = String(o.retailerId);
    if(!byRetailer.has(k)) byRetailer.set(k, []);
    byRetailer.get(k).push(o);
  }
  let mergedGroups = 0;
  let newOrders = 0;
  for(const [rid, list] of byRetailer.entries()){
    if(list.length <= 1) continue;
    mergedGroups++;
    const distributorId = list[0].distributorId;
    const createdAt = list[list.length - 1].createdAt;
    let items = [];
    let total = 0;
    for(const o of list){
      if(Array.isArray(o.items)) items = items.concat(o.items);
      total += Number(o.totalAmount)||0;
    }
    const order = await Order.create({ retailerId: list[0].retailerId, distributorId, items, totalAmount: total, status: 'delivered', note: (list[0].note||'') + ' (Merged Daily)', createdAt });
    await Transaction.create({ distributorId, retailerId: list[0].retailerId, type: 'order', amount: total, referenceId: order._id, note: 'Merged Daily', createdAt });
    const oldIds = list.map(o=>o._id);
    const txs = await Transaction.find({ referenceId: { $in: oldIds } });
    const txIds = txs.map(t=>t._id);
    await Order.deleteMany({ _id: { $in: oldIds } });
    await Transaction.deleteMany({ _id: { $in: txIds } });
    newOrders++;
  }
  console.log(JSON.stringify({ date: arg, retailersProcessed: byRetailer.size, mergedGroups, newOrders }));
  await mongoose.disconnect();
}

main().catch(async (e)=>{ console.error(e); try{ await mongoose.disconnect(); } catch{} process.exit(1); });

