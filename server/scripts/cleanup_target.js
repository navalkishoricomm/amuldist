const mongoose = require('mongoose');

const TARGET_URI = 'mongodb://localhost:27017/amul_dist_app';

async function cleanup() {
  try {
    const conn = await mongoose.createConnection(TARGET_URI).asPromise();
    console.log('Connected to Target.');

    await conn.collection('transactions').deleteMany({});
    console.log('Cleared transactions.');

    await conn.collection('orders').deleteMany({});
    console.log('Cleared orders.');

    // Only clear OUT moves (from orders), keep IN moves (from StockIn)??
    // Wait, StockIn entries created IN moves.
    // Vouchers created OUT moves.
    // If I re-run migration, StockIn steps might be skipped if I comment them out, or run idempotently?
    // StockIn migration:
    // const existing = await TargetStockMove.findOne({ referenceId: entry._id });
    // So StockIn is idempotent.
    
    // Vouchers migration logic for StockMoves:
    // await TargetStockMove.create({...});
    // This duplicates!
    
    // So I MUST clear OUT moves.
    await conn.collection('stockmoves').deleteMany({ type: 'OUT' });
    console.log('Cleared stockmoves (OUT).');

    await conn.close();
  } catch (err) {
    console.error(err);
  }
}

cleanup();
