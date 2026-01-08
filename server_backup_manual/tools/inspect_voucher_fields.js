const mongoose = require('mongoose');
const dns = require('dns');
try { dns.setDefaultResultOrder('ipv4first'); } catch {}

const REMOTE_URI = process.env.MONGODB_URI;

async function run(){
  let conn;
  try {
    conn = await mongoose.createConnection(REMOTE_URI).asPromise();
    const V = conn.collection('vouchers');
    const doc = await V.find({ $or: [
      { cashReceived: { $gt: 0 } },
      { onlineReceived: { $gt: 0 } },
      { 'previousCashReceived.0': { $exists: true } },
      { 'previousOnlineReceived.0': { $exists: true } }
    ] }).limit(1).toArray();
    const d = doc[0] || {};
    const keys = Object.keys(d).sort();
    console.log(JSON.stringify({ keys }, null, 2));
    const guess = d.partyName || d.party || d.party_name || d.name || d.retailerName || d.shopName || null;
    console.log(JSON.stringify({ partyId: d.partyId || null, guessedName: guess }, null, 2));
  } catch(e){
    console.error('inspect_failed', e && e.message ? e.message : String(e));
    process.exit(1);
  } finally { try { if(conn) await conn.close(); } catch {} }
  process.exit(0);
}

run();
