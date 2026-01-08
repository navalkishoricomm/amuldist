const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/amul_dist_app';

const stockMoveSchema = new mongoose.Schema({
  distributorId: mongoose.Schema.Types.ObjectId,
  productId: mongoose.Schema.Types.ObjectId,
  retailerId: mongoose.Schema.Types.ObjectId,
  type: String,
  quantity: Number,
  createdAt: Date
}, { strict: false });

const StockMove = mongoose.model('StockMove', stockMoveSchema);

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected.');

    const retailerId = '68b12210feef7a4ece570b51';
    const start = new Date('2025-12-29T00:00:00Z');
    const end = new Date('2025-12-29T23:59:59Z');

    console.log(`Searching for StockMoves for Retailer ${retailerId} on 2025-12-29...`);

    const moves = await StockMove.find({
        retailerId: retailerId,
        createdAt: { $gte: start, $lte: end }
    });

    console.log(`Found ${moves.length} moves.`);
    
    moves.forEach(m => {
        console.log(`Move: ${m._id} | Type: ${m.type} | Qty: ${m.quantity} | Date: ${m.createdAt}`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
