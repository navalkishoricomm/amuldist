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

        // Define Jan 3rd 2026 IST Range
        // Start: Jan 3rd 00:00 IST = Jan 2nd 18:30 UTC
        const startIST = new Date('2026-01-02T18:30:00.000Z');
        
        // End: Jan 3rd 23:59:59 IST = Jan 3rd 18:29:59 UTC
        const endIST = new Date('2026-01-03T18:29:59.999Z');

        console.log(`\nChecking for Stock IN entries between:`);
        console.log(`UTC: ${startIST.toISOString()} - ${endIST.toISOString()}`);
        console.log(`IST: Jan 3rd 2026 00:00 - Jan 3rd 2026 23:59`);

        const moves = await StockMove.find({
            type: 'IN',
            createdAt: { $gte: startIST, $lte: endIST }
        });

        if (moves.length === 0) {
            console.log('\nRESULT: No Stock IN entries found for Jan 3rd 2026.');
        } else {
            console.log(`\nRESULT: Found ${moves.length} Stock IN entries:`);
            moves.forEach(m => {
                console.log(` - Qty: ${m.quantity}, Date: ${m.createdAt}, Note: ${m.note}, ID: ${m._id}`);
            });
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
