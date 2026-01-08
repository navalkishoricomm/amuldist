const mongoose = require('mongoose');
const dns = require('dns');
try { dns.setDefaultResultOrder('ipv4first'); } catch {}

const REMOTE_URI = process.env.MONGODB_URI;

async function run(){
  let conn;
  try {
    conn = await mongoose.createConnection(REMOTE_URI).asPromise();
    const cols = await conn.db.listCollections().toArray();
    console.log(JSON.stringify(cols.map(c=>c.name), null, 2));
  } catch(e){ console.error('list_failed', e && e.message ? e.message : String(e)); process.exit(1); }
  finally { try { if(conn) await conn.close(); } catch {} }
  process.exit(0);
}

run();
