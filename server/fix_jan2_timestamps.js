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

        // Target: Moves created between 18:30 and 19:00 on Jan 2nd 2026
        // These are the "Jan 2 Closing" corrections that accidentally fell into Jan 3rd.
        const startSearch = new Date('2026-01-02T18:30:00.000Z');
        const endSearch = new Date('2026-01-02T19:00:00.000Z');

        // New Timestamp: Jan 2nd 18:20:00 UTC (Safely before 18:30 cutoff)
        const newTimestamp = new Date('2026-01-02T18:20:00.000Z');

        const moves = await StockMove.find({
            createdAt: { $gte: startSearch, $lte: endSearch },
            note: { $regex: /Jan 2 Closing/i } // Extra safety
        });

        console.log(`Found ${moves.length} stray correction moves.`);

        for (const m of moves) {
            console.log(`Moving ID ${m._id} from ${m.createdAt.toISOString()} to ${newTimestamp.toISOString()}...`);
            m.createdAt = newTimestamp;
            await m.save();
        }

        console.log('All stray moves relocated to Jan 2nd (pre-cutoff).');

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
