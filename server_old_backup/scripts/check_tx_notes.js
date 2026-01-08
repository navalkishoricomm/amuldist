const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const transactionSchema = new mongoose.Schema({
  distributorId: mongoose.Schema.Types.ObjectId,
  retailerId: mongoose.Schema.Types.ObjectId,
  amount: Number,
  type: String,
  note: String,
  createdAt: Date
});

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

async function run() {
  try {
    const uri = 'mongodb://127.0.0.1:27017/amul_dist_app';
    await mongoose.connect(uri);
    
    const count = await Transaction.countDocuments({ note: 'Auto-fixed Stock Out' });
    console.log(`Remaining 'Auto-fixed Stock Out' transactions: ${count}`);

    const transactions = await Transaction.find({
        note: 'Auto-fixed Stock Out'
    }).limit(5);

    if (transactions.length > 0) {
        console.log('Sample remaining auto-fixed:');
        transactions.forEach(tx => {
            console.log(`- Tx: ${tx._id} | Amount: ${tx.amount} | Created: ${tx.createdAt}`);
        });
    } else {
        console.log('No auto-fixed transactions found!');
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

run();