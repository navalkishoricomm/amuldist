const mongoose = require('mongoose');

const LOCAL_URI = process.env.LOCAL_MONGODB_URI || 'mongodb://localhost:27017/amul_dist_app';

async function verify() {
  try {
    const conn = await mongoose.createConnection(LOCAL_URI).asPromise();
    
    const users = await conn.collection('users').countDocuments({ role: 'retailer' });
    const products = await conn.collection('products').countDocuments({});
    const units = await conn.collection('units').countDocuments({});
    const orders = await conn.collection('orders').countDocuments({});
    const txs = await conn.collection('transactions').countDocuments({});
    
    console.log('--- Verification ---');
    console.log(`Retailers: ${users}`);
    console.log(`Products: ${products}`);
    console.log(`Units: ${units}`);
    console.log(`Orders: ${orders}`);
    console.log(`Transactions: ${txs}`);

    if (users > 0) {
        const sample = await conn.collection('users').findOne({ role: 'retailer' });
        console.log(`Sample Retailer Balance: ${sample.name} = ${sample.currentBalance}`);
    }

    await conn.close();
  } catch (err) {
    console.error(err);
  }
}

verify();
