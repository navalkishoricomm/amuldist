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

        // Goal: Move ALL Stock IN entries from Jan 3rd 2026 (IST) back to Jan 2nd 2026 (IST).
        // Jan 3rd 2026 00:00 IST = Jan 2nd 2026 18:30 UTC.
        
        const startIST = new Date('2026-01-02T18:30:00.000Z');
        const endIST = new Date('2026-01-03T18:29:59.999Z');
        
        // Target Date: Jan 2nd 2026 12:00 UTC (17:30 IST)
        const targetDate = new Date('2026-01-02T12:00:00.000Z');

        console.log(`Searching for Stock IN entries between ${startIST.toISOString()} and ${endIST.toISOString()}...`);

        const moves = await StockMove.find({
            type: 'IN',
            createdAt: { $gte: startIST, $lte: endIST }
        });

        console.log(`Found ${moves.length} moves to re-date.`);

        for (const move of moves) {
            console.log(`Moving ID ${move._id} (Qty: ${move.quantity}, Note: ${move.note}) to Jan 2nd...`);
            move.createdAt = targetDate;
            await move.save();
        }

        console.log('All moves have been shifted to Jan 2nd.');

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
