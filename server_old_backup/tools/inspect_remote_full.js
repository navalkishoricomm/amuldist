const mongoose = require('mongoose');

// Remote URI from environment or hardcoded for this check
const REMOTE_URI = process.env.MONGODB_URI || "mongodb+srv://ujjawaltyagi9627980:T95m7OVzQY13u7J2@cluster0.vccmheh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function inspect() {
  try {
    console.log('Connecting to Remote DB...');
    const conn = await mongoose.createConnection(REMOTE_URI).asPromise();
    console.log('Connected.');

    const collections = await conn.db.listCollections().toArray();
    console.log('Remote Collections:', collections.map(c => c.name));

    // Check 'users'
    if (collections.find(c => c.name === 'users')) {
      const count = await conn.db.collection('users').countDocuments();
      console.log(`\n'users' count: ${count}`);
      const sample = await conn.db.collection('users').findOne({});
      console.log('Sample user:', sample);
    }

    // Check 'parties'
    if (collections.find(c => c.name === 'parties')) {
      const count = await conn.db.collection('parties').countDocuments();
      console.log(`\n'parties' count: ${count}`);
      const sample = await conn.db.collection('parties').findOne({});
      console.log('Sample party:', sample);
    }

    // Check 'vouchers'
    if (collections.find(c => c.name === 'vouchers')) {
        const count = await conn.db.collection('vouchers').countDocuments();
        console.log(`\n'vouchers' count: ${count}`);
        const sample = await conn.db.collection('vouchers').findOne({});
        console.log('Sample voucher:', sample);
    }

    await conn.close();
  } catch (err) {
    console.error(err);
  }
}

inspect();
