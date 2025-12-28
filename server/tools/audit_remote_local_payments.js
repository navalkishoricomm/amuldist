const mongoose = require('mongoose');
const dns = require('dns');
try { dns.setDefaultResultOrder('ipv4first'); } catch {}

const REMOTE_URI = process.env.MONGODB_URI || 'mongodb+srv://ujjawaltyagi9627980:T95m7OVzQY13u7J2@cluster0.vccmheh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const LOCAL_URI = process.env.LOCAL_MONGODB_URI || 'mongodb://localhost:27017/amul_dist_app';

async function run(){
  let srcConn, tgtConn;
  try {
    srcConn = await mongoose.createConnection(REMOTE_URI).asPromise();
    tgtConn = await mongoose.createConnection(LOCAL_URI).asPromise();

    const srcVouchers = srcConn.collection('vouchers');
    const remoteAgg = await srcVouchers.aggregate([
      { $project: {
        rc: { $cond: [{ $gt: ['$cashReceived', 0] }, 1, 0] },
        ro: { $cond: [{ $gt: ['$onlineReceived', 0] }, 1, 0] },
        ac: { $size: { $ifNull: ['$previousCashReceived', []] } },
        ao: { $size: { $ifNull: ['$previousOnlineReceived', []] } }
      }},
      { $group: { _id: null, rc: { $sum: '$rc' }, ro: { $sum: '$ro' }, ac: { $sum: '$ac' }, ao: { $sum: '$ao' } } }
    ]).toArray();
    const r = remoteAgg[0] || { rc:0, ro:0, ac:0, ao:0 };
    const remoteTotal = Number(r.rc||0) + Number(r.ro||0) + Number(r.ac||0) + Number(r.ao||0);

    const T = tgtConn.collection('transactions');
    const localCash = await T.countDocuments({ type: 'payment_cash' });
    const localOnline = await T.countDocuments({ type: 'payment_online' });
    const localTotal = localCash + localOnline;

    console.log(JSON.stringify({
      remote: { rootCash: r.rc, rootOnline: r.ro, arrayCash: r.ac, arrayOnline: r.ao, total: remoteTotal },
      local: { cash: localCash, online: localOnline, total: localTotal },
      missing: Math.max(0, remoteTotal - localTotal)
    }, null, 2));
  } catch(e){
    console.error('audit_failed', e && e.message ? e.message : String(e));
    process.exit(1);
  } finally {
    try { if(srcConn) await srcConn.close(); } catch {}
    try { if(tgtConn) await tgtConn.close(); } catch {}
  }
  process.exit(0);
}

run();
