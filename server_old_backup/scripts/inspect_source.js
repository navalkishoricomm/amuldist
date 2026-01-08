const mongoose = require('mongoose');

const SOURCE_URI = 'mongodb+srv://ujjawaltyagi9627980:T95m7OVzQY13u7J2@cluster0.vccmheh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function run() {
  const conn = await mongoose.createConnection(SOURCE_URI).asPromise();
  const db = conn.db;
  const cols = await db.listCollections().toArray();
  console.log('Collections:', cols.map(c => c.name));
  const Party = conn.model('parties', new mongoose.Schema({}, { strict: false }));
  const Voucher = conn.model('vouchers', new mongoose.Schema({}, { strict: false }));
  const Rate = conn.model('ratelists', new mongoose.Schema({}, { strict: false }));
  const SrcUser = conn.model('users', new mongoose.Schema({}, { strict: false }));
  const PartyStockOut = conn.model('partystockouts', new mongoose.Schema({}, { strict: false }));
  const PartyStockIn = conn.model('partystockins', new mongoose.Schema({}, { strict: false }));

  const types = await Party.distinct('type');
  console.log('Party types:', types);
  const countParties = await Party.countDocuments();
  console.log('Parties count:', countParties);
  const sampleParties = await Party.find().limit(5).lean();
  console.log('Sample parties:', sampleParties.map(p => ({ _id: p._id, name: p.name, type: p.type })));

  const vouchersCount = await Voucher.countDocuments();
  console.log('Vouchers count:', vouchersCount);
  const sampleVouchers = await Voucher.find().limit(3).lean();
  console.log('Sample vouchers partyIds:', sampleVouchers.map(v => v.partyId));
  console.log('Sample voucher[0]:', sampleVouchers[0]);

  const ratesCount = await Rate.countDocuments();
  console.log('Rates count:', ratesCount);
  const sampleRates = await Rate.find().limit(3).lean();
  console.log('Sample rates party + item:', sampleRates.map(r => ({ party: r.party, item: r.item })));

  const userCount = await SrcUser.countDocuments();
  console.log('Source users count:', userCount);
  const retailerUsers = await SrcUser.find({ role: 'retailer' }).limit(5).lean();
  console.log('Sample source users (retailer):', retailerUsers.map(u => ({ _id: u._id, name: u.name, role: u.role })));

  const outCount = await PartyStockOut.countDocuments();
  const inCount = await PartyStockIn.countDocuments();
  console.log('PartyStockOut count:', outCount);
  console.log('PartyStockIn count:', inCount);
  const sampleOuts = await PartyStockOut.find().limit(3).lean();
  const sampleIns = await PartyStockIn.find().limit(3).lean();
  console.log('Sample PartyStockOut:', sampleOuts);
  console.log('Sample PartyStockIn:', sampleIns);


  await conn.close();
}

run().catch(async (e) => { console.error(e && e.message ? e.message : String(e)); try { await mongoose.disconnect(); } catch {} process.exit(1); });
