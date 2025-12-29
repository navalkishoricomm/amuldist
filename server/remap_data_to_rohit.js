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

async function remapData() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to DB');

    const currentUser = await User.findOne({ email: 'rohitk29@gmail.com' });
    if (!currentUser) throw new Error('Current user (Rohit) not found');
    
    const oldUserId = '693d49ecc4d492a78dbd0e1a'; // Dist One ID found in investigation
    const oldUserIdObj = new mongoose.Types.ObjectId(oldUserId);
    const newUserId = currentUser._id;

    console.log(`Remapping data from Old ID (${oldUserId}) to New ID (${newUserId})...`);

    // Check type of one record
    const sample = await StockMove.findOne({ distributorId: oldUserIdObj });
    if(sample) {
        console.log('Found sample with ObjectId match.');
    } else {
        const sampleStr = await StockMove.findOne({ distributorId: oldUserId });
        console.log(sampleStr ? 'Found sample with String match.' : 'Could not find sample with either type.');
    }

    // 1. Remap StockMoves
    const stockRes = await StockMove.updateMany(
        { distributorId: oldUserIdObj }, 
        { $set: { distributorId: newUserId } }
    );
    console.log(`Remapped ${stockRes.modifiedCount} StockMoves (ObjectId match).`);
    
    if (stockRes.modifiedCount === 0) {
         // Try string match just in case
         const stockResStr = await StockMove.updateMany(
            { distributorId: oldUserId }, 
            { $set: { distributorId: newUserId } }
        );
        console.log(`Remapped ${stockResStr.modifiedCount} StockMoves (String match).`);
    }


    // 2. Remap Transactions
    const transRes = await Transaction.updateMany(
        { distributorId: oldUserIdObj },
        { $set: { distributorId: newUserId } }
    );
    console.log(`Remapped ${transRes.modifiedCount} Transactions.`);

    // 3. Remap Retailers/Staff (just in case)
    const userRes = await User.updateMany(
        { distributorId: oldUserIdObj },
        { $set: { distributorId: newUserId } }
    );
    console.log(`Remapped ${userRes.modifiedCount} Users (Retailers/Staff).`);

    console.log('Data remapping complete.');

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

remapData();
