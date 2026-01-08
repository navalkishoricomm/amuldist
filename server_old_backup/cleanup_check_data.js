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

async function cleanupAndCheck() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to DB');

    const distributor = await User.findOne({ email: 'rohitk29@gmail.com' });
    if (!distributor) throw new Error('Distributor not found');
    console.log(`Distributor: ${distributor.name} (${distributor._id})`);

    // 1. Remove Dummy Data
    const delStock = await StockMove.deleteMany({ note: 'Initial Dummy Stock', distributorId: distributor._id });
    console.log(`Deleted ${delStock.deletedCount} dummy stock moves.`);

    const delTrans = await Transaction.deleteMany({ note: 'Dummy Order', distributorId: distributor._id });
    console.log(`Deleted ${delTrans.deletedCount} dummy transactions.`);

    // 2. Check for "Actual" Data
    const stockCount = await StockMove.countDocuments({ distributorId: distributor._id });
    console.log(`\nRemaining Stock Moves for this distributor: ${stockCount}`);

    if (stockCount > 0) {
        const moves = await StockMove.find({ distributorId: distributor._id }).limit(3);
        console.log('Sample Stock Moves:', JSON.stringify(moves, null, 2));
    }

    const transCount = await Transaction.countDocuments({ distributorId: distributor._id });
    console.log(`\nRemaining Transactions for this distributor: ${transCount}`);
    
    if (transCount > 0) {
        const trans = await Transaction.find({ distributorId: distributor._id }).limit(3);
        console.log('Sample Transactions:', JSON.stringify(trans, null, 2));
    }

    // Check global counts just in case data is orphaned or assigned to someone else
    const totalStock = await StockMove.countDocuments({});
    const totalTrans = await Transaction.countDocuments({});
    console.log(`\nGlobal DB Counts - StockMoves: ${totalStock}, Transactions: ${totalTrans}`);

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

cleanupAndCheck();
