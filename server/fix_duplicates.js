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

const inventorySchema = new mongoose.Schema(
  {
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: 0 }
  },
  { timestamps: true }
);
const Inventory = mongoose.model('Inventory', inventorySchema);

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        // Search for moves since 2026-01-01
        const start = new Date('2026-01-01T00:00:00Z');
        const moves = await StockMove.find({ 
            type: 'OUT', 
            createdAt: { $gte: start } 
        }).sort({ createdAt: 1 }); // Oldest first
        
        console.log(`Scanning ${moves.length} moves...`);
        
        const grouped = {};
        moves.forEach(m => {
            // Group by Date(YYYY-MM-DD) + Supplier + Product
            const dateStr = m.createdAt.toISOString().split('T')[0];
            const key = `${dateStr}_${m.supplierId}_${m.productId}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(m);
        });

        for (const key in grouped) {
            const group = grouped[key];
            if (group.length > 1) {
                console.log(`\nFixing group: ${key} (Count: ${group.length})`);
                
                // Keep the LAST one (latest)
                const keep = group[group.length - 1];
                const remove = group.slice(0, group.length - 1);
                
                console.log(`  Keeping ID: ${keep._id} (Qty: ${keep.quantity})`);
                
                for (const m of remove) {
                    console.log(`  Removing ID: ${m._id} (Qty: ${m.quantity}) -> Restoring Inventory`);
                    
                    // 1. Restore Inventory
                    // Stock OUT reduced inventory, so removing it means INCREASING inventory back
                    await Inventory.updateOne(
                        { distributorId: m.distributorId, productId: m.productId },
                        { $inc: { quantity: m.quantity } }
                    );
                    
                    // 2. Delete Record
                    await StockMove.deleteOne({ _id: m._id });
                }
            }
        }
        
        console.log('\nCleanup complete.');

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();