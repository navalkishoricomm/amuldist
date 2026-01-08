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
    nameEnglish: String,
    nameHindi: String
});
const Product = mongoose.model('Product', productSchema);

async function run() {
    try {
        console.log(`Connecting to MongoDB...`);
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        // 1. Find the products
        const products = await Product.find({
            $or: [
                { nameHindi: /दही कप/ }, // Dahi Cup
                { nameHindi: /बिंदास चॉकलेट/ }, // Bindass Chocolate
                { nameEnglish: /Dahi Cup/i },
                { nameEnglish: /Bindass/i }
            ]
        });

        console.log(`Found ${products.length} matching products.`);

        for (const p of products) {
            console.log(`\n--------------------------------------------------`);
            console.log(`Product: ${p.nameHindi} / ${p.nameEnglish} (ID: ${p._id})`);
            
            // Check moves around Jan 2nd/3rd
            const startCheck = new Date('2026-01-02T12:00:00.000Z');
            const endCheck = new Date('2026-01-03T18:30:00.000Z');
            
            const moves = await StockMove.find({
                productId: p._id,
                createdAt: { $gte: startCheck, $lte: endCheck }
            }).sort({ createdAt: 1 });

            console.log(`Moves from ${startCheck.toISOString()} to ${endCheck.toISOString()}:`);
            let runningTotal = 0;
            for (const m of moves) {
                const qty = m.type === 'IN' ? m.quantity : -m.quantity;
                runningTotal += qty;
                console.log(` - ${m.createdAt.toISOString()} | ${m.type} ${m.quantity} | Note: ${m.note} | ID: ${m._id}`);
            }

            // Calculate Sum of ALL moves before Jan 3rd 00:00 IST (Jan 2nd 18:30 UTC)
            const cutoffDate = new Date('2026-01-02T18:30:00.000Z');
            const agg = await StockMove.aggregate([
                { $match: { productId: p._id, createdAt: { $lt: cutoffDate } } },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: {
                                $cond: [{ $eq: ["$type", "IN"] }, "$quantity", { $multiply: ["$quantity", -1] }]
                            }
                        }
                    }
                }
            ]);
            
            const balance = agg.length > 0 ? agg[0].total : 0;
            console.log(`\nCALCULATED Opening Stock for Jan 3rd 2026: ${balance}`);
            
            if (balance !== 0) {
                console.log(`!!! WARNING: Opening Stock is NOT 0. Force Zero script might have missed this or calculation is different.`);
            } else {
                console.log(`SUCCESS: Opening Stock is 0.`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
