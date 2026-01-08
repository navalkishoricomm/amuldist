const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

const userSchema = new mongoose.Schema({ name: String, role: String, distributorId: mongoose.Schema.Types.ObjectId });
const User = mongoose.model('User', userSchema);

const transactionSchema = new mongoose.Schema(
  {
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    amount: { type: Number, required: true },
    note: { type: String },
  },
  { timestamps: true }
);
const Transaction = mongoose.model('Transaction', transactionSchema);

async function run() {
    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        const distributorId = '6893635d853effc40396cfb3'; // Rohit kohli

        // Find Retailer
        const retailerName = 'श्री श्याम डेयरी';
        const retailer = await User.findOne({ 
            name: retailerName, 
            distributorId: distributorId,
            role: 'retailer'
        });

        if (!retailer) {
            console.log(`Retailer "${retailerName}" not found for distributor ${distributorId}`);
            // Search by name only to be sure
            const possible = await User.find({ name: new RegExp(retailerName, 'i') });
            console.log('Possible matches:', possible.map(u => `${u.name} (${u._id})`));
            return;
        }

        console.log(`Found Retailer: ${retailer.name} (${retailer._id})`);

        // Search for transaction
        // User said: 3/1/2026 12:25 am Payment cash -₹2301.00
        // Date: Jan 3 2026
        // Amount: -2301 (or 2301 with type payment_cash, usually payments are negative in some contexts or positive in others. 
        // In the schema, amount is Number. Usually payments reduce balance, so might be negative or handled by logic. 
        // User wrote "-₹2301.00", so I'll check for -2301 first, then 2301.)
        
        console.log(`Searching for ANY transaction in 2026 globally`);

        const start = new Date('2026-01-01T00:00:00.000Z');
        const end = new Date('2027-01-01T00:00:00.000Z');

        const txs = await Transaction.find({
            createdAt: { $gte: start, $lte: end }
        }).limit(10);

        console.log(`Found ${txs.length} transactions in 2026`);
        
        txs.forEach(tx => {
            console.log(`ID: ${tx._id}, Retailer: ${tx.retailerId}, Date: ${tx.createdAt}, Type: ${tx.type}, Amount: ${tx.amount}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
