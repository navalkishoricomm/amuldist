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

const userSchema = new mongoose.Schema({ name: String, role: String });
const User = mongoose.model('User', userSchema);

async function run() {
    try {
        console.log(`Connecting to MongoDB at ${MONGO_URI}...`);
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        // Define the "problematic" Jan 3rd range in IST
        // Jan 3rd 00:00 IST = Jan 2nd 18:30 UTC
        // Jan 3rd 23:59 IST = Jan 3rd 18:29 UTC
        
        // The BUG was that the report included up to Jan 3rd 23:59 UTC (which is Jan 4th 05:30 IST)
        
        const startIST = new Date('2025-01-02T18:30:00.000Z');
        const endIST = new Date('2025-01-03T18:29:59.999Z');
        
        const bugRangeStart = new Date('2025-01-03T18:30:00.000Z'); // Start of the "overlap" into Jan 4th
        const bugRangeEnd = new Date('2025-01-03T23:59:59.999Z');   // End of the incorrect report query

        console.log('\n--- Checking Jan 3rd (True IST) ---');
        const trueMoves = await StockMove.find({
            type: 'IN',
            createdAt: { $gte: startIST, $lte: endIST }
        });
        console.log(`Moves actually on Jan 3rd: ${trueMoves.length}`);
        trueMoves.forEach(m => console.log(` - ${m.quantity} at ${m.createdAt}`));

        console.log('\n--- Checking The "Ghost" Moves (Jan 4th Morning) ---');
        const ghostMoves = await StockMove.find({
            type: 'IN',
            createdAt: { $gte: bugRangeStart, $lte: bugRangeEnd }
        });
        console.log(`Moves in the overlap period (Jan 4th early morning): ${ghostMoves.length}`);
        ghostMoves.forEach(m => console.log(` - ${m.quantity} at ${m.createdAt} (ID: ${m._id})`));

        if (ghostMoves.length > 0) {
            console.log('\nCONCLUSION: These moves appeared on Jan 3rd report due to Timezone Bug.');
            console.log('The fix has been applied to server/index.js and server/static/app.js to exclude these.');
            console.log('NO DATA DELETION REQUIRED unless these are invalid moves for Jan 4th too.');
        } else {
            console.log('\nCONCLUSION: No moves found in overlap. The issue might have been different or data was already cleaned.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
