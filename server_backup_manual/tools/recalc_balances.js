const mongoose = require('mongoose');

const LOCAL_URI = process.env.LOCAL_MONGODB_URI || 'mongodb://localhost:27017/amul_dist_app';

async function run(){
  let conn;
  try {
    conn = await mongoose.createConnection(LOCAL_URI).asPromise();
    const Users = conn.model('User', new mongoose.Schema({}, { strict: false }));
    const Tx = conn.model('Transaction', new mongoose.Schema({
      distributorId: mongoose.Schema.Types.ObjectId,
      retailerId: mongoose.Schema.Types.ObjectId,
      type: String,
      amount: Number,
      createdAt: Date
    }, { strict: false }));

    const retailers = await Users.find({ role: 'retailer' }).lean();
    let updated = 0;
    for(const r of retailers){
      const o = await Tx.aggregate([
        { $match: { retailerId: r._id, type: 'order' } },
        { $group: { _id: null, s: { $sum: '$amount' } } }
      ]);
      const p = await Tx.aggregate([
        { $match: { retailerId: r._id, type: { $in: ['payment_cash','payment_online'] } } },
        { $group: { _id: null, s: { $sum: '$amount' } } }
      ]);
      const orders = o[0]?.s || 0;
      const pays = p[0]?.s || 0;
      const bal = Math.max(0, Number(orders) - Number(pays));
      await Users.updateOne({ _id: r._id }, { $set: { currentBalance: bal } });
      updated++;
    }
    console.log(JSON.stringify({ updated }, null, 2));
  } catch(e){
    console.error('recalc_failed', e && e.message ? e.message : String(e));
    process.exit(1);
  } finally {
    try { if(conn) await conn.close(); } catch {}
  }
  process.exit(0);
}

run();
