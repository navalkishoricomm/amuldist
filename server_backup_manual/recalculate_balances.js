const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

const userSchema = new mongoose.Schema({
    name: String,
    role: String,
    distributorId: mongoose.Schema.Types.ObjectId,
    currentBalance: Number,
    openingBalance: Number
}, { strict: false });
const User = mongoose.model('User', userSchema);

const transactionSchema = new mongoose.Schema({
    distributorId: mongoose.Schema.Types.ObjectId,
    retailerId: mongoose.Schema.Types.ObjectId,
    type: String,
    amount: Number,
    createdAt: Date
}, { strict: false });
const Transaction = mongoose.model('Transaction', transactionSchema);

async function recalculateBalances() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to DB');

    // 1. Get all retailers
    // We'll recalculate for ALL retailers to be safe, or just the ones under the current distributor if preferred.
    // User said "all retailers", so let's do all retailers to ensure consistency globally.
    const retailers = await User.find({ role: 'retailer' });
    console.log(`Found ${retailers.length} retailers.`);

    let updatedCount = 0;

    for (const r of retailers) {
        const txs = await Transaction.find({ retailerId: r._id });
        
        let calculatedBalance = 0;
        
        // Add Opening Balance if exists
        if (r.openingBalance) {
            calculatedBalance += Number(r.openingBalance);
        }

        for (const t of txs) {
            const amt = Number(t.amount) || 0;
            if (t.type === 'order') {
                calculatedBalance += amt; // Order increases debt
            } else if (t.type && t.type.startsWith('payment')) {
                calculatedBalance -= amt; // Payment reduces debt
            } else if (t.type === 'return') {
                calculatedBalance -= amt; // Return reduces debt
            }
        }

        // Round to 2 decimal places to avoid float issues
        calculatedBalance = Math.round(calculatedBalance * 100) / 100;
        
        // Debug first retailer
        if (updatedCount === 0 && retailers.indexOf(r) === 0) {
            console.log(`Debug ${r.name}: Txs=${txs.length}, Calc=${calculatedBalance}, Stored=${r.currentBalance}`);
        }

        if (r.currentBalance !== calculatedBalance) {
            console.log(`Updating ${r.name}: ${r.currentBalance} -> ${calculatedBalance}`);
            r.currentBalance = calculatedBalance;
            await r.save();
            updatedCount++;
        }
    }

    console.log(`\nRecalculation Complete. Updated ${updatedCount} retailers.`);

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

recalculateBalances();
