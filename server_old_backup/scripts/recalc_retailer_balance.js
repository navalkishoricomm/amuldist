const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/amul_dist_app';

async function main(){
  const retailerName = process.argv.slice(2).join(' ').trim();
  if(!retailerName){
    console.log('Usage: node recalc_retailer_balance.js "Retailer Name"');
    process.exit(1);
  }
  await mongoose.connect(mongoUri);
  const Users = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Tx = mongoose.model('Transaction', new mongoose.Schema({
    retailerId: mongoose.Schema.Types.ObjectId,
    type: String,
    amount: Number,
    createdAt: Date
  }, { strict: false }));

  if (retailerName === '*') {
    const retailers = await Users.find({ role: 'retailer' }).lean();
    let updated = 0;
    for (const r of retailers) {
      const rid = r._id;
      const ordersAgg = await Tx.aggregate([
        { $match: { retailerId: rid, type: 'order' } },
        { $group: { _id: null, s: { $sum: '$amount' } } }
      ]);
      const paysAgg = await Tx.aggregate([
        { $match: { retailerId: rid, type: { $in: ['payment_cash','payment_online'] } } },
        { $group: { _id: null, s: { $sum: '$amount' } } }
      ]);
      const orders = Number(ordersAgg[0]?.s || 0);
      const payments = Number(paysAgg[0]?.s || 0);
      const balance = orders - payments;
      await Users.updateOne({ _id: rid }, { $set: { currentBalance: balance } });
      updated++;
    }
    console.log(JSON.stringify({ ok:true, updated }));
  } else {
    const retailer = await Users.findOne({ role: 'retailer', name: retailerName });
    if(!retailer){
      console.log(JSON.stringify({ ok:false, error:'retailer_not_found', retailerName }));
      process.exit(2);
    }
    const rid = retailer._id;
    const ordersAgg = await Tx.aggregate([
      { $match: { retailerId: rid, type: 'order' } },
      { $group: { _id: null, s: { $sum: '$amount' } } }
    ]);
    const paysAgg = await Tx.aggregate([
      { $match: { retailerId: rid, type: { $in: ['payment_cash','payment_online'] } } },
      { $group: { _id: null, s: { $sum: '$amount' } } }
    ]);
    const orders = Number(ordersAgg[0]?.s || 0);
    const payments = Number(paysAgg[0]?.s || 0);
    const balance = orders - payments; // allow negative if overpaid
    await Users.updateOne({ _id: rid }, { $set: { currentBalance: balance } });
    console.log(JSON.stringify({ ok:true, retailerId: String(rid), retailerName, orders, payments, currentBalance: balance }));
  }
  await mongoose.disconnect();
}

main().catch(async (e)=>{ console.error(e); try{ await mongoose.disconnect(); } catch{} process.exit(1); });
