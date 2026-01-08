const mongoose = require('mongoose');
const dns = require('dns');
try { dns.setDefaultResultOrder('ipv4first'); } catch {}

const REMOTE_URI = process.env.MONGODB_URI;
const LOCAL_URI = process.env.LOCAL_MONGODB_URI || 'mongodb://localhost:27017/amul_dist_app';

function norm(s){ if(!s) return ''; return String(s).toLowerCase().replace(/\s+/g,' ').trim(); }
function digits(s){ if(!s) return ''; return String(s).replace(/\D+/g,''); }

async function run(){
  let srcConn, tgtConn;
  try {
    srcConn = await mongoose.createConnection(REMOTE_URI).asPromise();
    tgtConn = await mongoose.createConnection(LOCAL_URI).asPromise();

    const SrcUsers = srcConn.collection('users');
    const SrcParties = srcConn.collection('parties');
    const SrcVouchers = srcConn.collection('vouchers');
    const TUsers = tgtConn.model('User', new mongoose.Schema({}, { strict: false }));
    const TTrans = tgtConn.model('Transaction', new mongoose.Schema({
      distributorId: mongoose.Schema.Types.ObjectId,
      retailerId: mongoose.Schema.Types.ObjectId,
      type: String,
      amount: Number,
      referenceId: mongoose.Schema.Types.ObjectId,
      note: String,
      createdAt: Date
    }, { timestamps: true }));

    const localRetailers = await TUsers.find({ role: 'retailer' }).lean();
    const localDists = await TUsers.find({ role: 'distributor' }).lean();
    const distributorId = localDists[0]?._id || (await TUsers.findOne({ role: 'admin' }))?._id;
    const nameToLocal = new Map();
    const phone4ToLocal = new Map();
    for(const r of localRetailers){
      nameToLocal.set(norm(r.name), r._id);
      const p4 = digits(r.phone).slice(-4);
      if(p4) phone4ToLocal.set(p4, r._id);
    }

    const remoteUsersArr = await SrcUsers.find({}).project({ _id: 1, name: 1, phone: 1, address: 1, companyName: 1, shopName: 1, partyName: 1 }).toArray();
    const remoteUsers = new Map();
    for(const u of remoteUsersArr){ remoteUsers.set(String(u._id), u); }
    const remotePartiesArr = await SrcParties.find({}).project({ _id: 1, name: 1, phone: 1, address: 1 }).toArray();
    const remoteParties = new Map();
    for(const p of remotePartiesArr){ remoteParties.set(String(p._id), p); }

    let inserted = 0, skipped = 0, dup = 0, unmapped = 0, createdRetailers = 0;

    const vouchers = await SrcVouchers.find({ $or: [
      { cashReceived: { $gt: 0 } },
      { onlineReceived: { $gt: 0 } },
      { 'previousCashReceived.0': { $exists: true } },
      { 'previousOnlineReceived.0': { $exists: true } }
    ] }).toArray();

    for(const v of vouchers){
      const pidKey = String(v.partyId);
      const pid = mongoose.Types.ObjectId.isValid(pidKey) ? new mongoose.Types.ObjectId(pidKey) : pidKey;
      let party = remoteUsers.get(pidKey);
      if(!party){ const pdoc = await SrcParties.findOne({ _id: pid }); party = pdoc || party; }
      const pname = party ? (party.name || party.companyName || party.shopName || party.partyName || '') : '';
      let rid = nameToLocal.get(norm(pname));
      if(!rid && party){
        const p4 = digits(party.phone).slice(-4);
        if(p4 && phone4ToLocal.has(p4)) rid = phone4ToLocal.get(p4);
      }
      if(!rid){
        const baseName = pname && pname.trim() ? pname.trim() : `Remote Party ${String(pidKey).slice(-6)}`;
        const phone = party && party.phone ? String(party.phone) : '';
        const exists = await TUsers.findOne({ role: 'retailer', name: baseName });
        if(exists){ rid = exists._id; }
        else {
          const u = await TUsers.create({ name: baseName, email: `${Date.now()}-${Math.random().toString(36).slice(2,6)}@retailer.local`, role: 'retailer', active: true, passwordHash: 'x', phone, distributorId });
          rid = u._id; createdRetailers++;
          nameToLocal.set(norm(baseName), rid);
        }
      }
      const refId = mongoose.Types.ObjectId.isValid(String(v._id)) ? new mongoose.Types.ObjectId(String(v._id)) : undefined;
      const createdBase = v.createdAt ? new Date(v.createdAt) : (v.date ? new Date(v.date) : new Date());

      const items = [];
      const rc = Number(v.cashReceived)||0;
      const ro = Number(v.onlineReceived)||0;
      if(rc>0) items.push({ type:'payment_cash', amount: rc, createdAt: createdBase });
      if(ro>0) items.push({ type:'payment_online', amount: ro, createdAt: createdBase });
      if(Array.isArray(v.previousCashReceived)){
        for(const p of v.previousCashReceived){
          const amt = Number(p && (p.amount||p.value||p.amt)||0);
          const ts = p && (p.createdAt||p.date||p.ts);
          if(amt>0) items.push({ type:'payment_cash', amount: amt, createdAt: ts ? new Date(ts) : createdBase });
        }
      }
      if(Array.isArray(v.previousOnlineReceived)){
        for(const p of v.previousOnlineReceived){
          const amt = Number(p && (p.amount||p.value||p.amt)||0);
          const ts = p && (p.createdAt||p.date||p.ts);
          if(amt>0) items.push({ type:'payment_online', amount: amt, createdAt: ts ? new Date(ts) : createdBase });
        }
      }

      for(const it of items){
        const exists = await TTrans.findOne({ distributorId, retailerId: rid, type: it.type, amount: it.amount, referenceId: refId, createdAt: it.createdAt });
        if(exists){ dup++; continue; }
        try {
          await TTrans.create({ distributorId, retailerId: rid, type: it.type, amount: it.amount, referenceId: refId, note: 'Imported Payment (Remote)', createdAt: it.createdAt });
          inserted++;
        } catch { skipped++; }
      }
    }

    const totalLocal = await TTrans.countDocuments({ type: { $in: ['payment_cash','payment_online'] } });
    console.log(JSON.stringify({ inserted, dup, skipped, unmapped, createdRetailers, localTotal: totalLocal }, null, 2));
  } catch(e){
    console.error('import_failed', e && e.message ? e.message : String(e));
    process.exit(1);
  } finally {
    try { if(srcConn) await srcConn.close(); } catch {}
    try { if(tgtConn) await tgtConn.close(); } catch {}
  }
  process.exit(0);
}

run();
