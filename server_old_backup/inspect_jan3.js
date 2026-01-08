const mongoose = require('mongoose');

const uri = 'mongodb://127.0.0.1:27017/amul_dist_app';

const userSchema = new mongoose.Schema({ name: String, role: String }, { strict: false });
const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema({ nameEnglish: String }, { strict: false });
const Product = mongoose.model('Product', productSchema);

const stockMoveSchema = new mongoose.Schema({
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    type: String,
    quantity: Number,
    note: String,
    createdAt: Date
}, { timestamps: true });
const StockMove = mongoose.model('StockMove', stockMoveSchema);

const Transaction = mongoose.model('Transaction', new mongoose.Schema({
    retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: Number,
    type: String,
    note: String,
    createdAt: Date
}, { strict: false }));

async function run() {
    try {
        console.log(`Connecting to Local DB: ${uri}`);
        await mongoose.connect(uri);
        console.log('Connected.');

        // 1. Identify Distributor
        let dist = await User.findOne({ name: /Anant/i, role: 'distributor' });
        if (!dist) dist = await User.findOne({ name: /Rohit kohli/i, role: 'distributor' });

        if (!dist) {
            console.log("Distributor not found.");
            return;
        }
        console.log(`Target Distributor: ${dist.name} (${dist._id})`);

        // 2. Inspect Stock Moves around Jan 3, 2025
        const startStock = new Date('2025-01-02T00:00:00.000Z');
        const endStock = new Date('2025-01-05T00:00:00.000Z');

        console.log(`\n--- Stock Moves (Jan 2 - Jan 5, 2025) ---`);
        const moves = await StockMove.find({
            distributorId: dist._id,
            createdAt: { $gte: startStock, $lte: endStock }
        }).populate('productId', 'nameEnglish').sort({ createdAt: 1 });

        if (moves.length === 0) console.log("No moves found in this range.");
        else {
            moves.forEach(m => {
                const pName = m.productId ? m.productId.nameEnglish : 'Unknown';
                console.log(`[${m.createdAt.toISOString()}] ${m.type} | ${pName} | Qty: ${m.quantity} | Note: "${m.note}"`);
            });
        }

        // 3. Inspect Payment around Jan 3, 2026
        const startPay = new Date('2026-01-02T00:00:00.000Z');
        const endPay = new Date('2026-01-05T00:00:00.000Z');
        
        console.log(`\n--- Payments (Jan 2 - Jan 5, 2026) ---`);
        // Search for payment approx -2301
        const txs = await Transaction.find({
            createdAt: { $gte: startPay, $lte: endPay }
            // $or: [{ amount: 2301 }, { amount: -2301 }] // Let's list all to be safe first, or filter if too many
        }).populate('retailerId', 'name');

        if (txs.length === 0) console.log("No transactions found in this range.");
        else {
            txs.forEach(t => {
                const rName = t.retailerId ? t.retailerId.name : 'Unknown';
                console.log(`[${t.createdAt.toISOString()}] ${t.type} | Retailer: ${rName} | Amt: ${t.amount} | Note: "${t.note}" | ID: ${t._id}`);
            });
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
