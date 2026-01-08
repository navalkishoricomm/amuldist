const mongoose = require('mongoose');

const REMOTE_URI = process.env.MONGODB_URI || "mongodb+srv://ujjawaltyagi9627980:T95m7OVzQY13u7J2@cluster0.vccmheh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function inspectPSO() {
  try {
    const conn = await mongoose.createConnection(REMOTE_URI).asPromise();
    
    const count = await conn.db.collection('partystockouts').countDocuments();
    console.log(`partystockouts count: ${count}`);

    const samples = await conn.db.collection('partystockouts').find({}).limit(5).toArray();
    console.log('Samples:', JSON.stringify(samples, null, 2));

    // Check if voucher partyIds exist in partystockouts
    const voucher = await conn.db.collection('vouchers').findOne({});
    if(voucher && voucher.partyId) {
        const match = await conn.db.collection('partystockouts').findOne({ _id: voucher.partyId });
        console.log(`Voucher partyId ${voucher.partyId} found in partystockouts?`, !!match);
        if(match) console.log('Matched Party:', match.name);
    }

    await conn.close();
  } catch (err) {
    console.error(err);
  }
}

inspectPSO();
