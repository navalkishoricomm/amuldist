const mongoose = require('mongoose');
const path = require('path');

// Try loading .env from current dir or parent (handles local scripts/ vs remote root)
require('dotenv').config(); 
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
  try {
    console.log('Connecting to DB...');
    // Force local DB connection as per user instruction
    const uri = 'mongodb://127.0.0.1:27017/amul_dist_app'; 
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    
    // Check Transactions with "Auto-fixed" note
    const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', new mongoose.Schema({
        distributorId: mongoose.Schema.Types.ObjectId,
        retailerId: mongoose.Schema.Types.ObjectId,
        type: String,
        amount: Number,
        note: String,
        createdAt: Date
    }));
    
    const fixedTx = await Transaction.find({ note: /Auto-fixed/ }).sort({ createdAt: -1 });
    console.log(`Found ${fixedTx.length} Auto-fixed transactions.`);
    
    fixedTx.forEach(t => {
        console.log(`- ID: ${t._id}, Amount: ${t.amount}, Type: ${t.type}, Date: ${t.createdAt}, Note: ${t.note}`);
    });

    const zeroTx = await Transaction.find({ amount: 0 }).sort({ createdAt: -1 });
    console.log(`Found ${zeroTx.length} Zero-amount transactions.`);
    zeroTx.forEach(t => {
         console.log(`- ID: ${t._id}, Type: ${t.type}, Note: ${t.note}`);
    });

    // Check for StockMoves without Transactions
    const StockMove = mongoose.models.StockMove || mongoose.model('StockMove', new mongoose.Schema({
        distributorId: mongoose.Schema.Types.ObjectId,
        retailerId: mongoose.Schema.Types.ObjectId,
        type: String,
        createdAt: Date
    }));

    const moves = await StockMove.find({ type: 'OUT', createdAt: { $gte: new Date('2025-12-28') } });
    console.log(`Found ${moves.length} recent Stock Moves (OUT). Checking coverage...`);
    
    let missing = 0;
    for (const m of moves) {
        const timeStart = new Date(m.createdAt);
        timeStart.setSeconds(timeStart.getSeconds() - 10);
        const timeEnd = new Date(m.createdAt);
        timeEnd.setSeconds(timeEnd.getSeconds() + 10);
        
        const tx = await Transaction.findOne({
            retailerId: m.retailerId,
            createdAt: { $gte: timeStart, $lte: timeEnd }
        });
        if (!tx) {
            console.log(`MISSING TX for Move ${m._id} at ${m.createdAt}`);
            missing++;
        }
    }
    console.log(`Total Missing Transactions: ${missing}`);

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

run();
