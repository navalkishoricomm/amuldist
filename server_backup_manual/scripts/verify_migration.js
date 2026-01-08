const mongoose = require('mongoose');

const TARGET_URI = 'mongodb://localhost:27017/amul_dist_app';

async function verify() {
  try {
    const conn = await mongoose.createConnection(TARGET_URI).asPromise();
    console.log('Connected to Target.');

    const collections = ['users', 'products', 'units', 'retailerrates', 'stockmoves', 'orders', 'transactions', 'inventories'];
    
    for (const col of collections) {
      const count = await conn.collection(col).countDocuments();
      console.log(`${col}: ${count}`);
    }

    await conn.close();
  } catch (err) {
    console.error(err);
  }
}

verify();
