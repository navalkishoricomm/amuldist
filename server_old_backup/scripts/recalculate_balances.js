const mongoose = require('mongoose');

const TARGET_URI = 'mongodb://localhost:27017/amul_dist_app';

async function recalculate() {
  try {
    const conn = await mongoose.createConnection(TARGET_URI).asPromise();
    console.log('Connected to Target.');

    const User = conn.model('User', new mongoose.Schema({
        name: String,
        role: String,
        balance: { type: Number, default: 0 }
    }));

    const Transaction = conn.model('Transaction', new mongoose.Schema({
        retailerId: mongoose.Schema.Types.ObjectId,
        type: String,
        amount: Number
    }));

    const sampleTx = await Transaction.findOne();
    if (sampleTx) {
        console.log('Sample Transaction:', sampleTx);
        const user = await User.findById(sampleTx.retailerId);
        console.log('User for sample tx:', user);
    } else {
        console.log('No transactions found!');
    }

    const retailers = await User.find({ role: 'retailer' });
    console.log(`Found ${retailers.length} retailers.`);
    const retailerIds = new Set(retailers.map(r => r._id.toString()));
    
    console.log('Sample Retailer IDs:', retailers.slice(0, 5).map(r => r._id.toString()));

    const allTxs = await Transaction.find({});
    console.log(`Total transactions: ${allTxs.length}`);
    console.log('Sample Transaction retailerIds:', allTxs.slice(0, 5).map(t => t.retailerId.toString()));
    
    let matchedTxs = 0;
    for (const t of allTxs) {
        if (retailerIds.has(t.retailerId.toString())) {
            matchedTxs++;
        }
    }
    console.log(`Transactions with valid retailer: ${matchedTxs}`);

    for (const r of retailers) {
        if (sampleTx && r._id.toString() === sampleTx.retailerId.toString()) {
            console.log(`MATCH FOUND for sample tx! Retailer: ${r.name}`);
        }
        
        const txs = await Transaction.find({ retailerId: r._id });
        let bal = 0;
        for (const t of txs) {
            if (t.type === 'order') {
                bal += t.amount;
            } else if (t.type.startsWith('payment')) {
                bal -= t.amount;
            }
        }
        
        // Update user balance
        await User.updateOne({ _id: r._id }, { balance: bal });
        console.log(`Updated ${r.name}: Balance = ${bal.toFixed(2)} (from ${txs.length} txs)`);
    }

    console.log('Balance recalculation complete.');
    await conn.close();
  } catch (err) {
    console.error(err);
  }
}

recalculate();
