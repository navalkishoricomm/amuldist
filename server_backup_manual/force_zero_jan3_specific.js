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

        // Cutoff: Jan 3rd 00:00 IST = Jan 2nd 18:30 UTC.
        const cutoffDate = new Date('2026-01-02T18:30:00.000Z');
        
        // Correction Date: Jan 2nd 23:58 IST = Jan 2nd 18:28 UTC.
        const correctionDate = new Date('2026-01-02T18:28:00.000Z');

        // Identify Products
        const products = await Product.find({
            $or: [
                { nameEnglish: { $regex: /Dahi.*Cup.*200/i } },
                { nameHindi: { $regex: /दही.*कप.*200/i } },
                { nameEnglish: { $regex: /Bindass/i } },
                { nameHindi: { $regex: /बिंदास/i } }
            ]
        });

        console.log(`Found ${products.length} matching products.`);
        for(const p of products) {
            console.log(`- ${p.nameEnglish} (${p.nameHindi}) [${p._id}]`);
        }

        const productIds = products.map(p => p._id);

        if(productIds.length === 0) {
            console.log('No products found matching criteria.');
            return;
        }

        console.log(`Calculating stock balances up to ${cutoffDate.toISOString()} for these products...`);

        const balances = await StockMove.aggregate([
            { $match: { 
                createdAt: { $lt: cutoffDate },
                productId: { $in: productIds }
            }},
            {
                $group: {
                    _id: { 
                        productId: "$productId", 
                        distributorId: "$distributorId" 
                    },
                    total: {
                        $sum: {
                            $cond: [
                                { $eq: ["$type", "IN"] },
                                "$quantity",
                                { $multiply: ["$quantity", -1] }
                            ]
                        }
                    }
                }
            },
            { $match: { total: { $ne: 0 } } }
        ]);

        console.log(`Found ${balances.length} distributor-product pairs with non-zero opening stock.`);

        for (const b of balances) {
            const currentBalance = b.total;
            const pId = b._id.productId;
            const distId = b._id.distributorId;
            const pName = products.find(p => p._id.equals(pId))?.nameEnglish;
            
            // To make balance 0:
            // If balance is positive (+X), we need OUT X.
            // If balance is negative (-X), we need IN X.
            
            const type = currentBalance > 0 ? 'OUT' : 'IN';
            const qty = Math.abs(currentBalance);
            
            console.log(`Product ${pName} (${pId}) for Distributor ${distId}: Current Balance ${currentBalance}. Creating ${type} ${qty} to zero it out...`);

            await StockMove.create({
                distributorId: distId,
                productId: pId,
                type: type,
                quantity: qty,
                note: 'FORCE ZERO SPECIFIC: Final Reset for Jan 3rd Opening',
                createdAt: correctionDate
            });
        }

        console.log('Force Zero Reset Complete for specific products.');

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
