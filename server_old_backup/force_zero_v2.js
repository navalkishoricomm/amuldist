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

        // Goal: Force Opening Stock on Jan 3rd 2026 (00:00 IST) to be exactly 0.
        // Cutoff: Jan 3rd 00:00 IST = Jan 2nd 18:30 UTC.
        const cutoffDate = new Date('2026-01-02T18:30:00.000Z');
        
        // Correction Date: Jan 2nd 23:55 IST = Jan 2nd 18:25 UTC.
        // This ensures it falls into "Jan 2nd" report, but is the very last thing.
        const correctionDate = new Date('2026-01-02T18:25:00.000Z');

        console.log(`Calculating ALL stock balances up to ${cutoffDate.toISOString()}...`);

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
                    distributorId: { $first: "$distributorId" }
                }
            },
            { $match: { total: { $ne: 0 } } }
        ]);

        console.log(`Found ${balances.length} products with non-zero opening stock.`);

        for (const b of balances) {
            const currentBalance = b.total;
            const pId = b._id;
            
            // To make balance 0:
            // If balance is positive (+X), we need OUT X.
            // If balance is negative (-X), we need IN X.
            
            const type = currentBalance > 0 ? 'OUT' : 'IN';
            const qty = Math.abs(currentBalance);
            
            console.log(`Product ${pId}: Current Balance ${currentBalance}. Creating ${type} ${qty} to zero it out...`);

            await StockMove.create({
                distributorId: b.distributorId,
                productId: pId,
                type: type,
                quantity: qty,
                note: 'FORCE ZERO: Final Reset for Jan 3rd Opening',
                createdAt: correctionDate
            });
        }

        console.log('Force Zero Reset Complete. All opening stocks for Jan 3rd should now be 0.');

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
