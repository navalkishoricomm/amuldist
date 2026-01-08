const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/amul_dist_app';

const stockMoveSchema = new mongoose.Schema(
  {
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    type: { type: String, enum: ['IN', 'OUT'], required: true },
    quantity: { type: Number, required: true },
    note: { type: String },
  },
  { timestamps: true }
);
const StockMove = mongoose.model('StockMove', stockMoveSchema);

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        // Search for TODAY'S moves (2026-01-08)
        // Adjust for potential timezone offsets in query, just grab everything > Jan 7
        const start = new Date('2026-01-07T12:00:00Z'); 
        const moves = await StockMove.find({ 
            type: 'OUT', 
            createdAt: { $gte: start } 
        });
        
        console.log(`\nFound ${moves.length} moves since Jan 7 12:00 UTC.`);
        
        const grouped = {};
        moves.forEach(m => {
            const key = `${m.supplierId}_${m.productId}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(m);
        });

        for (const key in grouped) {
            const group = grouped[key];
            if (group.length > 1) {
                console.log(`\nDUPLICATE GROUP (Sid_Pid): ${key}`);
                console.log(`Count: ${group.length}`);
                group.forEach(g => {
                    console.log(`  - ID: ${g._id} | Qty: ${g.quantity} | DistId: ${g.distributorId} | CreatedAt: ${g.createdAt.toISOString()}`);
                });
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();