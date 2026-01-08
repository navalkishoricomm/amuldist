const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/amul_dist_app';

const transactionSchema = new mongoose.Schema({
  distributorId: mongoose.Schema.Types.ObjectId,
  retailerId: mongoose.Schema.Types.ObjectId,
  type: String,
  amount: Number,
  referenceId: mongoose.Schema.Types.ObjectId,
  createdAt: Date
}, { strict: false });

const Transaction = mongoose.model('Transaction', transactionSchema);

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected.');

    const retailerId = '68b12210feef7a4ece570b51';
    // 16:07 is roughly 16:00 to 16:10
    const start = new Date('2025-12-29T16:00:00Z');
    const end = new Date('2025-12-29T16:15:00Z');

    console.log(`Searching for Transactions for Retailer ${retailerId} around 16:07...`);

    const txs = await Transaction.find({
        retailerId: retailerId,
        createdAt: { $gte: start, $lte: end }
    });

    console.log(`Found ${txs.length} transactions.`);
    
    txs.forEach(t => {
        console.log(`Tx: ${t._id} | Type: ${t.type} | Amt: ${t.amount} | Ref: ${t.referenceId} | Date: ${t.createdAt}`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
