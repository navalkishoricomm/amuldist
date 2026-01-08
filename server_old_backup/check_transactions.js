const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/amul_dist_app';

const transactionSchema = new mongoose.Schema({}, { strict: false });
const Transaction = mongoose.model('Transaction', transactionSchema);

async function check() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to', mongoUri);
    
    const sample = await Transaction.findOne({}).lean();
    console.log('Sample keys:', Object.keys(sample));
    console.log('Type field:', sample.type);
    console.log('RetailerId field:', sample.retailerId);
    
    const countType = await Transaction.countDocuments({ type: { $exists: true } });
    console.log('Count with type:', countType);
    
    const countNoType = await Transaction.countDocuments({ type: { $exists: false } });
    console.log('Count without type:', countNoType);
    
  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
  }
}

check();
