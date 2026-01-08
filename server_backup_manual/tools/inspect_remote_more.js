const mongoose = require('mongoose');

const REMOTE_URI = process.env.MONGODB_URI || "mongodb+srv://ujjawaltyagi9627980:T95m7OVzQY13u7J2@cluster0.vccmheh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function inspectMore() {
  try {
    const conn = await mongoose.createConnection(REMOTE_URI).asPromise();
    
    // Check all users
    const users = await conn.db.collection('users').find({}).toArray();
    console.log('All Remote Users:', users);

    // Check ratelists
    const ratelists = await conn.db.collection('ratelists').findOne({});
    console.log('Sample Ratelist:', ratelists);

    // Check partystockouts
    const pso = await conn.db.collection('partystockouts').findOne({});
    console.log('Sample PartyStockOut:', pso);

    await conn.close();
  } catch (err) {
    console.error(err);
  }
}

inspectMore();
