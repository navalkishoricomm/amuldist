const mongoose = require('mongoose');
const dns = require('dns');
try { dns.setDefaultResultOrder('ipv4first'); } catch {}

const REMOTE_URI = process.env.MONGODB_URI;

async function run(){
  let conn;
  try {
    conn = await mongoose.createConnection(REMOTE_URI).asPromise();
    const P = conn.collection('parties');
    const docs = await P.find({}).limit(3).toArray();
    console.log(JSON.stringify(docs.map(d=>({ _id: d._id, keys: Object.keys(d) })), null, 2));
  } catch(e){ console.error('sample_failed', e && e.message ? e.message : String(e)); process.exit(1); }
  finally { try { if(conn) await conn.close(); } catch {} }
  process.exit(0);
}

run();
