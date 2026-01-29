
const mongoose = require('mongoose');
const { Schema } = mongoose;

// Mocks and Schemas (Simplified for test)
const userSchema = new Schema({
  name: String,
  role: String,
  distributorId: Schema.Types.ObjectId,
  currentBalance: { type: Number, default: 0 },
  permissions: [String]
}, { strict: false });

const transactionSchema = new Schema({
  retailerId: Schema.Types.ObjectId,
  distributorId: Schema.Types.ObjectId,
  type: String,
  amount: Number,
  createdAt: Date
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_test_db'; // Use a test DB

async function run() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to Test DB');

    // Cleanup
    await User.deleteMany({});
    await Transaction.deleteMany({});

    // Setup
    const distId = new mongoose.Types.ObjectId();
    const retailer = await User.create({
        name: 'Test Retailer',
        role: 'retailer',
        distributorId: distId,
        currentBalance: 1000
    });
    console.log('Retailer created. Balance:', retailer.currentBalance);

    // Simulate Backdated Payment (POST)
    // Date: Yesterday UTC Midnight
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setUTCHours(0,0,0,0);
    const createdAtIso = yesterday.toISOString();
    
    console.log('Simulating POST /api/my/transactions with createdAt:', createdAtIso);

    // Logic from server/index.js POST handler
    const amount = 200;
    const type = 'payment_cash';
    const date = new Date(createdAtIso);

    // Create Transaction
    await Transaction.create({
        distributorId: distId,
        retailerId: retailer._id,
        type,
        amount,
        createdAt: date
    });

    // Update Balance
    retailer.currentBalance -= amount;
    await retailer.save();

    console.log('Transaction created. New Balance:', retailer.currentBalance);

    // Verify
    const savedTx = await Transaction.findOne({ retailerId: retailer._id });
    console.log('Saved Tx Date:', savedTx.createdAt.toISOString());
    console.log('Expected Date:', createdAtIso);

    if (savedTx.createdAt.toISOString() === createdAtIso) {
        console.log('SUCCESS: Date matched.');
    } else {
        console.log('FAILURE: Date mismatch.');
    }

    // Simulate PUT (Update amount and date)
    // Move to 2 days ago
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setUTCHours(0,0,0,0);
    const newDateIso = twoDaysAgo.toISOString();
    const newAmount = 300; // Increase payment to 300

    console.log('Simulating PUT /api/my/transactions/:id with date:', newDateIso, 'amount:', newAmount);

    // Logic from server/index.js PUT handler
    const tx = await Transaction.findById(savedTx._id);
    const oldAmount = tx.amount;
    const diff = oldAmount - newAmount; // Payment: Balance = Balance + Old - New -> 800 + 200 - 300 = 700.
    
    // Update Balance
    await User.updateOne({ _id: tx.retailerId }, { $inc: { currentBalance: diff } });
    
    // Update Tx
    tx.amount = newAmount;
    tx.createdAt = new Date(newDateIso);
    await tx.save();

    const updatedRetailer = await User.findById(retailer._id);
    console.log('Updated Balance:', updatedRetailer.currentBalance); // Should be 1000 - 300 = 700.
    
    const updatedTx = await Transaction.findById(savedTx._id);
    console.log('Updated Tx Date:', updatedTx.createdAt.toISOString());
    console.log('Expected Date:', newDateIso);

    if (updatedTx.createdAt.toISOString() === newDateIso) {
        console.log('SUCCESS: Date update matched.');
    } else {
        console.log('FAILURE: Date update mismatch.');
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
