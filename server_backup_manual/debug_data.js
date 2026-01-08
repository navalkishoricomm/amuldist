const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema);

const stockMoveSchema = new mongoose.Schema({}, { strict: false });
const StockMove = mongoose.model('StockMove', stockMoveSchema);

const transactionSchema = new mongoose.Schema({}, { strict: false });
const Transaction = mongoose.model('Transaction', transactionSchema);

async function debug() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const distributor = await User.findOne({ email: 'rohitk29@gmail.com' });
    if (!distributor) {
      console.log('Distributor not found');
      return;
    }
    console.log('Distributor ID:', distributor._id);

    const moves = await StockMove.find({ distributorId: distributor._id });
    console.log(`Stock Moves found: ${moves.length}`);
    if (moves.length > 0) console.log('Sample move:', moves[0]);

    const txs = await Transaction.find({ distributorId: distributor._id });
    console.log(`Transactions found: ${txs.length}`);
    if (txs.length > 0) console.log('Sample tx:', txs[0]);

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

debug();
