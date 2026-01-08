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

        console.log('Searching for moves with quantity 4740...');
        const moves = await StockMove.find({ quantity: 4740 });
        
        if (moves.length === 0) {
            console.log('No exact matches for 4740.');
            console.log('Checking for moves > 4000...');
            const bigMoves = await StockMove.find({ quantity: { $gt: 4000 } }).limit(10);
            bigMoves.forEach(m => {
                console.log(`- Qty: ${m.quantity}, Type: ${m.type}, Date: ${m.createdAt}, Note: ${m.note}`);
            });
        } else {
            console.log(`Found ${moves.length} move(s):`);
            moves.forEach(m => {
                console.log(`- ID: ${m._id}, Qty: ${m.quantity}, Type: ${m.type}, Date: ${m.createdAt}, Note: ${m.note}`);
            });
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
