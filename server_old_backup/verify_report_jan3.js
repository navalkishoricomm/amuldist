const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/amul_dist_app';

const stockMoveSchema = new mongoose.Schema({
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    type: String,
    quantity: Number,
    note: String,
    createdAt: Date
}, { timestamps: true });
const StockMove = mongoose.model('StockMove', stockMoveSchema);

const productSchema = new mongoose.Schema({
    nameEnglish: String
});
const Product = mongoose.model('Product', productSchema);

async function run() {
    try {
        console.log(`Connecting to MongoDB...`);
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        // Jan 3rd 2026 IST
        const startIST = new Date('2026-01-02T18:30:00.000Z');
        const endIST = new Date('2026-01-03T18:29:59.999Z');

        console.log(`\nGenerating Report for Jan 3rd 2026...`);
        console.log(`Period: ${startIST.toISOString()} to ${endIST.toISOString()}`);

        // 1. Calculate Opening Stock (All moves < startIST)
        const opening = await StockMove.aggregate([
            { $match: { createdAt: { $lt: startIST } } },
            {
                $group: {
                    _id: "$productId",
                    qty: {
                        $sum: {
                            $cond: [{ $eq: ["$type", "IN"] }, "$quantity", { $multiply: ["$quantity", -1] }]
                        }
                    }
                }
            }
        ]);
        const openingMap = {};
        opening.forEach(o => openingMap[o._id] = o.qty);

        // 2. Calculate Moves during Jan 3rd
        const moves = await StockMove.aggregate([
            { $match: { createdAt: { $gte: startIST, $lte: endIST } } },
            {
                $group: {
                    _id: "$productId",
                    in: {
                        $sum: {
                            $cond: [{ $eq: ["$type", "IN"] }, "$quantity", 0]
                        }
                    },
                    out: {
                        $sum: {
                            $cond: [{ $eq: ["$type", "OUT"] }, "$quantity", 0]
                        }
                    }
                }
            }
        ]);

        console.log('\n--------------------------------------------------------------------------------------');
        console.log('Product ID                | Opening | Stock IN | Stock OUT | Closing (Calc) | Verified?');
        console.log('--------------------------------------------------------------------------------------');

        let verifiedCount = 0;
        let errorCount = 0;

        for (const m of moves) {
            const pId = m._id;
            const op = openingMap[pId] || 0;
            const inQty = m.in;
            const outQty = m.out;
            const closing = op + inQty - outQty;

            // Simple verification check
            // We want Opening to be 0 (based on our previous fix)
            const isOpZero = Math.abs(op) < 0.001; 
            const status = isOpZero ? "OK" : "NON-ZERO OP";
            
            console.log(`${pId} | ${op.toFixed(2).padStart(7)} | ${inQty.toFixed(2).padStart(8)} | ${outQty.toFixed(2).padStart(9)} | ${closing.toFixed(2).padStart(14)} | ${status}`);

            if (!isOpZero) errorCount++;
            else verifiedCount++;
        }

        // Also check products that have Opening but NO moves on Jan 3rd (should be 0 too)
        for (const pId in openingMap) {
            if (!moves.find(m => String(m._id) === String(pId))) {
                const op = openingMap[pId];
                if (Math.abs(op) > 0.001) {
                    console.log(`${pId} | ${op.toFixed(2).padStart(7)} |     0.00 |      0.00 | ${op.toFixed(2).padStart(14)} | NON-ZERO OP (No Moves)`);
                    errorCount++;
                }
            }
        }

        console.log('--------------------------------------------------------------------------------------');
        if (errorCount === 0) {
            console.log(`\nSUCCESS: All products have correct Opening Stock (0.00) and formula holds true.`);
            console.log(`Closing Stock = 0 + Stock IN - Stock OUT`);
        } else {
            console.log(`\nWARNING: Found ${errorCount} products with non-zero Opening Stock.`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
