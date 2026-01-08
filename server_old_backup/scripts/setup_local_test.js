const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const mongoUri = 'mongodb://localhost:27017/amul_dist_app';
const secret = 'change_this_in_dev'; 

async function run() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const distributorId = '6893635d853effc40396cfb3'; // Rohit kohli

    const retailerSchema = new mongoose.Schema({ 
        name: String, 
        distributorId: mongoose.Schema.Types.ObjectId,
        mobile: String 
    });
    const Retailer = mongoose.model('Retailer', retailerSchema);

    const transactionSchema = new mongoose.Schema({ 
        distributorId: mongoose.Schema.Types.ObjectId,
        retailerId: mongoose.Schema.Types.ObjectId, 
        type: String, 
        amount: Number,
        createdAt: Date,
        note: String
    });
    const Transaction = mongoose.model('Transaction', transactionSchema);

    // Create Retailer
    const retailer = await Retailer.create({
        name: 'Test Retailer Local',
        distributorId: distributorId,
        mobile: '9999999999'
    });
    console.log(`Created Retailer: ${retailer.name} (${retailer._id})`);

    // Create Transaction (Order)
    const tx = await Transaction.create({
        distributorId: distributorId,
        retailerId: retailer._id,
        type: 'order',
        amount: 1500,
        createdAt: new Date(), // Now
        note: 'Test Order Local'
    });
    console.log(`Created Transaction: ${tx._id}`);

    // Create Transaction (Old Order - Dec 29)
    const txOld = await Transaction.create({
        distributorId: distributorId,
        retailerId: retailer._id,
        type: 'order',
        amount: 2000,
        createdAt: new Date('2025-12-29T10:00:00Z'),
        note: 'Old Order Dec 29'
    });
    console.log(`Created Old Transaction: ${txOld._id}`);

    // Generate Token
    const token = jwt.sign(
      { sub: distributorId, role: 'distributor' },
      secret,
      { expiresIn: '1h' }
    );
    console.log(`\nToken:\n${token}`);
    console.log(`\nRetailer ID: ${retailer._id}`);

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

run();
