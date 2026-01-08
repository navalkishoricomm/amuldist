
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

const stockMoveSchema = new mongoose.Schema(
  {
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    createdByStaffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['IN', 'OUT'], required: true },
    quantity: { type: Number, required: true },
    note: { type: String },
    date: { type: Date, default: Date.now } // In case it's not in schema but in DB
  },
  { timestamps: true }
);
const StockMove = mongoose.model('StockMove', stockMoveSchema);

async function run() {
  await mongoose.connect(mongoUri);
  console.log('Connected to DB');

  try {
    const moves = await StockMove.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .select('createdAt quantity type note');
    
    console.log('Recent StockMoves:');
    moves.forEach(m => {
      console.log(`${m.createdAt.toISOString()} | ${m.type} ${m.quantity} | ${m.note || ''}`);
    });

    // Check specifically for Anant Sales
    const distributorId = '6893635d853effc40396cfb3';
    const distMoves = await StockMove.find({ distributorId })
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.log('\nRecent Anant Sales Moves:');
    distMoves.forEach(m => {
        console.log(`${m.createdAt.toISOString()} | ${m.type} ${m.quantity} | ${m.note || ''}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
