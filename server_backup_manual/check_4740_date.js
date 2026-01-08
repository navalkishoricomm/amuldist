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

const productSchema = new mongoose.Schema({ nameEnglish: String });
const Product = mongoose.model('Product', productSchema);

const userSchema = new mongoose.Schema({ name: String, role: String });
const User = mongoose.model('User', userSchema);

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        
        // Search for the 4740 move specifically
        // We look broadly around Jan 2/3
        const startSearch = new Date('2026-01-01T00:00:00.000Z');
        const endSearch = new Date('2026-01-05T00:00:00.000Z');
        
        console.log("Searching for Stock IN of 4740...");
        
        const moves = await StockMove.find({
            quantity: 4740,
            type: 'IN',
            createdAt: { $gte: startSearch, $lte: endSearch }
        }).populate('productId');

        if (moves.length === 0) {
            console.log("No move with quantity 4740 found.");
        } else {
            console.log(`Found ${moves.length} move(s):`);
            for (const m of moves) {
                console.log(`\nID: ${m._id}`);
                console.log(`Product: ${m.productId.nameEnglish}`);
                console.log(`Quantity: ${m.quantity}`);
                console.log(`Created At (UTC): ${m.createdAt.toISOString()}`);
                
                // Convert to IST for clarity
                const istDate = new Date(m.createdAt);
                istDate.setMinutes(istDate.getMinutes() + 330);
                console.log(`Created At (IST): ${istDate.toISOString().replace('Z', '')} (Approx)`);
                
                // Check if this falls into Jan 3rd Report Window
                // Jan 3rd Report Window (IST): Jan 3 00:00 to Jan 3 23:59
                // In UTC: Jan 2 18:30 to Jan 3 18:29
                
                const reportStart = new Date('2026-01-02T18:30:00.000Z');
                const reportEnd = new Date('2026-01-03T18:29:59.999Z');
                
                if (m.createdAt >= reportStart && m.createdAt <= reportEnd) {
                    console.log("STATUS: This move is currently appearing on the JAN 3RD Report.");
                    console.log("ACTION: To fix the report, this move should be shifted to Jan 2nd.");
                } else {
                     console.log("STATUS: This move is NOT on Jan 3rd report. (It might be on Jan 2nd or 4th).");
                }
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
