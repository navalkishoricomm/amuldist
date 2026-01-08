const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const userSchema = new mongoose.Schema({ name: String }, { strict: false });
const User = mongoose.model('User', userSchema);

const transactionSchema = new mongoose.Schema({
  retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: Number,
  type: String,
  date: Date
}, { strict: false, timestamps: true });
const Transaction = mongoose.model('Transaction', transactionSchema);

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/amul_dist_app');
    console.log('Connected to DB');

    // Last 48 hours to be safe
    const since = new Date();
    since.setDate(since.getDate() - 2);
    
    console.log(`Listing transactions since ${since.toISOString()}...`);

    const txns = await Transaction.find({
      createdAt: { $gte: since }
    }).populate('retailerId', 'name').sort({ createdAt: -1 }).limit(100);

    console.log(`Found ${txns.length} recent transactions.`);
    
    for (const txn of txns) {
        const rName = txn.retailerId ? txn.retailerId.name : 'Unknown';
        console.log(`ID: ${txn._id}, Retailer: ${rName}, Amount: ${txn.amount}, Date: ${txn.date}, Type: ${txn.type}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
