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

async function run() {
    try {
        console.log(`Connecting to MongoDB...`);
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        // Goal: Ensure Opening Stock on Jan 3rd 2026 (00:00 IST) is 0 for ALL products.
        // This means sum of all moves BEFORE Jan 3rd 2026 00:00 IST must be 0.
        
        // Jan 3rd 00:00 IST = Jan 2nd 18:30 UTC
        const cutoffDate = new Date('2026-01-02T18:30:00.000Z');
        
        // Date for the correction entry: Jan 2nd 12:00 UTC (17:30 IST)
        const correctionDate = new Date('2026-01-02T12:00:00.000Z');

        console.log(`Calculating stock balances up to ${cutoffDate.toISOString()}...`);

        const balances = await StockMove.aggregate([
            { $match: { createdAt: { $lt: cutoffDate } } },
            {
                $group: {
                    _id: "$productId",
                    total: {
                        $sum: {
                            $cond: [
                                { $eq: ["$type", "IN"] },
                                "$quantity",
                                { $multiply: ["$quantity", -1] }
                            ]
                        }
                    },
                    distributorId: { $first: "$distributorId" } // Grab any distributorId to reuse
                }
            },
            { $match: { total: { $ne: 0 } } }
        ]);

        console.log(`Found ${balances.length} products with non-zero opening stock.`);

        for (const b of balances) {
            const currentBalance = b.total;
            const pId = b._id;
            
            // If balance is -50, we need +50 (IN).
            // If balance is +50, we need -50 (OUT).
            
            const type = currentBalance < 0 ? 'IN' : 'OUT';
            const qty = Math.abs(currentBalance);
            
            console.log(`Product ${pId}: Balance ${currentBalance}. Creating ${type} ${qty}...`);

            await StockMove.create({
                distributorId: b.distributorId, // Assign to the same distributor found in moves
                productId: pId,
                type: type,
                quantity: qty,
                note: 'System Auto-Correction: Reset Opening Stock to 0',
                createdAt: correctionDate
            });
        }

        console.log('All corrections applied.');

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
