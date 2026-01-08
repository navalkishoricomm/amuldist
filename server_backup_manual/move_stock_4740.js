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

        // Target: "Final Stock Reset to Target" moves on Jan 3rd 2026 (IST)
        // i.e. Jan 2nd 2026 18:30 UTC to Jan 3rd 2026 18:29 UTC.
        
        // Specifically, we found them at Jan 02 2026 18:51 UTC.
        
        const startSearch = new Date('2026-01-02T18:30:00.000Z');
        const endSearch = new Date('2026-01-03T18:29:59.999Z');
        
        // New Date: Jan 02 2026 12:00:00 UTC (17:30 IST)
        const targetDate = new Date('2026-01-02T12:00:00.000Z');

        const moves = await StockMove.find({
            note: 'Final Stock Reset to Target',
            createdAt: { $gte: startSearch, $lte: endSearch }
        });

        console.log(`Found ${moves.length} "Final Stock Reset" moves in Jan 3rd 2026 (IST) range.`);

        for (const move of moves) {
            console.log(`Processing Move ID: ${move._id}, Qty: ${move.quantity}, Date: ${move.createdAt}`);
            move.createdAt = targetDate;
            await move.save();
            console.log(`  -> MOVED to ${move.createdAt} (Jan 2nd IST)`);
        }
        
        console.log('Done. All specified moves have been shifted to Jan 2nd.');

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
