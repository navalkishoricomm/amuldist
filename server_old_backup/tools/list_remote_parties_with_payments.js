const mongoose = require('mongoose');
const dns = require('dns');
try { dns.setDefaultResultOrder('ipv4first'); } catch {}

const REMOTE_URI = process.env.MONGODB_URI;

async function run(){
  let conn;
  try {
    conn = await mongoose.createConnection(REMOTE_URI).asPromise();
    const V = conn.collection('vouchers');
    const U = conn.collection('users');
    const agg = await V.aggregate([
      { $match: { $or: [
        { cashReceived: { $gt: 0 } },
        { onlineReceived: { $gt: 0 } },
        { 'previousCashReceived.0': { $exists: true } },
        { 'previousOnlineReceived.0': { $exists: true } }
      ] } },
      { $group: { _id: '$partyId', vCount: { $sum: 1 } } },
      { $sort: { vCount: -1 } },
      { $limit: 50 }
    ]).toArray();
    const out = [];
    for(const a of agg){
      const oid = mongoose.Types.ObjectId.isValid(String(a._id)) ? new mongoose.Types.ObjectId(String(a._id)) : a._id;
      const u = a._id ? await U.findOne({ _id: oid }) : null;
      out.push({ partyId: a._id, name: u ? (u.name||null) : null, count: a.vCount });
    }
    console.log(JSON.stringify(out, null, 2));
  } catch(e){
    console.error('list_failed', e && e.message ? e.message : String(e));
    process.exit(1);
  } finally {
    try { if(conn) await conn.close(); } catch {}
  }
  process.exit(0);
}

run();
