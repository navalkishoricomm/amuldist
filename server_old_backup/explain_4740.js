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

const userSchema = new mongoose.Schema({ name: String, role: String });
const User = mongoose.model('User', userSchema);

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        
        const dist = await User.findOne({ name: /Anant/i, role: 'distributor' });
        
        // Target Date: Jan 3 2026
        const start = new Date('2026-01-02T18:30:00.000Z'); // Jan 3 00:00 IST
        const end = new Date('2026-01-03T18:29:59.999Z');   // Jan 3 23:59 IST

        console.log("Searching for moves with quantity around 4740 on Jan 3 2026...");
        
        const moves = await StockMove.find({
            distributorId: dist._id,
            createdAt: { $gte: start, $lte: end },
            type: 'IN'
        }).populate('productId');

        const targetMoves = moves.filter(m => m.quantity === 4740 || (m.quantity > 4700 && m.quantity < 4800));

        if (targetMoves.length === 0) {
            console.log("No exact 4740 move found. Listing all IN moves on this day:");
            moves.forEach(m => console.log(`${m.productId.nameEnglish}: ${m.quantity}`));
            return;
        }

        for (const m of targetMoves) {
            console.log(`\nFound Product: ${m.productId.nameEnglish} (ID: ${m.productId._id})`);
            console.log(`Move: ${m.type} ${m.quantity} at ${m.createdAt}`);

            // Analyze History
            console.log("Analyzing history BEFORE this move...");
            const history = await StockMove.find({
                distributorId: dist._id,
                productId: m.productId._id,
                createdAt: { $lt: start }
            });

            let totalIn = 0;
            let totalOut = 0;
            history.forEach(h => {
                if (h.type === 'IN') totalIn += h.quantity;
                else totalOut += h.quantity;
            });

            console.log(`Total Previous IN: ${totalIn}`);
            console.log(`Total Previous OUT: ${totalOut}`);
            console.log(`Calculated Opening Stock: ${totalIn - totalOut}`);
            
            if (totalIn - totalOut === -4740) {
                console.log("EXPLANATION FOUND: The Opening Stock is -4740 because you sold (OUT) 4740 more units than you bought (IN) prior to Jan 3, 2026.");
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
