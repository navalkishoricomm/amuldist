const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/amul_dist_app';

const userSchema = new mongoose.Schema({ name: String, role: String });
const orderSchema = new mongoose.Schema({ retailerId: mongoose.Schema.Types.ObjectId, distributorId: mongoose.Schema.Types.ObjectId, items: Array, totalAmount: Number }, { timestamps: true });
const txSchema = new mongoose.Schema({ distributorId: mongoose.Schema.Types.ObjectId, retailerId: mongoose.Schema.Types.ObjectId, type: String, amount: Number, referenceId: mongoose.Schema.Types.ObjectId }, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', txSchema);

function parseIst(dateStr, timeStr){
  const iso = `${dateStr}T${timeStr}:00+05:30`;
  const d = new Date(iso);
  return d;
}

async function main(){
  const [dateStr, timeStr, retailerName] = process.argv.slice(2);
  if(!dateStr || !timeStr || !retailerName){
    console.log('Usage: node delete_order_by_time.js YYYY-MM-DD HH:mm "Retailer Name"');
    process.exit(1);
  }
  await mongoose.connect(mongoUri);
  const target = parseIst(dateStr, timeStr); // IST
  const start = new Date(target.getTime() - 5*60*1000);
  const end = new Date(target.getTime() + 5*60*1000);
  let orders = [];
  let retailer = null;
  if (retailerName === '*') {
    orders = await Order.find({ createdAt: { $gte: start, $lte: end } }).sort({ createdAt: 1 });
  } else {
    retailer = await User.findOne({ role: 'retailer', name: retailerName });
    if(!retailer){
      console.log(JSON.stringify({ ok:false, error:'retailer_not_found', retailerName }));
      process.exit(2);
    }
    orders = await Order.find({ retailerId: retailer._id, createdAt: { $gte: start, $lte: end } }).sort({ createdAt: 1 });
  }
  if(orders.length === 0){
    console.log(JSON.stringify({ ok:false, error:'order_not_found', retailerId: retailer._id, dateStr, timeStr, start, end }));
    process.exit(3);
  }
  let deleted = 0;
  let balanceAdjust = 0;
  for(const o of orders){
    const txs = await Transaction.find({ referenceId: o._id, type: 'order' });
    const amt = Number(o.totalAmount)||0;
    balanceAdjust += amt;
    await Order.deleteOne({ _id: o._id });
    if(txs.length>0){
      const ids = txs.map(t=>t._id);
      await Transaction.deleteMany({ _id: { $in: ids } });
    }
    deleted++;
  }
  // Reverse balance increase from orders
  if (retailer || (orders[0] && orders[0].retailerId)) {
    const rid = retailer ? retailer._id : orders[0].retailerId;
    await User.updateOne({ _id: rid }, { $inc: { currentBalance: -balanceAdjust } });
  }
  console.log(JSON.stringify({ ok:true, retailerName, ordersDeleted: deleted, balanceAdjust }));
  await mongoose.disconnect();
}

main().catch(async (e)=>{ console.error(e); try{ await mongoose.disconnect(); } catch{} process.exit(1); });
