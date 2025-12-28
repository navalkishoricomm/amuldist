const mongoose = require('mongoose');

const REMOTE_URI = process.env.MONGODB_URI || "mongodb+srv://ujjawaltyagi9627980:T95m7OVzQY13u7J2@cluster0.vccmheh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function inspectProducts() {
  try {
    const conn = await mongoose.createConnection(REMOTE_URI).asPromise();
    
    console.log('--- Units ---');
    const units = await conn.db.collection('itemunits').find({}).limit(3).toArray();
    console.log(JSON.stringify(units, null, 2));

    console.log('\n--- Items ---');
    const items = await conn.db.collection('items').find({}).limit(3).toArray();
    console.log(JSON.stringify(items, null, 2));

    await conn.close();
  } catch (err) {
    console.error(err);
  }
}

inspectProducts();
