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

        // Find last 50 OUT moves
        const moves = await StockMove.find({ type: 'OUT' }).sort({ createdAt: -1 }).limit(50);
        
        console.log(`Found ${moves.length} recent OUT moves:`);
        moves.forEach(m => {
            console.log(`ID: ${m._id} | Date: ${m.createdAt.toISOString()} | Qty: ${m.quantity} | Pid: ${m.productId} | Sid: ${m.supplierId} | DistId: ${m.distributorId}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();