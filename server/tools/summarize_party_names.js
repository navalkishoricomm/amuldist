const mongoose = require('mongoose');
const dns = require('dns');
try { dns.setDefaultResultOrder('ipv4first'); } catch {}

const REMOTE_URI = process.env.MONGODB_URI;

async function run(){
  let conn;
  try {
    conn = await mongoose.createConnection(REMOTE_URI).asPromise();
    const V = conn.collection('vouchers');
    const P = conn.collection('parties');
    const ids = await V.distinct('partyId', { $or: [
      { cashReceived: { $gt: 0 } },
      { onlineReceived: { $gt: 0 } },
      { 'previousCashReceived.0': { $exists: true } },
      { 'previousOnlineReceived.0': { $exists: true } }
    ] });
    const out = [];
    for(const id of ids.slice(0,50)){
      const oid = mongoose.Types.ObjectId.isValid(String(id)) ? new mongoose.Types.ObjectId(String(id)) : id;
      const p = await P.findOne({ _id: oid });
      out.push({ _id: id, name: p ? (p.name||null) : null, phone: p ? (p.phone||null) : null });
    }
    console.log(JSON.stringify(out, null, 2));
  } catch(e){ console.error('summarize_failed', e && e.message ? e.message : String(e)); process.exit(1); }
  finally { try { if(conn) await conn.close(); } catch {} }
  process.exit(0);
}

run();
