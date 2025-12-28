const mongoose = require('mongoose');
const dns = require('dns');
try { dns.setDefaultResultOrder('ipv4first'); } catch {}

const REMOTE_URI = process.env.MONGODB_URI;

async function run(){
  let conn;
  try {
    conn = await mongoose.createConnection(REMOTE_URI).asPromise();
    const V = conn.collection('vouchers');
    const docs = await V.find({ $or: [
      { cashReceived: { $gt: 0 } },
      { onlineReceived: { $gt: 0 } },
      { 'previousCashReceived.0': { $exists: true } },
      { 'previousOnlineReceived.0': { $exists: true } }
    ] }).limit(5).toArray();
    const out = docs.map(d => ({
      _id: d._id,
      partyId: d.partyId,
      partyName: d.partyName || d.party || d.party_name || null,
      cashReceived: d.cashReceived || 0,
      onlineReceived: d.onlineReceived || 0,
      previousCashReceived: Array.isArray(d.previousCashReceived) ? d.previousCashReceived.length : 0,
      previousOnlineReceived: Array.isArray(d.previousOnlineReceived) ? d.previousOnlineReceived.length : 0
    }));
    console.log(JSON.stringify(out, null, 2));
  } catch(e){
    console.error('sample_failed', e && e.message ? e.message : String(e));
    process.exit(1);
  } finally {
    try { if(conn) await conn.close(); } catch {}
  }
  process.exit(0);
}

run();
